from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from fastapi import Depends

router = APIRouter()


@router.get("/database-test")
def database_test(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"message": "Database Connected Successfully"}