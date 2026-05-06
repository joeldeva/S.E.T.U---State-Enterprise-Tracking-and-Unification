from __future__ import annotations

import re
from collections import Counter
from difflib import SequenceMatcher
from typing import Any

from .identifier_validation import mask_gstin, mask_pan
from .mock_database import load_activity_events, load_department_records, mask_activity_event, mask_department_record


RECORD_COLUMNS = [
  {"key": "record_id", "label": "Record ID"},
  {"key": "company_group_id", "label": "Group"},
  {"key": "department", "label": "Department"},
  {"key": "department_record_id", "label": "Department Record"},
  {"key": "business_name", "label": "Business"},
  {"key": "business_type", "label": "Type"},
  {"key": "pan_masked", "label": "PAN"},
  {"key": "gstin_masked", "label": "GSTIN"},
  {"key": "address", "label": "Address"},
  {"key": "city", "label": "City"},
  {"key": "district", "label": "District"},
  {"key": "pin_code", "label": "PIN"},
  {"key": "business_sector", "label": "Sector"},
  {"key": "status_in_department", "label": "Department Status"},
  {"key": "active_flag", "label": "Active Flag"},
  {"key": "date_of_commencement", "label": "Commencement"},
  {"key": "registration_date", "label": "Registration"},
  {"key": "renewal_date", "label": "Renewal"},
  {"key": "last_inspection_date", "label": "Last Inspection"},
  {"key": "factory_license_no", "label": "Factory Licence"},
  {"key": "shop_license_no", "label": "Shop Licence"},
  {"key": "labour_registration_no", "label": "Labour Reg."},
  {"key": "kspcb_consent_no", "label": "KSPCB Consent"},
  {"key": "bescom_consumer_no", "label": "BESCOM No."},
  {"key": "bwssb_consumer_no", "label": "BWSSB No."},
  {"key": "trade_license_no", "label": "Trade Licence"},
]

EVENT_COLUMNS = [
  {"key": "event_id", "label": "Event ID"},
  {"key": "company_group_id", "label": "Group"},
  {"key": "department", "label": "Department"},
  {"key": "department_record_id", "label": "Department Record"},
  {"key": "pan_masked", "label": "PAN"},
  {"key": "gstin_masked", "label": "GSTIN"},
  {"key": "event_type", "label": "Event Type"},
  {"key": "event_date", "label": "Event Date"},
  {"key": "event_status", "label": "Event Status"},
  {"key": "remarks", "label": "Remarks"},
]

DEPARTMENT_ALIASES = {
  "shops": "Shops and Establishments",
  "shop": "Shops and Establishments",
  "establishment": "Shops and Establishments",
  "establishments": "Shops and Establishments",
  "factory": "Factories",
  "factories": "Factories",
  "labour": "Labour",
  "labor": "Labour",
  "kspcb": "KSPCB",
  "pollution": "KSPCB",
  "bescom": "BESCOM",
  "electricity": "BESCOM",
  "bwssb": "BWSSB",
  "water": "BWSSB",
  "trade": "Local Body / Trade Licence",
  "local body": "Local Body / Trade Licence",
  "local-body": "Local Body / Trade Licence",
  "licence": "Local Body / Trade Licence",
}

STATUS_ALIASES = {
  "active": "Active",
  "live": "Active",
  "running": "Active",
  "dormant": "Dormant",
  "dor": "Dormant",
  "inactive": "Closed",
  "closed": "Closed",
  "cancelled": "Closed",
  "canceled": "Closed",
}

STOP_WORDS = {
  "a",
  "about",
  "all",
  "also",
  "and",
  "are",
  "activity",
  "business",
  "businesses",
  "code",
  "companies",
  "company",
  "data",
  "datas",
  "detail",
  "details",
  "event",
  "events",
  "for",
  "from",
  "give",
  "here",
  "in",
  "list",
  "me",
  "now",
  "of",
  "only",
  "pin",
  "pincode",
  "please",
  "record",
  "records",
  "recent",
  "row",
  "rows",
  "same",
  "show",
  "that",
  "the",
  "their",
  "these",
  "this",
  "those",
  "to",
  "what",
  "which",
  "with",
}

FOLLOW_UP_TERMS = {
  "also",
  "filter",
  "here",
  "now",
  "only",
  "same",
  "that",
  "their",
  "these",
  "this",
  "those",
  "within",
}


def _clean_identifier(value: str | None) -> str:
  return "".join(char for char in (value or "").upper() if char.isalnum())


def _normalize(value: str | None) -> str:
  return " ".join((value or "").lower().replace(",", " ").replace(".", " ").replace("/", " ").replace("_", " ").split())


def _tokens(value: str | None) -> list[str]:
  return [token for token in re.findall(r"[a-z0-9]+", _normalize(value)) if len(token) > 2]


def _contains_alias(message: str, alias: str) -> bool:
  normalized_message = _normalize(message)
  return bool(re.search(rf"(^|\s){re.escape(alias)}($|\s)", normalized_message))


def _extract_departments(message: str) -> list[str]:
  departments: list[str] = []
  for alias, department in DEPARTMENT_ALIASES.items():
    if _contains_alias(message, alias) and department not in departments:
      departments.append(department)
  return departments


def _extract_statuses(message: str) -> list[str]:
  statuses: list[str] = []
  for alias, status in STATUS_ALIASES.items():
    if _contains_alias(message, alias) and status not in statuses:
      statuses.append(status)
  return statuses


def _extract_pin_codes(message: str) -> list[str]:
  return sorted(set(re.findall(r"\b[1-9][0-9]{5}\b", message)))


def _extract_pan(message: str) -> str | None:
  match = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", message.upper())
  return match.group(0) if match else None


def _extract_gstin(message: str) -> str | None:
  match = re.search(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b", message.upper())
  return match.group(0) if match else None


def _extract_reference(message: str) -> str | None:
  pattern = r"\b(?:SHOP|SHOPS|FACT|FACTORY|FACTORIES|LABOUR|LABOR|KSPCB|BESCOM|BWSSB|TRADE)[-A-Z0-9]*\d+\b"
  match = re.search(pattern, message.upper())
  return match.group(0) if match else None


def _extract_search_terms(message: str) -> list[str]:
  tokens = [token for token in _tokens(message) if token not in STOP_WORDS and not re.fullmatch(r"\d{6}", token)]
  return tokens[:8]


def _should_reuse_context(message: str, context: dict[str, Any] | None) -> bool:
  if not context:
    return False
  normalized = set(_tokens(message))
  return bool(normalized.intersection(FOLLOW_UP_TERMS)) or _normalize(message).startswith("what about")


def _safe_list(value: Any) -> list[str]:
  if not isinstance(value, list):
    return []
  return [str(item) for item in value if item]


def _parse_filters(message: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
  pin_codes = _extract_pin_codes(message)
  departments = _extract_departments(message)
  statuses = _extract_statuses(message)
  terms = _extract_search_terms(message)
  terms = [term for term in terms if term not in DEPARTMENT_ALIASES and term not in STATUS_ALIASES and term not in {"pan", "gstin"}]
  reuse_context = _should_reuse_context(message, context)

  if reuse_context:
    pin_codes = pin_codes or _safe_list(context.get("pin_codes"))
    departments = departments or _safe_list(context.get("departments"))
    statuses = statuses or _safe_list(context.get("statuses"))
    if not terms:
      terms = _safe_list(context.get("terms"))

  return {
    "pin_codes": pin_codes,
    "departments": departments,
    "statuses": statuses,
    "pan": _extract_pan(message),
    "gstin": _extract_gstin(message),
    "reference": _extract_reference(message),
    "terms": [] if _extract_pan(message) or _extract_gstin(message) or _extract_reference(message) else terms,
    "context_reused": reuse_context,
  }


def _record_matches_identifier(row: dict[str, str], filters: dict[str, Any]) -> bool:
  if filters.get("pan") and _clean_identifier(row.get("pan")) == _clean_identifier(filters["pan"]):
    return True
  if filters.get("gstin") and _clean_identifier(row.get("gstin")) == _clean_identifier(filters["gstin"]):
    return True
  if filters.get("reference"):
    cleaned_reference = _clean_identifier(filters["reference"])
    reference_fields = [
      "department_record_id",
      "factory_license_no",
      "shop_license_no",
      "labour_registration_no",
      "kspcb_consent_no",
      "bescom_consumer_no",
      "bwssb_consumer_no",
      "trade_license_no",
    ]
    return any(_clean_identifier(row.get(field)) == cleaned_reference for field in reference_fields)
  return False


def _record_text(row: dict[str, str]) -> str:
  fields = [
    "record_id",
    "company_group_id",
    "department",
    "department_record_id",
    "business_name",
    "business_type",
    "address",
    "city",
    "district",
    "pin_code",
    "business_sector",
    "status_in_department",
    "factory_license_no",
    "shop_license_no",
    "labour_registration_no",
    "kspcb_consent_no",
    "bescom_consumer_no",
    "bwssb_consumer_no",
    "trade_license_no",
  ]
  return _normalize(" ".join(row.get(field, "") for field in fields))


def _event_text(row: dict[str, str]) -> str:
  fields = [
    "event_id",
    "company_group_id",
    "department",
    "department_record_id",
    "event_type",
    "event_date",
    "event_status",
    "remarks",
  ]
  return _normalize(" ".join(row.get(field, "") for field in fields))


def _term_score(text: str, terms: list[str]) -> int:
  if not terms:
    return 0
  score = 0
  words = set(text.split())
  for term in terms:
    if term in words:
      score += 10
    elif term in text:
      score += 6
    else:
      closest = max((SequenceMatcher(None, term, word).ratio() for word in words), default=0)
      if closest >= 0.82:
        score += 4
  return score


def _record_score(row: dict[str, str], terms: list[str]) -> int:
  score = _term_score(_record_text(row), terms)
  score += _term_score(_normalize(row.get("business_name")), terms) * 2
  score += _term_score(_normalize(row.get("address")), terms)
  return score


def _event_score(row: dict[str, str], terms: list[str]) -> int:
  score = _term_score(_event_text(row), terms)
  score += _term_score(_normalize(row.get("event_type")), terms) * 2
  return score


def _passes_record_filters(row: dict[str, str], filters: dict[str, Any]) -> bool:
  if filters["pin_codes"] and row.get("pin_code") not in filters["pin_codes"]:
    return False
  if filters["departments"] and row.get("department") not in filters["departments"]:
    return False
  if filters["statuses"] and row.get("status_in_department") not in filters["statuses"]:
    return False
  if filters.get("pan") or filters.get("gstin") or filters.get("reference"):
    return _record_matches_identifier(row, filters)
  return True


def _filter_records(message: str, context: dict[str, Any] | None = None) -> tuple[list[dict[str, str]], dict[str, Any], list[dict[str, Any]]]:
  filters = _parse_filters(message, context)
  records = [row for row in load_department_records() if _passes_record_filters(row, filters)]
  scored: list[tuple[int, dict[str, str]]] = []
  for row in records:
    score = _record_score(row, filters["terms"])
    if filters["terms"]:
      if score <= 0:
        continue
      scored.append((score, row))
    else:
      scored.append((1, row))

  scored.sort(key=lambda item: (item[0], item[1].get("business_name", "")), reverse=True)
  filtered = [row for _, row in scored]
  sources = [
    {
      "id": row.get("record_id"),
      "title": row.get("business_name"),
      "department": row.get("department"),
      "source_type": "department_record",
      "score": min(100, score * 5),
      "why": _source_reason(row, filters),
    }
    for score, row in scored[:6]
  ]
  return filtered, filters, sources


def _filter_events(
  message: str,
  context: dict[str, Any] | None,
  matching_records: list[dict[str, str]],
) -> tuple[list[dict[str, str]], dict[str, Any], list[dict[str, Any]]]:
  filters = _parse_filters(message, context)
  matching_group_ids = {row.get("company_group_id") for row in matching_records if row.get("company_group_id")}
  events = []
  for event in load_activity_events():
    if filters["pin_codes"] and event.get("company_group_id") not in matching_group_ids:
      continue
    if filters["departments"] and event.get("department") not in filters["departments"]:
      continue
    if filters["statuses"] and event.get("event_status") not in filters["statuses"]:
      continue
    if filters.get("pan") and _clean_identifier(event.get("pan")) != _clean_identifier(filters["pan"]):
      continue
    if filters.get("gstin") and _clean_identifier(event.get("gstin")) != _clean_identifier(filters["gstin"]):
      continue
    if filters.get("reference") and _clean_identifier(event.get("department_record_id")) != _clean_identifier(filters["reference"]):
      continue
    events.append(event)

  scored: list[tuple[int, dict[str, str]]] = []
  for event in events:
    score = _event_score(event, filters["terms"])
    if filters["terms"]:
      if score <= 0:
        continue
      scored.append((score, event))
    else:
      scored.append((1, event))

  scored.sort(key=lambda item: (item[0], item[1].get("event_date", "")), reverse=True)
  filtered = [event for _, event in scored]
  sources = [
    {
      "id": event.get("event_id"),
      "title": event.get("event_type"),
      "department": event.get("department"),
      "source_type": "activity_event",
      "score": min(100, score * 5),
      "why": _event_source_reason(event, filters),
    }
    for score, event in scored[:6]
  ]
  return filtered, filters, sources


def _source_reason(row: dict[str, str], filters: dict[str, Any]) -> str:
  reasons: list[str] = []
  if filters["pin_codes"]:
    reasons.append(f"PIN {row.get('pin_code')}")
  if filters["departments"]:
    reasons.append(row.get("department", "department match"))
  if filters["statuses"]:
    reasons.append(f"{row.get('status_in_department')} status")
  if filters["terms"]:
    reasons.append("text similarity")
  if filters.get("reference"):
    reasons.append("reference match")
  return ", ".join(reasons) or "retrieved from masked department record"


def _event_source_reason(event: dict[str, str], filters: dict[str, Any]) -> str:
  reasons: list[str] = []
  if filters["pin_codes"]:
    reasons.append("linked company group from PIN filter")
  if filters["departments"]:
    reasons.append(event.get("department", "department match"))
  if filters["terms"]:
    reasons.append("event text similarity")
  return ", ".join(reasons) or "retrieved from masked activity event"


def _display_record(row: dict[str, str]) -> dict[str, Any]:
  masked = mask_department_record(row)
  return {column["key"]: masked.get(column["key"]) for column in RECORD_COLUMNS}


def _display_event(row: dict[str, str]) -> dict[str, Any]:
  masked = mask_activity_event(row)
  return {column["key"]: masked.get(column["key"]) for column in EVENT_COLUMNS}


def _counter(values: list[str | None]) -> dict[str, int]:
  return dict(Counter(value for value in values if value))


def _record_summary(records: list[dict[str, str]]) -> dict[str, Any]:
  return {
    "by_department": _counter([row.get("department") for row in records]),
    "by_status": _counter([row.get("status_in_department") for row in records]),
    "by_pin_code": _counter([row.get("pin_code") for row in records]),
    "unique_business_groups": len({row.get("company_group_id") for row in records if row.get("company_group_id")}),
  }


def _event_summary(events: list[dict[str, str]]) -> dict[str, Any]:
  return {
    "by_department": _counter([row.get("department") for row in events]),
    "by_event_type": _counter([row.get("event_type") for row in events]),
    "by_event_status": _counter([row.get("event_status") for row in events]),
    "linked_business_groups": len({row.get("company_group_id") for row in events if row.get("company_group_id")}),
  }


def _safe_context(filters: dict[str, Any], dataset: str, intent: str) -> dict[str, Any]:
  return {
    "dataset": dataset,
    "intent": intent,
    "pin_codes": filters["pin_codes"],
    "departments": filters["departments"],
    "statuses": filters["statuses"],
    "terms": filters["terms"],
  }


def _summarize_filters(filters: dict[str, Any]) -> list[str]:
  values = {
    "pin_codes": filters["pin_codes"],
    "departments": filters["departments"],
    "statuses": filters["statuses"],
    "pan": mask_pan(filters["pan"]) if filters.get("pan") else None,
    "gstin": mask_gstin(filters["gstin"]) if filters.get("gstin") else None,
    "reference": filters.get("reference"),
    "terms": filters["terms"],
    "context_reused": "yes" if filters.get("context_reused") else None,
  }
  active_filters: list[str] = []
  for key, value in values.items():
    if not value:
      continue
    if isinstance(value, list):
      active_filters.append(f"{key}: {', '.join(value)}")
    else:
      active_filters.append(f"{key}: {value}")
  return active_filters


def _is_event_query(message: str) -> bool:
  normalized = _normalize(message)
  return any(term in normalized for term in ["activity", "event", "events", "filing", "inspection", "renewal", "usage"])


def _is_schema_query(message: str) -> bool:
  normalized = _normalize(message)
  return any(term in normalized for term in ["columns", "fields", "headers", "schema"])


def _is_count_query(message: str) -> bool:
  normalized = _normalize(message)
  return any(term in normalized for term in ["count", "how many", "summary", "summarize", "total"])


def _is_help_query(message: str) -> bool:
  normalized = _normalize(message)
  return normalized in {"help", "what can you do"} or "what can you do" in normalized


def _has_all_modifier(message: str) -> bool:
  return any(term in _normalize(message).split() for term in ["all", "every", "full"])


def _answer_prefix(filters: dict[str, Any]) -> str:
  if filters.get("context_reused"):
    return "Using the previous chat context, "
  return ""


def answer_data_question(message: str, limit: int = 120, context: dict[str, Any] | None = None) -> dict[str, Any]:
  safe_limit = max(1, min(limit, 500))
  if _has_all_modifier(message):
    safe_limit = 500

  if _is_help_query(message):
    return {
      "answer": "Ask for PINs, departments, statuses, business names, licence numbers, consumer numbers, activity events, counts, or available columns. Follow-ups like 'now only BESCOM' reuse the previous context.",
      "intent": "assistant_help",
      "dataset": "department_records",
      "filters": [],
      "total_matches": len(load_department_records()),
      "returned_count": 0,
      "columns": RECORD_COLUMNS,
      "rows": [],
      "summary": {"available_column_count": len(RECORD_COLUMNS)},
      "sources": [],
      "context": {"dataset": "department_records", "intent": "assistant_help", "pin_codes": [], "departments": [], "statuses": [], "terms": []},
      "retrieval_mode": "local_rag_retrieval",
      "suggestions": ["Show all companies in PIN 560058", "Now only BESCOM", "Show activity events for the same PIN"],
      "privacy_note": "PAN/GSTIN are masked or hashed. Raw identifiers are not exposed and no hosted LLM is used.",
    }

  matching_records, record_filters, record_sources = _filter_records(message, context)

  if _is_schema_query(message):
    return {
      "answer": "These are the privacy-safe columns the assistant can retrieve. Raw PAN/GSTIN columns are not returned; only masked values are exposed.",
      "intent": "schema_lookup",
      "dataset": "department_records",
      "filters": [],
      "total_matches": len(load_department_records()),
      "returned_count": 0,
      "columns": RECORD_COLUMNS,
      "rows": [],
      "summary": {"available_column_count": len(RECORD_COLUMNS)},
      "sources": [],
      "context": _safe_context(record_filters, "department_records", "schema_lookup"),
      "retrieval_mode": "local_rag_retrieval",
      "suggestions": ["Show all companies in PIN 560058", "List BESCOM records in PIN 560058", "Show renewal events in PIN 560058"],
      "privacy_note": "PAN/GSTIN are masked or hashed. Raw identifiers are not exposed and no hosted LLM is used.",
    }

  if _is_event_query(message):
    matching_events, event_filters, event_sources = _filter_events(message, context, matching_records)
    rows = [_display_event(row) for row in matching_events[:safe_limit]]
    result_word = "event" if len(matching_events) == 1 else "events"
    answer = f"{_answer_prefix(event_filters)}I retrieved {len(matching_events)} masked activity {result_word} from backend CSV data and grounded the answer in event rows."
    return {
      "answer": answer,
      "intent": "activity_event_lookup",
      "dataset": "activity_events",
      "filters": _summarize_filters(event_filters),
      "total_matches": len(matching_events),
      "returned_count": len(rows),
      "columns": EVENT_COLUMNS,
      "rows": rows,
      "summary": _event_summary(matching_events),
      "sources": event_sources,
      "context": _safe_context(event_filters, "activity_events", "activity_event_lookup"),
      "retrieval_mode": "local_rag_retrieval",
      "suggestions": ["Show department records for the same PIN", "Now only inspections", "Now only BESCOM"],
      "privacy_note": "PAN/GSTIN are masked or hashed. Raw identifiers are not exposed and no hosted LLM is used.",
    }

  rows = [_display_record(row) for row in matching_records[:safe_limit]]
  business_word = "record" if len(matching_records) == 1 else "records"
  if _is_count_query(message):
    answer = f"{_answer_prefix(record_filters)}I found {len(matching_records)} matching department {business_word}. The cards show the department, status, and PIN split."
  elif matching_records:
    answer = f"{_answer_prefix(record_filters)}I retrieved {len(matching_records)} masked department {business_word} from backend CSV data and grounded the answer in source rows."
  else:
    answer = "I could not retrieve matching rows. Try a PIN code, department, business name, status, licence number, or consumer number."

  return {
    "answer": answer,
    "intent": "department_record_lookup",
    "dataset": "department_records",
    "filters": _summarize_filters(record_filters),
    "total_matches": len(matching_records),
    "returned_count": len(rows),
    "columns": RECORD_COLUMNS,
    "rows": rows,
    "summary": _record_summary(matching_records),
    "sources": record_sources,
    "context": _safe_context(record_filters, "department_records", "department_record_lookup"),
    "retrieval_mode": "local_rag_retrieval",
    "suggestions": ["Now only BESCOM", "Now only Active", "Show activity events for the same PIN", "Which columns are available?"],
    "privacy_note": "PAN/GSTIN are masked or hashed. Raw identifiers are not exposed and no hosted LLM is used.",
  }
