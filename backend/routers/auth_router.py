from schemas.Logininput import Logininput
from services.auth_service import (
    register_user_service,
    verify_email_service,
    resend_verification_service,
    login_user_service,
    refresh_access_token_service,
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
    get_online_status
)
from fastapi import APIRouter, Form, File, Depends, UploadFile, WebSocket, Query
from sqlalchemy.orm import Session
from database.connection import connect_databse
from models.Users import Users
from utils.security import current_user, current_user_ws

router = APIRouter()


@router.post("/register")
async def register_new_user(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(connect_databse)
):
    new_user = await register_user_service(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password=password,
        db=db
    )
    return {
        "message": "User registered successfully",
        "user": {
            "user_id": new_user.user_id,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "email": new_user.email
        }
    }


@router.post("/verify-email")
async def verify_email(
    email: str = Form(...),
    verification_code: str = Form(...),
    db: Session = Depends(connect_databse)
):
    verified_user = await verify_email_service(
        email=email,
        verification_code=verification_code,
        db=db
    )
    return {
        "message": "Email verified successfully",
        "user": {
            "user_id": verified_user.user_id,
            "email": verified_user.email,
            "is_verified": verified_user.is_verified
        }
    }


@router.post("/resend-verification")
async def resend_verification(
    email: str = Form(...),
    db: Session = Depends(connect_databse)
):
    return await resend_verification_service(email=email, db=db)


@router.post("/login")
async def login_user_router(validator: Logininput, db: Session = Depends(connect_databse)):
    return await login_user_service(validator, db)


@router.post("/refresh")
async def refresh_access_token_router(
    refresh_token: str = Form(...),
    db: Session = Depends(connect_databse)
):
    return await refresh_access_token_service(refresh_token, db)


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
    _: Users = Depends(current_user)
):
    ids = [int(uid) for uid in user_ids.split(",") if uid.strip().isdigit()]
    return get_online_status(ids)
