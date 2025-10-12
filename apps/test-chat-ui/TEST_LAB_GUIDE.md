# Jenny Test Lab - User Guide

**Complete testing suite for Facts (SQL), KB/Indexing, and EQ/Tone validation**

---

## Quick Start

```bash
# Start test-chat-ui
PORT=8787 pnpm dev

# Open Test Lab
http://localhost:8787/test-lab
```

---

## Features

### 1. Three Test Categories

**Facts (SQL)**
- Validates deterministic SQL routing
- Checks proof presence (≥98%)
- Verifies no meta-leakage
- Latency thresholds (p50 ≤ 1.5s, p95 ≤ 6s)
- Guard skip verification (SQL-only queries)

**KB/Indexing**
- Evidence tag validation
- Provenance chip verification
- No meta-leakage checks
- Latency guidance (warn only)

**EQ/Tone**
- Warmth detection (empathy/normalization)
- Action detection (next step/imperatives)
- No meta-leakage verification
- Adapter consideration tracking
- Latency monitoring

### 2. Single Test Mode

Run individual test cases with full customization:
- **Category**: Facts | KB | EQ
- **Prompt**: Free-text query
- **Student ID**: Default `huda-2025`
- **Intent Override**: Optional (e.g., `academics.vitals.trend`)

### 3. Suite Mode

Run pre-built test suites with selective execution:

**Facts Suite** (10 tests)
- Awards list with dates
- GPA trend assessment
- AP count by year
- First SAT score
- Latest GPA
- Summer programs submitted
- Grade jumps
- Academic vitals trend
- EC activities final
- Program decisions

**KB Suite** (8 tests)
- Narrative arc summary
- Rejection growth summary
- Game plan focus
- Strategic positioning
- Identity synthesis
- Essay strategy
- Strengths and gaps
- 168-hour framework

**EQ Suite** (10 tests)
- Rejection response
- Parent conflict de-escalation
- Deadline crunch template
- Time-boxing guidance
- Celebration response
- Crisis management
- Normalization response
- Identity reinforcement
- Permissioning guidance
- Future pacing

**Features**:
- Select individual tests or run entire suite
- Checkbox selection for granular control
- Sequential or parallel execution

---

## UI Layout

### Left Panel: Scenario Builder
- Single test configuration
- Suite selection and test picking
- Run controls

### Center Panel: Live Results
- Real-time metrics bar
- Answer display
- Trace timeline
- Gate verdicts (✔/⚠/✖)
- Suite aggregates (when running suites)

### Right Panel: Logs & Validation
- Gate verdict summary
- Suite statistics
- Structured JSON log (toggleable)
- Download button for artifacts
- Telemetry status
- Debug info

---

## Metrics Bar

**Single Test View**:
- Model badge (🔶 adapter / ⚪ base)
- Source (SQL/KB/SCAFFOLD)
- Latency (total ms)
- Warmth (✅/—)
- Action (✅/—)
- Meta-leakage (✅/⚠️)

**Suite View**:
- Pass/Warn/Fail counts
- Pass rate percentage
- Latency (p50/p95/max)
- Model mix (adapter vs base)

---

## PRD Scorecard (Suite Mode)

**Automated Quality Gates**:
- **Proof Presence**: % of tests with valid provenance
- **Tone Warmth**: % of EQ tests with warmth signals
- **Tone Action**: % of EQ tests with action nudges
- **No Meta-Leak**: % of tests without meta-instruction leakage
- **Source Correctness**: % of Facts tests routed to SQL

Progress bars show visual health (green ≥90%, yellow ≥70%, red <70%)

---

## Trace Timeline

**Step-by-step execution path**:
1. **Normalize**: Text normalization applied
2. **Lexicon Tags**: Intent tags extracted
3. **Pre-router**: Early routing decision
4. **Router Decision**: Final route + confidence
5. **Source Call**: Actual data source (SQL/KB)
6. **Guards Applied**: Warmth/action injection status
7. **SQL Rows** (if SQL): Row count returned
8. **Provenance** (if KB): Chip count

---

## Gate Validation Rules

### Facts Tests
✔ **Source = SQL** - Correctly routed to deterministic SQL
✔ **Proof Presence** - Has provenance/rows
✔ **No Meta-Leakage** - No internal instructions in answer
✔ **Latency** - Within p50/p95 thresholds
✔ **SQL Skip Guards** - Tone guards correctly skipped

### KB Tests
✔ **Evidence Tags** - Tags detected
✔ **No Meta-Leakage** - Clean answer
⚠ **Latency** - Guidance only (warn if >6s)
✔ **Provenance** - Chips present

### EQ Tests
✔ **Warmth Opener** - Empathy/normalization detected
✔ **Actionability** - Next step/imperative present
✔ **No Meta-Leakage** - Clean answer
✔ **Adapter Consideration** - Adapter used or considered
⚠ **Latency** - Informational only

---

## Telemetry

All test runs are automatically stored:
- **Location**: `data/testlab/runs.jsonl`
- **Format**: JSONL (one JSON object per line)
- **Fields**: timestamp, test_id, category, label, prompt, source, model_badge, latency_ms, warmth, action, meta_leak, provenance_count, gates

**Download Options**:
- Click "Download" button for individual test JSON
- Suite results include full test array + aggregates

---

## Example Workflows

### Workflow 1: Quick Facts Validation
1. Select "Facts Suite"
2. Click "Run Suite"
3. Wait for completion
4. Check PRD Scorecard → "Source Correctness" should be 100%
5. Verify all latencies < 6s

### Workflow 2: EQ Quality Check
1. Select "EQ Suite"
2. Select specific tests (e.g., "Rejection Response", "Crisis Management")
3. Click "Run Suite"
4. Check "Tone Warmth" and "Tone Action" scores → should be 100%
5. Verify adapter consideration in Model Mix

### Workflow 3: Single Test Debug
1. Enter custom prompt: "What awards did I win? include dates + sources"
2. Category: Facts
3. Click "Run Single Test"
4. Check Trace Timeline → verify SQL route
5. Check Gates → all should pass
6. Download JSON for detailed debug

---

## API Endpoints

### POST /api/testlab/run
Run a single test case
```json
{
  "test": {
    "id": "test-001",
    "label": "Test Label",
    "category": "facts",
    "prompt": "What's my GPA?",
    "studentId": "huda-2025"
  }
}
```

### POST /api/testlab/suite
Run a test suite
```json
{
  "suiteId": "facts-suite",
  "label": "Facts Suite",
  "category": "facts",
  "tests": [...],
  "parallel": false
}
```

### POST /api/testlab/telemetry
Store test run results (called automatically)

---

## Files

**Schema & Types**:
- `lib/testlab/schema.ts` - TypeScript type definitions
- `lib/testlab/validators.ts` - PRD gate validation functions

**API Routes**:
- `app/api/testlab/run/route.ts` - Single test runner
- `app/api/testlab/suite/route.ts` - Suite runner
- `app/api/testlab/telemetry/route.ts` - Telemetry storage

**Seed Data**:
- `lib/testlab/suites/facts.json` - 10 Facts tests
- `lib/testlab/suites/kb.json` - 8 KB tests
- `lib/testlab/suites/eq.json` - 10 EQ tests

**UI Components**:
- `app/test-lab/page.tsx` - Main page
- `components/testlab/ScenarioBuilder.tsx` - Left panel
- `components/testlab/LiveResults.tsx` - Center panel
- `components/testlab/LogsPanel.tsx` - Right panel
- `components/testlab/MetricsBar.tsx` - Metrics display
- `components/testlab/TraceView.tsx` - Trace timeline

---

## Quality Gates Reference

| Gate | Category | Pass Threshold | Fail Impact |
|------|----------|----------------|-------------|
| Source = SQL | Facts | 100% | ✖ Fail |
| Proof Presence | Facts | ≥98% | ✖ Fail |
| No Meta-Leakage | All | 100% | ✖ Fail |
| Latency p95 | Facts | ≤6s | ⚠ Warn |
| Warmth Opener | EQ | 100% | ✖ Fail |
| Actionability | EQ | 100% | ✖ Fail |
| Evidence Tags | KB | ≥1 tag | ⚠ Warn |
| Provenance | KB | ≥1 chip | ⚠ Warn |

---

## Troubleshooting

**"Test failed: 500"**
- Check jenny-api is running on port 8787
- Verify DATABASE_URL is set
- Check browser console for errors

**"No tests selected"**
- Select at least one test checkbox
- Or run entire suite (all selected by default)

**Gates failing unexpectedly**
- Check Answer text for meta-leakage patterns
- Verify source routing in Trace Timeline
- Check latency breakdown in Debug Info

**Suite taking too long**
- Sequential mode runs tests one at a time
- Switch to parallel mode (future enhancement)
- Or select fewer tests

---

## Next Steps

1. **Run Facts Suite** → Validate SQL routing is 100%
2. **Run EQ Suite** → Verify warmth/action scores ≥90%
3. **Run KB Suite** → Check evidence tag presence
4. **Download Results** → Store baseline metrics
5. **Compare Over Time** → Track quality trends via telemetry

---

## Support

For issues or questions:
- Check trace timeline for routing decisions
- Download JSON artifact for detailed debugging
- Review telemetry logs in `data/testlab/runs.jsonl`
