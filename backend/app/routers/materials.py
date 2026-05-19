"""Lesson materials — admin uploads, student read-only (own groups only)."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.permissions import RoleChecker
from app.core.tenant import TenantContext
from app.dependencies import get_current_user, get_db, get_tenant
from app.models.models import (
    Group,
    LessonMaterial,
    Student,
    StudentGroup,
    User,
    UserRole,
)

router = APIRouter()

require_admin = RoleChecker([UserRole.ADMIN])
require_student = RoleChecker([UserRole.STUDENT])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads" / "materials"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

_MIME_MAP = {
    "application/pdf": "pdf",
    "video/": "video",
    "image/": "image",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument": "doc",
    "application/vnd.ms-": "doc",
}


def _file_type(content_type: str | None) -> str:
    ct = (content_type or "").lower()
    for prefix, label in _MIME_MAP.items():
        if ct.startswith(prefix):
            return label
    return "other"


class MaterialOut(BaseModel):
    id: int
    group_id: int
    group_name: str
    title: str
    description: str | None
    file_url: str
    file_name: str
    file_type: str
    file_size: int | None
    uploaded_by_name: str | None
    created_at: str | None

    model_config = {"from_attributes": True}


def _to_out(m: LessonMaterial, base_url: str) -> MaterialOut:
    return MaterialOut(
        id=m.id,
        group_id=m.group_id,
        group_name=m.group.name if m.group else "",
        title=m.title,
        description=m.description,
        file_url=f"{base_url}/media/materials/{m.file_path}",
        file_name=m.file_name,
        file_type=m.file_type,
        file_size=m.file_size,
        uploaded_by_name=m.uploaded_by.name if m.uploaded_by and hasattr(m.uploaded_by, "name") else None,
        created_at=m.created_at.isoformat() if m.created_at else None,
    )


# ── Admin endpoints ───────────────────────────────────────────────────────────


@router.post("/", response_model=MaterialOut, status_code=201)
async def upload_material(
    title: str = Form(...),
    group_id: int = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
    request: Request,
) -> MaterialOut:
    request_base = str(request.base_url).rstrip("/")
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi.")
    if tenant is not None:
        tenant.assert_owns(group)

    safe_name = Path(file.filename or "file").name
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    dest = UPLOADS_DIR / unique_name
    content = await file.read()
    dest.write_bytes(content)

    mat = LessonMaterial(
        center_id=group.center_id,
        group_id=group_id,
        title=title.strip(),
        description=description,
        file_path=unique_name,
        file_name=safe_name,
        file_type=_file_type(file.content_type),
        file_size=len(content),
        uploaded_by_id=user.id,
    )
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return _to_out(mat, request_base)


@router.get("/", response_model=list[MaterialOut])
def list_materials(
    request: Request,
    group_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
) -> list[MaterialOut]:
    base = str(request.base_url).rstrip("/")
    q = db.query(LessonMaterial)
    if tenant is not None:
        q = q.filter(LessonMaterial.center_id == tenant.center_id)
    if group_id is not None:
        q = q.filter(LessonMaterial.group_id == group_id)
    rows = q.order_by(LessonMaterial.created_at.desc()).all()
    return [_to_out(m, base) for m in rows]


@router.delete("/{material_id}", status_code=204)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
) -> None:
    mat = db.query(LessonMaterial).filter(LessonMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material topilmadi.")
    if tenant is not None:
        tenant.assert_owns(mat)
    dest = UPLOADS_DIR / mat.file_path
    if dest.exists():
        dest.unlink()
    db.delete(mat)
    db.commit()


# ── Student endpoint ──────────────────────────────────────────────────────────


@router.get("/my", response_model=list[MaterialOut])
def my_materials(
    request: Request,
    group_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> list[MaterialOut]:
    base = str(request.base_url).rstrip("/")
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="O'quvchi profili topilmadi.")

    enrolled_group_ids = [
        sg.group_id for sg in db.query(StudentGroup).filter(StudentGroup.student_id == student.id).all()
    ]
    if not enrolled_group_ids:
        return []

    q = db.query(LessonMaterial).filter(LessonMaterial.group_id.in_(enrolled_group_ids))
    if group_id is not None:
        if group_id not in enrolled_group_ids:
            raise HTTPException(status_code=403, detail="Bu guruhga kirish huquqingiz yo'q.")
        q = q.filter(LessonMaterial.group_id == group_id)

    rows = q.order_by(LessonMaterial.created_at.desc()).all()
    return [_to_out(m, base) for m in rows]
