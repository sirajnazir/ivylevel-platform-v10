# Assessment Diagnostic Test UI

**Status**: 🟢 Active (will be removed after issues are fixed)

## Purpose

Bespoke test UI created to diagnose and fix two critical issues in the Assessment Agent v26:

### Issue #1: Synthesis Mode Metadata ✅ FIXED
**Problem**: When agent delivers synthesis (action plan), `metadata.data_collected_so_far` was missing, causing frontend to show "Empty (new onboarding)" even though data was collected.

**Fix Applied**: `AssessmentAgentV3ConversationalRealtime.ts:551-566` - Added `data_collected_so_far` to `deliverSynthesisMoment()` response metadata.

### Issue #2: Data Persistence ⚠️ IN PROGRESS
**Problem**: Extracted data (like `high_school`) not persisting to database correctly, causing data loss between messages.

**Status**: Debugging in progress using test UI.

---

## Usage

### 1. Start Backend
```bash
npm run dev:utfa
# Backend runs at http://localhost:8787
```

### 2. Start Test UI
```bash
node test-ui/server.cjs
# Test UI runs at http://localhost:3333
```

### 3. Open Test UI
Open http://localhost:3333 in your browser

### 4. Test Flow

**Quick Tests:**
- Click "Start Fresh Session" → Automatic cleanup + new session
- Click "Test Issue #1" → Runs 4-message flow to trigger synthesis
- Click "Test Issue #2" → Tests data persistence across 3 messages

**Manual Testing:**
1. Click "🔄 Start Fresh Session"
2. Type messages like:
   - "I'm in 11th grade"
   - "Mountain House High School"
   - "Love CS and AI"
   - "Want to study Computer Science"
3. Watch:
   - **Conversation log** (left panel)
   - **Current State** (collected data display)
   - **Database State** (click refresh to check DB)
   - **Issue Tracker** (auto-updates with test results)

---

## Features

### Real-Time Diagnostics
- ✅ Live conversation with assessment agent
- ✅ Side-by-side comparison: API response vs Database state
- ✅ Automatic issue detection and status updates
- ✅ Detailed debug logging

### Debug Endpoints (Temporary)
These will be removed after testing:

**GET** `/api/v26/debug/check-facts/:studentId`
- Check what facts are in database for a student
- Returns all kb_items with edges data

**DELETE** `/api/v26/debug/cleanup/:studentId`
- Clean up ALL data for a test student
- Deletes sessions, messages, facts, intelligence activations

### Test Student
All tests use `test-diagnostic-2025` (separate from production data)

---

## What to Look For

### ✅ Issue #1 (Synthesis Mode) - FIXED
When agent delivers action plan (typically message 4):
- **GOOD**: `metadata.data_collected_so_far` is present with accumulated data
- **BAD**: `metadata.data_collected_so_far` is missing or empty

### ⚠️ Issue #2 (Data Persistence) - IN PROGRESS
After each message:
1. Check "Current State" → Should show accumulated data
2. Click "🔄 Refresh DB State" → Should match Current State
3. Data should **grow** with each message, not reset

**Expected Pattern:**
- Message 1: `grade: 11`
- Message 2: `grade: 11, high_school: "Mountain House High"`
- Message 3: `grade: 11, high_school: "...", interests: ["CS", "AI"]`

---

## Cleanup

After issues are fixed:

```bash
# Run automated cleanup
bash scripts/cleanup-test-ui.sh
```

**Manual Steps:**
1. Edit `src/routes/v26-multiagents.ts`
   - Remove lines 669-761 (DEBUG ENDPOINTS section)
2. Restart backend: `npm run dev:utfa`
3. Verify production frontend works

---

## Files Created (To Be Deleted)

**Test UI:**
- `test-ui/assessment-diagnostic.html` - Main test interface
- `test-ui/server.cjs` - Simple HTTP server

**Debug Endpoints:**
- `src/routes/v26-multiagents.ts` lines 669-761

**Test Scripts:**
- `scripts/test-full-assessment-flow.sh`
- `scripts/test-message-4-debug.sh`
- `scripts/check-db-facts.ts`
- `scripts/clean-v26-data.ts`
- `scripts/cleanup-test-ui.sh`

**Documentation:**
- `TEST-UI-README.md` (this file)

---

## Database Compliance

All test data complies with `PROD_DB_ARCH.md`:
- ✅ Uses `kb_items` table with `edges` JSONB field
- ✅ Uses `multiagent_sessions`, `multiagent_messages` tables
- ✅ Uses `intelligence_activations` table
- ✅ No schema changes required
- ✅ Test student (`test-diagnostic-2025`) isolated from production data

---

## Technical Details

### Auto-Cleanup on Session Start
`v26-multiagents.ts:89-124` - Automatically cleans old clone student data when starting new session.

### Synthesis Mode Fix
`AssessmentAgentV3ConversationalRealtime.ts:551-566` - Added:
```typescript
const collectedData = this.extractCollectedData(facts);
// ...
metadata: {
  // ...
  data_collected_so_far: collectedData, // ← Added this
}
```

### Frontend Delta Tracking
`MultiAgentsTabRedesigned.tsx:589-673` - Compares BEFORE/AFTER states to show progressive data accumulation.

---

**Created**: 2025-11-03
**Purpose**: Diagnostic testing only
**Status**: Temporary (will be removed after fixes are verified)
