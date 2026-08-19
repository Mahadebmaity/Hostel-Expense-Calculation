import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class MonthlyScoreBoard(Base):
    __tablename__ = "monthly_scoreboards"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(120), nullable=False)  # e.g., "May Score Board", "June 2026 Calculations"
    month_label = Column(String(50), nullable=True)  # e.g., "May 2026", "2026-05"
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    # Financial Aggregates
    total_establishment = Column(Float, default=0.0, nullable=False)
    establishment_per_head = Column(Float, default=0.0, nullable=False)
    total_meal_expenses = Column(Float, default=0.0, nullable=False)
    guest_deduction_total = Column(Float, default=0.0, nullable=False)
    net_meal_pool = Column(Float, default=0.0, nullable=False)
    total_meals = Column(Float, default=0.0, nullable=False)
    meal_rate = Column(Float, default=0.0, nullable=False)
    
    total_deposit_collected = Column(Float, default=0.0, nullable=False)
    total_due = Column(Float, default=0.0, nullable=False)
    total_refund = Column(Float, default=0.0, nullable=False)
    
    # Candidate rows and detailed breakdowns stored as JSON
    member_records = Column(JSON, default=list)
    breakdown = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    group = relationship("Group", back_populates="scoreboards")
    creator = relationship("User", foreign_keys=[created_by])
