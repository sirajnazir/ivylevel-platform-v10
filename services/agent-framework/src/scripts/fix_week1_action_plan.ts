/**
 * Fix Week 1 Action Plan Data
 *
 * Based on user feedback, Week 1 should contain comprehensive action items
 * extracted from both the Planning session (08/02/2023) and Check-in session (08/05/2023).
 *
 * This script updates Week 1 with accurate data from actual session transcripts.
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ivylevel',
  user: 'postgres',
  password: 'postgres',
});

const STUDENT_ID = 'huda-2025';
const WEEK_NUMBER = 1;

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

async function fixWeek1ActionPlan() {
  console.log('🔧 Fixing Week 1 Action Plan Data...\n');

  // Based on user's Week 1 session data:
  // 08/02/2023 Planning + 08/05/2023 Check-in

  const executionItems = [
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null, // No outcomes for Week 1
      title: 'Send Jenny complete course schedule',
      description: 'Share full junior year course schedule with Jenny for planning',
      call_to_action: 'Email course schedule to Jenny',
      why: 'Jenny needs to understand academic commitments for time allocation',
      what: 'List of all junior year classes with times',
      how: 'Email or share via Google Doc',
      when: 'This week',
      who: 'student',
      execution_domain: 'academic',
      execution_type: 'communication',
      priority_level: 'P0',
      urgency_score: 9,
      impact_score: 8,
      estimated_duration_minutes: 15,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: '2023-08-02T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Explore Machine Learning Club / Women in AI Club',
      description: 'Research and connect with ML/AI clubs to join',
      call_to_action: 'Research clubs and reach out to organizers',
      why: 'Build technical community and leadership opportunities',
      what: 'Find club contacts, meeting times, and join',
      how: 'Online research + email outreach',
      when: 'This week',
      who: 'student',
      execution_domain: 'extracurricular',
      execution_type: 'research_and_outreach',
      priority_level: 'P1',
      urgency_score: 7,
      impact_score: 8,
      estimated_duration_minutes: 60,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: '2023-08-02T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Talk to MSA (Muslim Student Association) people',
      description: 'Connect with MSA members and explore involvement',
      call_to_action: 'Reach out to MSA leadership',
      why: 'Build community connections and explore leadership roles',
      what: 'Find MSA contact, attend meeting, or connect with members',
      how: 'In-person outreach or social media',
      when: 'This week',
      who: 'student',
      execution_domain: 'extracurricular',
      execution_type: 'networking',
      priority_level: 'P1',
      urgency_score: 6,
      impact_score: 7,
      estimated_duration_minutes: 30,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: '2023-08-02T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Learn about student council and leadership opportunities',
      description: 'Research student government and leadership positions',
      call_to_action: 'Identify leadership opportunities at school',
      why: 'Explore leadership positions for college applications',
      what: 'Research student council, class officer positions, club leadership',
      how: 'Talk to student council advisor, research online',
      when: 'This week',
      who: 'student',
      execution_domain: 'extracurricular',
      execution_type: 'research',
      priority_level: 'P2',
      urgency_score: 5,
      impact_score: 7,
      estimated_duration_minutes: 30,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: '2023-08-02T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Send Jenny complete list of all activities and involvements',
      description: 'Comprehensive list of all ECs, clubs, projects, and commitments',
      call_to_action: 'Document and send complete activity list',
      why: 'Jenny needs full picture to create strategic plan',
      what: 'List of all current and planned activities with time commitments',
      how: 'Google Doc or email',
      when: 'This week',
      who: 'student',
      execution_domain: 'application',
      execution_type: 'documentation',
      priority_level: 'P0',
      urgency_score: 9,
      impact_score: 9,
      estimated_duration_minutes: 45,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: '2023-08-05T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Set up meeting with counselor (email)',
      description: 'Schedule meeting with guidance counselor for junior year planning',
      call_to_action: 'Email counselor to set up meeting by August 14',
      why: 'Build relationship with counselor for LOR and guidance',
      what: 'Email requesting meeting to discuss junior year plans',
      how: 'Use cold email template from Jenny',
      when: 'Schedule meeting for August 14',
      who: 'student',
      execution_domain: 'academic',
      execution_type: 'communication',
      priority_level: 'P0',
      urgency_score: 8,
      impact_score: 8,
      estimated_duration_minutes: 20,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: '2023-08-05T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Film and post one video on YouTube',
      description: 'Create and publish video content',
      call_to_action: 'Film, edit, and post video by end of week',
      why: 'Build content creation portfolio and audience',
      what: 'One complete video for YouTube channel',
      how: 'Film with phone/camera, edit, upload to YouTube',
      when: 'This week',
      who: 'student',
      execution_domain: 'creative_project',
      execution_type: 'content_creation',
      priority_level: 'P1',
      urgency_score: 7,
      impact_score: 7,
      estimated_duration_minutes: 180,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: '2023-08-05T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Solidify name for the project - Folklift',
      description: 'Finalize project name and branding',
      call_to_action: 'Confirm "Folklift" as project name',
      why: 'Need consistent branding for project launch',
      what: 'Project name decision and initial branding',
      how: 'Decision making + initial logo/brand design',
      when: 'This week',
      who: 'student',
      execution_domain: 'creative_project',
      execution_type: 'planning',
      priority_level: 'P1',
      urgency_score: 6,
      impact_score: 7,
      estimated_duration_minutes: 30,
      is_recurring: false,
      completion_state: 'in_progress',
      progress_percentage: 50,
      child_tasks: [],
      created_at: '2023-08-05T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Draft an email message to small businesses',
      description: 'Create outreach email template for small business website project',
      call_to_action: 'Write email template for business outreach',
      why: 'Need template to scale outreach to 30 states goal',
      what: 'Professional email pitch for website services',
      how: 'Draft email using Jenny\'s cold email framework',
      when: 'This week',
      who: 'student',
      execution_domain: 'creative_project',
      execution_type: 'communication',
      priority_level: 'P1',
      urgency_score: 7,
      impact_score: 8,
      estimated_duration_minutes: 60,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: '2023-08-05T00:00:00Z',
    },
    {
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: 'Finish classification model for this week',
      description: 'Complete ML classification model project',
      call_to_action: 'Finish coding and testing classification model',
      why: 'Build technical portfolio and ML skills',
      what: 'Working classification model with test data',
      how: 'Python/TensorFlow coding, testing, documentation',
      when: 'End of this week',
      who: 'student',
      execution_domain: 'academic',
      execution_type: 'technical_project',
      priority_level: 'P1',
      urgency_score: 8,
      impact_score: 8,
      estimated_duration_minutes: 240,
      is_recurring: false,
      completion_state: 'in_progress',
      progress_percentage: 70,
      child_tasks: [],
      created_at: '2023-08-05T00:00:00Z',
    },
  ];

  // Time allocation based on 168-hour framework from Planning session
  const timeAllocation = {
    total_hours_in_period: 168,
    total_fixed_hours: 119, // 56 sleep + 37.5 school + 4.5 transport + 21 misc
    available_hours: 49,
    fixed_commitments: [
      { block_type: 'sleep', hours_per_week: 56 },
      { block_type: 'school', hours_per_week: 37.5 },
      { block_type: 'transportation', hours_per_week: 4.5 },
      { block_type: 'meals_personal', hours_per_week: 21 },
    ],
    flexible_blocks: [
      { category: 'VFX Club', hours_allocated: 2, priority: 'P2' },
      { category: 'Women in AI Club', hours_allocated: 3, priority: 'P1' },
      { category: 'Game Development', hours_allocated: 7, priority: 'P0' },
      { category: 'School Broadcast', hours_allocated: 0, priority: 'P3' },
      { category: 'Video Project', hours_allocated: 7, priority: 'P1' },
      { category: 'YouTube', hours_allocated: 4, priority: 'P1' },
      { category: 'Applications', hours_allocated: 2, priority: 'P2' },
      { category: 'SAT Prep', hours_allocated: 5, priority: 'P0' },
    ],
    buffers_flexibility: [
      { buffer_type: 'unallocated', hours: 19, notes: 'Flexibility for unexpected tasks' },
    ],
  };

  const actionPlan = {
    plan_id: generateId('plan'),
    student_id: STUDENT_ID,
    week_number: WEEK_NUMBER,
    academic_year: '2023-2024',
    plan_version: 2, // v2 - corrected data
    week_start_date: '2023-06-21',
    week_end_date: '2023-06-27',
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    outcomes: [], // Week 1 has no strategic outcomes yet - focus on tactical execution
    execution_items: executionItems,
    tasks: [], // Tasks will be nested under execution items
    resource_allocation: {
      week_number: WEEK_NUMBER,
      time_allocation: timeAllocation,
      tools_required: [
        { tool_name: 'Email', purpose: 'Communication with counselor, Jenny' },
        { tool_name: 'Google Docs', purpose: 'Activity list documentation' },
        { tool_name: 'Python/TensorFlow', purpose: 'Classification model' },
        { tool_name: 'Video editing software', purpose: 'YouTube content' },
      ],
      people_dependencies: [
        { person_role: 'counselor', dependency_type: 'meeting_required' },
        { person_role: 'Jenny', dependency_type: 'check_in' },
      ],
      other_resources: [],
    },
    critical_dates: [
      {
        date: '2023-08-14',
        event_type: 'meeting',
        description: 'Counselor meeting scheduled',
        importance: 'high',
      },
    ],
    progress_tracking: {
      last_reviewed_date: new Date().toISOString(),
      completion_metrics: {
        total_outcomes: 0,
        completed_outcomes: 0,
        total_execution_items: executionItems.length,
        completed_execution_items: 0,
        total_tasks: 0,
        completed_tasks: 0,
        overall_completion_percentage: 0,
      },
      momentum_indicators: {
        consecutive_weeks_with_plans: 1,
        completion_velocity: 0,
        blocked_items_count: 0,
      },
    },
    context: {
      coach_observations: 'Week 1: Foundation setting. Focus on building relationships (counselor, clubs, Jenny), establishing time management framework (168 hours), and creating baseline documentation (course schedule, activity list). No strategic outcomes yet - pure tactical execution.',
      student_reflections: '',
      previous_week_carryover: [],
      next_week_priorities: ['Follow up on counselor meeting', 'Join ML/AI club', 'Continue YouTube content'],
    },
    custom_fields: {
      frameworks_applied: [
        '168 Hour Architecture',
        'LOR Conversation Script',
        'Cold Email Template System',
      ],
      session_dates: ['2023-08-02 (Planning)', '2023-08-05 (Check-in)'],
    },
    framework_applications: [
      {
        framework_name: '168 Hour Architecture',
        application_date: '2023-08-02',
        insights_gained: 'Discovered 49 hours of unallocated time for passion projects',
      },
      {
        framework_name: 'LOR Conversation Script',
        application_date: '2023-08-05',
        insights_gained: 'Exact script for building teacher relationships',
      },
      {
        framework_name: 'Cold Email Template',
        application_date: '2023-08-05',
        insights_gained: '4-part structure for counselor outreach',
      },
      {
        framework_name: 'Strategic Overwhelm Calibration',
        application_date: '2023-08-05',
        insights_gained: '10 tasks assigned, expecting ~70% completion',
      },
      {
        framework_name: 'Weekly Action Item Framework',
        application_date: '2023-08-02',
        insights_gained: 'Checkbox system with measurable tasks',
      },
    ],
  };

  try {
    // Update Week 1 with corrected action plan
    const result = await pool.query(
      `UPDATE weekly_vitals
       SET action_plan = $1::jsonb,
           updated_at = NOW()
       WHERE student_id = $2 AND week_number = $3
       RETURNING week_number, student_id`,
      [JSON.stringify(actionPlan), STUDENT_ID, WEEK_NUMBER]
    );

    if (result.rowCount === 0) {
      console.error('❌ Week 1 not found in database');
      return;
    }

    console.log('✅ Week 1 Action Plan updated successfully!');
    console.log(`   Student: ${STUDENT_ID}`);
    console.log(`   Week: ${WEEK_NUMBER}`);
    console.log(`   Execution Items: ${executionItems.length}`);
    console.log(`   Time Allocation: ${timeAllocation.available_hours}h available`);
    console.log(`   Frameworks Applied: ${actionPlan.framework_applications.length}`);
    console.log('\n📋 Execution Items:');
    executionItems.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.title} (${item.priority_level})`);
    });

  } catch (error) {
    console.error('❌ Error updating Week 1:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixWeek1ActionPlan()
  .then(() => {
    console.log('\n✨ Week 1 fix complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fix failed:', error);
    process.exit(1);
  });
