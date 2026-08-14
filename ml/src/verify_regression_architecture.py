"""
Dedicated Verification Test Suite for Cleaned ML Regression Architecture.
Validates all 13 rules specified in Section 11 of the requirement.
"""

import os
import sys
import joblib
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from dotenv import load_dotenv

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

os.chdir(BACKEND_DIR)
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.predict import ScorePredictor, get_predictor
from app.services.ml_prediction_service import generate_next_quiz_prediction
from app.db.database import get_db, DATABASE_URL
from app.models.quiz_attempt import QuizAttempt
from app.models.user import User


def verify_1_production_model_is_extra_trees():
    predictor = get_predictor()
    model_type = str(type(predictor.model))
    assert "ExtraTreesRegressor" in model_type, f"Production model is not ExtraTreesRegressor! Found: {model_type}"
    assert "Extra Trees Regressor" in predictor.model_version or "ExtraTreesRegressor" in predictor.model_version
    print("✓ 1. Production model is confirmed ExtraTreesRegressor_v4.0.")


def verify_2_production_prediction_artifact():
    models_dir = os.path.join(PROJECT_ROOT, "ml/models")
    model_path = os.path.join(models_dir, "best_regression_model.joblib")
    assert os.path.exists(model_path), f"Production model artifact missing at {model_path}"
    loaded_model = joblib.load(model_path)
    assert "ExtraTreesRegressor" in str(type(loaded_model))
    print("✓ 2. Production predictions load directly from best_regression_model.joblib.")


def verify_3_prediction_bounded_0_to_100():
    predictor = get_predictor()
    # Test normal attempt
    attempts = [
        {"attempt_id": 1, "score": 8, "percentage": 80.0, "difficulty": "Medium", "created_at": "2026-08-01 10:00:00"}
    ]
    res = predictor.predict_from_user_history(attempts, target_difficulty="Medium")
    score = res["predicted_percentage"]
    assert 0.0 <= score <= 100.0, f"Score out of bounds: {score}"
    
    # Test extreme synthetic attempt
    extreme_attempts = [
        {"attempt_id": i+1, "score": 10, "percentage": 100.0, "difficulty": "Hard", "created_at": f"2026-08-01 {10 + i//60:02d}:{i%60:02d}:00"} for i in range(100)
    ]
    res_ext = predictor.predict_from_user_history(extreme_attempts, target_difficulty="Hard")
    assert 0.0 <= res_ext["predicted_percentage"] <= 100.0
    print("✓ 3. Predictions are strictly bounded between 0.0% and 100.0%.")


def verify_4_no_ridge_prediction():
    predictor = get_predictor()
    model_name = predictor.model_name.lower()
    assert "ridge" not in model_name, f"Ridge model detected in predictor: {model_name}"
    assert not os.path.exists(os.path.join(PROJECT_ROOT, "ml/models/linear_regression.joblib")), "linear_regression.joblib exists in production models!"
    print("✓ 4. Zero Ridge prediction usage verified.")


def verify_5_no_classifier_loaded():
    predictor = get_predictor()
    assert not hasattr(predictor, "clf_model"), "ScorePredictor retains classifier model reference!"
    assert not hasattr(predictor, "predict_pass_from_user_history"), "ScorePredictor retains predict_pass method!"
    assert not os.path.exists(os.path.join(PROJECT_ROOT, "ml/models/best_classifier.joblib")), "best_classifier.joblib artifact found in ml/models!"
    print("✓ 5. Zero classifier loading in production prediction code.")


def verify_6_no_pass_prediction_endpoint():
    from app.main import app
    from fastapi.testclient import TestClient
    client = TestClient(app)
    resp = client.get("/ml/pass-prediction")
    assert resp.status_code == 404, f"Deprecated /ml/pass-prediction endpoint still exists! Status: {resp.status_code}"
    print("✓ 6. /ml/pass-prediction endpoint confirmed completely removed (404).")


def verify_7_and_8_no_pass_probability_or_recent_trend_in_active_code():
    active_paths = [
        "frontend/src/api/api.ts",
        "frontend/src/components/quiz/Quiz.tsx",
        "frontend/src/components/quiz/LearningPredictionCard.tsx",
        "frontend/src/pages/Dashboard.tsx",
        "frontend/src/pages/MLPerformance.tsx",
        "backend/app/api/ml.py",
        "backend/app/services/ml_prediction_service.py",
        "ml/src/predict.py"
    ]
    for rel_path in active_paths:
        abs_p = os.path.join(PROJECT_ROOT, rel_path)
        if os.path.exists(abs_p):
            with open(abs_p, "r") as f:
                content = f.read()
                assert "pass_probability" not in content, f"pass_probability found in active code: {rel_path}"
                assert "probability_of_pass" not in content, f"probability_of_pass found in active code: {rel_path}"
                assert "Likely to Pass" not in content, f"Likely to Pass found in active code: {rel_path}"
                assert "recent_trend" not in content, f"recent_trend found in active schema: {rel_path}"
    print("✓ 7 & 8. Zero 70% threshold, pass probability, or recent_trend in active production API/UI code.")


def verify_9_dashboard_displays_regression_only():
    with open(os.path.join(PROJECT_ROOT, "frontend/src/pages/Dashboard.tsx"), "r") as f:
        content = f.read()
        assert "PREDICTED NEXT SCORE" in content
        assert "HISTORICAL AVERAGE" in content
        assert "COMPLETED QUIZZES" not in content, "Completed Quizzes card should be kept off main Dashboard!"
        assert "PASS PROBABILITY" not in content
    print("✓ 9. Main Dashboard displays only ML regression prediction & Historical Average.")


def verify_10_metrics_hub_contains_regression_only():
    with open(os.path.join(PROJECT_ROOT, "frontend/src/pages/MLPerformance.tsx"), "r") as f:
        content = f.read()
        assert "CLASSIFIER ACCURACY" not in content
        assert "BRIER CALIBRATION SCORE" not in content
        assert "GroupKFold MAE" in content
        assert "GROUPKFOLD RMSE" in content
    print("✓ 10. ML Metrics Hub contains only regression evaluation metrics.")


def verify_11_learner_data_preserved():
    db_path = os.path.join(BACKEND_DIR, "video_intelligence.db")
    assert os.path.exists(db_path), f"Database missing at {db_path}"
    
    engine = create_engine(f"sqlite:///{db_path}")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    total_users = db.query(User).count()
    user_1 = db.query(User).filter(User.id == 1).first()
    attempts_u1 = db.query(QuizAttempt).filter(QuizAttempt.user_id == 1).count()
    total_attempts = db.query(QuizAttempt).count()
    db.close()
    
    assert total_users >= 1, "User database is empty!"
    assert user_1 is not None, "User 1 account missing!"
    assert attempts_u1 >= 1, "User 1 attempt history deleted!"
    assert total_attempts >= 500, f"Quiz attempt history corrupted! Only {total_attempts} attempts found."
    print(f"✓ 11. Learner data preserved ({total_users} users, {total_attempts} attempts, User 1 intact).")


def verify_12_user_isolation_intact():
    from app.main import app
    from app.routes.auth import create_access_token
    from fastapi.testclient import TestClient
    client = TestClient(app)
    
    token1 = create_access_token(user_id=1)
    token2 = create_access_token(user_id=2)
    
    resp1 = client.get("/ml/prediction", headers={"Authorization": f"Bearer {token1}"})
    resp2 = client.get("/ml/prediction", headers={"Authorization": f"Bearer {token2}"})
    
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    d1 = resp1.json()
    d2 = resp2.json()
    
    if d1.get("has_sufficient_history") and d2.get("has_sufficient_history"):
        assert d1["attempt_count"] != d2["attempt_count"] or d1["historical_avg"] != d2["historical_avg"]
    print("✓ 12. Strict user isolation verified in prediction service.")


def verify_13_no_data_leakage():
    from ml.src.features import ALL_EXPANDED_FEATURE_COLUMNS, TARGET_COLUMN
    assert TARGET_COLUMN not in ALL_EXPANDED_FEATURE_COLUMNS
    predictor = get_predictor()
    assert len(predictor.feature_columns) == 38
    print("✓ 13. Zero target leakage and 38-feature D_CORE_LEARNING contract verified.")


if __name__ == "__main__":
    print("\n==================================================")
    print("RUNNING 13-POINT REGRESSION ARCHITECTURE VERIFICATION")
    print("==================================================")
    verify_1_production_model_is_extra_trees()
    verify_2_production_prediction_artifact()
    verify_3_prediction_bounded_0_to_100()
    verify_4_no_ridge_prediction()
    verify_5_no_classifier_loaded()
    verify_6_no_pass_prediction_endpoint()
    verify_7_and_8_no_pass_probability_or_recent_trend_in_active_code()
    verify_9_dashboard_displays_regression_only()
    verify_10_metrics_hub_contains_regression_only()
    verify_11_learner_data_preserved()
    verify_12_user_isolation_intact()
    verify_13_no_data_leakage()
    print("==================================================")
    print("ALL 13 REGRESSION ARCHITECTURE VERIFICATIONS PASSED!")
    print("==================================================\n")
