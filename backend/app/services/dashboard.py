from motor.motor_asyncio import AsyncIOMotorDatabase

from .serialization import serialize_document


async def _count_by_field(database: AsyncIOMotorDatabase, collection: str, field: str) -> list[dict]:
  pipeline = [
    {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
    {"$sort": {"_id": 1}},
  ]
  return [{"label": row["_id"], "count": row["count"]} async for row in database[collection].aggregate(pipeline)]


async def build_dashboard_summary(database: AsyncIOMotorDatabase) -> dict:
  departments = await database.source_records.distinct("department")
  status_breakdown = await _count_by_field(database, "ubid_registry", "current_status")
  department_counts = await _count_by_field(database, "source_records", "department")

  auto_linked = await database.match_candidates.count_documents({"decision_zone": "auto_link"})
  pending_reviews = await database.review_queue.count_documents({"review_status": "pending"})
  unmatched_events = await database.activity_events.count_documents({"ubid": None})

  confidence_distribution = [
    {"range": "90-100", "count": await database.match_candidates.count_documents({"confidence": {"$gte": 90}})},
    {"range": "65-89", "count": await database.match_candidates.count_documents({"confidence": {"$gte": 65, "$lt": 90}})},
    {"range": "0-64", "count": await database.match_candidates.count_documents({"confidence": {"$lt": 65}})},
  ]

  return {
    "metrics": {
      "total_source_records": await database.source_records.count_documents({}),
      "departments_connected": len(departments),
      "ubids_generated": await database.ubid_registry.count_documents({}),
      "auto_linked_records": auto_linked,
      "pending_human_reviews": pending_reviews,
      "unmatched_activity_events": unmatched_events,
    },
    "status_breakdown": status_breakdown,
    "department_counts": department_counts,
    "confidence_distribution": confidence_distribution,
    "pending_review_priority": [
      serialize_document(review)
      async for review in database.review_queue.find({"review_status": "pending"}).sort("confidence", -1).limit(5)
    ],
    "governance": {
      "synthetic_data_only": True,
      "source_system_change_required": False,
      "hosted_llm_identity_matching": False,
      "automated_decisions_explainable": True,
      "merges_reversible": True,
    },
  }
