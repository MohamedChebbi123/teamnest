# Group Chat Flow — Every Line of Code

## File: `backend/models/Group_chat.py` (14 lines)

| Lines | Code |
|-------|------|
| 7-13 | `class Group_chat(Base):` / `__tablename__="group_chat"` / `id=Column(Integer,primary_key=True)` / `group_name=Column(String,nullable=False)` / `group_description=Column(String,nullable=False)` / `group_image=Column(String,nullable=False)` / `owned_by=Column(Integer,ForeignKey("users.user_id"))` |

## File: `backend/models/Group_chat_members.py` (13 lines)

| Lines | Code |
|-------|------|
| 7-12 | `class Group_chat_members(Base):` / `__tablename__="group_chat_members"` / `id=Column(Integer,primary_key=True)` / `user_id=Column(Integer,ForeignKey("users.user_id"))` / `group_chat_id=Column(Integer,ForeignKey("group_chat.id"))` / `joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` |

## File: `backend/models/Group_chat_messages.py` (16 lines)

| Lines | Code |
|-------|------|
| 7-16 | `class Group_chat_messages(Base):` / `__tablename__="group_chat_messages"` / `id=Column(Integer,primary_key=True)` / `parent_id=Column(Integer,ForeignKey("group_chat_messages.id"),nullable=True)` / `group_chat_id=Column(Integer,ForeignKey("group_chat.id"))` / `sender_id=Column(Integer,ForeignKey("users.user_id"))` / `edited_at = Column(DateTime(timezone=True), nullable=True)` / `content = Column(Text, nullable=False)` / `is_deleted = Column(Boolean, default=False)` / `sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` |

## File: `backend/routers/groupe_chat_router.py` (120 lines)

| Lines | Code |
|-------|------|
| 1-20 | Imports: `from fastapi import APIRouter, Form, File, Depends, UploadFile, Body, WebSocket, Query` / `from sqlalchemy.orm import Session` / `from database.connection import connect_databse` / `from services.groupe_chat_service import (create_group_chat, get_friends_for_group_chat, add_members_to_group_chat, get_my_group_chats, edit_group_chat_service, delete_group_chat_service, fetch_group_messages_service, edit_group_message_service, delete_group_message_service, group_chat_websocket_service)` / `from typing import List` / `from models.Users import Users` / `from utils.security import current_user` / `router = APIRouter()` |
| 23-31 | `@router.post("/create_group_chat")` / `async def create_group(group_name=Form(...), group_description=Form(...), image=File(...), user=Depends(current_user), db=Depends(connect_databse)):` / `return create_group_chat(group_name, group_description, image, user, db)` |
| 34-40 | `@router.get("/group_chat/{group_chat_id}/friends")` / `async def get_friends_to_add(group_chat_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return get_friends_for_group_chat(group_chat_id, user, db)` |
| 43-50 | `@router.post("/group_chat/{group_chat_id}/add_members")` / `async def add_members(group_chat_id: int, member_ids: List[int] = Body(...), user=Depends(current_user), db=Depends(connect_databse)):` / `return add_members_to_group_chat(group_chat_id, member_ids, user, db)` |
| 53-58 | `@router.get("/group_chats")` / `async def get_group_chats(user=Depends(current_user), db=Depends(connect_databse)):` / `return get_my_group_chats(user, db)` |
| 61-70 | `@router.put("/group_chat/{group_chat_id}")` / `async def edit_group(group_chat_id: int, group_name=Form(None), group_description=Form(None), image=File(None), user=Depends(current_user), db=Depends(connect_databse)):` / `return edit_group_chat_service(group_chat_id, user, db, group_name, group_description, image)` |
| 73-79 | `@router.delete("/group_chat/{group_chat_id}")` / `async def delete_group(group_chat_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return delete_group_chat_service(group_chat_id, user, db)` |
| 82-88 | `@router.get("/group_chat/{group_chat_id}/messages")` / `async def get_group_messages(group_chat_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return fetch_group_messages_service(group_chat_id, user, db)` |
| 91-99 | `@router.put("/group_chat/{group_chat_id}/messages/{message_id}")` / `async def edit_group_message(group_chat_id: int, message_id: int, content=Body(..., embed=True), user=Depends(current_user), db=Depends(connect_databse)):` / `return edit_group_message_service(group_chat_id, message_id, content, user, db)` |
| 102-109 | `@router.delete("/group_chat/{group_chat_id}/messages/{message_id}")` / `async def delete_group_message(group_chat_id: int, message_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return delete_group_message_service(group_chat_id, message_id, user, db)` |
| 112-120 | `@router.websocket("/ws/group_chat/{group_chat_id}")` / `async def group_chat_ws(group_chat_id: int, websocket: WebSocket, token: str = Query(None), db=Depends(connect_databse)):` / `authorization = f"Bearer {token}" if token else ""` / `await group_chat_websocket_service(group_chat_id, websocket, authorization, db)` |

## File: `backend/services/groupe_chat_service.py` (528 lines)

### `create_group_chat` (lines 17-50)
| Line | Code |
|------|------|
| 24 | `user_id = user.user_id` |
| 26-27 | `if not user.is_verified: raise HTTPException(status_code=403, detail="Please verify your account to create a group chat")` |
| 29 | `image_url = upload_organization_picture(image)` |
| 31-36 | `new_group = Group_chat(group_name=group_name, group_description=group_description, group_image=image_url, owned_by=user_id)` |
| 38-40 | `db.add(new_group); db.commit(); db.refresh(new_group)` |
| 42-45 | `new_member = Group_chat_members(user_id=user_id, group_chat_id=new_group.id)` |
| 47-48 | `db.add(new_member); db.commit()` |
| 50 | `return new_group` |

### `get_friends_for_group_chat` (lines 53-92)
| Line | Code |
|------|------|
| 54 | `user_id = user.user_id` |
| 56-58 | `group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first(); if not group: raise HTTPException(status_code=404, detail="Group chat not found")` |
| 60-65 | `is_member = db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id, Group_chat_members.user_id == user_id).first(); if not is_member: raise HTTPException(status_code=403, detail="You are not a member of this group chat")` |
| 67-71 | `existing_member_ids = [m.user_id for m in db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id).all()]` |
| 73-75 | `friendships = db.query(Friends).filter(or_(Friends.user_id == user_id, Friends.friend_id == user_id)).all()` |
| 77-92 | `friends_list = []` / `for f in friendships:` / `friend_user_id = f.friend_id if f.user_id == user_id else f.user_id` / `if friend_user_id in existing_member_ids: continue` / `friend_user = db.query(Users).filter(Users.user_id == friend_user_id).first()` / `if friend_user: friends_list.append({"user_id": friend_user.user_id, "first_name": friend_user.first_name, "last_name": friend_user.last_name, "user_tag": friend_user.user_tag, "avatar_url": friend_user.avatar_url})` / `return friends_list` |

### `add_members_to_group_chat` (lines 95-124)
| Line | Code |
|------|------|
| 96 | `user_id = user.user_id` |
| 98-100 | `group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first(); if not group: raise HTTPException(status_code=404, detail="Group chat not found")` |
| 102-107 | `is_member = db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id, Group_chat_members.user_id == user_id).first(); if not is_member: raise HTTPException(status_code=403, detail="You are not a member of this group chat")` |
| 109-124 | `added = []` / `for mid in member_ids:` / `target = db.query(Users).filter(Users.user_id == mid).first(); if not target: continue` / `new_member = Group_chat_members(user_id=mid, group_chat_id=group_chat_id); db.add(new_member); added.append(mid)` / `db.commit()` / `return {"added_members": added, "count": len(added)}` |

### `get_my_group_chats` (lines 127-155)
| Line | Code |
|------|------|
| 128 | `user_id = user.user_id` |
| 130-132 | `memberships = db.query(Group_chat_members).filter(Group_chat_members.user_id == user_id).all()` |
| 134-136 | `group_ids = [m.group_chat_id for m in memberships]; if not group_ids: return []` |
| 138 | `groups = db.query(Group_chat).filter(Group_chat.id.in_(group_ids)).all()` |
| 140-155 | `result = []` / `for g in groups:` / `member_count = db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == g.id).count()` / `result.append({"id": g.id, "group_name": g.group_name, "group_description": g.group_description, "group_image": g.group_image, "owned_by": g.owned_by, "member_count": member_count})` / `return result` |

### `edit_group_chat_service` (lines 158-195)
| Line | Code |
|------|------|
| 166 | `user_id = user.user_id` |
| 168-170 | `group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first(); if not group: raise HTTPException(status_code=404, detail="Group chat not found")` |
| 171-172 | `if group.owned_by != user_id: raise HTTPException(status_code=403, detail="Only the group owner can edit the group")` |
| 174-175 | `if group_name: group.group_name = group_name` |
| 176-177 | `if group_description: group.group_description = group_description` |
| 178-179 | `if image: group.group_image = upload_organization_picture(image)` |
| 181-182 | `db.commit(); db.refresh(group)` |
| 184-195 | `member_count = db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id).count()` / `return {"id": group.id, "group_name": group.group_name, "group_description": group.group_description, "group_image": group.group_image, "owned_by": group.owned_by, "member_count": member_count}` |

### `delete_group_chat_service` (lines 198-212)
| Line | Code |
|------|------|
| 199 | `user_id = user.user_id` |
| 201-203 | `group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first(); if not group: raise HTTPException(status_code=404, detail="Group chat not found")` |
| 204-205 | `if group.owned_by != user_id: raise HTTPException(status_code=403, detail="Only the group owner can delete the group")` |
| 207-210 | `db.query(Group_chat_messages).filter(Group_chat_messages.group_chat_id == group_chat_id).delete()` / `db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id).delete()` / `db.delete(group); db.commit()` |
| 212 | `return {"detail": "Group chat deleted successfully"}` |

### `fetch_group_messages_service` (lines 215-270)
| Line | Code |
|------|------|
| 216 | `user_id = user.user_id` |
| 218-220 | `group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first(); if not group: raise HTTPException(status_code=404, detail="Group chat not found")` |
| 222-227 | `is_member = db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id, Group_chat_members.user_id == user_id).first(); if not is_member: raise HTTPException(status_code=403, detail="You are not a member of this group chat")` |
| 229-234 | `rows = db.query(Group_chat_messages, Users).join(Users, Group_chat_messages.sender_id == Users.user_id).filter(Group_chat_messages.group_chat_id == group_chat_id, Group_chat_messages.is_deleted == False).order_by(Group_chat_messages.sent_at.asc()).all()` |
| 236-238 | `member_count = db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id).count()` |
| 240-270 | `messages = []` / `for msg, sender in rows:` / `messages.append({"message_id": msg.id, "group_chat_id": msg.group_chat_id, "sender_id": msg.sender_id, "parent_id": msg.parent_id, "content": msg.content, "is_deleted": msg.is_deleted, "sent_at": msg.sent_at.isoformat() if msg.sent_at else None, "edited_at": msg.edited_at.isoformat() if msg.edited_at else None, "sender": {"user_id": sender.user_id, "first_name": sender.first_name, "last_name": sender.last_name, "avatar_url": sender.avatar_url, "user_tag": sender.user_tag}})` / `return {"group": {"id": group.id, "group_name": group.group_name, "group_description": group.group_description, "group_image": group.group_image, "owned_by": group.owned_by, "member_count": member_count}, "messages": messages}` |

### `edit_group_message_service` (lines 273-311)
| Line | Code |
|------|------|
| 274 | `user_id = user.user_id` |
| 276-284 | `message = db.query(Group_chat_messages).filter(Group_chat_messages.id == message_id, Group_chat_messages.group_chat_id == group_chat_id, Group_chat_messages.is_deleted == False).first(); if not message: raise HTTPException(status_code=404, detail="Message not found"); if message.sender_id != user_id: raise HTTPException(status_code=403, detail="You can only edit your own messages")` |
| 286-288 | `new_content = str(content).strip(); if not new_content: raise HTTPException(status_code=400, detail="Message content cannot be empty")` |
| 290-293 | `message.content = new_content; message.edited_at = datetime.now(UTC); db.commit(); db.refresh(message)` |
| 295-311 | `return {"message_id": message.id, "group_chat_id": message.group_chat_id, "sender_id": message.sender_id, "parent_id": message.parent_id, "content": message.content, "is_deleted": message.is_deleted, "sent_at": message.sent_at.isoformat() if message.sent_at else None, "edited_at": message.edited_at.isoformat() if message.edited_at else None, "sender": {"user_id": user.user_id, "first_name": user.first_name, "last_name": user.last_name, "avatar_url": user.avatar_url, "user_tag": user.user_tag}}` |

### `delete_group_message_service` (lines 314-333)
| Line | Code |
|------|------|
| 315 | `user_id = user.user_id` |
| 317-319 | `group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first(); if not group: raise HTTPException(status_code=404, detail="Group chat not found")` |
| 321-329 | `message = db.query(Group_chat_messages).filter(Group_chat_messages.id == message_id, Group_chat_messages.group_chat_id == group_chat_id, Group_chat_messages.is_deleted == False).first(); if not message: raise HTTPException(status_code=404, detail="Message not found"); if message.sender_id != user_id and group.owned_by != user_id: raise HTTPException(status_code=403, detail="You can only delete your own messages")` |
| 331-332 | `message.is_deleted = True; db.commit()` |
| 333 | `return {"detail": "Message deleted successfully", "message_id": message_id}` |

### `group_chat_websocket_service` (lines 336-528)
| Line | Code |
|------|------|
| 342 | `from utils.security import authenticate_ws` |
| 344-346 | `user = await authenticate_ws(websocket, authorization, db); if not user: return` |
| 348 | `user_id = user.user_id` |
| 350-353 | `group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first(); if not group: await websocket.close(code=1008, reason="Group chat not found"); return` |
| 355-361 | `is_member = db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id, Group_chat_members.user_id == user_id).first(); if not is_member: await websocket.close(code=1008, reason="Not a member of this group chat"); return` |
| 363-370 | `user_info = {"user_id": user.user_id, "first_name": user.first_name, "last_name": user.last_name, "avatar_url": user.avatar_url, "user_tag": user.user_tag}; group_owner_id = group.owned_by` |
| 372 | `db.close()` |
| 374 | `await group_chat_ws_manager.connect(group_chat_id, websocket)` |
| 376-387 | `def _msg_payload(message: Group_chat_messages) -> dict:` / `return {"message_id": message.id, "group_chat_id": message.group_chat_id, "sender_id": message.sender_id, "parent_id": message.parent_id, "content": message.content, "is_deleted": message.is_deleted, "sent_at": message.sent_at.isoformat() if message.sent_at else None, "edited_at": message.edited_at.isoformat() if message.edited_at else None, "sender": user_info}` |
| 389-527 | `try: while True: data = await websocket.receive_json(); message_type = data.get("type")` |

### WS: `send_message` handler (lines 394-436)
| Line | Code |
|------|------|
| 394-436 | `if message_type == "send_message":` / `op_db = SessionLocal()` / `try:` / `content = str(data.get("content", "")).strip(); parent_id = data.get("parent_id")` / `if not content: await websocket.send_json({"type": "error", "detail": "Message content cannot be empty"}); continue` / `if parent_id is not None: try: parent_id = int(parent_id); except (TypeError, ValueError): await websocket.send_json({"type": "error", "detail": "parent_id must be a valid integer"}); continue; parent_msg = op_db.query(Group_chat_messages).filter(Group_chat_messages.id == parent_id, Group_chat_messages.group_chat_id == group_chat_id, Group_chat_messages.is_deleted == False).first(); if not parent_msg: await websocket.send_json({"type": "error", "detail": "Reply target not found"}); continue` / `new_message = Group_chat_messages(group_chat_id=group_chat_id, sender_id=user_id, content=content, parent_id=parent_id); op_db.add(new_message); op_db.commit(); op_db.refresh(new_message)` / `await group_chat_ws_manager.broadcast(group_chat_id, {"type": "new_group_message", "message": _msg_payload(new_message)}); continue` / `finally: op_db.close()` |

### WS: `typing` handler (lines 438-446)
| Line | Code |
|------|------|
| 438-446 | `if message_type == "typing":` / `await group_chat_ws_manager.broadcast(group_chat_id, {"type": "group_typing", "group_chat_id": group_chat_id, "sender_id": user_id, "is_typing": bool(data.get("is_typing", False)), "sender": user_info}, exclude=websocket); continue` |

### WS: `edit_message` handler (lines 448-486)
| Line | Code |
|------|------|
| 448-486 | `if message_type == "edit_message":` / `op_db = SessionLocal()` / `try:` / `message_id = data.get("message_id"); content = str(data.get("content", "")).strip()` / `try: message_id = int(message_id); except (TypeError, ValueError): await websocket.send_json({"type": "error", "detail": "message_id must be a valid integer"}); continue` / `message = op_db.query(Group_chat_messages).filter(Group_chat_messages.id == message_id, Group_chat_messages.group_chat_id == group_chat_id, Group_chat_messages.is_deleted == False).first(); if not message: await websocket.send_json({"type": "error", "detail": "Message not found"}); continue; if message.sender_id != user_id: await websocket.send_json({"type": "error", "detail": "You can only edit your own messages"}); continue; if not content: await websocket.send_json({"type": "error", "detail": "Message content cannot be empty"}); continue` / `message.content = content; message.edited_at = datetime.now(UTC); op_db.commit(); op_db.refresh(message)` / `await group_chat_ws_manager.broadcast(group_chat_id, {"type": "group_message_edited", "message": _msg_payload(message)}); continue` / `finally: op_db.close()` |

### WS: `delete_message` handler (lines 488-521)
| Line | Code |
|------|------|
| 488-521 | `if message_type == "delete_message":` / `op_db = SessionLocal()` / `try:` / `message_id = data.get("message_id")` / `try: message_id = int(message_id); except (TypeError, ValueError): await websocket.send_json({"type": "error", "detail": "message_id must be a valid integer"}); continue` / `message = op_db.query(Group_chat_messages).filter(Group_chat_messages.id == message_id, Group_chat_messages.group_chat_id == group_chat_id, Group_chat_messages.is_deleted == False).first(); if not message: await websocket.send_json({"type": "error", "detail": "Message not found"}); continue; if message.sender_id != user_id and group_owner_id != user_id: await websocket.send_json({"type": "error", "detail": "You can only delete your own messages"}); continue` / `message.is_deleted = True; op_db.commit()` / `await group_chat_ws_manager.broadcast(group_chat_id, {"type": "group_message_deleted", "message_id": message_id, "group_chat_id": group_chat_id}); continue` / `finally: op_db.close()` |

### WS: unsupported type + disconnect (lines 523-528)
| Line | Code |
|------|------|
| 523 | `await websocket.send_json({"type": "error", "detail": "Unsupported message type"})` |
| 525-526 | `except WebSocketDisconnect: pass` |
| 527-528 | `finally: group_chat_ws_manager.disconnect(group_chat_id, websocket)` |

## File: `backend/utils/Websocket_manager.py — GroupChatWebSocketManager` (lines 256-285)

| Lines | Code |
|-------|------|
| 256-258 | `class GroupChatWebSocketManager():` / `def __init__(self):` / `self.channels: Dict[int, List[WebSocket]] = {}` |
| 260-264 | `async def connect(self, group_chat_id: int, websocket: WebSocket):` / `await websocket.accept()` / `channel_connections = self.channels.setdefault(group_chat_id, [])` / `if websocket not in channel_connections: channel_connections.append(websocket)` |
| 266-273 | `def disconnect(self, group_chat_id: int, websocket: WebSocket):` / `channel_connections = self.channels.get(group_chat_id)` / `if not channel_connections: return` / `if websocket in channel_connections: channel_connections.remove(websocket)` / `if not channel_connections: self.channels.pop(group_chat_id, None)` |
| 275-282 | `async def broadcast(self, group_chat_id: int, message: dict, exclude: Optional[WebSocket] = None):` / `for ws in list(self.channels.get(group_chat_id, [])):` / `if exclude is not None and ws is exclude: continue` / `try: await ws.send_json(message)` / `except Exception: self.disconnect(group_chat_id, ws)` |
| 285 | `group_chat_ws_manager = GroupChatWebSocketManager()` |

(End of file - total lines in document: 141)
