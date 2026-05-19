"""Daily Quests router — student quest retrieval, submission, and admin stats."""

import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_any
from app.dependencies import get_current_user, get_db
from app.models.models import (
    CourseModule, DailyQuest, DailyQuestAttempt,
    Student, StudentModuleEnrollment, User,
)

router = APIRouter()

COINS_REWARD = 5
PASS_THRESHOLD = 9  # out of 10


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_student(db: Session, user: User) -> Student:
    s = db.query(Student).filter(Student.user_id == user.id).first()
    if not s:
        raise HTTPException(403, "Faqat o'quvchilar uchun")
    return s


def _award_coins(student_id: int, amount: int, db: Session) -> None:
    """Best-effort coin award using the existing reward service."""
    try:
        from app.services.reward import credit_coins
        credit_coins(db, student_id=student_id, amount=amount, reason="daily_quest_pass")
    except Exception:  # noqa: BLE001
        pass  # reward service optional — don't block submission


# ─── Student endpoints ────────────────────────────────────────────────────────


class SubmitAnswers(BaseModel):
    answers: dict[str, str]  # {"0": "A: ...", "1": "True", ...}


@router.get("/today")
def today_quest(
    db: Session = Depends(get_db),
    user: User = Depends(require_any),
):
    """Return today's quest for the student's current module (all enrolled modules)."""
    student = _get_student(db, user)
    today = date.today().strftime("%Y-%m-%d")

    enrollments = (
        db.query(StudentModuleEnrollment)
        .filter(StudentModuleEnrollment.student_id == student.id)
        .all()
    )
    if not enrollments:
        return {"quests": []}

    result = []
    for enr in enrollments:
        module = db.query(CourseModule).filter(CourseModule.id == enr.module_id).first()
        if not module:
            continue
        quest = db.query(DailyQuest).filter(
            DailyQuest.module_id == enr.module_id,
            DailyQuest.date == today,
        ).first()
        if not quest:
            continue

        attempt = db.query(DailyQuestAttempt).filter(
            DailyQuestAttempt.student_id == student.id,
            DailyQuestAttempt.quest_id == quest.id,
        ).first()

        try:
            questions = json.loads(quest.questions)
        except Exception:
            questions = []

        result.append({
            "quest_id": quest.id,
            "module_id": module.id,
            "module_name": module.name,
            "course_name": module.course.name if module.course else "",
            "date": quest.date,
            "questions": questions,
            "completed": attempt is not None,
            "score": attempt.score if attempt else None,
            "coins_awarded": attempt.coins_awarded if attempt else False,
        })

    return {"quests": result}


@router.post("/{quest_id}/submit")
def submit_quest(
    quest_id: int,
    body: SubmitAnswers,
    db: Session = Depends(get_db),
    user: User = Depends(require_any),
):
    """Student submits answers. Score computed server-side. Coins awarded if ≥9/10."""
    student = _get_student(db, user)

    quest = db.query(DailyQuest).filter(DailyQuest.id == quest_id).first()
    if not quest:
        raise HTTPException(404, "Quest topilmadi")

    # Verify student is enrolled in this module
    enrollment = db.query(StudentModuleEnrollment).filter(
        StudentModuleEnrollment.student_id == student.id,
        StudentModuleEnrollment.module_id == quest.module_id,
    ).first()
    if not enrollment:
        raise HTTPException(403, "Bu quest siz uchun emas")

    # One attempt only
    existing = db.query(DailyQuestAttempt).filter(
        DailyQuestAttempt.student_id == student.id,
        DailyQuestAttempt.quest_id == quest_id,
    ).first()
    if existing:
        return {
            "score": existing.score,
            "total": 10,
            "passed": existing.score >= PASS_THRESHOLD,
            "coins_awarded": existing.coins_awarded,
            "already_submitted": True,
        }

    # Grade answers
    try:
        questions = json.loads(quest.questions)
    except Exception:
        raise HTTPException(500, "Quest ma'lumotlari buzilgan")

    score = 0
    for i, q in enumerate(questions):
        submitted = body.answers.get(str(i), "").strip()
        if submitted == q.get("correct", "").strip():
            score += 1

    passed = score >= PASS_THRESHOLD
    coins_awarded = False

    attempt = DailyQuestAttempt(
        student_id=student.id,
        quest_id=quest_id,
        answers=json.dumps(body.answers),
        score=score,
        coins_awarded=passed,
    )
    db.add(attempt)
    db.commit()

    if passed:
        _award_coins(student.id, COINS_REWARD, db)
        coins_awarded = True

    return {
        "score": score,
        "total": len(questions),
        "passed": passed,
        "coins_awarded": coins_awarded,
        "coins_amount": COINS_REWARD if coins_awarded else 0,
    }


# ─── Module path ─────────────────────────────────────────────────────────────


@router.get("/module-path")
def student_module_path(
    db: Session = Depends(get_db),
    user: User = Depends(require_any),
):
    """Return every course the student is enrolled in with all modules and
    today's quest status. Drives the Learning Path module view in the mobile app."""
    student = _get_student(db, user)
    today = date.today().strftime("%Y-%m-%d")

    enrollments = (
        db.query(StudentModuleEnrollment)
        .filter(StudentModuleEnrollment.student_id == student.id)
        .all()
    )

    from app.models.models import Course
    course_map: dict[int, dict] = {}

    for enr in enrollments:
        module = db.query(CourseModule).filter(CourseModule.id == enr.module_id).first()
        if not module:
            continue
        cid = module.course_id
        if cid not in course_map:
            course = db.query(Course).filter(Course.id == cid).first()
            all_mods = (
                db.query(CourseModule)
                .filter(CourseModule.course_id == cid)
                .order_by(CourseModule.level_order)
                .all()
            )
            course_map[cid] = {
                "course_id": cid,
                "course_name": course.name if course else "",
                "current_module_id": enr.module_id,
                "all_modules": all_mods,
            }
        else:
            course_map[cid]["current_module_id"] = enr.module_id

    result = []
    for cdata in course_map.values():
        current_id = cdata["current_module_id"]
        all_mods: list[CourseModule] = cdata["all_modules"]
        current_order = next(
            (m.level_order for m in all_mods if m.id == current_id), 999
        )

        modules_out = []
        for mod in all_mods:
            quest = db.query(DailyQuest).filter(
                DailyQuest.module_id == mod.id,
                DailyQuest.date == today,
            ).first()

            quest_info = None
            if quest:
                attempt = db.query(DailyQuestAttempt).filter(
                    DailyQuestAttempt.student_id == student.id,
                    DailyQuestAttempt.quest_id == quest.id,
                ).first()
                quest_info = {
                    "quest_id": quest.id,
                    "completed": attempt is not None,
                    "score": attempt.score if attempt else None,
                    "coins_awarded": attempt.coins_awarded if attempt else False,
                }

            modules_out.append({
                "id": mod.id,
                "name": mod.name,
                "level_order": mod.level_order,
                "description": mod.description,
                "is_current": mod.id == current_id,
                "is_completed": mod.level_order < current_order,
                "is_locked": mod.level_order > current_order,
                "quest_today": quest_info,
            })

        result.append({
            "course_id": cdata["course_id"],
            "course_name": cdata["course_name"],
            "modules": modules_out,
            "total_modules": len(all_mods),
            "current_level_order": current_order,
        })

    return {"courses": result}


# ─── Admin endpoints ──────────────────────────────────────────────────────────


@router.get("/admin/stats", dependencies=[Depends(require_admin)])
def quest_admin_stats(
    db: Session = Depends(get_db),
):
    """Admin view: quests generated today, attempt counts, pass rates."""
    today = date.today().strftime("%Y-%m-%d")
    quests = db.query(DailyQuest).filter(DailyQuest.date == today).all()

    result = []
    for q in quests:
        module = db.query(CourseModule).filter(CourseModule.id == q.module_id).first()
        total_attempts = db.query(DailyQuestAttempt).filter(
            DailyQuestAttempt.quest_id == q.id
        ).count()
        passed = db.query(DailyQuestAttempt).filter(
            DailyQuestAttempt.quest_id == q.id,
            DailyQuestAttempt.score >= PASS_THRESHOLD,
        ).count()
        enrolled = db.query(StudentModuleEnrollment).filter(
            StudentModuleEnrollment.module_id == q.module_id
        ).count()

        try:
            q_count = len(json.loads(q.questions))
        except Exception:
            q_count = 0

        result.append({
            "quest_id": q.id,
            "module_id": q.module_id,
            "module_name": module.name if module else "",
            "course_name": module.course.name if module and module.course else "",
            "date": q.date,
            "question_count": q_count,
            "enrolled_students": enrolled,
            "total_attempts": total_attempts,
            "passed": passed,
            "pass_rate": round(passed / total_attempts * 100, 1) if total_attempts else 0,
            "completion_rate": round(total_attempts / enrolled * 100, 1) if enrolled else 0,
        })

    return {"date": today, "quests": result}
