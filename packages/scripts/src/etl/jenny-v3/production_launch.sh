#!/bin/bash

# Jenny v3 Production Launch Script

echo "=== Jenny v3 Production Launch ==="
echo

# Required environment variables
export PINECONE_INDEX=jenny-v3-3072-20250930
export DATABASE_URL=${DATABASE_URL:-"postgresql://<user>:<pass>@<host>:5432/<db>"}
export OPENAI_API_KEY=${OPENAI_API_KEY:-"<key>"}
export PINECONE_API_KEY=${PINECONE_API_KEY:-"<key>"}
export API_KEY=${API_KEY:-"<key>"}

# Optional production hardening
export RATE_LIMIT_RPM=${RATE_LIMIT_RPM:-100}
export RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-60000}
export LOG_LEVEL=${LOG_LEVEL:-"info"}
export LOG_RETENTION_DAYS=${LOG_RETENTION_DAYS:-14}

echo "Environment Configuration:"
echo "  PINECONE_INDEX: $PINECONE_INDEX"
echo "  DATABASE_URL: [CONFIGURED]"
echo "  OPENAI_API_KEY: [CONFIGURED]"
echo "  PINECONE_API_KEY: [CONFIGURED]"
echo "  API_KEY: [CONFIGURED]"
echo "  RATE_LIMIT_RPM: $RATE_LIMIT_RPM"
echo "  LOG_LEVEL: $LOG_LEVEL"
echo

# Navigate to service directory
cd /Users/snazir/ivylevel-platform-v10/services/jenny-api

# Build and start
echo "Building Jenny API..."
npm run build

echo
echo "Starting Jenny API..."
npm start