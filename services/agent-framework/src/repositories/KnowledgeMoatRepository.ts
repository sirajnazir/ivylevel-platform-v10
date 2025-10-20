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

  // ==========================================================================
  // DS-T1: Tactic Chips (Coaching Intelligence)
  // Added: 2025-10-16 (Week 12 - Knowledge Moat Implementation)
  // ==========================================================================

  /**
   * Search for relevant tactic chips based on student barriers and archetypes
   * Used by agents to recommend proven coaching tactics
   */
  async searchTacticChips(filters: {
    barriers?: string[];
    archetypes?: string[];
    category?: string;
    minQualityScore?: number;
    limit?: number;
  }): Promise<any[]> {
    let query = `
      SELECT
        tactic_id,
        tactic_name,
        tactic_slug,
        tactic_category,
        domain,
        student_archetypes,
        barriers_addressed,
        core_principle,
        description,
        micro_actions,
        typical_outcomes,
        estimated_duration,
        difficulty_level,
        quality_score,
        confidence_score,
        success_rate,
        times_applied,
        created_by_coach
      FROM moat_tactic_chips
      WHERE validation_status IN ('approved', 'featured')
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by barriers addressed (student needs specific help with time-crisis, essay-generic, etc.)
    if (filters.barriers && filters.barriers.length > 0) {
      query += ` AND barriers_addressed && $${paramCount}::text[]`;
      params.push(filters.barriers);
      paramCount++;
    }

    // Filter by student archetypes (first-gen-immigrant, STEM-female, etc.)
    if (filters.archetypes && filters.archetypes.length > 0) {
      query += ` AND student_archetypes && $${paramCount}::text[]`;
      params.push(filters.archetypes);
      paramCount++;
    }

    // Filter by tactic category (Time Management, Essay Strategy, etc.)
    if (filters.category) {
      query += ` AND tactic_category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    // Filter by minimum quality score
    if (filters.minQualityScore !== undefined) {
      query += ` AND quality_score >= $${paramCount}`;
      params.push(filters.minQualityScore);
      paramCount++;
    }

    // Order by quality score descending, success rate descending
    query += ` ORDER BY quality_score DESC, success_rate DESC NULLS LAST LIMIT $${paramCount}`;
    params.push(filters.limit || 5);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get a specific tactic chip by slug
   */
  async getTacticBySlug(tacticSlug: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT
        tactic_id,
        tactic_name,
        tactic_slug,
        tactic_category,
        domain,
        student_archetypes,
        barriers_addressed,
        core_principle,
        description,
        micro_actions,
        typical_outcomes,
        estimated_duration,
        difficulty_level,
        quality_score,
        confidence_score,
        success_rate,
        times_applied,
        times_succeeded,
        created_by_coach
      FROM moat_tactic_chips
      WHERE tactic_slug = $1 AND validation_status IN ('approved', 'featured')
      ORDER BY version DESC
      LIMIT 1`,
      [tacticSlug]
    );
    return result.rows[0] || null;
  }

  /**
   * Get related tactics based on tactic relationships (builds_on, pairs_with)
   */
  async getRelatedTactics(tacticId: string, limit: number = 3): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        t2.tactic_id,
        t2.tactic_name,
        t2.tactic_slug,
        t2.tactic_category,
        t2.core_principle,
        t2.quality_score
      FROM moat_tactic_chips t1
      JOIN moat_tactic_chips t2 ON (
        t2.tactic_slug = ANY(t1.pairs_with) OR
        t2.tactic_slug = ANY(t1.builds_on)
      )
      WHERE t1.tactic_id = $1
        AND t2.validation_status IN ('approved', 'featured')
      ORDER BY t2.quality_score DESC
      LIMIT $2`,
      [tacticId, limit]
    );
    return result.rows;
  }

  /**
   * Get top tactics by category
   */
  async getTopTacticsByCategory(category: string, limit: number = 5): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        tactic_id,
        tactic_name,
        tactic_slug,
        core_principle,
        description,
        quality_score,
        success_rate,
        times_applied
      FROM moat_tactic_chips
      WHERE tactic_category = $1
        AND validation_status IN ('approved', 'featured')
      ORDER BY quality_score DESC, success_rate DESC NULLS LAST
      LIMIT $2`,
      [category, limit]
    );
    return result.rows;
  }

  /**
   * Record tactic retrieval (for analytics)
   */
  async incrementTacticRetrieval(tacticId: string): Promise<void> {
    await pool.query(
      `UPDATE moat_tactic_chips
       SET times_retrieved = times_retrieved + 1
       WHERE tactic_id = $1`,
      [tacticId]
    );
  }

  // ==========================================================================
  // DS-T2: Success Patterns (Student Journey Intelligence)
  // Added: 2025-10-16 (Week 13 - Knowledge Moat Implementation)
  // ==========================================================================

  /**
   * Search for relevant success patterns based on student archetype, barriers, and desired outcomes
   * Used by agents to show students "journeys like yours" and provide proven pathway examples
   */
  async searchSuccessPatterns(filters: {
    archetypeTags?: string[];
    barriers?: string[];
    outcomeCategory?: string;
    tacticsUsed?: string[];
    minQualityScore?: number;
    minHelpfulVotes?: number;
    limit?: number;
  }): Promise<any[]> {
    let query = `
      SELECT
        pattern_id,
        title,
        pattern_slug,
        outcome_category,
        student_archetype,
        archetype_tags,
        start_date,
        breakthrough_date,
        outcome_date,
        total_duration_days,
        starting_stats,
        barriers_faced,
        initial_challenges,
        tactics_used,
        tactic_sequence,
        most_impactful,
        key_turning_points,
        what_clicked,
        final_outcomes,
        measurable_results,
        what_worked,
        what_was_hard,
        what_would_change,
        advice_to_similar,
        quality_score,
        helpful_votes,
        unhelpful_votes,
        times_shown,
        validation_status,
        created_at
      FROM moat_student_success_patterns
      WHERE validation_status IN ('verified', 'featured')
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by archetype tags (student demographics/profile matching)
    if (filters.archetypeTags && filters.archetypeTags.length > 0) {
      query += ` AND archetype_tags && $${paramCount}::text[]`;
      params.push(filters.archetypeTags);
      paramCount++;
    }

    // Filter by barriers faced (student needs help with similar challenges)
    if (filters.barriers && filters.barriers.length > 0) {
      query += ` AND barriers_faced && $${paramCount}::text[]`;
      params.push(filters.barriers);
      paramCount++;
    }

    // Filter by outcome category (student wants to achieve similar outcome)
    if (filters.outcomeCategory) {
      query += ` AND outcome_category = $${paramCount}`;
      params.push(filters.outcomeCategory);
      paramCount++;
    }

    // Filter by tactics used (student wants to see patterns using specific tactics)
    if (filters.tacticsUsed && filters.tacticsUsed.length > 0) {
      query += ` AND tactics_used && $${paramCount}::text[]`;
      params.push(filters.tacticsUsed);
      paramCount++;
    }

    // Filter by minimum quality score
    if (filters.minQualityScore !== undefined) {
      query += ` AND quality_score >= $${paramCount}`;
      params.push(filters.minQualityScore);
      paramCount++;
    }

    // Filter by minimum helpful votes (community validation)
    if (filters.minHelpfulVotes !== undefined) {
      query += ` AND helpful_votes >= $${paramCount}`;
      params.push(filters.minHelpfulVotes);
      paramCount++;
    }

    // Order by quality score descending, helpful votes descending
    query += ` ORDER BY quality_score DESC, (helpful_votes - unhelpful_votes) DESC, times_shown DESC LIMIT $${paramCount}`;
    params.push(filters.limit || 5);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get a specific success pattern by slug
   */
  async getSuccessPatternBySlug(patternSlug: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT
        pattern_id,
        contributor_type,
        contributor_id,
        student_id,
        coach_id,
        title,
        pattern_slug,
        outcome_category,
        student_archetype,
        archetype_tags,
        start_date,
        breakthrough_date,
        outcome_date,
        total_duration_days,
        starting_stats,
        barriers_faced,
        initial_challenges,
        tactics_used,
        tactic_sequence,
        most_impactful,
        key_turning_points,
        what_clicked,
        final_outcomes,
        measurable_results,
        proof_type,
        proof_links,
        what_worked,
        what_was_hard,
        what_would_change,
        advice_to_similar,
        data_completeness,
        validation_status,
        validated_by,
        quality_score,
        times_shown,
        helpful_votes,
        unhelpful_votes,
        comments_count,
        similar_patterns,
        contrasting_paths,
        created_at,
        updated_at
      FROM moat_student_success_patterns
      WHERE pattern_slug = $1 AND validation_status IN ('verified', 'featured')
      LIMIT 1`,
      [patternSlug]
    );
    return result.rows[0] || null;
  }

  /**
   * Get success patterns by outcome category
   * E.g., "National Award Win", "Essay Transformation", "GPA Boost"
   */
  async getSuccessPatternsByOutcome(outcomeCategory: string, limit: number = 5): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        pattern_id,
        title,
        pattern_slug,
        outcome_category,
        archetype_tags,
        starting_stats,
        barriers_faced,
        final_outcomes,
        measurable_results,
        what_worked,
        advice_to_similar,
        quality_score,
        helpful_votes,
        times_shown
      FROM moat_student_success_patterns
      WHERE outcome_category = $1
        AND validation_status IN ('verified', 'featured')
      ORDER BY quality_score DESC, helpful_votes DESC
      LIMIT $2`,
      [outcomeCategory, limit]
    );
    return result.rows;
  }

  /**
   * Find similar success patterns based on archetype overlap
   * Used to show "students like you who succeeded"
   */
  async findSimilarSuccessPatterns(
    archetypeTags: string[],
    excludePatternId?: string,
    limit: number = 3
  ): Promise<any[]> {
    let query = `
      SELECT
        pattern_id,
        title,
        pattern_slug,
        outcome_category,
        archetype_tags,
        starting_stats,
        barriers_faced,
        final_outcomes,
        measurable_results,
        what_worked,
        advice_to_similar,
        quality_score,
        helpful_votes,
        (SELECT COUNT(*) FROM unnest(archetype_tags) tag WHERE tag = ANY($1::text[])) as tag_match_count
      FROM moat_student_success_patterns
      WHERE validation_status IN ('verified', 'featured')
        AND archetype_tags && $1::text[]
    `;
    const params: any[] = [archetypeTags];
    let paramCount = 2;

    if (excludePatternId) {
      query += ` AND pattern_id != $${paramCount}::uuid`;
      params.push(excludePatternId);
      paramCount++;
    }

    query += ` ORDER BY tag_match_count DESC, quality_score DESC, helpful_votes DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get top success patterns overall (featured/highest quality)
   */
  async getTopSuccessPatterns(limit: number = 10): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        pattern_id,
        title,
        pattern_slug,
        outcome_category,
        archetype_tags,
        starting_stats,
        barriers_faced,
        final_outcomes,
        measurable_results,
        what_worked,
        advice_to_similar,
        quality_score,
        helpful_votes,
        unhelpful_votes,
        times_shown,
        validation_status
      FROM moat_student_success_patterns
      WHERE validation_status IN ('verified', 'featured')
      ORDER BY
        CASE validation_status
          WHEN 'featured' THEN 1
          WHEN 'verified' THEN 2
          ELSE 3
        END,
        quality_score DESC,
        (helpful_votes - unhelpful_votes) DESC,
        times_shown DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get success patterns that used specific tactics
   * Used to show "here's how others used this tactic successfully"
   */
  async getSuccessPatternsUsingTactic(tacticSlug: string, limit: number = 5): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        pattern_id,
        title,
        pattern_slug,
        outcome_category,
        archetype_tags,
        barriers_faced,
        tactics_used,
        most_impactful,
        final_outcomes,
        measurable_results,
        what_worked,
        quality_score,
        helpful_votes
      FROM moat_student_success_patterns
      WHERE validation_status IN ('verified', 'featured')
        AND $1 = ANY(tactics_used)
      ORDER BY
        CASE WHEN $1 = ANY(most_impactful) THEN 1 ELSE 2 END,
        quality_score DESC,
        helpful_votes DESC
      LIMIT $2`,
      [tacticSlug, limit]
    );
    return result.rows;
  }

  /**
   * Get breakthrough insights from success patterns
   * Extract "what clicked" moments for inspiring students
   */
  async getBreakthroughInsights(filters: {
    outcomeCategory?: string;
    archetypeTags?: string[];
    limit?: number;
  }): Promise<any[]> {
    let query = `
      SELECT
        pattern_id,
        title,
        pattern_slug,
        outcome_category,
        archetype_tags,
        breakthrough_date,
        key_turning_points,
        what_clicked,
        most_impactful,
        quality_score
      FROM moat_student_success_patterns
      WHERE validation_status IN ('verified', 'featured')
        AND what_clicked IS NOT NULL
        AND what_clicked != ''
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (filters.outcomeCategory) {
      query += ` AND outcome_category = $${paramCount}`;
      params.push(filters.outcomeCategory);
      paramCount++;
    }

    if (filters.archetypeTags && filters.archetypeTags.length > 0) {
      query += ` AND archetype_tags && $${paramCount}::text[]`;
      params.push(filters.archetypeTags);
      paramCount++;
    }

    query += ` ORDER BY quality_score DESC, helpful_votes DESC LIMIT $${paramCount}`;
    params.push(filters.limit || 5);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Record success pattern view (for analytics)
   */
  async incrementPatternView(patternId: string): Promise<void> {
    await pool.query(
      `UPDATE moat_student_success_patterns
       SET times_shown = times_shown + 1,
           last_viewed_at = now()
       WHERE pattern_id = $1`,
      [patternId]
    );
  }

  /**
   * Get success patterns for a specific student (their own journey patterns)
   */
  async getStudentSuccessPatterns(studentId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        pattern_id,
        title,
        pattern_slug,
        outcome_category,
        archetype_tags,
        start_date,
        breakthrough_date,
        outcome_date,
        total_duration_days,
        starting_stats,
        barriers_faced,
        tactics_used,
        final_outcomes,
        measurable_results,
        what_worked,
        what_was_hard,
        what_would_change,
        quality_score,
        validation_status,
        created_at
      FROM moat_student_success_patterns
      WHERE student_id = $1
      ORDER BY created_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  // ==============================================================================
  // DS6: Essay Examples
  // ==============================================================================

  /**
   * Get essay examples with flexible filtering
   */
  async getEssayExamples(filters: {
    collegeName?: string;
    promptType?: string;
    themes?: string[];
    admittedOnly?: boolean;
    minWordCount?: number;
    maxWordCount?: number;
    writingQuality?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.collegeName) {
      conditions.push(`college_name = $${paramIndex++}`);
      params.push(filters.collegeName);
    }

    if (filters.promptType) {
      conditions.push(`prompt_type = $${paramIndex++}`);
      params.push(filters.promptType);
    }

    if (filters.themes && filters.themes.length > 0) {
      conditions.push(`themes && $${paramIndex++}::text[]`);
      params.push(filters.themes);
    }

    if (filters.admittedOnly) {
      conditions.push(`student_admitted = true`);
    }

    if (filters.minWordCount) {
      conditions.push(`word_count >= $${paramIndex++}`);
      params.push(filters.minWordCount);
    }

    if (filters.maxWordCount) {
      conditions.push(`word_count <= $${paramIndex++}`);
      params.push(filters.maxWordCount);
    }

    if (filters.writingQuality) {
      conditions.push(`writing_quality = $${paramIndex++}`);
      params.push(filters.writingQuality);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 10;

    const result = await pool.query(
      `SELECT
        id,
        student_id,
        college_name,
        prompt_type,
        admission_year,
        essay_text,
        themes,
        writing_quality,
        word_count,
        student_admitted,
        student_enrolled,
        analysis_notes,
        key_takeaways,
        created_at
      FROM moat_essay_examples
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}`,
      [...params, limit]
    );

    return result.rows;
  }

  /**
   * Record tactic application (when student starts using a tactic)
   */
  async recordTacticApplication(data: {
    student_id: string;
    coach_id: string;
    tactic_id: number;
    applied_at: Date;
    application_context: any;
    status: string;
  }): Promise<number> {
    const result = await pool.query(
      `INSERT INTO moat_tactic_applications
       (student_id, coach_id, tactic_id, applied_at, application_context, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING application_id`,
      [
        data.student_id,
        data.coach_id,
        data.tactic_id,
        data.applied_at,
        JSON.stringify(data.application_context),
        data.status,
      ]
    );

    // Increment times_applied counter
    await this.incrementTacticCounters(data.tactic_id, { times_applied: 1 });

    return result.rows[0].application_id;
  }

  /**
   * Complete tactic application (mark as succeeded/partial/abandoned)
   */
  async completeTacticApplication(data: {
    application_id: number;
    completed_at: Date;
    status: string;
    outcome_reflection?: string;
    measured_results?: any;
  }): Promise<void> {
    await pool.query(
      `UPDATE moat_tactic_applications
       SET completed_at = $1,
           status = $2,
           outcome_reflection = $3,
           measured_results = $4
       WHERE application_id = $5`,
      [
        data.completed_at,
        data.status,
        data.outcome_reflection || null,
        data.measured_results ? JSON.stringify(data.measured_results) : null,
        data.application_id,
      ]
    );
  }

  /**
   * Get tactic application by ID
   */
  async getTacticApplication(applicationId: number): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM moat_tactic_applications WHERE application_id = $1`,
      [applicationId]
    );
    return result.rows[0];
  }

  /**
   * Increment tactic counters (times_applied, times_succeeded)
   */
  async incrementTacticCounters(
    tacticId: number,
    counters: { times_applied?: number; times_succeeded?: number }
  ): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (counters.times_applied !== undefined) {
      updates.push(`times_applied = times_applied + $${paramIndex++}`);
      params.push(counters.times_applied);
    }

    if (counters.times_succeeded !== undefined) {
      updates.push(`times_succeeded = times_succeeded + $${paramIndex++}`);
      params.push(counters.times_succeeded);

      // Recalculate success_rate
      updates.push(`success_rate = CASE
        WHEN times_applied > 0
        THEN (times_succeeded::float / times_applied::float)
        ELSE 0
      END`);
    }

    if (updates.length > 0) {
      params.push(tacticId);
      await pool.query(
        `UPDATE moat_tactic_chips
         SET ${updates.join(', ')}
         WHERE tactic_id = $${paramIndex}`,
        params
      );
    }
  }

  /**
   * Get all tactic applications for a student
   */
  async getStudentTacticApplications(studentId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        ta.*,
        tc.tactic_name,
        tc.tactic_slug,
        tc.tactic_category,
        tc.estimated_duration
       FROM moat_tactic_applications ta
       JOIN moat_tactic_chips tc ON ta.tactic_id = tc.tactic_id
       WHERE ta.student_id = $1
       ORDER BY ta.applied_at DESC`,
      [studentId]
    );
    return result.rows;
  }
}

// Singleton instance
export const knowledgeMoat = new KnowledgeMoatRepository();
