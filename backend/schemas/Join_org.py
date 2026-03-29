from pydantic import BaseModel

class Join_org(BaseModel):
    org_tag:int
    org_name:str