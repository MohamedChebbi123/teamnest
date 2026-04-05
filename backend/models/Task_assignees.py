from datetime import UTC, datetime
from sqlalchemy import Column, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Task_assignees(Base):
    __tablename__ = "task_assignees"

    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    task = relationship("Tasks", back_populates="assignees")
    user = relationship("Users", back_populates="task_assignments")

