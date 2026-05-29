import os
from schemas.Logininput import Logininput
from services.auth_service import (
    register_user_service,
    login_user_service,
    refresh_access_token_service,
    logout_service,
    logout_all_service,
    view_profile_service,
    complete_profile_service,
    edit_avatar_username,
    edit_email_country_phone,
    send_password_reset_code_service,
    verify_reset_code_service,
    reset_password_service,
    change_password_service,
    get_user_info_by_id_service,
    check_connectivity,
    get_online_status,
    set_my_status_service,
)
from fastapi import APIRouter, Form, File, Depends, UploadFile, WebSocket, Query, Request, Response, Cookie
from sqlalchemy.orm import Session
from database.connection import connect_databse
from models.Users import Users
from utils.security import current_user, current_user_ws
from utils.jwt_handler import REFRESH_TOKEN_EXPIRE_DAYS

router = APIRouter()

REFRESH_COOKIE_NAME = "refresh_token"
_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()
_COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None


def _set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        domain=_COOKIE_DOMAIN,
        path="/",
    )


def _clear_refresh_cookie(response: Response):
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        domain=_COOKIE_DOMAIN,
        path="/",
    )


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    return ua, ip


@router.post("/register")
async def register_new_user(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(connect_databse)
):
    return await register_user_service(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password=password,
        db=db
    )


@router.post("/login")
async def login_user_router(
    validator: Logininput,
    request: Request,
    response: Response,
    db: Session = Depends(connect_databse),
):
    ua, ip = _client_meta(request)
    result = await login_user_service(validator, db, user_agent=ua, ip_address=ip)
    refresh = result.pop("refresh_token", None)
    if refresh:
        _set_refresh_cookie(response, refresh)
    return result


@router.post("/refresh")
async def refresh_access_token_router(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(connect_databse),
):
    ua, ip = _client_meta(request)
    try:
        result = await refresh_access_token_service(refresh_token, db, user_agent=ua, ip_address=ip)
    except Exception:
        _clear_refresh_cookie(response)
        raise
    new_refresh = result.pop("refresh_token", None)
    if new_refresh:
        _set_refresh_cookie(response, new_refresh)
    return result


@router.post("/logout")
async def logout_router(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(connect_databse),
):
    result = await logout_service(refresh_token, db)
    _clear_refresh_cookie(response)
    return result


@router.post("/logout-all")
async def logout_all_router(
    response: Response,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    result = await logout_all_service(user, db)
    _clear_refresh_cookie(response)
    return result


@router.get("/profile")
async def get_profile(user: Users = Depends(current_user)):
    return await view_profile_service(user)


@router.post("/complete-profile")
async def complete_profile(
    phone_number: str = Form(...),
    country: str = Form(...),
    avatar: UploadFile = File(...),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse)
):
    return await complete_profile_service(user, phone_number, country, avatar, db)


@router.put("/update-profile")
async def update_profile(
    first_name: str = Form(None),
    last_name: str = Form(None),
    avatar: UploadFile = File(None),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse)
):
    return await edit_avatar_username(db, user, avatar, last_name, first_name)


@router.put("/update-contact-info")
async def update_contact_info(
    email: str = Form(None),
    country: str = Form(None),
    phone_number: str = Form(None),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse)
):
    return await edit_email_country_phone(db, user, email, country, phone_number)


@router.post("/forgot-password")
async def forgot_password(
    email: str = Form(...),
    db: Session = Depends(connect_databse)
):
    return await send_password_reset_code_service(email, db)


@router.post("/verify-reset-code")
async def verify_reset_code(
    email: str = Form(...),
    reset_code: str = Form(...),
    db: Session = Depends(connect_databse)
):
    return await verify_reset_code_service(email, reset_code, db)


@router.post("/reset-password")
async def reset_password(
    email: str = Form(...),
    reset_code: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(connect_databse)
):
    return await reset_password_service(email, reset_code, new_password, db)


@router.put("/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse)
):
    return await change_password_service(user, current_password, new_password, db)


@router.get("/get_user_info")
async def get_user_info_service(
    user_id: int,
    _: Users = Depends(current_user),
    db: Session = Depends(connect_databse)
):
    return await get_user_info_by_id_service(user_id, db)


@router.websocket("/ws/connectivity")
async def connectivity_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(connect_databse)
):
    user: Users = await current_user_ws(websocket, token, db)
    await check_connectivity(websocket, user, db)


@router.get("/online-status")
async def online_status(
    user_ids: str = Query(..., description="Comma-separated user IDs"),
    _: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    ids = [int(uid) for uid in user_ids.split(",") if uid.strip().isdigit()]
    return get_online_status(ids, db)


@router.put("/me/status")
async def set_my_status(
    status: str = Form(...),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return await set_my_status_service(user, status, db)
