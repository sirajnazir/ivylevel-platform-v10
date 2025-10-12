# Jenny Thin UI v1.2 - Chat + Trace + Export

**Version:** v1.2
**Created:** 2025-10-11
**Updated:** 2025-10-11 (v10.5.2 Cat-1 Enhancement)
**Purpose:** Single-file testing UI for v10.5.2 unified pipeline with complete Cat-1 coverage

---

## What This Is

A clean, self-contained React UI for testing Jenny's v10.5.2 unified pipeline:
- **Category 1 (Facts-First SQL)**: Deterministic facts from database views
  - **v10.5.2 ENHANCED**: Complete coverage of all restored fact types
  - Awards, IvyScore, College List, GamePlan, Academics, Activities, Testing, Programs
- **Category 2 (KB/RAG Coaching)**: Vector search + reranking + coaching knowledge
- **Category 3 (Fine-Tuned LLM/EQ)**: Emotional support from fine-tuned adapter
- **Humanizer v2.1**: Jenny's real voice layer with EQ signal integration

---

## Features

### 1. Clean Chat Interface
- Clean message bubbles (user on right, Jenny on left)
- Real-time responses from `/agent/chat/gpt5` endpoint
- Loading states and error handling
- Configurable student ID and endpoint

### 2. Deep Trace Panel (Toggleable)
Shows inch-by-inch pipeline details:
- **Route**: `sql` | `kb` | `llm`
- **Model**: Full model ID (e.g., `ft:gpt-4o-mini-2024-07-18:personal:jenny...`)
- **Model Badge**: `FT` (fine-tuned) or `GPT` (base)
- **Trace ID**: Unique identifier for request
- **Latency**: Response time in milliseconds

**Humanizer v2.1 Flags**:
- `warmth` - Added Jenny's voice opener
- `action` - Injected concrete next step
- `proof` - Wrapped facts in code fence (Cat-1 only)
- `scrub` - Removed meta-leakage
- `phrase_source` - `eq` (real signals) or `fallback` (defaults)
- `cadence` - Response pacing style

**KB Hits** (if Cat-2):
- Text snippet from vector match
- Source file/location
- Rerank score

**Facts Block** (if Cat-1):
- Verbatim SQL results (unchanged by humanizer)

**Vitals**:
- Student metadata from database

**Raw Debug JSON**:
- Complete backend response for debugging

### 3. Exportable Traces

**Per-Turn Export** (button on each message):
- Downloads HAR-like JSON envelope with:
  - `request`: endpoint, body, headers
  - `response`: answer, hits, vitals, route, humanizer flags, model, trace_id
  - `timings`: start/end/duration
  - `env`: user agent, origin, UI version
  - `ui_notes`: quick summary of key flags

**Session Export** (top-right button):
- Downloads full session JSON with all turns
- Perfect for attaching to bug reports

### 4. Quick-Pick Chips (v10.5.2 Enhanced)

One-click test prompts for all 3 categories:

**Cat-1 (SQL Facts) - v10.5.2 Complete Coverage**:
- **Awards**: "What awards did I win?", "Show me my initial awards list", "What's my final awards list?", "Did I win any national awards?"
- **IvyScore**: "What's my IvyScore?", "Show me my readiness score", "What are my top priorities?", "Am I ready for top colleges?"
- **College List**: "Show me my college list", "Which colleges did I apply to?", "Which college am I attending?", "Did I get into MIT?", "Show me my reach schools"
- **GamePlan**: "What's my game plan?", "Show me my college timeline", "What are my upcoming deadlines?", "What should I work on next?"
- **Academics**: "What's my latest GPA?", "Show me my transcript", "What courses am I taking?", "What's my current GPA?", "Show me my final transcript"
- **Activities**: "Show me my final activities list", "What extracurriculars do I have?", "What activities did I do?", "Show me my initial ECs"
- **Testing (SAT)**: "What was my first SAT score?", "Show me my SAT trajectory", "What are my test scores?", "Did my SAT improve over time?"
- **Programs**: "What summer programs did I apply to?", "Show me my program decisions", "Which programs did I get into?", "What's my final programs list?"

**Cat-2 (KB/RAG)**:
- "Tell me about the rejection bridge technique"
- "How do I build a spike?"
- "What's the 168-hour framework?"
- "Explain the evidence ledger approach"
- "How do I write a compelling personal statement?"
- "What makes a strong Why Us essay?"

**Cat-3 (FT/EQ)**:
- "I got rejected from Stanford and feel really behind"
- "I'm struggling with time management this week"
- "I'm worried my ECs aren't impressive enough"
- "How do I stay motivated during app season?"
- "I feel overwhelmed with deadlines"
- "I'm anxious about my college decisions"

---

## How to Use

### 1. Prerequisites

Ensure your environment has:
- Next.js app running (`apps/test-chat-ui/`)
- Tailwind CSS configured
- Jenny API server running on port 8787

### 2. Access the UI

Navigate to: `http://localhost:3000/jenny-ui`

(Assumes Next.js dev server on port 3000)

### 3. Configure Settings

- **Student ID**: Default `huda-2025` (change as needed)
- **Endpoint**: Default `/agent/chat/gpt5` (unified pipeline)
- **Show/Hide Trace**: Toggle right panel for debug info

### 4. Test All 3 Categories

**Option A: Quick-Pick Chips**
- Click any chip under Cat-1/Cat-2/Cat-3
- Observe response and trace panel

**Option B: Custom Prompts**
- Type any question in input box
- Press Send or hit Enter

### 5. Export Traces

**Single Turn**:
- Click "Export Trace" button on any Jenny response
- Downloads `jenny-trace-{id}.json`

**Full Session**:
- Click "Export Session" button (top-right)
- Downloads `jenny-session-{timestamp}.json`

---

## File Structure

```
/apps/test-chat-ui/app/jenny-ui/
├── page.tsx           # Main UI component (this file)
└── README.md          # Documentation (you are here)
```

**Single-file architecture**: All logic in `page.tsx` (no dependencies on other UI files)

---

## Integration with v10.5.2

### Unified Pipeline Flow

```
User Input
   ↓
Jenny UI v1.2 (page.tsx) - 8 Cat-1 subcategories
   ↓
POST /agent/chat/gpt5
   ↓
agentChat() orchestrator (jenny-api/src/orchestrator/agentChat-utfa.ts)
   ↓
├─ Intent Classification (intent-enum.ts) → route detection
├─ Category 1: SQL Facts → resolvers (awards, ivyscore, college, gameplan, etc.) → humanize(route: 'sql')
├─ Category 2: KB/RAG → hybrid search → rerank → compose → humanize(route: 'kb')
└─ Category 3: FT/EQ → fine-tuned model → compose → humanize(route: 'llm')
   ↓
Humanizer v2.1 (jenny-api/src/lib/humanizer.ts)
   ↓
Response
   ↓
Jenny UI displays answer + trace
```

### Zero Backend Changes Required

**This UI is 100% additive**:
- No changes to v10.5.2 code
- No new backend endpoints
- Uses existing `/agent/chat/gpt5` unified pipeline
- All trace data comes from existing `debug` fields
- Simply provides comprehensive test coverage for v10.5.2 Cat-1 features

---

## Trace Data Structure

### Request Format

```json
{
  "message": "What was my first SAT score?",
  "student_id": "huda-2025"
}
```

### Response Format

```json
{
  "answer": "**Quick facts (from your records):**\n```\nFirst SAT score: 1360 (practice, Mon Jan 15 2024)\n```\n\nSo excited to work together! ...",
  "debug": {
    "route": "sql",
    "model": "ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy",
    "trace_id": "trace-1234567890",
    "humanizer": {
      "applied": {
        "warmth": true,
        "action": true,
        "proof_presenter": true,
        "safety_scrub": false
      },
      "plan": {
        "phrase_source": "eq",
        "cadence": "standard"
      }
    },
    "hits": [...],
    "vitals": {...},
    "sqlBlock": "First SAT score: 1360 (practice, Mon Jan 15 2024)"
  }
}
```

---

## Testing Checklist (v10.5.2)

**Category 1 (SQL Facts) - Complete Coverage**:
- [ ] **Awards**: Click "What awards did I win?" - verify real award names (NCWIT, Congressional App, etc.)
- [ ] **IvyScore**: Click "What's my IvyScore?" - verify score appears (e.g., "90.5/100")
- [ ] **College List**: Click "Show me my college list" - verify schools with buckets (Reach/Target/Safety) and decisions
- [ ] **College Attending**: Click "Which college am I attending?" - verify "✓ ATTENDING" marker
- [ ] **GamePlan**: Click "What's my game plan?" - verify timeline/events appear
- [ ] **Academics (GPA)**: Click "What's my latest GPA?" - verify GPA value appears
- [ ] **Academics (Transcript)**: Click "Show me my transcript" - verify courses list
- [ ] **Activities**: Click "Show me my final activities list" - verify ECs appear
- [ ] **Testing (SAT)**: Click "What was my first SAT score?" - verify SAT score + date
- [ ] **Programs**: Click "What summer programs did I apply to?" - verify program list
- [ ] Verify all Cat-1 responses show facts in code fence
- [ ] Verify warmth added before facts
- [ ] Check trace shows `route: sql` or specific route (e.g., `awards.final`, `ivyscore.latest`)

**Category 2 (KB/RAG)**:
- [ ] Click "Tell me about the rejection bridge technique" chip
- [ ] Verify coaching content from KB
- [ ] Verify warmth + action present
- [ ] Check trace shows KB hits with scores
- [ ] Verify `phrase_source: eq` or `fallback`

**Category 3 (FT/EQ)**:
- [ ] Click "I got rejected from Stanford..." chip
- [ ] Verify empathetic response
- [ ] Verify concrete action step
- [ ] Check trace shows `route: llm` and fine-tuned model
- [ ] Verify warmth from EQ signals

**Session Export**:
- [ ] Send 3+ messages from different Cat-1 subcategories
- [ ] Send 1+ Cat-2 and 1+ Cat-3 message
- [ ] Click "Export Session" button
- [ ] Verify JSON contains all turns with traces

---

## Troubleshooting

### UI not loading
- Check Next.js dev server is running: `cd apps/test-chat-ui && pnpm dev`
- Navigate to `http://localhost:3000/jenny-ui`

### "Failed to fetch" error
- Check Jenny API server is running: `cd services/jenny-api && PORT=8787 tsx src/server-utfa.ts`
- Verify server logs show: `Port: 8787` and `humanizer: 'enabled'`

### No trace data showing
- Verify endpoint is `/agent/chat/gpt5` (not `/agent/chat`)
- Check browser console for errors
- Toggle "Show Trace" button

### Exported JSON missing fields
- Ensure using v10.4 backend (check server logs for version)
- Verify `debug.humanizer` field exists in response
- Try exporting again

---

## Architecture Notes

### Why Single File?

**Simplicity**: All logic in one place for easy debugging and modification

**No Dependencies**: Doesn't rely on other UI components or shared state

**Easy Integration**: Drop into any Next.js app that has Tailwind

### Why Client Component?

Needs browser APIs:
- `useState` for message history
- `fetch` for API calls
- `URL.createObjectURL` for downloads
- `navigator.userAgent` for trace metadata

### Why HAR-like Export?

Standard format used by browsers and debugging tools:
- `request`: What was sent
- `response`: What came back
- `timings`: How long it took
- `env`: Context metadata

Makes it easy to share traces and reproduce issues.

---

## Version History

### v1.2 (2025-10-11) - v10.5.2 Cat-1 Enhancement
- **MAJOR**: Enhanced Cat-1 quick-pick chips with complete v10.5.2 coverage
- Added 8 fact type categories (Awards, IvyScore, College, GamePlan, Academics, Activities, Testing, Programs)
- Added 32 comprehensive Cat-1 test prompts (up from 4)
- Organized chips by subcategory with visual grouping
- Updated UI version labels to v10.5.2
- Added scrollable chips area with max-height
- Enhanced Cat-2 with 2 additional prompts
- Enhanced Cat-3 with 2 additional prompts
- Updated welcome message to highlight v10.5.2 Cat-1 coverage

### v1.1 (2025-10-11)
- Added per-turn trace export (JSON download)
- Added session-wide export (all turns)
- Added HAR-like envelope format
- Added humanizer flags to trace panel
- Added quick-pick chips for all 3 categories

### v1.0 (2025-10-11)
- Initial release
- Chat interface with toggleable trace panel
- Integration with v10.4 unified pipeline
- Real-time display of route, model, humanizer flags, KB hits

---

## Related Documentation

- **v10.5.2 Release Notes**: `/docs/PROD_FEATURE_RELEASE_DETAILS.md` (Section: v10.5.2)
- **v10.5.2 Master Spec**: `/docs/MASTER_PROD_TECH_SPEC.md`
- **Future Extensibility Guide**: `/docs/FUTURE_EXTENSIBILITY.md` (how to add new fact types)
- **Humanizer v2.1**: `/docs/MASTER_PROD_TECH_SPEC.md` (Section: Answer Composition)
- **Test Results**: `/logs/V10.4_HUMANIZER_TEST_RESULTS_2025-10-11.md`
- **Project Structure**: `/docs/guides/PROJECT_STRUCTURE.md`

---

**Status**: ✅ Production Ready - v10.5.2 Complete Cat-1 Coverage
**Last Updated**: 2025-10-11
**Maintainer**: IvyLevel Platform Team
