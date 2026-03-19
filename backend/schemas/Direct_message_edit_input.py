from pydantic import BaseModel


class Direct_message_edit_input(BaseModel):
    content: str
