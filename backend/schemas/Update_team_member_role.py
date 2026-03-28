from pydantic import BaseModel


class Update_team_member_role(BaseModel):
    role: str 
    can_create_channels: bool 
    can_send_messages: bool 
    can_delete_messages: bool 
    can_manage_roles: bool 
    can_kick_members: bool 
    can_make_announcement : bool
    can_manage_tasks: bool = False