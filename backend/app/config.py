from dataclasses import dataclass
from functools import lru_cache
import os


def _csv_env(name: str, default: str) -> list[str]:
  value = os.getenv(name, default)
  return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
  app_name: str = os.getenv("APP_NAME", "S.E.T.U Backend")
  environment: str = os.getenv("APP_ENV", "local")
  mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
  mongodb_db: str = os.getenv("MONGODB_DB", "setu_demo")
  allowed_origins: tuple[str, ...] = tuple(
    _csv_env(
      "CORS_ORIGINS",
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    ),
  )


@lru_cache
def get_settings() -> Settings:
  return Settings()


settings = get_settings()
