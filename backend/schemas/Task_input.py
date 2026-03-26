from pydantic import BaseModel
from typing import List, Optional

class Task_input(BaseModel):
    title: str
    description: str
    priority: str
    status: str
    parent_task_id: Optional[int] = None
    subtask_group: Optional[str] = None
    assignee_ids: Optional[List[int]] = []

class Task_update(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    parent_task_id: Optional[int] = None
    subtask_group: Optional[str] = None
    assignee_ids: Optional[List[int]] = None
