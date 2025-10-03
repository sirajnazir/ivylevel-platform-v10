# Environment Configuration for v3.1

## Pinecone Configuration
- **Index**: `jenny-v2` (set PINECONE_INDEX=jenny-v2)
- **Namespaces**: Dynamically selected based on document kind
  - `appdoc` - Application documents (APP-DOC)
  - `gameplan` - Game plan documents (GAMEPLAN)
  - `transcript` - Transcripts, execution intel, iMessage (TRANS-INTEL, EXEC-INTEL, IMSG-INTEL)
  - `exec` - (legacy, merged into transcript)
  - `imessage` - (legacy, merged into transcript)

## Model Configuration
- **Fine-tuned Model**: `ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy`
- **Environment Variable**: `JENNY_MODEL_ID`
- **Feature Flag**: `USE_FT=1` to enable fine-tuned model

## Database Configuration
- **Default URL**: `postgresql://postgres:postgres@localhost:5432/ivylevel`
- **Environment Variable**: `DATABASE_URL`

## Retriever Configuration
- **URL**: `http://localhost:4102`
- **Environment Variable**: `RETRIEVER_URL`

## Key Changes from Previous Versions
1. Namespace consolidation: EXEC-INTEL and IMSG-INTEL now map to `transcript` namespace
2. Dynamic namespace resolution based on document kind (no fixed PINECONE_NAMESPACE)
3. Vitals as ground truth for factual data
4. Evidence chips required for all responses
5. Never-blank doctrine: no "I don't have access" responses when data exists