import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Search and load .env from multiple candidate directories
def _load_environment() -> None:
    current_dir = Path.cwd()
    candidate_paths = [
        current_dir / ".env",
        current_dir / "backend" / ".env",
        current_dir.parent / ".env",
        current_dir.parent / "backend" / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]
    for env_path in candidate_paths:
        if env_path.is_file():
            load_dotenv(dotenv_path=env_path)
            break

_load_environment()


BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Video Intelligence Platform")
    API_VERSION: str = os.getenv("API_VERSION", "v1")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "video_intelligence.db")

    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "vip_super_secret_jwt_key_local_dev_2026_secure"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Storage Paths anchored to backend directory
    UPLOAD_FOLDER: str = str((BACKEND_DIR / os.getenv("UPLOAD_FOLDER", "uploads")).resolve())
    TEMP_AUDIO_FOLDER: str = str((BACKEND_DIR / os.getenv("TEMP_AUDIO_FOLDER", "temp_audio")).resolve())
    THUMBNAILS_FOLDER: str = os.path.join(UPLOAD_FOLDER, "thumbnails")
    CHAT_MEDIA_FOLDER: str = os.path.join(UPLOAD_FOLDER, "chat_media")
    BANNERS_FOLDER: str = os.path.join(UPLOAD_FOLDER, "banners")

    # AI & Speech Models
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    YOUTUBE_API_KEY: Optional[str] = os.getenv("YOUTUBE_API_KEY", None)

    # Embedding settings
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")


settings = Settings()
