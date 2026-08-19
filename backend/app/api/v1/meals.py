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
from pydantic import BaseModel

class MonthlyMealEntry(BaseModel):
    member_id: Optional[str] = None
    user_id: Optional[str] = None
    total_meals: float
    guest_veg: Optional[float] = 0.0
    guest_fish: Optional[float] = 0.0
    guest_meat: Optional[float] = 0.0
    guest_charge: Optional[float] = 0.0
    month_date: Optional[date] = None

class BulkMonthlyMealInput(BaseModel):
    month_date: date
    entries: List[MonthlyMealEntry]

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

    # Resolve member
    target_member = None
    if meal_in.member_id:
        target_member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.id == meal_in.member_id
        ).first()
    elif meal_in.user_id:
        target_member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            (GroupMember.user_id == meal_in.user_id) | (GroupMember.id == meal_in.user_id)
        ).first()

    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found in group")

    # Compute regular meal units
    total_units = compute_meal_units(
        breakfast=meal_in.breakfast_count,
        lunch=meal_in.lunch_count,
        dinner=meal_in.dinner_count,
        settings=group.settings
    )

    # Compute guest charge if not explicitly set
    guest_rates = group.settings.get("guest_rates", {"veg": 40.0, "fish": 50.0, "meat": 75.0}) if group.settings else {"veg": 40.0, "fish": 50.0, "meat": 75.0}
    g_charge = meal_in.guest_charge
    if g_charge == 0.0 and (meal_in.guest_veg_count > 0 or meal_in.guest_fish_count > 0 or meal_in.guest_meat_count > 0):
        g_charge = (meal_in.guest_veg_count * float(guest_rates.get("veg", 40.0))) + \
                   (meal_in.guest_fish_count * float(guest_rates.get("fish", 50.0))) + \
                   (meal_in.guest_meat_count * float(guest_rates.get("meat", 75.0)))

    # Find or create record for this date and member
    record = db.query(MealAttendance).filter(
        MealAttendance.group_id == group_id,
        MealAttendance.record_date == meal_in.record_date,
        (MealAttendance.member_id == target_member.id) | (MealAttendance.user_id == target_member.user_id)
    ).first()

    if record:
        record.member_id = target_member.id
        record.user_id = target_member.user_id
        record.breakfast_count = meal_in.breakfast_count
        record.lunch_count = meal_in.lunch_count
        record.dinner_count = meal_in.dinner_count
        record.guest_veg_count = meal_in.guest_veg_count
        record.guest_fish_count = meal_in.guest_fish_count
        record.guest_meat_count = meal_in.guest_meat_count
        record.guest_charge = g_charge
        record.total_units = total_units
    else:
        record = MealAttendance(
            group_id=group_id,
            member_id=target_member.id,
            user_id=target_member.user_id,
            record_date=meal_in.record_date,
            breakfast_count=meal_in.breakfast_count,
            lunch_count=meal_in.lunch_count,
            dinner_count=meal_in.dinner_count,
            guest_veg_count=meal_in.guest_veg_count,
            guest_fish_count=meal_in.guest_fish_count,
            guest_meat_count=meal_in.guest_meat_count,
            guest_charge=g_charge,
            total_units=total_units
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    setattr(record, "member_name", target_member.member_name)
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

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_by_id = {m.id: m for m in members}
    member_by_uid = {m.user_id: m for m in members if m.user_id}

    guest_rates = group.settings.get("guest_rates", {"veg": 40.0, "fish": 50.0, "meat": 75.0}) if group.settings else {"veg": 40.0, "fish": 50.0, "meat": 75.0}

    saved_count = 0
    for entry in bulk_in.entries:
        target_m = member_by_id.get(entry.member_id) or member_by_uid.get(entry.user_id) or member_by_id.get(entry.user_id)
        if not target_m:
            continue

        total_units = compute_meal_units(
            breakfast=entry.breakfast_count,
            lunch=entry.lunch_count,
            dinner=entry.dinner_count,
            settings=group.settings
        )

        g_charge = entry.guest_charge
        if g_charge == 0.0 and (entry.guest_veg_count > 0 or entry.guest_fish_count > 0 or entry.guest_meat_count > 0):
            g_charge = (entry.guest_veg_count * float(guest_rates.get("veg", 40.0))) + \
                       (entry.guest_fish_count * float(guest_rates.get("fish", 50.0))) + \
                       (entry.guest_meat_count * float(guest_rates.get("meat", 75.0)))

        record = db.query(MealAttendance).filter(
            MealAttendance.group_id == group_id,
            MealAttendance.record_date == bulk_in.record_date,
            (MealAttendance.member_id == target_m.id) | (MealAttendance.user_id == target_m.user_id)
        ).first()

        if record:
            record.member_id = target_m.id
            record.user_id = target_m.user_id
            record.breakfast_count = entry.breakfast_count
            record.lunch_count = entry.lunch_count
            record.dinner_count = entry.dinner_count
            record.guest_veg_count = entry.guest_veg_count
            record.guest_fish_count = entry.guest_fish_count
            record.guest_meat_count = entry.guest_meat_count
            record.guest_charge = g_charge
            record.total_units = total_units
        else:
            record = MealAttendance(
                group_id=group_id,
                member_id=target_m.id,
                user_id=target_m.user_id,
                record_date=bulk_in.record_date,
                breakfast_count=entry.breakfast_count,
                lunch_count=entry.lunch_count,
                dinner_count=entry.dinner_count,
                guest_veg_count=entry.guest_veg_count,
                guest_fish_count=entry.guest_fish_count,
                guest_meat_count=entry.guest_meat_count,
                guest_charge=g_charge,
                total_units=total_units
            )
            db.add(record)
        saved_count += 1

    db.commit()
    return {"message": f"Successfully updated {saved_count} member meals for {bulk_in.record_date}"}

@router.post("/{group_id}/monthly-summary")
def record_monthly_summary_meals(
    group_id: str,
    bulk_in: BulkMonthlyMealInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows manager to quickly set monthly total meal counts and guest meal charges for all candidates."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_by_id = {m.id: m for m in members}
    member_by_uid = {m.user_id: m for m in members if m.user_id}

    guest_rates = group.settings.get("guest_rates", {"veg": 40.0, "fish": 50.0, "meat": 75.0}) if group.settings else {"veg": 40.0, "fish": 50.0, "meat": 75.0}

    saved_count = 0
    for entry in bulk_in.entries:
        target_m = member_by_id.get(entry.member_id) or member_by_uid.get(entry.user_id) or member_by_id.get(entry.user_id)
        if not target_m:
            continue

        g_charge = entry.guest_charge or 0.0
        if g_charge == 0.0 and ((entry.guest_veg or 0) > 0 or (entry.guest_fish or 0) > 0 or (entry.guest_meat or 0) > 0):
            g_charge = ((entry.guest_veg or 0) * float(guest_rates.get("veg", 40.0))) + \
                       ((entry.guest_fish or 0) * float(guest_rates.get("fish", 50.0))) + \
                       ((entry.guest_meat or 0) * float(guest_rates.get("meat", 75.0)))

        record = db.query(MealAttendance).filter(
            MealAttendance.group_id == group_id,
            MealAttendance.record_date == bulk_in.month_date,
            (MealAttendance.member_id == target_m.id) | (MealAttendance.user_id == target_m.user_id)
        ).first()

        if record:
            record.member_id = target_m.id
            record.user_id = target_m.user_id
            record.lunch_count = entry.total_meals
            record.breakfast_count = 0.0
            record.dinner_count = 0.0
            record.guest_veg_count = entry.guest_veg or 0.0
            record.guest_fish_count = entry.guest_fish or 0.0
            record.guest_meat_count = entry.guest_meat or 0.0
            record.guest_charge = g_charge
            record.total_units = entry.total_meals
        else:
            record = MealAttendance(
                group_id=group_id,
                member_id=target_m.id,
                user_id=target_m.user_id,
                record_date=bulk_in.month_date,
                breakfast_count=0.0,
                lunch_count=entry.total_meals,
                dinner_count=0.0,
                guest_veg_count=entry.guest_veg or 0.0,
                guest_fish_count=entry.guest_fish or 0.0,
                guest_meat_count=entry.guest_meat or 0.0,
                guest_charge=g_charge,
                total_units=entry.total_meals
            )
            db.add(record)
        saved_count += 1

    db.commit()
    return {"message": f"Successfully updated monthly meal counts for {saved_count} candidates"}

@router.get("/{group_id}/matrix")
def get_meal_matrix(
    group_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_list = [
        {
            "member_id": m.id,
            "user_id": m.user_id,
            "name": m.member_name,
            "is_virtual": m.is_virtual == "true" or m.user_id is None,
            "role": m.role
        }
        for m in members
    ]

    records = db.query(MealAttendance).filter(MealAttendance.group_id == group_id).all()

    # Group by date
    date_map = {}
    for r in records:
        d_str = str(r.record_date)
        if d_str not in date_map:
            date_map[d_str] = {}
        
        m_key = r.member_id or r.user_id
        if m_key:
            date_map[d_str][m_key] = {
                "breakfast": r.breakfast_count,
                "lunch": r.lunch_count,
                "dinner": r.dinner_count,
                "guest_veg": r.guest_veg_count,
                "guest_fish": r.guest_fish_count,
                "guest_meat": r.guest_meat_count,
                "guest_charge": r.guest_charge,
                "total_units": r.total_units
            }

    return {
        "group_id": group_id,
        "members": member_list,
        "date_matrix": date_map
    }
