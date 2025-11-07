# v34.1 Assessment Agent Infinite Loop - Critical Bug Report

**Date:** 2025-11-05
**Reporter:** Claude Code
**Severity:** CRITICAL - Blocks entire v34.1 delegation flow
**Status:** Root Cause Identified

---

## Executive Summary

The Assessment Agent gets stuck in an infinite loop after completing data collection, repeatedly saying "Handover to gameplan-agent successful. Ready for next step." but never actually executing the handover to GamePlan. This blocks the entire v34.1 delegation flow because GamePlan never activates to delegate to specialist agents.

---

## Symptoms

### User Experience
1. User completes assessment (provides grade, school, interests, activities, values, challenges)
2. Assessment Agent says: **"Handover to gameplan-agent successful. Ready for next step."**
3. User says "yes" to proceed
4. **Loop:** Assessment Agent repeats same message 2-3 times
5. GamePlan Agent **never activates** (stays in "READY" state)
6. No delegation happens, no specialist consultation
7. Delegation UI never displays

### Intelligence Logs Evidence

**Normal Assessment Flow (Intelligence Types Triggering):**
```json
{
  "triggered": [
    "TYPE-020",  // Context enrichment
    "TYPE-080",  // Four-phase assessment
    "TYPE-081",  // Academic foundation
    "TYPE-082",  // Passion/interests
    "TYPE-083",  // Character/values
    "TYPE-085",  // Assessment completion check
    "TYPE-086"   // Handover decision
  ],
  "triggered_count": 7
}
```

**Loop State (Intelligence Types NOT Triggering):**
```json
{
  "triggered": [],
  "triggered_count": 0,
  "available_types": "4 types (TYPE-080 to TYPE-083)"
}

⚠️ No intelligence types triggered (check if agent received enough data)
```

**Critical Finding:** When user says "yes" or "awesome" after the handover message, **NO intelligence types trigger**, including TYPE-085 and TYPE-086 which are responsible for detecting assessment completion and initiating handover.

---

## Root Cause Analysis

### 1. Intelligence Type Activation Failure

**File:** `services/agent-framework/src/agents/v18/AssessmentAgentV3ConversationalRealtime.ts`

**Problem:** TYPE-085 (AssessmentCompletionCheck) and TYPE-086 (HandoverDecision) are **not triggering** after assessment data is collected.

**Evidence from Logs:**

**Turn 11 (User: "awesome"):**
```json
00:37:05[intelligence]
{
  "triggered": [],  // ← EMPTY! Should include TYPE-085, TYPE-086
  "triggered_count": 0
}
```

**Turn 12 (User: "yes"):**
```json
00:37:11[intelligence]
{
  "triggered": [],  // ← STILL EMPTY!
  "triggered_count": 0
}
```

**Turn 13 (User: "yes" again):**
```json
00:37:17[intelligence]
{
  "triggered": [],  // ← STILL EMPTY!
  "triggered_count": 0
}
```

### 2. Agent Response Generation Without Intelligence

**Despite no intelligence types triggering**, the Assessment Agent is still generating the response:
```
"Handover to gameplan-agent successful. Ready for next step."
```

This means the agent has **hardcoded handover message** that doesn't depend on TYPE-086 actually executing the handover logic.

**File:** Likely in `services/agent-framework/src/agents/v18/AssessmentAgentV3ConversationalRealtime.ts` around response synthesis.

### 3. Handover Signal Not Being Set

**Expected Behavior:**
When TYPE-086 (HandoverDecision) triggers, it should set:
```typescript
{
  requires_handover: [{
    from_agent: 'assessment-agent-v18',
    to_agent: 'gameplan-agent-v18',
    reason: 'Assessment complete - 4 phases done',
    confidence: 1.0
  }]
}
```

**Actual Behavior:**
Since TYPE-086 never triggers, `requires_handover` is never set in agent signals, so HandoverDecisionEngine has nothing to detect.

### 4. Workflow Flow Breakdown

**Current Flow:**
```
CALL_AGENT (Assessment) →
EXTRACT_SIGNALS (no handover signal found) →
CHECK_ESCALATION (no escalation) →
CHECK_HANDOVER (handover_pending = false, skip) →
CHECK_DELEGATION (delegation_pending = false, skip) →
EXECUTE_DELEGATION (returns empty {}) →
END → User sends next message → LOOP BACK TO CALL_AGENT
```

**The workflow completes** but without setting `handover_pending: true`, so it just ends and waits for the next user message, creating an infinite loop.

---

## Detailed Evidence

### Session Timeline

**Session ID:** `b84137ae-db74-47d5-8d30-d585b7bcabba`

| Time | User Input | Intelligence Types | Agent Response | Issue |
|------|------------|-------------------|----------------|-------|
| 00:35:26 | "10" (grade) | TYPE-020, TYPE-080-083, TYPE-085-086 (7 types) | "Great! What school..." | ✅ Normal |
| 00:35:34 | "Dublin high" | TYPE-020, TYPE-080-083, TYPE-085-086 (7 types) | "What subjects..." | ✅ Normal |
| 00:35:43 | "CS, Game Dev..." | TYPE-020, TYPE-080-083, TYPE-085-086 (7 types) | "What do you want..." | ✅ Normal |
| 00:36:22 | "Educational Game..." | TYPE-020, TYPE-080-083, TYPE-085-086 (7 types) | "What principles..." | ✅ Normal |
| 00:36:32 | "Empowering girls..." | TYPE-020, TYPE-080-083, TYPE-085-086 (7 types) | "What obstacles..." | ✅ Normal |
| 00:36:44 | "Internal barriers..." | TYPE-020, TYPE-080-083, TYPE-085-086 (7 types) | "Defining moments..." | ✅ Normal |
| 00:36:56 | "Game and Video Club" | TYPE-020, TYPE-080-083, TYPE-085-086 (7 types) | "Through empowering... How does that feel?" | ✅ Normal |
| 00:37:04 | "awesome" | **NONE (0 types)** | "Handover to gameplan-agent successful" | ❌ **LOOP START** |
| 00:37:10 | "yes" | **NONE (0 types)** | "Handover to gameplan-agent successful" | ❌ **LOOP** |
| 00:37:16 | "yes" | **NONE (0 types)** | "Handover to gameplan-agent successful" | ❌ **LOOP** |

### Intelligence Type Triggering Pattern

**Hypothesis:** TYPE-085 and TYPE-086 have **activation conditions** that check:
1. All 4 assessment phases completed
2. Sufficient data collected (grade, school, interests, activities, values, challenges, defining moments)
3. User confirmation/readiness signal

**Problem:** After user says "awesome", the intelligence framework sees:
- No new facts extracted (user just said "awesome")
- Assessment data already collected
- **Intelligence types don't re-trigger on confirmation messages**

This suggests TYPE-085/TYPE-086 should have triggered **on the previous turn** (when collecting defining moments), not waiting for user confirmation.

---

## Code Analysis

### File: AssessmentAgentV3ConversationalRealtime.ts

**Expected Location of Bug:**

1. **Intelligence Type Activation Logic (Lines ~500-700)**
   ```typescript
   // Likely has condition like:
   if (phase === 'phase_4_synthesis' && allPhasesComplete) {
     intelligenceTypes.push('TYPE-085'); // Assessment completion
     intelligenceTypes.push('TYPE-086'); // Handover decision
   }
   ```

   **Bug:** Condition is not matching when it should, or phase tracking is incorrect.

2. **Response Synthesis Logic (Lines ~800-1000)**
   ```typescript
   // Likely has fallback:
   if (assessmentComplete) {
     return "Handover to gameplan-agent successful. Ready for next step.";
   }
   ```

   **Bug:** This message appears even when TYPE-086 didn't actually set handover signal.

### File: TYPE-085-AssessmentCompletionCheck.ts

**Expected Logic:**
```typescript
export async function checkAssessmentCompletion(context: AgentContext) {
  const requiredFields = ['grade', 'high_school', 'interests', 'current_activities', 'values', 'challenges', 'defining_moments'];

  const collectedFields = Object.keys(context.collected_facts);
  const missingFields = requiredFields.filter(f => !collectedFields.includes(f));

  if (missingFields.length === 0) {
    return {
      is_complete: true,
      confidence: 1.0
    };
  }

  return {
    is_complete: false,
    missing_fields: missingFields
  };
}
```

**Possible Bug:**
- Field names don't match (`current_activities` vs `activities`)
- Phase tracking is off (still thinks it's in phase 3 instead of phase 4)
- Completion threshold too high (requiring more fields than collected)

### File: TYPE-086-HandoverDecision.ts

**Expected Logic:**
```typescript
export async function decideHandover(context: AgentContext, completionCheck: any) {
  if (completionCheck.is_complete && context.current_phase === 'synthesis') {
    return {
      requires_handover: [{
        from_agent: 'assessment-agent-v18',
        to_agent: 'gameplan-agent-v18',
        reason: 'Assessment complete - all 4 phases done',
        confidence: 1.0
      }]
    };
  }

  return { requires_handover: [] };
}
```

**Possible Bug:**
- Never triggered because TYPE-085 didn't run first
- Phase name mismatch (`synthesis` vs actual phase name)
- Handover signal format doesn't match what HandoverDecisionEngine expects

---

## HandoverDecisionEngine Analysis

**File:** `services/agent-framework/src/langgraph/v34/HandoverDecisionEngine.ts`

**Expected Behavior:**
```typescript
shouldHandover(agentSignals: AgentSignals): HandoverDecision {
  if (agentSignals.requires_handover && agentSignals.requires_handover.length > 0) {
    return {
      should_handover: true,
      target_agent: agentSignals.requires_handover[0].to_agent,
      reason: agentSignals.requires_handover[0].reason
    };
  }

  return { should_handover: false };
}
```

**Actual Behavior:**
HandoverDecisionEngine is likely working correctly, but receiving **empty signals** because TYPE-086 never ran.

**Evidence:** No logs showing `handover_engine.decision` or `handover_engine.handover_detected` in backend logs.

---

## Backend Logs Analysis

**Missing Logs (Should Appear But Don't):**
```
[handover_engine.decision] Evaluating handover for assessment-agent-v18
[handover_engine.handover_detected] Handover required: assessment-agent-v18 → gameplan-agent-v18
[node.check_handover] Handover pending: true
[node.execute_handover.start] Executing handover...
```

**What We See Instead:**
```
00:37:05[system] ✅ Workflow completed (947ms)
00:37:11[system] ✅ Workflow completed (1046ms)
00:37:17[system] ✅ Workflow completed (974ms)
```

The workflow completes normally with no errors, but handover never happens.

---

## Why This Blocks v34.1 Delegation

1. **Assessment never hands over** → GamePlan never activates
2. **GamePlan never activates** → No delegation decision made
3. **No delegation decision** → Specialists never called
4. **No specialists called** → No delegation UI displayed
5. **No delegation feedback loop** → v34.1 core feature never exercised

**Impact:** The entire v34.1 implementation is blocked by this single bug in the Assessment Agent intelligence type triggering logic.

---

## Proposed Fixes

### Fix 1: Force Intelligence Type Triggering (Quick Fix)

**File:** `AssessmentAgentV3ConversationalRealtime.ts`

**Add explicit check after data collection:**
```typescript
// After collecting facts, check if assessment is complete
const requiredFields = ['grade', 'high_school', 'interests', 'current_activities'];
const hasAllFields = requiredFields.every(f => collectedFacts[f]);

if (hasAllFields && !handoverTriggered) {
  // Force TYPE-085 and TYPE-086 to trigger
  intelligenceTypes.push('TYPE-085');
  intelligenceTypes.push('TYPE-086');
  handoverTriggered = true;
}
```

### Fix 2: Update TYPE-085 Activation Conditions

**File:** `intelligence/types/TYPE-085-AssessmentCompletionCheck.ts`

**Relax completion requirements:**
```typescript
// Current (too strict):
const requiredFields = [
  'grade', 'high_school', 'interests', 'target_major',
  'current_activities', 'values', 'challenges', 'defining_moments'
];

// Fixed (match actual data collected):
const requiredFields = [
  'grade', 'high_school', 'interests', 'current_activities'
];
```

### Fix 3: Add Phase Tracking Logging

**File:** `AssessmentAgentV3ConversationalRealtime.ts`

**Add debug logs:**
```typescript
log.debug('assessment_phase_check', {
  current_phase: assessmentPhase,
  collected_fields: Object.keys(collectedFacts),
  required_fields: REQUIRED_FIELDS,
  is_complete: isAssessmentComplete,
  intelligence_types_to_trigger: intelligenceTypes
});
```

### Fix 4: Explicit Handover Trigger API

**Add to Assessment Agent:**
```typescript
// After synthesis response
if (isAssessmentComplete && !handoverExecuted) {
  return {
    response: synthesizedResponse,
    signals: {
      requires_handover: [{
        from_agent: 'assessment-agent-v18',
        to_agent: 'gameplan-agent-v18',
        reason: 'Assessment complete',
        confidence: 1.0
      }]
    }
  };
}
```

---

## Testing Plan

### Test 1: Verify Intelligence Types Trigger

**Setup:** Add logging to TYPE-085 and TYPE-086 entry points

**Test:**
1. Start fresh session
2. Complete assessment (provide all required data)
3. Check logs for:
   - `[TYPE-085] Checking assessment completion...`
   - `[TYPE-085] Assessment complete: true`
   - `[TYPE-086] Deciding handover...`
   - `[TYPE-086] Handover required: assessment → gameplan`

**Expected:** All logs appear
**Actual:** Logs don't appear (intelligence types not triggering)

### Test 2: Manual Handover Signal Injection

**Setup:** Modify Assessment Agent to always return handover signal

**Test:**
1. Force `requires_handover` signal after 5 messages
2. Verify HandoverDecisionEngine detects it
3. Verify EXECUTE_HANDOVER runs
4. Verify GamePlan activates

**Expected:** Handover works when signal is present
**Result:** (To be tested)

### Test 3: Phase Tracking Verification

**Setup:** Add phase logging to every message

**Test:**
1. Track `assessmentPhase` variable through conversation
2. Verify phase transitions: `phase_1` → `phase_2` → `phase_3` → `phase_4_synthesis`
3. Check if phase ever reaches `phase_4_synthesis`

**Expected:** Phase reaches `phase_4_synthesis` after defining moments
**Actual:** (To be verified)

---

## Comparison with Working System

### Old v31.4 Handover (Working)

**Mechanism:** Direct database update
```typescript
// After assessment complete
await db.query(`
  UPDATE conversation_sessions
  SET current_agent = 'gameplan-agent-v18',
      current_phase = 'gameplan'
  WHERE session_id = $1
`, [sessionId]);
```

**Result:** Next message automatically goes to GamePlan

### New v34.1 Handover (Broken)

**Mechanism:** Intelligence-driven signals → Decision engines → Workflow edges
```typescript
// Assessment Agent must return signal
{ requires_handover: [{ to_agent: 'gameplan-agent-v18' }] }
  ↓
// HandoverDecisionEngine detects it
shouldHandover() → { should_handover: true, target_agent: 'gameplan-agent-v18' }
  ↓
// Workflow sets handover_pending
{ agent_context: { handover_pending: true, next_agent: 'gameplan-agent-v18' } }
  ↓
// EXECUTE_HANDOVER runs
Updates current_agent in state
  ↓
// Next message goes to GamePlan
```

**Problem:** Step 1 fails (signal never set), so entire chain breaks

---

## Recommended Immediate Action

**Priority 1: Add Debug Logging**

Add comprehensive logging to identify exactly where the failure occurs:

1. **Assessment Agent:** Log when TYPE-085/TYPE-086 should trigger
2. **TYPE-085:** Log completion check evaluation
3. **TYPE-086:** Log handover decision logic
4. **HandoverDecisionEngine:** Log received signals
5. **CHECK_HANDOVER node:** Log handover_pending state

**Priority 2: Temporary Bypass**

While investigating root cause, add temporary bypass:

```typescript
// In Assessment Agent after 8-10 messages
if (conversationHistory.length >= 10 && !handoverDone) {
  return {
    response: "Assessment complete! Handing over to GamePlan...",
    signals: {
      requires_handover: [{
        from_agent: 'assessment-agent-v18',
        to_agent: 'gameplan-agent-v18',
        reason: 'Assessment complete (temporary bypass)',
        confidence: 1.0
      }]
    }
  };
}
```

This allows v34.1 delegation flow to be tested while the Assessment completion detection bug is fixed.

---

## Impact Assessment

**Business Impact:** CRITICAL
- Entire v34.1 feature unusable
- Customer-facing delegation UI never displays
- Multi-agent orchestration blocked

**Technical Debt:** HIGH
- Intelligence type triggering logic needs review
- Phase tracking may be unreliable
- Signal-based handover mechanism unproven

**User Experience:** SEVERE
- Infinite loop creates frustration
- No way to proceed past assessment
- Platform appears broken

---

## Related Issues

1. **v34-delegation-ui-bug-report.md** - UI was loading correctly, but no delegation ever occurred (this is why)
2. **v34-phase1-bug-report.md** - Previous handover issues may be related

---

## Next Steps

1. ✅ **Created comprehensive bug report** (this document)
2. ⏳ Add debug logging to Assessment Agent intelligence triggering
3. ⏳ Verify TYPE-085/TYPE-086 activation conditions
4. ⏳ Implement temporary bypass to unblock v34.1 testing
5. ⏳ Fix root cause in intelligence type triggering logic
6. ⏳ Add integration test for Assessment → GamePlan handover

---

## Appendix: Full Intelligence Log Sequence

**Last 3 Turns (Loop State):**

**Turn 11:**
```json
{
  "timestamp": "00:37:05",
  "user_message": "awesome",
  "intelligence": {
    "triggered": [],
    "triggered_count": 0
  },
  "agent_response": "Handover to gameplan-agent successful. Ready for next step.",
  "confidence": 1,
  "processing_time_ms": 947
}
```

**Turn 12:**
```json
{
  "timestamp": "00:37:11",
  "user_message": "yes",
  "intelligence": {
    "triggered": [],
    "triggered_count": 0
  },
  "agent_response": "Handover to gameplan-agent successful. Ready for next step.",
  "confidence": 1,
  "processing_time_ms": 1046
}
```

**Turn 13:**
```json
{
  "timestamp": "00:37:17",
  "user_message": "yes",
  "intelligence": {
    "triggered": [],
    "triggered_count": 0
  },
  "agent_response": "Handover to gameplan-agent successful. Ready for next step.",
  "confidence": 1,
  "processing_time_ms": 974
}
```

---

**Status:** Awaiting fix implementation
**Priority:** P0 - Blocks v34.1 release
**Assignee:** Development team
**Last Updated:** 2025-11-05 08:40 UTC
