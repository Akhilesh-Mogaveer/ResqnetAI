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

    # Canonical Database path
    CANONICAL_DB_PATH: Path = (REPO_ROOT / "backend" / "resqnet.db").resolve()

    # Database configuration
    DATABASE_URL: str = f"sqlite:///{REPO_ROOT / 'backend' / 'resqnet.db'}"

    # Path to trained HumAID DistilBERT model
    MODEL_DIR: str = str((REPO_ROOT / "data" / "nlp" / "models" / "resqnet_distilbert").resolve())

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
        p = Path(v)
        if not p.is_absolute() or not p.exists():
            canonical = (REPO_ROOT / "data" / "nlp" / "models" / "resqnet_distilbert").resolve()
            return str(canonical)
        return str(p.resolve())

    model_config = SettingsConfigDict(
        env_file=(
            str(REPO_ROOT / ".env"),
            str(Path(__file__).resolve().parents[2] / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
