from fastapi import APIRouter, Form, File, Depends, UploadFile, Header, Body, WebSocket, Query
from sqlalchemy.orm import Session
from database.connection import connect_databse
from services.groupe_chat_service import (
    create_group_chat,
    get_friends_for_group_chat,
    add_members_to_group_chat,
    get_my_group_chats,
    edit_group_chat_service,
    delete_group_chat_service,
    fetch_group_messages_service,
    edit_group_message_service,
    delete_group_message_service,
    group_chat_websocket_service,
)
from typing import List

router = APIRouter()


@router.post("/create_group_chat")
async def create_group(
    group_name: str = Form(...),
    group_description: str = Form(...),
    image: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return create_group_chat(group_name, group_description, image, authorization, db)


@router.get("/group_chat/{group_chat_id}/friends")
async def get_friends_to_add(
    group_chat_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return get_friends_for_group_chat(group_chat_id, authorization, db)


@router.post("/group_chat/{group_chat_id}/add_members")
async def add_members(
    group_chat_id: int,
    member_ids: List[int] = Body(...),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return add_members_to_group_chat(group_chat_id, member_ids, authorization, db)


@router.get("/group_chats")
async def get_group_chats(
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return get_my_group_chats(authorization, db)


@router.put("/group_chat/{group_chat_id}")
async def edit_group(
    group_chat_id: int,
    group_name: str = Form(None),
    group_description: str = Form(None),
    image: UploadFile = File(None),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return edit_group_chat_service(group_chat_id, authorization, db, group_name, group_description, image)


@router.delete("/group_chat/{group_chat_id}")
async def delete_group(
    group_chat_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return delete_group_chat_service(group_chat_id, authorization, db)


@router.get("/group_chat/{group_chat_id}/messages")
async def get_group_messages(
    group_chat_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_group_messages_service(group_chat_id, authorization, db)


@router.put("/group_chat/{group_chat_id}/messages/{message_id}")
async def edit_group_message(
    group_chat_id: int,
    message_id: int,
    content: str = Body(..., embed=True),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return edit_group_message_service(group_chat_id, message_id, content, authorization, db)


@router.delete("/group_chat/{group_chat_id}/messages/{message_id}")
async def delete_group_message(
    group_chat_id: int,
    message_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return delete_group_message_service(group_chat_id, message_id, authorization, db)


@router.websocket("/ws/group_chat/{group_chat_id}")
async def group_chat_ws(
    group_chat_id: int,
    websocket: WebSocket,
    token: str = Query(None),
    db: Session = Depends(connect_databse)
):
    authorization = f"Bearer {token}" if token else ""
    await group_chat_websocket_service(group_chat_id, websocket, authorization, db)
