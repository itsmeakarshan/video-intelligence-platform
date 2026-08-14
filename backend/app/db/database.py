import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
DB_PATH = os.getenv("DATABASE_PATH", os.path.join(BASE_DIR, "video_intelligence.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Ensure parent directory exists and migrate old database if present
db_dir = os.path.dirname(DB_PATH)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

old_db_path = os.path.join(BASE_DIR, "video_intelligence.db")
if os.path.abspath(DB_PATH) != os.path.abspath(old_db_path):
    if not os.path.exists(DB_PATH) and os.path.exists(old_db_path):
        import shutil
        print(f"Auto-migrating database from {old_db_path} to {DB_PATH}")
        try:
            shutil.copy2(old_db_path, DB_PATH)
        except Exception as e:
            print(f"Failed to auto-migrate database: {e}")




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