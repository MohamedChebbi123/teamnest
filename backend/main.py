import os
from database.connection import Base, engine, connect_databse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, org_router, channels_router, team_router, direct_messages_router, tasks_router, friends_router, groupe_chat_router, assistant_router, logs_router
from models import Users,Organization,Organization_members,Channels,Messages,Teams,Team_association,Team_roles,Files,Direct_messages,Notifications,Tasks,Task_assignees,Task_attachments,Friends,Pending_friends_request,Organization_payments,Blocked_users,Group_chat,Group_chat_members,Group_chat_messages,Logs,Refresh_tokens
from utils.Websocket_manager import cleanup_task
from contextlib import asynccontextmanager
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(cleanup_task(connect_databse))
    yield


app = FastAPI(lifespan=lifespan)

_frontend_origins = [
    o.strip() for o in os.getenv("FRONTEND_URL", "http://localhost:3000").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(org_router.router)
app.include_router(channels_router.router)
app.include_router(team_router.router)
app.include_router(direct_messages_router.router)
app.include_router(tasks_router.router)
app.include_router(friends_router.router)
app.include_router(groupe_chat_router.router)
app.include_router(assistant_router.router)
app.include_router(logs_router.router)

Base.metadata.create_all(bind=engine)


def _ensure_files_channel_id_column():
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE files ADD COLUMN IF NOT EXISTS channel_id INTEGER REFERENCES channels(channel_id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_files_channel_id ON files (channel_id)"
        ))


def _ensure_user_code_columns():
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE users ALTER COLUMN verification_code TYPE VARCHAR(100)"
        ))
        conn.execute(text(
            "ALTER TABLE users ALTER COLUMN reset_code TYPE VARCHAR(100)"
        ))


def _ensure_user_presence_columns():
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'offline'"
        ))
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE"
        ))


_ensure_files_channel_id_column()
_ensure_user_code_columns()
_ensure_user_presence_columns()


