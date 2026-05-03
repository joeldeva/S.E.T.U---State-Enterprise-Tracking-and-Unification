from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from typing import Any, Literal

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from .serialization import serialize_document
from .ubid_generator import anchor_for_record, canonical_name, generate_review_ubid, generate_ubid

ReviewDecision = Literal[
  "approve_merge",
  "reject_match",
  "create_new_ubid",
  "attach_to_existing_ubid",
  "mark_insufficient_data",
]


def _utc_now() -> str:
  return datetime.now(timezone.utc).isoformat()


def _audit_id(case_id: str, decision: str, timestamp: str) -> str:
  digest = hashlib.sha1(f"{case_id}:{decision}:{timestamp}".encode("utf-8")).hexdigest()[:10]
  return f"audit_review_{digest}"


async def _normalized_records(database: AsyncIOMotorDatabase, source_ids: list[str]) -> list[dict[str, Any]]:
  cursor = database.normalized_records.find({"source_record_id": {"$in": source_ids}})
  return [record async for record in cursor]


async def _find_ubid_for_records(database: AsyncIOMotorDatabase, source_ids: list[str]) -> dict[str, Any] | None:
  return await database.ubid_registry.find_one({"linked_records": {"$in": source_ids}})


async def _candidate_records(database: AsyncIOMotorDatabase, candidate: dict[str, Any]) -> list[dict[str, Any]]:
  return await _normalized_records(database, [candidate["record_a"], candidate["record_b"]])


async def _upsert_merge_ubid(
  database: AsyncIOMotorDatabase,
  candidate: dict[str, Any],
) -> dict[str, Any]:
  source_ids = sorted([candidate["record_a"], candidate["record_b"]])
  existing = await _find_ubid_for_records(database, source_ids)

  if existing:
    ubid = existing["_id"]
    await database.ubid_registry.update_one(
      {"_id": ubid},
      {
        "$addToSet": {"linked_records": {"$each": source_ids}},
        "$pullAll": {"candidate_records": source_ids},
        "$set": {
          "review_status": "reviewer_verified",
          "match_confidence": max(existing.get("match_confidence", 0), candidate.get("confidence", 0)),
          "reversible": True,
        },
      },
    )
    return await database.ubid_registry.find_one({"_id": ubid})

  records = await _candidate_records(database, candidate)
  anchor = next((anchor_for_record(record) for record in records if anchor_for_record(record)), None)
  anchor_type, anchor_hash = anchor if anchor else ("SYNTHETIC", None)
  ubid = generate_ubid(anchor_hash, source_ids)
  document = {
    "_id": ubid,
    "canonical_name": canonical_name(records),
    "anchor_type": anchor_type,
    "anchor_hash": anchor_hash,
    "linked_records": source_ids,
    "candidate_records": [],
    "current_status": "Insufficient Data",
    "status_confidence": 30,
    "match_confidence": candidate.get("confidence", 0),
    "review_status": "reviewer_verified",
    "created_by": "reviewer",
    "reversible": True,
  }
  await database.ubid_registry.update_one({"_id": ubid}, {"$set": document}, upsert=True)
  return document


async def _create_new_ubid(
  database: AsyncIOMotorDatabase,
  case_id: str,
  candidate: dict[str, Any],
  source_record_id: str | None,
) -> dict[str, Any]:
  allowed_sources = [candidate["record_a"], candidate["record_b"]]
  selected_source = source_record_id or candidate["record_a"]
  if selected_source not in allowed_sources:
    raise HTTPException(status_code=400, detail="source_record_id must belong to the review case")

  records = await _normalized_records(database, [selected_source])
  anchor = anchor_for_record(records[0]) if records else None
  anchor_type, anchor_hash = anchor if anchor else ("REVIEW_CREATED", None)
  ubid = generate_review_ubid(case_id, selected_source)
  document = {
    "_id": ubid,
    "canonical_name": canonical_name(records) if records else "Reviewer Created Business",
    "anchor_type": anchor_type,
    "anchor_hash": anchor_hash,
    "linked_records": [selected_source],
    "candidate_records": [],
    "current_status": "Insufficient Data",
    "status_confidence": 25,
    "match_confidence": candidate.get("confidence", 0),
    "review_status": "reviewer_created",
    "created_by": "reviewer",
    "reversible": True,
  }
  await database.ubid_registry.update_one({"_id": ubid}, {"$set": document}, upsert=True)
  return document


async def _attach_to_existing_ubid(
  database: AsyncIOMotorDatabase,
  candidate: dict[str, Any],
  existing_ubid: str | None,
  source_record_id: str | None,
) -> dict[str, Any]:
  source_ids = [candidate["record_a"], candidate["record_b"]]
  existing = await database.ubid_registry.find_one({"_id": existing_ubid}) if existing_ubid else None
  if existing is None:
    existing = await _find_ubid_for_records(database, source_ids)
  if existing is None:
    raise HTTPException(status_code=400, detail="existing_ubid is required when no candidate record is already linked")

  linked = set(existing.get("linked_records", []))
  if source_record_id:
    if source_record_id not in source_ids:
      raise HTTPException(status_code=400, detail="source_record_id must belong to the review case")
    records_to_attach = [source_record_id]
  else:
    records_to_attach = [source_id for source_id in source_ids if source_id not in linked] or source_ids

  await database.ubid_registry.update_one(
    {"_id": existing["_id"]},
    {
      "$addToSet": {"linked_records": {"$each": records_to_attach}},
      "$pullAll": {"candidate_records": records_to_attach},
      "$set": {
        "review_status": "reviewer_attached",
        "match_confidence": max(existing.get("match_confidence", 0), candidate.get("confidence", 0)),
        "reversible": True,
      },
    },
  )
  return await database.ubid_registry.find_one({"_id": existing["_id"]})


async def apply_review_decision(
  database: AsyncIOMotorDatabase,
  case_id: str,
  decision: ReviewDecision,
  reviewer: str,
  reason: str,
  existing_ubid: str | None = None,
  source_record_id: str | None = None,
) -> dict[str, Any]:
  review_before = await database.review_queue.find_one({"_id": case_id})
  if review_before is None:
    raise HTTPException(status_code=404, detail="Review case not found")

  match_candidate_id = review_before["match_candidate_id"]
  candidate_before = await database.match_candidates.find_one({"_id": match_candidate_id})
  if candidate_before is None:
    raise HTTPException(status_code=404, detail="Match candidate not found")

  timestamp = _utc_now()
  before_state = serialize_document(
    {
      "review_queue": review_before,
      "match_candidate": candidate_before,
    },
  )

  affected_ubid: dict[str, Any] | None = None
  match_status = candidate_before.get("status", "pending_review")
  review_status = "completed"

  if decision == "approve_merge":
    match_status = "reviewer_approved"
    affected_ubid = await _upsert_merge_ubid(database, candidate_before)
  elif decision == "reject_match":
    match_status = "rejected_by_reviewer"
  elif decision == "create_new_ubid":
    match_status = "new_ubid_created_by_reviewer"
    affected_ubid = await _create_new_ubid(database, case_id, candidate_before, source_record_id)
  elif decision == "attach_to_existing_ubid":
    match_status = "attached_to_existing_ubid_by_reviewer"
    affected_ubid = await _attach_to_existing_ubid(database, candidate_before, existing_ubid, source_record_id)
  elif decision == "mark_insufficient_data":
    match_status = "insufficient_data_by_reviewer"
    review_status = "insufficient_data"
  else:
    raise HTTPException(status_code=400, detail="Unsupported review decision")

  await database.match_candidates.update_one(
    {"_id": match_candidate_id},
    {
      "$set": {
        "status": match_status,
        "review_decision": decision,
        "reviewed_by": reviewer,
        "review_reason": reason,
        "reviewed_at": timestamp,
      },
    },
  )

  await database.review_queue.update_one(
    {"_id": case_id},
    {
      "$set": {
        "review_status": review_status,
        "decision": decision,
        "reviewer": reviewer,
        "decision_reason": reason,
        "completed_at": timestamp,
      },
    },
  )

  review_after = await database.review_queue.find_one({"_id": case_id})
  candidate_after = await database.match_candidates.find_one({"_id": match_candidate_id})
  after_state = serialize_document(
    {
      "review_queue": review_after,
      "match_candidate": candidate_after,
      "ubid_registry": affected_ubid,
    },
  )

  audit_log = {
    "_id": _audit_id(case_id, decision, timestamp),
    "action": decision,
    "actor": reviewer,
    "case_id": case_id,
    "match_candidate_id": match_candidate_id,
    "before": before_state,
    "after": after_state,
    "reason": reason,
    "timestamp": timestamp,
  }
  await database.audit_logs.insert_one(audit_log)

  return serialize_document(
    {
      "status": "completed",
      "decision": decision,
      "case_id": case_id,
      "match_candidate_id": match_candidate_id,
      "ubid": affected_ubid["_id"] if affected_ubid else None,
      "audit_log": audit_log,
      "review_case": review_after,
      "match_candidate": candidate_after,
    },
  )
