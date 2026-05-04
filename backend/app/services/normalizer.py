from __future__ import annotations

import hashlib
import re
from typing import Any

PIN_RE = re.compile(r"\b([1-9][0-9]{5})\b")
GSTIN_RE = re.compile(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b")
PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

ABBREVIATIONS = {
  "pvt": "private",
  "private": "private",
  "ltd": "limited",
  "limited": "limited",
  "engg": "engineering",
  "estb": "establishment",
  "estd": "established",
  "mfg": "manufacturing",
  "comp": "components",
  "rd": "road",
  "st": "street",
  "no": "number",
  "indl": "industrial",
  "blr": "bengaluru",
  "bangalore": "bengaluru",
  "bengaluru": "bengaluru",
}

BUSINESS_NAME_FIELDS = (
  "business_name",
  "factory_name",
  "employer_name",
  "shop_name",
  "industry_name",
  "consumer_name",
  "name",
)

ADDRESS_FIELDS = (
  "address",
  "service_address",
  "registered_address",
  "factory_address",
  "postal_address",
  "establishment_address",
)

CATEGORY_FIELDS = (
  "sector",
  "business_category",
  "industry_type",
  "category",
  "meter_category",
  "business_sector",
  "nature_of_business",
)

OWNER_FIELDS = (
  "owner_name",
  "employer_name",
  "promoter_name",
  "promoter_names",
  "partner_name",
  "director_name",
  "authorized_signatory",
  "authorised_signatory",
)

DISTRICT_FIELDS = ("district", "district_name")

LICENSE_FIELDS = (
  "license_no",
  "licence_no",
  "factory_license_no",
  "factory_licence_number",
  "shop_license_no",
  "shop_licence_number",
  "labour_registration_no",
  "labour_registration_number",
  "kspcb_consent_no",
  "kspcb_consent_number",
  "bescom_consumer_no",
  "bescom_consumer_number",
  "bwssb_consumer_no",
  "bwssb_consumer_number",
  "trade_license_no",
  "trade_license_number",
  "department_record_id",
)


def normalize_text(value: Any) -> str:
  text = str(value or "").lower()
  text = text.replace("&", " and ")
  text = re.sub(r"[^a-z0-9\s]", " ", text)
  tokens = []
  for token in text.split():
    tokens.append(ABBREVIATIONS.get(token, token))
  return " ".join(tokens)


def extract_pin(value: Any) -> str | None:
  match = PIN_RE.search(str(value or ""))
  return match.group(1) if match else None


def normalize_address(value: Any) -> dict[str, Any]:
  raw = re.sub(r"[\r\n]+", " ", str(value or ""))
  normalized = normalize_text(raw)
  pin_code = extract_pin(raw)
  tokens = [token for token in normalized.split() if token != pin_code]
  return {
    "address": " ".join(tokens),
    "address_tokens": tokens,
    "pin_code": pin_code,
  }


def hash_identifier(value: Any, kind: str) -> str | None:
  if value in (None, ""):
    return None

  text = str(value).strip()
  if text.startswith("hash_demo_"):
    return text

  compact = re.sub(r"[^A-Za-z0-9]", "", text).upper()
  if not compact:
    return None

  digest = hashlib.sha256(f"kbig-demo:{kind}:{compact}".encode("utf-8")).hexdigest()[:16]
  return f"hash_demo_{kind}_{digest}"


def normalize_phone(value: Any) -> str | None:
  digits = re.sub(r"\D", "", str(value or ""))
  if len(digits) < 8:
    return None
  return hash_identifier(digits[-10:], "phone")


def normalize_email(value: Any) -> str | None:
  email = str(value or "").strip().lower()
  if not EMAIL_RE.match(email):
    return None
  return hash_identifier(email, "email")


def _first_value(raw: dict[str, Any], fields: tuple[str, ...]) -> Any:
  for field in fields:
    value = raw.get(field)
    if value not in (None, ""):
      return value
  return None


def normalize_license(value: Any) -> str | None:
  compact = re.sub(r"[^A-Za-z0-9]", "", str(value or "")).upper()
  return compact or None


def license_hashes(raw: dict[str, Any]) -> dict[str, str]:
  hashes: dict[str, str] = {}
  for field in LICENSE_FIELDS:
    normalized = normalize_license(raw.get(field))
    if normalized:
      hashes[field] = hash_identifier(normalized, "license")
  return hashes


def _identifier_hash(raw: dict[str, Any], plain_key: str, hash_key: str, kind: str) -> str | None:
  if raw.get(hash_key):
    return hash_identifier(raw[hash_key], kind)

  value = raw.get(plain_key)
  if value:
    compact = re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()
    if kind == "gstin" and not GSTIN_RE.fullmatch(compact):
      return None
    if kind == "pan" and not PAN_RE.fullmatch(compact):
      return None
    return hash_identifier(compact, kind)

  return None


def normalize_source_record(source_record: dict[str, Any]) -> dict[str, Any]:
  raw = source_record.get("raw", {})
  business_name = normalize_text(_first_value(raw, BUSINESS_NAME_FIELDS))
  address_value = _first_value(raw, ADDRESS_FIELDS)
  normalized_address = normalize_address(address_value)
  category = normalize_text(_first_value(raw, CATEGORY_FIELDS))
  owner_name = normalize_text(_first_value(raw, OWNER_FIELDS))
  district = normalize_text(_first_value(raw, DISTRICT_FIELDS))
  licence_hashes = license_hashes({**raw, "department_record_id": source_record.get("source_record_id")})

  gstin_hash = _identifier_hash(raw, "gstin", "gstin_hash", "gstin")
  pan_hash = _identifier_hash(raw, "pan", "pan_hash", "pan")
  phone_hash = raw.get("phone_hash") or normalize_phone(raw.get("phone") or raw.get("mobile"))
  email_hash = raw.get("email_hash") or normalize_email(raw.get("email"))

  quality_flags: list[str] = []
  if not gstin_hash:
    quality_flags.append("gstin_missing")
  if not pan_hash:
    quality_flags.append("pan_missing")
  if not normalized_address["pin_code"]:
    quality_flags.append("pin_missing")
  if not normalized_address["address"] or len(normalized_address["address_tokens"]) < 4:
    quality_flags.append("incomplete_address")
  if not licence_hashes:
    quality_flags.append("licence_or_local_identifier_missing")
  if source_record.get("department") in {"BESCOM", "BWSSB"}:
    quality_flags.append("activity_or_utility_source")

  source_id = str(source_record["_id"])
  normalized_id = f"norm_{source_id.removeprefix('src_')}"

  return {
    "_id": normalized_id,
    "source_record_id": source_id,
    "department": source_record.get("department"),
    "normalized": {
      "business_name": business_name,
      "address": normalized_address["address"],
      "address_tokens": normalized_address["address_tokens"],
      "pin_code": normalized_address["pin_code"],
      "gstin_hash": gstin_hash,
      "pan_hash": pan_hash,
      "phone_hash": phone_hash,
      "email_hash": email_hash,
      "owner_name": owner_name,
      "district": district,
      "license_hashes": licence_hashes,
      "sector": category,
    },
    "quality_flags": quality_flags,
    "generated_by": "entity_resolution",
  }


def normalize_source_records(source_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
  return [normalize_source_record(record) for record in source_records]
