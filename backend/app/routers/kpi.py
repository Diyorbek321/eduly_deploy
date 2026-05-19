"""Teacher KPI router — calculate, history, leaderboard, badges."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import User
from app.services import kpi as kpi_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.post("/{teacher_id}/calculate")
def calculate_kpi(
    teacher_id: int,
    month: str = Query(default=None, description="YYYY-MM, defaults to current month"),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    """Calculate (or recalculate) KPI for a teacher for the given month."""
    if not month:
        month = date.today().strftime("%Y-%m")
    kpi = kpi_service.calculate(db, teacher_id, month)
    return {
        "teacher_id": kpi.teacher_id,
        "month": kpi.month,
        "total_score": kpi.total_score,
        "bonus_tier": kpi.bonus_tier,
        "bonus_percent": kpi.bonus_percent,
        "retention_score": kpi.retention_score,
        "homework_score": kpi.homework_score,
        "attendance_score": kpi.attendance_score,
        "payment_score": kpi.payment_score,
        "student_count": kpi.student_count,
    }


@router.get("/{teacher_id}/history")
def kpi_history(
    teacher_id: int,
    limit: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
):
    """Return KPI history for a teacher (most recent first)."""
    records = kpi_service.get_history(db, teacher_id, limit=limit)
    return [
        {
            "month": k.month,
            "total_score": k.total_score,
            "bonus_tier": k.bonus_tier,
            "bonus_percent": k.bonus_percent,
            "retention_score": k.retention_score,
            "homework_score": k.homework_score,
            "attendance_score": k.attendance_score,
            "payment_score": k.payment_score,
            "student_count": k.student_count,
        }
        for k in records
    ]


@router.get("/{teacher_id}/badges")
def teacher_badges(
    teacher_id: int,
    db: Session = Depends(get_db),
):
    """Return all badges awarded to a teacher."""
    badges = kpi_service.get_badges(db, teacher_id)
    return [
        {
            "id": b.id,
            "badge_type": b.badge_type,
            "description": b.description,
            "awarded_at": b.awarded_at.isoformat() if b.awarded_at else None,
        }
        for b in badges
    ]


@router.get("/leaderboard")
def leaderboard(
    month: str = Query(default=None, description="YYYY-MM, defaults to current month"),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    """Return teacher rankings for a given month."""
    if not month:
        month = date.today().strftime("%Y-%m")
    center_id = tenant.user.center_id if (tenant and not tenant.is_super_admin) else None
    return kpi_service.get_leaderboard(db, center_id=center_id, month=month)
