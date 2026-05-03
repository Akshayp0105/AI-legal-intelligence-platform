from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.qdrant import init_qdrant

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources
    print("Starting up LexAI API...")
    init_qdrant()
    yield
    # Shutdown: Clean up resources
    print("Shutting down LexAI API...")

app = FastAPI(
    title="LexAI API",
    description="Backend API for LexAI Legal Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
origins = [
    "http://localhost:3000",
    # Add other production origins here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Placeholder for router registration
# from api.v1.router import api_router
# app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "LexAI API is running"}
