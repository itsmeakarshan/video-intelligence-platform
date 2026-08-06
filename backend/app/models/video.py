from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="uploaded",
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
