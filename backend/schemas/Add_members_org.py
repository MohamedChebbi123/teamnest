from pydantic import BaseModel



class Add_members_org(BaseModel):
    user_tag: str         
    role_user: str