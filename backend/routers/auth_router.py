from schemas.Logininput import Logininput
from services.auth_service import (
    register_user_service, 
    verify_email_service, 
    resend_verification_service, 
    login_user_service, 
    view_profile_service, 
    complete_profile_service, 
    edit_avatar_username, 
    edit_email_country_phone,
    send_password_reset_code_service,
    verify_reset_code_service,
    reset_password_service
)
from fastapi import APIRouter, Form, File, Depends, UploadFile, Header
from sqlalchemy.orm import Session
from database.connection import connect_databse

router = APIRouter()


@router.post("/register")
async def register_new_user(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    captcha_token: str = Form(...),
    db: Session = Depends(connect_databse)
):
    new_user = await register_user_service(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password=password,
        captcha_token=captcha_token,
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


@router.get("/profile")
async def get_profile(
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return await view_profile_service(authorization, db)


@router.post("/complete-profile")
async def complete_profile(
    authorization: str = Header(None),
    phone_number: str = Form(...),
    country: str = Form(...),
    avatar: UploadFile = File(...),
    db: Session = Depends(connect_databse)
):
    return await complete_profile_service(authorization, phone_number, country, avatar, db)


@router.put("/update-profile")
async def update_profile(
    authorization: str = Header(None),
    first_name: str = Form(None),
    last_name: str = Form(None),
    avatar: UploadFile = File(None),
    db: Session = Depends(connect_databse)
):
    return await edit_avatar_username(db, authorization, avatar, last_name, first_name)


@router.put("/update-contact-info")
async def update_contact_info(
    authorization: str = Header(None),
    email: str = Form(None),
    country: str = Form(None),
    phone_number: str = Form(None),
    db: Session = Depends(connect_databse)
):
    return await edit_email_country_phone(db, authorization, email, country, phone_number)


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
