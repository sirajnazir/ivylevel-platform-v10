# Changelog

## v1.1.0 (2025-09-24)

### Major Features
- **Vitals Spine**: Complete implementation of event-sourced vitals system
  - College decisions ingestion from Excel/CSV files
  - Observations → Vitals reduction with proper precedence
  - Never-blank doctrine for factual responses
  - Full integration with fine-tuned Jenny model

### Key Improvements
- **College Decisions Pipeline**: Excel → JSON → APPS observations → Vitals
  - 28 college decisions successfully extracted and stored
  - Decision precedence: ACCEPTED > WAITLISTED/DEFERRED > REJECTED > UNKNOWN
  - Case-insensitive college name matching

- **API Enhancements**:
  - Stale checking on `/students/:id/state` endpoint
  - Automatic recompute on `/observe` endpoint
  - New `/admin/recompute` endpoint for manual vitals refresh
  - Inline reducer for vitals computation

- **Agent Integration**:
  - Factual responses grounded in vitals data
  - College list queries return exact decisions without hedging
  - Evidence chips cite "from your vitals/records"
  - Temperature adjustment: 0.3 for facts, 0.7 for conversation

### Technical Details
- Database schema: `observations`, `student_state`, `outcomes` tables
- Observation types: SAT, GPA, ACTIVITY, AWARD, SUMMER, WELLNESS, TRAIT, APPS
- Reducer handles all observation types with idempotent operations
- Excel/CSV parser with flexible header mapping

### Testing
- 28 college decisions verified in database
- Agent returns full college list with statuses
- SAT scores correctly computed and retrieved
- End-to-end pipeline validated

## v1.0.0 (2025-09-23)

### Initial Release
- Fine-tuned Jenny model integration
- RAG pipeline with Pinecone vector store
- Base agent and retriever services
- Ingestion tools for VTT, PDF, DOCX formats