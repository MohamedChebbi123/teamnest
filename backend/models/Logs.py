from datetime import UTC, datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text, String
from sqlalchemy.orm import relationship
from database.connection import Base


class Logs(Base):
    __tablename__="logs"
    id=Column(Integer,primary_key=True)
    org_id=Column(Integer,ForeignKey("organizations.id"),nullable=False)
    actor_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    action=Column(String,nullable=False)
    target_id=Column(Integer,nullable=True)
    target_type=Column(String,nullable=True)
    log_metadata=Column(Text,nullable=True)
    created_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))

    organization=relationship("Organization",backref="logs")
    actor=relationship("Users",backref="logs")