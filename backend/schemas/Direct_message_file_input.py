from pydantic import BaseModel
from typing import Optional


class Direct_message_file_input(BaseModel):
    receiver_id: int
    file_name: str
    file_size: int
    file_base64: str
    mime_type: str | None = None
    parent_id: Optional[int] = None
