import os
import sys
from dataclasses import dataclass
from hashlib import sha1
from pathlib import Path

import pytest
import sqlalchemy
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")
os.environ.setdefault("PINECONE_API_KEY", "test-pinecone-key")
os.environ.setdefault("STRIPE_SECRET_KEY", "test-stripe-key")


_original_create_engine = sqlalchemy.create_engine


def _create_test_engine(*args, **kwargs):
    return _original_create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


sqlalchemy.create_engine = _create_test_engine


import database.connection as connection_module
from database.connection import Base, SessionLocal as ConnectionSessionLocal, connect_databse, engine
from models.Blocked_users import Blocked_users
from models.Channels import Channels
from models.Direct_messages import Direct_messages
from models.Friends import Friends
from models.Logs import Logs
from models.Messages import Messages
from models.Notifications import Notifications
from models.Organization import Organization
from models.Organization_members import Organization_members
from models.Organization_payments import Organization_payments
from models.Pending_friends_request import Pending_friends_request
from models.Pending_members_org import Pending_members_org
from models.PInned_messages import Pinned_messages
from models.Refresh_tokens import Refresh_tokens
from models.Task_assignees import Task_assignees
from models.Task_attachments import Task_attachments
from models.Tasks import Tasks
from models.Team_association import Team_association
from models.Team_roles import Team_roles
from models.Teams import Teams
from models.Users import Users
from routers import assistant_router, auth_router, channels_router, direct_messages_router, friends_router, groupe_chat_router, logs_router, org_router, search_router, tasks_router, team_router
from services.auth_service import ConnectivityManager
from services.direct_messages_service import dm_manager
from services.message_service import manager as channel_message_manager, voice_manager
from utils.Websocket_manager import connectivity_manager, friend_request_ws_manager, group_chat_ws_manager, notification_manager
from utils.hasher import hash_password
from utils.jwt_handler import create_access_token


Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)
connection_module.SessionLocal = SessionLocal


@dataclass
class AuthAccount:
    user: Users
    headers: dict[str, str]
    access_token: str
    password: str


def _stable_tag(email: str) -> str:
    value = int(sha1(email.encode("utf-8")).hexdigest()[:8], 16)
    return str(1_000_000 + (value % 9_000_000))


def _reset_runtime_state():
    connectivity_manager.connections.clear()
    connectivity_manager.last_seen.clear()
    connectivity_manager.user_status.clear()
    friend_request_ws_manager.connections.clear()
    notification_manager.connections.clear()
    channel_message_manager.channels.clear()
    voice_manager.voice_channels.clear()
    voice_manager.voice_participants.clear()
    dm_manager.active_connections.clear()
    group_chat_ws_manager.channels.clear()
    ConnectivityManager.connections.clear()
    ConnectivityManager.last_seen.clear()
    ConnectivityManager.user_status.clear()


def _clear_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def _stub_external_integrations(monkeypatch):
    monkeypatch.setattr("services.org_service.upload_organization_picture", lambda image: "https://example.com/org.png")
    monkeypatch.setattr("services.message_service.upsert_message", lambda *args, **kwargs: None)
    monkeypatch.setattr("services.search_service.search_messages_org", lambda *args, **kwargs: type("Result", (), {"matches": []})())
    monkeypatch.setattr("utils.vector_db_handler.upsert_task", lambda *args, **kwargs: None)
    monkeypatch.setattr("utils.vector_db_handler.delete_task", lambda *args, **kwargs: None)
    monkeypatch.setattr("utils.cloudinary_handler.upload_chat_file_from_base64", lambda *args, **kwargs: "https://example.com/file.bin")
    yield


def create_user(
    db_session,
    *,
    first_name: str,
    last_name: str,
    email: str,
    password: str = "Strong1!Pass",
    verified: bool = True,
    status: str = "offline",
):
    user = Users(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hashed=hash_password(password),
        user_tag=_stable_tag(email),
        is_verified=verified,
        status=status,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def create_organization(db_session, *, owner: Users, name: str = "Acme Team", tag: str = "123456", plan: str = "FREE"):
    organization = Organization(
        organization_name=name,
        organaization_picture="https://example.com/org.png",
        organization_description="Test organization",
        organaization_tag=tag,
        organization_plan=plan,
        owner_id=owner.user_id,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    membership = Organization_members(
        memmber_id=owner.user_id,
        org_id=organization.organization_id,
        role_user="OWNER",
    )
    db_session.add(membership)
    db_session.commit()
    return organization


def create_team(db_session, *, organization: Organization, name: str = "Core Team"):
    team = Teams(
        team_name=name,
        team_size=10,
        description="Test team",
        org_id=organization.organization_id,
    )
    db_session.add(team)
    db_session.commit()
    db_session.refresh(team)
    return team


def add_team_member(db_session, *, team: Teams, user: Users):
    association = Team_association(team_id=team.team_id, user_id=user.user_id)
    db_session.add(association)
    db_session.commit()
    return association


def add_team_role(
    db_session,
    *,
    team: Teams,
    user: Users,
    can_manage_tasks: bool = True,
    can_create_channels: bool = True,
):
    role = Team_roles(
        user_id=user.user_id,
        team_id=team.team_id,
        role="ADMIN",
        can_create_channels=can_create_channels,
        can_send_messages=True,
        can_delete_messages=True,
        can_manage_roles=False,
        can_kick_members=False,
        can_make_announcement=True,
        can_manage_tasks=can_manage_tasks,
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


def create_channel(db_session, *, organization: Organization, name: str = "general", mode: str = "orgbased", category: str = "general", team: Teams | None = None):
    channel = Channels(
        channel_name=name,
        channel_mode=mode,
        channel_category=category,
        description="Test channel",
        org_id=organization.organization_id,
        team_id=team.team_id if team else None,
    )
    db_session.add(channel)
    db_session.commit()
    db_session.refresh(channel)
    return channel


def create_message(db_session, *, channel: Channels, sender: Users, content: str = "hello world", parent_id: int | None = None):
    message = Messages(
        message_content=content,
        sender_id=sender.user_id,
        channel_id=channel.channel_id,
        parent_id=parent_id,
    )
    db_session.add(message)
    db_session.commit()
    db_session.refresh(message)
    return message


def create_task(db_session, *, team: Teams, creator: Users, title: str = "Task 1", status: str = "review", assignees: list[Users] | None = None):
    task = Tasks(
        title=title,
        description="Task description",
        team_id=team.team_id,
        created_by=creator.user_id,
        priotrity="medium",
        status=status,
    )
    db_session.add(task)
    db_session.flush()
    for assignee in assignees or []:
        db_session.add(Task_assignees(task_id=task.id, user_id=assignee.user_id))
    db_session.commit()
    db_session.refresh(task)
    return task


def create_friendship(db_session, *, user_a: Users, user_b: Users):
    friendship = Friends(user_id=user_a.user_id, friend_id=user_b.user_id)
    db_session.add(friendship)
    db_session.commit()
    return friendship


def create_pending_friend_request(db_session, *, sender: Users, receiver: Users):
    request = Pending_friends_request(sender_id=sender.user_id, receiver_id=receiver.user_id)
    db_session.add(request)
    db_session.commit()
    db_session.refresh(request)
    return request


@pytest.fixture(autouse=True)
def _reset_state():
    _reset_runtime_state()
    _clear_database()
    yield


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def app():
    application = FastAPI()
    application.include_router(auth_router.router)
    application.include_router(org_router.router)
    application.include_router(channels_router.router)
    application.include_router(team_router.router)
    application.include_router(direct_messages_router.router)
    application.include_router(tasks_router.router)
    application.include_router(friends_router.router)
    application.include_router(groupe_chat_router.router)
    application.include_router(assistant_router.router)
    application.include_router(logs_router.router)
    application.include_router(search_router.router)
    return application


@pytest.fixture
def client(app, db_session):
    app.dependency_overrides[connect_databse] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_user(client, db_session):
    email = "alice@test.com"
    password = "Strong1!Pass"
    response = client.post(
        "/register",
        data={
            "first_name": "Alice",
            "last_name": "Example",
            "email": email,
            "password": password,
        },
    )
    assert response.status_code == 200

    user = db_session.query(Users).filter(Users.email == email).one()
    user.is_verified = True
    db_session.commit()

    login = client.post(
        "/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    access_token = login.json()["access_token"]
    return AuthAccount(
        user=user,
        headers={"Authorization": f"Bearer {access_token}"},
        access_token=access_token,
        password=password,
    )


@pytest.fixture
def auth_headers(auth_user):
    return auth_user.headers


@pytest.fixture
def second_user(db_session):
    user = create_user(
        db_session,
        first_name="Bob",
        last_name="Example",
        email="bob@test.com",
        password="Strong1!Pass",
        verified=True,
    )
    token = create_access_token({"sub": str(user.user_id)})
    return AuthAccount(
        user=user,
        headers={"Authorization": f"Bearer {token}"},
        access_token=token,
        password="Strong1!Pass",
    )


@pytest.fixture
def third_user(db_session):
    user = create_user(
        db_session,
        first_name="Cara",
        last_name="Example",
        email="cara@test.com",
        password="Strong1!Pass",
        verified=True,
    )
    token = create_access_token({"sub": str(user.user_id)})
    return AuthAccount(
        user=user,
        headers={"Authorization": f"Bearer {token}"},
        access_token=token,
        password="Strong1!Pass",
    )


@pytest.fixture
def user_factory(db_session):
    def factory(**kwargs):
        return create_user(db_session, **kwargs)

    return factory


@pytest.fixture
def org_factory(db_session):
    def factory(*, owner: Users, name: str = "Acme Team", tag: str = "123456", plan: str = "FREE"):
        return create_organization(db_session, owner=owner, name=name, tag=tag, plan=plan)

    return factory


@pytest.fixture
def team_factory(db_session):
    def factory(*, organization: Organization, name: str = "Core Team"):
        return create_team(db_session, organization=organization, name=name)

    return factory


@pytest.fixture
def channel_factory(db_session):
    def factory(*, organization: Organization, name: str = "general", mode: str = "orgbased", category: str = "general", team: Teams | None = None):
        return create_channel(db_session, organization=organization, name=name, mode=mode, category=category, team=team)

    return factory


@pytest.fixture
def message_factory(db_session):
    def factory(*, channel: Channels, sender: Users, content: str = "hello world", parent_id: int | None = None):
        return create_message(db_session, channel=channel, sender=sender, content=content, parent_id=parent_id)

    return factory


@pytest.fixture
def task_factory(db_session):
    def factory(*, team: Teams, creator: Users, title: str = "Task 1", status: str = "review", assignees: list[Users] | None = None):
        return create_task(db_session, team=team, creator=creator, title=title, status=status, assignees=assignees)

    return factory


@pytest.fixture
def friend_request_factory(db_session):
    def factory(*, sender: Users, receiver: Users):
        return create_pending_friend_request(db_session, sender=sender, receiver=receiver)

    return factory