from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_attempt_video import QuizAttemptVideo
from app.models.quiz_attempt_question import QuizAttemptQuestion
from app.models.user import User
from app.models.video import Video
from app.services.ml_prediction_service import generate_next_quiz_prediction
from app.services.youtube_recommendation_service import get_quiz_attempt_recommendations
from app.services.knowledge_profile_service import get_user_knowledge_profile
from app.services.learning_analytics_service import compute_learning_gain, get_ab_experiment_summary

router = APIRouter(prefix="/quiz-attempts", tags=["Quiz Attempts"])


class VideoSimpleSchema(BaseModel):
    id: int
    filename: str
    original_filename: str

    class Config:
        from_attributes = True


class QuestionResultCreate(BaseModel):
    question_index: int
    question_text: str = Field(min_length=1)
    selected_answer: int
    correct_answer: int
    is_correct: bool
    topic: str = Field(default="General Concept")
    explanation: str | None = None


class QuizAttemptCreate(BaseModel):
    video_ids: list[int] | None = None
    video_id: int | None = None
    score: int = Field(ge=0)
    total_questions: int = Field(gt=0)
    difficulty: str = Field(min_length=1, max_length=20)
    questions: list[QuestionResultCreate] | None = None


class PredictionDataSchema(BaseModel):
    available: bool
    predicted_score: float | None = None
    pass_probability: float | None = None
    pass_threshold: int | None = 70
    attempt_count: int | None = None
    target_difficulty: str | None = None
    regression_model: str | None = None
    classification_model: str | None = None
    reason: str | None = None
    message: str | None = None


class QuizAttemptResponse(BaseModel):
    id: int
    user_id: int
    score: int
    total_questions: int
    percentage: float
    difficulty: str
    created_at: datetime
    video_id: int | None = None
    videos: list[VideoSimpleSchema] = []
    prediction: PredictionDataSchema | None = None

    class Config:
        from_attributes = True


class WeakTopicSchema(BaseModel):
    topic: str
    incorrect_count: int


class YouTubeRecommendationSchema(BaseModel):
    topic: str
    title: str
    youtube_video_id: str
    thumbnail_url: str
    channel_name: str
    description: str
    url: str


class RecommendationResponseSchema(BaseModel):
    attempt_id: int
    weak_topics: list[WeakTopicSchema] = []
    recommendations: list[YouTubeRecommendationSchema] = []
    message: str | None = None


@router.post("", response_model=QuizAttemptResponse, status_code=status.HTTP_201_CREATED)
def create_quiz_attempt(
    request: QuizAttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if request.score > request.total_questions:
        raise HTTPException(status_code=422, detail="Score cannot exceed total questions.")

    target_video_ids: list[int] = []
    if request.video_ids:
        target_video_ids.extend(request.video_ids)
    if not target_video_ids and request.video_id is not None:
        target_video_ids.append(request.video_id)

    if not target_video_ids:
        raise HTTPException(status_code=400, detail="At least one video ID must be provided.")

    unique_video_ids = list(dict.fromkeys(target_video_ids))

    valid_videos = db.query(Video).filter(
        Video.id.in_(unique_video_ids),
        Video.user_id == current_user.id
    ).all()

    if len(valid_videos) != len(unique_video_ids):
        raise HTTPException(status_code=403, detail="One or more videos do not belong to the authenticated user.")

    primary_video_id = unique_video_ids[0] if len(unique_video_ids) == 1 else None

    attempt = QuizAttempt(
        user_id=current_user.id,
        video_id=primary_video_id,
        score=request.score,
        total_questions=request.total_questions,
        percentage=(request.score / request.total_questions) * 100,
        difficulty=request.difficulty,
    )
    db.add(attempt)
    db.flush()

    for v_id in unique_video_ids:
        assoc = QuizAttemptVideo(quiz_attempt_id=attempt.id, video_id=v_id)
        db.add(assoc)

    if request.questions:
        for q_req in request.questions:
            q_entity = QuizAttemptQuestion(
                quiz_attempt_id=attempt.id,
                question_index=q_req.question_index,
                question_text=q_req.question_text[:500],
                selected_answer=q_req.selected_answer,
                correct_answer=q_req.correct_answer,
                is_correct=q_req.is_correct,
                topic=q_req.topic[:200] if q_req.topic else "General Concept",
                explanation=q_req.explanation[:1000] if q_req.explanation else None
            )
            db.add(q_entity)

    db.commit()
    db.refresh(attempt)

    try:
        prediction_res = generate_next_quiz_prediction(current_user.id, request.difficulty, db)
        attempt.prediction = prediction_res
    except Exception:
        attempt.prediction = {
            "available": False,
            "reason": "prediction_error",
            "message": "Your quiz was saved successfully. Your prediction is temporarily unavailable."
        }

    return attempt


@router.get("", response_model=list[QuizAttemptResponse])
def list_quiz_attempts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .all()
    )


@router.get("/knowledge-profile")
def get_knowledge_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns topic performance breakdown and mastery profile for current_user."""
    return get_user_knowledge_profile(user_id=current_user.id, db=db)


@router.get("/learning-gain")
def get_learning_gain_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns learning gain analytics (score delta after recommendations) for current_user."""
    return compute_learning_gain(user_id=current_user.id, db=db)


@router.get("/ab-experiment")
def get_ab_experiment_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns A/B experiment pilot comparison analytics."""
    return get_ab_experiment_summary(db=db)


@router.get("/{attempt_id}/recommendations", response_model=RecommendationResponseSchema)
def get_recommendations_for_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns personalized YouTube learning recommendations based on questions missed in attempt_id."""
    return get_quiz_attempt_recommendations(attempt_id=attempt_id, user_id=current_user.id, db=db)
