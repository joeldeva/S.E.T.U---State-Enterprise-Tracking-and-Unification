from fastapi import APIRouter, HTTPException, Query

from ..db import get_database
from ..services.serialization import serialize_document

router = APIRouter(tags=["read-only collections"])


async def _list_collection(collection_name: str, limit: int) -> list[dict]:
  database = get_database()
  cursor = database[collection_name].find({}).sort("_id", 1).limit(limit)
  return [serialize_document(document) async for document in cursor]


@router.get("/source-records")
async def get_source_records(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  return await _list_collection("source_records", limit)


@router.get("/normalized-records")
async def get_normalized_records(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  return await _list_collection("normalized_records", limit)


@router.get("/match-candidates")
async def get_match_candidates(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  return await _list_collection("match_candidates", limit)


@router.get("/ubids")
async def get_ubids(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  return await _list_collection("ubid_registry", limit)


@router.get("/ubids/{ubid}")
async def get_ubid(ubid: str) -> dict:
  database = get_database()
  document = await database.ubid_registry.find_one({"_id": ubid})
  if document is None:
    raise HTTPException(status_code=404, detail="UBID not found")
  return serialize_document(document)


@router.get("/review-queue")
async def get_review_queue(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  return await _list_collection("review_queue", limit)


@router.get("/activity-events")
async def get_activity_events(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  return await _list_collection("activity_events", limit)


@router.get("/audit-logs")
async def get_audit_logs(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  return await _list_collection("audit_logs", limit)
