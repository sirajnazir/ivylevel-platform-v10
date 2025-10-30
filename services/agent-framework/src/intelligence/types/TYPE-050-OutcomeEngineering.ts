/**
 * TYPE-050: Outcome Engineering Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent only)
 *
 * Purpose: Translates GamePlan into Outcomes (strategic deliverables) with priority levels
 * and outcome density scoring to maximize multi-outcome tasks.
 *
 * Formula:
 * GamePlan → Outcomes (P0/P1/P2/P3 priority based on Urgency × Impact)
 * Outcome Density Score = # of outcome tags (admission, awards, press, LoR, scholarships)
 *
 * Source: EXEC_Intel_Chips_Batch_v2.jsonl (W000-FRAMEWORK-002, W000-STRATEGY-015, W000-STRATEGY-021)
 * Pattern: Outcome Correlation Map + Outcome Density Maximization
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from '../IntelligenceRegistry.js';

type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3';
type OutcomeDomain = 'academic' | 'test_preparation' | 'extracurricular' | 'application' | 'creative_project';
type OutcomeTag = 'admission' | 'awards' | 'press' | 'rec_letters' | 'scholarships';

interface OutcomeDefinition {
  outcome_id: string;
  outcome_domain: OutcomeDomain;
  outcome_type: string;
  outcome_scope: string;
  title: string;
  description: string;
  purpose: string;
  target_metric: any;
  priority_level: PriorityLevel;
  urgency_score: number; // 0-10
  impact_score: number;  // 0-10
  outcome_tags: OutcomeTag[]; // Which proof artifacts this generates
  outcome_density_score: number; // # of tags (higher = better)
  estimated_effort_hours: number;
  deadline: string | null;
  parent_gameplan_initiative: string | null;
}

interface OutcomeEngineeringResult {
  outcomes_generated: OutcomeDefinition[];
  high_density_outcomes: OutcomeDefinition[]; // Density score >=3
  medium_density_outcomes: OutcomeDefinition[]; // Density score 2
  low_density_outcomes: OutcomeDefinition[]; // Density score 1
  orphan_risk_outcomes: OutcomeDefinition[]; // Density score 0 (should eliminate)
  priority_distribution: {
    p0_count: number;
    p1_count: number;
    p2_count: number;
    p3_count: number;
  };
  recommendations: string[];
}

export class OutcomeEngineering implements IntelligenceType {
  type_id = 'TYPE-050';
  name = 'Outcome Engineering';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query to generate outcomes from GamePlan and facts
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract facts
    const activityFacts = facts.get(FactCategory.ACTIVITY_DATA) || [];
    const assessmentFacts = facts.get(FactCategory.ASSESSMENT_DATA) || [];
    const profileFacts = facts.get(FactCategory.STUDENT_PROFILE) || [];

    // Generate outcomes from GamePlan initiatives and current activities
    const outcomes = this.generateOutcomes(
      studentId,
      activityFacts,
      assessmentFacts,
      profileFacts
    );

    // Calculate outcome density distribution
    const highDensity = outcomes.filter((o) => o.outcome_density_score >= 3);
    const mediumDensity = outcomes.filter((o) => o.outcome_density_score === 2);
    const lowDensity = outcomes.filter((o) => o.outcome_density_score === 1);
    const orphanRisk = outcomes.filter((o) => o.outcome_density_score === 0);

    // Calculate priority distribution
    const priorityDistribution = {
      p0_count: outcomes.filter((o) => o.priority_level === 'P0').length,
      p1_count: outcomes.filter((o) => o.priority_level === 'P1').length,
      p2_count: outcomes.filter((o) => o.priority_level === 'P2').length,
      p3_count: outcomes.filter((o) => o.priority_level === 'P3').length,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      outcomes,
      highDensity,
      orphanRisk,
      priorityDistribution
    );

    const result: OutcomeEngineeringResult = {
      outcomes_generated: outcomes,
      high_density_outcomes: highDensity,
      medium_density_outcomes: mediumDensity,
      low_density_outcomes: lowDensity,
      orphan_risk_outcomes: orphanRisk,
      priority_distribution: priorityDistribution,
      recommendations,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: 0.92,
      data: result,
    };
  }

  /**
   * Generate outcomes from GamePlan and current activities
   */
  private generateOutcomes(
    studentId: string,
    activityFacts: any[],
    assessmentFacts: any[],
    profileFacts: any[]
  ): OutcomeDefinition[] {
    const outcomes: OutcomeDefinition[] = [];

    // Generate outcomes from activities in "Planned" or "In Transit" state
    const activeActivities = activityFacts.filter(
      (f) =>
        f.value.tier1_state === 'Planned' ||
        f.value.tier1_state === 'In Transit' ||
        f.value.tier1_state === 'Delivered'
    );

    activeActivities.forEach((activity, index) => {
      const outcome = this.createOutcomeFromActivity(activity, index);
      outcomes.push(outcome);
    });

    // Generate outcomes from assessment weaknesses (areas to improve)
    const weaknesses = assessmentFacts.filter(
      (f) => f.value.subtype === 'Weakness' || f.value.tier2_substate === 'Needs Work'
    );

    weaknesses.forEach((weakness, index) => {
      const outcome = this.createOutcomeFromWeakness(weakness, activeActivities.length + index);
      outcomes.push(outcome);
    });

    return outcomes;
  }

  /**
   * Create outcome from activity/project
   */
  private createOutcomeFromActivity(activity: any, index: number): OutcomeDefinition {
    const itemType = activity.value.item_type || 'Extracurricular';
    const title = activity.value.title_name || activity.value.title || `Outcome ${index + 1}`;
    const state = activity.value.tier1_state || 'Planned';
    const substate = activity.value.tier2_substate || '';
    const metricValue = activity.value.metric_value ? parseInt(activity.value.metric_value, 10) : 0;

    // Determine outcome domain
    let outcomeDomain: OutcomeDomain = 'extracurricular';
    if (itemType === 'Award') outcomeDomain = 'extracurricular';
    else if (itemType === 'Program') outcomeDomain = 'extracurricular';
    else if (itemType === 'Test') outcomeDomain = 'test_preparation';
    else if (itemType === 'Academic') outcomeDomain = 'academic';

    // Calculate urgency and impact
    const urgencyScore = this.calculateUrgency(activity);
    const impactScore = this.calculateImpact(activity);

    // Determine priority level
    const priorityLevel = this.calculatePriorityLevel(urgencyScore, impactScore);

    // Determine outcome tags (which proof artifacts this generates)
    const outcomeTags = this.determineOutcomeTags(activity);
    const densityScore = outcomeTags.length;

    // Estimate effort
    const effortHours = this.estimateEffort(activity, state);

    return {
      outcome_id: activity.fact_id || `outcome-${index + 1}`,
      outcome_domain: outcomeDomain,
      outcome_type: itemType,
      outcome_scope: substate || 'Standard',
      title,
      description: activity.value.status_detail || `Work on ${title}`,
      purpose: `Generate proof artifacts for ${outcomeTags.join(', ')}`,
      target_metric: { metric: 'users', value: metricValue || 10 },
      priority_level: priorityLevel,
      urgency_score: urgencyScore,
      impact_score: impactScore,
      outcome_tags: outcomeTags,
      outcome_density_score: densityScore,
      estimated_effort_hours: effortHours,
      deadline: activity.value.deadline || null,
      parent_gameplan_initiative: activity.value.parent_initiative || null,
    };
  }

  /**
   * Create outcome from assessment weakness
   */
  private createOutcomeFromWeakness(weakness: any, index: number): OutcomeDefinition {
    const title = weakness.value.title || `Improve ${weakness.value.subtype}`;
    const description = weakness.value.status_detail || `Address weakness in ${title}`;

    return {
      outcome_id: `weakness-outcome-${index + 1}`,
      outcome_domain: 'academic',
      outcome_type: 'Improvement',
      outcome_scope: 'Weakness Mitigation',
      title,
      description,
      purpose: 'Strengthen application profile by addressing weaknesses',
      target_metric: { metric: 'improvement', value: '20%' },
      priority_level: 'P2', // Weaknesses are medium priority
      urgency_score: 5,
      impact_score: 6,
      outcome_tags: ['admission'], // Addressing weaknesses helps admissions
      outcome_density_score: 1,
      estimated_effort_hours: 20,
      deadline: null,
      parent_gameplan_initiative: 'Academic Excellence',
    };
  }

  /**
   * Calculate urgency score (0-10) based on deadline proximity
   */
  private calculateUrgency(activity: any): number {
    const deadline = activity.value.deadline;
    if (!deadline) return 5; // Default medium urgency

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline <= 7) return 10; // Extremely urgent
    if (daysUntilDeadline <= 14) return 9;
    if (daysUntilDeadline <= 30) return 8;
    if (daysUntilDeadline <= 60) return 6;
    if (daysUntilDeadline <= 90) return 4;
    return 2; // Low urgency (>90 days)
  }

  /**
   * Calculate impact score (0-10) based on outcome potential
   */
  private calculateImpact(activity: any): number {
    const itemType = activity.value.item_type || 'Extracurricular';
    const state = activity.value.tier1_state || 'Planned';
    const substate = activity.value.tier2_substate || '';

    let impact = 5; // Baseline

    // Higher impact for leadership roles
    if (substate === 'Leadership' || substate === 'High Impact') impact += 3;

    // Higher impact for awards
    if (itemType === 'Award' && state === 'Won') impact += 4;

    // Higher impact for programs at target schools
    if (itemType === 'Program' && substate === 'T1') impact += 3;

    // Higher impact for projects with users
    const metricValue = activity.value.metric_value ? parseInt(activity.value.metric_value, 10) : 0;
    if (metricValue >= 100) impact += 2;
    else if (metricValue >= 10) impact += 1;

    return Math.min(impact, 10);
  }

  /**
   * Calculate priority level based on urgency × impact
   */
  private calculatePriorityLevel(urgencyScore: number, impactScore: number): PriorityLevel {
    const priorityScore = urgencyScore * impactScore;

    // P0: Critical (urgency >=8 AND impact >=8) OR priority score >80
    if ((urgencyScore >= 8 && impactScore >= 8) || priorityScore > 80) return 'P0';

    // P1: High (urgency >=6 OR impact >=7) AND priority score >50
    if ((urgencyScore >= 6 || impactScore >= 7) && priorityScore > 50) return 'P1';

    // P2: Medium (priority score >25)
    if (priorityScore > 25) return 'P2';

    // P3: Low (everything else)
    return 'P3';
  }

  /**
   * Determine outcome tags (which proof artifacts this generates)
   */
  private determineOutcomeTags(activity: any): OutcomeTag[] {
    const tags: OutcomeTag[] = [];
    const itemType = activity.value.item_type || 'Extracurricular';
    const substate = activity.value.tier2_substate || '';
    const hasPublicArtifact = activity.value.website || activity.value.demo_link || activity.value.github;
    const hasTestimonials = activity.value.testimonials || activity.value.user_quotes;

    // All outcomes contribute to admission (baseline)
    tags.push('admission');

    // Awards generate award proof
    if (itemType === 'Award') {
      tags.push('awards');
    }

    // Public artifacts generate press potential
    if (hasPublicArtifact) {
      tags.push('press');
    }

    // Leadership roles generate LoR material
    if (substate === 'Leadership' || substate === 'High Impact') {
      tags.push('rec_letters');
    }

    // Projects with testimonials generate LoR + scholarship material
    if (hasTestimonials) {
      tags.push('rec_letters');
      if (!tags.includes('awards')) {
        // Scholarships often require similar materials as awards
        tags.push('scholarships');
      }
    }

    return tags;
  }

  /**
   * Estimate effort hours based on activity state
   */
  private estimateEffort(activity: any, state: string): number {
    const itemType = activity.value.item_type || 'Extracurricular';

    // Base effort by item type
    let baseEffort = 20; // Default 20 hours
    if (itemType === 'Award') baseEffort = 10; // Awards: application effort
    else if (itemType === 'Program') baseEffort = 15; // Programs: application + prep
    else if (itemType === 'Extracurricular') baseEffort = 40; // Projects: sustained work

    // Adjust by state
    if (state === 'Planned') return baseEffort * 1.5; // More effort to start
    if (state === 'In Transit') return baseEffort; // Steady state
    if (state === 'Delivered') return baseEffort * 0.3; // Maintenance only

    return baseEffort;
  }

  /**
   * Generate recommendations based on outcome analysis
   */
  private generateRecommendations(
    outcomes: OutcomeDefinition[],
    highDensity: OutcomeDefinition[],
    orphanRisk: OutcomeDefinition[],
    priorityDistribution: { p0_count: number; p1_count: number; p2_count: number; p3_count: number }
  ): string[] {
    const recommendations: string[] = [];

    // Recommend prioritizing high-density outcomes
    if (highDensity.length > 0) {
      recommendations.push(
        `Focus on ${highDensity.length} high-density outcomes (3+ proof artifacts): ${highDensity.map((o) => o.title).slice(0, 3).join(', ')}`
      );
    }

    // Flag orphan-risk outcomes
    if (orphanRisk.length > 0) {
      recommendations.push(
        `⚠️ ${orphanRisk.length} outcomes have no proof tags - consider eliminating or re-scoping: ${orphanRisk.map((o) => o.title).join(', ')}`
      );
    }

    // Balance priority distribution
    if (priorityDistribution.p0_count > 5) {
      recommendations.push(
        `⚠️ Too many P0 outcomes (${priorityDistribution.p0_count}) - review priorities and downgrade some to P1`
      );
    }

    if (priorityDistribution.p0_count === 0 && priorityDistribution.p1_count === 0) {
      recommendations.push(
        '⚠️ No high-priority outcomes - ensure critical deliverables are captured as P0/P1'
      );
    }

    // Recommend outcome density maximization
    const lowDensity = outcomes.filter((o) => o.outcome_density_score === 1);
    if (lowDensity.length > highDensity.length) {
      recommendations.push(
        'Consider bundling low-density outcomes to increase proof artifact generation (e.g., publish blog about project for press tag)'
      );
    }

    return recommendations;
  }
}
