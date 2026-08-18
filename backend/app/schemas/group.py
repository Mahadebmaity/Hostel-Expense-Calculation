from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.user import UserOut

class GroupMemberOut(BaseModel):
    id: str
    user_id: str
    role: str
    initial_deposit: float
    joined_at: datetime
    user: UserOut

    class Config:
        from_attributes = True

class GroupMemberAdd(BaseModel):
    email: str
    role: str = "MEMBER"  # ADMIN, MANAGER, MEMBER
    initial_deposit: float = 0.0

class GroupDepositUpdate(BaseModel):
    user_id: str
    amount: float  # Amount to add or set
    operation: str = "ADD"  # ADD or SET

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    group_type: str = "MESS"  # MESS, TRIP, FLATMATES, PERSONAL
    currency: str = "INR"
    settings: Dict[str, Any] = Field(default_factory=lambda: {
        "breakfast_weight": 0.5,
        "lunch_weight": 1.0,
        "dinner_weight": 1.0
    })

class GroupCreate(GroupBase):
    initial_deposit: float = 0.0

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class GroupOut(GroupBase):
    id: str
    created_by: str
    created_at: datetime
    members: List[GroupMemberOut] = []

    class Config:
        from_attributes = True
