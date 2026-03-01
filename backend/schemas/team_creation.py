from pydantic import BaseModel

class team_creation(BaseModel):
    
    team_name:str
    team_size:int
    description:str
    org_id:int