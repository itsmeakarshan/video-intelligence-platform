from typing import TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.quiz_attempt import QuizAttempt


class QuizAttemptQuestion(Base):
    __tablename__ = "quiz_attempt_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quiz_attempt_id: Mapped[int] = mapped_column(
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    question_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(String(500), nullable=False)
    selected_answer: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_answer: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    topic: Mapped[str] = mapped_column(String(200), nullable=False)
    explanation: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    quiz_attempt: Mapped["QuizAttempt"] = relationship(back_populates="questions")
