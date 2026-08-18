from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense
from app.models.meal import MealAttendance

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/stats")
def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Returns platform-wide administrative statistics"""
    total_users = db.query(User).count()
    total_groups = db.query(Group).count()
    
    total_expenses_sum = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).scalar()
    total_expenses_count = db.query(Expense).count()
    
    total_meals_units = db.query(func.coalesce(func.sum(MealAttendance.total_units), 0.0)).scalar()
    total_meal_records = db.query(MealAttendance).count()

    return {
        "total_users": total_users,
        "total_groups": total_groups,
        "total_expenses_amount": round(float(total_expenses_sum), 2),
        "total_expenses_count": total_expenses_count,
        "total_meals_units": round(float(total_meals_units), 2),
        "total_meal_records": total_meal_records,
        "server_time": datetime.utcnow().isoformat()
    }

@router.get("/users")
def get_admin_users(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Returns comprehensive list of all registered users and their activity"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    user_list = []

    for u in users:
        # Fetch memberships
        memberships = db.query(GroupMember, Group).join(Group, GroupMember.group_id == Group.id).filter(GroupMember.user_id == u.id).all()
        groups_info = [
            {
                "group_id": gm.Group.id,
                "group_name": gm.Group.name,
                "group_type": gm.Group.group_type,
                "role": gm.GroupMember.role,
                "initial_deposit": gm.GroupMember.initial_deposit
            }
            for gm in memberships
        ]

        # Fetch total expenses paid
        total_paid = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(Expense.paid_by == u.id).scalar()
        
        # Fetch total meal units consumed
        total_meals = db.query(func.coalesce(func.sum(MealAttendance.total_units), 0.0)).filter(MealAttendance.user_id == u.id).scalar()

        user_list.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "upi_id": u.upi_id,
            "is_admin": bool(u.is_admin),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "groups": groups_info,
            "total_expenses_paid": round(float(total_paid), 2),
            "total_meals_consumed": round(float(total_meals), 2)
        })

    return user_list

@router.post("/users/{user_id}/toggle-admin")
def toggle_user_admin(
    user_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Allows an admin to promote or demote another user to/from admin"""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot toggle your own admin status")

    target.is_admin = not target.is_admin
    db.commit()
    db.refresh(target)
    return {"message": f"User {target.email} is_admin set to {target.is_admin}", "is_admin": target.is_admin}
