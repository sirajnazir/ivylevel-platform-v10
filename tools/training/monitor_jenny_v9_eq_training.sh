#!/bin/bash

# jenny_v9_eq Fine-Tuning Job Monitor
# Monitors OpenAI fine-tuning job status and displays progress

JOB_ID="ftjob-IpISx0x6ikwYB74pS4GZttJ7"

echo "=========================================="
echo "jenny_v9_eq Fine-Tuning Job Monitor"
echo "=========================================="
echo ""
echo "Job ID: $JOB_ID"
echo "Base Model: gpt-4o-mini-2024-07-18"
echo "Training Examples: 690"
echo "Validation Examples: 77"
echo "Epochs: 3"
echo "Batch Size: 1"
echo "Learning Rate Multiplier: 0.8"
echo ""
echo "=========================================="
echo ""

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "ERROR: OPENAI_API_KEY environment variable not set"
    exit 1
fi

# Function to get job status
get_status() {
    curl -s https://api.openai.com/v1/fine_tuning/jobs/$JOB_ID \
        -H "Authorization: Bearer $OPENAI_API_KEY" | python3 -m json.tool
}

# Function to get training events
get_events() {
    curl -s https://api.openai.com/v1/fine_tuning/jobs/$JOB_ID/events?limit=50 \
        -H "Authorization: Bearer $OPENAI_API_KEY" | python3 -m json.tool
}

# Parse status
STATUS=$(curl -s https://api.openai.com/v1/fine_tuning/jobs/$JOB_ID \
    -H "Authorization: Bearer $OPENAI_API_KEY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'unknown'))")

echo "Current Status: $STATUS"
echo ""

case $STATUS in
    "validating_files")
        echo "📋 Validating training and validation files..."
        echo "   This usually takes 1-2 minutes."
        ;;
    "queued")
        echo "⏳ Job queued, waiting for training resources..."
        echo "   This can take a few minutes depending on queue."
        ;;
    "running")
        echo "🚀 Training in progress!"
        echo ""
        echo "Recent Training Events:"
        echo "----------------------------------------"
        get_events | grep -A 3 "message" | head -20
        ;;
    "succeeded")
        echo "✅ Training completed successfully!"
        echo ""
        MODEL_ID=$(curl -s https://api.openai.com/v1/fine_tuning/jobs/$JOB_ID \
            -H "Authorization: Bearer $OPENAI_API_KEY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('fine_tuned_model', 'N/A'))")
        echo "Fine-Tuned Model ID: $MODEL_ID"
        echo ""
        echo "Next steps:"
        echo "1. Update .env with: JENNY_V9_EQ_MODEL=$MODEL_ID"
        echo "2. Update services/jenny-api/config/model_registry.json"
        echo "3. Update services/jenny-api/src/compose/compose-eq.ts"
        echo "4. Run CAT-3 v3.0 test suite for validation"
        ;;
    "failed")
        echo "❌ Training failed!"
        echo ""
        echo "Error details:"
        get_status | grep -A 5 "error"
        ;;
    "cancelled")
        echo "🛑 Training was cancelled."
        ;;
    *)
        echo "❓ Unknown status: $STATUS"
        ;;
esac

echo ""
echo "=========================================="
echo ""
echo "To monitor continuously, run:"
echo "watch -n 30 $0"
echo ""
echo "To get full job details:"
echo "curl https://api.openai.com/v1/fine_tuning/jobs/$JOB_ID \\"
echo "  -H \"Authorization: Bearer \$OPENAI_API_KEY\" | python3 -m json.tool"
echo ""
echo "To get training events:"
echo "curl https://api.openai.com/v1/fine_tuning/jobs/$JOB_ID/events \\"
echo "  -H \"Authorization: Bearer \$OPENAI_API_KEY\" | python3 -m json.tool"
echo ""
