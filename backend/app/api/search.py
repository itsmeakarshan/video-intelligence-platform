from fastapi import APIRouter

from app.services.embedding_service import search

router = APIRouter(
    prefix="/search",
    tags=["Semantic Search"]
)


@router.get("/")
def semantic_search(query: str):

    return search(query)
