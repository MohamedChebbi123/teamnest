from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Channels(Base):
    __tablename__="channels"
    channel_id=Column(Integer,primary_key=True)
    channel_name=Column(String,nullable=False)
    channel_mode = Column(String, nullable=False)   
    channel_category = Column(String, nullable=False)  
    description=Column(Text,nullable=True)
    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))
    team_id=Column(Integer,ForeignKey("teams.team_id"),nullable=True)
    org_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False)
    
    team = relationship("Teams", back_populates="channels")
    organization = relationship("Organization", back_populates="channels")
    messages = relationship("Messages", back_populates="channel", cascade="all, delete-orphan")
    files = relationship("Files", back_populates="channel", cascade="all, delete-orphan")
