from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class CourseSkill(Base):
    __tablename__ = "course_skills"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=False, default="")
    category = Column(String(100), nullable=False, default="Core Concepts")
    order_index = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    course = relationship("Course", back_populates="skills")
