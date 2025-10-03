import { Pool } from 'pg';

export type FactQuery = {
  student_id: string;
  kind: string;
  temporal?: 'earliest'|'latest'|'min'|'max';
  modality?: 'official'|'practice'|'any';
};

export async function resolveFact(pool: Pool, q: FactQuery) {
  const { student_id, kind, temporal = 'latest', modality = 'any' } = q;

  // Range rules (extend as you add kinds)
  const range = kind === 'sat_total_score'
    ? { min: 200, max: 1600 }
    : kind === 'act_composite'
    ? { min: 1, max: 36 }
    : null;

  // Order & aggregate selector
  let orderSql = `ORDER BY fact_date DESC, confidence DESC`;
  if (temporal === 'earliest') orderSql = `ORDER BY fact_date ASC, confidence DESC`;
  if (temporal === 'min')      orderSql = `ORDER BY numeric_value ASC NULLS LAST, fact_date ASC`;
  if (temporal === 'max')      orderSql = `ORDER BY numeric_value DESC NULLS LAST, fact_date DESC`;

  const modalityFilter = modality === 'any'
    ? `TRUE`
    : `modality = $3`;

  const rangeFilter = range
    ? `AND numeric_value BETWEEN ${range.min} AND ${range.max}`
    : ``;

  // Prefer official over practice over any when modality=any (tie-break)
  const modalityBias = modality === 'any'
    ? `CASE modality WHEN 'official' THEN 2 WHEN 'practice' THEN 1 ELSE 0 END DESC,`
    : ``;

  const sql = `
    WITH base AS (
      SELECT *
      FROM vw_facts_normalized
      WHERE student_id = $1
        AND kind = $2
        ${range ? 'AND numeric_value IS NOT NULL' : ''}
        ${rangeFilter}
        AND ${modalityFilter}
    )
    SELECT student_id, kind, value, numeric_value, fact_date, confidence, source_id, modality
    FROM base
    ${temporal === 'min' || temporal === 'max'
      ? orderSql
      : temporal === 'earliest' || temporal === 'latest'
      ? `ORDER BY fact_date ${temporal==='earliest'?'ASC':'DESC'}, ${modalityBias} confidence DESC`
      : `ORDER BY ${modalityBias} confidence DESC, fact_date DESC`}
    LIMIT 1;
  `;

  const params =
    modality === 'any' ? [student_id, kind] : [student_id, kind, modality];

  const t0 = Date.now();
  const r = await pool.query(sql, params);
  const took_ms = Date.now() - t0;

  const row = r.rows[0] || null;

  // WHY payload for trace + chip
  const why = {
    temporal,
    modality_requested: modality,
    modality_bias_applied: modality === 'any',
    range: range || 'none',
    order_explained: temporal,
    took_ms,
  };

  return { row, why };
}