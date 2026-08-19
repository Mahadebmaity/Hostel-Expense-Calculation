from fastapi import APIRouter
from app.api.v1 import auth, groups, expenses, meals, settlements, reports, admin

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(groups.router)
api_router.include_router(expenses.router)
api_router.include_router(meals.router)
api_router.include_router(settlements.router)
api_router.include_router(reports.router)
api_router.include_router(admin.router)

@api_router.get("/health")
def health_check():
    return {"status": "ok", "healthy": True}

