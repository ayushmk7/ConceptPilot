"""add minimal projects table and study_content.project_id

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-21 13:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("exam_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_exam_id", "projects", ["exam_id"])

    op.add_column("study_content", sa.Column("project_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_study_content_project_id_projects",
        "study_content",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_study_content_project_id", "study_content", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_study_content_project_id", table_name="study_content")
    op.drop_constraint("fk_study_content_project_id_projects", "study_content", type_="foreignkey")
    op.drop_column("study_content", "project_id")

    op.drop_index("ix_projects_exam_id", table_name="projects")
    op.drop_table("projects")
