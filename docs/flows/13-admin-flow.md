# Admin Flow

## Files
- `backend/routers/admin_router.py` (257 lines)
- `backend/models/Users.py`, `Organization.py`, `Channels.py`, `Teams.py`, `Organization_members.py`, `Refresh_tokens.py`, `Messages.py`, `Direct_messages.py`, `Group_chat_messages.py`

## Endpoints

### GET /admin/overview
**Handler:** `get_admin_overview`  
Returns platform-wide stats:
- `users_count`, `active_users_count` (status != "offline")
- `organizations_count`, `paid_orgs_count`, `free_orgs_count`
- `channels_count`
- `messages_sent` (channels + DMs + group chats)

### GET /admin/users
**Handler:** `get_admin_users`  
Lists all users ordered by `joined_at` desc. Returns full profile including: user_id, name, email, avatar, country, tag, is_verified, profile_completed, status, role, account_status, joined_at, last_login_at.

### POST /admin/users/{user_id}/ban
**Handler:** `ban_user`  
Cannot ban self or other admins. Sets `account_status="banned"`. Revokes all non-revoked refresh tokens.

### POST /admin/users/{user_id}/unban
**Handler:** `unban_user`  
Sets `account_status="active"`.

### DELETE /admin/organizations/{org_id}
**Handler:** `delete_organization`  
Deletes org by ID.

### GET /admin/organizations
**Handler:** `get_admin_organizations`  
Full org hierarchy with nested structure:
```
organizations[]
  ├── organization_id, name, picture, tag, plan, created_at
  ├── owner {user_id, first_name, last_name, email, avatar_url}
  ├── members_count, teams_count, channels_count
  ├── members[] {user_id, name, avatar, role, joined_at}
  ├── teams[]
  │   ├── team_id, name, size, created_at
  │   └── channels[] {channel_id, name, category}
  └── org_channels[] {channel_id, name, category}
```

## Helper

| Function | Purpose |
|----------|---------|
| `_require_admin(user)` | Checks `user.role == "admin"`, raises 403 |
