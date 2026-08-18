from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.schemas.user import UserOut

class SettlementCreate(BaseModel):
    payer_id: str
    payee_id: str
    amount: float = Field(gt=0)
    payment_mode: str = "UPI"  # UPI, CASH, BANK_TRANSFER
    note: Optional[str] = None
    settled_date: Optional[date] = None

class SettlementOut(BaseModel):
    id: str
    group_id: str
    payer_id: str
    payee_id: str
    amount: float
    status: str
    payment_mode: str
    note: Optional[str] = None
    settled_date: date
    created_at: datetime
    payer: Optional[UserOut] = None
    payee: Optional[UserOut] = None

    class Config:
        from_attributes = True

class SimplifiedTransaction(BaseModel):
    payer_id: str
    payer_name: str
    payee_id: str
    payee_name: str
    payee_upi_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    upi_uri: Optional[str] = None
    upi_qr_base64: Optional[str] = None

class GroupBalanceSummary(BaseModel):
    group_id: str
    group_name: str
    group_type: str
    currency: str
    total_expenses: float
    total_variable_grocery: float
    total_fixed_costs: float
    total_meals: float
    meal_rate: float
    member_balances: List[dict]
    simplified_settlements: List[SimplifiedTransaction]
