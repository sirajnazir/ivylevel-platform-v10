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

  // Get SAT score from v_sat_enum_latest view (v14 foundation)
  const { rows: satRows } = await pg.query(`
    SELECT numeric_value AS sat_score_latest
    FROM v_sat_enum_latest
    WHERE student_id = $1
    LIMIT 1
  `, [studentId]);

  // Get GPA from v_gpa_latest view (v14 foundation)
  const { rows: gpaRows } = await pg.query(`
    SELECT gpa_unweighted, gpa_weighted
    FROM v_gpa_latest
    WHERE student_id = $1 AND scope = 'cumulative'
    LIMIT 1
  `, [studentId]);

  // Get AP courses taken from academic_courses (actual AP courses, not exam scores)
  const { rows: apRows } = await pg.query(`
    SELECT COUNT(*) AS ap_courses_taken
    FROM academic_courses
    WHERE student_id = $1 AND level = 'AP'
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'academicVitals',
    sat_rows: satRows.length,
    gpa_rows: gpaRows.length,
    ap_rows: apRows.length,
    took_ms: Date.now() - start
  });

  const satScore = satRows[0]?.sat_score_latest || null;
  const gpaUnweighted = gpaRows[0]?.gpa_unweighted || null;
  const gpaWeighted = gpaRows[0]?.gpa_weighted || null;
  const apCoursesTaken = apRows[0]?.ap_courses_taken || 0;

  const vitals = {
    sat_score_latest: satScore,
    gpa_unweighted: gpaUnweighted,
    gpa_weighted: gpaWeighted,
    ap_courses_taken: apCoursesTaken
  };

  const satInfo = satScore ? `SAT: ${satScore}` : '';
  const gpaInfo = gpaUnweighted ? `GPA: ${gpaUnweighted} UW / ${gpaWeighted || 'N/A'} W` : '';
  const apInfo = apCoursesTaken > 0 ? `AP: ${apCoursesTaken} courses taken` : '';

  return {
    answer: [satInfo, gpaInfo, apInfo].filter(Boolean).join(', '),
    chips: [{ kind: 'evidence', text: 'v_sat_enum_latest + v_gpa_latest + academic_courses' }],
    hits: [...satRows, ...gpaRows, ...apRows],
    vitals
  };
}

// ============================================================================
// Summer Program Vitals
// ============================================================================

export async function programVitals(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'programVitals', student_id: studentId });

  // Use existing v_programs_final for program acceptances (actual programs attended)
  const { rows: programRows } = await pg.query(`
    SELECT * FROM v_programs_final WHERE student_id = $1 ORDER BY event_date DESC
  `, [studentId]);

  // Get planned programs from v_programs_initial, excluding any that appear in v_programs_final
  // This ensures "final" takes precedence over "planned"
  const { rows: programPlans } = await pg.query(`
    SELECT i.*
    FROM v_programs_initial i
    WHERE i.student_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM v_programs_final f
        WHERE f.student_id = i.student_id
          AND (
            -- Match by exact name or fuzzy match (e.g., "AAJA JCamp" vs "JCamp (AAJA)")
            LOWER(f.program_name) = LOWER(i.program_name)
            OR LOWER(f.program_name) LIKE '%' || LOWER(SPLIT_PART(i.program_name, ' ', 1)) || '%'
            OR LOWER(i.program_name) LIKE '%' || LOWER(SPLIT_PART(f.program_name, ' ', 1)) || '%'
          )
      )
    ORDER BY program_name
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'programVitals',
    programs_final: programRows.length,
    programs_planned: programPlans.length,
    took_ms: Date.now() - start
  });

  // Count programs from v_programs_final (actual attended programs)
  const programsAttended = programRows.length;

  // Count planned programs (already filtered to exclude those in final)
  const programsPlanned = programPlans.length;

  const vitals = {
    programs_attended: programsAttended,
    programs_planned: programsPlanned,
    total_programs: programsAttended + programsPlanned
  };

  return {
    answer: `Programs: ${vitals.programs_attended} attended, ${vitals.programs_planned} planned (${vitals.total_programs} total)`,
    chips: [{ kind: 'evidence', text: 'v_programs_final + v_programs_initial (final takes precedence)' }],
    hits: [...programRows, ...programPlans],
    vitals
  };
}

// ============================================================================
// College List Vitals (from v14 v_nsm_college_list_vitals)
// ============================================================================

export async function collegeListVitals(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'collegeListVitals', student_id: studentId });

  const { rows } = await pg.query(`
    SELECT * FROM v_nsm_college_list_vitals WHERE student_id = $1
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'collegeListVitals',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  const vitals = rows[0] || {
    total_colleges: 0,
    reach_schools_count: 0,
    match_schools_count: 0,
    safety_schools_count: 0,
    ed_schools_count: 0,
    ea_schools_count: 0,
    rd_schools_count: 0
  };

  return {
    answer: `Colleges: ${vitals.total_colleges} total (${vitals.reach_schools_count} reach, ${vitals.match_schools_count} match, ${vitals.safety_schools_count} safety)`,
    chips: [{ kind: 'evidence', text: 'v_nsm_college_list_vitals' }],
    hits: rows,
    vitals
  };
}

// ============================================================================
// Essay Vitals (from v14 v_nsm_essay_vitals)
// ============================================================================

export async function essayVitals(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'essayVitals', student_id: studentId });

  const { rows } = await pg.query(`
    SELECT * FROM v_nsm_essay_vitals WHERE student_id = $1
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'essayVitals',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  const vitals = rows[0] || {
    common_app_essay_quality: 'not_started',
    identity_fusion_clarity: 'none',
    differentiation_score: 0,
    supplemental_essays_completed: 0
  };

  return {
    answer: `Essays: Common App ${vitals.common_app_essay_quality}, Identity fusion ${vitals.identity_fusion_clarity}, Differentiation score ${vitals.differentiation_score}`,
    chips: [{ kind: 'evidence', text: 'v_nsm_essay_vitals' }],
    hits: rows,
    vitals
  };
}

// ============================================================================
// IvyReady Score (from v14 v_ivyready_latest)
// ============================================================================

export async function ivyReadyScore(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'ivyReadyScore', student_id: studentId });

  const { rows } = await pg.query(`
    SELECT * FROM v_ivyready_latest WHERE student_id = $1
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'ivyReadyScore',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  const score = rows[0] || null;

  return {
    answer: score ? `IvyReady Score: ${Number(score.overall_score).toFixed(1)}/100 (${score.snapshot_phase})` : 'IvyReady Score: Not assessed',
    chips: [{ kind: 'evidence', text: 'v_ivyready_latest' }],
    hits: rows,
    vitals: score
  };
}

// ============================================================================
// NSM Dashboard (All vitals combined + v14 comprehensive metrics)
// ============================================================================

export async function nsmDashboard(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'nsmDashboard', student_id: studentId });

  // Get all vitals in parallel (now includes college list, essay, and IvyReady score)
  const [recognition, leadership, academic, program, collegeList, essay, ivyReady] = await Promise.all([
    recognitionVitals(pg, studentId),
    leadershipVitals(pg, studentId),
    academicVitals(pg, studentId),
    programVitals(pg, studentId),
    collegeListVitals(pg, studentId),
    essayVitals(pg, studentId),
    ivyReadyScore(pg, studentId)
  ]);

  log.event('resolver.sql_complete', {
    resolver: 'nsmDashboard',
    took_ms: Date.now() - start
  });

  const answer = [
    'NSM Dashboard:',
    '',
    '**IvyReady Score:**',
    ivyReady.answer,
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
    program.answer,
    '',
    '**College List:**',
    collegeList.answer,
    '',
    '**Essays:**',
    essay.answer
  ].join('\n');

  return {
    answer,
    chips: [
      { kind: 'evidence', text: 'NSM Dashboard (Comprehensive)' },
      ...ivyReady.chips,
      ...recognition.chips,
      ...leadership.chips,
      ...academic.chips,
      ...program.chips,
      ...collegeList.chips,
      ...essay.chips
    ],
    hits: [],
    dashboard: {
      ivyready: ivyReady.vitals,
      recognition: recognition.vitals,
      leadership: leadership.vitals,
      academic: academic.vitals,
      program: program.vitals,
      college_list: collegeList.vitals,
      essay: essay.vitals
    }
  };
}
