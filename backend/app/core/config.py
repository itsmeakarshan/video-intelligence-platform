from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Video Intelligence Platform"
    API_VERSION: str = "v1"

    class Config:
        env_file = ".env"


settings = Settings()