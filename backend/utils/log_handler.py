import json
from sqlalchemy.orm import Session
from models.Logs import Logs


def create_log(db: Session, org_id: int, actor_id: int, action: str, target_id: int = None, target_type: str = None, metadata: dict = None):
    log = Logs(
        org_id=org_id,
        actor_id=actor_id,
        action=action,
        target_id=target_id,
        target_type=target_type,
        log_metadata=json.dumps(metadata) if metadata else None
    )
    db.add(log)
    db.commit()
    return log
