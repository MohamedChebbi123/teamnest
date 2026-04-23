from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, ForeignKey, String
from sqlalchemy.orm import relationship
from database.connection import Base


class Files(Base):
    __tablename__="files"
    id=Column(Integer,primary_key=True)
    file_name=Column(String,nullable=False,index=True)
    file_url=Column(String,nullable=False)
    sender_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    team_id=Column(Integer,ForeignKey("teams.team_id"),nullable=True)
    channel_id=Column(Integer,ForeignKey("channels.channel_id"),nullable=True,index=True)
    org_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False,index=True)
    file_size=Column(Integer,nullable=False)
    is_deleted=Column(Boolean,default=False)
    sent_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))

    sender = relationship("Users", back_populates="files_sent")
    team = relationship("Teams", back_populates="files")
