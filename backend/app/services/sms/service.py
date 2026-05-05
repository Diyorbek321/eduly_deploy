"""SMS orchestration service — templates, send, history, balance (multi-tenant)."""

from __future__ import annotations

import re
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import (
    SMSBalance,
    SMSCategory,
    SMSMessage,
    SMSStatus,
    SMSTemplate,
    Student,
    StudentGroup,
    StudentStatus,
)
from app.schemas.sms import (
    SMSBulkRequest,
    SMSSendRequest,
    SMSTemplateCreate,
    SMSTemplateUpdate,
)
from app.services.sms.providers import SendResult, get_provider


def _scope(query, model, tenant: TenantContext | None):
    if tenant is None:
        return query
    return tenant.scope(query, model)


def _center_id(tenant: TenantContext | None) -> int | None:
    if tenant is None or tenant.is_super_admin:
        return None
    return tenant.user.center_id


# ── Templates ──────────────────────────────────────────────────────────────


def list_templates(
    db: Session, tenant: TenantContext | None = None
) -> list[SMSTemplate]:
    q = _scope(db.query(SMSTemplate), SMSTemplate, tenant)
    return q.order_by(SMSTemplate.id.desc()).all()


def create_template(
    db: Session, data: SMSTemplateCreate, tenant: TenantContext | None = None
) -> SMSTemplate:
    payload = data.model_dump()
    cid = _center_id(tenant)
    if cid is not None:
        payload["center_id"] = cid
    tpl = SMSTemplate(**payload)
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


def update_template(
    db: Session,
    template_id: int,
    data: SMSTemplateUpdate,
    tenant: TenantContext | None = None,
) -> SMSTemplate:
    tpl = db.query(SMSTemplate).filter(SMSTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shablon topilmadi")
    if tenant is not None:
        tenant.assert_owns(tpl)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tpl, field, value)
    db.commit()
    db.refresh(tpl)
    return tpl


def delete_template(
    db: Session, template_id: int, tenant: TenantContext | None = None
) -> None:
    tpl = db.query(SMSTemplate).filter(SMSTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shablon topilmadi")
    if tenant is not None:
        tenant.assert_owns(tpl)
    db.delete(tpl)
    db.commit()


# ── Rendering ──────────────────────────────────────────────────────────────

_PLACEHOLDER_RE = re.compile(r"\[([^\[\]]+)\]")


def render_template(content: str, placeholders: dict[str, str]) -> str:
    """Replace ``[Key]`` markers with values from ``placeholders``."""

    def _sub(match: re.Match[str]) -> str:
        key = match.group(1)
        return placeholders.get(key, match.group(0))

    return _PLACEHOLDER_RE.sub(_sub, content)


def _placeholders_for_student(student: Student) -> dict[str, str]:
    return {
        "Ism": student.name,
        "Summa": f"{int(student.debt or 0):,}".replace(",", " "),
        "Telefon": student.phone or "",
    }


# ── Send pipeline ──────────────────────────────────────────────────────────


def _record(
    db: Session,
    *,
    recipient_name: str,
    phone: str,
    message: str,
    category: SMSCategory,
    center_id: int | None,
) -> SMSMessage:
    row = SMSMessage(
        recipient_name=recipient_name,
        recipient_phone=phone,
        message=message,
        category=category,
        status=SMSStatus.PENDING,
        center_id=center_id,
    )
    db.add(row)
    db.flush()
    return row


def _dispatch(
    db: Session, row: SMSMessage, tenant: TenantContext | None = None
) -> SMSMessage:
    """Actually call the provider and persist the outcome."""
    provider = get_provider()
    row.provider = provider.name
    result: SendResult
    try:
        result = provider.send(row.recipient_phone, row.message)
    except NotImplementedError as exc:
        row.status = SMSStatus.FAILED
        row.error = str(exc)
        db.commit()
        db.refresh(row)
        return row

    if result.ok:
        row.status = SMSStatus.SENT
        row.sent_at = datetime.utcnow()
        row.provider_message_id = result.provider_message_id
        _decrement_balance(db, 1, tenant=tenant)
    else:
        row.status = SMSStatus.FAILED
        row.error = result.error or "Unknown provider error"
    db.commit()
    db.refresh(row)
    return row


def send_single(
    db: Session, data: SMSSendRequest, tenant: TenantContext | None = None
) -> SMSMessage:
    row = _record(
        db,
        recipient_name=data.recipient_name,
        phone=data.phone,
        message=data.message,
        category=data.category,
        center_id=_center_id(tenant),
    )
    return _dispatch(db, row, tenant=tenant)


def _resolve_bulk_recipients(
    db: Session, data: SMSBulkRequest, tenant: TenantContext | None = None
) -> list[Student]:
    q = db.query(Student).filter(Student.status == StudentStatus.FAOL)
    q = _scope(q, Student, tenant)

    if data.recipient_type == "debtors":
        q = q.filter(Student.debt > 0)
    elif data.recipient_type == "group":
        if not data.group_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "group_id talab qilinadi",
            )
        q = q.join(StudentGroup, StudentGroup.student_id == Student.id).filter(
            StudentGroup.group_id == data.group_id
        )
    elif data.recipient_type == "all":
        pass
    else:  # pragma: no cover
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "recipient_type noto'g'ri")

    return q.all()


def _phone_for(student: Student, target_parent: bool) -> str | None:
    if target_parent and student.parent_phone:
        return student.parent_phone
    return student.phone or student.parent_phone


def send_bulk(
    db: Session, data: SMSBulkRequest, tenant: TenantContext | None = None
) -> list[SMSMessage]:
    students = _resolve_bulk_recipients(db, data, tenant=tenant)
    results: list[SMSMessage] = []
    cid = _center_id(tenant)
    for student in students:
        phone = _phone_for(student, data.target_parent)
        if not phone:
            continue
        rendered = render_template(data.message, _placeholders_for_student(student))
        row = _record(
            db,
            recipient_name=student.name,
            phone=phone,
            message=rendered,
            category=data.category,
            center_id=cid,
        )
        results.append(_dispatch(db, row, tenant=tenant))
    return results


# ── History ────────────────────────────────────────────────────────────────


def list_history(
    db: Session,
    *,
    category: SMSCategory | None = None,
    status_filter: SMSStatus | None = None,
    search: str | None = None,
    limit: int = 200,
    tenant: TenantContext | None = None,
) -> list[SMSMessage]:
    q = _scope(db.query(SMSMessage), SMSMessage, tenant)
    if category is not None:
        q = q.filter(SMSMessage.category == category)
    if status_filter is not None:
        q = q.filter(SMSMessage.status == status_filter)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (SMSMessage.recipient_name.ilike(like))
            | (SMSMessage.message.ilike(like))
            | (SMSMessage.recipient_phone.ilike(like))
        )
    return q.order_by(SMSMessage.created_at.desc()).limit(limit).all()


# ── Balance (per-center) ───────────────────────────────────────────────────


def _get_or_create_balance(
    db: Session, tenant: TenantContext | None = None
) -> SMSBalance:
    cid = _center_id(tenant)
    q = db.query(SMSBalance)
    if cid is not None:
        q = q.filter(SMSBalance.center_id == cid)
    row = q.first()
    if row is None:
        row = SMSBalance(remaining=0, center_id=cid)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _decrement_balance(
    db: Session, by: int = 1, tenant: TenantContext | None = None
) -> None:
    row = _get_or_create_balance(db, tenant=tenant)
    if row.remaining > 0:
        row.remaining = max(0, row.remaining - by)
        db.commit()


def get_balance(
    db: Session, tenant: TenantContext | None = None
) -> tuple[SMSBalance, str]:
    row = _get_or_create_balance(db, tenant=tenant)
    provider = get_provider()
    try:
        live = provider.balance()
        if live >= 0:
            row.remaining = live
            db.commit()
            db.refresh(row)
    except NotImplementedError:
        pass
    except Exception:  # noqa: BLE001
        pass
    return row, provider.name
