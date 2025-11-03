/**
 * TYPE-020: Opportunity Pipeline Architecture
 *
 * UNIVERSAL Intelligence Type (inherited by ALL agents)
 *
 * Purpose: Generate 1.2 opportunities per interaction to maintain momentum
 * and 3:1 buffer ratio for 33% win rate.
 *
 * Formula: 1.2 opportunities/interaction × 70% application rate × 33% win rate = sustained progress
 *
 * Data Source:
 * - 93 weeks validated: 1.2 opportunities average, 70% application rate, 33% win rate
 * - /data/coaching_intelligence/extractions/ (opportunity bombardment patterns)
 * - Recovery time: <72 hours from rejection to next opportunity
 *
 * Reused by: Awards, Scholarships, Summer Programs, Colleges, all agents
 *
 * Created: 2025-10-29
 */

import {
  BaseIntelligenceType,
  AgentQuery,
  IntelligenceResult,
  IntelligenceComponents
} from './BaseIntelligenceType.js';
import { FactSet } from '../../facts/FactSet.js';

/**
 * Opportunity data structure
 */
export interface Opportunity {
  opportunity_id: string;
  type: 'award' | 'program' | 'scholarship' | 'competition' | 'project' | 'other';
  name: string;
  description: string;
  deadline?: string;
  fit_score: number;        // 0-10
  effort_estimate: string;  // 'low' | 'medium' | 'high'
  roi_potential: string;    // 'low' | 'medium' | 'high'
  reasoning: string;
}

/**
 * Opportunity Pipeline Intelligence Type
 */
export class OpportunityPipeline extends BaseIntelligenceType {
  type_id = 'TYPE-020';
  name = 'Opportunity Pipeline Architecture';
  category = 'UNIVERSAL' as const;
  description = 'Generate 1.2 opportunities per interaction with 3:1 buffer for 33% win rate';

  components: IntelligenceComponents = {
    framework: {
      name: 'Opportunity Pipeline Framework',
      description: 'Maintain constant flow of opportunities to ensure momentum and handle rejections',
      mental_model: 'Like sales pipeline: 3 leads → 1 conversion. Always have next opportunity ready.'
    },

    tactics: [
      {
        name: 'Bombardment Execution',
        description: 'Deliver 1.2 opportunities per interaction consistently',
        steps: [
          'Identify 2-3 related opportunities for current focus',
          'Present primary opportunity (highest fit)',
          'Add 1-2 secondary opportunities ("also consider...")',
          'Pre-qualify: Only suggest if ≥60% fit score',
          'Time-bound: Include deadlines for urgency'
        ],
        when_to_use: 'Every coaching interaction'
      },
      {
        name: 'Buffer Maintenance',
        description: 'Maintain 3:1 buffer ratio (3 opportunities → 1 application)',
        steps: [
          'Track opportunity pipeline depth',
          'Ensure 3+ opportunities always in pipeline',
          'Replenish after applications submitted',
          'Adjust bombardment rate if buffer drops below 3:1'
        ]
      },
      {
        name: 'Rapid Recovery Protocol',
        description: 'Recover from rejection in <72 hours with new opportunities',
        steps: [
          'Detect rejection event',
          'Immediately suggest 2-3 alternative opportunities',
          'Frame alternatives as "even better fit"',
          'Maintain momentum without dwelling on rejection'
        ],
        when_to_use: 'When student reports rejection or setback'
      }
    ],

    techniques: [
      { name: 'Opportunity Counting', action: 'Count opportunities delivered per interaction, target 1.2 average' },
      { name: 'Fit Scoring', action: 'Score opportunity fit 0-10, only suggest if ≥6' },
      { name: 'Pipeline Depth Check', action: 'Verify 3+ opportunities in student pipeline' },
      { name: 'Recovery Timing', action: 'Trigger new opportunities within 72hrs of rejection' }
    ],

    chips: [
      {
        type: 'formula',
        name: 'Pipeline Mathematics',
        content: {
          opportunities_per_interaction: 1.2,
          application_rate: 0.70,
          win_rate: 0.33,
          buffer_ratio: 3.0,
          recovery_time_hours: 72,
          formula: '1.2 opp/interaction × 70% application × 33% win = sustained momentum'
        }
      },
      {
        type: 'data',
        name: 'Opportunity Types by Domain',
        content: {
          awards: ['competitions', 'honors', 'recognition programs'],
          programs: ['summer programs', 'research opportunities', 'internships'],
          scholarships: ['merit scholarships', 'essay contests', 'external funding'],
          projects: ['hackathons', 'open source', 'independent projects'],
          leadership: ['club founding', 'officer positions', 'initiatives']
        }
      },
      {
        type: 'template',
        name: 'Opportunity Presentation Template',
        content: {
          primary: 'Based on your [profile aspect], I recommend [opportunity]. [Fit reasoning]. Deadline: [date].',
          secondary: 'Also consider: [opportunity 1], [opportunity 2]. These align with [another profile aspect].'
        }
      }
    ],

    metrics: {
      success_criteria: [
        '1.2 opportunities delivered per interaction (average)',
        '70% of opportunities result in applications',
        '3:1 buffer ratio maintained',
        '<72 hour recovery time from rejection to new opportunity'
      ],
      validation: 'Track opportunity delivery rate and student application behavior',
      target_metrics: {
        opportunities_per_interaction: 1.2,
        application_conversion_rate: 0.70,
        buffer_ratio: 3.0,
        recovery_time_hours: 72
      }
    },

    triggers: {
      conditions: [
        // Always active - runs on every query
        'recommend',
        'suggest',
        'what should',
        'next steps',
        'opportunities',
        'apply',
        'consider'
      ]
    }
  };

  /**
   * Process query and return opportunity recommendations
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    try {
      // Extract facts
      const narrative = facts.getValueByType('unique_narrative') as string;
      const activities = facts.getValueByType('activity_data') as any[];
      const interests = facts.getValueByType('interests') as string[];
      const targetSchools = facts.getValueByType('target_schools') as string[];

      // Generate opportunities based on context
      const opportunities = this.generateOpportunities(
        query,
        narrative,
        activities,
        interests,
        targetSchools
      );

      // Filter by fit score (≥6) and take top 1-2
      const recommendedOpportunities = opportunities
        .filter(opp => opp.fit_score >= 6)
        .sort((a, b) => b.fit_score - a.fit_score)
        .slice(0, 2);  // Target 1.2 average: sometimes 1, sometimes 2

      // Calculate if we're maintaining pipeline metrics
      const pipelineHealth = this.assessPipelineHealth(recommendedOpportunities.length);

      return {
        type_id: this.type_id,
        component: 'opportunities',
        data: {
          opportunities: recommendedOpportunities,
          pipeline_health: pipelineHealth,
          bombardment_rate: recommendedOpportunities.length,
          target_rate: 1.2
        },
        confidence: 0.85,
        metadata: {
          opportunities_generated: opportunities.length,
          opportunities_recommended: recommendedOpportunities.length,
          fit_threshold: 6
        },
        chips_used: ['Pipeline Mathematics', 'Opportunity Types by Domain'],
        triggered: true
      };

    } catch (error) {
      console.error('Opportunity Pipeline processing error:', error);
      return {
        type_id: this.type_id,
        component: 'opportunities',
        data: { opportunities: [] },
        confidence: 0,
        triggered: true
      };
    }
  }

  /**
   * Generate opportunity recommendations based on context
   */
  private generateOpportunities(
    query: AgentQuery,
    narrative: string,
    activities: any[],
    interests: string[],
    targetSchools: string[]
  ): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Opportunity generation logic based on context
    // This is simplified - in production would query opportunity database

    // Example: If query about awards and student has CS focus
    if (query.query.toLowerCase().includes('award') && narrative?.toLowerCase().includes('computer')) {
      opportunities.push({
        opportunity_id: 'ncwit_2024',
        type: 'award',
        name: 'NCWIT Aspirations in Computing',
        description: 'National award for women in computing',
        deadline: 'October 1',
        fit_score: 9,
        effort_estimate: 'medium',
        roi_potential: 'high',
        reasoning: 'Perfect fit for female CS students with impact-driven projects'
      });

      opportunities.push({
        opportunity_id: 'congressional_app_2024',
        type: 'award',
        name: 'Congressional App Challenge',
        description: 'Regional app competition',
        deadline: 'November 1',
        fit_score: 8,
        effort_estimate: 'medium',
        roi_potential: 'high',
        reasoning: 'Regional competition with higher win probability'
      });
    }

    // Example: If query about summer programs
    if (query.query.toLowerCase().includes('summer') || query.query.toLowerCase().includes('program')) {
      opportunities.push({
        opportunity_id: 'mit_wise',
        type: 'program',
        name: 'MIT WISE (Women in Science and Engineering)',
        description: 'Summer program for women in STEM',
        deadline: 'January 15',
        fit_score: 8,
        effort_estimate: 'high',
        roi_potential: 'high',
        reasoning: 'Prestigious program aligned with STEM focus'
      });
    }

    // Add 1-2 related opportunities based on profile
    if (narrative?.toLowerCase().includes('storytelling') || narrative?.toLowerCase().includes('creative')) {
      opportunities.push({
        opportunity_id: 'scholastic_2024',
        type: 'award',
        name: 'Scholastic Art & Writing Awards',
        description: 'Creative work recognition',
        deadline: 'December 15',
        fit_score: 7,
        effort_estimate: 'low',
        roi_potential: 'medium',
        reasoning: 'Aligns with creative storytelling narrative'
      });
    }

    return opportunities;
  }

  /**
   * Assess pipeline health metrics
   */
  private assessPipelineHealth(opportunitiesDelivered: number): {
    status: 'healthy' | 'low' | 'dry';
    message: string;
  } {
    const target = this.components.chips[0].content.opportunities_per_interaction;

    if (opportunitiesDelivered >= target) {
      return {
        status: 'healthy',
        message: `Pipeline healthy: ${opportunitiesDelivered} opportunities (target: ${target})`
      };
    } else if (opportunitiesDelivered >= 1) {
      return {
        status: 'low',
        message: `Pipeline low: ${opportunitiesDelivered} opportunities (target: ${target})`
      };
    } else {
      return {
        status: 'dry',
        message: 'Pipeline dry: No opportunities found. Need to broaden search criteria.'
      };
    }
  }

  /**
   * Custom activation check - always activate
   */
  shouldActivate(query: AgentQuery, facts: FactSet): boolean {
    // Opportunity Pipeline is UNIVERSAL - always runs
    return true;
  }
}
