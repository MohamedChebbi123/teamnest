from fastapi import HTTPException
from sqlalchemy.orm import Session
from utils.jwt_handler import verify_token
from models.Users import Users
from models.Pending_friends_request import Pending_friends_request
from models.Friends import Friends


def send_friend_request_service(authorization: str, db: Session, user_tag: str = None, receiver_id: int = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    if not user_tag and not receiver_id:
        raise HTTPException(status_code=400, detail="Provide either user_tag or receiver_id")


    if receiver_id:
        receiver = db.query(Users).filter(Users.user_id == receiver_id).first()
        if not receiver:
            raise HTTPException(status_code=404, detail="User not found")
    else:
        receiver = db.query(Users).filter(Users.user_tag == user_tag).first()
        if not receiver:
            raise HTTPException(status_code=404, detail="User not found with this tag")

    if receiver.user_id == user_id:
        raise HTTPException(status_code=400, detail="You cannot send a friend request to yourself")

    # Check if already friends
    existing_friendship = db.query(Friends).filter(
        ((Friends.user_id == user_id) & (Friends.friend_id == receiver.user_id)) |
        ((Friends.user_id == receiver.user_id) & (Friends.friend_id == user_id))
    ).first()
    if existing_friendship:
        raise HTTPException(status_code=400, detail="You are already friends with this user")

    # Check if a pending request already exists (in either direction)
    existing_request = db.query(Pending_friends_request).filter(
        Pending_friends_request.status == "pending",
        ((Pending_friends_request.sender_id == user_id) & (Pending_friends_request.receiver_id == receiver.user_id)) |
        ((Pending_friends_request.sender_id == receiver.user_id) & (Pending_friends_request.receiver_id == user_id))
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="A friend request already exists between you and this user")

    new_request = Pending_friends_request(
        sender_id=user_id,
        receiver_id=receiver.user_id,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return {
        "message": "Friend request sent successfully",
        "request_id": new_request.id,
        "receiver": {
            "user_id": receiver.user_id,
            "first_name": receiver.first_name,
            "last_name": receiver.last_name,
            "user_tag": receiver.user_tag,
            "avatar_url": receiver.avatar_url,
        }
    }


def accept_or_reject_friend_service(request_id: int, action: str, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    if action not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Action must be 'accepted' or 'rejected'")

    friend_request = db.query(Pending_friends_request).filter(
        Pending_friends_request.id == request_id
    ).first()
    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friend_request.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="You can only respond to requests sent to you")

    if friend_request.status != "pending":
        raise HTTPException(status_code=400, detail="This request has already been handled")

    friend_request.status = action

    if action == "accepted":
        new_friendship = Friends(
            user_id=friend_request.sender_id,
            friend_id=friend_request.receiver_id,
        )
        db.add(new_friendship)

    db.commit()

    return {"message": f"Friend request {action}"}


def remove_friend_service(friend_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    friendship = db.query(Friends).filter(
        ((Friends.user_id == user_id) & (Friends.friend_id == friend_id)) |
        ((Friends.user_id == friend_id) & (Friends.friend_id == user_id))
    ).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")

    db.delete(friendship)
    db.commit()

    return {"message": "Friend removed successfully"}


def get_friends_service(authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    friendships = db.query(Friends).filter(
        (Friends.user_id == user_id) | (Friends.friend_id == user_id)
    ).all()

    friends_list = []
    for f in friendships:
        friend_user_id = f.friend_id if f.user_id == user_id else f.user_id
        friend_user = db.query(Users).filter(Users.user_id == friend_user_id).first()
        if friend_user:
            friends_list.append({
                "friendship_id": f.id,
                "user_id": friend_user.user_id,
                "first_name": friend_user.first_name,
                "last_name": friend_user.last_name,
                "user_tag": friend_user.user_tag,
                "avatar_url": friend_user.avatar_url,
                "added_at": str(f.added_at),
            })

    return friends_list


def get_pending_requests_service(authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    pending_requests = db.query(Pending_friends_request).filter(
        Pending_friends_request.receiver_id == user_id,
        Pending_friends_request.status == "pending"
    ).all()

    requests_list = []
    for req in pending_requests:
        sender = db.query(Users).filter(Users.user_id == req.sender_id).first()
        if sender:
            requests_list.append({
                "request_id": req.id,
                "sender_id": sender.user_id,
                "first_name": sender.first_name,
                "last_name": sender.last_name,
                "user_tag": sender.user_tag,
                "avatar_url": sender.avatar_url,
                "sent_at": str(req.sent_at),
            })

    return requests_list

