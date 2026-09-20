from fastapi import APIRouter

from app.services.chroma_service import add_case

from app.ai.semantic_search import semantic_search

router = APIRouter()

@router.get("/chroma-test")

def chroma_test():

    add_case(

        "1",

        "The accused intentionally killed the victim."

    )

    results = semantic_search("murder")

    return results