import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    payer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    payee_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    amount = Column(Float, nullable=False)
    status = Column(String(20), default="COMPLETED", nullable=False)  # PENDING, COMPLETED
    payment_mode = Column(String(50), default="UPI", nullable=False)  # UPI, CASH, BANK_TRANSFER
    note = Column(String(255), nullable=True)
    
    settled_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="settlements")
    payer = relationship("User", foreign_keys=[payer_id])
    payee = relationship("User", foreign_keys=[payee_id])
