/**
 * TYPE-029: Program Application Strategy
 * Category: DOMAIN_SPECIFIC (SummerPrograms)
 *
 * Framework: Timeline Optimization + Reach/Match/Safety Balancing
 * - Deadline clustering (batch applications to minimize overwhelm)
 * - Selectivity balancing (2 reach : 3 match : 2 safety ratio)
 * - Application velocity tracking (ensure 60%+ completion rate)
 * - Essay reuse maximization (identify common prompts across programs)
 *
 * Core Algorithm:
 * Application Timeline = Deadline Grouping + Priority Ranking + Effort Distribution
 *
 * Priority Formula:
 * Priority Score = (Deadline_Urgency × 4) + (Program_Tier × 3) + (Fit_Score × 2) + (Essay_Reuse_Potential × 1)
 * Max Score: 100 points
 *
 * Output Format:
 * ```
 * ## 📅 Strategic Application Timeline (6 Programs)
 *
 * ### January 10-15 Batch (Due: Jan 10-15)
 * 1. **Yale Young Global Scholars** (Due Jan 10) - PRIORITY: 92/100
 *    - Tier: T2, Selectivity: Match
 *    - Essay reuse: 80% (leadership + global impact prompts)
 *    - Time needed: 4-6 hours
 *
 * 2. **MIT RSI** (Due Jan 28) - PRIORITY: 98/100
 *    - Tier: T1, Selectivity: Reach
 *    - Essay reuse: 60% (research experience prompt)
 *    - Time needed: 8-10 hours (recommendation letters!)
 *
 * ### February 1-15 Batch (Due: Feb 1-15)
 * 3. **Garcia Summer Scholars** (Due Feb 15) - PRIORITY: 88/100
 * ...
 *
 * ### Portfolio Balance:
 * - Reach (2): RSI, Garcia
 * - Match (3): YYGS, Columbia SHP, SSP
 * - Safety (1): [Local university program]
 * ```
 */

import { IntelligenceType, AgentQuery, FactSet, IntelligenceResult } from '../../facts/types.js';
import { FactCategory } from '../../facts/types.js';

interface ProgramApplicationPlan {
  program_id: string;
  program_name: string;
  deadline: string;
  deadline_date: Date;
  priority_score: number;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  selectivity_category: 'reach' | 'match' | 'safety';
  essay_reuse_potential: number; // 0-100%
  estimated_hours: string;
  batch_group: string; // e.g., "January 10-15 Batch"
  strategic_notes: string;
}

interface ApplicationTimeline {
  batches: {
    batch_name: string;
    batch_window: string;
    programs: ProgramApplicationPlan[];
  }[];
  portfolio_balance: {
    reach_count: number;
    match_count: number;
    safety_count: number;
    total_count: number;
  };
  total_estimated_hours: number;
  essay_reuse_opportunities: string[];
}

/**
 * Program Application Strategy Intelligence Type
 *
 * Core Technique: Deadline clustering + reach/match/safety balancing
 * Based on coaching pattern: "Apply strategically to avoid overwhelm"
 */
export class ProgramApplicationStrategy implements IntelligenceType {
  type_id = 'TYPE-029';
  name = 'Program Application Strategy';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query and facts to generate application strategy
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {

    // Check if application strategy query
    if (!this.shouldTrigger(query)) {
      return {
        type_id: this.type_id,
        triggered: false,
        data: null,
      };
    }

    // Extract facts
    const profileFact = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE)[0];
    const activitiesFacts = facts.getFactsByCategory(FactCategory.ACTIVITY_DATA);
    const assessmentFacts = facts.getFactsByCategory(FactCategory.ASSESSMENT_DATA);

    if (!profileFact) {
      return {
        type_id: this.type_id,
        triggered: false,
        data: { error: 'Missing student profile data' },
      };
    }

    // Generate application timeline
    const timeline = this.generateApplicationTimeline(profileFact, activitiesFacts, assessmentFacts);

    return {
      type_id: this.type_id,
      triggered: true,
      data: {
        timeline,
        strategy_summary: this.generateStrategySummary(timeline),
      },
    };
  }

  /**
   * Determine if this intelligence type should trigger
   */
  private shouldTrigger(query: AgentQuery): boolean {
    const queryLower = query.query.toLowerCase();
    const triggerKeywords = [
      'application strategy',
      'when should i apply',
      'application timeline',
      'how to apply',
      'application plan',
      'deadline',
      'reach match safety',
      'how many program',
    ];

    return triggerKeywords.some((keyword) => queryLower.includes(keyword));
  }

  /**
   * Generate strategic application timeline with deadline clustering
   */
  private generateApplicationTimeline(
    profileFact: any,
    activitiesFacts: any[],
    assessmentFacts: any[]
  ): ApplicationTimeline {
    // Hardcoded programs for v19.0 (will be DB-driven in v20.0)
    const targetPrograms: ProgramApplicationPlan[] = [
      {
        program_id: 'rsi-2025',
        program_name: 'MIT Research Science Institute (RSI)',
        deadline: 'January 28, 2025',
        deadline_date: new Date('2025-01-28'),
        priority_score: 0, // will calculate
        tier: 'T1',
        selectivity_category: 'reach',
        essay_reuse_potential: 60,
        estimated_hours: '8-10 hours',
        batch_group: '',
        strategic_notes: 'Strong recommendation letters critical. Start early!',
      },
      {
        program_id: 'yygs-2025',
        program_name: 'Yale Young Global Scholars (YYGS)',
        deadline: 'January 10, 2025',
        deadline_date: new Date('2025-01-10'),
        priority_score: 0,
        tier: 'T2',
        selectivity_category: 'match',
        essay_reuse_potential: 80,
        estimated_hours: '4-6 hours',
        batch_group: '',
        strategic_notes: 'Leadership + global impact essays highly reusable',
      },
      {
        program_id: 'ssp-2025',
        program_name: 'Summer Science Program (SSP)',
        deadline: 'February 1, 2025',
        deadline_date: new Date('2025-02-01'),
        priority_score: 0,
        tier: 'T2',
        selectivity_category: 'match',
        essay_reuse_potential: 70,
        estimated_hours: '5-7 hours',
        batch_group: '',
        strategic_notes: 'STEM passion essay reusable for other programs',
      },
      {
        program_id: 'garcia-summer-2025',
        program_name: 'Garcia Summer Scholars Program',
        deadline: 'February 15, 2025',
        deadline_date: new Date('2025-02-15'),
        priority_score: 0,
        tier: 'T2',
        selectivity_category: 'reach',
        essay_reuse_potential: 65,
        estimated_hours: '6-8 hours',
        batch_group: '',
        strategic_notes: 'Research proposal required - allocate extra time',
      },
      {
        program_id: 'columbia-shp-2025',
        program_name: 'Columbia Science Honors Program',
        deadline: 'March 1, 2025',
        deadline_date: new Date('2025-03-01'),
        priority_score: 0,
        tier: 'T2',
        selectivity_category: 'match',
        essay_reuse_potential: 75,
        estimated_hours: '4-5 hours',
        batch_group: '',
        strategic_notes: 'Science interest essay reusable',
      },
      {
        program_id: 'local-university-2025',
        program_name: 'Local University Summer Research Program',
        deadline: 'March 15, 2025',
        deadline_date: new Date('2025-03-15'),
        priority_score: 0,
        tier: 'T3',
        selectivity_category: 'safety',
        essay_reuse_potential: 85,
        estimated_hours: '2-3 hours',
        batch_group: '',
        strategic_notes: 'Safety option - easier application process',
      },
    ];

    // Calculate priority scores
    targetPrograms.forEach((program) => {
      program.priority_score = this.calculatePriorityScore(program);
    });

    // Sort by deadline
    targetPrograms.sort((a, b) => a.deadline_date.getTime() - b.deadline_date.getTime());

    // Create deadline batches (group by ~2-week windows)
    const batches = this.createDeadlineBatches(targetPrograms);

    // Calculate portfolio balance
    const portfolio_balance = this.calculatePortfolioBalance(targetPrograms);

    // Calculate total hours
    const total_estimated_hours = targetPrograms.reduce((sum, program) => {
      const hours = parseInt(program.estimated_hours.split('-')[0], 10);
      return sum + hours;
    }, 0);

    // Identify essay reuse opportunities
    const essay_reuse_opportunities = this.identifyEssayReuseOpportunities(targetPrograms);

    return {
      batches,
      portfolio_balance,
      total_estimated_hours,
      essay_reuse_opportunities,
    };
  }

  /**
   * Calculate priority score for application
   *
   * Formula: (Deadline_Urgency × 4) + (Program_Tier × 3) + (Fit_Score × 2) + (Essay_Reuse × 1)
   */
  private calculatePriorityScore(program: ProgramApplicationPlan): number {
    // Deadline urgency (0-10): How soon is deadline?
    const daysUntilDeadline = Math.max(
      0,
      Math.floor((program.deadline_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    const deadlineUrgency = Math.max(0, 10 - Math.floor(daysUntilDeadline / 10));

    // Program tier (0-10)
    const tierScores = { T1: 10, T2: 7, T3: 5, T4: 3 };
    const programTier = tierScores[program.tier];

    // Fit score (assuming 8/10 for now - will be calculated in v20.0)
    const fitScore = 8;

    // Essay reuse score (0-10)
    const essayReuseScore = program.essay_reuse_potential / 10;

    return deadlineUrgency * 4 + programTier * 3 + fitScore * 2 + essayReuseScore * 1;
  }

  /**
   * Create deadline batches (group applications by ~2-week windows)
   */
  private createDeadlineBatches(programs: ProgramApplicationPlan[]): {
    batch_name: string;
    batch_window: string;
    programs: ProgramApplicationPlan[];
  }[] {
    const batches: {
      batch_name: string;
      batch_window: string;
      programs: ProgramApplicationPlan[];
    }[] = [];

    let currentBatchStart: Date | null = null;
    let currentBatchPrograms: ProgramApplicationPlan[] = [];

    programs.forEach((program, index) => {
      if (
        !currentBatchStart ||
        program.deadline_date.getTime() - currentBatchStart.getTime() > 14 * 24 * 60 * 60 * 1000
      ) {
        // New batch (>14 days gap)
        if (currentBatchPrograms.length > 0) {
          batches.push({
            batch_name: this.formatBatchName(currentBatchStart!),
            batch_window: this.formatBatchWindow(currentBatchPrograms),
            programs: currentBatchPrograms,
          });
        }
        currentBatchStart = program.deadline_date;
        currentBatchPrograms = [program];
      } else {
        // Add to current batch
        currentBatchPrograms.push(program);
      }

      // Push final batch
      if (index === programs.length - 1 && currentBatchPrograms.length > 0) {
        batches.push({
          batch_name: this.formatBatchName(currentBatchStart!),
          batch_window: this.formatBatchWindow(currentBatchPrograms),
          programs: currentBatchPrograms,
        });
      }
    });

    return batches;
  }

  /**
   * Format batch name (e.g., "January 10-28 Batch")
   */
  private formatBatchName(batchStart: Date): string {
    const month = batchStart.toLocaleString('en-US', { month: 'long' });
    const startDay = batchStart.getDate();
    return `${month} ${startDay} Batch`;
  }

  /**
   * Format batch window (e.g., "Due: Jan 10-28")
   */
  private formatBatchWindow(programs: ProgramApplicationPlan[]): string {
    if (programs.length === 0) return '';
    const earliest = programs[0].deadline_date;
    const latest = programs[programs.length - 1].deadline_date;

    const monthShort = earliest.toLocaleString('en-US', { month: 'short' });
    return `Due: ${monthShort} ${earliest.getDate()}-${latest.getDate()}`;
  }

  /**
   * Calculate portfolio balance (reach/match/safety)
   */
  private calculatePortfolioBalance(programs: ProgramApplicationPlan[]): {
    reach_count: number;
    match_count: number;
    safety_count: number;
    total_count: number;
  } {
    const reach_count = programs.filter((p) => p.selectivity_category === 'reach').length;
    const match_count = programs.filter((p) => p.selectivity_category === 'match').length;
    const safety_count = programs.filter((p) => p.selectivity_category === 'safety').length;

    return {
      reach_count,
      match_count,
      safety_count,
      total_count: programs.length,
    };
  }

  /**
   * Identify essay reuse opportunities across programs
   */
  private identifyEssayReuseOpportunities(programs: ProgramApplicationPlan[]): string[] {
    return [
      'Leadership + global impact essay reusable across YYGS, Columbia SHP',
      'Research experience essay reusable across RSI, Garcia, SSP',
      'STEM passion essay reusable across SSP, Columbia SHP, Local University',
      'Community impact essay reusable across YYGS, Local University',
    ];
  }

  /**
   * Generate strategy summary text
   */
  private generateStrategySummary(timeline: ApplicationTimeline): string {
    const { reach_count, match_count, safety_count, total_count } = timeline.portfolio_balance;

    return `Strategic application plan with ${total_count} programs: ${reach_count} reach, ${match_count} match, ${safety_count} safety. Timeline organized into ${timeline.batches.length} deadline batches to minimize overwhelm. Total estimated time: ${timeline.total_estimated_hours} hours. High essay reuse potential (${timeline.essay_reuse_opportunities.length} opportunities identified).`;
  }
}
