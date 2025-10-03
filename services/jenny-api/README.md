# Jenny Agentic AI - Node.js API Implementation

## Overview

This is the Node.js/TypeScript implementation of Jenny AI's API server, providing:
- **Vitals-first orchestration** - Facts from Postgres, narrative from Pinecone
- **Hybrid search** - Dense vectors (Pinecone) + Lexical (Postgres FTS)
- **Evidence-backed responses** - Every fact has source provenance
- **Analytics** - Tactic→outcome correlation matrix

## Architecture

```
User Query
    ↓
Query Rewriting (add student context)
    ↓
Vitals/Lifecycle Fetch (Postgres)
    ↓
Hybrid Search if needed (Pinecone + BM25)
    ↓
Re-ranking
    ↓
Evidence Resolution
    ↓
LLM Composition with Facts
```

## Setup

1. **Install dependencies:**
   ```bash
   cd services/jenny-api
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database and API credentials
   ```

3. **Set up database:**
   ```bash
   # Run migrations from packages/scripts/src/etl/jenny-v3/
   psql $DATABASE_URL -f ../../packages/scripts/src/etl/jenny-v3/001_universal_vitals_model.sql
   
   # Create FTS views
   psql $DATABASE_URL -f src/indexers/sql/lexical_sidecar.sql
   ```

4. **Run ETL to populate data:**
   ```bash
   cd ../../packages/scripts/src/etl/jenny-v3
   ./run_etl.sh $DATABASE_URL
   ```

## Running the Server

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm run build
npm start
```

## API Documentation

### Interactive API Documentation (Swagger UI)
The API documentation is available via Swagger UI at:
```
http://localhost:8787/docs
```

This provides:
- Interactive API exploration
- Request/response examples
- Schema definitions
- Try-it-out functionality

### API Endpoints

### 1. Get Student Vitals
```bash
GET /students/:id/vitals

curl http://localhost:8787/students/huda-2025/vitals
```

### 2. Get Lifecycle Items
```bash
GET /students/:id/lifecycle?domain=application

curl http://localhost:8787/students/huda-2025/lifecycle?domain=application
```

### 3. Search (Orchestrated)
```bash
POST /search
{
  "q": "how did we fix SAT slips?",
  "student_id": "huda-2025"
}

curl -X POST http://localhost:8787/search \
  -H "Content-Type: application/json" \
  -d '{"q":"how did we fix SAT slips?","student_id":"huda-2025"}'
```

### 4. Analytics - Tactic Outcomes
```bash
GET /analytics/tactic-outcomes?student_id=huda-2025

curl http://localhost:8787/analytics/tactic-outcomes?student_id=huda-2025
```

### 5. Resolve Evidence
```bash
GET /evidence?ids=ev123,ev456

curl http://localhost:8787/evidence?ids=ev123,ev456
```

## Reindexing

To build a fresh Pinecone index:

1. **Set API keys:**
   ```bash
   export PINECONE_API_KEY="your-key"
   export OPENAI_API_KEY="your-key"
   ```

2. **Run reindex script:**
   ```bash
   npm run reindex
   ```

   This will:
   - Create a timestamped index (e.g., `jenny-v3-20250930-1430`)
   - Refresh Postgres FTS materialized views
   - Build Pinecone namespaces (jtbd + interactions only)
   - Output the new index name to use

3. **Switch to new index:**
   ```bash
   export PINECONE_INDEX=jenny-v3-20250930-1430
   # Restart your server
   ```

4. **Archive old indexes:**
   ```bash
   # List all indexes
   tsx scripts/archive_old_indexes.ts list
   
   # Delete old ones
   tsx scripts/archive_old_indexes.ts delete jenny-v2-old1 jenny-v2-old2
   ```

## Clean Reindex Process

For a complete clean reindex:

```bash
# 1. Create new index with timestamp
export NODE_OPTIONS=--no-warnings
tsx scripts/create_clean_index.ts jenny-v3-$(date -u +%Y%m%d-%H%M) 3072

# 2. Set the new index name
export PINECONE_INDEX=jenny-v3-$(date -u +%Y%m%d-%H%M)

# 3. Refresh FTS views
psql "$DATABASE_URL" -c "SELECT refresh_fts();"

# 4. Run reindex
npm run reindex

# 5. Update your production env with new index name
```

## Testing

### Golden Queries
Test these queries to ensure correctness:

1. **Fact retrieval:**
   ```bash
   curl http://localhost:8787/students/huda-2025/vitals | jq '.facts[0]'
   ```

2. **Search with evidence:**
   ```bash
   curl -X POST http://localhost:8787/search \
     -H "Content-Type: application/json" \
     -d '{"q":"What was the final SAT score?","student_id":"huda-2025"}' \
     | jq '.chips'
   ```

3. **Lifecycle tracking:**
   ```bash
   curl http://localhost:8787/students/huda-2025/lifecycle?domain=application \
     | jq '.[0]'
   ```

## Key Principles

1. **Facts stay in Postgres** - Never store facts/outcomes in vector DB
2. **Evidence required** - Every factual claim needs source_id
3. **Vitals first** - Always fetch facts before narrative search
4. **Clean indexes** - Never reuse old Pinecone indexes

## Troubleshooting

### Database connection issues:
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1"
```

### Missing embeddings:
- Ensure OPENAI_API_KEY is set
- Check model dimension matches index (3072 for text-embedding-3-large)

### FTS not working:
```bash
# Refresh materialized views
psql "$DATABASE_URL" -c "SELECT refresh_fts();"
```

## Environment Variables

Required:
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` - Postgres connection
- `PINECONE_API_KEY` - Pinecone API access
- `OPENAI_API_KEY` - For embeddings and LLM composition

Optional:
- `DEFAULT_STUDENT_ID` - Default student for queries (default: huda-2025)
- `PORT` - Server port (default: 8787)
- `API_KEY` - API key for authentication (if set, required on all endpoints except /health)