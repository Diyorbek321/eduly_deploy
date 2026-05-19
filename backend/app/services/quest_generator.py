"""AI-powered daily quest generator using Google Gemini.

Generates 10 mixed-format questions per CourseModule per day.
Question formats chosen randomly: mcq, truefalse, fillblank.
"""

from __future__ import annotations

import json
import logging
import os
import random
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import CourseModule, DailyQuest, StudentModuleEnrollment

logger = logging.getLogger(__name__)

_QUESTION_TYPES = ["mcq", "mcq", "mcq", "truefalse", "fillblank"]  # weighted toward mcq

_SYSTEM_PROMPT = """You are an expert educational quiz generator for a language and skills training center.
Generate exactly 10 quiz questions. Mix question types randomly across these formats:

1. "mcq" — multiple choice with 4 options labeled exactly "A: ...", "B: ...", "C: ...", "D: ..."
2. "truefalse" — a statement with options exactly ["True", "False"]
3. "fillblank" — a sentence containing [BLANK] with 4 options labeled "A: ...", "B: ...", "C: ...", "D: ..."

Rules:
- Correct answer must exactly match one of the options strings.
- Questions must be appropriate for the specified course and level.
- Keep questions practical, engaging, and varied.
- Return ONLY a valid JSON array — no markdown, no explanation, no extra text.

JSON schema for each question:
{
  "type": "mcq" | "truefalse" | "fillblank",
  "question": "<question text>",
  "options": ["<option1>", "<option2>", ...],
  "correct": "<exact text of correct option>",
  "explanation": "<brief 1-sentence explanation>"
}"""


def _build_prompt(course_name: str, module_name: str, hint: str | None) -> str:
    extra = f"\n\nAdditional context: {hint}" if hint else ""
    return (
        f"Generate 10 quiz questions for students studying {course_name} "
        f"at the {module_name} level.{extra}\n\n"
        "Return ONLY the JSON array."
    )


def _call_gemini(prompt: str) -> list[dict]:
    """Call Gemini API and return parsed question list. Raises on failure."""
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=_SYSTEM_PROMPT,
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.8,
            max_output_tokens=4096,
        ),
    )

    raw = response.text.strip()
    # Strip markdown code fences if Gemini wraps in them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    questions = json.loads(raw)
    if not isinstance(questions, list) or len(questions) < 5:
        raise ValueError(f"Unexpected response structure: {len(questions) if isinstance(questions, list) else type(questions)}")

    # Normalize to exactly 10 questions
    return questions[:10]


def _get_yesterday_questions(db: Session, module_id: int, today: str) -> list[dict] | None:
    """Return yesterday's questions as fallback."""
    yesterday = (datetime.strptime(today, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
    prev = db.query(DailyQuest).filter(
        DailyQuest.module_id == module_id,
        DailyQuest.date == yesterday,
    ).first()
    if prev:
        try:
            return json.loads(prev.questions)
        except Exception:
            pass
    return None


def generate_quest_for_module(
    db: Session,
    module: CourseModule,
    today: str,
    *,
    max_retries: int = 2,
) -> DailyQuest | None:
    """Generate (or fetch existing) DailyQuest for a module on the given date.

    Returns None if generation failed and no fallback is available.
    """
    # Idempotent — skip if already generated today
    existing = db.query(DailyQuest).filter(
        DailyQuest.module_id == module.id,
        DailyQuest.date == today,
    ).first()
    if existing:
        return existing

    course_name = module.course.name if module.course else "General"
    prompt = _build_prompt(course_name, module.name, module.ai_prompt_hint)

    questions: list[dict] | None = None
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 2):  # +1 so we try max_retries+1 times total
        try:
            questions = _call_gemini(prompt)
            logger.info(
                "quest-gen: generated %s questions for module=%s date=%s (attempt %s)",
                len(questions), module.id, today, attempt,
            )
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning(
                "quest-gen: attempt %s/%s failed for module=%s — %s",
                attempt, max_retries + 1, module.id, exc,
            )

    if questions is None:
        # All attempts failed — try yesterday's quest as fallback
        fallback = _get_yesterday_questions(db, module.id, today)
        if fallback:
            logger.info(
                "quest-gen: using yesterday's fallback for module=%s date=%s", module.id, today
            )
            questions = fallback
        else:
            logger.error(
                "quest-gen: no fallback available for module=%s date=%s — %s",
                module.id, today, last_error,
            )
            return None

    quest = DailyQuest(
        module_id=module.id,
        date=today,
        questions=json.dumps(questions, ensure_ascii=False),
    )
    db.add(quest)
    db.commit()
    db.refresh(quest)
    return quest


def run_daily_quest_generation(db: Session, *, on_date: date | None = None) -> int:
    """Generate quests for every active module that has enrolled students.

    Called by the scheduler at 00:00. Returns count of quests generated.
    """
    today = (on_date or date.today()).strftime("%Y-%m-%d")

    # Find modules that have at least one enrolled student
    module_ids_with_students = [
        r[0] for r in db.query(StudentModuleEnrollment.module_id).distinct().all()
    ]
    if not module_ids_with_students:
        logger.info("quest-gen: no enrolled students, nothing to generate")
        return 0

    modules = (
        db.query(CourseModule)
        .filter(CourseModule.id.in_(module_ids_with_students))
        .all()
    )

    generated = 0
    for module in modules:
        quest = generate_quest_for_module(db, module, today)
        if quest:
            generated += 1

    logger.info("quest-gen: %s/%s quests generated for %s", generated, len(modules), today)
    return generated


# ─── Scheduler entry point ────────────────────────────────────────────────────


def _quest_job_entry() -> None:
    db = SessionLocal()
    try:
        run_daily_quest_generation(db)
    finally:
        db.close()


def register_quest_jobs(scheduler) -> None:
    from apscheduler.triggers.cron import CronTrigger

    scheduler.add_job(
        _quest_job_entry,
        CronTrigger(hour=0, minute=0),
        id="daily_quest_generation",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    logger.info("Quest generation job registered: daily at 00:00")
