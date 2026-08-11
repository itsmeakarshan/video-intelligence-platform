"""add quiz attempt videos table

Revision ID: 946a224e7310
Revises: 8e3c4d9b7a12
Create Date: 2026-08-10 16:42:27.680432

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '946a224e7310'
down_revision: Union[str, Sequence[str], None] = '8e3c4d9b7a12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "quiz_attempt_videos" not in inspector.get_table_names():
        op.create_table(
            "quiz_attempt_videos",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("quiz_attempt_id", sa.Integer(), nullable=False),
            sa.Column("video_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["quiz_attempt_id"], ["quiz_attempts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["video_id"], ["videos.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_quiz_attempt_videos_id", "quiz_attempt_videos", ["id"])
        op.create_index("ix_quiz_attempt_videos_quiz_attempt_id", "quiz_attempt_videos", ["quiz_attempt_id"])
        op.create_index("ix_quiz_attempt_videos_video_id", "quiz_attempt_videos", ["video_id"])

        op.execute(
            "INSERT INTO quiz_attempt_videos (quiz_attempt_id, video_id) "
            "SELECT id, video_id FROM quiz_attempts WHERE video_id IS NOT NULL"
        )


def downgrade() -> None:
    op.drop_table("quiz_attempt_videos")
