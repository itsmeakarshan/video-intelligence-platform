from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TranscriptSegment(Base):

    __tablename__ = "transcript_segments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    transcript_id: Mapped[int] = mapped_column(
        ForeignKey("transcripts.id"),
        nullable=False
    )

    segment_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    start_time: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    end_time: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    # Whisper word timestamps stored as JSON
    words_json: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )