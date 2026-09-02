import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import (
    auth,
    courses,
    course_skills,
    videos,
    transcripts,
    chat,
    instructor_chat,
    quiz_attempts,
    banners,
    admin,
    youtube,
    search,
    root,
)
from app.services.queue_worker import start_queue_worker, stop_queue_worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vip_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Video Intelligence Platform Python Backend...")
    init_db()
    await start_queue_worker()
    logger.info("Application startup complete.")
    yield
    logger.info("Shutting down Video Intelligence Platform Backend...")
    await stop_queue_worker()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Video Intelligence Platform REST API - Python FastAPI Architecture",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-conversation-id", "Content-Range", "Accept-Ranges"],
)

# Register all API routers
app.include_router(root.router)
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(course_skills.router)
app.include_router(videos.router)
app.include_router(transcripts.router)
app.include_router(chat.router)
app.include_router(instructor_chat.router)
app.include_router(quiz_attempts.router)
app.include_router(banners.router)
app.include_router(admin.router)
app.include_router(youtube.router)
app.include_router(search.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
