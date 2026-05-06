import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", ""))

# Ensure URL and KEY are present to avoid instantiation errors if they are empty
if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

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
