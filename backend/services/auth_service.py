from models.Users import Users
from models.Refresh_tokens import Refresh_tokens
from sqlalchemy.orm import Session
from fastapi import HTTPException
from utils.hasher import hash_password, hash_code, verify_code
from utils.cloudinary_handler import upload_user_profile_image
from utils.email_sender import simple_send, send_password_reset_code
from datetime import datetime, timedelta, UTC
import logging
import secrets
from schemas.Logininput import Logininput
from utils.hasher import verify_password
from utils.jwt_handler import create_access_token, create_refresh_token, verify_token
from utils.Websocket_manager import connectivity_manager, VALID_STATUSES
from utils.validators import validate_email, validate_password, validate_phone, validate_name
from models.Friends import Friends
from database.connection import connect_databse as connect_databse_factory

logger = logging.getLogger(__name__)

ConnectivityManager = connectivity_manager


async def register_user_service(
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    db: Session
):
    validate_name(first_name, "First name")
    validate_name(last_name, "Last name")
    validate_email(email)
    validate_password(password)

    generic_response = {"message": "If the email is available, your account has been created. You can now log in."}

    if db.query(Users).filter(Users.email == email).first():
        return generic_response

    new_user = Users(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hashed=hash_password(password),
        user_tag=str(secrets.randbelow(9_000_000) + 1_000_000),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return generic_response


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

    if not user.verification_code or not verify_code(verification_code, user.verification_code):
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

    verification_code = str(secrets.randbelow(900_000) + 100_000)
    verification_expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=10)

    user.verification_code = hash_code(verification_code)
    user.verification_code_expiry = verification_expiry

    db.commit()
    db.refresh(user)

    try:
        await simple_send(email, verification_code)
    except Exception:
        logger.exception("Failed to send verification email", extra={"email": email})
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {"message": "Verification code sent successfully"}


async def login_user_service(
    validator: Logininput,
    db: Session,
    user_agent: str | None = None,
    ip_address: str | None = None,
):

    found_user = db.query(Users).filter(Users.email == validator.email).first()

    if not found_user or not verify_password(validator.password, found_user.password_hashed):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": str(found_user.user_id)})
    refresh_token, jti, expires_at = create_refresh_token({"sub": str(found_user.user_id)})

    db.add(Refresh_tokens(
        jti=jti,
        user_id=found_user.user_id,
        expires_at=expires_at,
        user_agent=(user_agent or "")[:255] or None,
        created_ip=(ip_address or "")[:45] or None,
    ))
    db.commit()

    return {
        "message": "user logged in successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


def _revoke_all_user_tokens(db: Session, user_id: int):
    now = datetime.now(UTC)
    db.query(Refresh_tokens).filter(
        Refresh_tokens.user_id == user_id,
        Refresh_tokens.revoked_at.is_(None),
    ).update({Refresh_tokens.revoked_at: now}, synchronize_session=False)


async def refresh_access_token_service(
    refresh_token: str,
    db: Session,
    user_agent: str | None = None,
    ip_address: str | None = None,
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token is required")

    payload = verify_token(refresh_token, "refresh")

    if not payload or "sub" not in payload or "jti" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = int(payload["sub"])
    jti = payload["jti"]

    record = db.query(Refresh_tokens).filter(Refresh_tokens.jti == jti).first()

    if not record:
        _revoke_all_user_tokens(db, user_id)
        db.commit()
        logger.warning("Refresh token reuse: unknown jti", extra={"user_id": user_id, "jti": jti})
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if record.revoked_at is not None:
        _revoke_all_user_tokens(db, user_id)
        db.commit()
        logger.warning("Refresh token reuse: revoked jti replayed", extra={"user_id": user_id, "jti": jti})
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_access = create_access_token({"sub": str(user.user_id)})
    new_refresh, new_jti, new_expires = create_refresh_token({"sub": str(user.user_id)})

    record.revoked_at = datetime.now(UTC)
    record.replaced_by_jti = new_jti

    db.add(Refresh_tokens(
        jti=new_jti,
        user_id=user.user_id,
        expires_at=new_expires,
        user_agent=(user_agent or "")[:255] or None,
        created_ip=(ip_address or "")[:45] or None,
    ))
    db.commit()

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
    }


async def logout_service(refresh_token: str | None, db: Session):
    if not refresh_token:
        return {"message": "Logged out"}

    payload = verify_token(refresh_token, "refresh")
    if not payload or "jti" not in payload:
        return {"message": "Logged out"}

    record = db.query(Refresh_tokens).filter(Refresh_tokens.jti == payload["jti"]).first()
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(UTC)
        db.commit()

    return {"message": "Logged out"}


async def logout_all_service(user: Users, db: Session):
    _revoke_all_user_tokens(db, user.user_id)
    db.commit()
    return {"message": "All sessions logged out"}


async def view_profile_service(user: Users):
    live_status = ConnectivityManager.get_status(user.user_id)
    persisted_last_seen = user.last_seen_at.isoformat() if user.last_seen_at else None
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
        "profile_completed": user.profile_completed,
        "status": live_status,
        "last_seen_at": persisted_last_seen,
    }


async def complete_profile_service(
    user: Users,
    phone_number: str,
    country: str,
    image,
    db: Session
):
    if user.profile_completed:
        raise HTTPException(status_code=400, detail="Profile is already completed")

    validate_phone(phone_number)

    existing_phone = db.query(Users).filter(
        Users.phone_number == phone_number,
        Users.user_id != user.user_id
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


async def edit_avatar_username(db: Session, user: Users, image=None, lastname: str = None, firstname: str = None):
    if firstname is not None:
        validate_name(firstname, "First name", min_length=5)
        user.first_name = firstname

    if lastname is not None:
        validate_name(lastname, "Last name", min_length=5)
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


async def edit_email_country_phone(db: Session, user: Users, email: str = None, country: str = None, phone_number: str = None):
    if email is not None:
        validate_email(email)

        existing_email = db.query(Users).filter(
            Users.email == email,
            Users.user_id != user.user_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already used")

        user.email = email

    if country is not None:
        user.country = country

    if phone_number is not None:
        validate_phone(phone_number)

        existing_phone = db.query(Users).filter(
            Users.phone_number == phone_number,
            Users.user_id != user.user_id
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

    generic_response = {"message": "If an account exists for this email, a password reset code has been sent."}

    user = db.query(Users).filter(Users.email == email).first()

    if not user:
        return generic_response

    reset_code = str(secrets.randbelow(900_000) + 100_000)
    reset_code_expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=10)

    user.reset_code = hash_code(reset_code)
    user.reset_code_expiry = reset_code_expiry

    db.commit()
    db.refresh(user)

    try:
        await send_password_reset_code(email, reset_code)
    except Exception:
        logger.exception("Failed to send password reset email", extra={"email": email})

    return generic_response


async def verify_reset_code_service(email: str, reset_code: str, db: Session):

    user = db.query(Users).filter(Users.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.reset_code:
        raise HTTPException(status_code=400, detail="No reset code requested for this account")

    if not user.reset_code or not verify_code(reset_code, user.reset_code):
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

    if not user.reset_code or not verify_code(reset_code, user.reset_code):
        raise HTTPException(status_code=400, detail="Invalid reset code")

    if user.reset_code_expiry < datetime.now(UTC).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one")

    validate_password(new_password)

    user.password_hashed = hash_password(new_password)
    user.reset_code = None
    user.reset_code_expiry = None

    db.commit()
    db.refresh(user)

    return {"message": "Password reset successful. You can now login with your new password"}


async def change_password_service(user: Users, current_password: str, new_password: str, db: Session):
    if not verify_password(current_password, user.password_hashed):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    validate_password(new_password)

    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    user.password_hashed = hash_password(new_password)
    db.commit()

    return {"message": "Password changed successfully"}


async def get_user_info_by_id_service(user_id: int, db: Session):
    user = db.query(Users).filter(Users.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    live_status = ConnectivityManager.get_status(user_id)
    persisted_last_seen = user.last_seen_at.isoformat() if user.last_seen_at else None

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
        "status": live_status,
        "last_seen_at": persisted_last_seen,
    }


async def check_connectivity(websocket, user: Users, db: Session):
    user_id = user.user_id

    from sqlalchemy import or_
    user_friends = db.query(Friends).filter(
        or_(Friends.user_id == user_id, Friends.friend_id == user_id)
    ).all()

    friend_ids = [
        found_friend.friend_id if found_friend.user_id == user_id else found_friend.user_id
        for found_friend in user_friends
    ]

    initial_status = user.status if user.status in VALID_STATUSES and user.status != "offline" else "online"

    await ConnectivityManager.connect(user_id, websocket)
    ConnectivityManager.user_status[user_id] = initial_status

    db.query(Users).filter(Users.user_id == user_id).update(
        {"status": initial_status, "last_seen_at": datetime.now(UTC)},
        synchronize_session=False,
    )
    db.commit()
    db.close()

    await ConnectivityManager.broadcast(
        friend_ids,
        {"type": "user_status", "user_id": user_id, "status": initial_status},
    )

    online_friends = [
        {"user_id": fid, "status": ConnectivityManager.get_status(fid)}
        for fid in friend_ids
        if ConnectivityManager.is_online(fid)
    ]
    if online_friends:
        await websocket.send_json({"type": "friends_status", "users": online_friends})

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "ping":
                ConnectivityManager.last_seen[user_id] = datetime.now(UTC)
                await websocket.send_json({"type": "pong"})
            elif msg_type == "set_status":
                requested = data.get("status")
                applied = ConnectivityManager.set_status(user_id, requested)
                if applied is None:
                    continue
                inner_db = next(connect_databse_factory())
                try:
                    inner_db.query(Users).filter(Users.user_id == user_id).update(
                        {"status": applied},
                        synchronize_session=False,
                    )
                    inner_db.commit()
                finally:
                    inner_db.close()
                await ConnectivityManager.broadcast(
                    friend_ids,
                    {"type": "user_status", "user_id": user_id, "status": applied},
                )
                await websocket.send_json({"type": "status_ack", "status": applied})
    except Exception:
        pass
    finally:
        ConnectivityManager.disconnect(user_id, websocket)
        if not ConnectivityManager.is_online(user_id):
            now = datetime.now(UTC)
            inner_db = next(connect_databse_factory())
            try:
                inner_db.query(Users).filter(Users.user_id == user_id).update(
                    {"status": "offline", "last_seen_at": now},
                    synchronize_session=False,
                )
                inner_db.commit()
            finally:
                inner_db.close()
            await ConnectivityManager.broadcast(
                friend_ids,
                {
                    "type": "user_offline",
                    "user_id": user_id,
                    "last_seen_at": now.isoformat(),
                },
            )


def get_online_status(user_ids: list[int], db: Session) -> dict:
    result: dict[int, dict] = {}
    persisted = {
        u.user_id: u
        for u in db.query(Users).filter(Users.user_id.in_(user_ids)).all()
    } if user_ids else {}

    for uid in user_ids:
        if ConnectivityManager.is_online(uid):
            status = ConnectivityManager.get_status(uid)
            last_seen = ConnectivityManager.last_seen.get(uid)
        else:
            user_row = persisted.get(uid)
            status = "offline"
            last_seen = user_row.last_seen_at if user_row else None
        result[uid] = {
            "online": status != "offline",
            "status": status,
            "last_seen_at": last_seen.isoformat() if last_seen else None,
        }
    return result


async def set_my_status_service(user: Users, status: str, db: Session):
    if status not in VALID_STATUSES or status == "offline":
        raise HTTPException(status_code=400, detail="Invalid status")

    applied = ConnectivityManager.set_status(user.user_id, status)
    if applied is None:
        raise HTTPException(
            status_code=409,
            detail="You must be connected to the presence websocket to set status",
        )

    db.query(Users).filter(Users.user_id == user.user_id).update(
        {"status": applied},
        synchronize_session=False,
    )
    db.commit()

    from sqlalchemy import or_
    rows = db.query(Friends).filter(
        or_(Friends.user_id == user.user_id, Friends.friend_id == user.user_id)
    ).all()
    friend_ids = [
        r.friend_id if r.user_id == user.user_id else r.user_id
        for r in rows
    ]

    await ConnectivityManager.broadcast(
        friend_ids,
        {"type": "user_status", "user_id": user.user_id, "status": applied},
    )

    return {"status": applied}
