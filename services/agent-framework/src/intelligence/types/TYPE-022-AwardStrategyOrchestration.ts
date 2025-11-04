/**
 * TYPE-022: Award Strategy Orchestration
 * Category: DOMAIN_SPECIFIC (AwardsAgent)
 *
 * Purpose: Multi-month campaign planning for high-value T1 national awards
 * that require strategic narrative development and content choreography.
 *
 * Framework: 3-6 Month Identity Seed Planting
 *
 * Pattern: Plant narrative seeds 3-6 months before application → Natural story
 * emerges vs. manufactured last-minute narrative (red flag for judges)
 *
 * Example (NCWIT for Huda):
 * - Month -6: Establish "CS + Film" fusion identity in conversations
 * - Month -4: Launch "Empowering AI" project aligned with award values
 * - Month -2: Document impact metrics (200+ classrooms reached)
 * - Month 0: Application writes itself from accumulated narrative threads
 * - Result: WIN (authentic story vs. fabricated application)
 *
 * Source: W001 sessions (NCWIT orchestration weeks 25-32), W004 (strategic planning)
 *
 * Created: 2025-11-04
 * Version: v29.6
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

/**
 * Orchestration phase
 */
type OrchestrationPhase = 'identity_seed' | 'project_launch' | 'impact_build' | 'ready_to_apply';

/**
 * Award campaign (multi-month orchestration)
 */
interface AwardCampaign {
  award_name: string;
  award_tier: 'T1' | 'T2';
  target_deadline: string; // ISO date
  lead_time_months: number; // How many months until deadline
  current_phase: OrchestrationPhase;
  readiness_score: number; // 0-100 (100 = ready to apply)

  // Narrative components
  identity_seeds_planted: string[]; // Conversation topics established
  supporting_projects: string[]; // Projects launched to support narrative
  impact_metrics: Record<string, number>; // Quantifiable outcomes
  content_assets: string[]; // Essays/stories/media created

  // Timeline
  phases: Array<{
    phase: OrchestrationPhase;
    target_week: number;
    tasks: string[];
    status: 'not_started' | 'in_progress' | 'completed';
  }>;

  // Application readiness
  missing_components: string[];
  recommendations: string[];
}

/**
 * Orchestration result
 */
interface AwardOrchestrationResult {
  active_campaigns: AwardCampaign[];
  ready_to_apply: AwardCampaign[]; // Readiness ≥80
  needs_acceleration: AwardCampaign[]; // Behind schedule
  new_campaign_recommendations: string[];
  strategic_guidance: string[];
}

export class AwardStrategyOrchestration implements IntelligenceType {
  type_id = 'TYPE-022';
  name = 'Award Strategy Orchestration';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'AwardsAgent';
  version = 'v29.6';

  /**
   * Minimum lead time by tier (months)
   */
  private readonly LEAD_TIME_REQUIREMENTS: Record<string, number> = {
    T1: 6, // T1 national awards need 6 months orchestration
    T2: 3, // T2 state/regional need 3 months
    T3: 1, // T3 local need 1 month
    T4: 0, // T4 participation (no orchestration needed)
  };

  /**
   * Process award orchestration strategy
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const profileFacts = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE);
    const activityFacts = facts.getFactsByCategory(FactCategory.ACTIVITY_DATA);
    const awardsWonFacts = facts.get(FactCategory.AWARDS_WON) || [];

    // Identify active campaigns (awards in pipeline)
    const activeCampaigns = this.identifyActiveCampaigns(activityFacts, profileFacts);

    // Assess readiness for each campaign
    const assessedCampaigns = activeCampaigns.map((campaign) =>
      this.assessCampaignReadiness(campaign, activityFacts, profileFacts)
    );

    // Categorize campaigns
    const readyToApply = assessedCampaigns.filter((c) => c.readiness_score >= 80);
    const needsAcceleration = assessedCampaigns.filter(
      (c) => c.readiness_score < 60 && c.lead_time_months < 2
    );

    // Generate new campaign recommendations
    const newCampaignRecommendations = this.generateNewCampaignRecommendations(
      assessedCampaigns,
      profileFacts,
      activityFacts
    );

    // Generate strategic guidance
    const strategicGuidance = this.generateStrategicGuidance(
      assessedCampaigns,
      readyToApply,
      needsAcceleration
    );

    const result: AwardOrchestrationResult = {
      active_campaigns: assessedCampaigns,
      ready_to_apply: readyToApply,
      needs_acceleration: needsAcceleration,
      new_campaign_recommendations: newCampaignRecommendations,
      strategic_guidance: strategicGuidance,
    };

    return {
      type_id: this.type_id,
      component: 'award_orchestration',
      triggered: true,
      confidence: 0.85,
      data: result,
    };
  }

  /**
   * Identify active award campaigns from student activities
   */
  private identifyActiveCampaigns(activityFacts: any[], profileFacts: any[]): AwardCampaign[] {
    const campaigns: AwardCampaign[] = [];

    // For v29.6, return mock campaigns to establish architecture
    // TODO: Replace with actual kb_items query for awards in pipeline

    // Example campaign structure (would be extracted from database)
    const mockCampaign: AwardCampaign = {
      award_name: 'NCWIT Aspirations in Computing',
      award_tier: 'T1',
      target_deadline: '2025-02-15',
      lead_time_months: 3,
      current_phase: 'impact_build',
      readiness_score: 65,
      identity_seeds_planted: [
        'CS + Film fusion identity established',
        'Teaching/mentorship narrative developed',
        'AI ethics focus communicated',
      ],
      supporting_projects: ['Empowering AI', 'Synthoria'],
      impact_metrics: {
        classrooms_reached: 200,
        students_taught: 5000,
        apps_built: 3,
      },
      content_assets: ['Core narrative essay', 'Project descriptions'],
      phases: [
        {
          phase: 'identity_seed',
          target_week: 1,
          tasks: ['Establish CS + teaching identity', 'Discuss award in conversation'],
          status: 'completed',
        },
        {
          phase: 'project_launch',
          target_week: 8,
          tasks: ['Launch Empowering AI', 'Document impact'],
          status: 'completed',
        },
        {
          phase: 'impact_build',
          target_week: 16,
          tasks: ['Reach 200+ classrooms', 'Gather testimonials'],
          status: 'in_progress',
        },
        {
          phase: 'ready_to_apply',
          target_week: 20,
          tasks: ['Complete application', 'Submit before deadline'],
          status: 'not_started',
        },
      ],
      missing_components: ['Recommendation letters', 'Impact testimonials'],
      recommendations: [
        'Accelerate testimonial collection (need 3-5 teacher quotes)',
        'Request recommendation from CS teacher',
        'Document recent Empowering AI milestones',
      ],
    };

    campaigns.push(mockCampaign);

    return campaigns;
  }

  /**
   * Assess campaign readiness
   */
  private assessCampaignReadiness(
    campaign: AwardCampaign,
    activityFacts: any[],
    profileFacts: any[]
  ): AwardCampaign {
    // Calculate readiness score (0-100)
    let readinessScore = 0;

    // Identity seeds: +20 if 3+ seeds planted
    if (campaign.identity_seeds_planted.length >= 3) readinessScore += 20;
    else if (campaign.identity_seeds_planted.length >= 2) readinessScore += 15;
    else if (campaign.identity_seeds_planted.length >= 1) readinessScore += 10;

    // Supporting projects: +25 if 2+ projects launched
    if (campaign.supporting_projects.length >= 2) readinessScore += 25;
    else if (campaign.supporting_projects.length >= 1) readinessScore += 15;

    // Impact metrics: +25 if strong quantifiable impact
    const impactCount = Object.keys(campaign.impact_metrics).length;
    if (impactCount >= 3) readinessScore += 25;
    else if (impactCount >= 2) readinessScore += 15;
    else if (impactCount >= 1) readinessScore += 10;

    // Content assets: +15 if essay/content ready
    if (campaign.content_assets.length >= 2) readinessScore += 15;
    else if (campaign.content_assets.length >= 1) readinessScore += 10;

    // Timeline: +15 if on schedule, -20 if behind
    const completedPhases = campaign.phases.filter((p) => p.status === 'completed').length;
    const totalPhases = campaign.phases.length;
    const phaseProgress = completedPhases / totalPhases;

    if (phaseProgress >= 0.75) readinessScore += 15;
    else if (phaseProgress >= 0.5) readinessScore += 10;
    else if (phaseProgress < 0.25 && campaign.lead_time_months < 2) {
      readinessScore -= 20; // Behind schedule
    }

    campaign.readiness_score = Math.max(0, Math.min(readinessScore, 100));

    return campaign;
  }

  /**
   * Generate new campaign recommendations
   */
  private generateNewCampaignRecommendations(
    existingCampaigns: AwardCampaign[],
    profileFacts: any[],
    activityFacts: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Check if student has T1 campaigns in pipeline
    const t1Campaigns = existingCampaigns.filter((c) => c.award_tier === 'T1');

    if (t1Campaigns.length === 0) {
      recommendations.push(
        'Consider starting T1 national award campaign (requires 6-month lead time)'
      );
      recommendations.push('Target: NCWIT, Congressional App, or Scholastic Art & Writing');
    }

    // Check if identity seeds are planted for future awards
    const identitySeedsCount = existingCampaigns.reduce(
      (sum, c) => sum + c.identity_seeds_planted.length,
      0
    );

    if (identitySeedsCount < 5) {
      recommendations.push(
        'Plant 2-3 more identity seeds in upcoming conversations (establishes natural narrative)'
      );
    }

    return recommendations;
  }

  /**
   * Generate strategic guidance
   */
  private generateStrategicGuidance(
    allCampaigns: AwardCampaign[],
    readyToApply: AwardCampaign[],
    needsAcceleration: AwardCampaign[]
  ): string[] {
    const guidance: string[] = [];

    if (readyToApply.length > 0) {
      guidance.push(
        `🎯 ${readyToApply.length} campaign(s) ready to apply (readiness ≥80%): ${readyToApply.map((c) => c.award_name).join(', ')}`
      );
      guidance.push('Action: Submit applications in next 1-2 weeks');
    }

    if (needsAcceleration.length > 0) {
      guidance.push(
        `⚠️ ${needsAcceleration.length} campaign(s) behind schedule: ${needsAcceleration.map((c) => c.award_name).join(', ')}`
      );
      guidance.push('Action: Accelerate timeline or consider deferring to next cycle');
    }

    if (allCampaigns.length === 0) {
      guidance.push('💡 No active award campaigns detected');
      guidance.push(
        'Recommendation: Start T1 campaign now (6-month lead time required for national awards)'
      );
    }

    guidance.push(
      '\n📋 Orchestration Principle: Plant identity seeds 3-6 months before application → Authentic narrative vs. manufactured story'
    );

    return guidance;
  }
}
