import os
import sys
import json
import pandas as pd
import numpy as np

PROJECT_ROOT = "/Users/akarshanrasyal/Documents/Projects/video-intelligence-platform"
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

REPORTS_DIR = os.path.join(PROJECT_ROOT, "ml/reports")

def generate_updated_model_evaluation_json():
    # Load ablation results CSV
    ablation_csv = os.path.join(REPORTS_DIR, "regression_feature_ablation.csv")
    df_ablation = pd.read_csv(ablation_csv)

    # Filter for Feature Set D_CORE_LEARNING comparison
    df_d = df_ablation[df_ablation["feature_set"] == "D_CORE_LEARNING"].copy()

    reg_comp = []
    for _, r in df_d.iterrows():
        reg_comp.append({
            "model": r["model"],
            "group_kfold_mae": float(r["group_kfold_mae"]),
            "group_kfold_rmse": float(r["group_kfold_rmse"]),
            "group_kfold_r2": float(r["group_kfold_r2"]),
            "unseen_user_mae": float(r["unseen_user_mae"]),
            "unseen_user_rmse": float(r["unseen_user_rmse"]),
            "unseen_user_r2": float(r["unseen_user_r2"]),
            "temporal_mae": float(r["temporal_mae"]),
            "temporal_rmse": float(r["temporal_rmse"]),
            "temporal_r2": float(r["temporal_r2"])
        })

    # OOD robustness summary
    ood_csv = os.path.join(REPORTS_DIR, "ood_robustness_test_results.csv")
    df_ood = pd.read_csv(ood_csv)
    df_ood_d = df_ood[df_ood["feature_set"] == "D_CORE_LEARNING"].copy()
    
    ood_summary = []
    for _, r in df_ood_d.iterrows():
        ood_summary.append({
            "test_case": r["test_case"],
            "model": r["model"],
            "raw_prediction": float(r["raw_prediction"]),
            "final_prediction": float(r["final_prediction"]),
            "is_within_bounds": bool(r["is_within_bounds"]),
            "ood_sensitive": bool(r["ood_sensitive"])
        })

    eval_json = {
        "pipeline_version": "v4.0_ood_robust",
        "evaluation_timestamp": "2026-08-11T22:55:00",
        "system_metadata": {
            "total_users": 95,
            "total_attempts": 636,
            "total_features": 38,
            "feature_set": "D_CORE_LEARNING",
            "regression_model": "Extra Trees Regressor_v4.0",
            "dataset_type": "Clean Learner Cohort (Users 3-103)",
            "pipeline_status": "SUCCESS"
        },
        "dataset_summary": {
            "raw_learners_count": 101,
            "excluded_outlier_learners_count": 6,
            "clean_modeling_learners_count": 95,
            "total_clean_attempts": 636,
            "excluded_user_ids": [1, 2]
        },
        "selected_regression_model": {
            "model_name": "Extra Trees Regressor",
            "feature_set": "D_CORE_LEARNING (38 domain features)",
            "group_kfold_mae": 3.80,
            "group_kfold_rmse": 4.96,
            "group_kfold_r2": 0.861,
            "unseen_user_mae": 3.13,
            "unseen_user_rmse": 3.89,
            "unseen_user_r2": 0.912,
            "temporal_mae": 3.60,
            "temporal_rmse": 4.57,
            "temporal_r2": 0.908
        },
        "regression_comparison": reg_comp,
        "ood_robustness_summary": ood_summary,
        "feature_ablation_summary": [
            {"feature_set": "A_CURRENT", "feature_count": 52, "group_kfold_mae": 3.62, "unseen_user_mae": 3.04, "temporal_mae": 3.21, "ood_robust": False},
            {"feature_set": "B_NO_FREQUENCY", "feature_count": 51, "group_kfold_mae": 3.65, "unseen_user_mae": 3.08, "temporal_mae": 3.25, "ood_robust": False},
            {"feature_set": "C_NO_FREQUENCY_AND_RATE", "feature_count": 45, "group_kfold_mae": 3.75, "unseen_user_mae": 3.12, "temporal_mae": 3.45, "ood_robust": True},
            {"feature_set": "D_CORE_LEARNING", "feature_count": 38, "group_kfold_mae": 3.80, "unseen_user_mae": 3.13, "temporal_mae": 3.60, "ood_robust": True}
        ]
    }

    out_path = os.path.join(REPORTS_DIR, "model_evaluation.json")
    with open(out_path, "w") as f:
        json.dump(eval_json, f, indent=2)
    print(f"Updated model_evaluation.json -> {out_path}")

if __name__ == "__main__":
    generate_updated_model_evaluation_json()
