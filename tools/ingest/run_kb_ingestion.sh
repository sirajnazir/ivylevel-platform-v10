#!/bin/bash
# KB Intel Ingestion Pipeline - End-to-End
# Ingests INTEL JSONs from Google Drive → Normalizes to chips → Builds FAISS index

set -e  # Exit on any error

echo "============================================================"
echo "KB INTEL INGESTION PIPELINE"
echo "============================================================"
echo ""

# ========== ENVIRONMENT VALIDATION ==========
echo "🔍 Validating environment..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  exit 1
fi

if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS not set"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️  WARNING: OPENAI_API_KEY not set (embeddings will fail)"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "❌ ERROR: Service account file not found at $GOOGLE_APPLICATION_CREDENTIALS"
  exit 1
fi

echo "✅ Environment validated"
echo ""

# ========== STEP 1: INGEST DRIVE INTEL JSONs ==========
echo "============================================================"
echo "STEP 1: Ingesting INTEL JSONs from Google Drive"
echo "============================================================"
echo ""

python3 tools/ingest/ingest_drive_intel.py

if [ $? -ne 0 ]; then
  echo "❌ Ingestion failed. See logs above."
  exit 1
fi

echo ""
echo "✅ Ingestion complete"
echo ""

# ========== STEP 2: BUILD FAISS INDEX ==========
echo "============================================================"
echo "STEP 2: Building FAISS vector index"
echo "============================================================"
echo ""

python3 tools/ingest/build_faiss_index.py

if [ $? -ne 0 ]; then
  echo "❌ FAISS index build failed. See logs above."
  exit 1
fi

echo ""
echo "✅ FAISS index built"
echo ""

# ========== FINAL SUMMARY ==========
echo "============================================================"
echo "✅ KB INTEL PIPELINE COMPLETE"
echo "============================================================"
echo ""
echo "Artifacts created:"
echo "  📄 CSV:      artifacts/kb/derived_kb_intel.csv"
echo "  📄 JSONL:    artifacts/kb/derived_kb_intel.jsonl"
echo "  🗂️  Index:    artifacts/kb/kb_intel.faiss"
echo "  🆔 IDs:      artifacts/kb/kb_intel.ids"
echo "  📋 Metadata: artifacts/kb/kb_intel.meta.jsonl"
echo ""
echo "Next steps:"
echo "  • Test search: python3 tools/ingest/query_kb.py 'how did Jenny coach me?'"
echo "  • Use in Jenny API: KB resolver is now active for intent kb.search"
echo ""
