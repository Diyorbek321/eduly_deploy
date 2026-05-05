"""Dashboard router — aggregate stats and charts (multi-tenant scoped)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.schemas.dashboard import ChartData, DashboardStats
from app.services import dashboard as dashboard_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return dashboard_service.get_stats(db, tenant=tenant)


@router.get("/revenue-chart", response_model=ChartData)
def revenue_chart(
    period: str = "monthly",
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return dashboard_service.get_revenue_chart(db, period, tenant=tenant)


@router.get("/attendance-chart", response_model=ChartData)
def attendance_chart(
    period: str = "weekly",
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return dashboard_service.get_attendance_chart(db, period, tenant=tenant)
