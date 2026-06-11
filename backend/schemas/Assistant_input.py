from pydantic import BaseModel
from typing import Optional

class Message(BaseModel):
    role: str
    content: str

class Assistant_input(BaseModel):
    query: str
    team_id: int
    document_id: Optional[int] = None
    history: list[Message] = []
