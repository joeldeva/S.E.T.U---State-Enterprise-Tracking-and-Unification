from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path
from difflib import SequenceMatcher
from typing import Any

from .identifier_validation import (
  hash_identifier,
  mask_gstin,
  mask_pan,
)

ROOT_DIR = Path(__file__).resolve().parents[3]
MOCK_DB_DIR = ROOT_DIR / "data" / "mock_database"
DEPARTMENT_RECORDS_PATH = MOCK_DB_DIR / "department_business_records.csv"
ACTIVITY_EVENTS_PATH = MOCK_DB_DIR / "activity_events.csv"

LICENSE_FIELDS = [
  "factory_license_no",
  "shop_license_no",
  "labour_registration_no",
  "kspcb_consent_no",
  "bescom_consumer_no",
  "bwssb_consumer_no",
  "trade_license_no",
]


def _clean_identifier(value: str | None) -> str:
  return "".join(char for char in (value or "").upper() if char.isalnum())


def _clean_text(value: str | None) -> str:
  return " ".join((value or "").lower().replace(",", " ").replace(".", " ").split())


def _read_csv(path: Path) -> list[dict[str, str]]:
  if not path.exists():
    return []
  with path.open("r", encoding="utf-8", newline="") as file:
    return [dict(row) for row in csv.DictReader(file)]


@lru_cache(maxsize=1)
def load_department_records() -> list[dict[str, str]]:
  return _read_csv(DEPARTMENT_RECORDS_PATH)


@lru_cache(maxsize=1)
def load_activity_events() -> list[dict[str, str]]:
  return _read_csv(ACTIVITY_EVENTS_PATH)


def _matching_identifier(row: dict[str, str], field: str, value: str | None) -> bool:
  cleaned_value = _clean_identifier(value)
  return bool(cleaned_value and _clean_identifier(row.get(field)) == cleaned_value)


def find_by_pan(pan: str | None) -> list[dict[str, str]]:
  return [row for row in load_department_records() if _matching_identifier(row, "pan", pan)]


def find_by_gstin(gstin: str | None) -> list[dict[str, str]]:
  return [row for row in load_department_records() if _matching_identifier(row, "gstin", gstin)]


def find_by_pan_or_gstin(pan: str | None, gstin: str | None) -> list[dict[str, str]]:
  seen: set[str] = set()
  matches: list[dict[str, str]] = []
  for row in [*find_by_gstin(gstin), *find_by_pan(pan)]:
    record_id = row.get("record_id", "")
    if record_id not in seen:
      seen.add(record_id)
      matches.append(row)
  return matches


def find_by_license_or_consumer_number(values: dict[str, str | None]) -> list[dict[str, str]]:
  lookup = {
    field: _clean_identifier(values.get(field))
    for field in LICENSE_FIELDS
    if _clean_identifier(values.get(field))
  }
  if not lookup:
    return []

  matches: list[dict[str, str]] = []
  seen: set[str] = set()
  for row in load_department_records():
    for field, value in lookup.items():
      if _clean_identifier(row.get(field)) == value and row.get("record_id") not in seen:
        seen.add(row.get("record_id", ""))
        matches.append(row)
  return matches


def _row_fuzzy_score(row: dict[str, str], business_name: str, address: str, pin_code: str, sector: str | None) -> int:
  name_score = SequenceMatcher(None, _clean_text(row.get("business_name")), _clean_text(business_name)).ratio() * 100
  address_score = SequenceMatcher(None, _clean_text(row.get("address")), _clean_text(address)).ratio() * 100
  pin_score = 20 if row.get("pin_code") == pin_code else -20
  sector_score = 10 if sector and _clean_text(row.get("business_sector")) == _clean_text(sector) else 0
  return max(0, min(100, round((name_score * 0.45) + (address_score * 0.25) + pin_score + sector_score)))


def find_fuzzy_business_match(
  business_name: str,
  address: str,
  pin_code: str,
  sector: str | None = None,
  limit: int = 8,
) -> list[dict[str, Any]]:
  candidates: list[dict[str, Any]] = []
  for row in load_department_records():
    if pin_code and row.get("pin_code") != pin_code:
      continue
    confidence = _row_fuzzy_score(row, business_name, address, pin_code, sector)
    if confidence >= 55:
      candidates.append({"record": row, "confidence": confidence, "match_type": "fuzzy_business"})

  candidates.sort(key=lambda item: item["confidence"], reverse=True)
  return candidates[:limit]


def get_activity_events_for_identifier(pan: str | None = None, gstin: str | None = None, company_group_id: str | None = None) -> list[dict[str, str]]:
  events = load_activity_events()
  cleaned_pan = _clean_identifier(pan)
  cleaned_gstin = _clean_identifier(gstin)
  return [
    event
    for event in events
    if (company_group_id and event.get("company_group_id") == company_group_id)
    or (cleaned_pan and _clean_identifier(event.get("pan")) == cleaned_pan)
    or (cleaned_gstin and _clean_identifier(event.get("gstin")) == cleaned_gstin)
  ]


def get_mock_database_summary() -> dict[str, Any]:
  records = load_department_records()
  events = load_activity_events()
  groups = {row.get("company_group_id") for row in records if row.get("company_group_id", "").startswith("CG-")}
  departments = sorted({row.get("department") for row in records if row.get("department")})
  review_like = {row.get("company_group_id") for row in records if row.get("company_group_id", "").startswith("AMB-")}
  return {
    "unique_businesses": len(groups),
    "department_records": len(records),
    "activity_events": len(events),
    "departments": departments,
    "ambiguous_or_review_cases": len(review_like),
    "last_loaded_status": "loaded_from_csv",
    "note": "Synthetic CSV-based department database for prototype",
    "sample_records": [mask_department_record(row) for row in records[:8]],
  }


def mask_department_record(row: dict[str, str], include_match_detail: bool = False) -> dict[str, Any]:
  masked: dict[str, Any] = {
    "record_id": row.get("record_id"),
    "company_group_id": row.get("company_group_id"),
    "department": row.get("department"),
    "department_record_id": row.get("department_record_id"),
    "business_name": row.get("business_name"),
    "business_type": row.get("business_type"),
    "pan_masked": mask_pan(row.get("pan")),
    "gstin_masked": mask_gstin(row.get("gstin")),
    "pan_hash": hash_identifier(row.get("pan"), "hash_mock_pan") if row.get("pan") else None,
    "gstin_hash": hash_identifier(row.get("gstin"), "hash_mock_gstin") if row.get("gstin") else None,
    "address": row.get("address"),
    "city": row.get("city"),
    "district": row.get("district"),
    "state": row.get("state"),
    "pin_code": row.get("pin_code"),
    "business_sector": row.get("business_sector"),
    "factory_license_no": row.get("factory_license_no"),
    "shop_license_no": row.get("shop_license_no"),
    "labour_registration_no": row.get("labour_registration_no"),
    "kspcb_consent_no": row.get("kspcb_consent_no"),
    "bescom_consumer_no": row.get("bescom_consumer_no"),
    "bwssb_consumer_no": row.get("bwssb_consumer_no"),
    "trade_license_no": row.get("trade_license_no"),
    "status_in_department": row.get("status_in_department"),
    "last_updated": row.get("last_updated"),
  }
  if include_match_detail:
    masked["match_source"] = "synthetic_csv_mock_database"
  return masked


def mask_activity_event(row: dict[str, str]) -> dict[str, Any]:
  return {
    "event_id": row.get("event_id"),
    "company_group_id": row.get("company_group_id"),
    "department": row.get("department"),
    "department_record_id": row.get("department_record_id"),
    "pan_masked": mask_pan(row.get("pan")),
    "gstin_masked": mask_gstin(row.get("gstin")),
    "event_type": row.get("event_type"),
    "event_date": row.get("event_date"),
    "event_status": row.get("event_status"),
    "remarks": row.get("remarks"),
  }
