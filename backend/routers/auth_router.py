from services.auth_service import register_user_service
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
