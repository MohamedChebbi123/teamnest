from datetime import UTC, datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
from database.connection import Base


class Task_attachments(Base):
    __tablename__ = "task_attachments"

    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    file_url = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    uploaded_by = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    task = relationship("Tasks", back_populates="attachments")
    uploader = relationship(
        "Team_association",
        primaryjoin="Task_attachments.uploaded_by == foreign(Team_association.user_id)",
        uselist=False,
        viewonly=True
    )
