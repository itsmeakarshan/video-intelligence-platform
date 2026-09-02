from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class InstructorChatChannel(Base):
    __tablename__ = "instructor_chat_channels"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    instructor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False, default="Course Q&A & Doubts")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    course = relationship("Course")
    student = relationship("User", foreign_keys=[student_id])
    instructor = relationship("User", foreign_keys=[instructor_id])
    messages = relationship("InstructorChatMessage", back_populates="channel", cascade="all, delete-orphan")


class InstructorChatMessage(Base):
    __tablename__ = "instructor_chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    channel_id = Column(Integer, ForeignKey("instructor_chat_channels.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender_role = Column(String(50), nullable=False, default="student")
    text = Column(Text, nullable=False, default="")
    message_type = Column(String(50), nullable=False, default="text")
    media_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    extra_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    channel = relationship("InstructorChatChannel", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
