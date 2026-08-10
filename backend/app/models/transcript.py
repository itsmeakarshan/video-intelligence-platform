from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


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
        String(20)
    )

    transcript: Mapped[str] = mapped_column(
        Text
    )