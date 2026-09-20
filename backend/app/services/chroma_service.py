from app.chroma.chroma_collection import collection

from app.ai.embedding_service import generate_embedding

def add_case(
    case_id,
    text
):

    embedding = generate_embedding(text)

    collection.add(

        ids=[case_id],

        embeddings=[embedding],

        documents=[text]

    )