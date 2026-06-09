from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.Users import Users
from utils.cloudinary_handler import upload_chat_file_from_base64
from models.Tasks import Tasks
from models.Task_assignees import Task_assignees
from models.Task_attachments import Task_attachments
from models.Team_association import Team_association
from models.Team_roles import Team_roles
from schemas.Task_input import Task_input, Task_update, Task_status_update
from schemas.Task_attachment_input import Task_attachment_input
from models.Teams import Teams
from utils.plan_limits import get_file_size_limit
from utils.log_handler import create_log
from utils.vector_db_handler import delete_task

def _validate_team_in_org(team_id: int, org_id: int, user_id: int, db: Session) -> Teams:
    team = db.query(Teams).filter(Teams.team_id == team_id, Teams.org_id == org_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found in this organization")

    is_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id,
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
    return team


def task_to_dict(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "team_id": task.team_id,
        "created_by": task.created_by,
        "parent_task_id": task.parent_task_id,
        "subtask_group": task.subtask_group,
        "priority": task.priority,
        "status": task.status,
        "is_deleted": task.is_deleted,
        "due_date": task.due_date,
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


def _format_assignee_names(task):
    names = []
    for a in task.assignees:
        name = f"{a.user.first_name} {a.user.last_name}".strip()
        if name:
            names.append(name)
    return ", ".join(names) if names else None


def _format_due_date(task):
    if task.due_date is not None:
        return task.due_date.isoformat()
    return None


def _format_team_name(task, db):
    if task.team:
        return task.team.team_name
    return None


def _auto_complete_parent_tasks(task: Tasks, org_id: int, actor_id: int, db: Session) -> None:
    parent_id = task.parent_task_id
    while parent_id is not None:
        parent = db.query(Tasks).filter(
            Tasks.id == parent_id,
            Tasks.is_deleted == False,
        ).first()
        if not parent:
            break

        subtask_statuses = db.query(Tasks.status).filter(
            Tasks.parent_task_id == parent.id,
            Tasks.is_deleted == False,
        ).all()
        if not subtask_statuses:
            break

        if not all(status[0] == "done" for status in subtask_statuses):
            break

        if parent.status != "done":
            parent.status = "done"
            db.commit()
            db.refresh(parent)
            create_log(
                db,
                org_id=org_id,
                actor_id=actor_id,
                action="task_status_updated",
                target_id=parent.id,
                target_type="task",
                metadata={"status": parent.status, "team_id": parent.team_id},
            )

        parent_id = parent.parent_task_id

def create_tasks_service(team_id: int, org_id: int, task_data: Task_input, user: Users, db: Session):
    user_id = user.user_id

    team = _validate_team_in_org(team_id, org_id, user_id, db)
    is_owner = team.organization.owner_id == user_id

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
        priority=task_data.priority,
        status=task_data.status,
        parent_task_id=task_data.parent_task_id,
        subtask_group=task_data.subtask_group,
        due_date=task_data.due_date,
    )

    db.add(new_task)
    db.flush()

    if task_data.assignee_ids:
        for assignee_id in task_data.assignee_ids:
            db.add(Task_assignees(task_id=new_task.id, user_id=assignee_id))

    db.commit()
    db.refresh(new_task)

    from utils.vector_db_handler import upsert_task
    upsert_task(
        task_id=new_task.id,
        title=new_task.title,
        description=new_task.description,
        team_id=new_task.team_id,
        team_name=_format_team_name(new_task, db),
        status=new_task.status,
        due_date=_format_due_date(new_task),
        parent_task_id=new_task.parent_task_id,
        assignee_names=_format_assignee_names(new_task),
        subtask_group=new_task.subtask_group,
    )

    create_log(db, org_id=org_id, actor_id=user_id, action="task_created", target_id=new_task.id, target_type="task", metadata={"title": new_task.title, "team_id": team_id})

    return task_to_dict(new_task)


def fetch_team_tasks_service(team_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

    _validate_team_in_org(team_id, org_id, user_id, db)

    tasks = db.query(Tasks).filter(Tasks.team_id == team_id, Tasks.is_deleted == False).all()

    return [task_to_dict(t) for t in tasks]


def edit_task_service(task_id: int, team_id: int, org_id: int, task_data: Task_update, user: Users, db: Session):
    user_id = user.user_id

    team = _validate_team_in_org(team_id, org_id, user_id, db)

    task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    is_owner = team.organization.owner_id == user_id

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
        task.priority = task_data.priority
    marked_done = False
    if task_data.status is not None:
        if task_data.status == "done" and task.status != "review":
            raise HTTPException(status_code=400, detail="Task must be in review before it can be marked as done")
        task.status = task_data.status
        marked_done = task.status == "done"
    if task_data.parent_task_id is not None:
        if task_data.parent_task_id == task.id:
            raise HTTPException(status_code=400, detail="A task cannot be its own parent")

        new_parent = db.query(Tasks).filter(
            Tasks.id == task_data.parent_task_id,
            Tasks.team_id == team_id,
            Tasks.is_deleted == False,
        ).first()
        if not new_parent:
            raise HTTPException(status_code=404, detail="Parent task not found in this team")

        ancestor_id = new_parent.parent_task_id
        seen = {task.id}
        while ancestor_id is not None:
            if ancestor_id in seen:
                raise HTTPException(status_code=400, detail="Parent change would create a cycle")
            seen.add(ancestor_id)
            ancestor = db.query(Tasks.parent_task_id).filter(Tasks.id == ancestor_id).first()
            ancestor_id = ancestor[0] if ancestor else None

        task.parent_task_id = task_data.parent_task_id
    if task_data.subtask_group is not None:
        task.subtask_group = task_data.subtask_group
    if task_data.due_date is not None:
        task.due_date = task_data.due_date

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

    from utils.vector_db_handler import upsert_task
    upsert_task(
        task_id=task.id,
        title=task.title,
        description=task.description,
        team_id=task.team_id,
        team_name=_format_team_name(task, db),
        status=task.status,
        due_date=_format_due_date(task),
        parent_task_id=task.parent_task_id,
        assignee_names=_format_assignee_names(task),
        subtask_group=task.subtask_group,
    )

    create_log(db, org_id=org_id, actor_id=user_id, action="task_updated", target_id=task.id, target_type="task", metadata={"title": task.title, "team_id": team_id})

    if marked_done:
        _auto_complete_parent_tasks(task, org_id, user_id, db)

    return task_to_dict(task)


def delete_task_service(task_id: int, team_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

    team = _validate_team_in_org(team_id, org_id, user_id, db)

    task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    is_owner = team.organization.owner_id == user_id

    if not is_owner:
        role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == user_id
        ).first()

        if not role or not role.can_manage_tasks:
            raise HTTPException(status_code=403, detail="You do not have permission to delete tasks")

    task.is_deleted = True
    db.commit()

  
    delete_task(task_id=task.id, team_id=task.team_id)

    create_log(db, org_id=org_id, actor_id=user_id, action="task_deleted", target_id=task.id, target_type="task", metadata={"title": task.title, "team_id": team_id})

    return {"message": "Task deleted successfully"}


def fetch_my_tasks_service(team_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

    _validate_team_in_org(team_id, org_id, user_id, db)

    tasks = db.query(Tasks).join(
        Task_assignees, Task_assignees.task_id == Tasks.id
    ).filter(
        Tasks.team_id == team_id,
        Tasks.is_deleted == False,
        Task_assignees.user_id == user_id
    ).all()

    return [task_to_dict(t) for t in tasks]


def update_my_task_status_service(task_id: int, team_id: int, org_id: int, status_data: Task_status_update, user: Users, db: Session):
    user_id = user.user_id

    _validate_team_in_org(team_id, org_id, user_id, db)

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

    from utils.vector_db_handler import upsert_task
    upsert_task(
        task_id=task.id,
        title=task.title,
        description=task.description,
        team_id=task.team_id,
        team_name=_format_team_name(task, db),
        status=task.status,
        due_date=_format_due_date(task),
        parent_task_id=task.parent_task_id,
        assignee_names=_format_assignee_names(task),
        subtask_group=task.subtask_group,
    )

    create_log(db, org_id=org_id, actor_id=user_id, action="task_status_updated", target_id=task.id, target_type="task", metadata={"status": task.status, "team_id": team_id})

    if task.status == "done":
        _auto_complete_parent_tasks(task, org_id, user_id, db)

    return task_to_dict(task)



def review_tasks(task_id: int, action: str, team_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

    if action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")

    team = _validate_team_in_org(team_id, org_id, user_id, db)

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

    is_owner = team.organization.owner_id == user_id
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

    from utils.vector_db_handler import upsert_task
    upsert_task(
        task_id=task.id,
        title=task.title,
        description=task.description,
        team_id=task.team_id,
        team_name=_format_team_name(task, db),
        status=task.status,
        due_date=_format_due_date(task),
        parent_task_id=task.parent_task_id,
        assignee_names=_format_assignee_names(task),
        subtask_group=task.subtask_group,
    )

    create_log(db, org_id=org_id, actor_id=user_id, action=f"task_review_{action}ed", target_id=task.id, target_type="task", metadata={"status": task.status, "team_id": team_id})

    if task.status == "done":
        _auto_complete_parent_tasks(task, org_id, user_id, db)

    return task_to_dict(task)


def add_task_attachment_service(task_id: int, team_id: int, org_id: int, data: Task_attachment_input, user: Users, db: Session):
    user_id = user.user_id

    team = _validate_team_in_org(team_id, org_id, user_id, db)

    task = db.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id == team_id, Tasks.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    existing_attachment = db.query(Task_attachments).filter(
        Task_attachments.task_id == task_id,
        Task_attachments.file_name == data.file_name
    ).first()
    if existing_attachment:
        raise HTTPException(
            status_code=409,
            detail=f"A file named '{data.file_name}' has already been uploaded to this task. Please rename your file or use the existing one."
        )

    raw_b64 = data.file_base64.split(",", 1)[-1] 
    estimated_bytes = len(raw_b64) * 3 // 4
    file_size_limit = get_file_size_limit(team.organization.organization_plan)
    if file_size_limit is not None and estimated_bytes > file_size_limit:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds the {file_size_limit // (1024 * 1024)} MB limit. Upgrade to Pro for larger uploads."
        )

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


def delete_task_attachment_service(task_id: int, attachment_id: int, team_id: int, org_id: int, user: Users, db: Session):
    user_id = user.user_id

    team = _validate_team_in_org(team_id, org_id, user_id, db)

    attachment = db.query(Task_attachments).filter(
        Task_attachments.id == attachment_id,
        Task_attachments.task_id == task_id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    is_owner = team.organization.owner_id == user_id
    can_manage = False
    if not is_owner:
        role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == user_id,
        ).first()
        can_manage = bool(role and role.can_manage_tasks)

    if attachment.uploaded_by != user_id and not is_owner and not can_manage:
        raise HTTPException(status_code=403, detail="You can only delete your own attachments")

    db.delete(attachment)
    db.commit()

    return {"message": "Attachment deleted"}

