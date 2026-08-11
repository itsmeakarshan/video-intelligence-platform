"""
ML Prediction Service for Video Intelligence Platform.

Handles in-memory cached model loading and prediction generation for:
1. Next Quiz Score Regression (GradientBoostingRegressor)
2. Next Quiz Pass/Fail Classification (Logistic Regression)

Ensures zero target leakage, strict multi-user data isolation, and robust error handling.
"""

import sys
import os
import logging
from sqlalchemy.orm import Session

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.models.quiz_attempt import QuizAttempt
from ml.src.predict import get_predictor, ScorePredictor

logger = logging.getLogger(__name__)


def generate_next_quiz_prediction(user_id: int, target_difficulty: str, db: Session) -> dict:
    """
    Generates next-quiz performance and pass predictions for user_id.
    Includes all committed attempts for user_id in the database.
    """
    try:
        attempts_db = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.user_id == user_id)
            .order_by(QuizAttempt.created_at.asc(), QuizAttempt.id.asc())
            .all()
        )

        attempts_data = []
        for att in attempts_db:
            video_ids_str = ",".join(str(v.id) for v in att.videos) if att.videos else (str(att.video_id) if att.video_id else "")
            attempts_data.append({
                "attempt_id": att.id,
                "score": att.score,
                "total_questions": att.total_questions,
                "percentage": att.percentage,
                "difficulty": att.difficulty,
                "created_at": att.created_at,
                "video_ids": video_ids_str,
                "video_count": len(att.videos) if att.videos else (1 if att.video_id else 0)
            })

        if len(attempts_data) < 1:
            return {
                "available": False,
                "reason": "insufficient_history",
                "message": "Complete another quiz to unlock your personalized prediction."
            }

        predictor: ScorePredictor = get_predictor()

        reg_res = predictor.predict_from_user_history(attempts_data, target_difficulty=target_difficulty)
        clf_res = predictor.predict_pass_from_user_history(attempts_data, target_difficulty=target_difficulty)

        if not reg_res.get("has_sufficient_history"):
            return {
                "available": False,
                "reason": "insufficient_history",
                "message": "Complete another quiz to unlock your personalized prediction."
            }

        pred_score = float(reg_res["predicted_percentage"])
        pred_score_clipped = round(max(0.0, min(100.0, pred_score)), 1)

        pass_prob = float(clf_res["probability_of_pass"])
        pass_prob_clipped = round(max(0.0, min(1.0, pass_prob)), 2)

        return {
            "available": True,
            "predicted_score": pred_score_clipped,
            "pass_probability": pass_prob_clipped,
            "pass_threshold": 70,
            "attempt_count": len(attempts_data),
            "target_difficulty": target_difficulty,
            "regression_model": predictor.model_version,
            "classification_model": predictor.clf_version
        }

    except Exception as e:
        logger.error(f"Error generating ML prediction for user {user_id}: {e}", exc_info=True)
        return {
            "available": False,
            "reason": "prediction_error",
            "message": "Your quiz was saved successfully. Your prediction is temporarily unavailable."
        }
