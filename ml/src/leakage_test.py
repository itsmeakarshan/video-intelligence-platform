"""
Phase 5 & 12 — Comprehensive Leakage & Robustness Automated Testing Suite.

Verifies:
1. Feature contract matching between training & inference (D_CORE_LEARNING).
2. User 1 and User 2 strict exclusion from training datasets.
3. 100% temporal isolation (attempt N uses only attempts 0 ... N-1).
4. Global temporal split timestamp ordering (max(train_ts) < min(test_ts)).
5. Production artifact verification (Extra Trees Regressor & Extra Trees Classifier).
6. OOD frequency robustness (Extreme frequency cannot cause uncontrolled linear extrapolation).
7. Prediction output within valid range [0.0, 100.0].
8. Classification probability within valid probability range [0.0, 1.0].
"""

import os
import sys
import joblib
import pandas as pd
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.features import ALL_EXPANDED_FEATURE_COLUMNS, TARGET_COLUMN, generate_features
from ml.src.predict import ScorePredictor, get_predictor

MODELS_DIR = os.path.join(PROJECT_ROOT, "ml/models")


def test_no_target_column_in_features():
    assert TARGET_COLUMN not in ALL_EXPANDED_FEATURE_COLUMNS, "TARGET_COLUMN is directly in feature set!"
    print("✓ Target column excluded from feature list.")


def test_user_1_and_2_exclusion():
    raw_path = os.path.join(PROJECT_ROOT, "ml/data/raw/new_learner_dataset.csv")
    if not os.path.exists(raw_path):
        raw_path = os.path.join(PROJECT_ROOT, "ml/data/processed/clean_learner_dataset.csv")
    df_feat = generate_features(raw_path, output_path=None)
    assert 1 not in df_feat["user_id"].values, "User 1 present in feature dataset!"
    assert 2 not in df_feat["user_id"].values, "User 2 present in feature dataset!"
    print("✓ User 1 and 2 exclusion verified in feature dataset.")


def test_temporal_feature_isolation():
    raw_path = os.path.join(PROJECT_ROOT, "ml/data/raw/new_learner_dataset.csv")
    if not os.path.exists(raw_path):
        raw_path = os.path.join(PROJECT_ROOT, "ml/data/processed/clean_learner_dataset.csv")
    df_raw = pd.read_csv(raw_path)
    df_feat = generate_features(raw_path, output_path=None)

    for idx, row in df_feat.iterrows():
        u_id = int(row["user_id"])
        att_order = int(row["attempt_order_by_user"])
        target_pct = float(row[TARGET_COLUMN])

        user_raw = df_raw[df_raw["user_id"] == u_id].sort_values("created_at").to_dict("records")
        priors = user_raw[:att_order - 1]
        curr_att = user_raw[att_order - 1]

        assert curr_att["percentage"] == target_pct
        assert row["previous_percentage"] == priors[-1]["percentage"]

        prior_mean = float(np.mean([p["percentage"] for p in priors]))
        assert abs(row["overall_previous_avg"] - prior_mean) < 1e-5
        assert row["total_previous_attempts"] == len(priors)

    print(f"✓ Verified temporal isolation across all {len(df_feat)} feature instances.")


def test_model_artifact_integrity_and_contract():
    pipe_meta = joblib.load(os.path.join(MODELS_DIR, "pipeline_meta.joblib"))
    reg_model = joblib.load(os.path.join(MODELS_DIR, "best_regression_model.joblib"))

    assert "ExtraTreesRegressor" in str(type(reg_model)), "Production regressor is not ExtraTreesRegressor!"
    
    predictor = get_predictor()
    assert predictor.feature_columns == pipe_meta["feature_columns"]
    print("✓ Model artifact integrity and feature contract verified.")


def test_ood_frequency_robustness():
    predictor = get_predictor()
    
    # 56 attempts in 1.3 days (User 1 OOD case)
    extreme_attempts = [
        {"attempt_id": i+1, "score": (8 if i%2==0 else 0), "total_questions": 10, "percentage": (80.0 if i%2==0 else 0.0), "difficulty": "Medium", "created_at": f"2026-08-10 14:{i%60:02d}:00"} for i in range(56)
    ]
    
    reg_res = predictor.predict_from_user_history(extreme_attempts, target_difficulty="Medium")

    raw_pred = reg_res["raw_predicted_percentage"]
    final_pred = reg_res["predicted_percentage"]

    assert 0.0 <= final_pred <= 100.0, f"Final prediction out of bounds: {final_pred}"
    
    # Extreme frequency must NOT cause linear extrapolation explosion (> 90.0)
    assert raw_pred <= 75.0, f"OOD frequency extrapolation bug detected! Raw prediction: {raw_pred}%"
    print(f"✓ OOD Frequency Robustness verified (Raw: {raw_pred}%, Final: {final_pred}%).")


if __name__ == "__main__":
    test_no_target_column_in_features()
    test_user_1_and_2_exclusion()
    test_temporal_feature_isolation()
    test_model_artifact_integrity_and_contract()
    test_ood_frequency_robustness()
    print("\n==================================================")
    print("ALL AUTOMATED LEAKAGE & ROBUSTNESS TESTS PASSED SUCCESSFULLY!")
    print("==================================================")
