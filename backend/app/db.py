import asyncio
import os
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ServerSelectionTimeoutError

from .config import settings

try:
  from mongomock_motor import AsyncMongoMockClient
except ImportError:  # pragma: no cover - optional fallback dependency
  AsyncMongoMockClient = None

_client: Any = None
_database: AsyncIOMotorDatabase | Any | None = None
_database_mode = "disconnected"


async def _connect_to_mock_database() -> None:
  global _client, _database, _database_mode
  if AsyncMongoMockClient is None:
    raise RuntimeError(
      "MongoDB is unavailable and mongomock-motor is not installed. "
      "Install dependencies or configure MONGODB_URI.",
    )

  _client = AsyncMongoMockClient()
  _database = _client[settings.mongodb_db]
  await _database.command("ping")
  _database_mode = "mock"


async def connect_to_mongo() -> None:
  global _client, _database, _database_mode
  if _client is not None and _database is not None:
    return

  configured_uri = os.getenv("MONGODB_URI", "").strip()
  if not configured_uri:
    await _connect_to_mock_database()
    return

  _client = AsyncIOMotorClient(configured_uri, serverSelectionTimeoutMS=1500)
  _database = _client[settings.mongodb_db]
  for attempt in range(2):
    try:
      await _database.command("ping")
      _database_mode = "mongodb"
      return
    except ServerSelectionTimeoutError:
      if attempt == 1:
        break
      await asyncio.sleep(0.5)

  if _client is not None and hasattr(_client, "close"):
    _client.close()
  await _connect_to_mock_database()


async def close_mongo_connection() -> None:
  global _client, _database, _database_mode
  if _client is not None and hasattr(_client, "close"):
    _client.close()
  _client = None
  _database = None
  _database_mode = "disconnected"


def get_database() -> AsyncIOMotorDatabase:
  if _database is None:
    raise RuntimeError("MongoDB is not connected")
  return _database


def get_database_mode() -> str:
  return _database_mode
