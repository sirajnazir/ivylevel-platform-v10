/**
 * v15.2 Framework Integration - Type Definitions
 * Purpose: Shared types for LangChain LCEL orchestration, intent routing, reflection, and context engineering
 * Author: v15.2 Implementation
 * Date: 2025-10-28
 */

// ============================================================================
// INTENT CLASSIFICATION TYPES
// ============================================================================

export type IntentType =
  | 'interactive_assessment' // Autonomous 360° assessment session with structured phases
  | 'gameplan_strategy'
  | 'ec_discovery'
  | 'essay_help'
  | 'scholarship_search'
  | 'schedule_optimization'
  | 'mental_health'
  | 'clarification_needed';

export interface IntentClassification {
  intent: IntentType;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  model_used: string;
}

export interface StudentContext {
  student_id: string;
  archetype: string;
  grade: number;
  burnout_level: number;
  recent_topics?: string[];
}

// ============================================================================
// REFLECTION TYPES
// ============================================================================

export interface QualityScores {
  actionable: number; // 0-10
  empathetic: number; // 0-10
  data_grounded: number; // 0-10
  ivyscore_optimal: number; // 0-10
}

export interface ReflectionIteration {
  iteration_number: number;
  producer_response: string;
  producer_model: string;
  critic_feedback: string;
  critic_model: string;
  quality_scores: QualityScores;
  improvement_suggestions: string[];
  passed_quality_gate: boolean;
  final_iteration: boolean;
}

export interface ReflectionResult {
  final_response: string;
  iterations: ReflectionIteration[];
  total_iterations: number;
  average_quality_score: number;
  processing_time_ms: number;
}

// ============================================================================
// CONTEXT ENGINEERING TYPES
// ============================================================================

export interface FewShotExample {
  query: string;
  response: string;
  similarity: number;
}

export interface SQLFacts {
  gpa?: number;
  sat_score?: number;
  act_score?: number;
  awards?: string[];
  ecs?: string[];
  target_schools?: string[];
  [key: string]: any;
}

export interface ContextEngineeringResult {
  few_shot_examples: FewShotExample[];
  sql_facts: SQLFacts;
  coach_persona: string;
  final_prompt: string;
  prompt_tokens: number;
  context_sources: string[];
  retrieval_duration_ms: number;
}

// ============================================================================
// CHAIN EXECUTION TYPES
// ============================================================================

export interface ChainStep {
  step: string;
  duration_ms: number;
  output: any;
  error?: string;
}

export interface ChainTrace {
  chain_name: string;
  chain_steps: ChainStep[];
  total_duration_ms: number;
  tokens_used?: {
    prompt: number;
    completion: number;
    total: number;
  };
  success: boolean;
  error_message?: string;
  langchain_run_id?: string;
}

// ============================================================================
// STRATEGY ORCHESTRATION TYPES
// ============================================================================

export interface StrategyRequest {
  student_id: string;
  session_id: string;
  query: string;
  student_context: StudentContext;
}

export interface StrategyResponse {
  response: string;
  intent: IntentType;
  confidence: number;
  reflection_quality: number;
  processing_time_ms: number;
  trace_id: string;
}

// ============================================================================
// DATABASE RECORD TYPES (matching migration schema)
// ============================================================================

export interface IntentClassificationRecord {
  id?: string;
  student_id: string;
  session_id: string;
  query: string;
  classified_intent: IntentType;
  confidence_score: number;
  model_used: string;
  reasoning?: string;
  context_snapshot?: Record<string, any>;
  created_at?: Date;
  processing_time_ms?: number;
}

export interface ReflectionIterationRecord {
  id?: string;
  student_id: string;
  session_id: string;
  query: string;
  iteration_number: number;
  producer_response: string;
  producer_model: string;
  critic_feedback: string;
  critic_model: string;
  quality_scores: QualityScores;
  improvement_suggestions: string[];
  passed_quality_gate: boolean;
  final_iteration: boolean;
  created_at?: Date;
  processing_time_ms?: number;
}

export interface StrategyChainTraceRecord {
  id?: string;
  student_id: string;
  session_id: string;
  chain_name: string;
  query: string;
  chain_steps: ChainStep[];
  total_duration_ms: number;
  tokens_used?: {
    prompt: number;
    completion: number;
    total: number;
  };
  success: boolean;
  error_message?: string;
  langchain_run_id?: string;
  created_at?: Date;
}

export interface ContextEngineeringLogRecord {
  id?: string;
  student_id: string;
  session_id: string;
  query: string;
  intent: IntentType;
  few_shot_examples?: FewShotExample[];
  sql_facts?: SQLFacts;
  coach_persona?: string;
  final_prompt: string;
  prompt_tokens: number;
  context_sources?: string[];
  retrieval_duration_ms?: number;
  created_at?: Date;
}
