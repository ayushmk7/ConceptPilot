"""add study_content table and exam state column

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-03-21 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    exam_cols = {c["name"] for c in insp.get_columns("exams")}
    if "state" not in exam_cols:
        op.add_column("exams", sa.Column("state", sa.String(length=20), nullable=True))

    if "study_content" not in insp.get_table_names():
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
        insp = inspect(bind)

    if "study_content" in insp.get_table_names():
        existing_ix = {i["name"] for i in insp.get_indexes("study_content")}
        if "ix_study_content_exam_id" not in existing_ix:
            op.create_index("ix_study_content_exam_id", "study_content", ["exam_id"])
        if "ix_study_content_status" not in existing_ix:
            op.create_index("ix_study_content_status", "study_content", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if "study_content" in insp.get_table_names():
        existing_ix = {i["name"] for i in insp.get_indexes("study_content")}
        if "ix_study_content_status" in existing_ix:
            op.drop_index("ix_study_content_status", table_name="study_content")
        if "ix_study_content_exam_id" in existing_ix:
            op.drop_index("ix_study_content_exam_id", table_name="study_content")
        op.drop_table("study_content")

    exam_cols = {c["name"] for c in insp.get_columns("exams")}
    if "state" in exam_cols:
        op.drop_column("exams", "state")
