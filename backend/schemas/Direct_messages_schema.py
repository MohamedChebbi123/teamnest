from pydantic import BaseModel
from typing import Optional

class Direct_messages_schema(BaseModel):
    sender_id : int
    receiver_id : int
    content : str
    parent_id: Optional[int] = None