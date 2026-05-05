"""Salaries router — CRUD + pay action (multi-tenant scoped)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.schemas.auth import MessageResponse
from app.schemas.salary import SalaryCreate, SalaryOut, SalaryUpdate
from app.services import salary as salary_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/", response_model=list[SalaryOut])
def list_salaries(
    teacher_id: int | None = None,
    month: str | None = None,
    is_paid: bool | None = None,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return salary_service.get_all(
        db, teacher_id=teacher_id, month=month, is_paid=is_paid, tenant=tenant
    )


@router.get("/{salary_id}", response_model=SalaryOut)
def get_salary(
    salary_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return salary_service.get_by_id(db, salary_id, tenant=tenant)


@router.post("/", response_model=SalaryOut, status_code=201)
def create_salary(
    data: SalaryCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return salary_service.create(db, data, tenant=tenant)


@router.put("/{salary_id}", response_model=SalaryOut)
def update_salary(
    salary_id: int,
    data: SalaryUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return salary_service.update(db, salary_id, data, tenant=tenant)


@router.post("/{salary_id}/pay", response_model=SalaryOut)
def pay_salary(
    salary_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return salary_service.pay(db, salary_id, tenant=tenant)


@router.delete("/{salary_id}", response_model=MessageResponse)
def delete_salary(
    salary_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    salary_service.delete(db, salary_id, tenant=tenant)
    return {"message": "Oylik o'chirildi"}
