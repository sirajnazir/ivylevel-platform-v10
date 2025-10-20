# Frontend Testing Guide: Interactive & Simulated Assessment Modes

**Version:** v10.2
**Created:** 2025-10-20
**Purpose:** Test the Phase 1 intelligence extraction via unified frontend

---

## Overview

You now have **two separate student accounts** to test:

1. **Old Huda** (`huda-2025`) - Original student with complete coaching history
2. **New Huda** (`huda-2025-new`) - Test student with Interactive/Simulated mode buttons

The New Huda account has **two special buttons** in the AI Chat that let you test:
- **🎯 Interactive Assessment** - Real back-and-forth coaching dialogue
- **⚡ Simulated Assessment** - Auto-generated fast assessment

---

## Login Credentials

### Old Huda (Original Data - Don't Modify)
```
Email: huda@test.com
Password: huda123
Student ID: huda-2025
Assessment Mode: simulated
```

**Features:**
- Regular AI Chat with 9 agents
- Full NSM dashboard with real data
- Awards, Programs, Colleges, etc.
- **NO special assessment buttons** (keeps existing behavior)

### New Huda (Testing Account)
```
Email: newhuda@test.com
Password: newhuda123
Student ID: huda-2025-new
Assessment Mode: interactive
Parent Student: huda-2025 (linked to Old Huda for intelligence)
```

**Features:**
- Regular AI Chat with 9 agents
- **PLUS** two special assessment mode buttons:
  - **🎯 Interactive Assessment**
  - **⚡ Simulated Assessment**
- Buttons only visible when logged in as `huda-2025-new`

---

## How to Test

### Step 1: Start the Unified Frontend

```bash
cd /Users/snazir/ivylevel-platform-v10/unified-frontend
npm run dev
# OR
yarn dev
# OR
pnpm dev
```

**Expected:** Frontend starts on http://localhost:5173 (or similar)

### Step 2: Login as New Huda

1. Open browser to http://localhost:5173
2. Click "Login" or go to login page
3. Enter credentials:
   - **Email:** `newhuda@test.com`
   - **Password:** `newhuda123`
4. Click "Login"

**Expected:** Dashboard loads with New Huda's profile

### Step 3: Navigate to AI Chat

1. Look for "AI Chat" or "Ask Jenny" in the navigation/sidebar
2. Click to open the AI Chat interface

**Expected:**
- Chat interface loads
- Welcome message from Jenny appears
- **TWO BUTTONS appear above the input field:**
  - **🎯 Interactive Assessment**
  - **⚡ Simulated Assessment**

### Step 4: Test Interactive Mode

1. Click the **🎯 Interactive Assessment** button
2. Wait for response

**Expected Behavior (Phase 1 - Current):**
- Button click sends message: "Start Interactive Assessment"
- Chat shows: "Start Interactive Assessment" (user message)
- Jenny responds with normal agent routing (for now)

**Expected Behavior (After Phase 2):**
- Jenny starts 27-layer assessment with first question
- Real back-and-forth dialogue
- Each response triggers next question
- ~45 minutes to complete all 27 layers

### Step 5: Test Simulated Mode

1. Click the **⚡ Simulated Assessment** button
2. Wait for response

**Expected Behavior (Phase 1 - Current):**
- Button click sends message: "Start Simulated Assessment"
- Chat shows: "Start Simulated Assessment" (user message)
- Jenny responds with normal agent routing (for now)

**Expected Behavior (After Phase 2):**
- Jenny auto-generates all 27 responses
- Shows progress: "Layer 1/27... Layer 2/27..."
- Completes in ~5-10 minutes
- Final summary appears

---

## Current Limitations (Phase 1)

Since we've only completed **Phase 1** (intelligence extraction), the buttons currently just send regular chat messages. To get full functionality, we need to complete:

### Phase 2: InteractiveSessionManager (NEXT)
**What it does:**
- Intercepts "Start Interactive Assessment" / "Start Simulated Assessment" messages
- Loads extracted 27-layer framework from database
- Manages session state (current layer, responses, progress)
- Delivers questions one-by-one (interactive) or all-at-once (simulated)

**Estimated time:** 6-8 hours

### Phase 3: Lifecycle Integration
**What it does:**
- Auto-detects assessment_mode on login
- Proactively starts assessment for New Huda without button click
- Stores session progress in `interactive_sessions` table

**Estimated time:** 2-3 hours

### Phase 4: API Endpoints
**What it does:**
- Creates REST API routes for frontend to call
- POST `/api/interactive/assessment/start`
- POST `/api/interactive/assessment/respond`
- GET `/api/interactive/session/active/:studentId`

**Estimated time:** 3-4 hours

### Phase 5: Frontend Components
**What it does:**
- Creates dedicated UI components for interactive/simulated views
- Progress bars, layer indicators, summary views
- Real-time updates during simulated mode

**Estimated time:** 6-8 hours

---

## Verification

### Verify New Huda Account Created

```bash
PGDATABASE=ivylevel PGUSER=postgres psql -c "
SELECT
  student_id,
  email,
  full_name,
  assessment_mode,
  parent_student_id,
  primary_coach_id
FROM students
WHERE student_id = 'huda-2025-new';
"
```

**Expected output:**
```
student_id    | email            | full_name | assessment_mode | parent_student_id | primary_coach_id
--------------|------------------|-----------|-----------------|-------------------|------------------
huda-2025-new | newhuda@test.com | Huda New  | interactive     | huda-2025         | jenny
```

### Verify Intelligence Extraction Exists

```bash
PGDATABASE=ivylevel PGUSER=postgres psql -c "
SELECT
  extraction_id,
  source_student_id,
  extraction_type,
  jsonb_array_length(extracted_content->'layers') as layer_count,
  quality_score,
  created_at
FROM coaching_intelligence_extraction
WHERE source_student_id = 'huda-2025'
ORDER BY created_at DESC
LIMIT 1;
"
```

**Expected output:**
```
extraction_id                           | source_student_id | extraction_type      | layer_count | quality_score | created_at
----------------------------------------|-------------------|----------------------|-------------|---------------|---------------------------
extract_huda-2025_assessment_1760950... | huda-2025         | assessment_questions | 27          | 0.95          | 2025-10-20 02:00:10...
```

### Verify Buttons Only Show for New Huda

**Test 1: Login as Old Huda**
- Email: `huda@test.com`
- Password: `huda123`
- Go to AI Chat
- **Expected:** NO special buttons, just regular chat interface

**Test 2: Login as New Huda**
- Email: `newhuda@test.com`
- Password: `newhuda123`
- Go to AI Chat
- **Expected:** TWO buttons appear (Interactive + Simulated)

---

## Troubleshooting

### Issue: Can't login as New Huda

**Solution:** Reset password
```bash
PGDATABASE=ivylevel PGUSER=postgres psql -c "
UPDATE students
SET password_hash = '\$2b\$10\$rQZ5vKJ5YxH.yJ5JZJZJZO5vKJ5YxH.yJ5JZJZJZO5vKJ5YxH.yJ5JZ'
WHERE student_id = 'huda-2025-new';
"
```

### Issue: Buttons don't appear

**Check 1:** Verify you're logged in as `huda-2025-new`
```javascript
// In browser console:
console.log(user?.id); // Should show 'huda-2025-new'
```

**Check 2:** Check student ID in component
```typescript
// In AIChat.tsx:
const studentId = user?.id || 'huda-2025';
console.log('Student ID:', studentId);
```

**Check 3:** Verify code changes saved
```bash
# Check if AIChat.tsx has the mode buttons
grep "Interactive Assessment" /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app/src/components/student/AIChat.tsx
```

### Issue: Buttons appear but nothing happens

**Expected for Phase 1:** Buttons just send regular chat messages. This is correct behavior.

**To get full functionality:** Complete Phase 2-5 (see "Current Limitations" section above).

---

## Next Steps

### Option 1: Test Current Functionality (Phase 1)

Just verify the buttons appear and send messages. Good for confirming UI changes work.

### Option 2: Build Phase 2 (Full Interactive/Simulated)

Implement the InteractiveSessionManager to actually handle the assessment modes.

**Ready to proceed?** Let me know and I can start building Phase 2!

---

## Files Modified

**Frontend:**
- `/unified-frontend/apps/unified-app/src/components/student/AIChat.tsx`
  - Added `ModeButtonsContainer` styled component
  - Added `ModeButton` styled component
  - Added `assessmentMode` state
  - Added `handleModeClick()` function
  - Added conditional mode buttons (only for huda-2025-new)

**Database:**
- `/services/agent-framework/migrations/006_interactive_sessions.sql`
  - Created `huda-2025-new` student
  - Linked to `huda-2025` via `parent_student_id`
  - Set `assessment_mode = 'interactive'`

**Documentation:**
- This guide

---

## Summary

✅ **What's Working:**
- New Huda login credential created
- Two mode buttons added to AI Chat UI
- Buttons only appear for huda-2025-new
- Clicking buttons sends assessment mode requests

⏳ **What's Pending (Phase 2-5):**
- Interactive session management
- 27-layer question delivery
- Progress tracking
- Auto-generated simulated responses
- Dedicated assessment UI components

**Total remaining work:** ~21-29 hours (~3-4 days)

---

**Questions or issues?** Check the troubleshooting section or ask for help!
