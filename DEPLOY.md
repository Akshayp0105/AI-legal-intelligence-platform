# Deployment Guide

This guide covers deploying LexAI to production.

## Prerequisites

- Docker and Docker Compose v2+
- A domain name with SSL certificates
- API keys for: Gemini, Clerk, Supabase

## Environment Variables

Copy `.env.example` and configure all required variables:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

## Docker Production Build

```bash
# Build and start all services
docker compose up -d --build

# Or build individual services
docker compose build api
docker compose build web
```

## Production Docker Compose

For production, use the main `docker-compose.yml` with production overrides:

```bash
# Set environment variables in .env for production
# Then deploy with:
docker compose up -d --build
```

For a production setup with nginx reverse proxy, create a `docker-compose.prod.yml`:

```yaml
services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: always

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    command: npm run start
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api
      - web
    restart: always
```

**Note:** The `nginx.conf` file is not included in the repository. Create it based on your domain and SSL configuration before deploying.

## SSL/TLS Configuration

Use Certbot for free SSL certificates:

```bash
certbot certonly --standalone -d yourdomain.com
```

## Database Migrations

```bash
# Run migrations before starting the app
docker compose exec api alembic upgrade head
```

## Health Checks

Verify the deployment:

```bash
# API health check
curl https://yourdomain.com/health

# Check pool status
curl https://yourdomain.com/api/pool
```

## Monitoring

- **API Health:** `GET /health` - returns status of all dependencies
- **Pool Status:** `GET /api/pool` - database connection pool metrics
- **API Info:** `GET /api/info` - version and metadata

## Backup

```bash
# Database backup
docker compose exec postgres pg_dump -U postgres lexaidb > backup.sql

# Restore
docker compose exec postgres psql -U postgres lexaidb < backup.sql
```

## Scaling

To scale the API:

```bash
docker compose up -d --scale api=3
```

Use a load balancer (nginx, HAProxy) in front of multiple API instances.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection refused | Check PostgreSQL container is running |
| Redis connection refused | Check Redis container is running |
| Qdrant connection refused | Check Qdrant container is running |
| Clerk auth failing | Verify environment variables |
| High memory usage | Reduce pool_size or add workers |
| API not starting | Check logs with `docker compose logs api` |
| Web build failing | Clear node_modules and reinstall |
