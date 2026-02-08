from models.Users import Users
from sqlalchemy.orm import Session
from fastapi import HTTPException
from utils.hasher import hash_password
from utils.cloudinary_handler import upload_user_profile_image
import re

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
    # Validate first name length
    if len(first_name.strip()) < 5:
        raise HTTPException(status_code=400, detail="First name must be at least 5 characters long")
    
    # Validate last name length
    if len(last_name.strip()) < 5:
        raise HTTPException(status_code=400, detail="Last name must be at least 5 characters long")
    
    # Validate email format
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    
    # Validate phone number length (minimum 10 digits)
    phone_digits = re.sub(r'\D', '', phone_number)  # Remove non-digit characters
    if len(phone_digits) < 10:
        raise HTTPException(status_code=400, detail="Phone number must be at least 10 digits")
    
    # Validate password strength
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
