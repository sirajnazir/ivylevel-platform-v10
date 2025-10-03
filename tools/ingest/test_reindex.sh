#!/bin/bash

# Test script to verify the metadata extraction works correctly

echo "Testing metadata extraction for Assessment GamePlan..."

# Create test JSONL with full Assessment GamePlan text
cat > /tmp/test_gameplan.jsonl << 'EOF'
{"id":"Huda_Assessment_Gameplan_2025-06-22","text":"Ivy Level College Counseling Assessment Report for Student: Huda Date: June 22, 2025 Coach: Jenny Model: v1 Initial Awards List: 1. Two-time National Academic Quiz Championships Award Winner 2. Pakistan Top 5 Student Award 3. Al-Biruni Award for Excellence in Mathematics 4. Presidential Award for Academic Excellence 5. Cambridge Outstanding Learner Award - Mathematics 6. National Science Olympiad Gold Medalist 7. Model United Nations Best Delegate Award 8. Community Service Excellence Award 9. Young Innovators Competition Winner 10. Environmental Conservation Leadership Award","doc_name":"Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.docx","student":"Huda"}
EOF

# Set environment variables
export PINECONE_API_KEY="${PINECONE_API_KEY}"
export OPENAI_API_KEY="${OPENAI_API_KEY}"  
export PINECONE_INDEX="jenny-v1"
export PINECONE_NAMESPACE="jenny_v1"
export RAG_JSONL="/tmp/test_gameplan.jsonl"
export UPSERT_BATCH="1"

echo "Running upsert with new metadata extraction..."
cd /Users/snazir/ivylevel-platform-v10
pnpm --filter @packages/scripts run upsert:direct

echo "Test complete! The document should now have:"
echo "- kind: GAMEPLAN"
echo "- student: Huda"
echo "- coach: Jenny"
echo "- model_id: v1"
echo "- date_iso: 2025-06-22"
echo "- phase: 1"
echo "- week: 55"