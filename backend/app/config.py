"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Load settings from .env file or environment variables."""

    DATABASE_URL: str
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    ANTHROPIC_TIMEOUT_SECONDS: int = 60
    ANTHROPIC_MAX_RETRIES: int = 2
    ANTHROPIC_MAX_TOKENS: int = 4096

    # Instructor auth credentials (MVP: basic auth)
    INSTRUCTOR_USERNAME: str = "admin"
    INSTRUCTOR_PASSWORD: str = "admin"

    # Student token expiry in days
    STUDENT_TOKEN_EXPIRY_DAYS: int = 30

    # Export settings
    EXPORT_DIR: str = "/tmp/conceptpilot_exports"

    # Environment and web security
    APP_ENV: str = "development"
    CORS_ALLOWED_ORIGINS: str = "*"

    # Async compute settings
    COMPUTE_ASYNC_ENABLED: bool = False
    COMPUTE_QUEUE_BACKEND: str = "file"
    COMPUTE_QUEUE_FILE: str = "/tmp/conceptpilot_compute_queue.json"
    COMPUTE_WORKER_POLL_SECONDS: int = 3

    # OCI object storage hooks (optional, disabled by default)
    OCI_OBJECT_STORAGE_ENABLED: bool = False
    OCI_OBJECT_STORAGE_NAMESPACE: str = ""
    OCI_BUCKET_UPLOADS: str = ""
    OCI_BUCKET_EXPORTS: str = ""
    OCI_CONFIG_FILE: str = "~/.oci/config"
    OCI_CONFIG_PROFILE: str = "DEFAULT"

    # Canvas — Infinite Canvas feature settings
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = ""
    VULTR_ACCESS_KEY: str = ""
    VULTR_SECRET_KEY: str = ""
    VULTR_BUCKET_NAME: str = ""
    VULTR_ENDPOINT_URL: str = ""
    CANVAS_RATE_LIMIT_DAILY: int = 100
    CANVAS_RATE_LIMIT_COOLDOWN_SECONDS: int = 2

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
