from types import SimpleNamespace

import pytest
from starlette.websockets import WebSocketDisconnect

from models.Friends import Friends
from models.Users import Users
from services.auth_service import ConnectivityManager


def test_connectivity_ws_accepts_valid_token_and_rejects_invalid_token(client, auth_user):
    with client.websocket_connect(f"/ws/connectivity?token={auth_user.access_token}") as websocket:
        websocket.send_json({"type": "ping"})
        assert websocket.receive_json()["type"] == "pong"

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/connectivity?token=bad-token"):
            pass


def test_set_status_away_updates_db_and_notifies_friend(client, auth_user, second_user, db_session):
    user_id = auth_user.user.user_id
    friend_id = second_user.user.user_id
    db_session.add(Friends(user_id=user_id, friend_id=friend_id))
    db_session.commit()

    with client.websocket_connect(f"/ws/connectivity?token={second_user.access_token}") as friend_ws:
        with client.websocket_connect(f"/ws/connectivity?token={auth_user.access_token}") as user_ws:
            friend_ws.receive_json()
            user_ws.receive_json()

            user_ws.send_json({"type": "set_status", "status": "away"})
            ack = user_ws.receive_json()
            assert ack == {"type": "status_ack", "status": "away"}

            broadcast = friend_ws.receive_json()
            assert broadcast["type"] == "user_status"
            assert broadcast["status"] == "away"

            assert ConnectivityManager.user_status[user_id] == "away"

            assert db_session.get(Users, user_id).status == "away"


def test_disconnect_marks_user_offline_and_notifies_friend(client, auth_user, second_user, db_session):
    user_id = auth_user.user.user_id
    friend_id = second_user.user.user_id
    db_session.add(Friends(user_id=user_id, friend_id=friend_id))
    db_session.commit()

    with client.websocket_connect(f"/ws/connectivity?token={second_user.access_token}") as friend_ws:
        with client.websocket_connect(f"/ws/connectivity?token={auth_user.access_token}") as user_ws:
            friend_ws.receive_json()
            user_ws.receive_json()

        offline = friend_ws.receive_json()
        assert offline["type"] == "user_offline"
        assert offline["user_id"] == user_id

    refreshed = db_session.get(Users, user_id)
    assert refreshed.status == "offline"


def test_global_search_returns_stubbed_results(client, auth_user, org_factory, channel_factory, message_factory, monkeypatch):
    organization = org_factory(owner=auth_user.user, name="Search Org", tag="456789")
    channel = channel_factory(organization=organization, name="general")
    message = message_factory(channel=channel, sender=auth_user.user, content="search me")

    def fake_search_messages_org(query: str, org_id: int, top_k: int = 20):
        assert query == "search"
        assert org_id == organization.organization_id
        return SimpleNamespace(matches=[SimpleNamespace(metadata={"message_id": message.message_id, "channel_id": channel.channel_id}, score=0.91)])

    monkeypatch.setattr("services.search_service.search_messages_org", fake_search_messages_org)

    response = client.get(
        f"/organization/{organization.organization_id}/search/messages",
        params={"q": "search", "top_k": 5},
        headers=auth_user.headers,
    )
    assert response.status_code == 200
    assert response.json()["results"][0]["message_id"] == message.message_id
    assert response.json()["results"][0]["channel"]["channel_id"] == channel.channel_id