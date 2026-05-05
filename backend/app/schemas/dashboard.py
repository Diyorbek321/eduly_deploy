"""Dashboard schemas."""

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_students: int
    active_students: int
    total_teachers: int
    total_groups: int
    total_revenue: float
    total_debt: float


class ChartData(BaseModel):
    labels: list[str]
    data: list[float]
