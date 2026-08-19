import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class MealAttendance(Base):
    __tablename__ = "meal_attendance"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    member_id = Column(String(36), ForeignKey("group_members.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    record_date = Column(Date, default=date.today, nullable=False)
    
    # Counts of regular meals taken on this day
    breakfast_count = Column(Float, default=0.0, nullable=False)
    lunch_count = Column(Float, default=0.0, nullable=False)
    dinner_count = Column(Float, default=0.0, nullable=False)
    
    # Guest meals hosted by this member
    guest_veg_count = Column(Float, default=0.0, nullable=False)
    guest_fish_count = Column(Float, default=0.0, nullable=False)
    guest_meat_count = Column(Float, default=0.0, nullable=False)
    guest_charge = Column(Float, default=0.0, nullable=False)
    
    # Calculated effective meal units according to mess weight rules
    total_units = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="meal_records")
    member = relationship("GroupMember", foreign_keys=[member_id])
    user = relationship("User", back_populates="meal_records", foreign_keys=[user_id])
