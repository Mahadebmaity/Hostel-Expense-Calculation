from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.scoreboard import MonthlyScoreBoard
from app.schemas.group import GroupCreate, GroupUpdate, GroupOut, GroupMemberAdd, GroupDepositUpdate
from app.schemas.settlement import ScoreBoardCreate, ScoreBoardOut
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
        name=current_user.name,
        email=current_user.email,
        phone=current_user.phone,
        upi_id=current_user.upi_id,
        is_virtual="false",
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
    if current_user.is_admin:
        return db.query(Group).all()

    # Groups where user is a member or created the group
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = set([m.group_id for m in memberships])
    created_groups = db.query(Group).filter(Group.created_by == current_user.id).all()
    for cg in created_groups:
        group_ids.add(cg.id)

    groups = db.query(Group).filter(Group.id.in_(list(group_ids))).all()
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
    
    if not current_user.is_admin and group.created_by != current_user.id:
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
    
    if not current_user.is_admin and group.created_by != current_user.id:
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
    if group_update.group_type is not None:
        group.group_type = group_update.group_type
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
    """
    Adds a member to the group. If the email corresponds to an existing registered user, links their account.
    If no registered user exists or only a name is provided, creates a seamless Virtual Member.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    target_user = None
    if member_in.email:
        target_user = db.query(User).filter(User.email == member_in.email.strip().lower()).first()

    # Check for duplicate member
    if target_user:
        existing = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == target_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="This user is already a member of this group")
        
        new_member = GroupMember(
            group_id=group_id,
            user_id=target_user.id,
            name=target_user.name,
            email=target_user.email,
            phone=target_user.phone or member_in.phone,
            upi_id=target_user.upi_id or member_in.upi_id,
            is_virtual="false",
            role=member_in.role,
            initial_deposit=member_in.initial_deposit
        )
    else:
        # Create Virtual Member (No forced registration!)
        member_name = (member_in.name or "").strip() or (member_in.email.split("@")[0] if member_in.email else "Member")
        new_member = GroupMember(
            group_id=group_id,
            user_id=None,
            name=member_name,
            email=member_in.email.strip().lower() if member_in.email else None,
            phone=member_in.phone.strip() if member_in.phone else None,
            upi_id=member_in.upi_id.strip() if member_in.upi_id else None,
            is_virtual="true",
            role=member_in.role,
            initial_deposit=member_in.initial_deposit
        )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return {
        "message": "Member added successfully",
        "member_id": new_member.id,
        "user_id": new_member.user_id,
        "name": new_member.member_name,
        "is_virtual": new_member.is_virtual == "true"
    }

@router.delete("/{group_id}/members/{identifier}")
def remove_group_member(
    group_id: str,
    identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Removes a member by member_id or user_id."""
    if not current_user.is_admin:
        auth_member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        ).first()
        group = db.query(Group).filter(Group.id == group_id).first()
        if (not auth_member or auth_member.role != "ADMIN") and (not group or group.created_by != current_user.id):
            raise HTTPException(status_code=403, detail="Only Admins can remove members")

    target_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        (GroupMember.id == identifier) | (GroupMember.user_id == identifier)
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
    if not current_user.is_admin:
        auth_member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        ).first()
        group = db.query(Group).filter(Group.id == group_id).first()
        if (not auth_member or auth_member.role not in ["ADMIN", "MANAGER"]) and (not group or group.created_by != current_user.id):
            raise HTTPException(status_code=403, detail="Only Admins or Managers can update deposits")

    target_member = None
    if deposit_in.member_id:
        target_member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.id == deposit_in.member_id
        ).first()
    elif deposit_in.user_id:
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
        "member_id": target_member.id,
        "name": target_member.member_name,
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

    # 1. Run Mess / Group Calculation Engine
    data = calculate_mess_balances(db, group, start_date=start_date, end_date=end_date)
    
    # 2. Run Debt Simplification Graph Engine
    simplified = simplify_debts(data["member_balances"], currency=group.currency)

    # 3. Attach dynamic UPI QR payload for each transaction
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

@router.post("/{group_id}/scoreboards", response_model=ScoreBoardOut)
def save_monthly_scoreboard(
    group_id: str,
    scoreboard_in: ScoreBoardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Saves and freezes the current calculation as a monthly Khatabook snapshot."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Run live calculation if summary data not provided
    data = scoreboard_in.summary_data or calculate_mess_balances(
        db, group, start_date=scoreboard_in.start_date, end_date=scoreboard_in.end_date
    )

    scoreboard = MonthlyScoreBoard(
        group_id=group_id,
        title=scoreboard_in.title,
        month_label=scoreboard_in.month_label or scoreboard_in.title,
        start_date=scoreboard_in.start_date,
        end_date=scoreboard_in.end_date,
        total_establishment=data.get("total_establishment", 0.0),
        establishment_per_head=data.get("establishment_per_head", 0.0),
        total_meal_expenses=data.get("total_meal_expenses", 0.0),
        guest_deduction_total=data.get("guest_deduction_total", 0.0),
        net_meal_pool=data.get("net_meal_pool", 0.0),
        total_meals=data.get("total_meals", 0.0),
        meal_rate=data.get("meal_rate", 0.0),
        total_deposit_collected=data.get("total_collected", 0.0),
        total_due=data.get("total_due", 0.0),
        total_refund=data.get("total_refund", 0.0),
        member_records=data.get("member_balances", []),
        breakdown={
            "establishment_breakdown": data.get("establishment_breakdown", []),
            "meal_pool_breakdown": data.get("meal_pool_breakdown", [])
        },
        created_by=current_user.id
    )
    db.add(scoreboard)
    db.commit()
    db.refresh(scoreboard)
    return scoreboard

@router.get("/{group_id}/scoreboards", response_model=List[ScoreBoardOut])
def get_group_scoreboards(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scoreboards = db.query(MonthlyScoreBoard).filter(
        MonthlyScoreBoard.group_id == group_id
    ).order_by(MonthlyScoreBoard.created_at.desc()).all()
    return scoreboards

@router.delete("/{group_id}/scoreboards/{scoreboard_id}")
def delete_scoreboard(
    group_id: str,
    scoreboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sb = db.query(MonthlyScoreBoard).filter(
        MonthlyScoreBoard.group_id == group_id,
        MonthlyScoreBoard.id == scoreboard_id
    ).first()
    if not sb:
        raise HTTPException(status_code=404, detail="Scoreboard snapshot not found")
    db.delete(sb)
    db.commit()
    return {"message": "Scoreboard record deleted successfully"}
