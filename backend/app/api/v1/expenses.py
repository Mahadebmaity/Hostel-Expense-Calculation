from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.schemas.expense import ExpenseCreate, ExpenseOut

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate,
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    new_expense = Expense(
        group_id=group_id,
        paid_by=current_user.id,
        title=expense_in.title,
        amount=expense_in.amount,
        category=expense_in.category,
        split_type=expense_in.split_type,
        is_fixed_cost=expense_in.is_fixed_cost,
        receipt_url=expense_in.receipt_url,
        expense_date=expense_in.expense_date or date.today()
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    # If explicit splits are provided (e.g. for tour/trip mode or custom split)
    if expense_in.splits:
        for sp in expense_in.splits:
            split_obj = ExpenseSplit(
                expense_id=new_expense.id,
                user_id=sp.user_id,
                share_amount=sp.share_amount or 0.0,
                percentage=sp.percentage or 0.0
            )
            db.add(split_obj)
        db.commit()
        db.refresh(new_expense)

    return new_expense

@router.get("/{group_id}", response_model=List[ExpenseOut])
def list_group_expenses(
    group_id: str,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Expense).filter(Expense.group_id == group_id)
    if category:
        query = query.filter(Expense.category == category)
    return query.order_by(Expense.expense_date.desc(), Expense.created_at.desc()).all()

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check if user is payer or group admin
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == expense.group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if expense.paid_by != current_user.id and (not membership or membership.role not in ["ADMIN", "MANAGER"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this expense")

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully"}

@router.get("/{group_id}/analytics")
def get_expense_analytics(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expenses = db.query(Expense).filter(Expense.group_id == group_id).all()
    
    category_totals = {}
    total_spent = 0.0
    for exp in expenses:
        total_spent += exp.amount
        cat = exp.category
        category_totals[cat] = round(category_totals.get(cat, 0.0) + exp.amount, 2)

    return {
        "total_spent": round(total_spent, 2),
        "expense_count": len(expenses),
        "category_breakdown": category_totals
    }
