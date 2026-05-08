import asyncio
import os
import sys
from dotenv import load_dotenv

# Ensure the correct path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Check if GOOGLE_API_KEY is loaded correctly
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

from core.intent_classifier import classify_intent

async def main():
    queries = [
        "Hi, how are you?",
        "My friend got arrested for murder and the police filed an FIR.",
        "How do I register a private limited company in India?",
        "I have a problem."
    ]
    
    for q in queries:
        print(f"--- Testing Query: '{q}' ---")
        intent = await classify_intent(q)
        print(intent.model_dump_json(indent=2))
        print("\n")

if __name__ == "__main__":
    asyncio.run(main())
