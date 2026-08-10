from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.quiz_attempt import QuizAttempt
from app.models.user import User
from app.models.video import Video

router = APIRouter(prefix="/quiz-attempts", tags=["Quiz Attempts"])


class QuizAttemptCreate(BaseModel):
    video_id: int | None = None
    score: int = Field(ge=0)
    total_questions: int = Field(gt=0)
    difficulty: str = Field(min_length=1, max_length=20)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_quiz_attempt(request: QuizAttemptCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if request.score > request.total_questions:
        raise HTTPException(status_code=422, detail="Score cannot exceed total questions.")
    if request.video_id is not None:
        video = db.query(Video).filter(Video.id == request.video_id, Video.user_id == current_user.id).first()
        if video is None:
            raise HTTPException(status_code=404, detail="Video not found.")
    attempt = QuizAttempt(
        user_id=current_user.id, video_id=request.video_id, score=request.score,
        total_questions=request.total_questions,
        percentage=(request.score / request.total_questions) * 100,
        difficulty=request.difficulty,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("")
def list_quiz_attempts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).order_by(QuizAttempt.created_at.desc()).all()
