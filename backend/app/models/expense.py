import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    paid_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    paid_by_member_id = Column(String(36), ForeignKey("group_members.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    
    # Category: 
    # Mess Establishment: MASI, GAS, EGG, MEAT, PAPER, ELECTRICITY, RENT, ESTABLISHMENT_OTHER
    # Mess Meal Marketing: BAZAR, POTATO, RICE, GROCERY, OIL_SPICES, MARKETING_OTHER
    # Flat / Tour: GROCERY, GAS, WATER, WIFI, RENT, CAB_TRANSPORT, HOTEL_STAY, TICKETS, OUTING, SNACKS, OTHER
    category = Column(String(50), default="GROCERY", nullable=False)
    
    # Split Type: MEAL_BASED, EQUAL, EXACT, PERCENTAGE
    split_type = Column(String(30), default="MEAL_BASED", nullable=False)
    
    # If is_fixed_cost is True (e.g. Establishment / Fixed share), divided equally among all members
    is_fixed_cost = Column(Boolean, default=False, nullable=False)
    
    receipt_url = Column(String(255), nullable=True)
    expense_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", back_populates="expenses_paid", foreign_keys=[paid_by])
    payer_member = relationship("GroupMember", foreign_keys=[paid_by_member_id])
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

    @property
    def payer_name(self) -> str:
        if getattr(self, '_payer_name', None):
            return self._payer_name
        if self.payer_member and self.payer_member.member_name:
            return self.payer_member.member_name
        if self.payer and self.payer.name:
            return self.payer.name
        return "Member"

    @payer_name.setter
    def payer_name(self, val: str):
        self._payer_name = val

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = Column(String(36), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    member_id = Column(String(36), ForeignKey("group_members.id", ondelete="CASCADE"), nullable=True)
    
    # Exact amount or portion of debt this member owes
    share_amount = Column(Float, default=0.0, nullable=False)
    percentage = Column(Float, default=0.0, nullable=True)

    # Relationships
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="expense_splits", foreign_keys=[user_id])
    member = relationship("GroupMember", foreign_keys=[member_id])

    @property
    def member_name(self) -> str:
        if getattr(self, '_member_name', None):
            return self._member_name
        if self.member and self.member.member_name:
            return self.member.member_name
        if self.user and self.user.name:
            return self.user.name
        return "Member"

    @member_name.setter
    def member_name(self, val: str):
        self._member_name = val

