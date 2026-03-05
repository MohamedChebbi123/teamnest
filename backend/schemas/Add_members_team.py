from pydantic import BaseModel



class Add_members_team(BaseModel):
    user_id: int
    role: str 
    can_create_channels: bool 
    can_send_messages: bool 
    can_delete_messages: bool 
    can_manage_roles: bool 
    can_kick_members: bool 
