from pydantic import BaseModel
from typing import Optional

class Message_input(BaseModel):
    channel_id:int
    org_id:int
    message_content: str
    parent_id: Optional[int] = None