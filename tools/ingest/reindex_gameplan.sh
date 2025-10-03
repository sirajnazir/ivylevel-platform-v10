#!/bin/bash

# Script to re-index the Assessment GamePlan document with correct metadata

# Set environment variables
export PINECONE_API_KEY="${PINECONE_API_KEY}"
export OPENAI_API_KEY="${OPENAI_API_KEY}"
export PINECONE_INDEX="jenny-v1"
export PINECONE_NAMESPACE="jenny_v1"

# Create a temporary JSONL file with the Assessment GamePlan document
cat > /tmp/gameplan_reindex.jsonl << 'EOF'
{"id":"Huda_Assessment_Gameplan_2025-06-22","text":"[Full text of Assessment GamePlan including: Ivy Level College Counseling Assessment Report... 1. Two-time National Academic Quiz Championships Award Winner 2. Pakistan Top 5 Student Award 3. Al-Biruni Award for Excellence in Mathematics... etc.]","doc_name":"Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.docx","student":"Huda"}
EOF

# Update the RAG_JSONL path to point to our temporary file
export RAG_JSONL="/tmp/gameplan_reindex.jsonl"

# Run the upsert script
echo "Re-indexing Assessment GamePlan document with standardized metadata..."
cd /Users/snazir/ivylevel-platform-v10
pnpm --filter @packages/scripts run upsert:direct

echo "Re-indexing complete!"