from pydantic import BaseModel

class Direct_messages_schema(BaseModel):
    sender_id : int
    receiver_id : int
    content : str