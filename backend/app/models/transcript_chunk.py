from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class TranscriptChunk(Base):

    __tablename__ = "transcript_chunks"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    transcript_id: Mapped[int] = mapped_column(
        ForeignKey("transcripts.id"),
        nullable=False
    )

    chunk_index: Mapped[int] = mapped_column(
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

    embedding_created: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
