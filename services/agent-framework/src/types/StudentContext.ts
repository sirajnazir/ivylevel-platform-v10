/**
 * Student Context Intelligence Types
 *
 * Hyper-personalized student profile for context-aware coaching
 * Based on v10.3 student_context_intelligence schema
 */

export type PersonalityType = 'Type_A_competitive' | 'Type_B_collaborative' | 'Mixed';
export type CapacityLevel = 'high' | 'medium' | 'low';
export type SocialStyle = 'outgoing' | 'quiet' | 'balanced';
export type MotivationDriver = 'competition' | 'community' | 'curiosity' | 'achievement' | 'impact' | 'recognition';
export type ExecutionStyle = 'self_starter' | 'needs_structure' | 'needs_accountability';
export type ClassYear = 'freshman' | 'sophomore' | 'junior' | 'senior';
export type SchoolCompetitiveness = 'highly_competitive' | 'competitive' | 'non_competitive';
export type ParentInvolvement = 'high' | 'medium' | 'low';
export type LifecycleState = 'onboarded' | 'assessment_in_progress' | 'gameplan_generated' | 'active_execution' | 'pre_applications' | 'application_season' | 'post_applications';

/**
 * Psycho-Behavioral Profile
 * From 31-layer intelligence spec: student archetype for dynamic tool selection
 */
export interface PsychoBehavioralProfile {
  personality_type: PersonalityType;
  capacity_level: CapacityLevel;
  social_style: SocialStyle;
  motivation_drivers: MotivationDriver[];
  risk_tolerance: 'low' | 'medium' | 'high';
  execution_style: ExecutionStyle;
}

/**
 * Academic Context
 * GPA, test scores, school context for strategic positioning
 */
export interface AcademicContext {
  gpa_weighted: number;
  gpa_unweighted: number;
  test_scores: {
    sat?: number;
    act?: number;
    ap_count: number;
  };
  school_competitiveness: SchoolCompetitiveness;
  school_name: string;
  class_rank?: number | null;
}

/**
 * Family Dynamics
 * Parent involvement, anxiety levels, cultural factors for parent navigation
 */
export interface FamilyDynamics {
  parent_involvement: ParentInvolvement;
  parent_anxiety_level: number; // 0-10
  parent_concerns: string[];
  cultural_factors: string[];
  family_constraints: string[];
}

/**
 * Interests & Narrative
 * Passions, skills, unique angles for identity engineering
 */
export interface InterestsNarrative {
  primary_passions: string[];
  skills: string[];
  unique_angles: string[];
  identity_fusion?: string | null; // e.g., "Film × CS → Digital Storyteller"
}

/**
 * Target School
 * School targeting with hidden probability calculations
 */
export interface TargetSchool {
  name: string;
  probability: number; // 0-1
  strategic_priority: number; // 1 = highest priority (hidden from student)
}

/**
 * Goals & Targets
 * Schools, majors, career interests
 */
export interface GoalsTargets {
  target_schools: TargetSchool[];
  target_major: string;
  career_interests: string[];
}

/**
 * Rubric Scores
 * Real-time 25-point rubric tracking
 */
export interface RubricScores {
  academics: number;
  leadership: number;
  service: number;
  artifacts: number;
  recognition: number;
  total: number;
}

/**
 * Current State
 * Identity score, confidence, rubric, lifecycle
 */
export interface CurrentState {
  identity_score: number; // 0-10
  confidence_level: number; // 0-1
  rubric_scores: RubricScores;
  lifecycle_state: LifecycleState;
}

/**
 * Complete Student Context
 * All context needed for hyper-personalized, context-aware coaching
 */
export interface StudentContext {
  student_id: string;
  coach_id: string;

  // Core identity
  name: string;
  email: string;
  phone?: string | null;
  class_year: ClassYear;
  current_week: number;

  // Context dimensions
  psycho_behavioral: PsychoBehavioralProfile;
  academic: AcademicContext;
  family: FamilyDynamics;
  interests: InterestsNarrative;
  goals: GoalsTargets;
  state: CurrentState;

  // Extensibility for specialty coaches
  custom_context?: Record<string, any> | null;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Student Context Update Payload
 * For partial updates to student context
 */
export interface StudentContextUpdate {
  psycho_behavioral?: Partial<PsychoBehavioralProfile>;
  academic?: Partial<AcademicContext>;
  family?: Partial<FamilyDynamics>;
  interests?: Partial<InterestsNarrative>;
  goals?: Partial<GoalsTargets>;
  state?: Partial<CurrentState>;
  custom_context?: Record<string, any>;
  current_week?: number;
}
