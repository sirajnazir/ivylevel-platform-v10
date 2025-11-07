/**
 * Universal Fact Protocol v1.0
 *
 * All agents produce facts in this format.
 * Facts declare their target production table + data.
 */

/**
 * Production Table Enum
 * Maps to actual database tables
 */
export enum ProductionTable {
  // Core
  STUDENTS = 'students',
  WEEKLY_VITALS = 'weekly_vitals',
  KB_ITEMS = 'kb_items',

  // Extracurriculars
  EC_VITALS = 'ec_vitals',
  EC_CHIPS = 'ec_chips',

  // Awards & Recognition
  AWARDS = 'awards',
  PROGRAMS = 'programs',
  SCHOLARSHIPS = 'scholarships',

  // Execution
  ACTION_PLANS = 'action_plans',
  ACTION_ITEMS = 'action_items',
  JTBD = 'jtbd',

  // Assessment
  IVYSCORE = 'ivyscore',
  GAPS = 'gaps',

  // Planning
  GAME_PLAN = 'game_plan',
  TIMELINE_EVENTS = 'timeline_events',

  // Testing
  TEST_SCORES = 'test_scores',

  // Essays & Applications
  ESSAYS = 'essays',
  APPLICATIONS = 'applications'
}

/**
 * Fact Category (high-level domain)
 */
export enum FactCategory {
  PROFILE = 'profile',
  ACADEMIC = 'academic',
  EXTRACURRICULAR = 'extracurricular',
  AWARD = 'award',
  TESTING = 'testing',
  PLANNING = 'planning',
  EXECUTION = 'execution'
}

/**
 * Schema Target - Declares where this fact goes in production
 */
export interface SchemaTarget {
  primary_table: ProductionTable;
  related_tables?: ProductionTable[];
  update_strategy: 'insert' | 'upsert' | 'append' | 'merge';
}

/**
 * Fact Data - Table-ready payload
 */
export interface FactData {
  // Field-level data matching target table schema
  fields: Record<string, any>;

  // Metadata about this fact
  metadata?: {
    field_name?: string;           // Canonical field name (for coverage tracking)
    data_type?: string;             // Type of data
    schema_requirement?: 'required' | 'optional';
    [key: string]: any;
  };

  // References to related entities
  references?: {
    ec_chip_id?: string;
    award_id?: string;
    plan_id?: string;
    week_number?: number;
    [key: string]: any;
  };
}

/**
 * Fact Source - Complete provenance
 */
export interface FactSource {
  agent_id: string;                   // 'assessment-agent-v18'
  extraction_method: string;          // 'gpt4o_conversational_v28'
  source_type: 'conversation' | 'form' | 'document' | 'import';
  session_id?: string;
  message_id?: string;
}

/**
 * Universal Fact - Standard format for all agent outputs
 */
export interface UniversalFact {
  // Identity
  fact_id: string;
  student_id: string;

  // Classification
  category: FactCategory;
  subcategory?: string;

  // Schema Intent (declares target table)
  schema_target: SchemaTarget;

  // Fact Payload (table-ready data)
  data: FactData;

  // Provenance
  source: FactSource;
  confidence: number;                 // 0-1
  extracted_at: string;               // ISO timestamp
  verified: boolean;
}
