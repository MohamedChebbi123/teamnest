# Logs Flow — Every Line of Code

## File: `backend/models/Logs.py` (19 lines)

| Lines | Code |
|-------|------|
| 7 | `class Logs(Base):` |
| 8 | `__tablename__="logs"` |
| 9 | `id=Column(Integer,primary_key=True)` |
| 10 | `org_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False)` |
| 11 | `actor_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)` |
| 12 | `action=Column(String,nullable=False)` |
| 13 | `target_id=Column(Integer,nullable=True)` |
| 14 | `target_type=Column(String,nullable=True)` |
| 15 | `log_metadata=Column(Text,nullable=True)` — stores JSON string |
| 16 | `created_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 18 | `organization=relationship("Organization", overlaps="logs")` |
| 19 | `actor=relationship("Users",backref="logs")` |

## File: `backend/utils/log_handler.py` (17 lines)

| Lines | Code |
|-------|------|
| 6-17 | `def create_log(db: Session, org_id: int, actor_id: int, action: str, target_id: int = None, target_type: str = None, metadata: dict = None):` / `log = Logs(org_id=org_id, actor_id=actor_id, action=action, target_id=target_id, target_type=target_type, log_metadata=json.dumps(metadata) if metadata else None)` / `db.add(log); db.commit(); return log` |

## File: `backend/routers/logs_router.py` (320 lines)

### Constants & Imports (lines 1-31)

| Lines | Code |
|-------|------|
| 1-17 | Imports: `APIRouter, Depends`, `Session`, `connect_databse`, `HTTPException`, `Logs`, `Organization`, `Organization_members`, `Users`, `Channels`, `Teams`, `Team_association`, `Team_roles`, `Tasks`, `Pinned_messages`, `create_log`, `current_user`, `json` |
| 19 | `router = APIRouter()` |
| 21-31 | `REVERSIBLE_ACTIONS = {"channel_created", "channel_deleted", "team_created", "team_member_added", "team_member_kicked", "team_member_permissions_updated", "task_created", "message_pinned", "message_unpinned"}` — 9 reversible action types |

### `GET /organization/{org_id}/logs` (lines 34-79)

| Lines | Code |
|-------|------|
| 34-39 | `@router.get("/organization/{org_id}/logs")` / `async def get_organization_logs(org_id: int, user=Depends(current_user), db=Depends(connect_databse)):` |
| 40 | `user_id = user.user_id` |
| 42-44 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if not organization: raise HTTPException(404, "Organization not found")` |
| 46-53 | `if organization.owner_id != user_id:` — checks ORG_OWNER or user must be an ADMIN member; `member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id, Organization_members.role_user.in_(["OWNER", "ADMIN"])).first()` / `if not member: raise HTTPException(403, "Only owners and admins can view logs")` |
| 55-59 | `logs = db.query(Logs, Users).join(Users, Logs.actor_id == Users.user_id).filter(Logs.org_id == org_id).order_by(Logs.created_at.desc()).all()` |
| 61-79 | Returns `[{id, action, target_id, target_type, metadata: json.loads(log.log_metadata), created_at: .isoformat(), reversible: action in REVERSIBLE_ACTIONS, actor: {user_id, first_name, last_name, avatar_url, user_tag}}]` |

### `POST /organization/{org_id}/logs/{log_id}/undo` (lines 82-320)

| Lines | Code |
|-------|------|
| 82-88 | `@router.post("/organization/{org_id}/logs/{log_id}/undo")` / `async def undo_log_action(org_id: int, log_id: int, user=Depends(current_user), db=Depends(connect_databse)):` |
| 89 | `user_id = user.user_id` |
| 91-93 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if not organization: raise HTTPException(404, "Organization not found")` |
| 96-97 | `if organization.owner_id != user_id: raise HTTPException(403, "Only the organization owner can undo actions")` |
| 99-101 | `log = db.query(Logs).filter(Logs.id == log_id, Logs.org_id == org_id).first()` / `if not log: raise HTTPException(404, "Log entry not found")` |
| 103-104 | `if log.action not in REVERSIBLE_ACTIONS: raise HTTPException(400, "This action cannot be undone")` |
| 106 | `meta = json.loads(log.log_metadata) if log.log_metadata else {}` |

### Undo: `channel_created` → delete channel (lines 108-123)

| Lines | Code |
|-------|------|
| 109-112 | `if log.action == "channel_created": channel = db.query(Channels).filter(Channels.channel_id == log.target_id).first()` / `if not channel: raise HTTPException(404, "Channel no longer exists")` |
| 113-119 | `channel_name = channel.channel_name` / `undo_meta = {"channel_name": channel_name, "undone": True}` / `if channel.team_id: team = db.query(Teams).filter(Teams.team_id == channel.team_id).first(); if team: undo_meta["team_id"] = channel.team_id; undo_meta["team_name"] = team.team_name` |
| 120-122 | `db.delete(channel); db.commit()` / `create_log(db, ..., action="channel_deleted", ...)` |
| 123 | `return {"message": f'Channel "{channel_name}" has been deleted (undo)'}` |

### Undo: `channel_deleted` → recreate channel (lines 125-172)

| Lines | Code |
|-------|------|
| 126-131 | `if log.action == "channel_deleted": channel_name = meta.get("channel_name"); team_id = meta.get("team_id"); channel_mode = meta.get("channel_mode") or ("teambased" if team_id else "orgbased"); channel_category = meta.get("channel_category") or "text"; description = meta.get("description")` |
| 133-134 | `if not channel_name: raise HTTPException(400, "Missing channel info in log")` |
| 136-148 | `if team_id: conflict = db.query(Channels).filter(Channels.team_id == team_id, Channels.channel_name == channel_name).first()` / `if not db.query(Teams).filter(Teams.team_id == team_id).first(): raise HTTPException(404, "Team no longer exists")` / `else: conflict = db.query(Channels).filter(Channels.org_id == org_id, Channels.team_id.is_(None), Channels.channel_name == channel_name).first()` |
| 150-151 | `if conflict: raise HTTPException(400, f'A channel named "{channel_name}" already exists')` |
| 153-163 | `restored = Channels(channel_name=channel_name, channel_mode=channel_mode, channel_category=channel_category, description=description, org_id=org_id, team_id=team_id); db.add(restored); db.commit(); db.refresh(restored)` |
| 165-171 | `undo_meta = {"channel_name": channel_name}` / `if team_id: undo_meta["team_id"] = team_id; undo_meta["team_name"] = meta.get("team_name")` / `undo_meta["undone"] = True` / `create_log(db, ..., action="channel_created", ...)` |
| 172 | `return {"message": f'Channel "{channel_name}" has been restored (undo)'}` |

### Undo: `team_created` → delete team (lines 174-183)

| Lines | Code |
|-------|------|
| 175-179 | `if log.action == "team_created": team = db.query(Teams).filter(Teams.team_id == log.target_id).first()` / `if not team: raise HTTPException(404, "Team no longer exists")` / `team_name = team.team_name` |
| 180-182 | `db.delete(team); db.commit()` / `create_log(db, ..., action="team_deleted", metadata={"team_name": team_name, "undone": True})` |
| 183 | `return {"message": f'Team "{team_name}" has been deleted (undo)'}` |

### Undo: `team_member_added` → kick member (lines 185-210)

| Lines | Code |
|-------|------|
| 186-190 | `if log.action == "team_member_added": team_id = meta.get("team_id"); member_user_id = log.target_id` / `if not team_id: raise HTTPException(400, "Missing team info in log")` |
| 191-193 | `team = db.query(Teams).filter(Teams.team_id == team_id).first()` / `if not team: raise HTTPException(404, "Team no longer exists")` |
| 194-206 | `association = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == member_user_id).first()` / `if not association: raise HTTPException(404, "Member is no longer in this team")` / `role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == member_user_id).first()` / `if role: db.delete(role)` / `db.delete(association); db.commit()` |
| 208-210 | `member_name = meta.get("member_name", str(member_user_id))` / `create_log(db, ..., action="team_member_kicked", ...)` / `return {"message": f"{member_name} has been removed from team ..."}` |

### Undo: `team_member_kicked` → re-add member (lines 212-243)

| Lines | Code |
|-------|------|
| 213-217 | `if log.action == "team_member_kicked": team_id = meta.get("team_id"); member_user_id = log.target_id` / `if not team_id: raise HTTPException(400, "Missing team info in log")` |
| 218-220 | `team = db.query(Teams).filter(Teams.team_id == team_id).first()` / `if not team: raise HTTPException(404, "Team no longer exists")` |
| 221-226 | `existing = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == member_user_id).first()` / `if existing: raise HTTPException(400, "Member is already back in the team")` |
| 227-239 | `db.add(Team_association(team_id=team_id, user_id=member_user_id))` / `db.add(Team_roles(user_id=member_user_id, team_id=team_id, role="MEMBER", can_create_channels=False, can_send_messages=True, can_delete_messages=False, can_manage_roles=False, can_kick_members=False, can_make_announcement=False, can_manage_tasks=False))` / `db.commit()` |
| 241-243 | `member_name = meta.get("member_name", str(member_user_id))` / `create_log(db, ..., action="team_member_added", ...)` / `return {"message": f"{member_name} has been re-added ..."}` |

### Undo: `task_created` → soft-delete task (lines 245-254)

| Lines | Code |
|-------|------|
| 246-249 | `if log.action == "task_created": task = db.query(Tasks).filter(Tasks.id == log.target_id, Tasks.is_deleted == False).first()` / `if not task: raise HTTPException(404, "Task no longer exists")` |
| 250-253 | `task_title = task.title; task.is_deleted = True; db.commit()` / `create_log(db, ..., action="task_deleted", ...)` |
| 254 | `return {"message": f'Task "{task_title}" has been deleted (undo)'}` |

### Undo: `message_pinned` → unpin message (lines 256-267)

| Lines | Code |
|-------|------|
| 257-262 | `if log.action == "message_pinned": pinned = db.query(Pinned_messages).filter(Pinned_messages.message_id == log.target_id).first()` / `if not pinned: raise HTTPException(404, "Message is no longer pinned")` |
| 263-266 | `channel_id = meta.get("channel_id")` / `db.delete(pinned); db.commit()` / `create_log(db, ..., action="message_unpinned", ...)` |
| 267 | `return {"message": "Message has been unpinned (undo)"}` |

### Undo: `message_unpinned` → re-pin message (lines 269-287)

| Lines | Code |
|-------|------|
| 270-277 | `if log.action == "message_unpinned": channel_id = meta.get("channel_id")` / `if not channel_id: raise HTTPException(400, "Missing channel info in log")` / `already_pinned = db.query(Pinned_messages).filter(Pinned_messages.message_id == log.target_id, Pinned_messages.channel_id == channel_id).first()` / `if already_pinned: raise HTTPException(400, "Message is already pinned")` |
| 280-287 | `db.add(Pinned_messages(message_id=log.target_id, channel_id=channel_id, pinned_by=user_id)); db.commit()` / `create_log(db, ..., action="message_pinned", ...)` / `return {"message": "Message has been re-pinned (undo)"}` |

### Undo: `team_member_permissions_updated` → revert permissions (lines 289-320)

| Lines | Code |
|-------|------|
| 290-297 | `if log.action == "team_member_permissions_updated": team_id = meta.get("team_id"); member_user_id = log.target_id; changes = meta.get("changes", {})` / `if not team_id: raise HTTPException(400, "Missing team info in log")` / `if not changes: raise HTTPException(400, "No permission changes to revert")` |
| 298-306 | `team = db.query(Teams).filter(Teams.team_id == team_id).first()` / `if not team: raise HTTPException(404, "Team no longer exists")` / `member_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == member_user_id).first()` / `if not member_role: raise HTTPException(404, "Member role not found")` |
| 308-315 | `reverse_changes = {}` / `for key, diff in changes.items(): old_val = diff.get("from"); new_val = diff.get("to")` / `if hasattr(member_role, key): setattr(member_role, key, old_val); reverse_changes[key] = {"from": new_val, "to": old_val}` |
| 317-320 | `db.commit()` / `member_name = meta.get("member_name", str(member_user_id))` / `create_log(db, ..., action="team_member_permissions_updated", metadata={"team_id": ..., "team_name": ..., "role": ..., "member_name": ..., "changes": reverse_changes, "undone": True})` / `return {"message": f"Permissions for {member_name} have been reverted (undo)"}` |
