"""SMS router — templates, send (single/bulk), history, balance (multi-tenant)."""

import os

from fastapi import APIRouter, Depends, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

limiter = Limiter(key_func=get_remote_address)

_SMS_SEND_RATE_LIMIT = os.getenv("SMS_SEND_RATE_LIMIT", "30/minute")
_SMS_BULK_RATE_LIMIT = os.getenv("SMS_BULK_RATE_LIMIT", "5/minute")

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import SMSCategory, SMSStatus, User
from app.schemas.auth import MessageResponse
from app.schemas.sms import (
    SMSBalanceOut,
    SMSBulkRequest,
    SMSBulkResult,
    SMSMessageOut,
    SMSSendRequest,
    SMSTemplateCreate,
    SMSTemplateOut,
    SMSTemplateUpdate,
)
from app.services import audit as audit_service
from app.services import sms as sms_service

router = APIRouter()


# ── Templates ──────────────────────────────────────────────────────────────


@router.get("/templates", response_model=list[SMSTemplateOut])
def list_templates(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return sms_service.list_templates(db, tenant=tenant)


@router.post("/templates", response_model=SMSTemplateOut, status_code=201)
def create_template(
    data: SMSTemplateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return sms_service.create_template(db, data, tenant=tenant)


@router.put("/templates/{template_id}", response_model=SMSTemplateOut)
def update_template(
    template_id: int,
    data: SMSTemplateUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return sms_service.update_template(db, template_id, data, tenant=tenant)


@router.delete("/templates/{template_id}", response_model=MessageResponse)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    sms_service.delete_template(db, template_id, tenant=tenant)
    return {"message": "Shablon o'chirildi"}


# ── Send ───────────────────────────────────────────────────────────────────


@router.post("/send", response_model=SMSMessageOut)
@limiter.limit(_SMS_SEND_RATE_LIMIT)
def send(
    request: Request,
    data: SMSSendRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    msg = sms_service.send_single(db, data, tenant=tenant)
    try:
        audit_service.log(
            db,
            actor=user,
            action="sms.send",
            target_type="sms",
            target_id=msg.id,
            target_label=data.recipient_name,
            payload={
                "phone": data.phone,
                "category": data.category.value,
                "status": msg.status.value,
            },
            request=request,
        )
    except Exception:  # noqa: BLE001
        pass
    return msg


@router.post("/bulk", response_model=SMSBulkResult)
@limiter.limit(_SMS_BULK_RATE_LIMIT)
def send_bulk(
    request: Request,
    data: SMSBulkRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    messages = sms_service.send_bulk(db, data, tenant=tenant)
    sent = sum(1 for m in messages if m.status.value == "Yuborildi")
    failed = sum(1 for m in messages if m.status.value == "Xatolik")
    try:
        audit_service.log(
            db,
            actor=user,
            action="sms.bulk",
            target_type="sms_bulk",
            target_id=None,
            target_label=data.recipient_type,
            payload={
                "recipient_type": data.recipient_type,
                "group_id": data.group_id,
                "category": data.category.value,
                "total": len(messages),
                "sent": sent,
                "failed": failed,
            },
            request=request,
        )
    except Exception:  # noqa: BLE001
        pass
    return {
        "total": len(messages),
        "sent": sent,
        "failed": failed,
        "messages": messages,
    }


# ── History ────────────────────────────────────────────────────────────────


@router.get("/history", response_model=list[SMSMessageOut])
def history(
    category: SMSCategory | None = Query(None),
    status_filter: SMSStatus | None = Query(None, alias="status"),
    search: str | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return sms_service.list_history(
        db,
        category=category,
        status_filter=status_filter,
        search=search,
        limit=limit,
        tenant=tenant,
    )


# ── Balance ────────────────────────────────────────────────────────────────


@router.get("/balance", response_model=SMSBalanceOut)
def balance(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    row, provider = sms_service.get_balance(db, tenant=tenant)
    return {
        "remaining": row.remaining,
        "provider": provider,
        "updated_at": row.updated_at,
    }
