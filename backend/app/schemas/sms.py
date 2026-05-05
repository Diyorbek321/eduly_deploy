"""SMS schemas — templates, messages, balance."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.models import SMSCategory, SMSStatus


# ── Templates ──────────────────────────────────────────────────────────────


class SMSTemplateCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=2000)
    category: SMSCategory = SMSCategory.BOSHQA


class SMSTemplateUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: SMSCategory | None = None


class SMSTemplateOut(BaseModel):
    id: int
    title: str
    content: str
    category: SMSCategory
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Messages ───────────────────────────────────────────────────────────────


class SMSSendRequest(BaseModel):
    """Send SMS to a single recipient."""

    recipient_name: str
    phone: str
    message: str = Field(min_length=1, max_length=2000)
    category: SMSCategory = SMSCategory.BOSHQA


RecipientType = Literal["all", "debtors", "group"]


class SMSBulkRequest(BaseModel):
    """Send SMS to a group of recipients.

    Use ``recipient_type``:
    - ``all``       — every active student
    - ``debtors``   — students with positive ``debt``
    - ``group``     — students in ``group_id``
    """

    recipient_type: RecipientType
    group_id: int | None = None
    message: str = Field(min_length=1, max_length=2000)
    category: SMSCategory = SMSCategory.BOSHQA
    target_parent: bool = True  # send to parent_phone if available, else student phone


class SMSMessageOut(BaseModel):
    id: int
    recipient_name: str
    recipient_phone: str
    message: str
    category: SMSCategory
    status: SMSStatus
    provider: str | None = None
    error: str | None = None
    created_at: datetime | None = None
    sent_at: datetime | None = None

    model_config = {"from_attributes": True}


class SMSBulkResult(BaseModel):
    total: int
    sent: int
    failed: int
    messages: list[SMSMessageOut]


class SMSBalanceOut(BaseModel):
    remaining: int
    provider: str
    updated_at: datetime | None = None
