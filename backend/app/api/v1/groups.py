from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.schemas.group import GroupCreate, GroupUpdate, GroupOut, GroupMemberAdd, GroupDepositUpdate
from app.services.meal_engine import calculate_mess_balances
from app.services.split_engine import simplify_debts
from app.services.upi_service import get_upi_payment_payload

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.post("/", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_group = Group(
        name=group_in.name,
        description=group_in.description,
        group_type=group_in.group_type,
        currency=group_in.currency,
        settings=group_in.settings,
        created_by=current_user.id
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    # Add creator as ADMIN member
    creator_member = GroupMember(
        group_id=new_group.id,
        user_id=current_user.id,
        role="ADMIN",
        initial_deposit=group_in.initial_deposit
    )
    db.add(creator_member)
    db.commit()
    db.refresh(new_group)

    return new_group

@router.get("/", response_model=List[GroupOut])
def get_user_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Groups where user is a member
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    return groups

@router.get("/{group_id}", response_model=GroupOut)
def get_group_details(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if member
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    return group

@router.put("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: str,
    group_update: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership or membership.role not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Only Admins or Managers can update group settings")

    if group_update.name is not None:
        group.name = group_update.name
    if group_update.description is not None:
        group.description = group_update.description
    if group_update.currency is not None:
        group.currency = group_update.currency
    if group_update.settings is not None:
        group.settings = group_update.settings

    db.commit()
    db.refresh(group)
    return group

@router.post("/{group_id}/members", status_code=status.HTTP_201_CREATED)
def add_group_member(
    group_id: str,
    member_in: GroupMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    target_user = db.query(User).filter(User.email == member_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not registered yet")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == target_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this group")

    new_member = GroupMember(
        group_id=group_id,
        user_id=target_user.id,
        role=member_in.role,
        initial_deposit=member_in.initial_deposit
    )
    db.add(new_member)
    db.commit()
    return {"message": "Member added successfully", "user_id": target_user.id, "name": target_user.name}

@router.delete("/{group_id}/members/{user_id}")
def remove_group_member(
    group_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check permissions
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership or membership.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can remove members")

    target_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Member not found in group")

    db.delete(target_membership)
    db.commit()
    return {"message": "Member removed successfully"}

@router.post("/{group_id}/deposit")
def update_member_deposit(
    group_id: str,
    deposit_in: GroupDepositUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Admin or Manager can manage deposits
    auth_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not auth_member or auth_member.role not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Only Admins or Managers can update deposits")

    target_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == deposit_in.user_id
    ).first()
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    if deposit_in.operation == "ADD":
        target_member.initial_deposit += deposit_in.amount
    else:
        target_member.initial_deposit = deposit_in.amount

    db.commit()
    return {
        "message": "Deposit updated",
        "user_id": target_member.user_id,
        "new_deposit": target_member.initial_deposit
    }

@router.get("/{group_id}/balances")
def get_group_balances(
    group_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # 1. Run Mess Calculation Engine
    data = calculate_mess_balances(db, group, start_date=start_date, end_date=end_date)
    
    # 2. Run Debt Simplification Graph Engine
    simplified = simplify_debts(data["member_balances"], currency=group.currency)

    # 3. Attach dynamic UPI payload for each transaction
    for tx in simplified:
        upi_data = get_upi_payment_payload(
            upi_id=tx.get("payee_upi_id"),
            payee_name=tx.get("payee_name", "Mess Payee"),
            amount=tx.get("amount", 0.0),
            note=f"{group.name} Settlement"
        )
        tx["upi_uri"] = upi_data["upi_uri"]
        tx["upi_qr_base64"] = upi_data["upi_qr_base64"]

    data["simplified_settlements"] = simplified
    return data
