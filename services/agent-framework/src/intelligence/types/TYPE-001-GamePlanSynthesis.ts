/**
 * TYPE-001: Game Plan Synthesis Intelligence
 * Category: DOMAIN_SPECIFIC (GamePlanAgent)
 *
 * Framework: Target Profile Synthesis + Multi-Path Convergence
 *
 * Purpose: Synthesize assessment data → personalized 2-year college admissions roadmap.
 * Core transformation: Student profile + rubric gaps + identity → strategic game plan.
 *
 * Algorithm: Assessment-to-GamePlan Synthesis
 *
 * **Inputs:**
 * - Assessment data (rubric scores, gaps, identity synthesis)
 * - Activity data (current ECs, awards, projects)
 * - Student profile (grade, interests, goals)
 * - Timeline context (current week in 93-week framework)
 *
 * **Synthesis Formula** (from 02-C-Synthesis-Formulas.json):
 * ```
 * IDENTITY + APTITUDE + PASSION + SERVICE = NARRATIVE
 *
 * Identity: "Who you are" (cultural background, lived experience, unique perspective)
 * Aptitude: "What you're good at" (academic strengths, skill sets)
 * Passion: "What energizes you" (deep interests, projects you lose track of time on)
 * Service: "How you help others" (teaching, mentoring, community impact)
 *
 * Narrative = Fusion of all 4 → Unique positioning (e.g., "Film × CS → Digital Storyteller")
 * ```
 *
 * **Output:** GamePlan Synthesis
 * - target_profile: Strategic positioning synthesized from identity fusion
 * - strategic_target: Hidden dream school (e.g., "USC Games 15%" not "Stanford CS <1%")
 * - rubric_priorities: P0/P1/P2 gaps sequenced by quarter
 * - narrative_thread: Core story connecting all activities
 * - unique_positioning: 3-5 differentiators
 * - convergence_paths: If undecided, parallel paths (CS + Film) that converge over time
 *
 * Data Sources:
 * - 02-B-Huda-GamePlan-Creation.jsonl (19 real coaching exchanges showing synthesis process)
 * - 02-C-Synthesis-Formulas.json (IDENTITY + APTITUDE + PASSION + SERVICE formula)
 * - 03-GamePlan-Architecture.json (5-component game plan structure)
 * - 05-huda_game_plan_progression_2year_extraction.json (real 2-year evolution)
 *
 * Created: 2025-10-29
 * Version: v18.0
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Target profile synthesis (strategic positioning)
 */
interface TargetProfile {
  identity_fusion: string; // e.g., "Film × CS → Digital Storyteller"
  narrative_thread: string; // Core story connecting all activities
  unique_positioning: string[]; // 3-5 key differentiators
  strategic_target: string; // Hidden dream school (e.g., "USC Games 15%")
  strategic_rationale: string; // Why this positioning works
}

/**
 * Rubric priority sequencing
 */
interface RubricPriority {
  dimension: string; // e.g., "Recognition", "Leadership", "Academics"
  current_score: number; // 0-10
  target_score: number; // 0-10
  gap: number; // target - current
  priority: 'P0' | 'P1' | 'P2'; // P0 = must address immediately
  quarter_assignment: string; // Which quarter to focus on this gap
  recommended_actions: string[]; // Top 3 actions to close gap
}

/**
 * Convergence path (for undecided students)
 */
interface ConvergencePath {
  path_name: string; // e.g., "Computer Science Path", "Film Path"
  feasibility_score: number; // 0-10 (how realistic given current profile)
  rubric_alignment: number; // 0-10 (how well aligns with rubric strengths)
  convergence_opportunities: string[]; // Activities that serve both paths
  unique_activities: string[]; // Path-specific activities
  recommended_ratio: string; // e.g., "60% CS / 40% Film in Q1-2"
}

/**
 * Game plan synthesis result
 */
interface GamePlanSynthesisResult {
  target_profile: TargetProfile;
  rubric_priorities: RubricPriority[];
  convergence_paths: ConvergencePath[]; // Empty if student decided, 2+ if undecided
  high_roi_opportunities: string[]; // Top 5 opportunities this quarter
  narrative_coherence_score: number; // 0-100 (how well all pieces fit together)
  recommendations: string[];
}

export class GamePlanSynthesis implements IntelligenceType {
  type_id = 'TYPE-001';
  name = 'Game Plan Synthesis';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'GamePlanAgent';
  version = 'v18.0';

  /**
   * Process game plan synthesis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract assessment facts
    const assessmentFacts = facts.facts.filter(f => f.category === 'ASSESSMENT_DATA');
    const activityFacts = facts.facts.filter(f => f.category === 'ACTIVITY_DATA');
    const profileFacts = facts.facts.filter(f => f.category === 'STUDENT_PROFILE');

    // Synthesize target profile (IDENTITY + APTITUDE + PASSION + SERVICE)
    const targetProfile = this.synthesizeTargetProfile(assessmentFacts, activityFacts, profileFacts);

    // Prioritize rubric gaps (P0/P1/P2 sequencing)
    const rubricPriorities = this.prioritizeRubricGaps(assessmentFacts);

    // Detect multi-path convergence (undecided students)
    const convergencePaths = this.analyzeConvergencePaths(assessmentFacts, activityFacts);

    // Identify high-ROI opportunities
    const highRoiOpportunities = this.identifyHighRoiOpportunities(
      targetProfile,
      rubricPriorities,
      convergencePaths
    );

    // Calculate narrative coherence
    const narrativeCoherenceScore = this.calculateNarrativeCoherence(
      targetProfile,
      activityFacts
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      targetProfile,
      rubricPriorities,
      convergencePaths,
      narrativeCoherenceScore
    );

    const result: GamePlanSynthesisResult = {
      target_profile: targetProfile,
      rubric_priorities: rubricPriorities,
      convergence_paths: convergencePaths,
      high_roi_opportunities: highRoiOpportunities,
      narrative_coherence_score: narrativeCoherenceScore,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence: 0.95,
      data: result,
    };
  }

  /**
   * Synthesize target profile from assessment data
   * Formula: IDENTITY + APTITUDE + PASSION + SERVICE = NARRATIVE
   */
  private synthesizeTargetProfile(
    assessmentFacts: any[],
    activityFacts: any[],
    profileFacts: any[]
  ): TargetProfile {
    // Extract identity components from assessment
    const assessmentData = assessmentFacts[0]?.data || {};
    const identity = assessmentData.identity || 'Student';
    const aptitude = assessmentData.academic_strengths || 'STEM';
    const passion = assessmentData.passion_areas || 'Technology';
    const service = assessmentData.service_areas || 'Teaching';

    // Synthesize identity fusion (e.g., "Film × CS → Digital Storyteller")
    let identityFusion = `${passion} × ${aptitude} → ${identity}`;
    if (assessmentData.identity_fusion) {
      identityFusion = assessmentData.identity_fusion;
    }

    // Extract narrative thread
    const narrativeThread = assessmentData.narrative_thread ||
      `Passionate about ${passion.toLowerCase()}, leveraging ${aptitude.toLowerCase()} skills to create impact through ${service.toLowerCase()}`;

    // Extract unique positioning
    const uniquePositioning = assessmentData.unique_positioning || [
      `Combines ${passion} and ${aptitude}`,
      `Focus on ${service} through technology`,
      `Cultural perspective brings unique lens`,
    ];

    // Determine strategic target (hidden dream school)
    const strategicTarget = this.determineStrategicTarget(
      identityFusion,
      assessmentData.rubric_scores || {}
    );

    // Strategic rationale
    const strategicRationale = `${strategicTarget} values ${passion.toLowerCase()} meets ${aptitude.toLowerCase()}, perfect fit for ${identityFusion}`;

    return {
      identity_fusion: identityFusion,
      narrative_thread: narrativeThread,
      unique_positioning: uniquePositioning,
      strategic_target: strategicTarget,
      strategic_rationale: strategicRationale,
    };
  }

  /**
   * Determine strategic target (hidden dream school)
   * Based on identity fusion + rubric strength
   */
  private determineStrategicTarget(identityFusion: string, rubricScores: any): string {
    // Pattern matching for common fusions
    if (identityFusion.includes('Film') && identityFusion.includes('CS')) {
      return 'USC School of Cinematic Arts (Games) - 15% acceptance';
    }
    if (identityFusion.includes('AI') && identityFusion.includes('Ethics')) {
      return 'Stanford HAI (Human-Centered AI) - 12% acceptance';
    }
    if (identityFusion.includes('Business') && identityFusion.includes('Tech')) {
      return 'MIT Sloan (Management + Technology) - 18% acceptance';
    }

    // Default: Strong STEM profile
    return 'Top STEM Program (15-20% acceptance range)';
  }

  /**
   * Prioritize rubric gaps with P0/P1/P2 sequencing
   */
  private prioritizeRubricGaps(assessmentFacts: any[]): RubricPriority[] {
    const assessmentData = assessmentFacts[0]?.data || {};
    const rubricScores = assessmentData.rubric_scores || {};
    const gaps = assessmentData.rubric_gaps || [];

    const priorities: RubricPriority[] = [];

    // Standard rubric dimensions
    const dimensions = [
      'Academics',
      'Leadership',
      'Recognition',
      'Community_Service',
      'Personal_Initiative',
      'Extracurriculars',
    ];

    dimensions.forEach(dimension => {
      const current = rubricScores[dimension]?.current || 0;
      const target = rubricScores[dimension]?.target || 10;
      const gap = target - current;

      if (gap > 0) {
        // Priority logic (from coaching intelligence):
        // P0 = gap ≥ 5 (critical weakness)
        // P1 = gap 3-4 (moderate gap)
        // P2 = gap 1-2 (minor polish)
        let priority: 'P0' | 'P1' | 'P2' = 'P2';
        if (gap >= 5) priority = 'P0';
        else if (gap >= 3) priority = 'P1';

        // Quarter assignment (spread P0 gaps across Q1-2, P1 in Q2-3, P2 in Q3-4)
        let quarterAssignment = 'Q4';
        if (priority === 'P0') quarterAssignment = current < 3 ? 'Q1' : 'Q2';
        else if (priority === 'P1') quarterAssignment = 'Q2-Q3';
        else quarterAssignment = 'Q3-Q4';

        // Recommended actions (domain-specific)
        const recommendedActions = this.getRubricActions(dimension, gap);

        priorities.push({
          dimension: dimension,
          current_score: current,
          target_score: target,
          gap: gap,
          priority: priority,
          quarter_assignment: quarterAssignment,
          recommended_actions: recommendedActions,
        });
      }
    });

    // Sort by priority (P0 first, then by gap size)
    priorities.sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.gap - a.gap;
    });

    return priorities;
  }

  /**
   * Get recommended actions for closing rubric gap
   */
  private getRubricActions(dimension: string, gap: number): string[] {
    const actions: Record<string, string[]> = {
      Academics: [
        'Enroll in 2-3 AP/Honors courses in core subject',
        'Join academic competition team (Math Olympiad, Science Bowl)',
        'Start independent research project in passion area',
      ],
      Leadership: [
        'Run for club officer position (VP or President)',
        'Start new club aligned with passion (Filmmaking, AI Ethics)',
        'Mentor 3-5 underclassmen in area of expertise',
      ],
      Recognition: [
        'Apply to 3-5 high-ROI competitions (NCWIT, Congressional App, Scholastic)',
        'Submit project to film festivals or hackathons',
        'Pursue regional/national awards in specific domain',
      ],
      Community_Service: [
        'Design service project aligned with identity (teach coding, film workshops)',
        'Commit 100+ hours to sustained service (not one-off events)',
        'Measure impact (# students taught, skills learned, community benefit)',
      ],
      Personal_Initiative: [
        'Launch passion project (app, film, research)',
        'Document journey (blog, portfolio, case study)',
        'Grow project to 10+ users or meaningful impact metric',
      ],
      Extracurriculars: [
        'Join 2-3 clubs aligned with identity fusion',
        'Achieve leadership role within 1-2 quarters',
        'Focus on depth (4-year commitment) over breadth (trying everything)',
      ],
    };

    return actions[dimension] || ['Work with coach to develop specific action plan'];
  }

  /**
   * Analyze convergence paths (for undecided students)
   */
  private analyzeConvergencePaths(
    assessmentFacts: any[],
    activityFacts: any[]
  ): ConvergencePath[] {
    const assessmentData = assessmentFacts[0]?.data || {};

    // Check if student has multiple interests that could be separate paths
    const interests = assessmentData.passion_areas || '';
    const hasMultiplePaths = interests.includes('×') || interests.includes(' and ') || interests.includes(',');

    if (!hasMultiplePaths) {
      return []; // Student is decided, no convergence needed
    }

    // Example: "Film × CS" → 2 paths
    const paths: ConvergencePath[] = [];

    // Parse interests into separate paths
    let pathNames: string[] = [];
    if (interests.includes('×')) {
      pathNames = interests.split('×').map(p => p.trim());
    } else if (interests.includes(' and ')) {
      pathNames = interests.split(' and ').map(p => p.trim());
    } else {
      pathNames = interests.split(',').map(p => p.trim());
    }

    // Create convergence path for each interest
    pathNames.slice(0, 2).forEach(pathName => {
      paths.push({
        path_name: `${pathName} Path`,
        feasibility_score: 7.5, // Default, would calculate from activities
        rubric_alignment: 8.0, // Default, would calculate from rubric scores
        convergence_opportunities: this.getConvergenceOpportunities(pathNames),
        unique_activities: this.getPathUniqueActivities(pathName),
        recommended_ratio: paths.length === 0 ? '60% / 40%' : '40% / 60%', // Primary vs secondary
      });
    });

    return paths;
  }

  /**
   * Get convergence opportunities (activities that serve both paths)
   */
  private getConvergenceOpportunities(paths: string[]): string[] {
    // Activities that combine multiple interests
    if (paths.includes('Film') && paths.includes('CS')) {
      return [
        'Create educational game combining storytelling + programming',
        'Develop interactive documentary or multimedia project',
        'Join USC Summer Program (Games + Interactive Media)',
      ];
    }

    if (paths.includes('AI') && paths.includes('Ethics')) {
      return [
        'Research project on AI fairness or bias detection',
        'Create AI education curriculum for underserved communities',
        'Apply to Stanford HAI summer program',
      ];
    }

    return [
      'Find interdisciplinary projects that combine both interests',
      'Seek summer programs that bridge multiple domains',
      'Build portfolio project demonstrating fusion of both areas',
    ];
  }

  /**
   * Get path-specific unique activities
   */
  private getPathUniqueActivities(pathName: string): string[] {
    const activities: Record<string, string[]> = {
      Film: ['Film club leadership', 'Submit to film festivals', 'Create video portfolio'],
      CS: ['CS competition team', 'Hackathons', 'Open source contributions'],
      Business: ['DECA competition', 'Start small business', 'Entrepreneurship club'],
      AI: ['AI/ML research project', 'Kaggle competitions', 'AI4All program'],
    };

    return activities[pathName] || [`${pathName}-specific activities to be determined`];
  }

  /**
   * Identify high-ROI opportunities for current quarter
   */
  private identifyHighRoiOpportunities(
    targetProfile: TargetProfile,
    rubricPriorities: RubricPriority[],
    convergencePaths: ConvergencePath[]
  ): string[] {
    const opportunities: string[] = [];

    // Add opportunities based on P0 gaps
    const p0Gaps = rubricPriorities.filter(p => p.priority === 'P0');
    p0Gaps.slice(0, 2).forEach(gap => {
      opportunities.push(`${gap.dimension}: ${gap.recommended_actions[0]}`);
    });

    // Add convergence opportunities if applicable
    if (convergencePaths.length > 0) {
      const convergence = convergencePaths[0];
      opportunities.push(`Convergence: ${convergence.convergence_opportunities[0]}`);
    }

    // Add opportunities based on identity fusion
    if (targetProfile.identity_fusion.includes('Film')) {
      opportunities.push('Submit short film to Scholastic Art & Writing Awards (Dec deadline)');
    }
    if (targetProfile.identity_fusion.includes('CS')) {
      opportunities.push('Apply to Congressional App Challenge (Nov deadline)');
    }

    return opportunities.slice(0, 5);
  }

  /**
   * Calculate narrative coherence score
   */
  private calculateNarrativeCoherence(
    targetProfile: TargetProfile,
    activityFacts: any[]
  ): number {
    // Check if activities align with identity fusion
    const identityKeywords = targetProfile.identity_fusion
      .toLowerCase()
      .replace(/[×→]/g, ' ')
      .split(' ')
      .filter(w => w.length > 2);

    let alignedActivities = 0;
    activityFacts.forEach(fact => {
      const activityName = (fact.data?.name || '').toLowerCase();
      const activityDescription = (fact.data?.description || '').toLowerCase();
      const combined = activityName + ' ' + activityDescription;

      // Check if activity contains any identity keywords
      if (identityKeywords.some(keyword => combined.includes(keyword))) {
        alignedActivities++;
      }
    });

    const totalActivities = activityFacts.length || 1;
    const coherenceScore = Math.round((alignedActivities / totalActivities) * 100);

    return Math.min(100, coherenceScore);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    targetProfile: TargetProfile,
    rubricPriorities: RubricPriority[],
    convergencePaths: ConvergencePath[],
    narrativeCoherenceScore: number
  ): string[] {
    const recommendations: string[] = [];

    // Target profile recommendation
    recommendations.push(`Strategic Positioning: ${targetProfile.identity_fusion}`);
    recommendations.push(`Dream School Target: ${targetProfile.strategic_target}`);

    // P0 gap recommendations
    const p0Gaps = rubricPriorities.filter(p => p.priority === 'P0');
    if (p0Gaps.length > 0) {
      recommendations.push(`\nP0 Priority Gaps (address in Q1-Q2):`);
      p0Gaps.forEach(gap => {
        recommendations.push(`- ${gap.dimension} (gap: ${gap.gap} points): ${gap.recommended_actions[0]}`);
      });
    }

    // Convergence path recommendations
    if (convergencePaths.length > 0) {
      recommendations.push(`\nMulti-Path Strategy (${convergencePaths.length} paths):`);
      convergencePaths.forEach(path => {
        recommendations.push(`- ${path.path_name}: ${path.recommended_ratio} time allocation`);
      });
      recommendations.push(`- Focus on convergence opportunities that serve both paths`);
    }

    // Narrative coherence recommendations
    if (narrativeCoherenceScore < 60) {
      recommendations.push(`\n⚠️ Narrative Coherence: ${narrativeCoherenceScore}% (needs improvement)`);
      recommendations.push(`- Align future activities with ${targetProfile.identity_fusion} positioning`);
      recommendations.push(`- Drop activities that don't support core narrative`);
    } else if (narrativeCoherenceScore >= 80) {
      recommendations.push(`\n✅ Excellent Narrative Coherence: ${narrativeCoherenceScore}%`);
    }

    return recommendations;
  }
}
