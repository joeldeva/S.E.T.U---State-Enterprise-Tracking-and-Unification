from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
from itertools import combinations
from difflib import SequenceMatcher
from typing import Any

from .normalizer import normalize_source_records
from .ubid_generator import anchor_for_record, canonical_name, generate_ubid


def _similarity(left: str | None, right: str | None) -> int:
  if not left or not right:
    return 0
  left_tokens = " ".join(sorted(left.split()))
  right_tokens = " ".join(sorted(right.split()))
  return round(SequenceMatcher(None, left_tokens, right_tokens).ratio() * 100)


def _decision_zone(score: int) -> str:
  if score >= 90:
    return "auto_link"
  if score >= 65:
    return "review"
  return "keep_separate"


def _match_id(record_a: str, record_b: str) -> str:
  pair_key = "|".join(sorted([record_a, record_b]))
  digest = hashlib.sha1(pair_key.encode("utf-8")).hexdigest()[:10]
  return f"match_{digest}"


def _evidence_item(points: int, matched: bool, detail: str, value: Any = None) -> dict[str, Any]:
  item = {
    "matched": matched,
    "points": points,
    "detail": detail,
  }
  if value is not None:
    item["value"] = value
  return item


def score_pair(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
  left_norm = left["normalized"]
  right_norm = right["normalized"]
  score = 0
  evidence: dict[str, dict[str, Any]] = {}

  gstin_left = left_norm.get("gstin_hash")
  gstin_right = right_norm.get("gstin_hash")
  pan_left = left_norm.get("pan_hash")
  pan_right = right_norm.get("pan_hash")

  identifier_conflict = False
  if gstin_left and gstin_right:
    if gstin_left == gstin_right:
      score += 45
      evidence["gstin_hash_match"] = _evidence_item(45, True, "GSTIN hashes match exactly.")
    else:
      identifier_conflict = True
      evidence["gstin_hash_conflict"] = _evidence_item(-50, False, "GSTIN hashes conflict.")

  if pan_left and pan_right:
    if pan_left == pan_right:
      score += 40
      evidence["pan_hash_match"] = _evidence_item(40, True, "PAN hashes match exactly.")
    else:
      identifier_conflict = True
      evidence["pan_hash_conflict"] = _evidence_item(-50, False, "PAN hashes conflict.")

  if identifier_conflict:
    score -= 50
    evidence["identifier_conflict_penalty"] = _evidence_item(-50, False, "One or more strong identifier hashes conflict.")

  pin_left = left_norm.get("pin_code")
  pin_right = right_norm.get("pin_code")
  if pin_left and pin_right:
    if pin_left == pin_right:
      score += 15
      evidence["same_pin"] = _evidence_item(15, True, "PIN codes match.", pin_left)
    else:
      score -= 20
      evidence["different_pin"] = _evidence_item(-20, False, "PIN codes differ.", f"{pin_left} vs {pin_right}")

  name_similarity = _similarity(left_norm.get("business_name"), right_norm.get("business_name"))
  if name_similarity > 85:
    score += 20
    evidence["name_similarity"] = _evidence_item(20, True, "Business names are strongly similar.", name_similarity)
  else:
    evidence["name_similarity"] = _evidence_item(0, False, "Business names are below the auto-score threshold.", name_similarity)

  address_similarity = _similarity(left_norm.get("address"), right_norm.get("address"))
  if address_similarity > 80:
    score += 15
    evidence["address_similarity"] = _evidence_item(15, True, "Normalized addresses are strongly similar.", address_similarity)
  else:
    evidence["address_similarity"] = _evidence_item(0, False, "Normalized addresses are below the auto-score threshold.", address_similarity)

  phone_match = bool(left_norm.get("phone_hash") and left_norm.get("phone_hash") == right_norm.get("phone_hash"))
  email_match = bool(left_norm.get("email_hash") and left_norm.get("email_hash") == right_norm.get("email_hash"))
  if phone_match or email_match:
    score += 20
    evidence["contact_hash_match"] = _evidence_item(20, True, "Phone or email hashes match.")

  category_left = left_norm.get("sector")
  category_right = right_norm.get("sector")
  if category_left and category_right and category_left == category_right:
    score += 10
    evidence["same_business_category"] = _evidence_item(10, True, "Business categories match.", category_left)
  elif category_left or category_right:
    evidence["same_business_category"] = _evidence_item(0, False, "Business categories do not match.")

  confidence = max(0, min(score, 100))
  decision_zone = _decision_zone(confidence)

  return {
    "_id": _match_id(left["source_record_id"], right["source_record_id"]),
    "record_a": left["source_record_id"],
    "record_b": right["source_record_id"],
    "departments": [left["department"], right["department"]],
    "confidence": confidence,
    "raw_score": score,
    "decision_zone": decision_zone,
    "evidence": evidence,
    "explanation": explain_match(confidence, decision_zone, evidence),
    "status": "auto_linked" if decision_zone == "auto_link" else "pending_review" if decision_zone == "review" else "kept_separate",
    "generated_by": "entity_resolution",
  }


def explain_match(confidence: int, decision_zone: str, evidence: dict[str, dict[str, Any]]) -> str:
  positives = [key.replace("_", " ") for key, item in evidence.items() if item["points"] > 0 and item["matched"]]
  penalties = [key.replace("_", " ") for key, item in evidence.items() if item["points"] < 0]

  if positives:
    reason = ", ".join(positives[:4])
  else:
    reason = "weak evidence only"

  if penalties:
    reason = f"{reason}; penalties: {', '.join(penalties)}"

  zone_text = {
    "auto_link": "Auto-link recommended",
    "review": "Human review required",
    "keep_separate": "Keep separate",
  }[decision_zone]

  return f"{zone_text} at {confidence}% confidence based on {reason}."


def build_match_candidates(normalized_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
  candidates = []
  for left, right in combinations(normalized_records, 2):
    if left["department"] == right["department"]:
      continue
    candidates.append(score_pair(left, right))

  return sorted(candidates, key=lambda candidate: (-candidate["confidence"], candidate["_id"]))


class _UnionFind:
  def __init__(self, values: list[str]) -> None:
    self.parent = {value: value for value in values}

  def find(self, value: str) -> str:
    while self.parent[value] != value:
      self.parent[value] = self.parent[self.parent[value]]
      value = self.parent[value]
    return value

  def union(self, left: str, right: str) -> None:
    root_left = self.find(left)
    root_right = self.find(right)
    if root_left != root_right:
      self.parent[root_right] = root_left


def _build_components(
  normalized_records: list[dict[str, Any]],
  match_candidates: list[dict[str, Any]],
) -> list[list[str]]:
  source_ids = [record["source_record_id"] for record in normalized_records]
  union_find = _UnionFind(source_ids)

  for candidate in match_candidates:
    if candidate["decision_zone"] == "auto_link":
      union_find.union(candidate["record_a"], candidate["record_b"])

  groups: dict[str, list[str]] = defaultdict(list)
  for source_id in source_ids:
    groups[union_find.find(source_id)].append(source_id)

  return list(groups.values())


def build_review_queue(match_candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
  reviews = []
  for index, candidate in enumerate(
    [candidate for candidate in match_candidates if candidate["decision_zone"] == "review"],
    start=1,
  ):
    reviews.append(
      {
        "_id": f"review_match_{index:03d}",
        "match_candidate_id": candidate["_id"],
        "confidence": candidate["confidence"],
        "priority": "High" if candidate["confidence"] >= 80 else "Medium",
        "reason": candidate["explanation"],
        "review_status": "pending",
        "assigned_to": "Reviewer Demo",
        "generated_by": "entity_resolution",
      },
    )
  return reviews


def build_ubid_registry(
  normalized_records: list[dict[str, Any]],
  match_candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
  records_by_source = {record["source_record_id"]: record for record in normalized_records}
  review_candidates_by_source: dict[str, list[str]] = defaultdict(list)

  for candidate in match_candidates:
    if candidate["decision_zone"] == "review":
      review_candidates_by_source[candidate["record_a"]].append(candidate["record_b"])
      review_candidates_by_source[candidate["record_b"]].append(candidate["record_a"])

  department_priority = {
    "Factories": 0,
    "Shops & Establishments": 1,
    "Labour": 2,
    "KSPCB": 3,
    "BESCOM": 4,
    "BWSSB": 5,
  }

  def component_priority(component: list[str]) -> tuple[int, str]:
    records = [records_by_source[source_id] for source_id in component]
    return (
      min(department_priority.get(record["department"], 99) for record in records),
      min(component),
    )

  registry_by_ubid: dict[str, dict[str, Any]] = {}
  for component in sorted(_build_components(normalized_records, match_candidates), key=component_priority):
    component_records = [records_by_source[source_id] for source_id in sorted(component)]
    anchors = [anchor_for_record(record) for record in component_records]
    anchor = next((item for item in anchors if item is not None), None)
    if anchor is None:
      continue

    anchor_type, anchor_hash = anchor
    ubid = generate_ubid(anchor_hash, component)
    linked_records = sorted(component)
    candidate_records = sorted(
      {
        candidate_source
        for source_id in linked_records
        for candidate_source in review_candidates_by_source.get(source_id, [])
        if candidate_source not in linked_records
      },
    )

    if ubid in registry_by_ubid:
      existing = registry_by_ubid[ubid]
      existing["candidate_records"] = sorted(set(existing.get("candidate_records", [])) | set(linked_records) | set(candidate_records))
      continue

    registry_by_ubid[ubid] = {
      "_id": ubid,
      "canonical_name": canonical_name(component_records),
      "anchor_type": anchor_type,
      "anchor_hash": anchor_hash,
      "linked_records": linked_records,
      "candidate_records": candidate_records,
      "current_status": "Active" if len(linked_records) > 1 else "Insufficient Data",
      "status_confidence": 75 if len(linked_records) > 1 else 30,
      "match_confidence": max(
        [candidate["confidence"] for candidate in match_candidates if candidate["record_a"] in linked_records or candidate["record_b"] in linked_records],
        default=0,
      ),
      "review_status": "pending_review" if candidate_records else "system_verified",
      "created_by": "entity_resolution",
      "reversible": True,
      "generated_by": "entity_resolution",
    }

  return sorted(registry_by_ubid.values(), key=lambda document: document["_id"])


def build_audit_logs(summary: dict[str, Any]) -> list[dict[str, Any]]:
  timestamp = datetime.now(timezone.utc).isoformat()
  return [
    {
      "_id": f"audit_entity_resolution_{key}",
      "action": f"entity_resolution_{key}",
      "actor": "system",
      "target": "matching_run",
      "before": {},
      "after": {"count": value},
      "reason": "Local explainable entity resolution run on synthetic source records.",
      "timestamp": timestamp,
      "generated_by": "entity_resolution",
    }
    for key, value in summary.items()
  ]


def run_entity_resolution(source_records: list[dict[str, Any]]) -> dict[str, Any]:
  normalized_records = normalize_source_records(source_records)
  match_candidates = build_match_candidates(normalized_records)
  review_queue = build_review_queue(match_candidates)
  ubid_registry = build_ubid_registry(normalized_records, match_candidates)
  counts = Counter(candidate["decision_zone"] for candidate in match_candidates)
  counts = {
    "auto_link": counts.get("auto_link", 0),
    "review": counts.get("review", 0),
    "keep_separate": counts.get("keep_separate", 0),
  }
  summary = {
    "normalized_records": len(normalized_records),
    "match_candidates": len(match_candidates),
    "review_queue": len(review_queue),
    "ubid_registry": len(ubid_registry),
    **counts,
  }

  return {
    "normalized_records": normalized_records,
    "match_candidates": match_candidates,
    "review_queue": review_queue,
    "ubid_registry": ubid_registry,
    "audit_logs": build_audit_logs(summary),
    "counts": counts,
    "summary": summary,
  }
