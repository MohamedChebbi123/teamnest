from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text,String
from sqlalchemy.orm import relationship
from database.connection import Base


class Group_chat_messages(Base):
    __tablename__="group_chat_messages"
    id=Column(Integer,primary_key=True)
    parent_id=Column(Integer,ForeignKey("group_chat_messages.id"),nullable=True)
    group_chat_id=Column(Integer,ForeignKey("group_chat.id"))
    sender_id=Column(Integer,ForeignKey("users.user_id"))
    edited_at = Column(DateTime(timezone=True), nullable=True)
    content = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))