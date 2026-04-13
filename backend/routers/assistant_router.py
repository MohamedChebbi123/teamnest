from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Assistant_input import Assistant_input
from services.assistant_service import ask_assistant_service

router = APIRouter()


@router.post("/organization/{org_id}/assistant")
async def ask_assistant_endpoint(
    org_id: int,
    data: Assistant_input,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse)
):
    return ask_assistant_service(data.query, data.team_id, org_id, authorization, db)
