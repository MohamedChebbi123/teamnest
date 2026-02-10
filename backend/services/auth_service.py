from models.Users import Users
from sqlalchemy.orm import Session
from fastapi import HTTPException
from utils.hasher import hash_password
from utils.cloudinary_handler import upload_user_profile_image
from utils.recaptcha_verifier import verify_recaptcha
from utils.email_sender import simple_send
from datetime import datetime, timedelta, UTC
import re
import random
from schemas.Logininput import Logininput
from utils.hasher import verify_password
from utils.jwt_handler import create_access_token,create_refresh_token

async def register_user_service(
    first_name: str,
    last_name: str,
    email: str,
    phone_number: str,
    country: str,
    password: str,
    captcha_token: str,
    image,
    db: Session
):
    
    await verify_recaptcha(captcha_token)
    
    
    if len(first_name.strip()) < 5:
        raise HTTPException(status_code=400, detail="First name must be at least 5 characters long")
    
   
    if len(last_name.strip()) < 5:
        raise HTTPException(status_code=400, detail="Last name must be at least 5 characters long")
    
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    
    phone_digits = re.sub(r'\D', '', phone_number)  
    if len(phone_digits) < 10:
        raise HTTPException(status_code=400, detail="Phone number must be at least 10 digits")
    
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    
    if db.query(Users).filter(Users.email == email).first():
        raise HTTPException(status_code=400, detail="Email is already used")

    if db.query(Users).filter(Users.phone_number == phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number is already used")

    avatar_url = upload_user_profile_image(image)

    verification_code = str(random.randint(100000, 999999))
    verification_expiry = datetime.utcnow() + timedelta(minutes=10)

    new_user = Users(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone_number=phone_number,
        country=country,
        password_hashed=hash_password(password),
        avatar_url=avatar_url,
        user_tag=str(random.randint(1, 100000)),
        verification_code=verification_code,
        verification_code_expiry=verification_expiry
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    try:
        await simple_send(email, verification_code)
    except Exception as e:
        print(f"Failed to send verification email: {str(e)}")

    return new_user


async def verify_email_service(
    email: str,
    verification_code: str,
    db: Session
):
    user = db.query(Users).filter(Users.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")
    
    if user.verification_code != verification_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if user.verification_code_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    
    user.is_verified = True
    user.verification_code = None
    user.verification_code_expiry = None
    
    db.commit()
    db.refresh(user)
    
    return user

async def login_user_service(validator:Logininput,db: Session):
    
    found_user=db.query(Users).filter(Users.email==validator.email).first()
    
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(validator.password,found_user.password_hashed):
        raise HTTPException(status_code=401,detail="wrong password")
    
    refresh_token=create_refresh_token({"sub": str(found_user.user_id)})
    access_token=create_access_token({"sub": str(found_user.user_id)})
    print(refresh_token)
    print(access_token)
    
    return{
        "message":"user logged in successfully",
        "refresh token":refresh_token,
        "access token":access_token
    }