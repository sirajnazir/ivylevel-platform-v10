export type OpportunityKind = 'award' | 'summer' | 'research' | 'scholarship' | 'network';

export type OpportunityTier = 'tier_1' | 'tier_2' | 'tier_3';

export type OpportunityCategory = 
  | 'research_programs'
  | 'summer_programs'
  | 'competitions_awards'
  | 'scholarships'
  | 'leadership_programs'
  | 'stem_programs'
  | 'humanities_programs'
  | 'business_programs'
  | 'arts_programs'
  | 'community_service'
  | 'pre_college_programs';

export type RecognitionLevel = 'local' | 'regional' | 'national' | 'global';

export type OpportunityBucket = 
  | 'immediate_action'    // <2 weeks deadline, high fit
  | 'priority_pipeline'   // 1-2 months out, strong alignment
  | 'strategic_reserve'   // 3-6 months, good potential
  | 'reach'              // High prestige, low probability
  | 'safety';            // High probability, lower impact

export interface OpportunityDeadline {
  name: string;
  date: string; // ISO date
}

export interface OpportunityRequirements {
  gpa_min?: number;
  sat_min?: number;
  act_min?: number;
  grade_levels: string[]; // ['9', '10', '11', '12']
  region?: string;
  citizenship?: string[];
  skill_match?: string[];
  prerequisite_programs?: string[];
}

export interface OpportunityCommitment {
  time_cost: number;      // hours per week
  financial_cost: number; // USD
  duration_weeks: number;
}

export interface Opportunity {
  id: string;
  name: string;
  kind: OpportunityKind;
  tier?: OpportunityTier;
  category?: OpportunityCategory;
  mission: string;
  requirements: OpportunityRequirements;
  recognition_level?: RecognitionLevel;
  commitment: OpportunityCommitment;
  deadlines: OpportunityDeadline[];
  source: string;
  meta?: Record<string, any>;
  created_at: string;
}

export interface OpportunityScoreComponents {
  academic_fit: number;      // 0-30: GPA/SAT alignment
  narrative_fit: number;     // 0-25: Theme alignment
  strategic_value: number;   // 0-20: College list impact
  resource_fit: number;      // 0-15: Time/money feasibility
  timeline_fit: number;      // 0-10: Deadline practicality
}

export interface OpportunityScore {
  id: string;
  student_id: string;
  opportunity_id: string;
  total_score: number; // 0-100
  components: OpportunityScoreComponents;
  bucket: OpportunityBucket;
  rationale?: string;
  created_at: string;
}

export interface BombardmentTrigger {
  type: 'rejection_spike' | 'seasonal' | 'coach_directive' | 'morale_drop';
  threshold?: number;
  description?: string;
}

export interface BombardmentOutcomes {
  wins: number;
  rejects: number;
  waitlists: number;
  applications_submitted: number;
}

export interface BombardmentMetrics {
  yield: number;              // wins / applications
  persistence_gain: number;   // morale boost
  assets_created: string[];   // essays, projects, etc
}

export interface BombardmentEpisode {
  id: string;
  student_id: string;
  window: {
    start: string;
    end: string;
  };
  trigger: BombardmentTrigger;
  size: number;
  opportunities: string[]; // opportunity IDs
  coach_rationale?: string;
  outcomes?: BombardmentOutcomes;
  derived_metrics?: BombardmentMetrics;
  created_at: string;
}