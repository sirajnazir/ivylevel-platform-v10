/**
 * Chip Creator - Evidence Provenance with PII Scrubbing
 *
 * Creates evidence chips for all agent reasoning with automatic PII redaction.
 *
 * Version: v3.2.0
 * Fix #4: Chip Parameter PII Scrubbing
 */

import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface Chip {
  id: string;
  student_id: string;
  kind: 'SQL' | 'RAG' | 'LLM' | 'EQ' | 'NARRATIVE';
  source: {
    resolver?: string;
    params: Record<string, any>;
    result?: any;
    invoked_at: string;
    [key: string]: any;
  };
  hash: string;
  trace_id: string;
  created_at: Date;
}

// ============================================================================
// PII PATTERNS (Global Redaction Rules)
// ============================================================================

const PII_PATTERNS: Record<string, RegExp> = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  dob: /\b\d{4}-\d{2}-\d{2}\b/g, // ISO date format (could be DOB)
  address: /\b\d+\s+[\w\s]+\b(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|circle|cir|boulevard|blvd)\b/gi,
  zipcode: /\b\d{5}(?:-\d{4})?\b/g,
};

// Secret key patterns (always redact)
const SECRET_KEY_PATTERNS = /password|secret|token|api_?key|auth|credential/i;

// ============================================================================
// PII SCRUBBING FUNCTION
// ============================================================================

/**
 * Scrubs PII from parameters before persisting to database.
 *
 * Redacts:
 * - Email addresses → [REDACTED_EMAIL]
 * - Phone numbers → [REDACTED_PHONE]
 * - SSN → [REDACTED_SSN]
 * - DOB (ISO dates) → [REDACTED_DOB]
 * - Addresses → [REDACTED_ADDRESS]
 * - Zip codes → [REDACTED_ZIPCODE]
 * - Secret keys (password, api_key, token, etc.) → [REDACTED_SECRET]
 *
 * @param params - Parameters to scrub
 * @returns Scrubbed parameters safe for persistence
 */
export function scrubParams(params: Record<string, any>): Record<string, any> {
  const scrubbed: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Check if key itself indicates a secret (password, api_key, etc.)
    if (SECRET_KEY_PATTERNS.test(key)) {
      scrubbed[key] = '[REDACTED_SECRET]';
      continue;
    }

    // Handle string values (apply PII patterns)
    if (typeof value === 'string') {
      let scrubbedValue = value;

      // Apply all PII patterns
      for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
        scrubbedValue = scrubbedValue.replace(pattern, `[REDACTED_${piiType.toUpperCase()}]`);
      }

      scrubbed[key] = scrubbedValue;
    }
    // Handle nested objects (recursive scrubbing)
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      scrubbed[key] = scrubParams(value);
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      scrubbed[key] = value.map((item) =>
        typeof item === 'string' ? scrubParams({ item }).item : item
      );
    }
    // Handle primitives (numbers, booleans, null)
    else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

// ============================================================================
// HASH FUNCTION (for deduplication)
// ============================================================================

/**
 * Computes SHA-256 hash of chip source for deduplication.
 * Same query parameters → same hash → same chip returned.
 *
 * @param source - Chip source object
 * @returns SHA-256 hash (hex string)
 */
function hashChip(source: any): string {
  const canonical = JSON.stringify(source, Object.keys(source).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// ============================================================================
// CHIP CREATOR CLASS
// ============================================================================

export class ChipCreator {
  /**
   * Creates a SQL chip for database queries (UDFs, facts views).
   *
   * @param resolver - UDF name (e.g., 'award_nth', 'sat_latest')
   * @param params - Query parameters (will be scrubbed)
   * @param result - Query result
   * @param traceId - OpenTelemetry trace ID
   * @param studentId - Student ID
   * @returns SQL chip with scrubbed params
   */
  static createSQLChip(
    resolver: string,
    params: Record<string, any>,
    result: any,
    traceId: string,
    studentId: string
  ): Chip {
    // Scrub PII from params before hashing
    const scrubbedParams = scrubParams(params);

    const source = {
      resolver,
      params: scrubbedParams,
      result,
      invoked_at: new Date().toISOString(),
    };

    return {
      id: crypto.randomUUID(),
      student_id: studentId,
      kind: 'SQL',
      source,
      hash: hashChip(source),
      trace_id: traceId,
      created_at: new Date(),
    };
  }

  /**
   * Creates a RAG chip for knowledge retrieval.
   *
   * @param query - RAG query (will be scrubbed)
   * @param chunks - Retrieved chunks
   * @param traceId - OpenTelemetry trace ID
   * @param studentId - Student ID
   * @returns RAG chip
   */
  static createRAGChip(
    query: string,
    chunks: any[],
    traceId: string,
    studentId: string
  ): Chip {
    const scrubbedQuery = scrubParams({ query }).query;

    const source = {
      query: scrubbedQuery,
      chunks_count: chunks.length,
      invoked_at: new Date().toISOString(),
    };

    return {
      id: crypto.randomUUID(),
      student_id: studentId,
      kind: 'RAG',
      source,
      hash: hashChip(source),
      trace_id: traceId,
      created_at: new Date(),
    };
  }

  /**
   * Creates an LLM chip for model completions.
   *
   * @param prompt - Prompt sent to LLM (will be scrubbed)
   * @param completion - Model response (will be scrubbed)
   * @param model - Model name
   * @param tokens - Token usage
   * @param traceId - OpenTelemetry trace ID
   * @param studentId - Student ID
   * @returns LLM chip
   */
  static createLLMChip(
    prompt: string,
    completion: string,
    model: string,
    tokens: { prompt: number; completion: number },
    traceId: string,
    studentId: string
  ): Chip {
    const scrubbedPrompt = scrubParams({ prompt }).prompt;
    const scrubbedCompletion = scrubParams({ completion }).completion;

    const source = {
      model,
      prompt_preview: scrubbedPrompt.slice(0, 200), // Only store preview (first 200 chars)
      completion_preview: scrubbedCompletion.slice(0, 200),
      tokens,
      invoked_at: new Date().toISOString(),
    };

    return {
      id: crypto.randomUUID(),
      student_id: studentId,
      kind: 'LLM',
      source,
      hash: hashChip(source),
      trace_id: traceId,
      created_at: new Date(),
    };
  }

  /**
   * Creates an EQ chip for tone adaptation.
   *
   * @param coachId - Coach ID
   * @param toneVector - Tone scalars applied
   * @param audience - Target audience (student, parent, coach)
   * @param traceId - OpenTelemetry trace ID
   * @param studentId - Student ID
   * @returns EQ chip
   */
  static createEQChip(
    coachId: number,
    toneVector: Record<string, number>,
    audience: string,
    traceId: string,
    studentId: string
  ): Chip {
    const source = {
      coach_id: coachId,
      tone_vector: toneVector,
      audience,
      invoked_at: new Date().toISOString(),
    };

    return {
      id: crypto.randomUUID(),
      student_id: studentId,
      kind: 'EQ',
      source,
      hash: hashChip(source),
      trace_id: traceId,
      created_at: new Date(),
    };
  }

  /**
   * Creates a NARRATIVE chip for narrative plane responses.
   *
   * @param query - Narrative query
   * @param response - Narrative response (will be scrubbed)
   * @param traceId - OpenTelemetry trace ID
   * @param studentId - Student ID
   * @returns NARRATIVE chip
   */
  static createNarrativeChip(
    query: string,
    response: string,
    traceId: string,
    studentId: string
  ): Chip {
    const scrubbedQuery = scrubParams({ query }).query;
    const scrubbedResponse = scrubParams({ response }).response;

    const source = {
      query: scrubbedQuery,
      response_preview: scrubbedResponse.slice(0, 200),
      invoked_at: new Date().toISOString(),
    };

    return {
      id: crypto.randomUUID(),
      student_id: studentId,
      kind: 'NARRATIVE',
      source,
      hash: hashChip(source),
      trace_id: traceId,
      created_at: new Date(),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { scrubParams, hashChip };
