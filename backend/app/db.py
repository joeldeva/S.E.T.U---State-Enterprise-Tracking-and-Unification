import asyncio

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ServerSelectionTimeoutError

from .config import settings

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
  global _client, _database
  if _client is not None and _database is not None:
    return

  _client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=2000)
  _database = _client[settings.mongodb_db]
  for attempt in range(10):
    try:
      await _database.command("ping")
      return
    except ServerSelectionTimeoutError:
      if attempt == 9:
        raise
      await asyncio.sleep(1)


async def close_mongo_connection() -> None:
  global _client, _database
  if _client is not None:
    _client.close()
  _client = None
  _database = None


def get_database() -> AsyncIOMotorDatabase:
  if _database is None:
    raise RuntimeError("MongoDB is not connected")
  return _database
