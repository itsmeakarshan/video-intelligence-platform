from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.chat import SourceDto
from app.services import search_service
from app.services.auth_service import get_current_user_optional

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=List[SourceDto])
def search_transcripts(
    q: str = Query(..., min_length=1),
    course_id: Optional[int] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    result = search_service.search(query=q, db=db, user_id=user_id, course_id=course_id)
    return result.sources
