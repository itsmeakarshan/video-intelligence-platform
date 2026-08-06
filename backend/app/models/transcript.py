from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    video_id: Mapped[int] = mapped_column(
        ForeignKey("videos.id"),
        nullable=False
    )

    language: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    transcript: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
