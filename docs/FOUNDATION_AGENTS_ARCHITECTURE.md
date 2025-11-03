# Foundation Agents Architecture Specification

**Version:** v3.0 (Intelligence Types Architecture)
**Last Updated:** 2025-10-29
**Status:** Production
**Code Location:** `services/agent-framework/src/`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Intelligence Types Architecture (v18.0)](#intelligence-types-architecture)
4. [Fact-First Universal Primitives](#fact-first-universal-primitives)
5. [Core Components](#core-components)
6. [Agent Lifecycle](#agent-lifecycle)
7. [Tool Execution Pattern](#tool-execution-pattern)
8. [Multi-Agent Routing](#multi-agent-routing)
9. [Session Management](#session-management)
10. [Agent Types](#agent-types)
11. [Integration Points](#integration-points)
12. [Performance Characteristics](#performance-characteristics)

---

## Overview

The Foundation Agents Architecture provides a **zero-hallucination, tool-based coaching framework** for college admissions guidance. The system uses **OpenAI function calling** to access student data through SQL-grounded resolvers, ensuring all responses are fact-based.

### Key Characteristics

- **10 Specialized Agents**: Each agent handles specific coaching domains (ECs, Awards, Essays, etc.)
- **Zero Hallucination**: All data access through function calling to SQL resolvers
- **Multi-Agent Routing**: Automatic handoffs between agents based on query patterns
- **Session Continuity**: Conversation history maintained across turns
- **Evidence Tracking**: All responses include chips/hits showing data sources

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Student Query                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Registry                                │
│  - routeQuery(query)                                             │
│  - Pattern matching across all agent intents                     │
│  - Returns appropriate agent instance                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Selected Agent (BaseAgent)                     │
│  1. buildSystemPrompt(context)                                   │
│  2. callOpenAI(messages, tools)                                  │
│  3. executeResolverTool(tool_name, args)                         │
│  4. detectHandoff(query, registry)                               │
│  5. buildResponse(answer, chips, hits)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Response + Session Update                     │
│  - answer: string                                                │
│  - chips: evidence[] (data sources)                              │
│  - hits: any[] (raw data)                                        │
│  - handoff?: { to_agent, reason }                                │
│  - debug: { agent_id, tools_called, took_ms }                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. Zero Hallucination via Function Calling

**Problem**: LLMs hallucinate facts about students.

**Solution**: All student data access goes through OpenAI function calling to SQL-grounded resolvers.

```typescript
// Agent CANNOT invent data - must call tools
const tools = [
  {
    type: "function",
    function: {
      name: "get_extracurriculars",
      description: "Get student's extracurricular activities from database",
      parameters: { /* schema */ }
    }
  }
];

// LLM decides to call function
// → executeResolverTool("get_extracurriculars", { student_id })
// → SQL query to database
// → Return factual data to LLM
// → LLM uses data in response
```

### 2. Agent Specialization

**Each agent is expert in ONE domain:**

| Agent | Domain | Example Queries |
|-------|--------|-----------------|
| GamePlanAgent | Overall strategy, timeline | "What should I focus on?" |
| ExtracurricularsAgent | Activities, leadership roles | "Show me my ECs" |
| AwardsAgent | Competitions, honors | "What awards should I apply to?" |
| EssayAgent | Writing strategy, brainstorming | "Help with my Common App essay" |
| CollegeListAgent | College selection, fit analysis | "Which colleges should I apply to?" |
| ScholarshipAgent | Financial aid, merit opportunities | "Find scholarships for me" |
| WeeklyExecutionAgent | Weekly tasks, JTBD tracking | "What's on my plate this week?" |
| AdmissionsAgent | AO perspectives, admissions process | "How do admissions officers review?" |
| SummerProgramsAgent | Summer opportunities, applications | "What programs should I apply to?" |
| AssessmentAgent | Initial diagnostic, comprehensive assessment | "Help me get started" |

### 3. Session-Based Interaction

**Sessions maintain continuity:**

```typescript
interface IvyLevelSession {
  session_id: string;
  student_id: string;
  messages: ChatCompletionMessageParam[];  // Conversation history
  context: StudentSessionContext;          // Student metadata
  current_agent: string;
  turn_count: number;
  created_at: Date;
  last_active: Date;
}
```

**Each turn appends messages:**
```typescript
session.messages = [
  { role: 'user', content: 'What are my ECs?' },
  { role: 'assistant', content: 'You have 5 activities...' },
  { role: 'user', content: 'Which one should I focus on?' },  // ← Current query
];
```

### 4. Multi-Agent Handoffs

**Agents detect when another agent would be better:**

```typescript
// GamePlanAgent detects EC-specific query
const handoff = detectHandoff(userMessage, registry);
// → { to_agent: 'ecs-agent', reason: 'This question is better suited for Extracurriculars Specialist' }

// Frontend can auto-route or suggest switch
```

**Handoff Strategy**: Only handoff from less specific → more specific agent.

---

## Intelligence Types Architecture (v18.0)

**Added:** 2025-10-29
**Design Doc:** `docs/agents/AWARDS_AGENT_TECH_SPEC.md` (Section 2)
**Code Location:** `services/agent-framework/src/intelligence/`

### Overview

The Intelligence Types Architecture is the **universal pattern for encoding coaching expertise** across all agents. This architecture solves the problem of how to structure, reuse, and scale the coaching intelligence extracted from 93+ weeks of Jenny's coaching sessions.

**Key Innovation:** Instead of hardcoding coaching techniques per agent, all agents extend `BaseAgent` which provides access to:
1. **Universal Intelligence Types** (7 types inherited by ALL agents)
2. **Domain-Specific Intelligence Types** (each agent declares its own)
3. **Parallel Multi-Threaded Processing** (all intelligence types process every query simultaneously)
4. **Intelligence Registry** (global registry for intelligence modules)

### What is an Intelligence Type?

An **Intelligence Type** is the **atomic reusable unit** of coaching intelligence. It bundles:
- **Framework**: Conceptual model (mental model for understanding)
- **Tactics**: Executable procedures (step-by-step processes)
- **Techniques**: Atomic actions (specific moves)
- **Chips**: Knowledge artifacts (data, examples, templates)
- **Metrics**: Success criteria (measurable outcomes)
- **Triggers**: Activation conditions (when to fire)

**Intelligence Type Structure:**
```typescript
interface IntelligenceType {
  // Identity
  type_id: string;              // "TYPE-020"
  name: string;                 // "Opportunity Pipeline Architecture"
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC';

  // Components (5-level hierarchy)
  components: {
    framework: ConceptualModel;    // Level 2: Mental model
    tactics: Tactic[];            // Level 3: Executable procedures
    techniques: Technique[];       // Level 4: Atomic actions
    chips: Chip[];                // Level 5: Knowledge artifacts
    metrics: SuccessCriteria;      // Measurable outcomes
    triggers: ActivationCondition; // When to fire
  };

  // Core execution
  process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult>;
}
```

### 5-Level Hierarchy

The Intelligence Types follow a clear hierarchy:

```
Level 1: Intelligence Type (atomic reusable unit)
  ↓
Level 2: Framework (conceptual model - "Opportunity Pipeline")
  ↓
Level 3: Tactic (executable procedure - "Bombardment Execution")
  ↓
Level 4: Technique (atomic action - "Deliver 1.2 opportunities per interaction")
  ↓
Level 5: Chip (knowledge artifact - "NCWIT Victory Blueprint")
```

**Example:**
```
TYPE-020: Opportunity Pipeline Architecture (Intelligence Type)
  ├─ Pipeline Framework (Framework)
  │   ├─ Bombardment Execution (Tactic)
  │   │   ├─ Deliver 1.2 opportunities/interaction (Technique)
  │   │   ├─ Maintain 3:1 buffer ratio (Technique)
  │   │   └─ <72hr recovery from rejection (Technique)
  │   └─ Application Velocity (Tactic)
  │       ├─ 70% application rate (Technique)
  │       └─ Pre-qualify opportunities (Technique)
  └─ Chips
      ├─ NCWIT Victory Blueprint
      ├─ Congressional App Challenge Template
      └─ Award Timeline Matrix
```

### Universal vs. Domain-Specific Intelligence Types

#### Universal Intelligence Types (7 types - ALL agents inherit)

These are **cross-cutting concerns** available to every agent:

| Type ID | Name | Purpose | Example Usage |
|---------|------|---------|---------------|
| TYPE-005 | 3R Rejection Protocol | Handle rejection/failure | "NCWIT rejection? Let's pivot to Congressional App in <2hrs" |
| TYPE-018 | Strategic Pivot Protocol | Transform strategy within 48-72hrs | "SAT plateau? Switch focus to subject tests + portfolio" |
| TYPE-020 | Opportunity Pipeline | Generate 1.2 opportunities per interaction | "Applying to NCWIT? Also consider: Aspirations, YoungArts, Congressional" |
| TYPE-011 | Celebration Science | Calibrated celebration (exclamation gradient) | "Semifinalist = 'Great progress!', Winner = 'THIS IS HUGE!!!'" |
| TYPE-012 | Rejection Alchemy | Transform rejection into fuel | "NCWIT semifinalist = validation for USC essay narrative" |
| TYPE-021 | Parent Navigation | Balance parent/student messaging | Parent hears 'rigorous', student hears 'achievable'" |
| TYPE-010 | Permission Field | Vulnerability progression system | Build trust before delivering hard truths |

**Code Integration:**
```typescript
export abstract class BaseAgent {
  // UNIVERSAL Intelligence Types (all agents inherit)
  protected static UNIVERSAL_INTELLIGENCE: IntelligenceType[] = [
    IntelligenceRegistry.get('TYPE-005: 3R_Rejection_Protocol'),
    IntelligenceRegistry.get('TYPE-018: Strategic_Pivot_Protocol'),
    IntelligenceRegistry.get('TYPE-020: Opportunity_Pipeline_Architecture'),
    IntelligenceRegistry.get('TYPE-011: Celebration_Science'),
    IntelligenceRegistry.get('TYPE-012: Rejection_Alchemy'),
    IntelligenceRegistry.get('TYPE-021: Parent_Navigation_Matrix'),
    IntelligenceRegistry.get('TYPE-010: Permission_Field')
  ];

  // DOMAIN-SPECIFIC Intelligence Types (agent declares)
  protected abstract DOMAIN_INTELLIGENCE: IntelligenceType[];
}
```

#### Domain-Specific Intelligence Types (per agent)

Each agent declares its own domain expertise:

**AwardsAgent (7 types):**
- TYPE-022: Award Strategy Orchestration
- TYPE-023: Award Arbitrage System
- TYPE-024: Award Tier Classification
- TYPE-025: Content Recycling Matrix
- TYPE-026: 70/20/10 Portfolio Rule
- TYPE-027: Quick Wins Strategy
- TYPE-017: Task Multiplication

**GamePlanAgent (to be retrofitted):**
- TYPE-001: Game Plan Synthesis
- TYPE-002: Weak Spot Prioritization
- TYPE-003: Timeline Architecture
- etc.

**AssessmentAgent (to be retrofitted):**
- TYPE-008: Profile Assessment Framework
- TYPE-009: Strength Discovery Protocol
- etc.

### Parallel Multi-Threaded Processing

**Key Insight:** ALL intelligence types process EVERY query simultaneously, then results are synthesized.

**Processing Flow:**
```typescript
async handleQuery(query: AgentQuery): Promise<AgentResponse> {
  // 1. Load facts from FactStore
  const facts = await this.factStore.getFacts(query.entity_id, this.getRequiredFacts());

  // 2. Validate facts
  this.validateFacts(facts);

  // 3. Get all intelligence types (universal + domain)
  const allIntelligence = [
    ...BaseAgent.UNIVERSAL_INTELLIGENCE,
    ...this.DOMAIN_INTELLIGENCE
  ];

  // 4. PARALLEL processing across ALL intelligence types
  const intelligenceResults = await Promise.all(
    allIntelligence.map(intel => intel.process(query, facts))
  );

  // 5. SYNTHESIZE response using Complete Execution Formula
  return this.synthesizeResponse(intelligenceResults, query, facts);
}
```

**Why Parallel Processing?**
- Single query triggers: award recommendations + crisis handling + celebration + opportunities
- Creates **holistic coaching responses** (not just narrow answers)
- Matches human coach behavior (Jenny processes multiple layers simultaneously)

**Example Query:**
```
Student: "I didn't win NCWIT"

Parallel Processing:
  ├─ TYPE-005: 3R Rejection Protocol → "Let's pivot within 2 hours"
  ├─ TYPE-020: Opportunity Pipeline → "Try Congressional App, Aspirations, YoungArts"
  ├─ TYPE-012: Rejection Alchemy → "Semifinalist status validates your USC narrative"
  ├─ TYPE-018: Strategic Pivot → "Shift focus to portfolio + subject tests"
  ├─ TYPE-027: Quick Wins → "Enter 2-week competition for momentum"
  └─ TYPE-011: Celebration Science → "Semifinalist is top 10% nationally - that's significant"

Synthesized Response: (combines all layers into coherent coaching message)
```

### Intelligence Registry Pattern

**Purpose:** Global registry for managing intelligence types (microservices pattern).

```typescript
export class IntelligenceRegistry {
  private static modules: Map<string, IntelligenceType> = new Map();

  static register(module: IntelligenceType): void {
    this.modules.set(module.type_id, module);
  }

  static get(typeId: string): IntelligenceType {
    const module = this.modules.get(typeId);
    if (!module) {
      throw new Error(`Intelligence Type ${typeId} not registered`);
    }
    return module;
  }

  static initialize(): void {
    // Register all intelligence types at startup
    // UNIVERSAL
    this.register(new RejectionProtocol());           // TYPE-005
    this.register(new StrategicPivotProtocol());     // TYPE-018
    this.register(new OpportunityPipeline());        // TYPE-020
    this.register(new CelebrationScience());         // TYPE-011
    this.register(new RejectionAlchemy());           // TYPE-012
    this.register(new ParentNavigation());           // TYPE-021
    this.register(new PermissionField());            // TYPE-010

    // DOMAIN-SPECIFIC (Awards)
    this.register(new AwardOrchestration());         // TYPE-022
    this.register(new AwardArbitrage());             // TYPE-023
    this.register(new AwardTierClassification());    // TYPE-024
    this.register(new ContentRecycling());           // TYPE-025
    this.register(new Portfolio70_20_10());          // TYPE-026
    this.register(new QuickWins());                  // TYPE-027
    this.register(new TaskMultiplication());         // TYPE-017
  }
}
```

**Benefits:**
- Agents **register** which intelligence types they need (don't implement them)
- Intelligence types are **reusable** across agents
- **Extensibility**: Add new intelligence type → all agents can access it
- **Testability**: Mock intelligence types for testing

### Complete Execution Formula

**Synthesis Pattern:**
```typescript
protected synthesizeResponse(
  intelligenceResults: IntelligenceResult[],
  query: AgentQuery,
  facts: FactSet
): AgentResponse {
  // Group results by component
  const byComponent = this.groupByComponent(intelligenceResults);

  // Complete Execution Formula (multiply effects, not add)
  const response = {
    // Primary recommendation (from domain-specific intelligence)
    recommendation: byComponent.recommendation?.[0]?.data || null,

    // Opportunity pipeline (universal)
    opportunities: byComponent.opportunities || [],

    // Crisis handling (universal - if triggered)
    crisis_response: byComponent.crisis_response || null,

    // Celebration (universal - if triggered)
    celebration: byComponent.celebration || null,

    // Strategic pivot (universal - if triggered)
    pivot: byComponent.pivot || null,

    // Parent messaging (universal)
    parent_layer: byComponent.parent_messaging || null,

    // Task breakdown (domain-specific)
    tasks: byComponent.tasks || [],

    // Evidence
    facts_used: facts.getAllFacts(),
    validation_score: this.calculateValidationScore(intelligenceResults, facts)
  };

  return response;
}
```

### Migration from Legacy Agents

**Old Pattern (Hardcoded Techniques):**
```typescript
class AwardsAgent {
  // Hardcoded logic - not reusable
  private handleRejection(award: string) {
    return "Sorry about the rejection. Let's try other awards.";
  }

  // Hardcoded logic - not extensible
  private recommendAwards(profile: Profile) {
    if (profile.interests.includes('cs')) {
      return ['NCWIT', 'Congressional App'];
    }
    return [];
  }
}
```

**New Pattern (Intelligence Types):**
```typescript
class AwardsAgentRefactored extends BaseAgent {
  // Declare domain-specific intelligence types
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [
    IntelligenceRegistry.get('TYPE-022: Award_Strategy_Orchestration'),
    IntelligenceRegistry.get('TYPE-023: Award_Arbitrage_System'),
    IntelligenceRegistry.get('TYPE-024: Award_Tier_Classification'),
    IntelligenceRegistry.get('TYPE-025: Content_Recycling_Matrix'),
    IntelligenceRegistry.get('TYPE-026: 70_20_10_Portfolio_Rule'),
    IntelligenceRegistry.get('TYPE-027: Quick_Wins_Strategy'),
    IntelligenceRegistry.get('TYPE-017: Task_Multiplication')
  ];

  // Agent just declares required facts
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,
      FactCategory.AWARDS_WON,
      FactCategory.ACTIVITY_DATA,
      FactCategory.UNIQUE_NARRATIVE
    ];
  }

  // BaseAgent handles execution via Intelligence Types automatically
}
```

### Benefits of Intelligence Types Architecture

#### 1. Reusability
- **Opportunity Pipeline** used by: Awards, Summer Programs, Scholarships, Colleges
- **3R Rejection Protocol** used by: All agents (universal)
- **Parent Navigation** used by: All agents (universal)

#### 2. Extensibility
- Add new intelligence type → all agents can access it
- Example: Add TYPE-030: "College Essay Recycling" → Essays, Colleges, Scholarships all get it

#### 3. Testability
- Mock intelligence types for testing
- Test intelligence types independently
- Verify agents use correct intelligence types

#### 4. Maintainability
- Change Opportunity Pipeline formula → all agents updated automatically
- Change Rejection Protocol → all agents updated automatically
- Single source of truth for each technique

#### 5. Auditability
- Every response shows which intelligence types were activated
- Traceability: Response → Intelligence Results → Intelligence Types → Coaching Data
- Quality control: Validation score per intelligence type

#### 6. Scalability
- Multi-coach scaling: Each coach can tune intelligence types
- New student archetypes: Add new intelligence types without changing agents
- New domains: Awards → Summer Programs → Scholarships (reuse intelligence types)

### Real-Time Student Calibration (Future Enhancement)

**Status:** 📋 BACKLOG - Design decision recorded, implementation deferred

**Decision Date:** 2025-10-29

**Architecture Decision:** Calibration as Facts (Hybrid Option C)

Real-time calibration adjusts intelligence type parameters based on observed student behavior patterns. Examples:
- Opportunity Pipeline: 1.2 → 0.8 opportunities if student shows overwhelm
- Celebration Science: Exclamation gradient → reduce if negative response
- Task Multiplication: 5X formula → 3X if complexity struggles

**Chosen Approach:** Calibration data stored as Facts in FactStore

**Rationale:**
- ✅ Aligns with Fact-First Architecture (calibration = data about student)
- ✅ Separation: CalibrationLearningService (learns) vs Intelligence Types (apply)
- ✅ Auditability: All calibration decisions traceable via facts_used[]
- ✅ Graceful degradation: Missing calibration facts → use defaults

**Placeholder Components:**

```typescript
// New Fact Category
enum FactCategory {
  STUDENT_BEHAVIORAL_PROFILE = 'STUDENT_BEHAVIORAL_PROFILE'
}

// Fact Types
const CALIBRATION_FACTS = [
  'opportunity_absorption_rate',    // 0.0-2.0 (default 1.0)
  'celebration_sensitivity',        // 'low' | 'moderate' | 'high'
  'overwhelm_threshold',            // 'low' | 'medium' | 'high'
  'trust_progression_speed',        // 'gradual' | 'medium' | 'fast'
  'complexity_tolerance',           // 'low' | 'medium' | 'high'
  'rejection_resilience',           // 0.0-1.0
  'parent_navigation_mode'          // 'student_primary' | 'balanced' | 'parent_primary'
];

// Placeholder implementations (to be built)
class CalibrationFactSource implements FactSource { /* TODO */ }
class CalibrationLearningService { /* TODO */ }

// Intelligence Types consume calibration facts
class OpportunityPipeline implements IntelligenceType {
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    // Extract calibration (defaults to 1.0 if not available)
    const absorptionRate = facts.getValueByType('opportunity_absorption_rate') || 1.0;
    const opportunitiesCount = Math.round(1.2 * absorptionRate);
    // ... rest of logic
  }
}
```

**Database Schema (future):**
```sql
-- PLACEHOLDER - Not implemented
CREATE TABLE student_calibration_profiles (
  student_id TEXT PRIMARY KEY,
  opportunity_absorption_rate NUMERIC DEFAULT 1.0,
  celebration_sensitivity TEXT DEFAULT 'high',
  overwhelm_threshold TEXT DEFAULT 'medium',
  -- ... more calibration fields
  total_interactions INTEGER DEFAULT 0,
  last_calibration_update TIMESTAMP DEFAULT NOW()
);
```

**Implementation Priority:** BACKLOG (after all 10 agents implemented)

---

### Implementation Status

**✅ Completed:**
- Complete architecture specification (AWARDS_AGENT_TECH_SPEC.md)
- 14 Intelligence Types fully documented (7 universal + 7 domain-specific for Awards)
- Intelligence Type interface defined
- IntelligenceRegistry pattern specified
- Foundation Agents Architecture updated with Intelligence Types (v3.0)
- GamePlan Agent spec updated with Intelligence Types (v3.0)
- Assessment Agent spec updated with Intelligence Types (v3.0)

**⏳ Current Priority:**
- Complete remaining agent specifications (7 agents)
- Build agent implementations for all 10 agents

**📋 Backlog (Future):**
- Real-Time Student Calibration (CalibrationFactSource + CalibrationLearningService)
- Implement IntelligenceRegistry.ts
- Implement 7 Universal Intelligence Types (TYPE-005, TYPE-010, TYPE-011, TYPE-012, TYPE-018, TYPE-020, TYPE-021)
- Implement Domain-Specific Intelligence Types per agent

---

## Fact-First Universal Primitives

**Added:** 2025-10-29
**Design Doc:** `services/agent-framework/docs/FACT_FIRST_ARCHITECTURE.md`
**Code Location:** `services/agent-framework/src/facts/`

### Overview

The Fact-First architecture is a **universal primitive pattern** that ALL agents inherit, enforcing zero-hallucination behavior at the architectural level (not as band-aid fixes per agent).

**Key Innovation:** Instead of each agent implementing custom fact extraction, all agents extend `BaseAgent` which enforces:
1. **Mandatory fact loading** before response generation
2. **Automatic validation** that responses only contain facts
3. **Provenance tracking** for auditability
4. **Extensible fact sources** (internal DB + external APIs)

### Core Primitives

#### 1. FactStore (Central Registry)

**Purpose:** Single source of truth for all facts (database + external APIs)

```typescript
class FactStore {
  registerSource(category: FactCategory, source: FactSource): void;
  getFacts(query: FactQuery): Promise<Fact[]>;
}
```

**Supported Fact Categories:**
- `STUDENT_PROFILE` - Demographics, identity
- `ASSESSMENT_DATA` - Game plan, weak spots, strengths
- `ACTIVITY_DATA` - ECs, awards, achievements
- `ACADEMIC_DATA` - GPA, test scores, courses
- `COLLEGE_ADMISSIONS` - Admit rates, CDS data (external)
- `HISTORICAL_PROFILES` - Past successful applicants (external)
- `SCHOLARSHIP_DATA` - Available scholarships (external)
- `PROGRAM_DATA` - Summer programs, competitions (external)
- `DEADLINE_DATA` - Application deadlines (external)

#### 2. BaseAgent (Universal Abstract Class)

**Purpose:** ALL agents extend BaseAgent - cannot bypass fact-first behavior

```typescript
abstract class BaseAgent {
  // ENFORCED: Agents must declare required facts
  protected abstract getRequiredFacts(): FactCategory[];

  // ENFORCED: Facts loaded before response
  protected async loadFacts(entityId: string): Promise<FactSet>;

  // ENFORCED: Response validated against facts
  protected async validateResponse(response: string, facts: FactSet): Promise<ValidationResult>;

  // TEMPLATE METHOD: Cannot be overridden
  async handleQuery(query: AgentQuery): Promise<AgentResponse> {
    const facts = await this.loadFacts(query.entity_id);
    if (!facts.hasSufficientData(this.getRequiredFacts())) {
      return this.generateInsufficientDataResponse(facts);
    }
    const response = await this.generateResponse(query, facts);
    const validation = await this.validateResponse(response, facts);
    return { response, facts_used: facts.getAllFacts(), validation_score: validation.score };
  }

  // ABSTRACT: Each agent implements using ONLY provided facts
  protected abstract generateResponse(query: AgentQuery, facts: FactSet): Promise<string>;
}
```

#### 3. FactSource Interface

**Purpose:** Universal abstraction for any data provider

```typescript
interface FactSource {
  source_id: string;
  source_type: 'database' | 'api' | 'file';
  category: FactCategory;

  fetchFacts(query: FactQuery): Promise<Fact[]>;
  validateFact(fact: Fact): Promise<boolean>;
  getProvenance(fact: Fact): FactProvenance;
}
```

**Built-in Implementations:**
- `PostgresFactSource` - Internal database (game_plans, students tables)
- `CommonDataSetFactSource` - External API (college admission stats)
- `CollegeBoardFactSource` - External API (SAT/AP data)
- `HistoricalProfilesFactSource` - External API (past admits)

#### 4. Fact (Universal Data Unit)

**Purpose:** Every piece of information is a verifiable Fact

```typescript
interface Fact {
  fact_id: string;
  category: FactCategory;
  entity_id: string;           // student_id, school_id, etc.
  fact_type: string;           // "gpa", "sat_score", "admit_rate"
  value: any;
  provenance: FactProvenance;  // Where it came from
  confidence: number;          // 0.0-1.0 (1.0 = verified DB record)
}

interface FactProvenance {
  source_id: string;
  timestamp: Date;
  source_url?: string;         // For external APIs
  database_table?: string;     // For internal DB
  query_used?: string;
  last_verified: Date;
}
```

### Benefits

#### 1. Extensibility
- **Add new fact source**: Implement `FactSource` interface (e.g., `CollegeDataAPI`)
- **Add new fact category**: Extend `FactCategory` enum
- **Zero code changes** in agents - they automatically get new facts

#### 2. Reusability
- **All agents** use same `BaseAgent` → consistent behavior
- **All fact access** through `FactStore` → single point of truth
- **All validation** via `FactValidator` → consistent quality

#### 3. Auditability
- Every response includes `facts_used[]` → full traceability
- Every fact has `provenance` → source, timestamp, query
- Every response has `validation_score` → quality metric

#### 4. Testability
- Mock `FactSource` implementations for testing
- Verify agents only use provided facts
- Test validation logic independently

### Migration from Legacy Agents

**Old Pattern (Band-Aid Fix):**
```typescript
class GamePlanAgent {
  // Custom fact extraction - not reusable
  private extractGamePlanFacts(gamePlan: any) { ... }

  // Direct database access - not audited
  private async getCurrentGamePlan(student_id: string) {
    const result = await this.pool.query(...);
    return result.rows[0];
  }

  // No validation - can hallucinate
  async handleQuery(query: string): Promise<string> {
    const gamePlan = await this.getCurrentGamePlan(student_id);
    return this.formatResponse(gamePlan);  // No fact verification
  }
}
```

**New Pattern (Universal Primitive):**
```typescript
class GamePlanAgent extends BaseAgent {
  // Declare required facts (enforced)
  protected getRequiredFacts(): FactCategory[] {
    return [FactCategory.ASSESSMENT_DATA, FactCategory.ACTIVITY_DATA];
  }

  // Use ONLY provided facts (cannot query directly)
  protected async generateResponse(query: AgentQuery, facts: FactSet): Promise<string> {
    const narrative = facts.getValueByType('unique_narrative');
    const weakSpots = facts.getFactsByType('weak_spot').filter(f => f.value.priority === 'P0');
    return this.formatResponse(narrative, weakSpots);  // Facts validated automatically
  }
}
```

### Architecture Diagram (v18.0)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Student Query                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Registry                                │
│  routeQuery() → Returns BaseAgent instance                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 BaseAgent.handleQuery() [ENFORCED]               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. loadFacts(entity_id) → FactStore                       │  │
│  │    ├─ Query PostgresFactSource (internal DB)             │  │
│  │    ├─ Query CommonDataSetFactSource (external API)       │  │
│  │    └─ Merge & deduplicate → FactSet                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 2. Check hasSufficientData(requiredCategories)           │  │
│  │    If NO → return "Missing: X, Y, Z"                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 3. generateResponse(query, facts) [Agent-Specific]       │  │
│  │    Agent uses ONLY facts from FactSet                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 4. validateResponse(response, facts) → score 0.0-1.0     │  │
│  │    Checks all claims are grounded in facts               │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 5. Return AgentResponse with provenance                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AgentResponse                                 │
│  {                                                               │
│    response: string,                                             │
│    facts_used: Fact[],        // Full traceability              │
│    validation_score: 0.95,    // Quality metric                 │
│    provenance: [{              // Auditability                   │
│      source_id: "postgres_ivylevel",                            │
│      database_table: "game_plans",                              │
│      timestamp: "2025-10-29T..."                                │
│    }]                                                            │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Status

**✅ Completed (v18.0):**
- Core primitives: `BaseAgent`, `FactStore`, `FactSet`, `FactValidator`
- Internal source: `PostgresFactSource`
- Type definitions: `Fact`, `FactCategory`, `FactProvenance`

**⏳ In Progress:**
- Refactor `GamePlanAgent` to extend `BaseAgent`
- Refactor `AssessmentAgent` to extend `BaseAgent`

**📋 Planned:**
- External sources: `CommonDataSetFactSource`, `CollegeBoardFactSource`
- Migrate remaining 8 agents to `BaseAgent`
- Add fact caching layer
- Add fact versioning (time-travel queries)


## Core Components

### 1. BaseAgent (Abstract Base Class)

**Location**: `services/agent-framework/src/core/BaseAgent.ts`

**Purpose**: Foundation for all agents. Provides:
- **Intelligence Types Architecture** (v3.0) - Universal + Domain-Specific intelligence processing
- **Fact-First Architecture** (v2.0) - Zero-hallucination data access
- OpenAI function calling integration
- Session management
- Tool execution loop
- Handoff detection
- Evidence tracking

**Key Methods**:

```typescript
abstract class BaseAgent {
  // v3.0: Intelligence Types Architecture
  protected factStore: FactStore;

  // UNIVERSAL Intelligence Types (all agents inherit)
  protected static UNIVERSAL_INTELLIGENCE: IntelligenceType[] = [
    IntelligenceRegistry.get('TYPE-005: 3R_Rejection_Protocol'),
    IntelligenceRegistry.get('TYPE-018: Strategic_Pivot_Protocol'),
    IntelligenceRegistry.get('TYPE-020: Opportunity_Pipeline_Architecture'),
    IntelligenceRegistry.get('TYPE-011: Celebration_Science'),
    IntelligenceRegistry.get('TYPE-012: Rejection_Alchemy'),
    IntelligenceRegistry.get('TYPE-021: Parent_Navigation_Matrix'),
    IntelligenceRegistry.get('TYPE-010: Permission_Field')
  ];

  // DOMAIN-SPECIFIC Intelligence Types (agent declares)
  protected abstract DOMAIN_INTELLIGENCE: IntelligenceType[];

  // v3.0: Core query handling with parallel intelligence processing
  async handleQuery(query: AgentQuery): Promise<AgentResponse> {
    // 1. Extract facts from FactStore (v2.0)
    const facts = await this.factStore.getFacts(
      query.entity_id,
      this.getRequiredFacts()
    );

    // 2. Validate facts (v2.0)
    this.validateFacts(facts);

    // 3. Get all intelligence types (universal + domain) (v3.0)
    const allIntelligence = [
      ...BaseAgent.UNIVERSAL_INTELLIGENCE,
      ...this.DOMAIN_INTELLIGENCE
    ];

    // 4. PARALLEL processing across ALL intelligence types (v3.0)
    const intelligenceResults = await Promise.all(
      allIntelligence.map(intel => intel.process(query, facts))
    );

    // 5. SYNTHESIZE response using Complete Execution Formula (v3.0)
    return this.synthesizeResponse(intelligenceResults, query, facts);
  }

  // v2.0: Fact-First methods
  protected abstract getRequiredFacts(): FactCategory[];
  protected async loadFacts(entityId: string): Promise<FactSet>;
  protected async validateResponse(response: string, facts: FactSet): Promise<ValidationResult>;

  // Legacy methods (maintained for backward compatibility)
  async execute(
    context: AgentExecutionContext,
    registry?: AgentRegistry
  ): Promise<AgentExecutionResult>;

  protected buildSystemPrompt(context: AgentExecutionContext): string;
  protected async callOpenAI(
    messages: ChatCompletionMessageParam[],
    toolCalls: ToolCall[]
  ): Promise<string>;

  protected detectHandoff(
    userMessage: string,
    registry?: AgentRegistry
  ): { to_agent: string; reason: string } | undefined;

  protected extractChips(toolCalls: ToolCall[]): Chip[];
  protected extractHits(toolCalls: ToolCall[]): any[];

  protected updateSession(
    session: IvyLevelSession,
    userMessage: string,
    response: AgentResponse
  ): IvyLevelSession;

  getManifest(): AgentManifest;
}
```

**Agent Manifest Structure**:

```typescript
interface AgentManifest {
  agent_id: string;                    // e.g., 'gameplan-agent'
  display_name: string;                // e.g., 'Jenny - Game Plan Advisor'
  tagline: string;                     // e.g., 'your college application planning strategist'
  version: string;                     // e.g., '1.0.0'
  category: AgentCategory;             // e.g., 'gameplan'

  tools: ChatCompletionTool[];         // OpenAI function definitions
  intents: AgentIntent[];              // Pattern matching for routing
  jtbd: JobsToBeDone;                  // Student/parent jobs to be done

  temperature?: number;                // LLM temperature (default 0.7)
  max_tokens?: number;                 // Max response tokens (default 500)
  model?: string;                      // Override fine-tuned model

  handoffs?: string[];                 // Allowed handoff targets
}
```

### 2. AgentRegistry (Singleton)

**Location**: `services/agent-framework/src/core/AgentRegistry.ts`

**Purpose**: Central registry for all agents. Handles:
- Agent initialization
- Query routing (pattern matching)
- Agent retrieval
- Usage statistics
- Agent activation/deactivation

**Key Methods**:

```typescript
class AgentRegistry {
  // Initialize all 10 agents
  private initializeAgents(): void;

  // Get agent by ID
  getAgent(agentId: string): BaseAgent | null;

  // Get agent by category
  getAgentByCategory(category: AgentCategory): BaseAgent | null;

  // Route query to appropriate agent (pattern matching)
  routeQuery(query: string): BaseAgent;

  // Check if agent can handle query
  canHandleQuery(agentId: string, query: string): boolean;

  // Get handoff recommendation
  getHandoffRecommendation(fromAgentId: string, query: string): string | null;

  // Get all active agents
  getAllAgents(): BaseAgent[];

  // Get usage statistics
  getStats(): Record<string, any>;

  // Deactivate/reactivate agents
  deactivateAgent(agentId: string): boolean;
  reactivateAgent(agentId: string): boolean;
}

// Singleton instance
export const agentRegistry = new AgentRegistry();
```

**Routing Algorithm** (Pattern Matching):

```typescript
// 1. Check each agent's intent patterns
for (const registered of this.agents.values()) {
  for (const intent of registered.manifest.intents) {
    for (const pattern of intent.patterns) {
      if (queryLower.includes(pattern.toLowerCase())) {
        return registered.instance;  // Match found
      }
    }
  }
}

// 2. Default to GamePlanAgent if no match
return this.agents.get('gameplan-agent')!;
```

### 3. Resolver Tools

**Location**: `services/agent-framework/src/tools/resolverTools.ts`

**Purpose**: Execute SQL-grounded data retrieval. Each tool is a function that:
1. Validates parameters
2. Queries PostgreSQL database
3. Returns structured data
4. Includes evidence chips/hits

**Example Tool**:

```typescript
async function get_extracurriculars(args: { student_id: string }) {
  const pool = await getDbPool();

  const result = await pool.query(`
    SELECT
      ec_id, activity_name, role, grade, hours_per_week,
      weeks_per_year, description, impact
    FROM extracurriculars
    WHERE student_id = $1
    ORDER BY grade DESC, hours_per_week DESC
  `, [args.student_id]);

  return {
    extracurriculars: result.rows,
    chips: [
      { kind: 'evidence', text: 'Extracurriculars Database' }
    ],
    hits: result.rows
  };
}
```

**Available Tool Categories**:

- **Academic**: `get_transcript`, `get_gpa`, `get_sat_scores`, `get_ap_exams`
- **ECs**: `get_extracurriculars`, `get_leadership_roles`, `get_ec_hours`
- **Awards**: `get_awards`, `get_competitions`, `get_honors`
- **Programs**: `get_summer_programs`, `get_program_applications`
- **Colleges**: `get_college_list`, `get_college_acceptances`, `get_college_attending`
- **Essays**: `get_essays`, `get_essay_drafts`, `get_essay_feedback`
- **Scholarships**: `get_scholarships`, `get_scholarship_applications`
- **Strategy**: `get_relevant_tactics`, `get_nsm_dashboard`, `get_nsm_recognition`
- **JTBD**: `get_weekly_tasks`, `get_deadlines`, `get_completed_tasks`

### 4. Intent Patterns

**Each agent defines patterns for routing:**

```typescript
intents: [
  {
    intent_id: 'ecs.discovery',
    category: 'extracurriculars',
    patterns: [
      'what are my extracurriculars',
      'show me my ecs',
      'list my activities',
      'what activities do i have',
      'leadership roles',
    ],
    priority: 1,  // Higher priority = checked first
  },
  {
    intent_id: 'ecs.recommendations',
    category: 'extracurriculars',
    patterns: [
      'what activities should i join',
      'recommend extracurriculars',
      'how can i improve my ecs',
      'which ec should i focus on',
    ],
    priority: 2,
  },
]
```

**Pattern Matching**:
- Case-insensitive substring matching
- First match wins (checked by priority)
- Falls back to GamePlanAgent if no match

---

## Agent Lifecycle

### Execution Flow

```typescript
// 1. User sends message
const context: AgentExecutionContext = {
  user_message: "What are my extracurriculars?",
  session: currentSession,  // Contains history, student context
};

// 2. Registry routes to appropriate agent
const agent = agentRegistry.routeQuery(context.user_message);
// → Returns ExtracurricularsAgent

// 3. Agent executes with context
const result = await agent.execute(context, agentRegistry);

// 4. Result contains response + updated session
const response = result.response;
// {
//   answer: "You have 5 extracurricular activities...",
//   chips: [{ kind: 'evidence', text: 'Extracurriculars Database' }],
//   hits: [...raw EC data...],
//   handoff: undefined,  // No handoff needed
//   debug: {
//     agent_id: 'ecs-agent',
//     tools_called: ['get_extracurriculars'],
//     took_ms: 1234,
//     model: 'ft:gpt-4o-mini:...'
//   }
// }

// 5. Session updated with new turn
const updatedSession = result.session;
// session.messages now includes user message + assistant response
// session.turn_count incremented
```

### Agent Execution Steps (Internal)

```typescript
async execute(context, registry) {
  // 1. Build system prompt (agent-specific)
  const systemPrompt = this.buildSystemPrompt(context);

  // 2. Build messages array (system + history + current)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...context.session.messages,  // Conversation history
    { role: 'user', content: context.user_message },
  ];

  // 3. Call OpenAI with function calling
  const toolCalls = [];
  const finalResponse = await this.callOpenAI(messages, toolCalls);

  // 4. Detect handoff (optional)
  const handoff = this.detectHandoff(context.user_message, registry);

  // 5. Build response with chips/hits
  const response = {
    answer: finalResponse,
    chips: this.extractChips(toolCalls),
    hits: this.extractHits(toolCalls),
    handoff,
    debug: { agent_id, tools_called, took_ms, model }
  };

  // 6. Update session
  const updatedSession = this.updateSession(context.session, context.user_message, response);

  // 7. Return result
  return { response, session: updatedSession, execution_time_ms, tokens_used };
}
```

---

## Tool Execution Pattern

### Function Calling Loop

```typescript
// OpenAI function calling loop (max 5 iterations)
async callOpenAI(messages, toolCalls) {
  let currentMessages = [...messages];
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    // Call OpenAI with tools
    const completion = await this.openai.chat.completions.create({
      model: this.model,  // jenny_v9_eq fine-tuned model
      messages: currentMessages,
      tools: this.manifest.tools,  // Available functions
      tool_choice: 'auto',
      temperature: 0.7,
    });

    const message = completion.choices[0].message;

    // If no tool calls, return final response
    if (!message.tool_calls) {
      return message.content;
    }

    // Execute each tool call
    currentMessages.push(message);

    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      // Execute SQL-grounded resolver
      const result = await executeResolverTool(toolName, args);

      // Record tool call
      toolCalls.push({ tool_name: toolName, arguments: args, result, took_ms });

      // Add tool response to messages
      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // Continue loop to get final response from model
    iterations++;
  }

  // Max iterations reached
  return 'I processed your request but reached the iteration limit.';
}
```

### Tool Result Format

```typescript
interface ToolResult {
  // Tool-specific data
  [key: string]: any;

  // Evidence chips (shown to user)
  chips?: Array<{
    kind: 'evidence' | 'tool' | 'source';
    text: string;
  }>;

  // Raw data hits (for frontend)
  hits?: any[];
}
```

**Example**:

```typescript
// Tool: get_extracurriculars
{
  extracurriculars: [
    {
      ec_id: 'ec_123',
      activity_name: 'Robotics Club',
      role: 'President',
      grade: 12,
      hours_per_week: 15,
      weeks_per_year: 40,
      description: 'Led team of 20 students...',
      impact: 'Regional Champions 2024'
    },
    // ... more ECs
  ],
  chips: [
    { kind: 'evidence', text: 'Extracurriculars Database' }
  ],
  hits: [ /* same as extracurriculars */ ]
}
```

---

## Multi-Agent Routing

### Handoff Detection Logic

```typescript
// Agent detects if query should be handed off
protected detectHandoff(userMessage: string, registry?: AgentRegistry) {
  if (!registry) return undefined;

  // 1. Check if current agent matches query patterns
  const currentAgentMatches = this.matchesOwnPatterns(userMessage);

  // 2. Use registry to find suggested agent
  const suggestedAgent = registry.routeQuery(userMessage);

  // 3. If suggested agent is different
  if (suggestedAgent.getManifest().agent_id !== this.manifest.agent_id) {
    // Agent specificity hierarchy
    const specificity = {
      'gameplan-agent': 1,  // Least specific (general strategy)
      'ecs-agent': 2,
      'awards-agent': 2,
      'programs-agent': 2,
      'college-agent': 2,
      'essay-agent': 2,
      'admissions-agent': 2,
      'weekly-execution-agent': 2,
      'scholarship-agent': 2,
      'assessment-agent': 2,  // Most specific
    };

    const currentSpecificity = specificity[this.manifest.agent_id] || 0;
    const targetSpecificity = specificity[targetManifest.agent_id] || 0;

    // Handoff decision:
    // - Current matches + target MORE specific → Handoff
    // - Current matches + target LESS/EQUAL specific → NO handoff
    // - Current NO match + target MORE/EQUAL specific → Handoff
    // - Current NO match + target LESS specific → NO handoff

    const shouldHandoff = currentAgentMatches
      ? targetSpecificity > currentSpecificity
      : targetSpecificity >= currentSpecificity;

    if (shouldHandoff) {
      return {
        to_agent: targetManifest.agent_id,
        reason: `This question is better suited for ${targetManifest.display_name}`
      };
    }
  }

  return undefined;
}
```

### Handoff Example

```typescript
// Student asks GamePlanAgent about essays
User: "Can you help me brainstorm my Common App essay?"

// GamePlanAgent detects essay-specific query
const handoff = detectHandoff("Can you help me brainstorm...", registry);
// → { to_agent: 'essay-agent', reason: 'This question is better suited for Essay Strategy Specialist' }

// Frontend can:
// 1. Auto-route to EssayAgent silently
// 2. Show suggestion: "Would you like me to connect you with Essay Strategy Specialist?"
// 3. Continue with GamePlanAgent but with lower specificity
```

---

## Session Management

### Session Structure

```typescript
interface IvyLevelSession {
  session_id: string;                   // e.g., 'ses_abc123'
  student_id: string;                   // e.g., 'huda-2025'
  messages: ChatCompletionMessageParam[]; // Conversation history
  context: StudentSessionContext;       // Student metadata
  current_agent: string;                // e.g., 'gameplan-agent'
  turn_count: number;                   // Number of turns
  created_at: Date;
  last_active: Date;
}

interface StudentSessionContext {
  student_id: string;
  student_name?: string;
  grade?: number;
  high_school?: string;
  // ... other student metadata
}
```

### Session Lifecycle

```typescript
// 1. Create new session
const session: IvyLevelSession = {
  session_id: generateSessionId(),
  student_id: 'huda-2025',
  messages: [],
  context: {
    student_id: 'huda-2025',
    student_name: 'Huda',
    grade: 12,
    high_school: 'Example High School',
  },
  current_agent: 'gameplan-agent',
  turn_count: 0,
  created_at: new Date(),
  last_active: new Date(),
};

// 2. Each turn updates session
const updatedSession = agent.updateSession(session, userMessage, response);
// → Appends user message + assistant response to messages[]
// → Increments turn_count
// → Updates last_active

// 3. Session persists across API calls (stateless API)
// Client sends session_id with each request
// Server retrieves session from cache/database
// Server updates session after agent execution
// Server returns updated session to client
```

---

## Agent Types

### Current Agents (10 Total)

| Agent ID | Display Name | Category | Primary Intents | Intelligence Types (Domain-Specific) |
|----------|--------------|----------|-----------------|--------------------------------------|
| `gameplan-agent` | Jenny - Game Plan Advisor | gameplan | Strategy, timeline, planning | TYPE-001 (Game Plan Synthesis), TYPE-002 (Weak Spot Prioritization), TYPE-003 (Timeline Architecture) |
| `ecs-agent` | Jenny - Extracurriculars Specialist | extracurriculars | Activities, leadership | TYPE-013 (EC Portfolio Optimization), TYPE-014 (Leadership Development) |
| `awards-agent` | Jenny - Awards Specialist | awards | Competitions, honors | TYPE-022 (Award Orchestration), TYPE-023 (Award Arbitrage), TYPE-024 (Tier Classification), TYPE-025 (Content Recycling), TYPE-026 (70/20/10 Rule), TYPE-027 (Quick Wins), TYPE-017 (Task Multiplication) |
| `programs-agent` | Jenny - Summer Programs Specialist | programs | Summer opportunities | TYPE-028 (Program Selection Matrix), TYPE-029 (Application Strategy) |
| `college-agent` | Jenny - College List Specialist | colleges | College selection, fit | TYPE-004 (College Fit Analysis), TYPE-006 (Reach/Match/Safety Calibration) |
| `essay-agent` | Jenny - Essay Strategy Specialist | essays | Writing, brainstorming | TYPE-007 (Narrative Architecture), TYPE-008 (Story Arc Construction) |
| `admissions-agent` | Jenny - Admissions Specialist | admissions | AO perspectives, process | TYPE-015 (AO Perspective Modeling), TYPE-016 (Admissions Process Intelligence) |
| `weekly-execution-agent` | Jenny - Weekly Execution Specialist | execution | Weekly tasks, JTBD | TYPE-019 (JTBD Tracking), TYPE-020 (Opportunity Pipeline) |
| `scholarship-agent` | Jenny - Scholarship Specialist | scholarships | Financial aid, merit | TYPE-023 (Award Arbitrage - reused), TYPE-025 (Content Recycling - reused) |
| `assessment-agent` | Jenny - Assessment Specialist | assessment | Diagnostic, comprehensive | TYPE-009 (Profile Assessment), TYPE-010 (Strength Discovery) |

**Note:** All agents inherit the 7 Universal Intelligence Types (TYPE-005, TYPE-010, TYPE-011, TYPE-012, TYPE-018, TYPE-020, TYPE-021) in addition to their domain-specific types.

### Agent-Specific System Prompts

Each agent overrides `buildSystemPrompt()` to add domain expertise:

```typescript
// GamePlanAgent example
protected buildSystemPrompt(context: AgentExecutionContext): string {
  const basePrompt = super.buildSystemPrompt(context);

  return `${basePrompt}

Your Specialty: College Application Game Planning

You excel at:
- Creating clear, actionable application timelines
- Identifying profile gaps and opportunities
- Prioritizing activities based on impact
- Breaking down complex plans into manageable steps
- Recommending proven tactics from coaching IP library

Your Communication Style:
- Start with big picture, then dive into details
- Use numbered lists for timelines and action items
- Highlight what's most urgent (next 1-2 weeks)
- Be specific: "Complete X by Y date" not "work on X"
- Connect recommendations to specific colleges when relevant

Tool Usage Guidelines:
- ALWAYS call get_nsm_dashboard for profile status
- Use get_relevant_tactics for time management, overwhelm, procrastination
- Use get_college_list when discussing application targets
- NEVER mention specific essay topics unless returned by tools
- NEVER mention teacher names unless from database`;
}
```

---

## Integration Points

### 1. v17.0 Orchestration Integration

**Foundation Agents** work alongside **v17.0 StrategyOrchestrator**:

```typescript
// v17.0 orchestration pipeline
const orchestrator = new StrategyOrchestrator();

// Step 1: Intent classification (v17.0)
const intent = await orchestrator.intentRouter.classifyIntent(query, context);

// Step 2: Route to strategy node (v17.0)
const strategyNode = await orchestrator.intentRouter.routeToStrategyNode(intent);

// Step 3: Context engineering (v17.0)
const context = await orchestrator.contextPipeline.constructOptimalContext(...);

// Step 4: Execute strategy (v17.3 uses cat-3 composeEQResponse)
const eqResult = await composeEQResponse({ message, studentId, sessionId });

// Step 5: Reflection loop (v17.0)
const reflection = await orchestrator.reflectionService.generateWithReflection(...);

// Foundation Agents can be invoked as part of strategy execution
// OR used independently for tool-based data access
```

### 2. cat-3 compose-eq Integration

**Foundation Agents** can leverage **cat-3** for EQ-enhanced responses:

```typescript
// Option 1: Foundation Agent generates response directly
const response = await agent.execute(context, registry);

// Option 2: Foundation Agent + cat-3 post-processing
const toolData = await agent.execute(context, registry);
const eqEnhancedResponse = await composeEQResponse({
  message: context.user_message,
  studentId: context.session.student_id,
  sessionId: context.session.session_id,
  contextData: toolData.response.hits,  // Pass tool data as context
});
```

### 3. Frontend Integration

**Expected API Flow**:

```typescript
// POST /api/v14.0/agent-chat
{
  student_id: "huda-2025",
  session_id: "ses_abc123",  // optional, server creates if missing
  message: "What are my extracurriculars?",
  agent_id: "ecs-agent"  // optional, auto-route if missing
}

// Response
{
  success: true,
  data: {
    session_id: "ses_abc123",
    agent_used: "ecs-agent",
    response: {
      answer: "You have 5 extracurricular activities...",
      chips: [{ kind: 'evidence', text: 'Extracurriculars Database' }],
      hits: [...],
      handoff: undefined,
      debug: { agent_id: 'ecs-agent', tools_called: ['get_extracurriculars'], took_ms: 1234 }
    }
  }
}
```

---

## Performance Characteristics

### Latency Breakdown

| Component | Time (ms) | Percentage |
|-----------|-----------|------------|
| Pattern matching (routing) | 1-2 | <1% |
| System prompt building | 1-2 | <1% |
| OpenAI function calling (1 iteration) | 800-1200 | 40-50% |
| Tool execution (SQL query) | 50-200 | 5-10% |
| OpenAI final response | 800-1200 | 40-50% |
| **Total** | **1700-2600** | **100%** |

**Average end-to-end**: ~2 seconds per query

### Token Usage

| Component | Tokens | Cost (at gpt-4o-mini rates) |
|-----------|--------|------------------------------|
| System prompt | 300-500 | $0.00015-$0.00025 |
| Conversation history (5 turns) | 1000-1500 | $0.0005-$0.00075 |
| User query | 20-100 | $0.00001-$0.00005 |
| Tool results | 500-1000 | $0.00025-$0.0005 |
| Response generation | 200-600 | $0.0001-$0.0003 |
| **Total per query** | **2020-3700** | **$0.001-$0.00185** |

**Monthly cost estimate** (10,000 queries/month): **$10-$18.50**

### Scaling Characteristics

- **Concurrent Users**: 100+ (Node.js async I/O)
- **Database Load**: ~1-3 SQL queries per agent execution
- **OpenAI Rate Limits**: 3,500 RPM (gpt-4o-mini tier 2)
- **Memory**: ~50MB per agent registry instance
- **CPU**: Minimal (I/O bound, not CPU bound)

---

## Future Enhancements

### Planned Improvements

1. **LLM-Based Routing** (vs pattern matching)
   - Use GPT-3.5-turbo to classify intent → agent
   - More accurate routing for complex queries
   - Current: `agentRegistry.routeQuery()` uses patterns
   - Future: `agentRegistry.routeQueryWithLLM()` uses IntentRouterService

2. **Multi-Agent Collaboration**
   - Allow agents to consult each other
   - Example: GamePlanAgent asks EssayAgent for essay timeline
   - Current: Handoff only (sequential)
   - Future: Parallel agent execution + synthesis

3. **Agent Memory**
   - Agents remember student preferences
   - Example: "You mentioned wanting to focus on CS programs..."
   - Current: Session-based memory only
   - Future: Long-term memory store (Pinecone)

4. **Fine-Tuned Agent Models**
   - Train agent-specific fine-tuned models
   - Example: EssayAgent uses `jenny_essay_specialist` model
   - Current: All agents use `jenny_v9_eq`
   - Future: Per-agent fine-tuned models

5. **Proactive Agents**
   - Agents initiate conversations based on student state
   - Example: "I noticed you haven't updated your EC hours this week..."
   - Current: Reactive only (student initiates)
   - Future: Proactive triggers

---

## References

**Code Locations**:
- Core: `services/agent-framework/src/core/`
- Agents: `services/agent-framework/src/agents/`
- Tools: `services/agent-framework/src/tools/`
- Types: `services/agent-framework/src/core/types.ts`

**Related Specs**:
- Assessment Agent Spec: `docs/ASSESSMENT_AGENT_SPEC.md` (to be created)
- Master Tech Spec: `docs/MASTER_PROD_TECH_SPEC.md`
- Backlog: `docs/BACKLOG_CRITICAL_ITEMS.md`

**Created**: 2025-10-28 (Reverse engineered from production code)
**Author**: Engineering Team
**Status**: Production-ready, documented retroactively
