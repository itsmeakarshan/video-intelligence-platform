from datetime import datetime
from fastapi import APIRouter

router = APIRouter(tags=["Root & Health"])


@router.get("/")
def get_root():
    return {"message": "Video Intelligence Platform API"}


@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "vip-backend",
        "timestamp": datetime.utcnow().isoformat(),
    }
