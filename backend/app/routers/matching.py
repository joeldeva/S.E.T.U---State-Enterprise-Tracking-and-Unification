from fastapi import APIRouter

from ..db import get_database
from ..services.matcher import run_entity_resolution
from ..services.serialization import serialize_document

router = APIRouter(tags=["matching"])

REPLACE_COLLECTIONS = (
  "normalized_records",
  "match_candidates",
  "review_queue",
  "ubid_registry",
)

MATCHING_THRESHOLDS = {
  "auto_link": {
    "label": "Auto-link",
    "range": "90-100",
    "min": 90,
    "max": 100,
    "description": "Strong deterministic or combined evidence; link can be created with audit history.",
  },
  "human_review": {
    "label": "Human Review",
    "range": "65-89",
    "min": 65,
    "max": 89,
    "description": "Plausible match with uncertainty or missing evidence; route to reviewer.",
  },
  "keep_separate": {
    "label": "Keep Separate",
    "range": "below 65",
    "min": 0,
    "max": 64,
    "description": "Evidence is weak or conflicting; do not merge automatically.",
  },
  "evidence_weights": [
    {"signal": "GSTIN/PAN hash match", "weight": "strong positive"},
    {"signal": "Licence or local identifier match", "weight": "strong positive"},
    {"signal": "Name similarity", "weight": "medium positive"},
    {"signal": "Address similarity", "weight": "medium positive"},
    {"signal": "PIN/district match", "weight": "supporting positive"},
    {"signal": "Conflict penalty", "weight": "strong negative"},
  ],
  "principle": "Thresholds are conservative because a wrong merge is more costly than a missed merge.",
}


async def _replace_collection(collection_name: str, documents: list[dict]) -> int:
  database = get_database()
  collection = database[collection_name]
  await collection.delete_many({})
  if not documents:
    return 0
  result = await collection.insert_many(documents)
  return len(result.inserted_ids)


@router.post("/matching/run")
async def run_matching() -> dict:
  database = get_database()
  source_records = [document async for document in database.source_records.find({}).sort("_id", 1)]
  result = run_entity_resolution(source_records)

  updated = {}
  for collection_name in REPLACE_COLLECTIONS:
    updated[collection_name] = await _replace_collection(collection_name, result[collection_name])

  await database.audit_logs.delete_many({"generated_by": "entity_resolution"})
  if result["audit_logs"]:
    inserted_audits = await database.audit_logs.insert_many(result["audit_logs"])
    updated["audit_logs"] = len(inserted_audits.inserted_ids)
  else:
    updated["audit_logs"] = 0

  return serialize_document(
    {
      "status": "completed",
      "mode": "local_explainable_entity_resolution",
      "hosted_llm_used": False,
      "collections_updated": updated,
      "counts": result["counts"],
      "summary": result["summary"],
      "match_candidates": result["match_candidates"][:25],
      "review_queue": result["review_queue"],
    },
  )


@router.get("/matching/thresholds")
async def get_matching_thresholds() -> dict:
  return MATCHING_THRESHOLDS
