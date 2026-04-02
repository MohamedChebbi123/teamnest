from datetime import UTC, datetime
from sqlalchemy import Column, DateTime,Integer,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Pinned_messages(Base):
    __tablename__="pinned_messages"

    id=Column(Integer,primary_key=True)
    message_id=Column(Integer,ForeignKey("messages.message_id"),nullable=False)
    channel_id=Column(Integer,ForeignKey("channels.channel_id"),nullable=False)
    pinned_by=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    pinned_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))

    message=relationship("Messages",backref="pinned_messages")
    channel=relationship("Channels",backref="pinned_messages")
    user=relationship("Users",backref="pinned_messages")
