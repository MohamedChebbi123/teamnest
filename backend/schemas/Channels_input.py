from pydantic import BaseModel
from typing import Optional


class Channels_input(BaseModel):
    channel_name: str
    type: str
    description: Optional[str] = None
   