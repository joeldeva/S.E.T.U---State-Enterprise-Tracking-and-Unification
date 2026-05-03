from fastapi import APIRouter

from ..db import get_database
from ..services.map_summary import build_pincode_summary
from ..services.serialization import serialize_document

router = APIRouter(tags=["map intelligence"])


@router.get("/map/pincode-summary")
async def get_pincode_summary() -> list[dict]:
  database = get_database()
  ubids = [document async for document in database.ubid_registry.find({}).sort("_id", 1)]
  normalized_records = [document async for document in database.normalized_records.find({}).sort("_id", 1)]
  match_candidates = [document async for document in database.match_candidates.find({}).sort("_id", 1)]
  activity_events = [document async for document in database.activity_events.find({}).sort("event_date", -1)]

  return serialize_document(build_pincode_summary(ubids, normalized_records, match_candidates, activity_events))
