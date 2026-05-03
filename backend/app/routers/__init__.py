from fastapi import APIRouter

from .activity import router as activity_router
from .dashboard import router as dashboard_router
from .matching import router as matching_router
from .read_only import router as read_only_router
from .review import router as review_router

api_router = APIRouter()
api_router.include_router(activity_router)
api_router.include_router(dashboard_router)
api_router.include_router(matching_router)
api_router.include_router(read_only_router)
api_router.include_router(review_router)
