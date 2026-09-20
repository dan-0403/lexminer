from app.ai.embedding_model import model

def generate_embedding(text: str):

    return model.encode(text).tolist()