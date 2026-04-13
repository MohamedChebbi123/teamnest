from pydantic import BaseModel

class Assistant_input(BaseModel):
    query: str
    team_id: int
