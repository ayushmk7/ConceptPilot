"""add study_content table and exam state column

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-03-21 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("state", sa.String(length=20), nullable=True))

    op.create_table(
        "study_content",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("exam_id", sa.UUID(), nullable=False),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("source_context", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("slides_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("prompt_version", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_study_content_exam_id", "study_content", ["exam_id"])
    op.create_index("ix_study_content_status", "study_content", ["status"])


def downgrade() -> None:
    op.drop_index("ix_study_content_status", table_name="study_content")
    op.drop_index("ix_study_content_exam_id", table_name="study_content")
    op.drop_table("study_content")
    op.drop_column("exams", "state")
