# Task Flow — Every Line of Code

## File: `backend/models/Tasks.py` (29 lines)

| Lines | Code |
|-------|------|
| 1-4 | `from datetime import UTC, datetime` / `from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey` / `from sqlalchemy.orm import relationship` / `from database.connection import Base` |
| 6-7 | `class Tasks(Base):` / `__tablename__="tasks"` |
| 9 | `id=Column(Integer,primary_key=True)` |
| 10 | `title=Column(String,index=True)` |
| 11 | `description=Column(Text,nullable=False)` |
| 12 | `team_id=Column(Integer,ForeignKey("teams.team_id"),nullable=False)` |
| 13 | `created_by=Column(Integer,ForeignKey("users.user_id"),nullable=False)` |
| 14 | `parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)` — self-reference FK for subtasks |
| 15 | `subtask_group = Column(String, nullable=True)` — group/family label for subtasks |
| 16 | `priority=Column(String,nullable=False)` |
| 17 | `status=Column(String,nullable=False)` |
| 18 | `is_deleted=Column(Boolean,default=False)` |
| 19 | `updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))` |
| 20 | `finished=Column(Boolean,default=False)` |
| 21 | `due_date = Column(DateTime(timezone=True), nullable=True)` |
| 22 | `created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 24 | `team = relationship("Teams", back_populates="tasks")` |
| 25 | `creator = relationship("Users", foreign_keys=[created_by], back_populates="tasks_created")` |
| 26 | `subtasks = relationship("Tasks", backref='parent_task', remote_side=[id])` |
| 27 | `assignees = relationship("Task_assignees", back_populates="task", cascade="all, delete-orphan")` |
| 28 | `attachments = relationship("Task_attachments", back_populates="task", cascade="all, delete-orphan")` |

## File: `backend/models/Task_assignees.py` (17 lines)

| Lines | Code |
|-------|------|
| 1-4 | `from datetime import UTC, datetime` / `from sqlalchemy import Column, DateTime, Integer, ForeignKey` / `from sqlalchemy.orm import relationship` / `from database.connection import Base` |
| 7-8 | `class Task_assignees(Base):` / `__tablename__ = "task_assignees"` |
| 10 | `id = Column(Integer, primary_key=True)` |
| 11 | `task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)` |
| 12 | `user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` |
| 13 | `assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` |
| 15 | `task = relationship("Tasks", back_populates="assignees")` |
| 16 | `user = relationship("Users", back_populates="task_assignments")` |

## File: `backend/models/Task_attachments.py` (24 lines)

| Lines | Code |
|-------|------|
| 1-5 | `from datetime import UTC, datetime` / `from sqlalchemy import Column, Integer, String, DateTime` / `from sqlalchemy.orm import relationship` / `from sqlalchemy import ForeignKey` / `from database.connection import Base` |
| 8-9 | `class Task_attachments(Base):` / `__tablename__ = "task_attachments"` |
| 11 | `id = Column(Integer, primary_key=True)` |
| 12 | `task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)` |
| 13 | `file_url = Column(String, nullable=False)` |
| 14 | `file_name = Column(String, nullable=False)` |
| 15 | `uploaded_by = Column(Integer, nullable=False)` |
| 16 | `uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` |
| 18 | `task = relationship("Tasks", back_populates="attachments")` |
| 19-24 | `uploader = relationship("Team_association", primaryjoin="Task_attachments.uploaded_by == foreign(Team_association.user_id)", uselist=False, viewonly=True)` |

## File: `backend/utils/vector_db_handler.py` (62 lines)

| Line | Code |
|------|------|
| 1-4 | `from dotenv import load_dotenv` / `import os` / `from pinecone import Pinecone` / `load_dotenv()` |
| 8 | `pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))` |
| 10 | `index_name = "fyp"` |
| 11 | `_index = None` |
| 14 | `def _get_index():` |
| 15 | `global _index` |
| 16-17 | `if _index is None:` / `if not pc.has_index(index_name):` |
| 18-26 | `pc.create_index_for_model(name=index_name, cloud="aws", region="us-east-1", embed={"model": "llama-text-embed-v2", "field_map": {"text": "chunk_text"}})` |
| 27 | `_index = pc.Index(index_name)` |
| 28 | `return _index` |
| 31 | `def upsert_task(task_id: int, title: str, description: str, team_id: int):` |
| 32 | `chunk_text = f"Task: {title}. Description: {description}"` |
| 33-43 | `_get_index().upsert_records(namespace=f"team-{team_id}", records=[{"_id": f"task-{task_id}", "chunk_text": chunk_text, "type": "task", "task_id": task_id, "team_id": team_id, "title": title}])` |
| 47 | `def delete_task(task_id: int, team_id: int):` |
| 48-51 | `_get_index().delete(ids=[f"task-{task_id}"], namespace=f"team-{team_id}")` |
| 54 | `def search(query: str, namespace: str, top_k: int = 5):` |
| 55-62 | `results = _get_index().search(namespace=namespace, query={"top_k": top_k, "inputs": {"text": query}}); return results` |

## File: `backend/routers/tasks_router.py` (122 lines)

| Lines | Code |
|-------|------|
| 1-18 | Imports: `APIRouter, Depends`, `Session`, `connect_databse`, `Task_input, Task_update, Task_status_update`, `Task_attachment_input`, `create_tasks_service`, `fetch_team_tasks_service`, `edit_task_service`, `delete_task_service`, `fetch_my_tasks_service`, `update_my_task_status_service`, `review_tasks`, `add_task_attachment_service`, `delete_task_attachment_service`, `Users`, `current_user` |
| 20 | `router = APIRouter()` |
| 23-31 | `@router.post("/organization/{org_id}/team/{team_id}/tasks")` / `async def create_task_endpoint(org_id, team_id, task_data: Task_input, user=Depends(current_user), db=Depends(connect_databse)):` / `return create_tasks_service(team_id, org_id, task_data, user, db)` |
| 34-41 | `@router.get("/organization/{org_id}/team/{team_id}/tasks")` / `async def fetch_team_tasks_endpoint(org_id, team_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return fetch_team_tasks_service(team_id, org_id, user, db)` |
| 44-53 | `@router.put("/organization/{org_id}/team/{team_id}/tasks/{task_id}")` / `async def edit_task_endpoint(org_id, team_id, task_id, task_data: Task_update, user=Depends(current_user), db=Depends(connect_databse)):` / `return edit_task_service(task_id, team_id, org_id, task_data, user, db)` |
| 56-64 | `@router.delete("/organization/{org_id}/team/{team_id}/tasks/{task_id}")` / `async def delete_task_endpoint(org_id, team_id, task_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return delete_task_service(task_id, team_id, org_id, user, db)` |
| 67-74 | `@router.get("/organization/{org_id}/team/{team_id}/my-tasks")` / `async def fetch_my_tasks_endpoint(org_id, team_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return fetch_my_tasks_service(team_id, org_id, user, db)` |
| 77-86 | `@router.patch("/organization/{org_id}/team/{team_id}/my-tasks/{task_id}/status")` / `async def update_my_task_status_endpoint(org_id, team_id, task_id, status_data: Task_status_update, user=Depends(current_user), db=Depends(connect_databse)):` / `return update_my_task_status_service(task_id, team_id, org_id, status_data, user, db)` |
| 89-98 | `@router.patch("/organization/{org_id}/team/{team_id}/tasks/{task_id}/review")` / `async def review_task_endpoint(org_id, team_id, task_id, action: str, user=Depends(current_user), db=Depends(connect_databse)):` / `return review_tasks(task_id, action, team_id, org_id, user, db)` |
| 101-110 | `@router.post("/organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments")` / `async def add_attachment_endpoint(org_id, team_id, task_id, data: Task_attachment_input, user=Depends(current_user), db=Depends(connect_databse)):` / `return add_task_attachment_service(task_id, team_id, org_id, data, user, db)` |
| 113-122 | `@router.delete("/organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments/{attachment_id}")` / `async def delete_attachment_endpoint(org_id, team_id, task_id, attachment_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return delete_task_attachment_service(task_id, attachment_id, team_id, org_id, user, db)` |

## File: `backend/services/task_service.py` (477 lines)

### Helper: `_validate_team_in_org` (lines 17-28)

| Line | Code |
|------|------|
| 17 | `def _validate_team_in_org(team_id: int, org_id: int, user_id: int, db: Session) -> Teams:` |
| 18 | `team = db.query(Teams).filter(Teams.team_id == team_id, Teams.org_id == org_id).first()` |
| 19-20 | `if not team: raise HTTPException(404, detail="Team not found in this organization")` |
| 22-25 | `is_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == user_id).first()` |
| 26-27 | `if not is_member: raise HTTPException(403, detail="You are not a member of this team")` |
| 28 | `return team` |

### Helper: `task_to_dict` (lines 31-65)

| Line | Code |
|------|------|
| 31 | `def task_to_dict(task):` |
| 32-65 | Returns dict with `id, title, description, team_id, created_by, parent_task_id, subtask_group, priority, status, is_deleted, due_date, created_at, updated_at, assignees` (list of `{user_id, first_name, last_name, avatar_url}` from `task.assignees` join User), `attachments` (list of `{id, file_url, file_name, uploaded_by, uploaded_at}` from `task.attachments`) |

### Helper: `_auto_complete_parent_tasks` (lines 68-102)

| Line | Code |
|------|------|
| 68 | `def _auto_complete_parent_tasks(task: Tasks, org_id: int, actor_id: int, db: Session) -> None:` |
| 69 | `parent_id = task.parent_task_id` |
| 70 | `while parent_id is not None:` |
| 71-74 | `parent = db.query(Tasks).filter(Tasks.id == parent_id, Tasks.is_deleted == False).first()` |
| 75-76 | `if not parent: break` |
| 78-81 | `subtask_statuses = db.query(Tasks.status).filter(Tasks.parent_task_id == parent.id, Tasks.is_deleted == False).all()` |
| 82-83 | `if not subtask_statuses: break` |
| 85-86 | `if not all(status[0] == "done" for status in subtask_statuses): break` |
| 88-100 | `if parent.status != "done": parent.status = "done"; db.commit(); db.refresh(parent); create_log(db, org_id=org_id, actor_id=actor_id, action="task_status_updated", target_id=parent.id, target_type="task", metadata={"status": parent.status, "team_id": parent.team_id})` |
| 102 | `parent_id = parent.parent_task_id` — continue walking up |

### `create_tasks_service` (lines 104-169)

| Line | Code |
|------|------|
| 104 | `def create_tasks_service(team_id, org_id, task_data: Task_input, user: Users, db: Session):` |
| 105 | `user_id = user.user_id` |
| 107 | `team = _validate_team_in_org(team_id, org_id, user_id, db)` |
| 108 | `is_owner = team.organization.owner_id == user_id` |
| 110-117 | `if not is_owner:` / `role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first()` / `if not role or not role.can_manage_tasks: raise HTTPException(403, "You do not have permission to create tasks")` |
| 119-126 | `if task_data.parent_task_id:` / `parent = db.query(Tasks).filter(Tasks.id == task_data.parent_task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()` / `if not parent: raise HTTPException(404, "Parent task not found in this team")` |
| 128-135 | `if task_data.assignee_ids:` / for each `assignee_id`: `member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == assignee_id).first()` / `if not member: raise HTTPException(400, f"User {assignee_id} is not a member of this team")` |
| 137-147 | `new_task = Tasks(title=..., description=..., team_id=..., created_by=..., priority=..., status=..., parent_task_id=..., subtask_group=..., due_date=...)` |
| 149-150 | `db.add(new_task); db.flush()` |
| 152-154 | `if task_data.assignee_ids: for assignee_id in task_data.assignee_ids: db.add(Task_assignees(task_id=new_task.id, user_id=assignee_id))` |
| 156-157 | `db.commit(); db.refresh(new_task)` |
| 159-165 | `from utils.vector_db_handler import upsert_task; upsert_task(task_id=new_task.id, title=new_task.title, description=new_task.description, team_id=new_task.team_id)` |
| 167 | `create_log(db, org_id=org_id, actor_id=user_id, action="task_created", target_id=new_task.id, target_type="task", metadata={"title": new_task.title, "team_id": team_id})` |
| 169 | `return task_to_dict(new_task)` |

### `fetch_team_tasks_service` (lines 172-179)

| Line | Code |
|------|------|
| 172 | `def fetch_team_tasks_service(team_id, org_id, user: Users, db: Session):` |
| 173 | `user_id = user.user_id` |
| 175 | `_validate_team_in_org(team_id, org_id, user_id, db)` |
| 177 | `tasks = db.query(Tasks).filter(Tasks.team_id == team_id, Tasks.is_deleted == False).all()` |
| 179 | `return [task_to_dict(t) for t in tasks]` |

### `edit_task_service` (lines 182-262)

| Line | Code |
|------|------|
| 182 | `def edit_task_service(task_id, team_id, org_id, task_data: Task_update, user: Users, db: Session):` |
| 183 | `user_id = user.user_id` |
| 185 | `team = _validate_team_in_org(team_id, org_id, user_id, db)` |
| 187-189 | `task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()` / `if not task: raise HTTPException(404, "Task not found")` |
| 191 | `is_owner = team.organization.owner_id == user_id` |
| 193-200 | `if not is_owner:` / `role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first()` / `if not role or not role.can_manage_tasks: raise HTTPException(403, "You do not have permission to edit tasks")` |
| 202-203 | `if task_data.title is not None: task.title = task_data.title` |
| 204-205 | `if task_data.description is not None: task.description = task_data.description` |
| 206-207 | `if task_data.priority is not None: task.priority = task_data.priority` |
| 208 | `marked_done = False` |
| 209-213 | `if task_data.status is not None:` / `if task_data.status == "done" and task.status != "review": raise HTTPException(400, "Task must be in review before it can be marked as done")` / `task.status = task_data.status; marked_done = task.status == "done"` |
| 214-235 | `if task_data.parent_task_id is not None:` / `if task_data.parent_task_id == task.id: raise HTTPException(400, "A task cannot be its own parent")` / `new_parent = db.query(Tasks).filter(Tasks.id == task_data.parent_task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()` / `if not new_parent: raise HTTPException(404, "Parent task not found in this team")` / Cycle detection: `ancestor_id = new_parent.parent_task_id; seen = {task.id}; while ancestor_id is not None: if ancestor_id in seen: raise HTTPException(400, "Parent change would create a cycle"); seen.add(ancestor_id); ancestor = db.query(Tasks.parent_task_id).filter(Tasks.id == ancestor_id).first(); ancestor_id = ancestor[0] if ancestor else None` / `task.parent_task_id = task_data.parent_task_id` |
| 236-237 | `if task_data.subtask_group is not None: task.subtask_group = task_data.subtask_group` |
| 238-239 | `if task_data.due_date is not None: task.due_date = task_data.due_date` |
| 241-252 | `if task_data.assignee_ids is not None:` / for each `assignee_id`: check team membership / `db.query(Task_assignees).filter(Task_assignees.task_id == task.id).delete()` / for each `assignee_id`: `db.add(Task_assignees(task_id=task.id, user_id=assignee_id))` |
| 254-255 | `db.commit(); db.refresh(task)` |
| 257 | `create_log(db, org_id=org_id, actor_id=user_id, action="task_updated", target_id=task.id, target_type="task", metadata={"title": task.title, "team_id": team_id})` |
| 259-260 | `if marked_done: _auto_complete_parent_tasks(task, org_id, user_id, db)` |
| 262 | `return task_to_dict(task)` |

### `delete_task_service` (lines 265-293)

| Line | Code |
|------|------|
| 265 | `def delete_task_service(task_id, team_id, org_id, user: Users, db: Session):` |
| 266 | `user_id = user.user_id` |
| 268 | `team = _validate_team_in_org(team_id, org_id, user_id, db)` |
| 270-272 | `task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()` / `if not task: raise HTTPException(404, "Task not found")` |
| 274 | `is_owner = team.organization.owner_id == user_id` |
| 276-283 | `if not is_owner:` / `role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first()` / `if not role or not role.can_manage_tasks: raise HTTPException(403, "You do not have permission to delete tasks")` |
| 285-286 | `task.is_deleted = True; db.commit()` — soft delete |
| 288-289 | `from utils.vector_db_handler import delete_task; delete_task(task_id=task.id, team_id=task.team_id)` |
| 291 | `create_log(db, org_id=org_id, actor_id=user_id, action="task_deleted", target_id=task.id, target_type="task", metadata={"title": task.title, "team_id": team_id})` |
| 293 | `return {"message": "Task deleted successfully"}` |

### `fetch_my_tasks_service` (lines 296-309)

| Line | Code |
|------|------|
| 296 | `def fetch_my_tasks_service(team_id, org_id, user: Users, db: Session):` |
| 297 | `user_id = user.user_id` |
| 299 | `_validate_team_in_org(team_id, org_id, user_id, db)` |
| 301-307 | `tasks = db.query(Tasks).join(Task_assignees, Task_assignees.task_id == Tasks.id).filter(Tasks.team_id == team_id, Tasks.is_deleted == False, Task_assignees.user_id == user_id).all()` |
| 309 | `return [task_to_dict(t) for t in tasks]` |

### `update_my_task_status_service` (lines 312-348)

| Line | Code |
|------|------|
| 312 | `def update_my_task_status_service(task_id, team_id, org_id, status_data: Task_status_update, user: Users, db: Session):` |
| 313 | `user_id = user.user_id` |
| 315 | `_validate_team_in_org(team_id, org_id, user_id, db)` |
| 317-319 | `allowed_statuses = {"todo", "in_progress", "review", "done"}` / `if status_data.status not in allowed_statuses: raise HTTPException(400, "Invalid task status")` |
| 321-327 | `task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()` / `if not task: raise HTTPException(404, "Task not found")` |
| 329-334 | `is_assigned = db.query(Task_assignees).filter(Task_assignees.task_id == task_id, Task_assignees.user_id == user_id).first()` / `if not is_assigned: raise HTTPException(403, "You are not assigned to this task")` |
| 336-337 | `if status_data.status == "done" and task.status != "review": raise HTTPException(400, "Task must be in review before it can be marked as done")` |
| 339-341 | `task.status = status_data.status; db.commit(); db.refresh(task)` |
| 343 | `create_log(db, org_id=org_id, actor_id=user_id, action="task_status_updated", target_id=task.id, target_type="task", metadata={"status": task.status, "team_id": team_id})` |
| 345-346 | `if task.status == "done": _auto_complete_parent_tasks(task, org_id, user_id, db)` |
| 348 | `return task_to_dict(task)` |

### `review_tasks` (lines 352-396)

| Line | Code |
|------|------|
| 352 | `def review_tasks(task_id, action: str, team_id, org_id, user: Users, db: Session):` |
| 353 | `user_id = user.user_id` |
| 355-356 | `if action not in ("accept", "reject"): raise HTTPException(400, "Action must be 'accept' or 'reject'")` |
| 358 | `team = _validate_team_in_org(team_id, org_id, user_id, db)` |
| 360-366 | `task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()` / `if not task: raise HTTPException(404, "Task not found")` |
| 368-369 | `if task.status != "review": raise HTTPException(400, "Task is not in review status")` |
| 371-376 | `is_assignee = db.query(Task_assignees).filter(Task_assignees.task_id == task_id, Task_assignees.user_id == user_id).first()` / `if is_assignee: raise HTTPException(403, "Assignees cannot accept or reject their own task")` |
| 378-385 | `is_owner = team.organization.owner_id == user_id` / `if not is_owner: role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first()` / `if not role or not role.can_manage_tasks: raise HTTPException(403, "You do not have permission to review tasks")` |
| 387-389 | `task.status = "done" if action == "accept" else "in_progress"; db.commit(); db.refresh(task)` |
| 391 | `create_log(db, org_id=org_id, actor_id=user_id, action=f"task_review_{action}ed", target_id=task.id, target_type="task", metadata={"status": task.status, "team_id": team_id})` |
| 393-394 | `if task.status == "done": _auto_complete_parent_tasks(task, org_id, user_id, db)` |
| 396 | `return task_to_dict(task)` |

### `add_task_attachment_service` (lines 399-446)

| Line | Code |
|------|------|
| 399 | `def add_task_attachment_service(task_id, team_id, org_id, data: Task_attachment_input, user, db):` |
| 400 | `user_id = user.user_id` |
| 402 | `team = _validate_team_in_org(team_id, org_id, user_id, db)` |
| 404-406 | `task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()` / `if not task: raise HTTPException(404, "Task not found")` |
| 408-416 | `existing_attachment = db.query(Task_attachments).filter(Task_attachments.task_id == task_id, Task_attachments.file_name == data.file_name).first()` / `if existing_attachment: raise HTTPException(409, detail=f"A file named '{data.file_name}' has already been uploaded...")` |
| 418-426 | `raw_b64 = data.file_base64.split(",", 1)[-1]` / `estimated_bytes = len(raw_b64) * 3 // 4` / `file_size_limit = get_file_size_limit(team.organization.organization_plan)` / `if file_size_limit is not None and estimated_bytes > file_size_limit: raise HTTPException(413, detail=f"File size exceeds the {file_size_limit // (1024 * 1024)} MB limit...")` |
| 428 | `file_url = upload_chat_file_from_base64(data.file_name, data.file_base64)` — Cloudinary upload |
| 430-438 | `attachment = Task_attachments(task_id=task_id, file_url=file_url, file_name=data.file_name, uploaded_by=user_id); db.add(attachment); db.commit(); db.refresh(attachment)` |
| 440-446 | Returns `{"id": ..., "file_url": ..., "file_name": ..., "uploaded_by": ..., "uploaded_at": ...}` |

### `delete_task_attachment_service` (lines 449-477)

| Line | Code |
|------|------|
| 449 | `def delete_task_attachment_service(task_id, attachment_id, team_id, org_id, user, db):` |
| 450 | `user_id = user.user_id` |
| 452 | `team = _validate_team_in_org(team_id, org_id, user_id, db)` |
| 454-459 | `attachment = db.query(Task_attachments).filter(Task_attachments.id == attachment_id, Task_attachments.task_id == task_id).first()` / `if not attachment: raise HTTPException(404, "Attachment not found")` |
| 461-468 | `is_owner = team.organization.owner_id == user_id` / `can_manage = False` / `if not is_owner: role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first(); can_manage = bool(role and role.can_manage_tasks)` |
| 470-471 | `if attachment.uploaded_by != user_id and not is_owner and not can_manage: raise HTTPException(403, "You can only delete your own attachments")` |
| 473-474 | `db.delete(attachment); db.commit()` |
| 476 | `return {"message": "Attachment deleted"}` |
