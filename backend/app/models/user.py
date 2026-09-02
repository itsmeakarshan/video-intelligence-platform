from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, default="")
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="student")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan", foreign_keys="Video.user_id")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrollment", back_populates="user", cascade="all, delete-orphan")
