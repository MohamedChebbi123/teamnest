# Channel Flow

## Files
- `backend/routers/channels_router.py` (207 lines)
- `backend/services/channel_service.py` (312 lines)
- `backend/models/Channels.py`, `Organization.py`, `Organization_members.py`, `Teams.py`, `Team_roles.py`, `Messages.py`, `Files.py`, `Notifications.py`, `PInned_messages.py`
- `backend/schemas/Channels_input.py`
- `backend/utils/log_handler.py` — `create_log`
- `backend/utils/plan_limits.py` — `get_channel_limit`

## Channel Types
- **Org-level** (`team_id = None`): visible to all org members
- **Team-level** (`team_id` set): visible to team members + org owner + org admins

## Channel Modes
- `public` — anyone can read/write
- `private` — restricted access
- `announcement` — only org admins/owners or users with `can_make_announcement` can post

## Channel Categories
- `text` — standard chat
- `voice` — voice channel (WebRTC signaling)

## Endpoints

### POST /organization/{org_id}/create_channel
**Service:** `create_channel_service`  
Any org member can create. Enforces plan channel limit (FREE=5). Checks name uniqueness within org. Creates Channels row. Creates audit log.

### GET /organization/{org_id}/channels
**Service:** `fetch_channels_service`  
Lists org-level channels (team_id=null). Any org member.

### GET /channel/{channel_id}
**Service:** `fetch_single_channel_service`  
Returns channel with org info. Any org member.

### PUT /channel/{channel_id}
**Service:** `update_channel_service`  
- Org-level: only OWNER or ADMIN
- Team-level: org OWNER or user with `can_create_channels`
Checks name uniqueness.

### DELETE /channel/{channel_id}
**Service:** `delete_channel_service`  
Same permission model as update. Cascade deletes:
1. Delete pinned messages for channel
2. Delete notifications for channel messages
3. Nullify parent_id of child messages
4. Delete all messages
5. Delete all files in channel
6. Delete channel itself
Creates audit log with channel metadata (supports undo).
