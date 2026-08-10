"""add user-owned videos, conversations, and quiz attempts

Revision ID: 8e3c4d9b7a12
Revises: 0525d14dffc5
"""
from alembic import op
import sqlalchemy as sa

revision = "8e3c4d9b7a12"
down_revision = "0525d14dffc5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "users" not in inspector.get_table_names():
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
        )
        op.create_index("ix_users_id", "users", ["id"])
        op.create_index("ix_users_email", "users", ["email"], unique=True)
    # Nullable preserves existing development videos safely. New application
    # writes always supply an owner and legacy unowned rows remain inaccessible.
    with op.batch_alter_table("videos") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_videos_user_id_users", "users", ["user_id"], ["id"])
        batch_op.create_index("ix_videos_user_id", ["user_id"])
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_messages_id", "messages", ["id"])
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.Integer(), nullable=False), sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("video_id", sa.Integer(), nullable=True), sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False), sa.Column("percentage", sa.Float(), nullable=False),
        sa.Column("difficulty", sa.String(length=20), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]), sa.ForeignKeyConstraint(["video_id"], ["videos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quiz_attempts_id", "quiz_attempts", ["id"])
    op.create_index("ix_quiz_attempts_user_id", "quiz_attempts", ["user_id"])
    op.create_index("ix_quiz_attempts_video_id", "quiz_attempts", ["video_id"])


def downgrade() -> None:
    op.drop_table("quiz_attempts")
    op.drop_table("messages")
    op.drop_table("conversations")
    with op.batch_alter_table("videos") as batch_op:
        batch_op.drop_index("ix_videos_user_id")
        batch_op.drop_constraint("fk_videos_user_id_users", type_="foreignkey")
        batch_op.drop_column("user_id")
