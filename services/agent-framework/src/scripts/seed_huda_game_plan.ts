/**
 * Seed Huda's Game Plan Data (v12.0)
 *
 * Student: Huda A. (huda-2025)
 * Program Duration: 08/02/2023 - February 2025
 * Current Status: Senior, Week 89, Final semester before graduation
 * Profile: SAT 1530, GPA 3.97 UW / 4.52 W, 5 APs senior year
 *
 * Game Plan Structure:
 * - Phase 1: Exploration & Foundation Building (Weeks 1-30, Aug 2023 - Mar 2024)
 * - Phase 2: Deepening & Achieving (Weeks 31-60, Mar 2024 - Oct 2024)
 * - Phase 3: Excellence & Application (Weeks 61-89+, Oct 2024 - Feb 2025) ← CURRENT PHASE
 */

import { pool } from '../db/pool.js';

async function seedHudaGamePlan() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const studentId = 'huda-2025';
    const journeyStartDate = new Date('2023-08-02');
    const gamePlanId = `gp_${studentId}_001`;

    // ============================================================================
    // 1. CREATE MAIN GAME PLAN
    // ============================================================================

    await client.query(`
      INSERT INTO game_plans (
        game_plan_id,
        student_id,
        created_date,
        created_by,
        last_updated,
        version,
        profile_assessment,
        readiness_score,
        target_profile,
        target_schools,
        current_phase_id,
        school_context,
        family_context
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      ON CONFLICT (game_plan_id) DO NOTHING
    `, [
      gamePlanId,
      studentId,
      journeyStartDate,
      'Jenny',
      new Date(),
      1,
      // profile_assessment
      JSON.stringify({
        standout_strengths: [
          {
            strength_id: 'str_001',
            title: 'Strong Academic Foundation',
            description: 'Consistent high performance with 3.97 UW GPA and rigorous AP coursework',
            evidence_ids: ['gpa_3.97', 'ap_5_courses'],
            dimension: 'aptitude'
          },
          {
            strength_id: 'str_002',
            title: 'SAT Excellence',
            description: 'Achieved 1530 SAT score through dedicated prep and iteration (1360 → 1480 → 1530)',
            evidence_ids: ['sat_1530'],
            dimension: 'aptitude'
          },
          {
            strength_id: 'str_003',
            title: 'Multi-Lingual Capability',
            description: 'AP Spanish Language proficiency demonstrates cultural awareness and language skills',
            evidence_ids: ['ap_spanish'],
            dimension: 'passion'
          }
        ],
        weak_spots: [
          {
            weak_spot_id: 'ws_001',
            title: 'Limited Research/Project Portfolio',
            description: 'Need to develop deeper independent research or capstone projects',
            priority: 'P1',
            roi_score: 8,
            addressable_by: ['summer_programs', 'independent_research'],
            linked_tactical_plan_ids: ['tp_phase1_001']
          },
          {
            weak_spot_id: 'ws_002',
            title: 'EC Narrative Cohesion',
            description: 'Activities need stronger thematic connection and leadership progression',
            priority: 'P0',
            roi_score: 9,
            addressable_by: ['leadership_roles', 'spike_development'],
            linked_tactical_plan_ids: ['tp_phase2_002']
          }
        ],
        unique_story: 'High-achieving student with strong academics seeking to develop distinctive narrative through strategic EC engagement and intellectual exploration',
        potential_spikes: [
          'Social Sciences / Psychology',
          'Spanish Language & Culture',
          'Community Service / Social Impact'
        ]
      }),
      // readiness_score
      JSON.stringify({
        overall_score: 78,
        dimensional_scores: [
          { dimension: 'Academic Readiness', score: 92, components: ['GPA: 3.97', 'SAT: 1530', '5 APs'] },
          { dimension: 'EC Depth & Leadership', score: 72, components: ['Need stronger leadership', 'Developing spike'] },
          { dimension: 'Application Narrative', score: 68, components: ['Essays in progress', 'Unique story developing'] }
        ],
        historical_scores: [
          { week_number: 1, overall_score: 65, date: '2023-08-02' },
          { week_number: 30, overall_score: 70, date: '2024-03-01' },
          { week_number: 60, overall_score: 75, date: '2024-10-01' },
          { week_number: 89, overall_score: 78, date: '2025-02-26' }
        ]
      }),
      // target_profile
      JSON.stringify({
        profile_name: 'Well-Rounded High Achiever with Emerging Spike',
        three_pillar_model: {
          aptitude: {
            score: 9,
            evidence: 'SAT 1530, GPA 3.97, 5 APs with straight As',
            strength: 'Exceptional academic foundation'
          },
          passion: {
            score: 7,
            evidence: 'Developing spike in social sciences/psychology, Spanish language proficiency',
            strength: 'Intellectual curiosity with room for deeper specialization'
          },
          service: {
            score: 6,
            evidence: 'Community engagement activities',
            strength: 'Growing commitment to social impact, needs more depth'
          }
        },
        narrative: 'Student who combines academic excellence with cultural awareness and emerging social impact focus. Strongest in aptitude, developing distinctive voice through psychology and Spanish language interests.'
      }),
      // target_schools
      JSON.stringify([
        { tier: 'Reach', schools: ['Top 20 Universities with strong Psychology/Social Science programs'] },
        { tier: 'Target', schools: ['Top 50 Universities, strong liberal arts colleges'] },
        { tier: 'Safety', schools: ['State flagship, honors colleges'] }
      ]),
      // current_phase_id
      `phase_${gamePlanId}_003`, // Phase 3: Excellence & Application (CURRENT)
      // school_context
      JSON.stringify({
        school_type: 'Public High School',
        competitive_level: 'Moderate',
        ap_offerings: 'Wide range of APs available',
        counselor_support: 'Standard'
      }),
      // family_context
      JSON.stringify({
        first_gen: false,
        support_level: 'High engagement with coaching process',
        constraints: 'Standard timeline for Class of 2025'
      })
    ]);

    console.log('✅ Game plan created');

    // ============================================================================
    // 2. CREATE PHASES
    // ============================================================================

    const phases = [
      {
        phase_id: `phase_${gamePlanId}_001`,
        phase_number: 1,
        phase_name: 'Exploration & Foundation Building',
        start_week: 1,
        end_week: 30,
        start_date: '2023-08-02',
        end_date: '2024-03-01',
        goal: 'Build academic foundation (SAT prep, GPA maintenance), explore EC interests, establish coaching rhythm',
        expected_outcomes: [
          { outcome_id: 'eo_p1_001', category: 'academic', description: 'SAT score improvement to 1480+', target_date: '2024-03-15', achieved: true, evidence: 'SAT 1530 achieved April 2024' },
          { outcome_id: 'eo_p1_002', category: 'academic', description: 'Maintain 3.95+ GPA', target_date: '2024-03-01', achieved: true, evidence: 'Final GPA 3.97' },
          { outcome_id: 'eo_p1_003', category: 'ec', description: 'Identify 2-3 core EC areas', target_date: '2024-01-15', achieved: true, evidence: 'Focus on psychology, community service, Spanish' }
        ],
        success_criteria: JSON.stringify([
          'SAT 1450+ achieved',
          'GPA 3.9+ maintained',
          'EC theme identified',
          'Strong coaching rapport established'
        ]),
        status: 'completed',
        completion_percentage: 100
      },
      {
        phase_id: `phase_${gamePlanId}_002`,
        phase_number: 2,
        phase_name: 'Deepening & Achieving',
        start_week: 31,
        end_week: 60,
        start_date: '2024-03-01',
        end_date: '2024-10-01',
        goal: 'Deepen EC engagement, achieve SAT target (1500+), develop application narrative, begin essay drafting',
        expected_outcomes: [
          { outcome_id: 'eo_p2_001', category: 'academic', description: 'Final SAT 1520+', target_date: '2024-06-01', achieved: true, evidence: 'SAT 1530 in April' },
          { outcome_id: 'eo_p2_002', category: 'ec', description: 'Leadership position secured', target_date: '2024-09-01', achieved: true, evidence: 'Leadership roles confirmed' },
          { outcome_id: 'eo_p2_003', category: 'application', description: 'Common App essay first draft', target_date: '2024-09-01', achieved: true, evidence: 'Essay work week 10 (Aug 30)' }
        ],
        success_criteria: JSON.stringify([
          'SAT 1500+ secured',
          'EC leadership demonstrated',
          'Essay narrative clear',
          'School list refined'
        ]),
        status: 'completed',
        completion_percentage: 100
      },
      {
        phase_id: `phase_${gamePlanId}_003`,
        phase_number: 3,
        phase_name: 'Excellence & Application',
        start_week: 61,
        end_week: 95,
        start_date: '2024-10-01',
        end_date: '2025-05-15',
        goal: 'Submit all college applications, maintain senior year grades (5 APs), complete final semester strong, make college decision',
        expected_outcomes: [
          { outcome_id: 'eo_p3_001', category: 'application', description: 'All college applications submitted', target_date: '2025-01-15', achieved: true, evidence: 'Applications completed by January' },
          { outcome_id: 'eo_p3_002', category: 'academic', description: 'Senior year 5 APs all A grades', target_date: '2025-05-15', achieved: false, evidence: 'In progress - currently all As' },
          { outcome_id: 'eo_p3_003', category: 'decision', description: 'College decision made', target_date: '2025-05-01', achieved: false, evidence: 'Awaiting decisions' }
        ],
        success_criteria: JSON.stringify([
          'All applications submitted by Jan 15',
          'Senior year GPA maintained 3.9+',
          'Admission decisions received',
          'Final college choice made'
        ]),
        status: 'in_progress',
        completion_percentage: 75
      }
    ];

    for (const phase of phases) {
      await client.query(`
        INSERT INTO game_plan_phases (
          phase_id, game_plan_id, phase_number, phase_name,
          start_week, end_week, start_date, end_date,
          goal, expected_outcomes, success_criteria,
          status, completion_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (phase_id) DO NOTHING
      `, [
        phase.phase_id, gamePlanId, phase.phase_number, phase.phase_name,
        phase.start_week, phase.end_week, phase.start_date, phase.end_date,
        phase.goal, JSON.stringify(phase.expected_outcomes), phase.success_criteria,
        phase.status, phase.completion_percentage
      ]);
    }

    console.log('✅ Phases created (3 phases)');

    // ============================================================================
    // 3. CREATE MILESTONES
    // ============================================================================

    const milestones = [
      // Phase 1 Milestones (COMPLETED)
      {
        milestone_id: `ms_${gamePlanId}_001`,
        phase_id: `phase_${gamePlanId}_001`,
        title: 'First SAT Improvement',
        description: 'Increase SAT from baseline 1360 to 1450+',
        target_week: 20,
        target_date: '2024-01-01',
        status: 'completed',
        linked_weak_spot_id: null,
        linked_opportunity_id: null
      },
      {
        milestone_id: `ms_${gamePlanId}_002`,
        phase_id: `phase_${gamePlanId}_001`,
        title: 'EC Theme Identified',
        description: 'Clarify focus on psychology/social sciences spike',
        target_week: 25,
        target_date: '2024-02-01',
        status: 'completed',
        linked_weak_spot_id: 'ws_002',
        linked_opportunity_id: null
      },
      // Phase 2 Milestones (COMPLETED)
      {
        milestone_id: `ms_${gamePlanId}_003`,
        phase_id: `phase_${gamePlanId}_002`,
        title: 'Final SAT Score Achieved',
        description: 'Reach target SAT score of 1530',
        target_week: 38,
        target_date: '2024-04-15',
        status: 'completed',
        linked_weak_spot_id: null,
        linked_opportunity_id: null
      },
      {
        milestone_id: `ms_${gamePlanId}_004`,
        phase_id: `phase_${gamePlanId}_002`,
        title: 'Common App Essay First Draft',
        description: 'Complete initial draft of personal statement',
        target_week: 50,
        target_date: '2024-08-30',
        status: 'completed',
        linked_weak_spot_id: null,
        linked_opportunity_id: null
      },
      {
        milestone_id: `ms_${gamePlanId}_005`,
        phase_id: `phase_${gamePlanId}_002`,
        title: 'College List Finalized',
        description: 'Reach/Target/Safety schools confirmed',
        target_week: 55,
        target_date: '2024-09-30',
        status: 'completed',
        linked_weak_spot_id: null,
        linked_opportunity_id: null
      },
      // Phase 3 Milestones (IN PROGRESS)
      {
        milestone_id: `ms_${gamePlanId}_006`,
        phase_id: `phase_${gamePlanId}_003`,
        title: 'All Applications Submitted',
        description: 'Submit all college applications (ED/EA/RD)',
        target_week: 70,
        target_date: '2025-01-15',
        status: 'completed',
        linked_weak_spot_id: null,
        linked_opportunity_id: null
      },
      {
        milestone_id: `ms_${gamePlanId}_007`,
        phase_id: `phase_${gamePlanId}_003`,
        title: 'Midyear Report Submitted',
        description: 'Senior year first semester grades sent to colleges',
        target_week: 75,
        target_date: '2025-02-15',
        status: 'completed',
        linked_weak_spot_id: null,
        linked_opportunity_id: null
      },
      {
        milestone_id: `ms_${gamePlanId}_008`,
        phase_id: `phase_${gamePlanId}_003`,
        title: 'Admission Decisions Received',
        description: 'Receive and review all college admission decisions',
        target_week: 85,
        target_date: '2025-04-01',
        status: 'in_progress',
        linked_weak_spot_id: null,
        linked_opportunity_id: null
      },
      {
        milestone_id: `ms_${gamePlanId}_009`,
        phase_id: `phase_${gamePlanId}_003`,
        title: 'Final College Decision',
        description: 'Choose and commit to college by May 1',
        target_week: 90,
        target_date: '2025-05-01',
        status: 'not_started',
        linked_weak_spot_id: null,
        linked_opportunity_id: null
      }
    ];

    for (const milestone of milestones) {
      await client.query(`
        INSERT INTO game_plan_milestones (
          milestone_id, phase_id, title, description,
          target_week, target_date, status,
          linked_weak_spot_id, linked_opportunity_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (milestone_id) DO NOTHING
      `, [
        milestone.milestone_id, milestone.phase_id, milestone.title, milestone.description,
        milestone.target_week, milestone.target_date, milestone.status,
        milestone.linked_weak_spot_id, milestone.linked_opportunity_id
      ]);
    }

    console.log('✅ Milestones created (9 milestones)');

    // ============================================================================
    // 4. CREATE TACTICAL PLANS
    // ============================================================================

    const tacticalPlans = [
      {
        tactical_plan_id: `tp_${gamePlanId}_001`,
        phase_id: `phase_${gamePlanId}_001`,
        title: 'SAT Improvement Strategy',
        objective: 'Systematic SAT prep to reach 1500+ score',
        priority: 'P0',
        start_week: 1,
        end_week: 30,
        steps: [
          { step_id: 'step_001', step_number: 1, description: 'Baseline diagnostic (1360)', target_week_range: '1-2', metric: 'score', status: 'completed' },
          { step_id: 'step_002', step_number: 2, description: 'Math section focused prep', target_week_range: '5-15', metric: 'practice_tests', status: 'completed' },
          { step_id: 'step_003', step_number: 3, description: 'Reading/Writing refinement', target_week_range: '15-25', metric: 'section_scores', status: 'completed' },
          { step_id: 'step_004', step_number: 4, description: 'Official SAT March 2024 (1480)', target_week_range: '28-29', metric: 'score', status: 'completed' }
        ],
        metrics: [
          { metric_id: 'metric_001', metric_name: 'SAT Score', metric_type: 'score', target_value: 1480, current_value: 1530, unit: 'points' }
        ],
        status: 'completed',
        completion_percentage: 100,
        linked_weekly_plans: []
      },
      {
        tactical_plan_id: `tp_${gamePlanId}_002`,
        phase_id: `phase_${gamePlanId}_002`,
        title: 'EC Spike Development',
        objective: 'Develop clear narrative around psychology/social impact theme',
        priority: 'P0',
        start_week: 31,
        end_week: 60,
        steps: [
          { step_id: 'step_005', step_number: 1, description: 'Identify leadership opportunities in psych/service clubs', target_week_range: '31-35', metric: 'roles', status: 'completed' },
          { step_id: 'step_006', step_number: 2, description: 'Launch service project or research initiative', target_week_range: '36-45', metric: 'project', status: 'completed' },
          { step_id: 'step_007', step_number: 3, description: 'Document impact and outcomes', target_week_range: '46-55', metric: 'evidence', status: 'completed' },
          { step_id: 'step_008', step_number: 4, description: 'Craft activities list narrative', target_week_range: '56-60', metric: 'application', status: 'completed' }
        ],
        metrics: [
          { metric_id: 'metric_002', metric_name: 'Leadership Positions', metric_type: 'count', target_value: 2, current_value: 2, unit: 'roles' }
        ],
        status: 'completed',
        completion_percentage: 100,
        linked_weekly_plans: []
      },
      {
        tactical_plan_id: `tp_${gamePlanId}_003`,
        phase_id: `phase_${gamePlanId}_003`,
        title: 'Senior Year Excellence',
        objective: 'Maintain straight As in 5 AP courses through graduation',
        priority: 'P0',
        start_week: 61,
        end_week: 95,
        steps: [
          { step_id: 'step_009', step_number: 1, description: 'Strong start in all 5 APs', target_week_range: '61-70', metric: 'grades', status: 'completed' },
          { step_id: 'step_010', step_number: 2, description: 'Midterm exams excellence', target_week_range: '71-75', metric: 'grades', status: 'completed' },
          { step_id: 'step_011', step_number: 3, description: 'Maintain performance during app season', target_week_range: '76-85', metric: 'grades', status: 'in_progress' },
          { step_id: 'step_012', step_number: 4, description: 'Final semester strong finish', target_week_range: '86-95', metric: 'grades', status: 'in_progress' }
        ],
        metrics: [
          { metric_id: 'metric_003', metric_name: 'GPA Senior Year', metric_type: 'gpa', target_value: 3.95, current_value: 3.97, unit: 'gpa' }
        ],
        status: 'in_progress',
        completion_percentage: 70,
        linked_weekly_plans: []
      }
    ];

    for (const plan of tacticalPlans) {
      await client.query(`
        INSERT INTO tactical_plans (
          tactical_plan_id, phase_id, title, objective,
          priority, start_week, end_week,
          steps, metrics, status, completion_percentage,
          linked_weekly_plans
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (tactical_plan_id) DO NOTHING
      `, [
        plan.tactical_plan_id, plan.phase_id, plan.title, plan.objective,
        plan.priority, plan.start_week, plan.end_week,
        JSON.stringify(plan.steps), JSON.stringify(plan.metrics), plan.status, plan.completion_percentage,
        JSON.stringify(plan.linked_weekly_plans)
      ]);
    }

    console.log('✅ Tactical plans created (3 plans)');

    // ============================================================================
    // 5. CREATE OPPORTUNITIES (Time-Sensitive Programs/Awards)
    // ============================================================================

    const opportunities = [
      {
        opportunity_id: `opp_${gamePlanId}_001`,
        title: 'Summer Psychology Research Program',
        category: 'summer_program',
        description: 'Competitive summer program for high school students interested in psychology research',
        why_recommended: 'Aligns with psychology spike, provides research experience (addresses ws_001)',
        deadline: new Date('2024-02-15'),
        application_requirements: [
          'Application essay',
          'Teacher recommendation',
          'Transcript',
          'Research interest statement'
        ],
        time_commitment: '6 weeks, Summer 2024',
        expected_outcomes: [
          'Research project completion',
          'Faculty mentor letter',
          'Presentation at symposium'
        ],
        priority: 'P1',
        status: 'completed',
        linked_weak_spot_ids: ['ws_001'],
        linked_tactical_plan_id: `tp_${gamePlanId}_002`,
        application_progress: {
          requirements_completed: 4,
          requirements_total: 4,
          submitted_date: '2024-02-10',
          decision_date: '2024-03-15',
          outcome: 'Accepted'
        }
      },
      {
        opportunity_id: `opp_${gamePlanId}_002`,
        title: 'National Hispanic Recognition Program',
        category: 'award',
        description: 'Recognition for Hispanic students with high PSAT/SAT scores',
        why_recommended: 'SAT 1530 qualifies, enhances profile diversity',
        deadline: new Date('2024-09-30'),
        application_requirements: [
          'PSAT score',
          'Hispanic heritage documentation',
          'Application form'
        ],
        time_commitment: 'Application only',
        expected_outcomes: [
          'Scholar recognition',
          'Certificate',
          'College application distinction'
        ],
        priority: 'P2',
        status: 'completed',
        linked_weak_spot_ids: [],
        linked_tactical_plan_id: null,
        application_progress: {
          requirements_completed: 3,
          requirements_total: 3,
          submitted_date: '2024-09-15',
          decision_date: '2024-10-30',
          outcome: 'Recognized'
        }
      },
      {
        opportunity_id: `opp_${gamePlanId}_003`,
        title: 'AP Psychology National Exam',
        category: 'competition',
        description: 'AP Psychology exam - demonstrate mastery in spike area',
        why_recommended: 'Validates psychology spike theme, potential college credit',
        deadline: new Date('2025-05-15'),
        application_requirements: [
          'Enrolled in AP Psych course',
          'Exam registration',
          'Study plan execution'
        ],
        time_commitment: 'Full year course + exam',
        expected_outcomes: [
          'Target score: 5',
          'College credit potential',
          'Subject mastery validation'
        ],
        priority: 'P1',
        status: 'applying',
        linked_weak_spot_ids: [],
        linked_tactical_plan_id: `tp_${gamePlanId}_003`,
        application_progress: {
          requirements_completed: 2,
          requirements_total: 3,
          submitted_date: null,
          decision_date: null,
          outcome: null
        }
      }
    ];

    for (const opp of opportunities) {
      await client.query(`
        INSERT INTO opportunities (
          opportunity_id, game_plan_id, title, category,
          description, why_recommended, deadline,
          application_requirements, time_commitment, expected_outcomes,
          priority, status, linked_weak_spot_ids, linked_tactical_plan_id,
          application_progress
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (opportunity_id) DO NOTHING
      `, [
        opp.opportunity_id, gamePlanId, opp.title, opp.category,
        opp.description, opp.why_recommended, opp.deadline,
        JSON.stringify(opp.application_requirements), opp.time_commitment, JSON.stringify(opp.expected_outcomes),
        opp.priority, opp.status, JSON.stringify(opp.linked_weak_spot_ids), opp.linked_tactical_plan_id,
        JSON.stringify(opp.application_progress)
      ]);
    }

    console.log('✅ Opportunities created (3 opportunities)');

    // ============================================================================
    // 6. CREATE APPLICATION COMPONENTS
    // ============================================================================

    const appComponents = [
      {
        component_id: `ac_${gamePlanId}_001`,
        component_type: 'common_app_essay',
        title: 'Personal Statement',
        description: 'Main Common App essay - personal growth narrative',
        linked_game_plan_elements: {
          strength_ids: ['str_001', 'str_003'],
          pillar_names: ['passion', 'service'],
          milestone_ids: [`ms_${gamePlanId}_004`],
          opportunity_ids: [`opp_${gamePlanId}_001`]
        },
        status: 'completed',
        notes: 'Final essay connects psychology interest with community service experiences'
      },
      {
        component_id: `ac_${gamePlanId}_002`,
        component_type: 'activity_list',
        title: 'Common App Activities List',
        description: '10 activities showcasing EC progression and spike',
        linked_game_plan_elements: {
          strength_ids: ['str_003'],
          pillar_names: ['passion', 'service'],
          milestone_ids: [`ms_${gamePlanId}_002`, `ms_${gamePlanId}_005`],
          opportunity_ids: [`opp_${gamePlanId}_001`, `opp_${gamePlanId}_002`]
        },
        status: 'completed',
        notes: 'Activities emphasize psychology/social impact theme with leadership progression'
      },
      {
        component_id: `ac_${gamePlanId}_003`,
        component_type: 'supplemental_essay',
        title: 'Why Major Essays',
        description: 'School-specific essays explaining psychology/social science interest',
        linked_game_plan_elements: {
          strength_ids: ['str_001', 'str_003'],
          pillar_names: ['passion'],
          milestone_ids: [`ms_${gamePlanId}_002`],
          opportunity_ids: [`opp_${gamePlanId}_001`]
        },
        status: 'completed',
        notes: 'Tied to psychology spike and research experience'
      },
      {
        component_id: `ac_${gamePlanId}_004`,
        component_type: 'test_scores',
        title: 'Standardized Test Scores',
        description: 'SAT 1530, AP scores',
        linked_game_plan_elements: {
          strength_ids: ['str_001', 'str_002'],
          pillar_names: ['aptitude'],
          milestone_ids: [`ms_${gamePlanId}_003`],
          opportunity_ids: [`opp_${gamePlanId}_003`]
        },
        status: 'completed',
        notes: 'SAT 1530 (April 2024), 5 AP courses in progress'
      },
      {
        component_id: `ac_${gamePlanId}_005`,
        component_type: 'transcript',
        title: 'Official Transcript',
        description: 'GPA 3.97 UW / 4.52 W, 5 APs senior year',
        linked_game_plan_elements: {
          strength_ids: ['str_001'],
          pillar_names: ['aptitude'],
          milestone_ids: [`ms_${gamePlanId}_007`],
          opportunity_ids: []
        },
        status: 'completed',
        notes: 'Midyear report submitted with straight As in 5 APs'
      }
    ];

    for (const comp of appComponents) {
      await client.query(`
        INSERT INTO application_components (
          component_id, game_plan_id, component_type,
          title, description, linked_game_plan_elements,
          status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (component_id) DO NOTHING
      `, [
        comp.component_id, gamePlanId, comp.component_type,
        comp.title, comp.description, JSON.stringify(comp.linked_game_plan_elements),
        comp.status, comp.notes
      ]);
    }

    console.log('✅ Application components created (5 components)');

    await client.query('COMMIT');

    console.log('\n🎉 SUCCESS: Huda\'s complete game plan seeded!');
    console.log(`
Game Plan Summary:
==================
Student: Huda A. (huda-2025)
Game Plan ID: ${gamePlanId}
Current Phase: Phase 3 - Excellence & Application (75% complete)
Current Week: 89 (Feb 26, 2025)

Created:
- 1 Game Plan with profile assessment & readiness scoring
- 3 Phases (2 completed, 1 in progress)
- 9 Milestones (7 completed, 1 in progress, 1 not started)
- 3 Tactical Plans (2 completed, 1 in progress)
- 3 Opportunities (2 completed, 1 in progress)
- 5 Application Components (all completed)

Test endpoint:
curl http://localhost:8787/students/huda-2025/game-plan
    `);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding game plan:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed script
seedHudaGamePlan()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
