from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.schemas.user import UserOut

class MealAttendanceBase(BaseModel):
    member_id: Optional[str] = None
    user_id: Optional[str] = None
    record_date: date
    breakfast_count: float = Field(ge=0, default=0.0)
    lunch_count: float = Field(ge=0, default=0.0)
    dinner_count: float = Field(ge=0, default=0.0)
    guest_veg_count: float = Field(ge=0, default=0.0)
    guest_fish_count: float = Field(ge=0, default=0.0)
    guest_meat_count: float = Field(ge=0, default=0.0)
    guest_egg_count: float = Field(ge=0, default=0.0)
    guest_charge: float = Field(ge=0, default=0.0)

class MealAttendanceCreate(MealAttendanceBase):
    pass

class BulkMealEntry(BaseModel):
    record_date: date
    entries: List[MealAttendanceBase]

class MealAttendanceOut(MealAttendanceBase):
    id: str
    group_id: str
    total_units: float
    member_name: Optional[str] = None
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True

class DailyMealSummary(BaseModel):
    record_date: date
    total_breakfast: float
    total_lunch: float
    total_dinner: float
    total_guest_meals: float = 0.0
    total_guest_charge: float = 0.0
    total_units: float
    member_meals: List[MealAttendanceOut]
