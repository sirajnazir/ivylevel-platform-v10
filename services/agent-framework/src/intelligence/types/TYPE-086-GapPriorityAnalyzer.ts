/**
 * TYPE-086: Gap Priority Analyzer Intelligence
 *
 * Purpose: Analyze rubric dimension gaps and prioritize with P0/P1/P2 categorization
 * using Jenny's gap priority formula from real coaching sessions.
 *
 * Framework: Priority-Based Gap Analysis
 * - Gap Priority Score = Gap Size × Dimension Weight × Urgency Multiplier
 * - P0 (Critical): 5+ point gaps in high-weight dimensions
 * - P1 (High): 3-4 point gaps in high-weight dimensions OR 5+ in medium-weight
 * - P2 (Medium): 1-2 point gaps OR lower-priority dimensions
 *
 * Core Algorithm:
 * 1. Calculate gap sizes per dimension (target - current)
 * 2. Apply dimension weights (from Jenny's coaching patterns)
 * 3. Apply urgency multipliers (grade-level dependent)
 * 4. Categorize by priority threshold
 * 5. Generate gap-closing action plans with time estimates
 *
 * Data Source: Jenny's W001-W093 coaching intelligence chips
 * - W001-REALITY_CHECK-003: "Baseline 14/50 with largest upside in leadership (2/10) and recognition (1/10)"
 * - Gap closing patterns from real student coaching sessions
 *
 * Created: 2025-11-04
 * Version: v29.1 Intelligence Architecture Enhancement
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

interface GapAnalysis {
  dimension: 'academics' | 'leadership' | 'service' | 'artifacts' | 'recognition';
  current_score: number; // 0-10
  target_score: number; // 0-10
  gap_size: number; // Points needed
  dimension_weight: number; // Jenny's weighting from coaching patterns
  urgency_multiplier: number; // Based on grade level
  priority_score: number; // Gap Size × Weight × Urgency
  priority_category: 'P0' | 'P1' | 'P2' | 'P3';
  closing_actions: string[]; // Specific actions to close gap
  estimated_weeks: number; // Time to close gap
  impact_on_total: number; // Points boost if closed
  evidence_gaps: string[]; // What specific data is missing
}

interface GapPriorityResult {
  student_id: string;
  total_gaps_identified: number;
  p0_gaps: GapAnalysis[]; // Critical - must address immediately
  p1_gaps: GapAnalysis[]; // High - address within 8 weeks
  p2_gaps: GapAnalysis[]; // Medium - address within semester
  p3_gaps: GapAnalysis[]; // Low - nice to have
  overall_gap_score: number; // 0-100 (100 = no gaps)
  quick_wins: GapAnalysis[]; // High impact, low time (<8 weeks)
  long_term_projects: GapAnalysis[]; // High impact, long time (>20 weeks)
  next_immediate_actions: string[]; // Top 3 actions to start this week
  rubric_baseline: string; // e.g., "14/50"
  rubric_potential: string; // e.g., "35/50 with focused gap closing"
}

export class GapPriorityAnalyzer implements IntelligenceType {
  type_id = 'TYPE-086';
  name = 'Gap Priority Analyzer';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';
  description = 'Analyzes rubric dimension gaps and prioritizes with P0/P1/P2 categorization using Jenny\'s gap priority formula';

  components = {
    framework: {
      name: 'Priority-Based Gap Analysis',
      description: 'Systematic gap prioritization using dimension weights and urgency multipliers',
      mental_model: 'Gap Priority = Gap Size × Dimension Weight × Urgency',
    },
    tactics: [
      {
        name: 'Gap Prioritization',
        description: 'Calculate priority scores and categorize gaps',
        steps: [
          'Calculate gap sizes (target - current)',
          'Apply dimension weights from Jenny\'s coaching',
          'Apply urgency multipliers (grade-dependent)',
          'Categorize by priority threshold',
          'Generate action plans',
        ],
      },
    ],
    techniques: [],
    chips: [],
    metrics: {
      success_criteria: [
        'All P0 gaps identified with actions',
        'Time estimates realistic',
        'Quick wins highlighted',
      ],
      validation: 'Gap closure correlates with rubric score improvement',
    },
    triggers: {
      conditions: ['gaps', 'weaknesses', 'priority', 'improve', 'weak spots'],
    },
  };

  // Jenny's dimension weights from W001-W093 coaching patterns
  private readonly DIMENSION_WEIGHTS = {
    academics: 1.5, // Foundation - most critical
    leadership: 1.3, // High impact for top schools
    recognition: 1.4, // Awards/competitions show external validation
    service: 0.9, // Important but lower priority than leadership
    artifacts: 1.2, // Tangible outputs matter but less urgent
  };

  // Target scores for top-tier college admissions (Ivy+)
  private readonly TARGET_SCORES = {
    academics: 9, // 3.9+ GPA, 8+ APs, 1500+ SAT
    leadership: 8, // Multiple formal roles with multi-year depth
    service: 7, // 100+ hours, consistent, impactful
    artifacts: 8, // Published/deployed, complex, validated
    recognition: 7, // Regional+ awards, competition placements
  };

  // Urgency multipliers by grade level
  private getUrgencyMultiplier(currentGrade: number): number {
    if (currentGrade >= 12) return 1.5; // Senior - very urgent
    if (currentGrade >= 11) return 1.3; // Junior - urgent
    if (currentGrade >= 10) return 1.1; // Sophomore - moderately urgent
    return 1.0; // Freshman - normal urgency
  }

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;
    const allFacts = facts.getAllFacts();

    // v29.1: Get rubric scores from query.context.intelligence_results (preferred)
    // or fallback to facts (for backwards compatibility)
    const intelligenceResults = query.context?.intelligence_results || [];
    const rubricScores = this.extractRubricScores(allFacts, intelligenceResults);
    if (!rubricScores) {
      return {
        type_id: this.type_id,
        component: 'gap_priority_analyzer',
        triggered: false,
        confidence: 0,
        data: {
          error: 'Rubric scores not available - TYPE-085 must run first',
        },
      };
    }

    // Get student grade for urgency calculation
    const currentGrade = this.extractCurrentGrade(allFacts);
    const urgencyMultiplier = this.getUrgencyMultiplier(currentGrade);

    // Analyze gaps for each dimension
    const gapAnalyses: GapAnalysis[] = [
      this.analyzeGap('academics', rubricScores.academics, urgencyMultiplier),
      this.analyzeGap('leadership', rubricScores.leadership, urgencyMultiplier),
      this.analyzeGap('service', rubricScores.service, urgencyMultiplier),
      this.analyzeGap('artifacts', rubricScores.artifacts, urgencyMultiplier),
      this.analyzeGap('recognition', rubricScores.recognition, urgencyMultiplier),
    ];

    // Categorize by priority
    const p0Gaps = gapAnalyses.filter(g => g.priority_category === 'P0');
    const p1Gaps = gapAnalyses.filter(g => g.priority_category === 'P1');
    const p2Gaps = gapAnalyses.filter(g => g.priority_category === 'P2');
    const p3Gaps = gapAnalyses.filter(g => g.priority_category === 'P3');

    // Identify quick wins (high impact, <8 weeks)
    const quickWins = gapAnalyses.filter(
      g => g.impact_on_total >= 4 && g.estimated_weeks <= 8
    );

    // Identify long-term projects (high impact, >20 weeks)
    const longTermProjects = gapAnalyses.filter(
      g => g.impact_on_total >= 4 && g.estimated_weeks > 20
    );

    // Calculate overall gap score (0-100, 100 = no gaps)
    const totalPossibleGap = Object.values(this.TARGET_SCORES).reduce((sum, t) => sum + t, 0);
    const totalCurrentGap = gapAnalyses.reduce((sum, g) => sum + g.gap_size, 0);
    const overallGapScore = Math.max(0, 100 - (totalCurrentGap / totalPossibleGap) * 100);

    // Generate next immediate actions (top 3 P0/P1 gaps)
    const nextActions = this.generateImmediateActions(p0Gaps, p1Gaps, quickWins);

    // Calculate rubric baseline and potential
    const currentTotal = Object.values(rubricScores).reduce((sum, score) => sum + score, 0);
    const potentialTotal = currentTotal + p0Gaps.reduce((sum, g) => sum + g.impact_on_total, 0);

    const result: GapPriorityResult = {
      student_id: studentId,
      total_gaps_identified: gapAnalyses.length,
      p0_gaps: p0Gaps,
      p1_gaps: p1Gaps,
      p2_gaps: p2Gaps,
      p3_gaps: p3Gaps,
      overall_gap_score: overallGapScore,
      quick_wins: quickWins,
      long_term_projects: longTermProjects,
      next_immediate_actions: nextActions,
      rubric_baseline: `${currentTotal}/50`,
      rubric_potential: `${Math.min(50, potentialTotal)}/50 with focused gap closing`,
    };

    return {
      type_id: this.type_id,
      component: 'gap_priority_analyzer',
      triggered: true,
      confidence: 0.85,
      data: result,
    };
  }

  private extractRubricScores(facts: any[], intelligenceResults: any[]): {
    academics: number;
    leadership: number;
    service: number;
    artifacts: number;
    recognition: number;
  } | null {
    // v29.1: Prioritize extracting from intelligence_results (same request cycle)
    // This enables TYPE-086 to receive TYPE-085 results from BaseAgentWithIntelligence
    const rubricIntelligence = intelligenceResults.find((ir: any) => ir.type_id === 'TYPE-085');

    if (rubricIntelligence && rubricIntelligence.data?.dimension_scores) {
      // Extract from intelligence results (preferred path)
      const dimensionScores = rubricIntelligence.data.dimension_scores;
      return {
        academics: dimensionScores.find((ds: any) => ds.dimension === 'academics')?.raw_score || 0,
        leadership: dimensionScores.find((ds: any) => ds.dimension === 'leadership')?.raw_score || 0,
        service: dimensionScores.find((ds: any) => ds.dimension === 'service')?.raw_score || 0,
        artifacts: dimensionScores.find((ds: any) => ds.dimension === 'artifacts')?.raw_score || 0,
        recognition: dimensionScores.find((ds: any) => ds.dimension === 'recognition')?.raw_score || 0,
      };
    }

    // Fallback: Look for TYPE-085 rubric scoring result in facts (backwards compatibility)
    const rubricFact = facts.find(f =>
      f.type === 'intelligence_result' && f.data?.type_id === 'TYPE-085'
    );

    if (!rubricFact) {
      return null;
    }

    const rubricData = rubricFact.data?.data;
    if (!rubricData || !rubricData.dimension_scores) {
      return null;
    }

    // Extract scores from TYPE-085 dimension_scores array
    const dimensionScores = rubricData.dimension_scores;
    return {
      academics: dimensionScores.find((ds: any) => ds.dimension === 'academics')?.raw_score || 0,
      leadership: dimensionScores.find((ds: any) => ds.dimension === 'leadership')?.raw_score || 0,
      service: dimensionScores.find((ds: any) => ds.dimension === 'service')?.raw_score || 0,
      artifacts: dimensionScores.find((ds: any) => ds.dimension === 'artifacts')?.raw_score || 0,
      recognition: dimensionScores.find((ds: any) => ds.dimension === 'recognition')?.raw_score || 0,
    };
  }

  private extractCurrentGrade(facts: any[]): number {
    const gradeFact = facts.find(f =>
      JSON.stringify(f).toLowerCase().includes('grade') &&
      (JSON.stringify(f).includes('10') || JSON.stringify(f).includes('11') ||
       JSON.stringify(f).includes('12') || JSON.stringify(f).includes('9'))
    );

    if (gradeFact) {
      const gradeStr = JSON.stringify(gradeFact);
      if (gradeStr.includes('12')) return 12;
      if (gradeStr.includes('11')) return 11;
      if (gradeStr.includes('10')) return 10;
      if (gradeStr.includes('9')) return 9;
    }

    return 10; // Default to sophomore if not found
  }

  private analyzeGap(
    dimension: 'academics' | 'leadership' | 'service' | 'artifacts' | 'recognition',
    currentScore: number,
    urgencyMultiplier: number
  ): GapAnalysis {
    const targetScore = this.TARGET_SCORES[dimension];
    const gapSize = Math.max(0, targetScore - currentScore);
    const dimensionWeight = this.DIMENSION_WEIGHTS[dimension];
    const priorityScore = gapSize * dimensionWeight * urgencyMultiplier;

    // Categorize priority
    let priorityCategory: 'P0' | 'P1' | 'P2' | 'P3';
    if (priorityScore >= 8) {
      priorityCategory = 'P0'; // Critical
    } else if (priorityScore >= 5) {
      priorityCategory = 'P1'; // High
    } else if (priorityScore >= 2) {
      priorityCategory = 'P2'; // Medium
    } else {
      priorityCategory = 'P3'; // Low
    }

    // Generate dimension-specific closing actions
    const closingActions = this.generateClosingActions(dimension, currentScore, gapSize);

    // Estimate weeks needed to close gap
    const estimatedWeeks = this.estimateWeeksToClose(dimension, gapSize);

    // Calculate impact on total score
    const impactOnTotal = gapSize;

    // Generate evidence gaps
    const evidenceGaps = this.identifyEvidenceGaps(dimension, currentScore);

    return {
      dimension,
      current_score: currentScore,
      target_score: targetScore,
      gap_size: gapSize,
      dimension_weight: dimensionWeight,
      urgency_multiplier: urgencyMultiplier,
      priority_score: priorityScore,
      priority_category: priorityCategory,
      closing_actions: closingActions,
      estimated_weeks: estimatedWeeks,
      impact_on_total: impactOnTotal,
      evidence_gaps: evidenceGaps,
    };
  }

  private generateClosingActions(
    dimension: 'academics' | 'leadership' | 'service' | 'artifacts' | 'recognition',
    currentScore: number,
    gapSize: number
  ): string[] {
    if (gapSize === 0) {
      return ['✅ Target achieved - maintain excellence'];
    }

    const actions: string[] = [];

    switch (dimension) {
      case 'academics':
        if (currentScore < 5) {
          actions.push('🎯 PRIORITY: Raise GPA to 3.7+ through focused study and tutoring');
          actions.push('📚 Enroll in 2-3 AP/IB courses next year');
          actions.push('📖 Take SAT/ACT prep course, target 1450+ (SAT) or 32+ (ACT)');
        } else if (currentScore < 8) {
          actions.push('📈 Push GPA to 3.9+ by excelling in current courses');
          actions.push('📚 Add 2-3 more AP/IB courses to reach 8+ total');
          actions.push('📊 Retake SAT/ACT if below 1500 (SAT) or 34 (ACT)');
        } else {
          actions.push('🔥 Maintain 3.9+ GPA and complete all planned AP/IB courses');
        }
        break;

      case 'leadership':
        if (currentScore < 3) {
          actions.push('🚀 PRIORITY: Join 2-3 clubs/organizations aligned with your interests');
          actions.push('📋 Run for officer position in 1 organization (Vice President/Secretary)');
          actions.push('💡 Found a new club/initiative if existing options don\'t fit');
        } else if (currentScore < 6) {
          actions.push('👑 Run for President/Captain role in primary organization');
          actions.push('🌟 Expand scope: take regional or state-level leadership role');
          actions.push('⏱️ Commit to multi-year leadership (2+ years in same org)');
        } else {
          actions.push('🎖️ Expand leadership impact: mentor younger students, scale initiatives');
        }
        break;

      case 'service':
        if (currentScore < 3) {
          actions.push('🤝 PRIORITY: Start consistent volunteer work (4-6 hours/month)');
          actions.push('📅 Commit to 2+ year service plan with same organization');
          actions.push('📊 Track hours and impact metrics (people served, outcomes)');
        } else if (currentScore < 6) {
          actions.push('⏰ Increase to 100+ total hours (8-10 hours/month)');
          actions.push('💪 Take leadership role in service organization');
          actions.push('📝 Document impact: write case studies, collect testimonials');
        } else {
          actions.push('🌍 Expand service impact: scale program or start new initiative');
        }
        break;

      case 'artifacts':
        if (currentScore < 3) {
          actions.push('🛠️ PRIORITY: Start building 1-2 tangible projects in your interest area');
          actions.push('💻 For STEM: build app/website, conduct research, create prototype');
          actions.push('🎨 For humanities: write/publish articles, create media, launch campaign');
        } else if (currentScore < 6) {
          actions.push('🚀 Publish/deploy your project (app store, research journal, public platform)');
          actions.push('📈 Add complexity: integrate advanced features, conduct rigorous analysis');
          actions.push('✅ Get external validation: users, citations, media coverage, competition entry');
        } else {
          actions.push('🏆 Enter projects in competitions (science fairs, hackathons, contests)');
        }
        break;

      case 'recognition':
        if (currentScore < 2) {
          actions.push('🏅 PRIORITY: Identify 3-5 relevant competitions/awards to apply for');
          actions.push('📝 Apply to NCWIT, Scholastic Art & Writing, Congressional App Challenge, etc.');
          actions.push('🔬 Enter subject-specific competitions (science fairs, math olympiads)');
        } else if (currentScore < 5) {
          actions.push('🎯 Target regional and national competitions (not just school-level)');
          actions.push('📊 Submit strongest work to prestigious awards (ISEF, National Merit, etc.)');
          actions.push('🌟 Aim for finalist/semi-finalist in major competitions');
        } else {
          actions.push('🏆 Target top-tier national/international awards for maximum impact');
        }
        break;
    }

    return actions;
  }

  private estimateWeeksToClose(
    dimension: 'academics' | 'leadership' | 'service' | 'artifacts' | 'recognition',
    gapSize: number
  ): number {
    // Time estimates based on Jenny's coaching patterns

    const baseWeeks = {
      academics: 52, // Full academic year to show GPA improvement
      leadership: 16, // 1 semester to earn leadership role
      service: 24, // 6 months to build consistent service record
      artifacts: 12, // 3 months to build and deploy project
      recognition: 8, // 2 months to apply to competitions (results take longer)
    };

    // Scale by gap size (larger gaps take proportionally longer)
    return Math.ceil(baseWeeks[dimension] * (gapSize / 5));
  }

  private identifyEvidenceGaps(
    dimension: 'academics' | 'leadership' | 'service' | 'artifacts' | 'recognition',
    currentScore: number
  ): string[] {
    const gaps: string[] = [];

    switch (dimension) {
      case 'academics':
        if (currentScore < 9) {
          gaps.push('Need exact GPA (unweighted and weighted)');
          gaps.push('Need complete AP/IB course list with scores');
          gaps.push('Need SAT/ACT scores (or planned test dates)');
        }
        break;

      case 'leadership':
        if (currentScore < 8) {
          gaps.push('Need specific leadership titles (President, Captain, Founder)');
          gaps.push('Need duration of leadership roles (years involved)');
          gaps.push('Need scope of impact (school, regional, national)');
        }
        break;

      case 'service':
        if (currentScore < 7) {
          gaps.push('Need total volunteer hours');
          gaps.push('Need organization names and consistency (years involved)');
          gaps.push('Need specific impact metrics (people served, outcomes)');
        }
        break;

      case 'artifacts':
        if (currentScore < 8) {
          gaps.push('Need details of tangible outputs (apps, research papers, creative works)');
          gaps.push('Need publication/deployment status');
          gaps.push('Need external validation (users, citations, views, downloads)');
        }
        break;

      case 'recognition':
        if (currentScore < 7) {
          gaps.push('Need complete awards list with levels (school, regional, national)');
          gaps.push('Need competition placements (finalist, winner, etc.)');
          gaps.push('Need prestige indicators (ISEF, NCWIT, National Merit, etc.)');
        }
        break;
    }

    return gaps;
  }

  private generateImmediateActions(
    p0Gaps: GapAnalysis[],
    p1Gaps: GapAnalysis[],
    quickWins: GapAnalysis[]
  ): string[] {
    const actions: string[] = [];

    // Priority 1: P0 gaps (critical)
    if (p0Gaps.length > 0) {
      const topP0 = p0Gaps.sort((a, b) => b.priority_score - a.priority_score)[0];
      actions.push(`🚨 Critical Gap: ${topP0.dimension} (${topP0.current_score}→${topP0.target_score})`);
      actions.push(`   → ${topP0.closing_actions[0]}`);
    }

    // Priority 2: Quick wins (high impact, low time)
    if (quickWins.length > 0) {
      const topQuickWin = quickWins.sort((a, b) => b.impact_on_total - a.impact_on_total)[0];
      actions.push(`⚡ Quick Win: ${topQuickWin.dimension} (${topQuickWin.estimated_weeks} weeks for +${topQuickWin.impact_on_total} points)`);
      actions.push(`   → ${topQuickWin.closing_actions[0]}`);
    }

    // Priority 3: P1 gaps (high priority)
    if (p1Gaps.length > 0 && actions.length < 6) {
      const topP1 = p1Gaps.sort((a, b) => b.priority_score - a.priority_score)[0];
      actions.push(`🎯 High Priority: ${topP1.dimension} (${topP1.current_score}→${topP1.target_score})`);
      actions.push(`   → ${topP1.closing_actions[0]}`);
    }

    return actions.slice(0, 6); // Max 6 actions (3 gaps × 2 lines each)
  }
}
