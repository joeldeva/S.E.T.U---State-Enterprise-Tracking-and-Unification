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
