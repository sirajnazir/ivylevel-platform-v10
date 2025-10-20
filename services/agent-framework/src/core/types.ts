/**
 * core/types.ts
 * Core types for the IvyLevel Agent Framework
 * Created: 2025-10-16 (Phase 1, Week 2)
 */

import type { ChatCompletionTool, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ==============================================================================
// Agent Types
// ==============================================================================

export type AgentCategory = 'gameplan' | 'ecs' | 'awards' | 'programs' | 'college' | 'essay' | 'scholarship' | 'execution';

export interface AgentManifest {
  agent_id: string;
  display_name: string;
  tagline: string;
  version: string;
  category: AgentCategory;

  // Tool configuration
  tools: ChatCompletionTool[];

  // Intent patterns this agent handles
  intents: Array<{
    intent_id: string;
    category: string;
    patterns: string[];
    priority: number;
  }>;

  // JTBD (Jobs to be Done)
  jtbd: {
    student: string;
    parent: string;
    success_metric: string;
  };

  // Model configuration
  model?: string;  // Defaults to JENNY_V9_EQ_MODEL from env
  temperature?: number;  // Defaults to 0.7
  max_tokens?: number;  // Defaults to 500

  // Handoffs (multi-agent routing)
  handoffs?: string[];  // Agent IDs this agent can hand off to
}

// ==============================================================================
// Session Types
// ==============================================================================

export interface IvyLevelSession {
  session_id: string;
  student_id: string;
  student_name?: string;
  coach_id?: string;  // Coach/tenant ID for multi-coach support

  // Student context (loaded once per session)
  context: StudentContext;

  // Conversation history
  messages: ChatCompletionMessageParam[];

  // Session metadata
  created_at: Date;
  last_active: Date;
  turn_count: number;
}

export interface StudentContext {
  // Core vitals
  student_id: string;
  student_name: string;
  grade: number;
  high_school?: string;

  // Quick stats (cached from KB)
  gpa?: number;
  sat_total?: number;
  act_composite?: number;

  // Profile summary
  ecs_count?: number;
  awards_count?: number;
  programs_count?: number;

  // Context loaded timestamp
  loaded_at: Date;
}

// ==============================================================================
// Agent Response Types
// ==============================================================================

export interface AgentResponse {
  // Response text
  answer: string;

  // Evidence chips (sources)
  chips: Array<{
    kind: 'evidence' | 'tool' | 'source';
    text: string;
    metadata?: Record<string, any>;
  }>;

  // Raw data hits
  hits: any[];

  // Debug info
  debug?: {
    agent_id: string;
    tools_called: string[];
    took_ms: number;
    model: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  // Handoff suggestion (multi-agent routing)
  handoff?: {
    to_agent: string;
    reason: string;
  };
}

// ==============================================================================
// Agent Execution Types
// ==============================================================================

export interface AgentExecutionContext {
  session: IvyLevelSession;
  user_message: string;
  agent_manifest: AgentManifest;

  // Optional intent hint from router
  intent?: {
    category: string;
    confidence: number;
    extracted_entities?: Record<string, any>;
  };
}

export interface AgentExecutionResult {
  response: AgentResponse;
  session: IvyLevelSession;  // Updated session

  // Metrics
  execution_time_ms: number;
  tokens_used: number;
}

// ==============================================================================
// Tool Execution Types
// ==============================================================================

export interface ToolCall {
  tool_name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  took_ms?: number;
}

// ==============================================================================
// Multi-Agent Routing Types
// ==============================================================================

export interface HandoffRequest {
  from_agent: string;
  to_agent: string;
  reason: string;
  context: {
    original_query: string;
    conversation_history: ChatCompletionMessageParam[];
    student_context: StudentContext;
  };
}

export interface HandoffResponse {
  accepted: boolean;
  agent_response?: AgentResponse;
  rejection_reason?: string;
}

// ==============================================================================
// Agent Registry Types
// ==============================================================================

export interface RegisteredAgent {
  manifest: AgentManifest;
  instance: any;  // BaseAgent instance
  status: 'active' | 'inactive' | 'maintenance';
  last_used: Date;
  request_count: number;
}
