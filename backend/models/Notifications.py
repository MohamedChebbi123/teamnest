from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text,String
from sqlalchemy.orm import relationship
from database.connection import Base


class Notifications(Base):
    __tablename__="notifications"
    id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    type= Column(String, nullable=False)
    message_id=Column(Integer,ForeignKey("messages.message_id"),nullable=True)
    dm_message_id=Column(Integer,ForeignKey("direct_messages.id"),nullable=True)
    task_id=Column(Integer,ForeignKey("tasks.id"),nullable=True)
    is_seen=Column(Boolean,default=False)
    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))

    user = relationship("Users", back_populates="notifications")
    message = relationship("Messages", back_populates="notifications")
    dm_message = relationship("Direct_messages", back_populates="notifications")
    task = relationship("Tasks")
