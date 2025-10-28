# Interactive Coaching Implementation Guide
# Dual-Mode System: Simulated vs Interactive

**Date:** 2025-10-20
**Status:** ✅ MIGRATION COMPLETE - Ready for Implementation
**Purpose:** Test new students using Old Huda's coaching intelligence in both modes

---

## Overview

This system allows testing "new" students using coaching intelligence extracted from successful student journeys (like Old Huda). It supports **two execution modes**:

### Mode 1: **Simulated (Non-Interactive)**
- Agent auto-generates all 27 assessment responses
- Completes in ~5-10 minutes
- Good for: Testing at scale, performance testing
- User sees: Final report/dashboard

### Mode 2: **Interactive (Real Dialogue)**
- Real back-and-forth coaching conversation
- Takes ~45 minutes (like real coaching)
- Good for: Testing coaching quality, user experience
- User sees: Chat interface with Jenny

**Both modes are PROACTIVE** - Jenny initiates first without user clicking "Start".

---

## Database Schema (Already Created ✅)

### Tables Created

**1. `interactive_sessions`**
- Tracks both interactive and simulated coaching sessions
- Fields: session_id, student_id, session_type, mode, current_layer, session_state
- Mode: 'interactive' (real dialogue) or 'simulated' (auto-generated)

**2. `coaching_frameworks`**
- Stores extracted coaching patterns (27-layer assessment, 168-hour framework)
- Generated from Old Huda's historical sessions
- Contains prompts, tactics, follow-up conditions

**3. `coaching_intelligence_extraction`**
- Raw extractions before converting to frameworks
- Tracks extraction quality scores

**4. `students` table modifications**
- Added `assessment_mode` column ('interactive' or 'simulated')
- Added `parent_student_id` column (links to template student like 'huda-2025')

### Students Created

- **huda-2025** (Old Huda): `assessment_mode = 'simulated'`
- **huda-2025-new** (New Huda): `assessment_mode = 'interactive'`, `parent_student_id = 'huda-2025'`

---

## Implementation Phases

### Phase 1: Intelligence Extraction (One-Time Setup)

Extract coaching intelligence from Old Huda's historical sessions:

```typescript
// services/agent-framework/src/intelligence/CoachingIntelligenceExtractor.ts

export class CoachingIntelligenceExtractor {

  /**
   * Extract 27-layer assessment pattern from Old Huda
   */
  async extractAssessmentIntelligence(oldStudentId: string = 'huda-2025') {
    // 1. Get Old Huda's assessment session
    // 2. Get conversation turns from that session
    // 3. Extract 27 layers of questions using GPT-4:
    //    - Layers 1-5: Diagnostic (personality, capacity, social, execution)
    //    - Layers 6-10: EQ Profile (confidence, parent anxiety, vulnerability)
    //    - Layers 11-15: Rubric Scoring (A, L, S, Ar, R)
    //    - Layers 16-20: Time Architecture (93 weeks, opportunities, capacity)
    //    - Layers 21-25: Gap Analysis (current vs target, barriers)
    //    - Layers 26-27: Synthesis (identity fusion, commitment)

    // 4. Store in coaching_intelligence_extraction table
    // 5. Return extracted layers
  }

  /**
   * Extract Week 1 168-Hour Framework
   */
  async extractWeek1Framework(oldStudentId: string = 'huda-2025') {
    // 1. Get Old Huda's Week 1 conversation
    // 2. Extract 168-Hour Framework structure:
    //    - Non-negotiables: sleep (56h), school (35h), meals (14h)
    //    - Discretionary time: homework, ECs, college prep
    //    - Optimization targets: reduce passive time, batch homework

    // 3. Store in coaching_intelligence_extraction table
    // 4. Return framework structure
  }

  /**
   * Generate interactive prompts from extractions
   */
  async generateInteractivePrompts(extractionType: 'assessment' | 'week_1_planning') {
    // Use GPT-4 to convert extracted intelligence into conversational prompts
    // Store in coaching_frameworks table with full JSON structure:
    // {
    //   prompts: [
    //     {
    //       step: 1,
    //       prompt: "Tell me about yourself...",
    //       purpose: "Understand personality type",
    //       follow_up_conditions: {...},
    //       expected_insights: [...]
    //     }
    //   ]
    // }
  }
}
```

**API Endpoint to trigger extraction:**

```
POST /api/interactive/extract-intelligence

Response:
{
  "success": true,
  "extracted": {
    "assessment_layers": 27,
    "assessment_prompts": 27,
    "week_1_framework": {...},
    "week_1_prompts": 5
  }
}
```

---

### Phase 2: Interactive Session Manager

Handles both modes (interactive and simulated):

```typescript
// services/agent-framework/src/interactive/InteractiveSessionManager.ts

export class InteractiveSessionManager {

  /**
   * Start interactive assessment (Mode 2: Real Dialogue)
   */
  async startInteractiveAssessment(studentId: string) {
    // 1. Create interactive_sessions record (mode='interactive')
    // 2. Get coaching framework (27-layer assessment prompts)
    // 3. Create conversation session
    // 4. Store Jenny's FIRST MESSAGE (proactive initiation)
    // 5. Return session_id + first_prompt

    // User sees: Jenny's first question immediately
  }

  /**
   * Process student response (Mode 2: Interactive)
   */
  async processAssessmentResponse(sessionId: string, studentResponse: string) {
    // 1. Get current session state
    // 2. Analyze student response using GPT-4
    // 3. Extract insights and rubric score updates
    // 4. Determine: need follow-up OR move to next layer
    // 5. Generate next prompt (or complete if layer 27 done)
    // 6. Store conversation turn
    // 7. Return next_prompt or summary
  }

  /**
   * Start simulated assessment (Mode 1: Auto-Generated)
   */
  async startSimulatedAssessment(studentId: string) {
    // 1. Create interactive_sessions record (mode='simulated')
    // 2. Get coaching framework
    // 3. Use GPT-4 to generate ALL 27 responses at once
    // 4. Analyze all responses and generate summary
    // 5. Store complete session
    // 6. Return summary

    // User sees: "Assessment complete" notification after ~5 min
  }

  /**
   * Start Week 1 planning (either mode)
   */
  async startWeek1Planning(studentId: string, mode: 'interactive' | 'simulated') {
    // Similar structure to assessment
    // Interactive: 5 steps through 168-Hour Framework
    // Simulated: Auto-generate all time allocations
  }
}
```

---

### Phase 3: Lifecycle Integration

Modify `StudentLifecycleManager` to handle both modes:

```typescript
// services/agent-framework/src/lifecycle/StudentLifecycleManager.ts

export class StudentLifecycleManager {

  /**
   * Handle new student signup/login - PROACTIVE INITIATION
   */
  async transitionState(studentId: string, fromState: string | null, toState: string) {
    // ... existing logic ...

    if (toState === 'new_intake' || toState === 'assessment_pending') {
      // Get student's assessment_mode
      const student = await this.getStudent(studentId);

      if (student.assessment_mode === 'interactive') {
        // INTERACTIVE MODE: Prepare session, Jenny sends first message
        await this.prepareInteractiveAssessment(studentId);
        // User will see: Chat interface with Jenny's first question

      } else if (student.assessment_mode === 'simulated') {
        // SIMULATED MODE: Auto-run assessment in background
        await this.runSimulatedAssessment(studentId);
        // User will see: Progress bar → "Assessment complete"
      }
    }
  }

  /**
   * Prepare interactive assessment (Mode 2)
   */
  async prepareInteractiveAssessment(studentId: string) {
    // 1. Create interactive_sessions record
    // 2. Get coaching framework based on parent_student_id
    // 3. Create conversation session
    // 4. Store Jenny's FIRST MESSAGE (proactive)
    // 5. Update lifecycle_state = 'assessment_in_progress'

    // Jenny initiates WITHOUT user clicking anything
  }

  /**
   * Run simulated assessment (Mode 1)
   */
  async runSimulatedAssessment(studentId: string) {
    // 1. Create interactive_sessions record (mode='simulated')
    // 2. Get coaching framework
    // 3. Call GPT-4 to generate ALL 27 responses
    // 4. Analyze and generate summary
    // 5. Update lifecycle_state = 'assessment_complete'

    // Completes in ~5-10 minutes automatically
  }
}
```

---

### Phase 4: API Endpoints

```typescript
// services/agent-framework/src/routes/interactive.ts

/**
 * POST /api/interactive/extract-intelligence
 * One-time setup: Extract coaching intelligence from Old Huda
 */
router.post('/extract-intelligence', async (req, res) => {
  const assessmentLayers = await intelligenceExtractor.extractAssessmentIntelligence('huda-2025');
  const assessmentPrompts = await intelligenceExtractor.generateInteractivePrompts('assessment');
  const week1Framework = await intelligenceExtractor.extractWeek1Framework('huda-2025');
  const week1Prompts = await intelligenceExtractor.generateInteractivePrompts('week_1_planning');

  res.json({ success: true, extracted: {...} });
});

/**
 * POST /api/interactive/assessment/start
 * Start interactive assessment (Mode 2)
 */
router.post('/assessment/start', async (req, res) => {
  const { student_id } = req.body;
  const result = await interactiveSessionManager.startInteractiveAssessment(student_id);
  res.json({ success: true, session_id: result.session_id, message: result.first_prompt });
});

/**
 * POST /api/interactive/assessment/respond
 * Send student response (Mode 2)
 */
router.post('/assessment/respond', async (req, res) => {
  const { session_id, response } = req.body;
  const result = await interactiveSessionManager.processAssessmentResponse(session_id, response);
  res.json({ success: true, ...result });
});

/**
 * POST /api/interactive/assessment/simulate
 * Run simulated assessment (Mode 1)
 */
router.post('/assessment/simulate', async (req, res) => {
  const { student_id } = req.body;
  const result = await interactiveSessionManager.startSimulatedAssessment(student_id);
  res.json({ success: true, summary: result });
});

/**
 * GET /api/interactive/session/active/:studentId
 * Get active interactive session (for loading chat UI)
 */
router.get('/session/active/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const session = await pool.query(
    `SELECT s.*, cs.session_id as conversation_session_id
     FROM interactive_sessions s
     LEFT JOIN agent_conversation_sessions cs ON s.student_id = cs.student_id AND cs.category = s.session_type
     WHERE s.student_id = $1 AND s.completed = false
     ORDER BY s.started_at DESC LIMIT 1`,
    [studentId]
  );

  res.json({ success: true, session: session.rows[0] || null });
});
```

---

### Phase 5: Frontend Components

**Dashboard: Auto-Show Interactive Chat**

```typescript
// unified-frontend/src/pages/Dashboard.tsx

export function Dashboard() {
  const { student } = useAuth();
  const [assessmentMode, setAssessmentMode] = useState<'interactive' | 'simulated'>('interactive');
  const [hasPendingAssessment, setHasPendingAssessment] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    checkPendingAssessment();
  }, []);

  async function checkPendingAssessment() {
    const response = await fetch(`/api/student/${student.student_id}/status`);
    const data = await response.json();

    setHasPendingAssessment(data.has_pending_assessment);
    setAssessmentMode(data.assessment_mode);

    if (data.assessment_mode === 'interactive' && data.has_pending_assessment) {
      await loadActiveSession();
    }
  }

  async function loadActiveSession() {
    const response = await fetch(`/api/interactive/session/active/${student.student_id}`);
    const data = await response.json();

    if (data.success && data.session) {
      setActiveSession(data.session);
    }
  }

  return (
    <div className="h-screen">
      {hasPendingAssessment && assessmentMode === 'interactive' ? (
        // INTERACTIVE MODE: Show chat UI with Jenny's first message
        <InteractiveAssessmentSession
          studentId={student.student_id}
          existingSession={activeSession}
        />
      ) : hasPendingAssessment && assessmentMode === 'simulated' ? (
        // SIMULATED MODE: Show progress bar
        <SimulatedAssessmentProgress studentId={student.student_id} />
      ) : (
        // Normal dashboard
        <NormalDashboard />
      )}
    </div>
  );
}
```

**Interactive Chat Component**

```typescript
// unified-frontend/src/components/InteractiveAssessmentSession.tsx

export function InteractiveAssessmentSession({
  studentId,
  existingSession
}: {
  studentId: string;
  existingSession?: any;
}) {
  const [sessionId, setSessionId] = useState<string | null>(existingSession?.session_id || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (existingSession) {
      loadExistingSession();
    } else {
      startNewSession();
    }
  }, []);

  async function loadExistingSession() {
    // Load conversation history from backend
    const response = await fetch(`/api/interactive/session/${existingSession.session_id}`);
    const data = await response.json();

    // Parse conversation turns into messages
    const messageList = data.session.conversation_history.map(turn => ({
      role: turn.agent_response ? 'jenny' : 'student',
      content: turn.agent_response || turn.user_message,
      timestamp: new Date(turn.created_at)
    }));

    setMessages(messageList);
  }

  async function sendResponse() {
    const studentMessage = { role: 'student', content: currentInput, timestamp: new Date() };
    setMessages(prev => [...prev, studentMessage]);
    setCurrentInput('');
    setIsLoading(true);

    const response = await fetch('/api/interactive/assessment/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, response: currentInput })
    });

    const data = await response.json();

    if (data.completed) {
      setIsCompleted(true);
      setMessages(prev => [...prev, { role: 'jenny', content: data.summary.summary_text, timestamp: new Date() }]);
    } else if (data.next_prompt) {
      setMessages(prev => [...prev, { role: 'jenny', content: data.next_prompt, timestamp: new Date() }]);
    }

    setIsLoading(false);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Interactive Assessment with Jenny</h1>
        <p className="text-sm text-gray-600">
          {isCompleted ? '✅ Complete!' : `Layer ${messages.length / 2 + 1} of 27`}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-lg px-4 py-3 ${
              msg.role === 'jenny' ? 'bg-blue-100 text-blue-900' : 'bg-gray-200'
            }`}>
              <div className="font-semibold text-sm mb-1">
                {msg.role === 'jenny' ? '👩‍🏫 Jenny' : '🎓 You'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      {!isCompleted && (
        <div className="bg-white border-t px-6 py-4">
          <div className="flex space-x-4">
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Type your response..."
              className="flex-1 border rounded-lg px-4 py-3"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={sendResponse}
              disabled={!currentInput.trim() || isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Testing Flow

### Test Scenario 1: Interactive Mode (New Huda)

```bash
# 1. Login as New Huda
POST /api/auth/login
{
  "email": "newhuda@test.com",
  "password": "test123"
}

# 2. Dashboard loads → Detects pending assessment + interactive mode
# 3. Frontend automatically loads active session
GET /api/interactive/session/active/huda-2025-new

# 4. User sees: Jenny's first question already waiting
# "Tell me about yourself - what makes you tick? What do you love to spend time on?"

# 5. User types response and clicks Send
POST /api/interactive/assessment/respond
{
  "session_id": "interactive_assess_huda-2025-new_1234567890",
  "response": "I love building things with code. I spend most of my free time working on personal projects..."
}

# 6. Jenny analyzes response and asks follow-up or next layer question
# Response: { "next_prompt": "When you're working on something you love, what does that feel like?" }

# 7. Continue back-and-forth for all 27 layers (~45 minutes)

# 8. Final layer → Assessment complete
# Response: {
#   "completed": true,
#   "summary": {
#     "rubric_scores": {"A": 4, "L": 3, "S": 2, "Ar": 4, "R": 3},
#     "recommended_tactics": ["Quick Wins Ladder", "168-Hour Framework"]
#   }
# }
```

### Test Scenario 2: Simulated Mode (Create Test Student)

```bash
# 1. Create test student with simulated mode
POST /api/students/create
{
  "email": "test-student@test.com",
  "password": "test123",
  "full_name": "Test Student",
  "graduation_year": 2029,
  "assessment_mode": "simulated",
  "parent_student_id": "huda-2025"
}

# 2. Lifecycle manager auto-triggers simulated assessment
# - Creates interactive_sessions record (mode='simulated')
# - Calls GPT-4 to generate all 27 responses
# - Analyzes responses and generates summary
# - Completes in ~5-10 minutes

# 3. User sees: "Assessment complete" notification
# Dashboard shows: Rubric scores, recommended tactics, next steps

# 4. No interaction needed - fully autonomous
```

---

## Next Steps for Implementation

### Step 1: Extract Intelligence (One-Time)

```typescript
// Run this once to extract Old Huda's coaching intelligence
// File: services/agent-framework/src/scripts/extract-intelligence.ts

import { intelligenceExtractor } from '../intelligence/CoachingIntelligenceExtractor';

async function main() {
  console.log('Extracting coaching intelligence from Old Huda...');

  // Extract assessment layers
  const assessmentLayers = await intelligenceExtractor.extractAssessmentIntelligence('huda-2025');
  console.log(`✅ Extracted ${assessmentLayers.length} assessment layers`);

  // Generate interactive prompts
  const assessmentPrompts = await intelligenceExtractor.generateInteractivePrompts('assessment');
  console.log(`✅ Generated ${assessmentPrompts.prompts.length} assessment prompts`);

  // Extract Week 1 framework
  const week1Framework = await intelligenceExtractor.extractWeek1Framework('huda-2025');
  console.log('✅ Extracted Week 1 framework');

  // Generate Week 1 prompts
  const week1Prompts = await intelligenceExtractor.generateInteractivePrompts('week_1_planning');
  console.log(`✅ Generated ${week1Prompts.prompts.length} Week 1 prompts`);

  console.log('✅ Intelligence extraction complete!');
}

main();
```

### Step 2: Implement Core Classes

1. **CoachingIntelligenceExtractor.ts** - Extract coaching patterns from Old Huda
2. **InteractiveSessionManager.ts** - Handle both interactive and simulated modes
3. **Modify StudentLifecycleManager.ts** - Add proactive initiation for both modes

### Step 3: Add API Endpoints

1. `/api/interactive/extract-intelligence` - One-time setup
2. `/api/interactive/assessment/start` - Start interactive assessment
3. `/api/interactive/assessment/respond` - Process student responses
4. `/api/interactive/assessment/simulate` - Run simulated assessment
5. `/api/interactive/session/active/:studentId` - Get active session

### Step 4: Build Frontend

1. **Dashboard.tsx** - Auto-detect mode and show appropriate UI
2. **InteractiveAssessmentSession.tsx** - Chat interface
3. **SimulatedAssessmentProgress.tsx** - Progress bar for simulated mode

### Step 5: Test Both Modes

1. **Interactive:** Login as huda-2025-new → See chat with Jenny
2. **Simulated:** Create test student → See auto-completion

---

## Database Verification

```sql
-- Check New Huda setup
SELECT student_id, email, full_name, assessment_mode, parent_student_id
FROM students
WHERE student_id IN ('huda-2025', 'huda-2025-new');

-- Result:
-- huda-2025     | hudasir4j@gmail.com | Huda A.   | simulated   | NULL
-- huda-2025-new | newhuda@test.com    | Huda New  | interactive | huda-2025

-- Check active interactive sessions
SELECT * FROM v_active_interactive_sessions;

-- Check coaching frameworks
SELECT * FROM v_coaching_frameworks_catalog;
```

---

## Summary

✅ **Migration Complete** - All tables created, New Huda student setup
✅ **Dual-Mode Architecture** - Interactive (real dialogue) + Simulated (auto-generated)
✅ **Proactive Initiation** - Jenny initiates first message automatically in both modes
✅ **Intelligence Extraction** - Ready to extract Old Huda's coaching patterns

**Status:** Ready for implementation of Phase 1-5 (Intelligence extraction → API endpoints → Frontend)

**Test Student:** `huda-2025-new` (email: newhuda@test.com, password: test123)
