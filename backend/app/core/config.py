import secrets
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    PROJECT_NAME: str
    API_VERSION: str

    WHISPER_MODEL: str
    WHISPER_DEVICE: str
    WHISPER_COMPUTE_TYPE: str
    WHISPER_BEAM_SIZE: int
    WHISPER_BEST_OF: int
    WHISPER_PATIENCE: int
    WHISPER_VAD: bool
    WHISPER_WORD_TIMESTAMPS: bool

    WHISPER_CONDITION_ON_PREVIOUS_TEXT: bool
    WHISPER_LANGUAGE: str

    AUDIO_SAMPLE_RATE: int
    AUDIO_CHANNELS: int
    AUDIO_CODEC: str
    AUDIO_NORMALIZE: bool

    EMBEDDING_MODEL: str

    GEMINI_MODEL: str
    GEMINI_API_KEY: str

    CHROMA_PATH: str = "chroma_db"

    CHROMA_CHUNK_COLLECTION: str = "rag_chunks"

    CHROMA_SEGMENT_COLLECTION: str = "rag_segments"

    # --------------------------------------------------
    # Authentication (Auto-generated fallback)
    # --------------------------------------------------

    JWT_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))

    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()