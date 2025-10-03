import { Pool } from 'pg';

export type TemporalOperator = 'first' | 'last' | 'latest' | 'nth' | 'asof' | 'series' | 'superscore';

export interface TemporalFactQuery {
  student_id: string;
  kind: string;
  operator: TemporalOperator;
  nth?: number;
  asof_date?: string;
  official_only?: boolean;
}

export interface FactObservation {
  obs_id: string;
  event_date: string;
  value_numeric: number | null;
  value_text: string | null;
  is_official: boolean;
  confidence: string;
  source_id: string;
  meta?: any;
}

export interface FactSeriesItem extends FactObservation {
  idx: number;
}

export interface TemporalFactResult {
  operator: TemporalOperator;
  facts: FactObservation[] | FactSeriesItem[];
  trace: {
    query_type: string;
    sql_function: string;
    took_ms: number;
    rows_returned: number;
    student_id: string;
    kind: string;
  };
}

/**
 * Universal temporal fact resolver using SQL functions
 */
export async function resolveTemporalFact(pool: Pool, query: TemporalFactQuery): Promise<TemporalFactResult> {
  const startTime = Date.now();
  const { student_id, kind, operator, nth, asof_date, official_only } = query;
  
  let sqlFunction: string;
  let result: any;
  
  try {
    switch (operator) {
      case 'first':
        sqlFunction = 'fact_first';
        result = await pool.query(
          'SELECT * FROM fact_first($1, $2)',
          [student_id, kind]
        );
        break;
        
      case 'last':
      case 'latest':
        sqlFunction = 'fact_latest';
        result = await pool.query(
          'SELECT * FROM fact_latest($1, $2)',
          [student_id, kind]
        );
        break;
        
      case 'nth':
        if (!nth || nth < 1) {
          throw new Error('nth operator requires a positive integer');
        }
        sqlFunction = 'fact_nth';
        result = await pool.query(
          'SELECT * FROM fact_nth($1, $2, $3)',
          [student_id, kind, nth]
        );
        break;
        
      case 'asof':
        if (!asof_date) {
          throw new Error('asof operator requires a date');
        }
        sqlFunction = 'fact_asof';
        result = await pool.query(
          'SELECT * FROM fact_asof($1, $2, $3)',
          [student_id, kind, asof_date]
        );
        break;
        
      case 'series':
        sqlFunction = official_only ? 'fact_series_filtered' : 'fact_series';
        result = await pool.query(
          official_only 
            ? 'SELECT * FROM fact_series_filtered($1, $2, $3)'
            : 'SELECT * FROM fact_series($1, $2)',
          official_only ? [student_id, kind, true] : [student_id, kind]
        );
        break;
        
      case 'superscore':
        sqlFunction = 'fact_superscore';
        result = await pool.query(
          'SELECT * FROM fact_superscore($1, $2)',
          [student_id, kind]
        );
        // Transform superscore result
        if (result.rows.length > 0) {
          const row = result.rows[0];
          result.rows = [{
            obs_id: 'superscore',
            event_date: row.event_dates?.[row.event_dates.length - 1] || null,
            value_numeric: row.value_numeric,
            value_text: null,
            is_official: true,
            confidence: 'computed',
            source_id: row.source_ids?.join(',') || '',
            meta: { event_dates: row.event_dates, source_ids: row.source_ids }
          }];
        }
        break;
        
      default:
        throw new Error(`Unknown temporal operator: ${operator}`);
    }
    
    const facts = result.rows.map((row: any) => ({
      ...row,
      event_date: row.event_date ? new Date(row.event_date).toISOString().split('T')[0] : null,
      meta: row.meta || {}
    }));
    
    return {
      operator,
      facts,
      trace: {
        query_type: 'temporal_fact',
        sql_function: sqlFunction,
        took_ms: Date.now() - startTime,
        rows_returned: facts.length,
        student_id,
        kind
      }
    };
    
  } catch (error: any) {
    throw new Error(`Temporal fact resolution failed: ${error.message}`);
  }
}

/**
 * Format temporal fact result for display
 */
export function formatTemporalFactResult(result: TemporalFactResult, kind: string): string {
  const { operator, facts } = result;
  
  if (facts.length === 0) {
    return `No ${kind.replace(/_/g, ' ')} found.`;
  }
  
  const formatSingleFact = (fact: FactObservation): string => {
    const value = fact.value_numeric || fact.value_text || 'N/A';
    const date = fact.event_date ? new Date(fact.event_date).toLocaleDateString() : 'unknown date';
    const type = fact.is_official ? 'official' : fact.is_practice ? 'practice' : '';
    
    if (kind === 'sat_total_score' || kind === 'act_composite') {
      return `${value} (${date}${type ? `, ${type}` : ''})`;
    }
    
    return `${value} on ${date}`;
  };
  
  switch (operator) {
    case 'first':
      return `Your first ${kind.replace(/_/g, ' ')} was ${formatSingleFact(facts[0])}`;
      
    case 'last':
    case 'latest':
      return `Your latest ${kind.replace(/_/g, ' ')} is ${formatSingleFact(facts[0])}`;
      
    case 'nth':
      const nth = result.trace.sql_function.includes('nth') ? 
        facts[0] && (facts[0] as any).idx || 'nth' : 'nth';
      return `Your ${nth} ${kind.replace(/_/g, ' ')} was ${formatSingleFact(facts[0])}`;
      
    case 'asof':
      return `As of ${result.trace.sql_function}, your ${kind.replace(/_/g, ' ')} was ${formatSingleFact(facts[0])}`;
      
    case 'series':
      const items = (facts as FactSeriesItem[]).map(f => 
        `  ${f.idx}. ${formatSingleFact(f)}`
      ).join('\n');
      return `Your ${kind.replace(/_/g, ' ')} history:\n${items}`;
      
    case 'superscore':
      const superscoreFact = facts[0];
      if (superscoreFact.meta?.event_dates?.length > 1) {
        return `Your ${kind.replace(/_/g, ' ')} superscore is ${superscoreFact.value_numeric} ` +
               `(achieved across ${superscoreFact.meta.event_dates.length} test dates)`;
      }
      return `Your highest ${kind.replace(/_/g, ' ')} is ${formatSingleFact(facts[0])}`;
      
    default:
      return formatSingleFact(facts[0]);
  }
}

/**
 * Extract fact kind and temporal operator from natural language
 */
export interface TemporalIntent {
  kind: string | null;
  operator: TemporalOperator | null;
  nth?: number;
  asof_date?: string;
  official_only?: boolean;
}

// Fact kinds lexicon
const FACT_KINDS: Record<string, string> = {
  // Test scores
  'sat': 'sat_total_score',
  'sat score': 'sat_total_score',
  'sat total': 'sat_total_score',
  'act': 'act_composite',
  'act score': 'act_composite',
  'act composite': 'act_composite',
  'ap': 'ap_score',
  'ap score': 'ap_score',
  'ap scores': 'ap_score',
  
  // GPA
  'gpa': 'gpa_weighted',
  'weighted gpa': 'gpa_weighted',
  'unweighted gpa': 'gpa_unweighted',
  'uwgpa': 'gpa_unweighted',
  'wgpa': 'gpa_weighted',
  
  // Awards
  'award': 'award_won',
  'awards': 'award_won',
  'award won': 'award_won',
  'award applied': 'award_applied',
  
  // Applications
  'schools': 'school_applied',
  'submissions': 'app_submitted',
  'essays': 'essay_submitted',
  'applications': 'app_submitted'
};

export function extractTemporalIntent(utterance: string): TemporalIntent {
  const u = utterance.toLowerCase();
  
  // Extract fact kind
  let kind: string | null = null;
  for (const [phrase, factKind] of Object.entries(FACT_KINDS)) {
    if (u.includes(phrase)) {
      kind = factKind;
      break;
    }
  }
  
  // Extract temporal operator
  let operator: TemporalOperator | null = null;
  let nth: number | undefined;
  let asof_date: string | undefined;
  let official_only = false;
  
  // First/initial/earliest
  if (/\b(first|initial|earliest|beginning)\b/.test(u)) {
    operator = 'first';
  }
  // Last/latest/final/most recent
  else if (/\b(last|latest|final|most recent|recent)\b/.test(u)) {
    operator = 'latest';
  }
  // Nth (second, third, etc.)
  else if (/\b(second|2nd)\b/.test(u)) {
    operator = 'nth';
    nth = 2;
  }
  else if (/\b(third|3rd)\b/.test(u)) {
    operator = 'nth';
    nth = 3;
  }
  else if (/\b(fourth|4th)\b/.test(u)) {
    operator = 'nth';
    nth = 4;
  }
  else if (/\b(fifth|5th)\b/.test(u)) {
    operator = 'nth';
    nth = 5;
  }
  // All/series/history/list
  else if (/\b(all|every|series|history|list|scores|attempts)\b/.test(u)) {
    operator = 'series';
  }
  // Superscore/highest
  else if (/\b(superscore|highest|maximum|max|best)\b/.test(u)) {
    operator = 'superscore';
  }
  // As of date
  else if (/\b(as of|by|before|until)\b/.test(u)) {
    operator = 'asof';
    // Simple date extraction - could be enhanced
    const dateMatch = u.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dateMatch) {
      asof_date = dateMatch[1];
    }
  }
  
  // Check for official only
  if (/\b(official|reported|collegeboard|cb)\b/.test(u) && !/\bpractice\b/.test(u)) {
    official_only = true;
  }
  
  return { kind, operator, nth, asof_date, official_only };
}

/**
 * Check if query should use temporal facts resolution
 */
export function shouldUseTemporalFacts(utterance: string): boolean {
  const intent = extractTemporalIntent(utterance);
  return intent.kind !== null && intent.operator !== null;
}