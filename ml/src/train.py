"""
Model Training and Serialization Module for Video Intelligence Platform ML Pipeline.

Trains baseline and ML regressor models (Linear Regression, Random Forest,
Gradient Boosting, XGBoost) using leak-free features to predict next_percentage.
Saves trained models, feature scaler, and artifact metadata to ml/models/.
"""

import os
import joblib
import numpy as np
import pandas as pd

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor


PROCESSED_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/processed/featured_quiz_attempts.csv")
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


def train_and_save_pipeline(
    data_path: str = PROCESSED_DATA_PATH,
    models_dir: str = MODELS_DIR,
    random_state: int = 42
):
    """
    Trains all candidate models on full feature matrix and saves best production model
    along with scaler and feature list.
    """
    os.makedirs(models_dir, exist_ok=True)

    df = pd.read_csv(data_path)

    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].copy()

    # Preprocessing scaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Initialize models
    models = {
        "Linear_Regression": Ridge(alpha=1.0, random_state=random_state),
        "Random_Forest": RandomForestRegressor(
            n_estimators=100, max_depth=6, random_state=random_state
        ),
        "Gradient_Boosting": GradientBoostingRegressor(
            n_estimators=100, learning_rate=0.05, max_depth=4, random_state=random_state
        ),
        "XGBoost": XGBRegressor(
            n_estimators=100, learning_rate=0.05, max_depth=4, random_state=random_state
        )
    }

    trained_models = {}

    for name, model in models.items():
        if name in ["Linear_Regression"]:
            model.fit(X_scaled, y)
        else:
            model.fit(X, y)

        model_filepath = os.path.join(models_dir, f"{name.lower()}.joblib")
        joblib.dump(model, model_filepath)
        trained_models[name] = model
        print(f"Trained and saved model: {name} -> {model_filepath}")

    # Save scaler and feature list artifact
    scaler_filepath = os.path.join(models_dir, "scaler.joblib")
    joblib.dump(scaler, scaler_filepath)

    meta_filepath = os.path.join(models_dir, "pipeline_meta.joblib")
    meta = {
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "random_state": random_state,
        "best_model_name": "Gradient_Boosting"
    }
    joblib.dump(meta, meta_filepath)

    print(f"Saved scaler and metadata artifact to: {models_dir}")
    return trained_models, scaler, meta


if __name__ == "__main__":
    train_and_save_pipeline()
