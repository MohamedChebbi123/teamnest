from database.connection import Base, engine
from fastapi import FastAPI
from routers import auth_router
from models import Users

app = FastAPI()

app.include_router(auth_router.router)

Base.metadata.create_all(bind=engine)


