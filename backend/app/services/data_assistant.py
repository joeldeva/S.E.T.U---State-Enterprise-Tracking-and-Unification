from __future__ import annotations

import re
from collections import Counter
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
  "establishments": "Shops and Establishments",
  "factory": "Factories",
  "factories": "Factories",
  "labour": "Labour",
  "labor": "Labour",
  "kspcb": "KSPCB",
  "pollution": "KSPCB",
  "bescom": "BESCOM",
  "bwssb": "BWSSB",
  "water": "BWSSB",
  "trade": "Local Body / Trade Licence",
  "local body": "Local Body / Trade Licence",
  "local-body": "Local Body / Trade Licence",
}

STATUS_ALIASES = {
  "active": "Active",
  "dormant": "Dormant",
  "dor": "Dormant",
  "inactive": "Closed",
  "closed": "Closed",
  "cancelled": "Closed",
  "canceled": "Closed",
}

STOP_WORDS = {
  "a",
  "all",
  "and",
  "are",
  "business",
  "businesses",
  "company",
  "companies",
  "code",
  "data",
  "datas",
  "details",
  "for",
  "from",
  "give",
  "in",
  "list",
  "me",
  "of",
  "pincode",
  "pin",
  "please",
  "record",
  "records",
  "row",
  "rows",
  "show",
  "the",
  "to",
  "with",
}


def _clean_identifier(value: str | None) -> str:
  return "".join(char for char in (value or "").upper() if char.isalnum())


def _normalize(value: str | None) -> str:
  return " ".join((value or "").lower().replace(",", " ").replace(".", " ").split())


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
  match = re.search(r"\b(?:SHOP|FACT|FACTORY|FACTORIES|LABOUR|LABOR|KSPCB|BESCOM|BWSSB|TRADE)[-A-Z0-9]*\d+\b", message.upper())
  return match.group(0) if match else None


def _extract_search_terms(message: str) -> list[str]:
  normalized = _normalize(message)
  tokens = [token for token in re.findall(r"[a-z0-9]+", normalized) if len(token) > 2]
  tokens = [token for token in tokens if token not in STOP_WORDS and not re.fullmatch(r"\d{6}", token)]
  return tokens[:6]


def _record_matches_identifier(row: dict[str, str], pan: str | None, gstin: str | None, reference: str | None) -> bool:
  if pan and _clean_identifier(row.get("pan")) == _clean_identifier(pan):
    return True
  if gstin and _clean_identifier(row.get("gstin")) == _clean_identifier(gstin):
    return True
  if reference:
    cleaned_reference = _clean_identifier(reference)
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


def _build_record_search_text(row: dict[str, str]) -> str:
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


def _filter_records(message: str) -> tuple[list[dict[str, str]], dict[str, Any]]:
  pin_codes = _extract_pin_codes(message)
  departments = _extract_departments(message)
  statuses = _extract_statuses(message)
  pan = _extract_pan(message)
  gstin = _extract_gstin(message)
  reference = _extract_reference(message)
  search_terms = _extract_search_terms(message)
  has_structured_filters = bool(pin_codes or departments or statuses)

  records = load_department_records()
  filtered = []
  for row in records:
    if pin_codes and row.get("pin_code") not in pin_codes:
      continue
    if departments and row.get("department") not in departments:
      continue
    if statuses and row.get("status_in_department") not in statuses:
      continue
    if pan or gstin or reference:
      if not _record_matches_identifier(row, pan, gstin, reference):
        continue
    elif search_terms and not has_structured_filters:
      row_text = _build_record_search_text(row)
      if not all(term in row_text for term in search_terms):
        continue
    filtered.append(row)

  filters = {
    "pin_codes": pin_codes,
    "departments": departments,
    "statuses": statuses,
    "pan": mask_pan(pan) if pan else None,
    "gstin": mask_gstin(gstin) if gstin else None,
    "reference": reference,
    "terms": search_terms if not (pin_codes or departments or statuses or pan or gstin or reference) else [],
  }
  return filtered, filters


def _filter_events(message: str, matching_records: list[dict[str, str]]) -> tuple[list[dict[str, str]], dict[str, Any]]:
  pin_codes = _extract_pin_codes(message)
  departments = _extract_departments(message)
  statuses = _extract_statuses(message)
  pan = _extract_pan(message)
  gstin = _extract_gstin(message)
  reference = _extract_reference(message)

  matching_group_ids = {row.get("company_group_id") for row in matching_records if row.get("company_group_id")}
  events = load_activity_events()
  filtered = []
  for event in events:
    if pin_codes and event.get("company_group_id") not in matching_group_ids:
      continue
    if departments and event.get("department") not in departments:
      continue
    if statuses and event.get("event_status") not in statuses:
      continue
    if pan and _clean_identifier(event.get("pan")) != _clean_identifier(pan):
      continue
    if gstin and _clean_identifier(event.get("gstin")) != _clean_identifier(gstin):
      continue
    if reference and _clean_identifier(event.get("department_record_id")) != _clean_identifier(reference):
      continue
    filtered.append(event)

  filters = {
    "pin_codes": pin_codes,
    "departments": departments,
    "event_statuses": statuses,
    "pan": mask_pan(pan) if pan else None,
    "gstin": mask_gstin(gstin) if gstin else None,
    "reference": reference,
  }
  return filtered, filters


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


def _summarize_filters(filters: dict[str, Any]) -> list[str]:
  active_filters: list[str] = []
  for key, value in filters.items():
    if not value:
      continue
    if isinstance(value, list):
      active_filters.append(f"{key}: {', '.join(value)}")
    else:
      active_filters.append(f"{key}: {value}")
  return active_filters


def _is_event_query(message: str) -> bool:
  normalized = _normalize(message)
  return any(term in normalized for term in ["activity", "event", "events", "renewal", "inspection", "filing", "usage"])


def _is_schema_query(message: str) -> bool:
  normalized = _normalize(message)
  return any(term in normalized for term in ["columns", "fields", "headers", "schema"])


def _is_count_query(message: str) -> bool:
  normalized = _normalize(message)
  return any(term in normalized for term in ["count", "how many", "summary", "summarize", "total"])


def answer_data_question(message: str, limit: int = 120) -> dict[str, Any]:
  safe_limit = max(1, min(limit, 500))
  if any(term in _normalize(message) for term in ["all", "full", "every"]):
    safe_limit = 500

  matching_records, record_filters = _filter_records(message)

  if _is_schema_query(message):
    return {
      "answer": "These are the privacy-safe columns the SETU assistant can show. Raw PAN/GSTIN columns are never returned; only masked values are exposed.",
      "intent": "schema_lookup",
      "dataset": "department_records",
      "filters": [],
      "total_matches": len(load_department_records()),
      "returned_count": 0,
      "columns": RECORD_COLUMNS,
      "rows": [],
      "summary": {"available_column_count": len(RECORD_COLUMNS)},
      "suggestions": [
        "Show all companies in PIN 560058",
        "List BESCOM records in PIN 560058",
        "Show activity events for PIN 560058",
      ],
      "privacy_note": "PAN/GSTIN are masked or hashed. Raw identifiers are not exposed and no hosted LLM is used.",
    }

  if _is_event_query(message):
    matching_events, event_filters = _filter_events(message, matching_records)
    rows = [_display_event(row) for row in matching_events[:safe_limit]]
    filters = _summarize_filters(event_filters)
    result_word = "event" if len(matching_events) == 1 else "events"
    return {
      "answer": f"I found {len(matching_events)} masked activity {result_word} from the backend synthetic CSV data.",
      "intent": "activity_event_lookup",
      "dataset": "activity_events",
      "filters": filters,
      "total_matches": len(matching_events),
      "returned_count": len(rows),
      "columns": EVENT_COLUMNS,
      "rows": rows,
      "summary": _event_summary(matching_events),
      "suggestions": [
        "Show department records for the same PIN",
        "Show recent inspection events",
        "Show renewal events in PIN 560058",
      ],
      "privacy_note": "PAN/GSTIN are masked or hashed. Raw identifiers are not exposed and no hosted LLM is used.",
    }

  rows = [_display_record(row) for row in matching_records[:safe_limit]]
  filters = _summarize_filters(record_filters)
  business_word = "record" if len(matching_records) == 1 else "records"
  if _is_count_query(message):
    answer = f"I found {len(matching_records)} matching department {business_word}. The summary cards show the department, status, and PIN split."
  elif matching_records:
    answer = f"I found {len(matching_records)} masked department {business_word} from the backend synthetic CSV data."
  else:
    answer = "I could not find matching department records for that question. Try a PIN code, department, business name, status, or licence/consumer number."

  return {
    "answer": answer,
    "intent": "department_record_lookup",
    "dataset": "department_records",
    "filters": filters,
    "total_matches": len(matching_records),
    "returned_count": len(rows),
    "columns": RECORD_COLUMNS,
    "rows": rows,
    "summary": _record_summary(matching_records),
    "suggestions": [
      "Show all companies in PIN 560058",
      "List active factories",
      "Show closed businesses",
      "Which columns are available?",
    ],
    "privacy_note": "PAN/GSTIN are masked or hashed. Raw identifiers are not exposed and no hosted LLM is used.",
  }
