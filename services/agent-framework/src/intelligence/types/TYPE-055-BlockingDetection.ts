/**
 * TYPE-055: Blocking Detection & Escalation Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: 2-Cycle Stall Triggers
 *
 * Purpose: Detect stalled tasks and apply escalation playbooks to unblock.
 * Prevents students from spinning wheels on blocked tasks for weeks.
 *
 * Algorithm:
 * 1. Scan all active tasks/outcomes
 * 2. Identify stalls: No progress for 2+ weeks (2 cycles)
 * 3. Apply escalation playbook:
 *    - **Scope Cut**: Reduce to MVP (10 users → 5 users, 500 words → 300 words)
 *    - **Ally Recruit**: Find collaborator (parent for logistics, peer for code, coach for strategy)
 *    - **Deadline Swap**: Move to next cycle (accept delay, adjust timeline)
 * 4. Calculate impact of each option
 * 5. Recommend highest-impact escalation
 *
 * Stall Detection Criteria:
 * - Task created 2+ weeks ago
 * - Zero progress updates in last 14 days
 * - Status = 'in_progress' or 'blocked'
 * - No completion_date set
 *
 * Escalation Playbook Logic:
 * - **Scope Cut** = Best when: Task too ambitious, unclear MVP, perfectionism
 * - **Ally Recruit** = Best when: Missing skill/resource, parent can help with logistics
 * - **Deadline Swap** = Best when: Other P0 tasks more urgent, temporary life constraint
 *
 * Data Sources:
 * - W000-STRATEGY-012 (Blocking patterns from coaching)
 * - Tasks table (status, last_updated, created_at)
 * - Outcomes table (priority, estimated_hours)
 * - Student weekly_vitals (stress signals, workload)
 *
 * Output: BlockingDetectionResult
 * - blocked_tasks: Tasks stalled 2+ weeks
 * - escalation_recommendations: Scope Cut / Ally Recruit / Deadline Swap
 * - timeline_adjustments: Impact on overall schedule
 * - intervention_priority: P0 (critical) / P1 (important) / P2 (nice to have)
 *
 * Created: 2025-10-29
 * Version: v20.3
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Escalation strategy types
 */
type EscalationStrategy = 'scope_cut' | 'ally_recruit' | 'deadline_swap';

/**
 * Blocked task details
 */
interface BlockedTask {
  task_id: string;
  task_name: string;
  outcome_name: string | null;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  days_stalled: number;
  last_update: string | null;
  blocking_reason: string; // Why it's stalled
  impact_if_dropped: string; // What happens if we abandon
}

/**
 * Escalation recommendation
 */
interface EscalationRecommendation {
  task_id: string;
  strategy: EscalationStrategy;
  rationale: string;
  action_steps: string[];
  estimated_time_savings: number; // Hours saved
  success_probability: number; // 0.0-1.0
}

/**
 * Scope cut option
 */
interface ScopeCutOption {
  original_scope: string;
  reduced_scope: string;
  reduction_percentage: number;
  proof_quality_impact: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Ally recruit option
 */
interface AllyRecruitOption {
  ally_type: 'parent' | 'peer' | 'teacher' | 'coach' | 'sibling';
  ally_contribution: string; // What they would do
  student_remaining_work: string; // What student still does
  coordination_overhead: number; // Hours to coordinate
}

/**
 * Deadline swap option
 */
interface DeadlineSwapOption {
  original_deadline: string;
  new_deadline: string;
  delay_weeks: number;
  downstream_impact: string; // Impact on other tasks
}

/**
 * Timeline adjustment
 */
interface TimelineAdjustment {
  outcome_name: string;
  original_completion_date: string;
  adjusted_completion_date: string;
  reason: string;
}

/**
 * Blocking detection result
 */
interface BlockingDetectionResult {
  blocked_tasks: BlockedTask[];
  escalation_recommendations: EscalationRecommendation[];
  scope_cut_options: ScopeCutOption[];
  ally_recruit_options: AllyRecruitOption[];
  deadline_swap_options: DeadlineSwapOption[];
  timeline_adjustments: TimelineAdjustment[];
  intervention_priority: 'P0' | 'P1' | 'P2';
}

export class BlockingDetection implements IntelligenceType {
  type_id = 'TYPE-055';
  name = 'Blocking Detection & Escalation';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.3';

  /**
   * Process blocking detection analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract task and outcome facts
    const taskFacts = facts.facts.filter(f => f.category === 'TASKS');
    const outcomeFacts = facts.facts.filter(f => f.category === 'OUTCOMES');

    // Detect blocked tasks (stalled 2+ weeks)
    const blockedTasks = this.detectBlockedTasks(taskFacts, outcomeFacts);

    // If no blocked tasks, return success state
    if (blockedTasks.length === 0) {
      return {
        type_id: this.type_id,
        triggered: false,
        confidence: 0.9,
        data: {
          blocked_tasks: [],
          escalation_recommendations: [],
          scope_cut_options: [],
          ally_recruit_options: [],
          deadline_swap_options: [],
          timeline_adjustments: [],
          intervention_priority: 'P2',
        },
      };
    }

    // Generate escalation recommendations for each blocked task
    const escalationRecommendations: EscalationRecommendation[] = [];
    const scopeCutOptions: ScopeCutOption[] = [];
    const allyRecruitOptions: AllyRecruitOption[] = [];
    const deadlineSwapOptions: DeadlineSwapOption[] = [];

    blockedTasks.forEach(blockedTask => {
      // Generate all three escalation options
      const scopeCut = this.generateScopeCutOption(blockedTask);
      const allyRecruit = this.generateAllyRecruitOption(blockedTask);
      const deadlineSwap = this.generateDeadlineSwapOption(blockedTask);

      scopeCutOptions.push(scopeCut);
      allyRecruitOptions.push(allyRecruit);
      deadlineSwapOptions.push(deadlineSwap);

      // Determine best escalation strategy
      const bestEscalation = this.selectBestEscalation(blockedTask, scopeCut, allyRecruit, deadlineSwap);
      escalationRecommendations.push(bestEscalation);
    });

    // Calculate timeline adjustments
    const timelineAdjustments = this.calculateTimelineAdjustments(blockedTasks, escalationRecommendations);

    // Determine intervention priority
    const interventionPriority = this.determineInterventionPriority(blockedTasks);

    const result: BlockingDetectionResult = {
      blocked_tasks: blockedTasks,
      escalation_recommendations: escalationRecommendations,
      scope_cut_options: scopeCutOptions,
      ally_recruit_options: allyRecruitOptions,
      deadline_swap_options: deadlineSwapOptions,
      timeline_adjustments: timelineAdjustments,
      intervention_priority: interventionPriority,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  /**
   * Detect blocked tasks (stalled 2+ weeks)
   */
  private detectBlockedTasks(taskFacts: any[], outcomeFacts: any[]): BlockedTask[] {
    const blockedTasks: BlockedTask[] = [];
    const now = Date.now();
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

    taskFacts.forEach(taskFact => {
      const task = taskFact.data;
      if (!task) return;

      // Check if task is in progress or blocked
      const status = task.status || task.task_status;
      if (status !== 'in_progress' && status !== 'blocked') return;

      // Check if stalled (no updates in 2+ weeks)
      const lastUpdate = task.last_updated || task.updated_at || task.created_at;
      if (!lastUpdate) return;

      const lastUpdateTime = new Date(lastUpdate).getTime();
      const daysStalled = Math.floor((now - lastUpdateTime) / (24 * 60 * 60 * 1000));

      if (daysStalled < 14) return; // Not stalled yet

      // Find associated outcome
      const outcomeId = task.outcome_id;
      const outcome = outcomeFacts.find(f => f.data?.outcome_id === outcomeId);

      // Determine blocking reason
      const blockingReason = task.blocking_reason || this.inferBlockingReason(task);

      // Determine impact if dropped
      const impactIfDropped = this.assessDropImpact(task, outcome?.data);

      blockedTasks.push({
        task_id: task.task_id || taskFact.fact_id,
        task_name: task.task_name || task.name || 'Unnamed task',
        outcome_name: outcome?.data?.outcome_name || null,
        priority: outcome?.data?.priority || 'P2',
        days_stalled: daysStalled,
        last_update: lastUpdate,
        blocking_reason: blockingReason,
        impact_if_dropped: impactIfDropped,
      });
    });

    return blockedTasks.sort((a, b) => {
      // Sort by priority (P0 first) then days stalled (most first)
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.days_stalled - a.days_stalled;
    });
  }

  /**
   * Infer blocking reason from task data
   */
  private inferBlockingReason(task: any): string {
    // Check for common blocking patterns
    if (task.task_name?.includes('user') || task.task_name?.includes('User')) {
      return 'User acquisition stalled (growth problem)';
    }
    if (task.task_name?.includes('code') || task.task_name?.includes('implement')) {
      return 'Technical implementation blocked (skill/time gap)';
    }
    if (task.task_name?.includes('research') || task.task_name?.includes('find')) {
      return 'Research/discovery stalled (decision paralysis)';
    }
    if (task.task_name?.includes('write') || task.task_name?.includes('essay')) {
      return 'Writing stalled (perfectionism or unclear direction)';
    }
    return 'Unknown blocker - needs investigation';
  }

  /**
   * Assess impact if task is dropped
   */
  private assessDropImpact(task: any, outcome: any): string {
    const priority = outcome?.priority || 'P2';

    if (priority === 'P0') {
      return '🚨 HIGH IMPACT: P0 outcome at risk if dropped';
    } else if (priority === 'P1') {
      return '⚠️ MEDIUM IMPACT: P1 outcome delayed if dropped';
    } else {
      return '✅ LOW IMPACT: P2/P3 outcome, can drop if needed';
    }
  }

  /**
   * Generate scope cut option
   */
  private generateScopeCutOption(blockedTask: BlockedTask): ScopeCutOption {
    // Pattern match common scope cuts
    let originalScope = blockedTask.task_name;
    let reducedScope = '';
    let reductionPercentage = 50; // Default 50% reduction
    let proofQualityImpact: 'none' | 'low' | 'medium' | 'high' = 'low';

    if (originalScope.includes('10') || originalScope.includes('users')) {
      reducedScope = originalScope.replace(/10|ten/i, '5');
      proofQualityImpact = 'low';
    } else if (originalScope.includes('500') || originalScope.includes('words')) {
      reducedScope = originalScope.replace(/500/i, '300');
      proofQualityImpact = 'none';
    } else if (originalScope.includes('complete') || originalScope.includes('full')) {
      reducedScope = originalScope.replace(/complete|full/i, 'MVP version of');
      reductionPercentage = 60;
      proofQualityImpact = 'medium';
    } else {
      reducedScope = `Simplified version: ${originalScope}`;
      reductionPercentage = 40;
      proofQualityImpact = 'low';
    }

    return {
      original_scope: originalScope,
      reduced_scope: reducedScope,
      reduction_percentage: reductionPercentage,
      proof_quality_impact: proofQualityImpact,
    };
  }

  /**
   * Generate ally recruit option
   */
  private generateAllyRecruitOption(blockedTask: BlockedTask): AllyRecruitOption {
    // Determine best ally type based on task pattern
    let allyType: 'parent' | 'peer' | 'teacher' | 'coach' | 'sibling' = 'parent';
    let allyContribution = '';
    let studentRemainingWork = '';
    let coordinationOverhead = 2; // Default 2 hours

    if (blockedTask.blocking_reason.includes('Technical') || blockedTask.task_name.includes('code')) {
      allyType = 'peer';
      allyContribution = 'Peer codes one component or debugs blocker';
      studentRemainingWork = 'Student integrates code and owns overall architecture';
      coordinationOverhead = 3;
    } else if (blockedTask.blocking_reason.includes('research') || blockedTask.task_name.includes('find')) {
      allyType = 'parent';
      allyContribution = 'Parent researches options and creates comparison spreadsheet';
      studentRemainingWork = 'Student reviews options and makes final decision';
      coordinationOverhead = 1;
    } else if (blockedTask.task_name.includes('write') || blockedTask.task_name.includes('essay')) {
      allyType = 'teacher';
      allyContribution = 'Teacher reviews draft and provides structural feedback';
      studentRemainingWork = 'Student revises based on feedback and owns content';
      coordinationOverhead = 2;
    } else {
      allyType = 'parent';
      allyContribution = 'Parent handles logistics (scheduling, materials, transportation)';
      studentRemainingWork = 'Student owns core work and decision-making';
      coordinationOverhead = 1;
    }

    return {
      ally_type: allyType,
      ally_contribution: allyContribution,
      student_remaining_work: studentRemainingWork,
      coordination_overhead: coordinationOverhead,
    };
  }

  /**
   * Generate deadline swap option
   */
  private generateDeadlineSwapOption(blockedTask: BlockedTask): DeadlineSwapOption {
    const originalDeadline = new Date();
    const newDeadline = new Date(originalDeadline);
    newDeadline.setDate(newDeadline.getDate() + 14); // Push 2 weeks

    const delayWeeks = 2;
    let downstreamImpact = '';

    if (blockedTask.priority === 'P0') {
      downstreamImpact = '⚠️ Delays P0 outcome - will cascade to other tasks in this outcome';
    } else if (blockedTask.priority === 'P1') {
      downstreamImpact = 'May delay P1 outcome completion by 1-2 weeks';
    } else {
      downstreamImpact = 'Low impact - P2/P3 tasks have flexibility';
    }

    return {
      original_deadline: originalDeadline.toISOString().split('T')[0],
      new_deadline: newDeadline.toISOString().split('T')[0],
      delay_weeks: delayWeeks,
      downstream_impact: downstreamImpact,
    };
  }

  /**
   * Select best escalation strategy
   */
  private selectBestEscalation(
    blockedTask: BlockedTask,
    scopeCut: ScopeCutOption,
    allyRecruit: AllyRecruitOption,
    deadlineSwap: DeadlineSwapOption
  ): EscalationRecommendation {
    // Decision logic based on blocking reason and priority
    let strategy: EscalationStrategy = 'scope_cut';
    let rationale = '';
    let actionSteps: string[] = [];
    let estimatedTimeSavings = 0;
    let successProbability = 0.8;

    // P0 tasks: Prefer scope cut or ally recruit (don't delay)
    if (blockedTask.priority === 'P0') {
      if (scopeCut.proof_quality_impact === 'none' || scopeCut.proof_quality_impact === 'low') {
        strategy = 'scope_cut';
        rationale = 'P0 task blocked - scope cut preserves deadline with minimal quality impact';
        actionSteps = [
          'Cut scope immediately',
          `New scope: ${scopeCut.reduced_scope}`,
          'Execute simplified version this week',
          'Reassess if full scope needed later',
        ];
        estimatedTimeSavings = 5;
        successProbability = 0.9;
      } else {
        strategy = 'ally_recruit';
        rationale = 'P0 task blocked - recruit ally to unblock without scope cut';
        actionSteps = [
          `Recruit ${allyRecruit.ally_type} for help`,
          `${allyRecruit.ally_type} does: ${allyRecruit.ally_contribution}`,
          `You do: ${allyRecruit.student_remaining_work}`,
          'Coordinate this week to unblock',
        ];
        estimatedTimeSavings = 4;
        successProbability = 0.7;
      }
    }
    // P1/P2 tasks: Consider deadline swap if other P0 tasks exist
    else {
      strategy = 'deadline_swap';
      rationale = 'P1/P2 task stalled - swap deadline to focus on higher priority work';
      actionSteps = [
        `Move deadline from ${deadlineSwap.original_deadline} to ${deadlineSwap.new_deadline}`,
        'Focus current capacity on P0 outcomes',
        'Revisit this task in 2 weeks with fresh perspective',
        'Re-evaluate if task still relevant at that time',
      ];
      estimatedTimeSavings = 3;
      successProbability = 0.95;
    }

    return {
      task_id: blockedTask.task_id,
      strategy: strategy,
      rationale: rationale,
      action_steps: actionSteps,
      estimated_time_savings: estimatedTimeSavings,
      success_probability: successProbability,
    };
  }

  /**
   * Calculate timeline adjustments based on escalations
   */
  private calculateTimelineAdjustments(
    blockedTasks: BlockedTask[],
    escalations: EscalationRecommendation[]
  ): TimelineAdjustment[] {
    const adjustments: TimelineAdjustment[] = [];

    escalations.forEach((escalation, index) => {
      const blockedTask = blockedTasks[index];
      if (escalation.strategy === 'deadline_swap' && blockedTask.outcome_name) {
        adjustments.push({
          outcome_name: blockedTask.outcome_name,
          original_completion_date: new Date().toISOString().split('T')[0],
          adjusted_completion_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          reason: `Task blocked: ${blockedTask.blocking_reason}`,
        });
      }
    });

    return adjustments;
  }

  /**
   * Determine intervention priority based on blocked tasks
   */
  private determineInterventionPriority(blockedTasks: BlockedTask[]): 'P0' | 'P1' | 'P2' {
    // If any P0 task blocked → P0 intervention
    if (blockedTasks.some(t => t.priority === 'P0')) {
      return 'P0';
    }
    // If 3+ P1 tasks blocked → P1 intervention
    if (blockedTasks.filter(t => t.priority === 'P1').length >= 3) {
      return 'P1';
    }
    // Otherwise P2
    return 'P2';
  }
}
