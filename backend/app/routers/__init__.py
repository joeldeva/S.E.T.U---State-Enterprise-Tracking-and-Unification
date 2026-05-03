from fastapi import APIRouter

from .dashboard import router as dashboard_router
from .read_only import router as read_only_router

api_router = APIRouter()
api_router.include_router(dashboard_router)
api_router.include_router(read_only_router)
