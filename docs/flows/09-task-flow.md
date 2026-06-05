# Task Flow

## Files
- `backend/routers/tasks_router.py` (122 lines)
- `backend/services/task_service.py` (477 lines)
- `backend/models/Tasks.py`, `Task_assignees.py`, `Task_attachments.py`, `Teams.py`, `Team_association.py`, `Team_roles.py`
- `backend/schemas/Task_input.py` (`Task_input`, `Task_update`, `Task_status_update`), `Task_attachment_input.py`
- `backend/utils/vector_db_handler.py` — `upsert_task`, `delete_task`
- `backend/utils/cloudinary_handler.py` — `upload_chat_file_from_base64`
- `backend/utils/plan_limits.py` — `get_file_size_limit`
- `backend/utils/log_handler.py` — `create_log`

## Status Workflow

```
todo ──→ in_progress ──→ review ──→ done
                            ↑           │
                            └── reject ──┘ (→ in_progress)
```

- `done` is only reachable from `review`
- Assignees can transition: `todo → in_progress → review`
- Only reviewers (non-assignees with `can_manage_tasks`) can `accept` (→ done) or `reject` (→ in_progress)

## Auto-complete Parent Tasks

When a task is marked `done`, `_auto_complete_parent_tasks()` walks up the `parent_task_id` chain. If all subtasks of a parent are done, the parent is also marked done (recursively).

## Permission Model

| Action | Required |
|--------|----------|
| Create task | Org OWNER or `can_manage_tasks` |
| Edit task | Org OWNER or `can_manage_tasks` |
| Delete task | Org OWNER or `can_manage_tasks` |
| Status update | Must be assigned to task |
| Review (accept/reject) | NOT an assignee, must have `can_manage_tasks` |
| Delete attachment | Uploader OR org owner OR `can_manage_tasks` |

## Endpoints

### POST /organization/{org_id}/team/{team_id}/tasks
**Service:** `create_tasks_service`  
Validates team membership + permissions. Validates parent_task_id exists in same team. Validates assignee_ids are team members. Creates Tasks + Task_assignees. Upserts to Pinecone `fyp` index.

### GET /organization/{org_id}/team/{team_id}/tasks
**Service:** `fetch_team_tasks_service`  
Lists non-deleted tasks with assignees (lazy-loaded) and attachments.

### PUT /organization/{org_id}/team/{team_id}/tasks/{task_id}
**Service:** `edit_task_service`  
Edits title, description, priority, status, parent_task_id (with cycle detection), subtask_group, due_date, assignees. Auto-completes parent tasks if status=done.

### DELETE /organization/{org_id}/team/{team_id}/tasks/{task_id}
**Service:** `delete_task_service`  
Soft-delete (`is_deleted=True`). Deletes from Pinecone.

### GET /organization/{org_id}/team/{team_id}/my-tasks
**Service:** `fetch_my_tasks_service`  
Tasks assigned to current user.

### PATCH /organization/{org_id}/team/{team_id}/my-tasks/{task_id}/status
**Service:** `update_my_task_status_service`  
Assignee updates status. Validates transition rules. Auto-completes parents on done.

### PATCH /organization/{org_id}/team/{team_id}/tasks/{task_id}/review?action=accept
**Service:** `review_tasks`  
Accept → done, Reject → in_progress. Validates not assignee.

### POST /organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments
**Service:** `add_task_attachment_service`  
Uploads base64 file to Cloudinary. Checks duplicate filename. Check file size plan limit (estimation from base64 length).

### DELETE /organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments/{attachment_id}
**Service:** `delete_task_attachment_service`  
Permission: uploader, org owner, or `can_manage_tasks`.

## Helper Functions

| Function | Purpose |
|----------|---------|
| `_validate_team_in_org(team_id, org_id, user_id, db)` | Ensures team exists in org and user is member |
| `task_to_dict(task)` | Serializes with assignees + attachments |
| `_auto_complete_parent_tasks(task, org_id, actor_id, db)` | Recursive parent completion |
