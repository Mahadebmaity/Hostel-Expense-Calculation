from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.schemas.user import UserOut

class ExpenseSplitCreate(BaseModel):
    user_id: Optional[str] = None
    member_id: Optional[str] = None
    share_amount: Optional[float] = 0.0
    percentage: Optional[float] = 0.0

class ExpenseSplitOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    member_id: Optional[str] = None
    share_amount: float
    percentage: Optional[float] = 0.0
    member_name: Optional[str] = None
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    title: str
    amount: float = Field(gt=0, description="Amount must be positive")
    category: str = "GROCERY"  
    # ESTABLISHMENT: MASI, GAS, EGG, MEAT, PAPER, ELECTRICITY, RENT, ESTABLISHMENT_OTHER
    # MARKETING_MEAL: BAZAR, POTATO, RICE, GROCERY, OIL_SPICES, MARKETING_OTHER
    # FLAT/TRIP: GROCERY, GAS, WATER, WIFI, RENT, CAB_TRANSPORT, HOTEL_STAY, TICKETS, OUTING, SNACKS, OTHER
    split_type: str = "MEAL_BASED"  # MEAL_BASED, EQUAL, EXACT, PERCENTAGE
    is_fixed_cost: bool = False
    receipt_url: Optional[str] = None
    expense_date: Optional[date] = None
    paid_by: Optional[str] = None
    paid_by_member_id: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    splits: Optional[List[ExpenseSplitCreate]] = []

class ExpenseOut(ExpenseBase):
    id: str
    group_id: str
    paid_by: Optional[str] = None
    paid_by_member_id: Optional[str] = None
    payer_name: Optional[str] = None
    created_at: datetime
    payer: Optional[UserOut] = None
    splits: List[ExpenseSplitOut] = []

    class Config:
        from_attributes = True
