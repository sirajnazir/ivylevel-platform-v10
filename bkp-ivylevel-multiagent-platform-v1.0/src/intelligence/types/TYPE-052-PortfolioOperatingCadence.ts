/**
 * TYPE-052: Portfolio Operating Cadence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent only)
 *
 * Purpose: Enforces Monday→Sunday weekly operating rhythm for consistent execution
 *
 * Framework: 7-Day Weekly Cadence
 * - Monday: Prioritize (P0/P1 selection, week planning)
 * - Tuesday-Thursday: Produce (deep work blocks, artifact creation)
 * - Friday: Publish (share progress publicly)
 * - Saturday: Propagate (amplify on social, email distribution)
 * - Sunday: Post-mortem (reflect, adjust next week)
 *
 * Pattern: Real Jenny coaching - predictable rhythm builds momentum
 * Data Source: W000-STRATEGY-002, W007 session transcript
 *
 * Created: 2025-10-29 (v20.1 ExecutionAgent Expansion)
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

/**
 * Day of week
 */
type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/**
 * Phase of week
 */
type WeekPhase = 'prioritize' | 'produce' | 'publish' | 'propagate' | 'post_mortem';

/**
 * Daily action plan
 */
interface DailyPlan {
  day: DayOfWeek;
  phase: WeekPhase;
  focus: string; // Primary focus for the day
  time_blocks: TimeBlock[];
  energy_allocation: EnergyAllocation;
  recommended_actions: string[];
  proof_target: string | null; // What proof should be generated this day
}

/**
 * Time block (2-4 hour deep work session)
 */
interface TimeBlock {
  block_id: string;
  start_time: string; // "09:00", "14:00", "19:00"
  duration_hours: number; // 2-4 hours
  activity_type: 'deep_work' | 'admin' | 'communication' | 'review' | 'rest';
  specific_tasks: string[]; // Task IDs from TYPE-051 decomposition
  energy_required: 'high' | 'medium' | 'low';
}

/**
 * Energy allocation for the day
 */
interface EnergyAllocation {
  deep_work_hours: number; // 0-6 hours
  admin_hours: number; // 0-2 hours
  communication_hours: number; // 0-2 hours
  rest_hours: number; // Family, breaks, recovery
  total_discretionary_hours: number; // Total available (typically 6-8 hours/day)
}

/**
 * Weekly cadence result
 */
interface PortfolioCadenceResult {
  current_day: DayOfWeek;
  current_phase: WeekPhase;
  daily_plans: DailyPlan[];
  week_summary: {
    total_deep_work_hours: number;
    total_admin_hours: number;
    total_communication_hours: number;
    proof_milestones: string[]; // List of proof artifacts expected this week
  };
  rhythm_health: {
    score: number; // 0-10 (10 = perfect cadence adherence)
    warnings: string[];
    recommendations: string[];
  };
}

export class PortfolioOperatingCadence implements IntelligenceType {
  type_id = 'TYPE-052';
  name = 'Portfolio Operating Cadence';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query to generate weekly operating cadence
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Determine current day of week
    const currentDay = this.getCurrentDay();

    // Determine current phase
    const currentPhase = this.getDayPhase(currentDay);

    // Generate daily plans for entire week
    const dailyPlans = this.generateWeeklyPlans(currentDay, facts);

    // Calculate week summary
    const weekSummary = this.calculateWeekSummary(dailyPlans);

    // Assess rhythm health
    const rhythmHealth = this.assessRhythmHealth(dailyPlans, currentDay);

    const result: PortfolioCadenceResult = {
      current_day: currentDay,
      current_phase: currentPhase,
      daily_plans: dailyPlans,
      week_summary: weekSummary,
      rhythm_health: rhythmHealth,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: 0.9,
      data: result,
    };
  }

  /**
   * Get current day of week
   */
  private getCurrentDay(): DayOfWeek {
    const now = new Date();
    const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, ...

    const days: DayOfWeek[] = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    return days[dayIndex];
  }

  /**
   * Determine phase based on day of week
   */
  private getDayPhase(day: DayOfWeek): WeekPhase {
    switch (day) {
      case 'Monday':
        return 'prioritize';
      case 'Tuesday':
      case 'Wednesday':
      case 'Thursday':
        return 'produce';
      case 'Friday':
        return 'publish';
      case 'Saturday':
        return 'propagate';
      case 'Sunday':
        return 'post_mortem';
    }
  }

  /**
   * Generate daily plans for entire week
   */
  private generateWeeklyPlans(currentDay: DayOfWeek, facts: FactSet): DailyPlan[] {
    const days: DayOfWeek[] = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    return days.map((day) => this.generateDailyPlan(day, facts));
  }

  /**
   * Generate plan for a specific day
   */
  private generateDailyPlan(day: DayOfWeek, facts: FactSet): DailyPlan {
    const phase = this.getDayPhase(day);

    switch (phase) {
      case 'prioritize':
        return this.generatePrioritizeDay(day);
      case 'produce':
        return this.generateProduceDay(day);
      case 'publish':
        return this.generatePublishDay(day);
      case 'propagate':
        return this.generatePropagateDay(day);
      case 'post_mortem':
        return this.generatePostMortemDay(day);
    }
  }

  /**
   * Monday: Prioritize
   */
  private generatePrioritizeDay(day: DayOfWeek): DailyPlan {
    return {
      day,
      phase: 'prioritize',
      focus: 'Week planning: Select P0/P1 outcomes, map execution timeline',
      time_blocks: [
        {
          block_id: 'monday-block-001',
          start_time: '09:00',
          duration_hours: 1,
          activity_type: 'review',
          specific_tasks: ['Review last week outcomes', 'Assess velocity', 'Identify blockers'],
          energy_required: 'medium',
        },
        {
          block_id: 'monday-block-002',
          start_time: '10:00',
          duration_hours: 2,
          activity_type: 'admin',
          specific_tasks: [
            'Select P0 outcome for week',
            'Break down into execution items',
            'Schedule time blocks for Tue-Thu',
          ],
          energy_required: 'high',
        },
        {
          block_id: 'monday-block-003',
          start_time: '19:00',
          duration_hours: 1,
          activity_type: 'communication',
          specific_tasks: ['Weekly sync with coach', 'Share week plan', 'Get feedback on priorities'],
          energy_required: 'medium',
        },
      ],
      energy_allocation: {
        deep_work_hours: 0,
        admin_hours: 3,
        communication_hours: 1,
        rest_hours: 4,
        total_discretionary_hours: 8,
      },
      recommended_actions: [
        'Review ExecutionAgent ladder position (TYPE-049)',
        'Calculate velocity from last week (TYPE-063)',
        'Select 1 P0 outcome with measurable proof milestone',
        'Block Tue-Thu calendar for deep work (protect time)',
        'Commit to week plan publicly (tweet or LinkedIn post)',
      ],
      proof_target: 'Week plan document (Google Doc with P0/P1 outcomes + time blocks)',
    };
  }

  /**
   * Tuesday-Thursday: Produce
   */
  private generateProduceDay(day: DayOfWeek): DailyPlan {
    const dayNumber = day === 'Tuesday' ? 1 : day === 'Wednesday' ? 2 : 3;

    return {
      day,
      phase: 'produce',
      focus: `Deep work day ${dayNumber}/3: Build artifacts, ship incremental proof`,
      time_blocks: [
        {
          block_id: `${day.toLowerCase()}-block-001`,
          start_time: '09:00',
          duration_hours: 3,
          activity_type: 'deep_work',
          specific_tasks: ['Execute P0 tasks', 'Create proof artifacts', 'Document progress'],
          energy_required: 'high',
        },
        {
          block_id: `${day.toLowerCase()}-block-002`,
          start_time: '14:00',
          duration_hours: 2,
          activity_type: 'deep_work',
          specific_tasks: ['Continue P0 execution', 'Iterate based on morning feedback'],
          energy_required: 'high',
        },
        {
          block_id: `${day.toLowerCase()}-block-003`,
          start_time: '18:00',
          duration_hours: 1,
          activity_type: 'admin',
          specific_tasks: ['Update progress log', 'Share screenshot/demo', 'Plan tomorrow'],
          energy_required: 'low',
        },
      ],
      energy_allocation: {
        deep_work_hours: 5,
        admin_hours: 1,
        communication_hours: 0,
        rest_hours: 2,
        total_discretionary_hours: 8,
      },
      recommended_actions: [
        'Protect morning deep work block (no meetings, no phone)',
        'Ship incremental proof by end of day (screenshot, demo link, code commit)',
        'Use Pomodoro technique (50min focus + 10min break)',
        'If blocked >2 hours, escalate to coach or pivot task',
        'Update velocity tracker with tasks completed',
      ],
      proof_target:
        dayNumber === 1
          ? 'Initial prototype or first draft'
          : dayNumber === 2
            ? 'Working demo or 80% complete artifact'
            : 'Polished version ready for Friday publish',
    };
  }

  /**
   * Friday: Publish
   */
  private generatePublishDay(day: DayOfWeek): DailyPlan {
    return {
      day,
      phase: 'publish',
      focus: 'Ship week outcome: Publish proof publicly, share with network',
      time_blocks: [
        {
          block_id: 'friday-block-001',
          start_time: '09:00',
          duration_hours: 2,
          activity_type: 'deep_work',
          specific_tasks: ['Final polish on P0 outcome', 'QA check', 'Prepare launch assets'],
          energy_required: 'medium',
        },
        {
          block_id: 'friday-block-002',
          start_time: '12:00',
          duration_hours: 1,
          activity_type: 'admin',
          specific_tasks: [
            'Deploy to production (GitHub, portfolio, etc)',
            'Write launch post (LinkedIn/Twitter)',
            'Prepare email update for teachers/mentors',
          ],
          energy_required: 'medium',
        },
        {
          block_id: 'friday-block-003',
          start_time: '15:00',
          duration_hours: 1,
          activity_type: 'communication',
          specific_tasks: ['Publish launch post', 'Share in relevant communities', 'Respond to initial feedback'],
          energy_required: 'high',
        },
      ],
      energy_allocation: {
        deep_work_hours: 2,
        admin_hours: 1,
        communication_hours: 1,
        rest_hours: 4,
        total_discretionary_hours: 8,
      },
      recommended_actions: [
        'Launch by noon (gives full afternoon for propagation)',
        'Share 3 places: LinkedIn + Twitter + relevant community (Reddit, Discord, etc)',
        'Include proof in launch post (screenshot, demo link, metrics)',
        'Tag teachers/mentors who helped (LoR engineering - TYPE-056)',
        'Document launch in portfolio (evidence for college apps)',
      ],
      proof_target:
        'Public artifact (GitHub repo, portfolio page, LinkedIn post with demo link)',
    };
  }

  /**
   * Saturday: Propagate
   */
  private generatePropagateDay(day: DayOfWeek): DailyPlan {
    return {
      day,
      phase: 'propagate',
      focus: 'Amplify reach: Share across all channels, engage with feedback',
      time_blocks: [
        {
          block_id: 'saturday-block-001',
          start_time: '10:00',
          duration_hours: 1,
          activity_type: 'communication',
          specific_tasks: [
            'Email update to teachers/mentors',
            'Share in school clubs/groups',
            'Cross-post to additional platforms',
          ],
          energy_required: 'medium',
        },
        {
          block_id: 'saturday-block-002',
          start_time: '14:00',
          duration_hours: 2,
          activity_type: 'communication',
          specific_tasks: [
            'Respond to all comments/feedback',
            'DM key people (teachers, potential LoR writers)',
            'Share user testimonials/reactions',
          ],
          energy_required: 'medium',
        },
      ],
      energy_allocation: {
        deep_work_hours: 0,
        admin_hours: 0,
        communication_hours: 3,
        rest_hours: 5,
        total_discretionary_hours: 8,
      },
      recommended_actions: [
        'Send personalized emails (not mass blast) to 5-10 key people',
        'Engage authentically with feedback (thank, iterate, incorporate)',
        'Capture testimonials for portfolio ("This helped me..." quotes)',
        'Identify potential LoR writers who engaged (Track in TYPE-056)',
        'Rest well - Saturday is light work day',
      ],
      proof_target:
        'Engagement evidence (email receipts, comment screenshots, testimonial quotes)',
    };
  }

  /**
   * Sunday: Post-mortem
   */
  private generatePostMortemDay(day: DayOfWeek): DailyPlan {
    return {
      day,
      phase: 'post_mortem',
      focus: 'Reflect and adjust: Assess week velocity, plan improvements',
      time_blocks: [
        {
          block_id: 'sunday-block-001',
          start_time: '15:00',
          duration_hours: 1,
          activity_type: 'review',
          specific_tasks: [
            'Calculate week velocity (TYPE-063)',
            'Review proof milestones achieved',
            'Identify what worked vs blockers',
          ],
          energy_required: 'medium',
        },
        {
          block_id: 'sunday-block-002',
          start_time: '16:00',
          duration_hours: 1,
          activity_type: 'admin',
          specific_tasks: [
            'Update execution ladder position (TYPE-049)',
            'Document lessons learned',
            'Draft rough plan for next week',
          ],
          energy_required: 'low',
        },
      ],
      energy_allocation: {
        deep_work_hours: 0,
        admin_hours: 1,
        communication_hours: 0,
        rest_hours: 7,
        total_discretionary_hours: 8,
      },
      recommended_actions: [
        'Honest velocity assessment (Were goals realistic? What slowed us down?)',
        'Celebrate wins (even small proof milestones count)',
        'Identify 1-2 process improvements for next week',
        'If velocity <0.8, escalate to coach (TYPE-055 blocking detection)',
        'Rest well - Sunday is recovery day',
      ],
      proof_target: 'Weekly reflection doc (velocity score + lessons learned + next week preview)',
    };
  }

  /**
   * Calculate week summary statistics
   */
  private calculateWeekSummary(dailyPlans: DailyPlan[]): {
    total_deep_work_hours: number;
    total_admin_hours: number;
    total_communication_hours: number;
    proof_milestones: string[];
  } {
    const totalDeepWork = dailyPlans.reduce((sum, plan) => sum + plan.energy_allocation.deep_work_hours, 0);
    const totalAdmin = dailyPlans.reduce((sum, plan) => sum + plan.energy_allocation.admin_hours, 0);
    const totalComm = dailyPlans.reduce((sum, plan) => sum + plan.energy_allocation.communication_hours, 0);

    const proofMilestones = dailyPlans
      .filter((plan) => plan.proof_target !== null)
      .map((plan) => `${plan.day}: ${plan.proof_target}`);

    return {
      total_deep_work_hours: totalDeepWork,
      total_admin_hours: totalAdmin,
      total_communication_hours: totalComm,
      proof_milestones: proofMilestones,
    };
  }

  /**
   * Assess rhythm health (adherence to cadence)
   */
  private assessRhythmHealth(
    dailyPlans: DailyPlan[],
    currentDay: DayOfWeek
  ): {
    score: number;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 10;

    // Check deep work distribution (should be concentrated Tue-Thu)
    const producePhase = dailyPlans.filter((p) => p.phase === 'produce');
    const produceDeepWork = producePhase.reduce((sum, p) => sum + p.energy_allocation.deep_work_hours, 0);

    if (produceDeepWork < 12) {
      score -= 2;
      warnings.push(`Only ${produceDeepWork} hours deep work Tue-Thu (target: 12-15 hours)`);
      recommendations.push('Protect Tue-Thu calendar: block 3-5 hours daily for deep work');
    }

    // Check for Friday publish proof
    const fridayPlan = dailyPlans.find((p) => p.day === 'Friday');
    if (!fridayPlan?.proof_target) {
      score -= 3;
      warnings.push('No public proof target for Friday publish');
      recommendations.push(
        'Plan Friday launch: Must have public artifact (GitHub, portfolio, LinkedIn post)'
      );
    }

    // Check for Monday prioritize
    const mondayPlan = dailyPlans.find((p) => p.day === 'Monday');
    if (mondayPlan && mondayPlan.energy_allocation.admin_hours < 2) {
      score -= 2;
      warnings.push('Insufficient Monday planning time (need 2-3 hours for prioritization)');
      recommendations.push('Block Monday morning for week planning (review, prioritize, schedule)');
    }

    // Check for Sunday reflection
    const sundayPlan = dailyPlans.find((p) => p.day === 'Sunday');
    if (!sundayPlan?.proof_target) {
      score -= 1;
      recommendations.push('Add Sunday reflection ritual: Calculate velocity + document lessons learned');
    }

    // Check for weekend rest
    const saturdayPlan = dailyPlans.find((p) => p.day === 'Saturday');
    const weekendWork =
      (saturdayPlan?.energy_allocation.deep_work_hours || 0) +
      (sundayPlan?.energy_allocation.deep_work_hours || 0);

    if (weekendWork > 4) {
      score -= 2;
      warnings.push(`${weekendWork} hours deep work on weekend (burnout risk)`);
      recommendations.push('Protect weekend for rest and propagation (communication, not deep work)');
    }

    return {
      score: Math.max(0, score),
      warnings,
      recommendations,
    };
  }
}
