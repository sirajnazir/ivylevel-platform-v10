// services/jenny-api/src/services/resolvers.ts
import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

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

export async function kbSearch(_pg: Pool, _studentId: string, _q: string) {
  return {
    answer: "I can search your knowledge base if you want, but for accuracy I recommend asking for a specific list (e.g., 'final awards list').",
    chips:[{kind:"notice", text:"facts-first"}],
    hits:[]
  };
}
