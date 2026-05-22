from fastapi import Depends, Header, HTTPException, Query, WebSocket
from sqlalchemy.orm import Session

from database.connection import connect_databse
from models.Users import Users
from utils.jwt_handler import verify_token


def _resolve_user(token: str | None, db: Session) -> Users:
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    payload = verify_token(token, "access")
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(Users).filter(Users.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.account_status == "banned":
        raise HTTPException(status_code=403, detail="This account has been banned")

    return user


def current_user(
    authorization: str = Header(None),
    db: Session = Depends(connect_databse),
) -> Users:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return _resolve_user(authorization.split(" ", 1)[1], db)


async def current_user_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(connect_databse),
) -> Users:
    return _resolve_user(token, db)


async def authenticate_ws(websocket: WebSocket, authorization: str | None, db: Session) -> Users | None:
    if not authorization:
        await websocket.close(code=1008, reason="Invalid authorization header")
        return None

    token = authorization.split(" ", 1)[1] if authorization.startswith("Bearer ") else authorization
    payload = verify_token(token, "access")
    if not payload or "sub" not in payload:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return None

    user = db.query(Users).filter(Users.user_id == int(payload["sub"])).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return None

    if user.account_status == "banned":
        await websocket.close(code=1008, reason="Account banned")
        return None

    return user
