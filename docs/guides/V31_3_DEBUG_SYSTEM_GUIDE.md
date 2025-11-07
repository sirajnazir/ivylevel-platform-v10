# v31.3: Comprehensive Debug System for Assessment Extraction

**Date:** 2025-11-04
**Version:** v31.3
**Status:** ✅ DEPLOYED - Deep trace logging & automated testing

---

## 🎯 Overview

Created a comprehensive debugging system with inch-by-inch logging to identify the root cause of the Assessment Agent extraction loop issue.

### What Was Built

1. **Deep Trace Logger** - File-based logging system
2. **Enhanced Assessment Agent** - Inch-by-inch extraction logging
3. **Automated Test Script** - Systematically tests each extraction scenario
4. **Bespoke Test UI** - Visual HTML interface for live testing

---

## 📁 Files Created

### 1. Debug Logger (`src/utils/debug-logger.ts`)

**Purpose:** Centralized logging system that writes to files for easy analysis

**Features:**
- Logs to file: `/Users/snazir/ivylevel-platform-v10/logs/debug/assessment-debug-YYYY-MM-DD.log`
- Categorized logging (EXTRACTION, DATABASE, SESSION, ERROR)
- JSON-formatted data for easy parsing
- Console output + file output simultaneously

**Usage:**
```typescript
import { DebugLogger } from '../utils/debug-logger.js';

DebugLogger.logExtraction('STEP_1_START', { student_id, message });
DebugLogger.logDB('QUERY', { sql, params });
DebugLogger.logError('CONTEXT', error);
```

### 2. Enhanced Assessment Agent

**Modified:** `src/agents/v18/AssessmentAgentV3ConversationalRealtime.ts:1766-1840`

**Changes:** Added 7-step trace logging to `extractAndStoreFacts()`:
- STEP_1_START: Function entry with parameters
- STEP_2_CALL_GPT: Before calling GPT-4o extraction
- STEP_3_GPT_RESPONSE: Raw GPT response
- STEP_4_VALIDATE: Before validation
- STEP_5_VALIDATED: After validation
- STEP_6_STORE: Before database storage
- STEP_7_STORED: After successful storage
- STEP_6_SKIP_EMPTY: If no data to store

### 3. Automated Test Script (`scripts/test-assessment-extraction.ts`)

**Purpose:** Run systematic tests of extraction scenarios

**Features:**
- 6 test scenarios covering grade, school, interests, major, colleges
- Fresh session for each test
- Expected vs. actual field comparison
- Pass/fail reporting
- Summary statistics

**Run:**
```bash
npx tsx scripts/test-assessment-extraction.ts
```

### 4. Bespoke Test UI (`test-ui/assessment-debug.html`)

**Purpose:** Visual HTML interface for live testing

**Features:**
- Real-time log display
- Click to run individual tests or all tests
- Pass/fail badges
- Expected vs. actual comparison
- Responsive grid layout

**Access:**
```bash
# Open in browser:
file:///Users/snazir/ivylevel-platform-v10/services/agent-framework/test-ui/assessment-debug.html

# Or use HTTP server:
cd services/agent-framework/test-ui
python3 -m http.server 8080
# Then open: http://localhost:8080/assessment-debug.html
```

---

## 🧪 Testing Guide

### Method 1: Automated Script

**Recommended for:** Systematic batch testing

```bash
cd services/agent-framework
npx tsx scripts/test-assessment-extraction.ts
```

**Output:**
- Console: Real-time test progress
- File: `/tmp/test-results.log`
- Debug logs: `/Users/snazir/ivylevel-platform-v10/logs/debug/assessment-debug-*.log`

### Method 2: Bespoke HTML UI

**Recommended for:** Interactive visual testing

```bash
# Open in browser:
open test-ui/assessment-debug.html
```

**Steps:**
1. Click "Run All Tests"
2. Watch real-time logs in bottom panel
3. See pass/fail results in right panel
4. Tests run sequentially with 2s delays

### Method 3: Manual API Testing

**Recommended for:** Deep debugging specific scenarios

```bash
# 1. Create session
SESSION_ID=$(curl -s -X POST "http://localhost:8787/api/v26/session/start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{"student_id":"debug-manual","session_type":"onboarding"}' \
  | jq -r '.session_id')

# 2. Send test message
curl -s -X POST "http://localhost:8787/api/v26/agents/assessment-agent-v18/message" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d "{\"session_id\":\"$SESSION_ID\",\"student_id\":\"debug-manual\",\"message\":\"I'm in 10th grade\"}" \
  | jq '.metadata.data_collected_so_far'

# 3. Check debug logs
tail -f /Users/snazir/ivylevel-platform-v10/logs/debug/assessment-debug-$(date +%Y-%m-%d).log
```

---

## 📊 Log Analysis

### Reading Debug Logs

**Log Format:**
```
================================================================================
[2025-11-04T10:30:45.123Z] [EXTRACTION] STEP_1_START
DATA: {
  "student_id": "huda-v26-2025",
  "user_message": "I'm in 10th grade",
  "user_message_length": 17,
  "conversation_history_length": 0,
  "last_question": "What grade are you in?"
}
```

### Key Checkpoints to Watch

**✅ Successful Flow:**
```
STEP_1_START → STEP_2_CALL_GPT → STEP_3_GPT_RESPONSE (with data)
→ STEP_4_VALIDATE → STEP_5_VALIDATED (with data)
→ STEP_6_STORE → STEP_7_STORED
```

**❌ Failed Extraction:**
```
STEP_1_START → STEP_2_CALL_GPT → STEP_3_GPT_RESPONSE (empty {})
→ STEP_4_VALIDATE → STEP_5_VALIDATED (empty {})
→ STEP_6_SKIP_EMPTY (no data to store)
```

**❌ Error During Extraction:**
```
STEP_1_START → STEP_2_CALL_GPT → [ERROR] EXTRACTION_ERROR
```

### Analyzing Failures

**If STEP_3_GPT_RESPONSE returns empty:**
- Problem: GPT-4o extraction is failing
- Check: OpenAI API key, model availability, prompt issues

**If STEP_5_VALIDATED returns empty but STEP_3 had data:**
- Problem: Validation is too strict
- Check: `validateAndNormalizeData()` function

**If STEP_7_STORED fails:**
- Problem: Database write error
- Check: Database connection, schema, permissions

---

## 🔍 Debugging Workflow

### Step 1: Reproduce Issue

**Run automated test:**
```bash
npx tsx scripts/test-assessment-extraction.ts
```

### Step 2: Identify Failed Tests

**Check summary:**
```
Test 1: Simple grade extraction - ✅ PASS
Test 2: Grade in sentence - ❌ FAIL
Test 3: School name - ❌ FAIL
```

### Step 3: Analyze Debug Logs

**Open log file:**
```bash
tail -100 /Users/snazir/ivylevel-platform-v10/logs/debug/assessment-debug-$(date +%Y-%m-%d).log
```

**Look for patterns:**
- Are certain message types failing consistently?
- Is GPT returning empty responses?
- Is validation stripping out data?
- Are database writes failing?

### Step 4: Test Fix

**Modify code → Restart server → Rerun tests:**
```bash
# 1. Make fix in code
# 2. Restart
killall -9 tsx && npm run dev:utfa &
# 3. Retest
npx tsx scripts/test-assessment-extraction.ts
```

---

## 📝 Common Issues & Solutions

### Issue 1: All Tests Fail with Empty Data

**Symptoms:**
- STEP_3_GPT_RESPONSE always returns `{}`
- No facts ever collected

**Likely Causes:**
1. OpenAI API key missing/invalid
2. GPT extraction function not being called
3. Network issues preventing API calls

**Debug:**
```bash
# Check environment variables
echo $OPENAI_API_KEY

# Check extraction function
grep -A 20 "extractAssessmentDataGPT" src/agents/v18/extraction.ts
```

### Issue 2: Data Extracted But Not Stored

**Symptoms:**
- STEP_3_GPT_RESPONSE has data
- STEP_5_VALIDATED has data
- But database shows no records

**Likely Causes:**
1. Wrong student_id (v26 clone vs real)
2. Database write permissions
3. Transaction rollback

**Debug:**
```bash
# Check database directly
psql -d ivylevel -c "SELECT * FROM kb_items WHERE student_id = 'huda-v26-2025' AND source_ref = 'gpt4o_conversational_extraction_v28' ORDER BY created_ts DESC LIMIT 5;"
```

### Issue 3: Data Stored But Not Loaded

**Symptoms:**
- Database has records
- But loadFacts() returns empty FactSet

**Likely Causes:**
1. Wrong source_ref filter
2. Student ID mismatch
3. Query syntax error

**Debug:**
```bash
# Check loadFacts query
grep -A 15 "async loadFacts" src/agents/v18/AssessmentAgentV3ConversationalRealtime.ts
```

---

## 🎯 Next Steps

### After Running Tests

1. **Review test results** - Which scenarios pass/fail?
2. **Analyze debug logs** - Where does extraction break?
3. **Identify root cause** - GPT? Validation? Database?
4. **Implement fix** - Based on evidence
5. **Retest** - Verify fix works
6. **Clean up** - Delete bespoke test UI when done

### Cleanup Commands

```bash
# Remove test UI (after debugging complete)
rm -rf services/agent-framework/test-ui/

# Clear debug logs (optional)
rm /Users/snazir/ivylevel-platform-v10/logs/debug/assessment-debug-*.log

# Remove test script (optional)
rm services/agent-framework/scripts/test-assessment-extraction.ts
```

---

## 📊 Success Metrics

**System is working correctly when:**
- ✅ Test success rate > 80%
- ✅ All STEP_1 through STEP_7 logs appear
- ✅ Database records created for each message
- ✅ loadFacts() returns non-empty FactSet
- ✅ Agent progresses through conversation phases

**System has issues when:**
- ❌ Test success rate < 50%
- ❌ STEP_3_GPT_RESPONSE consistently empty
- ❌ STEP_6_SKIP_EMPTY appears for substantive messages
- ❌ Database queries return no records
- ❌ Agent loops on synthesis moments

---

**Status:** ✅ v31.3 DEBUG SYSTEM DEPLOYED
**Created:** 2025-11-04
**Ready For:** Deep-dive debugging with inch-by-inch visibility
