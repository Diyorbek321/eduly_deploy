"""Course Modules router — admin CRUD for module management."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import (
    Course, CourseModule, DailyQuest, StudentModuleEnrollment,
)

router = APIRouter(dependencies=[Depends(require_admin)])


class ModuleCreate(BaseModel):
    course_id: int
    name: str
    level_order: int = 1
    description: str | None = None
    ai_prompt_hint: str | None = None


class ModuleUpdate(BaseModel):
    name: str | None = None
    level_order: int | None = None
    description: str | None = None
    ai_prompt_hint: str | None = None


class ModuleOut(BaseModel):
    id: int
    course_id: int
    course_name: str
    name: str
    level_order: int
    description: str | None = None
    ai_prompt_hint: str | None = None
    student_count: int
    quest_count: int

    model_config = {"from_attributes": True}


def _build_out(module: CourseModule, db: Session) -> ModuleOut:
    student_count = db.query(func.count(StudentModuleEnrollment.id)).filter(
        StudentModuleEnrollment.module_id == module.id
    ).scalar() or 0
    quest_count = db.query(func.count(DailyQuest.id)).filter(
        DailyQuest.module_id == module.id
    ).scalar() or 0
    return ModuleOut(
        id=module.id,
        course_id=module.course_id,
        course_name=module.course.name if module.course else "",
        name=module.name,
        level_order=module.level_order,
        description=module.description,
        ai_prompt_hint=module.ai_prompt_hint,
        student_count=student_count,
        quest_count=quest_count,
    )


@router.get("/", response_model=list[ModuleOut])
def list_modules(
    course_id: int | None = None,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    q = db.query(CourseModule).join(Course, CourseModule.course_id == Course.id)
    if not tenant.is_super_admin:
        q = q.filter(Course.center_id == tenant.user.center_id)
    if course_id:
        q = q.filter(CourseModule.course_id == course_id)
    modules = q.order_by(CourseModule.course_id, CourseModule.level_order).all()
    return [_build_out(m, db) for m in modules]


@router.post("/", response_model=ModuleOut, status_code=status.HTTP_201_CREATED)
def create_module(
    body: ModuleCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(404, "Kurs topilmadi")
    if not tenant.is_super_admin and course.center_id != tenant.user.center_id:
        raise HTTPException(403, "Ruxsat yo'q")

    module = CourseModule(
        course_id=body.course_id,
        name=body.name,
        level_order=body.level_order,
        description=body.description,
        ai_prompt_hint=body.ai_prompt_hint,
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return _build_out(module, db)


@router.patch("/{module_id}", response_model=ModuleOut)
def update_module(
    module_id: int,
    body: ModuleUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(404, "Modul topilmadi")
    course = db.query(Course).filter(Course.id == module.course_id).first()
    if not tenant.is_super_admin and (not course or course.center_id != tenant.user.center_id):
        raise HTTPException(403, "Ruxsat yo'q")

    if body.name is not None:
        module.name = body.name
    if body.level_order is not None:
        module.level_order = body.level_order
    if body.description is not None:
        module.description = body.description
    if body.ai_prompt_hint is not None:
        module.ai_prompt_hint = body.ai_prompt_hint

    db.commit()
    db.refresh(module)
    return _build_out(module, db)


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(404, "Modul topilmadi")
    course = db.query(Course).filter(Course.id == module.course_id).first()
    if not tenant.is_super_admin and (not course or course.center_id != tenant.user.center_id):
        raise HTTPException(403, "Ruxsat yo'q")
    db.delete(module)
    db.commit()


@router.post("/{module_id}/generate-quest")
def trigger_quest_generation(
    module_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    """Manually trigger AI quest generation for a module (today's date)."""
    from datetime import date as date_type
    from app.services.quest_generator import generate_quest_for_module

    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(404, "Modul topilmadi")

    today = date_type.today().strftime("%Y-%m-%d")
    # Delete existing so we can regenerate
    existing = db.query(DailyQuest).filter(
        DailyQuest.module_id == module_id,
        DailyQuest.date == today,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()

    quest = generate_quest_for_module(db, module, today)
    if not quest:
        raise HTTPException(500, "Savol yaratishda xatolik — GEMINI_API_KEY tekshiring")

    import json
    questions = json.loads(quest.questions)
    return {"quest_id": quest.id, "date": quest.date, "question_count": len(questions)}


@router.get("/{module_id}/students")
def module_students(
    module_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    """List students enrolled in this module."""
    from app.models.models import Student
    enrollments = (
        db.query(StudentModuleEnrollment)
        .filter(StudentModuleEnrollment.module_id == module_id)
        .all()
    )
    result = []
    for e in enrollments:
        s = db.query(Student).filter(Student.id == e.student_id).first()
        if s:
            result.append({
                "student_id": s.id,
                "student_name": s.name,
                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            })
    return result


@router.post("/{module_id}/enroll/{student_id}")
def manually_enroll(
    module_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    """Manually move a student to a module (replaces any existing enrollment for the same course)."""
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(404, "Modul topilmadi")

    existing = (
        db.query(StudentModuleEnrollment)
        .join(CourseModule, StudentModuleEnrollment.module_id == CourseModule.id)
        .filter(
            StudentModuleEnrollment.student_id == student_id,
            CourseModule.course_id == module.course_id,
        )
        .first()
    )
    if existing:
        existing.module_id = module_id
        existing.enrolled_at = datetime.utcnow()
    else:
        db.add(StudentModuleEnrollment(student_id=student_id, module_id=module_id))

    db.commit()
    return {"success": True}
