from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.schemas.user import UserOut

class SettlementCreate(BaseModel):
    payer_id: Optional[str] = None
    payee_id: Optional[str] = None
    payer_member_id: Optional[str] = None
    payee_member_id: Optional[str] = None
    amount: float = Field(gt=0)
    payment_mode: str = "UPI"  # UPI, CASH, BANK_TRANSFER
    note: Optional[str] = None
    settled_date: Optional[date] = None

class SettlementOut(BaseModel):
    id: str
    group_id: str
    payer_id: Optional[str] = None
    payee_id: Optional[str] = None
    payer_member_id: Optional[str] = None
    payee_member_id: Optional[str] = None
    payer_name: Optional[str] = None
    payee_name: Optional[str] = None
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

class ScoreBoardCreate(BaseModel):
    title: str
    month_label: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    summary_data: Optional[dict] = None

class ScoreBoardOut(BaseModel):
    id: str
    group_id: str
    title: str
    month_label: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_establishment: float
    establishment_per_head: float
    total_meal_expenses: float
    guest_deduction_total: float
    net_meal_pool: float
    total_meals: float
    meal_rate: float
    total_deposit_collected: float
    total_due: float
    total_refund: float
    member_records: List[dict] = []
    breakdown: Optional[dict] = {}
    created_at: datetime

    class Config:
        from_attributes = True

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
