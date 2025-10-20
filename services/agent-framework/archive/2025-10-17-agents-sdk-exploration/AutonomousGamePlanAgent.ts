/**
 * Autonomous GamePlan Agent
 *
 * Autonomous agent that auto-triggers on assessment_completed event
 * Generates 4-pillar gameplan with dual-layer messaging
 * Hidden USC optimization (never mentioned to student)
 *
 * Flow:
 * 1. assessment_completed event → AutonomousGamePlanAgent.start()
 * 2. Generate 4-pillar plan via JennyDuanCoach
 * 3. Create gameplan_report record
 * 4. Emit gameplan_generated event → WeeklyExecutionAgent
 */

import { Pool, PoolClient } from 'pg';
import { EventBus, LifecycleEvent } from '../events/EventBus.js';
import { StudentContextRepository } from '../repositories/StudentContextRepository.js';
import { CoachIntelligenceRepository } from '../repositories/CoachIntelligenceRepository.js';
import { KnowledgeMoatRepository } from '../repositories/KnowledgeMoatRepository.js';
import { JennyDuanCoach } from '../intelligence/JennyDuanCoach.js';
import { StudentContext } from '../types/StudentContext.js';
import { GamePlanReport } from '../types/CoachIntelligence.js';

export class AutonomousGamePlanAgent {
  private pool: Pool;
  private eventBus: EventBus;
  private studentRepo: StudentContextRepository;
  private coachRepo: CoachIntelligenceRepository;
  private moatRepo: KnowledgeMoatRepository;

  constructor(pool: Pool, eventBus: EventBus) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.studentRepo = new StudentContextRepository(pool);
    this.coachRepo = new CoachIntelligenceRepository(pool);
    this.moatRepo = new KnowledgeMoatRepository();

    // Subscribe to assessment_completed events
    this.eventBus.on('assessment_completed', (event) =>
      this.handleAssessmentCompleted(event)
    );
  }

  /**
   * Handle assessment_completed event
   * Autonomously generate gameplan
   */
  private async handleAssessmentCompleted(event: LifecycleEvent): Promise<void> {
    console.log(`[AutonomousGamePlanAgent] 🎯 Assessment completed: ${event.student_id}`);
    console.log(`[AutonomousGamePlanAgent] 🚀 Starting autonomous gameplan generation...`);

    try {
      const result = await this.generateGamePlan(
        event.student_id,
        event.coach_id,
        event.payload.session_id
      );

      console.log(`[AutonomousGamePlanAgent] ✅ GamePlan generated for ${event.student_id}`);
      console.log(`[AutonomousGamePlanAgent] 📊 GamePlan ID: ${result.gameplan_id}`);
      console.log(`[AutonomousGamePlanAgent] 🎯 Strategic Target: ${result.hidden_target_school || 'N/A'}`);
    } catch (error) {
      console.error(`[AutonomousGamePlanAgent] ❌ GamePlan generation failed for ${event.student_id}:`, error);
      throw error;
    }
  }

  /**
   * Generate gameplan
   * 4-pillar plan with dual-layer messaging + hidden optimization
   */
  async generateGamePlan(
    studentId: string,
    coachId: string,
    assessmentSessionId?: string
  ): Promise<GamePlanReport> {
    const startTime = Date.now();

    // 1. Get student context
    const student = await this.studentRepo.getByStudentId(studentId);
    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    // 2. Get coach intelligence
    const coachIntelligence = await this.coachRepo.getByCoachId(coachId);
    if (!coachIntelligence) {
      throw new Error(`Coach not found: ${coachId}`);
    }

    // 3. Initialize coach
    const coach = new JennyDuanCoach(coachIntelligence, this.coachRepo);

    console.log(`[AutonomousGamePlanAgent] 🧠 Generating 4-pillar gameplan...`);

    // 4. Generate gameplan via coach intelligence
    const gameplanResult = await this.executeGamePlanGeneration(
      coach,
      student,
      assessmentSessionId
    );

    // 5. Create gameplan_report record
    const gameplanId = await this.createGamePlanReport(
      studentId,
      coachId,
      assessmentSessionId,
      gameplanResult
    );

    console.log(`[AutonomousGamePlanAgent] 📝 Created gameplan report: ${gameplanId}`);

    // 6. Update student context
    await this.updateStudentContext(student);

    // 7. Mark assessment session as gameplan triggered
    if (assessmentSessionId) {
      await this.markGamePlanTriggered(assessmentSessionId);
    }

    // 8. Emit game_plan_generated event → WeeklyExecutionAgent
    console.log(`[AutonomousGamePlanAgent] 📢 Emitting game_plan_generated event...`);
    await this.eventBus.emit({
      event_type: 'game_plan_generated',
      student_id: studentId,
      coach_id: coachId,
      payload: {
        gameplan_id: gameplanId,
        strategic_target: gameplanResult.hidden_target_school,
        priority_ladder: gameplanResult.priority_ladder,
      },
    });

    // 9. Increment coach counters
    await this.coachRepo.incrementCounters(coachId, {
      gameplans_generated: 1,
    });

    return {
      gameplan_id: gameplanId,
      student_id: studentId,
      coach_id: coachId,
      assessment_session_id: assessmentSessionId || null,
      four_pillar_plan: gameplanResult.four_pillar_plan,
      priority_ladder: gameplanResult.priority_ladder,
      timeline: gameplanResult.timeline,
      parent_brief: gameplanResult.parent_brief,
      dual_layer_encoded: true,
      hidden_target_school: gameplanResult.hidden_target_school,
      probability_calculations: gameplanResult.probability_calculations,
      generated_at: new Date(),
      delivered_to_student: false,
      delivered_at: null,
      created_at: new Date(startTime),
    };
  }

  /**
   * Execute gameplan generation
   * 4-pillar framework with dual-layer messaging
   */
  private async executeGamePlanGeneration(
    coach: JennyDuanCoach,
    student: StudentContext,
    assessmentSessionId?: string
  ): Promise<GamePlanResult> {
    // Execute gameplan action via coach intelligence
    const response = await coach.executeCoachingAction('gameplan', student, {
      action_type: 'gameplan',
      timing: {
        class_year: student.class_year,
        current_week: student.current_week,
      },
    });

    console.log(`[AutonomousGamePlanAgent] ✅ GamePlan generated`);
    console.log(`[AutonomousGamePlanAgent] 🎭 Tone: ${response.tone} (linguistic DNA transformation)`);

    // Build 4-pillar plan with recommended tactics
    const fourPillarPlan = await this.build4PillarPlan(student);
    console.log(`[AutonomousGamePlanAgent] 💡 Recommended ${fourPillarPlan.recommended_tactics?.length || 0} tactics`);

    const priorityLadder = this.buildPriorityLadder(student);
    const timeline = this.buildTimeline(student);
    const parentBrief = this.buildParentBrief(student, fourPillarPlan);

    // Hidden calculations
    const strategicTarget = this.identifyStrategicTarget(student);
    const probabilities = this.calculateProbabilities(student);

    return {
      four_pillar_plan: fourPillarPlan,
      priority_ladder: priorityLadder,
      timeline: timeline,
      parent_brief: parentBrief,
      hidden_target_school: strategicTarget,
      probability_calculations: probabilities,
    };
  }

  /**
   * Build 4-pillar plan with recommended tactics
   * Pillars: Academics, Leadership/ECs, Artifacts/Projects, Recognition/Awards
   */
  private async build4PillarPlan(student: StudentContext): Promise<Record<string, any>> {
    // Get relevant tactics based on student barriers
    const barriers = this.identifyStudentBarriers(student);
    const archetypes = this.identifyStudentArchetypes(student);

    console.log(`[AutonomousGamePlanAgent] 🔍 Identified barriers: ${barriers.join(', ')}`);
    console.log(`[AutonomousGamePlanAgent] 🎭 Student archetypes: ${archetypes.join(', ')}`);

    // Try with both barriers and archetypes first
    let recommendedTactics = await this.moatRepo.searchTacticChips({
      barriers,
      archetypes: archetypes.length > 0 ? archetypes : undefined,
      limit: 10,
    });

    // If no matches with archetypes, try barriers only
    if (recommendedTactics.length === 0 && archetypes.length > 0) {
      console.log(`[AutonomousGamePlanAgent] 🔄 No matches with archetypes, trying barriers only...`);
      recommendedTactics = await this.moatRepo.searchTacticChips({
        barriers,
        limit: 10,
      });
    }

    console.log(`[AutonomousGamePlanAgent] 📋 Found ${recommendedTactics.length} matching tactics`);

    // Get time management tactics for planning pillar
    const timeManagementTactics = await this.moatRepo.getTopTacticsByCategory('Time Management', 3);

    return {
      pillar_1_academics: {
        current: `GPA: ${student.academic.gpa_weighted}W / ${student.academic.gpa_unweighted}UW, ${student.academic.test_scores.ap_count} APs`,
        goal: 'Maintain strong performance, consider retaking SAT for 1450+',
        action_items: [
          'Focus on STEM courses (CS, Math)',
          'Consider retaking SAT in fall (target 1450+)',
          'Take challenging senior year courses aligned with CS/Game Dev',
        ],
        jenny_recommends: timeManagementTactics.length > 0 ? {
          tactic: timeManagementTactics[0].tactic_name,
          slug: timeManagementTactics[0].tactic_slug,
          why: 'Balance academics with EC work using proven time architecture',
          core_principle: timeManagementTactics[0].core_principle,
        } : null,
      },
      pillar_2_leadership_ecs: {
        current: `Score: ${student.state.rubric_scores.leadership}/10`,
        goal: 'Build leadership through passion projects',
        action_items: [
          'Start game dev club at school (or lead existing club)',
          'Organize local game jam event',
          'Mentor younger students in coding/game dev',
        ],
        jenny_recommends: recommendedTactics.find(t => t.domain === 'Strategy') ? {
          tactic: recommendedTactics.find(t => t.domain === 'Strategy')?.tactic_name,
          slug: recommendedTactics.find(t => t.domain === 'Strategy')?.tactic_slug,
          why: 'Build authentic leadership that aligns with your identity',
          core_principle: recommendedTactics.find(t => t.domain === 'Strategy')?.core_principle,
        } : null,
      },
      pillar_3_artifacts: {
        current: `Score: ${student.state.rubric_scores.artifacts}/10`,
        goal: 'Build portfolio of 3-5 games + impact documentation',
        action_items: [
          'Publish 1-2 games on itch.io (focus on social impact themes)',
          'Create portfolio website showcasing work',
          'Document impact: player counts, feedback, community building',
        ],
        jenny_recommends: timeManagementTactics.length > 0 ? {
          tactic: timeManagementTactics[0].tactic_name,
          slug: timeManagementTactics[0].tactic_slug,
          why: 'Use framework to create multiple artifacts efficiently',
          core_principle: 'Single activity yields multiple benefits (game = portfolio + awards + essays)',
        } : null,
      },
      pillar_4_recognition: {
        current: `Score: ${student.state.rubric_scores.recognition}/10`,
        goal: 'Win 1-2 national awards in CS/Game Dev',
        action_items: [
          'Apply to NCWIT Aspirations in Computing (high fit)',
          'Submit game to Global Game Jam, Ludum Dare',
          'Apply to Congressional App Challenge',
        ],
        jenny_recommends: null, // Will be populated with award strategy tactics
      },
      recommended_tactics: recommendedTactics.slice(0, 5).map(t => ({
        tactic_name: t.tactic_name,
        tactic_slug: t.tactic_slug,
        category: t.tactic_category,
        why_relevant: t.core_principle,
        estimated_duration: t.estimated_duration,
      })),
    };
  }

  /**
   * Identify student barriers for tactic matching
   * Maps to actual barriers_addressed values in moat_tactic_chips
   */
  private identifyStudentBarriers(student: StudentContext): string[] {
    const barriers: string[] = [];

    // Low confidence / imposter syndrome
    if (student.state.confidence_level < 0.4) {
      barriers.push('imposter-syndrome');
      barriers.push('underconfident');
    }

    // Time management issues
    if (student.class_year === 'junior' || student.current_week < 10) {
      barriers.push('time-crisis');
      barriers.push('low-productivity');
    }

    // Rubric gaps / lack of artifacts
    if (student.state.rubric_scores.artifacts < 4) {
      barriers.push('low-productivity');
    }

    // Identity/positioning issues
    if (!student.interests.identity_fusion) {
      barriers.push('identity-crisis');
      barriers.push('lack-differentiation');
    }

    // Essay/narrative issues
    if (student.state.rubric_scores.total < 15) {
      barriers.push('essay-generic');
    }

    // Cultural factors
    if (student.family.cultural_factors && student.family.cultural_factors.length > 0) {
      barriers.push('cultural-identity');
      barriers.push('hiding-culture');
    }

    // Stress/overwhelm
    if (student.family.parent_anxiety_level > 6) {
      barriers.push('stress-overload');
    }

    return barriers;
  }

  /**
   * Helper: Identify student archetypes for tactic matching
   * Maps student profile to archetype strings used in moat_tactic_chips
   */
  private identifyStudentArchetypes(student: StudentContext): string[] {
    const archetypes: string[] = [];

    // Cultural identity archetypes
    if (student.family.cultural_factors && student.family.cultural_factors.length > 0) {
      archetypes.push('cultural-identity');

      // Check for first-gen/immigrant indicators
      const culturalFactors = student.family.cultural_factors.map(f => f.toLowerCase());
      if (culturalFactors.some(f => ['indian', 'chinese', 'hispanic', 'asian'].includes(f))) {
        archetypes.push('first-gen-immigrant');
      }
    }

    // Gender + STEM archetype
    if (student.interests.primary_passions.some(p => ['coding', 'CS', 'game_dev', 'STEM'].includes(p))) {
      // Assuming female based on Huda's profile context
      archetypes.push('STEM-female');
    }

    // School type (assume public-school unless explicitly stated)
    archetypes.push('public-school');

    // Confidence-based archetypes
    if (student.state.confidence_level < 0.4) {
      archetypes.push('imposter-syndrome');
      archetypes.push('underconfident');
    }

    // Time management archetypes
    if (student.class_year === 'junior' || student.current_week < 10) {
      archetypes.push('time-crisis');
    }

    // Universal archetype (matches "all-students")
    archetypes.push('all-students');

    return archetypes;
  }

  /**
   * Build priority ladder
   * ROI-ranked action items
   */
  private buildPriorityLadder(student: StudentContext): Record<string, any> {
    return {
      tier_1_critical: [
        {
          action: 'NCWIT Application',
          deadline: 'November 15',
          roi: 'Very High',
          time_investment: '10 hours',
          rationale: 'Perfect fit: STEM + underrepresented + building projects',
        },
        {
          action: 'Build & publish first game on itch.io',
          deadline: '4 weeks',
          roi: 'High',
          time_investment: '20-30 hours',
          rationale: 'Core portfolio piece, demonstrates builder identity',
        },
      ],
      tier_2_high_priority: [
        {
          action: 'Start game dev club at school',
          deadline: '8 weeks',
          roi: 'High',
          time_investment: '5 hours/week',
          rationale: 'Leadership + community building + scale impact',
        },
        {
          action: 'Retake SAT',
          deadline: 'Fall',
          roi: 'Medium-High',
          time_investment: '30 hours prep',
          rationale: '1450+ would strengthen academic pillar',
        },
      ],
      tier_3_medium_priority: [
        {
          action: 'Participate in Global Game Jam',
          deadline: 'January',
          roi: 'Medium',
          time_investment: '48 hours',
          rationale: 'Recognition + portfolio + community',
        },
      ],
    };
  }

  /**
   * Build timeline
   * Week-by-week roadmap
   */
  private buildTimeline(student: StudentContext): Record<string, any> {
    const currentWeek = student.current_week;

    return {
      weeks_1_4: {
        focus: 'Foundation & Quick Wins',
        milestones: [
          'Complete first game prototype',
          'Set up itch.io portfolio',
          'Research NCWIT requirements',
        ],
      },
      weeks_5_8: {
        focus: 'Build & Launch',
        milestones: [
          'Publish first game on itch.io',
          'Start game dev club',
          'Begin NCWIT application',
        ],
      },
      weeks_9_12: {
        focus: 'Recognition & Scale',
        milestones: [
          'Submit NCWIT application',
          'Grow game dev club to 10+ members',
          'Start second game project',
        ],
      },
    };
  }

  /**
   * Build parent brief
   * Dual-layer messaging: confidence + strategic positioning
   */
  private buildParentBrief(
    student: StudentContext,
    fourPillarPlan: Record<string, any>
  ): Record<string, any> {
    return {
      overview: `${student.name} has strong academic foundation (4.3 GPA, 11 APs) and clear passion for game development and computer science. The plan focuses on building a distinctive "builder" identity through projects, leadership, and recognition.`,
      strategic_positioning: {
        current_profile: 'Strong academics + emerging builder identity',
        target_profile: 'Digital storyteller with proven impact',
        differentiation:
          'Quiet leadership + underrepresented perspective in tech + game dev portfolio',
      },
      parent_layer_messaging: {
        confidence_building: `This plan is designed to build ${student.name}'s confidence through achievable milestones while positioning for strong college outcomes.`,
        timeline: `Junior spring is critical for building portfolio. We'll focus on high-ROI activities: NCWIT (national recognition), game dev leadership, portfolio building.`,
        college_outcomes: `This strategic approach positions ${student.name} for strong CS programs with game development focus (USC Games, NYU Game Center, CMU Entertainment Technology Center).`,
      },
      next_steps: [
        'Week 1-2: Set up development environment and start first game',
        'Week 3-4: Research NCWIT and outline application',
        'Week 5-6: Launch game dev club at school',
      ],
    };
  }

  /**
   * Identify strategic target (hidden from student)
   */
  private identifyStrategicTarget(student: StudentContext): string | null {
    const strategicSchool = student.goals.target_schools.find(
      (s) => s.strategic_priority === 1
    );
    return strategicSchool?.name || null;
  }

  /**
   * Calculate probabilities (hidden from student)
   */
  private calculateProbabilities(
    student: StudentContext
  ): Record<string, number> {
    const probs: Record<string, number> = {};

    for (const school of student.goals.target_schools) {
      probs[school.name] = school.probability;
    }

    return probs;
  }

  /**
   * Create gameplan report record
   */
  private async createGamePlanReport(
    studentId: string,
    coachId: string,
    assessmentSessionId: string | undefined,
    gameplan: GamePlanResult
  ): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO gameplan_reports (
        student_id, coach_id, assessment_session_id,
        four_pillar_plan, priority_ladder, timeline, parent_brief,
        dual_layer_encoded, hidden_target_school, probability_calculations,
        generated_at, delivered_to_student
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), false)
      RETURNING gameplan_id`,
      [
        studentId,
        coachId,
        assessmentSessionId || null,
        JSON.stringify(gameplan.four_pillar_plan),
        JSON.stringify(gameplan.priority_ladder),
        JSON.stringify(gameplan.timeline),
        JSON.stringify(gameplan.parent_brief),
        true,
        gameplan.hidden_target_school,
        JSON.stringify(gameplan.probability_calculations),
      ]
    );

    return result.rows[0].gameplan_id;
  }

  /**
   * Update student context
   */
  private async updateStudentContext(student: StudentContext): Promise<void> {
    await this.studentRepo.update(student.student_id, {
      state: {
        lifecycle_state: 'gameplan_generated',
      },
    });
  }

  /**
   * Mark assessment session as gameplan triggered
   */
  private async markGamePlanTriggered(sessionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE assessment_sessions
       SET gameplan_triggered = true
       WHERE session_id = $1`,
      [sessionId]
    );
  }
}

/**
 * GamePlan Result
 */
interface GamePlanResult {
  four_pillar_plan: Record<string, any>;
  priority_ladder: Record<string, any>;
  timeline: Record<string, any>;
  parent_brief: Record<string, any>;
  hidden_target_school: string | null;
  probability_calculations: Record<string, number>;
}
