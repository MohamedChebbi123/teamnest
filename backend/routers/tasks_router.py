from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Task_input import Task_input, Task_update, Task_status_update
from schemas.Task_attachment_input import Task_attachment_input
from services.task_service import (
    create_tasks_service,
    fetch_team_tasks_service,
    edit_task_service,
    delete_task_service,
    fetch_my_tasks_service,
    update_my_task_status_service,
    review_tasks,
    add_task_attachment_service,
    delete_task_attachment_service,
)
from models.Users import Users
from models.Task_assignees import Task_assignees
from utils.security import current_user
from utils.Websocket_manager import notification_manager
from datetime import datetime, UTC


router = APIRouter()


@router.post("/organization/{org_id}/team/{team_id}/tasks")
async def create_task_endpoint(
    org_id: int,
    team_id: int,
    task_data: Task_input,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    result = create_tasks_service(team_id, org_id, task_data, user, db)
    if task_data.assignee_ids:
        for assignee_id in task_data.assignee_ids:
            if assignee_id == user.user_id:
                continue
            await notification_manager.send(assignee_id, {
                "type": "new_notification",
                "notification": {
                    "type": "task_assigned",
                    "task_id": result["id"],
                    "task_title": result["title"],
                    "team_id": team_id,
                    "org_id": org_id,
                    "assigned_by_id": user.user_id,
                    "assigned_by_first_name": user.first_name,
                    "assigned_by_last_name": user.last_name,
                    "assigned_by_avatar_url": user.avatar_url,
                    "created_at": datetime.now(UTC).isoformat(),
                },
            })
    return result


@router.get("/organization/{org_id}/team/{team_id}/tasks")
async def fetch_team_tasks_endpoint(
    org_id: int,
    team_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_team_tasks_service(team_id, org_id, user, db)


@router.put("/organization/{org_id}/team/{team_id}/tasks/{task_id}")
async def edit_task_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    task_data: Task_update,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    if task_data.assignee_ids is not None:
        old_ids = {a.user_id for a in db.query(Task_assignees).filter(Task_assignees.task_id == task_id).all()}
        new_ids = [uid for uid in task_data.assignee_ids if uid not in old_ids]
    else:
        new_ids = []

    result = edit_task_service(task_id, team_id, org_id, task_data, user, db)

    for assignee_id in new_ids:
        if assignee_id == user.user_id:
            continue
        await notification_manager.send(assignee_id, {
            "type": "new_notification",
            "notification": {
                "type": "task_assigned",
                "task_id": result["id"],
                "task_title": result["title"],
                "team_id": team_id,
                "org_id": org_id,
                "assigned_by_id": user.user_id,
                "assigned_by_first_name": user.first_name,
                "assigned_by_last_name": user.last_name,
                "assigned_by_avatar_url": user.avatar_url,
                "created_at": datetime.now(UTC).isoformat(),
            },
        })
    return result


@router.delete("/organization/{org_id}/team/{team_id}/tasks/{task_id}")
async def delete_task_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return delete_task_service(task_id, team_id, org_id, user, db)


@router.get("/organization/{org_id}/team/{team_id}/my-tasks")
async def fetch_my_tasks_endpoint(
    org_id: int,
    team_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_my_tasks_service(team_id, org_id, user, db)


@router.patch("/organization/{org_id}/team/{team_id}/my-tasks/{task_id}/status")
async def update_my_task_status_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    status_data: Task_status_update,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return update_my_task_status_service(task_id, team_id, org_id, status_data, user, db)


@router.patch("/organization/{org_id}/team/{team_id}/tasks/{task_id}/review")
async def review_task_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    action: str,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return review_tasks(task_id, action, team_id, org_id, user, db)


@router.post("/organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments")
async def add_attachment_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    data: Task_attachment_input,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return add_task_attachment_service(task_id, team_id, org_id, data, user, db)


@router.delete("/organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments/{attachment_id}")
async def delete_attachment_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    attachment_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return delete_task_attachment_service(task_id, attachment_id, team_id, org_id, user, db)
