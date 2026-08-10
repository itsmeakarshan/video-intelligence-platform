"""update video status

Revision ID: 0525d14dffc5
Revises: f96bef475a1b
Create Date: 2026-08-05 12:49:18.092773

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0525d14dffc5'
down_revision: Union[str, Sequence[str], None] = 'f96bef475a1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("videos", sa.Column("status", sa.String(length=50), nullable=False, server_default="uploaded"))
    op.add_column("videos", sa.Column("progress", sa.Float(), nullable=False, server_default="0"))
    op.add_column("videos", sa.Column("current_step", sa.String(length=100), nullable=False, server_default="Waiting..."))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("videos", "current_step")
    op.drop_column("videos", "progress")
    op.drop_column("videos", "status")
