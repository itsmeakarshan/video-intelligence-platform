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
    CHROMA_COLLECTION: str = "video_chunks"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
