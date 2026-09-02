from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    score = Column(Integer, nullable=False, default=0)
    total_questions = Column(Integer, nullable=False, default=1)
    percentage = Column(Float, nullable=False, default=0.0)
    difficulty = Column(String(20), nullable=False, default="Medium")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
    video = relationship("Video")
    quiz_attempt_videos = relationship("QuizAttemptVideo", back_populates="quiz_attempt", cascade="all, delete-orphan")
    questions = relationship("QuizAttemptQuestion", back_populates="quiz_attempt", cascade="all, delete-orphan")


class QuizAttemptVideo(Base):
    __tablename__ = "quiz_attempt_videos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quiz_attempt_id = Column(Integer, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    quiz_attempt = relationship("QuizAttempt", back_populates="quiz_attempt_videos")
    video = relationship("Video", back_populates="quiz_attempt_videos")


class QuizAttemptQuestion(Base):
    __tablename__ = "quiz_attempt_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quiz_attempt_id = Column(Integer, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_index = Column(Integer, nullable=False, default=1)
    question_text = Column(String(500), nullable=False)
    selected_answer = Column(Integer, nullable=False, default=0)
    correct_answer = Column(Integer, nullable=False, default=0)
    is_correct = Column(Boolean, nullable=False, default=False)
    topic = Column(String(200), nullable=False, default="General Concept")
    explanation = Column(String(1000), nullable=True)

    # Relationship
    quiz_attempt = relationship("QuizAttempt", back_populates="questions")
