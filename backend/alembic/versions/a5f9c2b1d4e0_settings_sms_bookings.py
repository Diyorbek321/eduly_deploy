"""settings_sms_bookings

Revision ID: a5f9c2b1d4e0
Revises: 7b9e101fb373
Create Date: 2026-04-17 10:00:00.000000

Idempotent: safe to run even when tables were already created by
``Base.metadata.create_all`` at app startup.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a5f9c2b1d4e0"
down_revision: Union[str, Sequence[str], None] = "7b9e101fb373"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_SMS_CATEGORY = sa.Enum("Qarzdorlik", "Davomat", "E'lon", "Boshqa", name="smscategory")
_SMS_STATUS = sa.Enum("Kutilmoqda", "Yuborildi", "Xatolik", name="smsstatus")
_BOOKING_STATUS = sa.Enum(
    "Kutilmoqda",
    "Tasdiqlangan",
    "Bekor qilingan",
    "Yakunlangan",
    name="bookingstatus",
)


def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(name: str) -> bool:
    return _inspector().has_table(name)


def _has_index(table: str, name: str) -> bool:
    insp = _inspector()
    if not insp.has_table(table):
        return False
    return any(ix["name"] == name for ix in insp.get_indexes(table))


def _create_index(name: str, table: str, cols: list[str]) -> None:
    if not _has_index(table, name):
        op.create_index(name, table, cols)


def upgrade() -> None:
    # center_settings
    if not _has_table("center_settings"):
        op.create_table(
            "center_settings",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("address", sa.String(length=500), nullable=True),
            sa.Column("phone", sa.String(length=50), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("logo", sa.String(length=500), nullable=True),
            sa.Column("working_hours", sa.String(length=200), nullable=True),
            sa.Column(
                "timezone",
                sa.String(length=100),
                nullable=False,
                server_default="Asia/Tashkent",
            ),
            sa.Column("language", sa.String(length=10), nullable=False, server_default="uz"),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    # sms_templates
    if not _has_table("sms_templates"):
        op.create_table(
            "sms_templates",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("category", _SMS_CATEGORY, nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index("ix_smstpl_category", "sms_templates", ["category"])

    # sms_messages
    if not _has_table("sms_messages"):
        op.create_table(
            "sms_messages",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("recipient_name", sa.String(length=200), nullable=False),
            sa.Column("recipient_phone", sa.String(length=50), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("category", _SMS_CATEGORY, nullable=False),
            sa.Column("status", _SMS_STATUS, nullable=False),
            sa.Column("provider", sa.String(length=50), nullable=True),
            sa.Column("provider_message_id", sa.String(length=200), nullable=True),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("sent_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index("ix_sms_phone", "sms_messages", ["recipient_phone"])
    _create_index("ix_sms_status", "sms_messages", ["status"])
    _create_index("ix_sms_created_at", "sms_messages", ["created_at"])

    # sms_balance
    if not _has_table("sms_balance"):
        op.create_table(
            "sms_balance",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("remaining", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    # support_bookings
    if not _has_table("support_bookings"):
        op.create_table(
            "support_bookings",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("student_name", sa.String(length=200), nullable=False),
            sa.Column("teacher_id", sa.Integer(), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("time", sa.String(length=10), nullable=False),
            sa.Column("topic", sa.Text(), nullable=True),
            sa.Column("status", _BOOKING_STATUS, nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index("ix_booking_teacher_id", "support_bookings", ["teacher_id"])
    _create_index("ix_booking_date", "support_bookings", ["date"])
    _create_index("ix_booking_status", "support_bookings", ["status"])


def _drop_index(name: str, table: str) -> None:
    if _has_index(table, name):
        op.drop_index(name, table_name=table)


def downgrade() -> None:
    if _has_table("support_bookings"):
        _drop_index("ix_booking_status", "support_bookings")
        _drop_index("ix_booking_date", "support_bookings")
        _drop_index("ix_booking_teacher_id", "support_bookings")
        op.drop_table("support_bookings")

    if _has_table("sms_balance"):
        op.drop_table("sms_balance")

    if _has_table("sms_messages"):
        _drop_index("ix_sms_created_at", "sms_messages")
        _drop_index("ix_sms_status", "sms_messages")
        _drop_index("ix_sms_phone", "sms_messages")
        op.drop_table("sms_messages")

    if _has_table("sms_templates"):
        _drop_index("ix_smstpl_category", "sms_templates")
        op.drop_table("sms_templates")

    if _has_table("center_settings"):
        op.drop_table("center_settings")

    bind = op.get_bind()
    _BOOKING_STATUS.drop(bind, checkfirst=True)
    _SMS_STATUS.drop(bind, checkfirst=True)
    _SMS_CATEGORY.drop(bind, checkfirst=True)
