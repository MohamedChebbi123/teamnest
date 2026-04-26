from models.Organization import Organization
from models.Task_assignees import Task_assignees
from models.Team_association import Team_association


def test_create_organization_appears_in_admin_list(client, auth_headers):
    response = client.post(
        "/create_organization",
        headers=auth_headers,
        data={
            "organization_name": "New Org",
            "organization_description": "Demo org",
        },
        files={"image": ("org.png", b"fake-image", "image/png")},
    )
    assert response.status_code == 200

    listing = client.get("/get_org_for_admin_org", headers=auth_headers)
    assert listing.status_code == 200
    assert any(org["organization_name"] == "New Org" for org in listing.json())


def test_create_channel_appears_in_org_channels(client, auth_user, db_session):
    create_org = client.post(
        "/create_organization",
        headers=auth_user.headers,
        data={
            "organization_name": "Channel Org",
            "organization_description": "Demo org",
        },
        files={"image": ("org.png", b"fake-image", "image/png")},
    )
    assert create_org.status_code == 200
    org_id = db_session.query(Organization).filter(Organization.organization_name == "Channel Org").one().organization_id

    created = client.post(
        f"/organization/{org_id}/create_channel",
        headers=auth_user.headers,
        json={
            "channel_name": "general",
            "channel_mode": "orgbased",
            "channel_category": "general",
            "description": "Main room",
        },
    )
    assert created.status_code == 200

    listing = client.get(f"/organization/{org_id}/channels", headers=auth_user.headers)
    assert listing.status_code == 200
    assert any(channel["channel_name"] == "general" for channel in listing.json())


def test_send_message_in_channel_appears_in_messages(client, auth_user, org_factory, channel_factory):
    organization = org_factory(owner=auth_user.user, name="Message Org", tag="345678")
    channel = channel_factory(organization=organization, name="general")

    with client.websocket_connect(
        f"/mesages/{channel.channel_id}?token={auth_user.access_token}&org_id={organization.organization_id}",
    ) as websocket:
        websocket.send_json({"type": "send_message", "message_content": "Hello channel"})
        payload = websocket.receive_json()
        assert payload["type"] == "new_message"
        assert payload["message"]["message_content"] == "Hello channel"

    messages = client.get(
        f"/organization/{organization.organization_id}/channel/{channel.channel_id}/messages",
        headers=auth_user.headers,
    )
    assert messages.status_code == 200
    assert any(item["message_content"] == "Hello channel" for item in messages.json()["messages"])


def test_edit_message_updates_content_and_timestamp(client, auth_user, org_factory, channel_factory, message_factory):
    organization = org_factory(owner=auth_user.user, name="Edit Org", tag="345679")
    channel = channel_factory(organization=organization, name="general")
    message = message_factory(channel=channel, sender=auth_user.user, content="old content")

    response = client.put(
        f"/message/{message.message_id}",
        headers=auth_user.headers,
        json={"message_content": "new content"},
    )
    assert response.status_code == 200
    assert response.json()["message_content"] == "new content"
    assert response.json()["edited_at"] is not None


def test_delete_message_removes_it_from_channel_results(client, auth_user, org_factory, channel_factory, message_factory):
    organization = org_factory(owner=auth_user.user, name="Delete Org", tag="345680")
    channel = channel_factory(organization=organization, name="general")
    message = message_factory(channel=channel, sender=auth_user.user, content="delete me")

    delete = client.delete(f"/message/{message.message_id}", headers=auth_user.headers)
    assert delete.status_code == 200

    messages = client.get(
        f"/organization/{organization.organization_id}/channel/{channel.channel_id}/messages",
        headers=auth_user.headers,
    )
    assert messages.status_code == 200
    assert all(item["message_id"] != message.message_id for item in messages.json()["messages"])


def test_create_task_assign_and_complete(client, auth_user, second_user, org_factory, team_factory, db_session):
    organization = org_factory(owner=auth_user.user, name="Task Org", tag="345681")
    team = team_factory(organization=organization, name="Tasks Team")
    db_session.add(Team_association(team_id=team.team_id, user_id=auth_user.user.user_id))
    db_session.add(Team_association(team_id=team.team_id, user_id=second_user.user.user_id))
    db_session.commit()

    created = client.post(
        f"/organization/{organization.organization_id}/team/{team.team_id}/tasks",
        headers=auth_user.headers,
        json={
            "title": "Finish FYP",
            "description": "Ship it",
            "priority": "high",
            "status": "review",
            "assignee_ids": [second_user.user.user_id],
        },
    )
    assert created.status_code == 200
    task_id = created.json()["id"]

    db_session.add(Task_assignees(task_id=task_id, user_id=second_user.user.user_id))
    db_session.commit()

    completed = client.patch(
        f"/organization/{organization.organization_id}/team/{team.team_id}/my-tasks/{task_id}/status",
        headers=second_user.headers,
        json={"status": "done"},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "done"