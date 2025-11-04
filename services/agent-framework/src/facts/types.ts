/**
 * Universal Fact-First Types
 * v18.0: Core primitives for zero-hallucination agent architecture
 *
 * Design Doc: docs/FACT_FIRST_ARCHITECTURE.md
 */

/**
 * FactCategory: Universal taxonomy of all fact types
 */
export enum FactCategory {
  // Internal Facts (our database)
  STUDENT_PROFILE = 'student_profile',
  ASSESSMENT_DATA = 'assessment_data',
  ACTIVITY_DATA = 'activity_data',
  ACADEMIC_DATA = 'academic_data',

  // External Facts (public data sources)
  COLLEGE_ADMISSIONS = 'college_admissions',
  HISTORICAL_PROFILES = 'historical_profiles',
  SCHOLARSHIP_DATA = 'scholarship_data',
  PROGRAM_DATA = 'program_data',
  DEADLINE_DATA = 'deadline_data',

  // Derived Facts (computed from other facts)
  ELIGIBILITY = 'eligibility',
  MATCH_SCORE = 'match_score',
  TREND_ANALYSIS = 'trend_analysis',
}

/**
 * Fact: Universal representation of a verifiable piece of information
 */
export interface Fact {
  fact_id: string;
  category: FactCategory;
  entity_id: string; // student_id, school_id, etc.
  fact_type: string; // e.g., "gpa", "sat_score", "admit_rate"
  value: any;
  provenance: FactProvenance;
  confidence: number; // 0.0-1.0 (1.0 = verified, <1.0 = computed/estimated)
}

/**
 * FactProvenance: Tracks where fact came from (auditability)
 */
export interface FactProvenance {
  source_id: string;
  timestamp: Date;
  source_url?: string;
  database_table?: string;
  query_used?: string;
  last_verified: Date;
}

/**
 * FactQuery: Request for facts
 */
export interface FactQuery {
  category: FactCategory;
  entity_id: string;
  filters?: Record<string, any>;
  timestamp?: Date; // For historical queries
}

/**
 * FactSource: Interface all fact providers must implement
 */
export interface FactSource {
  source_id: string;
  source_type: 'database' | 'api' | 'file';
  category: FactCategory;

  fetchFacts(query: FactQuery): Promise<Fact[]>;
  validateFact(fact: Fact): Promise<boolean>;
  getProvenance(fact: Fact): FactProvenance;
}

/**
 * AgentQuery: Input to any agent
 */
export interface AgentQuery {
  entity_id: string;
  query: string;
  session_id: string;
  metadata?: Record<string, any>;
  // v29.0.5: Flag to indicate this query is from an A2A handover
  // When true, agents should bypass insufficient data checks
  is_a2a_handover?: boolean;
}

/**
 * AgentResponse: Output from any agent
 */
export interface AgentResponse {
  response: string;
  facts_used: Fact[];
  validation_score: number;
  provenance: FactProvenance[];
  metadata?: Record<string, any>;
}

/**
 * ValidationResult: Result of fact validation
 */
export interface ValidationResult {
  isValid: boolean;
  score: number;
  violations: string[];
}
