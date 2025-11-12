/**
 * TYPE-031: Program-Competition Cascade Intelligence (UNIVERSAL)
 *
 * Purpose: Identify opportunities to submit the same work/project to multiple
 * programs and competitions for 3-5X multiplier effect on effort invested.
 *
 * Framework: Artifact Reuse Cascade
 * - Single research project → Submit to RSI, ISEF, Regeneron, Google Science Fair
 * - Single CS project → Submit to hackathons, Congressional App Challenge, competitions
 * - Single essay/analysis → Submit to writing contests, program applications
 *
 * Core Algorithm:
 * 1. Detect "anchor artifacts" (research projects, major works, portfolios)
 * 2. Map artifact → eligible programs/competitions with alignment scoring
 * 3. Calculate ROI multiplier (1 artifact → N opportunities)
 * 4. Prioritize by target school alignment + deadline feasibility
 * 5. Generate cascade submission timeline
 *
 * Intelligence Extraction: W015-W025, W040-W050 coaching sessions
 * (Strategic opportunity stacking, effort multiplication patterns)
 *
 * Created: 2025-10-29
 * Version: v19.1 Enhanced Capabilities
 * Category: UNIVERSAL (applies to all agents)
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Anchor Artifact - A reusable work/project that can cascade to multiple opportunities
 */
interface AnchorArtifact {
  artifact_id: string;
  artifact_type: 'research_project' | 'cs_project' | 'portfolio' | 'essay' | 'creative_work' | 'competition_submission';
  title: string;
  description: string;
  domain: string; // STEM, CS, Arts, Humanities, etc.
  completion_status: 'planned' | 'in_progress' | 'completed';
  quality_score: number; // 0-10 (estimated impact/quality)
  time_invested_hours: number;
  materials_available: string[]; // ['code', 'paper', 'presentation', 'demo']
}

/**
 * Cascade Opportunity - Program or competition that accepts the artifact
 */
interface CascadeOpportunity {
  opportunity_id: string;
  opportunity_type: 'summer_program' | 'competition' | 'award' | 'research_program';
  name: string;
  deadline: string; // ISO date
  eligibility_score: number; // 0-1 (how well artifact fits)
  target_school_alignment: number; // 0-1 (alignment with student's target schools)
  effort_required_hours: number; // Additional hours needed to adapt/submit
  roi_multiplier: number; // Benefit / effort_required
  application_requirements: string[];
  prize_value?: string;
  prestige_tier: 'National' | 'Regional' | 'State' | 'School';
}

/**
 * Cascade Strategy - Recommended submission sequence
 */
interface CascadeStrategy {
  anchor_artifact: AnchorArtifact;
  total_opportunities: number;
  high_roi_opportunities: CascadeOpportunity[]; // ROI > 5
  medium_roi_opportunities: CascadeOpportunity[];
  submission_timeline: Array<{
    week: number;
    opportunity: string;
    deadline: string;
    prep_tasks: string[];
  }>;
  effort_multiplier: number; // Total benefit / initial time invested
  recommendations: string[];
}

/**
 * Complete Cascade Intelligence Result
 */
interface ProgramCompetitionCascadeResult {
  student_id: string;
  anchor_artifacts: AnchorArtifact[];
  cascade_strategies: CascadeStrategy[];
  quick_wins: Array<{
    artifact: string;
    opportunity: string;
    deadline: string;
    roi: number;
    rationale: string;
  }>;
  overall_multiplier: number; // Total opportunities / total artifacts
  next_actions: string[];
}

// ============================================================================
// PROGRAM-COMPETITION CASCADE INTELLIGENCE
// ============================================================================

export class ProgramCompetitionCascade implements IntelligenceType {
  type_id = 'TYPE-031';
  name = 'Program-Competition Cascade';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'UNIVERSAL';
  description = 'Identifies opportunities to cascade single artifacts to multiple programs/competitions for 3-5X multiplier';

  components = {
    framework: {
      name: 'Artifact Reuse Cascade',
      description: 'One anchor artifact → Multiple submission opportunities with minimal adaptation',
      mental_model: 'Strategic stacking: Every major work should unlock 3-5+ opportunities',
    },
    tactics: [
      {
        name: 'Anchor Artifact Detection',
        description: 'Identify substantial works that can be reused across opportunities',
        steps: [
          'Scan student activities for research projects, major works',
          'Assess quality and completeness',
          'Identify domain and target audience',
          'Catalog available materials (code, paper, demo, etc.)',
        ],
      },
      {
        name: 'Cascade Opportunity Mapping',
        description: 'Map each artifact to eligible programs/competitions',
        steps: [
          'Query programs/competitions in same domain',
          'Check eligibility criteria (grade, timing, topic)',
          'Calculate alignment score (fit + target school relevance)',
          'Estimate adaptation effort required',
        ],
      },
      {
        name: 'ROI-Based Prioritization',
        description: 'Prioritize opportunities by benefit/effort ratio',
        steps: [
          'Calculate ROI = (prestige × alignment) / effort_required',
          'Group into high/medium/low ROI tiers',
          'Check deadline feasibility',
          'Generate submission timeline',
        ],
      },
    ],
    techniques: [],
    chips: [],
    metrics: {
      success_criteria: [
        'Effort multiplier ≥3X (1 artifact → ≥3 opportunities)',
        'High-ROI opportunities identified (ROI > 5)',
        'Deadline-feasible timeline generated',
      ],
      validation: 'Each anchor artifact maps to ≥3 eligible opportunities',
    },
    triggers: {
      conditions: ['cascade', 'reuse', 'multiple', 'submit', 'programs', 'competitions', 'multiplier'],
    },
  };

  // ==========================================================================
  // CORE CONSTANTS
  // ==========================================================================

  /**
   * Known cascade patterns (artifact type → opportunity types)
   */
  private readonly CASCADE_PATTERNS: Record<string, string[]> = {
    research_project: [
      'RSI', 'ISEF', 'Regeneron STS', 'Google Science Fair', 'Junior Science & Humanities Symposium',
      'Davidson Fellows', 'NCWIT Aspirations', 'Research summer programs',
    ],
    cs_project: [
      'Congressional App Challenge', 'Technovation', 'Google Code-in', 'HackMIT', 'PennApps',
      'NCWIT Aspirations', 'NASA App Development Challenge', 'CS summer programs',
    ],
    creative_work: [
      'Scholastic Art & Writing', 'YoungArts', 'National Student Poets', 'Creative writing contests',
      'Portfolio-based summer programs (RISD, MICA, etc.)',
    ],
    essay: [
      'Scholastic Writing', 'New York Times contests', 'Profile in Courage Essay', 'JFK Courage Essay',
      'Essay-based scholarship applications',
    ],
  };

  /**
   * ROI calculation weights
   */
  private readonly ROI_WEIGHTS = {
    prestige: {
      National: 10,
      Regional: 5,
      State: 3,
      School: 1,
    },
    alignment_boost: 2.0, // Multiply ROI if high target school alignment
    effort_threshold: 10, // Hours - below this = high ROI candidate
  };

  // ==========================================================================
  // MAIN INTELLIGENCE INTERFACE
  // ==========================================================================

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract anchor artifacts from student activities/projects
    const anchorArtifacts = this.extractAnchorArtifacts(facts);

    if (anchorArtifacts.length === 0) {
      return {
        type_id: this.type_id,
        component: 'program_competition_cascade',
        triggered: false,
        confidence: 0.5,
        data: {
          student_id: studentId,
          anchor_artifacts: [],
          cascade_strategies: [],
          quick_wins: [],
          overall_multiplier: 0,
          next_actions: ['Develop substantial projects/artifacts that can be cascaded to multiple opportunities'],
        },
      };
    }

    // Generate cascade strategies for each artifact
    const cascadeStrategies: CascadeStrategy[] = [];
    const allQuickWins: any[] = [];

    for (const artifact of anchorArtifacts) {
      const strategy = this.generateCascadeStrategy(artifact, facts);
      cascadeStrategies.push(strategy);

      // Extract quick wins (high ROI, near deadline)
      const quickWins = strategy.high_roi_opportunities
        .filter(opp => this.isNearDeadline(opp.deadline))
        .map(opp => ({
          artifact: artifact.title,
          opportunity: opp.name,
          deadline: opp.deadline,
          roi: opp.roi_multiplier,
          rationale: `High ROI (${opp.roi_multiplier.toFixed(1)}X) + near deadline → quick win`,
        }));
      allQuickWins.push(...quickWins);
    }

    // Calculate overall multiplier
    const totalOpportunities = cascadeStrategies.reduce((sum, s) => sum + s.total_opportunities, 0);
    const overallMultiplier = anchorArtifacts.length > 0 ? totalOpportunities / anchorArtifacts.length : 0;

    // Generate next actions
    const nextActions = this.generateNextActions(cascadeStrategies, allQuickWins);

    const result: ProgramCompetitionCascadeResult = {
      student_id: studentId,
      anchor_artifacts: anchorArtifacts,
      cascade_strategies: cascadeStrategies,
      quick_wins: allQuickWins.slice(0, 5), // Top 5 quick wins
      overall_multiplier: overallMultiplier,
      next_actions: nextActions,
    };

    return {
      type_id: this.type_id,
      component: 'program_competition_cascade',
      triggered: true,
      confidence: 0.85,
      data: result,
    };
  }

  // ==========================================================================
  // EXTRACTION & DETECTION
  // ==========================================================================

  /**
   * Extract anchor artifacts from student facts
   */
  private extractAnchorArtifacts(facts: FactSet): AnchorArtifact[] {
    const artifacts: AnchorArtifact[] = [];

    // Get activity facts
    const activityFacts = facts.getFactsByCategory(FactCategory.ACTIVITY_DATA);

    for (const fact of activityFacts) {
      const activity = fact.value || fact;

      // Detect substantial projects/works
      if (this.isAnchorArtifact(activity)) {
        artifacts.push({
          artifact_id: activity.activity_id || `artifact-${artifacts.length}`,
          artifact_type: this.classifyArtifactType(activity),
          title: activity.title || activity.activity_name || 'Unnamed Project',
          description: activity.description || activity.details || '',
          domain: activity.domain || activity.category || 'General',
          completion_status: activity.status || 'in_progress',
          quality_score: activity.impact_score || 7,
          time_invested_hours: activity.hours_per_week * (activity.weeks_involved || 12) || 50,
          materials_available: activity.materials || [],
        });
      }
    }

    return artifacts;
  }

  /**
   * Check if activity qualifies as anchor artifact
   */
  private isAnchorArtifact(activity: any): boolean {
    const title = (activity.title || activity.activity_name || '').toLowerCase();
    const description = (activity.description || '').toLowerCase();

    // Keywords indicating substantial reusable work
    const anchorKeywords = [
      'research', 'project', 'developed', 'built', 'created', 'designed',
      'app', 'website', 'portfolio', 'paper', 'study', 'analysis',
      'competition', 'hackathon', 'science fair', 'presented',
    ];

    const hasAnchorKeyword = anchorKeywords.some(kw => title.includes(kw) || description.includes(kw));

    // Must have significant time investment
    const significantTime = (activity.hours_per_week || 0) >= 3;

    return hasAnchorKeyword && significantTime;
  }

  /**
   * Classify artifact type
   */
  private classifyArtifactType(activity: any): AnchorArtifact['artifact_type'] {
    const title = (activity.title || '').toLowerCase();
    const description = (activity.description || '').toLowerCase();
    const text = `${title} ${description}`;

    if (text.match(/research|study|experiment|analysis|investigation/)) return 'research_project';
    if (text.match(/app|website|software|code|program|algorithm/)) return 'cs_project';
    if (text.match(/portfolio|art|design|film|music|creative/)) return 'creative_work';
    if (text.match(/essay|writing|article|blog|publication/)) return 'essay';
    if (text.match(/competition|hackathon|contest|fair/)) return 'competition_submission';

    return 'research_project'; // Default
  }

  // ==========================================================================
  // CASCADE STRATEGY GENERATION
  // ==========================================================================

  /**
   * Generate cascade strategy for an anchor artifact
   */
  private generateCascadeStrategy(artifact: AnchorArtifact, facts: FactSet): CascadeStrategy {
    // Find eligible opportunities for this artifact type
    const opportunities = this.findEligibleOpportunities(artifact, facts);

    // Calculate ROI for each opportunity
    const scoredOpportunities = opportunities.map(opp => ({
      ...opp,
      roi_multiplier: this.calculateROI(opp, artifact),
    }));

    // Sort by ROI and separate into tiers
    const sorted = scoredOpportunities.sort((a, b) => b.roi_multiplier - a.roi_multiplier);
    const highROI = sorted.filter(opp => opp.roi_multiplier >= 5);
    const mediumROI = sorted.filter(opp => opp.roi_multiplier >= 2 && opp.roi_multiplier < 5);

    // Generate submission timeline
    const submissionTimeline = this.generateSubmissionTimeline(highROI.concat(mediumROI));

    // Calculate effort multiplier
    const totalBenefit = sorted.reduce((sum, opp) => sum + opp.roi_multiplier * 10, 0);
    const effortMultiplier = artifact.time_invested_hours > 0 ? totalBenefit / artifact.time_invested_hours : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(artifact, highROI, mediumROI);

    return {
      anchor_artifact: artifact,
      total_opportunities: opportunities.length,
      high_roi_opportunities: highROI,
      medium_roi_opportunities: mediumROI,
      submission_timeline: submissionTimeline,
      effort_multiplier: effortMultiplier,
      recommendations,
    };
  }

  /**
   * Find eligible opportunities for artifact
   */
  private findEligibleOpportunities(artifact: AnchorArtifact, facts: FactSet): CascadeOpportunity[] {
    const opportunities: CascadeOpportunity[] = [];

    // Get known cascade patterns for this artifact type
    const eligibleOpportunityNames = this.CASCADE_PATTERNS[artifact.artifact_type] || [];

    // For each pattern, create opportunity entry (in real system, query DB)
    for (const oppName of eligibleOpportunityNames) {
      opportunities.push({
        opportunity_id: `opp-${opportunities.length}`,
        opportunity_type: this.classifyOpportunityType(oppName),
        name: oppName,
        deadline: this.estimateDeadline(oppName),
        eligibility_score: 0.8, // Would calculate based on actual criteria
        target_school_alignment: 0.7, // Would calculate based on target schools
        effort_required_hours: this.estimateEffort(artifact, oppName),
        roi_multiplier: 0, // Calculated in next step
        application_requirements: ['Adapt materials', 'Submit application', 'Prepare presentation'],
        prestige_tier: this.classifyPrestigeTier(oppName),
      });
    }

    return opportunities;
  }

  /**
   * Calculate ROI for opportunity
   */
  private calculateROI(opp: CascadeOpportunity, artifact: AnchorArtifact): number {
    const prestigeScore = this.ROI_WEIGHTS.prestige[opp.prestige_tier];
    const alignmentBoost = opp.target_school_alignment > 0.7 ? this.ROI_WEIGHTS.alignment_boost : 1.0;

    const benefit = prestigeScore * opp.eligibility_score * alignmentBoost;
    const effort = Math.max(opp.effort_required_hours, 1); // Avoid division by zero

    return benefit / effort;
  }

  /**
   * Generate submission timeline
   */
  private generateSubmissionTimeline(opportunities: CascadeOpportunity[]): Array<{
    week: number;
    opportunity: string;
    deadline: string;
    prep_tasks: string[];
  }> {
    const timeline: Array<any> = [];
    let currentWeek = 1;

    // Sort by deadline
    const sorted = [...opportunities].sort((a, b) =>
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );

    for (const opp of sorted.slice(0, 10)) { // Top 10
      timeline.push({
        week: currentWeek,
        opportunity: opp.name,
        deadline: opp.deadline,
        prep_tasks: opp.application_requirements,
      });
      currentWeek += Math.ceil(opp.effort_required_hours / 10); // Assume 10h/week pace
    }

    return timeline;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    artifact: AnchorArtifact,
    highROI: CascadeOpportunity[],
    mediumROI: CascadeOpportunity[]
  ): string[] {
    const recommendations: string[] = [];

    if (highROI.length >= 3) {
      recommendations.push(`🎯 PRIORITY: Submit "${artifact.title}" to ${highROI.length} high-ROI opportunities (ROI ≥5X)`);
      recommendations.push(`Start with: ${highROI.slice(0, 3).map(o => o.name).join(', ')}`);
    }

    if (artifact.completion_status !== 'completed') {
      recommendations.push(`⚡ Complete "${artifact.title}" ASAP to unlock ${highROI.length + mediumROI.length} cascade opportunities`);
    }

    if (mediumROI.length > 0) {
      recommendations.push(`Secondary targets (ROI 2-5X): ${mediumROI.slice(0, 3).map(o => o.name).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Generate next actions
   */
  private generateNextActions(strategies: CascadeStrategy[], quickWins: any[]): string[] {
    const actions: string[] = [];

    // Quick wins
    if (quickWins.length > 0) {
      actions.push(`🚀 QUICK WIN: Submit to ${quickWins[0].opportunity} (deadline: ${quickWins[0].deadline}, ROI: ${quickWins[0].roi.toFixed(1)}X)`);
    }

    // Incomplete artifacts
    const incomplete = strategies.filter(s => s.anchor_artifact.completion_status !== 'completed');
    if (incomplete.length > 0) {
      actions.push(`Complete ${incomplete.length} in-progress artifacts to unlock ${incomplete.reduce((sum, s) => sum + s.total_opportunities, 0)} opportunities`);
    }

    // High multiplier strategies
    const topStrategy = strategies.sort((a, b) => b.effort_multiplier - a.effort_multiplier)[0];
    if (topStrategy) {
      actions.push(`Focus cascade: "${topStrategy.anchor_artifact.title}" → ${topStrategy.total_opportunities} opportunities (${topStrategy.effort_multiplier.toFixed(1)}X multiplier)`);
    }

    return actions;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private classifyOpportunityType(name: string): CascadeOpportunity['opportunity_type'] {
    if (name.toLowerCase().includes('summer') || name.toLowerCase().includes('program')) return 'summer_program';
    if (name.toLowerCase().includes('competition') || name.toLowerCase().includes('challenge')) return 'competition';
    if (name.toLowerCase().includes('award') || name.toLowerCase().includes('fellow')) return 'award';
    return 'research_program';
  }

  private estimateDeadline(oppName: string): string {
    // Simplified - in real system, query DB for actual deadlines
    const now = new Date();
    const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
    return futureDate.toISOString().split('T')[0];
  }

  private estimateEffort(artifact: AnchorArtifact, oppName: string): number {
    // Estimate additional hours needed to adapt/submit
    const baseEffort = 5; // Hours for standard application
    const adaptationEffort = artifact.artifact_type === 'research_project' ? 10 : 5;
    return baseEffort + (Math.random() * adaptationEffort); // Simplified
  }

  private classifyPrestigeTier(oppName: string): 'National' | 'Regional' | 'State' | 'School' {
    const national = ['RSI', 'ISEF', 'Regeneron', 'Google', 'Davidson', 'NCWIT', 'NASA', 'Congressional'];
    if (national.some(kw => oppName.includes(kw))) return 'National';

    if (oppName.toLowerCase().includes('regional')) return 'Regional';
    if (oppName.toLowerCase().includes('state')) return 'State';
    return 'School';
  }

  private isNearDeadline(deadline: string): boolean {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntil = (deadlineDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    return daysUntil <= 60 && daysUntil > 0; // Within 60 days
  }
}
