from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Messages(Base):
    __tablename__="messages"
    message_id=Column(Integer,primary_key=True)
    message_content=Column(Text,nullable=False)
    sender_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    channel_id=Column(Integer,ForeignKey("channels.channel_id"),nullable=False)
    is_deleted=Column(Boolean,default=False)
    edited_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))
    sent_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))