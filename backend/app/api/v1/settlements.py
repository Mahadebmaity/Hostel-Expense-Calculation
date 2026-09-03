from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.settlement import Settlement
from app.schemas.settlement import SettlementCreate, SettlementOut
from app.services.upi_service import get_upi_payment_payload
from pydantic import BaseModel

class UPIRequest(BaseModel):
    upi_id: str
    payee_name: Optional[str] = "Payee"
    amount: float
    note: Optional[str] = "Expense Settlement"

router = APIRouter(prefix="/settlements", tags=["Settlements"])

@router.post("/generate-upi")
def generate_custom_upi(
    payload: UPIRequest,
    current_user: User = Depends(get_current_user)
):
    """Generates dynamic UPI URI and QR code base64 on-demand for any given UPI ID and amount."""
    clean_upi = payload.upi_id.strip()
    if not clean_upi:
        raise HTTPException(status_code=400, detail="UPI ID is required")
    data = get_upi_payment_payload(
        upi_id=clean_upi,
        payee_name=payload.payee_name or "Payee",
        amount=payload.amount,
        note=payload.note or "Expense Settlement"
    )
    return data


@router.post("/", response_model=SettlementOut, status_code=status.HTTP_201_CREATED)
def record_settlement(
    settle_in: SettlementCreate,
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_by_id = {m.id: m for m in members}
    member_by_uid = {m.user_id: m for m in members if m.user_id}

    # Resolve payer member
    payer_m = member_by_id.get(settle_in.payer_member_id) or member_by_uid.get(settle_in.payer_id) or member_by_id.get(settle_in.payer_id)
    # Resolve payee member
    payee_m = member_by_id.get(settle_in.payee_member_id) or member_by_uid.get(settle_in.payee_id) or member_by_id.get(settle_in.payee_id)

    new_settlement = Settlement(
        group_id=group_id,
        payer_id=payer_m.user_id if payer_m else settle_in.payer_id,
        payee_id=payee_m.user_id if payee_m else settle_in.payee_id,
        payer_member_id=payer_m.id if payer_m else settle_in.payer_member_id,
        payee_member_id=payee_m.id if payee_m else settle_in.payee_member_id,
        amount=settle_in.amount,
        payment_mode=settle_in.payment_mode,
        note=settle_in.note,
        settled_date=settle_in.settled_date or date.today(),
        status="COMPLETED"
    )
    db.add(new_settlement)
    db.commit()
    db.refresh(new_settlement)

    setattr(new_settlement, "payer_name", payer_m.member_name if payer_m else "Payer")
    setattr(new_settlement, "payee_name", payee_m.member_name if payee_m else "Payee")
    return new_settlement

@router.get("/{group_id}", response_model=List[SettlementOut])
def get_group_settlements(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settlements = db.query(Settlement).filter(
        Settlement.group_id == group_id
    ).order_by(Settlement.settled_date.desc(), Settlement.created_at.desc()).all()

    for st in settlements:
        p_name = st.payer_member.member_name if st.payer_member else (st.payer.name if st.payer else "Member")
        pe_name = st.payee_member.member_name if st.payee_member else (st.payee.name if st.payee else "Member")
        setattr(st, "payer_name", p_name)
        setattr(st, "payee_name", pe_name)

    return settlements
