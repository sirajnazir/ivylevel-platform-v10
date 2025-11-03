# MultiAgents Chat v26.0 - Product Specification

**Document Version:** v26.0
**Last Updated:** 2025-10-31
**Status:** 🎯 DESIGN REVIEW - Ready for Implementation
**Dependencies:** MULTIAGENTS_V26_UI_UX_SPEC.md

---

## 1. PRODUCT OVERVIEW

### 1.1 Product Definition
MultiAgents Chat v26.0 is a **real-time AI coaching orchestration platform** that autonomously guides students from onboarding through weekly execution using 6 specialized AI agents trained on real coaching data from Jenny and real student sessions with Huda.

### 1.2 Key Differentiators
- **Zero Mocking:** All agents use real intelligence types from existing codebase (~21K lines)
- **Real Coaching:** Based on 10+ real Jenny assessment sessions, 89 weeks execution data
- **Complete Transparency:** Every intelligence activation is visible and traceable
- **Human Parity+:** Matches Jenny's EQ/IQ, exceeds in consistency and availability
- **Incremental Launch:** v26.0 scoped to onboarding → Week 1 (proven value delivery)

### 1.3 Success Criteria
- **Technical:** New student Huda completes full onboarding session with real inputs
- **Quality:** Agent responses match or exceed Jenny's coaching quality (measured by depth score ≥8.5/10)
- **Performance:** Average response time < 3 seconds per message
- **Accuracy:** Zero hallucinations (all facts from real database)
- **Transparency:** 100% of intelligence activations are traceable

---

## 2. USER JOURNEY & WORKFLOWS

### 2.1 User Persona: New Student Huda
**Profile:**
- Just joined IvyLevel platform (fresh state, no prior data)
- Needs comprehensive assessment to understand college readiness
- Requires personalized gameplan based on assessment
- Ready to start weekly execution

**Goals:**
- Understand current college prep standing
- Identify strengths and gaps
- Get actionable roadmap
- Start weekly accountability

### 2.2 Complete User Journey (v26.0 Scope)

**Journey Map:**
```
Landing → Onboarding Start → Assessment (4 phases) → GamePlan Creation → Week 1 Execution → Complete
   │            │                    │                      │                    │              │
  2min        instant             35min                  18min                12min          done
   │            │                    │                      │                    │              │
  Info     Click button      Real conversation      Multi-agent coord      Action plan    Success
```

**Detailed Flow:**

**Step 1: Landing (Duration: 2 minutes)**
- User clicks "MultiAgents v2.0" tab
- Views platform status dashboard (6 agents ready)
- Reads journey roadmap (what to expect)
- Sees time commitment: 60-80 minutes total
- Decision: Click "New Student Huda Onboarding Start" button

**Step 2: Onboarding Initialization (Duration: Instant)**
- System resets all agents to fresh state
- Creates new session ID
- Initializes Assessment Agent
- Displays Assessment Agent card (expanded)
- Assessment Agent sends autonomous first message

**Step 3: Assessment Session (Duration: 30-45 minutes)**

*Phase 1: Opening & Rapport (5-8 min)*
- Assessment Agent: Warm greeting, introduces self
- Asks pride-moment question (open-ended)
- Student Huda: Responds with recent achievement
- Agent: Follows up, builds rapport
- Agent: Transitions to academic interests
- Intelligence: TYPE-089-WarmOpening

*Phase 2: Deep Dive (10-15 min)*
- Agent: Systematic exploration of academics
  - "Tell me about your favorite classes"
  - "What subjects challenge you?"
  - "What's your GPA trajectory?"
- Agent: Extracurriculars deep dive
  - "What activities are you passionate about?"
  - "Tell me about leadership roles"
  - "How much time do you dedicate weekly?"
- Student: Provides detailed responses for each area
- Intelligence: TYPE-090-DeepDiveQuestions

*Phase 3: Gap Discovery (8-12 min)*
- Agent: Probes for missing elements
  - "Have you won any awards or recognition?"
  - "What about summer programs or internships?"
  - "Tell me about standardized test prep"
- Agent: Identifies gaps in real-time
  - Flags P0 (critical): Missing test scores
  - Flags P1 (important): Limited awards, no summer programs
  - Flags P2 (moderate): Sparse leadership documentation
- Student: Confirms current state
- Intelligence: TYPE-091-GapIdentification

*Phase 4: Potential Activation (7-10 min)*
- Agent: Surfaces hidden strengths
  - "I noticed you mentioned X - tell me more"
  - "That sounds like it could be a unique angle"
- Agent: Confirms readiness for gameplan
  - "Based on everything you've shared, I see 5 key strengths..."
  - "Here are the main areas we'll focus on..."
- Student: Validates agent's understanding
- Intelligence: TYPE-092-PotentialActivation

*Session Complete:*
- Agent: "Amazing work! I'm now handing you to GamePlan Agent..."
- Displays handoff animation
- Packages data: profile, gaps, strengths, recommendations

**Step 4: GamePlan Creation (Duration: 15-20 minutes)**

*GamePlan Agent Activation*
- Receives assessment package
- Displays: "Hi Huda! I received your assessment from the Assessment Agent..."
- Confirms data understanding
- Intelligence: TYPE-001-GamePlanSynthesis

*Multi-Agent Coordination (Parallel)*
- GamePlan Agent delegates to:
  - Awards Agent: "Find award opportunities matching Huda's profile"
  - Programs Agent: "Identify summer programs for STEM + service interest"
  - Scholarships Agent: "Search scholarships for Huda's demographics"
- Visual indicator: Shows 3 sub-agents processing in parallel
- Duration: 2-3 minutes

*Strategic Roadmap Generation*
- GamePlan Agent: Synthesizes all inputs
- Generates timeline: 9th → 12th grade milestones
- Prioritizes gaps: P0 tasks first, then P1, P2, P3
- Identifies quick wins: "Let's start with these 3 achievable goals..."
- Intelligence: TYPE-003-TimelineArchitecture, TYPE-004-MultiPathConvergence

*Presentation to Student*
- GamePlan Agent: Shows structured roadmap
  - Year 1 (9th grade): Foundation building
  - Year 2 (10th grade): Depth + breadth
  - Year 3 (11th grade): Peak performance
  - Year 4 (12th grade): Applications
- Student: Reviews, asks clarifying questions
- Agent: Refines based on feedback

*Session Complete:*
- Agent: "Your gameplan is ready! Now let's kickoff Week 1 with Execution Agent..."
- Handoff to Execution Agent

**Step 5: Week 1 Execution (Duration: 10-15 minutes)**

*Execution Agent Activation*
- Receives gameplan package
- Displays: "Welcome to Week 1! I'm your Execution Agent..."
- Confirms weekly cadence
- Intelligence: TYPE-049-ExecutionLadderNavigation

*168-Hour Framework Application*
- Agent: "Let's map out your week using the 168-hour framework"
- Walks through time allocation:
  - School: ~40 hours
  - Sleep: ~56 hours
  - ECs: ~15 hours
  - Test prep: ~5 hours
  - Family/personal: ~52 hours
- Student: Adjusts based on reality
- Intelligence: TYPE-051-TaskDecomposition

*Week 1 Action Plan Generation*
- Agent: Creates detailed action plan
  - Outcome 1: Complete 2 practice SAT math sections
  - Outcome 2: Draft college club proposal
  - Outcome 3: Research 3 summer STEM programs
- Each outcome broken into tasks with 5Ws:
  - What, Why, When, Who, How
  - Priority: P0/P1/P2
  - Duration estimates
- Intelligence: TYPE-050-OutcomeEngineering

*Quick Wins Identification*
- Agent: "Let's start with 3 quick wins this week"
  - Win 1: Sign up for SAT practice platform (15 min)
  - Win 2: Draft 1-page club proposal outline (30 min)
  - Win 3: Create spreadsheet for program research (20 min)
- Momentum building strategy
- Intelligence: QuickWinsStrategy

*Session Complete:*
- Agent: "Your Week 1 plan is locked in! I'll check in at end of week..."
- Displays action plan summary
- Session ends with success message

**Step 6: Completion (Duration: Instant)**
- Platform displays success modal
- Summary of journey: Assessment → GamePlan → Week 1 Execution
- Next steps preview: "Week 2 will begin on [date]"
- Option to review any agent conversation

---

## 3. AGENT SPECIFICATIONS

### 3.1 Assessment Agent

**Role:** Conduct comprehensive student assessment

**Intelligence Types (4):**
1. TYPE-089-WarmOpening (Lines: ~150)
   - Purpose: Establish rapport, set empathetic tone
   - Training: Jenny's opening patterns from 10 real sessions
   - Output: Personalized greeting + pride-moment question

2. TYPE-090-DeepDiveQuestions (Lines: ~200)
   - Purpose: Systematic exploration of academics, ECs, interests
   - Training: Jenny's probing question patterns
   - Output: 8-12 contextual follow-up questions

3. TYPE-091-GapIdentification (Lines: ~180)
   - Purpose: Identify missing elements with P0/P1/P2/P3 priority
   - Training: Real gap analysis from coaching sessions
   - Output: Prioritized gap list with evidence

4. TYPE-092-PotentialActivation (Lines: ~170)
   - Purpose: Surface hidden strengths, confirm readiness
   - Training: Jenny's strength-discovery techniques
   - Output: Strengths list (5+ items) + readiness score

**Total Lines:** ~700 lines of assessment intelligence

**Session Structure:**
- 4 phases (Opening, Deep Dive, Gap Discovery, Potential Activation)
- 20-30 conversational turns
- 30-45 minute duration
- Outputs: Complete student profile, gaps, strengths, recommendations

**Handoff Data Package:**
```typescript
interface AssessmentPackage {
  studentProfile: {
    academicInterests: string[];
    currentGPA: number | null;
    testScores: { type: string; score: number }[];
    extracurriculars: Array<{
      name: string;
      role: string;
      hoursPerWeek: number;
      yearsInvolved: number;
    }>;
    awards: string[];
    summerPrograms: string[];
  };
  gaps: Array<{
    id: string;
    category: string; // 'academic' | 'ec' | 'awards' | 'programs'
    description: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    evidence: string;
  }>;
  strengths: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    hiddenPotential: boolean;
  }>;
  recommendations: string[];
  readinessScore: number; // 0-100
  sessionMetadata: {
    duration: number;
    messageCount: number;
    intelligenceActivations: number;
    depthScore: number; // vs Jenny's baseline
  };
}
```

### 3.2 GamePlan Agent

**Role:** Transform assessment into actionable strategic roadmap

**Intelligence Types (6):**
1. TYPE-001-GamePlanSynthesis (Lines: ~250)
2. TYPE-002-WeakSpotPrioritization (Lines: ~200)
3. TYPE-003-TimelineArchitecture (Lines: ~220)
4. TYPE-004-MultiPathConvergence (Lines: ~180)
5. TYPE-005-OpportunityIdentification (Lines: ~190)
6. TYPE-006-QuarterlyAdaptation (Lines: ~160)

**Total Lines:** ~1,200 lines of gameplan intelligence

**Multi-Agent Coordination:**
- Delegates to Awards Agent (parallel search)
- Delegates to Programs Agent (parallel search)
- Delegates to Scholarships Agent (parallel search)
- Synthesizes results into unified gameplan

**Session Structure:**
- Receives assessment package
- Confirms understanding (1-2 turns)
- Delegates to sub-agents (parallel, 2-3 min)
- Generates strategic roadmap (5-8 min)
- Presents to student (3-5 turns)
- Refines based on feedback (2-4 turns)
- Total duration: 15-20 minutes

**Handoff Data Package:**
```typescript
interface GamePlanPackage {
  roadmap: {
    year1: { focus: string; milestones: Milestone[] };
    year2: { focus: string; milestones: Milestone[] };
    year3: { focus: string; milestones: Milestone[] };
    year4: { focus: string; milestones: Milestone[] };
  };
  prioritizedGaps: Array<{
    gap: Gap; // from assessment
    timeline: string; // when to address
    resources: string[];
  }>;
  opportunities: {
    awards: Award[];
    programs: Program[];
    scholarships: Scholarship[];
  };
  quickWins: Array<{
    title: string;
    description: string;
    timeframe: string; // 'Week 1', 'Month 1', etc.
    effort: 'low' | 'medium' | 'high';
  }>;
  strategicThemes: string[]; // 2-3 core themes
}
```

### 3.3 Execution Agent

**Role:** Drive weekly execution and accountability

**Intelligence Types (16 - using 5 for Week 1):**
1. TYPE-049-ExecutionLadderNavigation (Lines: ~280)
2. TYPE-050-OutcomeEngineering (Lines: ~320)
3. TYPE-051-TaskDecomposition (Lines: ~290)
4. QuickWinsStrategy (Lines: ~180)
5. TYPE-052-PortfolioOperatingCadence (Lines: ~250)

**Total Lines (Week 1 subset):** ~1,320 lines

**Session Structure:**
- Receives gameplan package
- Applies 168-hour framework (5-7 min)
- Generates Week 1 action plan (3-5 min)
- Identifies quick wins (2-3 min)
- Confirms with student (2-4 turns)
- Total duration: 10-15 minutes

**Week 1 Action Plan Output:**
```typescript
interface Week1Plan {
  weekNumber: 1;
  weekStart: Date;
  weekEnd: Date;
  timeAllocation: {
    school: number;
    sleep: number;
    extracurriculars: number;
    testPrep: number;
    familyPersonal: number;
    buffer: number;
  };
  outcomes: Array<{
    outcomeId: string;
    title: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
    linkedGap?: string; // gap ID from assessment
    executionItems: Array<{
      what: string;
      why: string;
      when: string;
      who: string;
      how: string;
      estimatedDuration: number; // minutes
      priority: 'P0' | 'P1' | 'P2';
    }>;
  }>;
  quickWins: Array<{
    title: string;
    description: string;
    estimatedDuration: number;
    dueDate: Date;
  }>;
  coachingCheckIn: Date; // end of week
}
```

### 3.4 Sub-Agents (Parallel Coordinators)

**Awards Agent:**
- Intelligence Types: 3
- Role: Search awards database matching student profile
- Duration: 2-3 minutes (parallel)
- Output: 5-10 ranked award opportunities

**Summer Programs Agent:**
- Intelligence Types: 3
- Role: Search programs database with multi-dimensional scoring
- Duration: 2-3 minutes (parallel)
- Output: 5-8 ranked summer programs

**Scholarships Agent:**
- Intelligence Types: 3
- Role: Search scholarships based on demographics + profile
- Duration: 2-3 minutes (parallel)
- Output: 8-12 ranked scholarship opportunities

---

## 4. DATA MODELS

### 4.1 Session Data Model

```typescript
interface MultiAgentSession {
  id: string; // UUID
  studentId: string; // 'huda-2025'
  sessionType: 'onboarding' | 'weekly_execution';
  status: 'in_progress' | 'completed' | 'paused' | 'error';
  startedAt: Date;
  completedAt: Date | null;

  // Phase tracking
  currentPhase: 'assessment' | 'gameplan' | 'execution' | 'complete';
  currentAgent: string; // 'assessment' | 'gameplan' | 'execution' | ...

  // Data packages (cumulative)
  assessmentPackage: AssessmentPackage | null;
  gameplanPackage: GamePlanPackage | null;
  executionPackage: Week1Plan | null;

  // Conversation history
  messages: Message[];

  // Intelligence trace
  intelligenceActivations: IntelligenceActivation[];

  // Analytics
  analytics: SessionAnalytics;
}
```

### 4.2 Message Data Model

```typescript
interface Message {
  id: string;
  sessionId: string;
  agentId: string; // 'assessment' | 'gameplan' | 'execution' | 'user'
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;

  // Intelligence trace
  intelligenceType?: string; // e.g., 'TYPE-089-WarmOpening'
  processingTime?: number; // milliseconds
  confidence?: number; // 0-100

  // Metadata
  metadata?: {
    phase?: string;
    gapsIdentified?: string[];
    strengthsDiscovered?: string[];
    [key: string]: any;
  };
}
```

### 4.3 Intelligence Activation Data Model

```typescript
interface IntelligenceActivation {
  id: string;
  sessionId: string;
  agentId: string;
  intelligenceType: string; // e.g., 'TYPE-089-WarmOpening'
  version: string; // e.g., 'v1.2.3'

  timestamp: Date;
  duration: number; // milliseconds

  // Source tracking
  sourceFile: string;
  sourceLines: string; // e.g., '145-289'
  trainingData: string; // e.g., 'Jenny session 2023-03-15'

  // Execution flow
  executionSteps: Array<{
    step: number;
    description: string;
    duration: number;
    status: 'success' | 'error';
  }>;

  // Response correlation
  generatedText: string;
  intelligenceMapping: Array<{
    textSegment: string;
    intelligenceComponent: string;
  }>;

  // Performance
  modelUsed: string; // e.g., 'GPT-4-Turbo'
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  confidence: number; // 0-100

  status: 'success' | 'error' | 'retry';
  error?: string;
}
```

### 4.4 Session Analytics Data Model

```typescript
interface SessionAnalytics {
  sessionId: string;

  // Coverage
  intelligenceCoverage: {
    assessmentAgent: { used: number; total: number };
    gameplanAgent: { used: number; total: number };
    executionAgent: { used: number; total: number };
  };

  // Performance
  totalActivations: number;
  avgResponseTime: number; // milliseconds
  avgConfidence: number; // 0-100
  totalCost: number; // USD

  // Quality metrics
  depthScore: number; // 0-10, compared to Jenny's baseline (8.5)
  sophisticationLevel: 'basic' | 'intermediate' | 'advanced';
  questionQuality: 'low' | 'medium' | 'high';

  // Outcomes
  gapsIdentified: {
    P0: number;
    P1: number;
    P2: number;
    P3: number;
  };
  strengthsDiscovered: number;
  hiddenPotentialActivated: number;

  // Readiness
  gameplanReadiness: number; // 0-100
  executionReadiness: number; // 0-100
}
```

---

## 5. BUSINESS LOGIC & WORKFLOWS

### 5.1 Session Initialization Workflow

```
User clicks "New Student Huda Onboarding Start"
  ↓
System creates new MultiAgentSession
  - ID: UUID
  - studentId: 'huda-2025' (new, fresh state)
  - status: 'in_progress'
  - currentPhase: 'assessment'
  - currentAgent: 'assessment'
  ↓
Assessment Agent initializes
  - Loads TYPE-089-WarmOpening intelligence
  - Generates autonomous first message
  - Displays in UI (agent card expanded)
  ↓
Student sees first message
  - "Hi Huda! I'm so excited to start this journey with you..."
  - Intelligence trace shows TYPE-089-WarmOpening activation
  - Input field active for student to respond
```

### 5.2 Message Send/Receive Workflow

```
Student types message and clicks Send
  ↓
Frontend sends to backend:
  POST /api/v26/agents/assessment/message
  Body: {
    sessionId: 'uuid',
    content: 'student message text'
  }
  ↓
Backend:
  1. Saves user message to session.messages
  2. Determines current phase (e.g., 'deep_dive')
  3. Loads appropriate intelligence type (TYPE-090-DeepDiveQuestions)
  4. Calls intelligence execution:
     - Pass student message + conversation history
     - Get AI response from OpenAI GPT-4
     - Extract intelligence trace data
  5. Saves agent message to session.messages
  6. Saves intelligence activation to session.intelligenceActivations
  7. Returns response to frontend
  ↓
Frontend receives response:
  {
    message: {
      id: 'uuid',
      content: 'agent response text',
      intelligenceType: 'TYPE-090-DeepDiveQuestions',
      processingTime: 342
    },
    intelligenceTrace: { ... }
  }
  ↓
Frontend updates UI:
  - Appends agent message to chat
  - Updates intelligence trace panel
  - Updates session analytics
  - Re-enables input field for next user message
```

### 5.3 Agent Handoff Workflow

```
Assessment Agent completes Phase 4
  ↓
Agent generates handoff signal:
  - Sets assessment complete flag
  - Creates AssessmentPackage with all data
  - Displays handoff UI animation
  ↓
Backend triggers handoff:
  POST /api/v26/session/:id/handoff
  Body: {
    fromAgent: 'assessment',
    toAgent: 'gameplan',
    dataPackage: AssessmentPackage
  }
  ↓
System updates session:
  - session.currentAgent = 'gameplan'
  - session.currentPhase = 'gameplan'
  - session.assessmentPackage = AssessmentPackage
  ↓
GamePlan Agent initializes:
  - Receives AssessmentPackage
  - Loads TYPE-001-GamePlanSynthesis
  - Generates autonomous first message
  - "Hi Huda! I received your assessment..."
  ↓
Frontend updates UI:
  - Collapses Assessment Agent card (status: complete)
  - Expands GamePlan Agent card (status: active)
  - Shows orchestration flow update
```

### 5.4 Multi-Agent Parallel Coordination

```
GamePlan Agent delegates to sub-agents
  ↓
System triggers 3 parallel API calls:
  1. POST /api/v26/agents/awards/search
     Body: { studentProfile, gaps }
  2. POST /api/v26/agents/programs/search
     Body: { studentProfile, interests }
  3. POST /api/v26/agents/scholarships/search
     Body: { studentProfile, demographics }
  ↓
Each sub-agent executes intelligence:
  - Awards Agent: Uses 3 intelligence types
  - Programs Agent: Uses 3 intelligence types
  - Scholarships Agent: Uses 3 intelligence types
  - Duration: 2-3 minutes each (parallel)
  ↓
Results aggregated:
  - Awards: 5-10 opportunities
  - Programs: 5-8 opportunities
  - Scholarships: 8-12 opportunities
  ↓
GamePlan Agent synthesizes:
  - Uses TYPE-001-GamePlanSynthesis
  - Integrates all sub-agent results
  - Generates unified strategic roadmap
  - Presents to student
```

---

## 6. STATE MANAGEMENT

### 6.1 Session State Machine

```
States:
- INITIALIZED: Session created, waiting for first message
- ASSESSMENT_PHASE_1: Opening & rapport
- ASSESSMENT_PHASE_2: Deep dive
- ASSESSMENT_PHASE_3: Gap discovery
- ASSESSMENT_PHASE_4: Potential activation
- HANDOFF_TO_GAMEPLAN: Transferring data
- GAMEPLAN_ACTIVE: Creating strategic roadmap
- GAMEPLAN_SUB_AGENTS: Parallel coordination
- HANDOFF_TO_EXECUTION: Transferring data
- EXECUTION_WEEK_1: Week 1 planning
- COMPLETED: All phases done

Transitions:
INITIALIZED → ASSESSMENT_PHASE_1 (on first agent message)
ASSESSMENT_PHASE_1 → ASSESSMENT_PHASE_2 (after 3-5 turns)
ASSESSMENT_PHASE_2 → ASSESSMENT_PHASE_3 (after 8-12 turns)
ASSESSMENT_PHASE_3 → ASSESSMENT_PHASE_4 (after gap identification)
ASSESSMENT_PHASE_4 → HANDOFF_TO_GAMEPLAN (after readiness confirmation)
HANDOFF_TO_GAMEPLAN → GAMEPLAN_ACTIVE (after data transfer)
GAMEPLAN_ACTIVE → GAMEPLAN_SUB_AGENTS (when delegation triggered)
GAMEPLAN_SUB_AGENTS → GAMEPLAN_ACTIVE (when all results received)
GAMEPLAN_ACTIVE → HANDOFF_TO_EXECUTION (after roadmap presentation)
HANDOFF_TO_EXECUTION → EXECUTION_WEEK_1 (after data transfer)
EXECUTION_WEEK_1 → COMPLETED (after action plan confirmed)
```

### 6.2 Agent State

```typescript
interface AgentState {
  agentId: string;
  status: 'standby' | 'active' | 'processing' | 'handoff' | 'complete';
  currentPhase?: string;
  intelligenceLoaded: string[]; // Array of intelligence type IDs
  messageCount: number;
  activationCount: number;
  dataPackageReady: boolean;
}
```

---

## 7. ERROR HANDLING & EDGE CASES

### 7.1 Error Scenarios

**Scenario 1: API Timeout**
- Trigger: Backend doesn't respond within 30 seconds
- Handling:
  - Frontend shows graceful error message
  - "I'm taking an extra moment to think deeply..."
  - Auto-retry (max 3 attempts)
  - If all retries fail, offer manual retry button

**Scenario 2: Invalid Student Input**
- Trigger: Student sends very short/irrelevant message
- Handling:
  - Agent responds with gentle probing
  - "I'd love to hear more about that. Can you tell me..."
  - Maintains empathetic tone (no error message to student)

**Scenario 3: Intelligence Type Missing**
- Trigger: Intelligence type file not found
- Handling:
  - Backend logs error
  - Falls back to generic coaching intelligence
  - Flags session for review
  - Continues session (no user-facing error)

**Scenario 4: Session Interrupted**
- Trigger: User closes tab mid-session
- Handling:
  - Session saved to database (persistent)
  - On return, offer to resume: "Welcome back! Continue where you left off?"
  - Resume from exact message point

**Scenario 5: Concurrent Sessions**
- Trigger: User tries to start new session while one is in progress
- Handling:
  - Show modal: "You have an active session. Resume or start fresh?"
  - Option 1: Resume existing
  - Option 2: Archive existing, start new

### 7.2 Data Validation

**Student Input Validation:**
- Min length: 3 characters (prevents accidental sends)
- Max length: 2000 characters (prevents abuse)
- XSS protection: Sanitize all user input
- Profanity filter: Flag (but don't block) - coach should address

**Intelligence Output Validation:**
- Max response length: 500 words (prevents rambling)
- Coherence check: If AI generates nonsense, auto-retry
- Hallucination check: If AI references fake data, auto-retry
- Tone check: If AI is harsh/negative, auto-retry

---

## 8. ANALYTICS & MONITORING

### 8.1 Session-Level Metrics

Track for every session:
- Total duration (target: 60-80 min)
- Messages sent (agent vs student ratio)
- Intelligence activations (all 36 types)
- Average response time (target: < 3s)
- Error rate (target: < 1%)
- Retry rate (target: < 5%)
- Completion rate (target: > 95%)

### 8.2 Agent-Level Metrics

Track for each agent:
- Activation count
- Average session duration
- Intelligence coverage (used vs available)
- Handoff success rate
- Student satisfaction indicators (implicit)

### 8.3 Intelligence-Level Metrics

Track for each intelligence type:
- Usage frequency
- Average processing time
- Confidence scores
- Retry rate
- Cost per activation

---

## 9. FUTURE ENHANCEMENTS (Post-v26.0)

### 9.1 Week 2-89 Execution
- Extend Execution Agent to handle all 89 weeks
- Weekly check-ins, progress tracking, adjustments

### 9.2 Multi-Student Support
- Handle multiple students concurrently
- Student switching in UI
- Comparative analytics

### 9.3 Agent Personalization
- Adapt agent behavior based on student learning style
- Customize communication style per student preferences

### 9.4 Advanced Analytics
- Predictive success metrics
- Intervention recommendations
- A/B testing of intelligence variations

---

**Status:** ✅ Product Specification Complete - Ready for Tech Spec
**Next:** MULTIAGENTS_V26_TECH_SPEC.md
