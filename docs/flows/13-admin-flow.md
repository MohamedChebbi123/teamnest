# Admin Flow — Every Line of Code

## File: `backend/routers/admin_router.py` (257 lines)

| Lines | Code |
|-------|------|
| 1-16 | Imports: `APIRouter, Depends, HTTPException`, `Session`, `func`, `connect_databse`, `Users`, `Organization`, `Channels`, `Teams`, `Organization_members`, `Refresh_tokens`, `Messages`, `Direct_messages`, `Group_chat_messages`, `current_user`, `datetime, UTC` |
| 17 | `router = APIRouter()` |

### `_require_admin` helper (lines 20-23)

| Lines | Code |
|-------|------|
| 20-23 | `def _require_admin(user: Users) -> Users:` / `if user.role != "admin": raise HTTPException(status_code=403, detail="Admin access required")` / `return user` |

### `GET /admin/overview` (lines 26-55)

| Lines | Code |
|-------|------|
| 26-31 | `@router.get("/admin/overview")` / `async def get_admin_overview(user=Depends(current_user), db=Depends(connect_databse)):` / `_require_admin(user)` |
| 33 | `users_count = db.query(func.count(Users.user_id)).scalar() or 0` |
| 34 | `active_users_count = db.query(func.count(Users.user_id)).filter(Users.status != "offline").scalar() or 0` |
| 35 | `orgs_count = db.query(func.count(Organization.organization_id)).scalar() or 0` |
| 36-38 | `paid_orgs_count = db.query(func.count(Organization.organization_id)).filter(func.upper(func.coalesce(Organization.organization_plan, "FREE")) == "PRO").scalar() or 0` |
| 39 | `free_orgs_count = max(0, orgs_count - paid_orgs_count)` |
| 40 | `channels_count = db.query(func.count(Channels.channel_id)).scalar() or 0` |
| 42-45 | `channel_msgs = db.query(func.count(Messages.message_id)).scalar() or 0` / `direct_msgs = db.query(func.count(Direct_messages.id)).scalar() or 0` / `group_msgs = db.query(func.count(Group_chat_messages.id)).scalar() or 0` / `messages_sent = channel_msgs + direct_msgs + group_msgs` |
| 47-55 | Returns `{users_count, active_users_count, organizations_count, paid_orgs_count, free_orgs_count, channels_count, messages_sent}` |

### `GET /admin/users` (lines 58-84)

| Lines | Code |
|-------|------|
| 58-63 | `@router.get("/admin/users")` / `async def get_admin_users(user=Depends(current_user), db=Depends(connect_databse)):` / `_require_admin(user)` |
| 65 | `rows = db.query(Users).order_by(Users.joined_at.desc()).all()` |
| 66-84 | Returns `[{user_id, first_name, last_name, email, avatar_url, country, user_tag, is_verified, profile_completed, status, role, account_status, joined_at.isoformat(), last_login_at.isoformat()}]` |

### `POST /admin/users/{target_user_id}/ban` (lines 87-112)

| Lines | Code |
|-------|------|
| 87-92 | `@router.post("/admin/users/{target_user_id}/ban")` / `async def ban_user(target_user_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `_require_admin(user)` |
| 94-95 | `if target_user_id == user.user_id: raise HTTPException(400, "You cannot ban yourself")` |
| 97-101 | `target = db.query(Users).filter(Users.user_id == target_user_id).first()` / `if not target: raise HTTPException(404, "User not found")` / `if target.role == "admin": raise HTTPException(400, "Cannot ban another administrator")` |
| 103 | `target.account_status = "banned"` |
| 105-109 | `now = datetime.now(UTC)` / `db.query(Refresh_tokens).filter(Refresh_tokens.user_id == target_user_id, Refresh_tokens.revoked_at.is_(None)).update({Refresh_tokens.revoked_at: now})` — revokes all refresh tokens |
| 111-112 | `db.commit()` / `return {"message": "User banned", "user_id": target_user_id, "account_status": target.account_status}` |

### `POST /admin/users/{target_user_id}/unban` (lines 115-128)

| Lines | Code |
|-------|------|
| 115-121 | `@router.post("/admin/users/{target_user_id}/unban")` / `async def unban_user(target_user_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `_require_admin(user)` |
| 122-124 | `target = db.query(Users).filter(Users.user_id == target_user_id).first()` / `if not target: raise HTTPException(404, "User not found")` |
| 126-128 | `target.account_status = "active"; db.commit()` / `return {"message": "User unbanned", "user_id": target_user_id, "account_status": target.account_status}` |

### `DELETE /admin/organizations/{org_id}` (lines 131-144)

| Lines | Code |
|-------|------|
| 131-137 | `@router.delete("/admin/organizations/{org_id}")` / `async def delete_organization(org_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `_require_admin(user)` |
| 138-140 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if not org: raise HTTPException(404, "Organization not found")` |
| 142-144 | `db.delete(org); db.commit()` / `return {"message": "Organization deleted", "organization_id": org_id}` |

### `GET /admin/organizations` (lines 147-257)

| Lines | Code |
|-------|------|
| 147-152 | `@router.get("/admin/organizations")` / `async def get_admin_organizations(user=Depends(current_user), db=Depends(connect_databse)):` / `_require_admin(user)` |
| 154 | `orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()` |
| 155 | `org_ids = [o.organization_id for o in orgs]` |
| 157-158 | `teams = db.query(Teams).filter(Teams.org_id.in_(org_ids)).all() if org_ids else []` |
| 160-162 | `channels = db.query(Channels).filter(Channels.org_id.in_(org_ids)).all() if org_ids else []` |
| 163-170 | `members = db.query(Organization_members, Users).join(Users, Organization_members.memmber_id == Users.user_id).filter(Organization_members.org_id.in_(org_ids)).all() if org_ids else []` |
| 171-178 | `owners = {u.user_id: u for u in (db.query(Users).filter(Users.user_id.in_([o.owner_id for o in orgs])).all() if orgs else [])}` |
| 180-182 | `teams_by_org: dict[int, list] = {}` / `for t in teams: teams_by_org.setdefault(t.org_id, []).append(t)` |
| 184-190 | `channels_by_team: dict[int, list] = {}` / `channels_by_org_root: dict[int, list] = {}` / `for c in channels: if c.team_id: channels_by_team.setdefault(c.team_id, []).append(c); else: channels_by_org_root.setdefault(c.org_id, []).append(c)` |
| 192-201 | `members_by_org: dict[int, list] = {}` / `for m, u in members: members_by_org.setdefault(m.org_id, []).append({user_id, first_name, last_name, avatar_url, role: m.role_user, joined_at.isoformat()})` |
| 203-255 | Builds nested result per org: `for o in orgs: owner = owners.get(o.owner_id); org_teams = teams_by_org.get(...); org_members = members_by_org.get(...)` / `team_nodes = [{"team_id", "team_name", "team_size", "created_at", "channels": [...]} for t in org_teams]` / `org_root_channels = [{"channel_id", "channel_name", "channel_category"} for c ...]` / `result.append({organization_id, organization_name, organization_picture, organization_tag, organization_plan, created_at, owner: {user_id, first_name, last_name, email, avatar_url}, members_count, teams_count, channels_count, members, teams, org_channels})` |
| 257 | `return result` |
