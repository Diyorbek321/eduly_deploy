"""add exit tracking fields to students

Revision ID: j9g5i0e2f3g4
Revises: i8f4h9d0e1f2
Create Date: 2026-05-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'j9g5i0e2f3g4'
down_revision = 'i8f4h9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('students', sa.Column('exit_reason', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('exit_reason_note', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('exit_date', sa.Date(), nullable=True))
    op.add_column('students', sa.Column('exit_called', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('students', sa.Column('exit_called_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('students', 'exit_called_at')
    op.drop_column('students', 'exit_called')
    op.drop_column('students', 'exit_date')
    op.drop_column('students', 'exit_reason_note')
    op.drop_column('students', 'exit_reason')
