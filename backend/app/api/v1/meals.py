from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.meal import MealAttendance
from app.schemas.meal import MealAttendanceCreate, BulkMealEntry, MealAttendanceOut, DailyMealSummary
from app.services.meal_engine import compute_meal_units

router = APIRouter(prefix="/meals", tags=["Meals"])

@router.post("/{group_id}/single", response_model=MealAttendanceOut)
def record_single_meal(
    group_id: str,
    meal_in: MealAttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Compute units
    total_units = compute_meal_units(
        breakfast=meal_in.breakfast_count,
        lunch=meal_in.lunch_count,
        dinner=meal_in.dinner_count,
        settings=group.settings
    )

    # Check if record already exists for this day and user
    record = db.query(MealAttendance).filter(
        MealAttendance.group_id == group_id,
        MealAttendance.user_id == meal_in.user_id,
        MealAttendance.record_date == meal_in.record_date
    ).first()

    if record:
        record.breakfast_count = meal_in.breakfast_count
        record.lunch_count = meal_in.lunch_count
        record.dinner_count = meal_in.dinner_count
        record.total_units = total_units
    else:
        record = MealAttendance(
            group_id=group_id,
            user_id=meal_in.user_id,
            record_date=meal_in.record_date,
            breakfast_count=meal_in.breakfast_count,
            lunch_count=meal_in.lunch_count,
            dinner_count=meal_in.dinner_count,
            total_units=total_units
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record

@router.post("/{group_id}/bulk")
def record_bulk_meals(
    group_id: str,
    bulk_in: BulkMealEntry,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    saved_records = []
    for entry in bulk_in.entries:
        total_units = compute_meal_units(
            breakfast=entry.breakfast_count,
            lunch=entry.lunch_count,
            dinner=entry.dinner_count,
            settings=group.settings
        )

        record = db.query(MealAttendance).filter(
            MealAttendance.group_id == group_id,
            MealAttendance.user_id == entry.user_id,
            MealAttendance.record_date == bulk_in.record_date
        ).first()

        if record:
            record.breakfast_count = entry.breakfast_count
            record.lunch_count = entry.lunch_count
            record.dinner_count = entry.dinner_count
            record.total_units = total_units
        else:
            record = MealAttendance(
                group_id=group_id,
                user_id=entry.user_id,
                record_date=bulk_in.record_date,
                breakfast_count=entry.breakfast_count,
                lunch_count=entry.lunch_count,
                dinner_count=entry.dinner_count,
                total_units=total_units
            )
            db.add(record)
        saved_records.append(record)

    db.commit()
    return {"message": f"Successfully updated {len(saved_records)} member meals for {bulk_in.record_date}"}

@router.get("/{group_id}/matrix")
def get_meal_matrix(
    group_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns date-wise breakdown of meal attendance for all group members.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_list = [{"user_id": m.user_id, "name": m.user.name, "role": m.role} for m in members]

    records = db.query(MealAttendance).filter(MealAttendance.group_id == group_id).all()

    # Group by date
    date_map = {}
    for r in records:
        d_str = str(r.record_date)
        if d_str not in date_map:
            date_map[d_str] = {}
        date_map[d_str][r.user_id] = {
            "breakfast": r.breakfast_count,
            "lunch": r.lunch_count,
            "dinner": r.dinner_count,
            "total_units": r.total_units
        }

    return {
        "group_id": group_id,
        "members": member_list,
        "date_matrix": date_map
    }
