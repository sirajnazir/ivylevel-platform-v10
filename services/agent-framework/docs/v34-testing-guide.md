# v34.0 Universal Orchestration - Testing Guide

**Version:** v34.0
**Created:** 2025-11-05
**Status:** Ready for Testing

---

## Quick Start

### 1. Enable v34.0 Orchestration

Add to `.env`:
```bash
USE_V34_ORCHESTRATION=true
```

### 2. Start Server

```bash
cd services/agent-framework
npm run dev
```

You should see in logs:
```
[v34.0 DEBUG] Creating LangGraphOrchestratorV34...
[v34.0 DEBUG] LangGraphOrchestratorV34 created successfully!
```

### 3. Run Test Suite

```bash
./scripts/test-v34-orchestration.sh
```

Expected output:
```
================================================
v34.0 Universal Orchestration Test Suite
================================================

[TEST 1] Server health check
✓ PASS Server is running at http://localhost:8787

[TEST 2] Create new multiagent session
✓ PASS Session created: <session-id>

[TEST 3] Send message to Assessment Agent (v26 fallback)
✓ PASS Using v34.0 orchestration
✓ PASS Response has agent_response field
✓ PASS Intelligence types triggered: 3
✓ PASS Metadata includes data_collected_so_far

...

Status: ✅ ALL TESTS PASSED
```

---

## What v34.0 Changes

### Architecture

**Before (v31.4):**
```
User → LangGraph → Agent → Response
        ↑ State only
```

**After (v34.0):**
```
User → LangGraph → Agent → Signals
                      ↓
              Decision Engines
                      ↓
         Handover | Delegation | Escalation
                      ↓
                  Response
```

### Key Features

1. **Universal Signal Protocol**
   - Agents return completion hints (not commands)
   - Orchestrator makes routing decisions
   - Clean separation of concerns

2. **Decision Engines**
   - **HandoverDecisionEngine**: Assessment → GamePlan → Execution
   - **DelegationDecisionEngine**: GamePlan → Awards/ECs/Programs/Scholarships
   - **EscalationDecisionEngine**: Low confidence → Human coach

3. **Backward Compatible**
   - v26 metadata fallback (agents don't need changes yet)
   - Zero breaking changes for intelligence types
   - Frontend response format preserved

### Response Format

**v34.0 adds handover data:**
```json
{
  "response": "...",
  "intelligence_triggered": ["TYPE-080", ...],
  "metadata": {
    "orchestration": "langgraph_v34.0",
    "data_collected_so_far": {...},
    "collaboration_events": [...]
  },
  "a2a_handover": {  // NEW in v34.0
    "handover_complete": true,
    "from_agent": "assessment-agent-v18",
    "to_agent": "gameplan-agent-v18",
    "handover_id": "h_1699564800_...",
    "new_phase": "gameplan",
    "timestamp": "2025-11-05T10:00:00Z"
  }
}
```

---

## Testing Scenarios

### Scenario 1: Basic Conversation (v26 Fallback)

**What to test:** v34.0 works with existing agents

```bash
curl -X POST http://localhost:8787/api/v26/agents/assessment-agent-v18/message \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  --data '{
    "session_id": "<session-id>",
    "student_id": "huda-2025",
    "message": "I am in 11th grade"
  }'
```

**Expected:**
- ✅ Response includes `"orchestration": "langgraph_v34.0"`
- ✅ Intelligence types triggered (TYPE-080, etc.)
- ✅ `data_collected_so_far` populated
- ✅ No errors

**Why it works:** v34.0 extracts signals from v26 metadata (backward compatible)

### Scenario 2: Multi-Turn Assessment

**What to test:** Intelligence types across multiple turns

```bash
# Turn 1
curl ... --data '{"message": "I am in 11th grade at Evergreen Valley High School"}'

# Turn 2
curl ... --data '{"message": "I founded a climate change hackathon club"}'

# Turn 3
curl ... --data '{"message": "I won first place in the regional science fair"}'
```

**Expected:**
- ✅ Each turn triggers relevant intelligence types
- ✅ `data_collected_so_far` accumulates across turns
- ✅ Facts saved to `kb_items` table
- ✅ No intelligence type regression

**Why it matters:** Proves intelligence types are safe (processing happens BEFORE signal extraction)

### Scenario 3: Handover Detection (Future)

**What to test:** Assessment → GamePlan handover

**Note:** This requires completing all 4 assessment phases. Current agents use v26 metadata, so handover won't trigger yet. But the infrastructure is ready!

**Expected (when agents migrate to v34 signals):**
- ✅ Response includes `a2a_handover` object
- ✅ `handover_complete: true`
- ✅ `from_agent: "assessment-agent-v18"`
- ✅ `to_agent: "gameplan-agent-v18"`

**Handover Rules:**
1. `phase_complete: true`
2. `completion_percentage >= 100`
3. `confidence >= 0.8`
4. Route based on current agent

### Scenario 4: Performance

**What to test:** Latency is acceptable

```bash
time curl -X POST http://localhost:8787/api/v26/agents/assessment-agent-v18/message ...
```

**Expected:**
- ✅ End-to-end latency < 5000ms (typical: 1000-2000ms)
- ✅ Server processing time logged in response
- ✅ No performance regression vs v31.4

**Target (v35.0):** Handover latency < 500ms

---

## Verification Checklist

### ✅ Integration Complete

- [x] v34.0 orchestrator imports in routes
- [x] Feature flag `USE_V34_ORCHESTRATION`
- [x] Response format conversion (v34 ↔ v31.4)
- [x] Version-aware logging
- [x] Test script created

### ⏳ Testing (Current Sprint - Week 2)

- [ ] Basic message flow works
- [ ] Intelligence types preserved (all 46 types)
- [ ] No errors in server logs
- [ ] Response format compatible with frontend
- [ ] Performance acceptable (< 5000ms)

### ⏳ Future (Sprint 2 - Weeks 3-4)

- [ ] Migrate Assessment Agent to v34 signals
- [ ] Migrate GamePlan Agent to v34 signals
- [ ] Migrate Execution Agent to v34 signals
- [ ] Test handover: Assessment → GamePlan
- [ ] Test handover: GamePlan → Execution
- [ ] Remove v26 fallback code

---

## Troubleshooting

### Issue: Server not starting

**Check:** TypeScript compilation errors

```bash
cd services/agent-framework
npx tsc --noEmit
```

**Fix:** Resolve any type errors in v34 files

### Issue: "orchestration": "langgraph_v31.4" (not v34.0)

**Check:** Feature flag

```bash
echo $USE_V34_ORCHESTRATION
# Should output: true
```

**Fix:** Add to `.env`:
```bash
USE_V34_ORCHESTRATION=true
```

### Issue: Intelligence types not triggering

**This is normal!** Intelligence types are agent-specific and context-dependent.

**Check:** Agent logs for intelligence processing

```bash
grep "intelligence" logs/app.log
```

**Expected:** Intelligence processing happens, just may not trigger for every message

### Issue: "Agent not found" error

**Check:** Agent initialization logs

```bash
grep "tools.init" logs/app.log
```

**Expected:** Should see 6 agents initialized (assessment, gameplan, execution, awards, ECs, scholarships)

---

## Rollback (if needed)

If v34.0 has issues, rollback to v31.4:

1. Remove feature flag from `.env`:
   ```bash
   # USE_V34_ORCHESTRATION=true  # Comment out
   ```

2. Restart server:
   ```bash
   npm run dev
   ```

3. Verify v31.4 active:
   ```bash
   curl http://localhost:8787/health
   # Check logs for: "langgraph_v31.4"
   ```

---

## Next Steps

### Sprint 1, Week 2 (Current)

1. ✅ Run test suite: `./scripts/test-v34-orchestration.sh`
2. ⏳ Verify all tests pass
3. ⏳ Test with real student data (Huda)
4. ⏳ Performance profiling

### Sprint 2, Weeks 3-4

1. Migrate Assessment Agent to return v34 signals
2. Migrate GamePlan Agent to return v34 signals
3. Migrate Execution Agent to return v34 signals
4. Test handover flows
5. Remove v26 fallback

### Sprint 3, Weeks 5-6

1. Update MultiAgents Tab 2.0 UI for v34 (if needed)
2. Production deployment
3. Monitor handover latency
4. Optimize performance

---

## Questions?

**Architecture Questions:** See `docs/guides/V34_UNIVERSAL_ORCHESTRATION_ARCHITECTURE.md`
**Implementation Details:** See `docs/guides/V34_IMPLEMENTATION_ROADMAP.md`
**First Principles:** See `docs/guides/ORCHESTRATION_ARCHITECTURE_FIRST_PRINCIPLES.md`

**Status:** Ready for testing! 🚀
