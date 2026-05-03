from fastapi import APIRouter

from ..db import get_database
from ..services.query_engine import PREBUILT_QUERIES, active_factories_no_inspection
from ..services.serialization import serialize_document

router = APIRouter(tags=["business intelligence queries"])


@router.get("/queries/prebuilt")
async def get_prebuilt_queries() -> list[dict]:
  return PREBUILT_QUERIES


@router.get("/queries/active-factories-no-inspection")
async def get_active_factories_no_inspection() -> dict:
  database = get_database()
  ubids = [document async for document in database.ubid_registry.find({}).sort("_id", 1)]
  normalized_records = [document async for document in database.normalized_records.find({}).sort("_id", 1)]
  activity_events = [document async for document in database.activity_events.find({}).sort("event_date", -1)]

  results = active_factories_no_inspection(
    ubid_registry=ubids,
    normalized_records=normalized_records,
    activity_events=activity_events,
  )
  return serialize_document(
    {
      "query_id": "active-factories-no-inspection",
      "title": "Active factories in PIN code 560058 with no inspection in the last 18 months",
      "result_count": len(results),
      "results": results,
    },
  )
