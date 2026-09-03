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
from app.services.pdf_service import generate_group_pdf_report, generate_demo_pdf, get_demo_bundle

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/demo/{demo_type}/pdf")
def download_demo_pdf_report(demo_type: str):
    """
    Generates and returns an instant sample PDF statement for any of the 4 group types:
    MESS, TRIP, FLATMATES, PERSONAL without requiring authentication.
    """
    try:
        dtype = demo_type.upper()
        pdf_bytes = generate_demo_pdf(dtype)
        filename = f"Demo_{dtype}_Calculation_Report.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate demo PDF: {str(e)}")

@router.get("/demo/{demo_type}/data")
def get_demo_calculation_data(demo_type: str):
    """Returns the structured JSON dataset for live frontend calculation simulation."""
    data, settlements = get_demo_bundle(demo_type)
    return {
        "status": "success",
        "demo_type": demo_type.upper(),
        "data": data,
        "settlements": settlements
    }

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

    pdf_bytes = generate_group_pdf_report(balance_data, simplified)

    filename = f"{group.name.replace(' ', '_')}_Statement_{date.today()}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

