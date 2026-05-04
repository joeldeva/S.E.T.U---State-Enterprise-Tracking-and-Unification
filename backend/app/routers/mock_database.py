from fastapi import APIRouter, Query

from ..services.mock_database import (
  get_mock_database_summary,
  load_activity_events,
  load_department_records,
  mask_activity_event,
  mask_department_record,
)

router = APIRouter(prefix="/mock-database", tags=["mock department database"])


@router.get("/summary")
async def mock_database_summary() -> dict:
  return get_mock_database_summary()


@router.get("/records")
async def mock_database_records(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  return [mask_department_record(row) for row in load_department_records()[:limit]]


@router.get("/activity-events")
async def mock_database_activity_events(limit: int = Query(default=100, ge=1, le=800)) -> list[dict]:
  return [mask_activity_event(row) for row in load_activity_events()[:limit]]
