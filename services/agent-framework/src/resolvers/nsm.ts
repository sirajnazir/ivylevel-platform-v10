// services/agent-framework/src/resolvers/nsm.ts
import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('nsm-resolvers');

/**
 * NSM Resolvers - Leverage existing v14 views + kb_items
 *
 * Strategy:
 * - Use existing views (v_awards_won, v_ecs_final, etc.) when available
 * - Query kb_items directly only when no view exists
 * - Flexible filtering (tier1_state, subtype) not hardcoded words
 * - Return structured data for agent composition
 */

// ============================================================================
// Recognition Vitals (Awards)
// ============================================================================

export async function recognitionVitals(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'recognitionVitals', student_id: studentId });

  // Use existing v_awards_won view for won awards
  const { rows: wonRows } = await pg.query(`
    SELECT * FROM v_awards_won WHERE student_id = $1 ORDER BY won_date
  `, [studentId]);

  // Get all award attempts from kb_items (for win rate calculation)
  const { rows: allRows } = await pg.query(`
    SELECT
      student_id,
      COUNT(*) FILTER (WHERE subtype = 'national' AND tier1_state = 'Outcome') AS national_awards_won,
      COUNT(*) FILTER (WHERE subtype = 'regional' AND tier1_state = 'Outcome') AS regional_awards_won,
      COUNT(*) FILTER (WHERE subtype = 'school' OR subtype = 'local' AND tier1_state = 'Outcome') AS local_awards_won,
      COUNT(*) AS total_awards_attempted,
      COUNT(*) FILTER (WHERE tier1_state = 'Outcome') AS total_awards_outcomes,
      CASE
        WHEN COUNT(*) > 0
        THEN COUNT(*) FILTER (WHERE tier1_state = 'Outcome')::NUMERIC / COUNT(*)::NUMERIC
        ELSE 0
      END AS award_win_rate
    FROM kb_items
    WHERE student_id = $1 AND item_type = 'Award_Competition'
    GROUP BY student_id
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'recognitionVitals',
    won_count: wonRows.length,
    all_count: allRows.length,
    took_ms: Date.now() - start
  });

  const vitals = allRows[0] || {
    national_awards_won: 0,
    regional_awards_won: 0,
    local_awards_won: 0,
    total_awards_attempted: 0,
    total_awards_outcomes: 0,
    award_win_rate: 0
  };

  return {
    answer: `Awards: ${vitals.national_awards_won} national, ${vitals.regional_awards_won} regional, ${vitals.local_awards_won} local (${Math.round(Number(vitals.award_win_rate) * 100)}% win rate)`,
    chips: [{ kind: 'evidence', text: 'v_awards_won + kb_items' }],
    hits: wonRows,
    vitals
  };
}

// ============================================================================
// Leadership Vitals (ECs)
// ============================================================================

export async function leadershipVitals(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'leadershipVitals', student_id: studentId });

  // Use existing v_ecs_final for final ECs
  const { rows: ecsRows } = await pg.query(`
    SELECT * FROM v_ecs_final WHERE student_id = $1 ORDER BY event_date NULLS LAST
  `, [studentId]);

  // Get leadership stats from kb_items
  const { rows: leadershipRows } = await pg.query(`
    SELECT
      student_id,
      COUNT(*) FILTER (WHERE subtype = 'Leadership' OR subtype LIKE '%Leadership%') AS leadership_ecs_count,
      COUNT(*) FILTER (WHERE title_name LIKE '%President%' OR status_detail LIKE '%President%') AS president_count,
      COUNT(*) FILTER (WHERE title_name LIKE '%Founder%' OR status_detail LIKE '%Founder%' OR status_detail LIKE '%founded%') AS founder_count,
      COUNT(*) AS total_ecs
    FROM kb_items
    WHERE student_id = $1 AND item_type LIKE 'ec%'
    GROUP BY student_id
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'leadershipVitals',
    ecs_count: ecsRows.length,
    leadership_count: leadershipRows.length,
    took_ms: Date.now() - start
  });

  const vitals = leadershipRows[0] || {
    leadership_ecs_count: 0,
    president_count: 0,
    founder_count: 0,
    total_ecs: 0
  };

  return {
    answer: `Leadership: ${vitals.leadership_ecs_count} leadership ECs, ${vitals.founder_count} founded, ${vitals.president_count} president roles (${vitals.total_ecs} total ECs)`,
    chips: [{ kind: 'evidence', text: 'v_ecs_final + kb_items' }],
    hits: ecsRows,
    vitals
  };
}

// ============================================================================
// Academic Vitals (Test Scores)
// ============================================================================

export async function academicVitals(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'academicVitals', student_id: studentId });

  // Get test scores from kb_items
  const { rows } = await pg.query(`
    SELECT
      student_id,
      MAX(CASE WHEN subtype = 'SAT' AND key_metric_type = 'score_total' THEN key_metric_value::INTEGER END) AS sat_score_latest,
      MAX(CASE WHEN subtype = 'ACT' AND key_metric_type = 'score_composite' THEN key_metric_value::INTEGER END) AS act_score_latest,
      COUNT(*) FILTER (WHERE subtype = 'AP' AND key_metric_value::INTEGER >= 3) AS ap_exams_passed,
      COUNT(*) FILTER (WHERE subtype = 'AP' AND key_metric_value::INTEGER = 5) AS ap_exams_perfect
    FROM kb_items
    WHERE student_id = $1 AND item_type = 'Test' AND tier1_state = 'Outcome'
    GROUP BY student_id
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'academicVitals',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  const vitals = rows[0] || {
    sat_score_latest: null,
    act_score_latest: null,
    ap_exams_passed: 0,
    ap_exams_perfect: 0
  };

  const satInfo = vitals.sat_score_latest ? `SAT: ${vitals.sat_score_latest}` : '';
  const actInfo = vitals.act_score_latest ? `ACT: ${vitals.act_score_latest}` : '';
  const apInfo = vitals.ap_exams_passed > 0 ? `AP: ${vitals.ap_exams_passed} passed (${vitals.ap_exams_perfect} perfect)` : '';

  return {
    answer: [satInfo, actInfo, apInfo].filter(Boolean).join(', '),
    chips: [{ kind: 'evidence', text: 'kb_items' }],
    hits: rows,
    vitals
  };
}

// ============================================================================
// Summer Program Vitals
// ============================================================================

export async function programVitals(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'programVitals', student_id: studentId });

  // Use existing v_programs_final for program acceptances
  const { rows: programRows } = await pg.query(`
    SELECT * FROM v_programs_final WHERE student_id = $1 ORDER BY submit_date
  `, [studentId]);

  // Get program stats from kb_items
  const { rows } = await pg.query(`
    SELECT
      student_id,
      COUNT(*) FILTER (WHERE tier1_state IN ('Submitted', 'Outcome')) AS programs_applied,
      COUNT(*) FILTER (WHERE tier1_state = 'Outcome' AND status_detail LIKE '%Accept%') AS programs_accepted,
      COUNT(*) FILTER (WHERE tier1_state = 'Outcome' AND (subtype IN ('RSI', 'TASP', 'SSP') OR title_name LIKE '%RSI%' OR title_name LIKE '%TASP%')) AS prestigious_programs_accepted
    FROM kb_items
    WHERE student_id = $1 AND item_type = 'program'
    GROUP BY student_id
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'programVitals',
    program_count: programRows.length,
    took_ms: Date.now() - start
  });

  const vitals = rows[0] || {
    programs_applied: 0,
    programs_accepted: 0,
    prestigious_programs_accepted: 0
  };

  return {
    answer: `Programs: ${vitals.programs_accepted} accepted / ${vitals.programs_applied} applied (${vitals.prestigious_programs_accepted} prestigious)`,
    chips: [{ kind: 'evidence', text: 'v_programs_final + kb_items' }],
    hits: programRows,
    vitals
  };
}

// ============================================================================
// NSM Dashboard (All vitals combined)
// ============================================================================

export async function nsmDashboard(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'nsmDashboard', student_id: studentId });

  // Get all vitals in parallel
  const [recognition, leadership, academic, program] = await Promise.all([
    recognitionVitals(pg, studentId),
    leadershipVitals(pg, studentId),
    academicVitals(pg, studentId),
    programVitals(pg, studentId)
  ]);

  log.event('resolver.sql_complete', {
    resolver: 'nsmDashboard',
    took_ms: Date.now() - start
  });

  const answer = [
    'NSM Dashboard:',
    '',
    '**Recognition:**',
    recognition.answer,
    '',
    '**Leadership:**',
    leadership.answer,
    '',
    '**Academics:**',
    academic.answer,
    '',
    '**Programs:**',
    program.answer
  ].join('\n');

  return {
    answer,
    chips: [
      { kind: 'evidence', text: 'NSM Dashboard' },
      ...recognition.chips,
      ...leadership.chips,
      ...academic.chips,
      ...program.chips
    ],
    hits: [],
    dashboard: {
      recognition: recognition.vitals,
      leadership: leadership.vitals,
      academic: academic.vitals,
      program: program.vitals
    }
  };
}
