from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from database.connection import Base

class Channels(Base):
    __tablename__="channels"
    channel_id=Column(Integer,primary_key=True)
    channel_name=Column(String,nullable=False)
    type=Column(String,nullable=False)
    description=Column(Text,nullable=True)
    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))
    org_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False)