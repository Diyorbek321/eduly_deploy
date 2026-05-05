"""token revocation: revoked_tokens table + users.tokens_invalidated_at

Revision ID: f5c1e6a7b8c9
Revises: e4b0d5f6a7b8
Create Date: 2026-05-03

Idempotent: if Base.metadata.create_all already created revoked_tokens (via
the app lifespan running before alembic), we skip recreating it. Same for
the users.tokens_invalidated_at column.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "f5c1e6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "e4b0d5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = inspect(bind)
    return any(c["name"] == column for c in insp.get_columns(table))


def _has_table(bind, table: str) -> bool:
    return inspect(bind).has_table(table)


def _has_index(bind, table: str, name: str) -> bool:
    insp = inspect(bind)
    return any(ix["name"] == name for ix in insp.get_indexes(table))


def upgrade() -> None:
    bind = op.get_bind()

    # 1) users.tokens_invalidated_at
    if not _has_column(bind, "users", "tokens_invalidated_at"):
        op.add_column(
            "users",
            sa.Column("tokens_invalidated_at", sa.DateTime(), nullable=True),
        )

    # 2) revoked_tokens table (skip if create_all already made it)
    if not _has_table(bind, "revoked_tokens"):
        op.create_table(
            "revoked_tokens",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("jti", sa.String(length=64), nullable=False, unique=True),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        )

    # 3) Indexes (also idempotent — create_all may or may not have built them)
    if not _has_index(bind, "revoked_tokens", "ix_revoked_jti"):
        op.create_index("ix_revoked_jti", "revoked_tokens", ["jti"])
    if not _has_index(bind, "revoked_tokens", "ix_revoked_expires_at"):
        op.create_index("ix_revoked_expires_at", "revoked_tokens", ["expires_at"])


def downgrade() -> None:
    bind = op.get_bind()
    if _has_index(bind, "revoked_tokens", "ix_revoked_expires_at"):
        op.drop_index("ix_revoked_expires_at", table_name="revoked_tokens")
    if _has_index(bind, "revoked_tokens", "ix_revoked_jti"):
        op.drop_index("ix_revoked_jti", table_name="revoked_tokens")
    if _has_table(bind, "revoked_tokens"):
        op.drop_table("revoked_tokens")
    if _has_column(bind, "users", "tokens_invalidated_at"):
        op.drop_column("users", "tokens_invalidated_at")
