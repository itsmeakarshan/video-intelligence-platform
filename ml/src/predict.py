"""
Prediction Module for Video Intelligence Platform ML Pipeline.

Loads trained regression model, scaler, and metadata artifacts from ml/models/.
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


FEATURE_DISPLAY_NAMES = {
    "previous_percentage": "Previous Quiz Score",
    "previous_score": "Previous Raw Score",
    "previous_2_attempt_avg": "2-Quiz Score Average",
    "previous_3_attempt_avg": "3-Quiz Score Average",
    "previous_5_attempt_avg": "5-Quiz Score Average",
    "overall_previous_avg": "Overall Historical Average",
    "median_previous_score": "Median Historical Score",
    "best_previous_score": "Personal Best Score",
    "worst_previous_score": "Lowest Historical Score",
    "score_range": "Score Range Spread",
    "score_std": "Score Volatility",
    "ewma_03": "Exponential Score Average (Fast)",
    "ewma_05": "Exponential Score Average (Smooth)",
    "total_previous_attempts": "Total Quizzes Taken",
    "attempt_order_by_user": "Quiz Attempt Number",
    "attempts_last_7_days": "7-Day Quiz Activity",
    "attempts_last_14_days": "14-Day Quiz Activity",
    "attempts_last_30_days": "30-Day Quiz Activity",
    "average_days_between_attempts": "Average Days Between Quizzes",
    "time_gap_std": "Practice Schedule Consistency",
    "days_since_previous_attempt": "Recency (Days Since Last Quiz)",
    "days_since_first_attempt": "Tenure (Days Since First Quiz)",
    "attempt_frequency": "Weekly Quiz Frequency",
    "previous_easy_count": "Easy Quizzes Taken",
    "previous_medium_count": "Medium Quizzes Taken",
    "previous_hard_count": "Hard Quizzes Taken",
    "previous_hard_ratio": "Ratio of Hard Quizzes",
    "previous_average_easy_score": "Easy Difficulty Score Average",
    "previous_average_medium_score": "Medium Difficulty Score Average",
    "previous_average_hard_score": "Hard Difficulty Score Average",
    "difficulty_transition_delta": "Target vs Prior Difficulty Shift",
    "difficulty_easy": "Target Difficulty: Easy",
    "difficulty_medium": "Target Difficulty: Medium",
    "difficulty_hard": "Target Difficulty: Hard",
    "unique_videos_seen": "Unique Study Videos Watched",
    "total_previous_video_interactions": "Total Study Video Views",
    "repeated_video_ratio": "Video Re-watch Rate",
    "number_of_videos_in_recent_attempts": "Recent Video Diversity",
    "recent_score_trend": "Recent Score Trend",
    "long_term_score_trend": "Long-Term Score Trend",
    "recent_vs_overall_average": "Recent vs Overall Average",
    "improvement_from_first_attempt": "Improvement From First Quiz",
    "rolling_slope_3": "3-Quiz Score Trajectory",
    "rolling_slope_5": "5-Quiz Score Trajectory",
    "consecutive_improvements": "Consecutive Score Improvements",
    "consecutive_declines": "Consecutive Score Declines",
    "total_passes": "Total Passes",
    "total_failures": "Total Failures",
    "historical_pass_rate": "Historical Pass Rate",
    "recent_3_pass_rate": "Recent 3-Quiz Pass Rate",
    "consecutive_passes": "Consecutive Passed Quizzes",
    "consecutive_failures": "Consecutive Failures"
}

# Conformal Prediction Calibration Parameters (Calibrated on 5-Fold GroupKFold OOF Validation)
CONFORMAL_MARGIN_90 = 7.8  # q_90 margin (+/- 7.8% score points)
CONFORMAL_COVERAGE_TARGET = 90.0
CONFORMAL_EMPIRICAL_COVERAGE = 89.9


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
            raise FileNotFoundError(f"Production regression model artifact not found at: {reg_model_path}")

        self.model_version = f"{self.model_name}_v4.0"

        # Initialize SHAP TreeExplainer for the production model
        import shap
        self.shap = shap
        self.explainer = shap.TreeExplainer(self.model)

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

    def _extract_features_dict(self, attempts: list[dict], target_difficulty: str) -> tuple[dict, int, float]:
        f_dict = extract_features_from_prior_attempts(attempts, target_difficulty=target_difficulty)
        total_prev_attempts = len(attempts)
        overall_prev_avg = float(f_dict["overall_previous_avg"])
        return f_dict, total_prev_attempts, overall_prev_avg

    def _compute_shap_explanation(self, X_input: pd.DataFrame) -> dict:
        """
        Calculates local SHAP feature contributions for the current prediction instance.
        """
        shap_values = self.explainer(X_input).values[0]
        exp_val = self.explainer.expected_value
        base_value = float(exp_val[0] if isinstance(exp_val, (list, np.ndarray)) else exp_val)

        factors = []
        for feat_name, shap_val in zip(self.feature_columns, shap_values):
            val_float = float(shap_val)
            if abs(val_float) >= 0.05:
                factors.append({
                    "feature_key": feat_name,
                    "feature_name": FEATURE_DISPLAY_NAMES.get(feat_name, feat_name.replace("_", " ").title()),
                    "shap_value": round(val_float, 2),
                    "impact_direction": "positive" if val_float > 0 else "negative"
                })

        # Separate positive & negative factors, sorted by absolute impact magnitude
        pos_factors = sorted([f for f in factors if f["impact_direction"] == "positive"], key=lambda f: f["shap_value"], reverse=True)
        neg_factors = sorted([f for f in factors if f["impact_direction"] == "negative"], key=lambda f: f["shap_value"])

        return {
            "base_value": round(base_value, 1),
            "top_positive": pos_factors[:3],
            "top_negative": neg_factors[:3]
        }

    def _compute_prediction_interval(self, predicted_percentage: float) -> dict:
        """
        Computes a 90% Conformal Prediction Interval based on held-out out-of-fold calibration errors.
        """
        lower = round(float(np.clip(predicted_percentage - CONFORMAL_MARGIN_90, 0.0, 100.0)), 1)
        upper = round(float(np.clip(predicted_percentage + CONFORMAL_MARGIN_90, 0.0, 100.0)), 1)

        return {
            "lower": lower,
            "upper": upper,
            "margin": CONFORMAL_MARGIN_90,
            "coverage_level": CONFORMAL_COVERAGE_TARGET,
            "empirical_coverage": CONFORMAL_EMPIRICAL_COVERAGE,
            "method": "Conformal Prediction (OOF Residual Quantile)",
            "description": "Based on out-of-fold calibration on historical model errors, the learner's next score is expected to fall within this range under a 90% coverage level."
        }

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
                "raw_predicted_percentage": None,
                "prediction_interval": None,
                "explanation": None
            }

        f_dict, total_prev_attempts, overall_prev_avg = self._extract_features_dict(attempts, target_difficulty)
        X_input = pd.DataFrame([f_dict])[self.feature_columns]

        if hasattr(self.model, "feature_names_in_"):
            pred_raw = self.model.predict(X_input)[0]
        else:
            X_scaled = self.scaler.transform(X_input)
            pred_raw = self.model.predict(X_scaled)[0]

        pred_raw_float = float(pred_raw)
        predicted_percentage = round(float(np.clip(pred_raw_float, 0.0, 100.0)), 1)

        # Compute SHAP explanation and Conformal prediction interval
        explanation = self._compute_shap_explanation(X_input)
        prediction_interval = self._compute_prediction_interval(predicted_percentage)

        return {
            "has_sufficient_history": True,
            "predicted_percentage": predicted_percentage,
            "raw_predicted_percentage": round(pred_raw_float, 2),
            "attempt_count": total_prev_attempts,
            "historical_avg": round(overall_prev_avg, 1),
            "target_difficulty": target_difficulty,
            "model_version": self.model_version,
            "prediction_interval": prediction_interval,
            "explanation": explanation
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
    print("Regression Result:", res_reg)
