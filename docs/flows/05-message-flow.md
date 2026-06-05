# Message Flow — Every Line of Code

## File: `backend/services/message_service.py` (1492 lines)

### Imports & Globals (lines 1-35)

| Line | Code |
|------|------|
| 1-30 | `from fastapi import HTTPException, WebSocket, WebSocketDisconnect` / `from datetime import datetime, UTC` / `import logging, os, re` / `from utils.jwt_handler import verify_token` / `from models.Messages import Messages` / `from models.Files import Files` / `from sqlalchemy.orm import Session` / `from models.Organization_members import Organization_members` / `from models.Channels import Channels` / `from models.Users import Users` / `from models.Notifications import Notifications` / `from models.PInned_messages import Pinned_messages` / `from models.Organization import Organization` / `from models.Teams import Teams` / `from models.Team_association import Team_association` / `from models.Team_roles import Team_roles` / `from models.Direct_messages import Direct_messages` / `from schemas.Message_input import Message_input` / `from schemas.Message_edit_input import Message_edit_input` / `from utils.Websocket_manager import Text_Websocket_manager, VoiceWebsocketManager, notification_manager` / `from utils.cloudinary_handler import upload_chat_file_from_base64` / `from utils.plan_limits import get_file_size_limit` / `from utils.document_handler import embed_document` / `from utils.messages_handler import upsert_message` / `from utils.log_handler import create_log` / `from database.connection import SessionLocal` / `from utils.security import authenticate_ws` |
| 31 | `logger = logging.getLogger(__name__)` |
| 33 | `manager = Text_Websocket_manager()` |
| 34 | `voice_manager = VoiceWebsocketManager()` |

### `user_can_announce` (lines 37-54)

| Line | Code |
|------|------|
| 37 | `def user_can_announce(db: Session, user_id: int, channel_team_id: int \| None, org_id: int) -> bool:` |
| 38-40 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if org and org.owner_id == user_id: return True` |
| 42-47 | `if channel_team_id is not None:` / `role = db.query(Team_roles).filter(Team_roles.team_id == channel_team_id, Team_roles.user_id == user_id).first()` / `return bool(role and role.can_make_announcement)` |
| 49-54 | `admin = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()` / `return admin is not None` |

### `get_user_tag` (lines 57-61)

| Line | Code |
|------|------|
| 57 | `def get_user_tag(content: str):` |
| 58-61 | `if not content: return []` / `tags = re.findall(r"(?<!\w)@([A-Za-z0-9_]{2,32})", str(content))` / `return list({tag.lower() for tag in tags})` |

### `resolve_mentioned_users` (lines 64-84)

| Line | Code |
|------|------|
| 64 | `def resolve_mentioned_users(db: Session, org_id: int, tags: list[str], sender_id: int) -> list[Users]:` |
| 65-66 | `if not tags: return []` |
| 68 | `tag_set = set(tags)` |
| 69-76 | `org_users = db.query(Users).join(Organization_members, Organization_members.memmber_id == Users.user_id).filter(Organization_members.org_id == org_id, Users.user_tag.isnot(None), Users.user_id != sender_id).all()` |
| 78-84 | `result: list[Users] = []` / `for user in org_users:` / `normalized_tag = str(user.user_tag).strip().lstrip("@").lower()` / `if normalized_tag in tag_set: result.append(user)` / `return result` |

### `create_mention_notifications` (lines 87-104)

| Line | Code |
|------|------|
| 87 | `def create_mention_notifications(db: Session, mentioned_users: list[Users], message_id: int):` |
| 88-89 | `if not mentioned_users: return` |
| 91-104 | `for user in mentioned_users:` / `notification_kwargs = {"user_id": user.user_id, "type": "channel_mention", "message_id": message_id, "created_at": datetime.now(UTC)}` / `if hasattr(Notifications, "is_seen"): notification_kwargs["is_seen"] = False` / `elif hasattr(Notifications, "is_read"): notification_kwargs["is_read"] = False` / `db.add(Notifications(**notification_kwargs))` |

### `get_announcement_recipients` (lines 107-131)

| Line | Code |
|------|------|
| 107 | `def get_announcement_recipients(db: Session, channel_team_id: int \| None, org_id: int, sender_id: int) -> list[Users]:` |
| 108-115 | `if channel_team_id is not None:` / `return db.query(Users).join(Team_association, Team_association.user_id == Users.user_id).filter(Team_association.team_id == channel_team_id, Users.user_id != sender_id).all()` |
| 117-123 | `recipients = db.query(Users).join(Organization_members, Organization_members.memmber_id == Users.user_id).filter(Organization_members.org_id == org_id, Users.user_id != sender_id).all()` |
| 125-129 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if org and org.owner_id != sender_id and not any(u.user_id == org.owner_id for u in recipients):` / `owner = db.query(Users).filter(Users.user_id == org.owner_id).first()` / `if owner: recipients.append(owner)` |
| 131 | `return recipients` |

### `create_announcement_notifications` (lines 134-151)

| Line | Code |
|------|------|
| 134 | `def create_announcement_notifications(db: Session, recipients: list[Users], message_id: int):` |
| 135-136 | `if not recipients: return` |
| 138-151 | `for user in recipients:` / `notification_kwargs = {"user_id": user.user_id, "type": "channel_announcement", "message_id": message_id, "created_at": datetime.now(UTC)}` / `if hasattr(Notifications, "is_seen"): notification_kwargs["is_seen"] = False` / `elif hasattr(Notifications, "is_read"): notification_kwargs["is_read"] = False` / `db.add(Notifications(**notification_kwargs))` |

### `push_announcement_notification` (lines 154-184)

| Line | Code |
|------|------|
| 154-165 | `async def push_announcement_notification(receiver_id: int, sender_id: int, message_id: int, channel_id: int, org_id: int, sender_first_name: str = "", sender_last_name: str = "", sender_avatar_url: str \| None = None, sender_user_tag: str \| None = None, channel_name: str = ""):` |
| 166-184 | `await notification_manager.send(receiver_id, {"type": "new_notification", "notification": {"type": "channel_announcement", "message_id": message_id, "sender_id": sender_id, "channel_id": channel_id, "org_id": org_id, "created_at": datetime.now(UTC).isoformat(), "sender_first_name": sender_first_name, "sender_last_name": sender_last_name, "sender_avatar_url": sender_avatar_url, "sender_user_tag": sender_user_tag, "channel_name": channel_name}})` |

### `fetch_user_notifications_service` (lines 187-280)

| Line | Code |
|------|------|
| 187 | `def fetch_user_notifications_service(user: Users, db: Session):` |
| 188 | `user_id = user.user_id` |
| 190-202 | `rows = db.query(Notifications, Messages, Channels, Users).join(Messages, Notifications.message_id == Messages.message_id).join(Channels, Messages.channel_id == Channels.channel_id).join(Users, Messages.sender_id == Users.user_id).filter(Notifications.user_id == user_id, Notifications.type.in_(["channel_mention", "channel_announcement"]), Messages.is_deleted == False).order_by(Notifications.created_at.desc()).limit(100).all()` |
| 204-205 | `mentions = []` / `announcements = []` |
| 207-225 | `for notification, message, channel, sender in rows:` / builds `item` dict with id, message_id, channel_id, channel_name, org_id, sender_id, sender_first_name, sender_last_name, sender_avatar_url, sender_user_tag, created_at, is_seen / `if notification.type == "channel_mention": mentions.append(item) else: announcements.append(item)` |
| 227-238 | `dm_rows = db.query(Notifications, Direct_messages, Users).join(Direct_messages, Notifications.dm_message_id == Direct_messages.id).join(Users, Direct_messages.sender_id == Users.user_id).filter(Notifications.user_id == user_id, Notifications.type == "direct_message", Notifications.is_seen == False, Direct_messages.is_deleted == False).order_by(Notifications.created_at.desc()).limit(200).all()` |
| 240-268 | `dm_by_sender: dict[int, dict] = {}` / iterates dm_rows; `sender_id = sender.user_id`; `is_file = bool(dm.content and dm.content.startswith("__FILE__::"))`; `preview = "Sent a file" if is_file else (dm.content or "")`; `sent_at = dm.sent_at.isoformat() if dm.sent_at else (notification.created_at.isoformat() if notification.created_at else "")` / if sender_id in dm_by_sender: increments count, updates latest_at and last_message_preview, appends notification_ids / else: creates entry with id, sender_id, sender_first_name, sender_last_name, sender_avatar_url, sender_user_tag, last_message_preview, count=1, latest_at, notification_ids |
| 270-274 | `direct_messages = sorted(dm_by_sender.values(), key=lambda x: x["latest_at"] or "", reverse=True)` |
| 276-280 | `return {"mentions": mentions, "announcements": announcements, "direct_messages": direct_messages}` |

### `mark_notifications_seen_service` (lines 283-296)

| Line | Code |
|------|------|
| 283 | `def mark_notifications_seen_service(user: Users, db: Session, notification_ids: list[int] \| None = None):` |
| 284 | `user_id = user.user_id` |
| 286-291 | `query = db.query(Notifications).filter(Notifications.user_id == user_id, Notifications.is_seen == False)` / `if notification_ids: query = query.filter(Notifications.id.in_(notification_ids))` |
| 293-294 | `query.update({Notifications.is_seen: True}, synchronize_session=False)` / `db.commit()` |
| 296 | `return {"detail": "Notifications marked as seen"}` |

### `push_mention_notification` (lines 299-329)

| Line | Code |
|------|------|
| 299-310 | `async def push_mention_notification(receiver_id: int, sender_id: int, message_id: int, channel_id: int, org_id: int, sender_first_name: str = "", sender_last_name: str = "", sender_avatar_url: str \| None = None, sender_user_tag: str \| None = None, channel_name: str = ""):` |
| 311-329 | `await notification_manager.send(receiver_id, {"type": "new_notification", "notification": {"type": "channel_mention", "message_id": message_id, "sender_id": sender_id, "channel_id": channel_id, "org_id": org_id, "created_at": datetime.now(UTC).isoformat(), "sender_first_name": sender_first_name, "sender_last_name": sender_last_name, "sender_avatar_url": sender_avatar_url, "sender_user_tag": sender_user_tag, "channel_name": channel_name}})` |

### `_check_duplicate_file` (lines 332-349)

| Line | Code |
|------|------|
| 332 | `def _check_duplicate_file(db: Session, file_name: str, org_id: int, team_id: int \| None) -> str \| None:` |
| 333 | Docstring: returns error message if duplicate, None otherwise |
| 334-336 | `normalized_file_name = file_name.strip()` / `if not normalized_file_name: return "file_name is required"` |
| 338-341 | `query = db.query(Files).filter(Files.file_name == normalized_file_name, Files.is_deleted == False)` |
| 342-345 | `if team_id is not None: query = query.filter(Files.team_id == team_id)` / `else: query = query.filter(Files.team_id == None, Files.org_id == org_id)` |
| 347-349 | `if query.first(): return f"A file named '{normalized_file_name}' has already been uploaded. Please rename your file or use the existing one."` / `return None` |

### `send_file_realtime_service` (lines 352-522)

| Line | Code |
|------|------|
| 352-358 | `async def send_file_realtime_service(data: dict, websocket: WebSocket, channel_id: int, user_id: int, channel: Channels, db: Session):` |
| 360-364 | `file_name = data.get("file_name")` / `file_size = data.get("file_size")` / `file_base64 = data.get("file_base64")` / `mime_type = data.get("mime_type")` / `provided_file_url = data.get("file_url")` |
| 366-371 | `if not file_name or file_size is None: await websocket.send_json({"type": "error", "detail": "file_name and file_size are required"}); return` |
| 373-379 | `ext = os.path.splitext(file_name)[1].lower()` / `if ext != ".pdf": await websocket.send_json({"type": "error", "detail": "Only PDF files are supported. Please upload a .pdf file."}); return` |
| 381-388 | `try: file_size = int(file_size)` / `except (TypeError, ValueError): await websocket.send_json({"type": "error", "detail": "file_size must be a valid integer"}); return` |
| 390-395 | `if file_size <= 0: await websocket.send_json({"type": "error", "detail": "file_size must be greater than 0"}); return` |
| 397-423 | `if file_base64:` / `payload = file_base64.strip()` / `if payload.startswith("data:"): comma_idx = payload.find(","); if comma_idx == -1: await websocket.send_json({"type": "error", "detail": "Invalid base64 file payload"}); return; payload = payload[comma_idx + 1:]` / `payload = "".join(payload.split())` / `if not payload or len(payload) % 4 != 0: await websocket.send_json({"type": "error", "detail": "Invalid base64 file payload"}); return` / `padding = len(payload) - len(payload.rstrip("=")); actual_size = (len(payload) // 4) * 3 - padding` / `if actual_size <= 0: await websocket.send_json({"type": "error", "detail": "file_size must be greater than 0"}); return; file_size = actual_size` |
| 425-432 | `org = db.query(Organization).filter(Organization.organization_id == channel.org_id).first(); file_size_limit = get_file_size_limit(org.organization_plan if org else None)` / `if file_size_limit is not None and file_size > file_size_limit: await websocket.send_json({"type": "error", "detail": f"Free plan allows a maximum of {file_size_limit // (1024 * 1024)} MB. Upgrade to Pro for larger uploads."}); return` |
| 434-441 | `stored_file_name = file_name.strip(); duplicate_error = _check_duplicate_file(db, stored_file_name, channel.org_id, channel.team_id)` / `if duplicate_error: await websocket.send_json({"type": "error", "detail": duplicate_error}); return` |
| 443-459 | `file_url = provided_file_url` / `if file_base64: try: file_url = upload_chat_file_from_base64(file_name=file_name, file_base64=file_base64, mime_type=mime_type); except HTTPException as exc: await websocket.send_json({"type": "error", "detail": exc.detail}); return; except Exception as e: logger.exception("Cloudinary upload failed"); await websocket.send_json({"type": "error", "detail": f"Failed to upload file: {str(e)}"}); return` |
| 461-466 | `if not file_url: await websocket.send_json({"type": "error", "detail": "Provide file_base64 (preferred) or file_url"}); return` |
| 468-474 | `sender = db.query(Users).filter(Users.user_id == user_id).first()` / `if not sender: await websocket.send_json({"type": "error", "detail": "Sender not found"}); return` |
| 476-488 | `new_file = Files(file_name=stored_file_name, file_url=file_url, sender_id=user_id, team_id=channel.team_id, channel_id=channel.channel_id, org_id=channel.org_id, file_size=file_size)` / `db.add(new_file); db.commit(); db.refresh(new_file)` |
| 490-506 | `file_data = {"type": "new_file", "file": {"id": new_file.id, "file_name": new_file.file_name, "file_url": new_file.file_url, "file_size": new_file.file_size, "sent_at": new_file.sent_at.isoformat(), "sender": {"user_id": sender.user_id, "first_name": sender.first_name, "last_name": sender.last_name, "avatar_url": sender.avatar_url, "user_tag": sender.user_tag}}}` |
| 508 | `await manager.broadcast(channel_id, file_data)` |
| 510-522 | `try: embed_document(file_url=file_url, file_name=stored_file_name, document_id=str(new_file.id), user_id=str(user_id), team_id=channel.team_id)` / `except Exception: logger.exception("Failed to embed document")` |

### `fetch_voice_participants_service` (lines 525-551)

| Line | Code |
|------|------|
| 525 | `def fetch_voice_participants_service(channel_id: int, org_id: int, user: Users, db: Session):` |
| 526 | `user_id = user.user_id` |
| 528-534 | `member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` / `if not member: raise HTTPException(403, detail="User is not a member of this organization")` |
| 536-542 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` / `if not channel: raise HTTPException(404, detail="Channel not found in this organization")` |
| 544-545 | `if str(channel.channel_category).lower() != "voice": raise HTTPException(400, detail="Channel is not a voice channel")` |
| 547-551 | `participants = voice_manager.get_participants(channel_id)` / `return {"participants": participants, "total_participants": len(participants)}` |

### Constants (lines 554-555)

| Line | Code |
|------|------|
| 554 | `DEFAULT_MESSAGE_LIMIT = 50` |
| 555 | `MAX_MESSAGE_LIMIT = 200` |

### `_normalize_message_pagination` (lines 558-572)

| Line | Code |
|------|------|
| 558 | `def _normalize_message_pagination(limit: int \| None, offset: int \| None) -> tuple[int, int]:` |
| 559-563 | `try: normalized_limit = int(limit if limit is not None else DEFAULT_MESSAGE_LIMIT); normalized_offset = int(offset if offset is not None else 0)` / `except (TypeError, ValueError): raise HTTPException(400, detail="limit and offset must be valid integers")` |
| 565-570 | `if normalized_limit <= 0: raise HTTPException(400, detail="limit must be greater than 0")` / `if normalized_limit > MAX_MESSAGE_LIMIT: raise HTTPException(400, detail=f"limit cannot exceed {MAX_MESSAGE_LIMIT}")` / `if normalized_offset < 0: raise HTTPException(400, detail="offset must be >= 0")` |
| 572 | `return normalized_limit, normalized_offset` |

### `fetch_message_service` (lines 575-746)

| Line | Code |
|------|------|
| 575-582 | `def fetch_message_service(channel_id: int, org_id: int, user: Users, db: Session, limit: int \| None = None, offset: int \| None = None):` |
| 583 | `user_id = user.user_id` |
| 585-591 | `found_user_at_org = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` / `if not found_user_at_org: raise HTTPException(403, detail="User is not a member of this organization")` |
| 593-599 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` / `if not channel: raise HTTPException(404, detail="Channel not found in this organization")` |
| 601-609 | `if channel.team_id is not None: in_team = db.query(Team_association).filter_by(team_id=channel.team_id, user_id=user_id).first(); organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not in_team and (not organization or organization.owner_id != user_id): raise HTTPException(403, detail="Not a team member")` |
| 611 | `limit, offset = _normalize_message_pagination(limit, offset)` |
| 613-624 | `org_users = db.query(Users).join(Organization_members, Organization_members.memmber_id == Users.user_id).filter(Organization_members.org_id == org_id, Users.user_tag.isnot(None)).all()` / `users_by_tag = {str(member.user_tag).strip().lstrip("@").lower(): member for member in org_users if member.user_tag}` |
| 626-631 | `page_rows = db.query(Messages, Users).join(Users, Messages.sender_id == Users.user_id).filter(Messages.channel_id == channel_id, Messages.is_deleted == False).order_by(Messages.sent_at.desc(), Messages.message_id.desc()).offset(offset).limit(limit + 1).all()` |
| 633-635 | `has_more = len(page_rows) > limit; page_rows = page_rows[:limit]; messages = list(reversed(page_rows))` |
| 637-647 | `parent_ids = {m.parent_id for m, _ in messages if m.parent_id}` / `parents_by_id: dict[int, tuple[Messages, Users]] = {}` / `if parent_ids: parent_rows = db.query(Messages, Users).join(Users, Messages.sender_id == Users.user_id).filter(Messages.message_id.in_(parent_ids), Messages.channel_id == channel_id, Messages.is_deleted == False).all(); parents_by_id = {pm.message_id: (pm, ps) for pm, ps in parent_rows}` |
| 649-695 | For each message: computes mention_tags via `get_user_tag`, resolves mentions from `users_by_tag`, resolves `reply_to` from `parents_by_id` if `parent_id` exists; builds result item with message_id, message_content, mentions, parent_id, reply_to, sent_at, edited_at, sender |
| 697-709 | `window_start = min((m.sent_at for m, _ in messages), default=None); window_end = max((m.sent_at for m, _ in messages), default=None)` / `files_query = db.query(Files, Users).join(Users, Files.sender_id == Users.user_id).filter(Files.is_deleted == False)` / if channel.team_id: `files_query = files_query.filter(Files.team_id == channel.team_id)` else: `files_query = files_query.filter(Files.team_id == None, Files.org_id == org_id)` / if window_start and window_end: `files_query = files_query.filter(Files.sent_at >= window_start, Files.sent_at <= window_end)` / `files = files_query.order_by(Files.sent_at.desc()).limit(MAX_MESSAGE_LIMIT).all()` |
| 711-734 | For each file: appends result dict with `message_id = 1000000000 + file_record.id`, `is_file = True`, `file_attachment`, sender info |
| 736 | `result.sort(key=lambda item: item["sent_at"])` |
| 738-746 | `return {"messages": result, "pagination": {"limit": limit, "offset": offset, "returned": len(messages), "has_more": has_more}}` |

### `edit_message_service` (lines 749-774)

| Line | Code |
|------|------|
| 749 | `def edit_message_service(message_id: int, data: Message_edit_input, user: Users, db: Session):` |
| 750 | `user_id = user.user_id` |
| 752-758 | `message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()` / `if not message: raise HTTPException(404, detail="Message not found")` |
| 761-762 | `if message.sender_id != user_id: raise HTTPException(403, detail="You can only edit your own messages")` |
| 764-768 | `message.message_content = data.message_content; message.edited_at = datetime.now(UTC); db.commit(); db.refresh(message)` |
| 770-774 | `return {"message_id": message.message_id, "message_content": message.message_content, "edited_at": message.edited_at}` |

### `delete_message_service` (lines 777-795)

| Line | Code |
|------|------|
| 777 | `def delete_message_service(message_id: int, user: Users, db: Session):` |
| 778 | `user_id = user.user_id` |
| 780-786 | `message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()` / `if not message: raise HTTPException(404, detail="Message not found")` |
| 788-789 | `if message.sender_id != user_id: raise HTTPException(403, detail="You can only delete your own messages")` |
| 791-793 | `message.is_deleted = True; db.commit()` |
| 795 | `return {"detail": "Message deleted successfully"}` |

### `send_messages_realtime` (lines 797-1117)

| Line | Code |
|------|------|
| 797-802 | `async def send_messages_realtime(websocket: WebSocket, channel_id: int, authorization: str, org_id: int):` |
| 803-808 | `logger.info("messages websocket handler entered", extra={...})` / `await websocket.accept()` / `logger.info("messages websocket accepted", extra={...})` |
| 810-825 | `auth_db = SessionLocal()` / `try: user = await authenticate_ws(websocket, authorization, auth_db); if not user: return; user_id = user.user_id` / `member = auth_db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` / `if not member: await websocket.close(code=1008, reason="Not a member of this organization"); return` |
| 827-845 | `channel = auth_db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` / `if not channel: await websocket.close(code=1008, reason="Channel not found"); return` / `if channel.team_id is not None: in_team = auth_db.query(Team_association).filter_by(team_id=channel.team_id, user_id=user_id).first(); organization = auth_db.query(Organization).filter(Organization.organization_id == org_id).first(); if not in_team and (not organization or organization.owner_id != user_id): await websocket.close(code=1008, reason="Not a team member"); return` |
| 847-849 | `channel_name = channel.channel_name; channel_team_id = channel.team_id; channel_mode = channel.channel_mode` |
| 850-851 | `finally: auth_db.close()` |
| 853 | `await manager.connect(channel_id, websocket)` |
| 855-857 | `try: while True: data = await websocket.receive_json()` |
| 859-883 | `if data.get("type") == "send_message":` / `msg_db = SessionLocal()` / `try: parent_id = data.get("parent_id"); content = str(data.get("message_content") or "").strip()` / `if not content: await websocket.send_json({"type": "error", "detail": "Message content cannot be empty"}); continue` / `if channel_mode == "announcement" and not user_can_announce(msg_db, user_id, channel_team_id, org_id):` / sends error with detail based on channel_team_id / `continue` |
| 885-906 | `if parent_id is not None: try: parent_id = int(parent_id); except (TypeError, ValueError): await websocket.send_json({"type": "error", "detail": "Invalid parent_id"}); continue` / `parent_message = msg_db.query(Messages).filter(Messages.message_id == parent_id, Messages.channel_id == channel_id, Messages.is_deleted == False).first()` / `if not parent_message: await websocket.send_json({"type": "error", "detail": "Reply target not found"}); continue` |
| 908-913 | `new_message = Messages(message_content=content, sender_id=user_id, channel_id=channel_id, parent_id=parent_message.message_id if parent_message else None)` |
| 915-927 | `sender = msg_db.query(Users).filter(Users.user_id == user_id).first()` / `mention_tags = get_user_tag(content); mentioned_users = resolve_mentioned_users(msg_db, org_id, mention_tags, user_id)` / `mentions_payload = [{"user_id": mentioned.user_id, "first_name": mentioned.first_name, "last_name": mentioned.last_name, "user_tag": mentioned.user_tag} for mentioned in mentioned_users]` |
| 929-935 | `announcement_recipients: list[Users] = []` / `if channel_mode == "announcement": mentioned_ids = {m.user_id for m in mentioned_users}; announcement_recipients = [r for r in get_announcement_recipients(msg_db, channel_team_id, org_id, user_id) if r.user_id not in mentioned_ids]` |
| 937-953 | `try: msg_db.add(new_message); msg_db.flush(); create_mention_notifications(msg_db, mentioned_users, new_message.message_id); create_announcement_notifications(msg_db, announcement_recipients, new_message.message_id); msg_db.commit()` / `except Exception: msg_db.rollback(); logger.exception(...); await websocket.send_json({"type": "error", "detail": "Failed to send message"}); continue` |
| 955 | `msg_db.refresh(new_message)` |
| 957-979 | `try: team = msg_db.query(Teams).filter(Teams.team_id == channel_team_id).first() if channel_team_id else None; org = msg_db.query(Organization).filter(Organization.organization_id == org_id).first()` / `upsert_message(message_id=new_message.message_id, team_id=..., org_id=org_id, content=content, channel_id=channel_id, channel_name=channel_name, sender_id=user_id, sender_first_name=..., sender_last_name=..., sent_at=..., team_name=..., org_name=..., parent_id=...)` / `except Exception: logger.exception("Failed to upsert message to Pinecone")` |
| 981-1000 | `for mentioned in mentioned_users: try: await push_mention_notification(receiver_id=mentioned.user_id, sender_id=user_id, message_id=new_message.message_id, channel_id=channel_id, org_id=org_id, sender_first_name=..., sender_last_name=..., sender_avatar_url=..., sender_user_tag=..., channel_name=channel_name)` / `except Exception: logger.exception(...); continue` |
| 1002-1021 | `for recipient in announcement_recipients: try: await push_announcement_notification(receiver_id=recipient.user_id, sender_id=user_id, message_id=new_message.message_id, channel_id=channel_id, org_id=org_id, ...)` / `except Exception: logger.exception(...); continue` |
| 1023-1037 | `reply_to = None` / `if parent_message: parent_sender = msg_db.query(Users).filter(Users.user_id == parent_message.sender_id).first(); if parent_sender: reply_to = {"message_id": parent_message.message_id, "message_content": parent_message.message_content, "sender": {"user_id": parent_sender.user_id, "first_name": ..., "last_name": ..., "avatar_url": ..., "user_tag": ...}}` |
| 1039-1058 | `message_data = {"type": "new_message", "message": {"message_id": new_message.message_id, "message_content": new_message.message_content, "mentions": mentions_payload, "parent_id": new_message.parent_id, "reply_to": reply_to, "sent_at": new_message.sent_at.isoformat(), "edited_at": new_message.edited_at.isoformat(), "sender": {...}}}` / `await manager.broadcast(channel_id, message_data)` |
| 1059-1060 | `finally: msg_db.close()` |
| 1061-1079 | `elif data.get("type") == "typing":` / `typing_db = SessionLocal(); try: user_obj = typing_db.query(Users).filter(Users.user_id == user_id).first(); typing_data = {"type": "typing", "channel_id": channel_id, "user": {...}, "is_typing": bool(data.get("is_typing", False))}; await manager.broadcast(channel_id, typing_data, exclude=websocket); finally: typing_db.close()` |
| 1080-1112 | `elif data.get("type") == "send_file":` / `file_db = SessionLocal(); try: if channel_mode == "announcement" and not user_can_announce(file_db, user_id, channel_team_id, org_id): sends error; continue; await send_file_realtime_service(data=data, websocket=websocket, channel_id=channel_id, user_id=user_id, channel=channel, db=file_db)` / `except Exception: logger.exception("File upload failed"); await websocket.send_json({"type": "error", "detail": f"File upload failed: {str(e)}"}); finally: file_db.close()` |
| 1113-1117 | `else: await manager.broadcast(channel_id, data)` / `except WebSocketDisconnect: manager.disconnect(channel_id, websocket)` |

### `notifications_ws_endpoint` (lines 1120-1145)

| Line | Code |
|------|------|
| 1120-1123 | `async def notifications_ws_endpoint(websocket: WebSocket, authorization: str):` |
| 1124-1125 | `from utils.security import authenticate_ws` / `await websocket.accept()` |
| 1127-1135 | `auth_db = SessionLocal(); try: user = await authenticate_ws(websocket, authorization, auth_db); if not user: return; user_id = user.user_id; finally: auth_db.close()` |
| 1137 | `await notification_manager.connect(user_id, websocket)` |
| 1139-1145 | `try: while True: await websocket.receive_text()` / `except WebSocketDisconnect: pass` / `finally: notification_manager.disconnect(user_id)` |

### `voice_websocket_endpoint` (lines 1148-1225)

| Line | Code |
|------|------|
| 1148-1153 | `async def voice_websocket_endpoint(websocket: WebSocket, channel_id: int, authorization: str, org_id: int):` |
| 1154 | `from utils.security import authenticate_ws` |
| 1156-1192 | `auth_db = SessionLocal(); try: user = await authenticate_ws(websocket, authorization, auth_db); if not user: return` / `member = auth_db.query(Organization_members).filter(Organization_members.memmber_id == user.user_id, Organization_members.org_id == org_id).first()` / `if not member: await websocket.close(code=1008, reason="Not a member of this organization"); return` / `channel = auth_db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` / `if not channel: await websocket.close(code=1008, reason="Channel not found"); return` / `if str(channel.channel_category).lower() != "voice": await websocket.close(code=1008, reason="Channel is not a voice channel"); return` / `participant = {"user_id": user.user_id, "first_name": user.first_name, "last_name": user.last_name, "avatar_url": user.avatar_url, "user_tag": user.user_tag}; finally: auth_db.close()` |
| 1194 | `await voice_manager.connect(channel_id, websocket, participant=participant)` |
| 1196-1199 | `await websocket.send_json({"type": "voice_participants", "participants": voice_manager.get_participants(channel_id)})` |
| 1201-1208 | `await voice_manager.broadcast(channel_id, {"type": "voice_joined", "participant": participant}, exclude=websocket)` |
| 1210-1225 | `try: while True: message = await websocket.receive_json(); if isinstance(message, dict): await voice_manager.forward_signal(channel_id, websocket, message)` / `except WebSocketDisconnect: disconnected_participant = voice_manager.disconnect(channel_id, websocket); if disconnected_participant: await voice_manager.broadcast(channel_id, {"type": "voice_left", "participant": disconnected_participant})` |

### `search_messages_service` (lines 1228-1306)

| Line | Code |
|------|------|
| 1228-1236 | `def search_messages_service(channel_id: int, org_id: int, query: str, user: Users, db: Session, limit: int \| None = None, offset: int \| None = None):` |
| 1237 | `user_id = user.user_id` |
| 1239-1245 | `member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` / `if not member: raise HTTPException(403, detail="User is not a member of this organization")` |
| 1247-1253 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` / `if not channel: raise HTTPException(404, detail="Channel not found in this organization")` |
| 1255-1263 | `if channel.team_id is not None: in_team = db.query(Team_association).filter_by(team_id=channel.team_id, user_id=user_id).first(); organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not in_team and (not organization or organization.owner_id != user_id): raise HTTPException(403, detail="Not a team member")` |
| 1265-1266 | `if not query or not query.strip(): raise HTTPException(400, detail="Search query cannot be empty")` |
| 1268 | `limit, offset = _normalize_message_pagination(limit, offset)` |
| 1270 | `search_term = f"%{query.strip()}%"` |
| 1272-1278 | `rows = db.query(Messages, Users).join(Users, Messages.sender_id == Users.user_id).filter(Messages.channel_id == channel_id, Messages.is_deleted == False, Messages.message_content.ilike(search_term)).order_by(Messages.sent_at.desc(), Messages.message_id.desc()).offset(offset).limit(limit + 1).all()` |
| 1280-1281 | `has_more = len(rows) > limit; rows = rows[:limit]` |
| 1283-1306 | `return {"messages": [{"message_id": ..., "message_content": ..., "sent_at": ..., "edited_at": ..., "sender": {...}} for message, sender in rows], "pagination": {"limit": limit, "offset": offset, "returned": len(rows), "has_more": has_more}}` |

### `pin_message_service` (lines 1309-1381)

| Line | Code |
|------|------|
| 1309 | `def pin_message_service(message_id: int, org_id: int, user: Users, db: Session):` |
| 1310 | `user_id = user.user_id` |
| 1312-1318 | `message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()` / `if not message: raise HTTPException(404, detail="Message not found")` |
| 1320-1326 | `channel = db.query(Channels).filter(Channels.channel_id == message.channel_id, Channels.org_id == org_id).first()` / `if not channel: raise HTTPException(404, detail="Channel not found in this organization")` |
| 1328-1333 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if not org: raise HTTPException(404, detail="Organization not found")` |
| 1335-1353 | `is_owner = org.owner_id == user_id` / `if not is_owner: member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first(); if not member: raise HTTPException(403, detail="User is not a member of this organization")` / `if channel.team_id is not None: team_member = db.query(Team_association).filter(Team_association.team_id == channel.team_id, Team_association.user_id == user_id).first(); if not team_member: raise HTTPException(403, detail="You must be a member of this team to pin messages in this channel")` |
| 1355-1361 | `already_pinned = db.query(Pinned_messages).filter(Pinned_messages.message_id == message_id, Pinned_messages.channel_id == channel.channel_id).first()` / `if already_pinned: raise HTTPException(400, detail="Message is already pinned")` |
| 1363-1371 | `pinned = Pinned_messages(message_id=message_id, channel_id=channel.channel_id, pinned_by=user_id)` / `db.add(pinned); db.commit(); db.refresh(pinned)` |
| 1373 | `create_log(db, org_id=org_id, actor_id=user_id, action="message_pinned", target_id=message_id, target_type="message", metadata={"channel_id": channel.channel_id})` |
| 1375-1381 | `return {"id": pinned.id, "message_id": pinned.message_id, "channel_id": pinned.channel_id, "pinned_by": pinned.pinned_by, "pinned_at": pinned.pinned_at}` |

### `unpin_message_service` (lines 1384-1434)

| Line | Code |
|------|------|
| 1384 | `def unpin_message_service(message_id: int, org_id: int, user: Users, db: Session):` |
| 1385 | `user_id = user.user_id` |
| 1387-1392 | `pinned = db.query(Pinned_messages).filter(Pinned_messages.message_id == message_id).first()` / `if not pinned: raise HTTPException(404, detail="Pinned message not found")` |
| 1394-1400 | `channel = db.query(Channels).filter(Channels.channel_id == pinned.channel_id, Channels.org_id == org_id).first()` / `if not channel: raise HTTPException(404, detail="Channel not found in this organization")` |
| 1402-1407 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if not org: raise HTTPException(404, detail="Organization not found")` |
| 1409-1427 | `is_owner = org.owner_id == user_id` / `if not is_owner: member = db.query(Organization_members).filter(...).first(); if not member: raise HTTPException(403, detail="User is not a member of this organization")` / `if channel.team_id is not None: team_member = db.query(Team_association).filter(...).first(); if not team_member: raise HTTPException(403, detail="You must be a member of this team to unpin messages in this channel")` |
| 1429-1430 | `db.delete(pinned); db.commit()` |
| 1432 | `create_log(db, org_id=org_id, actor_id=user_id, action="message_unpinned", target_id=message_id, target_type="message", metadata={"channel_id": channel.channel_id})` |
| 1434 | `return {"detail": "Message unpinned successfully"}` |

### `fetch_pinned_messages_service` (lines 1437-1492)

| Line | Code |
|------|------|
| 1437 | `def fetch_pinned_messages_service(channel_id: int, org_id: int, user: Users, db: Session):` |
| 1438 | `user_id = user.user_id` |
| 1440-1446 | `member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` / `if not member: raise HTTPException(403, detail="User is not a member of this organization")` |
| 1448-1454 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id).first()` / `if not channel: raise HTTPException(404, detail="Channel not found in this organization")` |
| 1456-1464 | `if channel.team_id is not None: in_team = db.query(Team_association).filter_by(team_id=channel.team_id, user_id=user_id).first(); organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not in_team and (not organization or organization.owner_id != user_id): raise HTTPException(403, detail="Not a team member")` |
| 1466-1473 | `pinned_messages = db.query(Pinned_messages, Messages, Users).join(Messages, Pinned_messages.message_id == Messages.message_id).join(Users, Messages.sender_id == Users.user_id).filter(Pinned_messages.channel_id == channel_id, Messages.is_deleted == False).all()` |
| 1475-1490 | `result = []` / `for pinned, message, sender in pinned_messages: result.append({"id": pinned.id, "message_id": message.message_id, "message_content": message.message_content, "pinned_by": pinned.pinned_by, "pinned_at": pinned.pinned_at, "sender": {"user_id": sender.user_id, "first_name": sender.first_name, "last_name": sender.last_name, "avatar_url": sender.avatar_url, "user_tag": sender.user_tag}})` |
| 1492 | `return result` |

## File: `backend/utils/Websocket_manager.py` (313 lines)

### `Text_Websocket_manager` class (lines 6-36)

| Line | Code |
|------|------|
| 6-8 | `class Text_Websocket_manager():` / `def __init__(self): self.channels: Dict[int, List[WebSocket]] = {}` |
| 10-16 | `async def connect(self, channel_id: int, websocket: WebSocket):` / `channel_connections = self.channels.setdefault(channel_id, [])` / `if websocket not in channel_connections: channel_connections.append(websocket)` |
| 18-27 | `def disconnect(self, channel_id: int, websocket: WebSocket):` / `channel_connections = self.channels.get(channel_id)` / `if not channel_connections: return` / `if websocket in channel_connections: channel_connections.remove(websocket)` / `if not channel_connections: self.channels.pop(channel_id, None)` |
| 29-36 | `async def broadcast(self, channel_id: int, message: dict, exclude: Optional[WebSocket] = None):` / `for ws in list(self.channels.get(channel_id, [])):` / `if exclude is not None and ws is exclude: continue` / `try: await ws.send_json(message)` / `except Exception: self.disconnect(channel_id, ws)` |

### `VoiceWebsocketManager` class (lines 40-94)

| Line | Code |
|------|------|
| 40-43 | `class VoiceWebsocketManager:` / `def __init__(self): self.voice_channels: Dict[int, List[WebSocket]] = {}; self.voice_participants: Dict[int, Dict[WebSocket, dict]] = {}` |
| 45-49 | `async def connect(self, channel_id: int, websocket: WebSocket, participant: Optional[dict] = None):` / `await websocket.accept()` / `self.voice_channels.setdefault(channel_id, []).append(websocket)` / `if participant is not None: self.voice_participants.setdefault(channel_id, {})[websocket] = participant` |
| 51-70 | `def disconnect(self, channel_id: int, websocket: WebSocket):` / `channel_connections = self.voice_channels.get(channel_id); participant = None` / `if not channel_connections: return participant` / `participant_map = self.voice_participants.get(channel_id)` / `if participant_map and websocket in participant_map: participant = participant_map.pop(websocket); if not participant_map: self.voice_participants.pop(channel_id, None)` / `if websocket in channel_connections: channel_connections.remove(websocket)` / `if not channel_connections: self.voice_channels.pop(channel_id, None)` / `return participant` |
| 72-81 | `def get_participants(self, channel_id: int) -> List[dict]:` / `participants = self.voice_participants.get(channel_id, {})` / `unique_by_user_id: Dict[Any, dict] = {}` / `for participant in participants.values(): user_id = participant.get("user_id"); if user_id not in unique_by_user_id: unique_by_user_id[user_id] = participant` / `return list(unique_by_user_id.values())` |
| 83-91 | `async def broadcast(self, channel_id: int, message: dict, exclude: Optional[WebSocket] = None):` / `for ws in list(self.voice_channels.get(channel_id, [])):` / `if exclude is not None and ws is exclude: continue` / `try: await ws.send_json(message)` / `except Exception: self.disconnect(channel_id, ws)` |
| 93-94 | `async def forward_signal(self, channel_id: int, sender: WebSocket, message: dict):` / `await self.broadcast(channel_id, message, exclude=sender)` |

### `NotificationManager` class (lines 130-146)

| Line | Code |
|------|------|
| 130-132 | `class NotificationManager:` / `def __init__(self): self.connections = {}` |
| 134-136 | `async def connect(self, user_id, websocket):` / `self.connections[user_id] = websocket` |
| 138-139 | `def disconnect(self, user_id):` / `self.connections.pop(user_id, None)` |
| 141-143 | `async def send(self, user_id, data):` / `if user_id in self.connections: await self.connections[user_id].send_json(data)` |
| 146 | `notification_manager = NotificationManager()` |
