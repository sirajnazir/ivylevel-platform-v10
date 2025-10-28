# Multi-Agent Architecture Analysis & Redesign Proposal v1.0

**Date:** 2025-10-28
**Purpose:** Analyze existing 10 agents + propose first-principles redesign using OpenAI SDK patterns
**Approach:** Common Denominator + Delta Architecture

---

## Executive Summary

**Current State:** 10 specialized agents with duplicated architecture patterns
**Problem:** No clear separation of constant vs. variable parts, leading to maintenance overhead
**Solution:** Apply OpenAI Agents SDK patterns + Design Pattern Analysis + Golden Coaching Data

**Key Insight:** Our agents share 90% common structure but lack abstraction for the 10% that's unique.

---

## Part 1: Current Agent Inventory & Analysis

### 1.1 All 10 Agents Identified

| Agent ID | Category | File | Primary Purpose |
|----------|----------|------|-----------------|
| `assessment-agent` | assessment | AssessmentAgent.ts | 27-layer autonomous assessment on onboarding |
| `gameplan-agent` | gameplan | GamePlanAgent.ts | College application planning & strategy |
| `awards-agent` | awards | AwardsAgent.ts | Awards/honors strategy & prestige analysis |
| `ecs-agent` | ecs | ExtracurricularsAgent.ts | EC portfolio optimization |
| `programs-agent` | programs | SummerProgramsAgent.ts | Summer program selection & strategy |
| `college-agent` | college | CollegeListAgent.ts | College list building & chances |
| `essay-agent` | essay | EssayAgent.ts | Essay brainstorming & writing guidance |
| `admissions-agent` | admissions | AdmissionsAgent.ts | AO perspectives & holistic review |
| `weekly-execution-agent` | execution | WeeklyExecutionAgent.ts | JTBD tracking & weekly progress |
| `scholarship-agent` | scholarship | ScholarshipAgent.ts | Scholarship tracking & financial aid |

---

### 1.2 Common Denominator Analysis

**What ALL 10 agents share (90% of code):**

#### Architecture Pattern
```typescript
class XAgent extends BaseAgent {
  constructor() {
    const manifest: AgentManifest = {
      agent_id: string,           // ✅ CONSTANT PATTERN
      display_name: string,       // ✅ CONSTANT PATTERN
      tagline: string,            // ✅ CONSTANT PATTERN
      version: string,            // ✅ CONSTANT PATTERN
      category: AgentCategory,    // ✅ CONSTANT PATTERN
      tools: ChatCompletionTool[],// ✅ CONSTANT PATTERN
      intents: Intent[],          // ✅ CONSTANT PATTERN
      jtbd: JTBD,                 // ✅ CONSTANT PATTERN
      model?: string,             // ✅ CONSTANT PATTERN
      temperature?: number,       // ✅ CONSTANT PATTERN
      max_tokens?: number,        // ✅ CONSTANT PATTERN
      handoffs?: string[]         // ✅ CONSTANT PATTERN
    };
    super(manifest);
  }

  protected buildSystemPrompt(context): string {
    // ❌ VARIABLE - Each agent has unique prompt
  }
}
```

#### BaseAgent Provides (Shared Infrastructure)
1. **OpenAI Integration** - `openai.chat.completions.create()` with function calling
2. **Tool Execution Loop** - Iterative function calling up to 5 iterations
3. **Session Management** - Updates `IvyLevelSession` with conversation history
4. **Handoff Detection** - Specificity-based routing to more specialized agents
5. **Evidence Tracking** - Extracts chips and hits from tool results
6. **Error Handling** - Graceful failures with user-friendly messages

#### AgentRegistry Provides (Orchestration)
1. **Agent Discovery** - Centralized registry of all active agents
2. **Intent Routing** - Keyword-based pattern matching to route queries
3. **Default Fallback** - Routes to GamePlanAgent when no match
4. **Usage Tracking** - Request counts, last used timestamps
5. **Health Management** - Activate/deactivate agents dynamically

---

### 1.3 Delta/Variable Analysis

**What makes each agent UNIQUE (10% of code):**

| Agent | Unique Intents | Unique Tools | Unique System Prompt Focus |
|-------|----------------|--------------|----------------------------|
| **AssessmentAgent** | `student_onboarded` event | 27-layer assessment execution, CoachIntelligence repos | Autonomous proactive assessment conductor |
| **GamePlanAgent** | `gameplan.overview`, `gameplan.profile` | NSM dashboard, JTBD tools, tactics | Big picture strategy, timelines, action items |
| **AwardsAgent** | `awards.list`, `awards.analysis` | `get_awards_list`, award tier classification | Prestige tiers (T1-T4), competition pathways |
| **EcsAgent** | `ecs.list`, `ecs.analysis` | `get_ecs_list`, EC tier classification | Depth vs breadth, leadership gaps, tier analysis |
| **ProgramsAgent** | `programs.list`, `programs.admissions` | `get_programs_list`, program catalog | Reach/target/safety portfolio, prestige tiers |
| **CollegeAgent** | `college.list`, `college.chances` | `get_college_list`, benchmarks, twins | Reach/match/safety, chances using CDS data |
| **EssayAgent** | `essay_brainstorming`, `essay_examples` | `search_essay_examples`, AO perspectives | Authentic storytelling, avoid clichés |
| **AdmissionsAgent** | `ao_perspectives`, `red_flags` | `get_ao_perspectives`, college rubrics | Holistic review insider knowledge |
| **WeeklyExecutionAgent** | `execution.weekly`, `execution.pending` | `get_jtbd_week`, JTBD progression | Week-over-week tracking, completion rates |
| **ScholarshipAgent** | `scholarship.list`, `scholarship.accepted` | `get_scholarships_list`, summary | Money tracking, acceptance rates |

---

### 1.4 Current Architecture Problems

**❌ Problem 1: Massive Prompt Duplication**
- Each `buildSystemPrompt()` is 100-200 lines
- 70% of prompt is identical boilerplate ("Use tools, never hallucinate", "Cite sources", etc.)
- Only 30% is agent-specific expertise

**❌ Problem 2: No Intelligence Integration**
- None of the agents (except AssessmentAgent) use coaching intelligence from golden data
- 11 JSON files with 17 layers of coaching intelligence are unused
- Agents rely on hardcoded prompts instead of real coaching patterns

**❌ Problem 3: No Pattern Compliance**
- Agents don't follow Design Pattern Analysis principles
- Missing: Planning pattern, Reflection integration, Memory pattern
- Tool Use exists but no strategic orchestration

**❌ Problem 4: Intent Routing is Primitive**
- Keyword matching (`queryLower.includes(pattern)`)
- No semantic understanding
- No confidence scoring

**❌ Problem 5: AssessmentAgent is Completely Different**
- Doesn't extend BaseAgent
- Event-driven architecture (EventBus)
- Uses completely different repos (StudentContextRepository, CoachIntelligenceRepository)
- **Critical:** This is our FIRST USER TOUCHPOINT but has zero overlap with other agents

---

## Part 2: OpenAI SDK Patterns Applied to IvyLevel

### 2.1 Common Denominator: Base Configuration

**OpenAI SDK Pattern:**
```python
Agent(
    name="identifier",
    instructions="system prompt or function",
    model="gpt-4",
    tools=[...],
    handoffs=[...],
    output_type=StructuredOutput
)
```

**IvyLevel Equivalent (Proposed):**
```typescript
interface IvyLevelAgentConfig<TContext = StudentContext> {
  // CONSTANT STRUCTURE (all agents have these)
  name: string;                           // "Assessment Coach", "GamePlan Strategist"
  agent_id: string;                       // "assessment-agent", "gameplan-agent"
  category: AgentCategory;                // assessment | gameplan | awards | etc.

  // VARIABLE CONTENT (unique per agent)
  instructions: string | DynamicInstructionsFn<TContext>;
  tools: Tool[];
  intents: Intent[];
  handoffs: Agent[];

  // OPTIONAL CONFIGURATION
  model?: string;                         // Defaults to GPT-4o
  model_settings?: ModelSettings;         // temp, top_p, max_tokens
  output_type?: StructuredOutputType;     // Pydantic-like validation
  tool_use_behavior?: ToolUseBehavior;    // run_llm_again | stop_on_first_tool
  hooks?: AgentHooks<TContext>;           // Lifecycle events
  guardrails?: Guardrail[];               // Input/output validation
}
```

**Key Improvements:**
1. **Dynamic Instructions** - Instructions can be functions that load coaching intelligence
2. **Typed Context** - Generic `TContext` allows different agents to use different context types
3. **Structured Outputs** - Agents can return typed objects (e.g., AssessmentResult, GamePlanSummary)
4. **Lifecycle Hooks** - Monitor/log without modifying agent logic
5. **Guardrails** - Validate inputs/outputs declaratively

---

### 2.2 Variable Parts: Agent Specialization

#### Pattern 1: Dynamic Instructions from Coaching Intelligence

**OpenAI SDK Pattern:**
```python
def dynamic_instructions(context, agent):
    return f"The user's name is {context.name}. Help them."

agent = Agent(
    instructions=dynamic_instructions
)
```

**IvyLevel Application:**
```typescript
// Load coaching intelligence on initialization
const coachingIntelligence = await CoachingIntelligenceLoader.load();

// Dynamic instructions pull from real coaching data
function assessmentInstructions(
  context: RunContext<StudentContext>,
  agent: IvyLevelAgent
): string {
  const { student, archetype } = context;

  // Get archetype-specific tactics from golden data
  const archetypeTactics = coachingIntelligence.getTacticsForArchetype(
    archetype
  );

  // Get phase-specific questions from golden data
  const discoveryQuestions = coachingIntelligence.getQuestionsByPhase(
    'discovery'
  );

  return `You are Jenny Duan conducting a 360° assessment for ${student.name}.

**Student Archetype:** ${archetype}
**Detected from:** GPA, ECs, challenges analysis

**Your Assessment Protocol:**
${coachingIntelligence.getSessionProtocol('assessment')}

**Phase 1: Discovery Questions (Use these exact patterns)**
${discoveryQuestions.map(q => `- ${q.text}\n  Meta-coaching: ${q.meta_context}`).join('\n')}

**Coaching Tactics for ${archetype}:**
${archetypeTactics.map(t => `- ${t.name}: ${t.principle}`).join('\n')}

**Frameworks to Introduce Proactively:**
${coachingIntelligence.getFrameworksForBarriers(student.barriers).map(f =>
  `- ${f.name}: "${f.introduction_language}" (triggers: ${f.triggers.join(', ')})`
).join('\n')}

**Your Voice:**
${coachingIntelligence.getVoiceGuidelines('assessment')}`;
}

const assessmentAgent = new IvyLevelAgent({
  name: "Assessment Coach",
  agent_id: "assessment-agent",
  instructions: assessmentInstructions,  // ✅ Dynamic, intelligence-driven
  tools: [/* assessment tools */],
});
```

**Benefits:**
- ✅ Instructions automatically incorporate real coaching intelligence
- ✅ Archetype-adaptive behavior from golden data
- ✅ Questions, tactics, frameworks all from 11 real sessions
- ✅ No hardcoded prompts - everything sourced from intelligence layer

---

#### Pattern 2: Agent Cloning for Variants

**OpenAI SDK Pattern:**
```python
pirate_agent = Agent(
    name="Pirate",
    instructions="Write like a pirate"
)

robot_agent = pirate_agent.clone(
    name="Robot",
    instructions="Write like a robot"
)
```

**IvyLevel Application:**
```typescript
// Base profile agent (shared tools, model, config)
const baseProfileAgent = new IvyLevelAgent({
  name: "Profile Specialist",
  category: "profile",
  tools: [
    get_awards_list,
    get_ecs_list,
    get_programs_list,
    get_nsm_dashboard
  ],
  model: "gpt-4o",
  temperature: 0.7,
  hooks: profileAnalyticsHooks
});

// Clone for Awards specialization
const awardsAgent = baseProfileAgent.clone({
  name: "Awards Advisor",
  agent_id: "awards-agent",
  instructions: awardsInstructions,  // Award-specific
  intents: awardsIntents,
  handoffs: [gamePlanAgent, ecsAgent]
});

// Clone for ECs specialization
const ecsAgent = baseProfileAgent.clone({
  name: "ECs Advisor",
  agent_id: "ecs-agent",
  instructions: ecsInstructions,  // EC-specific
  intents: ecsIntents,
  handoffs: [gamePlanAgent, awardsAgent]
});
```

**Benefits:**
- ✅ DRY principle - shared configuration defined once
- ✅ Easy to maintain tool lists (update base, propagates to clones)
- ✅ Consistent behavior across related agents

---

#### Pattern 3: Manager vs. Handoff Architecture

**Current State:** Hybrid mess
- AgentRegistry routes to single agent
- BaseAgent detects handoffs mid-conversation
- No clear manager pattern

**Proposed:** Clear separation

**For Specialized Queries → Manager Pattern**
```typescript
// User-facing orchestrator
const triageAgent = new IvyLevelAgent({
  name: "Jenny - Your Coach",
  instructions: triageInstructions,
  tools: [
    gamePlanAgent.as_tool({
      name: "gameplan_expert",
      description: "Strategic planning and next steps"
    }),
    awardsAgent.as_tool({
      name: "awards_expert",
      description: "Award strategy and prestige analysis"
    }),
    ecsAgent.as_tool({
      name: "ecs_expert",
      description: "Extracurricular optimization"
    }),
    // ... all 10 agents as tools
  ]
});
```

**For Assessment/Long Sessions → Handoff Pattern**
```typescript
const assessmentAgent = new IvyLevelAgent({
  name: "Assessment Coach",
  instructions: assessmentInstructions,
  handoffs: [
    gamePlanAgent,  // After assessment completes
    goalsAgent,     // If student needs goal clarification
  ]
});
```

**Benefits:**
- ✅ Triage agent maintains conversation control (Manager pattern)
- ✅ Assessment agent can hand off to GamePlan after completion (Handoff pattern)
- ✅ Clear responsibility boundaries

---

### 2.3 Design Pattern Analysis Integration

**From Agentic Design Patterns Analysis, we should apply:**

#### Pattern 1: Planning Pattern (Autonomous Goal Decomposition)
**Apply to:** AssessmentAgent, GamePlanAgent

```typescript
interface PlanningCapability {
  decompose_goal(goal: string): SubGoal[];
  execute_plan(plan: Plan): PlanResult;
  adapt_plan(feedback: Feedback): Plan;
}

// Assessment agent autonomously plans 4-phase progression
const assessmentAgent = new IvyLevelAgent({
  instructions: assessmentInstructions,
  capabilities: [PlanningCapability],
  planning_config: {
    phases: ['discovery', 'narrative', 'strategy', 'time'],
    phase_transitions: autonomous,  // Agent decides when to transition
    adaptation: enabled  // Can skip/reorder based on student responses
  }
});
```

#### Pattern 2: Reflection Pattern (Producer-Critic)
**Apply to:** ALL agents (via hooks)

```typescript
const reflectionHook = new ReflectionHook({
  producer_model: "gpt-4o",
  critic_model: "gpt-4o",
  quality_gates: {
    actionable: 7.5,
    empathetic: 7.5,
    data_grounded: 8.0,
    ivyscore_optimal: 7.5
  },
  max_iterations: 3
});

// Apply to all agents
const baseAgent = new IvyLevelAgent({
  hooks: [reflectionHook, analyticsHook, loggingHook]
});
```

#### Pattern 3: Tool Use Pattern (Zero-Hallucination)
**Apply to:** ALL agents

```typescript
const toolUseConfig = {
  behavior: "run_llm_again",  // Default: process tool results
  forced_tools: {
    "gameplan.overview": ["get_nsm_dashboard", "get_jtbd_pending"],
    "awards.list": ["get_awards_list"],
    "college.chances": ["get_nsm_dashboard", "get_college_list"]
  },
  guardrails: [
    NoHallucinationGuardrail,  // Fail if response mentions data not in tools
    RequireEvidenceGuardrail   // Fail if no evidence chips
  ]
};
```

#### Pattern 4: Memory Pattern (Session State)
**Apply to:** AssessmentAgent, WeeklyExecutionAgent

```typescript
interface AssessmentMemory {
  current_phase: 'discovery' | 'narrative' | 'strategy' | 'time';
  discovery_responses: string[];
  narrative_clarity: number;
  frameworks_introduced: string[];
  proactive_interventions: Intervention[];
}

const assessmentAgent = new IvyLevelAgent<AssessmentMemory>({
  memory_config: {
    type: "session",
    persistence: "database",
    schema: AssessmentMemorySchema
  }
});
```

---

## Part 3: Proposed Unified Architecture

### 3.1 Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: COMMON DENOMINATOR (BaseAgent)                        │
│ - OpenAI function calling                                       │
│ - Tool execution loop                                           │
│ - Session management                                            │
│ - Lifecycle hooks                                               │
│ - Guardrails                                                    │
│ - Reflection integration                                        │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: INTELLIGENCE LAYER (CoachingIntelligenceLoader)       │
│ - Load 11 JSON files (17 layers each)                          │
│ - Provide: Questions, Tactics, Frameworks, Voice patterns       │
│ - Archetype-adaptive selection                                 │
│ - Trigger-based framework recommendation                        │
│ - Dynamic instruction generation                                │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: AGENT SPECIALIZATIONS (10 Agents)                     │
│ - Each agent: name, category, intents, tools, handoffs         │
│ - Dynamic instructions pull from Intelligence Layer             │
│ - Tools are agent-specific (get_awards, get_ecs, etc.)         │
│ - Cloned from base templates where appropriate                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Common Denominator: BaseAgent v2.0

```typescript
/**
 * BaseAgent v2.0 - OpenAI SDK-inspired architecture
 * Provides all shared infrastructure
 */
export class BaseAgent<TContext = StudentContext, TMemory = any> {
  protected config: IvyLevelAgentConfig<TContext>;
  protected openai: OpenAI;
  protected intelligence: CoachingIntelligenceLoader;
  protected hooks: AgentHooks<TContext>[];
  protected guardrails: Guardrail[];
  protected memory: MemoryStore<TMemory>;

  constructor(config: IvyLevelAgentConfig<TContext>) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.intelligence = CoachingIntelligenceLoader.getInstance();
    this.hooks = config.hooks || [];
    this.guardrails = config.guardrails || [];
    this.memory = new MemoryStore<TMemory>(config.memory_config);
  }

  /**
   * Execute agent with user message
   * Applies: Tool Use pattern, Reflection pattern, Memory pattern
   */
  async execute(
    context: RunContext<TContext>,
    userMessage: string
  ): Promise<AgentResult> {
    // Hook: before_execute
    await this.triggerHook('before_execute', { context, userMessage });

    // Guardrail: validate input
    await this.validateInput(userMessage, context);

    // Get instructions (static or dynamic)
    const instructions = typeof this.config.instructions === 'function'
      ? await this.config.instructions(context, this)
      : this.config.instructions;

    // Load memory
    const memory = await this.memory.load(context.session.session_id);

    // Build messages
    const messages = [
      { role: 'system', content: instructions },
      ...context.session.messages,
      { role: 'user', content: userMessage }
    ];

    // Execute with tool calling loop
    const producerResponse = await this.callOpenAIWithTools(messages);

    // Reflection pattern (if enabled)
    const finalResponse = this.config.reflection_enabled
      ? await this.reflect(producerResponse, context)
      : producerResponse;

    // Guardrail: validate output
    await this.validateOutput(finalResponse, context);

    // Update memory
    await this.memory.save(context.session.session_id, {
      ...memory,
      last_response: finalResponse,
      turn_count: memory.turn_count + 1
    });

    // Hook: after_execute
    await this.triggerHook('after_execute', { finalResponse });

    return finalResponse;
  }

  /**
   * Clone agent with overrides
   * Enables DRY principle for agent variants
   */
  clone(overrides: Partial<IvyLevelAgentConfig<TContext>>): BaseAgent<TContext> {
    return new BaseAgent({
      ...this.config,
      ...overrides
    });
  }

  /**
   * Convert agent to tool (Manager pattern)
   */
  as_tool(toolConfig: ToolConfig): Tool {
    return {
      type: "function",
      function: {
        name: toolConfig.name,
        description: toolConfig.description,
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The user's question" }
          },
          required: ["query"]
        }
      },
      handler: async (args: { query: string }, context: TContext) => {
        const result = await this.execute(context, args.query);
        return result.answer;
      }
    };
  }
}
```

---

### 3.3 Intelligence Layer: CoachingIntelligenceLoader

```typescript
/**
 * CoachingIntelligenceLoader
 * Loads 11 coaching sessions × 17 intelligence layers
 * Provides intelligence-driven instruction generation
 */
export class CoachingIntelligenceLoader {
  private static instance: CoachingIntelligenceLoader;
  private sessions: CoachingSession[] = [];

  static async getInstance(): Promise<CoachingIntelligenceLoader> {
    if (!this.instance) {
      this.instance = new CoachingIntelligenceLoader();
      await this.instance.load();
    }
    return this.instance;
  }

  /**
   * Load all 11 coaching intelligence JSONs
   */
  private async load(): Promise<void> {
    const files = await fs.readdir('/data/coaching_intelligence/extractions');
    for (const file of files) {
      const data = JSON.parse(await fs.readFile(file));
      this.sessions.push(data);
    }
  }

  /**
   * Get questions for specific phase
   * Aggregates from all 11 sessions
   */
  getQuestionsByPhase(phase: 'discovery' | 'narrative' | 'strategy' | 'time'): Question[] {
    const questions: Question[] = [];
    for (const session of this.sessions) {
      questions.push(...session.questions_by_phase[phase]);
    }
    // Return diverse set (not all 110+ questions)
    return this.diverseSelection(questions, 10);
  }

  /**
   * Get frameworks that address specific barriers
   */
  getFrameworksForBarriers(barriers: string[]): Framework[] {
    const frameworks: Framework[] = [];
    for (const session of this.sessions) {
      for (const framework of session.frameworks_introduced) {
        // Match framework to barriers
        if (this.frameworkAddressesBarriers(framework, barriers)) {
          frameworks.push(framework);
        }
      }
    }
    return this.uniqueFrameworks(frameworks);
  }

  /**
   * Get coaching tactics for archetype
   */
  getTacticsForArchetype(archetype: string): Tactic[] {
    const tactics: Tactic[] = [];
    for (const session of this.sessions) {
      if (session.archetype_specific_patterns[archetype]) {
        tactics.push(...session.archetype_specific_patterns[archetype].tactics);
      }
    }
    return tactics;
  }

  /**
   * Get session protocol for agent type
   */
  getSessionProtocol(type: 'assessment' | 'gameplan'): string {
    // Extract meta_coaching_moments that explain session structure
    const protocols = this.sessions.map(s =>
      s.meta_coaching_moments.explaining_assessment_structure
    );
    return this.synthesizeProtocol(protocols);
  }

  /**
   * Get voice guidelines from coaching tactics
   */
  getVoiceGuidelines(agentType: string): string {
    const voiceTactics = [];
    for (const session of this.sessions) {
      voiceTactics.push(...session.coaching_tactics_observed.rapport_building);
      voiceTactics.push(...session.coaching_tactics_observed.motivation_techniques);
    }
    return this.synthesizeVoice(voiceTactics);
  }
}
```

---

### 3.4 Agent Specializations: 10 Agents Redesigned

#### AssessmentAgent (Fully Autonomous)

```typescript
/**
 * Assessment Agent v2.0
 * - Planning pattern: Autonomous 4-phase progression
 * - Memory pattern: Tracks narrative clarity, frameworks introduced
 * - Intelligence-driven: Questions, tactics, frameworks from golden data
 */

interface AssessmentMemory {
  current_phase: 'discovery' | 'narrative' | 'strategy' | 'time';
  discovery_responses: string[];
  narrative_clarity: number;
  frameworks_introduced: string[];
  proactive_interventions: Intervention[];
  student_archetype: string;
}

async function assessmentInstructions(
  context: RunContext<StudentContext>,
  agent: BaseAgent<StudentContext, AssessmentMemory>
): Promise<string> {
  const intel = await CoachingIntelligenceLoader.getInstance();
  const memory = await agent.memory.load(context.session.session_id);
  const student = context.context;

  // Detect archetype from student profile
  const archetype = detectArchetype(student);

  // Get intelligence for current phase
  const phaseQuestions = intel.getQuestionsByPhase(memory.current_phase);
  const phaseTactics = intel.getTacticsForArchetype(archetype);
  const frameworks = intel.getFrameworksForBarriers(student.barriers);

  return `You are Jenny Duan conducting an autonomous 360° assessment.

**CRITICAL: YOU ARE LEADING THIS SESSION - Be proactive, structured, authoritative.**

**Student:** ${student.name} (Grade ${student.grade})
**Archetype:** ${archetype}
**Current Phase:** ${memory.current_phase} (${memory.current_phase === 'discovery' ? '1/4' : memory.current_phase === 'narrative' ? '2/4' : memory.current_phase === 'strategy' ? '3/4' : '4/4'})
**Narrative Clarity:** ${memory.narrative_clarity}/1.0

---

## Your 4-Phase Protocol

**Phase 1: Discovery** (10 min, 7 questions)
- WHO they are: passions, values, authentic self
- Questions: ${phaseQuestions.slice(0, 7).map(q => `"${q.text}"`).join(', ')}

**Phase 2: Narrative** (15 min, 8 questions)
- WHAT their story is: spike, differentiation
- Synthesis: Create identity fusion from scattered interests
- Questions: Focus on 3-hub framework

**Phase 3: Strategy** (15 min, 7 questions)
- HOW to prove it: ECs, awards, programs aligned with narrative
- Questions: Tactical recommendations

**Phase 4: Time Architecture** (5 min, 5 questions)
- WHEN to execute: 168-hour framework, milestones
- Questions: Capacity, sustainability

---

## Coaching Tactics for ${archetype}

${phaseTactics.map(t => `**${t.name}:**
- Principle: ${t.principle}
- When to use: ${t.triggers.join(', ')}
- Example: ${t.example}`).join('\n\n')}

---

## Frameworks to Introduce Proactively

${frameworks.map(f => `**${f.framework_name}:**
- Trigger: ${f.triggers.join(' OR ')}
- Intro: "${f.introduction_language}"
- Positioned as: ${f.positioned_as}
- Effectiveness: ${f.effectiveness}`).join('\n\n')}

---

## Your Voice (from real coaching data)

${intel.getVoiceGuidelines('assessment')}

---

## Phase Transition Logic

- **Discovery → Narrative:** When you have 7 responses OR narrative clarity becomes apparent
- **Narrative → Strategy:** When 3-hub synthesis complete (narrative clarity > 0.7)
- **Strategy → Time:** When strategic recommendations given
- **Time → Complete:** When 168-hour framework explained + milestones set

**Current Phase Progress:** ${memory.discovery_responses.length}/7 responses collected

---

## Next Question to Ask

${memory.current_phase === 'discovery'
  ? phaseQuestions[memory.discovery_responses.length].text
  : 'Continue current phase based on student responses'}

**Meta-coaching context:** ${phaseQuestions[memory.discovery_responses.length]?.meta_context}`;
}

export const assessmentAgent = new BaseAgent<StudentContext, AssessmentMemory>({
  name: "Assessment Coach",
  agent_id: "assessment-agent",
  category: "assessment",

  // Dynamic instructions from coaching intelligence
  instructions: assessmentInstructions,

  // Assessment-specific tools
  tools: [
    get_student_profile,
    get_nsm_dashboard,
    detect_archetype,
    search_frameworks,
    get_relevant_tactics
  ],

  // Handoff to GamePlan after assessment completes
  handoffs: [gamePlanAgent],

  // Memory tracks 4-phase progression
  memory_config: {
    type: "session",
    schema: AssessmentMemorySchema,
    persistence: "database"
  },

  // Planning capability for autonomous phase management
  capabilities: [PlanningCapability],

  // Reflection enabled for quality
  reflection_enabled: true,

  // Hooks for analytics
  hooks: [assessmentAnalyticsHook, loggingHook]
});
```

#### GamePlanAgent (Strategic Orchestrator)

```typescript
async function gamePlanInstructions(
  context: RunContext<StudentContext>,
  agent: BaseAgent
): Promise<string> {
  const intel = await CoachingIntelligenceLoader.getInstance();
  const student = context.context;

  return `You are Jenny Duan, ${student.name}'s strategic game plan advisor.

**Your Specialty:** Big-picture college application strategy

## Your Approach

1. **Start with current state** - Use get_nsm_dashboard to see profile status
2. **Identify gaps** - Recognition, Leadership, Academics, Service, Artifacts
3. **Recommend tactics** - Use get_relevant_tactics for barriers identified
4. **Set priorities** - Use get_jtbd_pending to see upcoming tasks
5. **Create timeline** - Break down into 1-2 week action items

## Strategic Frameworks from Coaching Intelligence

${intel.getFrameworksForBarriers(['time-crisis', 'low-productivity']).map(f =>
  `**${f.framework_name}:** ${f.core_principle}`
).join('\n')}

## Your Communication Style

${intel.getVoiceGuidelines('gameplan')}

## Tool Usage (ZERO HALLUCINATION)

**CRITICAL:**
- ALWAYS call tools before answering
- NEVER mention colleges unless from get_college_list
- NEVER mention essay topics unless from JTBD tools
- NEVER mention teacher names (no "Ms. Johnson", "Mr. Chen")

**Required tool calls for common queries:**
- "What should I work on?" → get_nsm_dashboard + get_jtbd_pending
- "Show my game plan" → get_college_list + get_jtbd_pending
- "How can I improve?" → get_nsm_dashboard + get_relevant_tactics`;
}

export const gamePlanAgent = new BaseAgent({
  name: "GamePlan Strategist",
  agent_id: "gameplan-agent",
  category: "gameplan",
  instructions: gamePlanInstructions,

  tools: [
    get_nsm_dashboard,
    get_jtbd_pending,
    get_college_list,
    get_relevant_tactics,
    get_sat_scores,
    get_gpa,
    get_transcript
  ],

  handoffs: [
    awardsAgent,
    ecsAgent,
    programsAgent,
    collegeAgent,
    essayAgent
  ],

  reflection_enabled: true,

  guardrails: [
    NoHallucinationGuardrail,
    RequireToolUseGuardrail(['get_nsm_dashboard'], for_intents: ['gameplan.overview'])
  ]
});
```

#### Profile Agents (Awards, ECs, Programs) - Cloned from Base

```typescript
// Base profile agent with shared tools
const baseProfileAgent = new BaseAgent({
  name: "Profile Specialist",
  category: "profile",

  tools: [
    get_nsm_dashboard,
    get_relevant_tactics,
    get_student_profile
  ],

  model: "gpt-4o",
  temperature: 0.7,
  reflection_enabled: true,

  hooks: [profileAnalyticsHook, loggingHook],

  guardrails: [NoHallucinationGuardrail, RequireEvidenceGuardrail]
});

// Awards Agent (cloned + specialized)
export const awardsAgent = baseProfileAgent.clone({
  name: "Awards Advisor",
  agent_id: "awards-agent",

  instructions: async (context, agent) => {
    const intel = await CoachingIntelligenceLoader.getInstance();
    return `${await baseProfileInstructions(context, agent)}

## Your Specialty: Awards & Honors Strategy

### Award Tier Classification (from coaching intelligence)
${intel.getAwardTiers()}

### Competition Pathways
${intel.getCompetitionPathways()}

### Tool Usage
- "What awards do I have?" → get_awards_list(phase="final")
- "What awards should I target?" → get_awards_list + get_relevant_tactics(barriers=["low-recognition"])

**NEVER mention specific award names unless returned by tools.**`;
  },

  tools: [
    ...baseProfileAgent.config.tools,
    get_awards_list  // Award-specific tool
  ],

  intents: [
    { intent_id: 'awards.list', patterns: ['what awards', 'show me my awards', 'awards i won'] },
    { intent_id: 'awards.targets', patterns: ['which awards should i', 'award recommendations'] }
  ],

  handoffs: [gamePlanAgent, ecsAgent, programsAgent]
});

// ECs Agent (cloned + specialized)
export const ecsAgent = baseProfileAgent.clone({
  name: "ECs Advisor",
  agent_id: "ecs-agent",

  instructions: async (context, agent) => {
    const intel = await CoachingIntelligenceLoader.getInstance();
    return `${await baseProfileInstructions(context, agent)}

## Your Specialty: Extracurricular Optimization

### EC Tier Classification
${intel.getECTiers()}

### Depth vs. Breadth Analysis Framework
${intel.getECAnalysisFramework()}

### Tool Usage
- "What are my ECs?" → get_ecs_list(phase="final")
- "How can I improve my ECs?" → get_ecs_list + get_relevant_tactics(barriers=["low-leadership"])`;
  },

  tools: [
    ...baseProfileAgent.config.tools,
    get_ecs_list  // EC-specific tool
  ],

  intents: [
    { intent_id: 'ecs.list', patterns: ['what are my extracurriculars', 'show my ecs'] },
    { intent_id: 'ecs.recommendations', patterns: ['how can i improve my ecs', 'ec recommendations'] }
  ],

  handoffs: [gamePlanAgent, awardsAgent, programsAgent]
});

// Similar cloning for ProgramsAgent, CollegeAgent, etc.
```

---

## Part 4: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Build common denominator infrastructure

**Tasks:**
1. ✅ Create `BaseAgent` v2.0 with OpenAI SDK patterns
2. ✅ Create `CoachingIntelligenceLoader` with 11 JSON files
3. ✅ Create `IvyLevelAgentConfig` interface
4. ✅ Implement lifecycle hooks system
5. ✅ Implement guardrails system
6. ✅ Add agent cloning capability

**Deliverables:**
- `src/core/BaseAgent.v2.ts`
- `src/intelligence/CoachingIntelligenceLoader.ts`
- `src/core/types.v2.ts`
- `src/core/hooks/AgentHooks.ts`
- `src/core/guardrails/`

---

### Phase 2: Intelligence Integration (Week 2-3)
**Goal:** Wire up golden coaching data

**Tasks:**
1. ✅ Load all 11 coaching intelligence JSONs
2. ✅ Implement `getQuestionsByPhase()`
3. ✅ Implement `getFrameworksForBarriers()`
4. ✅ Implement `getTacticsForArchetype()`
5. ✅ Implement `getVoiceGuidelines()`
6. ✅ Test dynamic instruction generation

**Deliverables:**
- Coaching intelligence fully integrated
- Dynamic instructions working for all agents

---

### Phase 3: Redesign Priority Agents (Week 3-5)
**Goal:** Rebuild AssessmentAgent + GamePlanAgent with new architecture

**Priority Order:**
1. **AssessmentAgent** (CRITICAL - first user touchpoint)
   - Planning pattern for 4-phase autonomous flow
   - Memory pattern for session state
   - Intelligence-driven questions, tactics, frameworks
   - Proactive trigger engine

2. **GamePlanAgent** (HIGH - most common queries)
   - Strategic orchestrator
   - Intelligent tool routing
   - Tactics recommendation

3. **Profile Agents** (MEDIUM - clone from base)
   - AwardsAgent
   - EcsAgent
   - ProgramsAgent
   - CollegeAgent

**Deliverables:**
- AssessmentAgent v2.0 production-ready
- GamePlanAgent v2.0 production-ready
- Profile agents cloned and specialized

---

### Phase 4: Remaining Agents (Week 5-6)
**Goal:** Complete migration of all 10 agents

**Agents:**
- EssayAgent
- AdmissionsAgent
- WeeklyExecutionAgent
- ScholarshipAgent

**Deliverables:**
- All 10 agents migrated to v2.0 architecture
- Old agents deprecated

---

### Phase 5: Manager/Handoff Architecture (Week 6-7)
**Goal:** Implement orchestration layer

**Tasks:**
1. ✅ Create TriageAgent (Manager pattern)
2. ✅ Convert all agents to tools via `as_tool()`
3. ✅ Implement handoff logic for AssessmentAgent → GamePlanAgent
4. ✅ Test multi-agent conversations

**Deliverables:**
- TriageAgent routing to 10 specialized agents
- Seamless handoffs

---

## Part 5: Success Criteria

### Quantitative Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Code Reuse** | 10% (duplicated prompts) | 90% (shared base) | 9x |
| **Prompt Maintenance** | 10 files × 200 lines | 1 intelligence loader | 95% reduction |
| **Intelligence Usage** | 1/10 agents use golden data | 10/10 agents | 10x |
| **Pattern Compliance** | 0/5 patterns applied | 5/5 patterns | ∞ |
| **Onboarding Quality** | Passive/reactive | Autonomous/proactive | Qualitative leap |

### Qualitative Metrics

**Before:**
- ❌ AssessmentAgent is completely different from other agents
- ❌ No coaching intelligence integration
- ❌ Hardcoded prompts require manual updates
- ❌ Pattern violations everywhere

**After:**
- ✅ All agents extend same BaseAgent
- ✅ All agents use coaching intelligence
- ✅ Dynamic instructions auto-update from golden data
- ✅ Full compliance with Design Pattern Analysis

---

## Part 6: Open Questions for Discussion

1. **Agent Routing:** Should we use Manager pattern (TriageAgent) or keep AgentRegistry routing? Or hybrid?

2. **AssessmentAgent Integration:** How to integrate event-driven AssessmentAgent with query-driven other agents?

3. **Reflection Overhead:** Should all agents use Reflection pattern or only specific ones? (Cost implications)

4. **Intelligence Updates:** How do we update coaching intelligence when new sessions are added?

5. **Testing Strategy:** How to test dynamic instructions that change based on intelligence data?

---

**Status:** 🎯 READY FOR REVIEW & DISCUSSION
**Next Step:** Get approval on architecture direction, then proceed with Phase 1 implementation

