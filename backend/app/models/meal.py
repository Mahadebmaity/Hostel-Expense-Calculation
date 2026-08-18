import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class MealAttendance(Base):
    __tablename__ = "meal_attendance"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    record_date = Column(Date, default=date.today, nullable=False)
    
    # Counts of meals taken on this day (can be 0, 1, 2 or custom e.g. guest meals)
    breakfast_count = Column(Float, default=0.0, nullable=False)
    lunch_count = Column(Float, default=0.0, nullable=False)
    dinner_count = Column(Float, default=0.0, nullable=False)
    
    # Calculated effective meal units according to mess weight rules
    total_units = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="meal_records")
    user = relationship("User", back_populates="meal_records")

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", "record_date", name="uix_group_user_date"),
    )
