from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base


DATABASE_URL = "sqlite:///./video_intelligence.db"


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