# Jenny Test Lab v3.0 - User Guide

**Version:** v3.0
**Release Date:** 2025-10-13
**Platform Version:** v11.1
**Status:** ✅ Production Ready

---

## Overview

Jenny Test Lab v3.0 is a comprehensive testing framework for all three categories of Jenny's AI capabilities:

- **CAT-1 (Facts/SQL)**: Deterministic SQL-based fact retrieval
- **CAT-2 (KB/RAG)**: Knowledge base retrieval with vector search + LLM composition
- **CAT-3 (EQ/LLM)**: Emotional intelligence with fine-tuned jenny_v8_adapter model

### What's New in v3.0

**Platform Features (v11.1)**:
- LLM Adapter routing (50/50 split between jenny_v8_adapter and base model)
- Proof verification with SHA-256 hashing and 5-factor scoring
- Fine-tuned jenny_v8_adapter model (3.1k examples across ToneCue, Trust, PlanGen, ProofLink)

**Test Lab Features**:
- 108 total test cases (50 CAT-1 + 30 CAT-2 + 25 CAT-3)
- 5 test suites (legacy v2.0 + new v3.0 suites)
- Single test and batch suite execution
- Deep trace export (JSON/CSV) with 30+ trace fields
- Real-time validation gates and scoring

---

## Test Suites

### CAT-1: Facts Suite v2.0 (50 tests)

**Focus**: SQL-based deterministic fact retrieval
**File**: `apps/test-chat-ui/lib/testlab/suites/facts.json`

**Test Coverage**:
- Awards: initial/final/progression routes (10 tests)
- ECs/Activities: initial/final/progression with phase tracking (10 tests)
- Summer Programs: initial/submitted/decisions/final (8 tests)
- Academics: transcript (initial/final/progression) + GPA (initial/final/latest) (12 tests)
- Colleges: targets/decisions/final with attribute filtering (10 tests)

**Expected Behavior**:
- Source: `sql`
- Latency: <50ms
- No adapter usage (base model only)
- Zero proof verification (SQL is self-verifying)

**Example Test**:
```json
{
  "id": "cat1-001",
  "label": "Awards Initial (Intention Phase)",
  "category": "facts",
  "prompt": "Which awards am I planning to apply for?",
  "studentId": "huda-2025",
  "expected": {
    "source": "sql",
    "maxLatency": 50
  }
}
```

---

### CAT-2: KB/RAG v2.0 (8 tests) - LEGACY

**Focus**: Basic KB retrieval validation
**File**: `apps/test-chat-ui/lib/testlab/suites/kb.json`

**Test Coverage**:
- Essay strategy queries (3 tests)
- College positioning (2 tests)
- Identity synthesis (3 tests)

**Expected Behavior**:
- Source: `kb`
- Min proof score: 0.7
- No adapter tracking (legacy)

---

### CAT-2: KB/RAG v3.0 (30 tests) ⭐ NEW

**Focus**: Comprehensive KB retrieval with adapter routing and proof verification
**File**: `apps/test-chat-ui/lib/testlab/suites/cat2-kb-rag-v3.json`

**Test Coverage**:
- NCWIT/Award strategies (2 tests)
- Essay hooks and narrative arc (3 tests)
- Design thinking + CS positioning (2 tests)
- College positioning (Stanford, UPenn) (2 tests)
- Game plan and identity synthesis (3 tests)
- Rejection growth framework (1 test)
- Time management (168-hour, 2-2-2 model) (2 tests)
- Gap year pre-framing (1 test)
- Film + CS storytelling (1 test)
- Result chips (UPenn 3.7 GPA admit) (1 test)
- Insight chips (Naviance scatter) (1 test)
- Trust chips (parent buy-in) (1 test)
- Adaptation chips (STEM to storytelling) (1 test)
- Tactic chips (essay revision checklist) (1 test)
- Application timeline + interview prep (2 tests)
- Recommendation letters + supplemental essays (2 tests)
- Activity descriptions + demonstrated interest (2 tests)
- Waitlist + financial aid + transfer + merit scholarships (4 tests)
- Zero evidence edge case (1 test)
- Adapter badge verification (1 test)

**Expected Behavior**:
- Source: `kb`
- Min proof score: 0.7 (except edge cases with 0.3)
- Adapter usage: 50% (jenny_v8_adapter vs base)
- Proof score validation: `>= 0.70` or `< 0.70` for edge cases
- Adapter badge check for specific tests

**Example Test**:
```json
{
  "id": "cat2-001",
  "label": "NCWIT Strategy (High Proof Score)",
  "category": "kb",
  "prompt": "How should I approach the NCWIT Award application?",
  "studentId": "huda-2025",
  "expected": {
    "route": "kb",
    "source": "kb",
    "minProof": 0.70,
    "noMetaLeak": true,
    "mustContain": ["NCWIT", "strategy"],
    "adapterUsage": "50%",
    "proofScore": ">= 0.70"
  }
}
```

---

### CAT-3: EQ/LLM v2.0 (10 tests) - LEGACY

**Focus**: Basic EQ/tone validation
**File**: `apps/test-chat-ui/lib/testlab/suites/eq.json`

**Test Coverage**:
- Rejection scenarios (2 tests)
- Overwhelm and stress (3 tests)
- Celebration and support (2 tests)
- Time management (3 tests)

**Expected Behavior**:
- Source: `scaffold` or `hybrid`
- Warmth: true
- Action: true
- No adapter tracking (legacy)

---

### CAT-3: EQ/LLM v3.0 (25 tests) ⭐ NEW

**Focus**: Comprehensive EQ validation with fine-tuned jenny_v8_adapter
**File**: `apps/test-chat-ui/lib/testlab/suites/cat3-eq-llm-v3.json`

**Test Coverage**:
- Rejection scenarios (Stanford, MIT) (2 tests)
- Overwhelm (general stress, can't focus) (2 tests)
- Deadline crunch (general + text template) (2 tests)
- Parent conflict (wasting time, college choice) (2 tests)
- Celebration (science fair, Stanford acceptance) (2 tests)
- Self-doubt (not good enough, imposter syndrome) (2 tests)
- Normalization (everyone ahead, behind schedule) (2 tests)
- Permissioning (take break, skip activity) (2 tests)
- Future pacing (after submission, college life) (2 tests)
- Time-boxing (first 60 minutes, daily plan) (2 tests)
- Motivation (staying motivated, lost passion) (2 tests)
- Crisis (total breakdown) (1 test)
- Adapter badge verification (1 test)
- Proof escalation check (low score expected) (1 test)

**Expected Behavior**:
- Route: `eq`
- Warmth: true
- Action: true
- No meta leak: true
- Adapter usage: 50% (jenny_v8_adapter vs base)
- Proof score: 0.25-0.35 (lower than CAT-2 due to less factual grounding)
- Must contain specific warmth/action phrases

**Example Test**:
```json
{
  "id": "cat3-001",
  "label": "Rejection - Stanford",
  "category": "eq",
  "prompt": "I got rejected from Stanford",
  "studentId": "huda-2025",
  "expected": {
    "route": "eq",
    "warmth": true,
    "action": true,
    "noMetaLeak": true,
    "mustContain": ["sorry", "understand"],
    "adapterUsage": "50%",
    "proofScore": "0.25-0.35"
  }
}
```

---

## Using Test Lab v3.0

### Accessing Test Lab

Navigate to: `http://localhost:8787/test-lab` (or your deployed URL)

### Single Test Execution

**Steps**:
1. Select category: Facts (SQL), KB/Indexing, or EQ/Tone
2. Enter prompt (e.g., "Which awards am I planning to apply for?")
3. Enter student ID (default: `huda-2025`)
4. Optional: Enter intent override (e.g., `academics.vitals.trend`)
5. Click "Run Single Test"

**Output**:
- Answer text
- Source routing (sql/kb/hybrid/scaffold)
- Model badge (adapter vs base)
- Debug trace (router decision, SQL query, provenance)
- Metrics (latency breakdown)
- Gate results (pass/warn/fail)

### Suite Execution

**Steps**:
1. Click a test suite button:
   - CAT-1: Facts Suite v2.0 (50 tests)
   - CAT-2: KB/RAG v2.0 (8 tests) or ⭐ v3.0 (30 tests)
   - CAT-3: EQ/LLM v2.0 (10 tests) or ⭐ v3.0 (25 tests)
2. Optional: Select specific tests (or "Select All")
3. Click "Run Suite"

**Output**:
- Individual test results for each case
- Aggregate metrics:
  - Pass/warn/fail counts
  - Pass rate percentage
  - Latency (p50, p95, max)
  - Model mix (adapter vs base usage)
- Scorecard:
  - Proof presence
  - Tone warmth
  - Tone action
  - No meta leak
  - Source correctness

---

## Deep Trace Export

### Export Formats

**JSON (Full Trace)**:
- Complete test/suite data structure
- Includes all debug info, metrics, gates, provenance
- Best for: Programmatic analysis, archiving, debugging

**CSV (Tabular)**:
- 30+ trace fields in spreadsheet format
- Includes: Test metadata, routing, SQL, provenance, latency, gates, trace steps
- Best for: Excel analysis, charting, stakeholder reporting

### Exporting Data

**After Single Test**:
1. Complete a single test run
2. In right panel, find "Export Deep Trace" section
3. Select format: JSON or CSV
4. Click export button
5. File downloads as: `test-lab-single-YYYY-MM-DD.{json|csv}`

**After Suite Run**:
1. Complete a suite run
2. In right panel, find "Export Deep Trace" section
3. Select format: JSON or CSV
4. Click export button
5. File downloads as: `test-lab-suite-YYYY-MM-DD.{json|csv}`

### CSV Fields (30+)

| Field | Description |
|-------|-------------|
| Test ID | Unique test identifier |
| Label | Test description |
| Category | facts/kb/eq |
| Prompt | User input |
| Answer | Jenny's response |
| Source | sql/kb/scaffold/hybrid |
| Model Badge | jenny_v8_adapter or base |
| Scaffold | Scaffold pattern used (if any) |
| Router Decision | Routing intent (e.g., "academics.vitals.trend") |
| Router Confidence | Confidence score (0-1) |
| SQL Query | SQL executed (CAT-1 only) |
| SQL Rows | Number of rows returned |
| Provenance Count | Number of KB chips retrieved |
| Meta Leak | TRUE/FALSE (meta-prompt exposure) |
| Warmth | TRUE/FALSE (emotional warmth detected) |
| Action | TRUE/FALSE (actionable guidance detected) |
| Total Latency (ms) | End-to-end latency |
| Router Latency (ms) | Intent routing latency |
| Source Latency (ms) | Data retrieval latency |
| Guard Latency (ms) | Quality gate latency |
| P95 Latency (ms) | 95th percentile latency |
| Gate Pass Count | Number of gates passed |
| Gate Warn Count | Number of gates warned |
| Gate Fail Count | Number of gates failed |
| Trace: Normalize | Prompt normalization step |
| Trace: PreRouter | Pre-router decision |
| Trace: Lexicon Tags | Detected lexicon tags |
| Trace: Router Decision | Final routing decision |
| Trace: Source Call | Source function called |
| Trace: Guards Applied | Quality guards executed |

---

## Validation Gates

### CAT-1 Gates

1. **Source Correctness**: Must be `sql`
2. **SQL Execution**: Must return rows
3. **Latency**: Must be <50ms
4. **No Meta Leak**: Must not expose system prompts

### CAT-2 Gates

1. **Source Correctness**: Must be `kb`
2. **Proof Score**: Must be ≥0.7 (high confidence) or <0.7 (low confidence + escalation)
3. **Provenance**: Must have chip references
4. **Adapter Usage**: Must show adapter badge for 50% of cohort
5. **No Meta Leak**: Must not expose system prompts
6. **Must Contain**: Must include expected keywords

### CAT-3 Gates

1. **Route Correctness**: Must be `eq`
2. **Warmth**: Must have emotional warmth language
3. **Action**: Must have actionable guidance
4. **Proof Score**: Must be 0.25-0.35 (lower than CAT-2)
5. **Adapter Usage**: Must show adapter badge for 50% of cohort
6. **No Meta Leak**: Must not expose system prompts
7. **Must Contain**: Must include expected warmth phrases

---

## Interpreting Results

### Pass Rate Targets

- **CAT-1**: >95% (deterministic SQL)
- **CAT-2**: >80% (retrieval quality)
- **CAT-3**: >85% (EQ consistency)

### Latency Targets

- **CAT-1**: <50ms (p95)
- **CAT-2**: <500ms (p95)
- **CAT-3**: <300ms (p95)

### Adapter Usage

- **Target**: 50/50 split between jenny_v8_adapter and base model
- **Tolerance**: ±5% variance acceptable in sample sizes <100

### Proof Scores

- **CAT-2 High Confidence**: ≥0.70 (chip ref 30%, citation 25%, timestamp 15%, source 15%, quality 15%)
- **CAT-2 Low Confidence**: <0.70 (triggers escalation)
- **CAT-3 Typical**: 0.25-0.35 (less factual grounding)

---

## Troubleshooting

### Test Fails with "Source Mismatch"

**Cause**: Test expected `sql` but got `kb` (or vice versa)
**Fix**: Check intent router decision - may need intent override

### Test Fails with "Proof Score Too Low"

**Cause**: KB retrieval didn't find strong evidence
**Fix**: Check Pinecone namespace, verify chip exists for query

### Test Fails with "Meta Leak Detected"

**Cause**: Response exposed system prompt fragments
**Fix**: Check humanizer v2.1 meta-strip logic in `compose.ts`

### Suite Times Out

**Cause**: Sequential execution of 50+ tests takes time
**Fix**: Use test selection to run subset, or increase timeout

### Adapter Badge Missing

**Cause**: Traffic split not working, cohort assignment issue
**Fix**: Check `adapter.ts` assignCohort function, verify studentId hash

### CSV Export Shows "N/A"

**Cause**: Field not populated for specific test type
**Fix**: Normal - CAT-1 won't have provenance, CAT-3 won't have SQL

---

## File References

### Test Lab Components

- `apps/test-chat-ui/app/test-lab/page.tsx` - Main Test Lab page
- `apps/test-chat-ui/components/testlab/ScenarioBuilder.tsx` - Test/suite selector
- `apps/test-chat-ui/components/testlab/LiveResults.tsx` - Real-time results display
- `apps/test-chat-ui/components/testlab/LogsPanel.tsx` - Debug logs and gates
- `apps/test-chat-ui/components/testlab/TraceExporter.tsx` - JSON/CSV export

### Test Suite Files

- `apps/test-chat-ui/lib/testlab/suites/facts.json` - CAT-1 v2.0 (50 tests)
- `apps/test-chat-ui/lib/testlab/suites/kb.json` - CAT-2 v2.0 (8 tests)
- `apps/test-chat-ui/lib/testlab/suites/cat2-kb-rag-v3.json` - CAT-2 v3.0 (30 tests)
- `apps/test-chat-ui/lib/testlab/suites/eq.json` - CAT-3 v2.0 (10 tests)
- `apps/test-chat-ui/lib/testlab/suites/cat3-eq-llm-v3.json` - CAT-3 v3.0 (25 tests)

### Backend APIs

- `apps/test-chat-ui/app/api/testlab/run/route.ts` - Single test execution
- `apps/test-chat-ui/app/api/testlab/suite/route.ts` - Suite execution

### Schema

- `apps/test-chat-ui/lib/testlab/schema.ts` - TypeScript types for all test structures

---

## Best Practices

### Creating Custom Tests

1. Use existing test suite as template
2. Include all expected fields for proper validation
3. Use meaningful test IDs (e.g., `custom-001`)
4. Add descriptive labels
5. Test with single execution before adding to suite

### Running Production Validation

1. Run full suite (CAT-1 + CAT-2 v3.0 + CAT-3 v3.0) before releases
2. Export results as JSON for archival
3. Track pass rate trend over time
4. Monitor latency p95 for regressions
5. Verify adapter usage remains at 50/50 split

### Debugging Failed Tests

1. Check "Trace: Router Decision" in CSV export
2. Verify SQL query executed (CAT-1)
3. Check provenance count (CAT-2)
4. Look for meta leak in answer text
5. Validate adapter badge matches student cohort
6. Review proof score breakdown

---

## Changelog

### v3.0 (2025-10-13)

**New Features**:
- 5 test suites (3 legacy v2.0 + 2 new v3.0)
- 108 total test cases (50 CAT-1 + 30 CAT-2 + 25 CAT-3)
- Deep trace export (JSON/CSV) with 30+ fields
- Adapter badge verification
- Proof score validation
- Fine-tuned jenny_v8_adapter model support

**Test Suite Additions**:
- CAT-2 v3.0: 30 comprehensive KB/RAG tests
- CAT-3 v3.0: 25 comprehensive EQ/LLM tests

**UI Enhancements**:
- Suite selector with v3.0 indicators (⭐)
- Export component with format selection
- Updated header with v11.1 platform features

**Documentation**:
- Complete user guide
- CSV field reference
- Troubleshooting section

### v2.0 (2025-10-08)

**Legacy Version**:
- 3 test suites (Facts, KB, EQ)
- 68 total test cases
- Basic validation gates
- No export functionality

---

## Support

For issues, questions, or feature requests:
- GitHub Issues: [ivylevel-platform-v10](https://github.com/ivylevel/platform-v10)
- Documentation: `/docs/guides/`
- Technical Specs: `/docs/MASTER_PROD_TECH_SPEC.md`

---

**Last Updated**: 2025-10-13
**Author**: IvyLevel Engineering
**Version**: v3.0
