# Channel Flow — Full Code Details

## Files
- **Router:** `backend/routers/channels_router.py` (207 lines)
- **Service:** `backend/services/channel_service.py` (312 lines)
- **Models:** `Channels.py`, `Organization.py`, `Organization_members.py`, `Teams.py`, `Team_roles.py`, `Messages.py`, `Files.py`, `Notifications.py`, `PInned_messages.py`
- **Schema:** `Channels_input.py` (`channel_name, channel_mode, channel_category, description`)

---

## POST /organization/{org_id}/create_channel
**Router:** `create_channel(org_id, data: Channels_input, user, db)`

**Service:** `create_channel_service(data, org_id, user, db)`

1. `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()` — if None: 404
2. `is_owner = found_organization.owner_id == user_id`
3. `is_member = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id).first()`
4. `if not is_owner and not is_member: raise HTTPException(403, "You must be a member of this organization to create channels")`
5. Channel limit check:
```python
channel_limit = get_channel_limit(found_organization.organization_plan)  # FREE→5, PRO→None
if channel_limit is not None:
    current_count = db.query(Channels).filter(Channels.org_id == org_id).count()
    if current_count >= channel_limit:
        raise HTTPException(403, f"Free plan allows a maximum of {channel_limit} channels. Upgrade to Pro for unlimited channels.")
```
6. Name uniqueness check: `db.query(Channels).filter(Channels.org_id == org_id, Channels.channel_name == data.channel_name).first()`
7. `new_channel = Channels(channel_name=data.channel_name, channel_mode=data.channel_mode, channel_category=data.channel_category, description=data.description, org_id=org_id)`
8. `create_log(db, org_id=org_id, actor_id=user_id, action="channel_created", target_id=new_channel.channel_id, target_type="channel", metadata={"channel_name": new_channel.channel_name})`

---

## GET /organization/{org_id}/channels
**Service:** `fetch_channels_service(org_id, user, db)`

```python
found_channels = db.query(Channels).filter(Channels.org_id == org_id).all()
# Returns list of {channel_id, channel_name, channel_mode, channel_category, description, org_id, team_id, created_at}
```

---

## GET /channel/{channel_id}
**Service:** `fetch_single_channel_service(channel_id, user, db)`

1. `channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()` — if None: 404
2. Check org member
3. Returns channel info + `organization: {organization_id, organization_name, organaization_picture, organaization_tag}`

---

## PUT /channel/{channel_id}
**Router:** `update_channel(org_id, data: Channels_input, user, db)` (note: path uses `/channel/{channel_id}`, org_id is in data)

**Service:** `update_channel_service(channel_id, data, user, db)`

1. `channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()` — if None: 404
2. `organization = db.query(Organization).filter(...).first()` — if None: 404
3. **Org-level channel** (team_id is None):
   - `is_owner = organization.owner_id == user_id`
   - `org_member = db.query(Organization_members).filter(Organization_members.org_id == channel.org_id, Organization_members.memmber_id == user_id).first()`
   - `is_admin = org_member and org_member.role_user == "ADMIN"`
   - `if not is_owner and not is_admin: raise HTTPException(403, "Only organization owners and admins can update organization-level channels")`
4. **Team-level channel** (team_id is set):
   - `user_role = db.query(Team_roles).filter(Team_roles.team_id == channel.team_id, Team_roles.user_id == user_id).first()`
   - `has_permission = is_owner or (user_role and user_role.can_create_channels)`
5. Name uniqueness check (within org-level or team-level depending on channel type)

---

## DELETE /channel/{channel_id}
**Service:** `delete_channel_service(channel_id, user, db)`

Same permission model as update. Cascade deletion:
```python
# 1. Get message IDs
channel_message_ids = [row[0] for row in db.query(Messages.message_id).filter(Messages.channel_id == channel_id).all()]

# 2. Delete pinned
db.query(Pinned_messages).filter(Pinned_messages.channel_id == channel_id).delete()

# 3. Delete notifications
if channel_message_ids:
    db.query(Notifications).filter(Notifications.message_id.in_(channel_message_ids)).delete()

# 4. Orphan child messages
db.query(Messages).filter(Messages.parent_id.in_(channel_message_ids)).update({Messages.parent_id: None})

# 5. Delete messages
db.query(Messages).filter(Messages.channel_id == channel_id).delete()

# 6. Delete files
db.query(Files).filter(Files.channel_id == channel_id).delete()

# 7. Delete channel
db.delete(channel)
```

Metadata saved for undo:
```python
channel_meta = {
    "channel_name": channel.channel_name,
    "channel_mode": channel.channel_mode,
    "channel_category": channel.channel_category,
    "description": channel.description,
}
if channel.team_id:
    channel_team = db.query(Teams).filter(Teams.team_id == channel.team_id).first()
    channel_meta["team_id"] = channel.team_id
    channel_meta["team_name"] = channel_team.team_name
```
