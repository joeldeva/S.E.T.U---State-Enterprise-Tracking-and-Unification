from pydantic import BaseModel, Field
from fastapi import APIRouter

from ..services.data_assistant import answer_data_question

router = APIRouter(prefix="/assistant", tags=["data assistant"])


class AssistantRequest(BaseModel):
  message: str = Field(..., min_length=1, max_length=500)
  limit: int = Field(default=120, ge=1, le=500)


@router.post("/query")
async def query_data_assistant(request: AssistantRequest) -> dict:
  return answer_data_question(request.message, request.limit)
