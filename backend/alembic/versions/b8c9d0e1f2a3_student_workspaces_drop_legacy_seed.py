"""student_workspaces table; remove legacy fixed-UUID seed rows if present

Revision ID: b8c9d0e1f2a3
Revises: f1a2b3c4d5e6
Create Date: 2026-03-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LEGACY_EXAM = "a0000002-0000-4000-8000-000000000001"
LEGACY_COURSE = "a0000001-0000-4000-8000-000000000001"
LEGACY_CANVAS = "a0000003-0000-4000-8000-000000000001"


def upgrade() -> None:
    op.create_table(
        "student_workspaces",
        sa.Column("exam_id", sa.UUID(), nullable=False),
        sa.Column("canvas_project_id", sa.UUID(), nullable=False),
        sa.Column("student_external_id", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["canvas_project_id"], ["canvas_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("exam_id"),
    )
    # Legacy fixed-UUID seed from f1a2b3c4d5e6 (exam cascades to dependent rows).
    op.execute(f"DELETE FROM exams WHERE id = '{LEGACY_EXAM}'::uuid;")
    op.execute(f"DELETE FROM courses WHERE id = '{LEGACY_COURSE}'::uuid;")
    op.execute(f"DELETE FROM canvas_projects WHERE id = '{LEGACY_CANVAS}'::uuid;")


def downgrade() -> None:
    op.drop_table("student_workspaces")
