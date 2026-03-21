from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, UTC
import os

from utils.jwt_handler import verify_token
from models.Messages import Messages
from models.Files import Files
from sqlalchemy.orm import Session
from models.Organization_members import Organization_members
from models.Channels import Channels
from models.Users import Users
from schemas.Message_input import Message_input
from schemas.Message_edit_input import Message_edit_input
from utils.Websocket_manager import Text_Websocket_manager, VoiceWebsocketManager, notification_manager
from utils.cloudinary_handler import upload_chat_file_from_base64

manager=Text_Websocket_manager()
voice_manager = VoiceWebsocketManager()


def _resolve_unique_file_name(db: Session, file_name: str) -> str:
    normalized_file_name = file_name.strip()
    if not normalized_file_name:
        raise HTTPException(status_code=400, detail="file_name is required")

    candidate = normalized_file_name
    base_name, extension = os.path.splitext(normalized_file_name)
    counter = 1

    while db.query(Files).filter(Files.file_name == candidate).first():
        candidate = f"{base_name}_{counter}{extension}"
        counter += 1

    return candidate


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

    stored_file_name = _resolve_unique_file_name(db, file_name)

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


# def send_messages_channel_service(data: Message_input, authorization: str, db: Session):
#     if not authorization or not authorization.startswith("Bearer "):
#         raise HTTPException(status_code=401, detail="Invalid authorization header")

#     token = authorization.split(" ")[1]
#     payload = verify_token(token, "access")

#     if not payload or "sub" not in payload:
#         raise HTTPException(status_code=401, detail="Invalid or expired token")

#     user_id = int(payload["sub"])

#     channel = db.query(Channels).filter(
#         Channels.channel_id == data.channel_id,
#         Channels.org_id == data.org_id
#     ).first()

#     if not channel:
#         raise HTTPException(status_code=404, detail="Channel not found in this organization")

#     found_user_at_org = db.query(Organization_members).filter(
#         Organization_members.memmber_id == user_id,
#         Organization_members.org_id == data.org_id
#     ).first()

#     if not found_user_at_org:
#         raise HTTPException(status_code=403, detail="User is not a member of this organization")

#     parent_message = None
#     if data.parent_id is not None:
#         parent_message = db.query(Messages).filter(
#             Messages.message_id == data.parent_id,
#             Messages.channel_id == data.channel_id,
#             Messages.is_deleted == False
#         ).first()

#         if not parent_message:
#             raise HTTPException(status_code=404, detail="Reply target not found")

#     new_message = Messages(
#         message_content=data.message_content,
#         sender_id=user_id,
#         channel_id=data.channel_id,
#         parent_id=parent_message.message_id if parent_message else None
#     )

#     db.add(new_message)
#     db.commit()
#     db.refresh(new_message)

#     return {
#         "message_id": new_message.message_id,
#         "message_content": new_message.message_content,
#         "parent_id": new_message.parent_id,
#         "sent_at": new_message.sent_at,
#         "edited_at": new_message.edited_at,
#     }


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

    # Files are linked to team_id (nullable). For org-level channels, include files
    # with team_id=None sent by users who belong to this organization.
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
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    else:
        token = authorization
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()
    
    if not member:
        await websocket.close(code=1008)
        return

    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        await websocket.close(code=1008, reason="Channel not found")
        return
    
    await manager.connect(channel_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "send_message":
                parent_message = None
                parent_id = data.get("parent_id")

                if parent_id is not None:
                    try:
                        parent_id = int(parent_id)
                    except (TypeError, ValueError):
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Invalid parent_id"
                        })
                        continue

                    parent_message = db.query(Messages).filter(
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
                    message_content=data.get("message_content"),
                    sender_id=user_id,
                    channel_id=channel_id,
                    parent_id=parent_message.message_id if parent_message else None
                )
                
                db.add(new_message)
                db.commit()
                db.refresh(new_message)
                
                sender = db.query(Users).filter(Users.user_id == user_id).first()

                reply_to = None
                if parent_message:
                    parent_sender = db.query(Users).filter(Users.user_id == parent_message.sender_id).first()
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
            elif data.get("type") == "send_file":
                await send_file_realtime_service(
                    data=data,
                    websocket=websocket,
                    channel_id=channel_id,
                    user_id=user_id,
                    channel=channel,
                    db=db,
                )
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
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    else:
        token = authorization

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return

    await notification_manager.connect(user_id, websocket)

    try:
        while True:
            # Keep connection alive and reserve a path for future client actions.
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