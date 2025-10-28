/**
 * Comprehensive Action Plan Provisioning for All Weeks
 *
 * This script provisions action plans for all 89 weeks of Huda's journey
 * using comprehensive extraction from session transcripts.
 *
 * Strategy:
 * - Week 1 already manually fixed with 10 execution items
 * - For remaining weeks: extract from session JSON coaching_intelligence.tactical
 * - Use intelligence extraction docs for frameworks applied
 * - Create hierarchical structure: Outcomes → Execution Items → Tasks
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ivylevel',
  user: 'postgres',
  password: 'postgres',
});

const STUDENT_ID = 'huda-2025';
const SESSION_DATA_DIR = path.join(__dirname, '../../../../data/eq/sessions');

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Map of available session files (discovered from directory listing)
async function getAvailableSessionFiles(): Promise<Map<number, string>> {
  const files = fs.readdirSync(SESSION_DATA_DIR);
  const weekMap = new Map<number, string>();

  files.forEach(file => {
    if (file.endsWith('.json')) {
      // Extract week number from filename patterns:
      // jenny_eq_session_w001_extract.json → 1
      // jenny_eq_w020_extraction.json → 20
      const match = file.match(/w0*(\d+)/);
      if (match) {
        const weekNum = parseInt(match[1]);
        if (weekNum >= 1 && weekNum <= 89) {
          weekMap.set(weekNum, file);
        }
      }
    }
  });

  return weekMap;
}

function extractActionPlanFromSession(weekNumber: number, sessionData: any): any {
  const ci = sessionData.coaching_intelligence || {};
  const tactical = ci.tactical || {};
  const strategic = ci.strategic || {};
  const diagnostic = ci.diagnostic || {};

  const outcomes: any[] = [];
  const executionItems: any[] = [];

  // Extract from ALL tactical fields (not just immediate_actions)
  // The tactical intelligence structure evolved over time:
  // - Early weeks: immediate_actions
  // - Later weeks: various tactical sub-categories (publication_psychology, recommendation_sequence, etc.)

  let allTacticalItems: string[] = [];

  // Method 1: Extract from immediate_actions if it exists
  if (tactical.immediate_actions) {
    const immediateActions = Array.isArray(tactical.immediate_actions)
      ? tactical.immediate_actions
      : [tactical.immediate_actions];
    allTacticalItems.push(...immediateActions.filter((a: any) => typeof a === 'string' && a.trim()));
  }

  // Method 2: Extract from ALL other tactical fields (for weeks without immediate_actions)
  if (allTacticalItems.length === 0) {
    Object.entries(tactical).forEach(([key, value]) => {
      if (key !== 'immediate_actions' && Array.isArray(value)) {
        // Each tactical category is an array of action items
        value.forEach((item: any) => {
          if (typeof item === 'string' && item.trim()) {
            allTacticalItems.push(item);
          }
        });
      }
    });
  }

  // Create execution items from all extracted tactical items
  allTacticalItems.forEach((action: string, idx: number) => {
    executionItems.push({
      execution_item_id: generateId('exec'),
      parent_outcome_id: null,
      title: action,
      description: action,
      call_to_action: action,
      why: 'Session priority action',
      what: action,
      how: 'As discussed in coaching session',
      when: 'This week',
      who: 'student',
      execution_domain: determineExecutionDomain(action),
      execution_type: 'action',
      priority_level: idx < 2 ? 'P0' : 'P1',
      urgency_score: Math.max(8 - idx, 5),
      impact_score: 7,
      estimated_duration_minutes: 60,
      is_recurring: false,
      completion_state: 'not_started',
      progress_percentage: 0,
      child_tasks: [],
      created_at: new Date().toISOString(),
    });
  });

  // Extract outcomes/targets if available
  const outcomesTargets = ci.outcomes_targets || {};
  if (Object.keys(outcomesTargets).length > 0) {
    // Create outcomes from targets
    Object.entries(outcomesTargets).forEach(([domain, targets]: [string, any]) => {
      if (Array.isArray(targets) && targets.length > 0) {
        outcomes.push({
          outcome_id: generateId('out'),
          outcome_domain: domain,
          outcome_type: 'achievement',
          outcome_scope: 'multi_week',
          title: `${domain.charAt(0).toUpperCase() + domain.slice(1)}: ${targets.join(', ')}`,
          description: `Strategic outcome for ${domain}`,
          purpose: `Achieve targets in ${domain} domain`,
          target_metric: { targets },
          current_metric: {},
          priority_level: 'P1',
          urgency_score: 7,
          impact_score: 8,
          completion_state: 'in_progress',
          completion_percentage: 0,
          child_execution_items: [],
          created_at: new Date().toISOString(),
        });
      }
    });
  }

  // Time allocation (use Week 1 pattern as default, can be customized per week)
  const timeAllocation = {
    total_hours_in_period: 168,
    total_fixed_hours: 119,
    available_hours: 49,
    fixed_commitments: [
      { block_type: 'sleep', hours_per_week: 56 },
      { block_type: 'school', hours_per_week: 37.5 },
      { block_type: 'transportation', hours_per_week: 4.5 },
      { block_type: 'meals_personal', hours_per_week: 21 },
    ],
    flexible_blocks: [],
    buffers_flexibility: [
      { buffer_type: 'unallocated', hours: 49, notes: 'Available for passion projects' },
    ],
  };

  // Frameworks applied
  const frameworksApplied: any[] = [];
  if (sessionData.chip_suggestions) {
    sessionData.chip_suggestions.forEach((chip: any) => {
      if (chip.chip_type === 'Framework_Chip') {
        frameworksApplied.push({
          framework_name: chip.title,
          application_date: sessionData.source?.date || new Date().toISOString(),
          insights_gained: chip.summary || '',
        });
      }
    });
  }

  return {
    plan_id: generateId('plan'),
    student_id: STUDENT_ID,
    week_number: weekNumber,
    academic_year: getAcademicYear(weekNumber),
    plan_version: 1,
    week_start_date: getWeekStartDate(weekNumber),
    week_end_date: getWeekEndDate(weekNumber),
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    outcomes,
    execution_items: executionItems,
    tasks: [],
    resource_allocation: {
      week_number: weekNumber,
      time_allocation: timeAllocation,
      tools_required: [],
      people_dependencies: [],
      other_resources: [],
    },
    critical_dates: [],
    progress_tracking: {
      last_reviewed_date: new Date().toISOString(),
      completion_metrics: {
        total_outcomes: outcomes.length,
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
      coach_observations: diagnostic.gaps_identified?.join(', ') || '',
      student_reflections: '',
      previous_week_carryover: [],
      next_week_priorities: [],
    },
    custom_fields: {},
    framework_applications: frameworksApplied,
  };
}

function determineExecutionDomain(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('email') || lower.includes('counselor') || lower.includes('teacher') || lower.includes('class')) {
    return 'academic';
  }
  if (lower.includes('club') || lower.includes('ec ') || lower.includes('leadership')) {
    return 'extracurricular';
  }
  if (lower.includes('test') || lower.includes('sat') || lower.includes('act')) {
    return 'test_preparation';
  }
  if (lower.includes('application') || lower.includes('essay') || lower.includes('college')) {
    return 'application';
  }
  if (lower.includes('project') || lower.includes('build') || lower.includes('create') || lower.includes('video') || lower.includes('game')) {
    return 'creative_project';
  }
  return 'other';
}

function getAcademicYear(weekNumber: number): string {
  // Week 1 started June 21, 2023
  if (weekNumber <= 52) return '2023-2024';
  return '2024-2025';
}

function getWeekStartDate(weekNumber: number): string {
  // Week 1: June 21, 2023
  const baseDate = new Date('2023-06-21');
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() + (weekNumber - 1) * 7);
  return weekStart.toISOString().split('T')[0];
}

function getWeekEndDate(weekNumber: number): string {
  const startDate = new Date(getWeekStartDate(weekNumber));
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate.toISOString().split('T')[0];
}

async function provisionAllWeeks() {
  console.log('🚀 Starting comprehensive action plan provisioning for all weeks...\n');

  try {
    // Get available session files
    const weekMap = await getAvailableSessionFiles();
    console.log(`📁 Found ${weekMap.size} session files\n`);

    // Skip Week 1 (already manually provisioned with comprehensive data)
    const weeksToProvision = Array.from(weekMap.keys()).filter(w => w !== 1 && w <= 89);

    console.log(`📋 Provisioning ${weeksToProvision.length} weeks (Week 1 already fixed)\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const weekNum of weeksToProvision) {
      try {
        const filename = weekMap.get(weekNum)!;
        const filepath = path.join(SESSION_DATA_DIR, filename);

        // Read session data
        const sessionData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

        // Extract action plan
        const actionPlan = extractActionPlanFromSession(weekNum, sessionData);

        // Update database
        const result = await pool.query(
          `UPDATE weekly_vitals
           SET action_plan = $1::jsonb,
               updated_at = NOW()
           WHERE student_id = $2 AND week_number = $3
           RETURNING week_number`,
          [JSON.stringify(actionPlan), STUDENT_ID, weekNum]
        );

        if (result.rowCount === 0) {
          console.log(`⚠️  Week ${weekNum}: Not found in database (skipping)`);
          continue;
        }

        successCount++;

        if (successCount % 10 === 0) {
          console.log(`✅ Provisioned ${successCount} weeks...`);
        }

      } catch (error: any) {
        errorCount++;
        console.error(`❌ Week ${weekNum}: ${error.message}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✨ Provisioning Complete!`);
    console.log(`   Total Weeks Provisioned: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Week 1: Already fixed with comprehensive data`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('💥 Fatal error during provisioning:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run provisioning
provisionAllWeeks()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
