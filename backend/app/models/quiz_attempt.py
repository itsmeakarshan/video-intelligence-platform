from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.quiz_attempt_question import QuizAttemptQuestion
    from app.models.quiz_attempt_video import QuizAttemptVideo
    from app.models.user import User
    from app.models.video import Video


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    video_id: Mapped[int | None] = mapped_column(ForeignKey("videos.id"), nullable=True, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    user: Mapped["User"] = relationship(back_populates="quiz_attempts")
    video: Mapped["Video | None"] = relationship(back_populates="quiz_attempts")

    quiz_attempt_videos: Mapped[list["QuizAttemptVideo"]] = relationship(
        back_populates="quiz_attempt",
        cascade="all, delete-orphan",
    )
    videos: Mapped[list["Video"]] = relationship(
        "Video",
        secondary="quiz_attempt_videos",
        primaryjoin="QuizAttempt.id == QuizAttemptVideo.quiz_attempt_id",
        secondaryjoin="Video.id == QuizAttemptVideo.video_id",
        viewonly=True,
    )
    questions: Mapped[list["QuizAttemptQuestion"]] = relationship(
        "QuizAttemptQuestion",
        back_populates="quiz_attempt",
        cascade="all, delete-orphan",
    )
