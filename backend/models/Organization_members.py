from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from database.connection import Base


class Organization_members(Base):
    __tablename__="org_memebers"
    id=Column(Integer,primary_key=True)
    memmber_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    role_user=Column(String,nullable=False)
    org_id=Column(Integer,ForeignKey("organization.organization_id",ondelete="CASCADE"),nullable=False)
    joined_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))