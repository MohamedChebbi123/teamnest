from models.Users import Users
from sqlalchemy.orm import Session
from fastapi import HTTPException
from utils.hasher import hash_password
from utils.cloudinary_handler import upload_user_profile_image
from utils.email_sender import simple_send, send_password_reset_code
from datetime import datetime, timedelta, UTC
import re
import random
from schemas.Logininput import Logininput
from utils.hasher import verify_password
from utils.jwt_handler import create_access_token,create_refresh_token
from utils.jwt_handler import verify_token
from utils.Websocket_manager import connectivity_manager
from models.Friends import Friends
from database.connection import SessionLocal

ConnectivityManager=connectivity_manager

async def register_user_service(
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    db: Session
):

    if len(first_name.strip()) < 5:
        raise HTTPException(status_code=400, detail="First name must be at least 5 characters long")
    
   
    if len(last_name.strip()) < 5:
        raise HTTPException(status_code=400, detail="Last name must be at least 5 characters long")
    
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    
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



    new_user = Users(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hashed=hash_password(password),
        user_tag=str(random.randint(1, 100000)),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

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
    
    if user.verification_code_expiry < datetime.now(UTC).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    
    user.is_verified = True
    user.verification_code = None
    user.verification_code_expiry = None
    
    db.commit()
    db.refresh(user)
    
    return user


async def resend_verification_service(
    email: str,
    db: Session
):
    user = db.query(Users).filter(Users.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")
    
    verification_code = str(random.randint(100000, 999999))
    verification_expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=10)
    
    user.verification_code = verification_code
    user.verification_code_expiry = verification_expiry
    
    db.commit()
    db.refresh(user)
    
    try:
        await simple_send(email, verification_code)
    except Exception as e:
        print(f"Failed to send verification email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")
    
    return {"message": "Verification code sent successfully"}


async def login_user_service(validator:Logininput,db: Session):
    
    found_user=db.query(Users).filter(Users.email==validator.email).first()
    
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(validator.password,found_user.password_hashed):
        raise HTTPException(status_code=401,detail="wrong password")
    
    access_token=create_access_token({"sub": str(found_user.user_id)})
    print(access_token)
    
    return{
        "message":"user logged in successfully",
        "access_token":access_token
    }


async def view_profile_service(authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "country": user.country,
        "avatar_url": user.avatar_url,
        "user_tag": user.user_tag,
        "joined_at": user.joined_at.isoformat() if user.joined_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "is_verified": user.is_verified,
        "profile_completed": user.profile_completed
    }


async def complete_profile_service(
    authorization: str,
    phone_number: str,
    country: str,
    image,
    db: Session
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.profile_completed:
        raise HTTPException(status_code=400, detail="Profile is already completed")
    
    phone_digits = re.sub(r'\D', '', phone_number)  
    if len(phone_digits) < 10:
        raise HTTPException(status_code=400, detail="Phone number must be at least 10 digits")
    
    existing_phone = db.query(Users).filter(
        Users.phone_number == phone_number,
        Users.user_id != user_id
    ).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number is already used")
    
    avatar_url = upload_user_profile_image(image)
    
    user.phone_number = phone_number
    user.country = country
    user.avatar_url = avatar_url
    user.profile_completed = True
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Profile completed successfully",
        "user": {
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "country": user.country,
            "avatar_url": user.avatar_url,
            "profile_completed": user.profile_completed
        }
    }
    
    
async def edit_avatar_username(db: Session, authorization: str, image=None, lastname: str = None, firstname: str = None):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if firstname is not None:
        if len(firstname.strip()) < 5:
            raise HTTPException(status_code=400, detail="First name must be at least 5 characters long")
        user.first_name = firstname
    
    if lastname is not None:
        if len(lastname.strip()) < 5:
            raise HTTPException(status_code=400, detail="Last name must be at least 5 characters long")
        user.last_name = lastname
    
    if image:
        avatar_url = upload_user_profile_image(image)
        user.avatar_url = avatar_url
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "avatar_url": user.avatar_url
        }
    }


async def edit_email_country_phone(db: Session, authorization: str, email: str = None, country: str = None, phone_number: str = None):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if email is not None:
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            raise HTTPException(status_code=400, detail="Please enter a valid email address")
        
        existing_email = db.query(Users).filter(
            Users.email == email,
            Users.user_id != user_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already used")
        
        user.email = email
    
    if country is not None:
        user.country = country
    
    if phone_number is not None:
        phone_digits = re.sub(r'\D', '', phone_number)
        if len(phone_digits) < 10:
            raise HTTPException(status_code=400, detail="Phone number must be at least 10 digits")
        
        existing_phone = db.query(Users).filter(
            Users.phone_number == phone_number,
            Users.user_id != user_id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number is already used")
        
        user.phone_number = phone_number
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "country": user.country,
            "avatar_url": user.avatar_url
        }
    }
    

async def send_password_reset_code_service(email: str, db: Session):
    
    user = db.query(Users).filter(Users.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found with this email")
    
    reset_code = str(random.randint(100000, 999999))
    reset_code_expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=10)
    
    user.reset_code = reset_code
    user.reset_code_expiry = reset_code_expiry
    
    db.commit()
    db.refresh(user)
    
    try:
        await send_password_reset_code(email, reset_code)
    except Exception as e:
        print(f"Failed to send password reset email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send password reset email")
    
    return {"message": "Password reset code sent to your email"}


async def verify_reset_code_service(email: str, reset_code: str, db: Session):
    
    user = db.query(Users).filter(Users.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.reset_code:
        raise HTTPException(status_code=400, detail="No reset code requested for this account")
    
    if user.reset_code != reset_code:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    if user.reset_code_expiry < datetime.now(UTC).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one")
    
    return {"message": "Reset code verified successfully"}


async def reset_password_service(email: str, reset_code: str, new_password: str, db: Session):
    
    user = db.query(Users).filter(Users.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.reset_code:
        raise HTTPException(status_code=400, detail="No reset code requested for this account")
    
    if user.reset_code != reset_code:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    if user.reset_code_expiry < datetime.now(UTC).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    
    if not re.search(r'[a-z]', new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    
    if not re.search(r'[A-Z]', new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    
    if not re.search(r'[0-9]', new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    
    user.password_hashed = hash_password(new_password)
    user.reset_code = None
    user.reset_code_expiry = None
    
    db.commit()
    db.refresh(user)
    
    return {"message": "Password reset successful. You can now login with your new password"}



async def change_password_service(authorization: str, current_password: str, new_password: str, db: Session):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(Users).filter(Users.email == payload["sub"]).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(current_password, user.password_hashed):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    if not re.search(r'[a-z]', new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")

    if not re.search(r'[A-Z]', new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")

    if not re.search(r'[0-9]', new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")

    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    user.password_hashed = hash_password(new_password)
    db.commit()

    return {"message": "Password changed successfully"}


async def get_user_info_by_id_service(user_id:int,authorization: str,db: Session):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(Users).filter(Users.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "country": user.country,
        "avatar_url": user.avatar_url,
        "joined_at": user.joined_at,
        "last_login_at": user.last_login_at,
        "user_tag": user.user_tag,
        "is_verified": user.is_verified,
    }
    


async def check_connectivity(websocket, authorization: str, db: Session):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    user = db.query(Users).filter(Users.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")


    from sqlalchemy import or_
    user_friends = db.query(Friends).filter(
        or_(Friends.user_id == user_id, Friends.friend_id == user_id)
    ).all()

    friend_ids = [
        found_friend.friend_id if found_friend.user_id == user_id else found_friend.user_id
        for found_friend in user_friends
    ]

    db.close()

    await ConnectivityManager.connect(user_id, websocket)
    await ConnectivityManager.broadcast(friend_ids, {"type": "user_online", "user_id": user_id})

    already_online = [fid for fid in friend_ids if ConnectivityManager.is_online(fid)]
    if already_online:
        await websocket.send_json({"type": "friends_online", "user_ids": already_online})

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                ConnectivityManager.last_seen[user_id] = datetime.now(UTC)
                await websocket.send_json({"type": "pong"})
    except Exception:
        pass
    finally:
        ConnectivityManager.disconnect(user_id, websocket)
        if not ConnectivityManager.is_online(user_id):
            await ConnectivityManager.broadcast(friend_ids, {"type": "user_offline", "user_id": user_id})


def get_online_status(user_ids: list[int]) -> dict:
    return {uid: ConnectivityManager.is_online(uid) for uid in user_ids}

