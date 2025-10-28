# Fundamental Agent Architecture: Computational Primitives
## From Domain-Specific Agents to Abstract Base Classes

**Date:** 2025-10-28
**Purpose:** Distill agents to fundamental computational primitives per Design Pattern Analysis
**Approach:** Input-Configure-Behavior-Action-Tool decomposition at the abstract class level

---

## Executive Summary

This document reverse-engineers our domain-specific agents (AssessmentAgent, GamePlanAgent, etc.) and OpenAI SDK patterns back to **fundamental computational primitives** that exist at the **abstract base class** level, independent of any domain naming.

**Key Insight:** All "agents" are just specialized configurations of 6 fundamental computational primitives:
1. **Perception** (Input Processing) - *Enhanced with EQ-Sense for emotional intelligence*
2. **Context** (State & Configuration) - *Enhanced with EQ Profile Loader for coaching DNA*
3. **Reasoning** (Behavior/Decision Logic)
4. **Action** (Output Generation) - *Enhanced with ToneAdapter Tool for style application*
5. **Tool** (External Capability) - *ToneAdapter as first-class governable tool*
6. **Memory** (Persistent State) - *Enhanced with Narrative Memory for exemplar chunks*

**🎯 CRITICAL ENHANCEMENT:** Emotional Intelligence (EQ) is integrated as a **first-class middleware component** that preserves Jenny's coaching DNA (tone, style, empathy) while maintaining "Proof Over Promise" principles. See `EQ_ARCHITECTURE_INTEGRATION_V1.md` for complete details.

---

## Part 1: Design Pattern Primitives → Abstract Classes

### From Design Pattern Analysis to Computational Primitives

| Design Pattern | Computational Primitive | Abstract Class | Purpose |
|----------------|------------------------|----------------|---------|
| **Prompt Chaining** | Sequential Composition | `Chain<TInput, TOutput>` | Compose multi-step transformations |
| **Routing** | Conditional Branching | `Router<TInput, TDestination>` | Select execution path based on input |
| **Parallelization** | Concurrent Execution | `ParallelExecutor<TTask[], TResult[]>` | Execute independent operations concurrently |
| **Reflection** | Self-Verification Loop | `Verifier<TOutput, TQualityMetrics>` | Validate and improve outputs |
| **Tool Use** | External Capability | `Tool<TInput, TOutput>` | Interface to external systems |
| **Planning** | Goal Decomposition | `Planner<TGoal, TSubgoal[]>` | Break goals into executable tasks |
| **Multi-Agent** | Distributed Computation | `AgentCollective<TSpecialization[]>` | Coordinate specialized processors |
| **Memory** | State Management | `StateStore<TState>` | Persist and retrieve context |

### EQ Enhancement: Emotional Intelligence as First-Class Primitive

The 6 core primitives are enhanced with **Emotional Intelligence (EQ)** middleware components:

| EQ Component | Enhanced Primitive | Integration Method | Purpose |
|--------------|-------------------|-------------------|---------|
| **EQ-Sense** | `Perceptor` | Parallel perceptor for emotional context | Detect sentiment, urgency, audience register, barriers |
| **EQ Profile Loader** | `ContextLoader` | Extended to load coach DNA | Load tone vectors, lexical cadence, style weights, exemplar chunks |
| **ToneAdapter Tool** | `Tool` | Registered as governable tool | Apply Jenny's coaching style to LLM output post-generation |
| **Critic Guard** | `Verifier` | Enhanced with provenance check | Ensure style preserves factual evidence (SQL chips) |
| **EQ Chip Logger** | `StateStore` | Extended with EQ audit trail | Log style vectors, exemplars used, audience register |
| **Narrative Memory** | `MemoryStore` | Semantic search for exemplars | Retrieve relatable micro-stories for style transfer |

**Design Philosophy:** EQ is **middleware**, not a separate system. It enhances existing primitives without violating the Universal Agent lifecycle.

**Critical Guarantee:** Style never trumps substance. The `Verifier` ensures "Proof Over Promise" by rolling back to raw output if style removes any factual evidence.

**See:** `EQ_ARCHITECTURE_INTEGRATION_V1.md` for complete implementation details, database schemas, and 4-phase integration plan.

---

## Part 2: The Universal Agent Computation Model

### Fundamental Agent Lifecycle (Abstract)

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: PERCEPTION (Input Processing)                         │
│ - Receives: Raw input (text, structured data, events)          │
│ - Processes: Normalization, validation, feature extraction     │
│ - Outputs: Structured perception                               │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: CONTEXT (State Loading & Configuration)               │
│ - Loads: Persistent state from StateStore                      │
│ - Retrieves: Relevant knowledge from MemoryStore               │
│ - Configures: Dynamic parameters based on context              │
│ - Outputs: Enriched context                                    │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: REASONING (Behavior/Decision Logic)                   │
│ - Routes: Select execution path (Router)                       │
│ - Plans: Decompose into sub-goals (Planner)                    │
│ - Decides: Which tools to invoke, which agents to delegate     │
│ - Outputs: Execution plan                                      │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: ACTION (Execution)                                    │
│ - Tool Invocation: Call external capabilities (Tools)          │
│ - Sub-Agent Delegation: Hand off to specialists (Multi-Agent)  │
│ - Parallel Execution: Run independent tasks (Parallelization)  │
│ - Outputs: Raw results from actions                            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: SYNTHESIS (Output Generation)                         │
│ - Composes: Combine results into coherent response             │
│ - Verifies: Quality check (Reflection)                         │
│ - Heals: Improve if quality below threshold                    │
│ - Outputs: Final response                                      │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: MEMORY (State Persistence)                            │
│ - Stores: Conversation history, learned patterns               │
│ - Updates: Session state, long-term knowledge                  │
│ - Indexes: For semantic retrieval in future queries            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Abstract Base Classes (Implementation-Agnostic)

### 3.1 Perception: Input Processing

```typescript
/**
 * Perceptor<TRawInput, TStructuredInput>
 *
 * Purpose: Transform raw inputs into structured, validated data
 * Examples: Text → Intent, Event → Trigger, Image → Features
 */
interface Perceptor<TRawInput, TStructuredInput> {
  /**
   * Perceive and structure raw input
   */
  perceive(input: TRawInput): Promise<TStructuredInput>;

  /**
   * Validate input meets requirements
   */
  validate(input: TRawInput): ValidationResult;

  /**
   * Extract features from input
   */
  extractFeatures(input: TRawInput): Feature[];
}

/**
 * Concrete Implementation: IntentPerceptor
 * Maps: User message (text) → Intent classification
 */
class IntentPerceptor implements Perceptor<string, Intent> {
  async perceive(userMessage: string): Promise<Intent> {
    // Pattern: Routing (Design Pattern Analysis)
    // Use LLM to classify user intent
    const classification = await this.llm.classify({
      text: userMessage,
      categories: this.intentCategories,
      outputFormat: IntentSchema
    });

    return {
      category: classification.category,
      entity: classification.entity,
      confidence: classification.confidence,
      parameters: classification.extracted_params
    };
  }

  validate(userMessage: string): ValidationResult {
    if (userMessage.length === 0) {
      return { valid: false, reason: "Empty input" };
    }
    if (userMessage.length > 5000) {
      return { valid: false, reason: "Input too long" };
    }
    return { valid: true };
  }

  extractFeatures(userMessage: string): Feature[] {
    return [
      { name: "length", value: userMessage.length },
      { name: "has_question_mark", value: userMessage.includes("?") },
      { name: "keywords", value: this.extractKeywords(userMessage) }
    ];
  }
}
```

**IvyLevel Mapping:**
- `IntentPerceptor` = Current `intentRouter.ts:routePrompt()`
- `EventPerceptor` = Current `EventBus.emit()` → `AssessmentAgent.handleStudentOnboarded()`
- `TemporalPerceptor` = Current `temporalFacts.ts:extractTemporalIntent()`

---

### 3.2 Context: State & Configuration

```typescript
/**
 * ContextLoader<TContext>
 *
 * Purpose: Load and enrich context for decision-making
 * Examples: StudentContext, SessionState, KnowledgeBase
 */
interface ContextLoader<TContext> {
  /**
   * Load context for given entity
   */
  load(entityId: string): Promise<TContext>;

  /**
   * Enrich context with additional data
   */
  enrich(context: TContext, enrichmentType: string[]): Promise<TContext>;

  /**
   * Validate context completeness
   */
  validate(context: TContext): ValidationResult;
}

/**
 * Concrete Implementation: StudentContextLoader
 * Loads: Student profile, academic vitals, psycho-behavioral data
 */
class StudentContextLoader implements ContextLoader<StudentContext> {
  async load(studentId: string): Promise<StudentContext> {
    // Pattern: Tool Use (Design Pattern Analysis)
    // Query database for student data
    const profile = await this.db.query(`
      SELECT * FROM students WHERE student_id = $1
    `, [studentId]);

    const vitals = await this.db.query(`
      SELECT * FROM nsm_dashboard WHERE student_id = $1
    `, [studentId]);

    return {
      student_id: studentId,
      name: profile.name,
      grade: profile.grade,
      gpa: vitals.gpa,
      sat_total: vitals.sat_total,
      // ... full context
    };
  }

  async enrich(
    context: StudentContext,
    enrichmentTypes: string[]
  ): Promise<StudentContext> {
    for (const type of enrichmentTypes) {
      switch (type) {
        case "archetype":
          context.archetype = await this.detectArchetype(context);
          break;
        case "barriers":
          context.barriers = await this.identifyBarriers(context);
          break;
        case "coaching_intelligence":
          context.recommendedTactics = await this.intelligenceLoader
            .getTacticsForArchetype(context.archetype);
          break;
      }
    }
    return context;
  }

  validate(context: StudentContext): ValidationResult {
    if (!context.student_id) {
      return { valid: false, reason: "Missing student_id" };
    }
    if (context.grade < 9 || context.grade > 12) {
      return { valid: false, reason: "Invalid grade level" };
    }
    return { valid: true };
  }
}

/**
 * IntelligenceLoader<TIntelligence>
 *
 * Purpose: Load coaching intelligence to dynamically configure agents
 * Pattern: Data-Driven Configuration (not hard-coded prompts)
 */
interface IntelligenceLoader<TIntelligence> {
  /**
   * Load intelligence data from storage
   */
  load(source: string): Promise<TIntelligence[]>;

  /**
   * Query intelligence for specific patterns
   */
  query(criteria: QueryCriteria): Promise<TIntelligence[]>;

  /**
   * Get dynamic instructions based on intelligence
   */
  generateInstructions(context: any): Promise<string>;
}

/**
 * Concrete Implementation: CoachingIntelligenceLoader
 * Loads: 11 coaching sessions × 17 intelligence layers
 */
class CoachingIntelligenceLoader implements IntelligenceLoader<CoachingSession> {
  private sessions: CoachingSession[] = [];

  async load(source: string): Promise<CoachingSession[]> {
    // Load all 11 JSON files
    const files = await fs.readdir(source);
    for (const file of files) {
      const data = JSON.parse(await fs.readFile(file));
      this.sessions.push(data);
    }
    return this.sessions;
  }

  query(criteria: QueryCriteria): Promise<CoachingSession[]> {
    // Filter sessions by archetype, phase, tactic type, etc.
    return this.sessions.filter(session =>
      criteria.archetype ? session.student_archetype === criteria.archetype : true &&
      criteria.phase ? session.phases.includes(criteria.phase) : true
    );
  }

  async generateInstructions(context: StudentContext): Promise<string> {
    // Pattern: Dynamic Instructions (OpenAI SDK)
    // Generate instructions based on student archetype + golden data

    const relevantSessions = this.query({
      archetype: context.archetype
    });

    const questions = this.getQuestionsByPhase(
      context.current_phase,
      relevantSessions
    );

    const tactics = this.getTacticsForArchetype(
      context.archetype,
      relevantSessions
    );

    const frameworks = this.getFrameworksForBarriers(
      context.barriers,
      relevantSessions
    );

    return `You are Jenny Duan coaching ${context.name}.

**Student Archetype:** ${context.archetype}
**Current Phase:** ${context.current_phase}

**Phase Questions (from real coaching sessions):**
${questions.map(q => `- ${q.text}`).join('\n')}

**Coaching Tactics for ${context.archetype}:**
${tactics.map(t => `- ${t.name}: ${t.principle}`).join('\n')}

**Frameworks to Introduce:**
${frameworks.map(f => `- ${f.name}: "${f.introduction_language}"`).join('\n')}`;
  }
}
```

**IvyLevel Mapping:**
- `StudentContextLoader` = Current `StudentContextRepository.getByStudentId()`
- `CoachingIntelligenceLoader` = **NEW** (proposed in v2.0 architecture)
- `SessionStateLoader` = Current `IvyLevelSession` in `types.ts`

---

### 3.3 Reasoning: Behavior & Decision Logic

```typescript
/**
 * Router<TInput, TDestination>
 *
 * Purpose: Select execution path based on input characteristics
 * Pattern: Routing (Design Pattern Analysis)
 */
interface Router<TInput, TDestination> {
  /**
   * Route input to appropriate destination
   */
  route(input: TInput): Promise<TDestination>;

  /**
   * Get routing confidence score
   */
  getConfidence(input: TInput, destination: TDestination): number;

  /**
   * Register new routing rules
   */
  registerRule(rule: RoutingRule<TInput, TDestination>): void;
}

/**
 * Concrete Implementation: IntentRouter
 * Routes: User query → Specialized agent
 */
class IntentRouter implements Router<Intent, Agent> {
  private rules: RoutingRule<Intent, Agent>[] = [];
  private agents: Map<string, Agent> = new Map();

  async route(intent: Intent): Promise<Agent> {
    // Check each rule in priority order
    for (const rule of this.rules.sort((a, b) => b.priority - a.priority)) {
      if (rule.matches(intent)) {
        const agent = this.agents.get(rule.destinationAgentId);
        if (agent) return agent;
      }
    }

    // Default fallback
    return this.agents.get('gameplan-agent')!;
  }

  getConfidence(intent: Intent, agent: Agent): number {
    // Calculate confidence based on intent-agent alignment
    const matchingIntents = agent.config.intents.filter(agentIntent =>
      agentIntent.patterns.some(pattern =>
        intent.category.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    return matchingIntents.length > 0 ? intent.confidence : 0.3;
  }

  registerRule(rule: RoutingRule<Intent, Agent>): void {
    this.rules.push(rule);
  }
}

/**
 * Planner<TGoal, TSubgoal[]>
 *
 * Purpose: Decompose high-level goals into executable sub-goals
 * Pattern: Planning (Design Pattern Analysis)
 */
interface Planner<TGoal, TSubgoal> {
  /**
   * Decompose goal into sub-goals
   */
  decompose(goal: TGoal): Promise<TSubgoal[]>;

  /**
   * Identify dependencies between sub-goals
   */
  analyzeDependencies(subgoals: TSubgoal[]): DependencyGraph;

  /**
   * Generate execution order respecting dependencies
   */
  sequence(subgoals: TSubgoal[], dependencies: DependencyGraph): TSubgoal[];

  /**
   * Replan if obstacle encountered
   */
  replan(
    originalPlan: TSubgoal[],
    completedSteps: TSubgoal[],
    obstacle: Obstacle
  ): Promise<TSubgoal[]>;
}

/**
 * Concrete Implementation: AssessmentPlanner
 * Decomposes: "Complete 360° assessment" → 4 phases → 27 layers
 */
class AssessmentPlanner implements Planner<AssessmentGoal, AssessmentPhase> {
  async decompose(goal: AssessmentGoal): Promise<AssessmentPhase[]> {
    // Pattern: Planning with LLM
    // Use coaching intelligence to determine phases

    const intelligence = await this.intelligenceLoader.load(
      '/data/coaching_intelligence/extractions'
    );

    // Extract session structure from golden data
    const phaseStructure = intelligence[0].session_metadata.phases;

    return [
      {
        phase_id: "discovery",
        phase_name: "Discovery",
        goal: "Understand student passions, values, authentic self",
        questions: this.intelligenceLoader.getQuestionsByPhase("discovery"),
        success_criteria: "7 responses collected, narrative clarity > 0.3",
        estimated_duration_minutes: 10
      },
      {
        phase_id: "narrative",
        phase_name: "Narrative Building",
        goal: "Craft unique story using 3-hub framework",
        questions: this.intelligenceLoader.getQuestionsByPhase("narrative"),
        success_criteria: "Identity fusion created, narrative clarity > 0.7",
        estimated_duration_minutes: 15
      },
      {
        phase_id: "strategy",
        phase_name: "Strategic Alignment",
        goal: "Recommend ECs, awards, programs aligned with narrative",
        questions: this.intelligenceLoader.getQuestionsByPhase("strategy"),
        success_criteria: "Strategic recommendations generated",
        estimated_duration_minutes: 15
      },
      {
        phase_id: "time",
        phase_name: "Time Architecture",
        goal: "Build 168-hour framework and milestones",
        questions: this.intelligenceLoader.getQuestionsByPhase("time"),
        success_criteria: "Weekly schedule created, milestones set",
        estimated_duration_minutes: 5
      }
    ];
  }

  analyzeDependencies(phases: AssessmentPhase[]): DependencyGraph {
    return {
      "discovery": { requires: [], blocks: ["narrative"] },
      "narrative": { requires: ["discovery"], blocks: ["strategy"] },
      "strategy": { requires: ["narrative"], blocks: ["time"] },
      "time": { requires: ["strategy"], blocks: [] }
    };
  }

  sequence(
    phases: AssessmentPhase[],
    dependencies: DependencyGraph
  ): AssessmentPhase[] {
    // Topological sort respecting dependencies
    return phases.sort((a, b) => {
      if (dependencies[a.phase_id].blocks.includes(b.phase_id)) return -1;
      if (dependencies[b.phase_id].blocks.includes(a.phase_id)) return 1;
      return 0;
    });
  }

  async replan(
    originalPlan: AssessmentPhase[],
    completedPhases: AssessmentPhase[],
    obstacle: Obstacle
  ): Promise<AssessmentPhase[]> {
    // Pattern: Adaptive Replanning
    // Use LLM to replan based on obstacle

    const planningPrompt = `You are replanning an assessment session.

**Original Plan:** ${originalPlan.map(p => p.phase_name).join(' → ')}
**Completed:** ${completedPhases.map(p => p.phase_name).join(', ')}
**Obstacle:** ${obstacle.description}

**Replan the remaining phases to achieve the original goal while addressing the obstacle.**

Output as JSON array of phases.`;

    const revisedPlan = await this.llm.generate({
      prompt: planningPrompt,
      outputFormat: AssessmentPhaseSchema.array()
    });

    return [...completedPhases, ...revisedPlan];
  }
}
```

**IvyLevel Mapping:**
- `IntentRouter` = Current `AgentRegistry.routeQuery()`
- `AssessmentPlanner` = **NEW** (needed for autonomous assessment)
- `GamePlanPlanner` = **NEW** (needed for strategic planning)

---

### 3.4 Action: Tool & Agent Execution

```typescript
/**
 * Tool<TInput, TOutput>
 *
 * Purpose: Interface to external capabilities (APIs, databases, computations)
 * Pattern: Tool Use (Design Pattern Analysis)
 */
interface Tool<TInput, TOutput> {
  /**
   * Tool metadata for LLM function calling
   */
  getManifest(): ToolManifest;

  /**
   * Execute tool with given input
   */
  execute(input: TInput): Promise<TOutput>;

  /**
   * Validate input before execution
   */
  validateInput(input: TInput): ValidationResult;

  /**
   * Parse output into structured format
   */
  parseOutput(rawOutput: any): TOutput;
}

/**
 * Concrete Implementation: GetAwardsListTool
 * Queries: Database for student awards by phase
 */
class GetAwardsListTool implements Tool<AwardsQuery, Award[]> {
  getManifest(): ToolManifest {
    return {
      type: "function",
      function: {
        name: "get_awards_list",
        description: "Retrieve student's awards by phase (initial, progression, final)",
        parameters: {
          type: "object",
          properties: {
            student_id: { type: "string", description: "Student UUID" },
            phase: {
              type: "string",
              enum: ["initial", "progression", "final"],
              description: "Which awards to retrieve"
            }
          },
          required: ["student_id", "phase"]
        }
      }
    };
  }

  async execute(input: AwardsQuery): Promise<Award[]> {
    // Pattern: Tool Use with zero-hallucination guarantee
    // Query database for exact data

    const result = await this.db.query(`
      SELECT award_name, award_type, tier, date_received
      FROM awards
      WHERE student_id = $1 AND phase = $2
      ORDER BY tier DESC, date_received DESC
    `, [input.student_id, input.phase]);

    return result.rows.map(row => ({
      name: row.award_name,
      type: row.award_type,
      tier: row.tier,
      date: row.date_received
    }));
  }

  validateInput(input: AwardsQuery): ValidationResult {
    if (!input.student_id) {
      return { valid: false, reason: "Missing student_id" };
    }
    if (!["initial", "progression", "final"].includes(input.phase)) {
      return { valid: false, reason: "Invalid phase" };
    }
    return { valid: true };
  }

  parseOutput(rawOutput: any): Award[] {
    // Ensure output matches schema
    return AwardSchema.array().parse(rawOutput);
  }
}

/**
 * ToolExecutor<TToolRegistry>
 *
 * Purpose: Manage tool invocation with LLM function calling
 * Pattern: Tool Use (OpenAI SDK)
 */
interface ToolExecutor<TToolRegistry> {
  /**
   * Register tool for LLM use
   */
  registerTool(tool: Tool<any, any>): void;

  /**
   * Execute tool based on LLM function call
   */
  executeTool(functionCall: FunctionCall): Promise<ToolResult>;

  /**
   * Execute multiple tools in sequence or parallel
   */
  executeTools(
    functionCalls: FunctionCall[],
    mode: "sequential" | "parallel"
  ): Promise<ToolResult[]>;

  /**
   * Get all registered tools
   */
  getTools(): ToolManifest[];
}

/**
 * Concrete Implementation: AgentToolExecutor
 * Executes: OpenAI function calls → Tool invocation
 */
class AgentToolExecutor implements ToolExecutor<Map<string, Tool<any, any>>> {
  private tools: Map<string, Tool<any, any>> = new Map();

  registerTool(tool: Tool<any, any>): void {
    const manifest = tool.getManifest();
    this.tools.set(manifest.function.name, tool);
  }

  async executeTool(functionCall: FunctionCall): Promise<ToolResult> {
    const tool = this.tools.get(functionCall.name);
    if (!tool) {
      throw new Error(`Tool not found: ${functionCall.name}`);
    }

    const args = JSON.parse(functionCall.arguments);

    // Validate input
    const validation = tool.validateInput(args);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason
      };
    }

    // Execute tool
    const startTime = Date.now();
    const result = await tool.execute(args);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: result,
      metadata: {
        tool_name: functionCall.name,
        duration_ms: duration,
        timestamp: new Date()
      }
    };
  }

  async executeTools(
    functionCalls: FunctionCall[],
    mode: "sequential" | "parallel"
  ): Promise<ToolResult[]> {
    if (mode === "parallel") {
      // Pattern: Parallelization
      return Promise.all(
        functionCalls.map(call => this.executeTool(call))
      );
    } else {
      // Sequential execution
      const results: ToolResult[] = [];
      for (const call of functionCalls) {
        const result = await this.executeTool(call);
        results.push(result);
      }
      return results;
    }
  }

  getTools(): ToolManifest[] {
    return Array.from(this.tools.values()).map(tool =>
      tool.getManifest()
    );
  }
}

/**
 * AgentExecutor<TAgent>
 *
 * Purpose: Coordinate multi-agent execution (delegation, handoffs)
 * Pattern: Multi-Agent (Design Pattern Analysis)
 */
interface AgentExecutor<TAgent> {
  /**
   * Execute single agent
   */
  execute(agent: TAgent, input: any): Promise<AgentResult>;

  /**
   * Delegate to specialized agent (Manager pattern)
   */
  delegate(
    fromAgent: TAgent,
    toAgent: TAgent,
    context: DelegationContext
  ): Promise<AgentResult>;

  /**
   * Hand off conversation to another agent (Handoff pattern)
   */
  handoff(
    fromAgent: TAgent,
    toAgent: TAgent,
    conversationHistory: Message[]
  ): Promise<AgentResult>;

  /**
   * Execute multiple agents in parallel (Parallelization)
   */
  executeParallel(agents: TAgent[], input: any): Promise<AgentResult[]>;
}
```

**IvyLevel Mapping:**
- `Tool` = Current `resolverTools.ts:executeResolverTool()`
- `ToolExecutor` = Current `BaseAgent.callOpenAI()` with function calling loop
- `AgentExecutor` = Current `AgentRegistry.routeQuery()` + `BaseAgent.detectHandoff()`

---

### 3.5 Synthesis: Output Generation & Verification

```typescript
/**
 * Synthesizer<TInput[], TOutput>
 *
 * Purpose: Combine multiple inputs into coherent output
 * Pattern: Prompt Chaining final step
 */
interface Synthesizer<TInput, TOutput> {
  /**
   * Synthesize inputs into output
   */
  synthesize(inputs: TInput[]): Promise<TOutput>;

  /**
   * Validate synthesis quality
   */
  validate(output: TOutput): QualityMetrics;
}

/**
 * Verifier<TOutput, TQualityMetrics>
 *
 * Purpose: Verify output quality and trigger improvements
 * Pattern: Reflection (Design Pattern Analysis)
 */
interface Verifier<TOutput, TQualityMetrics> {
  /**
   * Verify output meets quality standards
   */
  verify(output: TOutput): Promise<VerificationResult<TQualityMetrics>>;

  /**
   * Improve output based on verification feedback
   */
  improve(
    output: TOutput,
    verification: VerificationResult<TQualityMetrics>
  ): Promise<TOutput>;

  /**
   * Iterative verification loop
   */
  verifyWithHealing(
    output: TOutput,
    maxAttempts: number
  ): Promise<{
    finalOutput: TOutput;
    quality: TQualityMetrics;
    attempts: number;
    wasHealed: boolean;
  }>;
}

/**
 * Concrete Implementation: ResponseVerifier
 * Verifies: Agent response quality using Producer-Critic pattern
 */
class ResponseVerifier implements Verifier<string, ResponseQuality> {
  async verify(response: string): Promise<VerificationResult<ResponseQuality>> {
    // Pattern: Reflection (Producer-Critic)
    // Use separate LLM call to critique response

    const criticPrompt = `You are a quality critic for coaching responses.

**Response to evaluate:**
${response}

**Quality Criteria:**
1. Warmth (0-100): Empathy, validation, human connection
2. Actionability (0-100): Concrete next steps, specific guidance
3. Data-Groundedness (0-100): Uses factual data, no hallucinations
4. Appropriateness (0-100): Tone matches context

**Output JSON with scores, issues, and suggestions.**`;

    const criticResult = await this.llm.generate({
      prompt: criticPrompt,
      model: "gpt-4o-mini",  // Different model for objectivity
      temperature: 0.1,       // Low temp for consistency
      outputFormat: ResponseQualitySchema
    });

    return {
      quality: criticResult,
      passed: criticResult.overall >= 75,
      issues: criticResult.issues,
      suggestions: criticResult.suggestions
    };
  }

  async improve(
    response: string,
    verification: VerificationResult<ResponseQuality>
  ): Promise<string> {
    // Pattern: Reflection (Healing)
    // Regenerate response addressing critique

    const healingPrompt = `Your previous response had quality issues.

**Original Response:**
${response}

**Issues Identified:**
${verification.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

**Suggestions for Improvement:**
${verification.suggestions.map((sug, i) => `${i + 1}. ${sug}`).join('\n')}

**Regenerate the response addressing these issues.**`;

    const healedResponse = await this.llm.generate({
      prompt: healingPrompt,
      model: "gpt-4o",  // Use producer model
      temperature: 0.7
    });

    return healedResponse;
  }

  async verifyWithHealing(
    response: string,
    maxAttempts: number = 3
  ): Promise<{
    finalOutput: string;
    quality: ResponseQuality;
    attempts: number;
    wasHealed: boolean;
  }> {
    let currentResponse = response;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Verify current response
      const verification = await this.verify(currentResponse);

      // Exit if quality acceptable
      if (verification.passed) {
        return {
          finalOutput: currentResponse,
          quality: verification.quality,
          attempts,
          wasHealed: attempts > 0
        };
      }

      // Improve response
      currentResponse = await this.improve(currentResponse, verification);
      attempts++;
    }

    // Return best effort after max attempts
    const finalVerification = await this.verify(currentResponse);
    return {
      finalOutput: currentResponse,
      quality: finalVerification.quality,
      attempts,
      wasHealed: true
    };
  }
}
```

**IvyLevel Mapping:**
- `Synthesizer` = Current `compose.ts:composeAnswer()`
- `Verifier` = Current `response-verifier.ts:verifyResponseQuality()`
- `ResponseVerifier.improve()` = Current `response-healer.ts:healResponse()`

---

### 3.6 Memory: State Persistence

```typescript
/**
 * StateStore<TState>
 *
 * Purpose: Persist and retrieve state across sessions
 * Pattern: Memory (Design Pattern Analysis)
 */
interface StateStore<TState> {
  /**
   * Save state for entity
   */
  save(entityId: string, state: TState): Promise<void>;

  /**
   * Load state for entity
   */
  load(entityId: string): Promise<TState | null>;

  /**
   * Update partial state
   */
  update(entityId: string, partialState: Partial<TState>): Promise<void>;

  /**
   * Clear state for entity
   */
  clear(entityId: string): Promise<void>;
}

/**
 * Concrete Implementation: SessionStateStore
 * Stores: Conversation history, session metadata
 */
class SessionStateStore implements StateStore<SessionState> {
  async save(sessionId: string, state: SessionState): Promise<void> {
    await this.db.query(`
      INSERT INTO sessions (session_id, state, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (session_id)
      DO UPDATE SET state = $2, updated_at = NOW()
    `, [sessionId, JSON.stringify(state)]);
  }

  async load(sessionId: string): Promise<SessionState | null> {
    const result = await this.db.query(`
      SELECT state FROM sessions WHERE session_id = $1
    `, [sessionId]);

    return result.rows[0]?.state || null;
  }

  async update(
    sessionId: string,
    partialState: Partial<SessionState>
  ): Promise<void> {
    const currentState = await this.load(sessionId);
    const updatedState = { ...currentState, ...partialState };
    await this.save(sessionId, updatedState);
  }

  async clear(sessionId: string): Promise<void> {
    await this.db.query(`
      DELETE FROM sessions WHERE session_id = $1
    `, [sessionId]);
  }
}

/**
 * MemoryStore<TMemory>
 *
 * Purpose: Long-term knowledge storage with semantic retrieval
 * Pattern: Memory (Advanced - Semantic/Episodic/Procedural)
 */
interface MemoryStore<TMemory> {
  /**
   * Store memory with semantic indexing
   */
  store(memory: TMemory): Promise<string>;

  /**
   * Retrieve memories by semantic similarity
   */
  retrieve(query: string, limit: number): Promise<TMemory[]>;

  /**
   * Update existing memory
   */
  update(memoryId: string, memory: TMemory): Promise<void>;

  /**
   * Forget memory (delete)
   */
  forget(memoryId: string): Promise<void>;
}

/**
 * Concrete Implementation: CoachingMemoryStore
 * Stores: Learned patterns, successful tactics, student insights
 */
class CoachingMemoryStore implements MemoryStore<CoachingMemory> {
  private vectorStore: VectorDatabase;

  async store(memory: CoachingMemory): Promise<string> {
    // Pattern: Memory with vector embeddings
    const embedding = await this.embeddings.embed(memory.content);

    const memoryId = uuid();
    await this.vectorStore.insert({
      id: memoryId,
      content: memory.content,
      embedding,
      metadata: {
        type: memory.type,  // semantic | episodic | procedural
        student_id: memory.student_id,
        timestamp: new Date(),
        tags: memory.tags
      }
    });

    return memoryId;
  }

  async retrieve(query: string, limit: number): Promise<CoachingMemory[]> {
    // Pattern: Semantic retrieval
    const queryEmbedding = await this.embeddings.embed(query);

    const results = await this.vectorStore.search({
      embedding: queryEmbedding,
      limit,
      threshold: 0.7  // Cosine similarity threshold
    });

    return results.map(result => ({
      id: result.id,
      content: result.content,
      type: result.metadata.type,
      student_id: result.metadata.student_id,
      relevance: result.score
    }));
  }

  async update(memoryId: string, memory: CoachingMemory): Promise<void> {
    await this.forget(memoryId);
    await this.store(memory);
  }

  async forget(memoryId: string): Promise<void> {
    await this.vectorStore.delete(memoryId);
  }
}
```

**IvyLevel Mapping:**
- `SessionStateStore` = Current `IvyLevelSession` in BaseAgent
- `MemoryStore` = **MISSING** (no long-term memory beyond sessions)
- `CoachingMemoryStore` = **NEW** (needed for learning across sessions)

---

## Part 4: Unified Agent Architecture (Abstract Class Hierarchy)

### The Universal Agent Class

```typescript
/**
 * Agent<TContext, TMemory>
 *
 * Universal agent class composed of fundamental primitives
 * All domain-specific agents (Assessment, GamePlan, Awards, etc.)
 * are just configurations of this universal agent
 */
class Agent<TContext = any, TMemory = any> {
  // ============================================================
  // CONFIGURATION (Static - set at construction)
  // ============================================================
  private config: AgentConfig<TContext, TMemory>;

  // ============================================================
  // PRIMITIVES (Injected dependencies)
  // ============================================================
  private perceptor: Perceptor<any, any>;
  private contextLoader: ContextLoader<TContext>;
  private intelligenceLoader: IntelligenceLoader<any>;
  private router: Router<any, Agent>;
  private planner: Planner<any, any>;
  private toolExecutor: ToolExecutor<any>;
  private agentExecutor: AgentExecutor<Agent>;
  private synthesizer: Synthesizer<any, any>;
  private verifier: Verifier<any, any>;
  private stateStore: StateStore<any>;
  private memoryStore: MemoryStore<TMemory>;

  // ============================================================
  // LIFECYCLE (Universal 6-phase execution)
  // ============================================================

  async execute(input: any): Promise<AgentResult> {
    const startTime = Date.now();

    // PHASE 1: PERCEPTION
    const perception = await this.perceive(input);

    // PHASE 2: CONTEXT
    const context = await this.loadContext(perception);

    // PHASE 3: REASONING
    const plan = await this.reason(perception, context);

    // PHASE 4: ACTION
    const actionResults = await this.act(plan, context);

    // PHASE 5: SYNTHESIS
    const output = await this.synthesize(actionResults, context);

    // PHASE 6: MEMORY
    await this.persistMemory(perception, context, output);

    return {
      output,
      metadata: {
        duration_ms: Date.now() - startTime,
        phases_executed: ["perception", "context", "reasoning", "action", "synthesis", "memory"]
      }
    };
  }

  // ============================================================
  // PHASE 1: PERCEPTION
  // ============================================================
  private async perceive(input: any): Promise<Perception> {
    // Use configured perceptor
    const structured = await this.perceptor.perceive(input);

    // Validate
    const validation = this.perceptor.validate(input);
    if (!validation.valid) {
      throw new Error(`Invalid input: ${validation.reason}`);
    }

    // Extract features
    const features = this.perceptor.extractFeatures(input);

    return {
      structured,
      features,
      raw: input
    };
  }

  // ============================================================
  // PHASE 2: CONTEXT
  // ============================================================
  private async loadContext(perception: Perception): Promise<TContext> {
    // Load base context
    const entityId = this.extractEntityId(perception);
    let context = await this.contextLoader.load(entityId);

    // Enrich with intelligence
    context = await this.contextLoader.enrich(context, [
      "archetype",
      "barriers",
      "coaching_intelligence"
    ]);

    // Load session state
    const sessionId = this.extractSessionId(perception);
    const sessionState = await this.stateStore.load(sessionId);
    context.session = sessionState;

    // Retrieve relevant memories
    const memories = await this.memoryStore.retrieve(
      perception.structured.query,
      5
    );
    context.memories = memories;

    return context;
  }

  // ============================================================
  // PHASE 3: REASONING
  // ============================================================
  private async reason(
    perception: Perception,
    context: TContext
  ): Promise<ExecutionPlan> {
    // Route to specialized behavior
    const destination = await this.router.route(perception.structured);

    // If routing to different agent, delegate
    if (destination !== this) {
      return {
        type: "delegate",
        targetAgent: destination,
        reason: "Specialized agent better suited"
      };
    }

    // Decompose into sub-goals (if planner configured)
    if (this.config.planning_enabled) {
      const subgoals = await this.planner.decompose({
        goal: perception.structured.query,
        context
      });

      const dependencies = this.planner.analyzeDependencies(subgoals);
      const sequence = this.planner.sequence(subgoals, dependencies);

      return {
        type: "multi_step",
        steps: sequence,
        dependencies
      };
    }

    // Single-step execution
    return {
      type: "single_step",
      tools: this.selectTools(perception, context),
      instructions: await this.generateInstructions(perception, context)
    };
  }

  // ============================================================
  // PHASE 4: ACTION
  // ============================================================
  private async act(
    plan: ExecutionPlan,
    context: TContext
  ): Promise<ActionResult[]> {
    if (plan.type === "delegate") {
      // Delegate to specialized agent
      const result = await this.agentExecutor.delegate(
        this,
        plan.targetAgent,
        { perception, context }
      );
      return [{ type: "delegation", result }];
    }

    if (plan.type === "multi_step") {
      // Execute multi-step plan
      const results: ActionResult[] = [];
      for (const step of plan.steps) {
        const stepResult = await this.executeStep(step, context);
        results.push(stepResult);

        // Adaptive replanning if step failed
        if (!stepResult.success && this.config.adaptive_replanning) {
          plan.steps = await this.planner.replan(
            plan.steps,
            results.filter(r => r.success).map(r => r.step),
            stepResult.obstacle
          );
        }
      }
      return results;
    }

    // Single-step execution with tools
    const toolResults = await this.toolExecutor.executeTools(
      plan.tools,
      this.config.tool_execution_mode || "sequential"
    );

    // Generate response using LLM
    const llmResult = await this.generateResponse(
      plan.instructions,
      toolResults,
      context
    );

    return [{ type: "llm_generation", result: llmResult, toolResults }];
  }

  // ============================================================
  // PHASE 5: SYNTHESIS
  // ============================================================
  private async synthesize(
    actionResults: ActionResult[],
    context: TContext
  ): Promise<string> {
    // Combine action results
    const combined = await this.synthesizer.synthesize(actionResults);

    // Verify quality (Reflection pattern)
    if (this.config.reflection_enabled) {
      const { finalOutput, quality, wasHealed } =
        await this.verifier.verifyWithHealing(combined, 3);

      return finalOutput;
    }

    return combined;
  }

  // ============================================================
  // PHASE 6: MEMORY
  // ============================================================
  private async persistMemory(
    perception: Perception,
    context: TContext,
    output: string
  ): Promise<void> {
    // Update session state
    const sessionId = this.extractSessionId(perception);
    await this.stateStore.update(sessionId, {
      last_query: perception.raw,
      last_response: output,
      turn_count: context.session.turn_count + 1,
      updated_at: new Date()
    });

    // Store in long-term memory (if learning enabled)
    if (this.config.learning_enabled) {
      await this.memoryStore.store({
        type: "episodic",
        content: `Query: ${perception.raw}\nResponse: ${output}`,
        student_id: this.extractEntityId(perception),
        tags: [perception.structured.category],
        timestamp: new Date()
      });
    }
  }

  // ============================================================
  // HELPER: Dynamic Instruction Generation
  // ============================================================
  private async generateInstructions(
    perception: Perception,
    context: TContext
  ): Promise<string> {
    // If instructions are function, call it
    if (typeof this.config.instructions === "function") {
      return await this.config.instructions(context, this);
    }

    // If instructions are static string, use it
    return this.config.instructions;
  }
}
```

---

## Part 5: Mapping Domain Agents to Universal Agent

### All 10 Agents as Configurations

```typescript
// ============================================================
// ASSESSMENT AGENT = Universal Agent + Assessment Configuration
// ============================================================
const assessmentAgent = new Agent<StudentContext, AssessmentMemory>({
  name: "Assessment Coach",
  agent_id: "assessment-agent",

  // PERCEPTION: Event-based trigger
  perceptor: new EventPerceptor("student_onboarded"),

  // CONTEXT: Student profile + coaching intelligence
  contextLoader: new StudentContextLoader(),
  intelligenceLoader: new CoachingIntelligenceLoader(),

  // REASONING: Planning-driven (4-phase autonomous flow)
  planning_enabled: true,
  planner: new AssessmentPlanner(),

  // ACTION: Question asking, framework introduction
  tools: [
    new GetStudentProfileTool(),
    new GetNSMDashboardTool(),
    new DetectArchetypeTool(),
    new SearchFrameworksTool(),
    new GetRelevantTacticsTool()
  ],

  // SYNTHESIS: Narrative synthesis from 4 phases
  synthesizer: new NarrativeSynthesizer(),
  reflection_enabled: true,
  verifier: new ResponseVerifier(),

  // MEMORY: Track phase progression
  stateStore: new SessionStateStore(),
  memoryStore: new CoachingMemoryStore(),
  learning_enabled: true,

  // INSTRUCTIONS: Dynamic from coaching intelligence
  instructions: async (context, agent) => {
    const intel = await agent.intelligenceLoader.load();
    const phase = context.session.current_phase;
    const archetype = context.archetype;

    return `You are Jenny Duan conducting a 360° assessment.

**Phase:** ${phase} (${phase === 'discovery' ? '1/4' : '2/4'})
**Archetype:** ${archetype}

**Questions to Ask:**
${intel.getQuestionsByPhase(phase).map(q => `- ${q.text}`).join('\n')}

**Tactics to Use:**
${intel.getTacticsForArchetype(archetype).map(t => `- ${t.name}`).join('\n')}

**Frameworks to Introduce:**
${intel.getFrameworksForBarriers(context.barriers).map(f => `- ${f.name}`).join('\n')}`;
  }
});

// ============================================================
// GAMEPLAN AGENT = Universal Agent + GamePlan Configuration
// ============================================================
const gamePlanAgent = new Agent<StudentContext, GamePlanMemory>({
  name: "GamePlan Strategist",
  agent_id: "gameplan-agent",

  // PERCEPTION: Intent classification from user message
  perceptor: new IntentPerceptor(),

  // CONTEXT: Student profile + NSM dashboard
  contextLoader: new StudentContextLoader(),

  // REASONING: Routing to specialized agents if needed
  router: new IntentRouter(),
  planning_enabled: false,  // No multi-step planning

  // ACTION: Tool-driven factual responses
  tools: [
    new GetNSMDashboardTool(),
    new GetJTBDPendingTool(),
    new GetCollegeListTool(),
    new GetRelevantTacticsTool(),
    new GetSATScoresTool(),
    new GetGPATool()
  ],
  tool_execution_mode: "parallel",  // Execute tools in parallel

  // SYNTHESIS: Strategic synthesis with tactics
  synthesizer: new StrategicSynthesizer(),
  reflection_enabled: true,

  // MEMORY: Session-based
  stateStore: new SessionStateStore(),

  // INSTRUCTIONS: Static prompt
  instructions: `You are Jenny Duan, a strategic game plan advisor.

**Your Role:** Big-picture college application strategy

**Critical Rules:**
- ALWAYS call tools before answering
- NEVER hallucinate college names, essay topics, teacher names
- Use get_nsm_dashboard for profile status
- Use get_jtbd_pending for upcoming tasks
- Use get_relevant_tactics for barriers`
});

// ============================================================
// AWARDS AGENT = Universal Agent + Awards Configuration
// ============================================================
const awardsAgent = new Agent<StudentContext, AwardsMemory>({
  name: "Awards Advisor",
  agent_id: "awards-agent",

  perceptor: new IntentPerceptor(),
  contextLoader: new StudentContextLoader(),
  intelligenceLoader: new CoachingIntelligenceLoader(),

  router: new IntentRouter(),

  tools: [
    new GetAwardsListTool(),
    new GetNSMDashboardTool(),
    new GetRelevantTacticsTool()
  ],

  synthesizer: new AwardsSynthesizer(),
  reflection_enabled: true,

  stateStore: new SessionStateStore(),

  instructions: async (context, agent) => {
    const intel = await agent.intelligenceLoader.load();
    return `You are an awards strategy specialist.

**Award Tiers:**
${intel.getAwardTiers()}

**Competition Pathways:**
${intel.getCompetitionPathways()}

**Critical:** NEVER mention specific awards unless from tools.`;
  }
});

// ... Similar configurations for all 10 agents
```

---

## Part 6: Benefits of This Architecture

### 1. **DRY Principle (Don't Repeat Yourself)**

**Before:**
- 10 agents × 200 lines of duplicated code = 2000 lines
- Each agent reimplements perception, context, synthesis, memory

**After:**
- 1 universal Agent class = 500 lines
- 10 agent configurations = 50 lines each = 500 lines
- **Total: 1000 lines (50% reduction)**

### 2. **Separation of Concerns**

| Concern | Before | After |
|---------|--------|-------|
| **What** (Business Logic) | Mixed with implementation | Pure configuration |
| **How** (Implementation) | Duplicated across agents | Universal Agent class |
| **Data** (Intelligence) | Hardcoded in prompts | IntelligenceLoader |

### 3. **Testability**

**Before:**
- Test entire agent end-to-end (slow, brittle)

**After:**
- Unit test each primitive independently:
  - `IntentPerceptor.perceive()` test
  - `StudentContextLoader.load()` test
  - `AssessmentPlanner.decompose()` test
  - `ResponseVerifier.verify()` test

### 4. **Composability**

**Before:**
- Can't reuse agent components

**After:**
- Mix and match primitives:
  - `AssessmentAgent` uses `AssessmentPlanner`
  - `GamePlanAgent` uses same `IntentRouter`
  - All agents use same `ResponseVerifier`

### 5. **Intelligence-Driven**

**Before:**
- Hardcoded prompts: `"You are Jenny Duan..."`

**After:**
- Dynamic instructions from golden data:
  - Questions from real coaching sessions
  - Tactics from archetype patterns
  - Frameworks from successful interventions

### 6. **Pattern Compliance**

All Design Pattern Analysis patterns are now **explicit abstractions**:

| Pattern | Abstract Class | How It's Used |
|---------|---------------|---------------|
| Prompt Chaining | `Chain<TInput, TOutput>` | Composing multi-step flows |
| Routing | `Router<TInput, TDestination>` | Intent classification |
| Parallelization | `ParallelExecutor` | Concurrent tool execution |
| Reflection | `Verifier<TOutput>` | Quality verification |
| Tool Use | `Tool<TInput, TOutput>` | Zero-hallucination data access |
| Planning | `Planner<TGoal, TSubgoal[]>` | Autonomous goal decomposition |
| Multi-Agent | `AgentExecutor<TAgent>` | Delegation and handoffs |
| Memory | `StateStore<TState>` + `MemoryStore<TMemory>` | Short-term + long-term memory |

---

## Part 7: Implementation Roadmap

### Phase 1: Build Abstract Primitives (Week 1-2)

**Deliverables:**
- `Perceptor<TInput, TOutput>` interface + `IntentPerceptor` implementation
- `ContextLoader<TContext>` interface + `StudentContextLoader` implementation
- `IntelligenceLoader<TIntelligence>` interface + `CoachingIntelligenceLoader` implementation
- `Router<TInput, TDestination>` interface + `IntentRouter` implementation
- `Planner<TGoal, TSubgoal>` interface + `AssessmentPlanner` implementation
- `Tool<TInput, TOutput>` interface + 10 tool implementations
- `ToolExecutor<TToolRegistry>` implementation
- `AgentExecutor<TAgent>` implementation
- `Synthesizer<TInput, TOutput>` interface + implementations
- `Verifier<TOutput, TQuality>` interface + `ResponseVerifier` implementation
- `StateStore<TState>` interface + `SessionStateStore` implementation
- `MemoryStore<TMemory>` interface + `CoachingMemoryStore` implementation

### Phase 2: Build Universal Agent Class (Week 2-3)

**Deliverables:**
- `Agent<TContext, TMemory>` class with 6-phase lifecycle
- `AgentConfig<TContext, TMemory>` interface
- Dependency injection setup
- Unit tests for each phase

### Phase 3: Migrate AssessmentAgent (Week 3-4)

**Deliverables:**
- `AssessmentAgent` as configuration of `Agent` class
- `AssessmentPlanner` with 4-phase decomposition
- Dynamic instructions from `CoachingIntelligenceLoader`
- End-to-end test of autonomous assessment

### Phase 4: Migrate Remaining 9 Agents (Week 4-6)

**Deliverables:**
- All 10 agents as configurations
- Shared primitives fully utilized
- 90% code deduplication achieved

### Phase 5: Advanced Features (Week 6-7)

**Deliverables:**
- Long-term memory with semantic retrieval
- Adaptive replanning for AssessmentAgent
- Parallel multi-agent execution
- Learning from successful interactions

---

## Part 8: Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| **Code Deduplication** | 10% reuse | 90% reuse | Lines of shared code / total lines |
| **Intelligence Integration** | 1/10 agents | 10/10 agents | Agents using `IntelligenceLoader` |
| **Pattern Compliance** | 0/8 patterns | 8/8 patterns | Patterns implemented as abstract classes |
| **Testability** | End-to-end only | Unit + Integration | % of primitives with unit tests |
| **Extensibility** | New agent = 500 lines | New agent = 50 lines | Lines to add new agent |

---

**Status:** 🎯 FUNDAMENTAL ARCHITECTURE COMPLETE
**Next Step:** Review and approve approach, then begin Phase 1 implementation

