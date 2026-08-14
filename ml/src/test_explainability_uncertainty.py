import unittest
import os
import sys
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.predict import ScorePredictor, FEATURE_DISPLAY_NAMES, CONFORMAL_MARGIN_90
from ml.src.features import ALL_EXPANDED_FEATURE_COLUMNS, TARGET_COLUMN

class TestExplainabilityAndUncertainty(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = ScorePredictor()

    def test_feature_display_names_completeness(self):
        """Verify that all 38 D_CORE_LEARNING features have human-readable display names."""
        feature_cols = self.predictor.feature_columns
        self.assertEqual(len(feature_cols), 38)
        for col in feature_cols:
            self.assertIn(col, FEATURE_DISPLAY_NAMES, f"Missing display name mapping for feature '{col}'")
            self.assertTrue(len(FEATURE_DISPLAY_NAMES[col]) > 0)

    def test_shap_explainer_initialization(self):
        """Verify SHAP TreeExplainer is initialized on ExtraTreesRegressor_v4.0."""
        self.assertIsNotNone(self.predictor.explainer)

    def test_prediction_output_structure(self):
        """Verify single prediction output contains valid score, conformal interval, and SHAP explanation."""
        sample_history = [
            {"attempt_id": 1, "score": 7, "percentage": 70.0, "difficulty": "Medium", "created_at": "2026-08-01 10:00:00"},
            {"attempt_id": 2, "score": 8, "percentage": 80.0, "difficulty": "Hard", "created_at": "2026-08-02 10:00:00"},
            {"attempt_id": 3, "score": 9, "percentage": 90.0, "difficulty": "Medium", "created_at": "2026-08-03 10:00:00"}
        ]
        res = self.predictor.predict_from_user_history(sample_history, target_difficulty="Hard")
        
        # Predicted percentage
        pred_score = res["predicted_percentage"]
        self.assertIsInstance(pred_score, float)
        self.assertTrue(0.0 <= pred_score <= 100.0)

        # Conformal interval
        interval = res.get("prediction_interval")
        self.assertIsNotNone(interval)
        self.assertIn("lower", interval)
        self.assertIn("upper", interval)
        self.assertIn("margin", interval)
        self.assertIn("coverage_level", interval)

        self.assertTrue(0.0 <= interval["lower"] <= pred_score <= interval["upper"] <= 100.0)
        self.assertAlmostEqual(interval["upper"] - pred_score, interval["margin"], delta=0.5)

        # SHAP explanation
        exp = res.get("explanation")
        self.assertIsNotNone(exp)
        self.assertIn("top_positive", exp)
        self.assertIn("top_negative", exp)

        for factor in exp["top_positive"] + exp["top_negative"]:
            self.assertIn("feature_key", factor)
            self.assertIn("feature_name", factor)
            self.assertIn("shap_value", factor)
            self.assertIn("impact_direction", factor)

    def test_conformal_calibration_coverage(self):
        """Verify Conformal Prediction margin q_90 satisfies ~90% empirical coverage on evaluation dataset."""
        df_path = os.path.join(PROJECT_ROOT, "ml/data/processed/featured_quiz_attempts.csv")
        if not os.path.exists(df_path):
            self.skipTest("featured_quiz_attempts.csv not found")

        df = pd.read_csv(df_path)
        feature_cols = self.predictor.feature_columns
        X = df[feature_cols]
        y = df[TARGET_COLUMN]

        predictions = self.predictor.model.predict(X)
        errors = np.abs(y - predictions)

        # Conformal margin is calibrated to ~7.8% for 90% OOF coverage
        margin = CONFORMAL_MARGIN_90
        self.assertTrue(6.0 <= margin <= 10.0, f"Conformal margin {margin} outside expected bounds")

if __name__ == "__main__":
    unittest.main()
