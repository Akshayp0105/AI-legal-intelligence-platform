# LexAI - AI Legal Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

> AI-powered legal document drafting and analysis platform for Indian courts.

Last updated: 2026-06-18

## Overview

LexAI provides AI-powered legal services for the Indian legal system, including document analysis, precedent search, legal argument generation, and document drafting.

## Features

- **Legal Document Analysis** - AI-powered analysis of legal documents and scenarios
- **Multi-language Support** - English, Malayalam, and Hindi voice input
- **Precedent Search** - Search Indian Kanoon for relevant case law
- **Legal Argument Generation** - AI-generated arguments for both sides
- **Gap Analysis** - Identify missing evidence and legal gaps
- **Case Strength Prediction** - Score cases on multiple factors
- **Document Drafting** - Generate legal notices, FIRs, bail applications, and more
- **Real-time Streaming** - SSE-based streaming responses

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, SQLAlchemy, Alembic |
| Database | PostgreSQL 15 (pgvector), Redis 7.2, Qdrant |
| AI | Google Gemini (analysis, embeddings, drafting) |
| Auth | Clerk |
| Storage | Supabase |
| Infrastructure | Docker Compose |

## Quick Start

### Using Docker (Recommended)

```bash
git clone https://github.com/Akshayp0105/AI-legal-intelligence-platform.git
cd AI-legal-intelligence-platform
cp .env.example .env
docker compose --profile dev up -d
```

- **Web App:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **MailHog:** http://localhost:8025

### Manual Setup

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/analysis/analyze` | Analyze a legal query |
| POST | `/api/v1/analysis/analyze/stream` | Stream analysis (SSE) |
| POST | `/api/v1/documents/upload` | Upload legal documents |
| POST | `/api/v1/knowledge/search` | Search legal knowledge base |
| GET | `/api/v1/precedents/search` | Search court precedents |
| POST | `/api/v1/precedents/analyze` | Analyze similar cases |
| POST | `/api/v1/arguments/generate` | Generate legal arguments |
| POST | `/api/v1/gaps/analyze` | Analyze legal gaps |
| POST | `/api/v1/analytics/predict` | Predict case strength |
| GET | `/api/v1/analytics/dashboard` | Dashboard analytics |
| POST | `/api/v1/drafting/generate` | Generate legal documents |
| POST | `/api/v1/drafting/improve` | Improve existing draft |
| POST | `/api/v1/drafting/translate` | Translate legal document |
| POST | `/api/v1/feedback` | Submit feedback |
| GET | `/api/v1/cases` | List cases |
| GET | `/health` | Health check with dependencies |

## Project Structure

```
legal_ai/
├── apps/
│   ├── api/              # FastAPI backend
│   │   ├── api/routes/   # Endpoint routers
│   │   ├── core/         # Infrastructure layer
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   └── web/              # Next.js frontend
│       ├── app/          # Pages and routes
│       ├── components/   # React components
│       ├── hooks/        # Custom hooks
│       └── store/        # Zustand state
├── packages/shared/      # Shared utilities
└── docker-compose.yml    # Docker orchestration
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
