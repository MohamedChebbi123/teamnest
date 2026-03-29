from pydantic import BaseModel
from typing import Optional


class FriendRequestInput(BaseModel):
    user_tag: Optional[str] = None
    receiver_id: Optional[int] = None


class FriendRequestAction(BaseModel):
    action: str  # "accepted" or "rejected"
