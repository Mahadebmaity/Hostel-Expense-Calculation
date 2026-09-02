from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.user import UserOut

class GroupMemberOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    is_virtual: Optional[str] = "true"
    role: str
    initial_deposit: float = 0.0
    marketing_amount: float = 0.0
    marketing_days: float = 0.0
    previous_balance: float = 0.0
    joined_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True

class GroupMemberAdd(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    role: str = "MEMBER"  # ADMIN, MANAGER, MEMBER
    initial_deposit: float = 0.0
    marketing_amount: float = 0.0
    marketing_days: float = 0.0
    previous_balance: float = 0.0

class GroupDepositUpdate(BaseModel):
    member_id: Optional[str] = None
    user_id: Optional[str] = None
    amount: float = 0.0  # Amount to add or set
    marketing_amount: Optional[float] = None
    marketing_days: Optional[float] = None
    previous_balance: Optional[float] = None
    operation: str = "ADD"  # ADD or SET

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    group_type: str = "MESS"  # MESS, TRIP, FLATMATES, PERSONAL
    currency: str = "INR"
    settings: Dict[str, Any] = Field(default_factory=lambda: {
        "breakfast_weight": 0.5,
        "lunch_weight": 1.0,
        "dinner_weight": 1.0,
        "guest_rates": {"veg": 40.0, "fish": 50.0, "meat": 75.0}
    })

class GroupCreate(GroupBase):
    initial_deposit: float = 0.0

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    group_type: Optional[str] = None
    currency: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class GroupOut(GroupBase):
    id: str
    created_by: str
    created_at: datetime
    members: List[GroupMemberOut] = []

    class Config:
        from_attributes = True
