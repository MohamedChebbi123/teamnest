from datetime import UTC, datetime
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Pending_friends_request(Base):
    __tablename__ = "pending_friends_requests"

    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, accepted, rejected
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    sender = relationship("Users", foreign_keys=[sender_id])
    receiver = relationship("Users", foreign_keys=[receiver_id])
