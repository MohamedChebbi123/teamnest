from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, UTC
import os
import re
from utils.jwt_handler import verify_token
from models.Messages import Messages
from models.Files import Files
from sqlalchemy.orm import Session
from models.Organization_members import Organization_members
from models.Channels import Channels
from models.Users import Users
from models.Notifications import Notifications
from models.PInned_messages import Pinned_messages
from models.Organization import Organization
from models.Teams import Teams
from models.Team_association import Team_association
from schemas.Message_input import Message_input
from schemas.Message_edit_input import Message_edit_input
from utils.Websocket_manager import Text_Websocket_manager, VoiceWebsocketManager, notification_manager
from utils.cloudinary_handler import upload_chat_file_from_base64
from utils.plan_limits import get_file_size_limit
from utils.document_handler import embed_document
from utils.messages_handler import upsert_message
from utils.log_handler import create_log
from database.connection import SessionLocal

manager=Text_Websocket_manager()
voice_manager = VoiceWebsocketManager()


def get_user_tag(content:str):
    if not content:
        return []
    tags = re.findall(r"(?<!\w)@([A-Za-z0-9_]{2,32})", str(content))
    return list({tag.lower() for tag in tags})


def resolve_mentioned_users(db: Session, org_id: int, tags: list[str], sender_id: int) -> list[Users]:
    if not tags:
        return []

    tag_set = set(tags)
    org_users = db.query(Users).join(
        Organization_members,
        Organization_members.memmber_id == Users.user_id
    ).filter(
        Organization_members.org_id == org_id,
        Users.user_tag.isnot(None),
        Users.user_id != sender_id,
    ).all()

    result: list[Users] = []
    for user in org_users:
        normalized_tag = str(user.user_tag).strip().lstrip("@").lower()
        if normalized_tag in tag_set:
            result.append(user)

    return result


def create_mention_notifications(db: Session, mentioned_users: list[Users], message_id: int):
    if not mentioned_users:
        return

    for user in mentioned_users:
        notification_kwargs = {
            "user_id": user.user_id,
            "type": "channel_mention",
            "message_id": message_id,
            "created_at": datetime.now(UTC),
        }

        if hasattr(Notifications, "is_seen"):
            notification_kwargs["is_seen"] = False
        elif hasattr(Notifications, "is_read"):
            notification_kwargs["is_read"] = False

        db.add(Notifications(**notification_kwargs))

    db.commit()


async def push_mention_notification(
    receiver_id: int,
    sender_id: int,
    message_id: int,
    channel_id: int,
    org_id: int,
    sender_first_name: str = "",
    sender_last_name: str = "",
    sender_avatar_url: str | None = None,
    sender_user_tag: str | None = None,
    channel_name: str = "",
):
    await notification_manager.send(
        receiver_id,
        {
            "type": "new_notification",
            "notification": {
                "type": "channel_mention",
                "message_id": message_id,
                "sender_id": sender_id,
                "channel_id": channel_id,
                "org_id": org_id,
                "created_at": datetime.now(UTC).isoformat(),
                "sender_first_name": sender_first_name,
                "sender_last_name": sender_last_name,
                "sender_avatar_url": sender_avatar_url,
                "sender_user_tag": sender_user_tag,
                "channel_name": channel_name,
            },
        },
    )


def _check_duplicate_file(db: Session, file_name: str) -> str | None:
    """Returns an error message if a file with the same name already exists, None otherwise."""
    normalized_file_name = file_name.strip()
    if not normalized_file_name:
        return "file_name is required"

    existing = db.query(Files).filter(Files.file_name == normalized_file_name).first()
    if existing:
        return f"A file named '{normalized_file_name}' has already been uploaded. Please rename your file or use the existing one."
    return None


async def send_file_realtime_service(
    data: dict,
    websocket: WebSocket,
    channel_id: int,
    user_id: int,
    channel: Channels,
    db: Session,
):
    file_name = data.get("file_name")
    file_size = data.get("file_size")
    file_base64 = data.get("file_base64")
    mime_type = data.get("mime_type")
    provided_file_url = data.get("file_url")

    if not file_name or file_size is None:
        await websocket.send_json({
            "type": "error",
            "detail": "file_name and file_size are required"
        })
        return

    ext = os.path.splitext(file_name)[1].lower()
    if ext != ".pdf":
        await websocket.send_json({
            "type": "error",
            "detail": "Only PDF files are supported. Please upload a .pdf file."
        })
        return

    try:
        file_size = int(file_size)
    except (TypeError, ValueError):
        await websocket.send_json({
            "type": "error",
            "detail": "file_size must be a valid integer"
        })
        return

    if file_size <= 0:
        await websocket.send_json({
            "type": "error",
            "detail": "file_size must be greater than 0"
        })
        return

    org = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()
    file_size_limit = get_file_size_limit(org.organization_plan if org else None)
    if file_size_limit is not None and file_size > file_size_limit:
        await websocket.send_json({
            "type": "error",
            "detail": f"Free plan allows a maximum file size of {file_size_limit // (1024 * 1024)} MB. Upgrade to Pro for larger uploads."
        })
        return

    stored_file_name = file_name.strip()
    duplicate_error = _check_duplicate_file(db, stored_file_name)
    if duplicate_error:
        await websocket.send_json({
            "type": "error",
            "detail": duplicate_error
        })
        return

    file_url = provided_file_url
    if file_base64:
        try:
            file_url = upload_chat_file_from_base64(file_name=file_name, file_base64=file_base64, mime_type=mime_type)
        except HTTPException as exc:
            await websocket.send_json({
                "type": "error",
                "detail": exc.detail
            })
            return
        except Exception as e:
            print(f"[CLOUDINARY ERROR] {file_name}: {e}")
            await websocket.send_json({
                "type": "error",
                "detail": f"Failed to upload file: {str(e)}"
            })
            return

    if not file_url:
        await websocket.send_json({
            "type": "error",
            "detail": "Provide file_base64 (preferred) or file_url"
        })
        return

    sender = db.query(Users).filter(Users.user_id == user_id).first()
    if not sender:
        await websocket.send_json({
            "type": "error",
            "detail": "Sender not found"
        })
        return

    new_file = Files(
        file_name=stored_file_name,
        file_url=file_url,
        sender_id=user_id,
        team_id=channel.team_id,
        file_size=file_size,
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    file_data = {
        "type": "new_file",
        "file": {
            "id": new_file.id,
            "file_name": new_file.file_name,
            "file_url": new_file.file_url,
            "file_size": new_file.file_size,
            "sent_at": new_file.sent_at.isoformat(),
            "sender": {
                "user_id": sender.user_id,
                "first_name": sender.first_name,
                "last_name": sender.last_name,
                "avatar_url": sender.avatar_url,
                "user_tag": sender.user_tag
            }
        }
    }

    await manager.broadcast(channel_id, file_data)

    try:
        embed_document(
            file_url=file_url,
            file_name=stored_file_name,
            document_id=str(new_file.id),
            user_id=str(user_id),
            team_id=channel.team_id
        )
    except Exception as e:
        print(f"[EMBED ERROR] Failed to embed document {stored_file_name}: {e}")


def fetch_voice_participants_service(channel_id: int, org_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="User is not a member of this organization")

    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in this organization")

    if str(channel.channel_category).lower() != "voice":
        raise HTTPException(status_code=400, detail="Channel is not a voice channel")

    participants = voice_manager.get_participants(channel_id)
    return {
        "participants": participants,
        "total_participants": len(participants),
    }
















def fetch_message_service(channel_id:int,org_id:int,authorization: str,db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    
    found_user_at_org = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()
    
    if not found_user_at_org:
        raise HTTPException(status_code=403, detail="User is not a member of this organization")
    
    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in this organization")

    org_users = db.query(Users).join(
        Organization_members,
        Organization_members.memmber_id == Users.user_id
    ).filter(
        Organization_members.org_id == org_id,
        Users.user_tag.isnot(None),
    ).all()
    users_by_tag = {
        str(member.user_tag).strip().lstrip("@").lower(): member
        for member in org_users
        if member.user_tag
    }
    
    messages = db.query(
        Messages,
        Users
    ).join(
        Users, Messages.sender_id == Users.user_id
    ).filter(
        Messages.channel_id == channel_id,
        Messages.is_deleted == False
    ).all()

    result = []

    for message, user in messages:
        mention_tags = get_user_tag(message.message_content)
        mentions = []
        for mention_tag in mention_tags:
            mentioned_user = users_by_tag.get(mention_tag)
            if not mentioned_user:
                continue
            mentions.append({
                "user_id": mentioned_user.user_id,
                "first_name": mentioned_user.first_name,
                "last_name": mentioned_user.last_name,
                "user_tag": mentioned_user.user_tag,
            })

        reply_to = None
        if message.parent_id:
            parent_message_data = db.query(Messages, Users).join(
                Users, Messages.sender_id == Users.user_id
            ).filter(
                Messages.message_id == message.parent_id,
                Messages.channel_id == channel_id,
                Messages.is_deleted == False
            ).first()

            if parent_message_data:
                parent_message, parent_sender = parent_message_data
                reply_to = {
                    "message_id": parent_message.message_id,
                    "message_content": parent_message.message_content,
                    "sender": {
                        "user_id": parent_sender.user_id,
                        "first_name": parent_sender.first_name,
                        "last_name": parent_sender.last_name,
                        "avatar_url": parent_sender.avatar_url,
                        "user_tag": parent_sender.user_tag
                    }
                }

        result.append({
            "message_id": message.message_id,
            "message_content": message.message_content,
            "mentions": mentions,
            "parent_id": message.parent_id,
            "reply_to": reply_to,
            "sent_at": message.sent_at,
            "edited_at": message.edited_at,
            "sender": {
                "user_id": user.user_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "avatar_url": user.avatar_url,
                "user_tag": user.user_tag
            }
        })

    if channel.team_id is not None:
        files = db.query(
            Files,
            Users
        ).join(
            Users, Files.sender_id == Users.user_id
        ).filter(
            Files.team_id == channel.team_id,
            Files.is_deleted == False
        ).all()
    else:
        files = db.query(
            Files,
            Users
        ).join(
            Users, Files.sender_id == Users.user_id
        ).join(
            Organization_members,
            (Organization_members.memmber_id == Files.sender_id) & (Organization_members.org_id == org_id)
        ).filter(
            Files.team_id == None,
            Files.is_deleted == False
        ).all()

    for file_record, user in files:
        result.append({
            "message_id": 1000000000 + file_record.id,
            "message_content": "",
            "is_file": True,
            "file_attachment": {
                "id": file_record.id,
                "file_name": file_record.file_name,
                "file_url": file_record.file_url,
                "file_size": file_record.file_size,
                "sent_at": file_record.sent_at,
            },
            "parent_id": None,
            "reply_to": None,
            "sent_at": file_record.sent_at,
            "edited_at": file_record.sent_at,
            "sender": {
                "user_id": user.user_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "avatar_url": user.avatar_url,
                "user_tag": user.user_tag
            }
        })

    result.sort(key=lambda item: item["sent_at"])
    
    return result


def edit_message_service(message_id: int, data: Message_edit_input, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    message = db.query(Messages).filter(
        Messages.message_id == message_id,
        Messages.is_deleted == False
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    

    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")
    
    message.message_content = data.message_content
    message.edited_at = datetime.now(UTC)
    
    db.commit()
    db.refresh(message)
    
    return {
        "message_id": message.message_id,
        "message_content": message.message_content,
        "edited_at": message.edited_at
    }


def delete_message_service(message_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    message = db.query(Messages).filter(
        Messages.message_id == message_id,
        Messages.is_deleted == False
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    
    message.is_deleted = True
    
    db.commit()
    
    return {"detail": "Message deleted successfully"}

async def send_messages_realtime(
    websocket: WebSocket,
    channel_id: int,
    authorization: str, 
    org_id: int ,
    db: Session
):
    if not authorization:
        await websocket.close(code=1008, reason="Invalid authorization header")
        return

    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    else:
        token = authorization

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return
    
    user_id = int(payload["sub"])
    
    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()
    
    if not member:
        await websocket.close(code=1008)
        return

    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return

    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        await websocket.close(code=1008, reason="Channel not found")
        return

    channel_name = channel.channel_name
    channel_team_id = channel.team_id

    db.close()

    await manager.connect(channel_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "send_message":
                msg_db = SessionLocal()
                try:
                    parent_message = None
                    parent_id = data.get("parent_id")
                    content = str(data.get("message_content") or "").strip()

                    if not content:
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Message content cannot be empty"
                        })
                        continue

                    if parent_id is not None:
                        try:
                            parent_id = int(parent_id)
                        except (TypeError, ValueError):
                            await websocket.send_json({
                                "type": "error",
                                "detail": "Invalid parent_id"
                            })
                            continue

                        parent_message = msg_db.query(Messages).filter(
                            Messages.message_id == parent_id,
                            Messages.channel_id == channel_id,
                            Messages.is_deleted == False
                        ).first()

                        if not parent_message:
                            await websocket.send_json({
                                "type": "error",
                                "detail": "Reply target not found"
                            })
                            continue

                    new_message = Messages(
                        message_content=content,
                        sender_id=user_id,
                        channel_id=channel_id,
                        parent_id=parent_message.message_id if parent_message else None
                    )

                    msg_db.add(new_message)
                    msg_db.commit()
                    msg_db.refresh(new_message)

                    sender = msg_db.query(Users).filter(Users.user_id == user_id).first()

                    try:
                        team = msg_db.query(Teams).filter(Teams.team_id == channel_team_id).first() if channel_team_id else None
                        org = msg_db.query(Organization).filter(Organization.organization_id == org_id).first()
                        upsert_message(
                            message_id=new_message.message_id,
                            team_id=channel_team_id if channel_team_id is not None else 0,
                            org_id=org_id,
                            content=content,
                            channel_id=channel_id,
                            channel_name=channel_name,
                            sender_id=user_id,
                            sender_first_name=sender.first_name if sender else "",
                            sender_last_name=sender.last_name if sender else "",
                            sent_at=new_message.sent_at.isoformat(),
                            team_name=team.team_name if team else "",
                            org_name=org.organization_name if org else "",
                            parent_id=new_message.parent_id
                        )
                    except Exception as e:
                        print(f"Failed to upsert message to Pinecone: {e}")
                    mention_tags = get_user_tag(new_message.message_content)
                    mentioned_users = resolve_mentioned_users(msg_db, org_id, mention_tags, user_id)
                    mentions_payload = [
                        {
                            "user_id": mentioned.user_id,
                            "first_name": mentioned.first_name,
                            "last_name": mentioned.last_name,
                            "user_tag": mentioned.user_tag,
                        }
                        for mentioned in mentioned_users
                    ]

                    try:
                        create_mention_notifications(msg_db, mentioned_users, new_message.message_id)
                    except Exception:
                        msg_db.rollback()

                    for mentioned in mentioned_users:
                        try:
                            await push_mention_notification(
                                receiver_id=mentioned.user_id,
                                sender_id=user_id,
                                message_id=new_message.message_id,
                                channel_id=channel_id,
                                org_id=org_id,
                                sender_first_name=sender.first_name if sender else "",
                                sender_last_name=sender.last_name if sender else "",
                                sender_avatar_url=sender.avatar_url if sender else None,
                                sender_user_tag=sender.user_tag if sender else None,
                                channel_name=channel_name,
                            )
                        except Exception:
                            continue

                    reply_to = None
                    if parent_message:
                        parent_sender = msg_db.query(Users).filter(Users.user_id == parent_message.sender_id).first()
                        if parent_sender:
                            reply_to = {
                                "message_id": parent_message.message_id,
                                "message_content": parent_message.message_content,
                                "sender": {
                                    "user_id": parent_sender.user_id,
                                    "first_name": parent_sender.first_name,
                                    "last_name": parent_sender.last_name,
                                    "avatar_url": parent_sender.avatar_url,
                                    "user_tag": parent_sender.user_tag
                                }
                            }

                    message_data = {
                        "type": "new_message",
                        "message": {
                            "message_id": new_message.message_id,
                            "message_content": new_message.message_content,
                            "mentions": mentions_payload,
                            "parent_id": new_message.parent_id,
                            "reply_to": reply_to,
                            "sent_at": new_message.sent_at.isoformat(),
                            "edited_at": new_message.edited_at.isoformat(),
                            "sender": {
                                "user_id": sender.user_id,
                                "first_name": sender.first_name,
                                "last_name": sender.last_name,
                                "avatar_url": sender.avatar_url,
                                "user_tag": sender.user_tag
                            }
                        }
                    }
                    await manager.broadcast(channel_id, message_data)
                finally:
                    msg_db.close()
            elif data.get("type") == "typing":
                typing_db = SessionLocal()
                try:
                    user_obj = typing_db.query(Users).filter(Users.user_id == user_id).first()
                    typing_data = {
                        "type": "typing",
                        "channel_id": channel_id,
                        "user": {
                            "user_id": user_obj.user_id,
                            "first_name": user_obj.first_name,
                            "last_name": user_obj.last_name,
                            "avatar_url": user_obj.avatar_url,
                            "user_tag": user_obj.user_tag,
                        },
                        "is_typing": bool(data.get("is_typing", False)),
                    }
                    await manager.broadcast(channel_id, typing_data, exclude=websocket)
                finally:
                    typing_db.close()
            elif data.get("type") == "send_file":
                file_db = SessionLocal()
                try:
                    await send_file_realtime_service(
                        data=data,
                        websocket=websocket,
                        channel_id=channel_id,
                        user_id=user_id,
                        channel=channel,
                        db=file_db,
                    )
                except Exception as e:
                    print(f"[FILE UPLOAD ERROR] {e}")
                    await websocket.send_json({
                        "type": "error",
                        "detail": f"File upload failed: {str(e)}"
                    })
                finally:
                    file_db.close()
            else:
                await manager.broadcast(channel_id, data)

    except WebSocketDisconnect:
        manager.disconnect(channel_id, websocket)


async def notifications_ws_endpoint(
    websocket: WebSocket,
    authorization: str,
    db: Session,
):
    if not authorization:
        await websocket.close(code=1008, reason="Invalid authorization header")
        return

    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    else:
        token = authorization

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    user_id = int(payload["sub"])

    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return

    db.close()

    await notification_manager.connect(user_id, websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        notification_manager.disconnect(user_id)


async def voice_websocket_endpoint(
    websocket: WebSocket,
    channel_id: int,
    authorization: str,
    org_id: int,
    db: Session
):
    if not authorization or not authorization.startswith("Bearer "):
        await websocket.close(code=1008, reason="Invalid authorization header")
        return

    token = authorization.split(" ")[1]

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    user_id = int(payload["sub"])

    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not member:
        await websocket.close(code=1008, reason="Not a member of this organization")
        return

    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        await websocket.close(code=1008, reason="Channel not found")
        return

    if str(channel.channel_category).lower() != "voice":
        await websocket.close(code=1008, reason="Channel is not a voice channel")
        return

    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return

    participant = {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "avatar_url": user.avatar_url,
        "user_tag": user.user_tag,
    }

    db.close()

    await voice_manager.connect(channel_id, websocket, participant=participant)

    await websocket.send_json({
        "type": "voice_participants",
        "participants": voice_manager.get_participants(channel_id),
    })

    await voice_manager.broadcast(
        channel_id,
        {
            "type": "voice_joined",
            "participant": participant,
        },
        exclude=websocket,
    )

    try:
        while True:
            message = await websocket.receive_json()

            if isinstance(message, dict):
                await voice_manager.forward_signal(channel_id, websocket, message)
    except WebSocketDisconnect:
        disconnected_participant = voice_manager.disconnect(channel_id, websocket)
        if disconnected_participant:
            await voice_manager.broadcast(
                channel_id,
                {
                    "type": "voice_left",
                    "participant": disconnected_participant,
                },
            )
            
            
def search_messages_service(channel_id: int, org_id: int, query: str, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="User is not a member of this organization")

    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in this organization")

    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    search_term = f"%{query.strip()}%"

    results = db.query(Messages, Users).join(
        Users, Messages.sender_id == Users.user_id
    ).filter(
        Messages.channel_id == channel_id,
        Messages.is_deleted == False,
        Messages.message_content.ilike(search_term)
    ).order_by(Messages.sent_at.desc()).limit(50).all()

    return [
        {
            "message_id": message.message_id,
            "message_content": message.message_content,
            "sent_at": message.sent_at,
            "edited_at": message.edited_at,
            "sender": {
                "user_id": user.user_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "avatar_url": user.avatar_url,
                "user_tag": user.user_tag
            }
        }
        for message, user in results
    ]


def pin_message_service(message_id: int, org_id: int, authorization: str, db: Session):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    message = db.query(Messages).filter(
        Messages.message_id == message_id,
        Messages.is_deleted == False
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    channel = db.query(Channels).filter(
        Channels.channel_id == message.channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in this organization")

    org = db.query(Organization).filter(
        Organization.organization_id == org_id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_owner = org.owner_id == user_id

    if not is_owner:
        member = db.query(Organization_members).filter(
            Organization_members.memmber_id == user_id,
            Organization_members.org_id == org_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="User is not a member of this organization")

        if channel.team_id is not None:
            team_member = db.query(Team_association).filter(
                Team_association.team_id == channel.team_id,
                Team_association.user_id == user_id
            ).first()

            if not team_member:
                raise HTTPException(status_code=403, detail="You must be a member of this team to pin messages in this channel")

    already_pinned = db.query(Pinned_messages).filter(
        Pinned_messages.message_id == message_id,
        Pinned_messages.channel_id == channel.channel_id
    ).first()

    if already_pinned:
        raise HTTPException(status_code=400, detail="Message is already pinned")

    pinned = Pinned_messages(
        message_id=message_id,
        channel_id=channel.channel_id,
        pinned_by=user_id
    )

    db.add(pinned)
    db.commit()
    db.refresh(pinned)

    create_log(db, org_id=org_id, actor_id=user_id, action="message_pinned", target_id=message_id, target_type="message", metadata={"channel_id": channel.channel_id})

    return {
        "id": pinned.id,
        "message_id": pinned.message_id,
        "channel_id": pinned.channel_id,
        "pinned_by": pinned.pinned_by,
        "pinned_at": pinned.pinned_at
    }


def unpin_message_service(message_id: int, org_id: int, authorization: str, db: Session):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    pinned = db.query(Pinned_messages).filter(
        Pinned_messages.message_id == message_id
    ).first()

    if not pinned:
        raise HTTPException(status_code=404, detail="Pinned message not found")

    channel = db.query(Channels).filter(
        Channels.channel_id == pinned.channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in this organization")

    org = db.query(Organization).filter(
        Organization.organization_id == org_id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_owner = org.owner_id == user_id

    if not is_owner:
        member = db.query(Organization_members).filter(
            Organization_members.memmber_id == user_id,
            Organization_members.org_id == org_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="User is not a member of this organization")

        if channel.team_id is not None:
            team_member = db.query(Team_association).filter(
                Team_association.team_id == channel.team_id,
                Team_association.user_id == user_id
            ).first()

            if not team_member:
                raise HTTPException(status_code=403, detail="You must be a member of this team to unpin messages in this channel")

    db.delete(pinned)
    db.commit()

    create_log(db, org_id=org_id, actor_id=user_id, action="message_unpinned", target_id=message_id, target_type="message", metadata={"channel_id": channel.channel_id})

    return {"detail": "Message unpinned successfully"}


def fetch_pinned_messages_service(channel_id: int, org_id: int, authorization: str, db: Session):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="User is not a member of this organization")

    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in this organization")

    pinned_messages = db.query(Pinned_messages, Messages, Users).join(
        Messages, Pinned_messages.message_id == Messages.message_id
    ).join(
        Users, Messages.sender_id == Users.user_id
    ).filter(
        Pinned_messages.channel_id == channel_id,
        Messages.is_deleted == False
    ).all()

    result = []
    for pinned, message, sender in pinned_messages:
        result.append({
            "id": pinned.id,
            "message_id": message.message_id,
            "message_content": message.message_content,
            "pinned_by": pinned.pinned_by,
            "pinned_at": pinned.pinned_at,
            "sender": {
                "user_id": sender.user_id,
                "first_name": sender.first_name,
                "last_name": sender.last_name,
                "avatar_url": sender.avatar_url,
                "user_tag": sender.user_tag
            }
        })

    return result
