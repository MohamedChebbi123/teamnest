from pydantic import BaseModel
from typing import Optional, Literal


class Channels_input(BaseModel):
    channel_name: str
    type: Literal["announcement", "orgbased", "teambased"]
    description: Optional[str] = None
   