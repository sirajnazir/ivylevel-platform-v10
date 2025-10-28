/**
 * Provision Weekly Action Plans from Session Transcripts
 * Extracts tactical data from jenny_eq session files and populates action_plan column
 *
 * Usage: npx tsx src/scripts/provision_action_plans.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ivylevel',
  user: 'postgres',
  password: 'postgres'
});

const STUDENT_ID = 'huda-2025';
const SESSION_DATA_DIR = path.join(__dirname, '../../../../data/eq/sessions');

// Week-to-Session mapping (from analysis)
const WEEK_SESSION_MAP: Record<number, string> = {
  1: 'jenny_eq_session_w001_extract.json',
  10: 'jenny_eq_session_w010_extract.json',
  16: 'jenny_eq_session_w016_extraction.json',
  20: 'jenny_eq_w020_extraction.json',
  30: 'jenny_eq_w030_extraction.json',
  45: 'w045_extraction.json',
  60: 'jenny_eq_w060.json',
  70: 'jenny_eq_w070.json',
  89: 'jenny_eq_w089.json'
};

interface SessionData {
  coaching_intelligence?: {
    diagnostic?: any;
    strategic?: any;
    tactical?: any;
    relationship?: any;
    systems?: any;
    outcomes_targets?: any;
  };
  conversation_summary?: {
    one_liner?: string;
    topics?: string[];
    techniques_used?: string[];
  };
}

/**
 * Extract action plan from session transcript
 */
function extractActionPlanFromSession(weekNumber: number, sessionData: SessionData): any {
  const ci = sessionData.coaching_intelligence || {};
  const tactical = ci.tactical || {};
  const strategic = ci.strategic || {};
  const outcomes = ci.outcomes_targets || {};

  // Generate unique IDs
  const generateId = (prefix: string) => `${prefix}_w${weekNumber}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Extract outcomes (goals) from session
  const extractOutcomes = (): any[] => {
    const outcomesList: any[] = [];

    // From immediate outcomes
    if (outcomes.immediate) {
      const immediateOutcomes = typeof outcomes.immediate === 'string'
        ? outcomes.immediate.split(',').map((s: string) => s.trim())
        : [];

      immediateOutcomes.forEach((outcome: string, idx: number) => {
        if (outcome) {
          outcomesList.push({
            outcome_id: generateId('out'),
            outcome_domain: determineOutcomeDomain(outcome),
            outcome_type: 'milestone',
            outcome_scope: 'weekly',
            title: outcome,
            description: outcome,
            purpose: `Week ${weekNumber} priority outcome`,
            target_metric: { metric_type: 'binary', value: 'true' },
            current_metric: { metric_type: 'binary', value: 'false' },
            priority_level: idx === 0 ? 'P0' : 'P1',
            urgency_score: 8 - idx,
            impact_score: 8,
            completion_state: 'not_started',
            completion_percentage: 0,
            child_execution_items: [],
            created_at: new Date().toISOString()
          });
        }
      });
    }

    return outcomesList;
  };

  // Extract execution items from tactical intelligence
  const extractExecutionItems = (outcomes: any[]): any[] => {
    const items: any[] = [];

    if (tactical.immediate_actions) {
      const actions = Array.isArray(tactical.immediate_actions)
        ? tactical.immediate_actions
        : [tactical.immediate_actions];

      actions.forEach((action: string, idx: number) => {
        if (typeof action === 'string' && action.trim()) {
          const executionItemId = generateId('exec');
          items.push({
            execution_item_id: executionItemId,
            parent_outcome_id: outcomes[0]?.outcome_id || generateId('out'),
            title: action,
            description: action,
            call_to_action: action,
            why: 'Critical week priority',
            what: action,
            how: 'Execute as discussed in session',
            when: 'This week',
            who: 'student',
            execution_domain: determineOutcomeDomain(action),
            execution_type: determineExecutionType(action),
            priority_level: idx < 2 ? 'P0' : 'P1',
            urgency_score: 8,
            impact_score: 7,
            estimated_duration_minutes: 60,
            is_recurring: false,
            completion_state: 'not_started',
            progress_percentage: 0,
            child_tasks: [],
            created_at: new Date().toISOString()
          });

          // Add to parent outcome's child list
          if (outcomes[0]) {
            outcomes[0].child_execution_items.push(executionItemId);
          }
        }
      });
    }

    return items;
  };

  // Build action plan structure
  const outcomesList = extractOutcomes();
  const executionItems = extractExecutionItems(outcomesList);

  const actionPlan = {
    plan_id: generateId('plan'),
    student_id: STUDENT_ID,
    week_number: weekNumber,
    academic_year: '2024-2025',
    plan_version: 1,
    week_start_date: calculateWeekStart(weekNumber),
    week_end_date: calculateWeekEnd(weekNumber),
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),

    outcomes: outcomesList,
    execution_items: executionItems,
    tasks: [], // Will be populated from execution items in future

    resource_allocation: {
      week_number: weekNumber,
      time_allocation: {
        total_hours_in_period: 168,
        fixed_commitments: [
          { block_type: 'sleep', hours_per_week: 56 },
          { block_type: 'school', hours_per_week: 35 },
          { block_type: 'commute', hours_per_week: 5 }
        ],
        total_fixed_hours: 96,
        available_hours: 72,
        outcome_allocations: []
      },
      tools_required: [],
      people_dependencies: [],
      other_resources: []
    },

    critical_dates: [],

    progress_tracking: {
      week_number: weekNumber,
      tracking_period_start: calculateWeekStart(weekNumber),
      tracking_period_end: calculateWeekEnd(weekNumber),
      completion_metrics: {
        total_outcomes: outcomesList.length,
        completed_outcomes: 0,
        outcome_completion_rate: 0,
        total_execution_items: executionItems.length,
        completed_execution_items: 0,
        execution_item_completion_rate: 0,
        total_tasks: 0,
        completed_tasks: 0,
        task_completion_rate: 0,
        overall_completion_percentage: 0
      }
    },

    context: {
      week_number: weekNumber,
      student_wellbeing: {
        stress_level: 5,
        energy_level: 7,
        confidence_level: 7,
        motivation_level: 8
      },
      coach_observations: sessionData.conversation_summary?.topics || [],
      student_reflections: []
    },

    custom_fields: {},
    framework_applications: extractFrameworks(sessionData)
  };

  return actionPlan;
}

function determineOutcomeDomain(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('sat') || lowerText.includes('test') || lowerText.includes('score')) return 'test_preparation';
  if (lowerText.includes('essay') || lowerText.includes('application') || lowerText.includes('college')) return 'application';
  if (lowerText.includes('club') || lowerText.includes('leadership') || lowerText.includes('volunteer')) return 'extracurricular';
  if (lowerText.includes('course') || lowerText.includes('grade') || lowerText.includes('gpa')) return 'academic';
  if (lowerText.includes('game') || lowerText.includes('project') || lowerText.includes('develop')) return 'creative_project';
  if (lowerText.includes('instagram') || lowerText.includes('website') || lowerText.includes('portfolio')) return 'personal_brand';
  return 'personal_growth';
}

function determineExecutionType(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('email') || lowerText.includes('contact') || lowerText.includes('reach out')) return 'communication';
  if (lowerText.includes('research') || lowerText.includes('find') || lowerText.includes('look up')) return 'research';
  if (lowerText.includes('write') || lowerText.includes('draft') || lowerText.includes('essay')) return 'writing';
  if (lowerText.includes('submit') || lowerText.includes('send') || lowerText.includes('upload')) return 'submission';
  if (lowerText.includes('practice') || lowerText.includes('study') || lowerText.includes('prepare')) return 'practice';
  if (lowerText.includes('create') || lowerText.includes('build') || lowerText.includes('design')) return 'creation';
  return 'planning';
}

function extractFrameworks(sessionData: SessionData): any[] {
  const frameworks: any[] = [];
  const techniques = sessionData.conversation_summary?.techniques_used || [];

  techniques.forEach((technique: string) => {
    frameworks.push({
      application_id: `fapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      framework_id: `fw_${technique.toLowerCase().replace(/\s+/g, '_')}`,
      framework_name: technique,
      application_date: new Date().toISOString(),
      applied_by: 'coach',
      application_context: 'Applied during coaching session'
    });
  });

  return frameworks;
}

function calculateWeekStart(weekNumber: number): string {
  // Assuming Week 1 started on 2023-08-01 (adjust if different)
  const baseDate = new Date('2023-08-01');
  const daysToAdd = (weekNumber - 1) * 7;
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() + daysToAdd);
  return weekStart.toISOString().split('T')[0];
}

function calculateWeekEnd(weekNumber: number): string {
  const weekStart = new Date(calculateWeekStart(weekNumber));
  weekStart.setDate(weekStart.getDate() + 6);
  return weekStart.toISOString().split('T')[0];
}

/**
 * Main provisioning function
 */
async function provisionActionPlans() {
  console.log('🚀 Starting Action Plan Provisioning...\n');

  const weeks = Object.keys(WEEK_SESSION_MAP).map(Number).sort((a, b) => a - b);

  for (const weekNumber of weeks) {
    const sessionFile = WEEK_SESSION_MAP[weekNumber];
    const sessionPath = path.join(SESSION_DATA_DIR, sessionFile);

    console.log(`📅 Processing Week ${weekNumber}...`);

    // Check if file exists
    if (!fs.existsSync(sessionPath)) {
      console.log(`  ⚠️  Session file not found: ${sessionFile}`);
      continue;
    }

    try {
      // Read session data
      const sessionData: SessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));

      // Extract action plan
      const actionPlan = extractActionPlanFromSession(weekNumber, sessionData);

      // Update database
      const query = `
        UPDATE weekly_vitals
        SET action_plan = $1::jsonb,
            updated_at = NOW()
        WHERE student_id = $2 AND week_number = $3
        RETURNING week_number;
      `;

      const result = await pool.query(query, [
        JSON.stringify(actionPlan),
        STUDENT_ID,
        weekNumber
      ]);

      if (result.rows.length > 0) {
        console.log(`  ✅ Week ${weekNumber}: Action plan provisioned`);
        console.log(`     - Outcomes: ${actionPlan.outcomes.length}`);
        console.log(`     - Execution Items: ${actionPlan.execution_items.length}`);
        console.log(`     - Frameworks: ${actionPlan.framework_applications.length}`);
      } else {
        console.log(`  ❌ Week ${weekNumber}: No row found to update`);
      }

    } catch (error) {
      console.error(`  ❌ Week ${weekNumber}: Error -`, error);
    }

    console.log('');
  }

  console.log('✅ Action Plan Provisioning Complete!');
  console.log(`📊 Total weeks processed: ${weeks.length}`);

  // Verify provisioning
  const verifyQuery = `
    SELECT
      week_number,
      jsonb_array_length(action_plan -> 'outcomes') as outcome_count,
      jsonb_array_length(action_plan -> 'execution_items') as execution_item_count
    FROM weekly_vitals
    WHERE student_id = $1 AND action_plan IS NOT NULL
    ORDER BY week_number;
  `;

  const verification = await pool.query(verifyQuery, [STUDENT_ID]);
  console.log('\n📋 Verification:');
  verification.rows.forEach(row => {
    console.log(`  Week ${row.week_number}: ${row.outcome_count} outcomes, ${row.execution_item_count} execution items`);
  });

  await pool.end();
}

// Run provisioning
provisionActionPlans().catch(console.error);
