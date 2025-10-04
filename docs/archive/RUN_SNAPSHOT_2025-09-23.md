# IvyLevel v1.0 Run Snapshot - 2025-09-23

## System Configuration

### Model Details
- **Fine-tuned Model ID**: `ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy`
- **Base Model**: `gpt-4o-mini-2024-07-18`
- **Status**: Active and serving requests

### Pinecone Configuration
- **Index**: `jenny-v1`
- **Namespace**: `jenny_v1` 
- **Region**: `us-east-1`
- **Vectors**: ~72k embeddings from Jenny-Huda corpus
- **Embedding Model**: `text-embedding-3-small` (1536 dimensions)

### Git State
- **Commit SHA**: `c23b402a45adc1a14952e8ed5955da287338c457`
- **Branch**: `main`
- **Tag**: `v1.0-alpha`

### Environment Configuration
```bash
# LLM
JENNY_MODEL_ID=ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy
EVAL_BASE_MODEL=gpt-4o-mini-2024-07-18
EVAL_FT_MODEL=ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy

# Services
RETRIEVER_URL=http://localhost:4102
RETRIEVER_PORT=4102
AGENT_URL=http://localhost:4101
AGENT_PORT=4101
API_PORT=4000

# Pinecone
PINECONE_INDEX=jenny-v1
PINECONE_NAMESPACE=jenny_v1
PINECONE_REGION=us-east-1

# Features
USE_FT=1  # Fine-tuned model enabled

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### Data Paths
```
# Raw Data
data/raw/jenny-huda/
├── 01-Intelligence-GamePlan/
├── 02-Intelligence-ExecutionDocs/
├── 03-Intelligence-SessionTranscripts/
├── 04-Intelligence-iMessage/
└── 09-Raw-ApplicationDocs/

# Processed Data
data/processed/jenny-huda/
├── canonical/          # Normalized JSONs
├── finetune/v1.0/     # Fine-tuning dataset
│   ├── finetune.train.jsonl (800 examples)
│   ├── finetune.val.jsonl   (100 examples)
│   └── finetune.test.jsonl  (100 examples)
└── reports/            # Ingestion reports
```

## Service Architecture

### Running Services
1. **Retriever** (port 4102)
   - Pinecone vector search
   - INTEL-first filtering by default
   - Zod validation (no mock fallback)

2. **Agent** (port 4101)  
   - Fine-tuned Jenny model
   - Evidence retrieval integration
   - Chat endpoint for testing

3. **API Gateway** (port 4000)
   - `/agent/chat` - Main chat interface
   - `/search` - Direct retriever access  
   - Trace ID logging

## Validation Status

### Retriever Improvements
- ✅ Strict parameter validation with Zod
- ✅ No mock data fallback
- ✅ INTEL-first document filtering
- ✅ Proper error responses (400/500)

### Agent Integration
- ✅ Fine-tuned model active
- ✅ Evidence chip retrieval
- ✅ Jenny's authentic coaching voice
- ✅ 168-hour framework implementation

### Logging & Monitoring
- ✅ Trace ID propagation
- ✅ Per-service child loggers
- ✅ Request/response debugging

## Dataset Statistics

### Fine-tuning Dataset (v1.0)
- **Total Examples**: 1,000
- **Average Tokens**: 440 per example
- **Token Range**: 204-855 
- **Validation Rate**: 100%
- **Source Coverage**: 93 weeks, 21,712 turns

### Pinecone Index
- **Total Vectors**: ~72,000
- **Document Types**:
  - TRANS-INTEL: Session transcripts
  - EXEC-INTEL: Execution frameworks  
  - IMSG-INTEL: iMessage coaching
  - GAMEPLAN: Assessment & planning
  - APP-DOC: Application materials

## Quick Test Commands

```bash
# Test 168h planning
curl -s -X POST http://localhost:4101/chat \
  -H "content-type: application/json" \
  -d '{"studentId":"huda","message":"I have 168 hours. Help me optimize this week for SAT and Synthoria."}' | jq .

# Test evidence retrieval  
curl -s -X POST http://localhost:4102/search \
  -H "content-type: application/json" \
  -d '{"q":"SAT 1530","k":5}' | jq .

# Test API gateway
curl -s -X POST http://localhost:4000/agent/chat \
  -H "content-type: application/json" \
  -d '{"message":"What was my final SAT score?","nowWeek":76}' | jq .
```

---

**Snapshot captured**: 2025-09-23T17:20:00Z  
**System ready for v1.0 production deployment**