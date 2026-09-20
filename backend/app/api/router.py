from fastapi import APIRouter
import app.api.endpoints.test_db as test_db
import app.api.endpoints.chroma_test as chroma_test

api_router = APIRouter()

api_router.include_router(test_db.router)
api_router.include_router(chroma_test.router)