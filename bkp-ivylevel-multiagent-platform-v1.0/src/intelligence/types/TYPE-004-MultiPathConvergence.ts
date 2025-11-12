/**
 * TYPE-004: Multi-Path Convergence Intelligence
 * Category: DOMAIN_SPECIFIC (GamePlanAgent)
 *
 * Framework: Parallel Planning + Convergence Milestone Technique
 *
 * Purpose: Handle undecided students with multiple potential paths (e.g., CS vs Film vs Business).
 * Creates parallel strategic paths that converge over time through shared activities.
 *
 * Real-World Example (from Huda coaching):
 * - Huda was undecided between Film and CS
 * - Path 1 (Film): Film club, video projects, film competitions
 * - Path 2 (CS): Coding, game development, hackathons
 * - Convergence: "Digital Storyteller" (Film × CS → Interactive games/media)
 * - Result: USC School of Cinematic Arts (Games) - perfect fusion
 *
 * Algorithm: Parallel Path Planning + Convergence Detection
 *
 * **Path Detection:**
 * - Identify multiple passion areas from assessment (e.g., "Film × CS", "AI and Ethics")
 * - Create 2-3 parallel paths, each with its own:
 *   - Target schools (Film: USC/NYU, CS: MIT/CMU, Fusion: USC Games/MIT Media Lab)
 *   - Rubric focus (Film: Personal Initiative + Recognition, CS: Academics + Personal Initiative)
 *   - Activity priorities (Film: Film club, CS: Coding club, Both: Game dev project)
 *
 * **Convergence Strategy:**
 * - Phase 1 (Q1-Q2): 60/40 split (explore both paths)
 * - Phase 2 (Q3-Q4): 50/50 or 70/30 (data-driven adjustment based on progress)
 * - Phase 3 (Q5-Q7): 80/20 or 100/0 (converge on dominant path OR fusion)
 * - Convergence indicators: Shared activities that serve both paths (game dev = Film + CS)
 *
 * **Output:** Multi-Path Convergence Result
 * - paths: All parallel paths (2-3 typically)
 * - convergence_timeline: When/how paths converge
 * - shared_activities: Activities that serve multiple paths
 * - path_viability_scores: Which path is strongest (data-driven)
 * - recommended_split: Time allocation across paths per quarter
 *
 * Data Sources:
 * - 05-huda_game_plan_progression_2year_extraction.json (real multi-path example)
 * - W000-STRATEGY-014 (Multi-path planning patterns)
 * - Huda coaching sessions showing Film × CS convergence
 *
 * Created: 2025-10-29
 * Version: v18.0
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

/**
 * Parallel path definition
 */
interface ParallelPath {
  path_id: string;
  path_name: string; // e.g., "Computer Science Path", "Film Path"
  passion_area: string; // Core interest
  target_schools: string[]; // Schools aligned with this path
  rubric_focus: string[]; // Which rubric dimensions this path emphasizes
  unique_activities: string[]; // Path-specific activities
  viability_score: number; // 0-10 (how realistic based on current profile)
  rubric_alignment_score: number; // 0-10 (how well current rubric aligns)
  passion_strength: number; // 0-10 (how strong student's interest is)
}

/**
 * Convergence opportunity (activity that serves multiple paths)
 */
interface ConvergenceOpportunity {
  activity_name: string;
  serves_paths: string[]; // Path IDs this activity serves
  convergence_strength: number; // 0-10 (how well it bridges paths)
  rubric_impact: { dimension: string; delta: number }[];
  recommended_quarter: number;
  rationale: string; // Why this activity bridges paths
}

/**
 * Convergence timeline
 */
interface ConvergenceTimeline {
  quarter: number;
  phase: 'explore' | 'evaluate' | 'converge';
  recommended_split: string; // e.g., "60% CS / 40% Film"
  decision_criteria: string[]; // What to evaluate to adjust split
  convergence_milestones: string[];
}

/**
 * Multi-path convergence result
 */
interface MultiPathConvergenceResult {
  has_multiple_paths: boolean;
  paths: ParallelPath[];
  convergence_opportunities: ConvergenceOpportunity[];
  convergence_timeline: ConvergenceTimeline[];
  dominant_path: string | null; // If one path clearly stronger
  fusion_narrative: string | null; // If paths can fuse (e.g., "Digital Storyteller")
  recommended_strategy: string;
  recommendations: string[];
}

export class MultiPathConvergence implements IntelligenceType {
  type_id = 'TYPE-004';
  name = 'Multi-Path Convergence';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'GamePlanAgent';
  version = 'v18.0';

  /**
   * Known path fusion patterns (from coaching intelligence)
   */
  private readonly FUSION_PATTERNS: Record<string, { fusion: string; target_schools: string[] }> = {
    'Film×CS': {
      fusion: 'Digital Storyteller (Interactive Media/Games)',
      target_schools: ['USC School of Cinematic Arts (Games)', 'MIT Media Lab', 'CMU ETC', 'NYU Game Center'],
    },
    'AI×Ethics': {
      fusion: 'Ethical AI Researcher',
      target_schools: ['Stanford HAI', 'MIT CSAIL', 'Harvard CS + Philosophy', 'Berkeley EECS'],
    },
    'Business×Tech': {
      fusion: 'Tech Entrepreneur',
      target_schools: ['MIT Sloan (Management + Tech)', 'Stanford MS&E', 'Penn Wharton + SEAS', 'Berkeley Haas + EECS'],
    },
    'Biology×CS': {
      fusion: 'Computational Biology Researcher',
      target_schools: ['MIT Computational Biology', 'Stanford Bioengineering', 'CMU Computational Biology'],
    },
  };

  /**
   * Process multi-path convergence
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract facts
    const assessmentFacts = facts.getFactsByCategory(FactCategory.ASSESSMENT_DATA);
    const activityFacts = facts.getFactsByCategory(FactCategory.ACTIVITY_DATA);
    const profileFacts = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE);

    // Detect if student has multiple paths
    const assessmentData = assessmentFacts[0]?.data || {};
    const identityFusion = assessmentData.identity_fusion || '';
    const passionAreas = assessmentData.passion_areas || '';

    const hasMultiplePaths = this.detectMultiplePaths(identityFusion, passionAreas);

    if (!hasMultiplePaths) {
      // Student is decided, return minimal result
      return {
        type_id: this.type_id,
        component: 'multi_path_convergence',
        triggered: false,
        confidence: 0.9,
        data: {
          has_multiple_paths: false,
          paths: [],
          convergence_opportunities: [],
          convergence_timeline: [],
          dominant_path: null,
          fusion_narrative: null,
          recommended_strategy: 'Student has clear singular focus - no multi-path planning needed',
          recommendations: [],
        },
      };
    }

    // Parse paths from identity fusion / passion areas
    const paths = this.parsePaths(identityFusion, passionAreas, assessmentData, activityFacts);

    // Identify convergence opportunities
    const convergenceOpportunities = this.identifyConvergenceOpportunities(paths, activityFacts);

    // Create convergence timeline
    const convergenceTimeline = this.createConvergenceTimeline(paths);

    // Determine dominant path or fusion
    const { dominantPath, fusionNarrative } = this.analyzeDominanceAndFusion(paths, identityFusion);

    // Recommend strategy
    const recommendedStrategy = this.recommendStrategy(paths, dominantPath, fusionNarrative);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      paths,
      convergenceOpportunities,
      dominantPath,
      fusionNarrative
    );

    const result: MultiPathConvergenceResult = {
      has_multiple_paths: true,
      paths: paths,
      convergence_opportunities: convergenceOpportunities,
      convergence_timeline: convergenceTimeline,
      dominant_path: dominantPath,
      fusion_narrative: fusionNarrative,
      recommended_strategy: recommendedStrategy,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      component: 'multi_path_convergence',
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  /**
   * Detect if student has multiple paths
   */
  private detectMultiplePaths(identityFusion: string, passionAreas: string): boolean {
    // Check for fusion operators
    if (identityFusion.includes('×') || identityFusion.includes('→')) {
      return true;
    }

    // Check for multiple passion areas
    if (passionAreas.includes('×') || passionAreas.includes(' and ') || passionAreas.includes(',')) {
      return true;
    }

    return false;
  }

  /**
   * Parse paths from identity fusion and passion areas
   */
  private parsePaths(
    identityFusion: string,
    passionAreas: string,
    assessmentData: any,
    activityFacts: any[]
  ): ParallelPath[] {
    const paths: ParallelPath[] = [];

    // Extract passion areas (split by ×, 'and', or ',')
    let passionList: string[] = [];
    if (passionAreas.includes('×')) {
      passionList = passionAreas.split('×').map(p => p.trim());
    } else if (passionAreas.includes(' and ')) {
      passionList = passionAreas.split(' and ').map(p => p.trim());
    } else if (passionAreas.includes(',')) {
      passionList = passionAreas.split(',').map(p => p.trim());
    } else {
      passionList = [passionAreas];
    }

    // Create a path for each passion area
    passionList.slice(0, 3).forEach((passion, index) => {
      const pathId = `PATH-${index + 1}`;
      const pathName = `${passion} Path`;

      // Determine target schools for this path
      const targetSchools = this.getTargetSchoolsForPassion(passion);

      // Determine rubric focus
      const rubricFocus = this.getRubricFocusForPassion(passion);

      // Get unique activities for this path
      const uniqueActivities = this.getUniqueActivitiesForPassion(passion);

      // Calculate viability score (based on current activities)
      const viabilityScore = this.calculateViabilityScore(passion, activityFacts);

      // Calculate rubric alignment
      const rubricAlignmentScore = this.calculateRubricAlignment(passion, assessmentData.rubric_scores || {});

      // Estimate passion strength (would ideally come from assessment)
      const passionStrength = 7.0; // Default, would be refined with more data

      paths.push({
        path_id: pathId,
        path_name: pathName,
        passion_area: passion,
        target_schools: targetSchools,
        rubric_focus: rubricFocus,
        unique_activities: uniqueActivities,
        viability_score: viabilityScore,
        rubric_alignment_score: rubricAlignmentScore,
        passion_strength: passionStrength,
      });
    });

    return paths;
  }

  /**
   * Get target schools for passion area
   */
  private getTargetSchoolsForPassion(passion: string): string[] {
    const schoolMap: Record<string, string[]> = {
      'Film': ['USC School of Cinematic Arts', 'NYU Tisch', 'Chapman Dodge', 'UCLA Film'],
      'CS': ['MIT EECS', 'CMU CS', 'Stanford CS', 'Berkeley EECS'],
      'Computer Science': ['MIT EECS', 'CMU CS', 'Stanford CS', 'Berkeley EECS'],
      'Business': ['Penn Wharton', 'MIT Sloan', 'Berkeley Haas', 'USC Marshall'],
      'AI': ['Stanford HAI', 'MIT CSAIL', 'CMU AI', 'Berkeley AI Research'],
      'Biology': ['Stanford Biology', 'MIT Biology', 'Harvard MCB', 'UCSD Biology'],
      'Engineering': ['MIT', 'Stanford', 'Caltech', 'Berkeley'],
    };

    // Try to match passion to known schools
    for (const [key, schools] of Object.entries(schoolMap)) {
      if (passion.toLowerCase().includes(key.toLowerCase())) {
        return schools;
      }
    }

    return ['Top programs in ' + passion];
  }

  /**
   * Get rubric focus for passion area
   */
  private getRubricFocusForPassion(passion: string): string[] {
    const focusMap: Record<string, string[]> = {
      'Film': ['Personal_Initiative', 'Recognition', 'Extracurriculars'],
      'CS': ['Academics', 'Personal_Initiative', 'Recognition'],
      'Computer Science': ['Academics', 'Personal_Initiative', 'Recognition'],
      'Business': ['Leadership', 'Personal_Initiative', 'Community_Service'],
      'AI': ['Academics', 'Personal_Initiative', 'Recognition'],
      'Biology': ['Academics', 'Personal_Initiative', 'Community_Service'],
    };

    for (const [key, focus] of Object.entries(focusMap)) {
      if (passion.toLowerCase().includes(key.toLowerCase())) {
        return focus;
      }
    }

    return ['Personal_Initiative', 'Recognition'];
  }

  /**
   * Get unique activities for passion area
   */
  private getUniqueActivitiesForPassion(passion: string): string[] {
    const activityMap: Record<string, string[]> = {
      'Film': ['Film club officer', 'Submit to film festivals', 'Create video portfolio'],
      'CS': ['Coding competitions', 'Hackathons', 'Open source contributions'],
      'Computer Science': ['Coding competitions', 'Hackathons', 'Build apps/projects'],
      'Business': ['DECA competition', 'Start business', 'Entrepreneurship club'],
      'AI': ['AI research project', 'Kaggle competitions', 'AI ethics work'],
      'Biology': ['Lab research', 'Science Olympiad', 'Biology research paper'],
    };

    for (const [key, activities] of Object.entries(activityMap)) {
      if (passion.toLowerCase().includes(key.toLowerCase())) {
        return activities;
      }
    }

    return [`${passion}-specific activities`, `${passion} club leadership`, `${passion} projects`];
  }

  /**
   * Calculate viability score based on current activities
   */
  private calculateViabilityScore(passion: string, activityFacts: any[]): number {
    // Count activities aligned with this passion
    let alignedCount = 0;
    activityFacts.forEach(fact => {
      const activityName = (fact.data?.name || '').toLowerCase();
      const activityDesc = (fact.data?.description || '').toLowerCase();
      const combined = activityName + ' ' + activityDesc;

      if (combined.includes(passion.toLowerCase())) {
        alignedCount++;
      }
    });

    // Viability = (aligned activities / 3) * 10, capped at 10
    const viability = Math.min(10, (alignedCount / 3) * 10);
    return Math.round(viability * 10) / 10; // Round to 1 decimal
  }

  /**
   * Calculate rubric alignment score
   */
  private calculateRubricAlignment(passion: string, rubricScores: any): number {
    // Get rubric focus for this passion
    const focusDimensions = this.getRubricFocusForPassion(passion);

    // Calculate average score in focus dimensions
    let totalScore = 0;
    let count = 0;

    focusDimensions.forEach(dim => {
      const score = rubricScores[dim]?.current || 0;
      totalScore += score;
      count++;
    });

    const avgScore = count > 0 ? totalScore / count : 5.0;
    return Math.round(avgScore * 10) / 10;
  }

  /**
   * Identify convergence opportunities
   */
  private identifyConvergenceOpportunities(
    paths: ParallelPath[],
    activityFacts: any[]
  ): ConvergenceOpportunity[] {
    const opportunities: ConvergenceOpportunity[] = [];

    // If 2 paths, look for fusion patterns
    if (paths.length === 2) {
      const path1 = paths[0].passion_area;
      const path2 = paths[1].passion_area;

      // Check known fusion patterns
      const fusionKey = `${path1}×${path2}`;
      const reverseFusionKey = `${path2}×${path1}`;

      if (this.FUSION_PATTERNS[fusionKey] || this.FUSION_PATTERNS[reverseFusionKey]) {
        const fusionPattern = this.FUSION_PATTERNS[fusionKey] || this.FUSION_PATTERNS[reverseFusionKey];

        // Create convergence opportunity
        opportunities.push({
          activity_name: `${path1} × ${path2} Project (e.g., Interactive Game, Digital Media)`,
          serves_paths: [paths[0].path_id, paths[1].path_id],
          convergence_strength: 9.0,
          rubric_impact: [
            { dimension: 'Personal_Initiative', delta: 2.0 },
            { dimension: 'Recognition', delta: 1.5 },
          ],
          recommended_quarter: 3,
          rationale: `Bridges ${path1} and ${path2} - demonstrates fusion narrative`,
        });
      }
    }

    // Generic convergence opportunities
    if (paths.length >= 2) {
      // Leadership role that serves multiple paths
      opportunities.push({
        activity_name: 'Start interdisciplinary club (combines multiple interests)',
        serves_paths: paths.slice(0, 2).map(p => p.path_id),
        convergence_strength: 7.0,
        rubric_impact: [
          { dimension: 'Leadership', delta: 2.0 },
          { dimension: 'Personal_Initiative', delta: 1.0 },
        ],
        recommended_quarter: 2,
        rationale: 'Leadership role demonstrates ability to bridge multiple domains',
      });

      // Research/project that combines interests
      opportunities.push({
        activity_name: 'Independent research project combining both interests',
        serves_paths: paths.slice(0, 2).map(p => p.path_id),
        convergence_strength: 8.0,
        rubric_impact: [
          { dimension: 'Personal_Initiative', delta: 2.5 },
          { dimension: 'Academics', delta: 1.0 },
        ],
        recommended_quarter: 4,
        rationale: 'Research demonstrates depth in both areas',
      });
    }

    return opportunities;
  }

  /**
   * Create convergence timeline
   */
  private createConvergenceTimeline(paths: ParallelPath[]): ConvergenceTimeline[] {
    const timeline: ConvergenceTimeline[] = [];

    // Q1-Q2: Explore phase (60/40 or equal split)
    const exploreSplit = paths.length === 2 ? '60% / 40%' : 'Equal split across all paths';
    timeline.push({
      quarter: 1,
      phase: 'explore',
      recommended_split: exploreSplit,
      decision_criteria: [
        'Which path generates more early wins?',
        'Which path feels more energizing?',
        'Which path has stronger rubric alignment?',
      ],
      convergence_milestones: [
        'Try initial activities in each path',
        'Gather data on enjoyment and success',
      ],
    });

    // Q3-Q4: Evaluate phase (adjust based on data)
    timeline.push({
      quarter: 3,
      phase: 'evaluate',
      recommended_split: 'Data-driven (70/30 toward stronger path OR keep 50/50 if fusion emerging)',
      decision_criteria: [
        'Which path has higher viability score?',
        'Is fusion narrative emerging?',
        'Which path aligns better with target schools?',
      ],
      convergence_milestones: [
        'Evaluate progress in each path',
        'Identify convergence opportunities',
        'Decide: specialize or fuse',
      ],
    });

    // Q5-Q7: Converge phase (commit to dominant path or fusion)
    timeline.push({
      quarter: 5,
      phase: 'converge',
      recommended_split: '80/20 toward dominant path OR 100% fusion if narrative clear',
      decision_criteria: [
        'Can paths fuse into compelling narrative?',
        'Is one path clearly stronger?',
        'Do target schools value fusion?',
      ],
      convergence_milestones: [
        'Commit to final narrative (specialist or fusion)',
        'Align all activities to chosen path',
        'Build proof in dominant area',
      ],
    });

    return timeline;
  }

  /**
   * Analyze dominance and fusion potential
   */
  private analyzeDominanceAndFusion(
    paths: ParallelPath[],
    identityFusion: string
  ): { dominantPath: string | null; fusionNarrative: string | null } {
    if (paths.length === 0) {
      return { dominantPath: null, fusionNarrative: null };
    }

    // Check if fusion narrative already exists in identity
    if (identityFusion.includes('→')) {
      // Fusion exists (e.g., "Film × CS → Digital Storyteller")
      const fusionMatch = identityFusion.match(/→\s*(.+)/);
      const fusionNarrative = fusionMatch ? fusionMatch[1].trim() : null;
      return { dominantPath: null, fusionNarrative: fusionNarrative };
    }

    // Check for known fusion patterns
    if (paths.length === 2) {
      const fusionKey = `${paths[0].passion_area}×${paths[1].passion_area}`;
      const reverseFusionKey = `${paths[1].passion_area}×${paths[0].passion_area}`;

      if (this.FUSION_PATTERNS[fusionKey]) {
        return { dominantPath: null, fusionNarrative: this.FUSION_PATTERNS[fusionKey].fusion };
      } else if (this.FUSION_PATTERNS[reverseFusionKey]) {
        return { dominantPath: null, fusionNarrative: this.FUSION_PATTERNS[reverseFusionKey].fusion };
      }
    }

    // No clear fusion, check for dominant path
    const sortedByViability = [...paths].sort((a, b) => b.viability_score - a.viability_score);
    const strongest = sortedByViability[0];
    const secondStrongest = sortedByViability[1];

    // If one path is significantly stronger (2+ points), it's dominant
    if (strongest && (!secondStrongest || strongest.viability_score - secondStrongest.viability_score >= 2.0)) {
      return { dominantPath: strongest.path_name, fusionNarrative: null };
    }

    // Paths are balanced, no clear dominance yet
    return { dominantPath: null, fusionNarrative: null };
  }

  /**
   * Recommend strategy
   */
  private recommendStrategy(
    paths: ParallelPath[],
    dominantPath: string | null,
    fusionNarrative: string | null
  ): string {
    if (fusionNarrative) {
      return `FUSION STRATEGY: Position as "${fusionNarrative}" - bridge both paths through interdisciplinary activities`;
    } else if (dominantPath) {
      return `SPECIALIZE STRATEGY: Focus 80% effort on ${dominantPath}, maintain 20% in other area(s) for breadth`;
    } else {
      return `EXPLORE STRATEGY: Maintain balanced exploration (${paths.length === 2 ? '60/40' : 'equal'} split) through Q2, then converge based on data`;
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    paths: ParallelPath[],
    convergenceOpportunities: ConvergenceOpportunity[],
    dominantPath: string | null,
    fusionNarrative: string | null
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`Multi-Path Detected: ${paths.length} parallel paths identified`);
    paths.forEach(path => {
      recommendations.push(`- ${path.path_name}: Viability ${path.viability_score}/10, Rubric Alignment ${path.rubric_alignment_score}/10`);
    });

    if (fusionNarrative) {
      recommendations.push(`\n✨ FUSION OPPORTUNITY: "${fusionNarrative}"`);
      recommendations.push('Strategy: Focus on convergence activities that serve both paths');
      if (convergenceOpportunities.length > 0) {
        recommendations.push('Top Convergence Activities:');
        convergenceOpportunities.slice(0, 2).forEach(opp => {
          recommendations.push(`- Q${opp.recommended_quarter}: ${opp.activity_name}`);
        });
      }
    } else if (dominantPath) {
      recommendations.push(`\n🎯 DOMINANT PATH: ${dominantPath}`);
      recommendations.push('Strategy: Specialize with 80/20 focus, build deep proof in dominant area');
    } else {
      recommendations.push('\n🔍 EXPLORATION MODE: No clear dominant path yet');
      recommendations.push('Strategy: Maintain balanced exploration through Q2, then converge');
      recommendations.push('Decision Point: Q3 - evaluate which path is stronger or if fusion is emerging');
    }

    return recommendations;
  }
}
