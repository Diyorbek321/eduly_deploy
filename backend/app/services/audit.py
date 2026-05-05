"""Audit log service — append-only record of administrative actions.

Use ``log()`` from any router/service after a state change. Entries are never
updated or deleted. The ``request`` argument is optional but recommended; it
captures IP and User-Agent.
"""

from __future__ import annotations

import json
from typing import Any, Iterable

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.models import AuditLog, User


def _safe_json(value: Any) -> str | None:
    if value is None:
        return None
    try:
        return json.dumps(value, default=str, ensure_ascii=False)
    except (TypeError, ValueError):
        return None


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    # Honour reverse-proxy headers when present.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def log(
    db: Session,
    *,
    actor: User | None,
    action: str,
    target_type: str | None = None,
    target_id: str | int | None = None,
    target_label: str | None = None,
    payload: Any = None,
    request: Request | None = None,
    commit: bool = True,
) -> AuditLog:
    """Write an audit entry. Best-effort: never raises into the caller.

    The caller is responsible for committing surrounding state changes; the
    audit entry is persisted in the same transaction by default so it shares
    atomicity with the action it records.
    """
    entry = AuditLog(
        actor_id=actor.id if actor else None,
        actor_email=actor.email if actor else None,
        actor_role=actor.role.value if actor else None,
        center_id=getattr(actor, "center_id", None) if actor else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        target_label=target_label,
        ip=_client_ip(request),
        user_agent=(request.headers.get("user-agent") if request else None),
        payload=_safe_json(payload),
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    else:
        db.flush()
    return entry


def query(
    db: Session,
    *,
    actor_id: int | None = None,
    action: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    center_id: int | None = None,
    limit: int = 200,
) -> list[AuditLog]:
    q = db.query(AuditLog)
    if actor_id is not None:
        q = q.filter(AuditLog.actor_id == actor_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if target_id:
        q = q.filter(AuditLog.target_id == target_id)
    if center_id is not None:
        q = q.filter(AuditLog.center_id == center_id)
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()
