from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group
from app.services.meal_engine import calculate_mess_balances
from app.services.split_engine import simplify_debts
from app.services.pdf_service import generate_mess_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{group_id}/pdf")
def download_group_pdf_report(
    group_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    balance_data = calculate_mess_balances(db, group, start_date=start_date, end_date=end_date)
    simplified = simplify_debts(balance_data["member_balances"], currency=group.currency)

    pdf_bytes = generate_mess_pdf_report(balance_data, simplified)

    filename = f"{group.name.replace(' ', '_')}_Statement_{date.today()}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
