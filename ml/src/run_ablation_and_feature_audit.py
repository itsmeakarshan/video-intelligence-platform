"""
Phase 1 & Phase 2: Comprehensive Feature Distribution Audit and Feature Ablation Setup.

Audits all 52 features on the clean training cohort (Users 3-103) and defines 4 controlled feature sets:
A_CURRENT (52 features)
B_NO_FREQUENCY (51 features)
C_NO_FREQUENCY_AND_RATE (45 features)
D_CORE_LEARNING (38 domain learning features)

Generates:
- ml/reports/feature_distribution_audit.json
- ml/reports/feature_distribution_audit.md
"""

import os
import sys
import json
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.features import generate_features, ALL_EXPANDED_FEATURE_COLUMNS, TARGET_COLUMN
from ml.src.data_loader import extract_quiz_attempts_data

REPORTS_DIR = os.path.join(PROJECT_ROOT, "ml/reports")


# Define Feature Sets for Ablation Experiments
FEATURE_SET_A_CURRENT = list(ALL_EXPANDED_FEATURE_COLUMNS)

FEATURE_SET_B_NO_FREQUENCY = [
    f for f in ALL_EXPANDED_FEATURE_COLUMNS if f != "attempt_frequency"
]

FREQUENCY_AND_RATE_REMOVALS = [
    "attempt_frequency",
    "attempts_last_7_days",
    "attempts_last_14_days",
    "attempts_last_30_days",
    "average_days_between_attempts",
    "time_gap_std",
    "total_previous_video_interactions"
]

FEATURE_SET_C_NO_FREQUENCY_AND_RATE = [
    f for f in ALL_EXPANDED_FEATURE_COLUMNS if f not in FREQUENCY_AND_RATE_REMOVALS
]

TIMING_AND_TEST_ARTIFACTS = [
    "attempt_frequency",
    "attempts_last_7_days",
    "attempts_last_14_days",
    "attempts_last_30_days",
    "average_days_between_attempts",
    "time_gap_std",
    "days_since_previous_attempt",
    "days_since_first_attempt",
    "total_previous_video_interactions",
    "repeated_video_ratio",
    "previous_easy_count",
    "previous_medium_count",
    "previous_hard_count",
    "number_of_videos_in_recent_attempts"
]

FEATURE_SET_D_CORE_LEARNING = [
    f for f in ALL_EXPANDED_FEATURE_COLUMNS if f not in TIMING_AND_TEST_ARTIFACTS
]

FEATURE_SETS = {
    "A_CURRENT": FEATURE_SET_A_CURRENT,
    "B_NO_FREQUENCY": FEATURE_SET_B_NO_FREQUENCY,
    "C_NO_FREQUENCY_AND_RATE": FEATURE_SET_C_NO_FREQUENCY_AND_RATE,
    "D_CORE_LEARNING": FEATURE_SET_D_CORE_LEARNING
}


def audit_feature_distributions():
    os.makedirs(REPORTS_DIR, exist_ok=True)

    # 1. Load clean feature dataset
    df_feat = generate_features()
    
    # Assert Users 1 and 2 are excluded
    assert 1 not in df_feat["user_id"].values, "User 1 present in feature dataset!"
    assert 2 not in df_feat["user_id"].values, "User 2 present in feature dataset!"

    X = df_feat[ALL_EXPANDED_FEATURE_COLUMNS]
    y = df_feat[TARGET_COLUMN]

    audit_records = []
    
    for col in ALL_EXPANDED_FEATURE_COLUMNS:
        series = X[col]
        mean_val = float(series.mean())
        std_val = float(series.std())
        min_val = float(series.min())
        p25 = float(series.quantile(0.25))
        p50 = float(series.quantile(0.50))
        p75 = float(series.quantile(0.75))
        p95 = float(series.quantile(0.95))
        p99 = float(series.quantile(0.99))
        max_val = float(series.max())
        
        # Pearson correlation with target
        corr = float(series.corr(y)) if std_val > 1e-8 else 0.0
        
        # Detect skewness & ratio of max to 95th percentile
        skew_val = float(series.skew())
        max_to_p95_ratio = (max_val / p95) if p95 > 1e-6 else 1.0
        
        # Flag potential OOD / high-variance artificial test behavior
        is_high_risk = col in FREQUENCY_AND_RATE_REMOVALS or max_to_p95_ratio > 3.0 or abs(skew_val) > 3.0

        audit_records.append({
            "feature": col,
            "mean": round(mean_val, 4),
            "std": round(std_val, 4),
            "min": round(min_val, 4),
            "p25": round(p25, 4),
            "p50": round(p50, 4),
            "p75": round(p75, 4),
            "p95": round(p95, 4),
            "p99": round(p99, 4),
            "max": round(max_val, 4),
            "target_correlation": round(corr, 4),
            "skewness": round(skew_val, 4),
            "max_to_p95_ratio": round(max_to_p95_ratio, 2),
            "high_ood_risk": is_high_risk,
            "category": "Timing/Frequency" if col in FREQUENCY_AND_RATE_REMOVALS else ("Domain Learning" if col in FEATURE_SET_D_CORE_LEARNING else "Contextual")
        })

    # Save JSON Audit
    json_path = os.path.join(REPORTS_DIR, "feature_distribution_audit.json")
    with open(json_path, "w") as f:
        json.dump({
            "total_instances": len(df_feat),
            "total_users": len(df_feat["user_id"].unique()),
            "total_features": len(ALL_EXPANDED_FEATURE_COLUMNS),
            "feature_sets": {name: {"count": len(cols), "features": cols} for name, cols in FEATURE_SETS.items()},
            "features": audit_records
        }, f, indent=2)
    print(f"Saved feature distribution audit JSON -> {json_path}")

    # Generate Markdown Audit Report
    md_path = os.path.join(REPORTS_DIR, "feature_distribution_audit.md")
    with open(md_path, "w") as f:
        f.write("# Phase 1 — Feature Distribution & OOD Risk Audit Report\n\n")
        f.write(f"**Cohort Analyzed:** Clean Learner Dataset ({len(df_feat['user_id'].unique())} users, {len(df_feat)} feature instances).\n")
        f.write("**User Isolation:** Users 1 and 2 strictly excluded.\n\n")
        
        f.write("## 1. Feature Set Definitions for Ablation\n\n")
        f.write("| Feature Set Name | Count | Description | Key Removals |\n")
        f.write("| :--- | ---: | :--- | :--- |\n")
        f.write(f"| **A_CURRENT** | {len(FEATURE_SET_A_CURRENT)} | Full existing feature pipeline | None |\n")
        f.write(f"| **B_NO_FREQUENCY** | {len(FEATURE_SET_B_NO_FREQUENCY)} | Removes single OOD linear outlier `attempt_frequency` | `attempt_frequency` |\n")
        f.write(f"| **C_NO_FREQUENCY_AND_RATE** | {len(FEATURE_SET_C_NO_FREQUENCY_AND_RATE)} | Removes all rate/velocity window features | `attempt_frequency`, `attempts_last_7d/14d/30d`, `avg_days_between`, `time_gap_std`, `total_video_interactions` |\n")
        f.write(f"| **D_CORE_LEARNING** | {len(FEATURE_SET_D_CORE_LEARNING)} | Pure domain performance & learning progression features | All timing, frequency, and test-execution speed artifacts |\n\n")

        f.write("## 2. Top High OOD-Risk & Artificial Test Behavior Features\n\n")
        f.write("| Feature | Category | Mean | Std | 95th Pct | Max | Skewness | Target Corr | Risk Rationale |\n")
        f.write("| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |\n")

        df_audit = pd.DataFrame(audit_records)
        df_high_risk = df_audit[df_audit["high_ood_risk"]].sort_values("target_correlation", key=abs, ascending=False)
        
        for _, r in df_high_risk.iterrows():
            f.write(f"| `{r['feature']}` | {r['category']} | {r['mean']} | {r['std']} | {r['p95']} | {r['max']} | {r['skewness']} | {r['target_correlation']} | High variance / OOD extrapolation sensitivity |\n")

        f.write("\n## 3. Full Feature Distribution Table\n\n")
        f.write("| Feature | Mean | Std | Min | Median (p50) | 95th Pct | Max | Target Corr |\n")
        f.write("| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n")
        for _, r in df_audit.iterrows():
            f.write(f"| `{r['feature']}` | {r['mean']} | {r['std']} | {r['min']} | {r['p50']} | {r['p95']} | {r['max']} | {r['target_correlation']} |\n")

    print(f"Saved feature distribution audit Markdown -> {md_path}")
    return df_feat


if __name__ == "__main__":
    audit_feature_distributions()
