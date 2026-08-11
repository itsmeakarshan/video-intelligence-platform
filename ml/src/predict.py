"""
Prediction Module for Video Intelligence Platform ML Pipeline.

Loads trained regression model, classifier, scaler, and metadata artifacts from ml/models/.
Enforces strict model feature contracts for selected Feature Set (D_CORE_LEARNING).
"""

import os
import sys
import joblib
import pandas as pd
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.features import (
    ALL_EXPANDED_FEATURE_COLUMNS,
    extract_features_from_prior_attempts
)

MODELS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../models")
)


class ScorePredictor:
    def __init__(self, models_dir: str = MODELS_DIR):
        self.models_dir = models_dir
        self.meta = joblib.load(os.path.join(models_dir, "pipeline_meta.joblib"))
        self.scaler = joblib.load(os.path.join(models_dir, "scaler.joblib"))
        self.feature_columns = self.meta["feature_columns"]

        # Validate Feature Contract against Authoritative List
        self._validate_feature_contract()

        # Regression Model Loading
        reg_meta_path = os.path.join(models_dir, "regression_meta.joblib")
        reg_model_path = os.path.join(models_dir, "best_regression_model.joblib")

        if os.path.exists(reg_meta_path):
            self.reg_meta = joblib.load(reg_meta_path)
            self.model_name = self.reg_meta.get("model_name", "Extra Trees Regressor")
        else:
            self.reg_meta = {}
            self.model_name = self.meta.get("best_model_name", "Extra Trees Regressor").replace("_", " ").title()

        if os.path.exists(reg_model_path):
            self.model = joblib.load(reg_model_path)
        else:
            fallback_name = f"{self.model_name.lower().replace(' ', '_')}.joblib"
            self.model = joblib.load(os.path.join(models_dir, fallback_name))

        self.model_version = f"{self.model_name}_v4.0"

        # Classification Model Loading
        clf_meta_path = os.path.join(models_dir, "classification_meta.joblib")
        clf_model_path = os.path.join(models_dir, "best_classifier.joblib")

        if os.path.exists(clf_meta_path) and os.path.exists(clf_model_path):
            self.clf_meta = joblib.load(clf_meta_path)
            self.classifier = joblib.load(clf_model_path)
            self.clf_name = self.clf_meta.get("best_classifier_name", "Extra Trees Classifier")
            self.clf_threshold = self.clf_meta.get("threshold", 0.50)
            self.clf_version = f"{self.clf_name}_v4.0"
        else:
            self.classifier = None
            self.clf_name = "Extra Trees Classifier"
            self.clf_threshold = 0.50
            self.clf_version = "Extra Trees Classifier_v4.0"

    def _validate_feature_contract(self):
        """
        Validates that loaded model feature columns are valid subset of ALL_EXPANDED_FEATURE_COLUMNS.
        """
        expected_superset = set(ALL_EXPANDED_FEATURE_COLUMNS)
        loaded_set = set(self.feature_columns)

        invalid_features = loaded_set - expected_superset
        if invalid_features:
            raise ValueError(
                f"Model Feature Contract Error: Unknown features found in model metadata: {invalid_features}"
            )

    def _extract_features_dict(self, attempts: list[dict], target_difficulty: str) -> tuple[dict, int, float, float]:
        f_dict = extract_features_from_prior_attempts(attempts, target_difficulty=target_difficulty)
        total_prev_attempts = len(attempts)
        overall_prev_avg = float(f_dict["overall_previous_avg"])
        recent_trend = float(f_dict["recent_score_trend"])
        return f_dict, total_prev_attempts, overall_prev_avg, recent_trend

    def predict_from_user_history(
        self,
        attempts: list[dict],
        target_difficulty: str = "Medium"
    ) -> dict:
        num_attempts = len(attempts)
        if num_attempts < 1:
            return {
                "has_sufficient_history": False,
                "attempt_count": 0,
                "message": "Complete at least 1 quiz to receive a personalized performance forecast.",
                "predicted_percentage": None,
                "raw_predicted_percentage": None
            }

        f_dict, total_prev_attempts, overall_prev_avg, recent_trend = self._extract_features_dict(attempts, target_difficulty)
        X_input = pd.DataFrame([f_dict])[self.feature_columns]

        if hasattr(self.model, "feature_names_in_"):
            pred_raw = self.model.predict(X_input)[0]
        else:
            X_scaled = self.scaler.transform(X_input)
            pred_raw = self.model.predict(X_scaled)[0]

        pred_raw_float = float(pred_raw)
        predicted_percentage = round(float(np.clip(pred_raw_float, 0.0, 100.0)), 1)

        return {
            "has_sufficient_history": True,
            "predicted_percentage": predicted_percentage,
            "raw_predicted_percentage": round(pred_raw_float, 2),
            "attempt_count": total_prev_attempts,
            "historical_avg": round(overall_prev_avg, 1),
            "recent_trend": round(recent_trend, 1),
            "target_difficulty": target_difficulty,
            "model_version": self.model_version
        }

    def predict_pass_from_user_history(
        self,
        attempts: list[dict],
        target_difficulty: str = "Medium"
    ) -> dict:
        num_attempts = len(attempts)
        if num_attempts < 1:
            return {
                "has_sufficient_history": False,
                "attempt_count": 0,
                "message": "Complete at least 1 quiz to receive a personalized pass/fail prediction.",
                "predicted_class": None,
                "probability_of_pass": None
            }

        f_dict, total_prev_attempts, overall_prev_avg, recent_trend = self._extract_features_dict(attempts, target_difficulty)
        X_input = pd.DataFrame([f_dict])[self.feature_columns]

        if self.classifier is not None:
            prob_pass = float(self.classifier.predict_proba(X_input)[0][1])
            is_pass = prob_pass >= self.clf_threshold
        else:
            prob_pass = float(np.clip(overall_prev_avg / 100.0, 0.0, 1.0))
            is_pass = overall_prev_avg >= 70.0

        return {
            "has_sufficient_history": True,
            "predicted_class": "pass" if is_pass else "fail",
            "probability_of_pass": round(prob_pass, 3),
            "threshold": round(float(self.clf_threshold), 2),
            "attempt_count": total_prev_attempts,
            "historical_avg": round(overall_prev_avg, 1),
            "target_difficulty": target_difficulty,
            "model_version": self.clf_version
        }


_predictor = None

def get_predictor() -> ScorePredictor:
    global _predictor
    if _predictor is None:
        _predictor = ScorePredictor()
    return _predictor


if __name__ == "__main__":
    predictor = ScorePredictor()
    sample_attempts = [
        {"attempt_id": 1, "score": 5, "percentage": 50.0, "difficulty": "Medium", "created_at": "2026-08-01 10:00:00", "video_ids": "10"},
        {"attempt_id": 2, "score": 6, "percentage": 60.0, "difficulty": "Medium", "created_at": "2026-08-03 11:00:00", "video_ids": "10"},
        {"attempt_id": 3, "score": 7, "percentage": 75.0, "difficulty": "Hard", "created_at": "2026-08-05 12:00:00", "video_ids": "11,12"}
    ]
    res_reg = predictor.predict_from_user_history(sample_attempts, target_difficulty="Medium")
    res_clf = predictor.predict_pass_from_user_history(sample_attempts, target_difficulty="Medium")
    print("Regression Result:", res_reg)
    print("Classification Result:", res_clf)
