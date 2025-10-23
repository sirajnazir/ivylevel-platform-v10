/**
 * Tool Bus - Centralized Tool Execution with Governance
 *
 * Features:
 * - Versioned tool manifests with JSON schema validation (Ajv)
 * - Policy gate integration (budgets, rate limits)
 * - Outbox pattern for idempotent logging
 * - Chip creation for evidence provenance
 *
 * Version: v3.2.0
 * Fix #10: Ajv Manifest Versioning
 */

import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { pool } from '../db/pool-rls.js';
import { ChipCreator, Chip } from '../chips/chip-creator.js';
import { withSpan } from '../telemetry/tracer.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ToolManifest {
  name: string;
  schema_version: string; // e.g., "1.0.0" - Semantic versioning
  description: string;
  schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ExecutionContext {
  student_id: string;
  agent_run_id: string;
  trace_id: string;
  coach_id?: string;
  agent_name?: string;
  token_budget?: number;
  time_budget_ms?: number;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  chip?: Chip;
  latency_ms: number;
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string, public errors: any[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Error429 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Error429';
  }
}

// ============================================================================
// AJV SETUP
// ============================================================================

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  coerceTypes: true, // Auto-coerce types (e.g., "123" → 123)
});

// Add format validators (email, date, uri, etc.)
addFormats(ajv);

// ============================================================================
// VALIDATOR CACHE (Versioned)
// ============================================================================

/**
 * Validator cache: toolName@schemaVersion → ValidateFunction
 *
 * Example: "award_nth@1.0.0" → validator
 */
const validatorCache = new Map<string, ValidateFunction>();

/**
 * Gets or creates a validator for a tool manifest.
 *
 * @param manifest - Tool manifest
 * @returns Ajv validator function
 */
function getValidator(manifest: ToolManifest): ValidateFunction {
  const cacheKey = `${manifest.name}@${manifest.schema_version}`;

  if (validatorCache.has(cacheKey)) {
    return validatorCache.get(cacheKey)!;
  }

  // Compile validator
  const validator = ajv.compile(manifest.schema);

  // Cache for future use
  validatorCache.set(cacheKey, validator);

  console.log(`[ToolBus] ✅ Compiled validator for ${cacheKey}`);

  return validator;
}

// ============================================================================
// TOOL MANIFESTS (Registry)
// ============================================================================

/**
 * Tool manifest registry.
 *
 * Add new tools here with versioned schemas.
 */
const TOOL_MANIFESTS: Record<string, ToolManifest> = {
  award_nth: {
    name: 'award_nth',
    schema_version: '1.0.0',
    description: 'Gets the nth award for a student by outcome date',
    schema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        n: { type: 'integer', minimum: 1 },
        as_of: { type: 'string', format: 'date' },
      },
      required: ['student_id', 'n'],
      additionalProperties: false,
    },
  },

  sat_latest: {
    name: 'sat_latest',
    schema_version: '1.0.0',
    description: 'Gets the latest SAT score for a student',
    schema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        as_of: { type: 'string', format: 'date' },
      },
      required: ['student_id'],
      additionalProperties: false,
    },
  },

  gpa_as_of: {
    name: 'gpa_as_of',
    schema_version: '1.0.0',
    description: 'Gets GPA as of a specific date',
    schema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
        as_of: { type: 'string', format: 'date' },
      },
      required: ['student_id'],
      additionalProperties: false,
    },
  },

  deadline_latest: {
    name: 'deadline_latest',
    schema_version: '1.0.0',
    description: 'Gets the next upcoming college deadline',
    schema: {
      type: 'object',
      properties: {
        student_id: { type: 'string' },
      },
      required: ['student_id'],
      additionalProperties: false,
    },
  },

  // Add more tool manifests here...
};

// ============================================================================
// TOOL BUS CLASS
// ============================================================================

export class ToolBus {
  /**
   * Executes a tool with governance and validation.
   *
   * Algorithm:
   * 1. Get tool manifest
   * 2. Validate params against versioned schema (Ajv)
   * 3. Check budget (optional)
   * 4. Execute tool within traced span
   * 5. Create chip for evidence provenance
   * 6. Log to outbox (idempotent)
   * 7. Return result
   *
   * @param toolName - Tool name (e.g., 'award_nth')
   * @param params - Tool parameters
   * @param context - Execution context
   * @returns Tool result
   */
  async execute(
    toolName: string,
    params: any,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // 1. Get tool manifest
    const manifest = this.getManifest(toolName);

    // 2. Validate params against versioned schema
    const validator = getValidator(manifest);

    if (!validator(params)) {
      throw new ValidationError(
        `Invalid params for ${toolName}@${manifest.schema_version}`,
        validator.errors || []
      );
    }

    // 3. Check budget (optional - if budgets provided)
    if (context.token_budget || context.time_budget_ms) {
      // await this.checkBudget(context); // Implement if needed
    }

    // 4. Execute tool within traced span
    const result = await withSpan(
      `tool.${toolName}`,
      'cognition',
      async (span) => {
        span.setAttribute('tool_name', toolName);
        span.setAttribute('tool_version', manifest.schema_version);

        // Execute the actual tool
        const toolResult = await this.executeTool(toolName, params, context);

        return toolResult;
      },
      {
        student_id: context.student_id,
        agent_name: context.agent_name,
        coach_id: context.coach_id,
      }
    );

    const latency = Date.now() - startTime;

    // 5. Create chip for evidence provenance
    const chip = ChipCreator.createSQLChip(
      toolName,
      params,
      result,
      context.trace_id,
      context.student_id
    );

    // 6. Log to outbox (idempotent)
    await this.logToOutbox(toolName, latency, chip, context);

    // 7. Return result
    return {
      success: true,
      data: result,
      chip,
      latency_ms: latency,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Gets tool manifest from registry.
   */
  private getManifest(toolName: string): ToolManifest {
    const manifest = TOOL_MANIFESTS[toolName];

    if (!manifest) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return manifest;
  }

  /**
   * Executes the actual tool (stub - replace with real implementation).
   */
  private async executeTool(
    toolName: string,
    params: any,
    context: ExecutionContext
  ): Promise<any> {
    // Stub implementation - replace with real tool calls
    // In production, this would call the actual UDF or resolver

    console.log(`[ToolBus] Executing ${toolName} with params:`, params);

    // Example: Call UDF
    if (toolName === 'award_nth') {
      const result = await pool.query(
        `SELECT * FROM award_nth($1, $2, $3)`,
        [params.student_id, params.n, params.as_of || new Date().toISOString().split('T')[0]]
      );

      return result.rows[0] || null;
    }

    // Other tools...
    return { stub: true, toolName, params };
  }

  /**
   * Logs tool execution to outbox (idempotent).
   */
  private async logToOutbox(
    toolName: string,
    latency: number,
    chip: Chip,
    context: ExecutionContext
  ): Promise<void> {
    const idempotencyKey = `${context.agent_run_id}:${toolName}:${chip.hash}`;

    await pool.query(
      `
      INSERT INTO outbox (topic, payload, idempotency_key)
      VALUES ($1, $2, $3)
      ON CONFLICT (idempotency_key) DO NOTHING
      `,
      [
        'tool.executed',
        JSON.stringify({
          tool_name: toolName,
          latency_ms: latency,
          chip_id: chip.id,
          chip_hash: chip.hash,
          trace_id: context.trace_id,
          agent_run_id: context.agent_run_id,
        }),
        idempotencyKey,
      ]
    );

    // Update agent_runs (increment tool_calls, add latency)
    await pool.query(
      `
      UPDATE agent_runs
      SET tool_calls = tool_calls + 1,
          total_latency_ms = total_latency_ms + $1
      WHERE id = $2
      `,
      [latency, context.agent_run_id]
    );
  }
}

// ============================================================================
// BREAKING CHANGE DETECTION (CI Utility)
// ============================================================================

/**
 * Detects breaking changes between two schemas.
 *
 * Breaking changes:
 * - Removed required fields
 * - Type changes
 * - Removed properties
 *
 * @param oldSchema - Old schema
 * @param newSchema - New schema
 * @returns List of breaking changes
 */
export function detectBreakingChanges(
  oldSchema: any,
  newSchema: any
): string[] {
  const breaking: string[] = [];

  // Check removed required fields
  const oldRequired = oldSchema.required || [];
  const newRequired = newSchema.required || [];

  const removedRequired = oldRequired.filter(
    (field: string) => !newRequired.includes(field)
  );

  if (removedRequired.length > 0) {
    breaking.push(`Removed required fields: ${removedRequired.join(', ')}`);
  }

  // Check type changes
  for (const [field, oldProp] of Object.entries(oldSchema.properties || {})) {
    const newProp = newSchema.properties?.[field];

    if (newProp && (oldProp as any).type !== newProp.type) {
      breaking.push(
        `Type change for ${field}: ${(oldProp as any).type} → ${newProp.type}`
      );
    }

    // Check removed properties
    if (!newProp) {
      breaking.push(`Removed property: ${field}`);
    }
  }

  return breaking;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { TOOL_MANIFESTS };
