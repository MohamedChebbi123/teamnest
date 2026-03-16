from services.channel_service import (
    create_channel_service, 
    fetch_channels_service, 
    fetch_single_channel_service,
    update_channel_service,
    delete_channel_service
)
from services.message_service import  fetch_message_service, edit_message_service, delete_message_service, websocket_endpoint as websocket_service, voice_websocket_endpoint as voice_websocket_service
from fastapi import APIRouter, Depends, Header, Query, WebSocket
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Channels_input import Channels_input
from schemas.Message_input import Message_input
from schemas.Message_edit_input import Message_edit_input

router = APIRouter()


@router.post("/organization/{org_id}/create_channel")
async def create_channel(
    org_id: int,
    data: Channels_input,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return create_channel_service(data, org_id, authorization, db)


@router.get("/organization/{org_id}/channels")
async def get_channels(
    org_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return fetch_channels_service(org_id, authorization, db)


@router.get("/channel/{channel_id}")
async def get_channel(
    channel_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return fetch_single_channel_service(channel_id, authorization, db)


@router.put("/channel/{channel_id}")
async def update_channel(
    channel_id: int,
    data: Channels_input,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return update_channel_service(channel_id, data, authorization, db)


@router.delete("/channel/{channel_id}")
async def delete_channel(
    channel_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return delete_channel_service(channel_id, authorization, db)


# @router.post("/channel/send_message")
# async def send_message(
#     data: Message_input,
#     authorization: str = Header(None),
#     db: Session = Depends(connect_databse)
# ):

#     return send_messages_channel_service(data, authorization, db)


@router.get("/organization/{org_id}/channel/{channel_id}/messages")
async def get_messages(
    channel_id: int,
    org_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return fetch_message_service(channel_id, org_id, authorization, db)


@router.put("/message/{message_id}")
async def edit_message(
    message_id: int,
    data: Message_edit_input,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return edit_message_service(message_id, data, authorization, db)


@router.delete("/message/{message_id}")
async def delete_message(
    message_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return delete_message_service(message_id, authorization, db)


@router.websocket("/mesages/{channel_id}")
async def websocket_handler(
    websocket: WebSocket,
    channel_id: int,
    token: str = Query(...),
    org_id: int = Query(...),
    db: Session = Depends(connect_databse)
):

    return await websocket_service(websocket, channel_id, token, org_id, db)


@router.websocket("/voice/{channel_id}")
async def voice_websocket_handler(
    websocket: WebSocket,
    channel_id: int,
    authorization: str = Query(...),
    org_id: int = Query(...),
    db: Session = Depends(connect_databse)
):
    return await voice_websocket_service(websocket, channel_id, authorization, org_id, db)