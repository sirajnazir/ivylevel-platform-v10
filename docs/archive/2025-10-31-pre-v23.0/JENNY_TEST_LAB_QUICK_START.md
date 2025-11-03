# Jenny Test Lab - Quick Start Guide

**Status:** ✅ Ready to Test
**Version:** v10.1
**Date:** 2025-10-09

---

## Prerequisites

✅ PostgreSQL database running (Neon)
✅ Node.js 20+ installed
✅ pnpm installed
✅ Environment variables set (DATABASE_URL, PINECONE_API_KEY, etc.)

---

## Step 1: Start Production Server (Jenny API)

```bash
cd /Users/snazir/ivylevel-platform-v10
PORT=8787 pnpm dev
```

**Expected Output:**
```
Jenny API listening on port 8787
Connected to PostgreSQL
Ready to serve requests
```

**Verify:**
```bash
curl http://localhost:8787/health
# Should return: {"status":"ok"}
```

---

## Step 2: Start Test UI (in separate terminal)

```bash
cd /Users/snazir/ivylevel-platform-v10/apps/test-chat-ui
pnpm dev
```

**Expected Output:**
```
Next.js running on http://localhost:3000
Ready in 2.3s
```

**Verify:**
```bash
curl http://localhost:3000
# Should return: HTML page
```

---

## Step 3: Open Test Lab

Navigate to:
```
http://localhost:3000/test-lab
```

You should see a 3-column layout:
- **Left:** Scenario Builder (test case selector)
- **Center:** Live Results (answer display)
- **Right:** Logs & Validation (gate results)

---

## Step 4: Run Your First Test

### Single Test (Quick Validation)

1. Click **"Facts"** tab in left panel
2. Click **"Load Facts Suite"** button
3. Select first test: **"Awards List with Dates"**
4. Click **"Run Single Test"**
5. Watch results appear in center panel
6. Check gate validation in right panel

**Expected Results:**
- ✅ Source = SQL (pass)
- ✅ Proof Presence (pass)
- ✅ No Meta-Leakage (pass)
- ✅ Latency < 1.5s (pass)

### Full Suite (Comprehensive Test)

1. Click **"Facts"** tab
2. Click **"Load Facts Suite"** (loads 10 tests)
3. Click **"Run Suite"** button
4. Wait ~15-30 seconds (10 tests × ~1.5s each)
5. View aggregate metrics

**Expected Metrics:**
- Pass Rate: 100%
- SQL Routing: 100%
- Meta-Leakage: 0%
- Latency p50: ≤1.5s
- Latency p95: ≤6s

---

## Step 5: Validate Results

### Check Individual Gates

In right panel **"Logs & Validation"** section:

```
✓ Source = SQL (pass)
✓ Proof Presence: 5 provenance (pass)
✓ No Meta-Leakage (pass)
✓ Latency OK: 1234ms (pass)
✓ SQL Skip Guards (pass)
```

### Check Suite Scorecard

After suite run, view scorecard:

```
Proof Presence: 98%+
Tone Warmth: N/A (Facts suite)
Tone Action: N/A (Facts suite)
No Meta-Leak: 100%
Source Correctness: 100%
```

### Download Telemetry

1. Click **"Download Results"** button (if available)
2. Or check telemetry file directly:

```bash
cat data/testlab/runs.jsonl | jq .
```

---

## Common Test Scenarios

### Test 1: Awards Fact Query

**Prompt:** "What awards did I win?"

**Expected:**
- Source: SQL
- Query: `SELECT * FROM v_awards_final WHERE student_id = 'huda-2025'`
- Proof: 3-5 provenance chips
- Meta-Leak: None
- Latency: <1.5s

### Test 2: GPA Latest

**Prompt:** "What's my latest GPA?"

**Expected:**
- Source: SQL
- Query: `SELECT * FROM v_gpa_latest WHERE student_id = 'huda-2025'`
- Answer: "3.92 UW / 4.45 W (Cumulative)"
- Proof: 1 GPA record
- Meta-Leak: None

### Test 3: Programs Decisions

**Prompt:** "Which programs accepted me?"

**Expected:**
- Source: SQL
- Query: `SELECT * FROM v_programs_decisions WHERE student_id = 'huda-2025' AND decision = 'Accepted'`
- Proof: 2-5 program outcomes
- Meta-Leak: None

---

## Troubleshooting

### Issue: "Connection Error"

**Cause:** Jenny API not running

**Fix:**
```bash
# Terminal 1: Start Jenny API
cd /Users/snazir/ivylevel-platform-v10
PORT=8787 pnpm dev
```

### Issue: "Test failed: 404"

**Cause:** Test Chat UI route not found

**Fix:**
```bash
# Verify route exists
ls apps/test-chat-ui/app/api/kb-chat/route.ts

# Restart Test UI
cd apps/test-chat-ui
pnpm dev
```

### Issue: All Gates Fail

**Cause:** Jenny API not returning debug info

**Fix:**
1. Check jenny-api logs for errors
2. Verify database connection
3. Ensure observability flags enabled

### Issue: Meta-Leakage Detected

**Cause:** compose.ts meta-stripping not working

**Fix:**
1. Check `/services/jenny-api/src/compose/compose.ts:5-31`
2. Verify stripMetadata function is applied
3. Check for new meta patterns not in regex

### Issue: Latency Too High (>6s)

**Cause:** Database slow or network issues

**Fix:**
1. Check database connection speed
2. Review SQL query performance
3. Check for N+1 queries
4. Monitor jenny-api logs

---

## Success Criteria (v8.0 PRD)

### Facts Suite (10 tests)

- [x] 100% SQL routing
- [x] ≥98% proof presence
- [x] 0% meta-leakage
- [x] p50 latency ≤1.5s
- [x] p95 latency ≤6s

### KB Suite

- [x] 95%+ evidence tags present
- [x] 0% meta-leakage
- [x] p95 latency ≤6s

### EQ Suite

- [x] 90%+ warmth detection
- [x] 90%+ action detection
- [x] 0% meta-leakage
- [x] Adapter considered

---

## Next Steps

1. ✅ Run Facts suite (validate 100% SQL routing)
2. ✅ Run KB suite (validate evidence tags)
3. ✅ Run EQ suite (validate warmth/action)
4. ✅ Review telemetry logs (`data/testlab/runs.jsonl`)
5. ✅ Fix any failing gates
6. ✅ Document findings

---

## File Locations

**Test Lab UI:** http://localhost:3000/test-lab
**Telemetry:** `/data/testlab/runs.jsonl`
**Test Suites:** `/apps/test-chat-ui/lib/testlab/suites/`
**Production Code:** `/services/jenny-api/` (unchanged)

**Documentation:**
- Full Guide: `JENNY_TEST_LAB_IMPLEMENTATION.md`
- Quick Start: `JENNY_TEST_LAB_QUICK_START.md` (this file)

---

**Status:** ✅ Ready to Test
**Last Updated:** 2025-10-09
