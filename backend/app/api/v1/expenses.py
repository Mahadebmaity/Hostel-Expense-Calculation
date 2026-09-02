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
from app.services.split_engine import (
    distribute_pennies,
    distribute_percentage_pennies,
    distribute_shares_pennies,
    normalize_exact_splits
)

router = APIRouter(prefix="/expenses", tags=["Expenses"])

def resolve_payer(
    expense_in: ExpenseCreate,
    current_user: User,
    member_map: dict,
    user_to_member: dict
) -> tuple:
    paid_by_uid = current_user.id
    paid_by_mid = None

    if expense_in.paid_by_member_id:
        if expense_in.paid_by_member_id in member_map:
            paid_by_mid = expense_in.paid_by_member_id
            paid_by_uid = member_map[paid_by_mid].user_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected payer is not a valid member of this group."
            )
    elif expense_in.paid_by:
        if expense_in.paid_by in member_map:
            paid_by_mid = expense_in.paid_by
            paid_by_uid = member_map[paid_by_mid].user_id
        elif expense_in.paid_by in user_to_member:
            paid_by_mid = user_to_member[expense_in.paid_by].id
            paid_by_uid = expense_in.paid_by
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected payer is not a valid member of this group."
            )

    if not paid_by_mid:
        current_membership = user_to_member.get(current_user.id)
        if current_membership:
            paid_by_mid = current_membership.id
            paid_by_uid = current_membership.user_id

    return paid_by_uid, paid_by_mid

def validate_and_build_splits(
    expense_in: ExpenseCreate,
    group: Group,
    members: list
) -> list:
    if expense_in.amount is None or expense_in.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense amount must be greater than zero."
        )

    member_map = {m.id: m for m in members}
    user_to_member = {m.user_id: m for m in members if m.user_id}

    if expense_in.splits and len(expense_in.splits) > 0:
        seen_participants = set()
        for sp in expense_in.splits:
            target_mid = sp.member_id if sp.member_id in member_map else (user_to_member[sp.user_id].id if sp.user_id in user_to_member else None)
            if not target_mid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Participant {sp.member_id or sp.user_id} is not a member of this group."
                )
            if target_mid in seen_participants:
                p_name = member_map[target_mid].member_name if target_mid in member_map else "Unknown"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate participant '{p_name}' detected in split allocation."
                )
            seen_participants.add(target_mid)

        if expense_in.split_type == "EXACT":
            total_custom = round(sum(sp.share_amount or 0.0 for sp in expense_in.splits), 2)
            diff = round(expense_in.amount - total_custom, 2)
            if abs(diff) > 0.01:
                if diff > 0:
                    detail_msg = f"₹{diff:.2f} is still unallocated. Sum of custom splits must exactly match expense amount."
                else:
                    detail_msg = f"Allocated custom shares exceed expense amount by ₹{abs(diff):.2f}. Sum of custom splits must exactly match expense amount."
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=detail_msg
                )
            raw_amounts = [sp.share_amount or 0.0 for sp in expense_in.splits]
            normalized = normalize_exact_splits(expense_in.amount, raw_amounts)
            final_splits = []
            for idx, sp in enumerate(expense_in.splits):
                target_mid = sp.member_id if sp.member_id in member_map else user_to_member[sp.user_id].id
                final_splits.append({
                    "member_id": target_mid,
                    "user_id": member_map[target_mid].user_id,
                    "share_amount": normalized[idx],
                    "percentage": sp.percentage or 0.0
                })
            return final_splits

        elif expense_in.split_type == "PERCENTAGE":
            total_pct = round(sum(sp.percentage or 0.0 for sp in expense_in.splits), 2)
            if abs(total_pct - 100.0) > 0.05:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Percentages must total 100% (must equal 100%)."
                )
            pct_list = [sp.percentage or 0.0 for sp in expense_in.splits]
            shares = distribute_percentage_pennies(expense_in.amount, pct_list)
            final_splits = []
            for idx, sp in enumerate(expense_in.splits):
                target_mid = sp.member_id if sp.member_id in member_map else user_to_member[sp.user_id].id
                final_splits.append({
                    "member_id": target_mid,
                    "user_id": member_map[target_mid].user_id,
                    "share_amount": shares[idx],
                    "percentage": sp.percentage or 0.0
                })
            return final_splits

        elif expense_in.split_type in ["EQUAL", "EQUAL_CUSTOM"]:
            shares = distribute_pennies(expense_in.amount, len(expense_in.splits))
            final_splits = []
            for idx, sp in enumerate(expense_in.splits):
                target_mid = sp.member_id if sp.member_id in member_map else user_to_member[sp.user_id].id
                final_splits.append({
                    "member_id": target_mid,
                    "user_id": member_map[target_mid].user_id,
                    "share_amount": shares[idx],
                    "percentage": round(100.0 / len(expense_in.splits), 2)
                })
            return final_splits

        else:
            final_splits = []
            for sp in expense_in.splits:
                target_mid = sp.member_id if sp.member_id in member_map else user_to_member[sp.user_id].id
                final_splits.append({
                    "member_id": target_mid,
                    "user_id": member_map[target_mid].user_id,
                    "share_amount": round(sp.share_amount or 0.0, 2),
                    "percentage": sp.percentage or 0.0
                })
            return final_splits

    else:
        if expense_in.split_type in ["EQUAL_CUSTOM", "EXACT", "PERCENTAGE"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one participant must be selected for this expense."
            )

        if group.group_type != "MESS" or expense_in.is_fixed_cost or expense_in.split_type == "EQUAL":
            shares = distribute_pennies(expense_in.amount, len(members))
            final_splits = []
            for idx, m in enumerate(members):
                final_splits.append({
                    "member_id": m.id,
                    "user_id": m.user_id,
                    "share_amount": shares[idx],
                    "percentage": round(100.0 / len(members), 2)
                })
            return final_splits

        return []

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

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    if not members:
        raise HTTPException(status_code=400, detail="Cannot create expense in group with no members")
    member_map = {m.id: m for m in members}
    user_to_member = {m.user_id: m for m in members if m.user_id}

    # Resolve payer and validate splits
    paid_by_uid, paid_by_mid = resolve_payer(expense_in, current_user, member_map, user_to_member)
    final_splits = validate_and_build_splits(expense_in, group, members)

    new_expense = Expense(
        group_id=group_id,
        paid_by=paid_by_uid,
        paid_by_member_id=paid_by_mid,
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

    # Save finalized splits
    if final_splits:
        for sp in final_splits:
            split_obj = ExpenseSplit(
                expense_id=new_expense.id,
                user_id=sp["user_id"],
                member_id=sp["member_id"],
                share_amount=sp["share_amount"],
                percentage=sp["percentage"]
            )
            db.add(split_obj)
        db.commit()
        db.refresh(new_expense)

    # Attach payer display name
    payer_display = "Member"
    if new_expense.payer_member:
        payer_display = new_expense.payer_member.member_name
    elif new_expense.payer:
        payer_display = new_expense.payer.name

    setattr(new_expense, "payer_name", payer_display)
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
    
    expenses = query.order_by(Expense.expense_date.desc(), Expense.created_at.desc()).all()
    for exp in expenses:
        p_name = "Member"
        if exp.payer_member:
            p_name = exp.payer_member.member_name
        elif exp.payer:
            p_name = exp.payer.name
        setattr(exp, "payer_name", p_name)

        if exp.splits:
            for sp in exp.splits:
                m_name = "Member"
                if sp.member:
                    m_name = sp.member.member_name
                elif sp.user:
                    m_name = sp.user.name
                setattr(sp, "member_name", m_name)

    return expenses

@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: str,
    expense_in: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    group = db.query(Group).filter(Group.id == expense.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    member_map = {m.id: m for m in members}
    user_to_member = {m.user_id: m for m in members if m.user_id}

    if not current_user.is_admin:
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == expense.group_id,
            GroupMember.user_id == current_user.id
        ).first()

        if expense.paid_by != current_user.id and (not membership or membership.role not in ["ADMIN", "MANAGER"]):
            raise HTTPException(status_code=403, detail="Not authorized to edit this expense")

    # Update core attributes
    expense.title = expense_in.title
    expense.amount = expense_in.amount
    expense.category = expense_in.category
    expense.split_type = expense_in.split_type
    expense.is_fixed_cost = expense_in.is_fixed_cost
    if expense_in.expense_date:
        expense.expense_date = expense_in.expense_date

    # Resolve payer and validate splits
    paid_by_uid, paid_by_mid = resolve_payer(expense_in, current_user, member_map, user_to_member)
    expense.paid_by = paid_by_uid
    expense.paid_by_member_id = paid_by_mid

    final_splits = validate_and_build_splits(expense_in, group, members)

    # Remove old splits
    db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).delete()

    for sp in final_splits:
        split_obj = ExpenseSplit(
            expense_id=expense.id,
            user_id=sp["user_id"],
            member_id=sp["member_id"],
            share_amount=sp["share_amount"],
            percentage=sp["percentage"]
        )
        db.add(split_obj)

    db.commit()
    db.refresh(expense)

    payer_display = "Member"
    if expense.payer_member:
        payer_display = expense.payer_member.member_name
    elif expense.payer:
        payer_display = expense.payer.name

    setattr(expense, "payer_name", payer_display)
    return expense

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if not current_user.is_admin:
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
