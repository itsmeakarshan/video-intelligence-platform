import os
import shutil
from pathlib import Path
from typing import Generator
from datetime import datetime
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

def _resolve_database_path() -> str:
    raw_path = settings.DATABASE_PATH
    if os.path.isabs(raw_path):
        return raw_path

    # Canonical backend directory (where app/ is located)
    backend_dir = Path(__file__).resolve().parent.parent

    # If raw_path is relative, anchor it inside backend_dir
    target_path = backend_dir / raw_path
    target_path.parent.mkdir(parents=True, exist_ok=True)
    return str(target_path.resolve())


DATABASE_FULL_PATH = _resolve_database_path()
DATABASE_URL = f"sqlite:///{DATABASE_FULL_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

# Enable SQLite foreign keys & WAL mode
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _ensure_uploads_seeded():
    curr = Path.cwd()
    candidate_seed_dirs = [
        curr / "seed_uploads",
        curr / "backend" / "seed_uploads",
        Path("/app/backend/seed_uploads"),
        Path("/app/seed_uploads"),
    ]
    seed_dir = next((d for d in candidate_seed_dirs if d.is_dir()), None)
    if not seed_dir:
        return

    uploads_dir = Path(settings.UPLOAD_FOLDER)
    uploads_dir.mkdir(parents=True, exist_ok=True)

    try:
        for root, _, files in os.walk(seed_dir):
            rel_path = os.path.relpath(root, seed_dir)
            target_sub = uploads_dir / rel_path
            target_sub.mkdir(parents=True, exist_ok=True)
            for f in files:
                src_file = Path(root) / f
                dst_file = target_sub / f
                if not dst_file.is_file() or dst_file.stat().st_size == 0:
                    shutil.copy2(src_file, dst_file)
        print(f"[Media Seed] Uploads directory synchronized from {seed_dir}")
    except Exception as ex:
        print(f"[Media Seed Note] Could not sync seed media: {ex}")

def init_db():
    from app.models import (
        User, Course, Video, Transcript, TranscriptSegment, TranscriptChunk,
        Conversation, Message, QuizAttempt, QuizAttemptVideo, QuizAttemptQuestion,
        InstructorChatChannel, InstructorChatMessage, PromotionBanner,
        CourseEnrollment, CourseSkill, SystemSetting
    )
    from app.services.auth_service import hash_password

    # Ensure storage directories exist
    os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(settings.THUMBNAILS_FOLDER, exist_ok=True)
    os.makedirs(settings.CHAT_MEDIA_FOLDER, exist_ok=True)
    os.makedirs(settings.BANNERS_FOLDER, exist_ok=True)
    os.makedirs(settings.TEMP_AUDIO_FOLDER, exist_ok=True)

    _ensure_uploads_seeded()

    # Create tables if not existing
    Base.metadata.create_all(bind=engine)

    # Seed demo users if not present
    db = SessionLocal()
    try:
        existing_users_count = db.query(User).count()
        if existing_users_count > 0:
            print(f"[Database] Existing users preserved: {existing_users_count} user(s) found in database.")

        seed_users = [
            {"name": "Administrator", "email": "admin@example.com", "password": "admin123", "role": "admin"},
            {"name": "Administrator", "email": "admin@ex.com", "password": "password", "role": "admin"},
            {"name": "User", "email": "user@ex.com", "password": "password", "role": "student"},
            {"name": "Alex Johnson", "email": "student1@learn.com", "password": "Student1@123", "role": "student"},
        ]

        for su in seed_users:
            normalized = su["email"].strip().lower()
            existing = db.query(User).filter(User.email == normalized).first()
            if not existing:
                user = User(
                    name=su["name"],
                    email=normalized,
                    password_hash=hash_password(su["password"]),
                    role=su["role"],
                    created_at=datetime.utcnow()
                )
                db.add(user)
                db.commit()
                print(f"[Database] Demo {su['role']} account created: {normalized}")

        # Seed starter course if no courses exist
        if db.query(Course).count() == 0:
            admin_user = db.query(User).filter(User.role == "admin").first()
            starter = Course(
                title="Computer",
                description="Fundamental computer hardware, operating system architectures, and core software concepts.",
                user_id=admin_user.id if admin_user else None,
                price=0.0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(starter)
            db.commit()
            print("[Database] Seeded starter course for fresh deployment.")
    finally:
        db.close()
