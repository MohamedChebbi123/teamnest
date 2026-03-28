from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Tasks(Base):
    __tablename__="tasks"

    id=Column(Integer,primary_key=True)
    title=Column(String,index=True)
    description=Column(Text,nullable=False)
    team_id=Column(Integer,ForeignKey("teams.team_id"),nullable=False)
    created_by=Column(Integer,ForeignKey("users.user_id"),nullable=False)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)  # self-reference
    subtask_group = Column(String, nullable=True)  # group/family label for subtasks
    priotrity=Column(String,nullable=False)
    status=Column(String,nullable=False)
    is_deleted=Column(Boolean,default=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.now(UTC), onupdate=datetime.now(UTC))
    finished=Column(Boolean,default=False)
    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))

    # Relationships
    team = relationship("Teams", back_populates="tasks")
    creator = relationship("Users", foreign_keys=[created_by], back_populates="tasks_created")
    subtasks = relationship("Tasks", backref='parent_task', remote_side=[id])
    assignees = relationship("Task_assignees", back_populates="task", cascade="all, delete-orphan")
