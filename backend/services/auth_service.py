from models.Users import Users
from sqlalchemy.orm import Session
from fastapi import HTTPException
from utils.hasher import hash_password
from utils.cloudinary_handler import upload_user_profile_image

def register_user_service(
    first_name: str,
    last_name: str,
    email: str,
    phone_number: str,
    country: str,
    password: str,
    image,
    db: Session
):
    if db.query(Users).filter(Users.email == email).first():
        raise HTTPException(status_code=400, detail="Email is already used")

    if db.query(Users).filter(Users.phone_number == phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number is already used")

    avatar_url = upload_user_profile_image(image)

    new_user = Users(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone_number=phone_number,
        country=country,
        password_hashed=hash_password(password),
        avatar_url=avatar_url
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
