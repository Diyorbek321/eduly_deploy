"""homework strikes column on student_groups

Revision ID: l1i7k2g4h5i6
Revises: k0h6j1f3g4h5
Create Date: 2026-05-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "l1i7k2g4h5i6"
down_revision = "k0h6j1f3g4h5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "student_groups",
        sa.Column("homework_strikes", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("student_groups", "homework_strikes")
