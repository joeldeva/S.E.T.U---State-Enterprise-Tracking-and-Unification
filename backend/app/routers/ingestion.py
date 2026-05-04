from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..db import get_database
from ..services.identifier_validation import (
  check_gstin_pan_consistency,
  hash_identifier,
  mask_gstin,
  mask_pan,
  validate_email_format,
  validate_gstin_format,
  validate_pan_format,
  validate_phone_format,
  validate_pin_code,
)
from ..services.serialization import serialize_document
from ..services.ubid_generator import generate_ubid

router = APIRouter(prefix="/ingestion", tags=["business ingestion"])

BusinessType = Literal["Proprietorship", "Partnership", "LLP", "Pvt Ltd", "Public Ltd", "Other"]


class BusinessSubmissionRequest(BaseModel):
  business_name: str = Field(min_length=1)
  business_type: BusinessType = "Other"
  pan: str | None = None
  gstin: str | None = None
  owner_name: str | None = None
  email: str | None = None
  phone: str | None = None
  address_line: str = Field(min_length=1)
  city: str | None = None
  district: str | None = None
  state: str = "Karnataka"
  pin_code: str = Field(min_length=1)
  business_sector: str | None = None
  factory_licence_number: str | None = None
  shop_licence_number: str | None = None
  kspcb_consent_number: str | None = None
  bescom_consumer_number: str | None = None
  supporting_document_name: str | None = None


def _clean(value: str | None) -> str | None:
  if value is None:
    return None
  cleaned = value.strip()
  return cleaned or None


def _now_iso() -> str:
  return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _validate_payload(payload: BusinessSubmissionRequest) -> tuple[list[str], list[str], dict[str, bool]]:
  errors: list[str] = []
  warnings: list[str] = []

  has_pan = bool(_clean(payload.pan))
  has_gstin = bool(_clean(payload.gstin))
  pan_valid = validate_pan_format(payload.pan) if has_pan else False
  gstin_valid = validate_gstin_format(payload.gstin) if has_gstin else False
  pin_valid = validate_pin_code(payload.pin_code)
  email_valid = validate_email_format(payload.email)
  phone_valid = validate_phone_format(payload.phone)
  identifiers_consistent = check_gstin_pan_consistency(payload.gstin, payload.pan)

  if not _clean(payload.business_name):
    errors.append("Business name is required.")
  if not has_pan and not has_gstin:
    errors.append("PAN or GSTIN is required.")
  if has_pan and not pan_valid:
    errors.append("PAN format is invalid.")
  if has_gstin and not gstin_valid:
    errors.append("GSTIN format must be 15 characters with state code and PAN section.")
  if not _clean(payload.address_line):
    errors.append("Address line is required.")
  if not pin_valid:
    errors.append("PIN code must be 6 digits.")
  if not email_valid:
    errors.append("Email format is invalid.")
  if not phone_valid:
    errors.append("Phone format is invalid.")
  if has_pan and has_gstin and pan_valid and gstin_valid and not identifiers_consistent:
    warnings.append("GSTIN PAN section does not match the submitted PAN.")

  return errors, warnings, {
    "pan_format_valid": pan_valid,
    "gstin_format_valid": gstin_valid,
    "pin_valid": pin_valid,
    "email_format_valid": email_valid,
    "phone_format_valid": phone_valid,
    "gstin_pan_consistent": identifiers_consistent,
    "official_verification_simulated": True,
  }


@router.post("/business-submission")
async def create_business_submission(payload: BusinessSubmissionRequest) -> dict:
  errors, warnings, validation = _validate_payload(payload)
  if errors:
    raise HTTPException(
      status_code=422,
      detail={
        "message": "Business submission validation failed.",
        "errors": errors,
        "warnings": warnings,
        "validation": validation,
      },
    )

  database = get_database()
  timestamp = _now_iso()
  pan_hash = hash_identifier(payload.pan, "hash_self_pan")
  gstin_hash = hash_identifier(payload.gstin, "hash_self_gstin")
  anchor_hash = gstin_hash or pan_hash
  submission_id = f"submission_{uuid4().hex[:10]}"
  ubid = generate_ubid(anchor_hash, [submission_id])
  ubid_status = "needs_review" if warnings else "provisional"
  review_status = "pending_verification" if warnings else "provisional"

  submission = {
    "_id": submission_id,
    "ubid": ubid,
    "source_type": "self_submitted",
    "business_name": payload.business_name.strip(),
    "business_type": payload.business_type,
    "owner_name": _clean(payload.owner_name),
    "email": _clean(payload.email),
    "phone": _clean(payload.phone),
    "address": {
      "address_line": payload.address_line.strip(),
      "city": _clean(payload.city),
      "district": _clean(payload.district),
      "state": _clean(payload.state) or "Karnataka",
      "pin_code": payload.pin_code.strip(),
    },
    "business_sector": _clean(payload.business_sector),
    "identifiers": {
      "pan_masked": mask_pan(payload.pan),
      "gstin_masked": mask_gstin(payload.gstin),
      "pan_hash": pan_hash,
      "gstin_hash": gstin_hash,
    },
    "department_references": {
      "factory_licence_number": _clean(payload.factory_licence_number),
      "shop_licence_number": _clean(payload.shop_licence_number),
      "kspcb_consent_number": _clean(payload.kspcb_consent_number),
      "bescom_consumer_number": _clean(payload.bescom_consumer_number),
    },
    "supporting_document": {
      "name": _clean(payload.supporting_document_name),
      "stored": False,
      "note": "Upload placeholder only; document storage can be integrated in production.",
    },
    "validation": validation,
    "validation_warnings": warnings,
    "status": "Provisional",
    "ubid_status": ubid_status,
    "next_step": "Pending government verification / reviewer approval",
    "verification_note": "Format validation and simulated verification for prototype. Official registry verification can be integrated in production.",
    "created_at": timestamp,
  }

  await database.business_submissions.insert_one(submission)

  await database.ubid_registry.update_one(
    {"_id": ubid},
    {
      "$set": {
        "_id": ubid,
        "canonical_name": payload.business_name.strip(),
        "anchor_type": "GSTIN_HASH" if gstin_hash else "PAN_HASH",
        "anchor_hash": anchor_hash,
        "linked_records": [],
        "candidate_records": [submission_id],
        "current_status": "Provisional",
        "ubid_status": ubid_status,
        "source_type": "self_submitted",
        "review_status": review_status,
        "status_confidence": 55 if warnings else 70,
        "match_confidence": 0,
        "created_by": "business_submission",
        "reversible": True,
        "updated_at": timestamp,
      }
    },
    upsert=True,
  )

  if warnings:
    review_id = f"review_{submission_id}"
    await database.review_queue.update_one(
      {"_id": review_id},
      {
        "$set": {
          "_id": review_id,
          "match_candidate_id": submission_id,
          "submission_id": submission_id,
          "ubid": ubid,
          "confidence": 55,
          "priority": "High",
          "reason": "Identifier validation warning",
          "review_status": "pending",
          "assigned_to": "Reviewer Demo",
          "created_at": timestamp,
        }
      },
      upsert=True,
    )

  audit_id = f"audit_business_submission_{uuid4().hex[:10]}"
  await database.audit_logs.insert_one(
    {
      "_id": audit_id,
      "action": "business_submission_received",
      "actor": "business_user",
      "target": ubid,
      "case_id": submission_id,
      "before": {},
      "after": {
        "ubid": ubid,
        "ubid_status": ubid_status,
        "source_type": "self_submitted",
        "validation_warnings": warnings,
      },
      "reason": "Business information submitted for provisional UBID generation.",
      "timestamp": timestamp,
    }
  )

  return serialize_document(submission)


@router.get("/business-submissions")
async def list_business_submissions(limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
  database = get_database()
  cursor = database.business_submissions.find({}).sort("created_at", -1).limit(limit)
  return [serialize_document(document) async for document in cursor]


@router.get("/business-submissions/{submission_id}")
async def get_business_submission(submission_id: str) -> dict:
  database = get_database()
  document = await database.business_submissions.find_one({"_id": submission_id})
  if document is None:
    raise HTTPException(status_code=404, detail="Business submission not found")
  return serialize_document(document)
