from services.channel_service import (
    create_channel_service,
    fetch_channels_service,
    fetch_single_channel_service,
    update_channel_service,
    delete_channel_service
)
from services.message_service import (
    fetch_message_service,
    edit_message_service,
    delete_message_service,
    send_messages_realtime,
    notifications_ws_endpoint,
    pin_message_service,
    unpin_message_service,
    fetch_pinned_messages_service,
    search_messages_service,
    fetch_user_notifications_service,
    mark_notifications_seen_service,
)
from fastapi import APIRouter, Depends, Query, WebSocket
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Channels_input import Channels_input
from schemas.Message_edit_input import Message_edit_input
from models.Users import Users
from utils.security import current_user

router = APIRouter()


@router.post("/organization/{org_id}/create_channel")
async def create_channel(
    org_id: int,
    data: Channels_input,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return create_channel_service(data, org_id, user, db)


@router.get("/organization/{org_id}/channels")
async def get_channels(
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_channels_service(org_id, user, db)


@router.get("/channel/{channel_id}")
async def get_channel(
    channel_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_single_channel_service(channel_id, user, db)


@router.put("/channel/{channel_id}")
async def update_channel(
    channel_id: int,
    data: Channels_input,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return update_channel_service(channel_id, data, user, db)


@router.delete("/channel/{channel_id}")
async def delete_channel(
    channel_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return delete_channel_service(channel_id, user, db)


@router.get("/organization/{org_id}/channel/{channel_id}/messages")
async def get_messages(
    channel_id: int,
    org_id: int,
    limit: int | None = Query(None),
    offset: int | None = Query(None),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_message_service(channel_id, org_id, user, db, limit=limit, offset=offset)


@router.put("/message/{message_id}")
async def edit_message(
    message_id: int,
    data: Message_edit_input,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return edit_message_service(message_id, data, user, db)


@router.delete("/message/{message_id}")
async def delete_message(
    message_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return delete_message_service(message_id, user, db)


@router.post("/organization/{org_id}/message/{message_id}/pin")
async def pin_message(
    message_id: int,
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return pin_message_service(message_id, org_id, user, db)


@router.delete("/organization/{org_id}/message/{message_id}/unpin")
async def unpin_message(
    message_id: int,
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return unpin_message_service(message_id, org_id, user, db)


@router.get("/organization/{org_id}/channel/{channel_id}/pinned")
async def get_pinned_messages(
    channel_id: int,
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_pinned_messages_service(channel_id, org_id, user, db)


@router.get("/organization/{org_id}/channel/{channel_id}/messages/search")
async def search_messages(
    channel_id: int,
    org_id: int,
    q: str = Query(""),
    limit: int | None = Query(None),
    offset: int | None = Query(None),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return search_messages_service(channel_id, org_id, q, user, db, limit=limit, offset=offset)


@router.websocket("/mesages/{channel_id}")
async def websocket_handler(
    websocket: WebSocket,
    channel_id: int,
    token: str = Query(...),
    org_id: int = Query(...),
):
    return await send_messages_realtime(websocket, channel_id, f"Bearer {token}", org_id)


@router.get("/user/notifications")
async def get_user_notifications(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_user_notifications_service(user, db)


@router.post("/user/notifications/seen")
async def mark_notifications_seen(
    notification_ids: list[int] | None = None,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return mark_notifications_seen_service(user, db, notification_ids)


@router.websocket("/ws/notifications")
async def notifications_websocket_handler(
    websocket: WebSocket,
    token: str = Query(...),
):
    return await notifications_ws_endpoint(websocket, f"Bearer {token}")
