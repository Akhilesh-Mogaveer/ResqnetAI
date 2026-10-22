"""
RESQNET AI — Application Settings and Configuration
"""

import os
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine project root reliably: backend/app/core/config.py -> parents[3] is repo root
REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    PROJECT_NAME: str = "RESQNET AI Emergency Coordination Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENV: str = "development"
    DEBUG: bool = True

    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # CORS configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://resqnet-backend-pi59.onrender.com",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Security & Secret Key
    SECRET_KEY: str = "resqnet-ai-default-dev-secret-key-replace-in-production"

    # Optional External Service Credentials (e.g. HuggingFace, Custom Map Tiles)
    HF_TOKEN: str = ""
    MAPS_API_KEY: str = ""

    # Open-Meteo Environmental Data Integration Settings
    OPEN_METEO_WEATHER_URL: str = "https://api.open-meteo.com/v1/forecast"
    OPEN_METEO_FLOOD_URL: str = "https://flood-api.open-meteo.com/v1/flood"
    OPEN_METEO_TIMEOUT_SECONDS: float = 8.0
    ENV_DATA_CACHE_TTL_SECONDS: int = 900  # 15 minutes cache TTL

    # Official Indian Meteorological & Hydrological Sources (IMD & NWDP/CWC)
    IMD_API_BASE_URL: str = "https://api.imd.gov.in/api/v1"
    IMD_API_KEY: str = ""
    IMD_AUTH_TOKEN: str = ""
    IMD_TIMEOUT_SECONDS: float = 8.0
    NWDP_BASE_URL: str = "https://nwdp.nwic.gov.in"
    NWDP_TIMEOUT_SECONDS: float = 12.0
    INDIA_STATIONS_CACHE_TTL_SECONDS: int = 600
    ENABLE_DEMO_SIMULATED_FEEDS: bool = True

    # Simulated SMS Intake Configuration
    RESQNET_SMS_SIMULATOR_TOKEN: str = "resqnet-sim-sms-dev-token-2026"
    ENABLE_SMS_SIMULATOR: bool = True

    # Configurable Reference Location (Udupi, Karnataka)
    DEFAULT_ENV_LATITUDE: float = 13.3409
    DEFAULT_ENV_LONGITUDE: float = 74.7421
    DEFAULT_ENV_LOCATION_NAME: str = "Udupi, Karnataka"

    # Canonical Database path
    CANONICAL_DB_PATH: Path = (REPO_ROOT / "backend" / "resqnet.db").resolve()

    # Database configuration
    DATABASE_URL: str = f"sqlite:///{REPO_ROOT / 'backend' / 'resqnet.db'}"

    # Path to trained HumAID DistilBERT model
    MODEL_DIR: str = str((REPO_ROOT / "data" / "nlp" / "models" / "resqnet_distilbert_full").resolve())

    @field_validator("DATABASE_URL", mode="after")
    def resolve_database_url(cls, v: str) -> str:
        if v.startswith("sqlite:///"):
            raw_path = v[len("sqlite:///"):]
            p = Path(raw_path)
            # If relative, anchor to canonical backend database file
            if not p.is_absolute() or raw_path in (".", "./resqnet.db", "resqnet.db"):
                canonical = (REPO_ROOT / "backend" / "resqnet.db").resolve()
                return f"sqlite:///{canonical.as_posix()}"
            return f"sqlite:///{p.as_posix()}"
        return v

    @field_validator("MODEL_DIR", mode="after")
    def resolve_model_dir(cls, v: str) -> str:
        p = Path(v).expanduser()
        if p.is_absolute():
            return str(p.resolve())

        # Resolve relative paths by checking candidate anchors:
        # 1. Relative to REPO_ROOT (e.g., "data/nlp/models/..." or "./data/...")
        candidate_repo = (REPO_ROOT / p).resolve()
        if candidate_repo.exists():
            return str(candidate_repo)

        # 2. Relative to REPO_ROOT / "backend" (e.g., "../data/nlp/models/..." from backend/.env)
        candidate_backend = (REPO_ROOT / "backend" / p).resolve()
        if candidate_backend.exists():
            return str(candidate_backend)

        # 3. Relative to current working directory
        candidate_cwd = (Path.cwd() / p).resolve()
        if candidate_cwd.exists():
            return str(candidate_cwd)

        # If path does not exist on disk, anchor deterministically
        if str(v).startswith(".."):
            return str(candidate_backend)
        return str(candidate_repo)

    model_config = SettingsConfigDict(
        env_file=(
            str(REPO_ROOT / ".env"),
            str(Path(__file__).resolve().parents[2] / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
