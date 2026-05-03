import os
from qdrant_client import QdrantClient
from qdrant_client.http import models

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)

COLLECTION_NAME = "legal_knowledge"
# Gemini text-embedding-004 has an output dimension of 768
VECTOR_SIZE = 768

# Synchronous client for initialization (Qdrant also supports async if needed)
qdrant_client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)

def init_qdrant():
    """Initialize Qdrant collection if it does not exist."""
    try:
        collections = qdrant_client.get_collections().collections
        collection_names = [col.name for col in collections]
        
        if COLLECTION_NAME not in collection_names:
            print(f"Creating Qdrant collection: {COLLECTION_NAME}")
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=VECTOR_SIZE,
                    distance=models.Distance.COSINE
                )
            )
            print(f"Collection {COLLECTION_NAME} created successfully.")
        else:
            print(f"Collection {COLLECTION_NAME} already exists.")
    except Exception as e:
        print(f"Failed to initialize Qdrant: {e}")
