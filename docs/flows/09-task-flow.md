# Task Flow

## Models

The `Tasks` model (`backend/models/Tasks.py:6`) maps to the `tasks` table. It has `id` (Integer PK, line 9), `title` (String, indexed, line 10), `description` (Text, not null, line 11), `team_id` (Integer FK to `teams.team_id`, not null, line 12), `created_by` (Integer FK to `users.user_id`, not null, line 13), `parent_task_id` (Integer FK to `tasks.id` self-reference, nullable, for subtask chains, line 14), `subtask_group` (String, nullable, a group label for subtask families, line 15), `priority` (String, not null, line 16), `status` (String, not null, line 17), `is_deleted` (Boolean, defaults to False, line 18), `updated_at` (DateTime with timezone, defaults to `datetime.now(UTC)` and auto-updates via `onupdate`, line 19), `finished` (Boolean, defaults to False, line 20), `due_date` (DateTime with timezone, nullable, line 21), and `created_at` (DateTime with timezone, defaults to `datetime.now(UTC)`, line 22). The model defines relationships: `team` back-populates `Teams.tasks` (line 24), `creator` back-populates `Users.tasks_created` (line 25), `subtasks` with a `backref='parent_task'` on `remote_side=[id]` (line 26), `assignees` cascading all delete-orphan (line 27), and `attachments` cascading all delete-orphan (line 28).

The `Task_assignees` model (`backend/models/Task_assignees.py:7`) maps to `task_assignees`. It has `id` (Integer PK, line 10), `task_id` (Integer FK to `tasks.id`, not null, line 11), `user_id` (Integer FK to `users.user_id`, not null, line 12), and `assigned_at` (DateTime with timezone, defaulting to `datetime.now(UTC)`, line 13). It has `task` and `user` relationships (lines 15-16).

The `Task_attachments` model (`backend/models/Task_attachments.py:8`) maps to `task_attachments`. It has `id` (Integer PK, line 11), `task_id` (Integer FK to `tasks.id`, not null, line 12), `file_url` (String, not null, line 13), `file_name` (String, not null, line 14), `uploaded_by` (Integer, not null, line 15), and `uploaded_at` (DateTime with timezone, defaulting to `datetime.now(UTC)`, line 16). The model has a `task` relationship back-populating `Tasks.attachments` (line 18) and an `uploader` relationship to `Team_association` via a `primaryjoin` on `uploaded_by == foreign(Team_association.user_id)`, set as `uselist=False` and `viewonly=True` (lines 19-24).

## Vector DB Handler

`backend/utils/vector_db_handler.py:8` initializes a Pinecone client with the `PINECONE_API_KEY` env var. The index name is `"fyp"` (line 10) with a lazy `_get_index()` at line 14 that's `None` initially (line 11). On first call, if `pc.has_index(index_name)` returns false (line 17), it creates the index via `pc.create_index_for_model` with `cloud="aws"`, `region="us-east-1"`, and embedding model `"llama-text-embed-v2"` mapping `"chunk_text"` as the text field (lines 18-26), then assigns `_index = pc.Index(index_name)` (line 27).

`upsert_task(task_id, title, description, team_id)` at line 31 builds `chunk_text = f"Task: {title}. Description: {description}"` (line 32), then upserts a single record into namespace `f"team-{team_id}"` with `_id = f"task-{task_id}"`, `chunk_text`, `type: "task"`, `task_id`, `team_id`, and `title` (lines 33-43).

`delete_task(task_id, team_id)` at line 47 calls `_get_index().delete(ids=[f"task-{task_id}"], namespace=f"team-{team_id}")` (lines 48-51).

`search(query, namespace, top_k=5)` at line 54 calls `_get_index().search` with `namespace`, `top_k`, and `inputs: {"text": query}` (lines 55-62).

## Router Endpoints

`backend/routers/tasks_router.py:20` defines `router = APIRouter()`. Nine endpoints follow:

`POST /organization/{org_id}/team/{team_id}/tasks` at line 23 accepts `org_id`, `team_id`, and a `Task_input` body, requires authentication, and delegates to `create_tasks_service(team_id, org_id, task_data, user, db)` (lines 24-31).

`GET /organization/{org_id}/team/{team_id}/tasks` at line 34 requires auth and calls `fetch_team_tasks_service(team_id, org_id, user, db)` (lines 35-41).

`PUT /organization/{org_id}/team/{team_id}/tasks/{task_id}` at line 44 requires auth and calls `edit_task_service(task_id, team_id, org_id, task_data, user, db)` (lines 45-53).

`DELETE /organization/{org_id}/team/{team_id}/tasks/{task_id}` at line 56 requires auth and calls `delete_task_service(task_id, team_id, org_id, user, db)` (lines 57-64).

`GET /organization/{org_id}/team/{team_id}/my-tasks` at line 67 requires auth and calls `fetch_my_tasks_service(team_id, org_id, user, db)` (lines 68-74).

`PATCH /organization/{org_id}/team/{team_id}/my-tasks/{task_id}/status` at line 77 requires auth and calls `update_my_task_status_service(task_id, team_id, org_id, status_data, user, db)` (lines 78-86).

`PATCH /organization/{org_id}/team/{team_id}/tasks/{task_id}/review` at line 89 requires auth, accepts an `action: str` query, and calls `review_tasks(task_id, action, team_id, org_id, user, db)` (lines 90-98).

`POST /organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments` at line 101 requires auth and calls `add_task_attachment_service(task_id, team_id, org_id, data, user, db)` (lines 102-110).

`DELETE /organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments/{attachment_id}` at line 113 requires auth and calls `delete_task_attachment_service(task_id, attachment_id, team_id, org_id, user, db)` (lines 114-122).

## Service Functions

### Helper: `_validate_team_in_org`

`_validate_team_in_org(team_id, org_id, user_id, db)` at `backend/services/task_service.py:17` queries `Teams` filtered by `team_id` and `org_id` (line 18). If no result, raises `HTTPException(404, detail="Team not found in this organization")` (lines 19-20). It then checks `Team_association` for the user's membership (lines 22-25). If not a member, raises `HTTPException(403, detail="You are not a member of this team")` (lines 26-27). Returns the `team` on success (line 28).

### Helper: `task_to_dict`

`task_to_dict(task)` at line 31 returns a dict with `id`, `title`, `description`, `team_id`, `created_by`, `parent_task_id`, `subtask_group`, `priority`, `status`, `is_deleted`, `due_date`, `created_at`, `updated_at` (lines 32-45). It builds `assignees` by iterating `task.assignees` and for each joins `a.user` to extract `user_id`, `first_name`, `last_name`, `avatar_url` (lines 46-54). It builds `attachments` by iterating `task.attachments` for `id`, `file_url`, `file_name`, `uploaded_by`, `uploaded_at` (lines 55-64).

### Helper: `_auto_complete_parent_tasks`

`_auto_complete_parent_tasks(task, org_id, actor_id, db)` at line 68 walks the `parent_task_id` chain in a `while` loop (line 70). At each level, it fetches the parent task where `is_deleted == False` (lines 71-74); if not found, breaks (lines 75-76). It queries all sibling subtask statuses via `Tasks.parent_task_id == parent.id` where not deleted (lines 78-81); if none exist, breaks (lines 82-83). If not all siblings are `"done"`, breaks (lines 85-86). If the parent's own status isn't already `"done"`, it sets `parent.status = "done"`, commits, refreshes, and calls `create_log` with action `"task_status_updated"` (lines 88-100). The loop continues upward by setting `parent_id = parent.parent_task_id` (line 102).

### `create_tasks_service`

`create_tasks_service(team_id, org_id, task_data, user, db)` at line 104 gets `user_id` (line 105), validates team membership via `_validate_team_in_org` (line 107), and checks `is_owner = team.organization.owner_id == user_id` (line 108). If not the owner, it queries `Team_roles` for `can_manage_tasks` and raises `HTTPException(403, detail="You do not have permission to create tasks")` if missing (lines 110-117). If `task_data.parent_task_id` is set, it looks up the parent in the same team — not found raises `HTTPException(404, detail="Parent task not found in this team")` (lines 119-126). If `task_data.assignee_ids` are provided, each is validated as a `Team_association` member — non-members raise `HTTPException(400, detail=f"User {assignee_id} is not a member of this team")` (lines 128-135). A new `Tasks` row is constructed (lines 137-147), added, and flushed (lines 149-150). Assignee rows are created if provided (lines 152-154). After commit and refresh (lines 156-157), it calls `upsert_task` from `vector_db_handler` to index in Pinecone (lines 159-165). A log entry with action `"task_created"` is created (line 167). Returns `task_to_dict(new_task)` (line 169).

### `fetch_team_tasks_service`

`fetch_team_tasks_service(team_id, org_id, user, db)` at line 172 validates team membership (line 175), queries all non-deleted tasks for the team (line 177), and returns `[task_to_dict(t) for t in tasks]` (line 179).

### `edit_task_service`

`edit_task_service(task_id, team_id, org_id, task_data, user, db)` at line 182 validates team membership (line 185). It looks up the task by `task_id` and `team_id` where not deleted (line 187), raising `HTTPException(404, detail="Task not found")` if missing (lines 188-189). Permission is checked via owner or `can_manage_tasks` role, raising `HTTPException(403, detail="You do not have permission to edit tasks")` otherwise (lines 191-200). Individual fields are conditionally updated: `title` (lines 202-203), `description` (lines 204-205), `priority` (lines 206-207). For status, if `status == "done"` and the current status is not `"review"`, it raises `HTTPException(400, detail="Task must be in review before it can be marked as done")` (lines 209-213). For `parent_task_id` changes, a self-parent attempt raises `HTTPException(400, detail="A task cannot be its own parent")` (lines 214-216), a missing parent raises 404 (lines 218-224), and cycle detection traverses ancestors using a `seen` set — a cycle raises `HTTPException(400, detail="Parent change would create a cycle")` (lines 226-233). Assignee replacement clears all existing via `db.query(Task_assignees).filter(...).delete()` (line 250) and re-adds each, with membership checks on each candidate (lines 241-252). After commit and refresh (lines 254-255) and an `"task_updated"` log (line 257), if the task was marked done it calls `_auto_complete_parent_tasks` (lines 259-260). Returns `task_to_dict(task)` (line 262).

### `delete_task_service`

`delete_task_service(task_id, team_id, org_id, user, db)` at line 265 validates team membership (line 268), looks up the task (lines 270-272) — missing raises 404. Permission checks use owner or `can_manage_tasks` role, raising `HTTPException(403, detail="You do not have permission to delete tasks")` otherwise (lines 274-283). Soft-deletes by setting `task.is_deleted = True` and committing (lines 285-286). Calls `delete_task` from `vector_db_handler` (lines 288-289). Logs with action `"task_deleted"` (line 291). Returns `{"message": "Task deleted successfully"}` (line 293).

### `fetch_my_tasks_service`

`fetch_my_tasks_service(team_id, org_id, user, db)` at line 296 validates membership (line 299), then joins `Tasks` with `Task_assignees` filtering by `team_id`, `is_deleted == False`, and `assignee.user_id == user_id` (lines 301-307). Returns `[task_to_dict(t) for t in tasks]` (line 309).

### `update_my_task_status_service`

`update_my_task_status_service(task_id, team_id, org_id, status_data, user, db)` at line 312 validates team membership (line 315). The allowed status set is `{"todo", "in_progress", "review", "done"}` — anything else raises `HTTPException(400, detail="Invalid task status")` (lines 317-319). Looks up the task (lines 321-327), missing raises 404. Checks that the user is an assignee via `Task_assignees` — if not, raises `HTTPException(403, detail="You are not assigned to this task")` (lines 329-334). Transitioning to `"done"` from anything other than `"review"` raises `HTTPException(400, detail="Task must be in review before it can be marked as done")` (lines 336-337). Updates the status, commits, refreshes (lines 339-341), logs with `"task_status_updated"` (line 343). If the new status is `"done"`, calls `_auto_complete_parent_tasks` (lines 345-346). Returns `task_to_dict(task)` (line 348).

### `review_tasks`

`review_tasks(task_id, action, team_id, org_id, user, db)` at line 352 validates that `action` is `"accept"` or `"reject"` — otherwise raises `HTTPException(400, detail="Action must be 'accept' or 'reject'")` (lines 355-356). Validates team and org membership (line 358). Looks up the task — missing raises 404 (lines 360-366). If the task is not in `"review"` status, raises `HTTPException(400, detail="Task is not in review status")` (lines 368-369). Assignees are blocked from reviewing their own tasks via `HTTPException(403, detail="Assignees cannot accept or reject their own task")` (lines 371-376). Permission requires owner or `can_manage_tasks` role, raising `HTTPException(403, detail="You do not have permission to review tasks")` otherwise (lines 378-385). Sets status to `"done"` on accept or `"in_progress"` on reject (line 387), commits and refreshes (lines 388-389). Logs with `f"task_review_{action}ed"` (line 391). If now done, calls `_auto_complete_parent_tasks` (lines 393-394). Returns `task_to_dict(task)` (line 396).

### `add_task_attachment_service`

`add_task_attachment_service(task_id, team_id, org_id, data, user, db)` at line 399 validates team membership (line 402). Looks up the task — missing raises 404 (lines 404-406). Duplicate file name for the same task raises `HTTPException(409, detail=f"A file named '{data.file_name}' has already been uploaded to this task. Please rename your file or use the existing one.")` (lines 408-416). File size is estimated from the base64 payload: `raw_b64 = data.file_base64.split(",", 1)[-1]` strips any data URI prefix (line 419), `estimated_bytes = len(raw_b64) * 3 // 4` (line 420). The plan limit is fetched via `get_file_size_limit(team.organization.organization_plan)` (line 421). If exceeded, raises `HTTPException(413, detail=f"File size exceeds the {file_size_limit // (1024 * 1024)} MB limit. Upgrade to Pro for larger uploads.")` (lines 422-426). Uploads to Cloudinary via `upload_chat_file_from_base64` (line 428). Creates and persists a `Task_attachments` row (lines 430-438). Returns `{"id", "file_url", "file_name", "uploaded_by", "uploaded_at"}` (lines 440-446).

### `delete_task_attachment_service`

`delete_task_attachment_service(task_id, attachment_id, team_id, org_id, user, db)` at line 449 validates team membership (line 452). Looks up the attachment by `id` and `task_id` — missing raises `HTTPException(404, detail="Attachment not found")` (lines 454-459). Permission logic: the user can delete if they are the owner, have `can_manage_tasks`, or if `attachment.uploaded_by == user_id` — otherwise raises `HTTPException(403, detail="You can only delete your own attachments")` (lines 461-471). Deletes the row and commits (lines 473-474). Returns `{"message": "Attachment deleted"}` (line 476).
