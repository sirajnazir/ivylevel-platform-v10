#!/bin/bash
set -e

export PINECONE_INDEX_NAME="jenny-v3-3072-$(date +%Y%m%d)"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"

echo "Starting weekly reindex to $PINECONE_INDEX_NAME"
node src/etl/jenny-v3/index_to_pinecone_v3.cjs

# Update environment
echo "export PINECONE_INDEX=$PINECONE_INDEX_NAME" > .env.pinecone

echo "Reindex complete. Remember to restart services with new index."
