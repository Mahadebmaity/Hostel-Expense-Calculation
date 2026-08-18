from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.schemas.user import UserOut

class MealAttendanceBase(BaseModel):
    user_id: str
    record_date: date
    breakfast_count: float = Field(ge=0, default=0.0)
    lunch_count: float = Field(ge=0, default=0.0)
    dinner_count: float = Field(ge=0, default=0.0)

class MealAttendanceCreate(MealAttendanceBase):
    pass

class BulkMealEntry(BaseModel):
    record_date: date
    entries: List[MealAttendanceBase]

class MealAttendanceOut(MealAttendanceBase):
    id: str
    group_id: str
    total_units: float
    created_at: datetime
    user: UserOut

    class Config:
        from_attributes = True

class DailyMealSummary(BaseModel):
    record_date: date
    total_breakfast: float
    total_lunch: float
    total_dinner: float
    total_units: float
    member_meals: List[MealAttendanceOut]
