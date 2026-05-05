from __future__ import annotations

from typing import Any


def _normalized(record: dict[str, Any]) -> dict[str, Any]:
  return record.get("normalized") if isinstance(record.get("normalized"), dict) else record


def _first(records: list[dict[str, Any]], keys: tuple[str, ...]) -> Any:
  for record in records:
    normalized = _normalized(record)
    for key in keys:
      value = normalized.get(key) or record.get(key)
      if value:
        return value
  return None


def build_link_details(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
  details = []
  for record in records:
    record_id = record.get("source_record_id") or record.get("record_id")
    if not record_id:
      continue

    details.append(
      {
        "record_id": record_id,
        "department": record.get("department"),
        "department_record_id": record.get("department_record_id") or record_id,
        "active": True,
        "link_status": "active",
        "deactivated_at": None,
        "deactivated_by": None,
        "deactivation_reason": None,
      }
    )
  return details


def build_legal_entity_anchor(records: list[dict[str, Any]], anchor_type: str | None = None) -> dict[str, Any]:
  pan_hash = _first(records, ("pan_hash",))
  gstin_hash = _first(records, ("gstin_hash",))

  if pan_hash or gstin_hash:
    anchor_status = "verified_mock" if anchor_type in {"PAN_HASH", "GSTIN_HASH"} else "available"
  else:
    anchor_status = "missing"

  return {
    "pan_hash": pan_hash,
    "gstin_hash": gstin_hash,
    "anchor_status": anchor_status,
  }


def build_establishment_identity(
  ubid: str,
  operating_unit_name: str,
  records: list[dict[str, Any]],
) -> dict[str, Any]:
  pin_code = _first(records, ("pin_code",))
  address = _first(records, ("address",))
  district = _first(records, ("district",))
  primary_location = address or (f"PIN {pin_code}" if pin_code else district) or "Synthetic Karnataka record"

  return {
    "ubid": ubid,
    "operating_unit_name": operating_unit_name,
    "primary_location": primary_location,
    "pin_code": pin_code,
    "department_record_count": len(records),
  }


def build_ubid_identity_sections(
  ubid: str,
  operating_unit_name: str,
  records: list[dict[str, Any]],
  anchor_type: str | None = None,
) -> dict[str, dict[str, Any]]:
  return {
    "legal_entity_anchor": build_legal_entity_anchor(records, anchor_type),
    "establishment_identity": build_establishment_identity(ubid, operating_unit_name, records),
  }
