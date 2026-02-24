from pydantic import BaseModel

class Message_input(BaseModel):
    channel_id:int
    org_id:int
    message_content: str