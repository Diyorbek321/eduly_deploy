"""website_content

Revision ID: r7o3q8m0n1o2
Revises: q6n2p7l9m0n1
Create Date: 2026-05-19 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "r7o3q8m0n1o2"
down_revision: Union[str, None] = "q6n2p7l9m0n1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "website_courses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("center_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration", sa.String(100), nullable=True),
        sa.Column("price", sa.String(100), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("color", sa.String(20), nullable=False, server_default="#6366f1"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["center_id"], ["education_centers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_website_courses_center_id", "website_courses", ["center_id"])

    op.create_table(
        "website_faqs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("center_id", sa.Integer(), nullable=True),
        sa.Column("question", sa.String(500), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["center_id"], ["education_centers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_website_faqs_center_id", "website_faqs", ["center_id"])

    op.create_table(
        "website_branches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("center_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("working_hours", sa.String(200), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["center_id"], ["education_centers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_website_branches_center_id", "website_branches", ["center_id"])


def downgrade() -> None:
    op.drop_index("ix_website_branches_center_id", table_name="website_branches")
    op.drop_table("website_branches")
    op.drop_index("ix_website_faqs_center_id", table_name="website_faqs")
    op.drop_table("website_faqs")
    op.drop_index("ix_website_courses_center_id", table_name="website_courses")
    op.drop_table("website_courses")
