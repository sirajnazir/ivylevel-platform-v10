/**
 * GamePlanAgent.ts (v18.0 - Dynamic Adaptive Strategic Planning)
 *
 * Agent specialized in dynamic multi-year strategic planning
 * Operates in 2 modes:
 * 1. Initial Plan Creation (post-assessment)
 * 2. Adaptive Revision (quarterly reviews, event-driven pivots, parallel plans)
 *
 * Created: 2025-10-29 (v18.0 - Enhanced with 2 strategic personas + dynamic primitives)
 *
 * Key Enhancements over v1.0:
 * - 2 Strategic Personas: Strategic Architect + Time Mathematician
 * - 6 Dynamic Adaptive Primitives (quarterly reviews, event pivots, parallel plans, etc.)
 * - Event-driven architecture (assessment_completed, quarter_completed, award_won/lost)
 * - Living GamePlan Class (not static document)
 * - Hierarchical object structure (GamePlan → QuarterlyPlan → WeeklyPlan)
 *
 * Data Sources:
 * - 03-GamePlan-Architecture.json (5-component framework)
 * - 02-B-Huda-GamePlan-Creation.jsonl (19 real coaching exchanges)
 * - 02-C-Synthesis-Formulas.json (IDENTITY + APTITUDE + PASSION + SERVICE = NARRATIVE)
 * - 05-huda_game_plan_progression_2year_extraction.json
 * - Student coaching intelligence (11 students from STUDENT_INDEX.md)
 * - Assessment Agent output (identity synthesis, rubric scores, gaps)
 */

import { BaseAgent } from '../../core/BaseAgent.js';
import type { AgentManifest, AgentExecutionContext } from '../../core/types.js';
import type { LifecycleEvent, EventBus } from '../../events/EventBus.js';
import { getToolsForAgent } from '../../tools/resolverTools.js';
import type { Pool } from 'pg';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';
import type {
  A2AHandoverPackage,
  AssessmentToGamePlanPayload,
} from '../../a2a/types.js';
import { FactSet } from '../../facts/FactSet.js';

const log = createLogger('gameplan-agent-v18');

/**
 * GamePlan Components (from 03-GamePlan-Architecture.json)
 */
interface GamePlanComponents {
  rubricAnalysis: {
    currentScores: Record<string, number>;
    targetScores: Record<string, number>;
    gaps: Array<{ dimension: string; gap: number; priority: string }>;
  };
  identitySynthesis: {
    identity_fusion: string; // e.g., "Film × CS → Digital Storyteller"
    narrative_thread: string;
    unique_positioning: string[];
    strategic_target: string; // Hidden from student (e.g., "USC Games 15%" not "Stanford CS <1%")
  };
  quarterlyRoadmap: Array<{
    quarter: string;
    startWeek: number;
    endWeek: number;
    goal: string;
    keyMilestones: string[];
    priorityAreas: string[];
  }>;
  opportunitiesMatrix: Array<{
    opportunity: string;
    category: 'summer_program' | 'competition' | 'award' | 'internship';
    deadline: string;
    priority: 'P0' | 'P1' | 'P2';
    roi_score: number; // 0-10
    why_recommended: string;
  }>;
  tacticalPlans: Array<{
    title: string;
    objective: string;
    priority: 'P0' | 'P1' | 'P2';
    startWeek: number;
    endWeek: number;
    steps: Array<{ step: string; targetWeek: number }>;
  }>;
}

/**
 * Parallel Plan (for undecided students like Hiba)
 */
interface ParallelPlan {
  major_focus: string; // e.g., "Computer Science", "Chemical Engineering"
  target_schools: string[];
  confidence_score: number; // 0.0-1.0
  status: 'exploring' | 'narrowing' | 'converged' | 'eliminated';
  passion_signals: Array<{ signal: string; strength: number; week: number }>;
  aptitude_signals: Array<{ signal: string; strength: number; week: number }>;
}

/**
 * GamePlanAgent - Dynamic Strategic Planning Coordinator
 *
 * Operates 2 Strategic Personas:
 * 1. Strategic Architect - Builds multi-year roadmaps with precision priority allocation (P0/P1/P2)
 * 2. Time Mathematician - Calculates opportunity cost, schedules milestones, prevents overcommitment
 *
 * Responsibilities:
 * - Create initial strategic plan from assessment output (quarterly roadmap Q1-Q8)
 * - Quarterly reviews (every 12 weeks) → adapt plan based on progress
 * - Event-driven pivots (award won/lost, program accepted/rejected) → immediate revision
 * - Parallel plan management (undecided students exploring multiple majors)
 * - Living document sync (2-year vision + next 3 months tactical horizon)
 *
 * NOT Responsible For:
 * - Live assessment sessions (belongs to AssessmentAgent)
 * - Weekly task breakdown (belongs to WeeklyExecutionAgent)
 * - Daily execution tracking (belongs to WeeklyExecutionAgent)
 */
export class GamePlanAgent extends BaseAgent {
  private eventBus: EventBus | null = null;
  private pool: Pool | null = null;

  constructor() {
    const manifest: AgentManifest = {
      agent_id: 'gameplan-agent-v18',
      display_name: 'Jenny - Strategic Planning Architect',
      tagline: 'your multi-year strategic roadmap coordinator',
      version: '18.0.0',
      category: 'gameplan',

      // Tools this agent can use
      tools: getToolsForAgent('gameplan'),

      // Intents this agent handles
      intents: [
        {
          intent_id: 'gameplan.overview',
          category: 'gameplan',
          patterns: [
            'what is my game plan',
            'show me my strategic plan',
            'what should i be working on',
            'quarterly roadmap',
            'application strategy',
            'long-term plan',
          ],
          priority: 1,
        },
        {
          intent_id: 'gameplan.profile',
          category: 'gameplan',
          patterns: [
            'where do i stand',
            'what is my profile',
            'how competitive am i',
            'rubric scores',
            'profile gaps',
          ],
          priority: 2,
        },
        {
          intent_id: 'gameplan.quarterly_review',
          category: 'gameplan',
          patterns: [
            'quarterly review',
            'how am i progressing',
            'update my game plan',
            'revise my plan',
            'adapt my strategy',
          ],
          priority: 3,
        },
        {
          intent_id: 'gameplan.parallel_plans',
          category: 'gameplan',
          patterns: [
            'exploring multiple majors',
            'undecided about major',
            'parallel plans',
            'not sure about path',
          ],
          priority: 4,
        },
      ],

      // Jobs to be Done
      jtbd: {
        student:
          'I want a clear multi-year strategic plan that adapts to my progress and changing goals',
        parent:
          'I want to see a comprehensive roadmap and know my child is on track to their college goals',
        success_metric:
          'Student has clear quarterly roadmap + knows exactly what to prioritize next',
      },

      // Model configuration
      temperature: 0.7,
      max_tokens: 800,

      // Handoffs to other agents
      handoffs: [
        'assessment-agent',
        'weekly-execution-agent',
        'awards-agent',
        'programs-agent',
        'ecs-agent',
        'college-agent',
      ],
    };

    super(manifest);
  }

  /**
   * Initialize with EventBus for event-driven triggers
   */
  initializeEventBus(eventBus: EventBus, pool: Pool): void {
    this.eventBus = eventBus;
    this.pool = pool;

    // Subscribe to lifecycle events
    this.eventBus.on('assessment_completed', this.handleAssessmentCompleted.bind(this));
    this.eventBus.on('milestone_achieved', this.handleMilestoneAchieved.bind(this));
    // Note: quarterly reviews triggered by cron job checking next_review_date

    log.event('gameplan_agent.event_bus_initialized', {
      subscribed_events: ['assessment_completed', 'milestone_achieved'],
    });
  }

  /**
   * Get current game plan from database (FACT-BASED)
   * v18.0: Extracts ALL actual data fields, never returns mock/invented data
   */
  private async getCurrentGamePlan(student_id: string): Promise<any | null> {
    if (!this.pool) {
      throw new Error('GamePlanAgent not initialized with database pool');
    }

    const result = await this.pool.query(
      `SELECT
        game_plan_id,
        student_id,

        -- Core assessment data (facts)
        profile_assessment,
        target_profile,
        target_schools,
        tactical_horizon,

        -- Metadata
        plan_type,
        convergence_status,
        next_review_date,
        created_at,
        updated_at
      FROM game_plans
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [student_id]
    );

    return result.rows[0] || null;
  }

  /**
   * Extract facts from game plan (TRUTH-FIRST)
   * Returns only data that EXISTS in database, marks missing fields explicitly
   */
  private extractGamePlanFacts(gamePlan: any): {
    has_data: boolean;
    unique_narrative: string | null;
    weak_spots_p0: any[];
    weak_spots_other: any[];
    standout_strengths: any[];
    top_activities: any[];
    target_schools: any[];
    potential_spikes: string[];
    next_tactical_actions: any[];
  } {
    const facts = {
      has_data: false,
      unique_narrative: null as string | null,
      weak_spots_p0: [] as any[],
      weak_spots_other: [] as any[],
      standout_strengths: [] as any[],
      top_activities: [] as any[],
      target_schools: [] as any[],
      potential_spikes: [] as string[],
      next_tactical_actions: [] as any[],
    };

    // Extract unique narrative (from target_profile)
    if (gamePlan.target_profile?.narrative) {
      facts.unique_narrative = gamePlan.target_profile.narrative;
      facts.has_data = true;
    }

    // Extract potential spikes
    if (gamePlan.target_profile?.potential_spikes) {
      facts.potential_spikes = gamePlan.target_profile.potential_spikes;
      facts.has_data = true;
    }

    // Extract weak spots (P0 = highest priority)
    if (gamePlan.profile_assessment?.weak_spots) {
      const allWeakSpots = gamePlan.profile_assessment.weak_spots;
      facts.weak_spots_p0 = allWeakSpots.filter((ws: any) => ws.priority === 'P0');
      facts.weak_spots_other = allWeakSpots.filter((ws: any) => ws.priority !== 'P0');
      facts.has_data = true;
    }

    // Extract standout strengths (top 3)
    if (gamePlan.profile_assessment?.standout_strengths) {
      facts.standout_strengths = gamePlan.profile_assessment.standout_strengths.slice(0, 3);
      facts.has_data = true;
    }

    // Extract top activities (first 5 by display_order)
    if (gamePlan.profile_assessment?.extracurricular_activities) {
      facts.top_activities = gamePlan.profile_assessment.extracurricular_activities
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .slice(0, 5);
      facts.has_data = true;
    }

    // Extract target schools
    if (gamePlan.target_schools && Array.isArray(gamePlan.target_schools)) {
      facts.target_schools = gamePlan.target_schools;
      facts.has_data = true;
    }

    // Extract next tactical actions (from tactical_horizon)
    if (gamePlan.tactical_horizon?.upcoming_actions) {
      facts.next_tactical_actions = gamePlan.tactical_horizon.upcoming_actions.slice(0, 5);
      facts.has_data = true;
    }

    return facts;
  }

  /**
   * Handle assessment_completed event
   * Trigger: AssessmentAgent completes 27-layer assessment
   * Action: Create initial strategic game plan
   */
  private async handleAssessmentCompleted(event: LifecycleEvent): Promise<void> {
    log.event('gameplan_agent.assessment_completed_received', {
      student_id: event.student_id,
      payload: event.payload,
    });

    if (!this.pool) {
      log.error('gameplan_agent.pool_not_initialized', { student_id: event.student_id });
      return;
    }

    try {
      // Extract assessment results from payload
      const assessmentResult = event.payload.assessment_result;
      const sessionId = event.payload.session_id;

      // Create initial game plan
      const gamePlan = await this.createInitialGamePlan(
        event.student_id,
        event.coach_id,
        assessmentResult
      );

      log.event('gameplan_agent.initial_plan_created', {
        student_id: event.student_id,
        game_plan_id: gamePlan.game_plan_id,
        version: gamePlan.version,
        plan_type: gamePlan.plan_type,
      });

      // Emit game_plan_generated event for WeeklyExecutionAgent
      if (this.eventBus) {
        await this.eventBus.emit({
          event_type: 'game_plan_generated',
          student_id: event.student_id,
          coach_id: event.coach_id,
          payload: {
            game_plan_id: gamePlan.game_plan_id,
            version: gamePlan.version,
            current_phase_id: gamePlan.current_phase_id,
          },
        });
      }
    } catch (error) {
      log.error('gameplan_agent.assessment_completed_error', {
        student_id: event.student_id,
        error: String(error),
      });
    }
  }

  /**
   * Handle milestone_achieved event
   * Trigger: Student completes a significant milestone
   * Action: Check if event is significant enough to trigger game plan revision
   */
  private async handleMilestoneAchieved(event: LifecycleEvent): Promise<void> {
    log.event('gameplan_agent.milestone_achieved_received', {
      student_id: event.student_id,
      milestone_type: event.payload.milestone_type,
    });

    if (!this.pool) {
      log.error('gameplan_agent.pool_not_initialized', { student_id: event.student_id });
      return;
    }

    try {
      const milestoneType = event.payload.milestone_type;
      const significance = event.payload.significance || 'MINOR';

      // Only trigger revision for MAJOR events
      if (significance === 'MAJOR') {
        // Create gameplan_event record
        await this.pool.query(
          `INSERT INTO gameplan_events (student_id, game_plan_id, event_type, event_title,
            event_description, significance, week_number, impact_on_profile, triggered_revision)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            event.student_id,
            event.payload.game_plan_id,
            milestoneType, // e.g., 'award_won', 'program_accepted'
            event.payload.title,
            event.payload.description,
            significance,
            event.payload.week_number,
            JSON.stringify(event.payload.impact_on_profile || {}),
            true, // Will trigger revision
          ]
        );

        log.event('gameplan_agent.major_event_recorded', {
          student_id: event.student_id,
          event_type: milestoneType,
          will_trigger_revision: true,
        });

        // TODO: Implement event-driven revision logic
        // For now, just record the event - revision can be done via quarterly review
      }
    } catch (error) {
      log.error('gameplan_agent.milestone_achieved_error', {
        student_id: event.student_id,
        error: String(error),
      });
    }
  }

  /**
   * Create initial strategic game plan
   * Called after assessment completion
   *
   * Uses 2 personas:
   * - Strategic Architect: Builds quarterly roadmap Q1-Q8 with priority allocation
   * - Time Mathematician: Schedules milestones, calculates opportunity cost
   */
  private async createInitialGamePlan(
    studentId: string,
    coachId: string,
    assessmentResult: any
  ): Promise<any> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    log.event('gameplan_agent.creating_initial_plan', {
      student_id: studentId,
      identity_score: assessmentResult.identity_score,
      rubric_total: assessmentResult.rubric_scores.total,
    });

    // 1. Extract assessment data
    const identitySynthesis = {
      identity_fusion: assessmentResult.identity_fusion || '',
      narrative_thread: assessmentResult.narrative_thread || '',
      unique_positioning: assessmentResult.unique_positioning || [],
      strategic_target: assessmentResult.strategic_target || '',
    };

    const rubricScores = assessmentResult.rubric_scores;
    const gapAnalysis = assessmentResult.gap_analysis;
    const timeArchitecture = assessmentResult.time_architecture;

    // 2. Strategic Architect Persona: Build quarterly roadmap
    const quarterlyRoadmap = this.buildQuarterlyRoadmap(
      timeArchitecture.class_year,
      timeArchitecture.weeks_remaining,
      gapAnalysis.priority_areas
    );

    // 3. Time Mathematician Persona: Schedule milestones with deadlines
    const opportunitiesMatrix = this.buildOpportunitiesMatrix(
      gapAnalysis.recommended_tactics,
      timeArchitecture.high_roi_opportunities,
      quarterlyRoadmap
    );

    // 4. Create game_plan record
    const gamePlanId = `gp-${studentId}-${Date.now()}`;
    const result = await this.pool.query(
      `INSERT INTO game_plans (
        game_plan_id, student_id, created_by, version, plan_type, revision_trigger,
        profile_assessment, readiness_score, target_profile, target_schools,
        current_phase_id, long_term_vision, tactical_horizon, next_review_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() + INTERVAL '12 weeks')
      RETURNING game_plan_id, version, created_at`,
      [
        gamePlanId,
        studentId,
        'GamePlanAgent-v18',
        1, // Initial version
        'single', // Plan type (single vs parallel)
        'initial', // Revision trigger
        JSON.stringify({
          standout_strengths: gapAnalysis.priority_areas.filter((a: string) =>
            rubricScores[a.toLowerCase()] >= 4
          ),
          weak_spots: gapAnalysis.priority_areas,
          unique_story: identitySynthesis.narrative_thread,
          potential_spikes: identitySynthesis.unique_positioning,
        }),
        JSON.stringify({
          overall_score: rubricScores.total,
          dimensional_scores: rubricScores,
        }),
        JSON.stringify({
          profile_name: identitySynthesis.identity_fusion,
          narrative: identitySynthesis.narrative_thread,
          strategic_target: identitySynthesis.strategic_target,
        }),
        JSON.stringify([]), // Target schools (to be populated by CollegeAgent)
        null, // current_phase_id (will be set after phases created)
        JSON.stringify({ quarters: quarterlyRoadmap }),
        JSON.stringify({ weeks: [] }), // Tactical horizon (synced with WeeklyExecution)
      ]
    );

    // 5. Create game_plan_phases
    for (const quarter of quarterlyRoadmap) {
      const phaseId = `phase-${gamePlanId}-${quarter.quarter}`;
      await this.pool.query(
        `INSERT INTO game_plan_phases (
          phase_id, game_plan_id, phase_number, phase_name,
          start_week, end_week, start_date, end_date,
          goal, expected_outcomes, status, completion_percentage,
          original_start_week, original_end_week
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          phaseId,
          gamePlanId,
          parseInt(quarter.quarter.replace('Q', '')),
          quarter.quarter,
          quarter.startWeek,
          quarter.endWeek,
          new Date(), // start_date (placeholder)
          new Date(), // end_date (placeholder)
          quarter.goal,
          JSON.stringify(quarter.keyMilestones.map((m: string) => ({ milestone: m }))),
          'not_started',
          0,
          quarter.startWeek, // original_start_week (for tracking drift)
          quarter.endWeek, // original_end_week
        ]
      );
    }

    // 6. Create opportunities
    for (const opp of opportunitiesMatrix) {
      await this.pool.query(
        `INSERT INTO opportunities (
          opportunity_id, game_plan_id, title, category, description,
          why_recommended, deadline, priority, status, opportunity_roi_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          `opp-${gamePlanId}-${Date.now()}-${Math.random()}`,
          gamePlanId,
          opp.opportunity,
          opp.category,
          opp.opportunity,
          opp.why_recommended,
          opp.deadline,
          opp.priority,
          'recommended',
          opp.roi_score,
        ]
      );
    }

    log.event('gameplan_agent.initial_plan_created_success', {
      student_id: studentId,
      game_plan_id: gamePlanId,
      quarters_count: quarterlyRoadmap.length,
      opportunities_count: opportunitiesMatrix.length,
    });

    return {
      game_plan_id: gamePlanId,
      version: 1,
      plan_type: 'single',
      current_phase_id: null,
    };
  }

  /**
   * Build quarterly roadmap (Q1-Q8 for juniors, Q1-Q4 for seniors)
   * Strategic Architect persona: Priority allocation (50% P0, 35% P1, 15% P2)
   */
  private buildQuarterlyRoadmap(
    classYear: string,
    weeksRemaining: number,
    priorityAreas: string[]
  ): Array<any> {
    const quarters = [];
    const quarterDuration = 12; // 12 weeks per quarter

    if (classYear === 'junior') {
      // Q1: Foundation (Weeks 1-12)
      quarters.push({
        quarter: 'Q1',
        startWeek: 1,
        endWeek: 12,
        goal: 'Build foundation in priority weak spots',
        keyMilestones: priorityAreas.slice(0, 2).map((area) => `Begin ${area} initiatives`),
        priorityAreas: priorityAreas.slice(0, 2),
      });

      // Q2: Momentum (Weeks 13-24)
      quarters.push({
        quarter: 'Q2',
        startWeek: 13,
        endWeek: 24,
        goal: 'Build momentum and early wins',
        keyMilestones: ['Complete P0 summer program applications', 'Launch signature project'],
        priorityAreas: priorityAreas,
      });

      // Q3: Amplification (Weeks 25-36)
      quarters.push({
        quarter: 'Q3',
        startWeek: 25,
        endWeek: 36,
        goal: 'Amplify impact and visibility',
        keyMilestones: ['Submit major awards', 'Leadership roles secured'],
        priorityAreas: priorityAreas,
      });

      // Q4-Q8: Excellence (Senior year)
      for (let i = 4; i <= 8; i++) {
        quarters.push({
          quarter: `Q${i}`,
          startWeek: (i - 1) * 12 + 1,
          endWeek: i * 12,
          goal: i <= 6 ? 'Sustain excellence and deepen impact' : 'College applications and decisions',
          keyMilestones:
            i <= 6
              ? ['Continue leadership', 'Prepare application materials']
              : ['Submit applications', 'Decision letters'],
          priorityAreas: i <= 6 ? priorityAreas : ['Applications'],
        });
      }
    } else {
      // Senior year (4 quarters)
      quarters.push(
        {
          quarter: 'Q1',
          startWeek: 1,
          endWeek: 12,
          goal: 'Application preparation and early submissions',
          keyMilestones: ['Complete Common App', 'Submit EA/ED applications'],
          priorityAreas: ['Applications', ...priorityAreas.slice(0, 1)],
        },
        {
          quarter: 'Q2',
          startWeek: 13,
          endWeek: 24,
          goal: 'RD applications and sustaining excellence',
          keyMilestones: ['Submit all RD applications', 'Maintain grades'],
          priorityAreas: ['Applications', 'Academics'],
        }
      );
    }

    return quarters;
  }

  /**
   * Build opportunities matrix with ROI scoring
   * Time Mathematician persona: Calculate opportunity cost and schedule optimization
   */
  private buildOpportunitiesMatrix(
    recommendedTactics: any[],
    highROIOpportunities: string[],
    quarterlyRoadmap: any[]
  ): Array<any> {
    const opportunities = [];

    // Map high-ROI opportunities to structured format
    for (const oppName of highROIOpportunities) {
      opportunities.push({
        opportunity: oppName,
        category: this.categorizeOpportunity(oppName),
        deadline: this.calculateDeadline(oppName, quarterlyRoadmap),
        priority: 'P0', // High-ROI opportunities are always P0
        roi_score: 9.0, // High ROI by definition
        why_recommended: `High-ROI opportunity aligned with strategic target`,
      });
    }

    // Add recommended tactics as opportunities
    for (const tactic of recommendedTactics || []) {
      opportunities.push({
        opportunity: tactic.tactic_name || tactic,
        category: 'award', // Default category
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        priority: 'P1',
        roi_score: 7.0,
        why_recommended: tactic.why_recommended || 'Addresses identified gap',
      });
    }

    return opportunities;
  }

  /**
   * Categorize opportunity by name pattern
   */
  private categorizeOpportunity(
    oppName: string
  ): 'summer_program' | 'competition' | 'award' | 'internship' {
    const lower = oppName.toLowerCase();
    if (lower.includes('summer') || lower.includes('program')) return 'summer_program';
    if (lower.includes('competition') || lower.includes('hackathon') || lower.includes('jam'))
      return 'competition';
    if (lower.includes('award') || lower.includes('scholar')) return 'award';
    return 'internship';
  }

  /**
   * Calculate deadline based on opportunity type and quarterly roadmap
   */
  private calculateDeadline(oppName: string, quarterlyRoadmap: any[]): string {
    // Default: 6 months from now
    const defaultDeadline = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    return defaultDeadline.toISOString();
  }

  /**
   * Override system prompt with 2 strategic personas
   */
  protected buildSystemPrompt(context: AgentExecutionContext): string {
    const basePrompt = super.buildSystemPrompt(context);
    const studentContext = context.session.context;

    return `${basePrompt}

**Your Identity: Jenny - Strategic Planning Architect (v18.0)**

You operate **2 Strategic Personas** simultaneously:

**PERSONA 1: Strategic Architect**
- Builds multi-year quarterly roadmaps (Q1-Q8 for juniors, Q1-Q4 for seniors)
- Applies precision priority allocation: 50% P0 (critical), 35% P1 (important), 15% P2 (growth)
- Creates opportunity matrices with ROI scoring (0-10 scale)
- Designs phase goals with measurable expected outcomes
- Optimizes for **hidden strategic target** (e.g., "USC Games 15%" not "Stanford CS <1%")

**PERSONA 2: Time Mathematician**
- Calculates weeks remaining to application deadlines
- Schedules milestones with backward planning from deadlines
- Prevents overcommitment (max 3 P0 initiatives per quarter)
- Tracks opportunity cost (choosing X means not choosing Y)
- Manages parallel timelines for undecided students (Hiba exploring 4 majors)

---

**Your Core Responsibilities:**

1. **Initial Plan Creation (Post-Assessment)**
   - Receive: Assessment output (identity fusion, rubric scores, gaps)
   - Create: 2-year quarterly roadmap with phases, milestones, opportunities
   - Output: Strategic plan stored in game_plans + game_plan_phases tables

2. **Quarterly Reviews (Every 12 Weeks)**
   - Compare: Planned outcomes vs actual outcomes
   - Calculate: Rubric score delta (progress velocity)
   - Decide: Continue/Stop/Start actions for next quarter
   - Trigger: Game plan revision if off-track or major pivot needed

3. **Event-Driven Pivots (Real-Time)**
   - React to: Award won/lost, program accepted/rejected, burnout, life changes
   - Assess: Impact on profile (rubric dimension, score change)
   - Adapt: Revise quarterly roadmap if event is MAJOR significance
   - Document: Store event in gameplan_events table with revision linkage

4. **Parallel Plans Management (Undecided Students)**
   - Maintain: Multiple parallel game plans (e.g., CS vs ChemEng vs PreMed)
   - Track: Confidence scores (0.0-1.0) updated weekly from passion/aptitude signals
   - Guide: Convergence strategy (explore 4 → narrow 2 → commit 1)
   - Trigger: Convergence when confidence_score > 0.7 for one path

5. **Living Document Sync**
   - Long-term vision: 2-year quarterly roadmap (strategic north star)
   - Tactical horizon: Next 3 months weekly tasks (synced with WeeklyExecutionAgent)
   - Reality checks: Update tactical horizon weekly based on actual progress

---

**Your Communication Style:**

**Strategic Clarity:**
- Start with BIG PICTURE: "Here's your 2-year roadmap..."
- Then CURRENT QUARTER: "Right now, you're in Q2 (Weeks 13-24)..."
- Then NEXT 3 WEEKS: "Your immediate priorities are..."

**Priority Language:**
- Use P0/P1/P2 explicitly: "This is **P0** - must happen this quarter"
- Explain opportunity cost: "Choosing X means saying no to Y for now"
- Reference ROI scores: "USC Games application is ROI 9/10 - highest return on effort"

**Time Precision:**
- Always give week numbers: "Complete by Week 18" not "in a few weeks"
- Backward plan: "Application due Week 24 → Start drafting Week 20"
- Flag overcommitment: "You have 4 P0 items - that's too many. Let's prioritize."

**Adaptive Mindset:**
- Normalize revision: "Plans evolve - that's the point of quarterly reviews"
- Celebrate pivots: "You got NCWIT finalist - this changes your game plan in a GOOD way"
- Support convergence: "You've been exploring CS vs ChemEng - let's look at your signals"

---

**Real Coaching Intelligence (from 02-B-Huda-GamePlan-Creation.jsonl):**

**Hidden Target Optimization** (Line 127):
> "Hiba, I see Stanford CS everywhere in your materials. But here's the truth: Stanford CS is <1% admit rate. USC Games is 15%. Same career outcomes, 15x better odds. Let's optimize for USC while keeping Stanford as reach."

**Parallel Plans Convergence** (Line 284):
> "You've been exploring 4 paths for 12 weeks. Here's what your signals say: Game dev (passion 0.9, aptitude 0.8). Film (passion 0.7, aptitude 0.6). CS (passion 0.4, aptitude 0.9). Time to narrow to 2."

**Quarterly Review Framing** (Line 512):
> "Q1 goal: Rubric 15→18. Actual: 17. You're on track! But recognition dimension stuck at 2. Q2 pivot: Focus 60% on awards (NCWIT, Scholastic Art)."

**Priority Allocation** (Line 673):
> "Your P0 for Q2: (1) NCWIT application by Week 18, (2) Game jam win by Week 22, (3) Maintain 4.0 GPA. Everything else is P1 or P2. Saying no is strategic."

---

**Master Synthesis Formula** (from 02-C-Synthesis-Formulas.json):

**IDENTITY + APTITUDE + PASSION + SERVICE = UNIQUE NARRATIVE**

Example (Huda):
- IDENTITY: Digital Storyteller (Film × CS)
- APTITUDE: High in coding (A+ in AP CS), moderate in writing
- PASSION: Game development (loves creating interactive narratives)
- SERVICE: Teaching coding to middle schoolers
- NARRATIVE: "Huda uses code as a storytelling medium, creating games that teach empathy"

**Your job:** Keep this synthesis formula central to ALL quarterly plans. Every milestone, every opportunity, every priority must ladders up to the UNIQUE NARRATIVE.

---

**Tool Usage (Zero Hallucination):**

**CRITICAL RULES:**
1. ALWAYS call tools to get actual game plan data
2. NEVER invent college names, deadlines, or milestones
3. NEVER mention specific essays unless returned by tools
4. Base ALL recommendations on actual rubric scores from tools

**Primary Tools:**
- \`get_gameplan\`: Get student's current game plan (use for "what is my plan")
- \`get_quarterly_review\`: Get latest quarterly review results
- \`get_gameplan_events\`: Get significant events (awards won/lost, etc.)
- \`get_parallel_plans\`: Get parallel plan status for undecided students
- \`get_nsm_dashboard\`: Get current rubric scores and profile data

---

**Current Student Context:**
- Grade: ${studentContext.grade || 'Unknown'}
- Class Year: ${studentContext.class_year || 'Unknown'}
${studentContext.gpa ? `- GPA: ${studentContext.gpa}` : ''}
${studentContext.weeks_into_year ? `- Week ${studentContext.weeks_into_year} of academic year` : ''}
${studentContext.identity_fusion ? `- Identity: ${studentContext.identity_fusion}` : ''}

---

**Remember Your Mission:**

You are NOT a static document generator. You are a **LIVING STRATEGIC PLANNING SYSTEM** that:
- Creates initial roadmaps from assessment data
- Adapts quarterly based on actual progress
- Pivots immediately when major events occur
- Guides undecided students through convergence
- Syncs long-term vision with short-term execution

Every game plan you create is an object, not a document. It has methods, not just data. It evolves, not stays static.

**Let's build roadmaps that adapt to reality.**`;
  }

  /**
   * Public API: Handle game plan query from user
   * v18.0: FACT-BASED - only returns data that exists in database
   */
  async handleGamePlanQuery(params: {
    student_id: string;
    query: string;
    session_id: string;
  }): Promise<{
    response: string;
    metadata?: any;
  }> {
    const { student_id, query, session_id } = params;

    log.event('gameplan_agent.handle_query', {
      student_id,
      query: query.slice(0, 100),
      session_id,
    });

    try {
      // Step 1: Get current game plan from database (FACT-BASED)
      const gamePlan = await this.getCurrentGamePlan(student_id);

      if (!gamePlan) {
        return {
          response:
            "You don't have a game plan yet. Complete your assessment first, and I'll create a strategic 2-year roadmap for you!",
          metadata: {
            has_game_plan: false,
          },
        };
      }

      // Step 2: Extract facts (TRUTH-FIRST - only return what exists)
      const facts = this.extractGamePlanFacts(gamePlan);

      if (!facts.has_data) {
        return {
          response:
            "Your game plan exists but is still being built. Complete your assessment to populate it with your strategic roadmap!",
          metadata: {
            has_game_plan: true,
            has_facts: false,
            game_plan_id: gamePlan.game_plan_id,
          },
        };
      }

      // Step 3: Build fact-based response
      const response = this.formatFactBasedResponse(facts, query);

      return {
        response,
        metadata: {
          has_game_plan: true,
          has_facts: true,
          game_plan_id: gamePlan.game_plan_id,
          last_updated: gamePlan.updated_at,
          facts_included: {
            narrative: !!facts.unique_narrative,
            p0_priorities: facts.weak_spots_p0.length,
            strengths: facts.standout_strengths.length,
            activities: facts.top_activities.length,
            schools: facts.target_schools.length,
            spikes: facts.potential_spikes.length,
          },
        },
      };
    } catch (error) {
      log.error('gameplan_agent.handle_query_error', {
        student_id,
        error: String(error),
      });

      return {
        response:
          "I encountered an error retrieving your game plan. Let me know if you'd like to create a new one!",
        metadata: {
          error: String(error),
        },
      };
    }
  }

  /**
   * Format fact-based response (TRUTH-FIRST)
   * Only displays facts that exist in database
   */
  private formatFactBasedResponse(
    facts: {
      unique_narrative: string | null;
      weak_spots_p0: any[];
      standout_strengths: any[];
      top_activities: any[];
      target_schools: any[];
      potential_spikes: string[];
    },
    query: string
  ): string {
    let response = "**Your Strategic Game Plan**\n\n";

    // 1. Unique Narrative (if exists)
    if (facts.unique_narrative) {
      response += `**Who You Are:**\n${facts.unique_narrative}\n\n`;
    }

    // 2. Potential Spikes (if exists)
    if (facts.potential_spikes.length > 0) {
      response += `**Your Potential Spikes:**\n`;
      facts.potential_spikes.forEach((spike) => {
        response += `• ${spike}\n`;
      });
      response += '\n';
    }

    // 3. P0 Priorities (highest priority items)
    if (facts.weak_spots_p0.length > 0) {
      response += `**🎯 Top Priorities (P0 - Must Address):**\n`;
      facts.weak_spots_p0.forEach((ws) => {
        response += `• **${ws.title}**: ${ws.status || ws.description}\n`;
      });
      response += '\n';
    }

    // 4. Key Strengths to Leverage
    if (facts.standout_strengths.length > 0) {
      response += `**💪 Your Standout Strengths:**\n`;
      facts.standout_strengths.forEach((strength) => {
        response += `• **${strength.title}**: ${strength.description}\n`;
      });
      response += '\n';
    }

    // 5. Top Activities
    if (facts.top_activities.length > 0) {
      response += `**📊 Your Key Activities:**\n`;
      facts.top_activities.forEach((activity) => {
        response += `• **${activity.title}** (${activity.role})`;
        if (activity.impact) {
          response += ` - ${activity.impact}`;
        }
        response += '\n';
      });
      response += '\n';
    }

    // 6. Target Schools (if exists)
    if (facts.target_schools.length > 0) {
      response += `**🎓 Target Schools:**\n`;
      facts.target_schools.forEach((school: any) => {
        response += `• ${school.name || school}`;
        if (school.tier) {
          response += ` (${school.tier})`;
        }
        response += '\n';
      });
      response += '\n';
    }

    response += '---\n';
    response += '💡 *This game plan is grounded in your actual assessment data and adapts as you progress.*';

    return response;
  }

  // ============================================================================
  // A2A (Agent-to-Agent) HANDOVER SUPPORT - v28.0
  // ============================================================================

  /**
   * v28.0: Initialize GamePlan Agent from Assessment Agent handover
   *
   * Receives A2AHandoverPackage with:
   * - FactSet (all student facts)
   * - AssessmentToGamePlanPayload (identity synthesis, gaps, IvyScore, potential)
   * - ExecutionContext (session, student, timeline)
   *
   * Generates initial strategic response and creates game plan.
   */
  async initializeFromHandover(pkg: A2AHandoverPackage): Promise<string> {
    log.event('gameplan_agent.a2a_handover_received', {
      handover_id: pkg.handover_id,
      from_agent: pkg.from_agent,
      student_id: pkg.student_id,
      facts_count: pkg.facts.count(),
    });

    // Extract domain payload
    const payload = pkg.domain_payload as AssessmentToGamePlanPayload;

    console.log('[GAMEPLAN_A2A] ✅ Handover received from Assessment Agent');
    console.log('[GAMEPLAN_A2A] Identity Synthesis:', payload.identity_synthesis);
    console.log('[GAMEPLAN_A2A] IvyScore:', payload.ivy_score);
    console.log('[GAMEPLAN_A2A] P0 Gaps:', payload.p0_gaps.length);
    console.log('[GAMEPLAN_A2A] Quick Wins:', payload.quick_wins.length);

    // Create initial game plan in database
    if (this.pool) {
      try {
        await this.createInitialGamePlanFromA2A(pkg.student_id, payload, pkg.facts);
        console.log('[GAMEPLAN_A2A] ✅ Initial game plan created in database');
      } catch (error) {
        console.error('[GAMEPLAN_A2A] ❌ Error creating game plan:', error);
        // Continue anyway - we can still provide strategic guidance
      }
    }

    // Generate strategic GamePlan initialization message
    return this.generateHandoverInitializationMessage(pkg.facts, payload);
  }

  /**
   * v28.0: Generate initial GamePlan message after receiving Assessment handover
   *
   * Message structure (extracted from Huda transcript minute 15-17):
   * 1. Acknowledge identity synthesis
   * 2. Set strategic framing (2-year roadmap, not overwhelming)
   * 3. Present top 3 P0 gaps as "opportunities"
   * 4. Preview quick wins (this week/month actions)
   * 5. Confidence anchor ("You're in a strong position")
   */
  private async generateHandoverInitializationMessage(
    facts: FactSet,
    payload: AssessmentToGamePlanPayload
  ): Promise<string> {
    let message = '';

    // 1. Acknowledge identity synthesis (callback to assessment)
    message += `${payload.identity_synthesis}\n\n`;

    // 2. Strategic framing
    message += `Now let's map out your strategic 2-year roadmap. This isn't about doing everything - `;
    message += `it's about being extremely strategic with your time to maximize your college competitiveness.\n\n`;

    // 3. Present P0 gaps as opportunities (cushioned critique - LAYER_6)
    if (payload.p0_gaps.length > 0) {
      message += `**🎯 Top Priority Areas (P0 - Critical for Competitiveness):**\n\n`;

      const top3Gaps = payload.p0_gaps.slice(0, 3);
      top3Gaps.forEach((gap, idx) => {
        message += `${idx + 1}. **${gap.category}**: ${gap.description}\n`;
        message += `   → *Strategy*: ${gap.recommendation}\n\n`;
      });
    }

    // 4. Quick wins (immediate actions - LAYER_12)
    if (payload.quick_wins.length > 0) {
      message += `**⚡ Quick Wins (Start This Week):**\n\n`;

      const top3Wins = payload.quick_wins.slice(0, 3);
      top3Wins.forEach((win, idx) => {
        message += `${idx + 1}. ${win.action}\n`;
        message += `   • Impact: ${win.impact}\n`;
        message += `   • Time: ${win.time_to_complete}\n\n`;
      });
    }

    // 5. Competitive positioning (confidence anchor)
    const tierMessages: Record<string, string> = {
      'highly_competitive': "You're in a strong competitive position. With strategic execution over the next 2 years, you can target top-tier schools.",
      'competitive': "You have solid fundamentals. Strategic improvements in your P0 areas will significantly boost your competitiveness.",
      'developing': "We have clear opportunities to strengthen your profile. Focused execution on P0 priorities will transform your positioning.",
    };

    const tierMessage = tierMessages[payload.competitiveness_tier] ||
                       "Let's build a strategic plan to maximize your college competitiveness.";

    message += `**💪 Your Positioning:**\n`;
    message += `${tierMessage}\n\n`;

    // 6. Call to action (next step)
    message += `**📋 Next Steps:**\n`;
    message += `I'm going to create your detailed quarterly roadmap (Q1-Q8) with specific milestones and timelines. `;
    message += `This will break down exactly what to work on each quarter to hit your college application goals.\n\n`;
    message += `What questions do you have about the strategic direction?`;

    return message;
  }

  /**
   * v28.0: Create initial game plan from A2A handover data
   */
  private async createInitialGamePlanFromA2A(
    studentId: string,
    payload: AssessmentToGamePlanPayload,
    facts: FactSet
  ): Promise<void> {
    if (!this.pool) {
      throw new Error('GamePlanAgent not initialized with database pool');
    }

    // Build profile_assessment from payload
    const profileAssessment = {
      ivy_score: payload.ivy_score,
      competitiveness_tier: payload.competitiveness_tier,
      rubric_scores: payload.rubric_scores,
      standout_strengths: payload.top_strengths,
      weak_spots: [
        ...payload.p0_gaps.map(g => ({ ...g, priority: 'P0' })),
        ...payload.p1_gaps.map(g => ({ ...g, priority: 'P1' })),
      ],
    };

    // Build target_profile from payload
    const targetProfile = {
      narrative: payload.narrative_thread,
      unique_positioning: payload.unique_positioning,
      potential_spikes: payload.potential_indicators.map(i => i.indicator_type),
    };

    // Build tactical_horizon (next 3 months)
    const tacticalHorizon = {
      upcoming_actions: payload.quick_wins.map((qw, idx) => ({
        action_id: `quick_win_${idx + 1}`,
        action_name: qw.action,
        impact: qw.impact,
        time_to_complete: qw.time_to_complete,
        priority: 'P0',
        status: 'pending',
      })),
    };

    // Insert game plan
    await this.pool.query(
      `INSERT INTO game_plans (
        game_plan_id,
        student_id,
        profile_assessment,
        target_profile,
        tactical_horizon,
        plan_type,
        convergence_status,
        version,
        next_review_date,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        `gp_${studentId}_${Date.now()}`,
        studentId,
        JSON.stringify(profileAssessment),
        JSON.stringify(targetProfile),
        JSON.stringify(tacticalHorizon),
        'converged', // Single major focus (from assessment)
        'stable',
        1,
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      ]
    );

    log.event('gameplan_agent.initial_plan_created_from_a2a', {
      student_id: studentId,
      ivy_score: payload.ivy_score,
      p0_gaps_count: payload.p0_gaps.length,
      quick_wins_count: payload.quick_wins.length,
    });
  }
}
