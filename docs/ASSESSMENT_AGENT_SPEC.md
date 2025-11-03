# Assessment Management Agent Specification

**Version:** v1.0 (Reverse Engineered)
**Last Updated:** 2025-10-28
**Status:** Partially Implemented
**Code Location:** `services/agent-framework/src/agents/AssessmentAgent.ts`

---

## Overview

The Assessment Agent provides **autonomous 4-phase diagnostic assessment** for new students, executing 27 assessment layers to establish baseline profile, identify gaps, and create strategic roadmap.

### Key Characteristics

- **Event-Driven**: Auto-triggers on `student_onboarded` event
- **4 Phases**: Discovery → Narrative → Strategy → Time (40-50 minutes)
- **27 Layers**: Comprehensive assessment across psycho-behavioral, EQ, rubric, and time dimensions
- **Synthesis Moment**: Identity creation at Phase 2 (minute 12:53 - "identity fusion from chaos")
- **Real EQ Intelligence**: Uses Jenny's authentic coaching patterns from 7 iMessage files

---

## Architecture

### Assessment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              student_onboarded Event (EventBus)                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AssessmentAgent.start()                       │
│  - Get student context (StudentContextRepository)                │
│  - Get coach intelligence (CoachIntelligenceRepository)          │
│  - Initialize JennyDuanCoach with EQ profile                     │
│  - Create assessment_session record                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Execute 4 Phases (27 Layers Total)                  │
│                                                                   │
│  Phase 1: Discovery (Layers 1-7, ~10 min)                        │
│  - Rapport building + diagnostic data gathering                  │
│  - Personality, capacity, interests assessment                   │
│  - Family dynamics + constraints identification                  │
│                                                                   │
│  Phase 2: Narrative (Layers 8-15, ~12 min)                       │
│  - Identity fusion engineering (minute 12:53 synthesis)          │
│  - Story extraction + unique positioning                         │
│  - Strategic target identification (hidden)                      │
│                                                                   │
│  Phase 3: Strategy (Layers 16-22, ~10 min)                       │
│  - Gap analysis (current vs target rubric scores)                │
│  - Priority areas identification                                 │
│  - High-ROI opportunities flagging                               │
│  - Tactic recommendations based on barriers                      │
│                                                                   │
│  Phase 4: Time (Layers 23-27, ~8 min)                            │
│  - Time architecture (weeks remaining calculation)               │
│  - Timeline creation + milestone identification                  │
│  - Next steps definition                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Synthesis & Storage                           │
│  - Create IdentitySynthesis (fusion, narrative, positioning)     │
│  - Recommend tactics for identified barriers                     │
│  - Update assessment_session record with results                 │
│  - Update student context (identity_score, rubric_scores)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                assessment_completed Event                        │
│  → Triggers GamePlanAgent to create strategic roadmap            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4-Phase Assessment Structure

### Phase 1: Discovery (Layers 1-7, ~10 minutes)

**Objective**: Build rapport + gather initial diagnostic data

**Real Patterns** (from `jenny_eq_extract_imsg_1.json`):
- Warmth + enthusiasm in first contact
- Zero judgment on apologies
- Constraint reframing through identity

**Layers Executed**:
1. Personality type assessment (quiet/outgoing, careful/spontaneous)
2. Capacity level determination (high/moderate/low energy)
3. Social style identification (quiet leadership, collaborative, etc.)
4. Execution style diagnosis (procrastinator, paralysis, high-functioning, etc.)
5. Primary passions discovery (coding, film, game_dev, etc.)
6. Family dynamics assessment (parent anxiety, cultural factors, support level)
7. Current academic standing (GPA, test scores, rigor level)

**Success Criteria**:
- Student feels heard and understood
- Coach has diagnostic hypothesis
- Initial passion areas identified
- Parent dynamics understood

**Questions Used**:
```typescript
// Real questions from Jenny's coaching sessions
[
  "Tell me a bit about yourself - what do you love doing?",
  "What lights you up? When do you feel most energized?",
  "How would you describe your approach to work? Do you jump in or plan carefully?",
  "What's your relationship with your parents like when it comes to college planning?",
  "Are there any constraints or worries that keep you up at night?"
]
```

### Phase 2: Narrative (Layers 8-15, ~12 minutes)

**Objective**: Identity fusion + story extraction

**Synthesis Moment** (Minute 12:53): Identity creation from scattered interests

**Real Patterns** (from `jenny_eq_extract_imsg_2.json`, `jenny_eq_extract_imsg_3.json`):
- Celebration calibration (amplify wins)
- Identity expansion ("You're not just X, you're X×Y")
- Specificity enforcement (no generic labels)

**Layers Executed**:
8. Interest clustering (find patterns across passions)
9. Identity fusion engineering (e.g., "Film × CS → Digital Storyteller")
10. Narrative thread extraction (passion → impact → career)
11. Unique angles identification (quiet leadership, cultural perspective, etc.)
12. Story moments discovery (transformation points)
13. Positioning strategy (what makes student stand out)
14. Hidden strategic target (e.g., Stanford CS - not revealed to student yet)
15. Confidence trajectory mapping (building → wins → crystallization)

**Synthesis Output**:
```typescript
interface IdentitySynthesis {
  identity_fusion: string;           // e.g., "Film × CS → Digital Storyteller"
  narrative_thread: string;          // e.g., "game_dev → storytelling → film director"
  unique_positioning: string[];      // e.g., ["Quiet leadership", "Iranian perspective in tech"]
  strategic_target: string;          // e.g., "Stanford" (hidden from student)
  confidence_trajectory: string;     // e.g., "Building foundation → Quick wins → Identity crystallization"
}
```

**Success Criteria**:
- Clear identity fusion articulated
- Narrative thread identified
- Student sees themselves as unique (not generic)
- Strategic target determined (coach knows, student doesn't)

### Phase 3: Strategy (Layers 16-22, ~10 minutes)

**Objective**: Gap analysis + prioritization

**Real Patterns** (from `jenny_eq_extract_imsg_4.json`, `jenny_eq_extract_imsg_5.json`):
- Strategic thinking (opportunity filtering based on ROI)
- Gentle push to action (without overwhelming)
- Question deflection (ask questions instead of direct answers)

**Layers Executed**:
16. Rubric scoring (Academics, Leadership, Service, Artifacts, Recognition)
17. Gap identification (current vs target = 25)
18. Priority areas ranking (which gaps to address first)
19. High-ROI opportunities flagging (NCWIT, game jams, hackathons)
20. Barrier identification (time-crisis, imposter-syndrome, procrastination, etc.)
21. Tactic recommendation (from Knowledge Moat based on barriers)
22. Resource mapping (what student already has vs needs)

**Gap Analysis Output**:
```typescript
interface GapAnalysis {
  current_total: number;             // e.g., 15
  target_total: number;              // Always 25
  gap: number;                       // e.g., 10
  priority_areas: string[];          // e.g., ["Recognition (awards)", "Artifacts/portfolio"]
  recommended_tactics: Tactic[];     // From Knowledge Moat search
}
```

**Barrier → Tactic Mapping**:
```typescript
// Barriers identified during assessment
low-recognition → NCWIT Application Strategy
low-leadership → 168-Hour Framework
low-productivity → Game Jam Blitz
time-crisis → Constraint Reframing
imposter-syndrome → Permission Field
identity-crisis → Identity Fusion
```

**Success Criteria**:
- Rubric scores established (baseline)
- Top 3 priority areas identified
- High-ROI opportunities flagged
- 3-5 tactics recommended with rationale

### Phase 4: Time (Layers 23-27, ~8 minutes)

**Objective**: Timeline + next steps

**Real Patterns** (from `jenny_eq_extract_imsg_6.json`, `jenny_eq_extract_imsg_7.json`):
- Forward momentum (future-pacing)
- Rejection sandwich (celebrate → critique → celebrate)
- We-language ("Let's do X" not "You should do X")

**Layers Executed**:
23. Time architecture calculation (weeks remaining until apps)
24. Milestone identification (key deadlines, application windows)
25. Timeline creation (when to tackle each priority area)
26. Next steps definition (specific actions for next 1-2 weeks)
27. Commitment establishment (student commits to immediate actions)

**Time Architecture**:
```typescript
interface TimeArchitecture {
  class_year: string;                // e.g., "junior"
  current_week: number;              // e.g., 1 (week of school year)
  weeks_remaining: number;           // e.g., 52 for juniors
  high_roi_opportunities: string[];  // e.g., ["NCWIT Aspirations", "Global Game Jam"]
  key_milestones: Milestone[];       // Application deadlines, test dates
}
```

**Success Criteria**:
- Clear timeline established
- Next 1-2 week actions defined
- Student commits to immediate next steps
- Assessment transitions to execution (GamePlanAgent triggered)

---

## Assessment Result Structure

```typescript
interface AssessmentResult {
  // Diagnostic (Phase 1)
  diagnostic: {
    personality_type: string;        // e.g., "quiet-careful"
    capacity_level: string;          // e.g., "moderate"
    social_style: string;            // e.g., "quiet"
    execution_style: string;         // e.g., "procrastinator"
  };

  // EQ Profile (Phase 1)
  eq_profile: {
    confidence_level: number;        // 0-1
    vulnerability_level: number;     // 0-1 (always 1 for week 1)
    parent_anxiety: number;          // 0-1
  };

  // Rubric Scores (Phase 3)
  rubric_scores: {
    academics: number;               // 0-5
    leadership: number;              // 0-5
    service: number;                 // 0-5
    artifacts: number;               // 0-5
    recognition: number;             // 0-5
    total: number;                   // 0-25
  };

  // Time Architecture (Phase 4)
  time_architecture: {
    class_year: string;
    current_week: number;
    weeks_remaining: number;
    high_roi_opportunities: string[];
  };

  // Gap Analysis (Phase 3)
  gap_analysis: {
    current_total: number;
    target_total: number;            // Always 25
    gap: number;
    priority_areas: string[];
    recommended_tactics: Tactic[];
  };

  // Identity Score (Phase 2)
  identity_score: number;            // 0-1 (identity clarity)

  // Strategic Insights (All phases)
  strategic_insights: string;
}
```

---

## Integration Points

### 1. Event-Driven Trigger

```typescript
// EventBus emits student_onboarded
eventBus.emit({
  event_type: 'student_onboarded',
  student_id: 'huda-2025',
  coach_id: 'jenny',
  payload: { intake_completed: true }
});

// AssessmentAgent subscribes
this.eventBus.on('student_onboarded', (event) =>
  this.handleStudentOnboarded(event)
);
```

### 2. Database Schema

```sql
-- assessment_sessions table
CREATE TABLE assessment_sessions (
  session_id UUID PRIMARY KEY,
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_minutes INTEGER,

  -- Phase outputs
  diagnostic_result JSONB,
  eq_profile JSONB,
  rubric_scores JSONB,
  time_architecture JSONB,
  gap_analysis JSONB,

  -- Metadata
  layers_executed INTEGER DEFAULT 0,
  synthesis_moment_timestamp TIMESTAMP,
  assessment_complete BOOLEAN DEFAULT FALSE,
  gameplan_triggered BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. v17.0 Orchestration Integration

Assessment Agent can be invoked through v17.0 orchestration pipeline:

```typescript
// Route 'assessment' intent → AssessmentAgent
const intent = await intentRouter.classifyIntent(query, context);
// → { intent_slug: 'assessment', confidence: 0.95 }

const strategyNode = await intentRouter.routeToStrategyNode(intent);
// → 'initial_assessment'

// Execute assessment through v17.0 pipeline
const result = await strategyOrchestrator.execute({
  student_query: "Help me get started",
  student_id: "huda-2025",
  coach_id: "jenny"
});
```

---

## Current Implementation Status

### ✅ Implemented

- Event-driven architecture (EventBus integration)
- 27-layer assessment execution
- 4-phase structure (Discovery, Narrative, Strategy, Time)
- JennyDuanCoach intelligence integration
- Synthesis moment (identity fusion)
- Tactic recommendation based on barriers
- Database persistence (assessment_sessions table)
- Assessment → GamePlan transition (via events)

### ⚠️ Partially Implemented

- AssessmentPlanner (exists but needs full EQ intelligence integration)
- Phase-specific question generation (uses placeholders)
- Real-time progress tracking (exists but minimal)
- Session continuity across multiple calls (designed for single-shot)

### ❌ Not Yet Implemented

- Interactive multi-turn assessment (current: single autonomous execution)
- Student-driven phase progression (student can't control pacing)
- Phase resumption (can't pause and resume later)
- Assessment reporting UI (results exist but not visualized)
- Reassessment workflow (for existing students)

---

## Future Enhancements

### 1. Interactive Multi-Turn Assessment

**Current**: Single autonomous 40-50 minute execution
**Future**: Conversational assessment across multiple sessions

```typescript
// Enable phase-by-phase progression
await assessmentAgent.executePhase(1, { student_id, coach_id });
// → User sees Phase 1 questions, can respond naturally

await assessmentAgent.executePhase(2, { student_id, coach_id, phase1_data });
// → System uses Phase 1 context to personalize Phase 2
```

### 2. Student-Controlled Pacing

**Current**: Fixed 40-50 minute duration
**Future**: Student can pause, skip, or deep-dive into phases

### 3. Reassessment Workflow

**Current**: Only for new students (student_onboarded event)
**Future**: Periodic reassessment (quarterly, after major milestones)

### 4. Assessment Reporting UI

**Current**: Results stored in database, not visualized
**Future**: Visual dashboard showing:
- Rubric score radar chart
- Identity fusion visualization
- Gap analysis with progress tracking
- Recommended tactics with completion status

---

## References

**Code Locations**:
- Agent: `services/agent-framework/src/agents/AssessmentAgent.ts`
- Planner: `services/agent-framework/src/primitives/AssessmentPlanner.ts`
- Types: `services/agent-framework/src/types/CoachIntelligence.ts`

**Related Specs**:
- Foundation Agents Architecture: `docs/FOUNDATION_AGENTS_ARCHITECTURE.md`
- Master Tech Spec: `docs/MASTER_PROD_TECH_SPEC.md`
- Backlog: `docs/BACKLOG_CRITICAL_ITEMS.md`

**Created**: 2025-10-28 (Reverse engineered from production code)
**Author**: Engineering Team
**Status**: Core assessment flow production-ready, interactive features pending
