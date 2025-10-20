/**
 * Coach Intelligence Types
 *
 * 31 intelligence layers + 7 personas + custom tools + pattern library
 * Based on v10.3 coach_intelligence schema and FIRST_PRINCIPLES_ARCHITECTURE.md
 */

import { StudentContext } from './StudentContext.js';

/**
 * Custom Coaching Tool
 * Coach-specific differentiation (20% custom)
 */
export interface CoachingTool {
  tool_id: string;
  name: string;
  description: string;
  applicable_to: string[]; // e.g., ["STEM", "female", "underrepresented"]
}

/**
 * Success Pattern
 * Reusable patterns that grow with experience
 */
export interface SuccessPattern {
  pattern_name: string;
  student_archetype: string; // e.g., "Type_B_collaborative"
  outcome_achieved: string; // e.g., "NCWIT National Award"
  reusable: boolean;
  tactics_used: string[];
  context_factors: Record<string, any>;
}

/**
 * Pattern Library
 * Grows with coaching experience
 */
export interface PatternLibrary {
  assessments_completed: number;
  gameplans_generated: number;
  students_coached: number;
  success_patterns: SuccessPattern[];
}

/**
 * Coach Intelligence Profile
 * Complete coach intelligence configuration
 */
export interface CoachIntelligence {
  coach_id: string;
  coach_name: string;
  specialty: string[]; // e.g., ['builder', 'STEM', 'underrepresented', 'games', 'CS']
  credibility_markers: string[]; // e.g., ['Stanford', 'NCWIT winner', 'KWK instructor']

  // Intelligence configuration
  intelligence_layers: number; // e.g., 31
  personas: number; // e.g., 7

  // Custom tools registry (20% differentiation)
  custom_tools: CoachingTool[];

  // Pattern library (grows with experience)
  pattern_library: PatternLibrary;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Coaching Action Type
 * Standardized actions all coaches must support
 */
export type CoachingActionType =
  | 'assessment'
  | 'gameplan'
  | 'weekly_execution'
  | 'parent_navigation'
  | 'time_architecture'
  | 'crisis_response'
  | 'celebration'
  | 'nudge'
  | 'strategic_pivot';

/**
 * Situation Context
 * Dynamic context for tool selection
 */
export interface SituationContext {
  action_type: CoachingActionType;
  timing: {
    class_year: string;
    current_week: number;
    time_of_day?: string;
  };
  trigger?: {
    event_type: string; // e.g., 'task_overdue', 'parent_message', 'crisis'
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
  additional_context?: Record<string, any>;
}

/**
 * Coaching Response
 * Output from coach intelligence processing
 */
export interface CoachingResponse {
  message: string;
  tone: 'casual' | 'professional' | 'urgent' | 'celebratory';
  actions: Array<{
    action_type: string;
    description: string;
    due_date?: Date;
  }>;
  follow_up?: {
    scheduled_for: Date;
    type: string;
  };
  metadata: {
    personas_used: string[];
    tools_applied: string[];
    processing_time_ms: number;
  };
}

/**
 * Assessment Session
 * Autonomous assessment tracking
 */
export interface AssessmentSession {
  session_id: string;
  student_id: string;
  coach_id: string;

  // Session metadata
  started_at: Date;
  completed_at?: Date | null;
  duration_minutes?: number | null;

  // Assessment results
  diagnostic_result?: Record<string, any> | null;
  eq_profile?: Record<string, any> | null;
  rubric_scores?: Record<string, any> | null;
  time_architecture?: Record<string, any> | null;
  gap_analysis?: Record<string, any> | null;

  // Intelligence layer execution
  layers_executed: number;
  synthesis_moment_timestamp?: Date | null;

  // Assessment outcome
  assessment_complete: boolean;
  gameplan_triggered: boolean;

  // Metadata
  created_at: Date;
}

/**
 * GamePlan Report
 * Autonomous gameplan generation
 */
export interface GamePlanReport {
  gameplan_id: string;
  student_id: string;
  coach_id: string;
  assessment_session_id?: string | null;

  // GamePlan content
  four_pillar_plan: Record<string, any>;
  priority_ladder: Record<string, any>;
  timeline: Record<string, any>;
  parent_brief: Record<string, any>;

  // Dual-layer messaging
  dual_layer_encoded: boolean;

  // Strategic calculations (hidden from student)
  hidden_target_school?: string | null;
  probability_calculations?: Record<string, any> | null;

  // Generation metadata
  generated_at: Date;
  delivered_to_student: boolean;
  delivered_at?: Date | null;

  // Metadata
  created_at: Date;
}
