from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import close_mongo_connection, connect_to_mongo, get_database, get_database_mode
from .routers import api_router
from .seed.synthetic_data import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI):
  await connect_to_mongo()
  await seed_database(get_database())
  yield
  await close_mongo_connection()


app = FastAPI(
  title="S.E.T.U State Enterprise Tracking and Unification API",
  description="Synthetic read-only backend foundation for the S.E.T.U prototype.",
  version="0.1.0",
  lifespan=lifespan,
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=list(settings.allowed_origins),
  allow_credentials=True,
  allow_methods=["GET", "POST", "OPTIONS"],
  allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
  database = get_database()
  await database.command("ping")
  return {
    "status": "ok",
    "database": settings.mongodb_db,
    "mode": "synthetic-read-only",
    "database_mode": get_database_mode(),
  }
