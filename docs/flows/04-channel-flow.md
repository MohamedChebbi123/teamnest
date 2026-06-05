# Channel Flow — Every Line of Code

## File: `backend/models/Channels.py` (20 lines)

| Lines | Code |
|-------|------|
| 6-7 | `class Channels(Base):` / `__tablename__="channels"` |
| 8 | `channel_id=Column(Integer,primary_key=True)` |
| 9 | `channel_name=Column(String,nullable=False)` |
| 10 | `channel_mode = Column(String, nullable=False)` |
| 11 | `channel_category = Column(String, nullable=False)` |
| 12 | `description=Column(Text,nullable=True)` |
| 13 | `created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 14 | `team_id=Column(Integer,ForeignKey("teams.team_id"),nullable=True)` |
| 15 | `org_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False)` |
| 17 | `team = relationship("Teams", back_populates="channels")` |
| 18 | `organization = relationship("Organization", back_populates="channels")` |
| 19 | `messages = relationship("Messages", back_populates="channel", cascade="all, delete-orphan")` |
| 20 | `files = relationship("Files", back_populates="channel", cascade="all, delete-orphan")` |

## File: `backend/models/Messages.py` (19 lines)

| Lines | Code |
|-------|------|
| 6-7 | `class Messages(Base):` / `__tablename__="messages"` |
| 8 | `message_id=Column(Integer,primary_key=True)` |
| 9 | `message_content=Column(Text,nullable=False)` |
| 10 | `sender_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)` |
| 11 | `channel_id=Column(Integer,ForeignKey("channels.channel_id"),nullable=False)` |
| 12 | `is_deleted=Column(Boolean,default=False)` |
| 13 | `parent_id=Column(Integer,ForeignKey("messages.message_id"),nullable=True)` |
| 14 | `edited_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 15 | `sent_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 16 | `parent_message = relationship("Messages", remote_side=[message_id], backref="replies")` |
| 17 | `notifications = relationship("Notifications", back_populates="message", cascade="all, delete-orphan")` |
| 18 | `channel = relationship("Channels", back_populates="messages")` |
| 19 | `pinned_entries = relationship("Pinned_messages", backref="pinned_message_ref", cascade="all, delete-orphan", overlaps="message,pinned_messages")` |

## File: `backend/models/PInned_messages.py` (18 lines)

| Lines | Code |
|-------|------|
| 7-8 | `class Pinned_messages(Base):` / `__tablename__="pinned_messages"` |
| 10 | `id=Column(Integer,primary_key=True)` |
| 11 | `message_id=Column(Integer,ForeignKey("messages.message_id"),nullable=False)` |
| 12 | `channel_id=Column(Integer,ForeignKey("channels.channel_id"),nullable=False)` |
| 13 | `pinned_by=Column(Integer,ForeignKey("users.user_id"),nullable=False)` |
| 14 | `pinned_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 16 | `message=relationship("Messages", overlaps="pinned_entries,pinned_message_ref")` |
| 17 | `channel=relationship("Channels", backref=backref("pinned_messages", cascade="all, delete-orphan"))` |
| 18 | `user=relationship("Users",backref="pinned_messages")` |

## File: `backend/models/Notifications.py` (19 lines)

| Lines | Code |
|-------|------|
| 7-8 | `class Notifications(Base):` / `__tablename__="notifications"` |
| 9 | `id=Column(Integer,primary_key=True)` |
| 10 | `user_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)` |
| 11 | `type= Column(String, nullable=False)` |
| 12 | `message_id=Column(Integer,ForeignKey("messages.message_id"),nullable=True)` |
| 13 | `dm_message_id=Column(Integer,ForeignKey("direct_messages.id"),nullable=True)` |
| 14 | `is_seen=Column(Boolean,default=False)` |
| 15 | `created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 17 | `user = relationship("Users", back_populates="notifications")` |
| 18 | `message = relationship("Messages", back_populates="notifications")` |
| 19 | `dm_message = relationship("Direct_messages", back_populates="notifications")` |

## File: `backend/routers/channels_router.py` (207 lines)

| Lines | Code |
|-------|------|
| 1-31 | Imports: `from services.channel_service import (create_channel_service, fetch_channels_service, fetch_single_channel_service, update_channel_service, delete_channel_service)` / `from services.message_service import (fetch_message_service, edit_message_service, delete_message_service, send_messages_realtime, notifications_ws_endpoint, pin_message_service, unpin_message_service, fetch_pinned_messages_service, search_messages_service, fetch_user_notifications_service, mark_notifications_seen_service, fetch_voice_participants_service, voice_websocket_endpoint)` / `from schemas.Channels_input import Channels_input` / `from schemas.Message_edit_input import Message_edit_input` / `router = APIRouter()` |
| 34-41 | `@router.post("/organization/{org_id}/create_channel")` / `async def create_channel(org_id: int, data: Channels_input, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return create_channel_service(data, org_id, user, db)` |
| 44-50 | `@router.get("/organization/{org_id}/channels")` / `async def get_channels(org_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_channels_service(org_id, user, db)` |
| 53-59 | `@router.get("/channel/{channel_id}")` / `async def get_channel(channel_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_single_channel_service(channel_id, user, db)` |
| 62-69 | `@router.put("/channel/{channel_id}")` / `async def update_channel(channel_id: int, data: Channels_input, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return update_channel_service(channel_id, data, user, db)` |
| 72-78 | `@router.delete("/channel/{channel_id}")` / `async def delete_channel(channel_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return delete_channel_service(channel_id, user, db)` |
| 81-90 | `@router.get("/organization/{org_id}/channel/{channel_id}/messages")` / `async def get_messages(channel_id: int, org_id: int, limit: int \| None = Query(None), offset: int \| None = Query(None), user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_message_service(channel_id, org_id, user, db, limit=limit, offset=offset)` |
| 93-100 | `@router.put("/message/{message_id}")` / `async def edit_message(message_id: int, data: Message_edit_input, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return edit_message_service(message_id, data, user, db)` |
| 103-109 | `@router.delete("/message/{message_id}")` / `async def delete_message(message_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return delete_message_service(message_id, user, db)` |
| 112-119 | `@router.post("/organization/{org_id}/message/{message_id}/pin")` / `async def pin_message(message_id: int, org_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return pin_message_service(message_id, org_id, user, db)` |
| 122-129 | `@router.delete("/organization/{org_id}/message/{message_id}/unpin")` / `async def unpin_message(message_id: int, org_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return unpin_message_service(message_id, org_id, user, db)` |
| 132-139 | `@router.get("/organization/{org_id}/channel/{channel_id}/pinned")` / `async def get_pinned_messages(channel_id: int, org_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_pinned_messages_service(channel_id, org_id, user, db)` |
| 142-152 | `@router.get("/organization/{org_id}/channel/{channel_id}/messages/search")` / `async def search_messages(channel_id: int, org_id: int, q: str = Query(""), limit: int \| None = Query(None), offset: int \| None = Query(None), user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return search_messages_service(channel_id, org_id, q, user, db, limit=limit, offset=offset)` |
| 155-162 | `@router.websocket("/mesages/{channel_id}")` / `async def websocket_handler(websocket: WebSocket, channel_id: int, token: str = Query(...), org_id: int = Query(...)):` / `return await send_messages_realtime(websocket, channel_id, f"Bearer {token}", org_id)` |
| 165-170 | `@router.get("/user/notifications")` / `async def get_user_notifications(user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_user_notifications_service(user, db)` |
| 173-179 | `@router.post("/user/notifications/seen")` / `async def mark_notifications_seen(notification_ids: list[int] \| None = None, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return mark_notifications_seen_service(user, db, notification_ids)` |
| 182-187 | `@router.websocket("/ws/notifications")` / `async def notifications_websocket_handler(websocket: WebSocket, token: str = Query(...)):` / `return await notifications_ws_endpoint(websocket, f"Bearer {token}")` |
| 190-197 | `@router.get("/voice/{channel_id}/participants")` / `async def get_voice_participants(channel_id: int, org_id: int = Query(...), user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_voice_participants_service(channel_id, org_id, user, db)` |
| 200-207 | `@router.websocket("/voice/{channel_id}")` / `async def voice_ws(websocket: WebSocket, channel_id: int, authorization: str = Query(...), org_id: int = Query(...)):` / `return await voice_websocket_endpoint(websocket, channel_id, authorization, org_id)` |

## File: `backend/services/channel_service.py` (312 lines)

### `create_channel_service` (lines 18-78)
| Line | Code |
|------|------|
| 19 | `user_id = user.user_id` |
| 21 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()` |
| 23-24 | `if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 26 | `is_owner = found_organization.owner_id == user_id` |
| 27-30 | `is_member = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id).first()` |
| 32-33 | `if not is_owner and not is_member: raise HTTPException(status_code=403, detail="You must be a member of this organization to create channels")` |
| 35 | `channel_limit = get_channel_limit(found_organization.organization_plan)` |
| 36-42 | `if channel_limit is not None: current_count = db.query(Channels).filter(Channels.org_id == org_id).count(); if current_count >= channel_limit: raise HTTPException(status_code=403, detail=f"Free plan allows a maximum of {channel_limit} channels. Upgrade to Pro for unlimited channels.")` |
| 44-47 | `existing_channel = db.query(Channels).filter(Channels.org_id == org_id, Channels.channel_name == data.channel_name).first()` |
| 49-50 | `if existing_channel: raise HTTPException(status_code=400, detail="A channel with this name already exists in this organization")` |
| 52-58 | `new_channel = Channels(channel_name=data.channel_name, channel_mode=data.channel_mode, channel_category=data.channel_category, description=data.description, org_id=org_id)` |
| 60-62 | `db.add(new_channel); db.commit(); db.refresh(new_channel)` |
| 64 | `create_log(db, org_id=org_id, actor_id=user_id, action="channel_created", target_id=new_channel.channel_id, target_type="channel", metadata={"channel_name": new_channel.channel_name})` |
| 66-78 | Returns `{"message": "Channel created successfully", "channel": {"channel_id": ..., "channel_name": ..., "channel_mode": ..., "channel_category": ..., "description": ..., "org_id": ..., "team_id": ..., "created_at": ...}}` |

### `fetch_channels_service` (lines 81-112)
| Line | Code |
|------|------|
| 82 | `user_id = user.user_id` |
| 84 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()` |
| 86-87 | `if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 89 | `is_owner = found_organization.owner_id == user_id` |
| 90-93 | `is_member = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id).first()` |
| 95-96 | `if not is_owner and not is_member: raise HTTPException(status_code=403, detail="You must be a member of this organization to view channels")` |
| 98 | `found_channels = db.query(Channels).filter(Channels.org_id == org_id).all()` |
| 100-112 | Returns `[{"channel_id": ..., "channel_name": ..., "channel_mode": ..., "channel_category": ..., "description": ..., "org_id": ..., "team_id": ..., "created_at": ...} for channel in found_channels]` |

### `fetch_single_channel_service` (lines 115-151)
| Line | Code |
|------|------|
| 116 | `user_id = user.user_id` |
| 118 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()` |
| 120-121 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found")` |
| 123 | `found_organization = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()` |
| 125-126 | `if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 128 | `is_owner = found_organization.owner_id == user_id` |
| 129-132 | `is_member = db.query(Organization_members).filter(Organization_members.org_id == channel.org_id, Organization_members.memmber_id == user_id).first()` |
| 134-135 | `if not is_owner and not is_member: raise HTTPException(status_code=403, detail="You must be a member of this organization to view this channel")` |
| 137-151 | Returns `{"channel_id": ..., "channel_name": ..., "channel_mode": ..., "channel_category": ..., "description": ..., "org_id": ..., "created_at": ..., "organization": {"organization_id": ..., "organization_name": ..., "organaization_picture": ..., "organaization_tag": ...}}` |

### `update_channel_service` (lines 154-237)
| Line | Code |
|------|------|
| 155 | `user_id = user.user_id` |
| 157 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()` |
| 159-160 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found")` |
| 162 | `organization = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()` |
| 164-165 | `if not organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 167-181 | **Org-level (team_id is None):** `is_owner = organization.owner_id == user_id` / `org_member = db.query(Organization_members).filter(Organization_members.org_id == channel.org_id, Organization_members.memmber_id == user_id).first()` / `is_admin = org_member and org_member.role_user == "ADMIN"` / `if not is_owner and not is_admin: raise HTTPException(status_code=403, detail="Only organization owners and admins can update organization-level channels")` |
| 182-196 | **Team-level (team_id is not None):** `is_owner = organization.owner_id == user_id` / `user_role = db.query(Team_roles).filter(Team_roles.team_id == channel.team_id, Team_roles.user_id == user_id).first()` / `has_permission = is_owner or (user_role and user_role.can_create_channels)` / `if not has_permission: raise HTTPException(status_code=403, detail="You don't have permission to update channels in this team")` |
| 198-213 | **Duplicate name check:** `if data.channel_name != channel.channel_name:` — queries by org_id first; if team_id exists, queries by team_id instead; `if existing_channel: raise HTTPException(status_code=400, detail="A channel with this name already exists")` |
| 215-218 | `channel.channel_name = data.channel_name; channel.channel_mode = data.channel_mode; channel.channel_category = data.channel_category; channel.description = data.description` |
| 220-221 | `db.commit(); db.refresh(channel)` |
| 223 | `create_log(db, org_id=channel.org_id, actor_id=user_id, action="channel_updated", target_id=channel.channel_id, target_type="channel", metadata={"channel_name": channel.channel_name})` |
| 225-237 | Returns `{"message": "Channel updated successfully", "channel": {"channel_id": ..., "channel_name": ..., "channel_mode": ..., "channel_category": ..., "description": ..., "org_id": ..., "team_id": ..., "created_at": ...}}` |

### `delete_channel_service` (lines 240-312)
| Line | Code |
|------|------|
| 241 | `user_id = user.user_id` |
| 243 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()` |
| 245-246 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found")` |
| 248 | `organization = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()` |
| 250-251 | `if not organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 253-267 | **Org-level:** `is_owner = organization.owner_id == user_id` / `org_member = db.query(Organization_members).filter(Organization_members.org_id == channel.org_id, Organization_members.memmber_id == user_id).first()` / `is_admin = org_member and org_member.role_user == "ADMIN"` / `if not is_owner and not is_admin: raise HTTPException(status_code=403, detail="Only organization owners and admins can delete organization-level channels")` |
| 268-282 | **Team-level:** `is_owner = organization.owner_id == user_id` / `user_role = db.query(Team_roles).filter(Team_roles.team_id == channel.team_id, Team_roles.user_id == user_id).first()` / `has_permission = is_owner or (user_role and user_role.can_create_channels)` / `if not has_permission: raise HTTPException(status_code=403, detail="You don't have permission to delete channels in this team")` |
| 284-295 | `channel_meta = {"channel_name": ..., "channel_mode": ..., "channel_category": ..., "description": ...}; if channel.team_id: channel_team = db.query(Teams).filter(Teams.team_id == channel.team_id).first(); if channel_team: channel_meta["team_id"] = ..., channel_meta["team_name"] = channel_team.team_name` |
| 295 | `create_log(db, org_id=channel.org_id, actor_id=user_id, action="channel_deleted", target_id=channel_id, target_type="channel", metadata=channel_meta)` |
| 297 | `channel_message_ids = [row[0] for row in db.query(Messages.message_id).filter(Messages.channel_id == channel_id).all()]` |
| 298-302 | `if channel_message_ids: db.query(Pinned_messages).filter(Pinned_messages.channel_id == channel_id).delete(synchronize_session=False); db.query(Notifications).filter(Notifications.message_id.in_(channel_message_ids)).delete(synchronize_session=False); db.query(Messages).filter(Messages.parent_id.in_(channel_message_ids)).update({Messages.parent_id: None}, synchronize_session=False); db.query(Messages).filter(Messages.channel_id == channel_id).delete(synchronize_session=False)` |
| 304 | `db.query(Files).filter(Files.channel_id == channel_id).delete(synchronize_session=False)` |
| 306-307 | `db.delete(channel); db.commit()` |
| 309-312 | Returns `{"message": "Channel deleted successfully", "channel_id": channel_id}` |

## File: `backend/services/message_service.py` (1492 lines)

### Helpers (lines 37-54)
| Line | Code |
|------|------|
| 37-54 | `def user_can_announce(db, user_id, channel_team_id, org_id):` / `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if org and org.owner_id == user_id: return True` / `if channel_team_id is not None: role = db.query(Team_roles).filter(Team_roles.team_id == channel_team_id, Team_roles.user_id == user_id).first(); return bool(role and role.can_make_announcement)` / `admin = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first(); return admin is not None` |

### `_normalize_message_pagination` (lines 554-572)
| Line | Code |
|------|------|
| 554 | `DEFAULT_MESSAGE_LIMIT = 50` |
| 555 | `MAX_MESSAGE_LIMIT = 200` |
| 558-572 | `def _normalize_message_pagination(limit, offset):` / `normalized_limit = int(limit if limit is not None else DEFAULT_MESSAGE_LIMIT)` / `normalized_offset = int(offset if offset is not None else 0)` / `if normalized_limit <= 0: raise HTTPException(status_code=400, detail="limit must be greater than 0")` / `if normalized_limit > MAX_MESSAGE_LIMIT: raise HTTPException(status_code=400, detail=f"limit cannot exceed {MAX_MESSAGE_LIMIT}")` / `if normalized_offset < 0: raise HTTPException(status_code=400, detail="offset must be >= 0")` / `return normalized_limit, normalized_offset` |

### `fetch_message_service` (lines 575-746)
| Line | Code |
|------|------|
| 583 | `user_id = user.user_id` |
| 585-588 | `found_user_at_org = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` |
| 590-591 | `if not found_user_at_org: raise HTTPException(status_code=403, detail="User is not a member of this organization")` |
| 593-596 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` |
| 598-599 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found in this organization")` |
| 601-609 | `if channel.team_id is not None: in_team = db.query(Team_association).filter_by(team_id=channel.team_id, user_id=user_id).first(); organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not in_team and (not organization or organization.owner_id != user_id): raise HTTPException(status_code=403, detail="Not a team member")` |
| 611 | `limit, offset = _normalize_message_pagination(limit, offset)` |
| 613-624 | `org_users = db.query(Users).join(Organization_members, Organization_members.memmber_id == Users.user_id).filter(Organization_members.org_id == org_id, Users.user_tag.isnot(None)).all(); users_by_tag = {str(member.user_tag).strip().lstrip("@").lower(): member for member in org_users if member.user_tag}` |
| 626-631 | `page_rows = db.query(Messages, Users).join(Users, Messages.sender_id == Users.user_id).filter(Messages.channel_id == channel_id, Messages.is_deleted == False).order_by(Messages.sent_at.desc(), Messages.message_id.desc()).offset(offset).limit(limit + 1).all()` |
| 633-635 | `has_more = len(page_rows) > limit; page_rows = page_rows[:limit]; messages = list(reversed(page_rows))` |
| 637-647 | `parent_ids = {m.parent_id for m, _ in messages if m.parent_id}; parents_by_id = {}; if parent_ids: parent_rows = db.query(Messages, Users).join(Users, Messages.sender_id == Users.user_id).filter(Messages.message_id.in_(parent_ids), Messages.channel_id == channel_id, Messages.is_deleted == False).all(); parents_by_id = {pm.message_id: (pm, ps) for pm, ps in parent_rows}` |
| 649-695 | Loop builds `result` with `message_id`, `message_content`, `mentions`, `parent_id`, `reply_to`, `sent_at`, `edited_at`, `sender` |
| 697-709 | `window_start = min((m.sent_at for m, _ in messages), default=None); window_end = max((m.sent_at for m, _ in messages), default=None); files_query = db.query(Files, Users).join(Users, Files.sender_id == Users.user_id).filter(Files.is_deleted == False); if channel.team_id is not None: files_query = files_query.filter(Files.team_id == channel.team_id); else: files_query = files_query.filter(Files.team_id == None, Files.org_id == org_id); if window_start is not None and window_end is not None: files_query = files_query.filter(Files.sent_at >= window_start, Files.sent_at <= window_end); files = files_query.order_by(Files.sent_at.desc()).limit(MAX_MESSAGE_LIMIT).all()` |
| 711-736 | Appends file entries as virtual message objects (`message_id = 1000000000 + file_record.id`, `is_file = True`, `file_attachment: {id, file_name, file_url, file_size, sent_at}`) |
| 736 | `result.sort(key=lambda item: item["sent_at"])` |
| 738-746 | Returns `{"messages": result, "pagination": {"limit": limit, "offset": offset, "returned": len(messages), "has_more": has_more}}` |

### `edit_message_service` (lines 749-774)
| Line | Code |
|------|------|
| 750 | `user_id = user.user_id` |
| 752-755 | `message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()` |
| 757-758 | `if not message: raise HTTPException(status_code=404, detail="Message not found")` |
| 761-762 | `if message.sender_id != user_id: raise HTTPException(status_code=403, detail="You can only edit your own messages")` |
| 764-765 | `message.message_content = data.message_content; message.edited_at = datetime.now(UTC)` |
| 767-768 | `db.commit(); db.refresh(message)` |
| 770-774 | Returns `{"message_id": message.message_id, "message_content": message.message_content, "edited_at": message.edited_at}` |

### `delete_message_service` (lines 777-795)
| Line | Code |
|------|------|
| 778 | `user_id = user.user_id` |
| 780-783 | `message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()` |
| 785-786 | `if not message: raise HTTPException(status_code=404, detail="Message not found")` |
| 788-789 | `if message.sender_id != user_id: raise HTTPException(status_code=403, detail="You can only delete your own messages")` |
| 791 | `message.is_deleted = True` |
| 793 | `db.commit()` |
| 795 | Returns `{"detail": "Message deleted successfully"}` |

### `send_messages_realtime` (lines 797-1118)
| Line | Code |
|------|------|
| 807 | `await websocket.accept()` |
| 810-814 | `auth_db = SessionLocal(); user = await authenticate_ws(websocket, authorization, auth_db); if not user: return` |
| 816-821 | `user_id = user.user_id; member = auth_db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` |
| 823-825 | `if not member: await websocket.close(code=1008, reason="Not a member of this organization"); return` |
| 827-830 | `channel = auth_db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` |
| 832-834 | `if not channel: await websocket.close(code=1008, reason="Channel not found"); return` |
| 836-845 | `if channel.team_id is not None: in_team = auth_db.query(Team_association).filter_by(team_id=channel.team_id, user_id=user_id).first(); organization = auth_db.query(Organization).filter(Organization.organization_id == org_id).first(); if not in_team and (not organization or organization.owner_id != user_id): await websocket.close(code=1008, reason="Not a team member"); return` |
| 847-849 | `channel_name = channel.channel_name; channel_team_id = channel.team_id; channel_mode = channel.channel_mode` |
| 851 | `auth_db.close()` |
| 853 | `await manager.connect(channel_id, websocket)` |
| 856-1058 | **Loop:** `data = await websocket.receive_json()` — handles `"type": "send_message"` (checks channel_mode announcements permission, validates parent_id, creates Messages, creates mention/announcement notifications, pushes real-time notifications via `push_mention_notification` / `push_announcement_notification`, upserts to Pinecone, broadcasts via `manager.broadcast`) |
| 1061-1079 | Handles `"type": "typing"` — broadcasts typing indicators via `manager.broadcast(channel_id, typing_data, exclude=websocket)` |
| 1080-1112 | Handles `"type": "send_file"` — validates announcement permission, calls `send_file_realtime_service` |
| 1113-1114 | Falls through: `await manager.broadcast(channel_id, data)` |
| 1116-1117 | `except WebSocketDisconnect: manager.disconnect(channel_id, websocket)` |

### `notifications_ws_endpoint` (lines 1120-1145)
| Line | Code |
|------|------|
| 1125 | `await websocket.accept()` |
| 1127-1135 | `auth_db = SessionLocal(); user = await authenticate_ws(websocket, authorization, auth_db); if not user: return; user_id = user.user_id; auth_db.close()` |
| 1137 | `await notification_manager.connect(user_id, websocket)` |
| 1139-1143 | Loop: `await websocket.receive_text()` |
| 1144-1145 | `finally: notification_manager.disconnect(user_id)` |

### `voice_websocket_endpoint` (lines 1148-1225)
| Line | Code |
|------|------|
| 1156-1192 | `auth_db = SessionLocal(); user = await authenticate_ws(websocket, authorization, auth_db); if not user: return; member = auth_db.query(Organization_members).filter(Organization_members.memmber_id == user.user_id, Organization_members.org_id == org_id).first(); if not member: await websocket.close(code=1008, reason="Not a member of this organization"); return; channel = auth_db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first(); if not channel: await websocket.close(code=1008, reason="Channel not found"); return; if str(channel.channel_category).lower() != "voice": await websocket.close(code=1008, reason="Channel is not a voice channel"); return; participant = {user_id, first_name, last_name, avatar_url, user_tag}` |
| 1194 | `await voice_manager.connect(channel_id, websocket, participant=participant)` |
| 1196-1199 | `await websocket.send_json({"type": "voice_participants", "participants": voice_manager.get_participants(channel_id)})` |
| 1201-1208 | `await voice_manager.broadcast(channel_id, {"type": "voice_joined", "participant": participant}, exclude=websocket)` |
| 1210-1225 | Loop: `message = await websocket.receive_json(); await voice_manager.forward_signal(channel_id, websocket, message)` / `except WebSocketDisconnect: disconnected_participant = voice_manager.disconnect(channel_id, websocket); if disconnected_participant: await voice_manager.broadcast(channel_id, {"type": "voice_left", "participant": ...})` |

### `search_messages_service` (lines 1228-1306)
| Line | Code |
|------|------|
| 1237 | `user_id = user.user_id` |
| 1239-1242 | `member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` |
| 1244-1245 | `if not member: raise HTTPException(status_code=403, detail="User is not a member of this organization")` |
| 1247-1250 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` |
| 1252-1253 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found in this organization")` |
| 1255-1263 | `if channel.team_id is not None: in_team = db.query(Team_association).filter_by(team_id=channel.team_id, user_id=user_id).first(); organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not in_team and (not organization or organization.owner_id != user_id): raise HTTPException(status_code=403, detail="Not a team member")` |
| 1265-1266 | `if not query or not query.strip(): raise HTTPException(status_code=400, detail="Search query cannot be empty")` |
| 1268 | `limit, offset = _normalize_message_pagination(limit, offset)` |
| 1270 | `search_term = f"%{query.strip()}%"` |
| 1272-1278 | `rows = db.query(Messages, Users).join(Users, Messages.sender_id == Users.user_id).filter(Messages.channel_id == channel_id, Messages.is_deleted == False, Messages.message_content.ilike(search_term)).order_by(Messages.sent_at.desc(), Messages.message_id.desc()).offset(offset).limit(limit + 1).all()` |
| 1280-1281 | `has_more = len(rows) > limit; rows = rows[:limit]` |
| 1283-1306 | Returns `{"messages": [{message_id, message_content, sent_at, edited_at, sender: {user_id, first_name, last_name, avatar_url, user_tag}}], "pagination": {limit, offset, returned, has_more}}` |

### `pin_message_service` (lines 1309-1381)
| Line | Code |
|------|------|
| 1310 | `user_id = user.user_id` |
| 1312-1315 | `message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()` |
| 1317-1318 | `if not message: raise HTTPException(status_code=404, detail="Message not found")` |
| 1320-1323 | `channel = db.query(Channels).filter(Channels.channel_id == message.channel_id, Channels.org_id == org_id).first()` |
| 1325-1326 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found in this organization")` |
| 1328-1330 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` |
| 1332-1333 | `if not org: raise HTTPException(status_code=404, detail="Organization not found")` |
| 1335-1353 | **Permission check:** `is_owner = org.owner_id == user_id; if not is_owner: member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first(); if not member: raise HTTPException(status_code=403, detail="User is not a member of this organization"); if channel.team_id is not None: team_member = db.query(Team_association).filter(Team_association.team_id == channel.team_id, Team_association.user_id == user_id).first(); if not team_member: raise HTTPException(status_code=403, detail="You must be a member of this team to pin messages in this channel")` |
| 1355-1358 | `already_pinned = db.query(Pinned_messages).filter(Pinned_messages.message_id == message_id, Pinned_messages.channel_id == channel.channel_id).first()` |
| 1360-1361 | `if already_pinned: raise HTTPException(status_code=400, detail="Message is already pinned")` |
| 1363-1367 | `pinned = Pinned_messages(message_id=message_id, channel_id=channel.channel_id, pinned_by=user_id)` |
| 1369-1371 | `db.add(pinned); db.commit(); db.refresh(pinned)` |
| 1373 | `create_log(db, org_id=org_id, actor_id=user_id, action="message_pinned", target_id=message_id, target_type="message", metadata={"channel_id": channel.channel_id})` |
| 1375-1381 | Returns `{"id": ..., "message_id": ..., "channel_id": ..., "pinned_by": ..., "pinned_at": ...}` |

### `unpin_message_service` (lines 1384-1434)
| Line | Code |
|------|------|
| 1385 | `user_id = user.user_id` |
| 1387-1389 | `pinned = db.query(Pinned_messages).filter(Pinned_messages.message_id == message_id).first()` |
| 1391-1392 | `if not pinned: raise HTTPException(status_code=404, detail="Pinned message not found")` |
| 1394-1397 | `channel = db.query(Channels).filter(Channels.channel_id == pinned.channel_id, Channels.org_id == org_id).first()` |
| 1399-1400 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found in this organization")` |
| 1402-1404 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` |
| 1406-1407 | `if not org: raise HTTPException(status_code=404, detail="Organization not found")` |
| 1409-1427 | **Permission check:** `is_owner = org.owner_id == user_id; if not is_owner: member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first(); if not member: raise HTTPException(status_code=403, detail="User is not a member of this organization"); if channel.team_id is not None: team_member = db.query(Team_association).filter(Team_association.team_id == channel.team_id, Team_association.user_id == user_id).first(); if not team_member: raise HTTPException(status_code=403, detail="You must be a member of this team to unpin messages in this channel")` |
| 1429-1430 | `db.delete(pinned); db.commit()` |
| 1432 | `create_log(db, org_id=org_id, actor_id=user_id, action="message_unpinned", target_id=message_id, target_type="message", metadata={"channel_id": channel.channel_id})` |
| 1434 | Returns `{"detail": "Message unpinned successfully"}` |

### `fetch_pinned_messages_service` (lines 1437-1492)
| Line | Code |
|------|------|
| 1438 | `user_id = user.user_id` |
| 1440-1443 | `member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` |
| 1445-1446 | `if not member: raise HTTPException(status_code=403, detail="User is not a member of this organization")` |
| 1448-1451 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` |
| 1453-1454 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found in this organization")` |
| 1456-1464 | `if channel.team_id is not None: in_team = db.query(Team_association).filter_by(team_id=channel.team_id, user_id=user_id).first(); organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not in_team and (not organization or organization.owner_id != user_id): raise HTTPException(status_code=403, detail="Not a team member")` |
| 1466-1473 | `pinned_messages = db.query(Pinned_messages, Messages, Users).join(Messages, Pinned_messages.message_id == Messages.message_id).join(Users, Messages.sender_id == Users.user_id).filter(Pinned_messages.channel_id == channel_id, Messages.is_deleted == False).all()` |
| 1475-1492 | Returns `[{"id": ..., "message_id": ..., "message_content": ..., "pinned_by": ..., "pinned_at": ..., "sender": {user_id, first_name, last_name, avatar_url, user_tag}}]` |

### `fetch_voice_participants_service` (lines 525-551)
| Line | Code |
|------|------|
| 526 | `user_id = user.user_id` |
| 528-531 | `member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` |
| 533-534 | `if not member: raise HTTPException(status_code=403, detail="User is not a member of this organization")` |
| 536-539 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` |
| 541-542 | `if not channel: raise HTTPException(status_code=404, detail="Channel not found in this organization")` |
| 544-545 | `if str(channel.channel_category).lower() != "voice": raise HTTPException(status_code=400, detail="Channel is not a voice channel")` |
| 547-551 | `participants = voice_manager.get_participants(channel_id); return {"participants": participants, "total_participants": len(participants)}` |

### `fetch_user_notifications_service` (lines 187-280)
| Line | Code |
|------|------|
| 188 | `user_id = user.user_id` |
| 190-202 | `rows = db.query(Notifications, Messages, Channels, Users).join(Messages, Notifications.message_id == Messages.message_id).join(Channels, Messages.channel_id == Channels.channel_id).join(Users, Messages.sender_id == Users.user_id).filter(Notifications.user_id == user_id, Notifications.type.in_(["channel_mention", "channel_announcement"]), Messages.is_deleted == False).order_by(Notifications.created_at.desc()).limit(100).all()` |
| 204-225 | Builds `mentions` and `announcements` lists from rows |
| 227-238 | `dm_rows = db.query(Notifications, Direct_messages, Users).join(Direct_messages, Notifications.dm_message_id == Direct_messages.id).join(Users, Direct_messages.sender_id == Users.user_id).filter(Notifications.user_id == user_id, Notifications.type == "direct_message", Notifications.is_seen == False, Direct_messages.is_deleted == False).order_by(Notifications.created_at.desc()).limit(200).all()` |
| 240-274 | Groups DM notifications by sender into `dm_by_sender` dict with `count`, `last_message_preview`, `latest_at`, `notification_ids` |
| 270-274 | `direct_messages = sorted(dm_by_sender.values(), key=lambda x: x["latest_at"] or "", reverse=True)` |
| 276-280 | Returns `{"mentions": mentions, "announcements": announcements, "direct_messages": direct_messages}` |

### `mark_notifications_seen_service` (lines 283-296)
| Line | Code |
|------|------|
| 284 | `user_id = user.user_id` |
| 286-291 | `query = db.query(Notifications).filter(Notifications.user_id == user_id, Notifications.is_seen == False)` / `if notification_ids: query = query.filter(Notifications.id.in_(notification_ids))` |
| 293-294 | `query.update({Notifications.is_seen: True}, synchronize_session=False); db.commit()` |
| 296 | Returns `{"detail": "Notifications marked as seen"}` |
