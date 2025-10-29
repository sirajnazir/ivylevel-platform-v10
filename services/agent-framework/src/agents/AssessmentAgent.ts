/**
 * Assessment Agent
 *
 * Autonomous, proactive agent that auto-triggers on student_onboarded event
 * Runs 27-layer assessment with 27-second credibility establishment
 * Synthesis moment at minute 12:53 (identity creation from chaos)
 *
 * Flow:
 * 1. student_onboarded event → AssessmentAgent.start()
 * 2. Execute 27 assessment layers via JennyDuanCoach
 * 3. Create assessment_session record
 * 4. Emit assessment_completed event → GamePlanAgent
 */

import { Pool, PoolClient } from 'pg';
import { EventBus, LifecycleEvent } from '../events/EventBus.js';
import { StudentContextRepository } from '../repositories/StudentContextRepository.js';
import { CoachIntelligenceRepository } from '../repositories/CoachIntelligenceRepository.js';
import { KnowledgeMoatRepository } from '../repositories/KnowledgeMoatRepository.js';
import { JennyDuanCoach } from '../intelligence/JennyDuanCoach.js';
import { StudentContext } from '../types/StudentContext.js';
import { AssessmentSession } from '../types/CoachIntelligence.js';

export class AssessmentAgent {
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

    // Subscribe to student_onboarded events
    this.eventBus.on('student_onboarded', (event) => this.handleStudentOnboarded(event));
  }

  /**
   * Handle student_onboarded event
   * Autonomously start assessment session
   */
  private async handleStudentOnboarded(event: LifecycleEvent): Promise<void> {
    console.log(`[AssessmentAgent] 🎯 Student onboarded: ${event.student_id}`);
    console.log(`[AssessmentAgent] 🚀 Starting autonomous assessment...`);

    try {
      const result = await this.startAssessment(event.student_id, event.coach_id);

      console.log(`[AssessmentAgent] ✅ Assessment completed for ${event.student_id}`);
      console.log(`[AssessmentAgent] 📊 Session ID: ${result.session_id}`);
      console.log(`[AssessmentAgent] ⏱️  Duration: ${result.duration_minutes} minutes`);
      console.log(`[AssessmentAgent] 🎓 Layers executed: ${result.layers_executed}/27`);
    } catch (error) {
      console.error(`[AssessmentAgent] ❌ Assessment failed for ${event.student_id}:`, error);
      throw error;
    }
  }

  /**
   * Start assessment session
   * 27-layer autonomous assessment with synthesis moment
   */
  async startAssessment(
    studentId: string,
    coachId: string
  ): Promise<AssessmentSession> {
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

    // 4. Create assessment session record
    const sessionId = await this.createAssessmentSession(studentId, coachId);

    console.log(`[AssessmentAgent] 📝 Created assessment session: ${sessionId}`);
    console.log(`[AssessmentAgent] 🧠 Executing 27 assessment layers...`);

    // 5. Execute assessment layers
    const assessmentResult = await this.executeAssessmentLayers(
      coach,
      student,
      sessionId
    );

    // 5b. Recommend tactics based on barriers identified
    console.log(`[AssessmentAgent] 🎯 Recommending tactics based on barriers...`);
    const recommendedTactics = await this.recommendTacticsForBarriers(
      assessmentResult,
      student
    );
    assessmentResult.gap_analysis.recommended_tactics = recommendedTactics;
    console.log(`[AssessmentAgent] 💡 Recommended ${recommendedTactics.length} tactics to address barriers`);

    // 6. Synthesis moment (minute 12:53)
    console.log(`[AssessmentAgent] 💡 Synthesis moment: Creating identity from chaos...`);
    const synthesis = await this.synthesiseMoment(assessmentResult, student);

    // 7. Update assessment session with results
    const durationMinutes = Math.round((Date.now() - startTime) / 1000 / 60);
    await this.completeAssessmentSession(
      sessionId,
      assessmentResult,
      synthesis,
      durationMinutes
    );

    // 8. Update student context with assessment insights
    await this.updateStudentContext(student, assessmentResult);

    // 9. Emit assessment_completed event → GamePlanAgent
    console.log(`[AssessmentAgent] 📢 Emitting assessment_completed event...`);
    await this.eventBus.emit({
      event_type: 'assessment_completed',
      student_id: studentId,
      coach_id: coachId,
      payload: {
        session_id: sessionId,
        rubric_total: assessmentResult.rubric_scores.total,
        identity_score: assessmentResult.identity_score,
      },
    });

    // 10. Increment coach counters
    await this.coachRepo.incrementCounters(coachId, {
      assessments_completed: 1,
    });

    return {
      session_id: sessionId,
      student_id: studentId,
      coach_id: coachId,
      started_at: new Date(startTime),
      completed_at: new Date(),
      duration_minutes: durationMinutes,
      diagnostic_result: assessmentResult.diagnostic,
      eq_profile: assessmentResult.eq_profile,
      rubric_scores: assessmentResult.rubric_scores,
      time_architecture: assessmentResult.time_architecture,
      gap_analysis: assessmentResult.gap_analysis,
      layers_executed: 27,
      synthesis_moment_timestamp: new Date(),
      assessment_complete: true,
      gameplan_triggered: false,
      created_at: new Date(startTime),
    };
  }

  /**
   * Execute 27 assessment layers
   */
  private async executeAssessmentLayers(
    coach: JennyDuanCoach,
    student: StudentContext,
    sessionId: string
  ): Promise<AssessmentResult> {
    // Execute assessment action via coach intelligence
    const response = await coach.executeCoachingAction('assessment', student, {
      action_type: 'assessment',
      timing: {
        class_year: student.class_year,
        current_week: student.current_week,
      },
    });

    console.log(`[AssessmentAgent] ✅ Assessment layers executed`);
    console.log(`[AssessmentAgent] 🎭 Personas used: ${response.metadata.personas_used.join(', ')}`);
    console.log(`[AssessmentAgent] 🛠️  Tools applied: ${response.metadata.tools_applied.join(', ')}`);

    // Extract assessment results from persona outputs
    // In real implementation, this would parse the detailed persona outputs
    const assessmentResult: AssessmentResult = {
      diagnostic: {
        personality_type: student.psycho_behavioral.personality_type,
        capacity_level: student.psycho_behavioral.capacity_level,
        social_style: student.psycho_behavioral.social_style,
        execution_style: student.psycho_behavioral.execution_style,
      },
      eq_profile: {
        confidence_level: student.state.confidence_level,
        vulnerability_level: 1, // Week 1, no vulnerability yet
        parent_anxiety: student.family.parent_anxiety_level,
      },
      rubric_scores: student.state.rubric_scores,
      time_architecture: {
        class_year: student.class_year,
        current_week: student.current_week,
        weeks_remaining: this.calculateWeeksRemaining(student),
        high_roi_opportunities: this.identifyHighROIOpportunities(student),
      },
      gap_analysis: {
        current_total: student.state.rubric_scores.total,
        target_total: 25,
        gap: 25 - student.state.rubric_scores.total,
        priority_areas: this.identifyPriorityAreas(student),
      },
      identity_score: student.state.identity_score,
      strategic_insights: response.message,
    };

    return assessmentResult;
  }

  /**
   * Synthesis moment: Create identity from chaos
   * Minute 12:53 - identity creation from scattered interests
   */
  private async synthesiseMoment(
    assessment: AssessmentResult,
    student: StudentContext
  ): Promise<IdentitySynthesis> {
    // Identity fusion engineering
    let identityFusion = student.interests.identity_fusion;

    if (!identityFusion) {
      // Create identity fusion from scattered interests
      const passions = student.interests.primary_passions;
      if (passions.includes('film') && passions.includes('game_dev')) {
        identityFusion = 'Film × CS → Digital Storyteller';
      } else if (passions.includes('coding') && passions.includes('game_dev')) {
        identityFusion = 'Game Developer × Storyteller';
      } else {
        identityFusion = `${passions[0]} × ${passions[1] || 'Technology'}`;
      }
    }

    return {
      identity_fusion: identityFusion,
      narrative_thread: this.extractNarrativeThread(student, assessment),
      unique_positioning: this.determineUniquePositioning(student),
      strategic_target: this.identifyStrategicTarget(student),
      confidence_trajectory: 'Building foundation → Quick wins → Identity crystallization',
    };
  }

  /**
   * Create assessment session record
   */
  private async createAssessmentSession(
    studentId: string,
    coachId: string
  ): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO assessment_sessions (student_id, coach_id, started_at, assessment_complete, layers_executed)
       VALUES ($1, $2, NOW(), false, 0)
       RETURNING session_id`,
      [studentId, coachId]
    );

    return result.rows[0].session_id;
  }

  /**
   * Complete assessment session with results
   */
  private async completeAssessmentSession(
    sessionId: string,
    assessment: AssessmentResult,
    synthesis: IdentitySynthesis,
    durationMinutes: number
  ): Promise<void> {
    await this.pool.query(
      `UPDATE assessment_sessions
       SET completed_at = NOW(),
           duration_minutes = $1,
           diagnostic_result = $2,
           eq_profile = $3,
           rubric_scores = $4,
           time_architecture = $5,
           gap_analysis = $6,
           layers_executed = 27,
           synthesis_moment_timestamp = NOW(),
           assessment_complete = true
       WHERE session_id = $7`,
      [
        durationMinutes,
        JSON.stringify(assessment.diagnostic),
        JSON.stringify(assessment.eq_profile),
        JSON.stringify(assessment.rubric_scores),
        JSON.stringify(assessment.time_architecture),
        JSON.stringify(assessment.gap_analysis),
        sessionId,
      ]
    );
  }

  /**
   * Update student context with assessment insights
   */
  private async updateStudentContext(
    student: StudentContext,
    assessment: AssessmentResult
  ): Promise<void> {
    await this.studentRepo.update(student.student_id, {
      state: {
        identity_score: assessment.identity_score,
        rubric_scores: assessment.rubric_scores,
        lifecycle_state: 'assessment_in_progress',
      },
    });
  }

  /**
   * Helper: Calculate weeks remaining until application season
   */
  private calculateWeeksRemaining(student: StudentContext): number {
    // Junior year has ~52 weeks, senior year application deadlines ~week 15
    if (student.class_year === 'junior') {
      return 52 - student.current_week;
    } else if (student.class_year === 'senior') {
      return Math.max(0, 15 - student.current_week);
    }
    return 100; // Freshman/Sophomore have more time
  }

  /**
   * Helper: Identify high ROI opportunities
   */
  private identifyHighROIOpportunities(student: StudentContext): string[] {
    const opportunities: string[] = [];

    // NCWIT for STEM females
    if (
      student.interests.primary_passions.some((p) =>
        ['coding', 'CS', 'game_dev'].includes(p)
      )
    ) {
      opportunities.push('NCWIT Aspirations in Computing');
    }

    // Game jams for game dev
    if (student.interests.primary_passions.includes('game_dev')) {
      opportunities.push('Global Game Jam', 'Ludum Dare');
    }

    // Local hackathons
    opportunities.push('Local hackathon (high ROI)');

    return opportunities;
  }

  /**
   * Helper: Identify priority areas for rubric improvement
   */
  private identifyPriorityAreas(student: StudentContext): string[] {
    const scores = student.state.rubric_scores;
    const priorities: string[] = [];

    if (scores.recognition < 2) priorities.push('Recognition (awards)');
    if (scores.leadership < 3) priorities.push('Leadership positions');
    if (scores.service < 2) priorities.push('Service/community impact');
    if (scores.artifacts < 4) priorities.push('Artifacts/portfolio');

    return priorities;
  }

  /**
   * Helper: Extract narrative thread
   */
  private extractNarrativeThread(
    student: StudentContext,
    assessment: AssessmentResult
  ): string {
    const passions = student.interests.primary_passions;
    return `${passions[0]} → ${passions[1] || 'impact'} → ${student.goals.career_interests[0] || 'future career'}`;
  }

  /**
   * Helper: Determine unique positioning
   */
  private determineUniquePositioning(student: StudentContext): string[] {
    const positioning: string[] = [];

    if (student.psycho_behavioral.social_style === 'quiet') {
      positioning.push('Quiet leadership');
    }

    if (student.family.cultural_factors.length > 0) {
      positioning.push(`${student.family.cultural_factors[0]} perspective in tech`);
    }

    positioning.push(...student.interests.unique_angles);

    return positioning;
  }

  /**
   * Helper: Identify strategic target (hidden from student)
   */
  private identifyStrategicTarget(student: StudentContext): string {
    const strategicSchool = student.goals.target_schools.find(
      (s) => s.strategic_priority === 1
    );
    return strategicSchool?.name || 'To be determined';
  }

  /**
   * Recommend tactics based on barriers identified in assessment
   */
  private async recommendTacticsForBarriers(
    assessmentResult: AssessmentResult,
    student: StudentContext
  ): Promise<any[]> {
    // Extract barriers from gap_analysis priority areas
    const barriers: string[] = [];
    const archetypes: string[] = [];

    // Map rubric gaps to barriers
    if (assessmentResult.rubric_scores.recognition < 2) {
      barriers.push('low-recognition', 'lack-differentiation');
    }
    if (assessmentResult.rubric_scores.leadership < 3) {
      barriers.push('low-leadership', 'underconfident');
    }
    if (assessmentResult.rubric_scores.artifacts < 4) {
      barriers.push('low-productivity', 'procrastination');
    }

    // Time pressure (always present for juniors/seniors)
    if (student.class_year === 'junior' || student.class_year === 'senior') {
      barriers.push('time-crisis', 'stress-overload');
    }

    // Confidence issues
    if (assessmentResult.eq_profile.confidence_level < 0.4) {
      barriers.push('imposter-syndrome', 'underconfident');
    }

    // Identity/positioning issues
    if (!student.interests.identity_fusion) {
      barriers.push('identity-crisis', 'lack-differentiation', 'essay-generic');
    }

    // Cultural identity
    if (student.family.cultural_factors && student.family.cultural_factors.length > 0) {
      barriers.push('cultural-identity', 'hiding-culture');
      archetypes.push('cultural-identity', 'first-gen-immigrant');
    }

    // STEM female archetype
    if (student.interests.primary_passions.some(p => ['coding', 'CS', 'game_dev', 'STEM'].includes(p))) {
      archetypes.push('STEM-female');
    }

    // Universal
    archetypes.push('all-students');

    console.log(`[AssessmentAgent] 🔍 Identified barriers: ${barriers.slice(0, 8).join(', ')}`);
    console.log(`[AssessmentAgent] 🎭 Student archetypes: ${archetypes.join(', ')}`);

    // Search for tactics
    const tactics = await this.moatRepo.searchTacticChips({
      barriers,
      archetypes: archetypes.length > 0 ? archetypes : undefined,
      limit: 5,
    });

    // If no matches with archetypes, try barriers only
    if (tactics.length === 0 && archetypes.length > 0) {
      console.log(`[AssessmentAgent] 🔄 No matches with archetypes, trying barriers only...`);
      const tacticsBarriersOnly = await this.moatRepo.searchTacticChips({
        barriers,
        limit: 5,
      });
      return tacticsBarriersOnly.map(t => ({
        tactic_name: t.tactic_name,
        tactic_slug: t.tactic_slug,
        category: t.tactic_category,
        barriers_addressed: t.barriers_addressed,
        why_relevant: t.core_principle,
        estimated_duration: t.estimated_duration,
      }));
    }

    return tactics.map(t => ({
      tactic_name: t.tactic_name,
      tactic_slug: t.tactic_slug,
      category: t.tactic_category,
      barriers_addressed: t.barriers_addressed,
      why_relevant: t.core_principle,
      estimated_duration: t.estimated_duration,
    }));
  }
}

/**
 * Assessment Result
 */
interface AssessmentResult {
  diagnostic: Record<string, any>;
  eq_profile: Record<string, any>;
  rubric_scores: {
    academics: number;
    leadership: number;
    service: number;
    artifacts: number;
    recognition: number;
    total: number;
  };
  time_architecture: Record<string, any>;
  gap_analysis: Record<string, any>;
  identity_score: number;
  strategic_insights: string;
}

/**
 * Identity Synthesis
 */
interface IdentitySynthesis {
  identity_fusion: string;
  narrative_thread: string;
  unique_positioning: string[];
  strategic_target: string;
  confidence_trajectory: string;
}
