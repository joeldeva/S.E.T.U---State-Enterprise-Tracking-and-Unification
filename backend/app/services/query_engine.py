from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

PREBUILT_QUERIES: list[dict[str, Any]] = [
  {
    "id": "active-factories-no-inspection",
    "title": "Active factories in PIN code 560058 with no inspection in 18 months",
    "description": "Find active factory-linked UBIDs in a priority industrial PIN where inspection evidence is stale or missing.",
    "risk_focus": "Inspection prioritization",
  },
  {
    "id": "dormant-valid-pollution-consent",
    "title": "Dormant businesses with valid pollution consent",
    "description": "Identify businesses that look dormant but still carry active environmental consent.",
    "risk_focus": "Consent cleanup",
  },
  {
    "id": "utility-usage-expired-license",
    "title": "Businesses with utility usage but expired license",
    "description": "Spot live operations that may be running after registration or license expiry.",
    "risk_focus": "Compliance anomaly",
  },
  {
    "id": "active-in-one-missing-another",
    "title": "Businesses active in one department but missing from another",
    "description": "Find coverage gaps where one department sees activity and another has no linked record.",
    "risk_focus": "Department coverage gap",
  },
  {
    "id": "high-confidence-duplicate-clusters",
    "title": "High-confidence duplicate clusters",
    "description": "Review strong duplicate clusters before or after automatic UBID creation.",
    "risk_focus": "Identity quality",
  },
  {
    "id": "unmatched-activity-events",
    "title": "Unmatched activity events",
    "description": "Surface utility or compliance events that could not be joined to a UBID.",
    "risk_focus": "Unregistered activity",
  },
]


def _parse_date(value: Any) -> date | None:
  if isinstance(value, datetime):
    return value.date()
  if isinstance(value, date):
    return value
  if not value:
    return None
  try:
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
  except ValueError:
    try:
      return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
      return None


def _months_between(current_date: date, older_date: date | None) -> int | None:
  if older_date is None:
    return None
  return max(0, (current_date.year - older_date.year) * 12 + current_date.month - older_date.month)


def _normalized_by_source(normalized_records: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
  return {record["source_record_id"]: record for record in normalized_records}


def _events_by_ubid(activity_events: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
  grouped: dict[str, list[dict[str, Any]]] = {}
  for event in activity_events:
    ubid = event.get("ubid")
    if not ubid:
      continue
    grouped.setdefault(str(ubid), []).append(event)
  return grouped


def _inspection_dates(events: list[dict[str, Any]]) -> list[date]:
  dates = []
  for event in events:
    event_type = str(event.get("event_type", "")).lower()
    if event_type not in {"inspection", "inspection_completed"}:
      continue
    event_date = _parse_date(event.get("event_date"))
    if event_date:
      dates.append(event_date)
  return sorted(dates, reverse=True)


def _risk_level(months_since_inspection: int | None) -> str:
  if months_since_inspection is None:
    return "High"
  if months_since_inspection >= 24:
    return "High"
  if months_since_inspection >= 18:
    return "Medium"
  return "Low"


def active_factories_no_inspection(
  ubid_registry: list[dict[str, Any]],
  normalized_records: list[dict[str, Any]],
  activity_events: list[dict[str, Any]],
  pin_code: str = "560058",
  stale_months: int = 18,
  current_date: date | None = None,
) -> list[dict[str, Any]]:
  current_date = current_date or datetime.now(timezone.utc).date()
  normalized_lookup = _normalized_by_source(normalized_records)
  event_lookup = _events_by_ubid(activity_events)
  results = []

  for ubid in ubid_registry:
    if str(ubid.get("current_status", "")).lower() != "active":
      continue

    linked_records = ubid.get("linked_records", [])
    linked_normalized = [normalized_lookup[source_id] for source_id in linked_records if source_id in normalized_lookup]
    factory_records = [record for record in linked_normalized if record.get("department") == "Factories"]
    if not factory_records:
      continue

    pin_codes = {
      record.get("normalized", {}).get("pin_code")
      for record in linked_normalized
      if record.get("normalized", {}).get("pin_code")
    }
    if pin_code not in pin_codes:
      continue

    events = event_lookup.get(str(ubid["_id"]), [])
    inspection_dates = _inspection_dates(events)
    last_inspection = inspection_dates[0] if inspection_dates else None
    months_since_inspection = _months_between(current_date, last_inspection)
    if months_since_inspection is not None and months_since_inspection < stale_months:
      continue

    departments_linked = sorted({record.get("department") for record in linked_normalized if record.get("department")})
    evidence = [
      f"Current status is {ubid.get('current_status')}.",
      f"Linked to Factories via {', '.join(record['source_record_id'] for record in factory_records)}.",
      f"PIN {pin_code} found in normalized department records.",
    ]
    if last_inspection:
      evidence.append(f"Last inspection was {months_since_inspection} months ago.")
    else:
      evidence.append("No inspection event found for this UBID.")

    results.append(
      {
        "ubid": ubid["_id"],
        "canonical_name": ubid.get("canonical_name", "Synthetic Business"),
        "pin_code": pin_code,
        "departments_linked": departments_linked,
        "current_status": ubid.get("current_status"),
        "last_inspection_date": last_inspection.isoformat() if last_inspection else None,
        "months_since_inspection": months_since_inspection,
        "risk_level": _risk_level(months_since_inspection),
        "evidence": evidence,
      },
    )

  risk_order = {"High": 0, "Medium": 1, "Low": 2}
  return sorted(results, key=lambda row: (risk_order[row["risk_level"]], row["canonical_name"]))
