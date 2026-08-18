import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    paid_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    
    # Category: GROCERY, RENT, GAS, ELECTRICITY, MAID, OUTING, SNACKS, OTHER
    category = Column(String(50), default="GROCERY", nullable=False)
    
    # Split Type: EQUAL, EXACT, PERCENTAGE, MEAL_BASED
    split_type = Column(String(30), default="MEAL_BASED", nullable=False)
    
    # If is_fixed_cost is True, it is divided equally among members instead of variable meal count
    is_fixed_cost = Column(Boolean, default=False, nullable=False)
    
    receipt_url = Column(String(255), nullable=True)
    expense_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", back_populates="expenses_paid")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = Column(String(36), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Exact amount or portion of debt this member owes
    share_amount = Column(Float, default=0.0, nullable=False)
    percentage = Column(Float, default=0.0, nullable=True)

    # Relationships
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="expense_splits")
