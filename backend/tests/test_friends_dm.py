from models.Friends import Friends


def test_friend_request_acceptance_creates_mutual_friendship(client, auth_user, second_user):
    request = client.post(
        "/friends/request",
        headers=auth_user.headers,
        json={"receiver_id": second_user.user.user_id},
    )
    assert request.status_code == 200
    request_id = request.json()["request_id"]

    pending = client.get("/friends/requests", headers=second_user.headers)
    assert pending.status_code == 200
    assert any(item["request_id"] == request_id for item in pending.json())

    accepted = client.post(
        f"/friends/request/{request_id}",
        headers=second_user.headers,
        json={"action": "accepted"},
    )
    assert accepted.status_code == 200

    first_list = client.get("/friends", headers=auth_user.headers)
    second_list = client.get("/friends", headers=second_user.headers)
    assert any(friend["user_id"] == second_user.user.user_id for friend in first_list.json())
    assert any(friend["user_id"] == auth_user.user.user_id for friend in second_list.json())


def test_cannot_send_friend_request_to_self(client, auth_user):
    response = client.post(
        "/friends/request",
        headers=auth_user.headers,
        json={"receiver_id": auth_user.user.user_id},
    )
    assert response.status_code == 400


def test_cannot_send_friend_request_to_existing_friend(client, auth_user, second_user, friend_request_factory, db_session):
    db_session.add(Friends(user_id=auth_user.user.user_id, friend_id=second_user.user.user_id))
    db_session.commit()

    response = client.post(
        "/friends/request",
        headers=auth_user.headers,
        json={"receiver_id": second_user.user.user_id},
    )
    assert response.status_code == 400


def test_send_direct_message_and_recipient_can_fetch_it(client, auth_user, second_user, db_session):
    db_session.add(Friends(user_id=auth_user.user.user_id, friend_id=second_user.user.user_id))
    db_session.commit()

    sent = client.post(
        "/direct-messages",
        headers=auth_user.headers,
        json={
            "sender_id": auth_user.user.user_id,
            "receiver_id": second_user.user.user_id,
            "content": "Hello Bob",
        },
    )
    assert sent.status_code == 200

    fetched = client.get(
        f"/direct-messages/{auth_user.user.user_id}",
        headers=second_user.headers,
    )
    assert fetched.status_code == 200
    assert any(message["content"] == "Hello Bob" for message in fetched.json()["messages"])


def test_cannot_send_direct_message_to_unrelated_user(client, auth_user, third_user):
    response = client.post(
        "/direct-messages",
        headers=auth_user.headers,
        json={
            "sender_id": auth_user.user.user_id,
            "receiver_id": third_user.user.user_id,
            "content": "No shared org",
        },
    )
    assert response.status_code == 403