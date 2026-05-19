"""monthly_invoices table for finance automation

Revision ID: p5m1o6k8l9m0
Revises: o4l0n5j7k8l9
Create Date: 2026-05-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "p5m1o6k8l9m0"
down_revision = "o4l0n5j7k8l9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monthly_invoices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("center_id", sa.Integer(), sa.ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("month", sa.String(7), nullable=False),
        sa.Column("amount_due", sa.Float(), nullable=False),
        sa.Column("amount_paid", sa.Float(), nullable=False, server_default="0"),
        sa.Column("is_paid", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("generated_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_mi_center_month", "monthly_invoices", ["center_id", "month"])
    op.create_index("ix_mi_is_paid", "monthly_invoices", ["is_paid"])
    op.create_unique_constraint("ix_mi_student_month", "monthly_invoices", ["student_id", "month"])


def downgrade() -> None:
    op.drop_table("monthly_invoices")
