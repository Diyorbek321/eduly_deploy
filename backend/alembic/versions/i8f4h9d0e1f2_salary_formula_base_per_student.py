"""add base_per_student to teachers and calculation_detail to salaries

Revision ID: i8f4h9d0e1f2
Revises: h7e3g8c9d0e1
Create Date: 2026-05-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'i8f4h9d0e1f2'
down_revision = 'h7e3g8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('teachers', sa.Column('base_per_student', sa.Integer(), nullable=True, server_default='120000'))
    op.add_column('salaries', sa.Column('calculation_detail', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('teachers', 'base_per_student')
    op.drop_column('salaries', 'calculation_detail')
