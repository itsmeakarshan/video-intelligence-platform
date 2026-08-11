from contextlib import asynccontextmanager
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine

import app.models.video
import app.models.transcript
import app.models.transcript_segment
import app.models.transcript_chunk
import app.models.user
import app.models.conversation
import app.models.quiz_attempt
import app.models.quiz_attempt_question


from app.api import videos
from app.api import transcripts
from app.api import chat
from app.routes import auth
from app.api import youtube
from app.api import quiz_attempts
from app.api import ml

from app.services.queue_worker import queue_worker


@asynccontextmanager
async def lifespan(app: FastAPI):

    print("=" * 60)
    print("INITIALIZING DATABASE")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)

    print("=" * 60)
    print("DATABASE READY")
    print("=" * 60)

    worker = threading.Thread(
        target=queue_worker,
        daemon=True
    )

    worker.start()

    print("=" * 60)
    print("BACKGROUND QUEUE WORKER STARTED")
    print("=" * 60)

    yield

    print("=" * 60)
    print("APPLICATION SHUTDOWN")
    print("=" * 60)


app = FastAPI(
    title="Video Intelligence Platform",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)



app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(transcripts.router)
app.include_router(chat.router)
app.include_router(youtube.router)
app.include_router(quiz_attempts.router)
app.include_router(ml.router)

@app.get("/")
def root():

    return {
        "message": "Video Intelligence Platform API"
    }
