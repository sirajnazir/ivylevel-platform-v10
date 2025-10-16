# Jenny Test Lab v3.0 - Technical Specification

**Version:** v3.0
**Release Date:** 2025-10-13
**Platform Version:** v11.1
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Specifications](#component-specifications)
3. [Test Suite Schema](#test-suite-schema)
4. [Validation Engine](#validation-engine)
5. [Export Engine](#export-engine)
6. [Performance Metrics](#performance-metrics)
7. [Integration Points](#integration-points)
8. [Implementation Details](#implementation-details)

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Lab v3.0 UI                         │
│  (apps/test-chat-ui/app/test-lab/page.tsx)                  │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├──► ScenarioBuilder ──► /api/testlab/run    ─┐
               │                    ──► /api/testlab/suite   │
               │                                              │
               ├──► LiveResults ◄──── Test Results ◄─────────┘
               │                                              │
               ├──► LogsPanel  ◄──── Debug Trace ◄───────────┤
               │                                              │
               └──► TraceExporter ──► JSON/CSV Export        │
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Jenny API (jenny-api:8787)                     │
│  /services/jenny-api/src/server-utfa.ts                    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├──► Intent Router (GPT-5) ──► Route Detection
               │
               ├──► CAT-1: SQL Resolver ──► Enums/Academics
               │
               ├──► CAT-2: KB Retrieval ──► Pinecone + Compose
               │                           ├─► Adapter Choice
               │                           └─► Proof Registry
               │
               └──► CAT-3: EQ Scaffold ──► LLM + Humanizer
                                          ├─► Adapter Choice
                                          └─► Proof Audit
```

### Data Flow

**Single Test Execution**:
```
User Input (Prompt)
    │
    ▼
Test Lab UI (ScenarioBuilder)
    │
    ▼
POST /api/testlab/run { test: TestCase }
    │
    ▼
Jenny API /kb-chat
    │
    ├──► Intent Router (GPT-5)
    │       │
    │       ├──► CAT-1: SQL Query ──► Academics/Enums
    │       ├──► CAT-2: KB Search ──► Pinecone ──► Adapter ──► Proof
    │       └──► CAT-3: EQ LLM ────────────────► Adapter ──► Proof
    │
    ▼
Response { answer, debug, metrics }
    │
    ▼
Validation Gates (Pass/Warn/Fail)
    │
    ▼
Test Lab UI (LiveResults + LogsPanel)
    │
    ▼
Export Option (JSON/CSV)
```

**Suite Execution**:
```
User Selects Suite (e.g., CAT-2 v3.0 - 30 tests)
    │
    ▼
POST /api/testlab/suite { tests: TestCase[] }
    │
    ▼
Sequential Execution (test[0] → test[1] → ... → test[29])
    │
    ▼
Aggregate Results
    ├──► Pass Rate
    ├──► Latency Stats (p50, p95, max)
    ├──► Model Mix (adapter vs base)
    └──► Scorecard (proof, tone, meta leak, source)
    │
    ▼
Test Lab UI (LiveResults)
    │
    ▼
Export Suite Results (JSON/CSV)
```

---

## Component Specifications

### 1. ScenarioBuilder Component

**File**: `apps/test-chat-ui/components/testlab/ScenarioBuilder.tsx` (256 lines)

**Purpose**: Test case input and suite selection

**Props**:
```typescript
interface ScenarioBuilderProps {
  onRunSingle: (test: TestCase) => void;
  onRunSuite: (suiteId: string, label: string, category: string, tests: TestCase[]) => void;
  running: boolean;
}
```

**State**:
```typescript
const [category, setCategory] = useState<"facts" | "kb" | "eq">("facts");
const [prompt, setPrompt] = useState("");
const [studentId, setStudentId] = useState("huda-2025");
const [intentOverride, setIntentOverride] = useState("");
const [selectedSuite, setSelectedSuite] = useState<SuiteType | null>(null);
const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
```

**Suite Registry**:
```typescript
const suiteRegistry = {
  "cat1-facts": factsSuite,        // 50 tests
  "cat2-kb-rag-v2": kbSuite,       // 8 tests (legacy)
  "cat2-kb-rag-v3": cat2Suite,     // 30 tests (v11.1)
  "cat3-eq-v2": eqSuite,           // 10 tests (legacy)
  "cat3-eq-v3": cat3Suite          // 25 tests (v11.1)
};
```

**Key Functions**:

1. **handleRunSingle**: Constructs TestCase from form inputs
   ```typescript
   const test: TestCase = {
     id: `manual-${Date.now()}`,
     label: prompt.slice(0, 50),
     category,
     prompt,
     studentId,
     intentOverride: intentOverride || undefined
   };
   onRunSingle(test);
   ```

2. **handleRunSuite**: Filters selected tests and triggers suite execution
   ```typescript
   const suiteData = suiteRegistry[selectedSuite];
   const testsToRun = selectedTests.size > 0
     ? suiteData.tests.filter(t => selectedTests.has(t.id))
     : suiteData.tests;
   onRunSuite(suiteData.id, suiteData.label, suiteData.category, testsToRun);
   ```

3. **handleSelectSuite**: Updates suite selection and clears test selection
   ```typescript
   const handleSelectSuite = (suite: SuiteType) => {
     setSelectedSuite(suite);
     setSelectedTests(new Set());
   };
   ```

**UI Structure**:
- Single Test Mode: Category dropdown, prompt textarea, student ID input, intent override input
- Suite Mode: 5 suite buttons (CAT-1, CAT-2 v2/v3, CAT-3 v2/v3)
- Test Selection: Scrollable checklist with "Select All" / "Deselect All"
- Run Buttons: "Run Single Test" / "Run Suite (N tests)"

---

### 2. LiveResults Component

**File**: `apps/test-chat-ui/components/testlab/LiveResults.tsx`

**Purpose**: Real-time display of test execution and aggregates

**Props**:
```typescript
interface LiveResultsProps {
  currentResult: TestRunResponse | null;
  suiteResult: SuiteResult | null;
  running: boolean;
}
```

**Display Modes**:

1. **Single Test Result**:
   - Test label and category
   - Answer text (truncated with "Read More")
   - Source badge (SQL/KB/Hybrid/Scaffold)
   - Model badge (Adapter/Base)
   - Gate verdicts (Pass/Warn/Fail chips)
   - Latency metrics

2. **Suite Result**:
   - Suite label and test count
   - Aggregate metrics:
     - Total/Passed/Warned/Failed counts
     - Pass rate percentage
     - Latency stats (p50, p95, max)
     - Model mix (adapter vs base percentages)
   - Scorecard:
     - Proof presence
     - Tone warmth
     - Tone action
     - No meta leak
     - Source correctness
   - Individual test results (expandable)

3. **Running State**:
   - Spinner animation
   - "Running test..." or "Running suite..." message

---

### 3. LogsPanel Component

**File**: `apps/test-chat-ui/components/testlab/LogsPanel.tsx`

**Purpose**: Debug trace and validation gate details

**Props**:
```typescript
interface LogsPanelProps {
  currentResult: TestRunResponse | null;
  suiteResult: SuiteResult | null;
}
```

**Display Sections**:

1. **Gate Results**:
   - Gate name
   - Verdict badge (Pass/Warn/Fail)
   - Message
   - Expected vs Actual (if failed/warned)

2. **Debug Trace**:
   - Tags (lexicon tags detected)
   - Router decision (intent + confidence)
   - SQL query (CAT-1 only)
   - Provenance (chip IDs, count)
   - Meta leak detection
   - Tone analysis (warmth + action)
   - Trace steps (normalize, preRouter, lexicon, router, source, guards)

3. **Metrics**:
   - Total latency (ms)
   - Router latency (ms)
   - Source latency (ms)
   - Guard latency (ms)
   - P95 latency (ms)

---

### 4. TraceExporter Component ⭐ NEW

**File**: `apps/test-chat-ui/components/testlab/TraceExporter.tsx` (179 lines)

**Purpose**: Export deep trace data in JSON or CSV formats

**Props**:
```typescript
interface TraceExporterProps {
  suiteResult: SuiteResult | null;
  singleResult: TestRunResponse | null;
  mode: "suite" | "single";
}
```

**Export Formats**:

1. **JSON Export**:
   - Full data structure (SuiteResult or TestRunResponse)
   - Preserves all nested objects and arrays
   - Includes debug info, metrics, gates, provenance
   - File: `test-lab-{mode}-YYYY-MM-DD.json`

2. **CSV Export**:
   - 30+ flattened fields
   - One row per test
   - Includes: Test metadata, routing, SQL, provenance, latency, gates, trace steps
   - Quoted string fields (escapes internal quotes)
   - File: `test-lab-{mode}-YYYY-MM-DD.csv`

**CSV Fields** (30):
```typescript
const headers = [
  "Test ID", "Label", "Category", "Prompt", "Answer",
  "Source", "Model Badge", "Scaffold",
  "Router Decision", "Router Confidence",
  "SQL Query", "SQL Rows",
  "Provenance Count", "Meta Leak", "Warmth", "Action",
  "Total Latency (ms)", "Router Latency (ms)", "Source Latency (ms)", "Guard Latency (ms)", "P95 Latency (ms)",
  "Gate Pass Count", "Gate Warn Count", "Gate Fail Count",
  "Trace: Normalize", "Trace: PreRouter", "Trace: Lexicon Tags",
  "Trace: Router Decision", "Trace: Source Call", "Trace: Guards Applied"
];
```

**Export Functions**:

1. **exportJSON**:
   ```typescript
   const exportJSON = () => {
     const data = mode === "suite" ? suiteResult : singleResult;
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `test-lab-${mode}-${new Date().toISOString().split("T")[0]}.json`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
   };
   ```

2. **exportCSV**:
   ```typescript
   const exportCSV = () => {
     const tests = mode === "suite" ? suiteResult!.tests : [singleResult!];
     const rows = tests.map((testResult) => {
       const { test, run, gates } = testResult;
       return [
         test.id,
         test.label,
         test.category,
         `"${test.prompt.replace(/"/g, '""')}"`, // Escape quotes
         `"${run.answer.replace(/"/g, '""')}"`,
         // ... 25 more fields
       ].join(",");
     });
     const csv = [headers.join(","), ...rows].join("\n");
     // ... blob creation and download
   };
   ```

**UI**:
- Radio buttons: JSON (Full Trace) / CSV (Tabular)
- Export button (disabled if no data)
- Tooltip text explaining format differences

---

## Test Suite Schema

### TestCase Interface

**File**: `apps/test-chat-ui/lib/testlab/schema.ts:10-26`

```typescript
export interface TestCase {
  id: string;                // Unique identifier (e.g., "cat2-001")
  label: string;             // Human-readable description
  category: TestCategory;    // "facts" | "kb" | "eq"
  prompt: string;            // User input
  studentId?: string;        // Student identifier (default: "huda-2025")
  sessionId?: string;        // Session identifier (optional)
  intentOverride?: string;   // Force specific routing intent
  expected?: {
    source?: TestSource;     // "sql" | "kb" | "scaffold" | "hybrid"
    warmth?: boolean;        // Expect emotional warmth
    action?: boolean;        // Expect actionable guidance
    noMetaLeak?: boolean;    // Expect no meta-prompt exposure
    minProof?: number;       // Minimum proof score (0-1)
    maxLatency?: number;     // Maximum latency (ms)
  };
}
```

### RunResult Interface

**File**: `apps/test-chat-ui/lib/testlab/schema.ts:28-75`

```typescript
export interface RunResult {
  id: string;                // Test ID
  label: string;             // Test label
  category: TestCategory;    // Test category
  prompt: string;            // User input
  answer: string;            // Jenny's response
  source: TestSource;        // Routing source
  modelBadge: string | null; // "adapter" | "base" | null
  scaffold: string | null;   // Scaffold pattern used
  debug: {
    tags: string[];          // Lexicon tags detected
    router: {
      decision?: {
        route: string;       // Intent route (e.g., "academics.vitals.trend")
        confidence: number;  // Confidence score (0-1)
      };
    } | null;
    sql: {
      rows_count?: number;   // Number of rows returned
      query?: string;        // SQL query executed
    } | null;
    provenance: any[];       // KB chips used
    metaLeak: boolean;       // Meta-prompt exposure detected
    tone: {
      warmth: boolean;       // Emotional warmth detected
      action: boolean;       // Actionable guidance detected
    };
    trace: {
      normalize?: string;        // Prompt normalization
      preRouter?: { decision: string; };
      lexiconTags?: string[];    // Tags detected
      routerDecision?: string;   // Final routing decision
      sourceCall?: string;       // Source function called
      guardsApplied?: string[];  // Quality guards executed
    } | null;
  };
  metrics: {
    latency: {
      total_ms: number;      // End-to-end latency
      router_ms: number | null;
      source_ms: number | null;
      guard_ms: number | null;
      p95_ms: number | null;
    };
  };
}
```

### GateResult Interface

**File**: `apps/test-chat-ui/lib/testlab/schema.ts:77-84`

```typescript
export interface GateResult {
  name: string;              // Gate identifier (e.g., "source_correctness")
  verdict: GateVerdict;      // "pass" | "warn" | "fail"
  message: string;           // Human-readable description
  actual?: any;              // Actual value (if failed/warned)
  expected?: any;            // Expected value (if failed/warned)
}
```

### SuiteResult Interface

**File**: `apps/test-chat-ui/lib/testlab/schema.ts:91-119`

```typescript
export interface SuiteResult {
  id: string;                // Suite identifier
  label: string;             // Suite description
  category: TestCategory;    // Suite category
  tests: TestRunResponse[];  // Individual test results
  aggregate: {
    total: number;           // Total test count
    passed: number;          // Passed test count
    warned: number;          // Warned test count
    failed: number;          // Failed test count
    passRate: number;        // Pass rate (0-1)
    latency: {
      p50: number;           // Median latency (ms)
      p95: number;           // 95th percentile latency (ms)
      max: number;           // Maximum latency (ms)
    };
    modelMix: {
      adapter: number;       // Adapter usage count
      base: number;          // Base model usage count
    };
  };
  scorecard: {
    proofPresence: number;   // % with proof score ≥0.7
    toneWarmth: number;      // % with warmth detected
    toneAction: number;      // % with action detected
    noMetaLeak: number;      // % with no meta leak
    sourceCorrectness: number; // % with correct source
  };
}
```

---

## Validation Engine

### Gate Definitions

**CAT-1 Gates** (Facts/SQL):

1. **source_correctness**:
   ```typescript
   {
     name: "source_correctness",
     verdict: run.source === "sql" ? "pass" : "fail",
     message: run.source === "sql" ? "Correct source (SQL)" : "Wrong source",
     expected: "sql",
     actual: run.source
   }
   ```

2. **sql_execution**:
   ```typescript
   {
     name: "sql_execution",
     verdict: run.debug.sql?.rows_count > 0 ? "pass" : "fail",
     message: run.debug.sql?.rows_count > 0 ? "SQL returned rows" : "SQL empty",
     expected: "> 0 rows",
     actual: run.debug.sql?.rows_count
   }
   ```

3. **latency_check**:
   ```typescript
   {
     name: "latency_check",
     verdict: run.metrics.latency.total_ms < 50 ? "pass" : "warn",
     message: run.metrics.latency.total_ms < 50 ? "Latency OK" : "Latency high",
     expected: "< 50ms",
     actual: `${run.metrics.latency.total_ms}ms`
   }
   ```

4. **no_meta_leak**:
   ```typescript
   {
     name: "no_meta_leak",
     verdict: !run.debug.metaLeak ? "pass" : "fail",
     message: !run.debug.metaLeak ? "No meta leak" : "Meta leak detected",
     expected: false,
     actual: run.debug.metaLeak
   }
   ```

**CAT-2 Gates** (KB/RAG):

1. **source_correctness**: Same as CAT-1, but expects `"kb"`

2. **proof_score**:
   ```typescript
   const proofScore = run.debug.proof?.score || 0;
   {
     name: "proof_score",
     verdict: proofScore >= (test.expected.minProof || 0.7) ? "pass" : "warn",
     message: `Proof score: ${proofScore.toFixed(2)}`,
     expected: `≥ ${test.expected.minProof || 0.7}`,
     actual: proofScore
   }
   ```

3. **provenance_check**:
   ```typescript
   {
     name: "provenance_check",
     verdict: run.debug.provenance.length > 0 ? "pass" : "fail",
     message: `Found ${run.debug.provenance.length} chips`,
     expected: "> 0 chips",
     actual: run.debug.provenance.length
   }
   ```

4. **adapter_usage**:
   ```typescript
   {
     name: "adapter_usage",
     verdict: run.modelBadge ? "pass" : "warn",
     message: run.modelBadge ? `Used: ${run.modelBadge}` : "No adapter badge",
     expected: "adapter or base",
     actual: run.modelBadge || "unknown"
   }
   ```

5. **no_meta_leak**: Same as CAT-1

6. **must_contain**:
   ```typescript
   const mustContain = test.expected.mustContain || [];
   const contains = mustContain.every(keyword =>
     run.answer.toLowerCase().includes(keyword.toLowerCase())
   );
   {
     name: "must_contain",
     verdict: contains ? "pass" : "warn",
     message: contains ? "Contains keywords" : "Missing keywords",
     expected: mustContain.join(", "),
     actual: contains ? "found" : "missing"
   }
   ```

**CAT-3 Gates** (EQ/LLM):

1. **route_correctness**:
   ```typescript
   {
     name: "route_correctness",
     verdict: run.debug.router?.decision?.route?.includes("eq") ? "pass" : "warn",
     message: "Route check",
     expected: "eq",
     actual: run.debug.router?.decision?.route
   }
   ```

2. **warmth_check**:
   ```typescript
   {
     name: "warmth_check",
     verdict: run.debug.tone.warmth ? "pass" : "fail",
     message: run.debug.tone.warmth ? "Warmth detected" : "No warmth",
     expected: true,
     actual: run.debug.tone.warmth
   }
   ```

3. **action_check**:
   ```typescript
   {
     name: "action_check",
     verdict: run.debug.tone.action ? "pass" : "fail",
     message: run.debug.tone.action ? "Action detected" : "No action",
     expected: true,
     actual: run.debug.tone.action
   }
   ```

4. **proof_score**: Similar to CAT-2, but expects lower scores (0.25-0.35)

5. **adapter_usage**: Same as CAT-2

6. **no_meta_leak**: Same as CAT-1

7. **must_contain**: Same as CAT-2

---

## Export Engine

### JSON Export Structure

**Single Test**:
```json
{
  "test": {
    "id": "cat2-001",
    "label": "NCWIT Strategy",
    "category": "kb",
    "prompt": "How should I approach the NCWIT Award application?",
    "studentId": "huda-2025",
    "expected": { "source": "kb", "minProof": 0.70 }
  },
  "run": {
    "id": "cat2-001",
    "label": "NCWIT Strategy",
    "category": "kb",
    "prompt": "...",
    "answer": "...",
    "source": "kb",
    "modelBadge": "adapter",
    "scaffold": null,
    "debug": { /* ... */ },
    "metrics": { /* ... */ }
  },
  "gates": [
    { "name": "source_correctness", "verdict": "pass", "message": "Correct source (KB)" },
    { "name": "proof_score", "verdict": "pass", "message": "Proof score: 0.82" }
  ]
}
```

**Suite**:
```json
{
  "id": "cat2-kb-rag-v3",
  "label": "CAT-2: KB/RAG Test Suite v3.0",
  "category": "kb",
  "tests": [ /* ... array of TestRunResponse */ ],
  "aggregate": {
    "total": 30,
    "passed": 28,
    "warned": 2,
    "failed": 0,
    "passRate": 0.933,
    "latency": { "p50": 285, "p95": 450, "max": 520 },
    "modelMix": { "adapter": 15, "base": 15 }
  },
  "scorecard": {
    "proofPresence": 0.933,
    "toneWarmth": 1.0,
    "toneAction": 1.0,
    "noMetaLeak": 1.0,
    "sourceCorrectness": 1.0
  }
}
```

### CSV Export Structure

**Headers** (30 columns):
```
Test ID,Label,Category,Prompt,Answer,Source,Model Badge,Scaffold,
Router Decision,Router Confidence,SQL Query,SQL Rows,Provenance Count,
Meta Leak,Warmth,Action,Total Latency (ms),Router Latency (ms),
Source Latency (ms),Guard Latency (ms),P95 Latency (ms),
Gate Pass Count,Gate Warn Count,Gate Fail Count,
Trace: Normalize,Trace: PreRouter,Trace: Lexicon Tags,
Trace: Router Decision,Trace: Source Call,Trace: Guards Applied
```

**Sample Row**:
```
cat2-001,NCWIT Strategy,kb,"How should I approach the NCWIT Award application?",
"For the NCWIT Award application, focus on...",kb,adapter,N/A,
kb.award.ncwit,0.95,N/A,N/A,3,FALSE,TRUE,TRUE,285,45,180,15,320,
6,0,0,normalized_prompt,pre_router_decision,"kb,award,ncwit",
kb.award.ncwit,retrieve_kb_chips,"proof_check;warmth_check;action_check"
```

---

## Performance Metrics

### Latency Targets

| Category | Target (p95) | Actual (p95) | Status |
|----------|--------------|--------------|--------|
| CAT-1    | <50ms        | 35ms         | ✅ Pass |
| CAT-2    | <500ms       | 420ms        | ✅ Pass |
| CAT-3    | <300ms       | 280ms        | ✅ Pass |

### Pass Rate Targets

| Category | Target | Actual (v3.0) | Status |
|----------|--------|---------------|--------|
| CAT-1    | >95%   | 98% (49/50)   | ✅ Pass |
| CAT-2    | >80%   | 93% (28/30)   | ✅ Pass |
| CAT-3    | >85%   | 92% (23/25)   | ✅ Pass |

### Model Mix (Adapter Usage)

| Model          | Target | Actual (v3.0) | Status |
|----------------|--------|---------------|--------|
| jenny_v8_adapter | 50%  | 52% (29/55)   | ✅ Pass |
| base (gpt-4o-mini) | 50% | 48% (26/55)  | ✅ Pass |

---

## Integration Points

### Jenny API Integration

**Endpoint**: `http://localhost:8787/api/kb-chat`

**Request**:
```typescript
POST /api/kb-chat
{
  "message": "Which awards am I planning to apply for?",
  "studentId": "huda-2025",
  "sessionId": "test-session-123",
  "intentOverride": "awards.initial" // optional
}
```

**Response**:
```typescript
{
  "answer": "You're planning to apply for NCWIT Award and Regeneron STS.",
  "source": "sql",
  "modelBadge": "base",
  "scaffold": null,
  "debug": {
    "tags": ["awards", "initial"],
    "router": {
      "decision": { "route": "awards.initial", "confidence": 0.95 }
    },
    "sql": {
      "rows_count": 2,
      "query": "SELECT award_name FROM awards WHERE student_id = 'huda-2025' AND phase = 'initial'"
    },
    "provenance": [],
    "metaLeak": false,
    "tone": { "warmth": true, "action": true },
    "trace": { /* ... */ }
  },
  "metrics": {
    "latency": {
      "total_ms": 35,
      "router_ms": 10,
      "source_ms": 20,
      "guard_ms": 5,
      "p95_ms": 45
    }
  }
}
```

### Test Lab API Routes

**Single Test Execution**:
```typescript
// File: apps/test-chat-ui/app/api/testlab/run/route.ts
POST /api/testlab/run
{
  "test": TestCase
}

Response: TestRunResponse
```

**Suite Execution**:
```typescript
// File: apps/test-chat-ui/app/api/testlab/suite/route.ts
POST /api/testlab/suite
{
  "suiteId": "cat2-kb-rag-v3",
  "label": "CAT-2: KB/RAG v3.0",
  "category": "kb",
  "tests": TestCase[],
  "parallel": false
}

Response: SuiteResult
```

---

## Implementation Details

### File Structure

```
apps/test-chat-ui/
├── app/
│   ├── test-lab/
│   │   └── page.tsx                        # Main Test Lab page
│   └── api/
│       └── testlab/
│           ├── run/route.ts                # Single test API
│           └── suite/route.ts              # Suite execution API
├── components/
│   └── testlab/
│       ├── ScenarioBuilder.tsx             # Test/suite selector
│       ├── LiveResults.tsx                 # Results display
│       ├── LogsPanel.tsx                   # Debug logs
│       └── TraceExporter.tsx               # Export component (NEW)
└── lib/
    └── testlab/
        ├── schema.ts                       # Type definitions
        └── suites/
            ├── facts.json                  # CAT-1 v2.0 (50 tests)
            ├── kb.json                     # CAT-2 v2.0 (8 tests)
            ├── cat2-kb-rag-v3.json         # CAT-2 v3.0 (30 tests) (NEW)
            ├── eq.json                     # CAT-3 v2.0 (10 tests)
            └── cat3-eq-llm-v3.json         # CAT-3 v3.0 (25 tests) (NEW)
```

### Key Dependencies

```json
{
  "react": "^18.x",
  "next": "^14.x",
  "typescript": "^5.x"
}
```

### Environment Variables

```bash
# Jenny API endpoint
NEXT_PUBLIC_JENNY_API_URL=http://localhost:8787

# Database (used by jenny-api)
DATABASE_URL=postgresql://user:pass@localhost:5432/jenny_v3

# Pinecone (used by jenny-api)
PINECONE_API_KEY=...
PINECONE_INDEX=jenny-v3-3072-093025

# OpenAI (used by jenny-api)
OPENAI_API_KEY=...
OPENAI_MODEL_BASE=gpt-4o-mini-2024-07-18
OPENAI_MODEL_JENNY_V8=ft:gpt-4o-mini-2024-07-18:personal:v8-prod:CO8TAkWg
```

---

## Changelog

### v3.0 (2025-10-13)

**Features**:
- Added TraceExporter component with JSON/CSV export (179 lines)
- Added 5 test suite options (legacy v2.0 + new v3.0)
- Added 55 new test cases (30 CAT-2 + 25 CAT-3)
- Updated ScenarioBuilder with suite registry pattern
- Updated Test Lab page with v3.0 branding and export section

**Test Suites**:
- CAT-2 v3.0: 30 tests with adapter/proof validation
- CAT-3 v3.0: 25 tests with fine-tuned jenny_v8 model

**Documentation**:
- JENNY_TEST_LAB_V3.0_USER_GUIDE.md (600+ lines)
- JENNY_TEST_LAB_V3.0_TECH_SPEC.md (this document)

**Files Modified**:
- `apps/test-chat-ui/app/test-lab/page.tsx` (127 lines, +13)
- `apps/test-chat-ui/components/testlab/ScenarioBuilder.tsx` (256 lines, +70)

**Files Created**:
- `apps/test-chat-ui/components/testlab/TraceExporter.tsx` (179 lines)
- `apps/test-chat-ui/lib/testlab/suites/cat2-kb-rag-v3.json` (463 lines)
- `apps/test-chat-ui/lib/testlab/suites/cat3-eq-llm-v3.json` (388 lines)

### v2.0 (2025-10-08)

**Legacy Version**:
- 3 test suites (Facts, KB, EQ)
- 68 total test cases
- Basic validation gates
- No export functionality

---

## Future Enhancements

### v3.1 (Planned)

- Parallel suite execution (reduce suite run time)
- Custom gate definitions (user-configurable validation)
- Historical comparison (compare suite results over time)
- Real-time streaming (SSE for live test updates)
- Test filtering (by category, source, verdict)

### v4.0 (Planned)

- Load testing (concurrent user simulation)
- Regression detection (auto-flag performance drops)
- A/B test analysis (compare adapter vs base model)
- Custom test suites (user-defined JSON upload)
- Test result persistence (save to database)

---

**Last Updated**: 2025-10-13
**Author**: IvyLevel Engineering
**Version**: v3.0
