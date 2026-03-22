"""Application configuration loaded from environment variables."""

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Load settings from .env file or environment variables."""

    # --- Required ---
    DATABASE_URL: str
    DATABASE_SSL_MODE: str = "prefer"  # disable | prefer | require | verify-full

    # --- Anthropic AI ---
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    # Chat agent only; empty = use ANTHROPIC_MODEL (e.g. set to Haiku for lower latency).
    ANTHROPIC_CHAT_MODEL: str = ""
    ANTHROPIC_TIMEOUT_SECONDS: int = 60
    ANTHROPIC_MAX_RETRIES: int = 2
    ANTHROPIC_MAX_TOKENS: int = 4096
    # Chat agent max output tokens; 0 = use ANTHROPIC_MAX_TOKENS.
    ANTHROPIC_CHAT_MAX_TOKENS: int = 0

    # --- Chat sessions (until auth: placeholder owner id) ---
    CHAT_DEFAULT_CREATED_BY: str = "local"

    # --- Anonymous student workspace (created on demand; labels only) ---
    STUDENT_WORKSPACE_COURSE_NAME: str = "Workspace"
    STUDENT_WORKSPACE_EXAM_NAME: str = "Uploaded data"
    STUDENT_WORKSPACE_PROJECT_TITLE: str = "Study"
    STUDENT_WORKSPACE_CANVAS_TITLE: str = "Canvas"

    # --- ElevenLabs (study-content TTS for audio / video_walkthrough; optional) ---
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = ""
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"

    # --- Object Storage (S3-compatible) ---
    # Vultr-prefixed vars are the canonical names.  Generic S3_* aliases are
    # accepted so that Railway / generic S3 docs work without renaming env vars.
    OBJECT_STORAGE_ENABLED: bool = False
    VULTR_OBJECT_STORAGE_ENDPOINT: str = ""
    VULTR_OBJECT_STORAGE_ACCESS_KEY: str = ""
    VULTR_OBJECT_STORAGE_SECRET_KEY: str = ""
    VULTR_OBJECT_STORAGE_BUCKET: str = ""
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = ""

    @model_validator(mode="after")
    def _apply_s3_aliases(self) -> "Settings":
        """Fall back to generic S3_* when Vultr-specific vars are empty."""
        if not self.VULTR_OBJECT_STORAGE_ENDPOINT and self.S3_ENDPOINT:
            self.VULTR_OBJECT_STORAGE_ENDPOINT = self.S3_ENDPOINT
        if not self.VULTR_OBJECT_STORAGE_ACCESS_KEY and self.S3_ACCESS_KEY:
            self.VULTR_OBJECT_STORAGE_ACCESS_KEY = self.S3_ACCESS_KEY
        if not self.VULTR_OBJECT_STORAGE_SECRET_KEY and self.S3_SECRET_KEY:
            self.VULTR_OBJECT_STORAGE_SECRET_KEY = self.S3_SECRET_KEY
        if not self.VULTR_OBJECT_STORAGE_BUCKET and self.S3_BUCKET:
            self.VULTR_OBJECT_STORAGE_BUCKET = self.S3_BUCKET
        return self

    # --- Upload / abuse limits (PRD §2.10) ---
    MAX_FILE_SIZE_MB: int = 50
    MAX_CSV_ROW_COUNT: int = 500_000
    RATE_LIMIT_DAILY: int = 100
    RATE_LIMIT_COOLDOWN_SECONDS: int = 2

    # --- Exports ---
    EXPORT_DIR: str = "/tmp/conceptpilot_exports"

    # --- Environment and web security ---
    APP_ENV: str = "development"
    CORS_ALLOWED_ORIGINS: str = "*"

    # --- Async compute ---
    COMPUTE_ASYNC_ENABLED: bool = False
    COMPUTE_QUEUE_BACKEND: str = "file"
    COMPUTE_QUEUE_FILE: str = "/tmp/conceptpilot_compute_queue.json"
    COMPUTE_QUEUE_REDIS_URL: str = ""
    COMPUTE_QUEUE_REDIS_KEY: str = "conceptpilot:compute:queue"
    COMPUTE_WORKER_POLL_SECONDS: int = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
