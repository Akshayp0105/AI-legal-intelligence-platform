"""Supabase storage client for file uploads and retrieval."""

import os
from supabase import create_client, Client
from core.logging import get_logger

logger = get_logger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", ""))

# Ensure URL and KEY are present to avoid instantiation errors if they are empty
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}")

async def upload_file_to_supabase(file_path: str, bucket: str, destination_path: str, content_type: str) -> str:
    """
    Uploads a file to Supabase storage and returns the public URL.
    """
    if not supabase:
        raise Exception("Supabase client is not initialized.")
        
    with open(file_path, "rb") as f:
        res = supabase.storage.from_(bucket).upload(
            file=f,
            path=destination_path,
            file_options={"content-type": content_type}
        )
        
    # Get public url
    public_url = supabase.storage.from_(bucket).get_public_url(destination_path)
    return public_url
