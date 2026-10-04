from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration for the RepScan AI Service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────
    APP_NAME: str = "RepScan AI Service"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # ── Server ───────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    # ── CORS ─────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Logging ──────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s"
    LOG_FILE: str | None = None

    # ── ChromaDB ──────────────────────────────────────────────────
    CHROMA_PATH: str = "./chroma_db"

    # ── AI Keys ──────────────────────────────────────────────────
    MISTRAL_API_KEY: str = ""
    VOYAGE_API_KEY: str = ""
    SARVAM_API_KEY: str = ""
    APIFY_API_TOKEN: str = ""
    MISTRAL_MODEL: str = "open-mistral-nemo"
    VOYAGE_MODEL: str = "voyage-3.5-lite"
    SARVAM_BASE_URL: str = "https://api.sarvam.ai"
    SARVAM_TRANSLATION_MODEL: str = "mayura:v1"

    # ── OpenAPI ──────────────────────────────────────────────────
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"
    OPENAPI_URL: str = "/openapi.json"


settings = Settings()
