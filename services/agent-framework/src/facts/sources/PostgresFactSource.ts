/**
 * PostgresFactSource: Internal database fact provider
 * v18.0: Implements FactSource interface for Postgres
 *
 * Design Doc: docs/FACT_FIRST_ARCHITECTURE.md
 *
 * Responsibilities:
 * - Query game_plans table for assessment data
 * - Convert database rows to Facts with provenance
 * - Support multiple fact categories from same table
 */

import { Pool } from 'pg';
import { Fact, FactSource, FactQuery, FactProvenance, FactCategory } from '../types.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('postgres-fact-source');

export class PostgresFactSource implements FactSource {
  source_id = 'postgres_ivylevel';
  source_type = 'database' as const;
  category: FactCategory;

  private pool: Pool;
  private tableMapping: Map<FactCategory, string>;

  constructor(pool: Pool, category: FactCategory) {
    this.pool = pool;
    this.category = category;
    this.initializeTableMapping();
  }

  /**
   * Map fact categories to database tables/views
   */
  private initializeTableMapping(): void {
    this.tableMapping = new Map([
      [FactCategory.STUDENT_PROFILE, 'students'],
      [FactCategory.ASSESSMENT_DATA, 'kb_items'],  // Assessment data from kb_items
      [FactCategory.ACTIVITY_DATA, 'kb_items'],    // Activities from kb_items (Extracurricular type)
      [FactCategory.ACADEMIC_DATA, 'kb_items'],    // Academic data from kb_items (Academic type)
    ]);
  }

  /**
   * Fetch facts from database
   */
  async fetchFacts(query: FactQuery): Promise<Fact[]> {
    const table = this.tableMapping.get(this.category);
    if (!table) {
      log.event('postgres_fact_source.no_table_mapping', {
        category: this.category,
      }, 'warn');
      return [];
    }

    log.event('postgres_fact_source.fetch_start', {
      category: this.category,
      entity_id: query.entity_id,
      table,
    });

    try {
      // Route to category-specific fetcher
      switch (this.category) {
        case FactCategory.ASSESSMENT_DATA:
          return await this.fetchAssessmentFacts(query.entity_id);
        case FactCategory.ACTIVITY_DATA:
          return await this.fetchActivityFacts(query.entity_id);
        case FactCategory.STUDENT_PROFILE:
          return await this.fetchProfileFacts(query.entity_id);
        case FactCategory.ACADEMIC_DATA:
          return await this.fetchAcademicFacts(query.entity_id);
        default:
          return [];
      }
    } catch (error) {
      log.error('postgres_fact_source.fetch_error', {
        category: this.category,
        entity_id: query.entity_id,
        error: String(error),
      });
      return [];
    }
  }

  /**
   * Fetch assessment facts from kb_items
   * Assessment-related items: Goals, Plans, Assessments, etc.
   * UPDATED: Now reads edges JSONB field for GPT-4o extracted data
   */
  private async fetchAssessmentFacts(studentId: string): Promise<Fact[]> {
    const result = await this.pool.query(
      `SELECT
        item_id,
        item_type,
        subtype,
        title_name,
        tier1_state,
        tier2_substate,
        status_detail,
        edges,
        created_ts,
        updated_ts
      FROM kb_items
      WHERE student_id = $1
        AND item_type IN ('Assessment', 'Goal', 'Plan')
      ORDER BY created_ts DESC`,
      [studentId]
    );

    const facts: Fact[] = [];

    result.rows.forEach((item: any) => {
      // Merge edges JSONB data into value for GPT-4o extracted facts
      const edgesData = item.edges || {};

      facts.push({
        fact_id: `assessment_${item.item_id}`,
        category: FactCategory.ASSESSMENT_DATA,
        entity_id: studentId,
        fact_type: item.subtype || item.item_type.toLowerCase(), // Use subtype (academic_profile, social_profile, etc.)
        value: {
          item_id: item.item_id,
          item_type: item.item_type,
          subtype: item.subtype,
          title: item.title_name,
          state: item.tier1_state,
          substate: item.tier2_substate,
          status: item.status_detail,
          ...edgesData, // Merge GPT-4o extracted data (grade, gpa, interests, etc.)
        },
        provenance: {
          source_id: this.source_id,
          timestamp: item.updated_ts,
          database_table: 'kb_items',
          query_used: 'SELECT FROM kb_items WHERE item_type IN (Assessment, Goal, Plan)',
          last_verified: item.updated_ts,
        },
        confidence: 1.0,
      });
    });

    log.event('postgres_fact_source.assessment_facts_extracted', {
      student_id: studentId,
      facts_count: facts.length,
    });

    return facts;
  }

  /**
   * Fetch activity facts (extracurricular activities) from kb_items
   */
  private async fetchActivityFacts(studentId: string): Promise<Fact[]> {
    const result = await this.pool.query(
      `SELECT
        item_id,
        item_type,
        subtype,
        title_name,
        tier1_state,
        tier2_substate,
        status_detail,
        key_metric_type,
        key_metric_value,
        key_metric_unit,
        created_ts,
        updated_ts
      FROM kb_items
      WHERE student_id = $1
        AND item_type = 'Extracurricular'
      ORDER BY created_ts DESC`,
      [studentId]
    );

    const facts: Fact[] = [];

    result.rows.forEach((activity: any) => {
      facts.push({
        fact_id: `activity_${activity.item_id}`,
        category: FactCategory.ACTIVITY_DATA,
        entity_id: studentId,
        fact_type: 'extracurricular_activity',
        value: {
          item_id: activity.item_id,
          item_type: activity.item_type,
          subtype: activity.subtype,
          title: activity.title_name,
          state: activity.tier1_state,
          substate: activity.tier2_substate,
          status: activity.status_detail,
          metric_type: activity.key_metric_type,
          metric_value: activity.key_metric_value,
          metric_unit: activity.key_metric_unit,
        },
        provenance: {
          source_id: this.source_id,
          timestamp: activity.updated_ts,
          database_table: 'kb_items',
          query_used: 'SELECT FROM kb_items WHERE item_type = Extracurricular',
          last_verified: activity.updated_ts,
        },
        confidence: 1.0,
      });
    });

    log.event('postgres_fact_source.activity_facts_extracted', {
      student_id: studentId,
      facts_count: facts.length,
    });

    return facts;
  }

  /**
   * Fetch profile facts (student demographics, identity)
   */
  private async fetchProfileFacts(studentId: string): Promise<Fact[]> {
    const result = await this.pool.query(
      `SELECT
        student_id,
        full_name,
        email,
        graduation_year,
        high_school,
        target_major,
        created_at,
        updated_at
      FROM students
      WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) return [];

    const student = result.rows[0];
    const facts: Fact[] = [];
    const baseProvenance = {
      source_id: this.source_id,
      timestamp: student.updated_at,
      database_table: 'students',
      last_verified: student.updated_at,
    };

    // Basic profile fact
    facts.push({
      fact_id: `profile_${studentId}`,
      category: FactCategory.STUDENT_PROFILE,
      entity_id: studentId,
      fact_type: 'student_profile',
      value: {
        full_name: student.full_name,
        email: student.email,
        graduation_year: student.graduation_year,
        high_school: student.high_school,
        target_major: student.target_major,
      },
      provenance: {
        ...baseProvenance,
        query_used: 'SELECT full_name, email, graduation_year, high_school, target_major FROM students',
      },
      confidence: 1.0,
    });

    log.event('postgres_fact_source.profile_facts_extracted', {
      student_id: studentId,
      facts_count: facts.length,
    });

    return facts;
  }

  /**
   * Fetch academic facts (GPA, test scores, courses)
   */
  private async fetchAcademicFacts(studentId: string): Promise<Fact[]> {
    // TODO: Implement once students table has academic data
    return [];
  }

  /**
   * Validate that fact still exists in database
   */
  async validateFact(fact: Fact): Promise<boolean> {
    // Re-query database to verify fact hasn't changed
    // For now, assume facts are valid (would implement full validation in production)
    return true;
  }

  /**
   * Get provenance for a fact
   */
  getProvenance(fact: Fact): FactProvenance {
    return fact.provenance;
  }
}
