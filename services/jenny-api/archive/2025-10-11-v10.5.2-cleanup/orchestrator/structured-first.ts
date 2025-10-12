import { extractTemporalAndModality } from './intent.js';
import { resolveFact } from '../services/facts.js';
import { pool } from '../db/pool.js';

// Context type
export interface Ctx {
  pool: any;
  student_id: string;
  vitals: any;
  trace: {
    info: (component: string, operation: string, data: any) => void;
  };
}

export async function structuredResponseSAT(ctx: Ctx, message: string) {
  const { temporal, modality } = extractTemporalAndModality(message);

  const { row, why } = await resolveFact(ctx.pool, {
    student_id: ctx.student_id,
    kind: 'sat_total_score',
    temporal: temporal ?? 'latest',    // default: latest/canonical
    modality: modality ?? 'any'
  });

  if (!row) {
    ctx.trace.info('facts', 'resolve_fact_none', { level: 'info', input: { temporal, modality } });
    return {
      answer: "I don't have a SAT score on record yet.",
      chips: [],
      vitals: ctx.vitals,
      meta: { temporal, modality }
    };
  }

  // Compose factual answer deterministically
  const answer = `Your SAT total score is **${row.numeric_value ?? row.value}** (recorded ${row.fact_date}, confidence: ${row.confidence}${row.modality && row.modality!=='any' ? `, ${row.modality}`:''})`;

  ctx.trace.info('facts', 'resolve_fact', {
    input: { temporal, modality },
    output: { row },
    why
  });

  return {
    answer,
    chips: [{ kind: 'fact', source_id: row.source_id, label: 'SAT score fact' }],
    vitals: ctx.vitals,
    meta: { temporal, modality, fact_source_id: row.source_id }
  };
}