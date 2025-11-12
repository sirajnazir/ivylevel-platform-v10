/**
 * TYPE-049: Execution Ladder Navigation Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent only)
 *
 * Purpose: Tracks student position on 9-rung execution ladder (Assessment→Acceptance)
 * and identifies next rung to climb with validation of completion requirements.
 *
 * Formula:
 * Assessment → GamePlan → ExecutionMap → WeeklySprints → Artifacts →
 * Endorsements → Metrics → Validation → Submission
 *
 * Each rung converts ambiguity into proof. Cannot skip rungs.
 *
 * Source: EXEC_Intel_Chips_Batch_v2.jsonl (W000-FRAMEWORK-001)
 * Pattern: Jenny's 93-week coaching progression with Huda
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';
import { FactCategory } from '../../facts/types.js';

/**
 * 9 Rungs of Execution Ladder
 */
enum ExecutionRung {
  ASSESSMENT = 'assessment',           // Week 1: Diagnostic complete
  GAMEPLAN = 'gameplan',               // Week 2-3: Strategic roadmap
  EXECUTION_MAP = 'execution_map',     // Week 4: Outcome→Task breakdown
  WEEKLY_SPRINTS = 'weekly_sprints',   // Week 5+: Monday→Friday cadence
  ARTIFACTS = 'artifacts',             // Ongoing: Projects, portfolios
  ENDORSEMENTS = 'endorsements',       // Ongoing: LoRs, testimonials
  METRICS = 'metrics',                 // Ongoing: Users, impact numbers
  VALIDATION = 'validation',           // Senior year: Third-party proof
  SUBMISSION = 'submission',           // Senior fall: College apps
}

interface RungRequirements {
  rung: ExecutionRung;
  rung_number: number; // 1-9
  title: string;
  description: string;
  proof_requirements: string[];
  typical_week_range: string;
  completion_criteria: string;
}

interface RungProgress {
  current_rung: ExecutionRung;
  rung_number: number;
  completion_percentage: number; // 0-100% of current rung
  proof_validated: string[]; // Which proof requirements are met
  proof_missing: string[]; // Which proof requirements are missing
  ready_to_advance: boolean;
  next_rung: ExecutionRung | null;
  blockers: string[];
}

interface LadderPosition {
  student_id: string;
  current_rung: RungProgress;
  rungs_completed: ExecutionRung[];
  rungs_remaining: ExecutionRung[];
  overall_progress_percentage: number; // 0-100% (across all 9 rungs)
  estimated_weeks_to_submission: number;
  at_risk: boolean; // Behind expected timeline?
  recommendations: string[];
}

export class ExecutionLadderNavigation implements IntelligenceType {
  type_id = 'TYPE-049';
  name = 'Execution Ladder Navigation';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Define all 9 rungs with requirements
   */
  private LADDER_RUNGS: RungRequirements[] = [
    {
      rung: ExecutionRung.ASSESSMENT,
      rung_number: 1,
      title: 'Assessment',
      description: 'Diagnostic of strengths, weaknesses, interests, and capacity',
      proof_requirements: [
        'Assessment session completed',
        'Student profile created (grade, school, interests)',
        'Strengths/weaknesses identified',
        'Target schools discussed',
      ],
      typical_week_range: 'Week 1',
      completion_criteria: 'Student profile exists in database with assessment data',
    },
    {
      rung: ExecutionRung.GAMEPLAN,
      rung_number: 2,
      title: 'Game Plan',
      description: 'Strategic 2-4 year roadmap with major initiatives',
      proof_requirements: [
        'Game plan document created',
        '3-5 major initiatives identified',
        'Timeline with milestones established',
        'Parent buy-in achieved',
      ],
      typical_week_range: 'Week 2-3',
      completion_criteria: 'Game plan exists in kb_items or vitals with initiatives mapped',
    },
    {
      rung: ExecutionRung.EXECUTION_MAP,
      rung_number: 3,
      title: 'Execution Map',
      description: 'Breakdown of outcomes → execution items → tasks',
      proof_requirements: [
        'At least 3 outcomes defined with priorities',
        'Each outcome has 2+ execution items',
        'Tasks decomposed with deadlines',
        'First weekly action plan created',
      ],
      typical_week_range: 'Week 4',
      completion_criteria: 'Weekly action plan exists with outcomes/execution_items/tasks hierarchy',
    },
    {
      rung: ExecutionRung.WEEKLY_SPRINTS,
      rung_number: 4,
      title: 'Weekly Sprints',
      description: 'Consistent Monday→Friday execution rhythm established',
      proof_requirements: [
        'At least 4 consecutive weeks of execution',
        'Portfolio Operating Cadence followed (Prioritize→Produce→Publish→Propagate→Post-mortem)',
        'Weekly completion rate >60%',
        'Friday publish ritual streak >3 weeks',
      ],
      typical_week_range: 'Week 5-20',
      completion_criteria: '4+ weekly_progress_snapshots with completion_rate >60%',
    },
    {
      rung: ExecutionRung.ARTIFACTS,
      rung_number: 5,
      title: 'Artifacts',
      description: 'Tangible projects, portfolios, demos shipped publicly',
      proof_requirements: [
        'At least 2 major projects shipped',
        'Public presence established (website, portfolio, GitHub)',
        'Proofpacks created (screenshots, metrics, user quotes)',
        'M1 milestone hit (first user) on 1+ project',
      ],
      typical_week_range: 'Week 10-40',
      completion_criteria: '2+ kb_items with item_type=Extracurricular in tier1_state=Delivered or In Transit',
    },
    {
      rung: ExecutionRung.ENDORSEMENTS,
      rung_number: 6,
      title: 'Endorsements',
      description: 'Letters of recommendation, testimonials, sponsor relationships',
      proof_requirements: [
        'LoR roadmap created (2 teachers + counselor)',
        '4-touch sequence executed for at least 1 teacher',
        'User testimonials collected (3+ quotes)',
        'At least 1 mentor/sponsor relationship established',
      ],
      typical_week_range: 'Week 30-60',
      completion_criteria: 'LoR tracking in progress + testimonials documented in proofpacks',
    },
    {
      rung: ExecutionRung.METRICS,
      rung_number: 7,
      title: 'Metrics',
      description: 'Quantified impact - users, downloads, awards won, press mentions',
      proof_requirements: [
        'At least 1 project at M2 milestone (10+ users)',
        'Analytics tracking enabled',
        'Impact numbers documented (X users, Y downloads, Z impact)',
        '1+ award won or press mention received',
      ],
      typical_week_range: 'Week 40-70',
      completion_criteria: '1+ kb_items with metric_value >10 OR tier1_state=Won (for awards)',
    },
    {
      rung: ExecutionRung.VALIDATION,
      rung_number: 8,
      title: 'Validation',
      description: 'Third-party proof - awards, press, recognition, partnerships',
      proof_requirements: [
        '2+ external validations (awards won, press coverage, partnership)',
        'Narrative spine harmonized across all surfaces',
        'Portfolio at M3 milestone (100+ users) on at least 1 project',
        'Application Mastery Rail activated (5 lanes tracked)',
      ],
      typical_week_range: 'Week 70-85',
      completion_criteria: '2+ awards won OR press mentions + Application Mastery Rail in progress',
    },
    {
      rung: ExecutionRung.SUBMISSION,
      rung_number: 9,
      title: 'Submission',
      description: 'College applications submitted with complete proof trail',
      proof_requirements: [
        'College list finalized (8-15 schools)',
        'All essays drafted and revised',
        'Recommendations submitted',
        'Applications submitted to at least 3 schools',
      ],
      typical_week_range: 'Week 85-93',
      completion_criteria: 'College applications in Submitted state',
    },
  ];

  /**
   * Process query to determine student's ladder position
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract facts needed to assess ladder position
    const profileFacts = facts.get(FactCategory.STUDENT_PROFILE) || [];
    const activityFacts = facts.get(FactCategory.ACTIVITY_DATA) || [];
    const assessmentFacts = facts.get(FactCategory.ASSESSMENT_DATA) || [];
    const weeklyProgressFacts = facts.get(FactCategory.WEEKLY_PROGRESS) || [];

    // Determine current rung
    const ladderPosition = this.calculateLadderPosition(
      studentId,
      profileFacts,
      activityFacts,
      assessmentFacts,
      weeklyProgressFacts
    );

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: 0.95,
      data: {
        ladder_position: ladderPosition,
        current_rung_details: this.LADDER_RUNGS.find(
          (r) => r.rung === ladderPosition.current_rung.current_rung
        ),
        next_actions: ladderPosition.recommendations,
      },
    };
  }

  /**
   * Calculate student's position on execution ladder
   */
  private calculateLadderPosition(
    studentId: string,
    profileFacts: any[],
    activityFacts: any[],
    assessmentFacts: any[],
    weeklyProgressFacts: any[]
  ): LadderPosition {
    const completedRungs: ExecutionRung[] = [];
    let currentRung: ExecutionRung = ExecutionRung.ASSESSMENT;
    let currentRungProgress: RungProgress | null = null;

    // Check each rung sequentially
    for (const rung of this.LADDER_RUNGS) {
      const progress = this.assessRungCompletion(
        rung,
        profileFacts,
        activityFacts,
        assessmentFacts,
        weeklyProgressFacts
      );

      if (progress.completion_percentage >= 100) {
        // Rung completed
        completedRungs.push(rung.rung);
      } else {
        // Current rung (first incomplete rung)
        currentRung = rung.rung;
        currentRungProgress = progress;
        break;
      }
    }

    // If all rungs completed, current = SUBMISSION
    if (!currentRungProgress) {
      const submissionRung = this.LADDER_RUNGS[8]; // SUBMISSION
      currentRungProgress = this.assessRungCompletion(
        submissionRung,
        profileFacts,
        activityFacts,
        assessmentFacts,
        weeklyProgressFacts
      );
    }

    const remainingRungs = this.LADDER_RUNGS.filter(
      (r) => !completedRungs.includes(r.rung) && r.rung !== currentRung
    ).map((r) => r.rung);

    // Calculate overall progress
    const rungsCompleted = completedRungs.length;
    const currentRungContribution =
      (currentRungProgress.completion_percentage / 100) * (1 / 9);
    const overallProgress = ((rungsCompleted + currentRungContribution) / 9) * 100;

    // Estimate weeks to submission
    const weeksPerRung = 10; // Average
    const rungsRemaining = 9 - (rungsCompleted + currentRungContribution);
    const estimatedWeeks = Math.ceil(rungsRemaining * weeksPerRung);

    // Check if at risk (behind timeline)
    const weeksPassed = weeklyProgressFacts.length || 0;
    const expectedProgress = (weeksPassed / 90) * 100; // Assume 90-week timeline
    const atRisk = overallProgress < expectedProgress - 15; // >15% behind

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      currentRungProgress,
      atRisk,
      weeklyProgressFacts
    );

    return {
      student_id: studentId,
      current_rung: currentRungProgress,
      rungs_completed: completedRungs,
      rungs_remaining: remainingRungs,
      overall_progress_percentage: Math.round(overallProgress),
      estimated_weeks_to_submission: estimatedWeeks,
      at_risk: atRisk,
      recommendations,
    };
  }

  /**
   * Assess completion of a specific rung
   */
  private assessRungCompletion(
    rung: RungRequirements,
    profileFacts: any[],
    activityFacts: any[],
    assessmentFacts: any[],
    weeklyProgressFacts: any[]
  ): RungProgress {
    const proofValidated: string[] = [];
    const proofMissing: string[] = [];
    let completionPercentage = 0;

    switch (rung.rung) {
      case ExecutionRung.ASSESSMENT:
        // Check if assessment completed
        if (profileFacts.length > 0 && profileFacts[0].value.grade) {
          proofValidated.push('Student profile created');
          completionPercentage += 25;
        } else {
          proofMissing.push('Student profile created');
        }

        if (assessmentFacts.length > 0) {
          proofValidated.push('Strengths/weaknesses identified');
          completionPercentage += 50;
        } else {
          proofMissing.push('Strengths/weaknesses identified');
        }

        if (profileFacts.some((f) => f.value.target_schools)) {
          proofValidated.push('Target schools discussed');
          completionPercentage += 25;
        } else {
          proofMissing.push('Target schools discussed');
        }
        break;

      case ExecutionRung.GAMEPLAN:
        // Check if game plan exists
        const hasGamePlan = activityFacts.some(
          (f) => f.category === 'gameplan' || f.value.title?.includes('Game Plan')
        );
        if (hasGamePlan) {
          proofValidated.push('Game plan document created');
          completionPercentage += 50;
        } else {
          proofMissing.push('Game plan document created');
        }

        const majorInitiatives = activityFacts.filter(
          (f) => f.value.tier1_state === 'Planned' || f.value.tier1_state === 'In Transit'
        );
        if (majorInitiatives.length >= 3) {
          proofValidated.push('3-5 major initiatives identified');
          completionPercentage += 50;
        } else {
          proofMissing.push('3-5 major initiatives identified');
        }
        break;

      case ExecutionRung.EXECUTION_MAP:
        // Check if weekly action plan exists
        if (weeklyProgressFacts.length > 0) {
          proofValidated.push('First weekly action plan created');
          completionPercentage += 100;
        } else {
          proofMissing.push('First weekly action plan created');
        }
        break;

      case ExecutionRung.WEEKLY_SPRINTS:
        // Check for consistent weekly execution
        if (weeklyProgressFacts.length >= 4) {
          proofValidated.push('At least 4 consecutive weeks of execution');
          completionPercentage += 40;
        } else {
          proofMissing.push('At least 4 consecutive weeks of execution');
        }

        const recentWeeks = weeklyProgressFacts.slice(-4);
        const avgCompletionRate =
          recentWeeks.reduce((sum, w) => sum + (w.value.completion_rate || 0), 0) /
          Math.max(recentWeeks.length, 1);

        if (avgCompletionRate >= 60) {
          proofValidated.push('Weekly completion rate >60%');
          completionPercentage += 60;
        } else {
          proofMissing.push('Weekly completion rate >60%');
        }
        break;

      case ExecutionRung.ARTIFACTS:
        // Check for shipped projects
        const shippedProjects = activityFacts.filter(
          (f) =>
            f.value.item_type === 'Extracurricular' &&
            (f.value.tier1_state === 'Delivered' || f.value.tier1_state === 'In Transit')
        );

        if (shippedProjects.length >= 2) {
          proofValidated.push('At least 2 major projects shipped');
          completionPercentage += 50;
        } else {
          proofMissing.push('At least 2 major projects shipped');
        }

        const hasPublicPresence = activityFacts.some((f) => f.value.website || f.value.portfolio);
        if (hasPublicPresence) {
          proofValidated.push('Public presence established');
          completionPercentage += 50;
        } else {
          proofMissing.push('Public presence established');
        }
        break;

      case ExecutionRung.ENDORSEMENTS:
        // Check for LoR progress
        const hasLoRTracking = activityFacts.some((f) => f.value.lors_requested);
        if (hasLoRTracking) {
          proofValidated.push('LoR roadmap created');
          completionPercentage += 50;
        } else {
          proofMissing.push('LoR roadmap created');
        }

        const hasTestimonials = activityFacts.some((f) => f.value.testimonials);
        if (hasTestimonials) {
          proofValidated.push('User testimonials collected');
          completionPercentage += 50;
        } else {
          proofMissing.push('User testimonials collected');
        }
        break;

      case ExecutionRung.METRICS:
        // Check for M2 milestone (10+ users)
        const hasMetrics = activityFacts.some(
          (f) => f.value.metric_value && parseInt(f.value.metric_value, 10) >= 10
        );
        if (hasMetrics) {
          proofValidated.push('At least 1 project at M2 milestone');
          completionPercentage += 60;
        } else {
          proofMissing.push('At least 1 project at M2 milestone');
        }

        const hasAward = activityFacts.some(
          (f) => f.value.item_type === 'Award' && f.value.tier1_state === 'Won'
        );
        if (hasAward) {
          proofValidated.push('1+ award won');
          completionPercentage += 40;
        } else {
          proofMissing.push('1+ award won');
        }
        break;

      case ExecutionRung.VALIDATION:
        // Check for external validations
        const validations = activityFacts.filter(
          (f) =>
            (f.value.item_type === 'Award' && f.value.tier1_state === 'Won') ||
            f.value.press_mentions
        );

        if (validations.length >= 2) {
          proofValidated.push('2+ external validations');
          completionPercentage += 100;
        } else {
          proofMissing.push('2+ external validations');
        }
        break;

      case ExecutionRung.SUBMISSION:
        // Check for submitted applications
        const submittedApps = activityFacts.filter(
          (f) =>
            f.value.item_type === 'CollegeApp' && f.value.tier1_state === 'Submitted'
        );

        if (submittedApps.length >= 3) {
          proofValidated.push('Applications submitted to at least 3 schools');
          completionPercentage += 100;
        } else {
          proofMissing.push('Applications submitted to at least 3 schools');
        }
        break;
    }

    const readyToAdvance = completionPercentage >= 100;
    const nextRungIndex = this.LADDER_RUNGS.findIndex((r) => r.rung === rung.rung) + 1;
    const nextRung =
      nextRungIndex < this.LADDER_RUNGS.length ? this.LADDER_RUNGS[nextRungIndex].rung : null;

    const blockers: string[] = [];
    if (!readyToAdvance && proofMissing.length > 0) {
      blockers.push(`Missing proof: ${proofMissing.join(', ')}`);
    }

    return {
      current_rung: rung.rung,
      rung_number: rung.rung_number,
      completion_percentage: Math.min(completionPercentage, 100),
      proof_validated: proofValidated,
      proof_missing: proofMissing,
      ready_to_advance: readyToAdvance,
      next_rung: nextRung,
      blockers,
    };
  }

  /**
   * Generate recommendations based on ladder position
   */
  private generateRecommendations(
    currentRung: RungProgress,
    atRisk: boolean,
    weeklyProgressFacts: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Primary recommendation: Complete current rung
    if (currentRung.proof_missing.length > 0) {
      recommendations.push(
        `Focus on completing ${currentRung.current_rung} rung: ${currentRung.proof_missing.join(', ')}`
      );
    }

    // If at risk, escalate
    if (atRisk) {
      recommendations.push(
        '⚠️ Behind expected timeline - consider scope cut or ally recruitment to accelerate'
      );
    }

    // If ready to advance, celebrate and move up
    if (currentRung.ready_to_advance && currentRung.next_rung) {
      recommendations.push(
        `✅ Ready to advance to ${currentRung.next_rung} rung! Celebrate progress and start next phase.`
      );
    }

    // If weekly completion rate low, address
    const recentWeeks = weeklyProgressFacts.slice(-4);
    const avgCompletionRate =
      recentWeeks.reduce((sum, w) => sum + (w.value.completion_rate || 0), 0) /
      Math.max(recentWeeks.length, 1);

    if (avgCompletionRate < 60 && weeklyProgressFacts.length >= 4) {
      recommendations.push(
        `Weekly completion rate is ${Math.round(avgCompletionRate)}% (target: 60%+). Review capacity and cut low-priority tasks.`
      );
    }

    return recommendations;
  }
}
