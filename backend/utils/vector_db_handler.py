from dotenv import load_dotenv
import os

from pinecone import Pinecone
load_dotenv()


pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

index_name = "fyp"
_index = None


def _get_index():
    global _index
    if _index is None:
        if not pc.has_index(index_name):
            pc.create_index_for_model(
                name=index_name,
                cloud="aws",
                region="us-east-1",
                embed={
                    "model": "llama-text-embed-v2",
                    "field_map": {"text": "chunk_text"}
                }
            )
        _index = pc.Index(index_name)
    return _index


def upsert_task(
    task_id: int,
    title: str,
    description: str,
    team_id: int,
    team_name: str | None = None,
    status: str | None = None,
    due_date: str | None = None,
    parent_task_id: int | None = None,
    parent_task_title: str | None = None,
    assignee_names: str | None = None,
    subtask_group: str | None = None,
    priority: str | None = None,
):
    parts = [f"Task: {title}", f"Description: {description}"]
    if status:
        parts.append(f"Status: {status}")
    if assignee_names:
        parts.append(f"Assigned to: {assignee_names}")
    if due_date:
        parts.append(f"Due: {due_date}")
    if priority:
        parts.append(f"Priority: {priority}")
    if parent_task_title:
        parts.append(f"Parent task: {parent_task_title}")
    if subtask_group:
        parts.append(f"Group: {subtask_group}")
    chunk_text = ". ".join(parts)

    record = {
        "_id": f"task-{task_id}",
        "chunk_text": chunk_text,
        "type": "task",
        "task_id": task_id,
        "team_id": team_id,
        "title": title,
    }
    if team_name is not None:
        record["team_name"] = team_name
    if status is not None:
        record["status"] = status
    if due_date is not None:
        record["due_date"] = due_date
    if parent_task_id is not None:
        record["parent_task_id"] = parent_task_id
    if parent_task_title is not None:
        record["parent_task_title"] = parent_task_title
    if assignee_names is not None:
        record["assignees"] = assignee_names
    if subtask_group is not None:
        record["subtask_group"] = subtask_group
    if priority is not None:
        record["priority"] = priority
    _get_index().upsert_records(
        namespace=f"team-{team_id}",
        records=[record]
    )



def delete_task(task_id: int, team_id: int):
    _get_index().delete(
        ids=[f"task-{task_id}"],
        namespace=f"team-{team_id}"
    )


def reindex_all_tasks(db):
    from models.Tasks import Tasks
    from sqlalchemy.orm import joinedload

    tasks = (
        db.query(Tasks)
        .options(
            joinedload(Tasks.team),
            joinedload(Tasks.assignees).joinedload("user"),
        )
        .filter(Tasks.is_deleted == False)
        .all()
    )

    count = 0
    for task in tasks:
        assignee_names = None
        if task.assignees:
            names = []
            for a in task.assignees:
                if a.user:
                    name = f"{a.user.first_name} {a.user.last_name}".strip()
                    if name:
                        names.append(name)
            assignee_names = ", ".join(names) if names else None

        due_date = task.due_date.isoformat() if task.due_date else None
        team_name = task.team.team_name if task.team else None
        parent_task_title = None
        if task.parent_task_id is not None:
            parent = db.query(Tasks.title).filter(Tasks.id == task.parent_task_id).scalar()
            parent_task_title = parent

        upsert_task(
            task_id=task.id,
            title=task.title,
            description=task.description,
            team_id=task.team_id,
            team_name=team_name,
            status=task.status,
            due_date=due_date,
            parent_task_id=task.parent_task_id,
            parent_task_title=parent_task_title,
            assignee_names=assignee_names,
            subtask_group=task.subtask_group,
            priority=task.priority,
        )
        count += 1

    return count


def search(query: str, namespace: str, top_k: int = 5):
    results = _get_index().search(
        namespace=namespace,
        query={
            "top_k": top_k,
            "inputs": {"text": query}
        }
    )
    return results
