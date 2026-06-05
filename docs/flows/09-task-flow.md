# Task Flow — Full Code Details

## Files
- **Router:** `backend/routers/tasks_router.py` (122 lines)
- **Service:** `backend/services/task_service.py` (477 lines)
- **Models:** `Tasks.py`, `Task_assignees.py`, `Task_attachments.py`, `Teams.py`, `Team_association.py`, `Team_roles.py`
- **Schemas:** `Task_input.py` (`Task_input`, `Task_update`, `Task_status_update`), `Task_attachment_input.py`
- **Utils:** `vector_db_handler.py` (`upsert_task`, `delete_task`), `cloudinary_handler.py`, `plan_limits.py`, `log_handler.py`

---

## Task Model Fields

```python
# Tasks.py
id: int (PK)
title: str
description: str (nullable)
team_id: int (FK→Teams)
created_by: int (FK→Users)
parent_task_id: int (nullable, self-referencing FK)
subtask_group: str (nullable)
priority: str — one of "low", "medium", "high", "critical"
status: str — one of "todo", "in_progress", "review", "done"
is_deleted: bool (default False)
due_date: datetime (nullable)
created_at: datetime
updated_at: datetime

# Relationships
assignees: [Task_assignees]  # lazy='joined'
attachments: [Task_attachments]  # lazy='joined'
team: Teams (backref: organization)
```

---

## Helper: `_validate_team_in_org(team_id, org_id, user_id, db)`

```python
team = db.query(Teams).filter(Teams.team_id == team_id, Teams.org_id == org_id).first()
if not team: raise HTTPException(404, "Team not found in this organization")
is_member = db.query(Team_association).filter(
    Team_association.team_id == team_id, Team_association.user_id == user_id
).first()
if not is_member: raise HTTPException(403, "You are not a member of this team")
return team
```

---

## Helper: `task_to_dict(task)`

```python
return {
    "id": task.id,
    "title": task.title,
    "description": task.description,
    "team_id": task.team_id,
    "created_by": task.created_by,
    "parent_task_id": task.parent_task_id,
    "subtask_group": task.subtask_group,
    "priority": task.priority,
    "status": task.status,
    "is_deleted": task.is_deleted,
    "due_date": task.due_date,
    "created_at": task.created_at,
    "updated_at": task.updated_at,
    "assignees": [{user_id, first_name, last_name, avatar_url} for a in task.assignees],
    "attachments": [{id, file_url, file_name, uploaded_by, uploaded_at} for att in task.attachments],
}
```

---

## Helper: `_auto_complete_parent_tasks(task, org_id, actor_id, db)`

```python
parent_id = task.parent_task_id
while parent_id is not None:
    parent = db.query(Tasks).filter(Tasks.id == parent_id, Tasks.is_deleted == False).first()
    if not parent: break

    subtask_statuses = db.query(Tasks.status).filter(
        Tasks.parent_task_id == parent.id, Tasks.is_deleted == False
    ).all()

    if not subtask_statuses: break  # no subtasks
    if not all(status[0] == "done" for status in subtask_statuses): break

    if parent.status != "done":
        parent.status = "done"
        db.commit()
        create_log(db, org_id=org_id, actor_id=actor_id, action="task_status_updated",
                   target_id=parent.id, target_type="task", metadata={"status": "done", "team_id": parent.team_id})

    parent_id = parent.parent_task_id  # walk up
```

---

## POST /organization/{org_id}/team/{team_id}/tasks
**Service:** `create_tasks_service(team_id, org_id, task_data, user, db)`

1. `team = _validate_team_in_org(team_id, org_id, user_id, db)`
2. `is_owner = team.organization.owner_id == user_id`
3. If not owner: `role = db.query(Team_roles).filter(team_id=team_id, user_id=user_id).first()` — must have `can_manage_tasks`
4. If `task_data.parent_task_id`: verify parent exists in this team, not deleted
5. If `task_data.assignee_ids`: each must be team member
6. `new_task = Tasks(title=..., description=..., team_id=team_id, created_by=user_id, priority=..., status=..., parent_task_id=..., subtask_group=..., due_date=...)`
7. `db.flush()` — get task.id
8. For each assignee_id: `db.add(Task_assignees(task_id=new_task.id, user_id=assignee_id))`
9. `db.commit()`, `db.refresh(new_task)`
10. `upsert_task(task_id=new_task.id, title=new_task.title, description=new_task.description, team_id=new_task.team_id)` — Pinecone
11. `create_log(db, ..., action="task_created", metadata={"title": ..., "team_id": ...})`

---

## GET /organization/{org_id}/team/{team_id}/tasks
**Service:** `fetch_team_tasks_service(team_id, org_id, user, db)`

```python
_validate_team_in_org(team_id, org_id, user_id, db)
tasks = db.query(Tasks).filter(Tasks.team_id == team_id, Tasks.is_deleted == False).all()
return [task_to_dict(t) for t in tasks]
```

---

## PUT /organization/{org_id}/team/{team_id}/tasks/{task_id}
**Service:** `edit_task_service(task_id, team_id, org_id, task_data, user, db)`

1. Validate team + org + membership + permissions
2. Update fields: `title`, `description`, `priority`, `subtask_group`, `due_date`
3. Status update: `if task_data.status == "done" and task.status != "review": raise HTTPException(400, "Task must be in review before it can be marked as done")`
4. Parent task change:
```python
if task_data.parent_task_id is not None:
    if task_data.parent_task_id == task.id: raise HTTPException(400, "A task cannot be its own parent")
    # Validate new parent exists in team
    # Cycle detection:
    ancestor_id = new_parent.parent_task_id
    seen = {task.id}
    while ancestor_id is not None:
        if ancestor_id in seen: raise HTTPException(400, "Parent change would create a cycle")
        seen.add(ancestor_id)
        ancestor = db.query(Tasks.parent_task_id).filter(Tasks.id == ancestor_id).first()
        ancestor_id = ancestor[0] if ancestor else None
```
5. Assignees: delete all, re-add from list (if not None)
6. If status changed to `done`: call `_auto_complete_parent_tasks()`

---

## DELETE /organization/{org_id}/team/{team_id}/tasks/{task_id}
**Service:** `delete_task_service(task_id, team_id, org_id, user, db)`

1. Validate + permission check
2. `task.is_deleted = True`, `db.commit()`
3. `delete_task(task_id=task.id, team_id=task.team_id)` — Pinecone delete

---

## GET /organization/{org_id}/team/{team_id}/my-tasks
**Service:** `fetch_my_tasks_service(team_id, org_id, user, db)`

```python
tasks = db.query(Tasks).join(
    Task_assignees, Task_assignees.task_id == Tasks.id
).filter(
    Tasks.team_id == team_id,
    Tasks.is_deleted == False,
    Task_assignees.user_id == user_id
).all()
```

---

## PATCH /organization/{org_id}/team/{team_id}/my-tasks/{task_id}/status
**Service:** `update_my_task_status_service(task_id, team_id, org_id, status_data, user, db)`

1. Validate team membership
2. `allowed_statuses = {"todo", "in_progress", "review", "done"}` — if not in set: 400
3. Must be assigned to task
4. `if status_data.status == "done" and task.status != "review": raise HTTPException(400, "Task must be in review before it can be marked as done")`
5. Auto-complete parents if done

---

## PATCH /organization/{org_id}/team/{team_id}/tasks/{task_id}/review?action=accept
**Service:** `review_tasks(task_id, action, team_id, org_id, user, db)`

1. `if action not in ("accept", "reject"): raise HTTPException(400, "Action must be 'accept' or 'reject'")`
2. `if task.status != "review": raise HTTPException(400, "Task is not in review status")`
3. `is_assignee = db.query(Task_assignees).filter(task_id=task_id, user_id=user_id).first()` — if True: `raise HTTPException(403, "Assignees cannot accept or reject their own task")`
4. Must have `can_manage_tasks` or be owner
5. `task.status = "done" if action == "accept" else "in_progress"`
6. Auto-complete parents if done

---

## POST /organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments
**Service:** `add_task_attachment_service(task_id, team_id, org_id, data, user, db)`

1. Validate task exists + team membership
2. **Duplicate check**: `db.query(Task_attachments).filter(task_id=task_id, file_name=data.file_name).first()` — 409 if exists
3. **File size limit**:
```python
raw_b64 = data.file_base64.split(",", 1)[-1]  # strip data URI prefix
estimated_bytes = len(raw_b64) * 3 // 4  # base64 → raw byte estimation
file_size_limit = get_file_size_limit(team.organization.organization_plan)
if file_size_limit is not None and estimated_bytes > file_size_limit:
    raise HTTPException(413, f"File size exceeds the {file_size_limit // (1024 * 1024)} MB limit.")
```
4. `file_url = upload_chat_file_from_base64(data.file_name, data.file_base64)`
5. Creates `Task_attachments(task_id, file_url, file_name, uploaded_by=user_id)`

---

## DELETE /organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments/{attachment_id}
**Service:** `delete_task_attachment_service(task_id, attachment_id, team_id, org_id, user, db)`

- Permission: `attachment.uploaded_by == user_id OR is_owner OR can_manage_tasks`
- `db.delete(attachment)`

---

## Pinecone Task Index (vector_db_handler.py)

```python
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "fyp"

def _get_index():
    # Lazily creates index if not exists (llama-text-embed-v2 model, AWS us-east-1)
    # Uses Index(name) for serverless

def upsert_task(task_id, title, description, team_id):
    chunk_text = f"Task: {title}. Description: {description}"
    _get_index().upsert_records(namespace=f"team-{team_id}", records=[{
        "_id": f"task-{task_id}",
        "chunk_text": chunk_text,
        "type": "task",
        "task_id": task_id,
        "team_id": team_id,
        "title": title,
    }])

def delete_task(task_id, team_id):
    _get_index().delete(ids=[f"task-{task_id}"], namespace=f"team-{team_id}")

def search(query, namespace, top_k=5):
    return _get_index().search(namespace=namespace, query={"top_k": top_k, "inputs": {"text": query}})
```
