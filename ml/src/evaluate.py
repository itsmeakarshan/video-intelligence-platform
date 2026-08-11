"""
[LEGACY EVALUATION MODULE - DEPRECATED]
Model Evaluation and Feature Importance Module for Video Intelligence Platform ML Pipeline.

NOTE: This module is maintained for legacy backwards compatibility only.
The single authoritative production training and evaluation pipeline is:
--> ml/src/train_all_models.py

Explicitly excludes Users 1 and 2 if present to prevent data contamination.
"""

import os
import warnings
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor


PROCESSED_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/processed/featured_quiz_attempts.csv")
)
REPORTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../reports")
)
MODELS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../models")
)

FEATURE_COLUMNS = [
    "attempt_order_by_user",
    "previous_score",
    "previous_percentage",
    "previous_2_attempt_avg",
    "previous_3_attempt_avg",
    "overall_previous_avg",
    "recent_score_trend",
    "score_std",
    "previous_attempt_count",
    "days_since_previous_attempt",
    "days_since_first_attempt",
    "previous_easy_count",
    "previous_medium_count",
    "previous_hard_count",
    "previous_hard_ratio",
    "difficulty_easy",
    "difficulty_medium",
    "difficulty_hard",
    "unique_videos_seen_before_attempt",
    "previous_video_count"
]

TARGET_COLUMN = "next_percentage"


def rmse(y_true, y_pred):
    return np.sqrt(mean_squared_error(y_true, y_pred))


def evaluate_pipeline(data_path: str = PROCESSED_DATA_PATH, reports_dir: str = REPORTS_DIR):
    warnings.warn(
        "evaluate.py is deprecated. Please run ml/src/train_all_models.py for authoritative evaluation.",
        DeprecationWarning,
        stacklevel=2
    )
    os.makedirs(reports_dir, exist_ok=True)

    df = pd.read_csv(data_path)

    # Exclude Users 1 and 2
    df = df[~df["user_id"].isin([1, 2])].reset_index(drop=True)

    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].copy()

    # -------------------------------------------------------------
    # STRATEGY 1: TEMPORAL EVALUATION (Train: attempt <= 5, Test: attempt > 5)
    # -------------------------------------------------------------
    train_mask_temp = df["attempt_order_by_user"] <= 5
    test_mask_temp = df["attempt_order_by_user"] > 5

    X_train_temp, y_train_temp = X[train_mask_temp], y[train_mask_temp]
    X_test_temp, y_test_temp = X[test_mask_temp], y[test_mask_temp]

    scaler_temp = StandardScaler()
    X_train_temp_scaled = scaler_temp.fit_transform(X_train_temp)
    X_test_temp_scaled = scaler_temp.transform(X_test_temp)

    # -------------------------------------------------------------
    # STRATEGY 2: USER/GROUP EVALUATION (Unseen users in Test)
    # -------------------------------------------------------------
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx_grp, test_idx_grp = next(gss.split(X, y, groups=df["user_id"]))

    X_train_grp, y_train_grp = X.iloc[train_idx_grp], y.iloc[train_idx_grp]
    X_test_grp, y_test_grp = X.iloc[test_idx_grp], y.iloc[test_idx_grp]

    scaler_grp = StandardScaler()
    X_train_grp_scaled = scaler_grp.fit_transform(X_train_grp)
    X_test_grp_scaled = scaler_grp.transform(X_test_grp)

    results = []

    models_config = {
        "Linear_Regression": lambda: Ridge(alpha=1.0, random_state=42),
        "Random_Forest": lambda: RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42),
        "Gradient_Boosting": lambda: GradientBoostingRegressor(n_estimators=100, learning_rate=0.05, max_depth=4, random_state=42),
        "XGBoost": lambda: XGBRegressor(n_estimators=100, learning_rate=0.05, max_depth=4, random_state=42)
    }

    # Evaluate Baseline Model (Historical Average)
    y_pred_base_temp = X_test_temp["overall_previous_avg"]
    results.append({
        "Model": "Historical_Average_Baseline",
        "Evaluation_Strategy": "Temporal (Later Attempts)",
        "Train_Size": len(y_train_temp),
        "Test_Size": len(y_test_temp),
        "MAE": mean_absolute_error(y_test_temp, y_pred_base_temp),
        "RMSE": rmse(y_test_temp, y_pred_base_temp),
        "R2": r2_score(y_test_temp, y_pred_base_temp)
    })

    y_pred_base_grp = X_test_grp["overall_previous_avg"]
    results.append({
        "Model": "Historical_Average_Baseline",
        "Evaluation_Strategy": "User_Group (Unseen Users)",
        "Train_Size": len(y_train_grp),
        "Test_Size": len(y_test_grp),
        "MAE": mean_absolute_error(y_test_grp, y_pred_base_grp),
        "RMSE": rmse(y_test_grp, y_pred_base_grp),
        "R2": r2_score(y_test_grp, y_pred_base_grp)
    })

    # Evaluate Candidate ML Models
    for m_name, m_builder in models_config.items():
        m_temp = m_builder()
        if m_name == "Linear_Regression":
            m_temp.fit(X_train_temp_scaled, y_train_temp)
            y_pred_temp = m_temp.predict(X_test_temp_scaled)
        else:
            m_temp.fit(X_train_temp, y_train_temp)
            y_pred_temp = m_temp.predict(X_test_temp)

        results.append({
            "Model": m_name,
            "Evaluation_Strategy": "Temporal (Later Attempts)",
            "Train_Size": len(y_train_temp),
            "Test_Size": len(y_test_temp),
            "MAE": mean_absolute_error(y_test_temp, y_pred_temp),
            "RMSE": rmse(y_test_temp, y_pred_temp),
            "R2": r2_score(y_test_temp, y_pred_temp)
        })

        m_grp = m_builder()
        if m_name == "Linear_Regression":
            m_grp.fit(X_train_grp_scaled, y_train_grp)
            y_pred_grp = m_grp.predict(X_test_grp_scaled)
        else:
            m_grp.fit(X_train_grp, y_train_grp)
            y_pred_grp = m_grp.predict(X_test_grp)

        results.append({
            "Model": m_name,
            "Evaluation_Strategy": "User_Group (Unseen Users)",
            "Train_Size": len(y_train_grp),
            "Test_Size": len(y_test_grp),
            "MAE": mean_absolute_error(y_test_grp, y_pred_grp),
            "RMSE": rmse(y_test_grp, y_pred_grp),
            "R2": r2_score(y_test_grp, y_pred_grp)
        })

    df_res = pd.DataFrame(results)
    df_res["MAE"] = df_res["MAE"].round(3)
    df_res["RMSE"] = df_res["RMSE"].round(3)
    df_res["R2"] = df_res["R2"].round(4)

    return df_res


if __name__ == "__main__":
    evaluate_pipeline()
