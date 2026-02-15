from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from database.connection import Base

class Organization(Base):
    __tablename__="organization"
    organization_id=Column(Integer,primary_key=True)
    organization_name=Column(String(20),nullable=False,unique=True,index=True)
    organaization_picture=Column(String(200),nullable=True)
    organization_description=Column(Text,nullable=True)
    organaization_tag=Column(String,nullable=False)
    organization_plan=Column(String,nullable=False)
    owner_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))