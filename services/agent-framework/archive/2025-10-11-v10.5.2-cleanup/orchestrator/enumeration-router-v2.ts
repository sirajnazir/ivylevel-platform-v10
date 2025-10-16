/**
 * Facts-First Enumeration Router
 *
 * Routes queries for initial/final/won awards, ECs, SAT scores to deterministic SQL resolvers
 * NO RAG for these enumeration queries - facts only
 */

import { Pool } from 'pg';
import {
  getInitialAwards,
  getFinalAwards,
  getAwardsWon,
  getInitialECs,
  getFinalECs,
  getSatFirst,
  getSatLatest,
  getSatProgression,
  getSatNth,
  getSatAsOf,
  chipsFromEnum,
  chipsFromSat,
  formatAwardTargets,
  formatAwardsWon
} from '../resolvers/enumerations.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('enumeration-router-v2');

export interface EnumRouteResult {
  answer: string;
  chips: Array<{ kind: string; label?: string; source_id?: string | null; jtbd_id?: string | null; as_of?: string }>;
  meta: {
    enumeration_type: string;
    phase?: string;
    nth?: number;
    count?: number;
  };
  trace: any;
}

/**
 * Route enumeration queries (facts-first, no RAG)
 * Returns null if not an enumeration query
 */
export async function routeEnumerationQueryV2(
  pool: Pool,
  message: string,
  studentId: string
): Promise<EnumRouteResult | null> {
  const m = message.toLowerCase();

  log.event('enumeration_route_attempt', {
    message_preview: message.slice(0, 100),
    student_id: studentId
  });

  // ========================================================================
  // AWARDS
  // ========================================================================

  // "initial awards" / "initial award targets" / "what was the initial awards list"
  if ((m.includes('initial') || m.includes('original') || m.includes('first')) && m.includes('award')) {
    const result = await getInitialAwards(pool, studentId);

    if (result.count === 0) {
      return {
        answer: 'No initial award targets found in the system.',
        chips: [],
        meta: { enumeration_type: 'awards', phase: 'initial', count: 0 },
        trace: result.trace
      };
    }

    return {
      answer: formatAwardTargets(result, 'initial'),
      chips: chipsFromEnum(result.items),
      meta: { enumeration_type: 'awards', phase: 'initial', count: result.count },
      trace: result.trace
    };
  }

  // "final awards" / "final award targets" / "what awards did I apply to"
  if ((m.includes('final') || m.includes('applied')) && m.includes('award')) {
    const result = await getFinalAwards(pool, studentId);

    if (result.count === 0) {
      return {
        answer: 'No final award targets found in the system.',
        chips: [],
        meta: { enumeration_type: 'awards', phase: 'final', count: 0 },
        trace: result.trace
      };
    }

    return {
      answer: formatAwardTargets(result, 'final'),
      chips: chipsFromEnum(result.items),
      meta: { enumeration_type: 'awards', phase: 'final', count: result.count },
      trace: result.trace
    };
  }

  // "awards won" / "what awards did I win" / "actual awards"
  if ((m.includes('won') || m.includes('win') || m.includes('actual') || m.includes('received')) && m.includes('award')) {
    const result = await getAwardsWon(pool, studentId);

    if (result.count === 0) {
      return {
        answer: 'No awards won found in execution timeline.',
        chips: [],
        meta: { enumeration_type: 'awards_won', count: 0 },
        trace: result.trace
      };
    }

    return {
      answer: formatAwardsWon(result),
      chips: chipsFromEnum(result.items),
      meta: { enumeration_type: 'awards_won', count: result.count },
      trace: result.trace
    };
  }

  // ========================================================================
  // ECs
  // ========================================================================

  // "initial ECs" / "initial extracurriculars"
  if ((m.includes('initial') || m.includes('original')) && (m.includes('ec') || m.includes('extracurricular') || m.includes('activity'))) {
    const result = await getInitialECs(pool, studentId);

    if (result.count === 0) {
      return {
        answer: 'No initial EC targets found in the system.',
        chips: [],
        meta: { enumeration_type: 'ecs', phase: 'initial', count: 0 },
        trace: result.trace
      };
    }

    const ecsList = result.items.map((item, idx) => `${idx + 1}. ${item.item_label}`).join('\n');
    return {
      answer: `Initial EC targets (${result.count}):\n${ecsList}`,
      chips: chipsFromEnum(result.items),
      meta: { enumeration_type: 'ecs', phase: 'initial', count: result.count },
      trace: result.trace
    };
  }

  // "final ECs" / "final extracurriculars"
  if ((m.includes('final') || m.includes('submitted')) && (m.includes('ec') || m.includes('extracurricular') || m.includes('activity'))) {
    const result = await getFinalECs(pool, studentId);

    if (result.count === 0) {
      return {
        answer: 'No final EC targets found in the system.',
        chips: [],
        meta: { enumeration_type: 'ecs', phase: 'final', count: 0 },
        trace: result.trace
      };
    }

    const ecsList = result.items.map((item, idx) => `${idx + 1}. ${item.item_label}`).join('\n');
    return {
      answer: `Final EC targets (${result.count}):\n${ecsList}`,
      chips: chipsFromEnum(result.items),
      meta: { enumeration_type: 'ecs', phase: 'final', count: result.count },
      trace: result.trace
    };
  }

  // ========================================================================
  // SAT (Temporal)
  // ========================================================================

  // "first SAT" / "initial SAT score"
  if ((m.includes('first') || m.includes('initial') || m.includes('earliest')) && m.includes('sat')) {
    const sat = await getSatFirst(pool, studentId);

    if (!sat) {
      return {
        answer: 'No SAT scores found in the system.',
        chips: [],
        meta: { enumeration_type: 'sat', count: 0 },
        trace: {}
      };
    }

    return {
      answer: `First SAT score: ${sat.numeric_value} (${sat.type || 'unknown'}, ${sat.as_of})`,
      chips: chipsFromSat(sat),
      meta: { enumeration_type: 'sat', nth: 1 },
      trace: { sat }
    };
  }

  // "second SAT" / "2nd SAT score"
  if ((m.includes('second') || m.includes('2nd')) && m.includes('sat')) {
    const sat = await getSatNth(pool, studentId, 2);

    if (!sat) {
      return {
        answer: 'Second SAT score not found.',
        chips: [],
        meta: { enumeration_type: 'sat', nth: 2, count: 0 },
        trace: {}
      };
    }

    return {
      answer: `Second SAT score: ${sat.numeric_value} (${sat.type || 'unknown'}, ${sat.as_of})`,
      chips: chipsFromSat(sat),
      meta: { enumeration_type: 'sat', nth: 2 },
      trace: { sat }
    };
  }

  // "latest SAT" / "most recent SAT" / "final SAT"
  if ((m.includes('latest') || m.includes('most recent') || m.includes('final') || m.includes('last')) && m.includes('sat')) {
    const sat = await getSatLatest(pool, studentId);

    if (!sat) {
      return {
        answer: 'No SAT scores found in the system.',
        chips: [],
        meta: { enumeration_type: 'sat', count: 0 },
        trace: {}
      };
    }

    return {
      answer: `Latest SAT score: ${sat.numeric_value} (${sat.type || 'unknown'}, ${sat.as_of})`,
      chips: chipsFromSat(sat),
      meta: { enumeration_type: 'sat' },
      trace: { sat }
    };
  }

  // "all SAT scores" / "SAT progression" / "SAT history"
  if (m.includes('sat') && (m.includes('all') || m.includes('progression') || m.includes('history') || m.includes('scores'))) {
    const result = await getSatProgression(pool, studentId);

    if (result.count === 0) {
      return {
        answer: 'No SAT scores found in the system.',
        chips: [],
        meta: { enumeration_type: 'sat', count: 0 },
        trace: result.trace
      };
    }

    const scoresList = result.items
      .map(item => `${item.nth}. ${item.numeric_value} (${item.type || 'unknown'}, ${item.as_of})`)
      .join('\n');

    return {
      answer: `SAT progression (${result.count} attempts):\n${scoresList}`,
      chips: result.items.map(s => chipsFromSat(s)[0]).filter(Boolean),
      meta: { enumeration_type: 'sat', count: result.count },
      trace: result.trace
    };
  }

  // "SAT as of [date]"
  const asOfMatch = m.match(/sat.*?as of (\d{4}-\d{2}-\d{2})/);
  if (asOfMatch) {
    const asOfDate = asOfMatch[1];
    const sat = await getSatAsOf(pool, studentId, asOfDate);

    if (!sat) {
      return {
        answer: `No SAT score found as of ${asOfDate}.`,
        chips: [],
        meta: { enumeration_type: 'sat', as_of: asOfDate, count: 0 },
        trace: {}
      };
    }

    return {
      answer: `SAT score as of ${asOfDate}: ${sat.numeric_value} (${sat.type || 'unknown'})`,
      chips: chipsFromSat(sat),
      meta: { enumeration_type: 'sat', as_of: asOfDate },
      trace: { sat, as_of: asOfDate }
    };
  }

  // Not an enumeration query - return null to fallback to RAG
  log.event('enumeration_route_miss', {
    message_preview: message.slice(0, 100),
    student_id: studentId
  });

  return null;
}

/**
 * Check if message is asking for any enumeration (quick check)
 */
export function isEnumerationQueryV2(message: string): boolean {
  const m = message.toLowerCase();

  // Awards
  if (m.includes('award') && (m.includes('initial') || m.includes('final') || m.includes('won') || m.includes('win') || m.includes('actual'))) {
    return true;
  }

  // ECs
  if ((m.includes('ec') || m.includes('extracurricular') || m.includes('activity')) && (m.includes('initial') || m.includes('final'))) {
    return true;
  }

  // SAT
  if (m.includes('sat') && (m.includes('first') || m.includes('second') || m.includes('latest') || m.includes('all') || m.includes('progression') || m.includes('as of'))) {
    return true;
  }

  return false;
}
