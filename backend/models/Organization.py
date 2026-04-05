from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Organization(Base):
    __tablename__="organization"
    organization_id=Column(Integer,primary_key=True)
    organization_name=Column(String(20),nullable=False,unique=True,index=True)
    organaization_picture=Column(String(200),nullable=True)
    organization_description=Column(Text,nullable=True)
    organaization_tag=Column(String,nullable=False)
    organization_plan=Column(String,nullable=True)
    owner_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))
    
    owner = relationship("Users", back_populates="owned_organizations")
    teams = relationship("Teams", back_populates="organization", cascade="all, delete-orphan")
    channels = relationship("Channels", back_populates="organization", cascade="all, delete-orphan")
    payments = relationship("Organization_payments", back_populates="organization", cascade="all, delete-orphan")
