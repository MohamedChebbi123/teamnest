# Team Flow

## Files
- `backend/routers/team_router.py` (179 lines)
- `backend/services/team_service.py` (1001 lines)
- `backend/models/Teams.py`, `Team_association.py`, `Team_roles.py`, `Organization.py`, `Organization_members.py`, `Channels.py`, `Files.py`
- `backend/schemas/team_creation.py`, `Add_members_team.py`, `Update_team_member_role.py`, `Channels_input.py`
- `backend/utils/log_handler.py` — `create_log`
- `backend/utils/plan_limits.py` — `get_channel_limit`

## Permission Model
| Action | Required Role |
|--------|--------------|
| Create team | Org OWNER or ADMIN |
| Update/Delete team | Org OWNER or ADMIN |
| Add member | Org OWNER or ADMIN (user must be org member) |
| Kick member | Org OWNER OR `can_kick_members` |
| Manage roles | Org OWNER, ADMIN, OR `can_manage_roles` |
| Create channel in team | Org OWNER OR `can_create_channels` |

## Endpoints

### POST /organization/{org_id}/create_team
**Service:** `create_team`  
Org OWNER/ADMIN only. Validates team name uniqueness within org. Creates Teams row. Creates audit log.

### GET /organization/{org_id}/teams
**Service:** `fetch_teams_service`  
Any org member can list teams.

### PUT /team/{team_id}
**Service:** `update_team_service`  
Org OWNER/ADMIN. Updates name (unique check) and description.

### DELETE /team/{team_id}
**Service:** `delete_team_service`  
Org OWNER/ADMIN. Deletes team row, creates audit log.

### POST /team/{team_id}
**Service:** `add_memebers_to_teams`  
Org OWNER/ADMIN. Validates target user is org member, not already in team. Creates Team_association + Team_roles with all permission flags.

### GET /team/{team_id}/members
**Service:** `fetch_team_members_service`  
Returns members with user info + role + all 7 permission flags.

### PUT /team/{team_id}/member/{member_user_id}/permissions
**Service:** `update_member_permissions_service`  
Updates role and all permissions. Captures old→new diff for audit log.

### PUT /team/{team_id}/member/{member_user_id}/revoke-permissions?permission_name=can_create_channels
**Service:** `revoke_permissions_from_team_memebers`  
Revokes all permissions or a specific named one. Cannot revoke org owner.

### DELETE /team/{team_id}/member/{member_user_id}
**Service:** `kick_member_service`  
Removes Team_association + Team_roles. Cannot kick org owner.

### GET /user/teams
**Service:** `fetch_user_team_service`  
Lists teams the current user belongs to.

### POST /organization/{org_id}/team/{team_id}/channels
**Service:** `create_channels_for_teams_service`  
Creates team-level channel. Enforces plan channel limit (FREE=5). Creates audit log.

### GET /organization/{org_id}/team/{team_id}/channels
**Service:** `fetch_channels_for_teams_service`  
Lists team channels. Access: org owner, org member, or team member.

### GET /organization/{org_id}/team/{team_id}/member/{user_id}
**Service:** `fetch_members_info`  
Detailed info for a specific team member (user + role + permissions).

### GET /organization/{org_id}/team/{team_id}/channel/{channel_id}/files
**Service:** `fetch_files_for_team_channel_service`  
Lists files in a team channel with sender info.

### GET /organization/{org_id}/team/{team_id}/file/{file_id}/content
**Service:** `view_pdf`  
Streams PDF from Cloudinary URL via httpx proxy. Returns StreamingResponse with inline Content-Disposition. Only PDF files allowed.
