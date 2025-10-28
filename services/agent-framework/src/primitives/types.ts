/**
 * v15.3 Fundamental Agent Architecture - Core Types
 *
 * Date: 2025-10-28
 * Purpose: Define the 6 fundamental computational primitives as TypeScript interfaces
 * Architecture: Based on FUNDAMENTAL_AGENT_ARCHITECTURE_V1.md
 *
 * @module primitives/types
 */

// ============================================================================
// PRIMITIVE 1: PERCEPTION
// Purpose: Transform raw input into structured data
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface Feature {
  name: string;
  value: any;
  confidence?: number;
}

export interface Perceptor<TRawInput, TStructuredInput> {
  /**
   * Transform raw input into structured representation
   */
  perceive(input: TRawInput): Promise<TStructuredInput>;

  /**
   * Validate input before perception
   */
  validate(input: TRawInput): Promise<ValidationResult>;

  /**
   * Extract features from raw input for downstream processing
   */
  extractFeatures(input: TRawInput): Promise<Feature[]>;
}

// ============================================================================
// PRIMITIVE 2: CONTEXT
// Purpose: Load and enrich execution context
// ============================================================================

export interface Context {
  student_id?: string;
  coach_id?: string;
  session_id?: string;
  timestamp: Date;
  [key: string]: any;
}

export interface ContextLoader<TContext extends Context> {
  /**
   * Load context for agent execution
   */
  loadContext(identifier: string, metadata?: any): Promise<TContext>;

  /**
   * Enrich context with additional data
   */
  enrichContext(context: TContext): Promise<TContext>;
}

export interface IntelligenceLoader<TIntelligence> {
  /**
   * Load coaching intelligence (frameworks, tactics, patterns)
   */
  loadIntelligence(identifier: string): Promise<TIntelligence>;

  /**
   * Query intelligence by category
   */
  queryIntelligence(query: string, category: string): Promise<TIntelligence[]>;
}

// ============================================================================
// PRIMITIVE 3: REASONING
// Purpose: Decision-making and planning
// ============================================================================

export interface Router<TInput, TDestination> {
  /**
   * Select execution path based on input
   */
  route(input: TInput, context?: any): Promise<TDestination>;

  /**
   * Get all available routes
   */
  getRoutes(): TDestination[];
}

export interface SubGoal {
  id: string;
  description: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface Planner<TGoal, TSubGoal extends SubGoal> {
  /**
   * Decompose goal into executable sub-goals
   */
  plan(goal: TGoal, context?: any): Promise<TSubGoal[]>;

  /**
   * Replan when encountering obstacles
   */
  replan(goal: TGoal, completedSubGoals: TSubGoal[], context?: any): Promise<TSubGoal[]>;

  /**
   * Check if plan is complete
   */
  isPlanComplete(subGoals: TSubGoal[]): boolean;
}

// ============================================================================
// PRIMITIVE 4: ACTION
// Purpose: Execute capabilities
// ============================================================================

export interface ToolMetadata {
  name: string;
  description: string;
  parameters: Record<string, any>;
  side_effects: 'none' | 'read' | 'write' | 'delete';
  cost_estimate?: number;
}

export interface ToolResult<TOutput = any> {
  success: boolean;
  data?: TOutput;
  error?: string;
  error_code?: string;
  metadata?: Record<string, any>;
  execution_time_ms?: number;
}

export interface Tool<TInput = any, TOutput = any> {
  /**
   * Tool metadata
   */
  readonly metadata: ToolMetadata;

  /**
   * Execute tool with given input
   */
  execute(input: TInput, context?: any): Promise<ToolResult<TOutput>>;

  /**
   * Validate tool input before execution
   */
  validateInput(input: TInput): ValidationResult;
}

export interface ToolExecutor {
  /**
   * Register a tool
   */
  registerTool(tool: Tool): void;

  /**
   * Execute a tool by name
   */
  executeTool<TInput, TOutput>(
    toolName: string,
    input: TInput,
    context?: any
  ): Promise<ToolResult<TOutput>>;

  /**
   * Get all registered tools
   */
  getTools(): Tool[];

  /**
   * Get tool by name
   */
  getTool<T extends Tool = Tool>(toolName: string): T | undefined;
}

export interface AgentExecutor<TAgent = any> {
  /**
   * Delegate to another agent
   */
  delegate(agentId: string, input: any, context?: any): Promise<any>;

  /**
   * Register an agent
   */
  registerAgent(agentId: string, agent: TAgent): void;

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): TAgent | undefined;
}

// ============================================================================
// PRIMITIVE 5: SYNTHESIS
// Purpose: Combine and verify outputs
// ============================================================================

export interface Synthesizer<TInput, TOutput> {
  /**
   * Combine multiple inputs into coherent output
   */
  synthesize(inputs: TInput[]): Promise<TOutput>;

  /**
   * Merge partial results
   */
  merge(partialResults: Partial<TOutput>[]): Promise<TOutput>;
}

export interface QualityMetrics {
  score: number;  // 0.0-1.0
  dimensions: Record<string, number>;
  passed: boolean;
  feedback?: string;
}

export interface VerificationResult<TMetrics extends QualityMetrics = QualityMetrics> {
  passed: boolean;
  score: number;
  metrics: TMetrics;
  feedback: string;
  suggestions?: string[];
}

export interface Verifier<TOutput, TMetrics extends QualityMetrics = QualityMetrics> {
  /**
   * Verify output quality
   */
  verify(output: TOutput, criteria?: any): Promise<VerificationResult<TMetrics>>;

  /**
   * Heal/improve output if verification fails
   */
  heal(output: TOutput, verificationResult: VerificationResult<TMetrics>): Promise<TOutput>;
}

// ============================================================================
// PRIMITIVE 6: MEMORY
// Purpose: State persistence and retrieval
// ============================================================================

export interface StateStore<TState = any> {
  /**
   * Save state
   */
  save(sessionId: string, state: TState): Promise<void>;

  /**
   * Load state
   */
  load(sessionId: string): Promise<TState | null>;

  /**
   * Update partial state
   */
  update(sessionId: string, partialState: Partial<TState>): Promise<void>;

  /**
   * Delete state
   */
  delete(sessionId: string): Promise<void>;
}

export interface Memory<TMemory = any> {
  id: string;
  content: TMemory;
  type: 'semantic' | 'episodic' | 'procedural';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MemoryStore<TMemory = any> {
  /**
   * Store memory
   */
  store(memory: Memory<TMemory>): Promise<string>;

  /**
   * Retrieve memories by semantic search
   */
  retrieve(query: string, limit?: number, filter?: any): Promise<Memory<TMemory>[]>;

  /**
   * Get memory by ID
   */
  get(id: string): Promise<Memory<TMemory> | null>;

  /**
   * Delete memory
   */
  delete(id: string): Promise<void>;
}

// ============================================================================
// UNIVERSAL AGENT LIFECYCLE
// Purpose: Orchestrate the 6 primitives
// ============================================================================

export interface UniversalAgentConfig<
  TRawInput = any,
  TStructuredInput = any,
  TContext extends Context = Context,
  TOutput = any
> {
  agentId: string;
  perceptor: Perceptor<TRawInput, TStructuredInput>;
  contextLoader: ContextLoader<TContext>;
  intelligenceLoader?: IntelligenceLoader<any>;
  router?: Router<TStructuredInput, any>;
  planner?: Planner<any, SubGoal>;
  toolExecutor: ToolExecutor;
  agentExecutor?: AgentExecutor;
  synthesizer: Synthesizer<any, TOutput>;
  verifier: Verifier<TOutput>;
  stateStore: StateStore;
  memoryStore?: MemoryStore;
}

export interface AgentExecutionResult<TOutput = any> {
  success: boolean;
  output: TOutput;
  sessionId: string;
  metadata: {
    execution_time_ms: number;
    tools_used: string[];
    verification_score: number;
    phase_timings: Record<string, number>;
  };
  error?: string;
}
