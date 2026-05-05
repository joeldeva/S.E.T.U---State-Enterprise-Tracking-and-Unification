from fastapi import APIRouter

from ..db import get_database
from ..services.activity_engine import build_activity_audit_logs, is_unmatched_activity_event, run_activity_classification
from ..services.serialization import serialize_document

router = APIRouter(tags=["activity intelligence"])

BUSINESS_NAME_FIELDS = (
  "business_name",
  "factory_name",
  "employer_name",
  "shop_name",
  "industry_name",
  "consumer_name",
)


def _source_business_name(source_record: dict | None) -> str:
  raw = source_record.get("raw", {}) if source_record else {}
  for field in BUSINESS_NAME_FIELDS:
    if raw.get(field):
      return str(raw[field])
  return "Not available"


def _format_possible_matches(event: dict, ubids_by_id: dict[str, dict]) -> list[dict]:
  if event.get("possible_matches"):
    return [
      {
        "ubid": match.get("ubid"),
        "canonical_name": match.get("canonical_name")
        or ubids_by_id.get(str(match.get("ubid")), {}).get("canonical_name")
        or "Not available",
        "confidence": match.get("confidence", 0),
      }
      for match in event.get("possible_matches", [])
    ]

  ubid = event.get("ubid")
  if not ubid:
    return []

  ubid_record = ubids_by_id.get(str(ubid), {})
  return [
    {
      "ubid": str(ubid),
      "canonical_name": ubid_record.get("canonical_name", "Not available"),
      "confidence": event.get("joined_confidence", 0),
    }
  ]


def _format_unmatched_event(event: dict, ubids_by_id: dict[str, dict], source_records_by_id: dict[str, dict]) -> dict:
  source_record = source_records_by_id.get(str(event.get("source_record_id")))
  reason = event.get("reason")
  if not reason:
    reason = "No strong identifier match / low confidence join"

  return {
    "event_id": event.get("_id") or event.get("event_id"),
    "department": event.get("department") or event.get("source") or (source_record.get("department") if source_record else None),
    "department_record_id": event.get("department_record_id")
    or (source_record.get("source_record_id") if source_record else None)
    or event.get("source_record_id"),
    "business_name": event.get("business_name") or _source_business_name(source_record),
    "event_type": event.get("event_type"),
    "event_date": event.get("event_date"),
    "possible_matches": _format_possible_matches(event, ubids_by_id),
    "reason": reason,
    "review_status": event.get("review_status", "pending"),
  }


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


@router.get("/activity/unmatched-events")
async def get_unmatched_activity_events() -> list[dict]:
  database = get_database()
  events = [document async for document in database.activity_events.find({}).sort("event_date", -1)]
  ubids = [document async for document in database.ubid_registry.find({})]
  source_record_ids = [event.get("source_record_id") for event in events if event.get("source_record_id")]
  source_records = [
    document
    async for document in database.source_records.find({"_id": {"$in": source_record_ids}})
  ]

  ubids_by_id = {str(document["_id"]): document for document in ubids}
  source_records_by_id = {str(document["_id"]): document for document in source_records}
  unmatched = [
    _format_unmatched_event(event, ubids_by_id, source_records_by_id)
    for event in events
    if is_unmatched_activity_event(event)
  ]
  return serialize_document(unmatched)
