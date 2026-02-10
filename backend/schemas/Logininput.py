from pydantic import BaseModel,EmailStr

class Logininput(BaseModel):
    email:EmailStr
    password:str