from pydantic import BaseModel
from typing import Optional


class Channels_input(BaseModel):
    channel_name: str
    channel_mode: str 
    channel_category: str
    description: Optional[str] = None
   