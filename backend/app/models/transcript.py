from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.transcript_chunk import TranscriptChunk
    from app.models.transcript_segment import TranscriptSegment
    from app.models.video import Video


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

    video: Mapped["Video"] = relationship(back_populates="transcripts")
    segments: Mapped[list["TranscriptSegment"]] = relationship(back_populates="transcript", cascade="all, delete-orphan")
    chunks: Mapped[list["TranscriptChunk"]] = relationship(back_populates="transcript", cascade="all, delete-orphan")
