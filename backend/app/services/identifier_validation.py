from __future__ import annotations

import hashlib
import re


PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
GSTIN_PATTERN = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$")
PIN_PATTERN = re.compile(r"^[0-9]{6}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_PATTERN = re.compile(r"^\+?[0-9][0-9\s-]{7,14}[0-9]$")


def _clean_identifier(value: str | None) -> str:
  return re.sub(r"[^A-Z0-9]", "", (value or "").upper())


def validate_pan_format(pan: str | None) -> bool:
  value = _clean_identifier(pan)
  return bool(value and PAN_PATTERN.fullmatch(value))


def validate_gstin_format(gstin: str | None) -> bool:
  value = _clean_identifier(gstin)
  return bool(value and GSTIN_PATTERN.fullmatch(value))


def validate_pin_code(pin_code: str | None) -> bool:
  return bool(pin_code and PIN_PATTERN.fullmatch(pin_code.strip()))


def validate_email_format(email: str | None) -> bool:
  if not email:
    return True
  return bool(EMAIL_PATTERN.fullmatch(email.strip()))


def validate_phone_format(phone: str | None) -> bool:
  if not phone:
    return True
  return bool(PHONE_PATTERN.fullmatch(phone.strip()))


def mask_pan(pan: str | None) -> str | None:
  value = _clean_identifier(pan)
  if not value:
    return None
  if len(value) < 6:
    return "****"
  return f"{value[:5]}****{value[-1]}"


def mask_gstin(gstin: str | None) -> str | None:
  value = _clean_identifier(gstin)
  if not value:
    return None
  if len(value) < 8:
    return "****"
  return f"{value[:7]}****{value[-3:]}"


def hash_identifier(value: str | None, prefix: str = "hash_self") -> str | None:
  cleaned = _clean_identifier(value)
  if not cleaned:
    return None
  digest = hashlib.sha256(f"kbig:{cleaned}".encode("utf-8")).hexdigest()[:16]
  return f"{prefix}_{digest}"


def extract_pan_from_gstin(gstin: str | None) -> str | None:
  value = _clean_identifier(gstin)
  if not validate_gstin_format(value):
    return None
  return value[2:12]


def check_gstin_pan_consistency(gstin: str | None, pan: str | None) -> bool:
  cleaned_pan = _clean_identifier(pan)
  extracted_pan = extract_pan_from_gstin(gstin)
  if not cleaned_pan or not extracted_pan:
    return True
  return extracted_pan == cleaned_pan
