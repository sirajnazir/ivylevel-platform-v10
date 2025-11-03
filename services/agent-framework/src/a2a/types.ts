/**
 * A2A (Agent-to-Agent) Handover Types
 *
 * Universal structures for agent-to-agent communication compliant with:
 * - Foundation Agents Architecture (Fact-First v2.0, Intelligence Types v18.0)
 * - v26 Multi-Agent Platform patterns
 * - BaseAgent lifecycle integration
 *
 * Version: v28.0
 * Created: 2025-11-02
 */

import type { FactSet } from '../facts/FactSet';

// ============================================================================
// UNIVERSAL A2A HANDOVER PACKAGE
// ============================================================================

export enum A2AHandoverType {
  SYNC_HANDOFF = 'sync_handoff',           // Assessment → GamePlan (user stays in session)
  ASYNC_EVENT = 'async_event',             // Weekly trigger → Execution Agent
  COLLABORATION = 'collaboration'          // GamePlan consults Awards
}

export interface A2AHandoverPackage {
  // Identity
  handover_id: string;
  handover_type: A2AHandoverType;

  // Routing
  from_agent: string;
  to_agent: string;
  session_id: string;
  student_id: string;

  // Data (Fact-First)
  facts: FactSet;

  // Domain-Specific
  domain_payload: DomainPayload;

  // Execution Context
  execution_context: ExecutionContext;

  // Metadata
  metadata: A2AHandoverMetadata;

  // Timestamps
  created_at: Date;
  expires_at?: Date;  // For async events
}

export interface A2AHandoverMetadata {
  // Intelligence used by source agent
  intelligence_types_used: string[];

  // Quality metrics
  source_confidence?: number;
  facts_validated?: boolean;

  // Conversation context
  message_count?: number;
  conversation_phase?: string;

  // Performance
  processing_time_ms?: number;

  // Handover reasons
  handover_reason?: string;
  user_visible_transition?: boolean;
  requires_user_confirmation?: boolean;
  priority?: 'low' | 'medium' | 'high';

  // Assessment-specific metadata
  assessment_message_count?: number;
  assessment_confidence_level?: number;
}

// ============================================================================
// DOMAIN-SPECIFIC PAYLOADS
// ============================================================================

export type DomainPayload =
  | AssessmentToGamePlanPayload
  | GamePlanToExecutionPayload
  | GamePlanToAwardsPayload
  | ExecutionToGamePlanPayload
  | ProactiveCheckInPayload;

export interface AssessmentToGamePlanPayload {
  domain: 'assessment_to_gameplan';

  // Identity & Narrative
  synthesis_delivered: boolean;
  identity_synthesis: string;
  unique_positioning: string;
  narrative_thread: string;

  // Competitive Analysis
  ivy_score: number;
  competitiveness_tier: string;
  rubric_scores: {
    academics: number;
    extracurriculars: number;
    summer_programs: number;
    awards: number;
    essays: number;
    total: number;
  };
  top_strengths: string[];
  critical_gaps: string[];

  // Gap Analysis
  p0_gaps: Gap[];
  p1_gaps: Gap[];
  quick_wins: QuickWin[];

  // Potential
  potential_indicators: Indicator[];
  potential_boost: number;

  // Demographics
  demographics: StudentDemographics;

  // Assessment meta
  assessment_completed_at: string;
}

export interface GamePlanToExecutionPayload {
  domain: 'gameplan_to_execution';

  // GamePlan context
  game_plan_created: boolean;
  game_plan_version: number;
  quarterly_plan: QuarterlyPlan;
  current_quarter: number;
  current_week: number;

  // Immediate actions
  next_2_weeks_actions: Action[];
  priority_areas: string[];

  // Tracking
  baseline_rubric: number;
  current_rubric: number;
  target_rubric: number;
  gap_per_quarter: number;

  // Milestones
  upcoming_milestones: Milestone[];
}

export interface GamePlanToAwardsPayload {
  domain: 'gameplan_to_awards';

  // Strategic context
  identity_synthesis: string;
  target_major: string;
  target_schools: string[];

  // Current state
  current_awards: string[];
  awards_gap: Gap[];

  // Consultation query
  consultation_query: string;
}

export interface ExecutionToGamePlanPayload {
  domain: 'execution_to_gameplan';

  // Progress update
  week_number: number;
  completed_actions: Action[];
  blocked_actions: Action[];

  // Trigger reason
  trigger_reason: 'weekly_review' | 'milestone_achieved' | 'blocking_detected';
}

export interface ProactiveCheckInPayload {
  domain: 'proactive_checkin';

  // Trigger context
  trigger_type: 'weekly_progress' | 'deadline_approaching' | 'milestone_achieved';
  trigger_data: any;

  // Message context
  student_name: string;
  last_activity_date: string;
}

export interface Gap {
  category: string;
  severity: 'p0' | 'p1' | 'p2';
  description: string;
  recommendation: string;
}

export interface QuickWin {
  action: string;
  impact: string;
  time_to_complete: string;
  roi: number;
}

export interface Indicator {
  indicator_type: string;
  confidence: number;
  evidence: string;
  recommendation: string;
}

export interface StudentDemographics {
  grade: number;
  high_school: string;
  location: string;
  intended_major: string;
  gpa?: number;
  gpa_type?: string;
  sat_total?: number;
  act_composite?: number;
  ap_count?: number;
}

export interface QuarterlyPlan {
  quarter_number: number;
  quarter_name: string;
  weeks: number[];
  priority_areas: string[];
  target_rubric_increase: number;
  major_milestones: string[];
}

export interface Action {
  action_id: string;
  action_name: string;
  priority: 'P0' | 'P1' | 'P2';
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface Milestone {
  milestone_id: string;
  milestone_name: string;
  target_week: number;
  priority: 'P0' | 'P1' | 'P2';
  status: 'upcoming' | 'in_progress' | 'completed';
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

export interface ExecutionContext {
  // Session context
  session_id: string;
  student_id: string;

  // Timeline
  current_week?: number;
  target_colleges?: string[];
  timeline_start?: string;
  timeline_end?: string;

  // Capabilities expected from target agent
  expected_capabilities?: string[];

  // Constraints for target agent
  constraints?: {
    max_response_time_ms?: number;
    max_turns?: number;
    required_intelligence_types?: string[];
  };

  // User expectations
  user_expectations?: {
    immediate_response_needed: boolean;
    preferred_response_style: string;
  };
}

// ============================================================================
// HANDOVER VALIDATION
// ============================================================================

export interface HandoverValidationResult {
  passed: boolean;
  reason?: string;
  missing_fields?: string[];
  invalid_facts?: string[];
}

// ============================================================================
// EVENT-DRIVEN A2A
// ============================================================================

export interface A2AEventTrigger {
  event_id: string;
  event_type: string;
  source_agent?: string;
  target_agent: string;
  facts: FactSet;
  requires_response: boolean;
  priority: 'high' | 'medium' | 'low';
  created_at: Date;
}

export interface A2AEventAction {
  send_message: boolean;
  message?: string;
  type: string;
  metadata?: any;
}

// ============================================================================
// COLLABORATION REQUESTS
// ============================================================================

export interface A2ACollaborationRequest {
  request_id: string;
  requesting_agent: string;
  consulted_agent: string;
  query: string;
  facts: FactSet;
  scope: string;
  timeout_ms?: number;
}

export interface A2ACollaborationResponse {
  request_id: string;
  answer: string;
  facts_provided: FactSet;
  confidence: number;
  consulted_agent: string;
  processing_time_ms: number;
}

// ============================================================================
// A2A HANDOVER RESULT
// ============================================================================

export interface A2AHandoverResult {
  success: boolean;
  handover_id: string;
  new_agent: string;
  response: string;
  metadata: {
    handover_complete: boolean;
    facts_transferred: number;
    processing_time_ms: number;
  };
  error?: string;
}
