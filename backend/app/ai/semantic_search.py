from app.ai.embedding_service import generate_embedding

from app.chroma.chroma_collection import collection

def semantic_search(query):

    embedding = generate_embedding(query)

    results = collection.query(

        query_embeddings=[embedding],

        n_results=5

    )

    return results