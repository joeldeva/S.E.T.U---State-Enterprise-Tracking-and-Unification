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


def _query_title(query_id: str) -> str:
  for query in PREBUILT_QUERIES:
    if query["id"] == query_id:
      return str(query["title"])
  return "Business intelligence query"


def _records_for_ubid(
  ubid: dict[str, Any],
  normalized_lookup: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
  record_ids = [*ubid.get("linked_records", []), *ubid.get("candidate_records", [])]
  return [normalized_lookup[record_id] for record_id in record_ids if record_id in normalized_lookup]


def _pin_for_records(records: list[dict[str, Any]]) -> str:
  for record in records:
    pin_code = record.get("normalized", {}).get("pin_code")
    if pin_code:
      return str(pin_code)
  return "Not available"


def _departments_for_records(records: list[dict[str, Any]]) -> list[str]:
  return sorted({str(record.get("department")) for record in records if record.get("department")})


def _query_row(
  ubid: str,
  canonical_name: str,
  pin_code: str,
  departments_linked: list[str],
  current_status: str,
  finding: str,
  risk_level: str,
  evidence: list[str],
) -> dict[str, Any]:
  return {
    "ubid": ubid,
    "canonical_name": canonical_name,
    "pin_code": pin_code,
    "departments_linked": departments_linked,
    "current_status": current_status,
    "last_inspection_date": finding,
    "months_since_inspection": None,
    "risk_level": risk_level,
    "evidence": evidence,
  }


def dormant_valid_pollution_consent(
  ubid_registry: list[dict[str, Any]],
  normalized_records: list[dict[str, Any]],
  activity_events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
  normalized_lookup = _normalized_by_source(normalized_records)
  event_lookup = _events_by_ubid(activity_events)
  results = []

  for ubid in ubid_registry:
    if str(ubid.get("current_status", "")).lower() != "dormant":
      continue

    records = _records_for_ubid(ubid, normalized_lookup)
    has_kspcb_record = any(record.get("department") == "KSPCB" for record in records)
    kspcb_events = [
      event
      for event in event_lookup.get(str(ubid["_id"]), [])
      if str(event.get("source", "")).upper() == "KSPCB" or "consent" in str(event.get("event_type", "")).lower()
    ]
    if not has_kspcb_record and not kspcb_events:
      continue

    latest_event = max((event.get("event_date") for event in kspcb_events if event.get("event_date")), default=None)
    finding = f"KSPCB signal {latest_event}" if latest_event else "KSPCB record linked"
    evidence = [
      f"Current UBID status is {ubid.get('current_status')}.",
      "Pollution consent or KSPCB evidence exists on the business profile.",
      "Dormant businesses with active or unresolved environmental evidence should be reviewed.",
    ]
    results.append(
      _query_row(
        str(ubid["_id"]),
        str(ubid.get("canonical_name", "Synthetic Business")),
        _pin_for_records(records),
        _departments_for_records(records),
        str(ubid.get("current_status", "Dormant")),
        finding,
        "Medium",
        evidence,
      )
    )

  return sorted(results, key=lambda row: row["canonical_name"])


def utility_usage_expired_license(
  ubid_registry: list[dict[str, Any]],
  normalized_records: list[dict[str, Any]],
  activity_events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
  normalized_lookup = _normalized_by_source(normalized_records)
  event_lookup = _events_by_ubid(activity_events)
  results = []

  for ubid in ubid_registry:
    records = _records_for_ubid(ubid, normalized_lookup)
    events = event_lookup.get(str(ubid["_id"]), [])
    utility_events = [
      event
      for event in events
      if str(event.get("event_type", "")).lower() in {"utility_consumption", "electricity_usage", "water_usage", "low_utility_consumption"}
    ]
    closure_events = [
      event
      for event in events
      if str(event.get("event_type", "")).lower() in {"closure_application", "license_cancelled", "shutdown_order"}
    ]
    if not utility_events or not closure_events:
      continue

    latest_utility = max((event.get("event_date") for event in utility_events if event.get("event_date")), default=None)
    latest_closure = max((event.get("event_date") for event in closure_events if event.get("event_date")), default=None)
    evidence = [
      f"Utility activity found on {latest_utility}.",
      f"Closure or expired-licence signal found on {latest_closure}.",
      "This can indicate continued operation after licence expiry or a stale closure record.",
    ]
    results.append(
      _query_row(
        str(ubid["_id"]),
        str(ubid.get("canonical_name", "Synthetic Business")),
        _pin_for_records(records),
        _departments_for_records(records),
        str(ubid.get("current_status", "Unknown")),
        "Utility after closure signal",
        "High",
        evidence,
      )
    )

  return sorted(results, key=lambda row: row["canonical_name"])


def active_in_one_missing_another(
  ubid_registry: list[dict[str, Any]],
  normalized_records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
  normalized_lookup = _normalized_by_source(normalized_records)
  required_departments = {"Factories", "Labour", "Shops & Establishments", "KSPCB", "BESCOM"}
  results = []

  for ubid in ubid_registry:
    if str(ubid.get("current_status", "")).lower() != "active":
      continue

    records = _records_for_ubid(ubid, normalized_lookup)
    departments = set(_departments_for_records(records))
    missing = sorted(required_departments - departments)
    if not missing:
      continue

    evidence = [
      f"Linked departments: {', '.join(sorted(departments)) or 'none'}.",
      f"Missing expected departments: {', '.join(missing)}.",
      "Coverage gaps help officers find departments that have no record for a known active UBID.",
    ]
    results.append(
      _query_row(
        str(ubid["_id"]),
        str(ubid.get("canonical_name", "Synthetic Business")),
        _pin_for_records(records),
        sorted(departments),
        str(ubid.get("current_status", "Active")),
        f"Missing {len(missing)} department link{'s' if len(missing) != 1 else ''}",
        "Medium" if len(missing) <= 2 else "High",
        evidence,
      )
    )

  risk_order = {"High": 0, "Medium": 1, "Low": 2}
  return sorted(results, key=lambda row: (risk_order[row["risk_level"]], row["canonical_name"]))


def high_confidence_duplicate_clusters(
  ubid_registry: list[dict[str, Any]],
  normalized_records: list[dict[str, Any]],
  match_candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
  normalized_lookup = _normalized_by_source(normalized_records)
  ubid_by_record = {
    source_id: ubid
    for ubid in ubid_registry
    for source_id in [*ubid.get("linked_records", []), *ubid.get("candidate_records", [])]
  }
  results = []

  for candidate in match_candidates:
    confidence = int(candidate.get("confidence", 0))
    if confidence < 80:
      continue

    left = normalized_lookup.get(candidate.get("record_a"))
    right = normalized_lookup.get(candidate.get("record_b"))
    owner = ubid_by_record.get(candidate.get("record_a")) or ubid_by_record.get(candidate.get("record_b"))
    if not left or not right:
      continue

    name = owner.get("canonical_name") if owner else left.get("normalized", {}).get("business_name", "Duplicate cluster")
    ubid_value = owner.get("_id") if owner else candidate.get("_id")
    departments = sorted({str(left.get("department")), str(right.get("department"))})
    evidence = [
      str(candidate.get("explanation", "High-confidence duplicate candidate.")),
      f"Compared records: {candidate.get('record_a')} and {candidate.get('record_b')}.",
      f"Confidence score is {confidence}%.",
    ]
    results.append(
      _query_row(
        str(ubid_value),
        str(name).title(),
        _pin_for_records([left, right]),
        departments,
        str(candidate.get("status", "candidate")),
        f"{confidence}% duplicate confidence",
        "High" if confidence >= 90 else "Medium",
        evidence,
      )
    )

  risk_order = {"High": 0, "Medium": 1, "Low": 2}
  return sorted(results, key=lambda row: (risk_order[row["risk_level"]], row["canonical_name"]))


def unmatched_activity_events(activity_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
  results = []

  for event in activity_events:
    joined_confidence = event.get("joined_confidence")
    try:
      confidence = int(joined_confidence) if joined_confidence is not None else 0
    except (TypeError, ValueError):
      confidence = 0

    if event.get("ubid") and confidence >= 75:
      continue

    possible_matches = event.get("possible_matches") or []
    possible_match = possible_matches[0] if possible_matches else {}
    ubid = possible_match.get("ubid") or event.get("ubid") or f"UNMATCHED-{event.get('_id')}"
    canonical_name = event.get("business_name") or possible_match.get("canonical_name") or "Unmatched activity event"
    evidence = [
      event.get("reason") or "No strong identifier match / low confidence join.",
      f"Source department: {event.get('source') or event.get('department')}.",
      f"Joined confidence: {confidence}%.",
    ]
    if possible_match:
      evidence.append(f"Possible UBID match: {possible_match.get('ubid')} at {possible_match.get('confidence')}%.")

    results.append(
      _query_row(
        str(ubid),
        str(canonical_name),
        "Not available",
        [str(event.get("source") or event.get("department") or "Source")],
        str(event.get("review_status", "pending_review")),
        str(event.get("event_type", "activity_event")),
        "High" if confidence < 50 else "Medium",
        evidence,
      )
    )

  risk_order = {"High": 0, "Medium": 1, "Low": 2}
  return sorted(results, key=lambda row: (risk_order[row["risk_level"]], row["canonical_name"]))


def run_prebuilt_query(
  query_id: str,
  ubid_registry: list[dict[str, Any]],
  normalized_records: list[dict[str, Any]],
  activity_events: list[dict[str, Any]],
  match_candidates: list[dict[str, Any]],
) -> dict[str, Any]:
  if query_id == "active-factories-no-inspection":
    results = active_factories_no_inspection(ubid_registry, normalized_records, activity_events)
  elif query_id == "dormant-valid-pollution-consent":
    results = dormant_valid_pollution_consent(ubid_registry, normalized_records, activity_events)
  elif query_id == "utility-usage-expired-license":
    results = utility_usage_expired_license(ubid_registry, normalized_records, activity_events)
  elif query_id == "active-in-one-missing-another":
    results = active_in_one_missing_another(ubid_registry, normalized_records)
  elif query_id == "high-confidence-duplicate-clusters":
    results = high_confidence_duplicate_clusters(ubid_registry, normalized_records, match_candidates)
  elif query_id == "unmatched-activity-events":
    results = unmatched_activity_events(activity_events)
  else:
    raise ValueError(f"Unknown prebuilt query: {query_id}")

  return {
    "query_id": query_id,
    "title": _query_title(query_id),
    "result_count": len(results),
    "results": results,
  }
