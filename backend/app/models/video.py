from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    order_index = Column(Integer, nullable=False, default=1)
    title = Column(String(255), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="uploaded")
    progress = Column(Float, nullable=False, default=0.0)
    current_step = Column(String(100), nullable=False, default="Waiting...")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="videos", foreign_keys=[user_id])
    course = relationship("Course", back_populates="videos")
    transcripts = relationship("Transcript", back_populates="video", cascade="all, delete-orphan")
    quiz_attempt_videos = relationship("QuizAttemptVideo", back_populates="video", cascade="all, delete-orphan")
