"""add salary_percent to teachers and period/percent_used/payments_total to salaries

Revision ID: h7e3g8c9d0e1
Revises: g6d2f7b8c9d0
Create Date: 2026-05-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'h7e3g8c9d0e1'
down_revision = 'g6d2f7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('teachers', sa.Column('salary_percent', sa.Float(), nullable=True, server_default='40'))
    op.add_column('salaries', sa.Column('period', sa.Integer(), nullable=True))
    op.add_column('salaries', sa.Column('percent_used', sa.Float(), nullable=True))
    op.add_column('salaries', sa.Column('payments_total', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('teachers', 'salary_percent')
    op.drop_column('salaries', 'period')
    op.drop_column('salaries', 'percent_used')
    op.drop_column('salaries', 'payments_total')
