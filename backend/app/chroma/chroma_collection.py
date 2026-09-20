from app.chroma.chroma_client import client

collection = client.get_or_create_collection(
    name="supreme_court_cases"
)