"""
Scriptable EDA and Outlier Learner Detection Module for Video Intelligence Platform.

Performs robust learner-level trajectory analysis on the raw new learner cohort
(ml/data/raw/new_learner_dataset.csv) to detect objectively inconsistent / high-variance
learner trajectories.

Outputs:
- ml/data/processed/clean_learner_dataset.csv (Clean modeling dataset)
- ml/data/processed/excluded_learners.csv (Excluded outlier learners with metrics & reasons)
- ml/reports/outlier_analysis.json (Detailed outlier audit report)
"""

import os
import json
import pandas as pd
import numpy as np

RAW_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/raw/new_learner_dataset.csv")
)
PROCESSED_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/processed")
)
REPORTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../reports")
)


def compute_learner_metrics(df_raw: pd.DataFrame) -> pd.DataFrame:
    """
    Computes learner-level trajectory metrics across all attempts for each user.
    """
    learner_stats = []

    for user_id, group in df_raw.groupby("user_id"):
        group_sorted = group.sort_values(["created_at", "attempt_id"]).reset_index(drop=True)
        pcts = group_sorted["percentage"].values
        attempts = np.arange(1, len(pcts) + 1)

        num_attempts = len(pcts)
        mean_score = float(np.mean(pcts))
        std_score = float(np.std(pcts, ddof=1)) if num_attempts > 1 else 0.0

        # Attempt-to-attempt consecutive deltas
        deltas = np.diff(pcts) if num_attempts > 1 else np.array([0.0])
        avg_abs_delta = float(np.mean(np.abs(deltas)))
        max_abs_delta = float(np.max(np.abs(deltas)))

        # OLS Slope
        if num_attempts > 1:
            poly = np.polyfit(attempts, pcts, 1)
            slope = float(poly[0])
        else:
            slope = 0.0

        # Correlation (Attempt index vs Percentage score)
        if num_attempts > 1 and np.std(pcts) > 1e-5:
            corr = float(np.corrcoef(attempts, pcts)[0, 1])
        else:
            corr = 0.0

        # Volatility / Inconsistency indicators:
        # 1. Large reversals: consecutive score jump or drop >= 25 percentage points
        large_reversals = int(np.sum(np.abs(deltas) >= 25.0))
        extreme_reversals = int(np.sum(np.abs(deltas) >= 35.0))

        # 2. Directional sign flips (up then down then up)
        signs = np.sign(deltas)
        flips = int(np.sum((signs[:-1] * signs[1:]) < 0)) if len(signs) > 1 else 0

        # 3. MAD (Median Absolute Deviation) of scores and deltas
        median_score = float(np.median(pcts))
        mad_score = float(np.median(np.abs(pcts - median_score)))
        mad_delta = float(np.median(np.abs(deltas - np.median(deltas))))

        learner_stats.append({
            "user_id": int(user_id),
            "num_attempts": num_attempts,
            "mean_score": round(mean_score, 2),
            "std_score": round(std_score, 2),
            "slope": round(slope, 3),
            "attempt_score_corr": round(corr, 3),
            "avg_abs_delta": round(avg_abs_delta, 2),
            "max_abs_delta": round(max_abs_delta, 2),
            "large_reversals_25pct": large_reversals,
            "extreme_reversals_35pct": extreme_reversals,
            "directional_flips": flips,
            "mad_score": round(mad_score, 2),
            "mad_delta": round(mad_delta, 2)
        })

    return pd.DataFrame(learner_stats)


def identify_outlier_learners(df_stats: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    Applies objective statistical outlier criteria to identify highly inconsistent learner trajectories.

    Criteria:
    A learner is flagged as an INCONSISTENT OUTLIER if:
    1. Score standard deviation (std_score) is in the top tail (e.g. > 18.0)
    AND
    2. Attempt-to-attempt volatility (avg_abs_delta > 20.0 or extreme_reversals_35pct >= 2)
    AND
    3. Trajectory direction is unstable (low or negative correlation with progress: attempt_score_corr < 0.25).

    Note: A learner with low scores but stable/gradual learning is KEPT.
    Only learners with chaotic/erratic trajectories are EXCLUDED from modelling.
    """
    # Robust Z-score for score volatility (std_score)
    med_std = df_stats["std_score"].median()
    mad_std = (df_stats["std_score"] - med_std).abs().median()
    robust_z_std = 0.6745 * (df_stats["std_score"] - med_std) / (mad_std + 1e-5)

    # Flagging criteria
    is_high_std = df_stats["std_score"] >= 17.5
    is_high_delta = (df_stats["avg_abs_delta"] >= 20.0) | (df_stats["extreme_reversals_35pct"] >= 2) | (df_stats["large_reversals_25pct"] >= 4)
    is_inconsistent_trend = df_stats["attempt_score_corr"] < 0.35

    outlier_mask = is_high_std & is_high_delta & is_inconsistent_trend

    excluded_rows = []
    for _, row in df_stats[outlier_mask].iterrows():
        u_id = int(row["user_id"])
        reason = (
            f"High-variance chaotic trajectory: score std={row['std_score']}%, "
            f"avg attempt delta={row['avg_abs_delta']}%, {row['extreme_reversals_35pct']} extreme reversals (>=35%), "
            f"attempt correlation={row['attempt_score_corr']}."
        )
        metrics_used = (
            f"std_score={row['std_score']}, avg_abs_delta={row['avg_abs_delta']}, "
            f"extreme_reversals_35pct={row['extreme_reversals_35pct']}, "
            f"large_reversals_25pct={row['large_reversals_25pct']}, "
            f"attempt_score_corr={row['attempt_score_corr']}, slope={row['slope']}"
        )
        excluded_rows.append({
            "user_id": u_id,
            "reason": reason,
            "metrics_used_for_exclusion": metrics_used
        })

    df_excluded = pd.DataFrame(excluded_rows)
    excluded_user_ids = df_excluded["user_id"].tolist() if not df_excluded.empty else []

    df_clean_stats = df_stats[~df_stats["user_id"].isin(excluded_user_ids)].reset_index(drop=True)

    summary_meta = {
        "total_learners_analyzed": len(df_stats),
        "total_learners_excluded": len(df_excluded),
        "total_learners_retained": len(df_clean_stats),
        "excluded_user_ids": excluded_user_ids,
        "exclusion_thresholds": {
            "min_score_std_threshold": 17.5,
            "min_avg_abs_delta_threshold": 20.0,
            "min_large_reversals_25pct": 4,
            "max_attempt_score_corr": 0.35
        },
        "clean_cohort_stats": {
            "mean_score_std": float(df_clean_stats["std_score"].mean()),
            "mean_slope": float(df_clean_stats["slope"].mean()),
            "mean_attempt_score_corr": float(df_clean_stats["attempt_score_corr"].mean())
        },
        "excluded_cohort_stats": {
            "mean_score_std": float(df_stats[outlier_mask]["std_score"].mean()) if len(df_excluded) > 0 else 0.0,
            "mean_slope": float(df_stats[outlier_mask]["slope"].mean()) if len(df_excluded) > 0 else 0.0,
            "mean_attempt_score_corr": float(df_stats[outlier_mask]["attempt_score_corr"].mean()) if len(df_excluded) > 0 else 0.0
        }
    }

    return df_clean_stats, df_excluded, summary_meta


def run_eda_pipeline() -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Loads raw new learner data, runs statistical EDA, identifies outlier learners,
    and writes clean and excluded CSV datasets.
    """
    if not os.path.exists(RAW_DATA_PATH):
        raise FileNotFoundError(f"Raw new learner dataset not found at: {RAW_DATA_PATH}")

    df_raw = pd.read_csv(RAW_DATA_PATH)
    print(f"Loaded raw dataset: {len(df_raw)} attempts across {df_raw['user_id'].nunique()} learners.")

    df_stats = compute_learner_metrics(df_raw)
    df_clean_stats, df_excluded, summary_meta = identify_outlier_learners(df_stats)

    excluded_uids = df_excluded["user_id"].tolist() if not df_excluded.empty else []

    # Filter raw attempt rows to retain only clean learners
    df_clean_attempts = df_raw[~df_raw["user_id"].isin(excluded_uids)].reset_index(drop=True)

    # Save outputs
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    clean_path = os.path.join(PROCESSED_DIR, "clean_learner_dataset.csv")
    excluded_path = os.path.join(PROCESSED_DIR, "excluded_learners.csv")
    report_path = os.path.join(REPORTS_DIR, "outlier_analysis.json")

    df_clean_attempts.to_csv(clean_path, index=False)
    df_excluded.to_csv(excluded_path, index=False)

    with open(report_path, "w") as f:
        json.dump(summary_meta, f, indent=2)

    print("\n================ EDA & OUTLIER ANALYSIS SUMMARY ================")
    print(f"Total learners in raw cohort: {summary_meta['total_learners_analyzed']}")
    print(f"Excluded inconsistent learners: {summary_meta['total_learners_excluded']} ({excluded_uids})")
    print(f"Retained clean modeling learners: {summary_meta['total_learners_retained']}")
    print(f"Total clean attempts saved: {len(df_clean_attempts)} -> {clean_path}")
    print(f"Excluded learner details saved -> {excluded_path}")
    print(f"Outlier audit report written -> {report_path}")
    print("=================================================================\n")

    return df_clean_attempts, df_excluded


if __name__ == "__main__":
    run_eda_pipeline()
