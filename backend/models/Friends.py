from datetime import UTC, datetime
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Friends(Base):
    __tablename__ = "friends"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    friend_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, accepted, rejected
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user = relationship("Users", foreign_keys=[user_id])
    friend = relationship("Users", foreign_keys=[friend_id])
