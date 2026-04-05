from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text,String
from sqlalchemy.orm import relationship
from database.connection import Base

class Group_chat_members(Base):
    __tablename__="group_chat_members"
    id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey("users.user_id"))
    group_chat_id=Column(Integer,ForeignKey("group_chat.id"))
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


