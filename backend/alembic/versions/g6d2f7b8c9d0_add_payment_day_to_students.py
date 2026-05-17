"""add payment_day to students

Revision ID: g6d2f7b8c9d0
Revises: f5c1e6a7b8c9
Create Date: 2026-05-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'g6d2f7b8c9d0'
down_revision = 'f5c1e6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('students', sa.Column('payment_day', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('students', 'payment_day')
