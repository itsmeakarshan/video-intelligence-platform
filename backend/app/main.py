from fastapi import FastAPI

from app.api.videos import router as video_router
from app.api.transcripts import router as transcript_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
)

app.include_router(video_router)
app.include_router(transcript_router)


@app.get("/")
def root():
    return {
        "message": "Video Intelligence Platform API is running!"
    }
