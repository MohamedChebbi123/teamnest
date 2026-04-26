import pytest
from starlette.websockets import WebSocketDisconnect

from models.Team_association import Team_association
from models.Organization_members import Organization_members


def test_non_member_cannot_read_org_channels(client, auth_user, user_factory, org_factory, channel_factory):
    organization = org_factory(owner=auth_user.user, name="Read Guard Org", tag="234567")
    channel_factory(organization=organization, name="announcements")
    outsider = user_factory(
        first_name="Out",
        last_name="Sider",
        email="outsider@example.com",
        password="Strong1!Pass",
        verified=True,
    )
    outsider_headers = {"Authorization": f"Bearer {client.post('/login', json={'email': outsider.email, 'password': 'Strong1!Pass'}).json()['access_token']}"}
    denied = client.get(
        f"/organization/{organization.organization_id}/channels",
        headers=outsider_headers,
    )
    assert denied.status_code == 403


def test_member_cannot_delete_channel_they_do_not_own(client, auth_user, second_user, org_factory, channel_factory, db_session):
    organization = org_factory(owner=auth_user.user, name="Delete Guard Org", tag="234568")
    db_session.add(Organization_members(memmber_id=second_user.user.user_id, org_id=organization.organization_id, role_user="MEMBER"))
    db_session.commit()
    channel = channel_factory(organization=organization, name="team-chat")

    response = client.delete(
        f"/channel/{channel.channel_id}",
        headers=second_user.headers,
    )
    assert response.status_code == 403


def test_non_team_member_cannot_post_to_team_channel(client, auth_user, second_user, third_user, org_factory, team_factory, channel_factory, db_session):
    organization = org_factory(owner=auth_user.user, name="Team Guard Org", tag="234569")
    team = team_factory(organization=organization, name="Core Team")
    db_session.add(Organization_members(memmber_id=second_user.user.user_id, org_id=organization.organization_id, role_user="MEMBER"))
    db_session.add(Organization_members(memmber_id=third_user.user.user_id, org_id=organization.organization_id, role_user="MEMBER"))
    db_session.add(Team_association(team_id=team.team_id, user_id=second_user.user.user_id))
    db_session.commit()
    channel = channel_factory(organization=organization, name="team-channel", mode="teambased", team=team)

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(
            f"/mesages/{channel.channel_id}?token={third_user.access_token}&org_id={organization.organization_id}",
        ) as websocket:
            websocket.receive_json()


def test_user_cannot_edit_another_users_message(client, auth_user, second_user, org_factory, channel_factory, message_factory, db_session):
    organization = org_factory(owner=auth_user.user, name="Edit Guard Org", tag="234570")
    channel = channel_factory(organization=organization, name="general")
    db_session.add(Organization_members(memmber_id=second_user.user.user_id, org_id=organization.organization_id, role_user="MEMBER"))
    db_session.commit()
    message = message_factory(channel=channel, sender=second_user.user, content="original")

    response = client.put(
        f"/message/{message.message_id}",
        json={"message_content": "edited"},
        headers=auth_user.headers,
    )
    assert response.status_code == 403


def test_user_cannot_delete_another_users_message(client, auth_user, second_user, org_factory, channel_factory, message_factory, db_session):
    organization = org_factory(owner=auth_user.user, name="Delete Message Org", tag="234571")
    channel = channel_factory(organization=organization, name="general")
    db_session.add(Organization_members(memmber_id=second_user.user.user_id, org_id=organization.organization_id, role_user="MEMBER"))
    db_session.commit()
    message = message_factory(channel=channel, sender=second_user.user, content="original")

    response = client.delete(
        f"/message/{message.message_id}",
        headers=auth_user.headers,
    )
    assert response.status_code == 403