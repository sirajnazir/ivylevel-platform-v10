/**
 * TYPE-058: Application Mastery Rail Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: 5-Lane Throughput Model
 *
 * Purpose: Track college application progress across 5 parallel lanes.
 * Prevents bottlenecks by working on all lanes simultaneously (not sequentially).
 * Optimizes throughput during senior fall (high-pressure 3-month sprint).
 *
 * Algorithm: 5 Parallel Lanes (Work on ALL lanes every week)
 *
 * Lane 1: PERSONAL ESSAY (Common App Main Essay)
 *   - Checklist: Topic selection → Outline → Draft 1 → Revisions → Final
 *   - Target: 650 words, authentic voice, specific examples
 *   - Timeline: 6-8 weeks (start August for Nov 1 deadline)
 *
 * Lane 2: ACADEMIC (Transcript, Test Scores, Coursework)
 *   - Checklist: Transcript request → Test score sends → Course rigor verification
 *   - Target: All scores sent, transcript finalized
 *   - Timeline: 2-3 weeks (logistics-heavy)
 *
 * Lane 3: EXTRACURRICULARS (Activities List + EC Essay)
 *   - Checklist: 10 activities ranked → Descriptions (150 chars) → EC essay (if required)
 *   - Target: Activities List tells compelling story
 *   - Timeline: 3-4 weeks
 *
 * Lane 4: RECOMMENDATIONS (LoR Cultivation)
 *   - Checklist: 2 teachers + 1 counselor → Context packets → Follow-up
 *   - Target: Strong letters from teachers who know you well
 *   - Timeline: 8+ weeks (start early!)
 *
 * Lane 5: FINANCIAL AID (FAFSA, CSS Profile, Scholarships)
 *   - Checklist: FAFSA → CSS Profile → Scholarship applications
 *   - Target: All forms submitted by priority deadlines
 *   - Timeline: 4-6 weeks (parent-dependent)
 *
 * Bottleneck Detection:
 * - If any lane <30% complete 6 weeks before deadline → CRITICAL
 * - If 2+ lanes blocked → Escalate immediately
 * - LoR lane requires longest lead time (8+ weeks)
 *
 * Throughput Optimization:
 * - Work on 2-3 lanes per week (rotate focus)
 * - Unblock fastest wins first (Academic → Financial)
 * - Protect time for Personal Essay (hardest, highest impact)
 *
 * Data Sources:
 * - W000-FRAMEWORK-007 (5-lane application throughput from coaching)
 * - Student application status facts
 * - Essay drafts, transcript status, LoR status
 * - Application deadlines from timeline
 *
 * Output: ApplicationMasteryResult
 * - lane_statuses: Status dashboard for all 5 lanes
 * - completion_percentage: Overall application readiness (0-100%)
 * - bottlenecks: Lanes that are blocked or behind schedule
 * - weekly_focus: Which 2-3 lanes to work on this week
 * - recommendations: Priority actions to unblock
 *
 * Created: 2025-10-29
 * Version: v20.4
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Application lane types
 */
type LaneType = 'personal_essay' | 'academic' | 'extracurriculars' | 'recommendations' | 'financial_aid';

/**
 * Lane status
 */
interface LaneStatus {
  lane_name: LaneType;
  display_name: string;
  completion_percentage: number; // 0-100
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  checklist_items: ChecklistItem[];
  blockers: string[];
  estimated_hours_remaining: number;
  lane_priority: 'P0' | 'P1' | 'P2'; // Based on timeline
}

/**
 * Checklist item within a lane
 */
interface ChecklistItem {
  item_name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  deadline: string | null;
  estimated_hours: number;
  dependencies: string[]; // What must be done first
}

/**
 * Bottleneck (lane that's behind schedule)
 */
interface Bottleneck {
  lane_name: LaneType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  impact: string; // What happens if not fixed
  unblock_actions: string[];
}

/**
 * Weekly focus recommendation
 */
interface WeeklyFocus {
  week_number: number;
  primary_lane: LaneType;
  secondary_lane: LaneType;
  tertiary_lane: LaneType | null;
  rationale: string;
  time_allocation: { [key in LaneType]?: number }; // Hours per lane
}

/**
 * Application mastery result
 */
interface ApplicationMasteryResult {
  lane_statuses: LaneStatus[];
  overall_completion: number; // 0-100 (average of all lanes)
  bottlenecks: Bottleneck[];
  application_deadline: string | null;
  weeks_until_deadline: number | null;
  on_track: boolean; // True if no critical bottlenecks
  weekly_focus: WeeklyFocus;
  recommendations: string[];
}

export class ApplicationMasteryRail implements IntelligenceType {
  type_id = 'TYPE-058';
  name = 'Application Mastery Rail';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.4';

  /**
   * Lane definitions with standard checklists
   */
  private readonly LANE_DEFINITIONS = {
    personal_essay: {
      display_name: 'Personal Essay (Common App)',
      checklist: [
        { name: 'Topic selection', hours: 2 },
        { name: 'Outline creation', hours: 2 },
        { name: 'Draft 1 (rough)', hours: 4 },
        { name: 'Draft 2 (revised)', hours: 3 },
        { name: 'Draft 3 (polished)', hours: 2 },
        { name: 'Final review', hours: 1 },
      ],
      typical_duration_weeks: 6,
    },
    academic: {
      display_name: 'Academic Lane (Transcript, Test Scores)',
      checklist: [
        { name: 'Request official transcript', hours: 1 },
        { name: 'Send SAT/ACT scores', hours: 1 },
        { name: 'Verify course rigor', hours: 1 },
        { name: 'Confirm transcript sent', hours: 0.5 },
      ],
      typical_duration_weeks: 2,
    },
    extracurriculars: {
      display_name: 'EC Lane (Activities List + Essay)',
      checklist: [
        { name: 'List 10 activities', hours: 2 },
        { name: 'Rank by importance', hours: 1 },
        { name: 'Write descriptions (150 chars)', hours: 4 },
        { name: 'EC essay (if required)', hours: 3 },
        { name: 'Final review', hours: 1 },
      ],
      typical_duration_weeks: 3,
    },
    recommendations: {
      display_name: 'Recommendations (LoRs)',
      checklist: [
        { name: 'Identify 2 teachers + counselor', hours: 1 },
        { name: 'Request LoRs (8+ weeks before deadline)', hours: 1 },
        { name: 'Prepare context packets', hours: 2 },
        { name: 'Deliver context packets', hours: 1 },
        { name: 'Follow up 2 weeks before deadline', hours: 0.5 },
        { name: 'Confirm submission', hours: 0.5 },
      ],
      typical_duration_weeks: 8,
    },
    financial_aid: {
      display_name: 'Financial Aid (FAFSA, CSS, Scholarships)',
      checklist: [
        { name: 'Gather parent financial info', hours: 2 },
        { name: 'Complete FAFSA', hours: 2 },
        { name: 'Complete CSS Profile', hours: 2 },
        { name: 'Apply for 5+ scholarships', hours: 10 },
        { name: 'Confirm all submissions', hours: 1 },
      ],
      typical_duration_weeks: 5,
    },
  };

  /**
   * Process application mastery analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract application-related facts
    const essayFacts = facts.facts.filter(f => f.category === 'ESSAYS' || f.data?.essay_type === 'personal');
    const transcriptFacts = facts.facts.filter(f => f.category === 'ACADEMIC_PROFILE');
    const activityFacts = facts.facts.filter(f => f.category === 'ACTIVITIES');
    const lorFacts = facts.facts.filter(f => f.category === 'RECOMMENDATIONS');
    const financialFacts = facts.facts.filter(f => f.category === 'FINANCIAL_AID');
    const timelineFacts = facts.facts.filter(f => f.category === 'TIMELINE');

    // Analyze each lane
    const laneStatuses: LaneStatus[] = [
      this.analyzeLane('personal_essay', essayFacts),
      this.analyzeLane('academic', transcriptFacts),
      this.analyzeLane('extracurriculars', activityFacts),
      this.analyzeLane('recommendations', lorFacts),
      this.analyzeLane('financial_aid', financialFacts),
    ];

    // Calculate overall completion
    const overallCompletion = Math.round(
      laneStatuses.reduce((sum, lane) => sum + lane.completion_percentage, 0) / laneStatuses.length
    );

    // Get application deadline
    const deadline = this.getApplicationDeadline(timelineFacts);
    const weeksUntilDeadline = deadline
      ? Math.floor((new Date(deadline).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
      : null;

    // Detect bottlenecks
    const bottlenecks = this.detectBottlenecks(laneStatuses, weeksUntilDeadline);

    // Determine if on track
    const onTrack = !bottlenecks.some(b => b.severity === 'critical' || b.severity === 'high');

    // Generate weekly focus
    const weeklyFocus = this.generateWeeklyFocus(laneStatuses, weeksUntilDeadline, bottlenecks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(laneStatuses, bottlenecks, weeksUntilDeadline, onTrack);

    const result: ApplicationMasteryResult = {
      lane_statuses: laneStatuses,
      overall_completion: overallCompletion,
      bottlenecks: bottlenecks,
      application_deadline: deadline,
      weeks_until_deadline: weeksUntilDeadline,
      on_track: onTrack,
      weekly_focus: weeklyFocus,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  /**
   * Analyze one lane
   */
  private analyzeLane(laneType: LaneType, facts: any[]): LaneStatus {
    const laneDefn = this.LANE_DEFINITIONS[laneType];
    const checklistItems: ChecklistItem[] = [];
    let completedItems = 0;

    // Build checklist with status
    laneDefn.checklist.forEach((item, index) => {
      const status = this.inferItemStatus(laneType, item.name, facts);
      if (status === 'completed') completedItems++;

      checklistItems.push({
        item_name: item.name,
        status: status,
        deadline: null, // Set based on application deadline
        estimated_hours: item.hours,
        dependencies: index > 0 ? [laneDefn.checklist[index - 1].name] : [],
      });
    });

    // Calculate completion percentage
    const completionPercentage = Math.round((completedItems / checklistItems.length) * 100);

    // Determine lane status
    let laneStatus: 'not_started' | 'in_progress' | 'blocked' | 'completed';
    if (completionPercentage === 100) {
      laneStatus = 'completed';
    } else if (completionPercentage === 0) {
      laneStatus = 'not_started';
    } else {
      laneStatus = 'in_progress';
    }

    // Check for blockers
    const blockers = this.identifyLaneBlockers(laneType, checklistItems, facts);
    if (blockers.length > 0) {
      laneStatus = 'blocked';
    }

    // Calculate hours remaining
    const hoursRemaining = checklistItems
      .filter(item => item.status !== 'completed')
      .reduce((sum, item) => sum + item.estimated_hours, 0);

    // Determine lane priority (LoR requires longest lead time)
    let lanePriority: 'P0' | 'P1' | 'P2';
    if (laneType === 'recommendations' || laneType === 'personal_essay') {
      lanePriority = 'P0'; // Longest lead time
    } else if (laneType === 'extracurriculars') {
      lanePriority = 'P1';
    } else {
      lanePriority = 'P2'; // Academic and Financial are shorter
    }

    return {
      lane_name: laneType,
      display_name: laneDefn.display_name,
      completion_percentage: completionPercentage,
      status: laneStatus,
      checklist_items: checklistItems,
      blockers: blockers,
      estimated_hours_remaining: hoursRemaining,
      lane_priority: lanePriority,
    };
  }

  /**
   * Infer checklist item status from facts
   */
  private inferItemStatus(laneType: LaneType, itemName: string, facts: any[]): 'not_started' | 'in_progress' | 'completed' {
    // Personal Essay lane
    if (laneType === 'personal_essay') {
      if (itemName.includes('Topic selection')) {
        return facts.some(f => f.data?.essay_topic) ? 'completed' : 'not_started';
      }
      if (itemName.includes('Draft 1')) {
        return facts.some(f => f.data?.draft_version >= 1) ? 'completed' : 'not_started';
      }
      if (itemName.includes('Draft 2')) {
        return facts.some(f => f.data?.draft_version >= 2) ? 'completed' : 'not_started';
      }
      if (itemName.includes('Draft 3')) {
        return facts.some(f => f.data?.draft_version >= 3) ? 'completed' : 'not_started';
      }
      if (itemName.includes('Final review')) {
        return facts.some(f => f.data?.status === 'final' || f.data?.essay_status === 'submitted') ? 'completed' : 'not_started';
      }
    }

    // Academic lane
    if (laneType === 'academic') {
      if (itemName.includes('transcript')) {
        return facts.some(f => f.data?.transcript_status === 'requested' || f.data?.transcript_status === 'sent') ? 'completed' : 'not_started';
      }
      if (itemName.includes('Test scores')) {
        return facts.some(f => f.data?.test_scores_sent === true) ? 'completed' : 'not_started';
      }
    }

    // EC lane
    if (laneType === 'extracurriculars') {
      if (itemName.includes('List 10 activities')) {
        return facts.length >= 10 ? 'completed' : facts.length > 0 ? 'in_progress' : 'not_started';
      }
      if (itemName.includes('descriptions')) {
        return facts.some(f => f.data?.description && f.data.description.length > 50) ? 'in_progress' : 'not_started';
      }
    }

    // LoR lane
    if (laneType === 'recommendations') {
      if (itemName.includes('Identify')) {
        return facts.length >= 3 ? 'completed' : 'not_started';
      }
      if (itemName.includes('Request')) {
        return facts.some(f => f.data?.status === 'requested') ? 'completed' : 'not_started';
      }
      if (itemName.includes('context packet')) {
        return facts.some(f => f.data?.context_packet_delivered === true) ? 'completed' : 'not_started';
      }
    }

    // Financial Aid lane
    if (laneType === 'financial_aid') {
      if (itemName.includes('FAFSA')) {
        return facts.some(f => f.data?.fafsa_status === 'submitted') ? 'completed' : 'not_started';
      }
      if (itemName.includes('CSS')) {
        return facts.some(f => f.data?.css_status === 'submitted') ? 'completed' : 'not_started';
      }
      if (itemName.includes('scholarships')) {
        const scholarshipCount = facts.filter(f => f.data?.type === 'scholarship' || f.data?.scholarship_application === true).length;
        return scholarshipCount >= 5 ? 'completed' : scholarshipCount > 0 ? 'in_progress' : 'not_started';
      }
    }

    return 'not_started';
  }

  /**
   * Identify lane blockers
   */
  private identifyLaneBlockers(laneType: LaneType, checklistItems: ChecklistItem[], facts: any[]): string[] {
    const blockers: string[] = [];

    // Personal Essay: Writing block, perfectionism
    if (laneType === 'personal_essay') {
      const draftItems = checklistItems.filter(item => item.item_name.includes('Draft'));
      const inProgressDrafts = draftItems.filter(item => item.status === 'in_progress');
      if (inProgressDrafts.length > 0) {
        blockers.push('Writing stalled - possible perfectionism or writer\'s block');
      }
    }

    // Academic: Waiting on school/counselor
    if (laneType === 'academic') {
      const transcriptItem = checklistItems.find(item => item.item_name.includes('transcript'));
      if (transcriptItem && transcriptItem.status === 'in_progress') {
        blockers.push('Waiting on school/counselor to send official transcript');
      }
    }

    // LoR: Teachers haven't responded
    if (laneType === 'recommendations') {
      const requestItem = checklistItems.find(item => item.item_name.includes('Request'));
      const contextItem = checklistItems.find(item => item.item_name.includes('context packet'));
      if (requestItem?.status === 'in_progress' && contextItem?.status === 'not_started') {
        blockers.push('Teachers haven\'t responded to LoR request');
      }
    }

    // Financial Aid: Waiting on parents
    if (laneType === 'financial_aid') {
      const gatherItem = checklistItems.find(item => item.item_name.includes('Gather parent'));
      if (gatherItem && gatherItem.status !== 'completed') {
        blockers.push('Waiting on parent financial information');
      }
    }

    return blockers;
  }

  /**
   * Get application deadline
   */
  private getApplicationDeadline(timelineFacts: any[]): string | null {
    // Look for college application deadline
    const deadlineFacts = timelineFacts.filter(f =>
      f.data?.event_type === 'deadline' ||
      f.data?.milestone_type === 'application_deadline'
    );

    if (deadlineFacts.length > 0) {
      const deadlines = deadlineFacts
        .map(f => f.data?.deadline_date || f.data?.date)
        .filter(Boolean)
        .sort();
      return deadlines[0] || null;
    }

    // Default: November 1 (Early Action)
    const currentYear = new Date().getFullYear();
    return `${currentYear}-11-01`;
  }

  /**
   * Detect bottlenecks
   */
  private detectBottlenecks(laneStatuses: LaneStatus[], weeksUntilDeadline: number | null): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    if (!weeksUntilDeadline) return bottlenecks;

    laneStatuses.forEach(lane => {
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let reason = '';

      // Critical: <30% complete with <6 weeks to deadline
      if (lane.completion_percentage < 30 && weeksUntilDeadline < 6) {
        severity = 'critical';
        reason = `Only ${lane.completion_percentage}% complete with ${weeksUntilDeadline} weeks until deadline`;
      }
      // High: <50% complete with <8 weeks to deadline
      else if (lane.completion_percentage < 50 && weeksUntilDeadline < 8) {
        severity = 'high';
        reason = `Only ${lane.completion_percentage}% complete with ${weeksUntilDeadline} weeks until deadline`;
      }
      // Medium: Blocked
      else if (lane.status === 'blocked') {
        severity = 'medium';
        reason = `Lane blocked: ${lane.blockers.join(', ')}`;
      }
      // Low: Not started but plenty of time
      else if (lane.status === 'not_started' && weeksUntilDeadline > 10) {
        severity = 'low';
        reason = 'Not started yet (but time available)';
      }

      // Only add if severity > low
      if (severity !== 'low' || lane.status === 'blocked') {
        bottlenecks.push({
          lane_name: lane.lane_name,
          severity: severity,
          reason: reason,
          impact: this.getBottleneckImpact(lane.lane_name),
          unblock_actions: this.getUnblockActions(lane),
        });
      }
    });

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get bottleneck impact
   */
  private getBottleneckImpact(laneType: LaneType): string {
    const impacts = {
      personal_essay: '🚨 CRITICAL: Personal essay is highest-impact component of application',
      academic: '⚠️ HIGH: Can\'t submit application without transcript and test scores',
      extracurriculars: '⚠️ MEDIUM: Activities List is key differentiator',
      recommendations: '🚨 CRITICAL: Teachers need 4+ weeks to write strong letters',
      financial_aid: '⚠️ MEDIUM: Miss financial aid if late (but app can still submit)',
    };
    return impacts[laneType];
  }

  /**
   * Get unblock actions
   */
  private getUnblockActions(lane: LaneStatus): string[] {
    const actions: string[] = [];

    if (lane.blockers.length > 0) {
      lane.blockers.forEach(blocker => {
        if (blocker.includes('perfectionism')) {
          actions.push('Set 2-hour timer and write rough draft (done > perfect)');
          actions.push('Share draft with coach/teacher for feedback');
        } else if (blocker.includes('school')) {
          actions.push('Follow up with counselor (in person if possible)');
          actions.push('Confirm transcript submission deadline');
        } else if (blocker.includes('Teachers')) {
          actions.push('Follow up with teachers (polite reminder email)');
          actions.push('Offer to meet in person to discuss LoR');
        } else if (blocker.includes('parent')) {
          actions.push('Schedule 1-hour parent financial info session');
          actions.push('Use FAFSA4caster to estimate EFC first');
        }
      });
    } else {
      // Generic next step for incomplete lane
      const nextIncomplete = lane.checklist_items.find(item => item.status !== 'completed');
      if (nextIncomplete) {
        actions.push(`Next: ${nextIncomplete.item_name} (${nextIncomplete.estimated_hours}h)`);
      }
    }

    return actions;
  }

  /**
   * Generate weekly focus
   */
  private generateWeeklyFocus(
    laneStatuses: LaneStatus[],
    weeksUntilDeadline: number | null,
    bottlenecks: Bottleneck[]
  ): WeeklyFocus {
    // Prioritize bottlenecks first
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    const highBottlenecks = bottlenecks.filter(b => b.severity === 'high');

    let primaryLane: LaneType;
    let secondaryLane: LaneType;
    let tertiaryLane: LaneType | null = null;
    let rationale = '';

    // Critical bottleneck exists → focus there
    if (criticalBottlenecks.length > 0) {
      primaryLane = criticalBottlenecks[0].lane_name;
      secondaryLane = criticalBottlenecks[1]?.lane_name || highBottlenecks[0]?.lane_name || 'academic';
      rationale = `CRITICAL: ${criticalBottlenecks[0].reason}`;
    }
    // High bottleneck → focus on P0 lanes
    else if (highBottlenecks.length > 0) {
      primaryLane = highBottlenecks[0].lane_name;
      secondaryLane = 'personal_essay'; // Always work on essay
      rationale = `High priority: ${highBottlenecks[0].reason}`;
    }
    // No bottlenecks → standard rotation (Essay + LoR + one other)
    else {
      primaryLane = 'personal_essay'; // Essay is always priority
      secondaryLane = 'recommendations'; // LoR needs consistent attention
      tertiaryLane = 'extracurriculars'; // EC lane third
      rationale = 'Standard rotation: Essay (P0) + LoR (P0) + EC (P1)';
    }

    // Time allocation (20h/week discretionary, allocate to top lanes)
    const timeAllocation: { [key in LaneType]?: number } = {};
    timeAllocation[primaryLane] = 10;
    timeAllocation[secondaryLane] = 6;
    if (tertiaryLane) {
      timeAllocation[tertiaryLane] = 4;
    }

    return {
      week_number: weeksUntilDeadline || 0,
      primary_lane: primaryLane,
      secondary_lane: secondaryLane,
      tertiary_lane: tertiaryLane,
      rationale: rationale,
      time_allocation: timeAllocation,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    laneStatuses: LaneStatus[],
    bottlenecks: Bottleneck[],
    weeksUntilDeadline: number | null,
    onTrack: boolean
  ): string[] {
    const recommendations: string[] = [];

    // Overall status
    const overallCompletion = Math.round(
      laneStatuses.reduce((sum, lane) => sum + lane.completion_percentage, 0) / laneStatuses.length
    );

    if (onTrack) {
      recommendations.push(`✅ On track! Overall: ${overallCompletion}% complete with ${weeksUntilDeadline} weeks remaining`);
    } else {
      recommendations.push(`⚠️ Behind schedule: ${overallCompletion}% complete with ${weeksUntilDeadline} weeks remaining`);
    }

    // Critical bottlenecks
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    if (criticalBottlenecks.length > 0) {
      recommendations.push('🚨 CRITICAL BOTTLENECKS:');
      criticalBottlenecks.forEach(b => {
        recommendations.push(`  - ${b.lane_name}: ${b.reason}`);
        b.unblock_actions.forEach(action => recommendations.push(`    → ${action}`));
      });
    }

    // Lane-specific guidance
    const essayLane = laneStatuses.find(l => l.lane_name === 'personal_essay');
    const lorLane = laneStatuses.find(l => l.lane_name === 'recommendations');

    if (essayLane && essayLane.completion_percentage < 50 && weeksUntilDeadline && weeksUntilDeadline < 8) {
      recommendations.push('📝 Essay Priority: Allocate 10h/week to personal essay (highest impact component)');
    }

    if (lorLane && lorLane.completion_percentage < 30 && weeksUntilDeadline && weeksUntilDeadline < 6) {
      recommendations.push('👨‍🏫 LoR Emergency: Follow up with teachers ASAP (need 4+ weeks to write)');
    }

    // Throughput strategy
    if (weeksUntilDeadline && weeksUntilDeadline < 10) {
      recommendations.push('🎯 Throughput Strategy: Work on 2-3 lanes per week (rotate focus)');
      recommendations.push('Priority order: Personal Essay → LoRs → ECs → Academic → Financial');
    }

    return recommendations;
  }
}
