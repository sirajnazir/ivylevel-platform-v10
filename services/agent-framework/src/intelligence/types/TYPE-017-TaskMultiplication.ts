/**
 * TYPE-017: Task Multiplication (5X Formula)
 * Category: DOMAIN_SPECIFIC (shared: AwardsAgent, ExtracurricularsAgent, WeeklyExecutionAgent)
 *
 * Purpose: Maximize ROI of every activity by ensuring each task serves 5+
 * distinct purposes. Prevents single-purpose busywork, enforces strategic
 * leverage.
 *
 * Framework: Every Activity Serves 5+ Purposes
 *
 * Single Award Application (10 hours) →
 * 1. Credential: Award win → resume line
 * 2. Essay Content: Essays → college apps (5+ touchpoints)
 * 3. Interview Material: Story → college interview talking points
 * 4. Portfolio Piece: Project → EC portfolio depth
 * 5. Network: Community → mentor connections
 * 6. Social Proof: Announcement → LinkedIn, YouTube, supplements
 * 7. Parent Validation: Win → family confidence boost
 * = 7X Multiplier (7 benefits from 1 activity)
 *
 * Critical Rule: Minimum 3X multiplication factor required. Reject activities <3X.
 *
 * Source: W001 NCWIT application (weeks 25-32), content reuse analysis
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
 * Multiplication dimension
 */
type MultiplicationDimension =
  | 'credential'
  | 'essay_reuse'
  | 'interview_material'
  | 'portfolio'
  | 'network'
  | 'social_proof'
  | 'parent_validation';

/**
 * Activity with multiplication analysis
 */
interface MultiplicationAnalysis {
  activity_name: string;
  activity_type: 'award_application' | 'ec_activity' | 'project' | 'competition';
  time_investment_hours: number;

  // Multiplication dimensions (each scores 0-5)
  dimensions: {
    dimension: MultiplicationDimension;
    score: number; // 0-5 (0=none, 5=exceptional)
    description: string;
    touchpoints: string[]; // Specific benefits
  }[];

  total_multiplier: number; // Sum of all dimension scores
  meets_threshold: boolean; // ≥3X required
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'reject';
  strategic_guidance: string[];
}

/**
 * Portfolio multiplication result
 */
interface PortfolioMultiplicationResult {
  activities_analyzed: MultiplicationAnalysis[];
  average_multiplier: number;
  high_leverage_activities: MultiplicationAnalysis[]; // ≥5X
  low_leverage_activities: MultiplicationAnalysis[]; // <3X
  recommendations: string[];
}

export class TaskMultiplication implements IntelligenceType {
  type_id = 'TYPE-017';
  name = 'Task Multiplication (5X Formula)';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'Awards/ECs/Execution';
  version = 'v29.6';

  /**
   * Minimum multiplication threshold
   */
  private readonly MIN_MULTIPLIER = 3;

  /**
   * Target multiplication (excellence standard)
   */
  private readonly TARGET_MULTIPLIER = 5;

  /**
   * Process task multiplication analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const activityFacts = facts.getFactsByCategory(FactCategory.ACTIVITY_DATA);
    const profileFacts = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE);

    // Analyze multiplication potential for each activity
    const activitiesAnalyzed = this.analyzeActivities(activityFacts, profileFacts);

    // Calculate average multiplier
    const avgMultiplier =
      activitiesAnalyzed.length > 0
        ? activitiesAnalyzed.reduce((sum, a) => sum + a.total_multiplier, 0) /
          activitiesAnalyzed.length
        : 0;

    // Identify high/low leverage activities
    const highLeverage = activitiesAnalyzed.filter((a) => a.total_multiplier >= this.TARGET_MULTIPLIER);
    const lowLeverage = activitiesAnalyzed.filter((a) => a.total_multiplier < this.MIN_MULTIPLIER);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      activitiesAnalyzed,
      avgMultiplier,
      highLeverage,
      lowLeverage
    );

    const result: PortfolioMultiplicationResult = {
      activities_analyzed: activitiesAnalyzed,
      average_multiplier: Math.round(avgMultiplier * 10) / 10,
      high_leverage_activities: highLeverage,
      low_leverage_activities: lowLeverage,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      component: 'task_multiplication',
      triggered: true,
      confidence: 0.85,
      data: result,
    };
  }

  /**
   * Analyze multiplication potential for activities
   */
  private analyzeActivities(activityFacts: any[], profileFacts: any[]): MultiplicationAnalysis[] {
    // For v29.6, return mock analysis to establish architecture
    // TODO: Extract actual activities from kb_items

    const mockActivity: MultiplicationAnalysis = {
      activity_name: 'NCWIT Aspirations in Computing Application',
      activity_type: 'award_application',
      time_investment_hours: 15,
      dimensions: [
        {
          dimension: 'credential',
          score: 3,
          description: 'T1 national award credential',
          touchpoints: ['Resume line', 'Common App honors section', 'LinkedIn headline'],
        },
        {
          dimension: 'essay_reuse',
          score: 5,
          description: 'High reuse across 5+ applications',
          touchpoints: [
            'Common App personal statement (90% reuse)',
            'USC supplement (80% reuse)',
            'MIT activities description (70% reuse)',
            'Scholarship applications (90% reuse)',
            'Additional Info sections (60% reuse)',
          ],
        },
        {
          dimension: 'interview_material',
          score: 2,
          description: 'Rich story for college interviews',
          touchpoints: [
            'Why CS? → NCWIT spark moment',
            'Tell me about a challenge → NCWIT essay 4',
          ],
        },
        {
          dimension: 'portfolio',
          score: 2,
          description: 'Empowering AI project showcase',
          touchpoints: ['EC portfolio depth', 'GitHub featured project'],
        },
        {
          dimension: 'network',
          score: 2,
          description: 'NCWIT community access',
          touchpoints: ['Mentor connections', 'Stanford contacts via program'],
        },
        {
          dimension: 'social_proof',
          score: 2,
          description: 'Multi-channel amplification',
          touchpoints: [
            'LinkedIn post: "NCWIT National Winner"',
            'YouTube video: "How I won NCWIT"',
            'College supplement feature',
          ],
        },
        {
          dimension: 'parent_validation',
          score: 1,
          description: 'Family confidence boost',
          touchpoints: ['Win announcement', 'Increased family support for apps'],
        },
      ],
      total_multiplier: 17, // 3+5+2+2+2+2+1 = 17X
      meets_threshold: true,
      recommendation: 'highly_recommended',
      strategic_guidance: [
        'Exceptional 17X multiplier (target: 5X)',
        'Essay reuse alone provides 5X leverage',
        'Prioritize awards with similar high-multiplication profiles',
      ],
    };

    return [mockActivity];
  }

  /**
   * Calculate multiplication factor for a single activity
   */
  private calculateMultiplier(activity: any): number {
    let multiplier = 0;

    // Credential (0-3): T1=3, T2=2, T3=1, T4=0
    if (activity.award_tier === 'T1') multiplier += 3;
    else if (activity.award_tier === 'T2') multiplier += 2;
    else if (activity.award_tier === 'T3') multiplier += 1;

    // Essay Reuse (0-5): 5+ touchpoints=5, 3-4=4, 2=3, 1=2, 0=0
    const essayTouchpoints = activity.essay_reuse_count || 0;
    if (essayTouchpoints >= 5) multiplier += 5;
    else if (essayTouchpoints >= 3) multiplier += 4;
    else if (essayTouchpoints === 2) multiplier += 3;
    else if (essayTouchpoints === 1) multiplier += 2;

    // Interview Material (0-2): Rich story=2, Generic=1, None=0
    if (activity.has_interview_material) multiplier += 2;

    // Portfolio (0-2): Showcase project=2, Basic=1, None=0
    if (activity.has_portfolio_piece) multiplier += 2;

    // Network (0-2): Community access=2, Limited=1, None=0
    if (activity.has_network_benefit) multiplier += 2;

    // Social Proof (0-2): High-value=2, Basic=1, None=0
    if (activity.has_social_proof) multiplier += 2;

    // Parent Validation (0-1): Win announcement=1, None=0
    if (activity.is_win) multiplier += 1;

    return multiplier;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    activities: MultiplicationAnalysis[],
    avgMultiplier: number,
    highLeverage: MultiplicationAnalysis[],
    lowLeverage: MultiplicationAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    // Overall portfolio health
    if (avgMultiplier >= this.TARGET_MULTIPLIER) {
      recommendations.push(
        `✅ Excellent portfolio leverage: ${avgMultiplier}X average (target: ${this.TARGET_MULTIPLIER}X)`
      );
    } else if (avgMultiplier >= this.MIN_MULTIPLIER) {
      recommendations.push(
        `⚠️ Acceptable portfolio leverage: ${avgMultiplier}X average (target: ${this.TARGET_MULTIPLIER}X)`
      );
      recommendations.push('   → Opportunity: Increase multiplier by focusing on essay reuse + social proof');
    } else {
      recommendations.push(
        `🚨 Low portfolio leverage: ${avgMultiplier}X average (minimum: ${this.MIN_MULTIPLIER}X)`
      );
      recommendations.push('   → Critical: Replace low-leverage activities with high-multiplier opportunities');
    }

    // High-leverage activities
    if (highLeverage.length > 0) {
      recommendations.push(
        `\n🎯 High-Leverage Activities (≥${this.TARGET_MULTIPLIER}X):`
      );
      highLeverage.slice(0, 3).forEach((activity) => {
        recommendations.push(`   → ${activity.activity_name} (${activity.total_multiplier}X multiplier)`);
      });
      recommendations.push('   → Strategy: Prioritize similar high-multiplication opportunities');
    }

    // Low-leverage activities
    if (lowLeverage.length > 0) {
      recommendations.push(
        `\n⚠️ Low-Leverage Activities (<${this.MIN_MULTIPLIER}X):`
      );
      lowLeverage.slice(0, 3).forEach((activity) => {
        recommendations.push(`   → ${activity.activity_name} (${activity.total_multiplier}X multiplier)`);
      });
      recommendations.push('   → Action: Consider replacing with higher-ROI opportunities');
    }

    // Strategic guidance
    recommendations.push('\n💡 Multiplication Strategies:');
    recommendations.push('   → Design award essays for reuse (5+ touchpoints adds 5X leverage)');
    recommendations.push('   → Amplify wins across all channels (LinkedIn, YouTube, coaches)');
    recommendations.push('   → Build portfolio pieces that showcase in multiple contexts');
    recommendations.push('   → Every activity should serve minimum 3 purposes');

    return recommendations;
  }
}
