"""Gamification / rewards service (multi-tenant scoped)."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import (
    PurchaseStatus,
    Reward,
    RewardPurchase,
    Student,
    StudentWallet,
)
from app.schemas.reward import RewardCreate, RewardUpdate


def _scope(query, model, tenant: TenantContext | None):
    if tenant is None:
        return query
    return tenant.scope(query, model)


def _center_id(tenant: TenantContext | None) -> int | None:
    if tenant is None or tenant.is_super_admin:
        return None
    return tenant.user.center_id


# ─── Rewards catalog ────────────────────────────────────────────────────────


def list_rewards(
    db: Session, *, active_only: bool = False, tenant: TenantContext | None = None
) -> list[Reward]:
    q = _scope(db.query(Reward), Reward, tenant)
    if active_only:
        q = q.filter(Reward.is_active.is_(True))
    return q.order_by(Reward.id.desc()).all()


def get_reward(
    db: Session, reward_id: int, tenant: TenantContext | None = None
) -> Reward:
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mukofot topilmadi")
    if tenant is not None:
        tenant.assert_owns(reward)
    return reward


def create_reward(
    db: Session, data: RewardCreate, tenant: TenantContext | None = None
) -> Reward:
    payload = data.model_dump()
    cid = _center_id(tenant)
    if cid is not None:
        payload["center_id"] = cid
    reward = Reward(**payload)
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward


def update_reward(
    db: Session,
    reward_id: int,
    data: RewardUpdate,
    tenant: TenantContext | None = None,
) -> Reward:
    reward = get_reward(db, reward_id, tenant=tenant)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(reward, field, value)
    db.commit()
    db.refresh(reward)
    return reward


def delete_reward(
    db: Session, reward_id: int, tenant: TenantContext | None = None
) -> None:
    reward = get_reward(db, reward_id, tenant=tenant)
    db.delete(reward)
    db.commit()


# ─── Wallets ────────────────────────────────────────────────────────────────


def _ensure_wallet(
    db: Session, student: Student, tenant: TenantContext | None = None
) -> StudentWallet:
    wallet = (
        db.query(StudentWallet)
        .filter(StudentWallet.student_id == student.id)
        .first()
    )
    if wallet is None:
        wallet = StudentWallet(
            student_id=student.id,
            coins=0,
            center_id=student.center_id,
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


def _get_student(
    db: Session, student_id: int, tenant: TenantContext | None = None
) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'quvchi topilmadi")
    if tenant is not None:
        tenant.assert_owns(student)
    return student


def get_wallet(
    db: Session, student_id: int, tenant: TenantContext | None = None
) -> dict:
    student = _get_student(db, student_id, tenant=tenant)
    wallet = _ensure_wallet(db, student, tenant=tenant)
    return {
        "student_id": student.id,
        "student_name": student.name,
        "coins": wallet.coins,
    }


def list_wallets(
    db: Session, tenant: TenantContext | None = None
) -> list[dict]:
    q = _scope(db.query(Student), Student, tenant)
    students = q.order_by(Student.name.asc()).all()
    result = []
    for s in students:
        wallet = _ensure_wallet(db, s, tenant=tenant)
        result.append(
            {
                "student_id": s.id,
                "student_name": s.name,
                "coins": wallet.coins,
            }
        )
    return result


def adjust_wallet(
    db: Session,
    student_id: int,
    amount: int,
    tenant: TenantContext | None = None,
) -> dict:
    student = _get_student(db, student_id, tenant=tenant)
    if amount == 0:
        return get_wallet(db, student_id, tenant=tenant)
    wallet = _ensure_wallet(db, student, tenant=tenant)
    new_balance = wallet.coins + amount
    if new_balance < 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Balans yetarli emas")
    wallet.coins = new_balance
    db.commit()
    db.refresh(wallet)
    return {
        "student_id": student.id,
        "student_name": student.name,
        "coins": wallet.coins,
    }


# ─── Purchases ──────────────────────────────────────────────────────────────


def _purchase_payload(p: RewardPurchase) -> dict:
    return {
        "id": p.id,
        "student_id": p.student_id,
        "student_name": p.student.name if p.student else None,
        "reward_id": p.reward_id,
        "reward_name": p.reward.name if p.reward else None,
        "cost": p.cost,
        "status": p.status,
        "created_at": p.created_at,
    }


def list_purchases(
    db: Session,
    *,
    student_id: int | None = None,
    limit: int = 100,
    tenant: TenantContext | None = None,
) -> list[dict]:
    q = _scope(db.query(RewardPurchase), RewardPurchase, tenant)
    if student_id is not None:
        q = q.filter(RewardPurchase.student_id == student_id)
    rows = q.order_by(RewardPurchase.created_at.desc()).limit(limit).all()
    return [_purchase_payload(p) for p in rows]


def create_purchase(
    db: Session,
    student_id: int,
    reward_id: int,
    tenant: TenantContext | None = None,
) -> dict:
    """Create a purchase atomically.

    Concurrency strategy: instead of relying on row-level locks (which behave
    differently across Postgres / SQLite / MySQL), we issue an atomic
    ``UPDATE ... WHERE stock > 0 AND coins >= cost`` and check the rowcount.
    Either the row was decremented (we won the race) or another transaction
    consumed the last unit (we lose). This is portable and correct under
    Postgres concurrency *and* under SQLite's single-writer model.

    Server-authoritative: cost is read from the Reward row, never from the
    client. Stock and balance are re-checked atomically by the UPDATE.
    """
    student = _get_student(db, student_id, tenant=tenant)

    # Read reward (and validate tenant + activity) before the atomic decrement.
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mukofot topilmadi")
    if tenant is not None:
        tenant.assert_owns(reward)
    if not reward.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mukofot faol emas")
    if reward.stock <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mukofot qolmagan")

    cost = reward.cost  # server-authoritative price snapshot

    # Make sure a wallet row exists so the UPDATE-coins below has a target.
    _ensure_wallet(db, student, tenant=tenant)

    # Atomic stock decrement: only succeeds if stock > 0 still holds.
    stock_dec = (
        db.query(Reward)
        .filter(Reward.id == reward_id, Reward.stock > 0)
        .update({Reward.stock: Reward.stock - 1}, synchronize_session=False)
    )
    if stock_dec == 0:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mukofot qolmagan")

    # Atomic wallet debit: only succeeds if coins >= cost still holds. If
    # this fails, refund the stock we just took and report insufficient funds.
    coin_dec = (
        db.query(StudentWallet)
        .filter(
            StudentWallet.student_id == student.id,
            StudentWallet.coins >= cost,
        )
        .update({StudentWallet.coins: StudentWallet.coins - cost}, synchronize_session=False)
    )
    if coin_dec == 0:
        # Roll the stock back so we don't leak inventory.
        db.query(Reward).filter(Reward.id == reward_id).update(
            {Reward.stock: Reward.stock + 1}, synchronize_session=False
        )
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tangalar yetarli emas")

    purchase = RewardPurchase(
        student_id=student.id,
        reward_id=reward.id,
        cost=cost,
        status=PurchaseStatus.PENDING,
        center_id=student.center_id,
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return _purchase_payload(purchase)


def update_purchase_status(
    db: Session,
    purchase_id: int,
    new_status: PurchaseStatus,
    tenant: TenantContext | None = None,
) -> dict:
    purchase = db.query(RewardPurchase).filter(RewardPurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Xarid topilmadi")
    if tenant is not None:
        tenant.assert_owns(purchase)
    # If cancelling, refund coins + stock.
    if new_status == PurchaseStatus.CANCELLED and purchase.status != PurchaseStatus.CANCELLED:
        student = db.query(Student).filter(Student.id == purchase.student_id).first()
        if student is not None:
            wallet = _ensure_wallet(db, student, tenant=tenant)
            wallet.coins += purchase.cost
        reward = purchase.reward
        if reward:
            reward.stock += 1
    purchase.status = new_status
    db.commit()
    db.refresh(purchase)
    return _purchase_payload(purchase)
