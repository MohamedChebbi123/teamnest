from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Friend_input import FriendRequestInput, FriendRequestAction
from services.friends_service import (
    send_friend_request_service,
    accept_or_reject_friend_service,
    remove_friend_service,
    get_friends_service,
    get_pending_requests_service,
    block_user_service,
    unblock_user_service,
    get_blocked_users_service,
)
from utils.Websocket_manager import friend_request_ws_manager
from utils.jwt_handler import verify_token
from models.Users import Users
from utils.security import current_user

router = APIRouter()


@router.websocket("/ws/friend-requests")
async def friend_requests_ws(websocket: WebSocket, token: str):
    payload = verify_token(token, "access")
    if not payload or "sub" not in payload:
        await websocket.close(code=4001)
        return
    user_id = int(payload["sub"])
    await friend_request_ws_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        friend_request_ws_manager.disconnect(user_id, websocket)


@router.post("/friends/request")
async def send_friend_request(
    data: FriendRequestInput,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return await send_friend_request_service(user, db, user_tag=data.user_tag, receiver_id=data.receiver_id)


@router.post("/friends/request/{request_id}")
async def accept_or_reject_friend_request(
    request_id: int,
    data: FriendRequestAction,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return accept_or_reject_friend_service(request_id, data.action, user, db)


@router.delete("/friends/{friend_id}")
async def remove_friend(
    friend_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return remove_friend_service(friend_id, user, db)


@router.get("/friends")
async def get_friends(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return get_friends_service(user, db)


@router.get("/friends/requests")
async def get_pending_requests(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return get_pending_requests_service(user, db)


@router.post("/friends/block/{user_id}")
async def block_user(
    user_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return block_user_service(user_id, user, db)


@router.delete("/friends/unblock/{user_id}")
async def unblock_user(
    user_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return unblock_user_service(user_id, user, db)


@router.get("/friends/blocked")
async def get_blocked_users(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return get_blocked_users_service(user, db)
