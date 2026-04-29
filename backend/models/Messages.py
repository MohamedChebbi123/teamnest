from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Messages(Base):
    __tablename__="messages"
    message_id=Column(Integer,primary_key=True)
    message_content=Column(Text,nullable=False)
    sender_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    channel_id=Column(Integer,ForeignKey("channels.channel_id"),nullable=False)
    is_deleted=Column(Boolean,default=False)
    parent_id=Column(Integer,ForeignKey("messages.message_id"),nullable=True)
    edited_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))
    sent_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))
    parent_message = relationship("Messages", remote_side=[message_id], backref="replies")
    notifications = relationship("Notifications", back_populates="message", cascade="all, delete-orphan")
    channel = relationship("Channels", back_populates="messages")
    pinned_entries = relationship("Pinned_messages", backref="pinned_message_ref", cascade="all, delete-orphan", overlaps="message,pinned_messages")