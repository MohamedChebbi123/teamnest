from datetime import UTC, datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Index
from database.connection import Base


class Refresh_tokens(Base):
    __tablename__ = "refresh_tokens"

    jti = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    replaced_by_jti = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_ip = Column(String(45), nullable=True)

    __table_args__ = (
        Index("ix_refresh_tokens_user_id", "user_id"),
    )
