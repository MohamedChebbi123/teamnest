from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Teams(Base):
    __tablename__="teams"
    team_id=Column(Integer,primary_key=True)
    team_name=Column(String,index=True,nullable=False)
    team_size=Column(Integer,nullable=False)
    description=Column(Text,nullable=True)
    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))
    org_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="teams")
    channels = relationship("Channels", back_populates="team", cascade="all, delete-orphan")
    team_members = relationship("Team_association", back_populates="team", cascade="all, delete-orphan")
    team_roles = relationship("Team_roles", back_populates="team", cascade="all, delete-orphan")
    users = relationship("Users", secondary="team_association", back_populates="teams", viewonly=True)

    