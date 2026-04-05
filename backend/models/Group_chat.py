from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text,String
from sqlalchemy.orm import relationship
from database.connection import Base

class Group_chat(Base):
    __tablename__="group_chat"
    id=Column(Integer,primary_key=True)
    group_name=Column(String,nullable=False)
    group_description=Column(String,nullable=False)
    group_image=Column(String,nullable=False)
    owned_by=Column(Integer,ForeignKey("users.user_id"))
    
    
