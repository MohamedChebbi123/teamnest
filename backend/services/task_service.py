from fastapi import HTTPException
from sqlalchemy.orm import Session
from utils.jwt_handler import verify_token
from utils.cloudinary_handler import upload_chat_file_from_base64
from models.Tasks import Tasks
from models.Task_assignees import Task_assignees
from models.Task_attachments import Task_attachments
from models.Organization import Organization
from models.Team_association import Team_association
from models.Team_roles import Team_roles
from schemas.Task_input import Task_input, Task_update, Task_status_update
from schemas.Task_attachment_input import Task_attachment_input


def task_to_dict(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "team_id": task.team_id,
        "created_by": task.created_by,
        "parent_task_id": task.parent_task_id,
        "subtask_group": task.subtask_group,
        "priotrity": task.priotrity,
        "status": task.status,
        "is_deleted": task.is_deleted,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "assignees": [
            {
                "user_id": a.user_id,
                "first_name": a.user.first_name,
                "last_name": a.user.last_name,
                "avatar_url": a.user.avatar_url,
            }
            for a in task.assignees
        ],
        "attachments": [
            {
                "id": att.id,
                "file_url": att.file_url,
                "file_name": att.file_name,
                "uploaded_by": att.uploaded_by,
                "uploaded_at": att.uploaded_at,
            }
            for att in task.attachments
        ],
    }

def create_tasks_service(team_id: int, org_id: int, task_data: Task_input, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()

    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    is_owner = found_organization.owner_id == user_id

    if not is_owner:
        role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == user_id
        ).first()

        if not role or not role.can_manage_tasks:
            raise HTTPException(status_code=403, detail="You do not have permission to create tasks")

    if task_data.parent_task_id:
        parent = db.query(Tasks).filter(
            Tasks.id == task_data.parent_task_id,
            Tasks.team_id == team_id,
            Tasks.is_deleted == False
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent task not found in this team")

    if task_data.assignee_ids:
        for assignee_id in task_data.assignee_ids:
            member = db.query(Team_association).filter(
                Team_association.team_id == team_id,
                Team_association.user_id == assignee_id
            ).first()
            if not member:
                raise HTTPException(status_code=400, detail=f"User {assignee_id} is not a member of this team")

    new_task = Tasks(
        title=task_data.title,
        description=task_data.description,
        team_id=team_id,
        created_by=user_id,
        priotrity=task_data.priority,
        status=task_data.status,
        parent_task_id=task_data.parent_task_id,
        subtask_group=task_data.subtask_group
    )

    db.add(new_task)
    db.flush() 
    
    if task_data.parent_task_id and task_data.assignee_ids:
        for assignee_id in task_data.assignee_ids:
            db.add(Task_assignees(task_id=new_task.id, user_id=assignee_id))

    db.commit()
    db.refresh(new_task)

    return task_to_dict(new_task)


def fetch_team_tasks_service(team_id: int, org_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()

    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    tasks = db.query(Tasks).filter(Tasks.team_id == team_id, Tasks.is_deleted == False).all()

    return [task_to_dict(t) for t in tasks]


def edit_task_service(task_id: int, team_id: int, org_id: int, task_data: Task_update, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()

    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    is_owner = found_organization.owner_id == user_id

    if not is_owner:
        role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == user_id
        ).first()

        if not role or not role.can_manage_tasks:
            raise HTTPException(status_code=403, detail="You do not have permission to edit tasks")

    if task_data.title is not None:
        task.title = task_data.title
    if task_data.description is not None:
        task.description = task_data.description
    if task_data.priority is not None:
        task.priotrity = task_data.priority
    if task_data.status is not None:
        if task_data.status == "done" and task.status != "review":
            raise HTTPException(status_code=400, detail="Task must be in review before it can be marked as done")
        task.status = task_data.status
    if task_data.parent_task_id is not None:
        task.parent_task_id = task_data.parent_task_id
    if task_data.subtask_group is not None:
        task.subtask_group = task_data.subtask_group

    if task_data.assignee_ids is not None:
        for assignee_id in task_data.assignee_ids:
            member = db.query(Team_association).filter(
                Team_association.team_id == team_id,
                Team_association.user_id == assignee_id
            ).first()
            if not member:
                raise HTTPException(status_code=400, detail=f"User {assignee_id} is not a member of this team")

        db.query(Task_assignees).filter(Task_assignees.task_id == task.id).delete()
        for assignee_id in task_data.assignee_ids:
            db.add(Task_assignees(task_id=task.id, user_id=assignee_id))

    db.commit()
    db.refresh(task)

    return task_to_dict(task)


def delete_task_service(task_id: int, team_id: int, org_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()

    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    is_owner = found_organization.owner_id == user_id

    if not is_owner:
        role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == user_id
        ).first()

        if not role or not role.can_manage_tasks:
            raise HTTPException(status_code=403, detail="You do not have permission to delete tasks")

    task.is_deleted = True
    db.commit()

    return {"message": "Task deleted successfully"}



def get_my_tasks_service(task_id:int,authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    is_assigned = db.query(Task_assignees).filter(
        Task_assignees.task_id == task_id,
        Task_assignees.user_id == user_id
    ).first()

    if not is_assigned:
        raise HTTPException(status_code=403, detail="You are not assigned to this task")

    return task_to_dict(task) 


def fetch_my_tasks_service(team_id: int, org_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()

    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    tasks = db.query(Tasks).join(
        Task_assignees, Task_assignees.task_id == Tasks.id
    ).filter(
        Tasks.team_id == team_id,
        Tasks.is_deleted == False,
        Task_assignees.user_id == user_id
    ).all()

    return [task_to_dict(t) for t in tasks]


def update_my_task_status_service(task_id: int, team_id: int, org_id: int, status_data: Task_status_update, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()

    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    allowed_statuses = {"todo", "in_progress", "review", "done"}
    if status_data.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid task status")

    task = db.query(Tasks).filter(
        Tasks.id == task_id,
        Tasks.team_id == team_id,
        Tasks.is_deleted == False
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    is_assigned = db.query(Task_assignees).filter(
        Task_assignees.task_id == task_id,
        Task_assignees.user_id == user_id
    ).first()
    if not is_assigned:
        raise HTTPException(status_code=403, detail="You are not assigned to this task")

    if status_data.status == "done" and task.status != "review":
        raise HTTPException(status_code=400, detail="Task must be in review before it can be marked as done")

    task.status = status_data.status
    db.commit()
    db.refresh(task)

    return task_to_dict(task)



def review_tasks(task_id: int, action: str, team_id: int, org_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    if action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")

    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()
    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    task = db.query(Tasks).filter(
        Tasks.id == task_id,
        Tasks.team_id == team_id,
        Tasks.is_deleted == False
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "review":
        raise HTTPException(status_code=400, detail="Task is not in review status")

    is_assignee = db.query(Task_assignees).filter(
        Task_assignees.task_id == task_id,
        Task_assignees.user_id == user_id
    ).first()
    if is_assignee:
        raise HTTPException(status_code=403, detail="Assignees cannot accept or reject their own task")

    is_owner = found_organization.owner_id == user_id
    if not is_owner:
        role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == user_id
        ).first()
        if not role or not role.can_manage_tasks:
            raise HTTPException(status_code=403, detail="You do not have permission to review tasks")

    task.status = "done" if action == "accept" else "in_progress"
    db.commit()
    db.refresh(task)

    return task_to_dict(task)


def add_task_attachment_service(task_id: int, team_id: int, data: Task_attachment_input, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()
    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    file_url = upload_chat_file_from_base64(data.file_name, data.file_base64)

    attachment = Task_attachments(
        task_id=task_id,
        file_url=file_url,
        file_name=data.file_name,
        uploaded_by=user_id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "file_url": attachment.file_url,
        "file_name": attachment.file_name,
        "uploaded_by": attachment.uploaded_by,
        "uploaded_at": attachment.uploaded_at,
    }


def delete_task_attachment_service(task_id: int, attachment_id: int, team_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()
    if not is_team_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    attachment = db.query(Task_attachments).filter(
        Task_attachments.id == attachment_id,
        Task_attachments.task_id == task_id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if attachment.uploaded_by != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own attachments")

    db.delete(attachment)
    db.commit()

    return {"message": "Attachment deleted"}

