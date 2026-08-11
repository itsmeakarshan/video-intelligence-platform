from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.quiz_attempt import QuizAttempt
    from app.models.video import Video


class QuizAttemptVideo(Base):
    __tablename__ = "quiz_attempt_videos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quiz_attempt_id: Mapped[int] = mapped_column(ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)

    quiz_attempt: Mapped["QuizAttempt"] = relationship(back_populates="quiz_attempt_videos")
    video: Mapped["Video"] = relationship(back_populates="quiz_attempt_videos")
