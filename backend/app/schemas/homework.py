"""Pydantic schemas for Homework feature."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class HomeworkCreate(BaseModel):
    group_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    due_date: date | None = None
    coin_reward: int = Field(5, ge=0, le=1000)


class HomeworkUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    due_date: date | None = None
    coin_reward: int | None = Field(None, ge=0, le=1000)


class SubmissionMark(BaseModel):
    student_id: int
    status: str  # "done" | "not_done" | "pending"
    note: str | None = None


class MarkBatch(BaseModel):
    marks: list[SubmissionMark]


class SubmissionOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    status: str
    coins_awarded: int
    marked_at: datetime | None
    note: str | None

    model_config = {"from_attributes": True}


class HomeworkOut(BaseModel):
    id: int
    group_id: int
    group_name: str
    course_name: str | None
    teacher_id: int
    teacher_name: str
    title: str
    description: str | None
    due_date: date | None
    coin_reward: int
    created_at: datetime
    # Aggregate counts (for teacher list)
    total_students: int = 0
    done_count: int = 0
    pending_count: int = 0

    model_config = {"from_attributes": True}


class HomeworkDetailOut(HomeworkOut):
    submissions: list[SubmissionOut] = []


class MyHomeworkItem(BaseModel):
    id: int
    title: str
    description: str | None
    due_date: date | None
    coin_reward: int
    coins_awarded: int
    status: str  # student's submission status
    group_id: int
    group_name: str
    course_name: str | None
    teacher_name: str
    marked_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MyHomeworkOut(BaseModel):
    items: list[MyHomeworkItem]
    total: int
    pending: int
    done: int


class HomeworkListOut(BaseModel):
    items: list[HomeworkOut]
    total: int
