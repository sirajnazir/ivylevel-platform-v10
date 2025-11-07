# Archive: v34.1/v34.2 Tactical Handover Code

**Archive Date:** 2025-11-05
**Reason:** Replaced with Universal Data Architecture (v34.2)

## Archived Files

### 1. `HandoverDecisionEngine.ts`
**Original Location:** `src/langgraph/v34/HandoverDecisionEngine.ts`

**Replaced By:** `src/handover/HandoverDecisionEngine.ts` (Universal)

**Why Archived:**
- Old implementation used signal-based handover checking (`shouldHandover(state, signals)`)
- Hardcoded routing logic (assessment → gameplan → execution)
- Relied on completion_percentage thresholds (100%) and confidence scores
- Was tactical fix, not strategic solution

**New Implementation:**
- Universal fact-based handover checking (`checkHandover(sessionId, agent, facts, turns)`)
- Declarative configuration via `AgentHandoverConfig`
- Uses HandoverValidator (v29 quality gates) + structured logging
- Checks for actual data collected (grade, high_school, interests) instead of arbitrary thresholds

### 2. `assessment-debug.html`
**Original Location:** `test-ui/assessment-debug.html`

**Why Archived:**
- Old test UI for debugging v34.0 assessment agent
- Not compatible with Universal Data Architecture
- Will be replaced with comprehensive handover testing UI

### 3. `v34-handover-test.html`
**Original Location:** `test-ui/v34-handover-test.html`

**Why Archived:**
- Test UI for v34.0/v34.1 tactical handover implementation
- Used completion_percentage progress tracking
- Expected `_internal_signals` metadata format
- Not compatible with Universal Fact Protocol

## What Changed (v34.2 Universal Data Architecture)

### Architecture Changes

**Before (v34.0/v34.1):**
```typescript
// Agent returns signals
signals: {
  phase_complete: true,
  completion_percentage: 100,
  confidence: 1.0
}

// Orchestrator checks signals
this.handoverEngine.shouldHandover(state, signals)
```

**After (v34.2):**
```typescript
// Agent stores UniversalFacts in database
await factStore.storeFact(universalFact)

// Orchestrator loads facts and checks handover
const facts = await loadUniversalFacts(studentId, sessionId)
const decision = await HandoverDecisionEngine.checkHandover(
  sessionId,
  currentAgent,
  facts,
  conversationTurns
)
```

### Key Benefits

1. **Data-Driven**: Handover based on actual collected data, not arbitrary percentages
2. **Declarative**: Change handover requirements without code changes (AgentHandoverConfig)
3. **Quality Gates**: Uses HandoverValidator's 20 quality checks
4. **Structured Logging**: Full audit trail in `logs/handover-decisions.jsonl`
5. **Universal**: Single source of truth across all orchestrators (v26, v34, future)

### Integration Points

**v34 Orchestrator Changes:**
- `NODE_CHECK_HANDOVER`: Now calls `HandoverDecisionEngine.checkHandover()`
- Added `loadUniversalFacts()` helper to load facts from database
- `NODE_EXECUTE_HANDOVER`: Now uses HandoverLogger for structured logging
- Removed instance-based `handoverEngine` (now static methods)

**Files Modified:**
- `src/langgraph/v34/LangGraphOrchestratorV34.ts` (lines 31-37, 84-93, 728-789, 792-871, 908-981)

**New Files Created:**
- `src/handover/HandoverDecisionEngine.ts` - Universal decision engine
- `src/config/AgentHandoverConfig.ts` - Declarative configuration
- `src/handover/HandoverLogger.ts` - Structured logging

## Migration Notes

If you need to reference the old implementation:

1. **Routing Logic**: See `routeAgent()` method in archived `HandoverDecisionEngine.ts`
2. **Signal Extraction**: See `extractSignals()` in `LangGraphOrchestratorV34.ts` (still in use for v26 backward compatibility)
3. **Test UI**: Archived HTML files show expected signal format

## Restoration Instructions

**⚠️ DO NOT RESTORE THIS CODE**

This code was replaced as part of strategic architecture improvement. If handover issues occur:

1. Check `logs/handover-decisions.jsonl` for audit trail
2. Verify `AgentHandoverConfig` has correct requirements
3. Check HandoverValidator quality gates
4. Review UniversalFact protocol compliance

## References

- **Implementation Guide**: See team's specification (user message from 2025-11-05)
- **Universal Fact Protocol**: `src/facts/UniversalFact.ts`
- **Schema Coverage**: `src/facts/SchemaCoverage.ts` (still in use by HandoverValidator)
- **Handover Validator**: `src/a2a/HandoverValidator.ts` (v29, still in use)

---

**Status:** ✅ Archived successfully
**Next Version:** v34.3 (if additional improvements needed)
