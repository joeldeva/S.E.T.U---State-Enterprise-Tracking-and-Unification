from fastapi import APIRouter

from ..db import get_database
from ..services.dashboard import build_dashboard_summary

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
async def get_dashboard() -> dict:
  return await build_dashboard_summary(get_database())
