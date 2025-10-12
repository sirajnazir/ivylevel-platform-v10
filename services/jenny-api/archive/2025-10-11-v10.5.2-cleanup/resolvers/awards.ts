import { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolver-awards');

export type AwardTarget = {
  award_label: string;
  tier: string | null;
  phase: 'initial' | 'revised' | 'final';
  as_of: string;
  confidence: string;
  source_id: string;
  rationale?: string | null;
};

export interface AwardTargetsResult {
  targets: AwardTarget[];
  phase: string;
  count: number;
  trace: {
    query_type: string;
    took_ms: number;
    student_id: string;
  };
}

/**
 * Get initial award targets for a student
 */
export async function getInitialAwardTargets(
  pool: Pool, 
  studentId: string
): Promise<AwardTargetsResult> {
  const startTime = Date.now();
  
  log.event('resolve_awards_initial_start', { student_id: studentId });
  
  try {
    const query = `
      SELECT 
        award_label, 
        tier, 
        phase, 
        as_of AT TIME ZONE 'UTC' as as_of, 
        confidence, 
        source_id,
        rationale
      FROM v_award_targets_initial
      WHERE student_id = $1
      ORDER BY award_label ASC
      LIMIT 200;
    `;
    
    const { rows } = await pool.query<AwardTarget>(query, [studentId]);
    
    const result: AwardTargetsResult = {
      targets: rows.map(row => ({
        ...row,
        as_of: row.as_of ? new Date(row.as_of).toISOString() : ''
      })),
      phase: 'initial',
      count: rows.length,
      trace: {
        query_type: 'award_targets_initial',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };
    
    log.event('resolve_awards_initial_complete', { 
      student_id: studentId,
      row_count: rows.length,
      took_ms: result.trace.took_ms
    });
    
    return result;
    
  } catch (error: any) {
    log.error('Failed to resolve initial award targets', { 
      error: error.message,
      student_id: studentId 
    });
    throw new Error(`Failed to resolve initial award targets: ${error.message}`);
  }
}

/**
 * Get award targets by phase
 */
export async function getAwardTargetsByPhase(
  pool: Pool,
  studentId: string,
  phase: 'initial' | 'revised' | 'final'
): Promise<AwardTargetsResult> {
  const startTime = Date.now();
  
  log.event('resolve_awards_by_phase_start', { student_id: studentId, phase });
  
  try {
    const { rows } = await pool.query<AwardTarget>(
      'SELECT * FROM get_award_targets_by_phase($1, $2)',
      [studentId, phase]
    );
    
    const result: AwardTargetsResult = {
      targets: rows.map(row => ({
        ...row,
        as_of: row.as_of ? new Date(row.as_of).toISOString() : ''
      })),
      phase,
      count: rows.length,
      trace: {
        query_type: 'award_targets_by_phase',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };
    
    log.event('resolve_awards_by_phase_complete', { 
      student_id: studentId,
      phase,
      row_count: rows.length,
      took_ms: result.trace.took_ms
    });
    
    return result;
    
  } catch (error: any) {
    log.error('Failed to resolve award targets by phase', { 
      error: error.message,
      student_id: studentId,
      phase 
    });
    throw new Error(`Failed to resolve award targets: ${error.message}`);
  }
}

/**
 * Get award targets as of a specific date
 */
export async function getAwardTargetsAsOf(
  pool: Pool,
  studentId: string,
  asOfDate: Date
): Promise<AwardTargetsResult> {
  const startTime = Date.now();
  
  log.event('resolve_awards_asof_start', { 
    student_id: studentId, 
    as_of_date: asOfDate.toISOString() 
  });
  
  try {
    const { rows } = await pool.query<AwardTarget>(
      'SELECT * FROM get_award_targets_asof($1, $2)',
      [studentId, asOfDate]
    );
    
    const result: AwardTargetsResult = {
      targets: rows.map(row => ({
        ...row,
        as_of: row.as_of ? new Date(row.as_of).toISOString() : ''
      })),
      phase: rows[0]?.phase || 'unknown',
      count: rows.length,
      trace: {
        query_type: 'award_targets_asof',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };
    
    log.event('resolve_awards_asof_complete', { 
      student_id: studentId,
      as_of_date: asOfDate.toISOString(),
      row_count: rows.length,
      took_ms: result.trace.took_ms
    });
    
    return result;
    
  } catch (error: any) {
    log.error('Failed to resolve award targets as of date', { 
      error: error.message,
      student_id: studentId,
      as_of_date: asOfDate.toISOString()
    });
    throw new Error(`Failed to resolve award targets: ${error.message}`);
  }
}

/**
 * Format award targets for display
 */
export function formatAwardTargets(result: AwardTargetsResult): string {
  if (result.count === 0) {
    return 'No award targets found for the specified criteria.';
  }
  
  const phaseLabel = result.phase === 'initial' ? 'Initial' : 
                     result.phase === 'revised' ? 'Revised' : 
                     'Final';
  
  const awardsList = result.targets
    .map((t, idx) => `${idx + 1}. ${t.award_label}${t.tier ? ` (${t.tier})` : ''}`)
    .join('\n');
  
  return `${phaseLabel} targeted awards (${result.count}):\n${awardsList}`;
}

/**
 * Check if query is asking for award targets
 */
export function isAwardTargetsQuery(message: string): boolean {
  const m = message.toLowerCase();
  
  // Check for award mentions
  const hasAward = /\b(award|awards|prize|prizes|recognition)\b/.test(m);
  
  // Check for target/initial/plan mentions  
  const hasTarget = /\b(target|targeted|initial|planned|list|what were|show me)\b/.test(m);
  
  return hasAward && hasTarget;
}

/**
 * Extract phase from message if specified
 */
export function extractAwardPhase(message: string): 'initial' | 'revised' | 'final' | null {
  const m = message.toLowerCase();
  
  if (/\b(initial|first|original|beginning)\b/.test(m)) {
    return 'initial';
  }
  if (/\b(revised|updated|changed)\b/.test(m)) {
    return 'revised';
  }
  if (/\b(final|last|latest|current)\b/.test(m)) {
    return 'final';
  }
  
  // Default to initial if asking about "targets"
  if (/\btarget/.test(m)) {
    return 'initial';
  }
  
  return null;
}