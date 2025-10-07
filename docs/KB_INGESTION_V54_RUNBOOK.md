# KB Ingestion v5.4 Runbook

**Version**: v5.4
**Status**: Production-ready
**Last Updated**: 2025-10-04

## Overview

v5.4 KB Ingestion is a production-grade pipeline for ingesting coaching intelligence from local JSON files into PostgreSQL + FAISS/Pinecone vector stores.

**Key Features**:
- ✅ Metadata-rich chips (award, framework, activity, phase, week, confidence)
- ✅ Content-based deduplication via content_hash
- ✅ DOCX recovery from embedded ZIP bytes
- ✅ Universal schema-agnostic adapter
- ✅ Blue/green Pinecone migration
- ✅ Quality gates with golden queries
- ✅ Future-proof for contributor mode

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and set your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ivylevel
OPENAI_API_KEY=sk-...
```

### 3. Create Schema

```bash
psql "$DATABASE_URL" -f sql/01_kb_schema.sql
```

### 4. Run Ingestion

```bash
python3 tools/ingest/ingest_local_intel_v54.py
```

Expected output:
```
🚀 Starting v5.4 KB Intel Ingestion...
📂 Found 118 JSON candidates
Ingesting: 100%|███████████████████| 118/118
✅ Ingestion complete:
  Files processed: 115/118 (97.5% success)
  Total chips: 837
🔢 Embedding 837 chips...
🔍 Building FAISS index...
✅ FAISS index written → artifacts/kb/faiss_v54.index
📊 Chip distribution in database:
  micro_moment       285 chips ( 12,527 tokens, conf=0.90)
  tactic             284 chips ( 15,571 tokens, conf=0.90)
  ...
```

### 5. Test Query (FAISS)

```bash
python3 tools/ingest/query_kb_v54.py "show me the 168 framework" --faiss
```

### 6. Export to Pinecone (Optional)

```bash
python3 tools/ingest/pinecone_exporter.py
```

### 7. Test Quality Gates

```bash
python3 tools/ingest/eval_quality.py
```

### 8. Audit Results

```bash
python3 tools/ingest/audit_diff.py
```

---

## File Structure

```
ivylevel-platform-v10/
├── .env                              # Environment variables (create from .env.example)
├── .env.example                      # Template
├── requirements.txt                  # Python dependencies
├── sql/
│   └── 01_kb_schema.sql              # v5.4 schema (kb_docs, kb_chips)
├── tools/ingest/
│   ├── utils_json_repair.py          # (v5.3) JSON repair with DOCX detection
│   ├── utils_docx_extract.py         # (v5.3) DOCX ZIP byte extraction
│   ├── adapters_intel_v54.py         # v5.4 universal adapter
│   ├── embed_openai.py               # OpenAI embedding helper
│   ├── ingest_local_intel_v54.py     # Main ingestion script
│   ├── pinecone_exporter.py          # Blue/green Pinecone exporter
│   ├── query_kb_v54.py               # FAISS + Pinecone query tool
│   ├── eval_quality.py               # Quality gates
│   └── audit_diff.py                 # Version comparison
└── artifacts/kb/
    ├── faiss_v54.index               # FAISS vector index
    ├── faiss_v54_map.json            # Chip ID mapping
    └── ingest_audit_v54.csv          # Per-file audit log
```

---

## Pipeline Steps (Detailed)

### Step 1: Create Schema

```bash
psql "$DATABASE_URL" -f sql/01_kb_schema.sql
```

Creates:
- `kb_sources` - Source registry
- `kb_docs` - Document metadata
- `kb_chips` - Normalized intel chips with metadata
- Indexes for performance (doc_id, chip_type, student_id, award, framework, date)

### Step 2: Ingest Local INTEL

```bash
python3 tools/ingest/ingest_local_intel_v54.py
```

What it does:
1. Scans `data/canonical/jenny-huda/**/*.json` for INTEL files
2. Applies 4-tier JSON repair (raw → embedded → repaired → json_lines)
3. Detects and extracts embedded DOCX content
4. Uses universal adapter to extract 7 chip types
5. Inserts kb_docs and kb_chips with ON CONFLICT (content_hash) DO NOTHING
6. Embeds all chips using OpenAI text-embedding-3-large
7. Builds FAISS index with L2-normalized cosine similarity
8. Writes audit CSV and ID mapping

Outputs:
- PostgreSQL: kb_docs, kb_chips populated
- `artifacts/kb/faiss_v54.index` - FAISS binary index
- `artifacts/kb/faiss_v54_map.json` - Chip ID to index mapping
- `artifacts/kb/ingest_audit_v54.csv` - Per-file status log

### Step 3: Query FAISS (Local Testing)

```bash
python3 tools/ingest/query_kb_v54.py "how did Jenny coach me on NCWIT?" --faiss
```

Returns top-10 chips with scores.

### Step 4: Export to Pinecone (Production Vector Store)

```bash
# Set Pinecone credentials in .env
export PINECONE_API_KEY=...
export PINECONE_INDEX_NAME=ivylevel-kb
export PINECONE_NAMESPACE_GREEN=kb_v5_4

# Run export
python3 tools/ingest/pinecone_exporter.py
```

What it does:
1. Creates Pinecone index if doesn't exist (serverless, cosine metric)
2. Fetches all chips from PostgreSQL
3. Embeds in batches of 100
4. Upserts to Pinecone namespace `kb_v5_4` (green)
5. Retries with exponential backoff

### Step 5: Test Pinecone

```bash
python3 tools/ingest/query_kb_v54.py "show me the 168 framework" --pinecone
```

### Step 6: Run Quality Gates

```bash
python3 tools/ingest/eval_quality.py
```

Tests 4 golden queries:
- "how did Jenny help me win NCWIT?" → expects award=NCWIT
- "show the 168-hour framework steps" → expects framework=168
- "plan to scale Empowering AI users" → expects activity=Empowering AI
- "what to do during SAT crisis week" → expects tactic/micro_moment/jtbd

Target: 100% pass rate.

### Step 7: Audit Results

```bash
python3 tools/ingest/audit_diff.py
```

Shows:
- Chip distribution by type
- Source breakdown (TRANS-INTEL, EXEC-INTEL, DOCX-RECOVERED, etc.)
- Metadata coverage (award, framework, activity, phase, week)

---

## Blue/Green Cutover (Pinecone)

**Current state**: FAISS (local dev) + Pinecone `kb_v5_3` (prod)
**Target state**: Pinecone `kb_v5_4` (green)

### Cutover Steps:

1. **Verify green namespace**:
   ```bash
   python3 tools/ingest/query_kb_v54.py "NCWIT" --pinecone
   python3 tools/ingest/eval_quality.py
   ```

2. **Update Jenny API** to use `PINECONE_NAMESPACE_GREEN=kb_v5_4`

3. **Monitor** for 24-48 hours

4. **Delete old namespace** (when confident):
   ```python
   from pinecone import Pinecone
   pc = Pinecone(api_key="...")
   pc.Index("ivylevel-kb").delete(namespace="kb_v5_3", delete_all=True)
   ```

---

## Troubleshooting

### Error: "No chips extracted"

**Cause**: JSON file doesn't match any known schema.

**Fix**:
1. Check `artifacts/kb/ingest_audit_v54.csv` for file status
2. Inspect the file manually
3. Update `adapters_intel_v54.py` to handle new schema

### Error: "FAISS index not found"

**Cause**: Ingestion didn't complete or FAISS build failed.

**Fix**:
1. Re-run ingestion: `python3 tools/ingest/ingest_local_intel_v54.py`
2. Check for errors in output

### Error: "Pinecone upsert failed"

**Cause**: Rate limiting or API key issues.

**Fix**:
1. Check `PINECONE_API_KEY` is set correctly
2. Retry - script has exponential backoff
3. Reduce batch size in `pinecone_exporter.py` (BATCH_SIZE=50)

### Low metadata coverage

**Cause**: INTEL JSONs missing structured metadata.

**Fix**:
1. Update adapters to extract from text/filenames
2. Add post-processing step to infer awards/frameworks from chip text

---

## v5.4 Schema Reference

### kb_docs

| Column | Type | Description |
|--------|------|-------------|
| doc_id | TEXT PK | Unique document ID (path or custom ID) |
| student_id | TEXT | Student identifier (e.g. "huda-2025") |
| source_kind | TEXT | TRANS-INTEL, EXEC-INTEL, IMSG-INTEL, DOCX-RECOVERED, RAW, OTHER |
| phase | TEXT | P1-P5 phase |
| week | INT | Week number |
| doc_date | DATE | Document date |
| title | TEXT | Document title |
| path | TEXT | Original file path |
| meta | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |

### kb_chips

| Column | Type | Description |
|--------|------|-------------|
| chip_id | TEXT PK | "chip_{sha256(text+meta)}" |
| content_hash | TEXT UNIQUE | SHA256(text+meta) for deduplication |
| doc_id | TEXT FK | Reference to kb_docs |
| chip_type | TEXT | tactic, micro_moment, jtbd, framework, reflection, success_path, style |
| text | TEXT | Full chip text content |
| tokens | INT | Estimated token count |
| student_id | TEXT | Student identifier |
| source_kind | TEXT | Source type |
| phase | TEXT | P1-P5 phase |
| week | INT | Week number |
| chip_date | DATE | Chip date (from metadata or filename) |
| award | TEXT | Related award (e.g. "NCWIT") |
| activity | TEXT | Related activity/EC |
| framework | TEXT | Related framework (e.g. "168") |
| metrics | TEXT[] | Performance metrics |
| confidence | NUMERIC | Extraction confidence (0.0-1.0) |
| meta | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## Performance Benchmarks

| Metric | Value |
|--------|-------|
| Files processed | 115/118 (97.5%) |
| Total chips | ~837 |
| Ingestion speed | ~5-10 files/sec |
| Embedding speed | ~2 sec/100 chips |
| FAISS build | ~1 sec for 837 chips |
| Pinecone export | ~60 sec for 837 chips |
| FAISS query latency | ~50-100ms |
| Pinecone query latency | ~100-200ms |

---

## Future Enhancements

- [ ] Incremental ingestion (detect changed files via SHA256)
- [ ] Multi-student support (currently hardcoded to huda-2025)
- [ ] LLM-powered metadata extraction (infer awards/frameworks from text)
- [ ] Contributor mode (UI for coaches/students to submit tactics)
- [ ] Cross-linking (auto-detect links to awards/ECs/apps)
- [ ] Phase tagging (extract P1-P5 from content)
- [ ] Realtime sync (webhook-based updates)
- [ ] pgvector migration (native Postgres vector search)

---

## Contact

- **Technical Lead**: Saad Nazir
- **Docs**: `/docs/MASTER_TECHNICAL_SPEC.md`, `/docs/KB_INTEL_INGESTION.md`
- **Code**: `/tools/ingest/`
