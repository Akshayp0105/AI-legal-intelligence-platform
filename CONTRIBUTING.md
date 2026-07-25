# Contributing to LexAI

Thank you for your interest in contributing to LexAI! This guide will help you get started.

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Getting Started

1. Clone the repository:

```bash
git clone https://github.com/Akshayp0105/AI-legal-intelligence-platform.git
cd AI-legal-intelligence-platform
```

2. Copy environment variables:

```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start development services:

```bash
docker compose --profile dev up -d
```

4. Install API dependencies:

```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

5. Install web dependencies:

```bash
cd apps/web
npm install
```

6. Run database migrations:

```bash
cd apps/api
alembic upgrade head
```

### Running the Apps

**API Server:**

```bash
cd apps/api
uvicorn main:app --reload --port 8000
```

**Web Server:**

```bash
cd apps/web
npm run dev
```

## Project Structure

```
legal_ai/
├── apps/
│   ├── api/          # FastAPI backend
│   │   ├── api/      # Route handlers
│   │   ├── core/     # Infrastructure (DB, auth, AI)
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── services/ # Business logic
│   └── web/          # Next.js frontend
│       ├── app/      # Pages and routes
│       ├── components/ # React components
│       ├── hooks/    # Custom React hooks
│       └── store/    # Zustand state management
└── packages/
    └── shared/       # Shared utilities
```

## Code Style

### Python (API)

- Follow PEP 8
- Use type hints
- Use async/await for database operations
- Keep functions focused and small
- Use `core.logging.get_logger()` for logging (not `logging.getLogger()`)
- Run `ruff check .` and `ruff format --check .` before committing

### TypeScript (Web)

- Use TypeScript strict mode
- Follow ESLint configuration
- Use functional components with hooks
- Keep components under 300 lines
- Run `npm run lint` and `npx tsc --noEmit` before committing

## Testing

### API Tests

```bash
cd apps/api
pytest
```

### Frontend Lint

```bash
cd apps/web
npm run lint
```

## Commit Messages

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test locally
4. Submit a pull request with a clear description

## Questions?

Open an issue on GitHub for any questions or discussions.

---

*Last updated: 2026-07-25*
