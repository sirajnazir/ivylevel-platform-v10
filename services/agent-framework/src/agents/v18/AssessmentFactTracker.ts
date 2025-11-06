/**
 * Assessment Fact Tracker
 *
 * Tracks which facts have been collected and which are still needed
 * Based on Jenny's complete assessment framework (105 facts across 5 tiers)
 *
 * Standard: Match or exceed Jenny's 1-hour assessment sessions
 * - 90+ facts collected
 * - 45+ questions asked
 * - Quality score 8.5+
 * - Complete before handover
 */

export enum FactTier {
  PROFILE_FOUNDATION = 'profile_foundation',      // 25 facts - 100% required
  ACTIVITY_PROFILE = 'activity_profile',          // 30 facts - 100% required
  CONTEXT_DIFFERENTIATION = 'context',            // 20 facts - 80% required
  GAPS_CHALLENGES = 'gaps',                       // 15 facts - 100% required
  PSYCHOLOGY_CAPACITY = 'psychology'              // 15 facts - 60% required
}

export interface TierProgress {
  tier: FactTier;
  required_facts: string[];
  collected_facts: string[];
  completion_percentage: number;
  missing_critical: string[];
  missing_optional: string[];
  required_percentage: number;  // 1.0 = 100%, 0.8 = 80%, etc.
}

export interface AssessmentProgress {
  total_facts_required: number;
  total_facts_collected: number;
  overall_completion: number;  // 0-1
  tier_progress: Record<FactTier, TierProgress>;
  conversation_turns: number;
  estimated_remaining_questions: number;
  is_complete: boolean;
  quality_score: number;
  next_priority_tier: FactTier | null;
}

export class AssessmentFactTracker {

  /**
   * Tier 1: Profile Foundation (MUST HAVE 100%)
   * Core demographic, academic, and intent information
   */
  private static PROFILE_FACTS = [
    // Demographics (5 facts)
    'grade',
    'high_school',
    'location',
    'school_type',
    'school_size',

    // Academic (5 facts)
    'gpa',
    'gpa_type',
    'class_rank',
    'current_courses',
    'course_rigor',

    // Testing (5 facts)
    'test_scores',
    'sat_score',
    'act_score',
    'psat_score',
    'test_plan',

    // Rigor (5 facts)
    'ap_count',
    'ap_scores',
    'ap_planned',
    'honors_count',
    'ib_diploma',

    // Intent (5 facts)
    'target_major',
    'career_goal',
    'major_rationale',
    'major_discovery',
    'academic_interests'
  ];

  /**
   * Tier 2: Activity Profile (MUST HAVE 100%)
   * Comprehensive extracurricular activities analysis
   */
  private static ACTIVITY_FACTS = [
    // Activities list (3 facts)
    'activity_list',
    'activity_count',
    'primary_activities',

    // Activity details (collect for top 5-7 activities = 25 facts)
    'activity_roles',
    'activity_hours',
    'activity_duration',
    'activity_leadership',
    'activity_impact',
    'activity_metrics',
    'activity_alignment',
    'activity_passion_level',
    'activity_progression',
    'activity_team_sizes',
    'activity_reach',
    'activity_obstacles',
    'activity_future_plans',

    // Awards & recognition (5 facts)
    'awards_list',
    'awards_level',
    'competition_results',
    'recognition_received',
    'honors_received',

    // Depth indicators (7 facts)
    'leadership_positions',
    'team_sizes_led',
    'years_committed',
    'progression_trajectory',
    'impact_reach',
    'measurable_outcomes',
    'external_validation'
  ];

  /**
   * Tier 3: Context & Differentiation (SHOULD HAVE 80%+)
   * Contextual factors and unique circumstances
   */
  private static CONTEXT_FACTS = [
    // School context (5 facts)
    'school_competitiveness',
    'school_ranking',
    'peer_comparison',
    'resource_access',
    'geographic_context',

    // Personal context (5 facts)
    'demographic_background',
    'socioeconomic_status',
    'first_generation',
    'unique_circumstances',
    'cultural_background',

    // Constraints (5 facts)
    'time_constraints',
    'work_obligations',
    'family_responsibilities',
    'available_bandwidth',
    'financial_constraints',

    // Access (5 facts)
    'transportation_access',
    'mentor_access',
    'program_access',
    'opportunity_gaps',
    'systemic_barriers'
  ];

  /**
   * Tier 4: Gaps & Challenges (MUST HAVE 100%)
   * Critical for honest assessment and strategic planning
   */
  private static GAP_FACTS = [
    // Academic gaps (5 facts)
    'weak_grades',
    'grade_trends',
    'subject_struggles',
    'testing_gaps',
    'rigor_gaps',

    // EC gaps (5 facts)
    'leadership_gaps',
    'award_gaps',
    'depth_gaps',
    'alignment_gaps',
    'impact_gaps',

    // Narrative gaps (5 facts)
    'profile_scattered',
    'no_spike',
    'generic_profile',
    'narrative_clarity',
    'differentiator_missing'
  ];

  /**
   * Tier 5: Psychology & Capacity (SHOULD HAVE 60%+)
   * Understanding student's authentic interests and execution capacity
   */
  private static PSYCHOLOGY_FACTS = [
    // Personality & work style (5 facts)
    'personality_type',
    'work_style',
    'execution_speed',
    'self_direction',
    'needs_structure',

    // Authenticity (5 facts)
    'passion_authenticity',
    'parent_influence',
    'exploration_stage',
    'genuine_interest',
    'intellectual_curiosity',

    // Capacity (5 facts)
    'stress_tolerance',
    'capacity_assessment',
    'commitment_ability',
    'follow_through',
    'bandwidth_realistic'
  ];

  /**
   * Calculate comprehensive assessment progress
   */
  static calculateProgress(
    collectedFacts: Map<string, any>,
    conversationTurns: number = 0
  ): AssessmentProgress {
    const collectedKeys = Array.from(collectedFacts.keys());

    // Calculate tier progress
    const tiers: Record<FactTier, TierProgress> = {
      [FactTier.PROFILE_FOUNDATION]: this.calculateTierProgress(
        FactTier.PROFILE_FOUNDATION,
        this.PROFILE_FACTS,
        collectedKeys,
        1.0  // 100% required
      ),
      [FactTier.ACTIVITY_PROFILE]: this.calculateTierProgress(
        FactTier.ACTIVITY_PROFILE,
        this.ACTIVITY_FACTS,
        collectedKeys,
        1.0  // 100% required
      ),
      [FactTier.CONTEXT_DIFFERENTIATION]: this.calculateTierProgress(
        FactTier.CONTEXT_DIFFERENTIATION,
        this.CONTEXT_FACTS,
        collectedKeys,
        0.8  // 80% required
      ),
      [FactTier.GAPS_CHALLENGES]: this.calculateTierProgress(
        FactTier.GAPS_CHALLENGES,
        this.GAP_FACTS,
        collectedKeys,
        1.0  // 100% required
      ),
      [FactTier.PSYCHOLOGY_CAPACITY]: this.calculateTierProgress(
        FactTier.PSYCHOLOGY_CAPACITY,
        this.PSYCHOLOGY_FACTS,
        collectedKeys,
        0.6  // 60% required
      )
    };

    // Calculate overall progress
    const totalRequired = this.PROFILE_FACTS.length +
                         this.ACTIVITY_FACTS.length +
                         this.CONTEXT_FACTS.length +
                         this.GAP_FACTS.length +
                         this.PSYCHOLOGY_FACTS.length;

    const totalCollected = collectedKeys.length;
    const overallCompletion = totalCollected / totalRequired;

    // Check if assessment complete
    const isComplete = Object.values(tiers).every(tier =>
      tier.completion_percentage >= tier.required_percentage
    );

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(tiers, overallCompletion);

    // Determine next priority tier
    const nextPriorityTier = this.getNextPriorityTier(tiers);

    return {
      total_facts_required: totalRequired,
      total_facts_collected: totalCollected,
      overall_completion: overallCompletion,
      tier_progress: tiers,
      conversation_turns: conversationTurns,
      estimated_remaining_questions: Math.ceil((totalRequired - totalCollected) / 2),
      is_complete: isComplete,
      quality_score: qualityScore,
      next_priority_tier: nextPriorityTier
    };
  }

  /**
   * Calculate progress for a single tier
   */
  private static calculateTierProgress(
    tier: FactTier,
    requiredFacts: string[],
    collectedKeys: string[],
    requiredPercentage: number
  ): TierProgress {
    const collected = requiredFacts.filter(fact => collectedKeys.includes(fact));
    const missing = requiredFacts.filter(fact => !collectedKeys.includes(fact));

    const completion = collected.length / requiredFacts.length;
    const requiredCount = Math.ceil(requiredFacts.length * requiredPercentage);

    // Determine critical vs optional missing facts
    const missingCritical = missing.slice(0, Math.max(0, requiredCount - collected.length));
    const missingOptional = missing.slice(missingCritical.length);

    return {
      tier,
      required_facts: requiredFacts,
      collected_facts: collected,
      completion_percentage: completion,
      missing_critical: missingCritical,
      missing_optional: missingOptional,
      required_percentage: requiredPercentage
    };
  }

  /**
   * Calculate overall quality score (0-10 scale)
   * Based on tier completion and fact depth
   */
  private static calculateQualityScore(
    tiers: Record<FactTier, TierProgress>,
    overallCompletion: number
  ): number {
    let score = 0;

    // Tier 1 & 2 (Profile + Activities): 40% of score
    const tier1Score = tiers[FactTier.PROFILE_FOUNDATION].completion_percentage * 2;
    const tier2Score = tiers[FactTier.ACTIVITY_PROFILE].completion_percentage * 2;
    score += tier1Score + tier2Score;

    // Tier 4 (Gaps): 30% of score
    const tier4Score = tiers[FactTier.GAPS_CHALLENGES].completion_percentage * 3;
    score += tier4Score;

    // Tier 3 (Context): 20% of score
    const tier3Score = tiers[FactTier.CONTEXT_DIFFERENTIATION].completion_percentage * 2;
    score += tier3Score;

    // Tier 5 (Psychology): 10% of score
    const tier5Score = tiers[FactTier.PSYCHOLOGY_CAPACITY].completion_percentage * 1;
    score += tier5Score;

    // Apply overall completion bonus
    score = score * (0.7 + 0.3 * overallCompletion);

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Get next priority tier to focus on
   */
  private static getNextPriorityTier(
    tiers: Record<FactTier, TierProgress>
  ): FactTier | null {
    // Priority order: Profile → Activity → Gaps → Context → Psychology
    const priorityOrder = [
      FactTier.PROFILE_FOUNDATION,
      FactTier.ACTIVITY_PROFILE,
      FactTier.GAPS_CHALLENGES,
      FactTier.CONTEXT_DIFFERENTIATION,
      FactTier.PSYCHOLOGY_CAPACITY
    ];

    for (const tier of priorityOrder) {
      const progress = tiers[tier];
      if (progress.completion_percentage < progress.required_percentage) {
        return tier;
      }
    }

    return null;  // All tiers complete
  }

  /**
   * Get facts for a specific tier
   */
  static getFactsForTier(tier: FactTier): string[] {
    switch (tier) {
      case FactTier.PROFILE_FOUNDATION:
        return this.PROFILE_FACTS;
      case FactTier.ACTIVITY_PROFILE:
        return this.ACTIVITY_FACTS;
      case FactTier.CONTEXT_DIFFERENTIATION:
        return this.CONTEXT_FACTS;
      case FactTier.GAPS_CHALLENGES:
        return this.GAP_FACTS;
      case FactTier.PSYCHOLOGY_CAPACITY:
        return this.PSYCHOLOGY_FACTS;
      default:
        return [];
    }
  }

  /**
   * Get all required facts for handover
   * (90+ facts minimum)
   */
  static getAllRequiredFacts(): string[] {
    return [
      ...this.PROFILE_FACTS,        // 25 facts (100%)
      ...this.ACTIVITY_FACTS,       // 30 facts (100%)
      ...this.CONTEXT_FACTS.slice(0, Math.ceil(this.CONTEXT_FACTS.length * 0.8)),  // 16 facts (80%)
      ...this.GAP_FACTS,            // 15 facts (100%)
      ...this.PSYCHOLOGY_FACTS.slice(0, Math.ceil(this.PSYCHOLOGY_FACTS.length * 0.6))  // 9 facts (60%)
    ];
  }
}
