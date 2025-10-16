import { randomUUID } from 'crypto';
import { pool } from '../db/pool.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('trace');

export interface TraceEvent {
  component: string;
  operation: string;
  api_provider?: string;
  api_method?: string;
  api_request?: any;
  api_response?: any;
  api_error?: string;
  metadata?: Record<string, any>;
}

export class Trace {
  private id: string;
  private sessionId: string;
  private studentId: string;
  private message: string;
  private events: (TraceEvent & { sequence: number; start_time: Date; end_time?: Date })[] = [];
  private sequence = 0;
  private startTime: Date;
  private endTime?: Date;
  private finalAnswer?: string;
  private error?: string;
  private modelUsed?: string;
  private tokensUsed?: { prompt?: number; completion?: number; total?: number };
  private intent?: string;
  private detectedFactKinds?: string[];

  constructor(sessionId: string, studentId: string, message: string) {
    this.id = randomUUID();
    this.sessionId = sessionId;
    this.studentId = studentId;
    this.message = message;
    this.startTime = new Date();
  }

  getId(): string {
    return this.id;
  }

  setIntent(intent: string, detectedFactKinds?: string[]): void {
    this.intent = intent;
    this.detectedFactKinds = detectedFactKinds;
  }

  async startEvent(event: TraceEvent): Promise<number> {
    const eventSequence = ++this.sequence;
    this.events.push({
      ...event,
      sequence: eventSequence,
      start_time: new Date()
    });
    return eventSequence;
  }

  async endEvent(sequence: number, updates?: Partial<TraceEvent>): Promise<void> {
    const event = this.events.find(e => e.sequence === sequence);
    if (event) {
      event.end_time = new Date();
      if (updates) {
        Object.assign(event, updates);
      }
    }
  }

  setFinalAnswer(answer: string, modelUsed?: string): void {
    this.finalAnswer = answer;
    if (modelUsed) this.modelUsed = modelUsed;
  }

  setError(error: string): void {
    this.error = error;
  }

  setTokensUsed(tokens: { prompt?: number; completion?: number; total?: number }): void {
    this.tokensUsed = tokens;
  }

  // Wrapper for async functions with automatic tracing
  async wrap<T>(
    component: string,
    operation: string,
    fn: () => Promise<T>,
    options?: {
      api_provider?: string;
      api_method?: string;
      sanitizeRequest?: (req: any) => any;
      sanitizeResponse?: (res: any) => any;
      extractMetadata?: (result: T) => Record<string, any>;
    }
  ): Promise<T> {
    const eventId = await this.startEvent({
      component,
      operation,
      api_provider: options?.api_provider,
      api_method: options?.api_method
    });

    try {
      const result = await fn();
      
      const updates: Partial<TraceEvent> = {};
      
      if (options?.sanitizeResponse) {
        updates.api_response = options.sanitizeResponse(result);
      }
      
      if (options?.extractMetadata) {
        updates.metadata = options.extractMetadata(result);
      }

      await this.endEvent(eventId, updates);
      return result;
    } catch (error: any) {
      await this.endEvent(eventId, {
        api_error: error.message || String(error)
      });
      throw error;
    }
  }

  // Save trace to database
  async save(): Promise<void> {
    this.endTime = new Date();

    try {
      // Insert main trace
      await pool.query(
        `INSERT INTO query_traces (
          id, session_id, student_id, message, intent, detected_fact_kinds,
          start_time, end_time, final_answer, error, model_used, tokens_used
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          this.id,
          this.sessionId,
          this.studentId,
          this.message,
          this.intent,
          this.detectedFactKinds,
          this.startTime,
          this.endTime,
          this.finalAnswer,
          this.error,
          this.modelUsed,
          this.tokensUsed ? JSON.stringify(this.tokensUsed) : null
        ]
      );

      // Insert events
      for (const event of this.events) {
        await pool.query(
          `INSERT INTO query_trace_events (
            trace_id, sequence, component, operation, start_time, end_time,
            api_provider, api_method, api_request, api_response, api_error, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            this.id,
            event.sequence,
            event.component,
            event.operation,
            event.start_time,
            event.end_time || null,
            event.api_provider || null,
            event.api_method || null,
            event.api_request ? JSON.stringify(event.api_request) : null,
            event.api_response ? JSON.stringify(event.api_response) : null,
            event.api_error || null,
            event.metadata ? JSON.stringify(event.metadata) : null
          ]
        );
      }

      log.event('trace_saved', {
        trace_id: this.id,
        duration_ms: this.endTime.getTime() - this.startTime.getTime(),
        event_count: this.events.length
      });
    } catch (error: any) {
      log.error('trace_save_failed', error);
    }
  }

  // Static helper to load trace from database
  static async load(traceId: string): Promise<any> {
    const { rows } = await pool.query(
      'SELECT * FROM get_trace_details($1)',
      [traceId]
    );
    return rows[0] || null;
  }
}

// Sanitizers for removing sensitive data
export const sanitizers = {
  // Remove API keys and tokens
  pinecone: {
    request: (req: any) => {
      const sanitized = { ...req };
      delete sanitized.apiKey;
      return sanitized;
    },
    response: (res: any) => {
      if (res?.matches) {
        return {
          matches: res.matches.length,
          scores: res.matches.map((m: any) => m.score)
        };
      }
      return { result_count: res?.length || 0 };
    }
  },

  openai: {
    request: (req: any) => {
      const sanitized = { ...req };
      delete sanitized.apiKey;
      if (sanitized.messages) {
        sanitized.message_count = sanitized.messages.length;
        sanitized.messages = sanitized.messages.map((m: any) => ({
          role: m.role,
          content_length: m.content?.length || 0
        }));
      }
      return sanitized;
    },
    response: (res: any) => ({
      model: res?.model,
      usage: res?.usage,
      finish_reason: res?.choices?.[0]?.finish_reason,
      content_length: res?.choices?.[0]?.message?.content?.length || 0
    })
  },

  cohere: {
    request: (req: any) => {
      const sanitized = { ...req };
      delete sanitized.apiKey;
      return {
        model: sanitized.model,
        document_count: sanitized.documents?.length || 0,
        top_n: sanitized.top_n
      };
    },
    response: (res: any) => ({
      result_count: res?.results?.length || 0,
      relevance_scores: res?.results?.map((r: any) => r.relevance_score)
    })
  },

  postgres: {
    request: (req: any) => ({
      query_name: req.name,
      param_count: req.params?.length || 0
    }),
    response: (res: any) => ({
      row_count: res?.rows?.length || 0,
      command: res?.command
    })
  }
};