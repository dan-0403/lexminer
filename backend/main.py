from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings

from app.core.database import Base
from app.core.database import engine
from app.core.database import SessionLocal

from app.core.admin_seeder import AdminSeeder

from app.services.dataset_import_job_service import DatasetImportJobService

from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.user import router as user_router
from app.routers.visitor_log import router as visitor_log_router
from app.routers.case_collection import router as case_collection_router
from app.routers.user_profile import router as user_profile_router
from app.routers.account_settings import router as account_settings_router
from app.routers.bookmark import router as bookmark_router

from app.api.router import api_router


# =====================================================
# DATABASE TABLE INITIALIZATION
# =====================================================

Base.metadata.create_all(bind=engine)


# =====================================================
# APPLICATION LIFESPAN
# =====================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    db = SessionLocal()

    try:
        # -------------------------------------------------
        # ADMIN ACCOUNT INITIALIZATION
        # -------------------------------------------------

        AdminSeeder.create_admin(db)

        # -------------------------------------------------
        # RECOVER INTERRUPTED DATASET IMPORT JOBS
        # -------------------------------------------------

        job_service = DatasetImportJobService(db)

        recovered_jobs = job_service.recover_interrupted_jobs()

        if recovered_jobs > 0:
            print(
                f"✓ Recovered {recovered_jobs} "
                f"interrupted dataset import job(s)."
            )
        else:
            print("✓ No interrupted dataset import jobs found.")

    except Exception as exc:
        db.rollback()
        print(
            f"✗ Application startup initialization error: {exc}"
        )

    finally:
        db.close()

    yield


# =====================================================
# FASTAPI APPLICATION
# =====================================================

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    lifespan=lifespan,
)


# =====================================================
# PROFILE PICTURE DIRECTORY
# =====================================================

settings.resolved_profile_picture_directory.mkdir(
    parents=True,
    exist_ok=True,
)


app.mount(
    "/uploads/profile_pictures",
    StaticFiles(
        directory=str(
            settings.resolved_profile_picture_directory
        ),
    ),
    name="profile-pictures",
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# API ROUTES
# =====================================================

app.include_router(api_router)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(user_router)
app.include_router(visitor_log_router)
app.include_router(case_collection_router)
app.include_router(user_profile_router)
app.include_router(account_settings_router)
app.include_router(bookmark_router)


# =====================================================
# ROOT
# =====================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to LegalAI Backend",
        "status": "Running",
    }


# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/health")
def health():
    return {
        "status": "Healthy",
    }


# =====================================================
# API TEST
# =====================================================

@app.get("/api/v1/test")
def test_api():
    return {
        "message": "Backend Connected Successfully!",
    }