from fastapi import APIRouter, HTTPException

from ..db import get_database
from ..services.query_engine import PREBUILT_QUERIES, run_prebuilt_query
from ..services.serialization import serialize_document

router = APIRouter(tags=["business intelligence queries"])


@router.get("/queries/prebuilt")
async def get_prebuilt_queries() -> list[dict]:
  return PREBUILT_QUERIES


@router.get("/queries/active-factories-no-inspection")
async def get_active_factories_no_inspection() -> dict:
  return await get_prebuilt_query_result("active-factories-no-inspection")


@router.get("/queries/{query_id}")
async def get_prebuilt_query_result(query_id: str) -> dict:
  database = get_database()
  ubids = [document async for document in database.ubid_registry.find({}).sort("_id", 1)]
  normalized_records = [document async for document in database.normalized_records.find({}).sort("_id", 1)]
  activity_events = [document async for document in database.activity_events.find({}).sort("event_date", -1)]
  match_candidates = [document async for document in database.match_candidates.find({}).sort("_id", 1)]

  try:
    result = run_prebuilt_query(
      query_id=query_id,
      ubid_registry=ubids,
      normalized_records=normalized_records,
      activity_events=activity_events,
      match_candidates=match_candidates,
    )
  except ValueError as error:
    raise HTTPException(status_code=404, detail=str(error)) from error

  return serialize_document(result)
