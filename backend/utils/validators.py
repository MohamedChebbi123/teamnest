import re

from fastapi import HTTPException

EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
CHANNEL_NAME_REGEX = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,49}$"


def validate_email(email: str) -> str:
    if not re.match(EMAIL_REGEX, email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    return email


def validate_password(password: str) -> str:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search(r"[0-9]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    return password


def validate_phone(phone_number: str) -> str:
    phone_digits = re.sub(r"\D", "", phone_number)
    if len(phone_digits) < 10:
        raise HTTPException(status_code=400, detail="Phone number must be at least 10 digits")
    return phone_number


def validate_name(value: str, field: str, min_length: int = 1) -> str:
    if len(value.strip()) < min_length:
        raise HTTPException(
            status_code=400,
            detail=f"{field} must be at least {min_length} characters long" if min_length > 1 else f"{field} is required",
        )
    return value


def validate_channel_name(name: str) -> str:
    if not re.match(CHANNEL_NAME_REGEX, name):
        raise HTTPException(
            status_code=400,
            detail="Channel name must be 3-50 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores",
        )
    return name
