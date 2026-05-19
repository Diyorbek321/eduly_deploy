"""CRM router — lead tracking and sales pipeline."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import Lead, LeadSource, LeadStage
from app.schemas.crm import LeadCreate, LeadOut, LeadUpdate, PipelineStats

router = APIRouter(dependencies=[Depends(require_admin)])

STAGE_ORDER = [
    LeadStage.YANGI,
    LeadStage.QONGIROQ,
    LeadStage.SINOV_DARSI,
    LeadStage.ROYXATDAN_OTDI,
    LeadStage.YOQOTILDI,
]


def _enrich(lead: Lead) -> dict:
    d = {
        "id": lead.id,
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "source": lead.source.value if lead.source else None,
        "stage": lead.stage.value if lead.stage else LeadStage.YANGI.value,
        "course_interest": lead.course_interest,
        "notes": lead.notes,
        "assigned_to_id": lead.assigned_to_id,
        "assigned_to_name": (lead.assigned_to.full_name or lead.assigned_to.email) if lead.assigned_to else None,
        "trial_date": lead.trial_date,
        "lost_reason": lead.lost_reason,
        "converted_student_id": lead.converted_student_id,
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
    }
    return d


@router.get("/leads", response_model=list[LeadOut])
def list_leads(
    stage: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    q = db.query(Lead)
    if not tenant.is_super_admin:
        q = q.filter(Lead.center_id == tenant.user.center_id)
    if stage:
        q = q.filter(Lead.stage == stage)
    if search:
        q = q.filter(Lead.name.ilike(f"%{search}%") | Lead.phone.ilike(f"%{search}%"))
    leads = q.order_by(Lead.created_at.desc()).all()
    return [_enrich(l) for l in leads]


@router.get("/stats", response_model=PipelineStats)
def pipeline_stats(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    q = db.query(Lead.stage, func.count(Lead.id).label("cnt"))
    if not tenant.is_super_admin:
        q = q.filter(Lead.center_id == tenant.user.center_id)
    rows = q.group_by(Lead.stage).all()

    by_stage = {s.value: 0 for s in STAGE_ORDER}
    for stage, cnt in rows:
        if stage:
            by_stage[stage.value] = cnt

    total = sum(by_stage.values())
    converted = by_stage.get(LeadStage.ROYXATDAN_OTDI.value, 0)
    rate = round(converted / total * 100, 1) if total else 0

    return PipelineStats(total=total, by_stage=by_stage, conversion_rate=rate)


@router.post("/leads", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(
    body: LeadCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    source_enum = None
    if body.source:
        try:
            source_enum = LeadSource(body.source)
        except ValueError:
            source_enum = LeadSource.BOSHQA

    lead = Lead(
        center_id=None if tenant.is_super_admin else tenant.user.center_id,
        name=body.name,
        phone=body.phone,
        email=body.email,
        source=source_enum,
        course_interest=body.course_interest,
        notes=body.notes,
        assigned_to_id=body.assigned_to_id,
        trial_date=body.trial_date,
        stage=LeadStage.YANGI,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _enrich(lead)


@router.get("/leads/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead topilmadi")
    if not tenant.is_super_admin and lead.center_id != tenant.user.center_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead topilmadi")
    return _enrich(lead)


@router.patch("/leads/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    body: LeadUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead topilmadi")
    if not tenant.is_super_admin and lead.center_id != tenant.user.center_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead topilmadi")

    if body.name is not None:
        lead.name = body.name
    if body.phone is not None:
        lead.phone = body.phone
    if body.email is not None:
        lead.email = body.email
    if body.source is not None:
        try:
            lead.source = LeadSource(body.source)
        except ValueError:
            lead.source = LeadSource.BOSHQA
    if body.stage is not None:
        try:
            lead.stage = LeadStage(body.stage)
        except ValueError:
            pass
    if body.course_interest is not None:
        lead.course_interest = body.course_interest
    if body.notes is not None:
        lead.notes = body.notes
    if body.assigned_to_id is not None:
        lead.assigned_to_id = body.assigned_to_id
    if body.trial_date is not None:
        lead.trial_date = body.trial_date
    if body.lost_reason is not None:
        lead.lost_reason = body.lost_reason
    if body.converted_student_id is not None:
        lead.converted_student_id = body.converted_student_id

    db.commit()
    db.refresh(lead)
    return _enrich(lead)


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead topilmadi")
    if not tenant.is_super_admin and lead.center_id != tenant.user.center_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead topilmadi")
    db.delete(lead)
    db.commit()
