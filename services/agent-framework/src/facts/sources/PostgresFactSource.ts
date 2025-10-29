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
   * Map fact categories to database tables
   */
  private initializeTableMapping(): void {
    this.tableMapping = new Map([
      [FactCategory.STUDENT_PROFILE, 'students'],
      [FactCategory.ASSESSMENT_DATA, 'game_plans'],
      [FactCategory.ACTIVITY_DATA, 'game_plans'],
      [FactCategory.ACADEMIC_DATA, 'students'],
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
   * Fetch assessment facts (game plan data)
   */
  private async fetchAssessmentFacts(studentId: string): Promise<Fact[]> {
    const result = await this.pool.query(
      `SELECT
        game_plan_id,
        profile_assessment,
        target_profile,
        target_schools,
        updated_at
      FROM game_plans
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [studentId]
    );

    if (result.rows.length === 0) return [];

    const row = result.rows[0];
    const facts: Fact[] = [];
    const baseProvenance = {
      source_id: this.source_id,
      timestamp: row.updated_at,
      database_table: 'game_plans',
      last_verified: row.updated_at,
    };

    // Extract unique narrative
    if (row.target_profile?.narrative) {
      facts.push({
        fact_id: `narrative_${studentId}`,
        category: FactCategory.ASSESSMENT_DATA,
        entity_id: studentId,
        fact_type: 'unique_narrative',
        value: row.target_profile.narrative,
        provenance: {
          ...baseProvenance,
          query_used: "target_profile->'narrative'",
        },
        confidence: 1.0,
      });
    }

    // Extract potential spikes
    if (row.target_profile?.potential_spikes) {
      facts.push({
        fact_id: `spikes_${studentId}`,
        category: FactCategory.ASSESSMENT_DATA,
        entity_id: studentId,
        fact_type: 'potential_spikes',
        value: row.target_profile.potential_spikes,
        provenance: {
          ...baseProvenance,
          query_used: "target_profile->'potential_spikes'",
        },
        confidence: 1.0,
      });
    }

    // Extract weak spots
    if (row.profile_assessment?.weak_spots) {
      row.profile_assessment.weak_spots.forEach((ws: any) => {
        facts.push({
          fact_id: `weak_spot_${ws.weak_spot_id || ws.title}`,
          category: FactCategory.ASSESSMENT_DATA,
          entity_id: studentId,
          fact_type: 'weak_spot',
          value: ws,
          provenance: {
            ...baseProvenance,
            query_used: "profile_assessment->'weak_spots'",
          },
          confidence: 1.0,
        });
      });
    }

    // Extract standout strengths
    if (row.profile_assessment?.standout_strengths) {
      row.profile_assessment.standout_strengths.forEach((strength: any) => {
        facts.push({
          fact_id: `strength_${strength.strength_id || strength.title}`,
          category: FactCategory.ASSESSMENT_DATA,
          entity_id: studentId,
          fact_type: 'standout_strength',
          value: strength,
          provenance: {
            ...baseProvenance,
            query_used: "profile_assessment->'standout_strengths'",
          },
          confidence: 1.0,
        });
      });
    }

    // Extract target schools
    if (row.target_schools) {
      facts.push({
        fact_id: `target_schools_${studentId}`,
        category: FactCategory.ASSESSMENT_DATA,
        entity_id: studentId,
        fact_type: 'target_schools',
        value: row.target_schools,
        provenance: {
          ...baseProvenance,
          query_used: 'target_schools',
        },
        confidence: 1.0,
      });
    }

    log.event('postgres_fact_source.assessment_facts_extracted', {
      student_id: studentId,
      facts_count: facts.length,
    });

    return facts;
  }

  /**
   * Fetch activity facts (extracurricular activities)
   */
  private async fetchActivityFacts(studentId: string): Promise<Fact[]> {
    const result = await this.pool.query(
      `SELECT
        profile_assessment,
        updated_at
      FROM game_plans
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [studentId]
    );

    if (result.rows.length === 0) return [];

    const row = result.rows[0];
    const facts: Fact[] = [];

    if (row.profile_assessment?.extracurricular_activities) {
      row.profile_assessment.extracurricular_activities.forEach((activity: any) => {
        facts.push({
          fact_id: `activity_${activity.evidence_id || activity.title}`,
          category: FactCategory.ACTIVITY_DATA,
          entity_id: studentId,
          fact_type: 'extracurricular_activity',
          value: activity,
          provenance: {
            source_id: this.source_id,
            timestamp: row.updated_at,
            database_table: 'game_plans',
            query_used: "profile_assessment->'extracurricular_activities'",
            last_verified: row.updated_at,
          },
          confidence: 1.0,
        });
      });
    }

    return facts;
  }

  /**
   * Fetch profile facts (student demographics, identity)
   */
  private async fetchProfileFacts(studentId: string): Promise<Fact[]> {
    // TODO: Implement once students table has demographic data
    return [];
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
