from database.connection import Base, engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, org_router, channels_router, team_router, direct_messages_router, tasks_router
from models import Users,Organization,Organization_members,Channels,Messages,Teams,Team_association,Team_roles,Files,Direct_messages,Notifications,Tasks,Task_assignees


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(org_router.router)
app.include_router(channels_router.router)
app.include_router(team_router.router)
app.include_router(direct_messages_router.router)
app.include_router(tasks_router.router)

Base.metadata.create_all(bind=engine)


