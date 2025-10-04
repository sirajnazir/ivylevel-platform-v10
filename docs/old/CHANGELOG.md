# Changelog

## v1.2.5 (2025-09-24) - Enhanced Fact Synthesis

### Added
- **Metadata-Weighted Fact Synthesis**
  - Disambiguates INITIAL (Week 0 GamePlan) vs FINAL (APP-DOC) lists
  - Uses metadata.kind/phase/week to score evidence relevance
  - Separate tracking of gameplan vs final ECs/awards
  
- **Evidence Provenance Tracking**
  - `extractFactsWithProvenance()` returns indices of source evidence
  - Enables precise chip-to-fact mapping
  - Supports audit trail for factual claims

- **Deterministic Fact Composition**
  - `composeAnswerFromFacts()` generates consistent replies
  - Prefers deterministic extraction over LLM hallucination
  - Falls back to LLM only when facts insufficient

### Fixed
- **Initial vs Final List Confusion**: Agent now correctly identifies "initial awards" from GamePlan
- **SAT Timeline Extraction**: Improved date parsing and score deduplication
- **Generic Response Elimination**: Removes "I'm checking your records" when facts available

### Technical Changes
- Complete rewrite of `fact_synthesizer.ts` with TypeScript interfaces
- Updated `orchestrator.ts` to use new fact synthesis API
- Added query hint pass-through for better context awareness
- Lower temperature (0.1) for factual questions

## v1.2.4.1 (2025-09-24) - Hotfix: Report Integration

### Fixed
- **Temporal Report SQL**: Added COALESCE for null date handling, preventing internal server errors
- **Agent Markdown Formatting**: Reports now return pre-formatted markdown tables for inline display
- **Cron Script Execution**: Changed shebang to use `npx ts-node` for better compatibility
- **Cache Directory Creation**: Auto-creates report cache directories with recursive mkdir

### Technical Changes
- Updated `generateTemporalReport()` to handle null dates gracefully
- Modified `fetchReportData()` to return `formattedResponse` field with markdown
- Added cache directory creation before file operations
- Added npm script `cron:recompute` for easier execution

## v1.2.4 (2025-09-24) - Inline Report Delivery

### Added
- **Reports API Endpoint** (`/reports/:studentId`)
  - Returns pre-generated or on-demand JSON reports
  - Supports `?type=yield` and `?type=temporal` parameters
  - Caches reports in `/data/reports/{studentId}/v1.2.4/`
  
- **Agent Report Integration**
  - Agent responds to success rate and pattern queries
  - Formats yield data as markdown tables inline
  - Shows bombardment effectiveness and rebounds
  
- **Nightly Cron Job** (`cron/recompute.ts`)
  - Recomputes vitals for all students
  - Generates and caches yield + temporal reports
  - Creates markdown versions for human reading
  - Backs up previous reports with timestamp
  
- **UI Card Specification** (`docs/UI_CARD_SPEC.md`)
  - Reports tab design for coach dashboard
  - Opportunity Yield card with category breakdown
  - Temporal Patterns card with timeline chart
  - Color-coded performance indicators
  
- **Testing Suite**
  - Unit tests for report calculations
  - API endpoint tests with mocked data
  - Smoke test script for manual validation
  - Agent integration test scenarios

### Technical Details
- Report types defined in `apps/api/src/types/reports.ts`
- Helper functions in API for on-demand generation
- Agent orchestrator checks for report questions
- Cache-first approach with fallback to generation

## v1.2.3 (2025-09-24) - Category Yields & Temporal Analysis

### Added
- **Category Yield Analysis** (scripts/sql/huda_category_yields.sql)
  - Win rates by opportunity category
  - Strategic insights (high-yield vs challenging categories)  
  - Portfolio balance visualization
  
- **Temporal Pattern Analysis** (scripts/sql/huda_temporal_patterns.sql)
  - Rejection → acceptance rebound tracking
  - Bombardment week effectiveness (5+ applications)
  - Weekly activity timeline with win rates
  
- **Category Yield Report Generator** (tools/reports/category_yield_report.js)
  - Markdown report showing win rates by category
  - Identifies high-yield (80%+) and challenging (<50%) categories
  - Strategic recommendations based on yield data
  
- **Temporal Analysis Report Generator** (tools/reports/temporal_analysis_report.js)
  - Weekly application patterns and outcomes
  - Resilience metrics (rebounds, timing)
  - Bombardment strategy effectiveness analysis
  
- **Fine-tune Data Augmentation** (tools/finetune/augment_list_extraction.ts)
  - Generates training examples for list/number extraction
  - Covers ECs, awards, colleges, scores, and counts
  - JSONL format for model fine-tuning

## v1.2.2 (2025-09-24) - Automated Opportunity Mining

### Added
- **Automated Opportunity Extraction** from corpus
  - Regex-based mining from transcripts and messages
  - Canonicalization of opportunity names and aliases
  - SHA1 idempotency for deduplication
  - Extracted 10,637 unique observations from Huda corpus
  
- **Parent-facing Opportunity Report Generator**
  - Shows 50+ opportunities with 89.2% win rate
  - Categorizes by type (summer programs, research, awards, etc.)
  - Highlights strategy insights (3x buffer, national focus)
  
- **Test Harness** for opportunity mining validation
  - End-to-end test script for extraction pipeline
  - Sample validation with expected patterns

## v1.2.0 (2025-09-24) - Smart Precision Opportunity Recommendation Engine

### Added
- **Opportunity Catalog Service** (port 4202)
  - CRUD operations for opportunities
  - Filtering by kind, tier, category, grade level
  - Batch import support
  
- **Opportunity Scorer Service** (port 4203)
  - 5-component scoring: academic, narrative, strategic, resource, timeline fit
  - Personalized scoring based on student profile
  - Score explanations and recommendations
  
- **Opportunity Recommender Service** (port 4204)
  - Top recommendations by tier and category
  - Bombardment strategy for morale boosts
  - Discovery of untapped opportunities
  - Weekly curated suggestions
  
- **API Gateway Integration**
  - Proxies to microservices
  - Unified opportunity endpoints
  - APPLICATION observation support

## v1.1.1 (2025-09-24) - Vitals Standardization

### Major Changes
- **Standardized Leading Vitals** across GamePlan → Weekly Execution → Applications
  - GamePlan targets (10 ECs, 5 Awards) flow through entire pipeline
  - Execution phase updates vitals with EC/AWARD observations
  - Application phase uses submitted subset for college apps
  - View parameter: ?view=application returns curated 10+5 subset
  
- **Backfill Scripts**
  - emit_gameplan_targets.ts extracts initial targets from GamePlan docs
  - emit_execution_updates.ts captures weekly EC/Award changes
  - emit_applications.ts tracks submitted subset to colleges
  
- **Never-Blank Polish**
  - Agent always returns factual data from vitals
  - No more "I don't have access" responses
  - Evidence chips cite vitals/records

### Testing
- Contract tests ensure view=application returns exactly 10 ECs + 5 Awards
- Fact guard tests verify no blank responses
- Evidence tests confirm citation of sources

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