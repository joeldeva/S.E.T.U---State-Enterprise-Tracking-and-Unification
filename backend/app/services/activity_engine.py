from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timezone
import hashlib
from typing import Any

CLOSURE_EVENTS = {"closure_application", "license_cancelled", "shutdown_order"}
RENEWAL_EVENTS = {"renewal", "license_renewal", "consent_renewed", "consent_renewal", "license_valid"}
COMPLIANCE_EVENTS = {"compliance_filing"}
INSPECTION_EVENTS = {"inspection", "inspection_completed"}
UTILITY_EVENTS = {"electricity_usage", "water_usage", "utility_consumption", "low_utility_consumption"}

TWELVE_MONTH_DAYS = 365
EIGHTEEN_MONTH_DAYS = 548
SIX_MONTH_DAYS = 183


def _today() -> date:
  return datetime.now(timezone.utc).date()


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


def _days_between(current_date: date, event_date: date | None) -> int | None:
  if event_date is None:
    return None
  return (current_date - event_date).days


def _audit_id(ubid: str, status: str, timestamp: str) -> str:
  digest = hashlib.sha1(f"activity:{ubid}:{status}:{timestamp}".encode("utf-8")).hexdigest()[:10]
  return f"audit_activity_{digest}"


def _status_confidence(status: str, score: int, closure_event: bool, event_count: int) -> int:
  if closure_event:
    return 100
  if status == "Active":
    return min(95, max(70, score))
  if status == "Dormant":
    return min(80, max(45, 75 - abs(score - 25)))
  if event_count == 0:
    return 35
  return min(55, max(30, 45 + score))


def score_activity_for_ubid(
  ubid: str,
  events: list[dict[str, Any]],
  unmatched_event_count: int = 0,
  current_date: date | None = None,
) -> dict[str, Any]:
  current_date = current_date or _today()
  score = 0
  closure_event = None
  strong_event_dates: list[date] = []
  scoring_breakdown: list[dict[str, Any]] = []
  evidence_timeline: list[dict[str, Any]] = []

  sorted_events = sorted(events, key=lambda event: str(event.get("event_date", "")), reverse=True)

  for event in sorted_events:
    event_type = str(event.get("event_type", "")).lower()
    event_date = _parse_date(event.get("event_date"))
    age_days = _days_between(current_date, event_date)
    event_points = 0
    rule = "not_scored"
    reason = "Event does not match an active scoring rule."

    if event_type in CLOSURE_EVENTS:
      closure_event = event
      rule = "closure_override"
      reason = "Closure event forces Closed status."
    elif age_days is not None and event_type in RENEWAL_EVENTS and 0 <= age_days <= TWELVE_MONTH_DAYS:
      event_points = 30
      rule = "renewal_in_last_12_months"
      reason = "Renewal signal in the last 12 months."
      strong_event_dates.append(event_date)
    elif age_days is not None and event_type in COMPLIANCE_EVENTS and 0 <= age_days <= TWELVE_MONTH_DAYS:
      event_points = 25
      rule = "compliance_filing_in_last_12_months"
      reason = "Compliance filing in the last 12 months."
      strong_event_dates.append(event_date)
    elif age_days is not None and event_type in INSPECTION_EVENTS and 0 <= age_days <= EIGHTEEN_MONTH_DAYS:
      event_points = 15
      rule = "inspection_in_last_18_months"
      reason = "Inspection event in the last 18 months."
      strong_event_dates.append(event_date)
    elif age_days is not None and event_type in UTILITY_EVENTS and 0 <= age_days <= SIX_MONTH_DAYS:
      event_points = 20
      rule = "utility_usage_in_last_6_months"
      reason = "Electricity or water usage signal in the last 6 months."
      strong_event_dates.append(event_date)

    score += event_points
    scoring_breakdown.append(
      {
        "event_id": event.get("_id"),
        "event_type": event_type,
        "event_date": event_date.isoformat() if event_date else None,
        "source": event.get("source"),
        "rule": rule,
        "score": event_points,
        "reason": reason,
      },
    )
    evidence_timeline.append(
      {
        "event_id": event.get("_id"),
        "event_type": event_type,
        "event_date": event_date.isoformat() if event_date else None,
        "source": event.get("source"),
        "score": event_points,
        "reason": reason,
      },
    )

  last_activity_date = max((_parse_date(event.get("event_date")) for event in events), default=None)
  last_strong_event = max(strong_event_dates, default=None)
  no_strong_event_for_18_months = (
    last_strong_event is None
    or _days_between(current_date, last_strong_event) is None
    or _days_between(current_date, last_strong_event) > EIGHTEEN_MONTH_DAYS
  )

  if not closure_event and no_strong_event_for_18_months:
    score -= 40
    scoring_breakdown.append(
      {
        "event_id": None,
        "event_type": "no_strong_event",
        "event_date": None,
        "source": "system",
        "rule": "no_strong_event_for_18_months",
        "score": -40,
        "reason": "No strong activity signal found in the last 18 months.",
      },
    )

  if closure_event:
    status = "Closed"
  elif score >= 50:
    status = "Active"
  elif score >= 10:
    status = "Dormant"
  else:
    status = "Insufficient Data"

  confidence = _status_confidence(status, score, bool(closure_event), len(events))

  return {
    "ubid": ubid,
    "status": status,
    "confidence": confidence,
    "activity_score": score,
    "evidence_timeline": evidence_timeline,
    "scoring_breakdown": scoring_breakdown,
    "last_activity_date": last_activity_date.isoformat() if last_activity_date else None,
    "unmatched_event_count": unmatched_event_count,
    "closure_event_id": closure_event.get("_id") if closure_event else None,
  }


def run_activity_classification(
  ubid_registry: list[dict[str, Any]],
  activity_events: list[dict[str, Any]],
  current_date: date | None = None,
) -> dict[str, Any]:
  events_by_ubid: dict[str, list[dict[str, Any]]] = defaultdict(list)
  unmatched_events = []

  for event in activity_events:
    ubid = event.get("ubid")
    if ubid:
      events_by_ubid[str(ubid)].append(event)
    else:
      unmatched_events.append(event)

  statuses = [
    score_activity_for_ubid(
      ubid=str(ubid_record["_id"]),
      events=events_by_ubid.get(str(ubid_record["_id"]), []),
      unmatched_event_count=0,
      current_date=current_date,
    )
    for ubid_record in ubid_registry
  ]

  counts = Counter(status["status"] for status in statuses)
  counts_by_status = {
    "Active": counts.get("Active", 0),
    "Dormant": counts.get("Dormant", 0),
    "Closed": counts.get("Closed", 0),
    "Insufficient Data": counts.get("Insufficient Data", 0),
  }

  return {
    "statuses": statuses,
    "counts": counts_by_status,
    "unmatched_events": unmatched_events,
    "unmatched_event_count": len(unmatched_events),
  }


def build_activity_audit_logs(
  before_by_ubid: dict[str, dict[str, Any]],
  statuses: list[dict[str, Any]],
) -> list[dict[str, Any]]:
  timestamp = datetime.now(timezone.utc).isoformat()
  audit_logs = []

  for status in statuses:
    ubid = status["ubid"]
    before = before_by_ubid.get(ubid, {})
    audit_logs.append(
      {
        "_id": _audit_id(ubid, status["status"], timestamp),
        "action": "activity_status_updated",
        "actor": "system",
        "target": ubid,
        "before": {
          "current_status": before.get("current_status"),
          "status_confidence": before.get("status_confidence"),
          "activity_score": before.get("activity_score"),
        },
        "after": {
          "current_status": status["status"],
          "status_confidence": status["confidence"],
          "activity_score": status["activity_score"],
          "last_activity_date": status["last_activity_date"],
        },
        "reason": "Explainable activity intelligence classification run on synthetic events.",
        "timestamp": timestamp,
        "generated_by": "activity_engine",
      },
    )

  return audit_logs
