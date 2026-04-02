from datetime import UTC, datetime
from sqlalchemy import Column, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Blocked_users(Base):
    __tablename__ = "blocked_users"

    id = Column(Integer, primary_key=True)
    blocker_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    blocked_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    blocked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    blocker = relationship("Users", foreign_keys=[blocker_id])
    blocked = relationship("Users", foreign_keys=[blocked_id])
