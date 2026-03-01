from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Team_association(Base):
    __tablename__="team_association"
    team_id=Column(Integer,ForeignKey("teams.team_id"),primary_key=True,nullable=False)
    user_id=Column(Integer,ForeignKey("users.user_id"),primary_key=True,nullable=False)
    
    # Relationships
    team = relationship("Teams", back_populates="team_members")
    user = relationship("Users", back_populates="team_associations")
    