from pydantic import BaseModel


class Task_attachment_input(BaseModel):
    file_name: str
    file_base64: str
