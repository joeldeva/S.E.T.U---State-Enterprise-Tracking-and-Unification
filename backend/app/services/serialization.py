from datetime import date, datetime
from typing import Any

from bson import ObjectId


def serialize_document(value: Any) -> Any:
  if isinstance(value, ObjectId):
    return str(value)
  if isinstance(value, (datetime, date)):
    return value.isoformat()
  if isinstance(value, list):
    return [serialize_document(item) for item in value]
  if isinstance(value, dict):
    return {key: serialize_document(item) for key, item in value.items()}
  return value
