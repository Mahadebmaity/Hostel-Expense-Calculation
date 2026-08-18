import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    description = Column(String(255), nullable=True)
    # Type: MESS, TRIP, FLATMATES, PERSONAL
    group_type = Column(String(20), default="MESS", nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    
    # Custom settings: e.g. {"breakfast_weight": 0.5, "lunch_weight": 1.0, "dinner_weight": 1.0, "fixed_costs": {}}
    settings = Column(JSON, default=dict)
    
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="group", cascade="all, delete-orphan")
    meal_records = relationship("MealAttendance", back_populates="group", cascade="all, delete-orphan")
    settlements = relationship("Settlement", back_populates="group", cascade="all, delete-orphan")

class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Role: ADMIN, MANAGER, MEMBER
    role = Column(String(20), default="MEMBER", nullable=False)
    
    # Financial deposits paid in advance to the mess manager/fund
    initial_deposit = Column(Float, default=0.0, nullable=False)
    
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")
