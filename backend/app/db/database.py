import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
DB_PATH = os.path.join(BASE_DIR, "video_intelligence.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine,
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()