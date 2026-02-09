from services.auth_service import register_user_service, verify_email_service
from fastapi import APIRouter, Form, File, Depends, UploadFile
from sqlalchemy.orm import Session
from database.connection import connect_databse

router = APIRouter()


@router.post("/register")
async def register_new_user(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone_number: str = Form(...),
    country: str = Form(...),
    password: str = Form(...),
    captcha_token: str = Form(...),
    avatar: UploadFile = File(...),
    db: Session = Depends(connect_databse)
):
    new_user = await register_user_service(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone_number=phone_number,
        country=country,
        password=password,
        captcha_token=captcha_token,
        image=avatar,
        db=db
    )
    return {
        "message": "User registered successfully",
        "user": {
            "user_id": new_user.user_id,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "email": new_user.email,
            "avatar_url": new_user.avatar_url
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
