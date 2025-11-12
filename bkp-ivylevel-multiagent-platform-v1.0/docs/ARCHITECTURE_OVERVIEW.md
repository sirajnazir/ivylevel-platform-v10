# IvyLevel MultiAgent Platform - Architecture Overview

**Version:** v1.0 (Extract from v36.2)
**Created:** 2025-11-07
**Purpose:** Visual and conceptual overview of system architecture

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STUDENT INTERFACE                                  │
│                    (React 18.3 + Vite + TypeScript)                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │Assessment│ GamePlan │  Prep    │ Sessions │  Apps    │Growth Journey│  │
│  │   Tab    │   Tab    │  (89wk)  │   Tab    │   Tab    │   (93 events)│  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │ HTTPS/WebSocket
                             ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LANGGRAPH ORCHESTRATOR                              │
│                      (State-First Multi-Agent Router)                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  Intent Classification → Agent Selection → State Management           │ │
│  │  ├─ CAT-1: Direct SQL (v14 temporal resolvers)                       │ │
│  │  ├─ CAT-2: Single-Agent Response                                     │ │
│  │  └─ CAT-3: Multi-Agent Orchestration (A2A handover)                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONVERSATION INTELLIGENCE                            │
│                         (v36.0 Universal System)                            │
│  ┌───────────────┬───────────────┬───────────────┬──────────────────────┐ │
│  │Conversation   │Canonical Field│Question       │Frustration           │ │
│  │Memory         │Mapper         │Deduplication  │Detector              │ │
│  │(State Track)  │(Field Norm)   │(Semantic 85%) │(Signal Monitor)      │ │
│  └───────────────┴───────────────┴───────────────┴──────────────────────┘ │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         7 SPECIALIST AGENTS                                 │
│                    (BaseAgentWithIntelligence)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. ASSESSMENT AGENT (v36.2)                                         │   │
│  │    - 105-Fact Tracking (5 tiers)                                    │   │
│  │    - Jenny's Questioning DNA (105 mappings)                         │   │
│  │    - 6 Intelligence Types (TYPE-080 to TYPE-086)                    │   │
│  │    - Quality Score: 8.5+ minimum                                    │   │
│  │    - Handover: 95+ facts required                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. GAMEPLAN AGENT                                                   │   │
│  │    - 93-Week Strategic Roadmap                                      │   │
│  │    - 6 Intelligence Types (TYPE-001 to TYPE-007)                    │   │
│  │    - Quarterly Adaptation                                           │   │
│  │    - Delegates to: Awards, ECs, Programs, Scholarships              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. EXECUTION AGENT                                                  │   │
│  │    - Weekly Task Decomposition                                      │   │
│  │    - 15 Intelligence Types (TYPE-051 to TYPE-063)                   │   │
│  │    - Progress Velocity Tracking                                     │   │
│  │    - Blocking Detection                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────────┐   │
│  │4. AWARDS     │5. SUMMER     │6. SCHOLARSHIPS│7. EXTRACURRICULARS  │   │
│  │   (7 types)  │   PROGRAMS   │   (3 types)   │   (6 types)         │   │
│  │              │   (3 types)  │               │                      │   │
│  └──────────────┴──────────────┴──────────────┴──────────────────────┘   │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INTELLIGENCE TYPES REGISTRY                            │
│                        (46 Atomic Logic Units)                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Assessment (6) │ GamePlan (6) │ Execution (15) │ Specialists (22)   │ │
│  │ TYPE-080 to    │ TYPE-001 to  │ TYPE-051 to    │ Awards (7)         │ │
│  │ TYPE-086       │ TYPE-007     │ TYPE-063       │ ECs (6)            │ │
│  │                │              │                │ Programs (3)       │ │
│  │                │              │                │ Scholarships (3)   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KNOWLEDGE BASE & DATA                               │
│  ┌──────────────────┬──────────────────┬──────────────────────────────┐   │
│  │ KB Intel Chips   │ EQ Layers (27)   │ Raw Coaching Data           │   │
│  │ (70+ chips)      │ Communication    │ (93+ weeks Jenny sessions)  │   │
│  │ Weekly batches   │ Patterns         │ Transcripts + Analysis      │   │
│  └──────────────────┴──────────────────┴──────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          POSTGRESQL DATABASE                                │
│                         (Zero-Hallucination Store)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Tables:                                                               │ │
│  │ • multiagent_sessions (conversation_memory JSONB)                     │ │
│  │ • kb_items (multi-category facts)                                     │ │
│  │ • canonical_facts (fact-first foundation)                             │ │
│  │ • agent_handover_packages (A2A communication)                         │ │
│  │ • timeline_events (93-week journey)                                   │ │
│  │ • weekly_vitals (89 weeks execution)                                  │ │
│  │ • student_profiles (demographics + academics)                         │ │
│  │ • ec_portfolio (10 activities per student)                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Architecture

### Flow 1: Simple Query (CAT-1)

```
Student: "What's my GPA?"
    ↓
LangGraph Intent Classification
    ↓
CAT-1: Direct SQL Query
    ↓
Temporal Fact Resolver: current_gpa
    ↓
SQL: SELECT gpa_unweighted FROM student_profiles WHERE student_id = $1
    ↓
Response: "Your unweighted GPA is 3.8"
```

**No agent involved. Pure SQL. Zero hallucination.**

---

### Flow 2: Single-Agent Response (CAT-2)

```
Student: "I got 1450 on my SAT. Is that good enough for Ivy League?"
    ↓
LangGraph Intent Classification
    ↓
CAT-2: Single-Agent (Assessment)
    ↓
Conversation Intelligence Check
    ├─ Has this been asked? (QuestionDeduplicationEngine: No)
    ├─ Field already collected? (CanonicalFieldMapper: sat_total → collected)
    └─ Frustration level? (FrustrationDetector: 0%)
    ↓
Assessment Agent Invocation
    ├─ Load Intelligence Types: TYPE-081 (Ivy Score Calculation)
    ├─ Query Facts: student_profile + target_colleges
    └─ Generate Response with TYPE-081 logic
    ↓
Conversation Memory Update
    ├─ Record turn
    ├─ Mark field: sat_total = collected
    └─ Update frustration: 0%
    ↓
Response: "1450 is competitive for mid-tier Ivies like Cornell (STEM).
           For Harvard/Stanford, aim for 1500+. Let's focus on strengthening
           your spike in computer science to compensate."
```

---

### Flow 3: Multi-Agent Orchestration (CAT-3)

```
Student: "Help me plan my extracurriculars for junior year"
    ↓
LangGraph Intent Classification
    ↓
CAT-3: Multi-Agent Orchestration
    ↓
Primary Agent: GamePlan
    ├─ Invoke TYPE-001: GamePlan Synthesis
    ├─ Realize need for specialist input
    └─ Prepare A2A Handover Package
    ↓
A2A Handover → Extracurriculars Agent
    ├─ HandoverValidator checks 20 quality gates
    ├─ Payload includes: student_profile, current_ecs, available_time
    └─ Fact contracts validated
    ↓
Extracurriculars Agent Processing
    ├─ TYPE-013: EC Portfolio Optimization
    ├─ TYPE-014: Narrative Synthesis
    ├─ TYPE-015: Impact Engineering
    ├─ TYPE-016: Time Mathematics
    └─ Generate specialist recommendations
    ↓
A2A Handover → GamePlan Agent
    ├─ Receive specialist analysis
    ├─ Integrate into 93-week roadmap
    └─ Apply TYPE-003: Timeline Architecture
    ↓
GamePlan Agent Synthesis
    ├─ Combine specialist insights
    ├─ Apply quarterly adaptation (TYPE-006)
    └─ Generate comprehensive plan
    ↓
Response: "Based on your profile, here's your junior year EC strategy:
           Q1: Launch computer science club (leadership spike)
           Q2: Organize school hackathon (scale impact)
           Q3: Secure CS mentorship + publish blog series
           Q4: Competition season (USACO Gold target)

           This builds your 'Tech Community Builder' narrative while
           maintaining your 3.95 GPA. Estimated time: 12hrs/week."
```

---

## Conversation Intelligence Flow (v36.0)

### Scenario: Preventing Infinite Assessment Loop

```
Turn 1:
Student: "I'm a junior"
    ↓
ConversationMemory.addTurn()
    ├─ Extract intent: "grade_level_disclosure"
    ├─ Extract field: "grade" → 11
    ├─ Store in collected_fields: { grade: true }
    └─ Frustration level: 0%
    ↓
CanonicalFieldMapper.normalize("grade") → "current_grade"
    └─ Mark canonical field as collected
    ↓
Agent generates next question: "What's your GPA?"

───────────────────────────────────────────────────────

Turn 2:
Student: "3.8 unweighted"
    ↓
ConversationMemory.addTurn()
    ├─ Extract field: "gpa" → 3.8
    ├─ Store in collected_fields: { grade: true, gpa: true }
    └─ Frustration level: 0%
    ↓
CanonicalFieldMapper.normalize("gpa") → "current_gpa"
    └─ Mark canonical field as collected
    ↓
Agent wants to generate: "What's your grade point average?"
    ↓
QuestionDeduplicationEngine.isDuplicate()
    ├─ Compare to previous questions
    ├─ Semantic similarity: 87% (threshold: 85%)
    ├─ Check collected_fields: "current_gpa" already collected
    └─ BLOCKED: Duplicate question detected
    ↓
Agent generates alternative: "Tell me about your extracurriculars"

───────────────────────────────────────────────────────

Turn 3:
Student: "I'm in robotics club"
    ↓
ConversationMemory.addTurn()
    ├─ Extract field: "extracurriculars" → ["robotics"]
    ├─ Store in collected_fields
    └─ Frustration level: 0%
    ↓
Agent continues with: "What leadership role do you have?"

───────────────────────────────────────────────────────

Hypothetical Bad Turn (PREVENTED):
Agent tries: "What's your current grade level?"
    ↓
QuestionDeduplicationEngine checks
    ├─ Semantic similarity to Turn 1: 92%
    ├─ collected_fields already has "grade"
    └─ BLOCKED: Would cause frustration
    ↓
FrustrationDetector would have flagged:
    ├─ Repetitive question pattern
    ├─ Would increment frustration: 0% → 15%
    └─ Alert: Student may become frustrated
```

**Result: Intelligent conversation flow, never repeats, always moves forward.**

---

## Intelligence Type Architecture

### How Intelligence Types Work

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE TYPE                            │
│                  (Atomic Logic Unit)                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ TYPE-082: Gap Analysis Engine                             │ │
│  │                                                            │ │
│  │ Purpose: Identify and quantify student gaps vs target     │ │
│  │                                                            │ │
│  │ Inputs:                                                    │ │
│  │   - student_profile (academics, test scores, ECs)         │ │
│  │   - target_college_tier (Ivy+, Top 20, etc.)             │ │
│  │   - current_timeline (grade, months to application)       │ │
│  │                                                            │ │
│  │ Processing Logic:                                          │ │
│  │   1. Load target benchmarks from kb_items                 │ │
│  │   2. Compare student across 8 dimensions:                 │ │
│  │      - Academic rigor                                      │ │
│  │      - Test scores                                         │ │
│  │      - EC depth                                            │ │
│  │      - Leadership                                          │ │
│  │      - Awards/recognition                                  │ │
│  │      - Demonstrated interest                               │ │
│  │      - Narrative coherence                                 │ │
│  │      - Differentiation                                     │ │
│  │   3. Calculate gap scores (0-100)                         │ │
│  │   4. Prioritize by:                                        │ │
│  │      - Impact potential                                    │ │
│  │      - Time to close                                       │ │
│  │      - Feasibility given context                           │ │
│  │                                                            │ │
│  │ Outputs:                                                   │ │
│  │   {                                                        │ │
│  │     gaps: [                                                │ │
│  │       {                                                    │ │
│  │         dimension: "test_scores",                          │ │
│  │         current_score: 1450,                               │ │
│  │         target_score: 1520,                                │ │
│  │         gap_magnitude: 70,                                 │ │
│  │         priority: "HIGH",                                  │ │
│  │         time_to_close: "3-6 months",                       │ │
│  │         action_items: [...]                                │ │
│  │       },                                                   │ │
│  │       ...                                                  │ │
│  │     ],                                                     │ │
│  │     overall_readiness: 73,                                 │ │
│  │     critical_gaps: 2,                                      │ │
│  │     addressable_gaps: 5                                    │ │
│  │   }                                                        │ │
│  │                                                            │ │
│  │ Used By:                                                   │ │
│  │   - Assessment Agent (gap identification)                 │ │
│  │   - GamePlan Agent (strategy prioritization)              │ │
│  │   - Execution Agent (progress tracking)                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Intelligence Type Registry Pattern

```typescript
// File: src/intelligence/IntelligenceRegistry.ts

export class IntelligenceRegistry {
  private static types = new Map<string, BaseIntelligenceType>();

  static register(type: BaseIntelligenceType) {
    this.types.set(type.id, type);
  }

  static get(id: string): BaseIntelligenceType {
    return this.types.get(id);
  }

  static getForAgent(agentId: string): BaseIntelligenceType[] {
    return Array.from(this.types.values())
      .filter(type => type.applicableAgents.includes(agentId));
  }
}

// Agents load their types
export class AssessmentAgent extends BaseAgentWithIntelligence {
  async initialize() {
    this.intelligenceTypes = [
      IntelligenceRegistry.get('TYPE-080'),
      IntelligenceRegistry.get('TYPE-081'),
      IntelligenceRegistry.get('TYPE-082'),
      IntelligenceRegistry.get('TYPE-083'),
      IntelligenceRegistry.get('TYPE-084'),
      IntelligenceRegistry.get('TYPE-085'),
      IntelligenceRegistry.get('TYPE-086'),
    ];
  }
}
```

---

## A2A (Agent-to-Agent) Handover Protocol

### Handover Package Structure

```
┌─────────────────────────────────────────────────────────────────┐
│              AGENT HANDOVER PACKAGE                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Metadata:                                                  │ │
│  │   from_agent: "assessment"                                 │ │
│  │   to_agent: "gameplan"                                     │ │
│  │   session_id: "sess_abc123"                                │ │
│  │   student_id: "huda-2025"                                  │ │
│  │   handover_reason: "assessment_complete"                   │ │
│  │   timestamp: "2024-11-06T10:30:00Z"                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Collected Facts: (95+ required for quality handover)      │ │
│  │   {                                                        │ │
│  │     profile: {                                             │ │
│  │       grade: 11,                                           │ │
│  │       gpa: 3.8,                                            │ │
│  │       sat_total: 1450,                                     │ │
│  │       high_school: "Lincoln High",                         │ │
│  │       intended_major: "Computer Science",                  │ │
│  │       ...                                                  │ │
│  │     },                                                     │ │
│  │     extracurriculars: [...],                               │ │
│  │     context: {...},                                        │ │
│  │     gaps: {...},                                           │ │
│  │     psychology: {...}                                      │ │
│  │   }                                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Intelligence Analysis:                                     │ │
│  │   {                                                        │ │
│  │     ivy_score: 73,                                         │ │
│  │     gap_analysis: {                                        │ │
│  │       critical_gaps: [                                     │ │
│  │         { dimension: "test_scores", priority: "HIGH" },    │ │
│  │         { dimension: "awards", priority: "MEDIUM" }        │ │
│  │       ]                                                    │ │
│  │     },                                                     │ │
│  │     potential_indicators: [                                │ │
│  │       "strong_academic_foundation",                        │ │
│  │       "emerging_leadership",                               │ │
│  │       "technical_depth"                                    │ │
│  │     ]                                                      │ │
│  │   }                                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Quality Metrics:                                           │ │
│  │   fact_count: 97,                                          │ │
│  │   quality_score: 8.7,                                      │ │
│  │   conversation_turns: 47,                                  │ │
│  │   completion_percentage: 92%,                              │ │
│  │   tier_completions: {                                      │ │
│  │     profile: 100%,                                         │ │
│  │     activities: 90%,                                       │ │
│  │     context: 85%,                                          │ │
│  │     gaps: 95%,                                             │ │
│  │     psychology: 90%                                        │ │
│  │   }                                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ HandoverValidator Results: (30 quality gates)             │ │
│  │   ✅ Minimum facts: 97 (required: 95)                     │ │
│  │   ✅ Quality score: 8.7 (required: 8.5)                   │ │
│  │   ✅ Academic depth: Complete                              │ │
│  │   ✅ Activity portfolio: Comprehensive                     │ │
│  │   ✅ Gap identification: Thorough                          │ │
│  │   ✅ Context gathered: Sufficient                          │ │
│  │   ✅ Psychology assessed: Deep                             │ │
│  │   ✅ Fact contracts: All satisfied                         │ │
│  │   ⚠️  Leadership data: Minimal (non-blocking)             │ │
│  │   ✅ Differentiation: Clear spike identified               │ │
│  │   VERDICT: APPROVED FOR HANDOVER                           │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### HandoverValidator Workflow

```
Assessment Agent completes conversation
    ↓
Prepare handover package
    ↓
HandoverValidator.validate(package)
    ├─ Check 1: Fact count >= 95?
    ├─ Check 2: Quality score >= 8.5?
    ├─ Check 3: All tiers complete?
    ├─ Check 4: Academic depth sufficient?
    ├─ Check 5: Activity portfolio comprehensive?
    ├─ Check 6-30: [All quality gates]
    └─ Final verdict: APPROVED | REJECTED | CONDITIONAL
    ↓
If APPROVED:
    ├─ Store package in agent_handover_packages table
    ├─ Update session state
    └─ Trigger GamePlan Agent
    ↓
If REJECTED:
    ├─ Return to Assessment Agent
    ├─ Provide specific gaps to address
    └─ Continue conversation
    ↓
If CONDITIONAL:
    ├─ Document warnings
    ├─ Proceed with caution flag
    └─ GamePlan Agent aware of limitations
```

---

## Data Pipeline Architecture

### Phase 1: Raw Data Collection (Completed)

```
Jenny's Coaching Sessions (93+ weeks)
    ├─ Video recordings
    ├─ Transcripts (manual + AI)
    ├─ iMessage conversations
    ├─ Email exchanges
    └─ Session notes
    ↓
Stored in: data/raw-coaching-data/jenny-huda/
```

### Phase 2: Intelligence Extraction (Completed)

```
Raw Sessions → Intelligence Chip Extraction
    ├─ Strategic patterns
    ├─ Decision trees
    ├─ Formulas and heuristics
    ├─ Communication templates
    └─ EQ patterns
    ↓
Stored in: data/kb_intel_chips/chips/
    ├─ w001_intel_chips_batch.json
    ├─ w002_intel_chips_batch.json
    └─ ... (93 weeks)
```

### Phase 3: EQ Layer Analysis (Completed)

```
Communication Patterns → EQ Layer Extraction
    ├─ Linguistic patterns (27 layers)
    ├─ Emotional intelligence markers
    ├─ Crisis response patterns
    ├─ Celebration patterns
    └─ Motivation techniques
    ↓
Stored in: data/eq-layers/eq/
    ├─ sessions/ (per-session EQ)
    └─ imsg/ (iMessage patterns)
```

### Phase 4: Intelligence Type Codification (Completed)

```
Intelligence Chips → Intelligence Types
    ├─ Atomic logic units
    ├─ Reusable patterns
    ├─ Clear inputs/outputs
    └─ Testable in isolation
    ↓
Stored in: src/intelligence/types/
    ├─ TYPE-001 to TYPE-086
    └─ IntelligenceRegistry.ts
```

### Phase 5: Agent Integration (Completed)

```
Intelligence Types → Agent Capabilities
    ├─ BaseAgentWithIntelligence
    ├─ 7 specialist agents
    ├─ Intelligence type loading
    └─ Conversation intelligence
    ↓
Stored in: src/agents/v18/
```

### Phase 6: Production Deployment (v36.2)

```
Complete System → Live Platform
    ├─ LangGraph orchestration
    ├─ Zero-hallucination enforcement
    ├─ Conversation intelligence
    ├─ Multi-turn state management
    └─ Quality-gated handovers
```

---

## Database Schema Overview

### Core Tables

```sql
-- Conversation state
CREATE TABLE multiagent_sessions (
  id UUID PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  coach_id VARCHAR(50) NOT NULL,
  active_agent VARCHAR(50) NOT NULL,
  conversation_memory JSONB DEFAULT '{}'::jsonb, -- v36.0
  state_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge base facts
CREATE TABLE kb_items (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  category VARCHAR(100)[], -- Multi-category support (v28+)
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  source_ref VARCHAR(255), -- Source tracking (v28+)
  created_at TIMESTAMP DEFAULT NOW()
);

-- A2A handover packages
CREATE TABLE agent_handover_packages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES multiagent_sessions(id),
  from_agent VARCHAR(50) NOT NULL,
  to_agent VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  quality_metrics JSONB,
  validator_results JSONB, -- v29.0
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Zero-hallucination fact store
CREATE TABLE canonical_facts (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  fact_key VARCHAR(100) NOT NULL,
  fact_value TEXT NOT NULL,
  valid_from DATE,
  valid_to DATE,
  source VARCHAR(100),
  confidence_score DECIMAL(3,2),
  metadata JSONB
);

-- Timeline events (93-week journey)
CREATE TABLE timeline_events (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  week_number INTEGER NOT NULL,
  event_type VARCHAR(100),
  title TEXT NOT NULL,
  description TEXT,
  impact_score INTEGER,
  growth_indicators TEXT[],
  metadata JSONB,
  event_date DATE
);

-- Weekly execution vitals
CREATE TABLE weekly_vitals (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  week_number INTEGER NOT NULL,
  week_title TEXT,
  action_items TEXT[],
  execution_status VARCHAR(50),
  completion_percentage INTEGER,
  metadata JSONB
);

-- Student profiles
CREATE TABLE student_profiles (
  student_id VARCHAR(50) PRIMARY KEY,
  first_name VARCHAR(100),
  grade INTEGER,
  gpa_unweighted DECIMAL(3,2),
  gpa_weighted DECIMAL(3,2),
  sat_total INTEGER,
  high_school VARCHAR(255),
  intended_major VARCHAR(255),
  academic_vitals JSONB,
  metadata JSONB
);

-- Extracurricular portfolio
CREATE TABLE ec_portfolio (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  leadership_role VARCHAR(255),
  hours_per_week DECIMAL(4,1),
  weeks_per_year INTEGER,
  achievements TEXT[],
  impact_description TEXT,
  metadata JSONB
);
```

---

## Technology Stack Summary

### Backend (Node.js)

- **Runtime:** Node.js 22.16.0
- **Framework:** Express.js
- **Language:** TypeScript 5.x
- **AI/ML:** LangGraph, LangChain, OpenAI GPT-4o
- **Database:** PostgreSQL 14+ via `pg`
- **Authentication:** JWT (jsonwebtoken)

### Frontend (React)

- **Framework:** React 18.3.1
- **Language:** TypeScript
- **Build Tool:** Vite
- **State Management:** @tanstack/react-query
- **Styling:** Tailwind CSS (assumed from UI patterns)

### Database (PostgreSQL)

- **Version:** PostgreSQL 14+
- **Key Features:**
  - JSONB for flexible metadata
  - GIN indexes for JSON queries
  - Row-Level Security (RLS)
  - Temporal fact resolvers

### DevOps

- **Package Manager:** pnpm (monorepo)
- **Version Control:** Git
- **Database Migrations:** Custom SQL migrations
- **Monitoring:** Custom logging (assumed)

---

## Key Design Decisions

### 1. Why LangGraph?

**Problem:** Multi-agent orchestration with complex state management
**Solution:** LangGraph provides:
- State-first architecture (student_id, session_id persist)
- Immutable reducer patterns
- Built-in multi-turn conversation support
- Graph-based agent routing

### 2. Why Intelligence Types?

**Problem:** Monolithic agent logic becomes unmaintainable
**Solution:** Atomic intelligence types provide:
- Reusability across agents
- Testability in isolation
- Clear inputs/outputs
- Evolutionary architecture (add types without breaking)

### 3. Why Conversation Intelligence?

**Problem:** Agents ask repetitive questions, frustrating students
**Solution:** 4-system architecture provides:
- Semantic deduplication (not just string matching)
- Field normalization (gpa = grade_point_average)
- Frustration detection (before escalation)
- Universal across all agents

### 4. Why Zero-Hallucination Fact-First?

**Problem:** LLMs hallucinate student data, destroying trust
**Solution:** Fact-first architecture enforces:
- Every response grounded in SQL or KB
- No invented data
- Temporal fact resolvers (data changes over time)
- Quality verification system

### 5. Why A2A Handover Protocol?

**Problem:** Agent transitions lose context and quality
**Solution:** HandoverValidator provides:
- 30 quality gate checks
- Minimum fact requirements (95+ facts)
- Quality score thresholds (8.5+)
- Comprehensive audit trail

---

## Performance Characteristics

### Response Times (Typical)

- **CAT-1 (Direct SQL):** 50-200ms
- **CAT-2 (Single Agent):** 2-5 seconds
- **CAT-3 (Multi-Agent):** 5-15 seconds

### Conversation Intelligence Overhead

- **Field normalization:** ~10ms
- **Question deduplication:** ~50ms (semantic similarity)
- **Frustration detection:** ~20ms
- **Memory storage:** ~100ms (JSONB update)
- **Total overhead per turn:** ~180ms (negligible)

### Database Query Patterns

- **Fact retrieval:** Indexed JSONB queries (fast)
- **KB search:** Full-text search with GIN indexes
- **Temporal resolution:** Efficient date range queries
- **Handover storage:** Bulk JSONB inserts

---

## Security Architecture

### Authentication & Authorization

- **JWT-based authentication**
- **Student isolation:** Row-Level Security (RLS)
- **Coach isolation:** coach_id in all queries
- **Session validation:** Expire after 24 hours

### Data Privacy

- **No PII in logs**
- **Conversation memory:** JSONB encrypted at rest
- **Handover packages:** Stored with student consent
- **KB items:** Student-scoped by default

### Zero-Trust Principles

- **Every query validates student_id**
- **No cross-student data leakage**
- **Agent actions audited**
- **Handover packages validated before acceptance**

---

## Scalability Considerations

### Current Architecture Limits

- **Single PostgreSQL instance:** Vertical scaling only
- **LangGraph state:** In-memory (session-based)
- **No caching layer:** Direct database queries
- **No distributed tracing:** Local logging only

### Future Scaling Path

1. **Horizontal scaling:** Add read replicas
2. **Caching:** Redis for KB items and fact lookups
3. **Message queue:** Decouple agent processing
4. **Distributed tracing:** OpenTelemetry integration
5. **CDN:** Static frontend assets

---

## Monitoring & Observability

### Current Logging

- **Console logs:** Development only
- **Database audit trail:** All handovers tracked
- **Conversation memory:** Full turn history
- **Error tracking:** Try-catch with context

### Future Observability

- **Structured logging:** JSON format
- **Metrics:** Prometheus
- **Tracing:** Jaeger or Datadog
- **Alerting:** PagerDuty for critical failures
- **Dashboards:** Grafana for agent performance

---

## Next Steps

After understanding this architecture:

1. **Read** `docs/specs/MASTER_SPEC_V1.0.md` for complete technical details
2. **Study** `src/agents/v18/BaseAgentWithIntelligence.ts` for agent foundation
3. **Explore** `src/intelligence/types/` for intelligence type examples
4. **Review** `database/schema/` for complete database design
5. **Follow** `docs/IMPLEMENTATION_GUIDE.md` for setup instructions

---

**This architecture is production-tested with real students and real coaching sessions.**
