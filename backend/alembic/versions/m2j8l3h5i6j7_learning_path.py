"""learning path: max_duration_months on courses, target_completion_date on student_groups

Revision ID: m2j8l3h5i6j7
Revises: l1i7k2g4h5i6
Create Date: 2026-05-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "m2j8l3h5i6j7"
down_revision = "l1i7k2g4h5i6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("max_duration_months", sa.Integer(), nullable=True))
    op.add_column("student_groups", sa.Column("target_completion_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("courses", "max_duration_months")
    op.drop_column("student_groups", "target_completion_date")
