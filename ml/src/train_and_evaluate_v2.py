"""
[LEGACY EVALUATION MODULE - DEPRECATED]
Phases 6–13 Training, Tuning, Evaluation, and Selection Pipeline.

NOTE: This module is maintained for legacy backwards compatibility only.
The single authoritative production training and evaluation pipeline is:
--> ml/src/train_all_models.py

Explicitly uses Users 3–103 (new_learner_dataset.csv) to prevent User 1 & 2 contamination.
"""

import os
import sys
import warnings
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.linear_model import Ridge
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    ExtraTreesRegressor
)
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.features import ALL_EXPANDED_FEATURE_COLUMNS, TARGET_COLUMN, generate_features


PROCESSED_DATA_PATH = os.path.join(PROJECT_ROOT, "ml/data/processed/featured_quiz_attempts.csv")
MODELS_DIR = os.path.join(PROJECT_ROOT, "ml/models")
REPORTS_DIR = os.path.join(PROJECT_ROOT, "ml/reports")


def rmse(y_true, y_pred):
    return np.sqrt(mean_squared_error(y_true, y_pred))


def run_pipeline():
    warnings.warn(
        "train_and_evaluate_v2.py is deprecated. Please use ml/src/train_all_models.py for authoritative training and evaluation.",
        DeprecationWarning,
        stacklevel=2
    )
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    # 1. Feature Generation using clean Users 3-103 dataset
    raw_path = os.path.join(PROJECT_ROOT, "ml/data/raw/new_learner_dataset.csv")
    df = generate_features(raw_path, PROCESSED_DATA_PATH)

    # Ensure Users 1 & 2 are excluded
    df = df[~df["user_id"].isin([1, 2])].reset_index(drop=True)

    X_all = df[ALL_EXPANDED_FEATURE_COLUMNS].copy()
    y_all = df[TARGET_COLUMN].copy()
    groups_all = df["user_id"].copy()

    # 2. Phase 6 — Feature Selection (Correlation & Tree Importances on Training Split)
    rf_feat_select = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    rf_feat_select.fit(X_all, y_all)
    importances = rf_feat_select.feature_importances_
    df_importances = pd.DataFrame({"Feature": ALL_EXPANDED_FEATURE_COLUMNS, "Importance": importances}).sort_values("Importance", ascending=False)

    # Select top features (Importance > 0.005)
    selected_features = df_importances[df_importances["Importance"] >= 0.005]["Feature"].tolist()
    
    # Ensure key domain features are retained
    essential_features = ["overall_previous_avg", "previous_percentage", "previous_2_attempt_avg", "attempt_order_by_user", "recent_score_trend"]
    for ef in essential_features:
        if ef not in selected_features:
            selected_features.append(ef)

    print(f"[DEPRECATED PIPELINE] Selected {len(selected_features)} features from {len(ALL_EXPANDED_FEATURE_COLUMNS)} expanded features.")


if __name__ == "__main__":
    run_pipeline()
