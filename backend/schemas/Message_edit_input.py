from pydantic import BaseModel

class Message_edit_input(BaseModel):
    message_content: str
