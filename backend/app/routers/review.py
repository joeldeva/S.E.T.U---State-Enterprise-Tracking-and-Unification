from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..db import get_database
from ..services.reviewer import apply_review_decision

router = APIRouter(tags=["review workflow"])

ReviewDecision = Literal[
  "approve_merge",
  "reject_match",
  "create_new_ubid",
  "attach_to_existing_ubid",
  "mark_insufficient_data",
]


class ReviewDecisionRequest(BaseModel):
  decision: ReviewDecision
  reviewer: str = Field(default="Reviewer Demo", min_length=1)
  reason: str = Field(min_length=1)
  existing_ubid: str | None = None
  source_record_id: str | None = None


@router.post("/review-queue/{case_id}/decision")
async def decide_review_case(case_id: str, payload: ReviewDecisionRequest) -> dict:
  return await apply_review_decision(
    database=get_database(),
    case_id=case_id,
    decision=payload.decision,
    reviewer=payload.reviewer,
    reason=payload.reason,
    existing_ubid=payload.existing_ubid,
    source_record_id=payload.source_record_id,
  )


@router.get("/review-feedback/summary")
async def get_review_feedback_summary() -> dict:
  database = get_database()
  approved = await database.audit_logs.count_documents({"action": "approve_merge"})
  rejected = await database.audit_logs.count_documents({"action": "reject_match"})
  insufficient = await database.audit_logs.count_documents({"action": "mark_insufficient_data"})

  return {
    "total_decisions": 42 + approved + rejected + insufficient,
    "approved_matches": 26 + approved,
    "rejected_matches": 11 + rejected,
    "insufficient_data": 5 + insufficient,
    "top_positive_patterns": [
      "same PIN + high name similarity + licence match",
      "same address + same owner name",
    ],
    "top_negative_patterns": [
      "same name but different PIN",
      "same address but conflicting GSTIN/PAN",
    ],
    "system_learning_status": "Simulated feedback loop for prototype",
  }
