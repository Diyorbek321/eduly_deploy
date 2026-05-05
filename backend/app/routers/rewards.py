"""Rewards / gamification router (multi-tenant scoped)."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_any
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_current_user, get_db
from app.models.models import PurchaseStatus, Student, User, UserRole
from app.schemas.auth import MessageResponse
from app.schemas.reward import (
    PurchaseCreate,
    PurchaseOut,
    RewardCreate,
    RewardOut,
    RewardUpdate,
    WalletAdjust,
    WalletOut,
)
from app.services import audit as audit_service
from app.services import reward as reward_service
from app.services.event_bus import bus as event_bus


def _emit_reward(type_: str, *, center_id: int | None, payload: dict | None = None) -> None:
    try:
        event_bus.publish_nowait(type_, center_id=center_id, payload=payload or {})
    except Exception:  # noqa: BLE001 — never let event bus break the request
        pass


def _audit_safe(db, **kwargs) -> None:
    try:
        audit_service.log(db, **kwargs)
    except Exception:  # noqa: BLE001
        pass

router = APIRouter()


def _resolve_student_id(user: User, db: Session) -> int:
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'quvchi profili topilmadi")
    return student.id


# ─── Rewards catalog ────────────────────────────────────────────────────────


@router.get("/", response_model=list[RewardOut])
def list_rewards(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_any),
    tenant: TenantContext = Depends(get_tenant),
):
    return reward_service.list_rewards(db, active_only=active_only, tenant=tenant)


@router.post("/", response_model=RewardOut, status_code=201)
def create_reward(
    data: RewardCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    reward = reward_service.create_reward(db, data, tenant=tenant)
    _audit_safe(
        db, actor=user, action="reward.create",
        target_type="reward", target_id=reward.id, target_label=reward.name,
        payload={"cost": reward.cost, "stock": reward.stock, "is_active": reward.is_active},
        request=request,
    )
    _emit_reward("reward.created", center_id=reward.center_id, payload={"id": reward.id})
    return reward


@router.put("/{reward_id}", response_model=RewardOut)
def update_reward(
    reward_id: int,
    data: RewardUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    reward = reward_service.update_reward(db, reward_id, data, tenant=tenant)
    _audit_safe(
        db, actor=user, action="reward.update",
        target_type="reward", target_id=reward.id, target_label=reward.name,
        payload=data.model_dump(exclude_unset=True),
        request=request,
    )
    _emit_reward("reward.updated", center_id=reward.center_id, payload={"id": reward.id})
    return reward


@router.delete("/{reward_id}", response_model=MessageResponse)
def delete_reward(
    reward_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    deleted_center_id = tenant.user.center_id if tenant and not tenant.is_super_admin else None
    reward_service.delete_reward(db, reward_id, tenant=tenant)
    _audit_safe(
        db, actor=user, action="reward.delete",
        target_type="reward", target_id=reward_id, target_label=None,
        request=request,
    )
    _emit_reward("reward.deleted", center_id=deleted_center_id, payload={"id": reward_id})
    return {"message": "Mukofot o'chirildi"}


# ─── Real-time stream ──────────────────────────────────────────────────────


def _resolve_stream_user(
    request: Request,
    token: str | None = None,
    db: Session = Depends(get_db),
) -> User:
    """SSE auth: EventSource cannot set Authorization headers, so accept the
    access token via ``?token=`` query as a last resort. Falls through to the
    standard cookie/header path otherwise.
    """
    from app.core.security import decode_access_token, is_jti_revoked

    raw = token or request.cookies.get("eduly_access")
    if not raw:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            raw = auth.split(" ", 1)[1].strip() or None
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token kerak")
    payload = decode_access_token(raw)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yaroqsiz")
    if is_jti_revoked(db, payload.get("jti")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token bekor qilingan")
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yaroqsiz")
    user = db.query(User).filter(User.id == int(sub)).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi")
    return user


@router.get("/stream")
async def rewards_stream(
    user: User = Depends(_resolve_stream_user),
):
    """SSE: emits reward.created / reward.updated / reward.deleted /
    purchase.* for the caller's center. Mobile clients subscribe to
    invalidate their rewards cache without polling."""
    is_super = user.role == UserRole.SUPER_ADMIN
    center_id = user.center_id if not is_super else None

    async def gen():
        # Send a hello so clients know the connection is live.
        yield b"event: hello\ndata: {}\n\n"
        async with event_bus.subscribe(center_id) as queue:
            try:
                while True:
                    try:
                        evt = await asyncio.wait_for(queue.get(), timeout=20.0)
                        yield evt.to_sse()
                    except asyncio.TimeoutError:
                        # Periodic comment-line keepalive so proxies/load
                        # balancers don't kill an idle connection.
                        yield b": keepalive\n\n"
            except asyncio.CancelledError:  # client disconnected
                return

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",  # disable nginx buffering for SSE
            "Connection": "keep-alive",
        },
    )


# ─── Wallets ────────────────────────────────────────────────────────────────


@router.get("/wallets", response_model=list[WalletOut])
def list_wallets(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return reward_service.list_wallets(db, tenant=tenant)


@router.get("/wallets/me", response_model=WalletOut)
def get_my_wallet(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    tenant: TenantContext = Depends(get_tenant),
):
    student_id = _resolve_student_id(user, db)
    return reward_service.get_wallet(db, student_id, tenant=tenant)


@router.get("/wallets/{student_id}", response_model=WalletOut)
def get_wallet(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return reward_service.get_wallet(db, student_id, tenant=tenant)


@router.post("/wallets/{student_id}/adjust", response_model=WalletOut)
def adjust_wallet(
    student_id: int,
    data: WalletAdjust,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return reward_service.adjust_wallet(db, student_id, data.amount, tenant=tenant)


# ─── Purchases ──────────────────────────────────────────────────────────────


@router.get("/purchases", response_model=list[PurchaseOut])
def list_purchases(
    student_id: int | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    tenant: TenantContext = Depends(get_tenant),
):
    if user.role == UserRole.STUDENT:
        student_id = _resolve_student_id(user, db)
    return reward_service.list_purchases(
        db, student_id=student_id, limit=limit, tenant=tenant
    )


@router.post("/purchases/me", response_model=PurchaseOut, status_code=201)
def create_my_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    tenant: TenantContext = Depends(get_tenant),
):
    if user.role == UserRole.STUDENT:
        student_id = _resolve_student_id(user, db)
    elif user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        student_id = data.student_id
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruxsat yo'q")
    purchase = reward_service.create_purchase(db, student_id, data.reward_id, tenant=tenant)
    # Reward stock changed → notify clients so the shop card updates live.
    cid = tenant.user.center_id if not tenant.is_super_admin else None
    _emit_reward("reward.updated", center_id=cid, payload={"id": data.reward_id, "reason": "purchase"})
    _emit_reward("purchase.created", center_id=cid, payload={"id": purchase["id"], "student_id": student_id})
    return purchase


@router.put("/purchases/{purchase_id}/status", response_model=PurchaseOut)
def update_purchase_status(
    purchase_id: int,
    new_status: PurchaseStatus,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    purchase = reward_service.update_purchase_status(
        db, purchase_id, new_status, tenant=tenant
    )
    cid = tenant.user.center_id if not tenant.is_super_admin else None
    _emit_reward("purchase.updated", center_id=cid, payload={"id": purchase_id, "status": new_status.value})
    if new_status == PurchaseStatus.CANCELLED:
        # Refund restored stock — push reward.updated so shop refetches.
        _emit_reward("reward.updated", center_id=cid, payload={"id": purchase["reward_id"], "reason": "refund"})
    return purchase
