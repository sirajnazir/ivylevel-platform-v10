/**
 * KnowledgeMoatRepository.ts
 * Repository for accessing Knowledge Moat (Category 2 Data)
 * Provides zero-hallucination access to DS1-DS8 structured data
 * Created: 2025-10-16 (Phase 1, Week 1, Days 2-3)
 */

import { pool } from '../db/pool.js';
import type {
  CDSCollege,
  RubricFactor,
  SchoolProfile,
  PlacementHistory,
  StudentTwin,
  SummerProgram,
  ResearchArticle,
  CompetitionResult,
  CollegeBenchmark,
  HyperlocalContext,
  DifficultyTier,
  ECTier,
  CompetitivenessTier,
  ProgramType,
  PrestigeTier,
} from './types.js';

export class KnowledgeMoatRepository {
  // ==========================================================================
  // DS1: College Benchmarks (CDS)
  // ==========================================================================

  async getCollegeBenchmark(collegeId: string): Promise<CDSCollege | null> {
    const result = await pool.query<CDSCollege>(
      'SELECT * FROM moat_cds_colleges WHERE college_id = $1',
      [collegeId]
    );
    return result.rows[0] || null;
  }

  async getTopCollegesByAcceptanceRate(limit: number = 20): Promise<CDSCollege[]> {
    const result = await pool.query<CDSCollege>(
      `SELECT * FROM moat_cds_colleges
       ORDER BY acceptance_rate ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getCollegeDifficultyTier(
    collegeId: string
  ): Promise<DifficultyTier | null> {
    const result = await pool.query<{ difficulty_tier: DifficultyTier }>(
      `SELECT difficulty_tier FROM v_college_benchmarks
       WHERE college_id = $1`,
      [collegeId]
    );
    return result.rows[0]?.difficulty_tier || null;
  }

  // ==========================================================================
  // DS2: Rubric Factors
  // ==========================================================================

  async getCollegeRubric(collegeId: string): Promise<RubricFactor[]> {
    const result = await pool.query<RubricFactor>(
      `SELECT * FROM moat_rubric_factors
       WHERE college_id = $1
       ORDER BY CASE importance
         WHEN 'critical' THEN 1
         WHEN 'important' THEN 2
         WHEN 'considered' THEN 3
         ELSE 4
       END, factor_name`,
      [collegeId]
    );
    return result.rows;
  }

  async getCriticalRubricFactors(collegeId: string): Promise<RubricFactor[]> {
    const result = await pool.query<RubricFactor>(
      `SELECT * FROM moat_rubric_factors
       WHERE college_id = $1 AND importance = 'critical'
       ORDER BY factor_name`,
      [collegeId]
    );
    return result.rows;
  }

  // ==========================================================================
  // DS3: School Profiles (Hyperlocal)
  // ==========================================================================

  async getSchoolProfile(schoolId: string): Promise<SchoolProfile | null> {
    const result = await pool.query<SchoolProfile>(
      'SELECT * FROM moat_school_profiles WHERE school_id = $1',
      [schoolId]
    );
    return result.rows[0] || null;
  }

  async getSchoolsByState(state: string): Promise<SchoolProfile[]> {
    const result = await pool.query<SchoolProfile>(
      `SELECT * FROM moat_school_profiles
       WHERE state = $1
       ORDER BY school_name`,
      [state]
    );
    return result.rows;
  }

  // ==========================================================================
  // DS4: Placement History
  // ==========================================================================

  async getPlacementHistory(
    schoolId: string,
    collegeId: string
  ): Promise<PlacementHistory | null> {
    const result = await pool.query<PlacementHistory>(
      `SELECT * FROM moat_placement_history
       WHERE school_id = $1 AND college_id = $2
       ORDER BY class_year DESC
       LIMIT 1`,
      [schoolId, collegeId]
    );
    return result.rows[0] || null;
  }

  async getSchoolCollegePipeline(schoolId: string): Promise<PlacementHistory[]> {
    const result = await pool.query<PlacementHistory>(
      `SELECT * FROM moat_placement_history
       WHERE school_id = $1
       ORDER BY class_year DESC, accepted DESC`,
      [schoolId]
    );
    return result.rows;
  }

  async getHyperlocalContext(
    schoolId: string,
    collegeId: string
  ): Promise<HyperlocalContext | null> {
    const result = await pool.query<HyperlocalContext>(
      `SELECT * FROM v_hyperlocal_context
       WHERE school_id = $1 AND college_id = $2
       ORDER BY class_year DESC
       LIMIT 1`,
      [schoolId, collegeId]
    );
    return result.rows[0] || null;
  }

  // ==========================================================================
  // DS5: Student Twins
  // ==========================================================================

  async findSimilarProfiles(params: {
    gpaRange: string;
    satRange: string;
    ecTier: ECTier;
    schoolTier?: CompetitivenessTier;
  }): Promise<StudentTwin[]> {
    let query = `
      SELECT * FROM moat_student_twins
      WHERE gpa_weighted_range = $1
        AND sat_total_range = $2
        AND ec_tier = $3
    `;
    const queryParams: any[] = [params.gpaRange, params.satRange, params.ecTier];

    if (params.schoolTier) {
      query += ` AND school_tier = $4`;
      queryParams.push(params.schoolTier);
    }

    query += ` ORDER BY acceptance_rate DESC`;

    const result = await pool.query<StudentTwin>(query, queryParams);
    return result.rows;
  }

  async getTwinOutcomesForCollege(
    collegeId: string,
    gpaRange: string,
    satRange: string
  ): Promise<StudentTwin[]> {
    const result = await pool.query<StudentTwin>(
      `SELECT * FROM moat_student_twins
       WHERE gpa_weighted_range = $1
         AND sat_total_range = $2
         AND outcomes::text LIKE $3
       ORDER BY acceptance_rate DESC`,
      [gpaRange, satRange, `%${collegeId}%`]
    );
    return result.rows;
  }

  // ==========================================================================
  // DS6: Summer Programs
  // ==========================================================================

  async getSummerPrograms(filters: {
    programType?: ProgramType;
    prestigeTier?: PrestigeTier;
    maxCost?: number;
  }): Promise<SummerProgram[]> {
    let query = `SELECT * FROM moat_summer_programs WHERE 1=1`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.programType) {
      query += ` AND program_type = $${paramIndex}`;
      queryParams.push(filters.programType);
      paramIndex++;
    }

    if (filters.prestigeTier) {
      query += ` AND prestige_tier = $${paramIndex}`;
      queryParams.push(filters.prestigeTier);
      paramIndex++;
    }

    if (filters.maxCost !== undefined) {
      query += ` AND cost_usd <= $${paramIndex}`;
      queryParams.push(filters.maxCost);
      paramIndex++;
    }

    query += ` ORDER BY prestige_tier, acceptance_rate ASC`;

    const result = await pool.query<SummerProgram>(query, queryParams);
    return result.rows;
  }

  async getTopSummerPrograms(limit: number = 10): Promise<SummerProgram[]> {
    const result = await pool.query<SummerProgram>(
      `SELECT * FROM moat_summer_programs
       WHERE prestige_tier IN ('tier1', 'tier2')
       ORDER BY CASE prestige_tier
         WHEN 'tier1' THEN 1
         WHEN 'tier2' THEN 2
         ELSE 3
       END, acceptance_rate ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // ==========================================================================
  // DS7: Research Articles
  // ==========================================================================

  async verifyResearchArticle(articleId: string): Promise<ResearchArticle | null> {
    const result = await pool.query<ResearchArticle>(
      'SELECT * FROM moat_research_articles WHERE article_id = $1',
      [articleId]
    );
    return result.rows[0] || null;
  }

  async searchResearchArticles(field: string, limit: number = 20): Promise<ResearchArticle[]> {
    const result = await pool.query<ResearchArticle>(
      `SELECT * FROM moat_research_articles
       WHERE field = $1
       ORDER BY citation_count DESC, publication_date DESC
       LIMIT $2`,
      [field, limit]
    );
    return result.rows;
  }

  // ==========================================================================
  // DS8: Competition Results
  // ==========================================================================

  async verifyCompetitionResult(
    competitionName: string,
    year: number,
    placement: string
  ): Promise<CompetitionResult | null> {
    const result = await pool.query<CompetitionResult>(
      `SELECT * FROM moat_competition_results
       WHERE competition_name = $1 AND year = $2 AND placement = $3
       LIMIT 1`,
      [competitionName, year, placement]
    );
    return result.rows[0] || null;
  }

  async getTopCompetitions(field: string): Promise<CompetitionResult[]> {
    const result = await pool.query<CompetitionResult>(
      `SELECT * FROM moat_competition_results
       WHERE field = $1 AND prestige_tier IN ('tier1', 'tier2')
       ORDER BY CASE prestige_tier
         WHEN 'tier1' THEN 1
         WHEN 'tier2' THEN 2
         ELSE 3
       END, year DESC`,
      [field]
    );
    return result.rows;
  }

  // ==========================================================================
  // Composite Queries (Multi-DS)
  // ==========================================================================

  /**
   * Get comprehensive college profile combining CDS + Rubric
   */
  async getCollegeProfile(collegeId: string) {
    const [benchmark, rubric, difficulty] = await Promise.all([
      this.getCollegeBenchmark(collegeId),
      this.getCollegeRubric(collegeId),
      this.getCollegeDifficultyTier(collegeId),
    ]);

    return {
      benchmark,
      rubric,
      difficulty_tier: difficulty,
    };
  }

  /**
   * Get comprehensive school-college context combining School + Placement + Hyperlocal
   */
  async getSchoolCollegeContext(schoolId: string, collegeId: string) {
    const [school, placement, hyperlocal] = await Promise.all([
      this.getSchoolProfile(schoolId),
      this.getPlacementHistory(schoolId, collegeId),
      this.getHyperlocalContext(schoolId, collegeId),
    ]);

    return {
      school,
      placement,
      hyperlocal,
    };
  }

  /**
   * Get chances assessment combining CDS + Twins + Placement
   */
  async getChancesAssessment(params: {
    studentId: string;
    collegeId: string;
    schoolId: string;
    gpa: number;
    sat: number;
    ecTier: ECTier;
  }) {
    // Determine GPA and SAT ranges
    const gpaRange = this.getGPARange(params.gpa);
    const satRange = this.getSATRange(params.sat);

    const [collegeBenchmark, twins, placement] = await Promise.all([
      this.getCollegeBenchmark(params.collegeId),
      this.findSimilarProfiles({
        gpaRange,
        satRange,
        ecTier: params.ecTier,
      }),
      this.getPlacementHistory(params.schoolId, params.collegeId),
    ]);

    return {
      college: collegeBenchmark,
      similar_profiles: twins,
      school_history: placement,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getGPARange(gpa: number): string {
    if (gpa >= 4.2) return '4.2-4.4';
    if (gpa >= 4.0) return '4.0-4.2';
    if (gpa >= 3.8) return '3.8-4.0';
    if (gpa >= 3.6) return '3.6-3.8';
    return '3.4-3.6';
  }

  private getSATRange(sat: number): string {
    if (sat >= 1550) return '1550-1600';
    if (sat >= 1500) return '1500-1550';
    if (sat >= 1450) return '1450-1500';
    if (sat >= 1400) return '1400-1450';
    if (sat >= 1350) return '1350-1400';
    return '1300-1350';
  }

  // ==========================================================================
  // DS6: Essay Examples
  // ==========================================================================

  async searchEssayExamples(filters: {
    collegeName?: string;
    promptType?: string;
    themes?: string[];
    limit?: number;
  }): Promise<any[]> {
    let query = 'SELECT * FROM moat_essay_examples WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.collegeName) {
      query += ` AND college_name = $${paramCount}`;
      params.push(filters.collegeName);
      paramCount++;
    }

    if (filters.promptType) {
      query += ` AND prompt_type = $${paramCount}`;
      params.push(filters.promptType);
      paramCount++;
    }

    if (filters.themes && filters.themes.length > 0) {
      query += ` AND themes ?| $${paramCount}`;
      params.push(filters.themes);
      paramCount++;
    }

    query += ` ORDER BY admission_year DESC LIMIT $${paramCount}`;
    params.push(filters.limit || 3);

    const result = await pool.query(query, params);
    return result.rows;
  }

  // ==========================================================================
  // DS7: Admissions Officer Perspectives
  // ==========================================================================

  async getAOPerspectives(filters: {
    collegeName?: string;
    topic?: string;
    selectivity?: string;
    limit?: number;
  }): Promise<any[]> {
    let query = 'SELECT * FROM moat_ao_perspectives WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.collegeName) {
      query += ` AND college_name = $${paramCount}`;
      params.push(filters.collegeName);
      paramCount++;
    }

    if (filters.topic) {
      query += ` AND topic = $${paramCount}`;
      params.push(filters.topic);
      paramCount++;
    }

    if (filters.selectivity) {
      query += ` AND selectivity = $${paramCount}`;
      params.push(filters.selectivity);
      paramCount++;
    }

    query += ` ORDER BY college_name, topic LIMIT $${paramCount}`;
    params.push(filters.limit || 3);

    const result = await pool.query(query, params);
    return result.rows;
  }
}

// Singleton instance
export const knowledgeMoat = new KnowledgeMoatRepository();
