"""Legacy seed revision kept as no-op (student data uses student_workspaces bootstrap)

Revision ID: f1a2b3c4d5e6
Revises: 9b61f5c4a0fb
Create Date: 2026-03-22

"""
from typing import Sequence, Union

from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "9b61f5c4a0fb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
