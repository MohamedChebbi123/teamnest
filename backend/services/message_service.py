from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, UTC
import logging
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
from models.Team_roles import Team_roles
from models.Direct_messages import Direct_messages
from schemas.Message_input import Message_input
from schemas.Message_edit_input import Message_edit_input
from utils.Websocket_manager import Text_Websocket_manager, VoiceWebsocketManager, notification_manager
from utils.cloudinary_handler import upload_chat_file_from_base64
from utils.plan_limits import get_file_size_limit
from utils.document_handler import embed_document
from utils.messages_handler import upsert_message
from utils.log_handler import create_log
from database.connection import SessionLocal
from utils.security import authenticate_ws

logger = logging.getLogger(__name__)

manager=Text_Websocket_manager()
voice_manager = VoiceWebsocketManager()


def user_can_announce(db: Session, user_id: int, channel_team_id: int | None, org_id: int) -> bool:
    org = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if org and org.owner_id == user_id:
        return True

    if channel_team_id is not None:
        role = db.query(Team_roles).filter(
            Team_roles.team_id == channel_team_id,
            Team_roles.user_id == user_id
        ).first()
        return bool(role and role.can_make_announcement)

    admin = db.query(Organization_members).filter(
        Organization_members.org_id == org_id,
        Organization_members.memmber_id == user_id,
        Organization_members.role_user == "ADMIN"
    ).first()
    return admin is not None


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


def get_announcement_recipients(db: Session, channel_team_id: int | None, org_id: int, sender_id: int) -> list[Users]:
    if channel_team_id is not None:
        return db.query(Users).join(
            Team_association,
            Team_association.user_id == Users.user_id
        ).filter(
            Team_association.team_id == channel_team_id,
            Users.user_id != sender_id
        ).all()

    recipients = db.query(Users).join(
        Organization_members,
        Organization_members.memmber_id == Users.user_id
    ).filter(
        Organization_members.org_id == org_id,
        Users.user_id != sender_id
    ).all()

    org = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if org and org.owner_id != sender_id and not any(u.user_id == org.owner_id for u in recipients):
        owner = db.query(Users).filter(Users.user_id == org.owner_id).first()
        if owner:
            recipients.append(owner)

    return recipients


def create_announcement_notifications(db: Session, recipients: list[Users], message_id: int):
    if not recipients:
        return

    for user in recipients:
        notification_kwargs = {
            "user_id": user.user_id,
            "type": "channel_announcement",
            "message_id": message_id,
            "created_at": datetime.now(UTC),
        }

        if hasattr(Notifications, "is_seen"):
            notification_kwargs["is_seen"] = False
        elif hasattr(Notifications, "is_read"):
            notification_kwargs["is_read"] = False

        db.add(Notifications(**notification_kwargs))


async def push_announcement_notification(
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
                "type": "channel_announcement",
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


def fetch_user_notifications_service(user: Users, db: Session):
    user_id = user.user_id

    rows = db.query(
        Notifications, Messages, Channels, Users
    ).join(
        Messages, Notifications.message_id == Messages.message_id
    ).join(
        Channels, Messages.channel_id == Channels.channel_id
    ).join(
        Users, Messages.sender_id == Users.user_id
    ).filter(
        Notifications.user_id == user_id,
        Notifications.type.in_(["channel_mention", "channel_announcement"]),
        Messages.is_deleted == False,
    ).order_by(Notifications.created_at.desc()).limit(100).all()

    mentions = []
    announcements = []

    for notification, message, channel, sender in rows:
        item = {
            "id": notification.id,
            "message_id": message.message_id,
            "channel_id": channel.channel_id,
            "channel_name": channel.channel_name,
            "org_id": channel.org_id,
            "sender_id": sender.user_id,
            "sender_first_name": sender.first_name or "",
            "sender_last_name": sender.last_name or "",
            "sender_avatar_url": sender.avatar_url,
            "sender_user_tag": sender.user_tag,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "is_seen": bool(notification.is_seen),
        }
        if notification.type == "channel_mention":
            mentions.append(item)
        else:
            announcements.append(item)

    dm_rows = db.query(
        Notifications, Direct_messages, Users
    ).join(
        Direct_messages, Notifications.dm_message_id == Direct_messages.id
    ).join(
        Users, Direct_messages.sender_id == Users.user_id
    ).filter(
        Notifications.user_id == user_id,
        Notifications.type == "direct_message",
        Notifications.is_seen == False,
        Direct_messages.is_deleted == False,
    ).order_by(Notifications.created_at.desc()).limit(200).all()

    dm_by_sender: dict[int, dict] = {}
    for notification, dm, sender in dm_rows:
        sender_id = sender.user_id
        is_file = bool(dm.content and dm.content.startswith("__FILE__::"))
        preview = "Sent a file" if is_file else (dm.content or "")
        sent_at = dm.sent_at.isoformat() if dm.sent_at else (
            notification.created_at.isoformat() if notification.created_at else ""
        )

        if sender_id in dm_by_sender:
            entry = dm_by_sender[sender_id]
            entry["count"] += 1
            if sent_at and sent_at > (entry["latest_at"] or ""):
                entry["latest_at"] = sent_at
                entry["last_message_preview"] = preview
            entry["notification_ids"].append(notification.id)
        else:
            dm_by_sender[sender_id] = {
                "id": f"dm-{sender_id}",
                "sender_id": sender_id,
                "sender_first_name": sender.first_name or "",
                "sender_last_name": sender.last_name or "",
                "sender_avatar_url": sender.avatar_url,
                "sender_user_tag": sender.user_tag,
                "last_message_preview": preview,
                "count": 1,
                "latest_at": sent_at,
                "notification_ids": [notification.id],
            }

    direct_messages = sorted(
        dm_by_sender.values(),
        key=lambda x: x["latest_at"] or "",
        reverse=True,
    )

    task_rows = db.query(
        Notifications, Tasks, Users
    ).join(
        Tasks, Notifications.task_id == Tasks.id
    ).join(
        Users, Tasks.created_by == Users.user_id
    ).filter(
        Notifications.user_id == user_id,
        Notifications.type == "task_assigned",
        Tasks.is_deleted == False,
    ).order_by(Notifications.created_at.desc()).limit(50).all()

    task_assignments = []
    for notification, task, assigner in task_rows:
        task_assignments.append({
            "id": notification.id,
            "task_id": task.id,
            "task_title": task.title,
            "team_id": task.team_id,
            "assigned_by_id": assigner.user_id,
            "assigned_by_first_name": assigner.first_name or "",
            "assigned_by_last_name": assigner.last_name or "",
            "assigned_by_avatar_url": assigner.avatar_url,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "is_seen": bool(notification.is_seen),
        })

    return {
        "mentions": mentions,
        "announcements": announcements,
        "direct_messages": direct_messages,
        "task_assignments": task_assignments,
    }


def mark_notifications_seen_service(user: Users, db: Session, notification_ids: list[int] | None = None):
    user_id = user.user_id

    query = db.query(Notifications).filter(
        Notifications.user_id == user_id,
        Notifications.is_seen == False,
    )
    if notification_ids:
        query = query.filter(Notifications.id.in_(notification_ids))

    query.update({Notifications.is_seen: True}, synchronize_session=False)
    db.commit()

    return {"detail": "Notifications marked as seen"}


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


def _check_duplicate_file(db: Session, file_name: str, org_id: int, team_id: int | None) -> str | None:
    """Returns an error message if a file with the same name already exists in the same scope, None otherwise."""
    normalized_file_name = file_name.strip()
    if not normalized_file_name:
        return "file_name is required"

    query = db.query(Files).filter(
        Files.file_name == normalized_file_name,
        Files.is_deleted == False,
    )
    if team_id is not None:
        query = query.filter(Files.team_id == team_id)
    else:
        query = query.filter(Files.team_id == None, Files.org_id == org_id)

    if query.first():
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

    if file_base64:
        payload = file_base64.strip()
        if payload.startswith("data:"):
            comma_idx = payload.find(",")
            if comma_idx == -1:
                await websocket.send_json({
                    "type": "error",
                    "detail": "Invalid base64 file payload"
                })
                return
            payload = payload[comma_idx + 1:]
        payload = "".join(payload.split())
        if not payload or len(payload) % 4 != 0:
            await websocket.send_json({
                "type": "error",
                "detail": "Invalid base64 file payload"
            })
            return
        padding = len(payload) - len(payload.rstrip("="))
        actual_size = (len(payload) // 4) * 3 - padding
        if actual_size <= 0:
            await websocket.send_json({
                "type": "error",
                "detail": "file_size must be greater than 0"
            })
            return
        file_size = actual_size

    org = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()
    file_size_limit = get_file_size_limit(org.organization_plan if org else None)
    if file_size_limit is not None and file_size > file_size_limit:
        await websocket.send_json({
            "type": "error",
            "detail": f"Free plan allows a maximum file size of {file_size_limit // (1024 * 1024)} MB. Upgrade to Pro for larger uploads."
        })
        return

    stored_file_name = file_name.strip()
    duplicate_error = _check_duplicate_file(db, stored_file_name, channel.org_id, channel.team_id)
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
            logger.exception("Cloudinary upload failed", extra={"file_name": file_name})
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
        channel_id=channel.channel_id,
        org_id=channel.org_id,
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
    except Exception:
        logger.exception(
            "Failed to embed document",
            extra={"file_name": stored_file_name, "document_id": new_file.id, "user_id": user_id},
        )


def fetch_voice_participants_service(channel_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

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

    if channel.team_id is not None:
        organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
        is_owner = organization and organization.owner_id == user_id
        if not is_owner:
            is_team_member = db.query(Team_association).filter(
                Team_association.team_id == channel.team_id,
                Team_association.user_id == user_id
            ).first()
            if not is_team_member:
                raise HTTPException(status_code=403, detail="You must be a member of this team to view voice participants")

    participants = voice_manager.get_participants(channel_id)
    return {
        "participants": participants,
        "total_participants": len(participants),
    }


DEFAULT_MESSAGE_LIMIT = 50
MAX_MESSAGE_LIMIT = 200


def _normalize_message_pagination(limit: int | None, offset: int | None) -> tuple[int, int]:
    try:
        normalized_limit = int(limit if limit is not None else DEFAULT_MESSAGE_LIMIT)
        normalized_offset = int(offset if offset is not None else 0)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="limit and offset must be valid integers")

    if normalized_limit <= 0:
        raise HTTPException(status_code=400, detail="limit must be greater than 0")
    if normalized_limit > MAX_MESSAGE_LIMIT:
        raise HTTPException(status_code=400, detail=f"limit cannot exceed {MAX_MESSAGE_LIMIT}")
    if normalized_offset < 0:
        raise HTTPException(status_code=400, detail="offset must be >= 0")

    return normalized_limit, normalized_offset


def fetch_message_service(
    channel_id: int,
    org_id: int,
    user: Users,
    db: Session,
    limit: int | None = None,
    offset: int | None = None,
):
    user_id = user.user_id

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

    if channel.team_id is not None:
        in_team = db.query(Team_association).filter_by(
            team_id=channel.team_id, user_id=user_id
        ).first()
        organization = db.query(Organization).filter(
            Organization.organization_id == org_id
        ).first()
        if not in_team and (not organization or organization.owner_id != user_id):
            raise HTTPException(status_code=403, detail="Not a team member")

    limit, offset = _normalize_message_pagination(limit, offset)

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

    page_rows = db.query(Messages, Users).join(
        Users, Messages.sender_id == Users.user_id
    ).filter(
        Messages.channel_id == channel_id,
        Messages.is_deleted == False
    ).order_by(Messages.sent_at.desc(), Messages.message_id.desc()).offset(offset).limit(limit + 1).all()

    has_more = len(page_rows) > limit
    page_rows = page_rows[:limit]
    messages = list(reversed(page_rows))

    parent_ids = {m.parent_id for m, _ in messages if m.parent_id}
    parents_by_id: dict[int, tuple[Messages, Users]] = {}
    if parent_ids:
        parent_rows = db.query(Messages, Users).join(
            Users, Messages.sender_id == Users.user_id
        ).filter(
            Messages.message_id.in_(parent_ids),
            Messages.channel_id == channel_id,
            Messages.is_deleted == False,
        ).all()
        parents_by_id = {pm.message_id: (pm, ps) for pm, ps in parent_rows}

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
        if message.parent_id and message.parent_id in parents_by_id:
            parent_message, parent_sender = parents_by_id[message.parent_id]
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

    window_start = min((m.sent_at for m, _ in messages), default=None)
    window_end = max((m.sent_at for m, _ in messages), default=None)

    files_query = db.query(Files, Users).join(Users, Files.sender_id == Users.user_id).filter(
        Files.is_deleted == False
    )
    if channel.team_id is not None:
        files_query = files_query.filter(Files.team_id == channel.team_id)
    else:
        files_query = files_query.filter(Files.team_id == None, Files.org_id == org_id)
    if window_start is not None and window_end is not None:
        files_query = files_query.filter(Files.sent_at >= window_start, Files.sent_at <= window_end)
    files = files_query.order_by(Files.sent_at.desc()).limit(MAX_MESSAGE_LIMIT).all()

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

    return {
        "messages": result,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "returned": len(messages),
            "has_more": has_more,
        },
    }


def edit_message_service(message_id: int, data: Message_edit_input, user: Users, db: Session):
    user_id = user.user_id

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


def delete_message_service(message_id: int, user: Users, db: Session):
    user_id = user.user_id

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
    org_id: int,
):
    logger.info(
        "messages websocket handler entered",
        extra={"channel_id": channel_id, "org_id": org_id, "token_len": len(authorization) if authorization else 0},
    )
    await websocket.accept()
    logger.info("messages websocket accepted", extra={"channel_id": channel_id, "org_id": org_id})

    auth_db = SessionLocal()
    try:
        user = await authenticate_ws(websocket, authorization, auth_db)
        if not user:
            return

        user_id = user.user_id

        member = auth_db.query(Organization_members).filter(
            Organization_members.memmber_id == user_id,
            Organization_members.org_id == org_id
        ).first()

        if not member:
            await websocket.close(code=1008, reason="Not a member of this organization")
            return

        channel = auth_db.query(Channels).filter(
            Channels.channel_id == channel_id,
            Channels.org_id == org_id
        ).first()

        if not channel:
            await websocket.close(code=1008, reason="Channel not found")
            return

        if channel.team_id is not None:
            in_team = auth_db.query(Team_association).filter_by(
                team_id=channel.team_id, user_id=user_id
            ).first()
            organization = auth_db.query(Organization).filter(
                Organization.organization_id == org_id
            ).first()
            if not in_team and (not organization or organization.owner_id != user_id):
                await websocket.close(code=1008, reason="Not a team member")
                return

        channel_name = channel.channel_name
        channel_team_id = channel.team_id
        channel_mode = channel.channel_mode
    finally:
        auth_db.close()

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

                    if channel_mode == "announcement" and not user_can_announce(msg_db, user_id, channel_team_id, org_id):
                        detail = (
                            "Only members with announcement permission can post in this channel"
                            if channel_team_id is not None
                            else "Only the organization owner and admins can post in this channel"
                        )
                        await websocket.send_json({
                            "type": "error",
                            "detail": detail
                        })
                        continue

                    if channel_team_id is not None:
                        org = msg_db.query(Organization).filter(Organization.organization_id == org_id).first()
                        if not (org and org.owner_id == user_id):
                            role = msg_db.query(Team_roles).filter(
                                Team_roles.team_id == channel_team_id,
                                Team_roles.user_id == user_id
                            ).first()
                            if not role or not role.can_send_messages:
                                await websocket.send_json({
                                    "type": "error",
                                    "detail": "You don't have permission to send messages in this channel"
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

                    sender = msg_db.query(Users).filter(Users.user_id == user_id).first()

                    mention_tags = get_user_tag(content)
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

                    announcement_recipients: list[Users] = []
                    if channel_mode == "announcement":
                        mentioned_ids = {m.user_id for m in mentioned_users}
                        announcement_recipients = [
                            r for r in get_announcement_recipients(msg_db, channel_team_id, org_id, user_id)
                            if r.user_id not in mentioned_ids
                        ]

                    try:
                        msg_db.add(new_message)
                        msg_db.flush()
                        create_mention_notifications(msg_db, mentioned_users, new_message.message_id)
                        create_announcement_notifications(msg_db, announcement_recipients, new_message.message_id)
                        msg_db.commit()
                    except Exception:
                        msg_db.rollback()
                        logger.exception(
                            "Failed to persist message",
                            extra={"channel_id": channel_id, "org_id": org_id, "user_id": user_id},
                        )
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Failed to send message",
                        })
                        continue

                    msg_db.refresh(new_message)

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
                    except Exception:
                        logger.exception(
                            "Failed to upsert message to Pinecone",
                            extra={"message_id": new_message.message_id, "channel_id": channel_id, "org_id": org_id},
                        )

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
                            logger.exception(
                                "Failed to push mention notification",
                                extra={"receiver_id": mentioned.user_id, "message_id": new_message.message_id},
                            )
                            continue

                    for recipient in announcement_recipients:
                        try:
                            await push_announcement_notification(
                                receiver_id=recipient.user_id,
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
                            logger.exception(
                                "Failed to push announcement notification",
                                extra={"receiver_id": recipient.user_id, "message_id": new_message.message_id},
                            )
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
                    if channel_mode == "announcement" and not user_can_announce(file_db, user_id, channel_team_id, org_id):
                        detail = (
                            "Only members with announcement permission can post in this channel"
                            if channel_team_id is not None
                            else "Only the organization owner and admins can post in this channel"
                        )
                        await websocket.send_json({
                            "type": "error",
                            "detail": detail
                        })
                        continue
                    await send_file_realtime_service(
                        data=data,
                        websocket=websocket,
                        channel_id=channel_id,
                        user_id=user_id,
                        channel=channel,
                        db=file_db,
                    )
                except Exception as e:
                    logger.exception(
                        "File upload failed",
                        extra={"channel_id": channel_id, "org_id": org_id, "user_id": user_id},
                    )
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
):
    from utils.security import authenticate_ws
    await websocket.accept()

    auth_db = SessionLocal()
    try:
        user = await authenticate_ws(websocket, authorization, auth_db)
        if not user:
            return

        user_id = user.user_id
    finally:
        auth_db.close()

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
):
    from utils.security import authenticate_ws

    auth_db = SessionLocal()
    try:
        user = await authenticate_ws(websocket, authorization, auth_db)
        if not user:
            return

        member = auth_db.query(Organization_members).filter(
            Organization_members.memmber_id == user.user_id,
            Organization_members.org_id == org_id
        ).first()

        if not member:
            await websocket.close(code=1008, reason="Not a member of this organization")
            return

        channel = auth_db.query(Channels).filter(
            Channels.channel_id == channel_id,
            Channels.org_id == org_id
        ).first()

        if not channel:
            await websocket.close(code=1008, reason="Channel not found")
            return

        if str(channel.channel_category).lower() != "voice":
            await websocket.close(code=1008, reason="Channel is not a voice channel")
            return

        if channel.team_id is not None:
            org = auth_db.query(Organization).filter(Organization.organization_id == org_id).first()
            is_owner = org and org.owner_id == user.user_id
            if not is_owner:
                is_team_member = auth_db.query(Team_association).filter(
                    Team_association.team_id == channel.team_id,
                    Team_association.user_id == user.user_id
                ).first()
                if not is_team_member:
                    await websocket.close(code=1008, reason="Not a team member")
                    return

        participant = {
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar_url": user.avatar_url,
            "user_tag": user.user_tag,
        }
    finally:
        auth_db.close()

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
            
            
def search_messages_service(
    channel_id: int,
    org_id: int,
    query: str,
    user: Users,
    db: Session,
    limit: int | None = None,
    offset: int | None = None,
):
    user_id = user.user_id

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

    if channel.team_id is not None:
        in_team = db.query(Team_association).filter_by(
            team_id=channel.team_id, user_id=user_id
        ).first()
        organization = db.query(Organization).filter(
            Organization.organization_id == org_id
        ).first()
        if not in_team and (not organization or organization.owner_id != user_id):
            raise HTTPException(status_code=403, detail="Not a team member")

    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    limit, offset = _normalize_message_pagination(limit, offset)

    search_term = f"%{query.strip()}%"

    rows = db.query(Messages, Users).join(
        Users, Messages.sender_id == Users.user_id
    ).filter(
        Messages.channel_id == channel_id,
        Messages.is_deleted == False,
        Messages.message_content.ilike(search_term)
    ).order_by(Messages.sent_at.desc(), Messages.message_id.desc()).offset(offset).limit(limit + 1).all()

    has_more = len(rows) > limit
    rows = rows[:limit]

    return {
        "messages": [
            {
                "message_id": message.message_id,
                "message_content": message.message_content,
                "sent_at": message.sent_at,
                "edited_at": message.edited_at,
                "sender": {
                    "user_id": sender.user_id,
                    "first_name": sender.first_name,
                    "last_name": sender.last_name,
                    "avatar_url": sender.avatar_url,
                    "user_tag": sender.user_tag
                }
            }
            for message, sender in rows
        ],
        "pagination": {
            "limit": limit,
            "offset": offset,
            "returned": len(rows),
            "has_more": has_more,
        },
    }


def pin_message_service(message_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

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


def unpin_message_service(message_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

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


def fetch_pinned_messages_service(channel_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

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

    if channel.team_id is not None:
        in_team = db.query(Team_association).filter_by(
            team_id=channel.team_id, user_id=user_id
        ).first()
        organization = db.query(Organization).filter(
            Organization.organization_id == org_id
        ).first()
        if not in_team and (not organization or organization.owner_id != user_id):
            raise HTTPException(status_code=403, detail="Not a team member")

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
