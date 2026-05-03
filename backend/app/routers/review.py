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
