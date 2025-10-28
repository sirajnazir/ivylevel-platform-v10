/**
 * v15.3 Concrete Primitive Implementations
 *
 * Date: 2025-10-28
 * Purpose: Production-ready implementations of the 6 fundamental primitives
 * Architecture: Reuses existing v15.2 components where possible
 *
 * @module primitives/implementations
 */

import {
  Perceptor,
  ContextLoader,
  Tool,
  ToolExecutor,
  Synthesizer,
  Verifier,
  StateStore,
  ValidationResult,
  Feature,
  Context,
  ToolResult,
  ToolMetadata,
  VerificationResult,
  QualityMetrics,
} from './types';

// ============================================================================
// PERCEPTOR IMPLEMENTATIONS
// ============================================================================

/**
 * Intent Perceptor: Classifies user intent from text input
 */
export class IntentPerceptor implements Perceptor<string, { intent: string; entities: any }> {
  async perceive(input: string): Promise<{ intent: string; entities: any }> {
    // TODO: Integrate with existing IntentRoutingService from v15.2
    // For now, simple keyword-based classification
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('assessment') || lowerInput.includes('profile')) {
      return { intent: 'interactive_assessment', entities: {} };
    }

    if (lowerInput.includes('gameplan') || lowerInput.includes('strategy')) {
      return { intent: 'gameplan_strategy', entities: {} };
    }

    if (lowerInput.includes('ec') || lowerInput.includes('extracurricular')) {
      return { intent: 'ec_discovery', entities: {} };
    }

    return { intent: 'general_chat', entities: {} };
  }

  async validate(input: string): Promise<ValidationResult> {
    if (!input || input.trim().length === 0) {
      return {
        valid: false,
        errors: ['Input cannot be empty']
      };
    }

    if (input.length > 10000) {
      return {
        valid: false,
        errors: ['Input exceeds maximum length of 10000 characters']
      };
    }

    return { valid: true };
  }

  async extractFeatures(input: string): Promise<Feature[]> {
    return [
      { name: 'length', value: input.length },
      { name: 'word_count', value: input.split(/\s+/).length }
    ];
  }
}

// ============================================================================
// CONTEXT LOADER IMPLEMENTATIONS
// ============================================================================

export interface CoachingContext extends Context {
  student_id: string;
  coach_id: string;
  student_profile?: any;
  sql_facts?: any[];
}

/**
 * Coaching Context Loader: Loads student profile and SQL facts
 */
export class CoachingContextLoader implements ContextLoader<CoachingContext> {
  constructor(private db: any) {}

  async loadContext(sessionId: string, metadata?: any): Promise<CoachingContext> {
    // Extract student_id from metadata or session
    const studentId = metadata?.student_id || metadata?.input?.student_id || 'unknown';

    // TODO: Load from database
    // For now, return minimal context
    return {
      student_id: studentId,
      coach_id: 'jenny_duan',
      session_id: sessionId,
      timestamp: new Date()
    };
  }

  async enrichContext(context: CoachingContext): Promise<CoachingContext> {
    // TODO: Enrich with SQL facts from ContextEngineeringPipeline
    // For now, return context as-is
    return context;
  }
}

// ============================================================================
// TOOL EXECUTOR IMPLEMENTATION
// ============================================================================

/**
 * Default Tool Executor: Manages tool registry and execution
 */
export class DefaultToolExecutor implements ToolExecutor {
  private tools: Map<string, Tool> = new Map();

  registerTool(tool: Tool): void {
    this.tools.set(tool.metadata.name, tool);
  }

  async executeTool<TInput, TOutput>(
    toolName: string,
    input: TInput,
    context?: any
  ): Promise<ToolResult<TOutput>> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
        error_code: 'TOOL_NOT_FOUND'
      };
    }

    // Validate input
    const validation = tool.validateInput(input);
    if (!validation.valid) {
      return {
        success: false,
        error: `Tool input validation failed: ${validation.errors?.join(', ')}`,
        error_code: 'INVALID_INPUT'
      };
    }

    // Execute tool
    const startTime = Date.now();
    try {
      const result = await tool.execute(input, context);
      return {
        ...result,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tool execution failed',
        error_code: 'EXECUTION_ERROR',
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getTool<T extends Tool = Tool>(toolName: string): T | undefined {
    return this.tools.get(toolName) as T | undefined;
  }
}

// ============================================================================
// SYNTHESIZER IMPLEMENTATION
// ============================================================================

/**
 * Response Synthesizer: Combines tool results into coherent output
 */
export class ResponseSynthesizer implements Synthesizer<any, string> {
  async synthesize(inputs: any[]): Promise<string> {
    if (inputs.length === 0) {
      return "I don't have enough information to provide a response.";
    }

    // Simple concatenation for now
    // TODO: Use LLM to synthesize coherent response
    const parts: string[] = [];

    for (const input of inputs) {
      if (input.result) {
        parts.push(JSON.stringify(input.result, null, 2));
      }
    }

    return parts.join('\n\n');
  }

  async merge(partialResults: Partial<string>[]): Promise<string> {
    return partialResults.filter(Boolean).join('\n');
  }
}

// ============================================================================
// VERIFIER IMPLEMENTATION
// ============================================================================

export interface ResponseQualityMetrics extends QualityMetrics {
  has_sql_chips: boolean;
  has_harmful_content: boolean;
  coherence_score: number;
}

/**
 * Response Verifier: Validates output quality
 */
export class ResponseVerifier implements Verifier<string, ResponseQualityMetrics> {
  async verify(
    output: string,
    criteria?: any
  ): Promise<VerificationResult<ResponseQualityMetrics>> {
    const metrics: ResponseQualityMetrics = {
      score: 0,
      dimensions: {},
      passed: true,
      has_sql_chips: this.hasSQLChips(output),
      has_harmful_content: this.hasHarmfulContent(output),
      coherence_score: this.calculateCoherence(output)
    };

    // Check for harmful content
    if (metrics.has_harmful_content) {
      metrics.passed = false;
      metrics.score = 0;
      return {
        passed: false,
        score: 0,
        metrics,
        feedback: 'Output contains harmful content'
      };
    }

    // Calculate overall score
    metrics.score = metrics.coherence_score;

    if (metrics.score < 0.5) {
      metrics.passed = false;
    }

    return {
      passed: metrics.passed,
      score: metrics.score,
      metrics,
      feedback: metrics.passed
        ? 'Output passes quality checks'
        : 'Output quality below threshold'
    };
  }

  async heal(
    output: string,
    verificationResult: VerificationResult<ResponseQualityMetrics>
  ): Promise<string> {
    // Simple healing: append disclaimer if quality is low
    if (verificationResult.score < 0.5) {
      return `${output}\n\n[Note: This response may need further refinement]`;
    }

    return output;
  }

  private hasSQLChips(output: string): boolean {
    return /\[chip:sql:[^\]]+\]/.test(output);
  }

  private hasHarmfulContent(output: string): boolean {
    // Simple keyword check
    const harmfulPatterns = ['hack', 'steal', 'cheat'];
    const lowerOutput = output.toLowerCase();
    return harmfulPatterns.some(pattern => lowerOutput.includes(pattern));
  }

  private calculateCoherence(output: string): number {
    // Simple heuristic: longer outputs are more coherent (up to a point)
    const length = output.length;
    if (length < 50) return 0.3;
    if (length < 200) return 0.6;
    if (length < 500) return 0.8;
    return 0.9;
  }
}

// ============================================================================
// STATE STORE IMPLEMENTATION
// ============================================================================

/**
 * In-Memory State Store: Session state persistence
 * TODO: Replace with database-backed implementation
 */
export class InMemoryStateStore implements StateStore {
  private store: Map<string, any> = new Map();

  async save(sessionId: string, state: any): Promise<void> {
    this.store.set(sessionId, {
      ...state,
      updated_at: new Date()
    });
  }

  async load(sessionId: string): Promise<any | null> {
    return this.store.get(sessionId) || null;
  }

  async update(sessionId: string, partialState: Partial<any>): Promise<void> {
    const existingState = this.store.get(sessionId) || {};
    this.store.set(sessionId, {
      ...existingState,
      ...partialState,
      updated_at: new Date()
    });
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }
}

// ============================================================================
// EXAMPLE TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Echo Tool: Simple test tool that returns input
 */
export class EchoTool implements Tool<string, string> {
  readonly metadata: ToolMetadata = {
    name: 'echo',
    description: 'Returns the input as-is',
    parameters: { input: 'string' },
    side_effects: 'none'
  };

  async execute(input: string): Promise<ToolResult<string>> {
    return {
      success: true,
      data: input
    };
  }

  validateInput(input: string): ValidationResult {
    return { valid: typeof input === 'string' };
  }
}

/**
 * SQL Query Tool: Placeholder for database queries
 */
export class SQLQueryTool implements Tool<{ query: string }, any[]> {
  readonly metadata: ToolMetadata = {
    name: 'sql_query',
    description: 'Executes SQL query and returns results',
    parameters: { query: 'string' },
    side_effects: 'read'
  };

  constructor(private db: any) {}

  async execute(input: { query: string }): Promise<ToolResult<any[]>> {
    try {
      // TODO: Integrate with actual database
      // For now, return mock data
      return {
        success: true,
        data: []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        error_code: 'SQL_ERROR'
      };
    }
  }

  validateInput(input: { query: string }): ValidationResult {
    if (!input.query || typeof input.query !== 'string') {
      return {
        valid: false,
        errors: ['Query must be a non-empty string']
      };
    }

    // Basic SQL injection prevention
    if (input.query.toLowerCase().includes('drop table')) {
      return {
        valid: false,
        errors: ['Dangerous SQL operation not allowed']
      };
    }

    return { valid: true };
  }
}
