from __future__ import annotations

import hashlib
from typing import Any

KNOWN_DEMO_UBIDS = {
  "hash_demo_gstin_001": "KA-UBID-A92F31C8D410",
  "hash_demo_gstin_002": "KA-UBID-D81F9A220C77",
  "hash_demo_pan_004": "KA-UBID-3B5E61C90A22",
  "hash_demo_gstin_006": "KA-UBID-9F03AD1C6B55",
  "hash_demo_pan_006": "KA-UBID-9F03AD1C6B55",
}


def _title_case(value: str) -> str:
  return " ".join(token.capitalize() for token in value.split())


def anchor_for_record(normalized_record: dict[str, Any]) -> tuple[str, str] | None:
  normalized = normalized_record.get("normalized", {})
  if normalized.get("gstin_hash"):
    return ("GSTIN_HASH", normalized["gstin_hash"])
  if normalized.get("pan_hash"):
    return ("PAN_HASH", normalized["pan_hash"])
  return None


def generate_ubid(anchor_hash: str | None, source_ids: list[str]) -> str:
  if anchor_hash in KNOWN_DEMO_UBIDS:
    return KNOWN_DEMO_UBIDS[anchor_hash]

  key = anchor_hash or "|".join(sorted(source_ids))
  digest = hashlib.sha1(f"kbig-ubid:{key}".encode("utf-8")).hexdigest()[:12].upper()
  return f"KA-UBID-{digest}"


def canonical_name(records: list[dict[str, Any]]) -> str:
  ordered = sorted(
    records,
    key=lambda record: (
      ["Factories", "Shops & Establishments", "Labour", "KSPCB", "BESCOM", "BWSSB"].index(record["department"])
      if record["department"] in ["Factories", "Shops & Establishments", "Labour", "KSPCB", "BESCOM", "BWSSB"]
      else 99,
      record["_id"],
    ),
  )
  for record in ordered:
    name = record.get("normalized", {}).get("business_name")
    if name:
      return _title_case(name)
  return "Synthetic Business"
