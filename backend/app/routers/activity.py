from fastapi import APIRouter

from ..db import get_database
from ..services.activity_engine import build_activity_audit_logs, run_activity_classification
from ..services.serialization import serialize_document

router = APIRouter(tags=["activity intelligence"])


@router.post("/activity/run")
async def run_activity_intelligence() -> dict:
  database = get_database()
  ubids = [document async for document in database.ubid_registry.find({}).sort("_id", 1)]
  activity_events = [document async for document in database.activity_events.find({}).sort("event_date", -1)]
  result = run_activity_classification(ubids, activity_events)
  before_by_ubid = {str(document["_id"]): document for document in ubids}

  for status in result["statuses"]:
    await database.ubid_registry.update_one(
      {"_id": status["ubid"]},
      {
        "$set": {
          "current_status": status["status"],
          "status_confidence": status["confidence"],
          "activity_score": status["activity_score"],
          "activity_evidence_timeline": status["evidence_timeline"],
          "activity_scoring_breakdown": status["scoring_breakdown"],
          "last_activity_date": status["last_activity_date"],
          "unmatched_event_count": status["unmatched_event_count"],
        },
      },
    )

  audit_logs = build_activity_audit_logs(before_by_ubid, result["statuses"])
  await database.audit_logs.delete_many({"generated_by": "activity_engine"})
  if audit_logs:
    await database.audit_logs.insert_many(audit_logs)

  return serialize_document(
    {
      "status": "completed",
      "mode": "local_explainable_activity_classification",
      "hosted_llm_used": False,
      "counts": result["counts"],
      "statuses": result["statuses"],
      "unmatched_events": result["unmatched_events"],
      "unmatched_event_count": result["unmatched_event_count"],
      "audit_logs_written": len(audit_logs),
    },
  )
