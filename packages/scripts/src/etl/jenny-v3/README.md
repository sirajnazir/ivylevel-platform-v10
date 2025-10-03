# Jenny AI v3 - Universal Vitals Implementation

## Overview

This is the complete Task 1 implementation for Jenny AI's Universal Vitals + Progression + Query model. The system provides human-grade coaching with evidence-backed correctness through a "Vitals-first → Canon registry → Hybrid RAG → Evidence chips" architecture.

## Directory Structure

```
jenny-v3/
├── 001_universal_vitals_model.sql  # Postgres migrations (DDL)
├── etl_sources.py                  # ETL for Sources (tab 5)
├── etl_facts.py                    # ETL for Vital Facts (tab 2)
├── etl_interactions.py             # ETL for Interactions v1.1 (tab 3)
├── etl_outcomes.py                 # ETL for Outcomes (tab 4)
├── validate_etl.py                 # Validation and acceptance checks
├── build_pinecone_index.py         # Pinecone index builder
├── api_contracts.py                # API endpoint specifications
├── run_etl.sh                      # Master orchestration script
└── README.md                       # This file
```

## Quick Start

1. **Set up environment variables:**
   ```bash
   export PINECONE_API_KEY="your-pinecone-key"
   export OPENAI_API_KEY="your-openai-key"
   ```

2. **Run the complete ETL pipeline:**
   ```bash
   ./run_etl.sh "postgresql://user:pass@host/jenny_ai"
   ```

   This will:
   - Apply database migrations
   - Create sample data if needed
   - Run all ETL scripts
   - Validate the data
   - Optionally build Pinecone index

## Key Components

### 1. Database Schema (Postgres)

The schema implements the Universal Model with:
- **Controlled enums** for lifecycle status, outcome types, tactics, frameworks
- **Core tables**: students, sources, jtbd, vital_facts, interactions, outcomes, lifecycle_items
- **Evidence linking** through source_id references
- **Append-only facts** (no overwrites)

### 2. ETL Scripts

Each script handles one data tab:
- **etl_sources.py**: Registers all evidence sources
- **etl_facts.py**: Creates atomic vital facts with dates
- **etl_interactions.py**: Imports coaching interactions (v1.1 schema)
- **etl_outcomes.py**: Handles admissions, milestones, lifecycle tracking

### 3. Validation

The `validate_etl.py` script ensures:
- All facts have source references
- Valid enum values throughout
- Referential integrity maintained
- Golden facts match expectations

### 4. Pinecone Index

Only indexes narrative content:
- **jtbd namespace**: Job titles, synopsis, phase
- **interactions namespace**: User asks, Jenny replies, tactics
- **NO facts/outcomes** in vector DB (served from Postgres)

### 5. API Contracts

Five endpoints defined:
- `GET /students/:id/vitals` - Facts and timelines
- `GET /students/:id/lifecycle` - Application status tracking  
- `POST /search` - Hybrid narrative search
- `GET /analytics/tactic-outcomes` - Correlation matrix
- `GET /evidence` - Resolve evidence chips

## Data Flow

```
CSV Data → ETL Scripts → Postgres
                           ↓
                    Validation Checks
                           ↓
                  Narrative → Pinecone
                  Facts → Stay in Postgres
```

## Testing

Run validation after ETL:
```bash
python3 validate_etl.py "postgresql://localhost/jenny_ai"
```

Expected output:
```
✓ PASSED: All facts have source references
✓ PASSED: All tactics are valid
✓ PASSED: All frameworks are valid
✅ ALL VALIDATION CHECKS PASSED
```

## Next Steps

After running Task 1:

1. **Implement API endpoints** using the contracts in `api_contracts.py`
2. **Update orchestrator** to use vitals-first approach
3. **Test golden queries**:
   - "What was Huda's final SAT score?"
   - "Which schools accepted Huda?"
   - "How did we improve SAT performance?"
4. **Enable analytics** for tactic→outcome correlations

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql "postgresql://localhost/jenny_ai" -c "SELECT 1"
```

### Missing Dependencies
```bash
pip install psycopg pinecone-client openai
```

### ETL Errors
- Check CSV format matches examples in ETL scripts
- Ensure enum values are valid
- Verify source_ids exist before referencing

## Data Model Summary

### Controlled Enums
- **lifecycle_status**: planned, in_progress, submitted, outcome, archived
- **lifecycle_domain**: application, award, test, essay, recommender, ec_portfolio, aid_css_fafsa, ops_policy
- **outcome_type**: admission, plan, tracking, momentum, artifact, draft, submission, result, milestone, ops, policy, registry, content_bank, communication, planning
- **admission_result**: accepted, waitlisted, rejected, deferred, withdrawn, unknown
- **fact_confidence**: high, medium, low

### Key Principles
1. **Facts are atomic** - one value, one date
2. **Sources are required** - every claim needs evidence
3. **Enums are controlled** - no free-text types
4. **Lifecycle tracks progression** - planned → submitted → outcome
5. **Vector search is narrative-only** - facts stay in Postgres

---

## Contact

For questions or issues with this implementation, refer to the technical specification provided in the handoff brief.