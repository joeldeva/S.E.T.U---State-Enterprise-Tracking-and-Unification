from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import hashlib
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..db import get_database
from ..services.serialization import serialize_document

router = APIRouter(tags=["ubid governance"])


class DeactivateLinkRequest(BaseModel):
  actor: str = Field(default="Reviewer Demo", min_length=1)
  reason: str = Field(default="Wrong merge identified during review", min_length=1)


def _utc_now() -> str:
  return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _audit_id(ubid: str, record_id: str, timestamp: str) -> str:
  digest = hashlib.sha1(f"{ubid}:{record_id}:{timestamp}".encode("utf-8")).hexdigest()[:10]
  return f"audit_ubid_link_deactivated_{digest}"


def _default_link_detail(record_id: str, source_record: dict[str, Any] | None = None) -> dict[str, Any]:
  return {
    "record_id": record_id,
    "department": source_record.get("department") if source_record else None,
    "department_record_id": source_record.get("source_record_id") if source_record else record_id,
    "active": True,
    "link_status": "active",
    "deactivated_at": None,
    "deactivated_by": None,
    "deactivation_reason": None,
  }


async def _source_records_by_id(record_ids: list[str]) -> dict[str, dict[str, Any]]:
  database = get_database()
  cursor = database.source_records.find({"_id": {"$in": record_ids}})
  return {str(document["_id"]): document async for document in cursor}


@router.post("/ubids/{ubid}/links/{record_id}/deactivate")
async def deactivate_ubid_link(ubid: str, record_id: str, payload: DeactivateLinkRequest) -> dict:
  database = get_database()
  ubid_record = await database.ubid_registry.find_one({"_id": ubid})
  if ubid_record is None:
    raise HTTPException(status_code=404, detail="UBID not found")

  linked_records = [str(item) for item in ubid_record.get("linked_records", [])]
  if record_id not in linked_records and not any(
    detail.get("record_id") == record_id for detail in ubid_record.get("linked_record_details", [])
  ):
    raise HTTPException(status_code=404, detail="Linked source record not found")

  source_records = await _source_records_by_id(linked_records)
  link_details = deepcopy(ubid_record.get("linked_record_details") or [])
  known_detail_ids = {detail.get("record_id") for detail in link_details}
  for linked_record_id in linked_records:
    if linked_record_id not in known_detail_ids:
      link_details.append(_default_link_detail(linked_record_id, source_records.get(linked_record_id)))

  selected_index = next(
    (index for index, detail in enumerate(link_details) if detail.get("record_id") == record_id),
    None,
  )
  if selected_index is None:
    raise HTTPException(status_code=404, detail="Linked source record not found")

  before_state = deepcopy(link_details[selected_index])
  timestamp = _utc_now()
  after_state = {
    **before_state,
    "active": False,
    "link_status": "deactivated",
    "deactivated_at": timestamp,
    "deactivated_by": payload.actor,
    "deactivation_reason": payload.reason,
  }
  link_details[selected_index] = after_state

  await database.ubid_registry.update_one(
    {"_id": ubid},
    {
      "$set": {
        "linked_record_details": link_details,
        "last_link_change_at": timestamp,
      }
    },
  )

  audit_log = {
    "_id": _audit_id(ubid, record_id, timestamp),
    "action": "ubid_link_deactivated",
    "actor": payload.actor,
    "target": f"{ubid}:{record_id}",
    "before": before_state,
    "after": after_state,
    "reason": payload.reason,
    "timestamp": timestamp,
  }
  await database.audit_logs.insert_one(audit_log)

  return serialize_document(
    {
      "status": "completed",
      "ubid": ubid,
      "record_id": record_id,
      "link": after_state,
      "audit_log": audit_log,
    }
  )
