/**
 * TYPE-003: Timeline Architecture Intelligence
 * Category: DOMAIN_SPECIFIC (GamePlanAgent)
 *
 * Framework: 93-Week Framework + Quarterly Decomposition
 *
 * Purpose: Map Jenny's validated 93-week roadmap structure to student context.
 * Transforms abstract timeline → concrete quarterly plans with milestone sequencing.
 *
 * Algorithm: Quarterly Decomposition + Milestone Mapping
 *
 * **93-Week Framework Structure:**
 * ```
 * Total: 93 weeks (2 years + 1 quarter) from start of 10th grade → application submission
 *
 * Phase 1 (P1): Foundation (Weeks 1-40, ~10 months)
 *   Q1: Weeks 1-12 (Build baseline, establish routines)
 *   Q2: Weeks 13-24 (Develop core skills, early wins)
 *   Q3: Weeks 25-36 (Scale impact, build proof)
 *   Q4: Weeks 37-40 (Phase 1 review, summer prep)
 *
 * Phase 2 (P2): Build (Weeks 41-76, ~9 months)
 *   Q5: Weeks 41-52 (11th grade summer - intensive building)
 *   Q6: Weeks 53-64 (Fall 11th - recognition push)
 *   Q7: Weeks 65-76 (Winter/Spring 11th - consolidate proof)
 *
 * Phase 3 (P3): Decision (Weeks 77-93, ~4 months)
 *   Q8: Weeks 77-88 (Summer before 12th - application prep)
 *   Q9: Weeks 89-93 (Fall 12th - application execution)
 * ```
 *
 * **Output:** Timeline Architecture
 * - current_week: Student's position in 93-week framework
 * - current_phase: P1 (Foundation), P2 (Build), or P3 (Decision)
 * - current_quarter: Q1-Q9
 * - weeks_remaining: Countdown to submission deadlines
 * - quarterly_plan: All 8-9 quarters with goals, milestones, priorities
 * - critical_path: Milestone dependencies and sequencing
 *
 * Data Sources:
 * - 03-GamePlan-Architecture.json (93-week calendar structure)
 * - 05-huda_game_plan_progression_2year_extraction.json (real 2-year timeline evolution)
 * - W000-FRAMEWORK-001 (Quarter decomposition tactics)
 *
 * Created: 2025-10-29
 * Version: v18.0
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

/**
 * Quarter definition
 */
interface Quarter {
  quarter_number: number; // 1-9
  quarter_name: string; // e.g., "Q1", "Q2", etc.
  phase: 'P1' | 'P2' | 'P3';
  phase_name: string; // "Foundation", "Build", "Decision"
  start_week: number;
  end_week: number;
  duration_weeks: number;
  goal: string;
  focus_areas: string[];
  key_milestones: string[];
  rubric_deltas: { dimension: string; target_increase: number }[];
}

/**
 * Milestone definition
 */
interface Milestone {
  milestone_id: string;
  title: string;
  quarter: number;
  target_week: number;
  category: 'academics' | 'recognition' | 'leadership' | 'service' | 'personal_initiative';
  priority: 'P0' | 'P1' | 'P2';
  dependencies: string[]; // Other milestone IDs that must complete first
  rubric_impact: { dimension: string; expected_delta: number }[];
  estimated_hours: number;
}

/**
 * Critical path
 */
interface CriticalPath {
  total_milestones: number;
  p0_milestones: number;
  critical_path_weeks: number; // Longest dependency chain
  bottleneck_quarters: number[]; // Quarters with most P0 milestones
  risk_score: number; // 0-10 (timeline feasibility)
  recommendations: string[];
}

/**
 * Timeline architecture result
 */
interface TimelineArchitectureResult {
  current_week: number;
  current_phase: 'P1' | 'P2' | 'P3';
  current_quarter: number;
  weeks_remaining: number;
  quarters: Quarter[];
  milestones: Milestone[];
  critical_path: CriticalPath;
  timeline_health: 'on_track' | 'accelerated' | 'behind' | 'at_risk';
  recommendations: string[];
}

export class TimelineArchitecture implements IntelligenceType {
  type_id = 'TYPE-003';
  name = 'Timeline Architecture';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'GamePlanAgent';
  version = 'v18.0';

  /**
   * 93-Week Framework Definition
   */
  private readonly FRAMEWORK_93_WEEKS = {
    total_weeks: 93,
    phases: [
      { phase: 'P1', name: 'Foundation', weeks: [1, 40], quarters: [1, 2, 3, 4] },
      { phase: 'P2', name: 'Build', weeks: [41, 76], quarters: [5, 6, 7] },
      { phase: 'P3', name: 'Decision', weeks: [77, 93], quarters: [8, 9] },
    ],
    quarters: [
      { q: 1, phase: 'P1', weeks: [1, 12], goal: 'Build baseline, establish routines' },
      { q: 2, phase: 'P1', weeks: [13, 24], goal: 'Develop core skills, early wins' },
      { q: 3, phase: 'P1', weeks: [25, 36], goal: 'Scale impact, build proof' },
      { q: 4, phase: 'P1', weeks: [37, 40], goal: 'Phase 1 review, summer prep' },
      { q: 5, phase: 'P2', weeks: [41, 52], goal: '11th summer - intensive building' },
      { q: 6, phase: 'P2', weeks: [53, 64], goal: 'Fall 11th - recognition push' },
      { q: 7, phase: 'P2', weeks: [65, 76], goal: 'Winter/Spring 11th - consolidate proof' },
      { q: 8, phase: 'P3', weeks: [77, 88], goal: 'Summer before 12th - application prep' },
      { q: 9, phase: 'P3', weeks: [89, 93], goal: 'Fall 12th - application execution' },
    ],
  };

  /**
   * Process timeline architecture
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract timeline context from facts
    const profileFacts = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE);
    const assessmentFacts = facts.getFactsByCategory(FactCategory.ASSESSMENT_DATA);

    // Calculate current week in 93-week framework
    const currentWeek = this.calculateCurrentWeek(profileFacts);
    const currentPhase = this.determinePhase(currentWeek);
    const currentQuarter = this.determineQuarter(currentWeek);
    const weeksRemaining = this.FRAMEWORK_93_WEEKS.total_weeks - currentWeek;

    // Generate quarterly plans
    const quarters = this.generateQuarterlyPlans(currentWeek, assessmentFacts);

    // Generate milestones from assessment gaps
    const milestones = this.generateMilestones(quarters, assessmentFacts);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(milestones, weeksRemaining);

    // Assess timeline health
    const timelineHealth = this.assessTimelineHealth(currentWeek, currentPhase, criticalPath);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      currentWeek,
      currentPhase,
      currentQuarter,
      timelineHealth,
      criticalPath
    );

    const result: TimelineArchitectureResult = {
      current_week: currentWeek,
      current_phase: currentPhase,
      current_quarter: currentQuarter,
      weeks_remaining: weeksRemaining,
      quarters: quarters,
      milestones: milestones,
      critical_path: criticalPath,
      timeline_health: timelineHealth,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      component: 'timeline_architecture',
      triggered: true,
      confidence: 0.95,
      data: result,
    };
  }

  /**
   * Calculate current week in 93-week framework
   */
  private calculateCurrentWeek(profileFacts: any[]): number {
    const profile = profileFacts[0]?.data || {};

    // If program_start_date exists, calculate weeks elapsed
    if (profile.program_start_date) {
      const startDate = new Date(profile.program_start_date);
      const now = new Date();
      const weeksElapsed = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return Math.min(weeksElapsed + 1, 93); // Week 1 is first week
    }

    // Fallback: Estimate from grade level
    const gradeLevel = profile.grade_level || profile.current_grade || '10';
    if (gradeLevel === '10' || gradeLevel === '10th') {
      return 1; // Start of 10th grade = Week 1
    } else if (gradeLevel === '11' || gradeLevel === '11th') {
      return 41; // Start of 11th grade = Week 41 (Phase 2)
    } else if (gradeLevel === '12' || gradeLevel === '12th') {
      return 77; // Start of 12th grade = Week 77 (Phase 3)
    }

    return 1; // Default to Week 1
  }

  /**
   * Determine phase from current week
   */
  private determinePhase(week: number): 'P1' | 'P2' | 'P3' {
    if (week <= 40) return 'P1';
    if (week <= 76) return 'P2';
    return 'P3';
  }

  /**
   * Determine quarter from current week
   */
  private determineQuarter(week: number): number {
    const quarter = this.FRAMEWORK_93_WEEKS.quarters.find(
      q => week >= q.weeks[0] && week <= q.weeks[1]
    );
    return quarter?.q || 1;
  }

  /**
   * Generate quarterly plans
   */
  private generateQuarterlyPlans(currentWeek: number, assessmentFacts: any[]): Quarter[] {
    const quarters: Quarter[] = [];

    this.FRAMEWORK_93_WEEKS.quarters.forEach(qDef => {
      const isCurrent = currentWeek >= qDef.weeks[0] && currentWeek <= qDef.weeks[1];
      const isPast = currentWeek > qDef.weeks[1];
      const isFuture = currentWeek < qDef.weeks[0];

      // Adjust goal based on past/current/future
      let goal = qDef.goal;
      if (isPast) {
        goal = `[COMPLETED] ${qDef.goal}`;
      } else if (isCurrent) {
        goal = `[IN PROGRESS] ${qDef.goal}`;
      }

      // Determine focus areas based on phase
      const focusAreas = this.getFocusAreasForQuarter(qDef.q, qDef.phase as any);

      // Calculate rubric deltas for this quarter
      const rubricDeltas = this.calculateQuarterlyRubricDeltas(qDef.q, assessmentFacts);

      quarters.push({
        quarter_number: qDef.q,
        quarter_name: `Q${qDef.q}`,
        phase: qDef.phase as 'P1' | 'P2' | 'P3',
        phase_name: this.FRAMEWORK_93_WEEKS.phases.find(p => p.phase === qDef.phase)?.name || 'Unknown',
        start_week: qDef.weeks[0],
        end_week: qDef.weeks[1],
        duration_weeks: qDef.weeks[1] - qDef.weeks[0] + 1,
        goal: goal,
        focus_areas: focusAreas,
        key_milestones: [], // Populated by generateMilestones()
        rubric_deltas: rubricDeltas,
      });
    });

    return quarters;
  }

  /**
   * Get focus areas for quarter
   */
  private getFocusAreasForQuarter(quarter: number, phase: 'P1' | 'P2' | 'P3'): string[] {
    const focusMap: Record<number, string[]> = {
      1: ['Build routines', 'Academic foundation', 'Explore interests'],
      2: ['Early wins', 'Skill development', 'EC commitment'],
      3: ['Scale projects', 'Build proof', 'Recognition prep'],
      4: ['Summer planning', 'Phase 1 review', 'Set Phase 2 goals'],
      5: ['Intensive building', 'Summer programs', 'Project depth'],
      6: ['Recognition push', 'Awards applications', 'Leadership roles'],
      7: ['Consolidate proof', 'LoR cultivation', 'Portfolio building'],
      8: ['Application prep', 'Essay drafts', 'College list finalization'],
      9: ['Application execution', 'Submission sprint', 'Final polish'],
    };

    return focusMap[quarter] || ['Quarter-specific focus TBD'];
  }

  /**
   * Calculate quarterly rubric deltas
   */
  private calculateQuarterlyRubricDeltas(
    quarter: number,
    assessmentFacts: any[]
  ): { dimension: string; target_increase: number }[] {
    const assessmentData = assessmentFacts[0]?.data || {};
    const rubricGaps = assessmentData.rubric_gaps || [];

    // Distribute rubric gaps across quarters
    // P0 gaps → Q1-Q2, P1 gaps → Q2-Q3, P2 gaps → Q3-Q4
    const deltas: { dimension: string; target_increase: number }[] = [];

    rubricGaps.forEach((gap: any) => {
      const dimension = gap.dimension || 'Unknown';
      const totalGap = gap.gap || 0;
      const priority = gap.priority || 'P2';

      // Distribute gap across appropriate quarters
      if (priority === 'P0' && (quarter === 1 || quarter === 2)) {
        deltas.push({ dimension, target_increase: Math.ceil(totalGap / 2) });
      } else if (priority === 'P1' && (quarter === 2 || quarter === 3)) {
        deltas.push({ dimension, target_increase: Math.ceil(totalGap / 2) });
      } else if (priority === 'P2' && (quarter === 3 || quarter === 4)) {
        deltas.push({ dimension, target_increase: Math.ceil(totalGap / 2) });
      }
    });

    return deltas;
  }

  /**
   * Generate milestones from assessment gaps
   */
  private generateMilestones(quarters: Quarter[], assessmentFacts: any[]): Milestone[] {
    const milestones: Milestone[] = [];
    const assessmentData = assessmentFacts[0]?.data || {};
    const rubricPriorities = assessmentData.rubric_priorities || [];

    let milestoneCounter = 1;

    rubricPriorities.forEach((priority: any) => {
      const dimension = priority.dimension || 'Unknown';
      const gap = priority.gap || 0;
      const quarterAssignment = priority.quarter_assignment || 'Q1';

      // Parse quarter assignment (e.g., "Q1", "Q2-Q3")
      const quarterMatch = quarterAssignment.match(/Q(\d+)/);
      const targetQuarter = quarterMatch ? parseInt(quarterMatch[1]) : 1;

      // Get quarter details
      const quarter = quarters.find(q => q.quarter_number === targetQuarter);
      if (!quarter) return;

      // Calculate target week (middle of quarter)
      const targetWeek = Math.floor((quarter.start_week + quarter.end_week) / 2);

      // Create milestone
      const milestone: Milestone = {
        milestone_id: `M${milestoneCounter.toString().padStart(3, '0')}`,
        title: `Close ${dimension} gap (${gap} points)`,
        quarter: targetQuarter,
        target_week: targetWeek,
        category: this.mapDimensionToCategory(dimension),
        priority: priority.priority || 'P1',
        dependencies: [], // Would be calculated based on logical dependencies
        rubric_impact: [{ dimension, expected_delta: gap }],
        estimated_hours: gap * 10, // Rough estimate: 10 hours per rubric point
      };

      milestones.push(milestone);
      milestoneCounter++;
    });

    // Sort by target week
    milestones.sort((a, b) => a.target_week - b.target_week);

    return milestones;
  }

  /**
   * Map rubric dimension to milestone category
   */
  private mapDimensionToCategory(dimension: string): Milestone['category'] {
    const mapping: Record<string, Milestone['category']> = {
      Academics: 'academics',
      Recognition: 'recognition',
      Leadership: 'leadership',
      Community_Service: 'service',
      Personal_Initiative: 'personal_initiative',
      Extracurriculars: 'leadership',
    };

    return mapping[dimension] || 'personal_initiative';
  }

  /**
   * Calculate critical path
   */
  private calculateCriticalPath(milestones: Milestone[], weeksRemaining: number): CriticalPath {
    const p0Milestones = milestones.filter(m => m.priority === 'P0');
    const totalMilestones = milestones.length;

    // Calculate critical path (longest dependency chain)
    // For now, simplified: sum of P0 milestone durations
    const criticalPathWeeks = p0Milestones.reduce((sum, m) => sum + Math.ceil(m.estimated_hours / 10), 0);

    // Identify bottleneck quarters (quarters with most P0 milestones)
    const quarterCounts: Record<number, number> = {};
    p0Milestones.forEach(m => {
      quarterCounts[m.quarter] = (quarterCounts[m.quarter] || 0) + 1;
    });

    const bottleneckQuarters = Object.entries(quarterCounts)
      .filter(([_, count]) => count >= 2)
      .map(([quarter, _]) => parseInt(quarter));

    // Calculate risk score (0-10)
    const capacityRatio = criticalPathWeeks / weeksRemaining;
    let riskScore = 0;
    if (capacityRatio > 1.0) riskScore = 10; // Critical: Not enough time
    else if (capacityRatio > 0.8) riskScore = 7; // High risk: Very tight
    else if (capacityRatio > 0.6) riskScore = 4; // Moderate risk: Ambitious
    else riskScore = 2; // Low risk: Feasible

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskScore >= 7) {
      recommendations.push('⚠️ Timeline at risk - consider scope reduction or deadline extension');
      recommendations.push('Focus on P0 milestones only, defer P1/P2 to later quarters');
    } else if (riskScore >= 4) {
      recommendations.push('Timeline is ambitious - maintain consistent weekly execution');
      recommendations.push('Monitor progress weekly, adjust if falling behind');
    } else {
      recommendations.push('✅ Timeline is feasible with current pace');
    }

    if (bottleneckQuarters.length > 0) {
      recommendations.push(`Bottleneck quarters: ${bottleneckQuarters.map(q => `Q${q}`).join(', ')} - distribute milestones`);
    }

    return {
      total_milestones: totalMilestones,
      p0_milestones: p0Milestones.length,
      critical_path_weeks: criticalPathWeeks,
      bottleneck_quarters: bottleneckQuarters,
      risk_score: riskScore,
      recommendations: recommendations,
    };
  }

  /**
   * Assess timeline health
   */
  private assessTimelineHealth(
    currentWeek: number,
    currentPhase: 'P1' | 'P2' | 'P3',
    criticalPath: CriticalPath
  ): 'on_track' | 'accelerated' | 'behind' | 'at_risk' {
    // Expected progress by phase
    const expectedWeeks: Record<string, number> = {
      P1: 1,  // Should be in Week 1-40
      P2: 41, // Should be in Week 41-76
      P3: 77, // Should be in Week 77-93
    };

    const expected = expectedWeeks[currentPhase];
    const deviation = currentWeek - expected;

    // Check critical path risk
    if (criticalPath.risk_score >= 7) {
      return 'at_risk';
    } else if (deviation < -5) {
      return 'accelerated'; // Ahead of schedule
    } else if (deviation > 5) {
      return 'behind'; // Behind schedule
    } else {
      return 'on_track';
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    currentWeek: number,
    currentPhase: 'P1' | 'P2' | 'P3',
    currentQuarter: number,
    timelineHealth: string,
    criticalPath: CriticalPath
  ): string[] {
    const recommendations: string[] = [];

    // Current status
    recommendations.push(`📍 Current Position: Week ${currentWeek}, Q${currentQuarter} (Phase ${currentPhase})`);
    recommendations.push(`Health: ${timelineHealth.toUpperCase()}`);

    // Phase-specific guidance
    if (currentPhase === 'P1') {
      recommendations.push('\nPhase 1 (Foundation) Focus:');
      recommendations.push('- Build consistent routines and habits');
      recommendations.push('- Explore interests, find passion areas');
      recommendations.push('- Establish academic baseline (GPA, course rigor)');
    } else if (currentPhase === 'P2') {
      recommendations.push('\nPhase 2 (Build) Focus:');
      recommendations.push('- Scale projects to measurable impact');
      recommendations.push('- Pursue recognition (awards, competitions)');
      recommendations.push('- Build proof (metrics, testimonials, artifacts)');
    } else {
      recommendations.push('\nPhase 3 (Decision) Focus:');
      recommendations.push('- Execute application strategy');
      recommendations.push('- Finalize essays and supplements');
      recommendations.push('- Submit applications on time');
    }

    // Critical path recommendations
    recommendations.push('\nCritical Path:');
    recommendations.push(...criticalPath.recommendations);

    return recommendations;
  }
}
