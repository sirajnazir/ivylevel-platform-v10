/**
 * types.ts
 * TypeScript types for Knowledge Moat (Category 2 Data)
 * Generated from v15_001_knowledge_moat.sql schema
 * Created: 2025-10-16 (Phase 1, Week 1, Days 2-3)
 */

// ==============================================================================
// DS1: Common Data Set (CDS) - College Benchmarks
// ==============================================================================

export interface CDSCollege {
  college_id: string;
  college_name: string;
  class_year: number;
  acceptance_rate: number | null;

  // Academic benchmarks
  gpa_weighted_25: number | null;
  gpa_weighted_75: number | null;
  gpa_unweighted_25: number | null;
  gpa_unweighted_75: number | null;

  // Testing benchmarks
  sat_total_25: number | null;
  sat_total_75: number | null;
  sat_ebrw_25: number | null;
  sat_ebrw_75: number | null;
  sat_math_25: number | null;
  sat_math_75: number | null;
  act_composite_25: number | null;
  act_composite_75: number | null;

  // Class profile
  enrollment_size: number | null;
  applicants: number | null;
  admitted: number | null;
  enrolled: number | null;

  // Metadata
  data_source: string | null;
  last_updated: Date;
  created_at: Date;
}

// ==============================================================================
// DS2: Rubric Factors - Admissions Evaluation Criteria
// ==============================================================================

export type FactorCategory = 'academic' | 'extracurricular' | 'character' | 'demonstrated_interest';
export type Importance = 'critical' | 'important' | 'considered' | 'not_considered';

export interface RubricFactor {
  factor_id: number;
  college_id: string;
  factor_name: string;
  factor_category: FactorCategory;
  importance: Importance;
  description: string | null;
  examples: string | null;
  source: string | null;
  last_updated: Date;
  created_at: Date;
}

// ==============================================================================
// DS3: School Profiles - Hyperlocal High School Data
// ==============================================================================

export type SchoolType = 'public' | 'private' | 'charter' | 'magnet';
export type RankingSystem = 'percentile' | 'decile' | 'none';
export type CompetitivenessTier = 'highly_competitive' | 'competitive' | 'moderate' | 'less_competitive';

export interface SchoolProfile {
  school_id: string;
  school_name: string;
  school_type: SchoolType | null;
  city: string | null;
  state: string | null;
  zip: string | null;

  // Academic profile
  total_students: number | null;
  gpa_scale: number | null;
  ranking_system: RankingSystem | null;
  weighted_gpa_available: boolean;
  ap_courses_offered: number | null;
  ib_program: boolean;

  // College placement profile
  avg_sat_score: number | null;
  avg_act_score: number | null;
  percent_to_4year: number | null;

  // Competitiveness indicators
  competitiveness_tier: CompetitivenessTier | null;
  naviance_link: string | null;

  // Metadata
  data_source: string | null;
  last_updated: Date;
  created_at: Date;
}

// ==============================================================================
// DS4: College Placement History - School → College Pipelines
// ==============================================================================

export interface PlacementHistory {
  placement_id: number;
  school_id: string;
  college_id: string;
  class_year: number;

  // Application outcomes
  applied: number;
  accepted: number;
  waitlisted: number;
  rejected: number;
  enrolled: number;

  // Accepted student profile (aggregates)
  gpa_weighted_avg: number | null;
  gpa_weighted_min: number | null;
  gpa_weighted_max: number | null;
  sat_total_avg: number | null;
  sat_total_min: number | null;
  sat_total_max: number | null;

  // Metadata
  data_source: string | null;
  last_updated: Date;
  created_at: Date;
}

// ==============================================================================
// DS5: Student Twins - Similar Profiles
// ==============================================================================

export type ECTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type AwardsTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type EssayQuality = 'exceptional' | 'strong' | 'good' | 'average';
export type Demographics = 'asian' | 'white' | 'hispanic' | 'black' | 'other' | 'unknown';

export interface StudentTwinOutcome {
  college: string;
  decision: 'accepted' | 'rejected' | 'waitlisted' | 'deferred';
}

export interface StudentTwin {
  twin_id: number;
  profile_hash: string;

  // Profile characteristics
  gpa_weighted_range: string;
  sat_total_range: string;
  ec_tier: ECTier;
  awards_tier: AwardsTier | null;
  essay_quality: EssayQuality | null;
  demographics: Demographics | null;
  school_tier: CompetitivenessTier | null;

  // Outcome summary
  colleges_applied: number | null;
  colleges_accepted: number | null;
  colleges_waitlisted: number | null;
  colleges_rejected: number | null;
  acceptance_rate: number | null;

  // Sample colleges (JSON array of outcomes)
  outcomes: StudentTwinOutcome[] | null;

  // Metadata
  class_year: number | null;
  data_source: string | null;
  last_updated: Date;
  created_at: Date;
}

// ==============================================================================
// DS6: Summer Programs - Pre-College Opportunities
// ==============================================================================

export type ProgramType = 'academic' | 'research' | 'leadership' | 'service' | 'arts';
export type Selectivity = 'highly_selective' | 'selective' | 'moderately_selective' | 'open_enrollment';
export type PrestigeTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type AdmissionsBoost = 'significant' | 'moderate' | 'minor' | 'none';

export interface SummerProgram {
  program_id: string;
  program_name: string;
  sponsor_organization: string | null;
  program_type: ProgramType | null;

  // Program details
  duration_weeks: number | null;
  cost_usd: number | null;
  financial_aid_available: boolean;
  acceptance_rate: number | null;
  eligibility_criteria: string | null;

  // Academic rigor
  selectivity: Selectivity | null;
  academic_credit: boolean;
  college_credit: boolean;

  // Admissions impact
  prestige_tier: PrestigeTier | null;
  admissions_boost: AdmissionsBoost | null;
  target_colleges: string[] | null;

  // Application details
  application_deadline: Date | null;
  notification_date: Date | null;
  program_dates_start: Date | null;
  program_dates_end: Date | null;
  website: string | null;

  // Metadata
  last_updated: Date;
  created_at: Date;
}

// ==============================================================================
// DS7: Research Articles - Academic Publications & Impact
// ==============================================================================

export type PublicationType = 'peer_reviewed_journal' | 'conference' | 'preprint' | 'poster';

export interface ResearchArticle {
  article_id: string;
  title: string;
  authors: string[];
  publication_venue: string | null;
  publication_date: Date | null;
  publication_type: PublicationType | null;

  // Impact metrics
  citation_count: number;
  impact_factor: number | null;
  h_index: number | null;

  // Content
  abstract: string | null;
  keywords: string[] | null;
  field: string | null;

  // Links
  doi: string | null;
  arxiv_id: string | null;
  url: string | null;

  // Metadata
  data_source: string | null;
  last_updated: Date;
  created_at: Date;
}

// ==============================================================================
// DS8: Competition Results - Academic Competitions & Rankings
// ==============================================================================

export type CompetitionLevel = 'international' | 'national' | 'state' | 'regional' | 'local';

export interface CompetitionResult {
  result_id: number;
  competition_name: string;
  competition_level: CompetitionLevel | null;
  field: string | null;

  // Competition details
  organizer: string | null;
  year: number;
  total_participants: number | null;

  // Winner information (anonymized)
  placement: string | null;
  placement_rank: number | null;
  award_name: string | null;

  // Prestige assessment
  prestige_tier: PrestigeTier | null;
  admissions_impact: AdmissionsBoost | null;
  target_colleges: string[] | null;

  // Metadata
  website: string | null;
  data_source: string | null;
  last_updated: Date;
  created_at: Date;
}

// ==============================================================================
// Helper Views
// ==============================================================================

export type DifficultyTier = 'reach' | 'target' | 'safety';

export interface CollegeBenchmark {
  college_id: string;
  college_name: string;
  class_year: number;
  acceptance_rate: number | null;
  gpa_weighted_25: number | null;
  gpa_weighted_75: number | null;
  sat_total_25: number | null;
  sat_total_75: number | null;
  act_composite_25: number | null;
  act_composite_75: number | null;
  difficulty_tier: DifficultyTier;
  rubric_factors_count: number;
}

export interface HyperlocalContext {
  school_id: string;
  school_name: string;
  state: string | null;
  school_tier: CompetitivenessTier | null;
  gpa_scale: number | null;
  ap_courses_offered: number | null;
  school_avg_sat: number | null;
  college_id: string;
  class_year: number;
  accepted: number;
  rejected: number;
  accepted_gpa_avg: number | null;
  accepted_sat_avg: number | null;
  acceptance_rate_from_school: number | null;
}

// ==============================================================================
// Repository Method Return Types
// ==============================================================================

export interface KnowledgeMoatQuery {
  // College queries
  getCollegeBenchmark(collegeId: string): Promise<CDSCollege | null>;
  getCollegeRubric(collegeId: string): Promise<RubricFactor[]>;
  getCollegeDifficultyTier(collegeId: string, studentGPA: number, studentSAT: number): Promise<DifficultyTier>;

  // School queries
  getSchoolProfile(schoolId: string): Promise<SchoolProfile | null>;
  getPlacementHistory(schoolId: string, collegeId: string): Promise<PlacementHistory | null>;

  // Twin queries
  findSimilarProfiles(params: {
    gpaRange: string;
    satRange: string;
    ecTier: ECTier;
    schoolTier?: CompetitivenessTier;
  }): Promise<StudentTwin[]>;

  // Program queries
  getSummerPrograms(filters: {
    programType?: ProgramType;
    prestigeTier?: PrestigeTier;
    maxCost?: number;
  }): Promise<SummerProgram[]>;

  // Research queries
  verifyResearchArticle(articleId: string): Promise<ResearchArticle | null>;

  // Competition queries
  verifyCompetitionResult(competitionName: string, year: number, placement: string): Promise<CompetitionResult | null>;
}
