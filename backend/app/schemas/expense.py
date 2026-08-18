from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.schemas.user import UserOut

class ExpenseSplitCreate(BaseModel):
    user_id: str
    share_amount: Optional[float] = 0.0
    percentage: Optional[float] = 0.0

class ExpenseSplitOut(BaseModel):
    id: str
    user_id: str
    share_amount: float
    percentage: Optional[float] = 0.0
    user: UserOut

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    title: str
    amount: float = Field(gt=0, description="Amount must be positive")
    category: str = "GROCERY"  # GROCERY, RENT, GAS, ELECTRICITY, MAID, OUTING, SNACKS, OTHER
    split_type: str = "MEAL_BASED"  # EQUAL, EXACT, PERCENTAGE, MEAL_BASED
    is_fixed_cost: bool = False
    receipt_url: Optional[str] = None
    expense_date: Optional[date] = None

class ExpenseCreate(ExpenseBase):
    splits: Optional[List[ExpenseSplitCreate]] = []

class ExpenseOut(ExpenseBase):
    id: str
    group_id: str
    paid_by: str
    created_at: datetime
    payer: UserOut
    splits: List[ExpenseSplitOut] = []

    class Config:
        from_attributes = True
