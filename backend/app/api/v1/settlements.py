from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.settlement import Settlement
from app.schemas.settlement import SettlementCreate, SettlementOut

router = APIRouter(prefix="/settlements", tags=["Settlements"])

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

    new_settlement = Settlement(
        group_id=group_id,
        payer_id=settle_in.payer_id,
        payee_id=settle_in.payee_id,
        amount=settle_in.amount,
        payment_mode=settle_in.payment_mode,
        note=settle_in.note,
        settled_date=settle_in.settled_date or date.today(),
        status="COMPLETED"
    )
    db.add(new_settlement)
    db.commit()
    db.refresh(new_settlement)
    return new_settlement

@router.get("/{group_id}", response_model=List[SettlementOut])
def get_group_settlements(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Settlement).filter(
        Settlement.group_id == group_id
    ).order_by(Settlement.settled_date.desc(), Settlement.created_at.desc()).all()
