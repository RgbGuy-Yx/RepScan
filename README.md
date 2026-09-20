# RepScan

AI-powered business intelligence platform that ingests, retrieves, and analyzes company data from multiple sources.

## Architecture

```
frontend/       → React + Vite + Tailwind (Port 5173)
backend/        → Node.js + TypeScript + Express (Port 3000)
ai-service/     → Python + FastAPI + uv (Port 8000)
```

- **Backend (Node.js)**: Main API, PostgreSQL, business logic
- **AI Service (Python)**: ChromaDB, embeddings, AI analysis
- **Frontend (React)**: User interface

## Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

## Setup

### 1. Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env  # Edit with your DATABASE_URL
npm run dev
```

### 2. Database Migration

Apply the database schema (requires a running PostgreSQL instance):

```bash
cd backend
psql $DATABASE_URL -f src/database/migrations/002_business_platform_tables.sql
```

### 3. AI Service (Python)

```bash
cd ai-service
uv sync
cp .env.example .env  # Edit with your API keys
uv run uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Backend (Node.js) — Port 3000

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check (PostgreSQL + AI Service) |
| GET | `/api/v1/businesses` | List all businesses |
| POST | `/api/v1/businesses` | Create a business |
| GET | `/api/v1/businesses/:id` | Get a business by ID |
| PUT | `/api/v1/businesses/:id` | Update a business |
| GET | `/api/v1/businesses/:id/platforms` | List platform connections for a business |
| POST | `/api/v1/businesses/:id/platforms` | Connect a platform to a business |
| PATCH | `/api/v1/businesses/:id/platforms/:platformId` | Update a platform connection |
| POST | `/api/v1/businesses/:id/platforms/:platformId/scrape` | Ingest Google Reviews and process new feedback |
| GET | `/api/v1/businesses/:id/analytics/weekly` | Weekly analytics comparison & meaningful changes |
| POST | `/api/v1/businesses/:id/briefs/generate` | Generate weekly intelligence brief |
| GET | `/api/v1/businesses/:id/briefs/latest` | Get latest weekly brief |
| GET | `/api/v1/businesses/:id/briefs/:briefId` | Get brief by ID |
| GET | `/api/v1/businesses/:id/briefs` | List weekly briefs with pagination |
| POST | `/api/v1/businesses/:id/chat` | Hybrid RAG chat with Show Proof evidence & strict grounding |

#### Supported Platforms

- `google`
- `instagram`
- `linkedin`

#### Request/Response Examples

**Create a business**

```bash
POST /api/v1/businesses
Content-Type: application/json

{
  "name": "Acme Corp",
  "description": "A leading manufacturer"
}
```

Response (201):

```json
{
  "status": "success",
  "data": {
    "id": "b0e1f2a4-...",
    "name": "Acme Corp",
    "description": "A leading manufacturer",
    "created_at": "2026-08-10T12:00:00.000Z",
    "updated_at": "2026-08-10T12:00:00.000Z"
  }
}
```

**Get a business**

```bash
GET /api/v1/businesses/:id
```

Response (200):

```json
{
  "status": "success",
  "data": {
    "id": "b0e1f2a4-...",
    "name": "Acme Corp",
    "description": "A leading manufacturer",
    "created_at": "2026-08-10T12:00:00.000Z",
    "updated_at": "2026-08-10T12:00:00.000Z"
  }
}
```

**Connect a platform**

```bash
POST /api/v1/businesses/:id/platforms
Content-Type: application/json

{
  "platform": "google",
  "source_url": "https://maps.google.com/acme-corp",
  "external_id": "optional-external-id"
}
```

Response (201):

```json
{
  "status": "success",
  "data": {
    "id": "c1d2e3f4-...",
    "business_id": "b0e1f2a4-...",
    "platform": "google",
    "source_url": "https://maps.google.com/acme-corp",
    "external_id": "optional-external-id",
    "is_active": true,
    "last_scraped_at": null,
    "created_at": "2026-08-10T12:00:00.000Z",
    "updated_at": "2026-08-10T12:00:00.000Z"
  }
}
```

**Update platform connection**

```bash
PATCH /api/v1/businesses/:id/platforms/:platformId
Content-Type: application/json

{
  "is_active": false
}
```

Response (200):

```json
{
  "status": "success",
  "data": {
    "id": "c1d2e3f4-...",
    "business_id": "b0e1f2a4-...",
    "platform": "google",
    "source_url": "https://maps.google.com/acme-corp",
    "is_active": false,
    "last_scraped_at": null,
    "created_at": "2026-08-10T12:00:00.000Z",
    "updated_at": "2026-08-10T12:05:00.000Z"
  }
}
```

**Error responses**

```json
{
  "status": "error",
  "message": "Business not found"
}
```

```json
{
  "status": "error",
  "message": "Validation error: Platform must be one of: google, instagram, linkedin"
}
```

```json
{
  "status": "error",
  "message": "Platform 'google' is already connected to this business"
}
```

### AI Service (Python) — Port 8000

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check (ChromaDB + AI config) |
| POST | `/api/v1/feedback/process` | Analyze and Voyage-index a batch of saved feedback |
| POST | `/api/v1/briefs/summarize` | Generate grounded weekly brief summary with Mistral |
| POST | `/api/v1/chat` | LangGraph hybrid RAG chat with ChromaDB & Mistral |
| GET | `/docs` | OpenAPI documentation |

## Development

```bash
# Run all services in separate terminals:
cd backend && npm run dev
cd ai-service && uv run uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

## Testing

```bash
cd backend
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://postgres:postgres@localhost:5432/repscan` |
| `AI_SERVICE_URL` | Python AI service URL | `http://localhost:8000` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173` |
| `APIFY_API_TOKEN` | Apify API token | (empty) |
| `APIFY_GOOGLE_REVIEWS_ACTOR_ID` | Google Reviews Apify actor ID | (empty) |

### AI Service (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment | `development` |
| `PORT` | Server port | `8000` |
| `CHROMA_PATH` | ChromaDB storage path | `./chroma_db` |
| `MISTRAL_API_KEY` | Mistral AI API key | (empty) |
| `VOYAGE_API_KEY` | Voyage AI API key | (empty) |
| `APIFY_API_TOKEN` | Apify API token | (empty) |
| `MISTRAL_MODEL` | Structured-analysis model | `mistral-small-latest` |
| `VOYAGE_MODEL` | Document embedding model | `voyage-3.5-lite` |

## Project Structure

```
Repscan/
├── frontend/              # React frontend
├── backend/               # Node.js API
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/   # Request handlers
│   │   ├── database/      # Migrations
│   │   │   └── migrations/
│   │   ├── middleware/     # Express middleware
│   │   ├── repositories/  # Data access layer (SQL queries)
│   │   ├── routes/        # API routes
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── services/      # Business logic
│   │   └── __tests__/     # Unit tests
│   ├── package.json
│   └── tsconfig.json
├── ai-service/            # Python AI service
│   ├── app/
│   │   ├── api/           # FastAPI routes
│   │   ├── config/        # Configuration
│   │   └── services/      # AI services
│   └── pyproject.toml
├── .gitignore
└── README.md
```
