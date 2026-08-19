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
    
    # Custom settings: e.g. {"breakfast_weight": 0.5, "lunch_weight": 1.0, "dinner_weight": 1.0, "guest_rates": {"veg": 40, "fish": 50, "meat": 75}}
    settings = Column(JSON, default=dict)
    
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="group", cascade="all, delete-orphan")
    meal_records = relationship("MealAttendance", back_populates="group", cascade="all, delete-orphan")
    settlements = relationship("Settlement", back_populates="group", cascade="all, delete-orphan")
    scoreboards = relationship("MonthlyScoreBoard", back_populates="group", cascade="all, delete-orphan")

class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    # user_id is nullable so managers can add members without forcing registration
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Virtual member attributes
    name = Column(String(120), nullable=True)
    email = Column(String(150), nullable=True)
    phone = Column(String(25), nullable=True)
    upi_id = Column(String(100), nullable=True)
    is_virtual = Column(String(10), default="true", nullable=False) # 'true' or 'false'
    
    # Role: ADMIN, MANAGER, MEMBER
    role = Column(String(20), default="MEMBER", nullable=False)
    
    # Financial deposits paid in advance to the mess manager/fund
    initial_deposit = Column(Float, default=0.0, nullable=False)
    
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

    @property
    def member_name(self) -> str:
        if self.user and self.user.name:
            return self.user.name
        return self.name or "Member"

    @property
    def member_email(self) -> str:
        if self.user and self.user.email:
            return self.user.email
        return self.email or ""

    @property
    def member_upi_id(self) -> str:
        if self.user and self.user.upi_id:
            return self.user.upi_id
        return self.upi_id or ""
