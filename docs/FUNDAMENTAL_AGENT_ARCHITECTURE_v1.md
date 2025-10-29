# Universal Agent Architecture v1.0

**Document Version:** v1.0
**Last Updated:** 2025-10-28
**Status:** ✅ FOUNDATION SPECIFICATION
**Purpose:** Define the primitive building blocks for all agentic AI systems

---

## Overview

The **Universal Agent Architecture** defines a **7-layer primitive stack** that serves as the foundation for building any autonomous, intelligent agent. This architecture is domain-agnostic and can be specialized for any task (assessment, planning, execution, etc.).

### Core Philosophy

**Separation of Concerns:** Each primitive handles exactly one responsibility, making agents composable, testable, and maintainable.

**Data-Driven Intelligence:** Agents are configured with intelligence data, not hardcoded logic.

**Provenance Tracking:** Every output can be traced back to source intelligence or training data.

**Universal Applicability:** The same 7 primitives work for coaching agents, code generation agents, customer service agents, etc.

---

## 7-Layer Primitive Stack

```
┌─────────────────────────────────────────────────────────┐
│                    UNIVERSAL AGENT                       │
├─────────────────────────────────────────────────────────┤
│  Layer 7: MEMORY      - Store learnings                 │
│  Layer 6: VERIFICATION - Check quality/provenance        │
│  Layer 5: SYNTHESIS   - Combine results                  │
│  Layer 4: ACTION      - Execute tools/operations         │
│  Layer 3: PLANNING    - Decompose goal into phases       │
│  Layer 2: CONTEXT     - Load background data             │
│  Layer 1: PERCEPTION  - Classify intent                  │
└─────────────────────────────────────────────────────────┘
```

---

## Primitive Definitions

### Layer 1: Perceptor

**Purpose:** Classify incoming input into actionable intent + extract key features

**Interface:**
```typescript
interface Perceptor<Input, Intent> {
  perceive(input: Input): Promise<{
    intent: Intent;
    features: Record<string, any>;
    confidence: number;
  }>;
}
```

**Responsibilities:**
- Parse raw input (text, event, sensor data)
- Classify intent (e.g., "student_onboarded", "query_profile", "request_help")
- Extract features (entities, sentiment, urgency)
- Return confidence score

**Example Specializations:**
- `IntentPerceptor`: Classifies student queries
- `EventPerceptor`: Detects platform events
- `SentimentPerceptor`: Analyzes emotional state

---

### Layer 2: ContextLoader

**Purpose:** Load all relevant background data needed to process the intent

**Interface:**
```typescript
interface ContextLoader<Intent, Context> {
  loadContext(intent: Intent): Promise<Context>;
}
```

**Responsibilities:**
- Fetch student profile, prior sessions, preferences
- Load relevant intelligence (coaching frameworks, tactics)
- Retrieve historical interactions
- Aggregate into unified context object

**Example Specializations:**
- `CoachingContextLoader`: Loads student + coaching data
- `CodeContextLoader`: Loads codebase + documentation
- `CustomerContextLoader`: Loads purchase history + tickets

---

### Layer 3: Planner

**Purpose:** Decompose high-level goal into sequential phases or parallel tasks

**Interface:**
```typescript
interface Planner<Goal, Phase> {
  plan(goal: Goal, context?: any): Promise<Phase[]>;
}
```

**Responsibilities:**
- Break complex goal into manageable phases
- Determine phase order and dependencies
- Estimate duration and resources
- Select appropriate strategies/frameworks

**Example Specializations:**
- `AssessmentPlanner`: 4-phase assessment (Discovery → Narrative → Strategy → Time)
- `CodeGenerationPlanner`: (Requirements → Design → Implementation → Testing)
- `TripPlanner`: (Destination → Flights → Hotels → Activities)

---

### Layer 4: ToolExecutor

**Purpose:** Execute operations, call external APIs, use tools to accomplish phase objectives

**Interface:**
```typescript
interface ToolExecutor {
  registerTool(tool: Tool): void;
  executeTool(toolName: string, params: any): Promise<any>;
  executePhase(phase: Phase): Promise<PhaseResult>;
}

interface Tool {
  name: string;
  description: string;
  execute(params: any): Promise<any>;
}
```

**Responsibilities:**
- Manage registry of available tools
- Execute tools with proper error handling
- Return structured results

**Example Tools:**
- `ToneAdapterTool`: Apply coaching style to text
- `DatabaseQueryTool`: Fetch student data
- `LLMGenerationTool`: Generate coaching responses
- `APICallTool`: Call external services

---

### Layer 5: Synthesizer

**Purpose:** Combine phase results into coherent, unified output

**Interface:**
```typescript
interface Synthesizer<PhaseResults, Output> {
  synthesize(results: PhaseResults[]): Promise<Output>;
}
```

**Responsibilities:**
- Merge results from multiple phases
- Resolve conflicts or contradictions
- Format output according to specifications
- Apply final polish (grammar, tone, structure)

**Example Specializations:**
- `ResponseSynthesizer`: Combines coaching insights into single response
- `CodeSynthesizer`: Merges code snippets into working program
- `ReportSynthesizer`: Generates executive summary from data

---

### Layer 6: Verifier

**Purpose:** Check output quality, accuracy, and provenance before delivery

**Interface:**
```typescript
interface Verifier<Output> {
  verify(output: Output): Promise<{
    isValid: boolean;
    quality_score: number;
    provenance: string[];
    issues: string[];
  }>;
}
```

**Responsibilities:**
- Validate output meets quality standards
- Check all claims are grounded in source data
- Detect hallucinations or unsupported statements
- Track provenance (which intelligence was used)

**Example Checks:**
- Frameworks used are from approved list
- Rubric scores are within valid range (0-5)
- All student data referenced exists in database
- Tone matches target EQ profile

---

### Layer 7: MemoryStore

**Purpose:** Persist high-quality learnings for future sessions

**Interface:**
```typescript
interface MemoryStore<Output, Learning> {
  store(output: Output): Promise<void>;
  query(query: string): Promise<Learning[]>;
  updateFromFeedback(learning_id: string, feedback: any): Promise<void>;
}
```

**Responsibilities:**
- Extract reusable learnings from output
- Store in vector database or knowledge graph
- Enable semantic search for future retrieval
- Incorporate feedback to improve quality

**Example Implementations:**
- `PineconeMemoryStore`: Vector storage for coaching patterns
- `PostgresMemoryStore`: Relational storage for structured data
- `RedisMemoryStore`: Fast cache for recent interactions

---

## Universal Agent Execution Flow

```typescript
// Generic execution flow (applies to ANY agent)
async function executeAgent<Input, Goal, Context, Output>(
  input: Input,
  agent: UniversalAgent<Input, Goal, Context, Output>
): Promise<Output> {

  // Layer 1: PERCEIVE
  const { intent, features } = await agent.perceptor.perceive(input);
  console.log(`Intent: ${intent}, Confidence: ${features.confidence}`);

  // Layer 2: LOAD CONTEXT
  const context = await agent.contextLoader.loadContext(intent);
  console.log(`Context loaded: ${JSON.stringify(context)}`);

  // Layer 3: PLAN
  const goal = convertIntentToGoal(intent, features);
  const phases = await agent.planner.plan(goal, context);
  console.log(`Planned ${phases.length} phases`);

  // Layer 4: EXECUTE
  const phaseResults = [];
  for (const phase of phases) {
    const result = await agent.toolExecutor.executePhase(phase);
    phaseResults.push(result);
    console.log(`Completed phase ${phase.phase_number}: ${phase.phase_name}`);
  }

  // Layer 5: SYNTHESIZE
  const output = await agent.synthesizer.synthesize(phaseResults);
  console.log(`Synthesized output: ${output.length} chars`);

  // Layer 6: VERIFY
  const verification = await agent.verifier.verify(output);
  if (!verification.isValid) {
    throw new Error(`Verification failed: ${verification.issues.join(', ')}`);
  }
  console.log(`Verified output: quality ${verification.quality_score}/5.0`);

  // Layer 7: STORE LEARNINGS
  if (verification.quality_score >= 4.0) {
    await agent.memoryStore.store(output);
    console.log(`Stored learnings for future sessions`);
  }

  return output;
}
```

---

## Agent Specialization Pattern

### How to Build a Specialized Agent

**Step 1:** Define domain-specific types

```typescript
// Example: AssessmentAgent types
interface AssessmentInput {
  student_id: string;
  trigger: 'student_onboarded' | 'manual_assessment';
  class_year: number;
}

interface AssessmentGoal {
  conduct_27_layer_assessment: true;
  student_archetype: string;
}

interface CoachingContext {
  student_profile: StudentProfile;
  coaching_intelligence: CoachingIntelligence[];
  eq_profile: EQProfile;
}

interface AssessmentOutput {
  session_id: string;
  diagnostic: {...};
  rubric_scores: {...};
  identity_synthesis: {...};
  gap_analysis: {...};
}
```

**Step 2:** Implement domain-specific primitives

```typescript
// Specialized Perceptor
class IntentPerceptor implements Perceptor<AssessmentInput, Intent> {
  async perceive(input: AssessmentInput) {
    if (input.trigger === 'student_onboarded') {
      return {
        intent: 'run_initial_assessment',
        features: { is_new_student: true, class_year: input.class_year },
        confidence: 1.0
      };
    }
    // ... other intent classifications
  }
}

// Specialized Planner
class AssessmentPlanner implements Planner<AssessmentGoal, AssessmentPhase> {
  async plan(goal: AssessmentGoal, context: CoachingContext) {
    return [
      this.planDiscoveryPhase(context),
      this.planNarrativePhase(context),
      this.planStrategyPhase(context),
      this.planTimePhase(context)
    ];
  }
}
```

**Step 3:** Compose into specialized agent

```typescript
async function createAssessmentAgent(config: AssessmentAgentConfig) {
  // Load intelligence
  const coachingIntelligence = await loadCoachingIntelligence();
  const eqProfile = await loadEQProfile('jenny_duan');

  // Create primitives
  const perceptor = new IntentPerceptor();
  const contextLoader = new CoachingContextLoader(config.db);
  const planner = new AssessmentPlanner(coachingIntelligence, eqProfile);
  const toolExecutor = new DefaultToolExecutor();
  toolExecutor.registerTool(new ToneAdapterTool(eqProfile));
  const synthesizer = new ResponseSynthesizer();
  const verifier = new ResponseVerifier();
  const memoryStore = new PineconeMemoryStore('assessment_learnings');

  // Assemble agent
  return new UniversalAgent({
    perceptor,
    contextLoader,
    planner,
    toolExecutor,
    synthesizer,
    verifier,
    memoryStore
  });
}
```

**Step 4:** Execute agent

```typescript
const agent = await createAssessmentAgent(config);

const output = await agent.execute({
  student_id: 'huda-2025',
  trigger: 'student_onboarded',
  class_year: 11,
  current_week: 1
});

console.log(`Assessment complete: ${output.assessment_complete}`);
console.log(`Rubric total: ${output.rubric_scores.total}/25`);
console.log(`Identity: ${output.identity_synthesis.identity_fusion}`);
```

---

## Benefits of Universal Architecture

### 1. Composability

Primitives can be mixed and matched for different tasks:
```typescript
// Same ContextLoader used by multiple agents
const sharedContextLoader = new CoachingContextLoader(db);

const assessmentAgent = createAgent({ contextLoader: sharedContextLoader, ... });
const gamePlanAgent = createAgent({ contextLoader: sharedContextLoader, ... });
const weeklyAgent = createAgent({ contextLoader: sharedContextLoader, ... });
```

### 2. Testability

Each primitive can be tested independently:
```typescript
// Unit test for Planner
describe('AssessmentPlanner', () => {
  it('should generate 4 phases', async () => {
    const planner = new AssessmentPlanner(mockIntelligence, mockEQ);
    const phases = await planner.plan(mockGoal, mockContext);
    expect(phases).toHaveLength(4);
    expect(phases[0].phase_name).toBe('discovery');
  });
});
```

### 3. Observability

Each layer logs progress, enabling debugging:
```
[Perceptor] Intent: run_initial_assessment, Confidence: 1.0
[ContextLoader] Loaded context for student huda-2025
[Planner] Planned 4 phases: discovery, narrative, strategy, time
[ToolExecutor] Executing phase 1: discovery
[ToolExecutor] Completed phase 1: discovery (10 minutes)
[Synthesizer] Synthesized output: 2,500 chars
[Verifier] Verified output: quality 4.5/5.0
[MemoryStore] Stored 5 learnings for future sessions
```

### 4. Maintainability

Changes isolated to single primitive:
```typescript
// Upgrade Planner without touching other primitives
class AssessmentPlannerV2 implements Planner<AssessmentGoal, AssessmentPhase> {
  // New logic, same interface
  async plan(goal, context) { ... }
}

// Drop-in replacement
const agent = createAgent({
  planner: new AssessmentPlannerV2(),  // ← Only change
  // ... rest unchanged
});
```

---

## Comparison with Other Architectures

| Architecture | Layers | Flexibility | Testability | Provenance | Best For |
|--------------|--------|-------------|-------------|------------|----------|
| **Universal Agent v1.0** | 7 | ★★★★★ | ★★★★★ | ★★★★★ | Complex, multi-step tasks |
| ReAct Pattern | 3 | ★★★ | ★★★ | ★★ | Simple tool use |
| LangChain Agents | 4 | ★★★★ | ★★ | ★★★ | Quick prototyping |
| OpenAI Assistants | 2 | ★★ | ★ | ★ | Conversational AI |

**Key Differentiators:**
- **Universal Agent v1.0** prioritizes provenance, verification, and quality over speed
- Best suited for high-stakes domains (coaching, healthcare, finance) where quality > latency
- Designed for production deployment, not experimentation

---

## Reference Implementations

### IvyLevel Platform Agents

| Agent | Purpose | Primitives Used |
|-------|---------|-----------------|
| **AssessmentAgent** | Initial student diagnostic | All 7 layers |
| **GamePlanAgent** | Strategic roadmap creation | All 7 layers |
| **WeeklyExecutionAgent** | Week-by-week coaching | All 7 layers |
| **ProjectAgent** | Project ideation + execution | All 7 layers |
| **EssayAgent** | Essay coaching + feedback | All 7 layers |

**Reference:** `services/agent-framework/src/agents/v15.3/`

---

## Future Extensions

### Planned Enhancements (v1.1)

1. **Multi-Agent Coordination:** Enable agents to collaborate on complex tasks
2. **Streaming Synthesis:** Real-time output generation (vs batch)
3. **Adaptive Planning:** Adjust plan mid-execution based on new information
4. **Explainability Layer:** Generate natural language explanations of decisions

### Potential New Primitives (v2.0)

- **Reasoner:** Explicit reasoning/chain-of-thought before planning
- **Critic:** Self-critique loop before synthesis
- **Explorer:** Active information seeking when context is insufficient

---

**End of Universal Agent Architecture v1.0 Specification**

*This architecture serves as the foundation for all IvyLevel agents and can be adapted for any agentic AI system.*
