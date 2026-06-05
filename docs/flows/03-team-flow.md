# Team Flow — Full Code Details

## Files
- **Router:** `backend/routers/team_router.py` (179 lines)
- **Service:** `backend/services/team_service.py` (1001 lines)
- **Models:** `Teams.py`, `Team_association.py`, `Team_roles.py`, `Organization.py`, `Organization_members.py`, `Channels.py`, `Files.py`
- **Schemas:** `team_creation.py` (`team_name, description, org_id`), `Add_members_team.py` (`user_id, role, can_create_channels, can_send_messages, can_delete_messages, can_manage_roles, can_kick_members, can_make_announcement, can_manage_tasks`), `Update_team_member_role.py` (same fields)

---

## POST /organization/{org_id}/create_team
**Router:** `create_team_endpoint(org_id, data: team_creation, user, db)`

**Service:** `create_team(data, user, db)`

1. `found_organization = db.query(Organization).filter(Organization.organization_id == data.org_id).first()` — if None: 404
2. `is_owner = db.query(Organization).filter(Organization.organization_id == data.org_id, Organization.owner_id == user_id).first()`
3. `is_admin = db.query(Organization_members).filter(Organization_members.org_id == data.org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()`
4. `if not is_owner and not is_admin: raise HTTPException(403, "Only organization owner or admin can create teams")`
5. Check existing team name: `db.query(Teams).filter(Teams.org_id == data.org_id, Teams.team_name == data.team_name).first()` — if exists: 400 "Team name already exists in this organization"
6. `new_team = Teams(team_name=data.team_name, description=data.description, org_id=data.org_id)`
7. `create_log(db, org_id=data.org_id, actor_id=user_id, action="team_created", target_id=new_team.team_id, target_type="team", metadata={"team_name": new_team.team_name})`

---

## GET /organization/{org_id}/teams
**Service:** `fetch_teams_service(org_id, user, db)`

1. Check org exists
2. `is_owner = found_organization.owner_id == user_id`
3. `is_member = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id).first()`
4. `if not is_owner and not is_member: raise HTTPException(403, "You must be a member of this organization to view teams")`
5. `found_teams = db.query(Teams).filter(Teams.org_id == org_id).all()`
6. Returns `[{team_id, team_name, description, org_id, created_at}]`

---

## PUT /team/{team_id}
**Service:** `update_team_service(team_id, data, user, db)`

Same permission check (owner or admin). If name changed, checks uniqueness within org (excluding self). Sets `team.team_name`, `team.description`.

---

## DELETE /team/{team_id}
**Service:** `delete_team_service(team_id, user, db)`

Same permission check. `create_log(db, ..., action="team_deleted")`. `db.delete(team)`, `db.commit()`.

---

## POST /team/{team_id}
**Router:** `add_members_to_team(team_id, data: Add_members_team, user, db)`

**Service:** `add_memebers_to_teams(team_id, data, user, db)` (note typo "memebers")

1. Check team + org exist
2. `is_owner = found_organization.owner_id == user_id`
3. `is_admin = db.query(Organization_members).filter(Organization_members.org_id == team.org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()`
4. `if not is_owner and not is_admin: raise HTTPException(403, "Only organization owner or admin can add members to teams")`
5. `target_user = db.query(Users).filter(Users.user_id == data.user_id).first()` — if None: 404
6. Check target is org member or org owner
7. `existing_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == data.user_id).first()` — if exists: 400 "User is already a member of this team"
8. Creates `Team_association(team_id=team_id, user_id=data.user_id)`
9. Creates `Team_roles(user_id=data.user_id, team_id=team_id, role=data.role, can_create_channels=data.can_create_channels, can_send_messages=data.can_send_messages, can_delete_messages=data.can_delete_messages, can_manage_roles=data.can_manage_roles, can_kick_members=data.can_kick_members, can_make_announcement=data.can_make_announcement, can_manage_tasks=data.can_manage_tasks)`
10. `create_log(db, ..., action="team_member_added", metadata={"team_id": ..., "team_name": ..., "role": data.role, "member_name": f"{user.first_name} {user.last_name}"})`
11. Returns `{message, user_id, team_id, role, permissions: {can_create_channels, ...}}`

---

## GET /team/{team_id}/members
**Service:** `fetch_team_members_service(team_id, user, db)`

1. Check team exists
2. `is_owner = found_organization.owner_id == user_id`
3. `is_org_member = db.query(Organization_members).filter(Organization_members.org_id == team.org_id, Organization_members.memmber_id == user_id).first()`
4. If neither: 403
5. `team_associations = db.query(Team_association).filter(Team_association.team_id == team_id).all()`
6. For each: fetch Users + Team_roles
7. Returns `{team_id, team_name, members: [{user_id, first_name, last_name, email, avatar_url, user_tag, phone_number, country, role, permissions: {7 flags}}]}`

---

## PUT /team/{team_id}/member/{member_user_id}/permissions
**Service:** `update_member_permissions_service(team_id, member_user_id, data, user, db)`

1. Check team + org exist
2. `is_owner = found_organization.owner_id == user_id`
3. `is_admin = db.query(Organization_members).filter(...role_user=="ADMIN")`
4. `user_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first()`
5. `has_manage_permission = user_role and user_role.can_manage_roles`
6. `if not is_owner and not is_admin and not has_manage_permission: raise HTTPException(403, "You don't have permission to manage roles")`
7. Captures `old_permissions` dict with all 7 flags + role
8. Sets all new values from `data`
9. Builds `changes = {k: {"from": old_value, "to": new_value} for k in old_permissions if old != new}`
10. `create_log(db, ..., action="team_member_permissions_updated", metadata={"changes": changes, ...})`

---

## PUT /team/{team_id}/member/{member_user_id}/revoke-permissions?permission_name=can_create_channels
**Service:** `revoke_permissions_from_team_memebers(team_id, target_user_id, user, db, permission_name=None)`

1. Check team + org, permission (owner or can_manage_roles)
2. Check target is team member
3. Cannot revoke from org owner
4. `permission_fields = {"can_create_channels", "can_send_messages", "can_delete_messages", "can_manage_roles", "can_kick_members", "can_make_announcement"}`
5. If `permission_name`: validates it's in the set, sets `setattr(target_role, permission_name, False)`
6. If `permission_name` is None: sets ALL to False + role to "MEMBER"

---

## DELETE /team/{team_id}/member/{member_user_id}
**Service:** `kick_member_service(team_id, member_user_id, user, db)`

1. Check team + org exist
2. `is_owner = found_organization.owner_id == user_id`
3. `user_role = db.query(Team_roles).filter(...).first()`
4. `has_kick_permission = user_role and user_role.can_kick_members`
5. `if not is_owner and not has_kick_permission: raise HTTPException(403, "You don't have permission to kick members")`
6. `if found_organization.owner_id == member_user_id: raise HTTPException(403, "Cannot kick organization owner")`
7. Check target is team member
8. Deletes Team_roles + Team_association

---

## GET /user/teams
**Service:** `fetch_user_team_service(user, db)`

```python
results = db.query(Teams).join(
    Team_association, Teams.team_id == Team_association.team_id
).filter(Team_association.user_id == user_id).all()
```

---

## POST /organization/{org_id}/team/{team_id}/channels
**Service:** `create_channels_for_teams_service(org_id, team_id, data, user, db)`

1. Check team belongs to org
2. `is_owner = found_organization.owner_id == user_id`
3. `user_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first()`
4. `has_permission = is_owner or (user_role and user_role.can_create_channels)`
5. Check channel name uniqueness within team
6. Channel limit check: `get_channel_limit(found_organization.organization_plan)` — FREE=5, checks count

---

## GET /organization/{org_id}/team/{team_id}/channel/{channel_id}/files
**Service:** `fetch_files_for_team_channel_service(org_id, team_id, channel_id, user, db)`

```python
files = db.query(Files, Users).join(
    Users, Files.sender_id == Users.user_id
).filter(
    Files.team_id == team_id,
    Files.channel_id == channel_id,
    Files.is_deleted == False
).order_by(Files.sent_at.asc()).all()
```

---

## GET /organization/{org_id}/team/{team_id}/file/{file_id}/content
**Service:** `view_pdf(org_id, team_id, file_id, user, db)`

1. Access check: owner, admin, or team member
2. `file = db.query(Files).filter(Files.id == file_id, Files.team_id == team_id, Files.is_deleted == False).first()`
3. `if os.path.splitext(file.file_name)[1].lower() != ".pdf": raise HTTPException(400, "Only PDF files can be viewed inline")`
4. Uses `httpx.Client(timeout=30.0, follow_redirects=True)` to stream from Cloudinary
5. Returns `StreamingResponse(iterator(), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{safe_name}"; filename*=UTF-8\'\'{quoted_name}', "X-Content-Type-Options": "nosniff", "Content-Length": ...})`

---

## GET /organization/{org_id}/team/{team_id}/member/{user_id}
**Service:** `fetch_members_info(org_id, team_id, target_user_id, user, db)`

Access: org owner, admin, or team member. Returns `{user: {...}, organization_id, team: {team_id, team_name, role, permissions: {...}}}`.
