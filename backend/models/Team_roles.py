from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Team_roles(Base):
    __tablename__="team_roles"
    team_role_id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    team_id=Column(Integer,ForeignKey("teams.team_id"),nullable=False)
    role=Column(String,nullable=False)
    can_create_channels=Column(Boolean,default=False)
    can_send_messages=Column(Boolean,default=False)
    can_delete_messages=Column(Boolean,default=False)
    can_manage_roles=Column(Boolean,default=False)
    can_kick_members=Column(Boolean,default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), default=datetime.now(UTC), onupdate=datetime.now(UTC))
    
    user = relationship("Users", back_populates="team_roles")
    team = relationship("Teams", back_populates="team_roles")