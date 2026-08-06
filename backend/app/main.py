from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings

from app.api.videos import router as video_router
from app.api.transcripts import router as transcript_router
from app.api.search import router as search_router
from app.api.chat import router as chat_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)

app.include_router(video_router)
app.include_router(transcript_router)
app.include_router(search_router)
app.include_router(chat_router)

@app.get("/")
def root():
    return {
        "message": "Video Intelligence Platform API is running!"
    }