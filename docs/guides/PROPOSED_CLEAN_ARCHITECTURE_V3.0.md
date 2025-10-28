# IvyLevel Platform - Proposed Clean Architecture v3.0
# First Principles Redesign - Agentic AI Coaching Platform

**Document Version:** 1.0
**Created:** 2025-10-20
**Status:** 🎯 PROPOSED (Not Yet Implemented)
**Purpose:** Clean, modular, scalable architecture based on first principles

---

## Executive Summary

### The Problem with Current v2.1

Our current architecture has become **fragmented and patched** due to incremental additive building:
- v14 Foundation (Jenny-Old Huda) → v1.0 (Multi-Agent) → v2.0 (Frontend) → v2.1 (Zero Hallucination)
- Components scattered across layers without clear separation of concerns
- Naming conventions inconsistent (intentRouter.ts, agentChat-utfa.ts, compose.ts)
- Difficult to understand data flow and component responsibilities
- Hard to extend horizontally (new agents) or vertically (new capabilities)

### The Vision for v3.0

**A clean, first-principles agentic AI architecture with:**

1. **Clear Foundational Layers** - Perception → Cognition → Action (from reference architecture)
2. **Modular Components** - Each component has single responsibility, composable
3. **Simple Naming** - Functional, descriptive names that reveal purpose
4. **Horizontal Scalability** - Easy to add new agents, coaches, students
5. **Vertical Scalability** - Easy to add new capabilities (monitoring, training, evaluation)
6. **Continuous Learning** - Built-in feedback loops for improvement
7. **Knowledge Moat Integration** - Structured coaching intelligence at core

---

## Table of Contents

1. [Foundational Principles](#foundational-principles)
2. [Architecture Overview](#architecture-overview)
3. [Layer 1: Perception Layer](#layer-1-perception-layer)
4. [Layer 2: Knowledge Layer](#layer-2-knowledge-layer)
5. [Layer 3: Cognition Layer](#layer-3-cognition-layer)
6. [Layer 4: Action Layer](#layer-4-action-layer)
7. [Layer 5: Interface Layer](#layer-5-interface-layer)
8. [Cross-Cutting Systems](#cross-cutting-systems)
9. [Naming Conventions](#naming-conventions)
10. [Migration Path from v2.1](#migration-path-from-v21)
11. [Comparison: Current vs Proposed](#comparison-current-vs-proposed)

---

## Foundational Principles

### Principle 1: Separation of Concerns

**Each layer has ONE job:**
- **Perception** - Understand student context (who, where, when, what stage)
- **Knowledge** - Retrieve relevant coaching intelligence
- **Cognition** - Decide what to say/do based on context + knowledge
- **Action** - Execute the decision (send message, create task, update state)
- **Interface** - Present information to user

### Principle 2: Single Source of Truth

**Every data type has ONE canonical source:**
- Student facts → PostgreSQL `kb_items` table
- Coaching intelligence → PostgreSQL `coaching_knowledge_base` table
- Conversation history → PostgreSQL `conversations` table
- Agent decisions → PostgreSQL `agent_decisions` table

### Principle 3: Composability

**Every component is:**
- Independently testable
- Reusable across agents
- Replaceable without breaking system
- Stateless where possible

### Principle 4: Explicit Over Implicit

**Make system behavior obvious:**
- Clear function names that describe purpose
- Explicit data flow (no hidden side effects)
- Typed interfaces for all components
- Documented contracts between layers

### Principle 5: Continuous Learning

**System improves automatically:**
- Every agent decision logged with context
- Coaching outcomes tracked (student progress)
- Successful patterns extracted and stored
- Failed patterns identified and avoided

---

## Architecture Overview

### Five-Layer System

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 5: INTERFACE LAYER                        │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐               │
│  │   Student   │  │    Coach    │  │    Admin     │               │
│  │  Dashboard  │  │  Dashboard  │  │  Dashboard   │               │
│  └─────────────┘  └─────────────┘  └──────────────┘               │
│                                                                     │
│  Components: ViewRenderer, NotificationManager, AnalyticsDashboard │
└─────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ Rendered Output
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 4: ACTION LAYER                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Response    │  │    State     │  │   Event      │             │
│  │  Executor    │  │  Updater     │  │  Emitter     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  Purpose: Execute agent decisions in the real world                │
└─────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ Decisions
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: COGNITION LAYER                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    AGENT ORCHESTRATOR                        │  │
│  │  (Intent Router → Agent Selector → Decision Maker)           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ▲                                     │
│                               │                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │Assessment│  │ GamePlan │  │  Essay   │  │  More... │           │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agents  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                     │
│  Purpose: Decide what to do based on context + knowledge           │
└─────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ Context + Knowledge
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: KNOWLEDGE LAYER                         │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │  Student Facts  │  │    Coaching      │  │   Temporal      │   │
│  │   Retriever     │  │   Intelligence   │  │   Context       │   │
│  │                 │  │    Retriever     │  │   Resolver      │   │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘   │
│                                                                     │
│  Purpose: Retrieve relevant facts + coaching knowledge             │
└─────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ Raw Input
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: PERCEPTION LAYER                        │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Message    │  │   Student    │  │   Session    │             │
│  │   Parser     │  │   Context    │  │   State      │             │
│  │              │  │   Extractor  │  │   Detector   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  Purpose: Understand who is asking, what they're asking, context   │
└─────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ HTTP Request
                               ▼
                        [Student/Coach/Admin]
```

### Cross-Cutting Systems (Vertical)

These systems operate across all layers:

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   MONITORING     │  │    TRAINING      │  │   EVALUATION     │
│     SYSTEM       │  │     SYSTEM       │  │     SYSTEM       │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ - Logs           │  │ - Pattern        │  │ - Quality        │
│ - Metrics        │  │   Extraction     │  │   Scoring        │
│ - Alerts         │  │ - Continuous     │  │ - A/B Testing    │
│ - Tracing        │  │   Learning       │  │ - Feedback       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Layer 1: Perception Layer

### Purpose
**Understand the incoming request** - who, what, when, where in student journey

### Components

#### 1.1 MessageParser
```typescript
// File: services/agent-framework/src/perception/MessageParser.ts

interface ParsedMessage {
  raw_text: string;
  intent_keywords: string[];
  entities: Entity[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'confused';
  urgency: 'low' | 'medium' | 'high';
  question_type: 'factual' | 'strategic' | 'emotional' | 'exploratory';
}

class MessageParser {
  parse(message: string): ParsedMessage;
}
```

**Responsibility:** Extract structured information from raw student message

**Current Equivalent:** Partial logic in `intentRouter.ts` (lines 50-100)

---

#### 1.2 StudentContextExtractor
```typescript
// File: services/agent-framework/src/perception/StudentContextExtractor.ts

interface StudentContext {
  student_id: string;
  coach_id: string;
  grade_level: number;
  current_week: number;
  weeks_remaining: number;
  journey_stage: 'assessment' | 'gameplan' | 'execution' | 'essays' | 'applications';
  rubric_score: number;
  gap_to_target: number;
}

class StudentContextExtractor {
  async extract(studentId: string, coachId: string): Promise<StudentContext>;
}
```

**Responsibility:** Load student's current position in journey from database

**Current Equivalent:** Scattered across multiple resolvers in `resolverTools.ts`

---

#### 1.3 SessionStateDetector
```typescript
// File: services/agent-framework/src/perception/SessionStateDetector.ts

interface SessionState {
  is_new_conversation: boolean;
  previous_context: string | null;
  conversation_turn: number;
  active_agent: string | null;
  pending_tasks: Task[];
}

class SessionStateDetector {
  async detect(sessionId: string): Promise<SessionState>;
}
```

**Responsibility:** Determine conversation state (new vs ongoing, context from previous turns)

**Current Equivalent:** Logic in `agentChat-utfa.ts` (lines 200-300)

---

### Perception Layer Output

```typescript
interface PerceptionOutput {
  parsed_message: ParsedMessage;
  student_context: StudentContext;
  session_state: SessionState;
  timestamp: Date;
}
```

This structured output flows to **Knowledge Layer** for retrieval.

---

## Layer 2: Knowledge Layer

### Purpose
**Retrieve relevant facts and coaching intelligence** based on perception output

### Components

#### 2.1 StudentFactsRetriever
```typescript
// File: services/agent-framework/src/knowledge/StudentFactsRetriever.ts

interface StudentFacts {
  vitals: VitalFacts;           // Current state (GPA, test scores, awards, etc.)
  activities: Activity[];        // ECs, programs, awards
  temporal: TemporalContext;     // Past → present → planned
  outcomes: Outcome[];           // Verified achievements
}

class StudentFactsRetriever {
  async retrieve(context: StudentContext): Promise<StudentFacts>;
}
```

**Responsibility:** Query database for student's factual data (CAT-1)

**Current Equivalent:** `resolverTools.ts` - 105 temporal resolvers

---

#### 2.2 CoachingIntelligenceRetriever
```typescript
// File: services/agent-framework/src/knowledge/CoachingIntelligenceRetriever.ts

interface CoachingIntelligence {
  archetype: StudentArchetype;           // Which archetype matches this student
  playbook: CoachingPlaybook;            // Strategies for this archetype
  frameworks: CoachingFramework[];       // Applicable frameworks
  tactics: CoachingTactic[];             // Micro-tactics to use
  eq_patterns: EQPattern[];              // Communication patterns
  examples: CoachingExample[];           // Similar student examples
}

class CoachingIntelligenceRetriever {
  async retrieve(
    context: StudentContext,
    message: ParsedMessage
  ): Promise<CoachingIntelligence>;
}
```

**Responsibility:** Retrieve coaching intelligence from Knowledge Moat

**Current Equivalent:** Scattered across multiple tables (moat_*, coaching_frameworks, etc.)

---

#### 2.3 TemporalContextResolver
```typescript
// File: services/agent-framework/src/knowledge/TemporalContextResolver.ts

interface TemporalContext {
  past: HistoricalData;      // What student did (verified)
  present: CurrentState;      // What student is doing (in-progress)
  planned: PlannedActions;    // What student plans to do
  recommended: Recommendations; // What coach recommends
}

class TemporalContextResolver {
  async resolve(studentId: string, week: number): Promise<TemporalContext>;
}
```

**Responsibility:** Resolve temporal dimension (past vs present vs future)

**Current Equivalent:** `resolverTools.ts` temporal views (v_awards_won, v_awards_planned, etc.)

---

### Knowledge Layer Output

```typescript
interface KnowledgeOutput {
  student_facts: StudentFacts;
  coaching_intelligence: CoachingIntelligence;
  temporal_context: TemporalContext;
  retrieval_metadata: {
    sources: string[];
    confidence: number;
    retrieved_at: Date;
  };
}
```

This structured knowledge flows to **Cognition Layer** for decision-making.

---

## Layer 3: Cognition Layer

### Purpose
**Decide what to say/do** based on perception + knowledge

### Components

#### 3.1 AgentOrchestrator
```typescript
// File: services/agent-framework/src/cognition/AgentOrchestrator.ts

class AgentOrchestrator {
  private intentRouter: IntentRouter;
  private agentSelector: AgentSelector;
  private decisionMaker: DecisionMaker;

  async process(
    perception: PerceptionOutput,
    knowledge: KnowledgeOutput
  ): Promise<AgentDecision> {

    // Step 1: Route to intent category
    const intent = await this.intentRouter.route(perception.parsed_message);

    // Step 2: Select appropriate agent
    const agent = await this.agentSelector.select(intent, perception.student_context);

    // Step 3: Make decision using agent
    const decision = await this.decisionMaker.decide(
      agent,
      perception,
      knowledge
    );

    return decision;
  }
}
```

**Responsibility:** Coordinate intent routing → agent selection → decision making

**Current Equivalent:** `agentChat-utfa.ts` orchestration logic

---

#### 3.2 IntentRouter
```typescript
// File: services/agent-framework/src/cognition/IntentRouter.ts

type IntentCategory =
  | 'assessment'
  | 'gameplan'
  | 'extracurriculars'
  | 'awards'
  | 'summer_programs'
  | 'college_list'
  | 'essays'
  | 'admissions'
  | 'weekly_execution'
  | 'scholarships';

class IntentRouter {
  async route(message: ParsedMessage): Promise<IntentCategory>;
}
```

**Responsibility:** Classify user message into intent category

**Current Equivalent:** `intentRouter.ts` classification logic

---

#### 3.3 AgentSelector
```typescript
// File: services/agent-framework/src/cognition/AgentSelector.ts

class AgentSelector {
  private agentRegistry: Map<IntentCategory, SpecialistAgent>;

  async select(
    intent: IntentCategory,
    context: StudentContext
  ): Promise<SpecialistAgent> {

    // Get base agent for intent
    const agent = this.agentRegistry.get(intent);

    // Customize agent with archetype-specific intelligence
    const customized = await this.customizeForArchetype(
      agent,
      context.archetype
    );

    return customized;
  }
}
```

**Responsibility:** Select and customize specialist agent

**Current Equivalent:** `AgentRegistry.ts` + manual agent selection

---

#### 3.4 DecisionMaker
```typescript
// File: services/agent-framework/src/cognition/DecisionMaker.ts

interface AgentDecision {
  response_text: string;
  response_type: 'answer' | 'question' | 'recommendation' | 'task';
  confidence: number;
  reasoning: string;
  sources: string[];
  next_actions: Action[];
  metadata: {
    agent_used: string;
    llm_model: string;
    tokens_used: number;
    latency_ms: number;
  };
}

class DecisionMaker {
  async decide(
    agent: SpecialistAgent,
    perception: PerceptionOutput,
    knowledge: KnowledgeOutput
  ): Promise<AgentDecision>;
}
```

**Responsibility:** Execute agent logic to make decision

**Current Equivalent:** `BaseAgent.ts` execute() method

---

### Specialist Agents

Each agent is a **stateless decision function**:

```typescript
// File: services/agent-framework/src/cognition/agents/AssessmentAgent.ts

class AssessmentAgent implements SpecialistAgent {
  name = 'assessment';

  async execute(
    perception: PerceptionOutput,
    knowledge: KnowledgeOutput
  ): Promise<AgentDecision> {

    // Use coaching intelligence for this archetype
    const playbook = knowledge.coaching_intelligence.playbook;
    const frameworks = knowledge.coaching_intelligence.frameworks;

    // Build LLM prompt with zero-hallucination instructions
    const prompt = this.buildPrompt(playbook, frameworks, knowledge.student_facts);

    // Call LLM
    const response = await this.callLLM(prompt);

    // Validate response against facts
    const validated = this.validateResponse(response, knowledge.student_facts);

    return {
      response_text: validated.text,
      response_type: validated.type,
      confidence: validated.confidence,
      reasoning: validated.reasoning,
      sources: validated.sources,
      next_actions: validated.next_actions,
      metadata: { ... }
    };
  }
}
```

**Current Equivalent:** Individual agent files (AssessmentAgent.ts, GamePlanAgent.ts, etc.)

---

## Layer 4: Action Layer

### Purpose
**Execute agent decisions** in the real world

### Components

#### 4.1 ResponseExecutor
```typescript
// File: services/agent-framework/src/action/ResponseExecutor.ts

class ResponseExecutor {
  async execute(decision: AgentDecision): Promise<ExecutionResult> {

    // Compose final response with EQ humanization
    const humanized = await this.humanizeResponse(decision.response_text);

    // Store in conversation history
    await this.storeConversationTurn(decision, humanized);

    // Return to user
    return {
      response: humanized,
      metadata: decision.metadata
    };
  }

  private async humanizeResponse(text: string): Promise<string> {
    // Apply Jenny's voice/EQ patterns
  }
}
```

**Responsibility:** Compose and deliver final response to user

**Current Equivalent:** `compose.ts` composition logic

---

#### 4.2 StateUpdater
```typescript
// File: services/agent-framework/src/action/StateUpdater.ts

class StateUpdater {
  async update(decision: AgentDecision, context: StudentContext): Promise<void> {

    // Update session state
    await this.updateSession(decision);

    // Update student progress if applicable
    if (decision.next_actions.includes('complete_task')) {
      await this.updateStudentProgress(context.student_id);
    }

    // Update agent conversation history
    await this.updateAgentHistory(decision);
  }
}
```

**Responsibility:** Update system state based on agent decision

**Current Equivalent:** Scattered database updates across agents

---

#### 4.3 EventEmitter
```typescript
// File: services/agent-framework/src/action/EventEmitter.ts

type SystemEvent =
  | 'student_onboarded'
  | 'assessment_completed'
  | 'gameplan_generated'
  | 'task_completed'
  | 'milestone_reached'
  | 'intervention_needed';

class EventEmitter {
  async emit(event: SystemEvent, payload: any): Promise<void> {

    // Emit event to autonomous agents
    await this.notifyAutonomousAgents(event, payload);

    // Emit event to monitoring system
    await this.notifyMonitoring(event, payload);

    // Emit event to training system (for continuous learning)
    await this.notifyTraining(event, payload);
  }
}
```

**Responsibility:** Emit events for autonomous agents and cross-cutting systems

**Current Equivalent:** Manual event emission in agents (e.g., AssessmentAgent emits `assessment_completed`)

---

## Layer 5: Interface Layer

### Purpose
**Present information to users** (students, coaches, admins)

### Components

#### 5.1 ViewRenderer
```typescript
// File: services/agent-framework/src/interface/ViewRenderer.ts

interface RenderedView {
  type: 'chat_message' | 'dashboard_widget' | 'notification' | 'report';
  content: any;
  metadata: {
    requires_action: boolean;
    priority: 'low' | 'medium' | 'high';
  };
}

class ViewRenderer {
  async render(
    executionResult: ExecutionResult,
    userRole: 'student' | 'coach' | 'admin'
  ): Promise<RenderedView> {

    // Render based on user role
    switch (userRole) {
      case 'student':
        return this.renderStudentView(executionResult);
      case 'coach':
        return this.renderCoachView(executionResult);
      case 'admin':
        return this.renderAdminView(executionResult);
    }
  }
}
```

**Responsibility:** Render appropriate view for user role

**Current Equivalent:** Frontend components in `unified-frontend/apps/unified-app/`

---

#### 5.2 NotificationManager
```typescript
// File: services/agent-framework/src/interface/NotificationManager.ts

class NotificationManager {
  async notify(
    userId: string,
    notification: Notification
  ): Promise<void> {

    // Send in-app notification
    await this.sendInApp(userId, notification);

    // Send email if high priority
    if (notification.priority === 'high') {
      await this.sendEmail(userId, notification);
    }

    // Send SMS if urgent
    if (notification.urgent) {
      await this.sendSMS(userId, notification);
    }
  }
}
```

**Responsibility:** Send notifications via multiple channels

**Current Equivalent:** Not implemented (future feature)

---

#### 5.3 AnalyticsDashboard
```typescript
// File: services/agent-framework/src/interface/AnalyticsDashboard.ts

class AnalyticsDashboard {
  async renderDashboard(
    coachId: string,
    timeRange: DateRange
  ): Promise<DashboardData> {

    return {
      student_progress: await this.getStudentProgress(coachId, timeRange),
      agent_performance: await this.getAgentPerformance(coachId, timeRange),
      coaching_effectiveness: await this.getCoachingEffectiveness(coachId, timeRange),
      system_health: await this.getSystemHealth(timeRange)
    };
  }
}
```

**Responsibility:** Render analytics dashboard for coaches/admins

**Current Equivalent:** Basic NSM dashboard (no coach-level analytics)

---

## Cross-Cutting Systems

### Monitoring System

**Purpose:** Track system health, performance, errors

```typescript
// File: services/agent-framework/src/monitoring/MonitoringSystem.ts

class MonitoringSystem {
  // Logs
  async logEvent(event: SystemEvent, context: any): Promise<void>;

  // Metrics
  async recordMetric(metric: string, value: number): Promise<void>;

  // Alerts
  async triggerAlert(alert: Alert): Promise<void>;

  // Tracing
  async trace(traceId: string, span: Span): Promise<void>;
}
```

**Components:**
- **Logger:** Structured logging (JSON format)
- **MetricsCollector:** Agent latency, token usage, error rates
- **AlertManager:** Threshold-based alerts (e.g., >5s latency, >5% errors)
- **DistributedTracer:** Request flow across layers

**Current Equivalent:** Basic logging via `createLogger()` in observability package

---

### Training System

**Purpose:** Continuous learning from coaching outcomes

```typescript
// File: services/agent-framework/src/training/TrainingSystem.ts

class TrainingSystem {
  // Pattern extraction
  async extractPatterns(
    conversations: Conversation[],
    outcomes: Outcome[]
  ): Promise<Pattern[]>;

  // Continuous learning
  async learn(
    newData: CoachingSession[]
  ): Promise<void> {

    // 1. Extract new patterns
    const patterns = await this.extractPatterns(newData);

    // 2. Validate patterns (seen in 3+ students)
    const validated = await this.validatePatterns(patterns);

    // 3. Store in coaching_knowledge_base
    await this.storePatterns(validated);

    // 4. Update agent playbooks
    await this.updatePlaybooks(validated);
  }
}
```

**Components:**
- **PatternExtractor:** Identify successful coaching patterns
- **Validator:** Validate patterns across multiple students
- **PlaybookUpdater:** Update agent playbooks with new patterns
- **ArchetypeClassifier:** Classify new students into archetypes

**Current Equivalent:** Manual extraction (Jenny's 11 students extracted manually)

---

### Evaluation System

**Purpose:** Quality scoring, A/B testing, feedback collection

```typescript
// File: services/agent-framework/src/evaluation/EvaluationSystem.ts

class EvaluationSystem {
  // Quality scoring
  async scoreResponse(
    decision: AgentDecision,
    studentFeedback: Feedback
  ): Promise<QualityScore>;

  // A/B testing
  async runABTest(
    variantA: AgentPlaybook,
    variantB: AgentPlaybook,
    studentCohort: string[]
  ): Promise<ABTestResult>;

  // Feedback collection
  async collectFeedback(
    studentId: string,
    conversationId: string
  ): Promise<Feedback>;
}
```

**Components:**
- **QualityScorer:** Score response quality (accuracy, helpfulness, EQ)
- **ABTester:** Test different playbooks/tactics
- **FeedbackCollector:** Collect student/coach feedback
- **OutcomeTracker:** Track student outcomes (college admits, scholarships)

**Current Equivalent:** Not implemented (future feature)

---

## Naming Conventions

### General Principles

1. **Functional Names** - Name describes what it does (not how)
2. **Layer Prefixes** - Optional for clarity (e.g., `PerceptionMessageParser`)
3. **Verb Conventions:**
   - **Retrievers** → `retrieve()`
   - **Parsers** → `parse()`
   - **Extractors** → `extract()`
   - **Selectors** → `select()`
   - **Executors** → `execute()`
   - **Updaters** → `update()`
   - **Emitters** → `emit()`
   - **Renderers** → `render()`

### File Structure

```
services/agent-framework/src/
├── perception/
│   ├── MessageParser.ts
│   ├── StudentContextExtractor.ts
│   └── SessionStateDetector.ts
├── knowledge/
│   ├── StudentFactsRetriever.ts
│   ├── CoachingIntelligenceRetriever.ts
│   └── TemporalContextResolver.ts
├── cognition/
│   ├── AgentOrchestrator.ts
│   ├── IntentRouter.ts
│   ├── AgentSelector.ts
│   ├── DecisionMaker.ts
│   └── agents/
│       ├── AssessmentAgent.ts
│       ├── GamePlanAgent.ts
│       ├── EssayAgent.ts
│       └── ... (10 specialist agents)
├── action/
│   ├── ResponseExecutor.ts
│   ├── StateUpdater.ts
│   └── EventEmitter.ts
├── interface/
│   ├── ViewRenderer.ts
│   ├── NotificationManager.ts
│   └── AnalyticsDashboard.ts
├── monitoring/
│   ├── MonitoringSystem.ts
│   ├── Logger.ts
│   ├── MetricsCollector.ts
│   ├── AlertManager.ts
│   └── DistributedTracer.ts
├── training/
│   ├── TrainingSystem.ts
│   ├── PatternExtractor.ts
│   ├── Validator.ts
│   ├── PlaybookUpdater.ts
│   └── ArchetypeClassifier.ts
├── evaluation/
│   ├── EvaluationSystem.ts
│   ├── QualityScorer.ts
│   ├── ABTester.ts
│   ├── FeedbackCollector.ts
│   └── OutcomeTracker.ts
└── shared/
    ├── types/
    │   ├── Perception.types.ts
    │   ├── Knowledge.types.ts
    │   ├── Cognition.types.ts
    │   ├── Action.types.ts
    │   └── Interface.types.ts
    └── utils/
        ├── database.ts
        ├── llm.ts
        └── validation.ts
```

---

## Database Schema (Proposed v3.0)

### Core Tables

```sql
-- ============================================================================
-- PERCEPTION LAYER TABLES
-- ============================================================================

-- Student context (who, where, when in journey)
CREATE TABLE student_context (
  student_id VARCHAR(100) PRIMARY KEY,
  coach_id VARCHAR(100) REFERENCES coaches(coach_id),
  grade_level INTEGER NOT NULL,
  current_week INTEGER NOT NULL,
  weeks_remaining INTEGER NOT NULL,
  journey_stage TEXT NOT NULL, -- 'assessment' | 'gameplan' | 'execution' | 'essays' | 'applications'
  archetype_id TEXT REFERENCES student_archetypes(archetype_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session state (conversation history)
CREATE TABLE conversation_sessions (
  session_id UUID PRIMARY KEY,
  student_id VARCHAR(100) REFERENCES students(student_id),
  coach_id VARCHAR(100) REFERENCES coaches(coach_id),
  is_active BOOLEAN DEFAULT TRUE,
  turn_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_turns (
  turn_id UUID PRIMARY KEY,
  session_id UUID REFERENCES conversation_sessions(session_id),
  turn_number INTEGER NOT NULL,
  role TEXT NOT NULL, -- 'student' | 'agent'
  content TEXT NOT NULL,
  intent_category TEXT,
  agent_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- KNOWLEDGE LAYER TABLES
-- ============================================================================

-- Student facts (CAT-1 data)
-- EXISTING: kb_items, outcomes, vital_facts, temporal views (v_awards_won, etc.)

-- Coaching knowledge base (CAT-2/CAT-3 intelligence)
CREATE TABLE coaching_knowledge_base (
  knowledge_id UUID PRIMARY KEY,
  knowledge_type TEXT NOT NULL, -- 'archetype' | 'playbook' | 'framework' | 'tactic' | 'eq_pattern' | 'example'
  content JSONB NOT NULL,
  source_coach_id TEXT REFERENCES coaches(coach_id),
  validation_status TEXT NOT NULL, -- 'draft' | 'validated' | 'deprecated'
  validated_count INTEGER DEFAULT 0, -- How many students validated this
  effectiveness_score DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student archetypes
CREATE TABLE student_archetypes (
  archetype_id TEXT PRIMARY KEY,
  archetype_name TEXT NOT NULL,
  archetype_description TEXT,
  defining_characteristics JSONB NOT NULL,
  student_count INTEGER DEFAULT 0, -- How many students match this
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaching playbooks (strategies per archetype)
CREATE TABLE coaching_playbooks (
  playbook_id UUID PRIMARY KEY,
  archetype_id TEXT REFERENCES student_archetypes(archetype_id),
  agent_name TEXT NOT NULL, -- 'assessment' | 'gameplan' | etc.
  strategy_content JSONB NOT NULL,
  frameworks_to_use TEXT[], -- Array of framework IDs
  tactics_to_use TEXT[], -- Array of tactic IDs
  eq_patterns_to_use TEXT[], -- Array of EQ pattern IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COGNITION LAYER TABLES
-- ============================================================================

-- Agent decisions (what each agent decided)
CREATE TABLE agent_decisions (
  decision_id UUID PRIMARY KEY,
  session_id UUID REFERENCES conversation_sessions(session_id),
  turn_id UUID REFERENCES conversation_turns(turn_id),
  agent_name TEXT NOT NULL,
  intent_category TEXT NOT NULL,
  decision_content JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reasoning TEXT,
  sources TEXT[], -- Which KB items/coaching knowledge used
  llm_model TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACTION LAYER TABLES
-- ============================================================================

-- Execution results
CREATE TABLE execution_results (
  execution_id UUID PRIMARY KEY,
  decision_id UUID REFERENCES agent_decisions(decision_id),
  response_delivered TEXT NOT NULL,
  state_updates JSONB, -- What state was updated
  events_emitted TEXT[], -- Which events were emitted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MONITORING SYSTEM TABLES
-- ============================================================================

-- System logs
CREATE TABLE system_logs (
  log_id UUID PRIMARY KEY,
  level TEXT NOT NULL, -- 'info' | 'warn' | 'error'
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System metrics
CREATE TABLE system_metrics (
  metric_id UUID PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  tags JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System alerts
CREATE TABLE system_alerts (
  alert_id UUID PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'low' | 'medium' | 'high' | 'critical'
  message TEXT NOT NULL,
  context JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- TRAINING SYSTEM TABLES
-- ============================================================================

-- Extracted patterns (continuous learning)
CREATE TABLE extracted_patterns (
  pattern_id UUID PRIMARY KEY,
  pattern_type TEXT NOT NULL, -- 'framework' | 'tactic' | 'eq_pattern'
  pattern_content JSONB NOT NULL,
  source_sessions UUID[], -- Which sessions this was extracted from
  validation_count INTEGER DEFAULT 0,
  validation_status TEXT DEFAULT 'draft', -- 'draft' | 'validated' | 'rejected'
  effectiveness_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EVALUATION SYSTEM TABLES
-- ============================================================================

-- Quality scores
CREATE TABLE quality_scores (
  score_id UUID PRIMARY KEY,
  decision_id UUID REFERENCES agent_decisions(decision_id),
  accuracy_score DECIMAL(3,2),
  helpfulness_score DECIMAL(3,2),
  eq_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  scored_by TEXT, -- 'student' | 'coach' | 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student feedback
CREATE TABLE student_feedback (
  feedback_id UUID PRIMARY KEY,
  student_id VARCHAR(100) REFERENCES students(student_id),
  decision_id UUID REFERENCES agent_decisions(decision_id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student outcomes (long-term tracking)
CREATE TABLE student_outcomes (
  outcome_id UUID PRIMARY KEY,
  student_id VARCHAR(100) REFERENCES students(student_id),
  outcome_type TEXT NOT NULL, -- 'college_admit' | 'scholarship' | 'program_admit'
  outcome_details JSONB NOT NULL,
  outcome_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration Path from v2.1 to v3.0

### Phase 1: Refactor Perception Layer (1-2 weeks)

**Goal:** Extract perception logic into clean components

**Steps:**
1. Create `perception/` directory
2. Implement `MessageParser` (extract from `intentRouter.ts`)
3. Implement `StudentContextExtractor` (extract from `resolverTools.ts`)
4. Implement `SessionStateDetector` (extract from `agentChat-utfa.ts`)
5. Create `Perception.types.ts` with interfaces
6. Add unit tests for each component
7. Update `agentChat-utfa.ts` to use new perception components

**Success Metrics:**
- All perception logic in dedicated files
- 100% test coverage for perception components
- No regression in existing functionality

---

### Phase 2: Refactor Knowledge Layer (2-3 weeks)

**Goal:** Consolidate knowledge retrieval into clean components

**Steps:**
1. Create `knowledge/` directory
2. Implement `StudentFactsRetriever` (consolidate 105 resolvers)
3. Implement `CoachingIntelligenceRetriever` (consolidate moat_* queries)
4. Implement `TemporalContextResolver` (consolidate temporal views)
5. Create new database tables:
   - `coaching_knowledge_base` (migrate from moat_* tables)
   - `student_archetypes` (from JSON files)
   - `coaching_playbooks` (generated from archetypes + frameworks)
6. Create `Knowledge.types.ts` with interfaces
7. Add unit tests for each component
8. Update agents to use new knowledge components

**Success Metrics:**
- Single retrieval interface for all agents
- All coaching intelligence in database (not JSON files)
- 11 archetypes + 80 frameworks + 55 tactics in `coaching_knowledge_base`

---

### Phase 3: Refactor Cognition Layer (2-3 weeks)

**Goal:** Clean separation of orchestration, routing, selection, decision

**Steps:**
1. Create `cognition/` directory
2. Implement `AgentOrchestrator` (extract from `agentChat-utfa.ts`)
3. Implement `IntentRouter` (clean up `intentRouter.ts`)
4. Implement `AgentSelector` (extract from `AgentRegistry.ts`)
5. Implement `DecisionMaker` (extract from `BaseAgent.ts`)
6. Refactor all 10 agents to use new interfaces
7. Create `Cognition.types.ts` with interfaces
8. Add unit tests for orchestration
9. Update route handlers to use `AgentOrchestrator`

**Success Metrics:**
- Clear separation of routing → selection → decision
- All agents follow same interface
- Archetype-specific playbooks loaded automatically

---

### Phase 4: Refactor Action Layer (1-2 weeks)

**Goal:** Separate response execution, state updates, event emission

**Steps:**
1. Create `action/` directory
2. Implement `ResponseExecutor` (extract from `compose.ts`)
3. Implement `StateUpdater` (consolidate scattered updates)
4. Implement `EventEmitter` (consolidate event logic)
5. Create `Action.types.ts` with interfaces
6. Add unit tests for each component
7. Update orchestrator to use action components

**Success Metrics:**
- Single point for response composition
- All state updates tracked
- All events logged

---

### Phase 5: Refactor Interface Layer (1-2 weeks)

**Goal:** Clean view rendering for different user roles

**Steps:**
1. Create `interface/` directory
2. Implement `ViewRenderer` (role-based rendering)
3. Implement `NotificationManager` (multi-channel notifications)
4. Implement `AnalyticsDashboard` (coach/admin analytics)
5. Create `Interface.types.ts` with interfaces
6. Update frontend to use new rendering
7. Add unit tests

**Success Metrics:**
- Role-based view rendering working
- Notification system functional
- Analytics dashboard showing coach-level data

---

### Phase 6: Implement Cross-Cutting Systems (3-4 weeks)

**Goal:** Add monitoring, training, evaluation systems

**Steps:**
1. Create `monitoring/` directory
   - Implement `MonitoringSystem`, `Logger`, `MetricsCollector`, `AlertManager`
   - Add structured logging to all layers
   - Set up metrics dashboard
   - Configure alerts
2. Create `training/` directory
   - Implement `TrainingSystem`, `PatternExtractor`, `Validator`, `PlaybookUpdater`
   - Add continuous learning pipeline
   - Automate pattern extraction from new sessions
3. Create `evaluation/` directory
   - Implement `EvaluationSystem`, `QualityScorer`, `ABTester`, `FeedbackCollector`
   - Add quality scoring to all decisions
   - Set up A/B testing infrastructure
   - Implement feedback collection

**Success Metrics:**
- All layers instrumented with monitoring
- Continuous learning pipeline extracting patterns automatically
- Quality scores tracked for all agent decisions
- A/B testing framework functional

---

### Phase 7: Database Migration (1 week)

**Goal:** Migrate to clean v3.0 schema

**Steps:**
1. Create migration scripts for new tables
2. Migrate Jenny's 11 students from JSON to database
3. Migrate coaching intelligence to `coaching_knowledge_base`
4. Generate playbooks for 11 archetypes
5. Add indexes for performance
6. Run data validation

**Success Metrics:**
- All data in database (zero JSON files)
- All queries <100ms
- Zero data loss during migration

---

### Total Migration Timeline: 11-17 weeks (~3-4 months)

---

## Comparison: Current v2.1 vs Proposed v3.0

| Aspect | Current v2.1 | Proposed v3.0 |
|--------|-------------|---------------|
| **Architecture** | Fragmented, patched, additive | Clean, layered, modular |
| **Naming** | Inconsistent (`agentChat-utfa.ts`, `compose.ts`) | Functional, descriptive |
| **Perception** | Scattered across multiple files | Single layer with 3 components |
| **Knowledge** | 105 resolvers + scattered moat_* queries | Single retrieval interface |
| **Cognition** | Mixed orchestration + agent logic | Separate orchestration/routing/selection/decision |
| **Action** | Inline response composition | Dedicated execution layer |
| **Interface** | Basic chat UI only | Role-based rendering + analytics |
| **Monitoring** | Basic logging only | Full monitoring system |
| **Training** | Manual extraction | Automated continuous learning |
| **Evaluation** | None | Quality scoring + A/B testing + feedback |
| **Scalability** | Hard to add new agents/capabilities | Easy to extend horizontally/vertically |
| **Testing** | Some tests, hard to mock | 100% testable (stateless components) |
| **Documentation** | Multiple fragmented docs | Single source of truth |

---

## Summary

### Key Improvements in v3.0

1. **Clear Layering:** Perception → Knowledge → Cognition → Action → Interface
2. **Modular Components:** Each component has single responsibility
3. **Simple Naming:** Functional names that reveal purpose
4. **Horizontal Scalability:** Easy to add new agents (just implement `SpecialistAgent`)
5. **Vertical Scalability:** Easy to add new capabilities (monitoring, training, evaluation)
6. **Continuous Learning:** Automated pattern extraction and playbook updates
7. **Comprehensive Monitoring:** Logs, metrics, alerts, tracing
8. **Quality Assurance:** Quality scoring, A/B testing, feedback collection
9. **Zero Hallucination:** Maintained and enforced at knowledge + cognition layers
10. **Knowledge Moat:** Fully integrated, continuously growing

### Migration Strategy

- **Incremental:** Refactor one layer at a time (6 phases)
- **Parallel Development:** New v3.0 components alongside existing v2.1
- **Feature Flags:** Switch between v2.1 and v3.0 per agent
- **Zero Downtime:** Maintain production service throughout migration
- **Rollback Safety:** Can revert to v2.1 at any phase

### Next Steps

1. **Review this document** with team and get alignment
2. **Prioritize phases** based on business needs
3. **Start Phase 1** (Perception Layer refactor)
4. **Set up monitoring early** to track migration progress
5. **Celebrate wins** at each phase completion

---

**Document Status:** 🎯 PROPOSED (Awaiting Review)
**Estimated Implementation:** 3-4 months (11-17 weeks)
**Expected ROI:** 10x easier to extend, 100% test coverage, continuous learning
**Risk:** Medium (incremental migration reduces risk)
