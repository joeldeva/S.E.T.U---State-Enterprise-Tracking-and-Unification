from copy import deepcopy
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

SOURCE_RECORDS: list[dict[str, Any]] = [
  {
    "_id": "src_factories_102",
    "department": "Factories",
    "source_record_id": "F-102",
    "raw": {
      "factory_name": "Sri Lakshmi Engineering Pvt Ltd",
      "address": "12, 3rd Cross, Peenya Industrial Area, Bengaluru 560058",
      "gstin_hash": "hash_demo_gstin_001",
      "pan_hash": "hash_demo_pan_001",
      "license_no": "FAC-9981",
      "sector": "manufacturing",
    },
    "ingested_at": "2026-05-03T10:00:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_labour_778",
    "department": "Labour",
    "source_record_id": "L-778",
    "raw": {
      "employer_name": "S L Engineering Works",
      "address": "No 12, III Cross, Peenya Indl Area, Bengaluru - 560058",
      "gstin_hash": "hash_demo_gstin_001",
      "pan_hash": "hash_demo_pan_001",
      "labour_registration": "LAB-4429",
      "sector": "manufacturing",
    },
    "ingested_at": "2026-05-03T10:02:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_shops_221",
    "department": "Shops & Establishments",
    "source_record_id": "S-221",
    "raw": {
      "shop_name": "Sri Lakshmi Engineering Works",
      "address": "12 3rd Cross Peenya Industrial Area Bengaluru 560058",
      "gstin_hash": "hash_demo_gstin_001",
      "pan_hash": "hash_demo_pan_001",
      "license_no": "SE-04412",
      "sector": "manufacturing",
    },
    "ingested_at": "2026-05-03T10:04:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_kspcb_309",
    "department": "KSPCB",
    "source_record_id": "K-309",
    "raw": {
      "industry_name": "Sri Lakshmi Engineering",
      "address": "Plot 12, 3rd Cross, Peenya Industrial Area, Bengaluru 560058",
      "gstin_hash": "hash_demo_gstin_001",
      "consent_no": "KSPCB-8812",
      "sector": "manufacturing",
    },
    "ingested_at": "2026-05-03T10:06:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_bescom_510",
    "department": "BESCOM",
    "source_record_id": "B-510",
    "raw": {
      "consumer_name": "Sri Lakshmi Engg Works",
      "service_address": "12, 3rd Cross, Peenya, Bengaluru 560058",
      "connection_hash": "hash_demo_connection_001",
      "meter_category": "HT Industrial",
      "last_consumption_kwh": 18420,
    },
    "ingested_at": "2026-05-03T10:07:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_shops_512",
    "department": "Shops & Establishments",
    "source_record_id": "S-512",
    "raw": {
      "shop_name": "M/s Ananya Textiles Private Limited",
      "address": "44, Textile Market Road, Yeshwanthpur, Bengaluru 560022",
      "gstin_hash": "hash_demo_gstin_002",
      "pan_hash": "hash_demo_pan_002",
      "license_no": "SE-11203",
      "sector": "textiles",
    },
    "ingested_at": "2026-05-03T10:09:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_kspcb_622",
    "department": "KSPCB",
    "source_record_id": "K-622",
    "raw": {
      "industry_name": "Ananya Textile Unit",
      "address": "Plot 44B, Industrial Sub Layout, Yeshwanthpur, Bengaluru 560022",
      "gstin_hash": "hash_demo_gstin_002",
      "consent_no": "KSPCB-19910",
      "sector": "textiles",
    },
    "ingested_at": "2026-05-03T10:10:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_factories_901",
    "department": "Factories",
    "source_record_id": "F-901",
    "raw": {
      "factory_name": "Karnataka Granite Exports",
      "address": "Survey 18, Malur Road, Kolar 563101",
      "gstin_hash": "hash_demo_gstin_006",
      "pan_hash": "hash_demo_pan_006",
      "license_no": "FAC-00080",
      "sector": "mining",
    },
    "ingested_at": "2026-05-03T10:12:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_bescom_904",
    "department": "BESCOM",
    "source_record_id": "B-904",
    "raw": {
      "consumer_name": "Karnataka Granite Export Unit",
      "service_address": "Malur Road Industrial Feeder, Kolar 563101",
      "connection_hash": "hash_demo_connection_006",
      "meter_category": "HT Industrial",
      "last_consumption_kwh": 9820,
    },
    "ingested_at": "2026-05-03T10:13:00Z",
    "read_only_source": True,
  },
  {
    "_id": "src_bescom_unmatched_001",
    "department": "BESCOM",
    "source_record_id": "B-U-001",
    "raw": {
      "consumer_name": "Peenya Fabrication Shed 27",
      "service_address": "Shed 27, Peenya Industrial Area, Bengaluru 560058",
      "connection_hash": "hash_demo_connection_unmatched_001",
      "meter_category": "LT Industrial",
      "last_consumption_kwh": 2120,
    },
    "ingested_at": "2026-05-03T10:14:00Z",
    "read_only_source": True,
  },
]

NORMALIZED_RECORDS: list[dict[str, Any]] = [
  {
    "_id": "norm_factories_102",
    "source_record_id": "src_factories_102",
    "department": "Factories",
    "normalized": {
      "business_name": "sri lakshmi engineering",
      "address_tokens": ["12", "3rd", "cross", "peenya", "industrial", "area", "bengaluru"],
      "pin_code": "560058",
      "gstin_hash": "hash_demo_gstin_001",
      "pan_hash": "hash_demo_pan_001",
      "sector": "manufacturing",
    },
    "quality_flags": [],
  },
  {
    "_id": "norm_labour_778",
    "source_record_id": "src_labour_778",
    "department": "Labour",
    "normalized": {
      "business_name": "s l engineering works",
      "address_tokens": ["12", "3rd", "cross", "peenya", "industrial", "area", "bengaluru"],
      "pin_code": "560058",
      "gstin_hash": "hash_demo_gstin_001",
      "pan_hash": "hash_demo_pan_001",
      "sector": "manufacturing",
    },
    "quality_flags": ["abbreviated_name"],
  },
  {
    "_id": "norm_shops_221",
    "source_record_id": "src_shops_221",
    "department": "Shops & Establishments",
    "normalized": {
      "business_name": "sri lakshmi engineering works",
      "address_tokens": ["12", "3rd", "cross", "peenya", "industrial", "area", "bengaluru"],
      "pin_code": "560058",
      "gstin_hash": "hash_demo_gstin_001",
      "pan_hash": "hash_demo_pan_001",
      "sector": "manufacturing",
    },
    "quality_flags": [],
  },
  {
    "_id": "norm_kspcb_309",
    "source_record_id": "src_kspcb_309",
    "department": "KSPCB",
    "normalized": {
      "business_name": "sri lakshmi engineering",
      "address_tokens": ["12", "3rd", "cross", "peenya", "industrial", "area", "bengaluru"],
      "pin_code": "560058",
      "gstin_hash": "hash_demo_gstin_001",
      "pan_hash": None,
      "sector": "manufacturing",
    },
    "quality_flags": ["pan_missing"],
  },
  {
    "_id": "norm_bescom_510",
    "source_record_id": "src_bescom_510",
    "department": "BESCOM",
    "normalized": {
      "business_name": "sri lakshmi engineering works",
      "address_tokens": ["12", "3rd", "cross", "peenya", "bengaluru"],
      "pin_code": "560058",
      "connection_hash": "hash_demo_connection_001",
      "sector": "industrial_utility",
    },
    "quality_flags": ["non_registration_event"],
  },
  {
    "_id": "norm_shops_512",
    "source_record_id": "src_shops_512",
    "department": "Shops & Establishments",
    "normalized": {
      "business_name": "ananya textiles",
      "address_tokens": ["44", "textile", "market", "road", "yeshwanthpur", "bengaluru"],
      "pin_code": "560022",
      "gstin_hash": "hash_demo_gstin_002",
      "pan_hash": "hash_demo_pan_002",
      "sector": "textiles",
    },
    "quality_flags": [],
  },
  {
    "_id": "norm_kspcb_622",
    "source_record_id": "src_kspcb_622",
    "department": "KSPCB",
    "normalized": {
      "business_name": "ananya textile unit",
      "address_tokens": ["44b", "industrial", "sub", "layout", "yeshwanthpur", "bengaluru"],
      "pin_code": "560022",
      "gstin_hash": "hash_demo_gstin_002",
      "pan_hash": None,
      "sector": "textiles",
    },
    "quality_flags": ["address_variance", "pan_missing"],
  },
  {
    "_id": "norm_factories_901",
    "source_record_id": "src_factories_901",
    "department": "Factories",
    "normalized": {
      "business_name": "karnataka granite exports",
      "address_tokens": ["survey", "18", "malur", "road", "kolar"],
      "pin_code": "563101",
      "gstin_hash": "hash_demo_gstin_006",
      "pan_hash": "hash_demo_pan_006",
      "sector": "mining",
    },
    "quality_flags": ["review_recommended"],
  },
  {
    "_id": "norm_bescom_904",
    "source_record_id": "src_bescom_904",
    "department": "BESCOM",
    "normalized": {
      "business_name": "karnataka granite export unit",
      "address_tokens": ["malur", "road", "industrial", "feeder", "kolar"],
      "pin_code": "563101",
      "connection_hash": "hash_demo_connection_006",
      "sector": "industrial_utility",
    },
    "quality_flags": ["registration_anchor_missing"],
  },
  {
    "_id": "norm_bescom_unmatched_001",
    "source_record_id": "src_bescom_unmatched_001",
    "department": "BESCOM",
    "normalized": {
      "business_name": "peenya fabrication shed 27",
      "address_tokens": ["shed", "27", "peenya", "industrial", "area", "bengaluru"],
      "pin_code": "560058",
      "connection_hash": "hash_demo_connection_unmatched_001",
      "sector": "industrial_utility",
    },
    "quality_flags": ["unmatched_activity_signal", "registration_anchor_missing"],
  },
]

MATCH_CANDIDATES: list[dict[str, Any]] = [
  {
    "_id": "match_001",
    "record_a": "src_factories_102",
    "record_b": "src_labour_778",
    "confidence": 96,
    "decision_zone": "auto_link",
    "evidence": {
      "gstin_hash_match": True,
      "pan_hash_match": True,
      "name_similarity": 88,
      "address_similarity": 91,
      "same_pin": True,
      "sector_match": True,
    },
    "explanation": "Shared identifier hashes with strong PIN, sector, name, and address agreement.",
    "status": "auto_linked",
  },
  {
    "_id": "match_002",
    "record_a": "src_factories_102",
    "record_b": "src_shops_221",
    "confidence": 98,
    "decision_zone": "auto_link",
    "evidence": {
      "gstin_hash_match": True,
      "pan_hash_match": True,
      "name_similarity": 96,
      "address_similarity": 94,
      "same_pin": True,
      "sector_match": True,
    },
    "explanation": "Strong deterministic anchors and near-identical normalized name and address.",
    "status": "auto_linked",
  },
  {
    "_id": "match_003",
    "record_a": "src_factories_102",
    "record_b": "src_kspcb_309",
    "confidence": 94,
    "decision_zone": "auto_link",
    "evidence": {
      "gstin_hash_match": True,
      "pan_hash_match": None,
      "name_similarity": 92,
      "address_similarity": 91,
      "same_pin": True,
      "sector_match": True,
    },
    "explanation": "GSTIN hash, PIN, and address are aligned; PAN is unavailable in one source.",
    "status": "auto_linked",
  },
  {
    "_id": "match_004",
    "record_a": "src_shops_512",
    "record_b": "src_kspcb_622",
    "confidence": 82,
    "decision_zone": "human_review",
    "evidence": {
      "gstin_hash_match": True,
      "pan_hash_match": None,
      "name_similarity": 74,
      "address_similarity": 68,
      "same_pin": True,
      "sector_match": True,
    },
    "explanation": "Identifier hash and PIN match, but address variance and naming difference require officer review.",
    "status": "pending_review",
  },
  {
    "_id": "match_005",
    "record_a": "src_factories_901",
    "record_b": "src_bescom_904",
    "confidence": 68,
    "decision_zone": "human_review",
    "evidence": {
      "gstin_hash_match": None,
      "pan_hash_match": None,
      "name_similarity": 69,
      "address_similarity": 57,
      "same_pin": True,
      "sector_match": False,
    },
    "explanation": "Same PIN and partially similar name, but utility record lacks a registration anchor.",
    "status": "pending_review",
  },
]

UBID_REGISTRY: list[dict[str, Any]] = [
  {
    "_id": "KA-UBID-A92F31C8D410",
    "canonical_name": "Sri Lakshmi Engineering Works",
    "anchor_type": "GSTIN_HASH",
    "anchor_hash": "hash_demo_gstin_001",
    "linked_records": ["src_factories_102", "src_labour_778", "src_shops_221", "src_kspcb_309", "src_bescom_510"],
    "current_status": "Active",
    "status_confidence": 94,
    "match_confidence": 96,
    "review_status": "system_verified",
    "created_by": "system",
    "reversible": True,
  },
  {
    "_id": "KA-UBID-D81F9A220C77",
    "canonical_name": "Ananya Textiles",
    "anchor_type": "GSTIN_HASH",
    "anchor_hash": "hash_demo_gstin_002",
    "linked_records": ["src_shops_512"],
    "candidate_records": ["src_kspcb_622"],
    "current_status": "Active",
    "status_confidence": 78,
    "match_confidence": 73,
    "review_status": "pending_review",
    "created_by": "system",
    "reversible": True,
  },
  {
    "_id": "KA-UBID-3B5E61C90A22",
    "canonical_name": "Ravi Stone Crushers",
    "anchor_type": "PAN_HASH",
    "anchor_hash": "hash_demo_pan_004",
    "linked_records": [],
    "current_status": "Dormant",
    "status_confidence": 81,
    "match_confidence": 81,
    "review_status": "system_verified",
    "created_by": "system",
    "reversible": True,
  },
  {
    "_id": "KA-UBID-9F03AD1C6B55",
    "canonical_name": "Karnataka Granite Exports",
    "anchor_type": "SYNTHETIC",
    "anchor_hash": "hash_demo_synthetic_006",
    "linked_records": ["src_factories_901"],
    "candidate_records": ["src_bescom_904"],
    "current_status": "Dormant",
    "status_confidence": 64,
    "match_confidence": 68,
    "review_status": "pending_review",
    "created_by": "system",
    "reversible": True,
  },
]

REVIEW_QUEUE: list[dict[str, Any]] = [
  {
    "_id": "review_001",
    "match_candidate_id": "match_004",
    "confidence": 82,
    "priority": "High",
    "reason": "Strong identifier hash and PIN agreement, but address variance requires officer review.",
    "review_status": "pending",
    "assigned_to": "Reviewer Demo",
    "created_at": "2026-05-03T10:20:00Z",
  },
  {
    "_id": "review_002",
    "match_candidate_id": "match_005",
    "confidence": 68,
    "priority": "Medium",
    "reason": "Utility activity may belong to the same business, but registration anchor is missing.",
    "review_status": "pending",
    "assigned_to": "Reviewer Demo",
    "created_at": "2026-05-03T10:21:00Z",
  },
]

ACTIVITY_EVENTS: list[dict[str, Any]] = [
  {
    "_id": "event_001",
    "ubid": "KA-UBID-A92F31C8D410",
    "source": "Labour",
    "event_type": "compliance_filing",
    "event_date": "2026-02-11",
    "activity_score": 25,
    "joined_confidence": 94,
  },
  {
    "_id": "event_002",
    "ubid": "KA-UBID-A92F31C8D410",
    "source": "BESCOM",
    "event_type": "utility_consumption",
    "event_date": "2026-04-25",
    "activity_score": 20,
    "joined_confidence": 96,
  },
  {
    "_id": "event_003",
    "ubid": "KA-UBID-A92F31C8D410",
    "source": "Factories",
    "event_type": "license_valid",
    "event_date": "2026-01-30",
    "activity_score": 30,
    "joined_confidence": 92,
  },
  {
    "_id": "event_004",
    "ubid": "KA-UBID-D81F9A220C77",
    "source": "BESCOM",
    "event_type": "utility_consumption",
    "event_date": "2026-03-20",
    "activity_score": 20,
    "joined_confidence": 91,
  },
  {
    "_id": "event_005",
    "ubid": "KA-UBID-3B5E61C90A22",
    "source": "KSPCB",
    "event_type": "consent_lapsed",
    "event_date": "2024-03-15",
    "activity_score": -15,
    "joined_confidence": 79,
  },
  {
    "_id": "event_006",
    "ubid": "KA-UBID-9F03AD1C6B55",
    "source": "BESCOM",
    "event_type": "low_utility_consumption",
    "event_date": "2025-08-12",
    "activity_score": 8,
    "joined_confidence": 68,
  },
  {
    "_id": "event_008",
    "ubid": "KA-UBID-9F03AD1C6B55",
    "source": "Factories",
    "event_type": "closure_application",
    "event_date": "2026-01-18",
    "activity_score": 0,
    "joined_confidence": 88,
  },
  {
    "_id": "event_007",
    "ubid": None,
    "source": "BESCOM",
    "source_record_id": "src_bescom_unmatched_001",
    "event_type": "utility_consumption",
    "event_date": "2026-04-29",
    "activity_score": 20,
    "joined_confidence": 0,
  },
]

AUDIT_LOGS: list[dict[str, Any]] = [
  {
    "_id": "audit_001",
    "action": "seed_loaded",
    "actor": "system",
    "target": "kbig_demo",
    "before": {},
    "after": {"collections": 7},
    "reason": "Synthetic demo data loaded for Phase 2 backend foundation.",
    "timestamp": "2026-05-03T10:15:00Z",
  },
  {
    "_id": "audit_002",
    "action": "auto_link_created",
    "actor": "system",
    "target": "KA-UBID-A92F31C8D410",
    "before": {"linked_records": []},
    "after": {"linked_records": ["src_factories_102", "src_labour_778", "src_shops_221"]},
    "reason": "Shared identifier hashes with high name/address confidence.",
    "timestamp": "2026-05-03T10:16:00Z",
  },
  {
    "_id": "audit_003",
    "action": "review_case_created",
    "actor": "system",
    "target": "review_001",
    "before": {},
    "after": {"match_candidate_id": "match_004", "priority": "High"},
    "reason": "Ambiguous match routed to human review.",
    "timestamp": "2026-05-03T10:20:00Z",
  },
  {
    "_id": "audit_004",
    "action": "activity_status_assigned",
    "actor": "system",
    "target": "KA-UBID-A92F31C8D410",
    "before": {"current_status": "Unknown"},
    "after": {"current_status": "Active", "status_confidence": 94},
    "reason": "Recent compliance filing, utility consumption, and valid factory license.",
    "timestamp": "2026-05-03T10:22:00Z",
  },
]

SEED_COLLECTIONS: dict[str, list[dict[str, Any]]] = {
  "business_submissions": [],
  "source_records": SOURCE_RECORDS,
  "normalized_records": NORMALIZED_RECORDS,
  "match_candidates": MATCH_CANDIDATES,
  "ubid_registry": UBID_REGISTRY,
  "review_queue": REVIEW_QUEUE,
  "activity_events": ACTIVITY_EVENTS,
  "audit_logs": AUDIT_LOGS,
}


async def _ensure_indexes(database: AsyncIOMotorDatabase) -> None:
  await database.business_submissions.create_index("ubid")
  await database.business_submissions.create_index("status")
  await database.source_records.create_index([("department", 1), ("source_record_id", 1)], unique=True)
  await database.normalized_records.create_index("normalized.pin_code")
  await database.match_candidates.create_index("decision_zone")
  await database.ubid_registry.create_index("current_status")
  await database.review_queue.create_index("review_status")
  await database.activity_events.create_index([("ubid", 1), ("event_date", -1)])
  await database.audit_logs.create_index("timestamp")


async def seed_database(database: AsyncIOMotorDatabase) -> dict[str, int]:
  inserted: dict[str, int] = {}

  for collection_name, documents in SEED_COLLECTIONS.items():
    collection = database[collection_name]
    existing_count = await collection.count_documents({})
    if existing_count:
      inserted[collection_name] = 0
      continue

    if not documents:
      inserted[collection_name] = 0
      continue

    docs_to_insert = deepcopy(documents)
    result = await collection.insert_many(docs_to_insert)
    inserted[collection_name] = len(result.inserted_ids)

  await _ensure_indexes(database)
  return inserted
