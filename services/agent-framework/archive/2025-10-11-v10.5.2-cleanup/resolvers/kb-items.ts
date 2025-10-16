import { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolver-kb-items');

// ============================================================================
// Types
// ============================================================================

export type KBItem = {
  item_id: string;
  student_id: string;
  item_type: string;
  subtype: string | null;
  title_name: string;
  tier1_state: 'Planned' | 'In Transit' | 'Submitted' | 'Outcome' | 'Archived';
  tier2_substate: string | null;
  status_detail: string | null;
  key_metric_type: string | null;
  key_metric_value: string | null;
  key_metric_unit: string | null;
  deadline_date: string | null;
  event_date: string | null;
  submit_date: string | null;
  outcome_date: string | null;
  owner: string | null;
  cadence: string | null;
  evidence_links: string[] | null;
  source_ref: string;
  confidence: string;
  created_ts: string;
  updated_ts: string;
};

export type SatPoint = {
  nth: number;
  fact_date: string;
  score_total: number | null;
  modality: string | null;
  confidence: string;
  source_id: string;
};

export type KBItemsResult = {
  items: KBItem[];
  count: number;
  trace: {
    query_type: string;
    took_ms: number;
    student_id: string;
  };
};

export type SatProgressionResult = {
  points: SatPoint[];
  count: number;
  trace: {
    query_type: string;
    took_ms: number;
    student_id: string;
  };
};

// ============================================================================
// Enumeration Resolver (Awards, ECs, etc.)
// ============================================================================

export class EnumerationResolver {
  constructor(private db: Pool) {}

  /**
   * Get initial award targets (Planned/Targeted state)
   */
  async awardsInitial(studentId: string): Promise<KBItemsResult> {
    const startTime = Date.now();
    log.event('awards_initial_start', { student_id: studentId });

    try {
      const sql = `SELECT * FROM v_awards_initial WHERE student_id = $1`;
      const { rows } = await this.db.query<KBItem>(sql, [studentId]);

      const result: KBItemsResult = {
        items: rows,
        count: rows.length,
        trace: {
          query_type: 'awards_initial',
          took_ms: Date.now() - startTime,
          student_id: studentId
        }
      };

      log.event('awards_initial_complete', {
        student_id: studentId,
        count: rows.length,
        took_ms: result.trace.took_ms
      });

      return result;
    } catch (error: any) {
      log.error('Failed to resolve initial awards', {
        error: error.message,
        student_id: studentId
      });
      throw new Error(`Failed to resolve initial awards: ${error.message}`);
    }
  }

  /**
   * Get awards won (Outcome state)
   */
  async awardsWon(studentId: string): Promise<KBItemsResult> {
    const startTime = Date.now();
    log.event('awards_won_start', { student_id: studentId });

    try {
      const sql = `SELECT * FROM v_awards_won WHERE student_id = $1`;
      const { rows } = await this.db.query<KBItem>(sql, [studentId]);

      const result: KBItemsResult = {
        items: rows,
        count: rows.length,
        trace: {
          query_type: 'awards_won',
          took_ms: Date.now() - startTime,
          student_id: studentId
        }
      };

      log.event('awards_won_complete', {
        student_id: studentId,
        count: rows.length,
        took_ms: result.trace.took_ms
      });

      return result;
    } catch (error: any) {
      log.error('Failed to resolve awards won', {
        error: error.message,
        student_id: studentId
      });
      throw new Error(`Failed to resolve awards won: ${error.message}`);
    }
  }

  /**
   * Get full awards timeline (all states)
   */
  async awardsTimeline(studentId: string): Promise<KBItemsResult> {
    const startTime = Date.now();
    log.event('awards_timeline_start', { student_id: studentId });

    try {
      const sql = `SELECT * FROM v_awards_timeline WHERE student_id = $1`;
      const { rows } = await this.db.query<KBItem>(sql, [studentId]);

      const result: KBItemsResult = {
        items: rows,
        count: rows.length,
        trace: {
          query_type: 'awards_timeline',
          took_ms: Date.now() - startTime,
          student_id: studentId
        }
      };

      log.event('awards_timeline_complete', {
        student_id: studentId,
        count: rows.length,
        took_ms: result.trace.took_ms
      });

      return result;
    } catch (error: any) {
      log.error('Failed to resolve awards timeline', {
        error: error.message,
        student_id: studentId
      });
      throw new Error(`Failed to resolve awards timeline: ${error.message}`);
    }
  }

  /**
   * Get items by type and state (generic)
   */
  async getItemsByTypeState(
    studentId: string,
    itemType: string,
    tier1State?: string,
    tier2Substate?: string
  ): Promise<KBItemsResult> {
    const startTime = Date.now();
    log.event('get_items_by_type_state_start', {
      student_id: studentId,
      item_type: itemType,
      tier1_state: tier1State,
      tier2_substate: tier2Substate
    });

    try {
      const { rows } = await this.db.query<KBItem>(
        `SELECT * FROM get_kb_items_by_type_state($1, $2, $3, $4)`,
        [studentId, itemType, tier1State || null, tier2Substate || null]
      );

      const result: KBItemsResult = {
        items: rows,
        count: rows.length,
        trace: {
          query_type: 'get_items_by_type_state',
          took_ms: Date.now() - startTime,
          student_id: studentId
        }
      };

      log.event('get_items_by_type_state_complete', {
        student_id: studentId,
        item_type: itemType,
        count: rows.length,
        took_ms: result.trace.took_ms
      });

      return result;
    } catch (error: any) {
      log.error('Failed to get items by type/state', {
        error: error.message,
        student_id: studentId,
        item_type: itemType
      });
      throw new Error(`Failed to get items: ${error.message}`);
    }
  }
}

// ============================================================================
// Facts Resolver (SAT, Testing, etc.)
// ============================================================================

export class FactsResolver {
  constructor(private db: Pool) {}

  /**
   * Get first SAT score
   */
  async satFirst(studentId: string): Promise<SatPoint | null> {
    const startTime = Date.now();
    log.event('sat_first_start', { student_id: studentId });

    try {
      const sql = `
        SELECT * FROM v_sat_progression
        WHERE student_id = $1
        ORDER BY nth ASC
        LIMIT 1
      `;
      const { rows } = await this.db.query<SatPoint>(sql, [studentId]);

      log.event('sat_first_complete', {
        student_id: studentId,
        found: rows.length > 0,
        took_ms: Date.now() - startTime
      });

      return rows[0] || null;
    } catch (error: any) {
      log.error('Failed to resolve first SAT', {
        error: error.message,
        student_id: studentId
      });
      throw new Error(`Failed to resolve first SAT: ${error.message}`);
    }
  }

  /**
   * Get latest SAT score
   */
  async satLatest(studentId: string): Promise<SatPoint | null> {
    const startTime = Date.now();
    log.event('sat_latest_start', { student_id: studentId });

    try {
      const sql = `
        SELECT * FROM v_sat_progression
        WHERE student_id = $1
        ORDER BY nth DESC
        LIMIT 1
      `;
      const { rows } = await this.db.query<SatPoint>(sql, [studentId]);

      log.event('sat_latest_complete', {
        student_id: studentId,
        found: rows.length > 0,
        took_ms: Date.now() - startTime
      });

      return rows[0] || null;
    } catch (error: any) {
      log.error('Failed to resolve latest SAT', {
        error: error.message,
        student_id: studentId
      });
      throw new Error(`Failed to resolve latest SAT: ${error.message}`);
    }
  }

  /**
   * Get nth SAT score
   */
  async satNth(studentId: string, n: number): Promise<SatPoint | null> {
    const startTime = Date.now();
    log.event('sat_nth_start', { student_id: studentId, nth: n });

    try {
      const sql = `
        SELECT * FROM v_sat_progression
        WHERE student_id = $1 AND nth = $2
      `;
      const { rows } = await this.db.query<SatPoint>(sql, [studentId, n]);

      log.event('sat_nth_complete', {
        student_id: studentId,
        nth: n,
        found: rows.length > 0,
        took_ms: Date.now() - startTime
      });

      return rows[0] || null;
    } catch (error: any) {
      log.error('Failed to resolve nth SAT', {
        error: error.message,
        student_id: studentId,
        nth: n
      });
      throw new Error(`Failed to resolve nth SAT: ${error.message}`);
    }
  }

  /**
   * Get all SAT scores (progression)
   */
  async satAll(studentId: string): Promise<SatProgressionResult> {
    const startTime = Date.now();
    log.event('sat_all_start', { student_id: studentId });

    try {
      const sql = `
        SELECT * FROM v_sat_progression
        WHERE student_id = $1
        ORDER BY nth ASC
      `;
      const { rows } = await this.db.query<SatPoint>(sql, [studentId]);

      const result: SatProgressionResult = {
        points: rows,
        count: rows.length,
        trace: {
          query_type: 'sat_all',
          took_ms: Date.now() - startTime,
          student_id: studentId
        }
      };

      log.event('sat_all_complete', {
        student_id: studentId,
        count: rows.length,
        took_ms: result.trace.took_ms
      });

      return result;
    } catch (error: any) {
      log.error('Failed to resolve SAT progression', {
        error: error.message,
        student_id: studentId
      });
      throw new Error(`Failed to resolve SAT progression: ${error.message}`);
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format awards for display
 */
export function formatAwards(result: KBItemsResult, context: string): string {
  if (result.count === 0) {
    return `No ${context} awards found.`;
  }

  const awardsList = result.items
    .map((item, idx) => {
      const status = item.status_detail ? ` (${item.status_detail})` : '';
      const tier = item.subtype ? ` [${item.subtype}]` : '';
      return `${idx + 1}. ${item.title_name}${tier}${status}`;
    })
    .join('\n');

  return `${context} awards (${result.count}):\n${awardsList}`;
}

/**
 * Format SAT progression for display
 */
export function formatSatProgression(result: SatProgressionResult): string {
  if (result.count === 0) {
    return 'No SAT scores found.';
  }

  const scoresList = result.points
    .map(point => {
      const modality = point.modality ? ` (${point.modality})` : '';
      return `${point.nth}. ${point.score_total || 'N/A'}${modality} - ${point.fact_date}`;
    })
    .join('\n');

  return `SAT progression (${result.count} attempts):\n${scoresList}`;
}
