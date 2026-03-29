from fastapi import APIRouter, Depends, Header
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

router = APIRouter()


@router.post("/organization/{org_id}/team/{team_id}/tasks")
async def create_task_endpoint(
    org_id: int,
    team_id: int,
    task_data: Task_input,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return create_tasks_service(team_id, org_id, task_data, authorization, db)


@router.get("/organization/{org_id}/team/{team_id}/tasks")
async def fetch_team_tasks_endpoint(
    org_id: int,
    team_id: int,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return fetch_team_tasks_service(team_id, org_id, authorization, db)


@router.put("/organization/{org_id}/team/{team_id}/tasks/{task_id}")
async def edit_task_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    task_data: Task_update,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return edit_task_service(task_id, team_id, org_id, task_data, authorization, db)


@router.delete("/organization/{org_id}/team/{team_id}/tasks/{task_id}")
async def delete_task_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return delete_task_service(task_id, team_id, org_id, authorization, db)


@router.get("/organization/{org_id}/team/{team_id}/my-tasks")
async def fetch_my_tasks_endpoint(
    org_id: int,
    team_id: int,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return fetch_my_tasks_service(team_id, org_id, authorization, db)


@router.patch("/organization/{org_id}/team/{team_id}/my-tasks/{task_id}/status")
async def update_my_task_status_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    status_data: Task_status_update,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return update_my_task_status_service(task_id, team_id, org_id, status_data, authorization, db)


@router.patch("/organization/{org_id}/team/{team_id}/tasks/{task_id}/review")
async def review_task_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    action: str,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return review_tasks(task_id, action, team_id, org_id, authorization, db)


@router.post("/organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments")
async def add_attachment_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    data: Task_attachment_input,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return add_task_attachment_service(task_id, team_id, data, authorization, db)


@router.delete("/organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments/{attachment_id}")
async def delete_attachment_endpoint(
    org_id: int,
    team_id: int,
    task_id: int,
    attachment_id: int,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return delete_task_attachment_service(task_id, attachment_id, team_id, authorization, db)
