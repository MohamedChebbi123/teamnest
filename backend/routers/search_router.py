from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database.connection import connect_databse
from models.Users import Users
from services.search_service import global_search_messages_service
from utils.security import current_user

router = APIRouter()


@router.get("/organization/{org_id}/search/messages")
async def search_messages_global(
    org_id: int,
    q: str = Query(""),
    top_k: int | None = Query(None),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return global_search_messages_service(org_id, q, user, db, top_k=top_k)
