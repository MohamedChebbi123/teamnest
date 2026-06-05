# Logs & Audit Flow

## Files
- `backend/routers/logs_router.py` (320 lines)
- `backend/utils/log_handler.py` (17 lines)
- `backend/models/Logs.py`, `Organization.py`, `Organization_members.py`, `Channels.py`, `Teams.py`, `Team_association.py`, `Team_roles.py`, `Tasks.py`, `PInned_messages.py`, `Users.py`

## Endpoints

### GET /organization/{org_id}/logs
Lists all logs for an org. Access: OWNER or ADMIN only.

Returns per log:
- `id`, `action`, `target_id`, `target_type`, `metadata`
- `created_at`, `reversible` (boolean)
- `actor`: user_id, first_name, last_name, avatar_url, user_tag

### POST /organization/{org_id}/logs/{log_id}/undo
Only org OWNER can undo. Reverses the action and creates a new log entry.

## Reversible Actions

| Action | Undo Behavior |
|--------|---------------|
| `channel_created` | Deletes the channel |
| `channel_deleted` | Recreates the channel from stored metadata (name, mode, category, description, team_id) |
| `team_created` | Deletes the team |
| `team_member_added` | Kicks the member (removes Team_association + Team_roles) |
| `team_member_kicked` | Re-adds member with default MEMBER role and default permissions |
| `team_member_permissions_updated` | Reverts permissions to old values using stored changes diff |
| `task_created` | Soft-deletes the task (`is_deleted=True`) |
| `message_pinned` | Unpins the message |
| `message_unpinned` | Re-pins the message |

### `create_log(db, org_id, actor_id, action, target_id, target_type, metadata)` (log_handler.py)

Creates a `Logs` row with JSON-serialized metadata. Called from:
- `channel_service.py`: `channel_created`, `channel_deleted`, `channel_updated`
- `team_service.py`: `team_created`, `team_deleted`, `team_updated`, `team_member_added`, `team_member_kicked`, `team_member_permissions_updated`, `team_member_permissions_revoked`
- `task_service.py`: `task_created`, `task_updated`, `task_deleted`, `task_status_updated`, `task_review_accepted`, `task_review_rejected`
- `message_service.py`: `message_pinned`, `message_unpinned`
- `org_service.py`: `plan_upgraded`, `plan_downgraded`, `subscription_cancelled`, `member_added`, `org_updated`, `org_deleted`, `join_request_sent`, `join_request_rejected`, `join_request_accepted`
