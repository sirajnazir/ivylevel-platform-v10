/**
 * TYPE-027: Quick Wins Strategy
 *
 * Domain-Specific Intelligence Type for Awards Agent
 *
 * Purpose: Build momentum through 8-week phased approach targeting
 * achievable wins that compound into larger recognition.
 *
 * Formula: Foundation (Week 1-2) → Recognition (Week 3-6) → Scale (Week 7-8)
 *
 * Data Source:
 * - /data/coaching_intelligence/extractions/huda_assess_plus_gameplan/02-B-Huda-GamePlan-Creation.jsonl (Line 9)
 * - Quarterly momentum building patterns
 * - 2-week competition targeting
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
 * Quick Win opportunity
 */
export interface QuickWin {
  win_id: string;
  name: string;
  type: 'award' | 'project' | 'achievement';
  timeline: string;        // e.g., "2 weeks", "4 weeks"
  effort_level: 'low' | 'medium' | 'high';
  impact_level: 'low' | 'medium' | 'high';
  phase: 'foundation' | 'recognition' | 'scale';
  actionable_steps: string[];
  success_criteria: string;
  compounds_to?: string;   // What this enables later
}

/**
 * 8-Week momentum plan
 */
export interface MomentumPlan {
  phase_1_foundation: QuickWin[];   // Week 1-2
  phase_2_recognition: QuickWin[];  // Week 3-6
  phase_3_scale: QuickWin[];        // Week 7-8
  total_timeline: string;
  expected_outcomes: string[];
}

/**
 * Quick Wins Strategy Intelligence Type
 */
export class QuickWinsStrategy extends BaseIntelligenceType {
  type_id = 'TYPE-027';
  name = 'Quick Wins Strategy';
  category = 'DOMAIN_SPECIFIC' as const;
  description = '8-week momentum engine through phased quick wins';

  components: IntelligenceComponents = {
    framework: {
      name: 'Quick Wins Momentum Framework',
      description: 'Build confidence and credentials through achievable wins that compound',
      mental_model: 'Like building a snowball: small wins → momentum → bigger wins. Each win enables the next.'
    },

    tactics: [
      {
        name: 'Phase 1: Foundation (Week 1-2)',
        description: 'Low-hanging fruit to build immediate momentum',
        steps: [
          'Identify 2-3 tasks completable in <2 weeks',
          'Focus on setup activities (website, profiles, documentation)',
          'Target low-effort, visible progress',
          'Examples: Launch project website, create demo video, write first blog post'
        ],
        when_to_use: 'When student needs confidence boost or starting from scratch'
      },
      {
        name: 'Phase 2: Recognition (Week 3-6)',
        description: 'Submit to achievable competitions and programs',
        steps: [
          'Apply to 2-4 competitions with good odds',
          'Target regional/niche competitions (less saturated)',
          'Focus on competitions with 2-4 week timelines',
          'Examples: School-level awards, regional competitions, essay contests',
          'Submit applications while building phase 1 projects'
        ]
      },
      {
        name: 'Phase 3: Scale (Week 7-8)',
        description: 'Leverage phase 1-2 wins for bigger opportunities',
        steps: [
          'Use foundation work as portfolio',
          'Reference phase 2 submissions in applications',
          'Target slightly more competitive opportunities',
          'Document everything for future applications',
          'Examples: National competitions, using semifinalist status as credential'
        ]
      },
      {
        name: '2-Week Competition Targeting',
        description: 'Identify competitions with short submission-to-result cycles',
        steps: [
          'Filter competitions by result timeline (<4 weeks)',
          'Prioritize school/regional level (faster results)',
          'Target niche categories (less competition)',
          'Apply to 3-5 simultaneously (portfolio approach)',
          'Use rejections as learning, not setbacks'
        ],
        when_to_use: 'When student has <3 months until major deadlines'
      }
    ],

    techniques: [
      { name: 'Effort-Impact Matrix', action: 'Plot opportunities on low/high effort × low/high impact grid, prioritize high-impact + low-effort' },
      { name: 'Compound Mapping', action: 'Identify how each win enables next opportunity (e.g., website → enables award applications)' },
      { name: 'Timeline Compression', action: 'Parallel-process multiple quick wins simultaneously' },
      { name: 'Momentum Tracking', action: 'Celebrate each completion to maintain psychological momentum' }
    ],

    chips: [
      {
        type: 'data',
        name: '8-Week Momentum Timeline',
        content: {
          week_1_2: 'Foundation - Setup & Visible Progress',
          week_3_6: 'Recognition - Submit to achievable competitions',
          week_7_8: 'Scale - Leverage wins for bigger opportunities',
          total_expected_outcomes: '1-3 wins, 3-5 applications, portfolio ready'
        }
      },
      {
        type: 'template',
        name: 'Quick Win Identification Template',
        content: {
          criteria: {
            timeline: '<4 weeks',
            effort: 'low or medium',
            impact: 'medium or high',
            compounds: 'enables future opportunities'
          },
          examples: [
            'Launch project website (2 weeks, low effort, medium impact)',
            'Submit to school award (1 week, low effort, low-medium impact)',
            'Create demo video (1 week, medium effort, medium impact)',
            'Apply to regional competition (2 weeks, medium effort, high impact)'
          ]
        }
      },
      {
        type: 'data',
        name: '2-Week Competitions Database',
        content: {
          school_level: ['School science fair', 'School writing contest', 'Local art show'],
          regional: ['Regional coding competition', 'District app challenge', 'Local nonprofit partnerships'],
          online: ['Online hackathons', 'Essay contests', 'Design challenges'],
          timeline: 'Results within 2-4 weeks'
        }
      }
    ],

    metrics: {
      success_criteria: [
        '1-3 wins achieved within 8 weeks',
        '3-5 applications submitted',
        'Portfolio/website launched',
        'Momentum maintained (student reports increased confidence)'
      ],
      validation: 'Track completion rate and student confidence/motivation levels',
      target_metrics: {
        wins_8_weeks: 2,
        applications_submitted: 4,
        portfolio_completed: 1,
        confidence_increase: 'qualitative'
      }
    },

    triggers: {
      conditions: [
        'quick',
        'fast',
        'soon',
        'momentum',
        'confidence',
        'easy',
        'achievable',
        'short term',
        'immediate',
        'weeks',
        'boost'
      ]
    }
  };

  /**
   * Process query and return quick wins strategy
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    // Check if this intelligence should activate
    if (!this.shouldActivate(query, facts)) {
      return this.createInactiveResult('quick_wins');
    }

    try {
      // Extract facts
      const activities = facts.getValueByType('activity_data') as any[];
      const narrative = facts.getValueByType('unique_narrative') as string;
      const timeRemaining = facts.getValueByType('time_remaining_weeks') as number;

      // Generate 8-week momentum plan
      const momentumPlan = this.generate8WeekPlan(activities, narrative, timeRemaining);

      // Identify immediate quick wins (next 2 weeks)
      const immediateWins = momentumPlan.phase_1_foundation;

      return {
        type_id: this.type_id,
        component: 'quick_wins',
        data: {
          momentum_plan: momentumPlan,
          immediate_wins: immediateWins,
          timeline: '8 weeks',
          expected_outcomes: momentumPlan.expected_outcomes
        },
        confidence: 0.85,
        metadata: {
          phase_1_count: momentumPlan.phase_1_foundation.length,
          phase_2_count: momentumPlan.phase_2_recognition.length,
          phase_3_count: momentumPlan.phase_3_scale.length
        },
        chips_used: ['8-Week Momentum Timeline', 'Quick Win Identification Template'],
        triggered: true
      };

    } catch (error) {
      console.error('Quick Wins processing error:', error);
      return {
        type_id: this.type_id,
        component: 'quick_wins',
        data: { error: 'Failed to generate quick wins strategy' },
        confidence: 0,
        triggered: true
      };
    }
  }

  /**
   * Generate 8-week momentum plan
   */
  private generate8WeekPlan(
    activities: any[],
    narrative: string,
    timeRemaining: number
  ): MomentumPlan {
    // Phase 1: Foundation (Week 1-2) - Setup and visible progress
    const phase_1_foundation: QuickWin[] = [
      {
        win_id: 'foundation_1',
        name: 'Launch Project Website/Portfolio',
        type: 'project',
        timeline: '1-2 weeks',
        effort_level: 'low',
        impact_level: 'medium',
        phase: 'foundation',
        actionable_steps: [
          'Choose platform (GitHub Pages, Wix, or portfolio site)',
          'Create 3-5 page structure (Home, About, Projects, Contact)',
          'Document current project with images/demo',
          'Publish and share link'
        ],
        success_criteria: 'Live website with at least 1 documented project',
        compounds_to: 'Website URL for all future applications'
      },
      {
        win_id: 'foundation_2',
        name: 'Create Demo Video or Blog Post',
        type: 'project',
        timeline: '1 week',
        effort_level: 'low',
        impact_level: 'medium',
        phase: 'foundation',
        actionable_steps: [
          'Record 2-3 minute demo of project',
          'OR write 500-word blog post about project journey',
          'Post on YouTube/Medium/portfolio site',
          'Share on social media'
        ],
        success_criteria: 'Published content showcasing work',
        compounds_to: 'Content for applications and social proof'
      }
    ];

    // Phase 2: Recognition (Week 3-6) - Achievable competitions
    const phase_2_recognition: QuickWin[] = [
      {
        win_id: 'recognition_1',
        name: 'Submit to School/Regional Award',
        type: 'award',
        timeline: '1 week application, 2-4 weeks results',
        effort_level: 'medium',
        impact_level: 'high',
        phase: 'recognition',
        actionable_steps: [
          'Identify 2-3 school or regional competitions',
          'Use website/portfolio as application portfolio',
          'Write 300-500 word application essay',
          'Submit to all 2-3 simultaneously'
        ],
        success_criteria: 'Submitted to 2-3 competitions',
        compounds_to: 'Semifinalist/finalist status or win for resume'
      },
      {
        win_id: 'recognition_2',
        name: 'Apply to 2-Week Online Competition',
        type: 'award',
        timeline: '2 weeks',
        effort_level: 'medium',
        impact_level: 'medium',
        phase: 'recognition',
        actionable_steps: [
          'Find online hackathon or essay contest',
          'Prepare submission using existing work',
          'Submit and document participation',
          'Network with other participants'
        ],
        success_criteria: 'Participation certificate or recognition',
        compounds_to: 'Additional credential and networking'
      }
    ];

    // Phase 3: Scale (Week 7-8) - Leverage wins
    const phase_3_scale: QuickWin[] = [
      {
        win_id: 'scale_1',
        name: 'Apply to National Competition Using Portfolio',
        type: 'award',
        timeline: '1-2 weeks',
        effort_level: 'high',
        impact_level: 'high',
        phase: 'scale',
        actionable_steps: [
          'Target 1-2 national competitions (NCWIT, Congressional App)',
          'Leverage website, portfolio, and phase 2 wins',
          'Write strong application using template',
          'Reference semifinalist/participant status if applicable'
        ],
        success_criteria: 'Submitted to 1-2 national competitions',
        compounds_to: 'Potential national recognition'
      }
    ];

    return {
      phase_1_foundation,
      phase_2_recognition,
      phase_3_scale,
      total_timeline: '8 weeks',
      expected_outcomes: [
        'Portfolio/website live',
        '2-4 competition applications submitted',
        '1-3 wins or recognitions',
        'Increased confidence and momentum',
        'Foundation for larger opportunities'
      ]
    };
  }

  /**
   * Custom activation check
   */
  shouldActivate(query: AgentQuery, facts: FactSet): boolean {
    const lowerQuery = query.query.toLowerCase();

    // Activate if query mentions quick wins, momentum, or urgency
    const quickWinKeywords = ['quick', 'fast', 'soon', 'momentum', 'boost', 'immediate', 'short term', 'achievable', 'easy wins'];

    return quickWinKeywords.some(keyword => lowerQuery.includes(keyword));
  }
}
