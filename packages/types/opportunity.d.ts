export type OpportunityKind = 'award' | 'summer' | 'research' | 'scholarship' | 'network';
export type OpportunityTier = 'tier_1' | 'tier_2' | 'tier_3';
export type OpportunityCategory = 'research_programs' | 'summer_programs' | 'competitions_awards' | 'scholarships' | 'leadership_programs' | 'stem_programs' | 'humanities_programs' | 'business_programs' | 'arts_programs' | 'community_service' | 'pre_college_programs';
export type RecognitionLevel = 'local' | 'regional' | 'national' | 'global';
export type OpportunityBucket = 'immediate_action' | 'priority_pipeline' | 'strategic_reserve' | 'reach' | 'safety';
export interface OpportunityDeadline {
    name: string;
    date: string;
}
export interface OpportunityRequirements {
    gpa_min?: number;
    sat_min?: number;
    act_min?: number;
    grade_levels: string[];
    region?: string;
    citizenship?: string[];
    skill_match?: string[];
    prerequisite_programs?: string[];
}
export interface OpportunityCommitment {
    time_cost: number;
    financial_cost: number;
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
    academic_fit: number;
    narrative_fit: number;
    strategic_value: number;
    resource_fit: number;
    timeline_fit: number;
}
export interface OpportunityScore {
    id: string;
    student_id: string;
    opportunity_id: string;
    total_score: number;
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
    yield: number;
    persistence_gain: number;
    assets_created: string[];
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
    opportunities: string[];
    coach_rationale?: string;
    outcomes?: BombardmentOutcomes;
    derived_metrics?: BombardmentMetrics;
    created_at: string;
}
