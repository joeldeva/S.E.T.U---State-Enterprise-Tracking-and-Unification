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
from ..services.mock_database import (
  find_by_gstin,
  find_by_license_or_consumer_number,
  find_by_pan,
  find_fuzzy_business_match,
  get_activity_events_for_identifier,
  mask_activity_event,
  mask_department_record,
)
from ..services.serialization import serialize_document
from ..services.ubid_profile import build_ubid_identity_sections
from ..services.ubid_generator import generate_ubid

router = APIRouter(prefix="/ingestion", tags=["business ingestion"])

BusinessType = Literal["Proprietorship", "Partnership", "LLP", "Pvt Ltd", "Public Ltd", "Other"]


class IdentifierVerificationRequest(BaseModel):
  pan: str | None = None
  gstin: str | None = None


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
  bwssb_consumer_number: str | None = None
  labour_registration_number: str | None = None
  trade_license_number: str | None = None
  supporting_document_name: str | None = None


def _clean(value: str | None) -> str | None:
  if value is None:
    return None
  cleaned = value.strip()
  return cleaned or None


def _now_iso() -> str:
  return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _has_department_reference(payload: BusinessSubmissionRequest) -> bool:
  return any(
    _clean(value)
    for value in [
      payload.factory_licence_number,
      payload.shop_licence_number,
      payload.kspcb_consent_number,
      payload.bescom_consumer_number,
      payload.bwssb_consumer_number,
      payload.labour_registration_number,
      payload.trade_license_number,
    ]
  )


def _validate_payload(payload: BusinessSubmissionRequest) -> tuple[list[str], list[str], dict[str, object]]:
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
  if not has_pan and not has_gstin and not _has_department_reference(payload):
    errors.append("PAN, GSTIN, or department reference number is required.")
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
    "official_verification": "simulated_for_prototype",
  }


def _dedupe_records(records: list[dict]) -> list[dict]:
  seen: set[str] = set()
  deduped: list[dict] = []
  for record in records:
    record_id = record.get("record_id", "")
    if record_id and record_id not in seen:
      seen.add(record_id)
      deduped.append(record)
  return deduped


def _build_mock_match(payload: BusinessSubmissionRequest, warnings: list[str]) -> tuple[list[dict], int, str, list[str]]:
  match_notes: list[str] = []
  strong_matches: list[dict] = []
  pan_matches = find_by_pan(payload.pan)
  gstin_matches = find_by_gstin(payload.gstin)

  if gstin_matches:
    match_notes.append("GSTIN matched synthetic department records.")
    strong_matches.extend(gstin_matches)
  if pan_matches:
    match_notes.append("PAN matched synthetic department records.")
    strong_matches.extend(pan_matches)

  license_matches = find_by_license_or_consumer_number(
    {
      "factory_license_no": payload.factory_licence_number,
      "shop_license_no": payload.shop_licence_number,
      "labour_registration_no": payload.labour_registration_number,
      "kspcb_consent_no": payload.kspcb_consent_number,
      "bescom_consumer_no": payload.bescom_consumer_number,
      "bwssb_consumer_no": payload.bwssb_consumer_number,
      "trade_license_no": payload.trade_license_number,
    }
  )
  if license_matches:
    match_notes.append("Department licence or consumer number matched synthetic records.")
    strong_matches.extend(license_matches)

  strong_matches = _dedupe_records(strong_matches)
  if strong_matches:
    return strong_matches, 95 if not warnings else 72, "strong_identifier_or_reference", match_notes

  fuzzy_matches = find_fuzzy_business_match(
    business_name=payload.business_name,
    address=payload.address_line,
    pin_code=payload.pin_code,
    sector=payload.business_sector,
  )
  if fuzzy_matches:
    best = fuzzy_matches[0]["confidence"]
    matched_records = [item["record"] for item in fuzzy_matches if item["confidence"] >= max(65, best - 8)]
    match_notes.append(f"Fuzzy business match found at {best}% confidence.")
    return _dedupe_records(matched_records), best, "fuzzy_business", match_notes

  return [], 0, "self_submitted_only", ["No matching record found in synthetic CSV department database."]


def _identifier_result(kind: Literal["pan", "gstin"], value: str | None, matches: list[dict]) -> dict:
  has_value = bool(_clean(value))
  format_valid = validate_pan_format(value) if kind == "pan" else validate_gstin_format(value)
  mask = mask_pan(value) if kind == "pan" else mask_gstin(value)

  if not has_value:
    status = "not_provided"
    message = f"{kind.upper()} not provided."
  elif not format_valid:
    status = "invalid_format"
    message = f"{kind.upper()} format is invalid."
  elif matches:
    status = "exists_in_mock_database"
    message = f"{kind.upper()} exists in synthetic CSV department records."
  else:
    status = "not_found_in_mock_database"
    message = f"{kind.upper()} format is valid, but it was not found in the synthetic CSV department records."

  return {
    "kind": kind,
    "provided": has_value,
    "masked_value": mask,
    "format_valid": format_valid,
    "exists_in_mock_database": bool(format_valid and matches),
    "match_count": len(matches) if format_valid else 0,
    "sample_matches": [mask_department_record(record) for record in matches[:5]] if format_valid else [],
    "verification_source": "synthetic_csv_mock_database",
    "status": status,
    "message": message,
    "live_verification": {
      "available": False,
      "provider": "not_configured",
      "message": "Production can connect this adapter to an authorized GSTN/GSP GSTIN API and authorized PAN OPV provider. This prototype does not call government systems.",
    },
  }


def _status_for_match(confidence: int, warnings: list[str]) -> tuple[str, str, str]:
  if warnings:
    return (
      "provisional_needs_review",
      "Officer Review Required",
      "Identifier warning requires officer review before verification.",
    )
  if confidence >= 90:
    return (
      "verified_mock_match",
      "Verified Mock Match",
      "Matched synthetic department evidence. Pending final production registry verification.",
    )
  if confidence >= 65:
    return (
      "provisional_needs_review",
      "Provisional - Needs Review",
      "Ambiguous synthetic database match requires officer review.",
    )
  return (
    "provisional_self_submitted",
    "Provisional - Self Submitted",
    "No confident synthetic department match found. Pending government verification / reviewer approval.",
  )


@router.post("/identifier-verification")
async def verify_business_identifiers(payload: IdentifierVerificationRequest) -> dict:
  pan = _clean(payload.pan)
  gstin = _clean(payload.gstin)
  pan_matches = find_by_pan(pan) if pan else []
  gstin_matches = find_by_gstin(gstin) if gstin else []
  pan_format_valid = validate_pan_format(pan) if pan else False
  gstin_format_valid = validate_gstin_format(gstin) if gstin else False
  gstin_pan_consistent = check_gstin_pan_consistency(gstin, pan)
  warnings: list[str] = []

  if pan and gstin and pan_format_valid and gstin_format_valid and not gstin_pan_consistent:
    warnings.append("GSTIN PAN section does not match the submitted PAN.")

  return {
    "pan": _identifier_result("pan", pan, pan_matches),
    "gstin": _identifier_result("gstin", gstin, gstin_matches),
    "gstin_pan_consistent": gstin_pan_consistent,
    "warnings": warnings,
    "privacy_note": "Raw PAN/GSTIN are not returned. The backend uses the submitted values only for validation and mock CSV lookup, then returns masked identifiers.",
    "production_note": "For real existence checks, configure authorized GSTN/GSP GSTIN verification and authorized PAN OPV integration. Do not scrape public portals or send raw identifiers to hosted LLMs.",
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
  matched_records, match_confidence, match_type, match_notes = _build_mock_match(payload, warnings)
  matched_group = matched_records[0].get("company_group_id") if matched_records else None
  activity_events = get_activity_events_for_identifier(
    pan=payload.pan,
    gstin=payload.gstin,
    company_group_id=matched_group,
  )[:10]
  anchor_hash = gstin_hash or pan_hash
  submission_id = f"submission_{uuid4().hex[:10]}"
  ubid = generate_ubid(anchor_hash or matched_group, [submission_id, *(record.get("record_id", "") for record in matched_records)])
  ubid_status, status_label, next_step = _status_for_match(match_confidence, warnings)
  review_status = "pending_review" if ubid_status == "provisional_needs_review" else ubid_status
  masked_records = [mask_department_record(record, include_match_detail=True) for record in matched_records[:12]]
  masked_events = [mask_activity_event(event) for event in activity_events]
  anchor_type = "GSTIN_HASH" if gstin_hash else "PAN_HASH" if pan_hash else "SELF_SUBMITTED"
  identity_records = [
    {
      "record_id": submission_id,
      "department": "Self-submitted",
      "department_record_id": submission_id,
      "business_name": payload.business_name.strip(),
      "address": payload.address_line.strip(),
      "district": _clean(payload.district),
      "pin_code": payload.pin_code.strip(),
      "pan_hash": pan_hash,
      "gstin_hash": gstin_hash,
    },
    *masked_records,
  ]
  identity_sections = build_ubid_identity_sections(ubid, payload.business_name.strip(), identity_records, anchor_type)

  submission = {
    "_id": submission_id,
    "submission_id": submission_id,
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
      "bwssb_consumer_number": _clean(payload.bwssb_consumer_number),
      "labour_registration_number": _clean(payload.labour_registration_number),
      "trade_license_number": _clean(payload.trade_license_number),
    },
    "supporting_document": {
      "name": _clean(payload.supporting_document_name),
      "stored": False,
      "note": "Upload placeholder only; document storage can be integrated in production.",
    },
    "validation": {
      **validation,
      "mock_database_match": bool(matched_records),
    },
    "validation_results": {
      **validation,
      "mock_database_match": bool(matched_records),
    },
    "validation_warnings": warnings,
    "warnings": warnings,
    "status": "Provisional",
    "ubid_status": ubid_status,
    "status_label": status_label,
    "match_type": match_type,
    "match_confidence": match_confidence,
    "matched_records": masked_records,
    "matched_activity_events": masked_events,
    "match_notes": match_notes,
    "next_step": next_step,
    "verification_note": "Format validation and simulated mock-database verification for prototype. Production deployment would connect to authorized department APIs, secure data pipelines, or scheduled department exports.",
    "created_at": timestamp,
  }

  await database.business_submissions.insert_one(submission)

  await database.ubid_registry.update_one(
    {"_id": ubid},
    {
      "$set": {
        "_id": ubid,
        "canonical_name": payload.business_name.strip(),
        "anchor_type": anchor_type,
        "anchor_hash": anchor_hash,
        "linked_records": [],
        "linked_record_details": [],
        "candidate_records": [submission_id, *(record.get("record_id", "") for record in matched_records[:12])],
        "current_status": status_label,
        "ubid_status": ubid_status,
        "source_type": "self_submitted",
        "review_status": review_status,
        "status_confidence": match_confidence if match_confidence else 50,
        "match_confidence": match_confidence,
        "mock_department_evidence": masked_records,
        "created_by": "business_submission",
        "reversible": True,
        "updated_at": timestamp,
        **identity_sections,
      }
    },
    upsert=True,
  )

  if warnings or ubid_status == "provisional_needs_review":
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
          "match_confidence": match_confidence,
          "priority": "High",
          "reason": "Identifier validation warning" if warnings else "Ambiguous mock database match",
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
        "match_confidence": match_confidence,
        "matched_records": len(masked_records),
        "source_type": "self_submitted",
        "validation_warnings": warnings,
      },
      "reason": "Business information submitted for CSV mock department lookup and UBID generation.",
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
