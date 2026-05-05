from __future__ import annotations

from collections import defaultdict
from typing import Any

from .query_engine import active_factories_no_inspection

PIN_METADATA: dict[str, dict[str, Any]] = {
  # ── CSV mock-database PINs (department_business_records.csv) ─────────
  "560001": {"label": "Bengaluru Central",    "latitude": 12.9766, "longitude": 77.5993},
  "560022": {"label": "Yeshwanthpur",         "latitude": 13.0159, "longitude": 77.5440},
  "560037": {"label": "Jayanagar",            "latitude": 12.9279, "longitude": 77.5828},
  "560058": {"label": "Peenya Industrial",    "latitude": 13.0314, "longitude": 77.5149},
  "560064": {"label": "Rajajinagar",          "latitude": 12.9890, "longitude": 77.5150},
  "560066": {"label": "Whitefield",           "latitude": 12.9698, "longitude": 77.7500},
  "560068": {"label": "Banaswadi",            "latitude": 13.0186, "longitude": 77.6573},
  "560076": {"label": "Bannerghatta Road",    "latitude": 12.8876, "longitude": 77.5966},
  "560100": {"label": "Electronic City",      "latitude": 12.8399, "longitude": 77.6770},
  # ── Frontend seed-business PINs ──────────────────────────────────────
  "562157": {"label": "Bengaluru Rural (Hoskote)", "latitude": 13.0709, "longitude": 77.7988},
  "563101": {"label": "Kolar",                "latitude": 13.1366, "longitude": 78.1291},
  "570016": {"label": "Mysuru",               "latitude": 12.2947, "longitude": 76.6193},
  "572101": {"label": "Tumakuru",             "latitude": 13.3379, "longitude": 77.1013},
}

EXPECTED_DEPARTMENTS = {"Factories", "Labour", "Shops & Establishments", "KSPCB", "BESCOM"}


def _normalized_lookup(normalized_records: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
  return {record["source_record_id"]: record for record in normalized_records}


def _status_key(status: str | None) -> str:
  value = str(status or "").lower()
  if value == "active":
    return "active_count"
  if value == "dormant":
    return "dormant_count"
  if value == "closed":
    return "closed_count"
  return "pending_review_count"


def _empty_row(pin_code: str) -> dict[str, Any]:
  meta = PIN_METADATA[pin_code]
  return {
    "pin_code": pin_code,
    "label": meta["label"],
    "latitude": meta["latitude"],
    "longitude": meta["longitude"],
    "active_count": 0,
    "dormant_count": 0,
    "closed_count": 0,
    "pending_review_count": 0,
    "high_risk_count": 0,
    "department_coverage_gaps": [],
  }


def build_pincode_summary(
  ubid_registry: list[dict[str, Any]],
  normalized_records: list[dict[str, Any]],
  match_candidates: list[dict[str, Any]],
  activity_events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
  normalized_by_source = _normalized_lookup(normalized_records)
  rows = {pin_code: _empty_row(pin_code) for pin_code in PIN_METADATA}
  departments_by_pin: dict[str, set[str]] = defaultdict(set)

  for ubid in ubid_registry:
    linked = ubid.get("linked_records", [])
    linked_normalized = [normalized_by_source[source_id] for source_id in linked if source_id in normalized_by_source]
    pin_codes = {
      record.get("normalized", {}).get("pin_code")
      for record in linked_normalized
      if record.get("normalized", {}).get("pin_code") in rows
    }
    departments = {record.get("department") for record in linked_normalized if record.get("department")}

    for pin_code in pin_codes:
      rows[pin_code][_status_key(ubid.get("current_status"))] += 1
      if str(ubid.get("review_status", "")).startswith("pending"):
        rows[pin_code]["pending_review_count"] += 1
      departments_by_pin[pin_code].update(departments)

  for candidate in match_candidates:
    if candidate.get("decision_zone") not in {"review", "human_review"} and candidate.get("status") != "pending_review":
      continue
    for source_id in [candidate.get("record_a"), candidate.get("record_b")]:
      record = normalized_by_source.get(source_id)
      pin_code = record.get("normalized", {}).get("pin_code") if record else None
      if pin_code in rows:
        rows[pin_code]["pending_review_count"] += 1

  for result in active_factories_no_inspection(ubid_registry, normalized_records, activity_events):
    pin_code = result["pin_code"]
    if pin_code in rows:
      rows[pin_code]["high_risk_count"] += 1

  for pin_code, row in rows.items():
    gaps = sorted(EXPECTED_DEPARTMENTS - departments_by_pin.get(pin_code, set()))
    row["department_coverage_gaps"] = gaps

  return sorted(rows.values(), key=lambda row: row["pin_code"])
