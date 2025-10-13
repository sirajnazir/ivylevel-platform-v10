# GPT-5 Intent Router Migration Plan
**Date:** 2025-10-12
**Current Version:** v10.6.4
**Target Version:** v10.7.0 - Unified GPT-5 Intent Classification
**Status:** PLANNING PHASE - DO NOT EXECUTE UNTIL APPROVED

---

## Executive Summary

**Problem:** Two separate intent classifiers exist:
1. **intent-enum.ts** (regex-based) - Complete, 51 routes, production-ready
2. **intentRouter.ts** (GPT-5 based) - Incomplete, ~25 routes, missing vitals/jtbd

**Impact:** Test Lab uses incomplete GPT-5 router → 6+ test failures for vitals/jtbd routes

**Solution:** Migrate ALL 51 routes from intent-enum.ts to intentRouter.ts with GPT-5 training examples

---

## Current State Analysis

### System A: intent-enum.ts (Regex-Based Classifier)
**File:** `/services/jenny-api/src/orchestrator/intent-enum.ts`
**Status:** ✅ COMPLETE, PRODUCTION-READY, WORKING
**Used By:** `agentChat-utfa.ts` orchestrator
**Endpoint:** `/agent/chat/gpt5` (legacy)

**Complete Route Inventory (51 routes):**

| Category | Routes | Status |
|----------|--------|--------|
| **Awards** | initial, final, progression | ✅ Working |
| **ECs/Activities** | initial, final, progression | ✅ Working |
| **Narrative** | initial | ✅ Working |
| **Summer Programs** | initial, submitted, decisions, final, progression | ✅ Working |
| **Academics - Transcript** | initial, final, progression | ✅ Working |
| **Academics - GPA** | initial, final, latest, progression | ✅ Working |
| **Academics - Vitals** | latest, trend, events | ✅ Working |
| **Testing - SAT** | first, latest, progression | ✅ Working |
| **Testing - ACT** | first, latest, progression | ✅ Working |
| **IvyScore/Readiness** | latest, current, progression | ✅ Working |
| **Readiness Actions** | top_priorities, weakspots | ✅ Working |
| **College List** | list, attending, reach, match, safety, accepted | ✅ Working |
| **Game Plan** | summary_initial, vs_execution, plan_events | ✅ Working |
| **EC Vitals (v10.6)** | latest, progression, funding.progression, scale.progression, impact.latest, summary | ✅ Working |
| **JTBD (v10.6)** | week, completed, pending, milestones, progression | ✅ Working |

**Total: 51 routes**

### System B: intentRouter.ts (GPT-5 Classifier)
**File:** `/services/jenny-api/src/router/intentRouter.ts`
**Status:** ⚠️ INCOMPLETE
**Used By:** `/agent/chat` endpoint (primary)
**Endpoint:** Test Lab uses this

**Current Route Inventory (~25 routes):**

| Category | Routes | Status |
|----------|--------|--------|
| **Awards** | ecs.list, awards.list, programs.list | ✅ Has (via progression.timeline) |
| **Academics** | academics.summary, sat.ordinal, progression.timeline (JUST FIXED) | ✅ Has |
| **GamePlan** | gameplan.initial, gameplan.vs_progress | ✅ Has |
| **Application** | application.final | ✅ Has |
| **IvyReady** | ivyready.score, ivyready.initial, ivyready.final, ivyready.compare, ivyready.factors | ✅ Has |
| **Readiness** | readiness.now, readiness.progress, readiness.drivers, readiness.whatif.*, readiness.next_moves, readiness.weakspots.now, readiness.boost.max, readiness.boost.plan, readiness.progression | ✅ Has |
| **College** | college.list, college.compare.readiness | ✅ Has |
| **Scholarship** | scholarship.list, scholarship.total | ✅ Has |
| **KB Search** | kb.search | ✅ Has |
| **EC Vitals** | vitals.* | ❌ MISSING |
| **JTBD** | jtbd.* | ❌ MISSING |
| **Testing** | testing.sat.*, testing.act.* | ❌ MISSING (has sat.ordinal only) |
| **Narrative** | narrative.* | ⚠️ Partial |
| **Colleges** | college.attending, college.reach, college.match, college.safety, college.accepted | ❌ MISSING |
| **Readiness** | readiness.top_priorities | ❌ MISSING |

**Missing: ~26 routes**

---

## Data Source Mapping (CRITICAL - DO NOT BREAK)

### Real Production Data (huda-2025)

| Table/View | Records | Status | Used By Routes |
|------------|---------|--------|----------------|
| **kb_items** | ~400 items | ✅ Loaded | awards.*, ecs.*, programs.*, narrative.* |
| **outcomes** | ~100 rows | ✅ Loaded | awards.progression, programs.decisions |
| **academic_terms** | 6 terms | ✅ Loaded | academics.transcript.* |
| **academic_courses** | 6 courses | ✅ Loaded | academics.transcript.* |
| **academic_grades** | 6 grades | ✅ Loaded | academics.transcript.* |
| **academic_gpa** | 2 records | ✅ Loaded | academics.gpa.* |
| **v_gpa_timeline** | View | ✅ Working | academics.gpa.progression, academics.vitals.trend |
| **ec_vitals** | 27 records | ✅ Loaded | vitals.* (v10.6) |
| **jtbd_weekly** | 38 records | ✅ Loaded | jtbd.* (v10.6) |
| **rubric_snapshots** | ~10 snapshots | ✅ Loaded | ivyscore.*, readiness.* |
| **college_outcomes** | ~15 colleges | ✅ Loaded | college.* |
| **scholarship_outcomes** | ~5 scholarships | ✅ Loaded | scholarship.* |

**CRITICAL:** All resolvers map to these tables. Migration MUST preserve exact resolver function calls.

---

## Resolver Mapping (MUST PRESERVE)

### Awards Resolvers
```typescript
// File: services/jenny-api/src/resolvers/enums.ts
awards.initial(pg, studentId)    → kb_items WHERE phase='initial'
awards.final(pg, studentId)      → kb_items WHERE phase='final'
awards.progression(pg, studentId)→ outcomes WHERE domain='award'
```

### ECs Resolvers
```typescript
// File: services/jenny-api/src/resolvers/enums.ts
ecs.initial(pg, studentId)       → kb_items WHERE subtype='ec_participation'
ecs.final(pg, studentId)         → kb_items WHERE phase='final'
ecs.progression(pg, studentId)   → outcomes WHERE domain='ec'
```

### GPA Resolvers
```typescript
// File: services/jenny-api/src/resolvers/academics.ts
gpa.initial(pg, studentId)       → academic_gpa WHERE source_id LIKE 'SRC-GAMEPLAN%'
gpa.final(pg, studentId)         → academic_gpa WHERE source_id LIKE 'SRC-COMMONAPP%'
gpa.latest(pg, studentId)        → v_gpa_timeline ORDER BY recorded_at DESC LIMIT 1
gpa.progression(pg, studentId)   → v_gpa_timeline ORDER BY recorded_at
```

### EC Vitals Resolvers (v10.6 - NEW)
```typescript
// File: services/jenny-api/src/resolvers/vitals.ts
vitals.latest(pg, studentId)              → ec_vitals latest per activity
vitals.progression(pg, studentId)         → ec_vitals full timeline
vitals.fundingProgression(pg, studentId)  → ec_vitals WHERE metric_type='financial'
vitals.scaleProgression(pg, studentId)    → ec_vitals WHERE metric_type='scale'
vitals.impactMetrics(pg, studentId)       → ec_vitals WHERE metric_type='impact'
vitals.summary(pg, studentId)             → ec_vitals aggregated
```

### JTBD Resolvers (v10.6 - NEW)
```typescript
// File: services/jenny-api/src/resolvers/jtbd.ts
jtbd.byWeek(pg, studentId, weekNum)  → jtbd_weekly WHERE week_number=weekNum
jtbd.completed(pg, studentId)        → jtbd_weekly WHERE status='completed'
jtbd.pending(pg, studentId)          → jtbd_weekly WHERE status IN ('planned','in_progress')
jtbd.milestones(pg, studentId)       → jtbd_weekly WHERE job_type='ec_milestone'
jtbd.progression(pg, studentId)      → jtbd_weekly GROUP BY week_number
```

**CRITICAL:** Migration must call these EXACT resolver functions with EXACT parameters.

---

## Migration Strategy

### Phase 1: Analysis ✅ (CURRENT)
- [x] Map all 51 enum routes
- [x] Identify data sources and resolvers
- [x] Document current working state
- [x] Create migration plan

### Phase 2: GPT-5 Training Examples Design
**Objective:** Create 3-4 training examples per route category

**Template Per Route:**
```typescript
// vitals.funding.progression
{input:"How much funding have I raised over time?", output:{intent:"vitals.funding.progression", phase:null, object:"vitals", filters:{metric_type:"financial"}, confidence:0.96}},
{input:"Show me money raised progression", output:{intent:"vitals.funding.progression", phase:null, object:"vitals", filters:{metric_type:"financial"}, confidence:0.94}},
{input:"Track funding growth", output:{intent:"vitals.funding.progression", phase:null, object:"vitals", filters:{metric_type:"financial"}, confidence:0.93}},
```

**Categories to Add:**
1. EC Vitals (6 routes) → 18-24 examples
2. JTBD (5 routes) → 15-20 examples
3. Enhanced Testing (SAT/ACT) → 12 examples
4. Enhanced College (attending, buckets) → 12 examples
5. Enhanced Readiness (top_priorities) → 4 examples

**Total New Examples:** ~60-70 (bringing total from 48 to ~110)

### Phase 3: Intent Type System Update
**Add missing intent types to intentRouter.ts:**
```typescript
type Intent =
  | "ecs.list"
  | "awards.list"
  // ... existing ...
  | "vitals.latest"              // NEW
  | "vitals.progression"         // NEW
  | "vitals.funding.progression" // NEW
  | "vitals.scale.progression"   // NEW
  | "vitals.impact.latest"       // NEW
  | "vitals.summary"             // NEW
  | "jtbd.week"                  // NEW
  | "jtbd.completed"             // NEW
  | "jtbd.pending"               // NEW
  | "jtbd.milestones"            // NEW
  | "jtbd.progression"           // NEW
  | "testing.sat.first"          // NEW
  | "testing.sat.latest"         // NEW
  | "testing.sat.progression"    // NEW
  | "testing.act.first"          // NEW
  | "testing.act.latest"         // NEW
  | "testing.act.progression"    // NEW
  | "college.attending"          // NEW
  | "college.reach"              // NEW
  | "college.match"              // NEW
  | "college.safety"             // NEW
  | "college.accepted"           // NEW
  | "readiness.top_priorities"   // NEW
```

### Phase 4: Switch Case Handlers
**Add resolver calls to intentRouter.ts switch statement:**

```typescript
// EC Vitals routes (after line 932)
case "vitals.latest":
  data = await resolvers.vitalsLatest(pg, studentId);
  break;
case "vitals.progression":
  data = await resolvers.vitalsProgression(pg, studentId);
  break;
case "vitals.funding.progression":
  data = await resolvers.vitalsFundingProgression(pg, studentId);
  break;
case "vitals.scale.progression":
  data = await resolvers.vitalsScaleProgression(pg, studentId);
  break;
case "vitals.impact.latest":
  data = await resolvers.vitalsImpactMetrics(pg, studentId);
  break;
case "vitals.summary":
  data = await resolvers.vitalsSummary(pg, studentId);
  break;

// JTBD routes
case "jtbd.week":
  const weekNum = extractWeekNumber(message);
  data = await resolvers.jtbdByWeek(pg, studentId, weekNum);
  break;
case "jtbd.completed":
  data = await resolvers.jtbdCompleted(pg, studentId);
  break;
case "jtbd.pending":
  data = await resolvers.jtbdPending(pg, studentId);
  break;
case "jtbd.milestones":
  data = await resolvers.jtbdMilestones(pg, studentId);
  break;
case "jtbd.progression":
  data = await resolvers.jtbdProgression(pg, studentId);
  break;

// Enhanced Testing routes
case "testing.sat.first":
  data = await resolvers.testingSATFirst(pg, studentId);
  break;
case "testing.sat.latest":
  data = await resolvers.testingSATLatest(pg, studentId);
  break;
case "testing.sat.progression":
  data = await resolvers.testingSATProgression(pg, studentId);
  break;
// ... ACT routes ...

// Enhanced College routes
case "college.attending":
  data = await resolvers.collegeAttending(pg, studentId);
  break;
case "college.reach":
  data = await resolvers.collegeByBucket(pg, studentId, "Reach");
  break;
// ... other college routes ...

// Enhanced Readiness
case "readiness.top_priorities":
  data = await resolvers.readinessTopPriorities(pg, studentId);
  break;
```

### Phase 5: Resolver Exports Update
**File: `/services/jenny-api/src/services/resolvers.ts`**

Add exports for vitals and jtbd resolvers:
```typescript
// EC Vitals (v10.6)
export { vitals } from '../resolvers/vitals.js';
export async function vitalsLatest(pg: Pool, studentId: string) {
  return vitals.latest(pg, studentId);
}
export async function vitalsProgression(pg: Pool, studentId: string) {
  return vitals.progression(pg, studentId);
}
// ... etc for all vitals methods ...

// JTBD (v10.6)
export { jtbd } from '../resolvers/jtbd.js';
export async function jtbdByWeek(pg: Pool, studentId: string, weekNum: number) {
  return jtbd.byWeek(pg, studentId, weekNum);
}
// ... etc for all jtbd methods ...
```

### Phase 6: Helper Functions
**Add week extraction helper (similar to intent-enum.ts):**
```typescript
// Helper: Extract week number from query
function extractWeekNumber(query: string): number {
  const match = query.match(/week\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
}
```

### Phase 7: Testing & Validation
**Test each route category with real huda-2025 data:**

1. **EC Vitals Tests:**
   - "How much funding have I raised?" → vitals.funding.progression → 27 ec_vitals records
   - "Show me scale metrics" → vitals.scale.progression → Returns scale metrics
   - "Latest impact metrics" → vitals.impact.latest → Returns impact data

2. **JTBD Tests:**
   - "What did I do in week 8?" → jtbd.week → Returns week 8 jobs
   - "Show my milestones" → jtbd.milestones → Returns EC milestones from 38 jtbd records
   - "What's pending?" → jtbd.pending → Returns planned/in_progress jobs

3. **Testing Tests:**
   - "What was my first SAT?" → testing.sat.first → Returns first SAT score
   - "Show SAT progression" → testing.sat.progression → Returns all SAT scores

4. **Existing Route Regression:**
   - Test all 25 existing routes still work
   - Verify no breaking changes to awards, ecs, academics, readiness

### Phase 8: Archive Old Files
**After 100% validation success:**

```bash
# Create archive directory
mkdir -p archive/2025-10-12-gpt5-migration

# Archive old enum system
mv services/jenny-api/src/orchestrator/intent-enum.ts \
   archive/2025-10-12-gpt5-migration/intent-enum.ts.backup

mv services/jenny-api/src/orchestrator/agentChat-utfa.ts \
   archive/2025-10-12-gpt5-migration/agentChat-utfa.ts.backup

# Update server to only use intentRouter
# Remove /agent/chat/gpt5 endpoint (uses old agentChat)
```

---

## Risk Mitigation

### Critical Risks

1. **Data Loss Risk: ZERO**
   - No database changes
   - No schema modifications
   - No data deletion
   - All resolvers preserved exactly

2. **Breaking Changes Risk: LOW**
   - All resolver function calls preserved
   - Only routing logic changes
   - Parallel testing before cutover

3. **Regression Risk: MEDIUM**
   - 51 routes to migrate
   - Must test each one
   - Mitigation: Keep old system until 100% validated

### Rollback Plan

**If migration fails:**
1. Revert intentRouter.ts to v10.6.4 version
2. Restore agentChat-utfa.ts from archive
3. Restore intent-enum.ts from archive
4. No data loss (never touched database)

---

## Success Criteria

✅ **All 51 routes working in GPT-5 router**
✅ **All existing tests passing**
✅ **New vitals/jtbd tests passing**
✅ **Real huda-2025 data queries working**
✅ **No breaking changes to resolvers**
✅ **No database schema changes**
✅ **100% backward compatibility**

---

## Execution Checklist

### Pre-Migration
- [ ] User approval of this plan
- [ ] Backup current intentRouter.ts
- [ ] Backup agentChat-utfa.ts
- [ ] Backup intent-enum.ts
- [ ] Verify all data tables accessible
- [ ] Document current test results

### Migration
- [ ] Add 60-70 new training examples
- [ ] Add 26 new intent types
- [ ] Add 26 switch case handlers
- [ ] Add resolver exports
- [ ] Add helper functions

### Post-Migration
- [ ] Run full test suite
- [ ] Test with real huda-2025 queries
- [ ] Verify no regressions
- [ ] Archive old files
- [ ] Update documentation
- [ ] Update version to v10.7.0

---

## Timeline Estimate

- **Phase 1 (Analysis):** ✅ Complete
- **Phase 2 (Training Examples):** 2 hours
- **Phase 3-6 (Code Changes):** 2 hours
- **Phase 7 (Testing):** 2 hours
- **Phase 8 (Archive & Docs):** 30 minutes

**Total: ~6-7 hours**

---

## Files to Modify

1. `/services/jenny-api/src/router/intentRouter.ts` (ADD ~200 lines)
2. `/services/jenny-api/src/services/resolvers.ts` (ADD ~50 lines exports)
3. `/services/jenny-api/src/server-utfa.ts` (REMOVE /agent/chat/gpt5 endpoint)

## Files to Archive

1. `/services/jenny-api/src/orchestrator/intent-enum.ts` → `archive/2025-10-12-gpt5-migration/`
2. `/services/jenny-api/src/orchestrator/agentChat-utfa.ts` → `archive/2025-10-12-gpt5-migration/`

---

**Status:** 📋 PLANNING COMPLETE - AWAITING USER APPROVAL TO PROCEED

**Next Step:** User reviews plan and approves migration execution
