from pydantic import BaseModel

class team_creation(BaseModel):

    team_name:str
    description:str
    org_id:int