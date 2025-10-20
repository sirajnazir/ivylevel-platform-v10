// services/agent-framework/src/services/resolvers.ts
import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { vitals } from '../resolvers/vitals.js';
import { jtbd } from '../resolvers/jtbd.js';

const log = createLogger('resolvers');

function rowsToList(rows: any[], labelKey="item_label") {
  return rows.map((r, i) => `${i+1}. ${r[labelKey]}${r.as_of ? ` — as of ${r.as_of}` : ""}`);
}

export async function ecsList(pg: Pool, studentId: string, phase: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'ecsList', student_id: studentId, phase });

  const view = phase === "final" ? "v_ecs_final" : "v_ecs_initial";
  const { rows } = await pg.query(`SELECT * FROM ${view} WHERE student_id=$1 ORDER BY event_date NULLS LAST, activity_name`, [studentId]);

  log.event('resolver.sql_complete', { resolver: 'ecsList', view, row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: `No ${phase} ECs data found.`, chips:[{kind:"evidence", text:view}], hits:[] };
  }

  const list = rows.map((r, i) => `${i+1}. ${r.activity_name}${r.tier1_state ? ` (${r.tier1_state})` : ""}`).join("\n");
  return { answer: list, chips:[{kind:"evidence", text:view}], hits:rows };
}

export async function awardsList(pg: Pool, studentId: string, phase: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'awardsList', student_id: studentId, phase });

  // Final awards = awards won (what was submitted in college applications)
  const view = phase === "final" ? "v_awards_won" : "v_awards_initial";
  const orderBy = phase === "final" ? "won_date, award_name" : "as_of NULLS LAST, award_name";
  const { rows } = await pg.query(`SELECT * FROM ${view} WHERE student_id=$1 ORDER BY ${orderBy}`, [studentId]);

  log.event('resolver.sql_complete', { resolver: 'awardsList', view, row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: `No ${phase} awards data found.`, chips:[{kind:"evidence", text:view}], hits:[] };
  }

  const list = rows.map((r, i) => `${i+1}. ${r.award_name}${r.tier ? ` — ${r.tier}` : ""}`).join("\n");
  return { answer: list, chips:[{kind:"evidence", text:view}], hits:rows };
}

export async function awardsWins(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'awardsWins', student_id: studentId });

  const { rows } = await pg.query(`SELECT * FROM v_awards_won WHERE student_id=$1 ORDER BY won_date`, [studentId]);

  log.event('resolver.sql_complete', { resolver: 'awardsWins', view: 'v_awards_won', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No award outcomes found.", chips:[{kind:"evidence", text:"v_awards_won"}], hits:[] };
  }

  const list = rows.map((r, i) => `${i+1}. ${r.award_name}${r.tier ? ` — ${r.tier}` : ""}`).join("\n");
  return { answer: list, chips:[{kind:"evidence", text:"v_awards_won"}], hits:rows };
}

export async function programsList(pg: Pool, studentId: string, phase: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'programsList', student_id: studentId, phase });

  const view = phase === "final" ? "v_programs_final" : "v_programs_initial";
  const orderBy = phase === "final" ? "submit_date" : "event_date";
  const { rows } = await pg.query(`SELECT * FROM ${view} WHERE student_id=$1 ORDER BY ${orderBy} NULLS LAST, program_name`, [studentId]);

  log.event('resolver.sql_complete', { resolver: 'programsList', view, row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: `No ${phase} summer programs found.`, chips:[{kind:"evidence", text:view}], hits:[] };
  }

  const list = rows.map((r, i) => `${i+1}. ${r.program_name}${r.provider || r.provider_or_track ? ` — ${r.provider || r.provider_or_track}` : ""}`).join("\n");
  return { answer: list, chips:[{kind:"evidence", text:view}], hits:rows };
}

export async function programsAdmits(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'programsAdmits', student_id: studentId });

  // v_programs_final contains submitted programs
  const { rows } = await pg.query(`SELECT * FROM v_programs_final WHERE student_id=$1 ORDER BY submit_date`, [studentId]);

  log.event('resolver.sql_complete', { resolver: 'programsAdmits', view: 'v_programs_final', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No program decisions data found.", chips:[{kind:"evidence", text:"v_programs_final"}], hits:[] };
  }

  const list = rows.map((r, i) => `${i+1}. ${r.program_name}${r.provider ? ` — ${r.provider}` : ""}`).join("\n");
  return { answer: list, chips:[{kind:"evidence", text:"v_programs_final"}], hits:rows };
}

export async function academicsSAT(pg: Pool, studentId: string, phase: string, slots: any) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'academicsSAT', student_id: studentId, phase, slots });

  if (phase === "first") {
    const { rows } = await pg.query(`SELECT * FROM v_sat_enum_first WHERE student_id=$1`, [studentId]);
    log.event('resolver.sql_complete', { resolver: 'academicsSAT', view: 'v_sat_enum_first', row_count: rows.length, took_ms: Date.now() - start });

    if (!rows.length) {
      return { answer: "No SAT data.", chips:[{kind:"evidence", text:"v_sat_enum_first"}], hits:[] };
    }

    const s = rows[0];
    return { answer: `Your first SAT total score was ${s.numeric_value} (${s.as_of}${s.type ? `, ${s.type}` : ""})`, chips:[{kind:"evidence", text:"v_sat_enum_first"}], hits:rows };
  }

  if (phase === "latest") {
    const { rows } = await pg.query(`SELECT * FROM v_sat_enum_latest WHERE student_id=$1`, [studentId]);
    log.event('resolver.sql_complete', { resolver: 'academicsSAT', view: 'v_sat_enum_latest', row_count: rows.length, took_ms: Date.now() - start });

    if (!rows.length) {
      return { answer: "No SAT data.", chips:[{kind:"evidence", text:"v_sat_enum_latest"}], hits:[] };
    }

    const s = rows[0];
    return { answer: `Your latest SAT total score is ${s.numeric_value} (${s.as_of}${s.type ? `, ${s.type}` : ""})`, chips:[{kind:"evidence", text:"v_sat_enum_latest"}], hits:rows };
  }

  if (phase === "nth" && slots?.nth) {
    const { rows } = await pg.query(`SELECT * FROM v_sat_enum_progression WHERE student_id=$1 ORDER BY as_of ASC`, [studentId]);
    log.event('resolver.sql_complete', { resolver: 'academicsSAT', view: 'v_sat_enum_progression', row_count: rows.length, took_ms: Date.now() - start });

    if (!rows.length) {
      return { answer: "No SAT data.", chips:[{kind:"evidence", text:"v_sat_enum_progression"}], hits:[] };
    }

    const nth = slots.nth;
    if (nth > rows.length) {
      return { answer: `You only have ${rows.length} SAT score${rows.length > 1 ? 's' : ''}.`, chips:[{kind:"evidence", text:"v_sat_enum_progression"}], hits:rows };
    }

    const s = rows[nth - 1];
    const ordinal = ['', 'first', 'second', 'third', 'fourth', 'fifth'][nth] || `${nth}th`;
    return { answer: `Your ${ordinal} SAT total score was ${s.numeric_value} (${s.as_of}${s.type ? `, ${s.type}` : ""})`, chips:[{kind:"evidence", text:"v_sat_enum_progression"}], hits:[s] };
  }

  // progression
  const { rows } = await pg.query(`SELECT * FROM v_sat_enum_progression WHERE student_id=$1 ORDER BY as_of ASC`, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'academicsSAT', view: 'v_sat_enum_progression', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No SAT data.", chips:[{kind:"evidence", text:"v_sat_enum_progression"}], hits:[] };
  }

  const list = rows.map((s:any,i:number)=>`${i+1}. ${s.numeric_value} (${s.as_of}${s.type?`, ${s.type}`:""})`).join("\n");
  return { answer: list, chips:[{kind:"evidence", text:"v_sat_enum_progression"}], hits:rows };
}

export async function academicsGPA(pg: Pool, studentId: string, phase: string, _slots: any) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'academicsGPA', student_id: studentId, phase });

  const { rows } = await pg.query(`SELECT * FROM v_gpa_timeline WHERE student_id=$1 ORDER BY recorded_at`, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'academicsGPA', view: 'v_gpa_timeline', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No GPA data.", chips:[{kind:"evidence", text:"v_gpa_timeline"}], hits:[] };
  }

  if (phase === "latest") {
    const last = rows[rows.length-1];
    const gpaText = last.gpa_weighted ? `${last.gpa_unweighted || 'N/A'} UW / ${last.gpa_weighted} W` : `${last.gpa_unweighted || 'N/A'}`;
    return { answer: `Your latest GPA is ${gpaText} (${last.scope_label || last.scope})`, chips:[{kind:"evidence", text:"v_gpa_timeline"}], hits:[last] };
  }

  const list = rows.map((r:any)=>`${r.scope_label || r.scope}: ${r.gpa_weighted ? `${r.gpa_unweighted || 'N/A'} UW / ${r.gpa_weighted} W` : r.gpa_unweighted || 'N/A'}`).join("\n");
  return { answer: list, chips:[{kind:"evidence", text:"v_gpa_timeline"}], hits:rows };
}

export async function academicsTranscript(pg: Pool, studentId: string, phase: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'academicsTranscript', student_id: studentId, phase });

  const view = phase === "final" ? "v_transcript_final" : "v_transcript_initial";
  const { rows } = await pg.query(`SELECT * FROM ${view} WHERE student_id=$1 ORDER BY term_code, course_title`, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'academicsTranscript', view, row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: `No ${phase} transcript data found.`, chips:[{kind:"evidence", text:view}], hits:[] };
  }

  const list = rows.map((r:any, i:number) =>
    `${i+1}. ${r.course_title} — ${r.grade_letter || 'N/A'}${r.grade_percent ? ` (${r.grade_percent}%)` : ''}${r.credits ? ` [${r.credits} cr]` : ''}`
  ).join("\n");

  return { answer: list, chips:[{kind:"evidence", text:view}], hits:rows };
}

export async function narrativeInitial(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'narrativeInitial', student_id: studentId });

  const { rows } = await pg.query(`SELECT * FROM v_narrative_initial WHERE student_id=$1 ORDER BY narrative_category`, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'narrativeInitial', view: 'v_narrative_initial', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No initial narrative found.", chips:[{kind:"evidence", text:"v_narrative_initial"}], hits:[] };
  }

  const answer = rows.map((r: any) => `• ${r.narrative_category}: ${r.content}`).join('\n');
  const chips = rows.map((r: any) => ({kind:"evidence", text:`${r.narrative_category}`, id: r.item_id}));

  return {
    answer,
    chips,
    hits: rows
  };
}

export async function narrativeFinal(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'narrativeFinal', student_id: studentId });

  const { rows } = await pg.query(`SELECT * FROM v_narrative_final WHERE student_id=$1 ORDER BY narrative_category`, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'narrativeFinal', view: 'v_narrative_final', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No final narrative found.", chips:[{kind:"evidence", text:"v_narrative_final"}], hits:[] };
  }

  const answer = rows.map((r: any) => `• ${r.narrative_category}: ${r.content}`).join('\n');
  const chips = rows.map((r: any) => ({kind:"evidence", text:`${r.narrative_category}`, id: r.item_id}));

  return {
    answer,
    chips,
    hits: rows
  };
}

export async function academicsSummary(pg: Pool, studentId: string, phase: string, slots?: any) {
  const start = Date.now();
  const metrics = slots?.metrics || ['grades', 'gpa', 'sat'];
  log.event('resolver.sql_start', { resolver: 'academicsSummary', student_id: studentId, phase, metrics });

  const parts: string[] = [];
  const allChips: any[] = [];
  const allHits: any[] = [];

  // Fetch GPA if requested (only for latest/final phase - no initial GPA data exists)
  if (metrics.includes('gpa') && (phase === 'latest' || phase === 'final' || phase === 'none')) {
    const { rows } = await pg.query(`SELECT * FROM v_gpa_timeline WHERE student_id=$1 ORDER BY recorded_at`, [studentId]);
    if (rows.length) {
      const last = rows[rows.length-1];
      const gpaText = last.gpa_weighted ? `${last.gpa_unweighted || 'N/A'} UW / ${last.gpa_weighted} W` : `${last.gpa_unweighted || 'N/A'}`;
      parts.push(`• GPA: ${gpaText} (${last.scope_label || last.scope})`);
      allChips.push({kind:"evidence", text:"GPA", id: last.gpa_id});
      allHits.push(last);
    }
  }

  // Fetch SAT if requested
  if (metrics.includes('sat')) {
    const satPhase = phase === 'initial' ? 'first' : 'latest';
    const satData = await academicsSAT(pg, studentId, satPhase, {});
    if (satData.answer && !satData.answer.includes('No SAT')) {
      parts.push(`• SAT: ${satData.answer}`);
      allChips.push(...satData.chips);
      allHits.push(...satData.hits);
    }
  }

  log.event('resolver.sql_complete', { resolver: 'academicsSummary', parts_count: parts.length, took_ms: Date.now() - start });

  if (parts.length === 0) {
    return { answer: `No ${phase} academic data found.`, chips:[], hits:[] };
  }

  return {
    answer: parts.join('\n'),
    chips: allChips,
    hits: allHits
  };
}

/**
 * KB Search Resolver (CAT-2) - v11.1 Implementation
 *
 * Performs hybrid search (vector + lexical) across KBv6 namespaces and returns
 * retrieved evidence with a helpful search summary.
 *
 * NOTE: This resolver does NOT compose the final LLM answer - it returns the raw
 * search hits. The orchestrator/intentRouter will handle LLM composition if needed.
 *
 * For full LLM-composed answers with KB context, queries should go through the
 * agentChat orchestrator's "unknown" intent path which calls hybridSearch + composeAnswer.
 */
export async function kbSearch(pg: Pool, studentId: string, q: string, filters?: any) {
  const start = Date.now();
  log.event('resolver.kb_search_start', {
    student_id: studentId,
    query: q.substring(0, 100),
    filters
  });

  // Import hybridSearch dynamically to avoid circular dependency
  const { hybridSearch } = await import('../retrieval/hybrid.js');

  // Perform hybrid search across KBv6 namespaces
  const hits = await hybridSearch(q, studentId);

  log.event('resolver.kb_search_complete', {
    student_id: studentId,
    hit_count: hits.length,
    took_ms: Date.now() - start
  });

  if (!hits || hits.length === 0) {
    return {
      answer: "I searched your knowledge base but didn't find any relevant coaching moments or insights for that query. Try asking about specific awards, activities, or strategies we discussed.",
      chips: [{kind: "kb", text: "no results"}],
      hits: []
    };
  }

  // Format a summary of search results
  const topHits = hits.slice(0, 5);
  const summary = `Found ${hits.length} relevant coaching moments and insights from your journey. Here are the top results:\n\n` +
    topHits.map((hit: any, i: number) => {
      const ns = hit.namespace || 'unknown';
      const score = hit.score ? ` (score: ${hit.score.toFixed(2)})` : '';
      const text = hit._text || hit.text || hit.content || '';
      const preview = text.substring(0, 150) + (text.length > 150 ? '...' : '');
      return `${i+1}. [${ns}]${score}\n   ${preview}`;
    }).join('\n\n');

  return {
    answer: summary,
    chips: [
      {kind: "kb", text: `${hits.length} hits`},
      {kind: "evidence", text: "KBv6 hybrid search"}
    ],
    hits
  };
}

// ============================================================================
// V3.4 RESOLVERS: GamePlan, Common App, IvyReady
// ============================================================================

export async function gamePlanInitial(pg: Pool, studentId: string) {
  const start = Date.now();
  console.log('[RESOLVER:gamePlanInitial] 🎯 Called with:', { studentId });
  log.event('resolver.sql_start', { resolver: 'gamePlanInitial', student_id: studentId });

  const query = `SELECT * FROM v_gameplan_summary_initial WHERE student_id=$1`;
  console.log('[RESOLVER:gamePlanInitial] → Executing SQL:', query);
  const { rows } = await pg.query(query, [studentId]);
  console.log('[RESOLVER:gamePlanInitial] ✓ Query returned', rows.length, 'rows');
  if (rows.length > 0) {
    const gp = rows[0];
    console.log('[RESOLVER:gamePlanInitial] → GamePlan structure:', {
      narrative_items: (gp.narrative_items || []).length,
      award_targets: (gp.award_targets || []).length,
      ec_targets: (gp.ec_targets || []).length,
      program_targets: (gp.program_targets || []).length
    });
  }
  log.event('resolver.sql_complete', { resolver: 'gamePlanInitial', view: 'v_gameplan_summary_initial', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No initial GamePlan data found.", chips:[{kind:"evidence", text:"v_gameplan_summary_initial"}], hits:[] };
  }

  const gp = rows[0];
  const parts: string[] = [];
  const chips: any[] = [{kind:"evidence", text:"v_gameplan_summary_initial"}];

  // Parse JSONB arrays
  const narrativeItems = gp.narrative_items || [];
  const awardTargets = gp.award_targets || [];
  const ecTargets = gp.ec_targets || [];
  const programTargets = gp.program_targets || [];

  if (narrativeItems.length > 0) {
    parts.push(`**Narrative (${narrativeItems.length})**:`);
    narrativeItems.forEach((n: any, i: number) => {
      parts.push(`  ${i+1}. ${n.category}: ${n.content}${n.chip ? ` [${n.chip}]` : ''}`);
    });
  }

  if (awardTargets.length > 0) {
    parts.push(`\n**Award Targets (${awardTargets.length})**:`);
    awardTargets.forEach((a: any, i: number) => {
      parts.push(`  ${i+1}. ${a.label}${a.as_of ? ` — ${a.as_of}` : ''}`);
    });
  }

  if (ecTargets.length > 0) {
    parts.push(`\n**EC Targets (${ecTargets.length})**:`);
    ecTargets.forEach((e: any, i: number) => {
      parts.push(`  ${i+1}. ${e.label}${e.as_of ? ` — ${e.as_of}` : ''}`);
    });
  }

  if (programTargets.length > 0) {
    parts.push(`\n**Program Targets (${programTargets.length})**:`);
    programTargets.forEach((p: any, i: number) => {
      parts.push(`  ${i+1}. ${p.program}${p.provider ? ` (${p.provider})` : ''}${p.chip ? ` [${p.chip}]` : ''}`);
    });
  }

  if (parts.length === 0) {
    return { answer: "No initial GamePlan targets found.", chips, hits:rows };
  }

  return { answer: parts.join('\n'), chips, hits: rows };
}

export async function gamePlanVsExecution(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'gamePlanVsExecution', student_id: studentId });

  const { rows } = await pg.query(`SELECT * FROM v_gameplan_vs_execution WHERE student_id=$1 ORDER BY domain, item, as_of NULLS LAST`, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'gamePlanVsExecution', view: 'v_gameplan_vs_execution', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No GamePlan progression data found.", chips:[{kind:"evidence", text:"v_gameplan_vs_execution"}], hits:[] };
  }

  // Group by domain
  const byDomain: any = {};
  rows.forEach((r: any) => {
    if (!byDomain[r.domain]) byDomain[r.domain] = [];
    byDomain[r.domain].push(r);
  });

  const parts: string[] = [];

  Object.keys(byDomain).sort().forEach((domain: string) => {
    const items = byDomain[domain];
    parts.push(`\n**${domain.toUpperCase()} Progression (${items.length})**:`);

    // Group by item to show progression
    const byItem: any = {};
    items.forEach((item: any) => {
      if (!byItem[item.item]) byItem[item.item] = [];
      byItem[item.item].push(item);
    });

    Object.keys(byItem).forEach((itemName: string, idx: number) => {
      const progression = byItem[itemName];
      const phases = progression.map((p: any) => p.phase).join(' → ');
      parts.push(`  ${idx+1}. ${itemName}: ${phases}`);
    });
  });

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_gameplan_vs_execution"}], hits: rows };
}

export async function commonAppSubmitted(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'commonAppSubmitted', student_id: studentId });

  const { rows } = await pg.query(`SELECT * FROM v_commonapp_submitted WHERE student_id=$1`, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'commonAppSubmitted', view: 'v_commonapp_submitted', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: "No Common App submission data found.", chips:[{kind:"evidence", text:"v_commonapp_submitted"}], hits:[] };
  }

  const app = rows[0];
  const parts: string[] = [];
  const chips: any[] = [{kind:"evidence", text:"v_commonapp_submitted"}];

  // Parse JSONB arrays
  const activities = app.activities || [];
  const honors = app.honors || [];
  const academics = app.academics || [];

  if (activities.length > 0) {
    parts.push(`**Activities (${activities.length})**:`);
    activities.slice(0, 10).forEach((a: any, i: number) => {
      parts.push(`  ${i+1}. ${a.activity_name}${a.subcategory ? ` — ${a.subcategory}` : ''}`);
    });
  }

  if (honors.length > 0) {
    parts.push(`\n**Honors/Awards (${honors.length})**:`);
    honors.slice(0, 5).forEach((h: any, i: number) => {
      parts.push(`  ${i+1}. ${h.honor_name}${h.level ? ` — ${h.level}` : ''}`);
    });
  }

  if (academics.length > 0) {
    parts.push(`\n**Academics**:`);
    academics.forEach((a: any) => {
      parts.push(`  • ${a.kind}: ${a.value || a.numeric_value}`);
    });
  }

  if (parts.length === 0) {
    return { answer: "No Common App submission data found.", chips, hits:rows };
  }

  return { answer: parts.join('\n'), chips, hits: rows };
}

export async function ivyReadyScore(pg: Pool, studentId: string, phase?: string | null) {
  const start = Date.now();
  console.log('[RESOLVER:ivyReadyScore] 🎯 Called with:', { studentId, phase });
  log.event('resolver.sql_start', { resolver: 'ivyReadyScore', student_id: studentId, phase });

  // Map phase to snapshot_phase: initial -> assessment, final -> final_submit
  const snapshotPhase = phase === 'initial' ? 'assessment' : phase === 'final' ? 'final_submit' : null;
  console.log('[RESOLVER:ivyReadyScore] → Mapped to snapshotPhase:', snapshotPhase);

  let query: string;
  let params: any[];

  if (snapshotPhase) {
    // Specific phase requested
    query = `SELECT * FROM v_rubric_scores_phase_latest WHERE student_id=$1 AND snapshot_phase=$2`;
    params = [studentId, snapshotPhase];
  } else {
    // All phases
    query = `SELECT * FROM v_rubric_scores_phase_latest WHERE student_id=$1 ORDER BY as_of DESC`;
    params = [studentId];
  }

  console.log('[RESOLVER:ivyReadyScore] → Executing SQL:', query.trim().substring(0, 100) + '...');
  console.log('[RESOLVER:ivyReadyScore] → With params:', params);
  const { rows } = await pg.query(query, params);
  console.log('[RESOLVER:ivyReadyScore] ✓ Query returned', rows.length, 'rows');
  if (rows.length > 0) {
    console.log('[RESOLVER:ivyReadyScore] → First row sample:', JSON.stringify(rows[0]).substring(0, 200));
  }
  log.event('resolver.sql_complete', { resolver: 'ivyReadyScore', view: 'v_rubric_scores_phase_latest', snapshot_phase: snapshotPhase, row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    const phaseMsg = snapshotPhase ? ` for ${snapshotPhase} phase` : '';
    return { answer: `No IvyReady rubric scores found${phaseMsg}.`, chips:[{kind:"evidence", text:"v_rubric_scores_phase_latest"}], hits:[] };
  }

  const parts: string[] = [];
  const chips: any[] = [{kind:"evidence", text:"v_rubric_scores_phase_latest"}];

  rows.forEach((r: any) => {
    const phaseLabel = r.snapshot_phase || 'unknown';
    const score = r.ivyready_score ? Math.round(r.ivyready_score * 10) / 10 : 'N/A';
    const factorScores = r.factor_scores || {};

    parts.push(`\n**${phaseLabel.toUpperCase()} (${r.as_of})**`);
    parts.push(`  IvyReady Score: ${score}/100`);
    parts.push(`  Factor Breakdown:`);

    Object.keys(factorScores).forEach((factor: string) => {
      parts.push(`    • ${factor}: ${factorScores[factor]}/100`);
    });
  });

  return { answer: parts.join('\n'), chips, hits: rows };
}

// ============================================================================
// v3.5: IvyReady Snapshots (Credit-Score Layer)
// ============================================================================

export async function ivyReadyInitial(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'ivyReadyInitial', student_id: studentId });

  const query = `SELECT * FROM ivyready_snapshots WHERE student_id=$1 AND rubric_id='ivyplus_v1' AND snapshot_phase='assessment' ORDER BY as_of DESC LIMIT 1`;
  const { rows } = await pg.query(query, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'ivyReadyInitial', view: 'ivyready_snapshots', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: 'No initial IvyReady snapshot found (assessment phase).', chips:[{kind:"evidence", text:"ivyready_snapshots"}], hits:[] };
  }

  const r = rows[0];
  const score = r.overall_score ? Math.round(r.overall_score * 10) / 10 : 'N/A';

  const parts: string[] = [];
  parts.push(`**Initial IvyReady Score (Assessment)**`);
  parts.push(`Date: ${r.as_of}`);
  parts.push(`Score: ${score}/100`);
  parts.push(`Engine: ${r.engine || 'sql'}`);
  if (r.notes) parts.push(`Notes: ${r.notes}`);

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"ivyready_snapshots"}], hits: rows };
}

export async function ivyReadyFinal(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'ivyReadyFinal', student_id: studentId });

  const query = `SELECT * FROM ivyready_snapshots WHERE student_id=$1 AND rubric_id='ivyplus_v1' AND snapshot_phase='final_submit' ORDER BY as_of DESC LIMIT 1`;
  const { rows } = await pg.query(query, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'ivyReadyFinal', view: 'ivyready_snapshots', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: 'No final IvyReady snapshot found (final_submit phase).', chips:[{kind:"evidence", text:"ivyready_snapshots"}], hits:[] };
  }

  const r = rows[0];
  const score = r.overall_score ? Math.round(r.overall_score * 10) / 10 : 'N/A';

  const parts: string[] = [];
  parts.push(`**Final IvyReady Score (Submit)**`);
  parts.push(`Date: ${r.as_of}`);
  parts.push(`Score: ${score}/100`);
  parts.push(`Engine: ${r.engine || 'sql'}`);
  if (r.notes) parts.push(`Notes: ${r.notes}`);

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"ivyready_snapshots"}], hits: rows };
}

export async function ivyReadyCompare(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'ivyReadyCompare', student_id: studentId });

  const query = `SELECT * FROM v_ivyready_assessment_vs_final WHERE student_id=$1`;
  const { rows } = await pg.query(query, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'ivyReadyCompare', view: 'v_ivyready_assessment_vs_final', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: 'No assessment vs final comparison available. Need both snapshots.', chips:[{kind:"evidence", text:"v_ivyready_assessment_vs_final"}], hits:[] };
  }

  const r = rows[0];
  const assessmentScore = r.assessment_score ? Math.round(r.assessment_score * 10) / 10 : 'N/A';
  const finalScore = r.final_score ? Math.round(r.final_score * 10) / 10 : 'N/A';
  const delta = r.delta ? Math.round(r.delta * 10) / 10 : 0;
  const deltaSign = delta >= 0 ? '+' : '';

  const parts: string[] = [];
  parts.push(`**IvyReady Score Comparison**\n`);
  parts.push(`**Assessment** (${r.assessment_as_of}): ${assessmentScore}/100`);
  parts.push(`**Final Submit** (${r.final_as_of}): ${finalScore}/100`);
  parts.push(`**Delta**: ${deltaSign}${delta} points`);

  if (delta > 0) {
    parts.push(`\nYour IvyReady score improved by ${delta} points from assessment to submission.`);
  } else if (delta < 0) {
    parts.push(`\nYour IvyReady score decreased by ${Math.abs(delta)} points from assessment to submission.`);
  } else {
    parts.push(`\nYour IvyReady score remained unchanged from assessment to submission.`);
  }

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_ivyready_assessment_vs_final"}], hits: rows };
}

export async function ivyReadyFactors(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'ivyReadyFactors', student_id: studentId });

  const query = `SELECT * FROM v_ivyready_factor_deltas WHERE student_id=$1 ORDER BY factor_id`;
  const { rows } = await pg.query(query, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'ivyReadyFactors', view: 'v_ivyready_factor_deltas', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: 'No factor-level deltas available. Need both assessment and final snapshots.', chips:[{kind:"evidence", text:"v_ivyready_factor_deltas"}], hits:[] };
  }

  const parts: string[] = [];
  parts.push(`**IvyReady Factor Deltas (Assessment → Final)**\n`);

  rows.forEach((r: any) => {
    const assessmentFactor = r.assessment_factor ? Math.round(r.assessment_factor * 10) / 10 : 0;
    const finalFactor = r.final_factor ? Math.round(r.final_factor * 10) / 10 : 0;
    const delta = r.delta ? Math.round(r.delta * 10) / 10 : 0;
    const deltaSign = delta >= 0 ? '+' : '';

    parts.push(`**${r.factor_id}**: ${assessmentFactor} → ${finalFactor} (${deltaSign}${delta})`);
  });

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_ivyready_factor_deltas"}], hits: rows };
}

// ============================================================================
// v3.7: Universal Readiness Scoring (Feature-Based Layer)
// ============================================================================

export async function readinessNow(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessNow', student_id: studentId });

  const query = `SELECT * FROM v_features_all WHERE student_id=$1 ORDER BY domain, feature_key`;
  const { rows } = await pg.query(query, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'readinessNow', view: 'v_features_all', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: 'No feature data available for readiness calculation.', chips:[{kind:"evidence", text:"v_features_all"}], hits:[] };
  }

  // Group features by domain
  const byDomain: Record<string, any[]> = {};
  rows.forEach(r => {
    if (!byDomain[r.domain]) byDomain[r.domain] = [];
    byDomain[r.domain].push(r);
  });

  const parts: string[] = [];
  parts.push(`**Current Readiness Profile** (${rows.length} features tracked)\n`);

  Object.keys(byDomain).sort().forEach(domain => {
    parts.push(`\n**${domain.toUpperCase()}**:`);
    byDomain[domain].forEach(f => {
      parts.push(`  • ${f.feature_key.replace(/_/g, ' ')}: ${f.feature_value}`);
    });
  });

  parts.push(`\n*Measured at: ${rows[0].measured_at}*`);

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_features_all"}], hits: rows };
}

export async function readinessProgress(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessProgress', student_id: studentId });

  const query = `SELECT snapshot_id, snapshot_name, ivy_ready_score, created_at FROM readiness_snapshots WHERE student_id=$1 ORDER BY created_at`;
  const { rows } = await pg.query(query, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'readinessProgress', view: 'readiness_snapshots', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: 'No historical readiness snapshots captured yet. Create snapshots via POST /students/:id/snapshots to track progress.', chips:[{kind:"evidence", text:"readiness_snapshots"}], hits:[] };
  }

  const parts: string[] = [];
  parts.push(`**Readiness Progress Timeline**\n`);

  rows.forEach((r: any, i: number) => {
    const date = new Date(r.created_at).toLocaleDateString();
    const score = r.ivy_ready_score ? r.ivy_ready_score.toFixed(2) : 'N/A';
    parts.push(`${i+1}. **${r.snapshot_name}** (${date}): IvyReady ${score}`);
  });

  // Calculate growth if we have at least 2 snapshots
  if (rows.length >= 2) {
    const first = rows[0].ivy_ready_score || 0;
    const last = rows[rows.length - 1].ivy_ready_score || 0;
    const growth = last - first;
    parts.push(`\n**Total Growth**: ${growth >= 0 ? '+' : ''}${growth.toFixed(2)} points (${first.toFixed(2)} → ${last.toFixed(2)})`);
  }

  parts.push(`\n*${rows.length} snapshot${rows.length > 1 ? 's' : ''} captured. Use snapshots to track readiness over time.*`);

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"readiness_snapshots"}], hits: rows };
}

export async function readinessDrivers(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessDrivers', student_id: studentId });

  const query = `SELECT domain, COUNT(*) as feature_count, JSONB_AGG(JSONB_BUILD_OBJECT('key', feature_key, 'value', feature_value)) as features FROM v_features_all WHERE student_id=$1 GROUP BY domain ORDER BY domain`;
  const { rows } = await pg.query(query, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'readinessDrivers', view: 'v_features_all', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: 'No feature data available to analyze drivers.', chips:[{kind:"evidence", text:"v_features_all"}], hits:[] };
  }

  const parts: string[] = [];
  parts.push(`**Readiness Drivers** (by domain)\n`);

  rows.forEach((r: any) => {
    parts.push(`\n**${r.domain.toUpperCase()}** (${r.feature_count} features):`);
    const features = r.features || [];
    features.slice(0, 5).forEach((f: any) => {
      parts.push(`  • ${f.key.replace(/_/g, ' ')}: ${f.value}`);
    });
  });

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_features_all"}], hits: rows };
}

export async function readinessWhatIfSAT(pg: Pool, studentId: string, uapxOrLegacy: any) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessWhatIfSAT', student_id: studentId, uapx: uapxOrLegacy });

  // v3.7.2 UAPX support with legacy fallback
  let targetScore: number;
  if (typeof uapxOrLegacy === 'object' && uapxOrLegacy.target?.name === 'sat_total') {
    targetScore = uapxOrLegacy.target.value;
  } else if (typeof uapxOrLegacy === 'object' && uapxOrLegacy.action === 'increase' && uapxOrLegacy.delta?.name === 'sat_total') {
    // Get current SAT and apply delta
    const currentQuery = `SELECT feature_value FROM v_features_all WHERE student_id=$1 AND feature_key='sat_composite'`;
    const { rows: currentRows } = await pg.query(currentQuery, [studentId]);
    const currentSAT = currentRows.length > 0 ? Number(currentRows[0].feature_value) : 0;
    targetScore = currentSAT + uapxOrLegacy.delta.value;
  } else {
    // Legacy number param
    targetScore = Number(uapxOrLegacy);
  }

  if (!targetScore || targetScore < 400 || targetScore > 1600) {
    return { answer: 'Invalid SAT score. Must be between 400 and 1600.', chips:[{kind:"error", text:"invalid_param"}], hits:[] };
  }

  // Get current IvyReady score and SAT
  const baseQuery = `
    SELECT
      ivy_ready_score AS base_score,
      (factor_breakdown->>'academics')::NUMERIC AS academics_factor
    FROM v_ivyready_current
    WHERE student_id = $1
  `;
  const { rows: baseRows } = await pg.query(baseQuery, [studentId]);

  const currentQuery = `SELECT feature_value FROM v_features_all WHERE student_id=$1 AND feature_key='sat_composite'`;
  const { rows: currentRows } = await pg.query(currentQuery, [studentId]);

  const currentSAT = currentRows.length > 0 ? Number(currentRows[0].feature_value) : 0;
  const baseScore = baseRows.length > 0 ? Number(baseRows[0].base_score) : 0;
  const academicsFactor = baseRows.length > 0 ? Number(baseRows[0].academics_factor) : 0;

  // Calculate delta using v3.7.1 formula:
  // SAT contributes 60% of academics factor (40% weight)
  // SAT max is 1600, so normalized contribution is (SAT/1600 * 60)
  const currentSATContrib = (currentSAT / 1600.0) * 60;
  const targetSATContrib = (targetScore / 1600.0) * 60;
  const satDelta = (targetSATContrib - currentSATContrib) * 0.40; // Academics has 40% weight
  const projectedScore = baseScore + satDelta;

  const parts: string[] = [];
  parts.push(`**What-If: Raise SAT to ${targetScore}**\n`);
  parts.push(`**Current SAT**: ${currentSAT}`);
  parts.push(`**Target SAT**: ${targetScore}`);
  parts.push(`**SAT Improvement**: +${targetScore - currentSAT} points\n`);
  parts.push(`**Current IvyReady Score**: ${baseScore.toFixed(2)}`);
  parts.push(`**Projected IvyReady Score**: ${projectedScore.toFixed(2)}`);
  parts.push(`**Net Change**: ${satDelta >= 0 ? '+' : ''}${satDelta.toFixed(2)} points\n`);
  parts.push(`**Impact Analysis**:`);
  parts.push(`  • SAT contributes 60% of your Academics factor (40% of total score)`);
  parts.push(`  • This ${targetScore - currentSAT} point increase would ${satDelta > 0 ? 'boost' : 'lower'} your overall readiness by ${Math.abs(satDelta).toFixed(2)} points`);
  parts.push(`\n*Note: This simulation uses deterministic scoring from v_ivyready_current view (v3.7.2 UAPX).*`);

  log.event('resolver.sql_complete', { resolver: 'readinessWhatIfSAT', base_score: baseScore, projected_score: projectedScore, delta: satDelta, took_ms: Date.now() - start });

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_ivyready_current"}, {kind:"notice", text:"simulation"}], hits: baseRows };
}

export async function readinessWhatIfAward(pg: Pool, studentId: string, uapxOrLegacy: any) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessWhatIfAward', student_id: studentId, uapx: uapxOrLegacy });

  // v3.7.2 UAPX support with legacy fallback
  let awardTier: string;
  if (typeof uapxOrLegacy === 'object' && uapxOrLegacy.target?.name === 'award_tier') {
    awardTier = uapxOrLegacy.target.value;
    // Normalize: "national" -> "National"
    awardTier = awardTier.charAt(0).toUpperCase() + awardTier.slice(1).toLowerCase();
  } else {
    // Legacy string param
    awardTier = String(uapxOrLegacy);
  }

  if (!awardTier || !['Regional', 'National', 'International'].includes(awardTier)) {
    return { answer: 'Invalid award tier. Must be Regional, National, or International.', chips:[{kind:"error", text:"invalid_param"}], hits:[] };
  }

  // Get current IvyReady score
  const baseQuery = `
    SELECT
      ivy_ready_score AS base_score,
      (factor_breakdown->>'awards')::NUMERIC AS awards_factor
    FROM v_ivyready_current
    WHERE student_id = $1
  `;
  const { rows: baseRows } = await pg.query(baseQuery, [studentId]);

  const tierKey = awardTier.toLowerCase() + '_awards_count';
  const currentQuery = `SELECT feature_value FROM v_features_all WHERE student_id=$1 AND feature_key=$2`;
  const { rows: currentRows } = await pg.query(currentQuery, [studentId, tierKey]);

  const currentCount = currentRows.length > 0 ? Number(currentRows[0].feature_value) : 0;
  const baseScore = baseRows.length > 0 ? Number(baseRows[0].base_score) : 0;
  const awardsFactor = baseRows.length > 0 ? Number(baseRows[0].awards_factor) : 0;

  // Calculate delta using v3.7.1 formula:
  // Awards factor (25% weight) with tier-specific bumps
  const tierBumps: Record<string, number> = {
    'International': 40,
    'National': 20,
    'Regional': 10
  };
  const tierBump = tierBumps[awardTier];
  const awardDelta = tierBump * 0.25; // Awards has 25% weight
  const projectedScore = baseScore + awardDelta;

  const parts: string[] = [];
  parts.push(`**What-If: Win ${awardTier} Award**\n`);
  parts.push(`**Current ${awardTier} Awards**: ${currentCount}`);
  parts.push(`**After Winning**: ${currentCount + 1}\n`);
  parts.push(`**Current IvyReady Score**: ${baseScore.toFixed(2)}`);
  parts.push(`**Projected IvyReady Score**: ${projectedScore.toFixed(2)}`);
  parts.push(`**Net Change**: +${awardDelta.toFixed(2)} points\n`);
  parts.push(`**Impact Analysis**:`);
  parts.push(`  • ${awardTier} awards contribute ${tierBump} points to your Awards factor (25% of total score)`);
  parts.push(`  • Winning this award would boost your overall readiness by ${awardDelta.toFixed(2)} points`);

  if (awardTier === 'International') {
    parts.push(`\n*International awards have the highest impact—consider ISEF, IOI, IMO-level competitions.*`);
  } else if (awardTier === 'National') {
    parts.push(`\n*National awards significantly boost your profile—target USAMO, NatSciOlympiad, Regeneron STS.*`);
  } else {
    parts.push(`\n*Regional awards demonstrate local excellence—State Science Fair, regional olympiad honors.*`);
  }

  parts.push(`\n*v3.7.2 UAPX extraction with deterministic scoring.*`);

  log.event('resolver.sql_complete', { resolver: 'readinessWhatIfAward', base_score: baseScore, projected_score: projectedScore, delta: awardDelta, took_ms: Date.now() - start });

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_ivyready_current"}, {kind:"notice", text:"simulation"}], hits: baseRows };
}

export async function readinessWhatIfEC(pg: Pool, studentId: string, uapx: any) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessWhatIfEC', student_id: studentId, uapx });

  if (!uapx || uapx.domain !== "ecs") {
    return { answer: 'Missing or invalid UAPX parameter for EC what-if scenario.', chips:[{kind:"error", text:"missing_uapx"}], hits:[] };
  }

  // Normalize activity name using fuzzy matching
  const { normalizeActivityName } = await import('../utils/activityNormalizer.js');
  const activityName = await normalizeActivityName(pg, studentId, uapx.qualifiers?.activity_name);

  // Get current IvyReady score
  const baseQuery = `
    SELECT
      ivy_ready_score AS base_score,
      (factor_breakdown->>'ecs')::NUMERIC AS ecs_factor
    FROM v_ivyready_current
    WHERE student_id = $1
  `;
  const { rows: baseRows } = await pg.query(baseQuery, [studentId]);
  const baseScore = baseRows.length > 0 ? Number(baseRows[0].base_score) : 0;

  // Determine metric and target/delta
  const metric = uapx.target?.name || uapx.delta?.name;
  if (!metric || !["users", "funds_usd", "hours_per_week", "leadership_roles"].includes(metric)) {
    return { answer: 'Unsupported EC metric. Try users, funds_usd, hours_per_week, or leadership_roles.', chips:[{kind:"error", text:"invalid_metric"}], hits:[] };
  }

  // Calculate current value (stubbed - in production, query kb_items metadata)
  let currentValue = 0;
  // TODO: const currentValue = await getECMetric(pg, studentId, metric, activityName);

  // Calculate target value
  let targetValue = currentValue;
  if (uapx.action === "set" && uapx.target && typeof uapx.target.value === "number") {
    targetValue = uapx.target.value;
  } else if (uapx.action === "increase" && uapx.delta && typeof uapx.delta.value === "number") {
    if (uapx.delta.unit === "%") {
      targetValue = Math.round(currentValue * (1 + uapx.delta.value / 100));
    } else {
      targetValue = currentValue + uapx.delta.value;
    }
  } else {
    return { answer: 'Unsupported what-if form for this EC metric.', chips:[{kind:"error", text:"invalid_form"}], hits:[] };
  }

  if (targetValue < 0) {
    return { answer: 'Target cannot be negative.', chips:[{kind:"error", text:"negative_target"}], hits:[] };
  }

  // EC impact model: metric-specific scoring
  let ecDelta = 0;
  let description = '';

  if (metric === 'users') {
    ecDelta = targetValue >= 10000 ? 2.5 : targetValue >= 5000 ? 2.0 : 1.5;
    description = `${activityName ? `${activityName}: ` : ''}Growing to ${targetValue.toLocaleString()} users`;
  } else if (metric === 'funds_usd') {
    ecDelta = targetValue >= 25000 ? 3.0 : targetValue >= 10000 ? 2.0 : 1.0;
    description = `${activityName ? `${activityName}: ` : ''}Raising $${(targetValue/1000).toFixed(0)}k`;
  } else if (metric === 'hours_per_week') {
    ecDelta = targetValue >= 15 ? 1.5 : targetValue >= 10 ? 1.0 : 0.5;
    description = `${activityName ? `${activityName}: ` : ''}Increasing hours/week to ${targetValue}`;
  } else if (metric === 'leadership_roles') {
    ecDelta = targetValue >= 3 ? 2.0 : targetValue >= 2 ? 1.5 : 1.0;
    description = `${activityName ? `${activityName}: ` : ''}Adding ${targetValue} leadership roles`;
  }

  const projectedScore = baseScore + ecDelta;

  const parts: string[] = [];
  parts.push(`**What-If: ${description}**\n`);
  if (activityName) parts.push(`**Activity**: ${activityName}`);
  parts.push(`**Metric**: ${metric}`);
  parts.push(`**Current Value**: ${currentValue.toLocaleString()}`);
  parts.push(`**Target Value**: ${targetValue.toLocaleString()}\n`);
  parts.push(`**Current IvyReady Score**: ${baseScore.toFixed(2)}`);
  parts.push(`**Projected IvyReady Score**: ${projectedScore.toFixed(2)}`);
  parts.push(`**Net Change**: +${ecDelta.toFixed(2)} points\n`);
  parts.push(`**Impact Analysis**:`);
  parts.push(`  • EC ${metric.replace('_', ' ')} scaling demonstrates growth, reach, and leadership capacity`);
  parts.push(`  • This ${targetValue - currentValue > 0 ? 'increase' : 'change'} would boost your overall readiness by ${ecDelta.toFixed(2)} points`);
  if (activityName) {
    parts.push(`  • Activity "${activityName}" recognized from your profile`);
  }
  parts.push(`\n*v3.7.3 UAPX with activity-aware extraction and multi-metric support.*`);

  log.event('resolver.sql_complete', { resolver: 'readinessWhatIfEC', activity: activityName, metric, current: currentValue, target: targetValue, base_score: baseScore, projected_score: projectedScore, delta: ecDelta, took_ms: Date.now() - start });

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_ivyready_current"}, {kind:"notice", text:"simulation"}, ...(activityName ? [{kind:"context", text:activityName}] : [])], hits: baseRows };
}

export async function readinessWhatIfGPA(pg: Pool, studentId: string, uapx: any) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessWhatIfGPA', student_id: studentId, uapx });

  if (!uapx || !uapx.target?.name?.includes('gpa')) {
    return { answer: 'Missing or invalid UAPX parameter for GPA what-if scenario.', chips:[{kind:"error", text:"missing_uapx"}], hits:[] };
  }

  const targetGPA = uapx.target.value;

  if (targetGPA < 0 || targetGPA > 4.5) {
    return { answer: 'Invalid GPA. Must be between 0 and 4.5.', chips:[{kind:"error", text:"invalid_param"}], hits:[] };
  }

  // Get current IvyReady score and GPA
  const baseQuery = `
    SELECT
      ivy_ready_score AS base_score,
      (factor_breakdown->>'academics')::NUMERIC AS academics_factor
    FROM v_ivyready_current
    WHERE student_id = $1
  `;
  const { rows: baseRows } = await pg.query(baseQuery, [studentId]);

  const currentQuery = `SELECT feature_value FROM v_features_all WHERE student_id=$1 AND feature_key='gpa_unweighted'`;
  const { rows: currentRows } = await pg.query(currentQuery, [studentId]);

  const currentGPA = currentRows.length > 0 ? Number(currentRows[0].feature_value) : 0;
  const baseScore = baseRows.length > 0 ? Number(baseRows[0].base_score) : 0;

  // GPA contributes 40% of academics factor (40% weight)
  // GPA max is 4.0, so normalized contribution is (GPA/4.0 * 40)
  const currentGPAContrib = (currentGPA / 4.0) * 40;
  const targetGPAContrib = (targetGPA / 4.0) * 40;
  const gpaDelta = (targetGPAContrib - currentGPAContrib) * 0.40; // Academics has 40% weight
  const projectedScore = baseScore + gpaDelta;

  const parts: string[] = [];
  parts.push(`**What-If: Raise GPA to ${targetGPA.toFixed(2)}**\n`);
  parts.push(`**Current GPA**: ${currentGPA.toFixed(2)}`);
  parts.push(`**Target GPA**: ${targetGPA.toFixed(2)}`);
  parts.push(`**GPA Improvement**: +${(targetGPA - currentGPA).toFixed(2)}\n`);
  parts.push(`**Current IvyReady Score**: ${baseScore.toFixed(2)}`);
  parts.push(`**Projected IvyReady Score**: ${projectedScore.toFixed(2)}`);
  parts.push(`**Net Change**: ${gpaDelta >= 0 ? '+' : ''}${gpaDelta.toFixed(2)} points\n`);
  parts.push(`**Impact Analysis**:`);
  parts.push(`  • GPA contributes 40% of your Academics factor (40% of total score)`);
  parts.push(`  • This ${(targetGPA - currentGPA).toFixed(2)} point increase would ${gpaDelta > 0 ? 'boost' : 'lower'} your overall readiness by ${Math.abs(gpaDelta).toFixed(2)} points`);
  parts.push(`\n*v3.7.2 UAPX extraction with deterministic scoring.*`);

  log.event('resolver.sql_complete', { resolver: 'readinessWhatIfGPA', base_score: baseScore, projected_score: projectedScore, delta: gpaDelta, took_ms: Date.now() - start });

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_ivyready_current"}, {kind:"notice", text:"simulation"}], hits: baseRows };
}

export async function readinessWhatIfProgram(pg: Pool, studentId: string, uapx: any) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessWhatIfProgram', student_id: studentId, uapx });

  if (!uapx) {
    return { answer: 'Missing UAPX parameter for program what-if scenario.', chips:[{kind:"error", text:"missing_uapx"}], hits:[] };
  }

  const programName = uapx.target?.value || uapx.qualifiers?.program_name || 'selective program';

  // Get current IvyReady score
  const baseQuery = `
    SELECT
      ivy_ready_score AS base_score,
      (factor_breakdown->>'programs')::NUMERIC AS programs_factor
    FROM v_ivyready_current
    WHERE student_id = $1
  `;
  const { rows: baseRows } = await pg.query(baseQuery, [studentId]);
  const baseScore = baseRows.length > 0 ? Number(baseRows[0].base_score) : 0;

  // Program admit impact: RSI/TASP = +5 points, other selective = +3 points
  const highImpactPrograms = ['rsi', 'tasp', 'ssp', 'yygs', 'launchx'];
  const programLower = String(programName).toLowerCase();
  const programDelta = highImpactPrograms.includes(programLower) ? 5.0 : 3.0;
  const projectedScore = baseScore + programDelta;

  const parts: string[] = [];
  parts.push(`**What-If: Get into ${programName}**\n`);
  parts.push(`**Current IvyReady Score**: ${baseScore.toFixed(2)}`);
  parts.push(`**Projected IvyReady Score**: ${projectedScore.toFixed(2)}`);
  parts.push(`**Net Change**: +${programDelta.toFixed(2)} points\n`);
  parts.push(`**Impact Analysis**:`);
  parts.push(`  • Admission to selective programs demonstrates competitive standing`);
  parts.push(`  • Getting into ${programName} would boost your overall readiness by ${programDelta.toFixed(2)} points`);

  if (highImpactPrograms.includes(programLower)) {
    parts.push(`\n*${programName.toUpperCase()} is a highly selective program with significant prestige value.*`);
  } else {
    parts.push(`\n*Selective summer programs enhance your profile—aim for research or leadership programs.*`);
  }

  parts.push(`\n*v3.7.2 UAPX extraction with simplified program impact model.*`);

  log.event('resolver.sql_complete', { resolver: 'readinessWhatIfProgram', base_score: baseScore, projected_score: projectedScore, delta: programDelta, took_ms: Date.now() - start });

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_ivyready_current"}, {kind:"notice", text:"simulation"}], hits: baseRows };
}

export async function readinessNextMoves(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessNextMoves', student_id: studentId });

  const query = `SELECT * FROM v_features_all WHERE student_id=$1 ORDER BY domain, feature_value ASC`;
  const { rows } = await pg.query(query, [studentId]);
  log.event('resolver.sql_complete', { resolver: 'readinessNextMoves', view: 'v_features_all', row_count: rows.length, took_ms: Date.now() - start });

  if (!rows.length) {
    return { answer: 'No feature data available for recommendations.', chips:[{kind:"evidence", text:"v_features_all"}], hits:[] };
  }

  // Analyze gaps and suggest improvements
  const parts: string[] = [];
  parts.push(`**Recommended Next Moves** (Strategic priorities)\n`);

  // Check SAT
  const satFeature = rows.find(r => r.feature_key === 'sat_composite');
  if (satFeature && satFeature.feature_value < 1500) {
    parts.push(`\n1. **Test Prep**: Current SAT ${satFeature.feature_value} → Target 1500+ for top schools`);
  }

  // Check Awards
  const nationalAwards = rows.find(r => r.feature_key === 'national_awards_count');
  if (!nationalAwards || nationalAwards.feature_value < 2) {
    parts.push(`\n2. **Pursue National Awards**: ${nationalAwards?.feature_value || 0} current → Target 2-3 national recognitions`);
  }

  // Check Leadership
  const leadership = rows.find(r => r.feature_key === 'leadership_roles_count');
  if (!leadership || leadership.feature_value < 3) {
    parts.push(`\n3. **Build Leadership**: ${leadership?.feature_value || 0} roles → Aim for 3+ significant leadership positions`);
  }

  // Check Programs
  const programs = rows.find(r => r.feature_key === 'acceptances_count');
  if (!programs || programs.feature_value < 2) {
    parts.push(`\n4. **Competitive Programs**: ${programs?.feature_value || 0} acceptances → Apply to 2-3 selective summer programs`);
  }

  parts.push(`\n*These recommendations are based on your current profile features and typical Ivy+ benchmarks.*`);

  return { answer: parts.join('\n'), chips:[{kind:"evidence", text:"v_features_all"}], hits: rows };
}

// ============================================================================
// v3.9 Universal Readiness Intelligence Resolvers
// ============================================================================

// v3.9.1: Helper for safe number conversion from SQL
function num(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * readinessWeakspots - Identify top weak spots (largest gaps)
 * Query: "what's my top weak spot?", "what's dragging my IvyReady score down?"
 */
export async function readinessWeakspots(pg: Pool, studentId: string, limit: number = 5) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessWeakspots', student_id: studentId, limit });

  const { rows } = await pg.query(`
    SELECT
      student_id,
      domain,
      feature_key,
      current_value,
      target_value,
      gap_raw,
      impact_coefficient,
      gap_weighted,
      gap_rank
    FROM v_readiness_weakspots
    WHERE student_id = $1
    ORDER BY gap_rank ASC
    LIMIT $2
  `, [studentId, limit]);

  log.event('resolver.sql_complete', {
    resolver: 'readinessWeakspots',
    view: 'v_readiness_weakspots',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  if (!rows.length) {
    return {
      answer: "No weakspots identified. You're at benchmarks across tracked features.",
      chips: [{kind: "evidence", text: "v_readiness_weakspots"}],
      hits: []
    };
  }

  const parts: string[] = ["**Top Weak Spots** (now)\n"];

  rows.forEach((r, i) => {
    const emoji = i === 0 ? "1️⃣" : i === 1 ? "2️⃣" : i === 2 ? "3️⃣" : `${i+1}.`;
    const domainLabel = r.domain.toUpperCase();
    parts.push(`${emoji} **${domainLabel}** → ${r.feature_key}`);
    parts.push(`   • Current ${num(r.current_value)} vs target ${num(r.target_value)} • Weighted gap ${num(r.gap_weighted).toFixed(2)}\n`);
  });

  return {
    answer: parts.join('\n'),
    chips: [
      {kind: "evidence", text: "v_readiness_weakspots"},
      {kind: "notice", text: `top_${rows.length}_gaps`}
    ],
    hits: rows
  };
}

/**
 * readinessBoostMax - Find the single highest-impact improvement
 * Query: "which one thing can give me the biggest boost?"
 */
export async function readinessBoostMax(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessBoostMax', student_id: studentId });

  const { rows } = await pg.query(`
    SELECT
      domain,
      feature_key,
      current_value,
      target_value,
      gap_raw,
      gap_weighted,
      recommended_action,
      recommended_window,
      estimated_lift
    FROM v_readiness_top_priorities
    WHERE student_id = $1
    ORDER BY gap_weighted DESC
    LIMIT 1
  `, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'readinessBoostMax',
    view: 'v_readiness_top_priorities',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  if (!rows.length) {
    return {
      answer: "No high-impact boosts found. You're already at or above targets.",
      chips: [{kind: "evidence", text: "v_readiness_top_priorities"}],
      hits: []
    };
  }

  const r = rows[0];
  const domainLabel = r.domain.toUpperCase();

  const answer = `**Highest-Impact Boost**
• Domain: ${domainLabel}
• Feature: ${r.feature_key}
• Gap to Target: ${num(r.gap_raw).toFixed(2)} (weighted ${num(r.gap_weighted).toFixed(2)})
• Why: ${r.recommended_action}
• Time Window: ${r.recommended_window}
• Estimated Lift: +${num(r.estimated_lift).toFixed(1)} IvyReady points

Tip: say "simulate it" (e.g., "what if I win a national award?" or "what if I raise my SAT to 1560?").`;

  return {
    answer,
    chips: [
      {kind: "evidence", text: "v_readiness_top_priorities"},
      {kind: "context", text: domainLabel},
      {kind: "notice", text: `lift_+${num(r.estimated_lift).toFixed(1)}`}
    ],
    hits: rows
  };
}

/**
 * readinessBoostPlan - Get full action plan to fix weakspots
 * Query: "how do I fix my weak spots?", "what should I prioritize this month?"
 */
export async function readinessBoostPlan(pg: Pool, studentId: string, limit: number = 5) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessBoostPlan', student_id: studentId, limit });

  const { rows } = await pg.query(`
    SELECT
      domain,
      feature_key,
      current_value,
      target_value,
      gap_raw,
      gap_weighted,
      recommended_action,
      recommended_window,
      estimated_lift
    FROM v_readiness_top_priorities
    WHERE student_id = $1
    ORDER BY gap_weighted DESC
    LIMIT $2
  `, [studentId, limit]);

  log.event('resolver.sql_complete', {
    resolver: 'readinessBoostPlan',
    view: 'v_readiness_top_priorities',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  if (!rows.length) {
    return {
      answer: "No action plan needed. Your profile is well-optimized!",
      chips: [{kind: "evidence", text: "v_readiness_top_priorities"}],
      hits: []
    };
  }

  const parts: string[] = ["**Action Plan (Strategic Priorities)**\n"];
  const totalLift = rows.reduce((sum, r) => sum + num(r.estimated_lift), 0);

  rows.forEach((r, i) => {
    const domainLabel = r.domain.charAt(0).toUpperCase() + r.domain.slice(1);
    parts.push(`**${i + 1}. ${domainLabel}** → ${r.feature_key}`);
    parts.push(`   • Gap: ${num(r.current_value).toFixed(2)} → ${num(r.target_value).toFixed(2)} (weighted gap ${num(r.gap_weighted).toFixed(2)})`);
    parts.push(`   • Action: ${r.recommended_action}`);
    parts.push(`   • Window: ${r.recommended_window}`);
    parts.push(`   • Estimated Lift: +${num(r.estimated_lift).toFixed(1)} points\n`);
  });

  parts.push(`**Total Potential Lift**: +${totalLift.toFixed(1)} IvyReady points if completed within 3 months.`);

  return {
    answer: parts.join('\n'),
    chips: [
      {kind: "evidence", text: "v_readiness_top_priorities"},
      {kind: "notice", text: `${rows.length}_priorities`},
      {kind: "context", text: `lift_+${totalLift.toFixed(1)}`}
    ],
    hits: rows
  };
}

/**
 * readinessProgression - Track readiness improvement over time
 * Query: "how has my readiness improved?", "track my growth"
 */
export async function readinessProgression(pg: Pool, studentId: string, limit: number = 5) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'readinessProgression', student_id: studentId, limit });

  const { rows } = await pg.query(`
    SELECT
      snapshot_id,
      snapshot_name,
      ivy_ready_score,
      features_json,
      created_at
    FROM readiness_snapshots
    WHERE student_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [studentId, limit]);

  log.event('resolver.sql_complete', {
    resolver: 'readinessProgression',
    table: 'readiness_snapshots',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  if (!rows.length) {
    return {
      answer: "No readiness snapshots available yet. Check back after your first snapshot is created.",
      chips: [{kind: "evidence", text: "readiness_snapshots"}],
      hits: []
    };
  }

  const parts: string[] = ["**Readiness Progression**\n"];

  rows.forEach((r, i) => {
    const scoreChange = i < rows.length - 1
      ? r.ivy_ready_score - rows[i + 1].ivy_ready_score
      : 0;
    const changeIcon = scoreChange > 0 ? "📈" : scoreChange < 0 ? "📉" : "➡️";

    parts.push(`${changeIcon} **${r.snapshot_name}**: ${r.ivy_ready_score} points${scoreChange !== 0 ? ` (${scoreChange > 0 ? '+' : ''}${scoreChange.toFixed(1)})` : ''}`);

    if (r.features_json && r.features_json.top_drivers) {
      const drivers = Object.entries(r.features_json.top_drivers)
        .slice(0, 2)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      parts.push(`   • Top drivers: ${drivers}`);
    }
  });

  const totalChange = rows.length > 1
    ? rows[0].ivy_ready_score - rows[rows.length - 1].ivy_ready_score
    : 0;

  if (totalChange !== 0) {
    parts.push(`\n**Total Change**: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)} points`);
  }

  return {
    answer: parts.join('\n'),
    chips: [
      {kind: "evidence", text: "readiness_snapshots"},
      {kind: "notice", text: `${rows.length}_snapshots`}
    ],
    hits: rows
  };
}

// ============================================================================
// College & Scholarship Resolvers (v4.6.1)
// ============================================================================

export async function collegeList(pg: Pool, studentId: string, filters: any = {}, userMessage = '') {
  const start = Date.now();
  console.log('[RESOLVER:collegeList] 🎯 Called with:', { studentId, filters, userMessage: userMessage.substring(0, 80) });
  log.event('resolver.sql_start', { resolver: 'collegeList', student_id: studentId, filters });

  const whereClauses = ['student_id = $1'];
  const params: any[] = [studentId];
  let paramIndex = 2;

  if (filters.decision_result) {
    whereClauses.push(`decision_result = $${paramIndex}`);
    params.push(filters.decision_result);
    paramIndex++;
  }

  if (filters.category) {
    whereClauses.push(`bucket_category = $${paramIndex}`);
    params.push(filters.category);
    paramIndex++;
  }

  if (filters.attending !== undefined) {
    whereClauses.push(`attending = $${paramIndex}`);
    params.push(filters.attending);
    paramIndex++;
  }

  // v4.6.2c: Hard safety - if user mentions deciding/attending but filters are still empty
  const decidedOrAttendingMention = /\b(attending|going to|decided to go|decided on|final decision|final choice|matriculat|enroll|chose)\b/i;
  if (userMessage && decidedOrAttendingMention.test(userMessage) && !whereClauses.some(w => /attending =/.test(w))) {
    whereClauses.push(`attending = $${paramIndex}`);
    params.push(true);
    paramIndex++;
    log.event('resolver.safety_check', {
      resolver: 'collegeList',
      action: 'forced_attending_filter',
      reason: 'detected attending/decided keywords but no filter present'
    });
  }

  const whereClause = whereClauses.join(' AND ');
  const query = `
    SELECT college_name, bucket_category, decision_result, decision_plan,
           program, location, acceptance_rate, attending
    FROM college_list
    WHERE ${whereClause}
    ORDER BY
      CASE bucket_category
        WHEN 'Reach' THEN 1
        WHEN 'Match' THEN 2
        WHEN 'Safety' THEN 3
        ELSE 4
      END,
      college_name
  `;

  console.log('[RESOLVER:collegeList] → Executing SQL:', query.trim().substring(0, 150).replace(/\s+/g, ' '));
  console.log('[RESOLVER:collegeList] → With params:', params);
  const { rows } = await pg.query(query, params);
  console.log('[RESOLVER:collegeList] ✓ Query returned', rows.length, 'rows');
  if (rows.length > 0) {
    console.log('[RESOLVER:collegeList] → Sample colleges:', rows.slice(0, 3).map(r => r.college_name));
  }

  log.event('resolver.sql_complete', {
    resolver: 'collegeList',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  if (!rows.length) {
    const filterDesc = filters.decision_result
      ? ` with decision result "${filters.decision_result}"`
      : '';
    const categoryDesc = filters.category
      ? ` in the "${filters.category}" category`
      : '';
    return {
      answer: `No colleges found${categoryDesc}${filterDesc}.`,
      chips: [{kind: "evidence", text: "college_list"}],
      hits: []
    };
  }

  const parts: string[] = [];

  // v4.6.2b: Answer shaping for attending-only queries
  const showOnlyAttending = filters.attending === true;
  if (showOnlyAttending) {
    const attending = rows.filter(r => r.attending);
    if (attending.length === 0) {
      return {
        answer: 'No attending college found.',
        chips: [{kind: "evidence", text: "college_list"}],
        hits: []
      };
    }
    parts.push(`**Attending (${attending.length})**`);
    attending.forEach((r, i) => {
      const programInfo = r.program ? ` — ${r.program}` : '';
      parts.push(`${i + 1}. ${r.college_name}${programInfo} 🎓`);
    });
    return {
      answer: parts.join('\n'),
      chips: [
        {kind: "evidence", text: "college_list"},
        {kind: "notice", text: `attending`}
      ],
      hits: attending
    };
  }

  // Group by decision result if no filter applied
  if (!filters.decision_result) {
    const accepted = rows.filter(r => r.decision_result === 'Accepted');
    const waitlisted = rows.filter(r => r.decision_result === 'Waitlisted');
    const rejected = rows.filter(r => r.decision_result === 'Rejected');
    const pending = rows.filter(r => r.decision_result === 'Pending');

    if (accepted.length > 0) {
      parts.push(`**Accepted (${accepted.length})**`);
      accepted.forEach((r, i) => {
        const programInfo = r.program ? ` — ${r.program}` : '';
        const attendingMark = r.attending ? ' 🎓 (Attending)' : '';
        parts.push(`${i + 1}. ${r.college_name}${programInfo}${attendingMark}`);
      });
    }

    if (waitlisted.length > 0) {
      parts.push(`\n**Waitlisted (${waitlisted.length})**`);
      waitlisted.forEach((r, i) => {
        const programInfo = r.program ? ` — ${r.program}` : '';
        parts.push(`${i + 1}. ${r.college_name}${programInfo}`);
      });
    }

    if (rejected.length > 0) {
      parts.push(`\n**Rejected (${rejected.length})**`);
      rejected.forEach((r, i) => {
        parts.push(`${i + 1}. ${r.college_name}`);
      });
    }

    if (pending.length > 0) {
      parts.push(`\n**Pending (${pending.length})**`);
      pending.forEach((r, i) => {
        parts.push(`${i + 1}. ${r.college_name}`);
      });
    }
  } else {
    // Single filtered result
    const filterTitle = filters.category
      ? `${filters.category} Schools - ${filters.decision_result}`
      : filters.decision_result;
    parts.push(`**${filterTitle} (${rows.length})**`);
    rows.forEach((r, i) => {
      const programInfo = r.program ? ` — ${r.program}` : '';
      const categoryInfo = !filters.category ? ` [${r.bucket_category}]` : '';
      parts.push(`${i + 1}. ${r.college_name}${programInfo}${categoryInfo}`);
    });
  }

  return {
    answer: parts.join('\n'),
    chips: [
      {kind: "evidence", text: "college_list"},
      {kind: "notice", text: `${rows.length}_colleges`}
    ],
    hits: rows
  };
}

export async function scholarshipList(pg: Pool, studentId: string, filters: any = {}) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'scholarshipList', student_id: studentId, filters });

  const whereClauses = ['student_id = $1'];
  const params: any[] = [studentId];
  let paramIndex = 2;

  if (filters.application_status) {
    whereClauses.push(`application_status = $${paramIndex}`);
    params.push(filters.application_status);
    paramIndex++;
  }

  const whereClause = whereClauses.join(' AND ');
  const query = `
    SELECT scholarship_name, sponsor_org, amount_usd, application_status, decision_date
    FROM scholarships
    WHERE ${whereClause}
    ORDER BY
      CASE application_status
        WHEN 'Accepted' THEN 1
        WHEN 'Applied' THEN 2
        WHEN 'Rejected' THEN 3
        ELSE 4
      END,
      amount_usd DESC NULLS LAST,
      scholarship_name
  `;

  const { rows } = await pg.query(query, params);

  log.event('resolver.sql_complete', {
    resolver: 'scholarshipList',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  if (!rows.length) {
    const filterDesc = filters.application_status
      ? ` with status "${filters.application_status}"`
      : '';
    return {
      answer: `No scholarships found${filterDesc}.`,
      chips: [{kind: "evidence", text: "scholarships"}],
      hits: []
    };
  }

  const parts: string[] = [];

  if (!filters.application_status) {
    // Group by status
    const accepted = rows.filter(r => r.application_status === 'Accepted');
    const applied = rows.filter(r => r.application_status === 'Applied');
    const rejected = rows.filter(r => r.application_status === 'Rejected');

    if (accepted.length > 0) {
      parts.push(`**Accepted (${accepted.length})**`);
      accepted.forEach((r, i) => {
        const amount = r.amount_usd ? ` — $${r.amount_usd.toLocaleString()}` : '';
        const org = r.sponsor_org ? ` (${r.sponsor_org})` : '';
        parts.push(`${i + 1}. ${r.scholarship_name}${org}${amount}`);
      });
    }

    if (applied.length > 0) {
      parts.push(`\n**Applied (${applied.length})**`);
      applied.forEach((r, i) => {
        const amount = r.amount_usd ? ` — $${r.amount_usd.toLocaleString()}` : '';
        const org = r.sponsor_org ? ` (${r.sponsor_org})` : '';
        parts.push(`${i + 1}. ${r.scholarship_name}${org}${amount}`);
      });
    }

    if (rejected.length > 0) {
      parts.push(`\n**Rejected (${rejected.length})**`);
      rejected.forEach((r, i) => {
        const org = r.sponsor_org ? ` (${r.sponsor_org})` : '';
        parts.push(`${i + 1}. ${r.scholarship_name}${org}`);
      });
    }
  } else {
    // Single filtered result
    parts.push(`**${filters.application_status} Scholarships (${rows.length})**`);
    rows.forEach((r, i) => {
      const amount = r.amount_usd ? ` — $${r.amount_usd.toLocaleString()}` : '';
      const org = r.sponsor_org ? ` (${r.sponsor_org})` : '';
      parts.push(`${i + 1}. ${r.scholarship_name}${org}${amount}`);
    });
  }

  return {
    answer: parts.join('\n'),
    chips: [
      {kind: "evidence", text: "scholarships"},
      {kind: "notice", text: `${rows.length}_scholarships`}
    ],
    hits: rows
  };
}

export async function scholarshipTotal(pg: Pool, studentId: string, filters: any = {}) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'scholarshipTotal', student_id: studentId, filters });

  const whereClauses = ['student_id = $1', 'amount_usd IS NOT NULL'];
  const params: any[] = [studentId];
  let paramIndex = 2;

  if (filters.application_status) {
    whereClauses.push(`application_status = $${paramIndex}`);
    params.push(filters.application_status);
    paramIndex++;
  }

  const whereClause = whereClauses.join(' AND ');
  const query = `
    SELECT
      SUM(amount_usd) AS total_amount,
      COUNT(*) AS count
    FROM scholarships
    WHERE ${whereClause}
  `;

  const { rows } = await pg.query(query, params);

  log.event('resolver.sql_complete', {
    resolver: 'scholarshipTotal',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  const total = rows[0]?.total_amount || 0;
  const count = rows[0]?.count || 0;

  if (total === 0) {
    const filterDesc = filters.application_status
      ? ` with status "${filters.application_status}"`
      : '';
    return {
      answer: `No scholarship amounts found${filterDesc}.`,
      chips: [{kind: "evidence", text: "scholarships"}],
      hits: []
    };
  }

  const statusDesc = filters.application_status
    ? ` (${filters.application_status})`
    : '';
  const answer = `**Total Scholarship Amount${statusDesc}**: $${total.toLocaleString()}\n\nFrom ${count} scholarship${count !== 1 ? 's' : ''}`;

  return {
    answer,
    chips: [
      {kind: "evidence", text: "scholarships"},
      {kind: "notice", text: `$${total.toLocaleString()}`}
    ],
    hits: rows
  };
}

export async function collegeCompareReadiness(pg: Pool, studentId: string) {
  const start = Date.now();
  log.event('resolver.sql_start', { resolver: 'collegeCompareReadiness', student_id: studentId });

  const query = `
    SELECT
      college_name,
      bucket_category,
      decision_result,
      acceptance_rate,
      ivyready_score_at_submit
    FROM college_list
    WHERE student_id = $1
      AND decision_result IN ('Accepted', 'Waitlisted', 'Rejected')
    ORDER BY
      CASE decision_result
        WHEN 'Accepted' THEN 1
        WHEN 'Waitlisted' THEN 2
        WHEN 'Rejected' THEN 3
      END,
      acceptance_rate ASC NULLS LAST
  `;

  const { rows } = await pg.query(query, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'collegeCompareReadiness',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  if (!rows.length) {
    return {
      answer: 'No college outcomes found to compare with readiness scores.',
      chips: [{kind: "evidence", text: "college_list"}],
      hits: []
    };
  }

  const parts: string[] = [];
  const accepted = rows.filter(r => r.decision_result === 'Accepted');
  const waitlisted = rows.filter(r => r.decision_result === 'Waitlisted');
  const rejected = rows.filter(r => r.decision_result === 'Rejected');

  if (accepted.length > 0) {
    parts.push(`**Accepted Schools (${accepted.length})**`);
    const avgAcceptRate = accepted.reduce((sum, r) => sum + (r.acceptance_rate || 0), 0) / accepted.length;
    parts.push(`Average acceptance rate: ${avgAcceptRate.toFixed(1)}%`);
    accepted.slice(0, 5).forEach((r, i) => {
      const rate = r.acceptance_rate ? ` (${r.acceptance_rate}% acceptance rate)` : '';
      parts.push(`${i + 1}. ${r.college_name}${rate}`);
    });
  }

  if (waitlisted.length > 0) {
    parts.push(`\n**Waitlisted (${waitlisted.length})**`);
    const avgAcceptRate = waitlisted.reduce((sum, r) => sum + (r.acceptance_rate || 0), 0) / waitlisted.length;
    parts.push(`Average acceptance rate: ${avgAcceptRate.toFixed(1)}%`);
  }

  if (rejected.length > 0) {
    parts.push(`\n**Rejected (${rejected.length})**`);
    const avgAcceptRate = rejected.reduce((sum, r) => sum + (r.acceptance_rate || 0), 0) / rejected.length;
    parts.push(`Average acceptance rate: ${avgAcceptRate.toFixed(1)}%`);
  }

  const ivyReadyScore = rows[0]?.ivyready_score_at_submit;
  if (ivyReadyScore) {
    parts.push(`\n**Your IvyReady Score at Submission**: ${ivyReadyScore}`);
  }

  return {
    answer: parts.join('\n'),
    chips: [
      {kind: "evidence", text: "college_list"},
      {kind: "notice", text: `${rows.length}_colleges`}
    ],
    hits: rows
  };
}


// ============================================================================
// v10.7: EC VITALS WRAPPER FUNCTIONS
// ============================================================================

export async function vitalsLatest(pg: Pool, studentId: string) {
  const rows = await vitals.latest(pg, studentId);
  if (!rows.length) {
    return { answer: "No EC vitals data found.", chips: [{kind: "evidence", text: "v_ec_vitals_latest"}], hits: [] };
  }
  const list = rows.map((r, i) =>
    `${i+1}. ${r.activity_name} - ${r.metric_name}: ${r.numeric_value || r.text_value}${r.unit ? ` ${r.unit}` : ""}`
  ).join("\n");
  return { answer: list, chips: [{kind: "evidence", text: "v_ec_vitals_latest"}], hits: rows };
}

export async function vitalsProgression(pg: Pool, studentId: string) {
  const rows = await vitals.progression(pg, studentId);
  if (!rows.length) {
    return { answer: "No vitals progression data found.", chips: [{kind: "evidence", text: "v_ec_vitals_progression"}], hits: [] };
  }
  return { answer: `Found ${rows.length} vitals progression records.`, chips: [{kind: "evidence", text: "v_ec_vitals_progression"}], hits: rows };
}

export async function vitalsFundingProgression(pg: Pool, studentId: string) {
  const rows = await vitals.fundingProgression(pg, studentId);
  if (!rows.length) {
    return { answer: "No funding progression data found.", chips: [{kind: "evidence", text: "v_ec_vitals_progression"}], hits: [] };
  }
  return { answer: `Found ${rows.length} funding progression records.`, chips: [{kind: "evidence", text: "v_ec_vitals_progression"}], hits: rows };
}

export async function vitalsScaleProgression(pg: Pool, studentId: string) {
  const rows = await vitals.scaleProgression(pg, studentId);
  if (!rows.length) {
    return { answer: "No scale progression data found.", chips: [{kind: "evidence", text: "v_ec_vitals_progression"}], hits: [] };
  }
  return { answer: `Found ${rows.length} scale progression records.`, chips: [{kind: "evidence", text: "v_ec_vitals_progression"}], hits: rows };
}

export async function vitalsImpactLatest(pg: Pool, studentId: string) {
  const rows = await vitals.impactMetrics(pg, studentId);
  if (!rows.length) {
    return { answer: "No impact metrics found.", chips: [{kind: "evidence", text: "v_ec_vitals_latest"}], hits: [] };
  }
  return { answer: `Found ${rows.length} impact metrics.`, chips: [{kind: "evidence", text: "v_ec_vitals_latest"}], hits: rows };
}

export async function vitalsSummary(pg: Pool, studentId: string) {
  const summary = await vitals.summary(pg, studentId);
  if (!summary) {
    return { answer: "No vitals summary available.", chips: [{kind: "evidence", text: "ec_vitals"}], hits: [] };
  }
  return { answer: `EC Vitals Summary: ${summary.total_activities} activities, ${summary.total_metrics} metrics tracked.`, chips: [{kind: "evidence", text: "ec_vitals"}], hits: [summary] };
}

// ============================================================================
// v10.7: JTBD WRAPPER FUNCTIONS
// ============================================================================

export async function jtbdWeek(pg: Pool, studentId: string, weekNumber: number | null) {
  if (!weekNumber) {
    return { answer: "Please specify a week number (e.g., 'week 3').", chips: [], hits: [] };
  }
  const row = await jtbd.byWeek(pg, studentId, weekNumber);
  if (!row) {
    return { answer: `No jobs found for week ${weekNumber}.`, chips: [{kind: "evidence", text: "v_jtbd_weekly_by_week"}], hits: [] };
  }
  const answer = `Week ${weekNumber}: ${row.completed_jobs}/${row.total_jobs} jobs completed`;
  return { answer, chips: [{kind: "evidence", text: "v_jtbd_weekly_by_week"}], hits: [row] };
}

export async function jtbdCompleted(pg: Pool, studentId: string) {
  const rows = await jtbd.completed(pg, studentId);
  if (!rows.length) {
    return { answer: "No completed jobs found.", chips: [{kind: "evidence", text: "v_jtbd_weekly_completed"}], hits: [] };
  }
  return { answer: `${rows.length} jobs completed.`, chips: [{kind: "evidence", text: "v_jtbd_weekly_completed"}], hits: rows };
}

export async function jtbdPending(pg: Pool, studentId: string) {
  const rows = await jtbd.pending(pg, studentId);
  if (!rows.length) {
    return { answer: "No pending jobs found.", chips: [{kind: "evidence", text: "v_jtbd_weekly_pending"}], hits: [] };
  }
  return { answer: `${rows.length} jobs pending.`, chips: [{kind: "evidence", text: "v_jtbd_weekly_pending"}], hits: rows };
}

export async function jtbdMilestones(pg: Pool, studentId: string) {
  const rows = await jtbd.milestones(pg, studentId);
  if (!rows.length) {
    return { answer: "No EC milestones found.", chips: [{kind: "evidence", text: "v_jtbd_weekly_milestones"}], hits: [] };
  }
  return { answer: `${rows.length} EC milestones completed.`, chips: [{kind: "evidence", text: "v_jtbd_weekly_milestones"}], hits: rows };
}

export async function jtbdProgression(pg: Pool, studentId: string) {
  const rows = await jtbd.progression(pg, studentId);
  if (!rows.length) {
    return { answer: "No progression data found.", chips: [{kind: "evidence", text: "v_jtbd_weekly_progression"}], hits: [] };
  }
  return { answer: `Found ${rows.length} weeks of execution data.`, chips: [{kind: "evidence", text: "v_jtbd_weekly_progression"}], hits: rows };
}

// ============================================================================
// v13.1: JOURNEY TIMELINE (Temporal View of JTBD Data)
// ============================================================================
// ADDITIVE ENHANCEMENT: Uses existing jtbdCompleted() resolver, adds formatted timeline

export async function journeyTimeline(pg: Pool, studentId: string) {
  const start = Date.now();
  console.log('[RESOLVER:journeyTimeline] 🗓️  Called with:', { studentId });

  try {
    // Reuse existing jtbdCompleted() resolver (follows guardrail: don't break foundation)
    const rows = await jtbd.completed(pg, studentId);

    if (!rows.length) {
      return {
        answer: "No completed milestones found in your journey timeline.",
        chips: [{kind: "evidence", text: "v_jtbd_weekly_completed"}],
        hits: []
      };
    }

    // Group by month/year for timeline presentation
    const timeline: Record<string, any[]> = {};

    rows.forEach((job: any) => {
      if (!job.completion_date) return;

      const date = new Date(job.completion_date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!timeline[monthYear]) {
        timeline[monthYear] = [];
      }

      timeline[monthYear].push({
        date: job.completion_date,
        week: job.week_number,
        type: job.job_type,
        description: job.job_description,
        outcome_metric: job.outcome_metric,
        outcome_value: job.outcome_value,
        outcome_unit: job.outcome_unit
      });
    });

    // Format timeline answer
    const parts: string[] = [];
    parts.push(`### Your Application Journey Timeline`);
    parts.push(`**Total Milestones:** ${rows.length} completed across ${Object.keys(timeline).length} months\n`);

    // Sort months chronologically
    const sortedMonths = Object.keys(timeline).sort();

    sortedMonths.forEach((monthYear, idx) => {
      const [year, month] = monthYear.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('default', { month: 'long' });
      const jobs = timeline[monthYear];

      parts.push(`**${monthName} ${year}** (${jobs.length} milestone${jobs.length > 1 ? 's' : ''})`);

      jobs.forEach((job: any) => {
        const dateStr = new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        let line = `  • ${dateStr}: ${job.description}`;

        // Add outcome if available
        if (job.outcome_metric && job.outcome_value) {
          line += ` (${job.outcome_metric}: ${job.outcome_value}${job.outcome_unit ? ' ' + job.outcome_unit : ''})`;
        }

        parts.push(line);
      });

      if (idx < sortedMonths.length - 1) {
        parts.push(''); // Blank line between months
      }
    });

    const answer = parts.join('\n');

    console.log(`[RESOLVER:journeyTimeline] ✅ Success in ${Date.now() - start}ms, ${rows.length} milestones`);

    return {
      answer,
      chips: [{kind: "evidence", text: "v_jtbd_weekly_completed"}],
      hits: rows
    };

  } catch (error) {
    console.error('[RESOLVER:journeyTimeline] ❌ Error:', error);
    return {
      answer: "Unable to retrieve journey timeline.",
      chips: [],
      hits: []
    };
  }
}

// ============================================================================
// v10.7: COLLEGE ENHANCED WRAPPER FUNCTIONS
// ============================================================================
// UNIVERSAL FIX v10.7.1: Use existing resolver infrastructure + correct schema

export async function collegeAttending(pg: Pool, studentId: string) {
  // ✅ Use existing collegeList.attending() resolver (uses correct 'attending' boolean column)
  const { collegeList } = await import('../resolvers/college.js');
  const row = await collegeList.attending(pg, studentId);
  if (!row) {
    return { answer: "No college attendance decision found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  return { answer: `Attending: ${row.college_name}`, chips: [{kind: "evidence", text: "college_list"}], hits: [row] };
}

export async function collegeAccepted(pg: Pool, studentId: string) {
  // ✅ Use existing collegeList.accepted() resolver (uses correct 'decision_result' column)
  const { collegeList } = await import('../resolvers/college.js');
  const rows = await collegeList.accepted(pg, studentId);
  if (!rows.length) {
    return { answer: "No acceptance decisions found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  return { answer: `Accepted to ${rows.length} colleges.`, chips: [{kind: "evidence", text: "college_list"}], hits: rows };
}

// Alias for v1.0 agents
export const collegeAcceptances = collegeAccepted;

export async function collegeEarlyDecision(pg: Pool, studentId: string) {
  // ✅ Use existing collegeList.byDecisionPlan() resolver
  const { collegeList } = await import('../resolvers/college.js');
  const rows = await collegeList.byDecisionPlan(pg, studentId, 'Early Decision');
  if (!rows.length) {
    return { answer: "No Early Decision applications found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  const list = rows.map(r => `- ${r.college_name} (${r.bucket_category})${r.decision_result ? ' - ' + r.decision_result : ''}`).join('\n');
  return { answer: `Applied Early Decision to ${rows.length} college${rows.length > 1 ? 's' : ''}:\n${list}`, chips: [{kind: "evidence", text: "college_list"}], hits: rows };
}

export async function collegeEarlyAction(pg: Pool, studentId: string) {
  // ✅ Use existing collegeList.byDecisionPlan() resolver
  const { collegeList } = await import('../resolvers/college.js');
  const rows = await collegeList.byDecisionPlan(pg, studentId, 'Early Action');
  if (!rows.length) {
    return { answer: "No Early Action applications found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  const list = rows.map(r => `- ${r.college_name} (${r.bucket_category})${r.decision_result ? ' - ' + r.decision_result : ''}`).join('\n');
  return { answer: `Applied Early Action to ${rows.length} college${rows.length > 1 ? 's' : ''}:\n${list}`, chips: [{kind: "evidence", text: "college_list"}], hits: rows };
}

export async function collegeRestrictiveEarlyAction(pg: Pool, studentId: string) {
  // ✅ Use existing collegeList.byDecisionPlan() resolver
  const { collegeList } = await import('../resolvers/college.js');
  const rows = await collegeList.byDecisionPlan(pg, studentId, 'Restrictive Early Action');
  if (!rows.length) {
    return { answer: "No Restrictive Early Action applications found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  const list = rows.map(r => `- ${r.college_name} (${r.bucket_category})${r.decision_result ? ' - ' + r.decision_result : ''}`).join('\n');
  return { answer: `Applied Restrictive Early Action to ${rows.length} college${rows.length > 1 ? 's' : ''}:\n${list}`, chips: [{kind: "evidence", text: "college_list"}], hits: rows };
}

export async function collegeRegularDecision(pg: Pool, studentId: string) {
  // ✅ Use existing collegeList.byDecisionPlan() resolver
  const { collegeList } = await import('../resolvers/college.js');
  const rows = await collegeList.byDecisionPlan(pg, studentId, 'Regular Decision');
  if (!rows.length) {
    return { answer: "No Regular Decision applications found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  const list = rows.map(r => `- ${r.college_name} (${r.bucket_category})${r.decision_result ? ' - ' + r.decision_result : ''}`).join('\n');
  return { answer: `Applied Regular Decision to ${rows.length} college${rows.length > 1 ? 's' : ''}:\n${list}`, chips: [{kind: "evidence", text: "college_list"}], hits: rows };
}

// ============================================================================
// ECS - BY ROLE (v10.7.1 - Universal attribute filtering)
// ============================================================================

export async function ecsLeadership(pg: Pool, studentId: string) {
  // ✅ Use existing ecs.byRolePattern() resolver with "leader" pattern
  const { ecs } = await import('../resolvers/enums.js');
  const rows = await ecs.byRolePattern(pg, studentId, 'leader', 'final');
  if (!rows.length) {
    return { answer: "No leadership roles found in final activities.", chips: [{kind: "evidence", text: "v_ecs_final"}], hits: [] };
  }
  const list = rows.map(r => `- ${r.activity_name}: ${r.role || 'N/A'} (${r.category})`).join('\n');
  return { answer: `Leadership roles (${rows.length}):\n${list}`, chips: [{kind: "evidence", text: "v_ecs_final"}], hits: rows };
}

export async function ecsByRole(pg: Pool, studentId: string, role: string) {
  // ✅ Use existing ecs.byRolePattern() resolver with custom role pattern
  const { ecs } = await import('../resolvers/enums.js');
  const rows = await ecs.byRolePattern(pg, studentId, role, 'final');
  if (!rows.length) {
    return { answer: `No activities found with role matching "${role}".`, chips: [{kind: "evidence", text: "v_ecs_final"}], hits: [] };
  }
  const list = rows.map(r => `- ${r.activity_name}: ${r.role || 'N/A'} (${r.category})`).join('\n');
  return { answer: `Activities with "${role}" role (${rows.length}):\n${list}`, chips: [{kind: "evidence", text: "v_ecs_final"}], hits: rows };
}

export async function collegeReach(pg: Pool, studentId: string) {
  // ✅ FIXED: Use correct column 'bucket_category' (not 'tier')
  const { rows } = await pg.query(
    `SELECT * FROM college_list WHERE student_id = $1 AND bucket_category = 'Reach' ORDER BY college_name`,
    [studentId]
  );
  if (!rows.length) {
    return { answer: "No reach schools found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  return { answer: `${rows.length} reach schools in list.`, chips: [{kind: "evidence", text: "college_list"}], hits: rows };
}

export async function collegeMatch(pg: Pool, studentId: string) {
  // ✅ FIXED: Use correct column 'bucket_category' (not 'tier')
  const { rows } = await pg.query(
    `SELECT * FROM college_list WHERE student_id = $1 AND bucket_category = 'Match' ORDER BY college_name`,
    [studentId]
  );
  if (!rows.length) {
    return { answer: "No match schools found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  return { answer: `${rows.length} match schools in list.`, chips: [{kind: "evidence", text: "college_list"}], hits: rows };
}

export async function collegeSafety(pg: Pool, studentId: string) {
  // ✅ FIXED: Use correct column 'bucket_category' (not 'tier')
  const { rows } = await pg.query(
    `SELECT * FROM college_list WHERE student_id = $1 AND bucket_category = 'Safety' ORDER BY college_name`,
    [studentId]
  );
  if (!rows.length) {
    return { answer: "No safety schools found.", chips: [{kind: "evidence", text: "college_list"}], hits: [] };
  }
  return { answer: `${rows.length} safety schools in list.`, chips: [{kind: "evidence", text: "college_list"}], hits: rows };
}

// ============================================================================
// v10.7: READINESS ENHANCED WRAPPER FUNCTIONS
// ============================================================================
// UNIVERSAL FIX v10.7.1: Use existing resolver infrastructure + correct schema

export async function readinessTopPriorities(pg: Pool, studentId: string) {
  // ✅ Use existing readiness.topPriorities() resolver (uses correct 'v_readiness_top_priorities' view)
  const { readiness } = await import('../resolvers/readiness.js');
  const rows = await readiness.topPriorities(pg, studentId);

  if (!rows.length) {
    return { answer: "No readiness priorities found.", chips: [{kind: "evidence", text: "v_readiness_top_priorities"}], hits: [] };
  }

  // Format: feature_key + gap info + recommended action
  const list = rows.map((r, i) =>
    `${i+1}. ${r.feature_key}: ${r.recommended_action} (gap: ${Number(r.gap_weighted).toFixed(1)} pts)`
  ).join("\n");

  return { answer: list, chips: [{kind: "evidence", text: "v_readiness_top_priorities"}], hits: rows };
}

// ============================================================================
// v13.0: Comprehensive Profile Summary
// ============================================================================

/**
 * profileSummary - Complete student profile with IvyScore + Academics + Awards + ECs + Vitals
 *
 * Designed to answer: "Tell me about my entire profile", "Help me understand where I stand", etc.
 *
 * Returns comprehensive snapshot including:
 * - IvyScore/Readiness (overall + factor breakdown)
 * - Academics (GPA + SAT/ACT + Transcript)
 * - Awards (count by tier)
 * - ECs (count + leadership + key vitals)
 * - Narrative (if available)
 * - GamePlan vs Execution vs Submitted
 */
export async function profileSummary(pg: Pool, studentId: string) {
  const start = Date.now();
  console.log('[RESOLVER:profileSummary] 🎯 Called with:', { studentId });
  log.event('resolver.sql_start', { resolver: 'profileSummary', student_id: studentId });

  const parts: string[] = [];
  const chips: any[] = [];
  const allHits: any = {};

  // 1. IvyScore/Readiness (Overall + Factor Breakdown)
  try {
    const ivyScoreResult = await ivyReadyScore(pg, studentId, 'final');
    if (ivyScoreResult.hits && ivyScoreResult.hits.length > 0) {
      const score = ivyScoreResult.hits[0];
      parts.push(`### IvyScore Readiness`);
      parts.push(`**Overall Score:** ${Math.round(score.ivyready_score * 10) / 10}/100`);

      // Factor breakdown
      const factorScores = score.factor_scores || {};
      const factorKeys = Object.keys(factorScores).sort((a, b) => factorScores[b] - factorScores[a]);
      if (factorKeys.length > 0) {
        parts.push(`**Factor Breakdown:**`);
        factorKeys.forEach(factor => {
          parts.push(`  • ${factor}: ${factorScores[factor]}/100`);
        });
      }

      allHits.ivyscore = score;
      chips.push({kind: "evidence", text: "v_rubric_scores_phase_latest"});
    }
  } catch (err) {
    console.log('[RESOLVER:profileSummary] IvyScore unavailable:', err);
  }

  // 2. Academics (GPA + SAT + Transcript summary)
  try {
    // GPA
    const gpaResult = await academicsGPA(pg, studentId, 'latest', {});
    if (gpaResult.hits && gpaResult.hits.length > 0) {
      const gpa = gpaResult.hits[0];
      parts.push(`\n### Academics`);
      parts.push(`**GPA:** ${gpa.gpa_unweighted} unweighted, ${gpa.gpa_weighted} weighted`);
      allHits.gpa = gpa;
    }

    // SAT
    const satResult = await academicsSAT(pg, studentId, 'latest', {});
    if (satResult.hits && satResult.hits.length > 0) {
      const sat = satResult.hits[0];
      parts.push(`**SAT:** ${sat.sat_total} (${sat.sat_ebrw} EBRW, ${sat.sat_math} Math)`);
      allHits.sat = sat;
    }

    // Transcript summary
    const transcriptResult = await academicsTranscript(pg, studentId, 'final');
    if (transcriptResult.hits && transcriptResult.hits.length > 0) {
      const courses = transcriptResult.hits;
      const apCount = courses.filter((c: any) => c.course_level === 'AP').length;
      const honorsCount = courses.filter((c: any) => c.course_level === 'Honors').length;
      parts.push(`**Transcript:** ${courses.length} courses (${apCount} AP, ${honorsCount} Honors)`);
      allHits.transcript = courses;
    }

    chips.push({kind: "evidence", text: "academics"});
  } catch (err) {
    console.log('[RESOLVER:profileSummary] Academics unavailable:', err);
  }

  // 3. Awards (count by tier)
  try {
    const awardsResult = await awardsList(pg, studentId, 'final');
    if (awardsResult.hits && awardsResult.hits.length > 0) {
      const awards = awardsResult.hits;
      const international = awards.filter((a: any) => a.tier === 'International').length;
      const national = awards.filter((a: any) => a.tier === 'National').length;
      const regional = awards.filter((a: any) => a.tier === 'Regional').length;
      const school = awards.filter((a: any) => a.tier === 'School').length;

      parts.push(`\n### Awards`);
      parts.push(`**Total:** ${awards.length} awards`);
      if (international > 0) parts.push(`  • International: ${international}`);
      if (national > 0) parts.push(`  • National: ${national}`);
      if (regional > 0) parts.push(`  • Regional: ${regional}`);
      if (school > 0) parts.push(`  • School: ${school}`);

      allHits.awards = awards;
      chips.push({kind: "evidence", text: "v_awards_won"});
    }
  } catch (err) {
    console.log('[RESOLVER:profileSummary] Awards unavailable:', err);
  }

  // 4. ECs (count + leadership + key vitals)
  try {
    const ecsResult = await ecsList(pg, studentId, 'final');
    if (ecsResult.hits && ecsResult.hits.length > 0) {
      const ecs = ecsResult.hits;
      const leadershipRoles = ecs.filter((ec: any) =>
        ec.position_title && (
          ec.position_title.toLowerCase().includes('president') ||
          ec.position_title.toLowerCase().includes('founder') ||
          ec.position_title.toLowerCase().includes('captain') ||
          ec.position_title.toLowerCase().includes('leader')
        )
      ).length;

      parts.push(`\n### Extracurricular Activities`);
      parts.push(`**Total:** ${ecs.length} activities`);
      if (leadershipRoles > 0) parts.push(`**Leadership Positions:** ${leadershipRoles}`);

      allHits.ecs = ecs;
      chips.push({kind: "evidence", text: "v_ecs_final"});
    }

    // EC Vitals summary
    const vitalsResult = await vitalsSummary(pg, studentId);
    if (vitalsResult.hits && vitalsResult.hits.length > 0) {
      const summary = vitalsResult.hits[0];
      parts.push(`**Metrics Tracked:** ${summary.distinct_metrics} metrics across ${summary.activities_tracked} activities`);
      allHits.vitals_summary = summary;
      chips.push({kind: "evidence", text: "v_ec_vitals_summary"});
    }
  } catch (err) {
    console.log('[RESOLVER:profileSummary] ECs unavailable:', err);
  }

  // 5. Summer Programs
  try {
    const programsResult = await programsList(pg, studentId, 'final');
    if (programsResult.hits && programsResult.hits.length > 0) {
      parts.push(`\n### Summer Programs`);
      parts.push(`**Total:** ${programsResult.hits.length} programs`);
      allHits.programs = programsResult.hits;
      chips.push({kind: "evidence", text: "v_programs_final"});
    }
  } catch (err) {
    console.log('[RESOLVER:profileSummary] Programs unavailable:', err);
  }

  log.event('resolver.sql_complete', {
    resolver: 'profileSummary',
    sections_included: Object.keys(allHits).length,
    took_ms: Date.now() - start
  });

  if (parts.length === 0) {
    return {
      answer: "No profile data available.",
      chips: [{kind: "evidence", text: "profile_summary"}],
      hits: []
    };
  }

  return {
    answer: parts.join('\n'),
    chips,
    hits: [allHits]
  };
}

// ============================================================================
// v13.0: College Deadlines Resolver
// ============================================================================

/**
 * collegeDeadlines - Get application deadlines for colleges
 * Note: Currently returns placeholder data - needs college_list.deadline column
 */
export async function collegeDeadlines(pg: Pool, studentId: string, collegeName?: string) {
  const start = Date.now();
  console.log('[RESOLVER:collegeDeadlines] 🎯 Called with:', { studentId, collegeName });
  log.event('resolver.sql_start', { resolver: 'collegeDeadlines', student_id: studentId, college_name: collegeName });

  // TODO: Add deadline column to college_list table
  // For now, return standard deadlines based on decision_plan
  const query = collegeName
    ? `SELECT college_name, decision_plan FROM college_list WHERE student_id=$1 AND college_name ILIKE $2`
    : `SELECT college_name, decision_plan FROM college_list WHERE student_id=$1 ORDER BY college_name`;

  const params = collegeName ? [studentId, `%${collegeName}%`] : [studentId];
  const { rows } = await pg.query(query, params);

  log.event('resolver.sql_complete', {
    resolver: 'collegeDeadlines',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  if (!rows.length) {
    return {
      answer: collegeName
        ? `No colleges found matching "${collegeName}".`
        : "No colleges in application list.",
      chips: [{kind: "evidence", text: "college_list"}],
      hits: []
    };
  }

  // Check if we have actual deadline data in the database
  // For now, acknowledge that specific deadlines are not available
  const answer = `I don't have the specific application deadlines for your colleges stored yet. Here are the colleges on your list (${rows.length} total):\n\n` +
    rows.map((r: any, i: number) => `${i+1}. ${r.college_name} (${r.decision_plan})`).join('\n') +
    `\n\nNote: Typical deadlines are November 1 for Early Decision/Action and January 1 for Regular Decision, but please verify the exact dates for each school.`;

  return {
    answer,
    chips: [{kind: "evidence", text: "college_list"}],
    hits: rows
  };
}

// ============================================================================
// v13.0: College Comparison Resolver
// ============================================================================

/**
 * collegeComparison - Compare colleges (strategic, not factual)
 * Note: This should be strategic (CAT-2) not factual (CAT-1)
 * Returns list of colleges for strategic KB retrieval
 */
export async function collegeComparison(pg: Pool, studentId: string, collegeNames: string[]) {
  const start = Date.now();
  console.log('[RESOLVER:collegeComparison] 🎯 Called with:', { studentId, colleges: collegeNames });
  log.event('resolver.sql_start', { resolver: 'collegeComparison', student_id: studentId, college_count: collegeNames.length });

  // Return basic college data from college_list for context
  // Real comparison should happen in strategic layer (CAT-2) via KB retrieval
  const query = `SELECT * FROM college_list WHERE student_id=$1 ORDER BY college_name`;
  const { rows } = await pg.query(query, [studentId]);

  log.event('resolver.sql_complete', {
    resolver: 'collegeComparison',
    row_count: rows.length,
    took_ms: Date.now() - start
  });

  return {
    answer: `Found ${rows.length} colleges in application list for comparison context.`,
    chips: [{kind: "evidence", text: "college_list"}],
    hits: rows
  };
}
