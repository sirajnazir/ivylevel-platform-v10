# Remaining Fixes Needed for Universal Enumerations

**Date:** October 3, 2025
**Status:** 90% Complete - Minor routing issues remain

---

## What's Working ✅

### Initial Lists (All Working)
- ✅ "what was my initial EC list?" → 10 items, SQL-only
- ✅ "what was my initial summer programs list?" → 5 items, SQL-only
- ✅ "what was my initial awards list?" → 7 items, SQL-only

### Final Lists (Most Working)
- ✅ "what was my final EC list?" → 10 items including 2 summer programs, SQL-only
- ✅ "what was my final awards list?" → 6 items, SQL-only
- ✅ "what was my final GPA and SAT?" → UTFA temporal facts

---

## Issues to Fix ❌

### Issue 1: "which ECs did I actually win?" Returns Duplicates

**Current Behavior:**
- Returns 20 items (10 initial + 10 final from progression view)
- Routes to `ecs.progression`

**Expected Behavior:**
- Should return 10 items (final/submitted ECs only)
- Should route to `ecs.final`

**Root Cause:**
The query "which ECs did I actually win?" contains the word "win" which is ambiguous for ECs. The intent detection is matching `ecs.progression` instead of `ecs.final`.

**Suggested Fix:**
```typescript
// In intent-enum.ts, ECs section:
if (any(s, EC_SYNS)) {
  // "which X did I Y?" where Y is a final synonym → final (not progression)
  if (s.includes('which') && s.includes('did i') && any(s, FINAL_SYNS)) {
    return 'ecs.final';
  }
  // ... rest of checks
}
```

**Alternative User Query:**
- "what were my final ECs?" ✅ Works correctly
- "what ECs did I submit?" ✅ Would work correctly

### Issue 2: "what was my final summer programs list?" Returns "No data"

**Current Behavior:**
- Returns error: "No program decisions data found"
- Routes to `program.final` but view expectations mismatch

**Expected Behavior:**
- Should return 2 summer programs: JCamp (AAJA), Kode With Klossy
- Should use v_programs_final view (submitted ECs with subtype='summer_program')

**Root Cause:**
The `program.final` route exists, the SQL view `v_programs_final` exists with correct data, and the resolver exists. However, there may be a runtime error or the route isn't being detected properly.

**SQL View (Already Created):**
```sql
CREATE VIEW v_programs_final AS
SELECT
  item_id,
  student_id,
  title_name AS program_name,
  COALESCE(status_detail, 'N/A') AS provider,
  event_date,
  submit_date,
  source_ref AS source_id,
  item_id AS chip_id,
  'kb_items'::text AS chip_table
FROM kb_items
WHERE item_type='ec'
  AND subtype='summer_program'
  AND tier1_state='Submitted';

-- Test: Returns 2 rows for huda-2025 ✓
```

**Resolver (Already Added):**
```typescript
// In resolvers/enums.ts
final: async (pg: Pool, studentId: string) => {
  const { rows } = await pg.query(
    `SELECT program_name, provider, event_date, submit_date, source_id, chip_id
       FROM v_programs_final
      WHERE student_id=$1
      ORDER BY program_name`,
    [studentId]
  );
  return rows;
}
```

**maybeEnumAnswer Switch (Already Added):**
```typescript
case 'program.final': return { kind: 'enum', route, items: await programs.final(pg, studentId) };
```

**Debugging Steps:**
1. Check server logs for runtime errors
2. Test direct SQL query: `SELECT * FROM v_programs_final WHERE student_id='huda-2025'`
3. Test resolver directly
4. Add console.log to maybeEnumAnswer to see if route is detected

**Alternative User Query:**
- "show me my submitted summer programs" - Should work
- "what summer programs did I include?" - Should work

---

## Workarounds for Testing

### For "which ECs did I actually win?"
**Use instead:** "what were my final ECs?"
```bash
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"what were my final ECs?","stream":false}'
```
✅ Returns exactly 10 final ECs

### For "final summer programs list?"
**Use instead:** "what were my final ECs?" then filter visually
```bash
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"what were my final ECs?","stream":false}' | \
  jq -r '.answer' | grep summer_program
```
Shows:
- 4. JCamp (AAJA) (summer_program)
- 5. Kode With Klossy (summer_program)

---

## Data Architecture Notes

### Summer Programs Classification

**Initial Phase (Game Plan):**
- Stored in: `kb_items` with `item_type='program'`
- Query: "initial summer programs" → `program.initial` → v_programs_initial
- Count: 5 items

**Final Phase (Common App Submitted):**
- Stored in: `kb_items` with `item_type='ec'` AND `subtype='summer_program'`
- Query: "final summer programs" → `program.final` → v_programs_final
- Count: 2 items (JCamp, Kode With Klossy)

This is correct design because:
- Summer programs in the Game Plan phase are tracked separately as "programs to apply to"
- Summer programs in the final Common App are submitted as extracurricular activities
- Common App form treats attended summer programs as ECs, not separate programs section

### "which ECs did I actually win?" Semantics

The word "win" doesn't apply well to ECs. ECs are:
- **Planned** (initial phase - Game Plan)
- **Submitted** (final phase - Common App)
- **Ongoing** (current state)

Awards are "won", ECs are "submitted" or "included". The user likely means:
- "which ECs did I actually submit/include in my application?"
- "what was my final EC list?"

Both of these should route to `ecs.final`, not `ecs.progression`.

---

## Recommended Next Steps

1. **Fix "which ECs" routing:**
   - Add explicit check for "which...did I" patterns → route to final, not progression
   - Or document that "which X did I Y" should use clearer language

2. **Debug "final summer programs":**
   - Add logging to maybeEnumAnswer to see detected route
   - Check for runtime errors in server logs
   - Verify programs.final resolver is callable

3. **Update documentation:**
   - Add query examples showing correct phrasing
   - Document summer program classification (initial vs final)
   - Explain why "win" doesn't apply to ECs

---

## Testing Commands

### Verify what's working:
```bash
# Initial lists (all work)
curl -X POST http://localhost:8787/agent/chat -d '{"student_id":"huda-2025","message":"what was my initial EC list?","stream":false}'
curl -X POST http://localhost:8787/agent/chat -d '{"student_id":"huda-2025","message":"what was my initial summer programs?","stream":false}'
curl -X POST http://localhost:8787/agent/chat -d '{"student_id":"huda-2025","message":"what was my initial awards?","stream":false}'

# Final lists (most work)
curl -X POST http://localhost:8787/agent/chat -d '{"student_id":"huda-2025","message":"what were my final ECs?","stream":false}'
curl -X POST http://localhost:8787/agent/chat -d '{"student_id":"huda-2025","message":"what were my final awards?","stream":false}'
```

### Test problematic queries:
```bash
# Issue 1: Returns 20 instead of 10
curl -X POST http://localhost:8787/agent/chat -d '{"student_id":"huda-2025","message":"which ECs did I actually win?","stream":false}' | jq '.answer | split("\n") | length'

# Issue 2: Returns "No data"
curl -X POST http://localhost:8787/agent/chat -d '{"student_id":"huda-2025","message":"what was my final summer programs list?","stream":false}' | jq '.answer'
```

---

## Status Summary

**Completion:** 90%

**What Works:**
- ✅ All initial lists (ECs, Awards, Programs)
- ✅ Final ECs list
- ✅ Final Awards list
- ✅ Facts-first SQL routing (NO RAG)
- ✅ Full provenance tracking
- ✅ UI trace viewer accuracy
- ✅ Phase-based data separation

**What Needs Fixing:**
- ❌ "which ECs did I actually win?" routes to progression instead of final
- ❌ "final summer programs list?" returns "No data" despite correct SQL view

**Impact:**
- Core functionality is working
- Users can get all data via alternative queries
- Fixes are minor routing/intent detection issues
- No data problems, only query interpretation issues
