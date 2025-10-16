import { Pool } from 'pg';
import { 
  getInitialAwardTargets, 
  getAwardTargetsByPhase,
  getAwardTargetsAsOf,
  formatAwardTargets,
  isAwardTargetsQuery,
  extractAwardPhase
} from '../resolvers/awards.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('enumeration-router');

export interface EnumerationResult {
  answer: string;
  chips: Array<{ kind: string; source_id: string }>;
  meta: {
    enumeration_type: string;
    phase?: string;
    count: number;
  };
  trace: any;
}

/**
 * Route enumeration queries (awards, ECs, colleges, etc)
 * Returns null if not an enumeration query
 */
export async function routeEnumerationQuery(
  pool: Pool,
  message: string, 
  studentId: string
): Promise<EnumerationResult | null> {
  
  // Check if this is an award targets query
  if (isAwardTargetsQuery(message)) {
    log.event('enumeration_query_detected', { 
      type: 'awards',
      message_preview: message.slice(0, 100),
      student_id: studentId
    });
    
    try {
      // Extract phase from message
      const phase = extractAwardPhase(message) || 'initial';
      
      // Check if asking for as-of date
      const asOfMatch = message.match(/as of (\d{4}-\d{2}-\d{2}|\w+ \d+)/i);
      
      let result;
      
      if (asOfMatch) {
        const asOfDate = new Date(asOfMatch[1]);
        result = await getAwardTargetsAsOf(pool, studentId, asOfDate);
      } else if (phase) {
        result = await getAwardTargetsByPhase(pool, studentId, phase);
      } else {
        result = await getInitialAwardTargets(pool, studentId);
      }
      
      if (result.count === 0) {
        return {
          answer: `No ${phase} award targets found in the system.`,
          chips: [],
          meta: {
            enumeration_type: 'awards',
            phase,
            count: 0
          },
          trace: result.trace
        };
      }
      
      // Format the answer
      const answer = formatAwardTargets(result);
      
      // Create unique chips for sources
      const uniqueSources = [...new Set(result.targets.map(t => t.source_id))];
      const chips = uniqueSources.map(sourceId => ({
        kind: 'source',
        source_id: sourceId
      }));
      
      log.event('enumeration_query_resolved', {
        type: 'awards',
        phase,
        count: result.count,
        student_id: studentId
      });
      
      return {
        answer,
        chips,
        meta: {
          enumeration_type: 'awards',
          phase,
          count: result.count
        },
        trace: result.trace
      };
      
    } catch (error: any) {
      log.error('Failed to resolve award enumeration', {
        error: error.message,
        student_id: studentId
      });
      
      return {
        answer: 'Sorry, I encountered an error retrieving the award targets.',
        chips: [],
        meta: {
          enumeration_type: 'awards',
          count: 0,
          error: error.message
        },
        trace: { error: error.message }
      };
    }
  }
  
  // TODO: Add other enumeration types (ECs, colleges, narrative)
  // if (isECTargetsQuery(message)) { ... }
  // if (isCollegeTargetsQuery(message)) { ... }
  
  // Not an enumeration query
  return null;
}

/**
 * Check if message is asking for any enumeration
 */
export function isEnumerationQuery(message: string): boolean {
  return isAwardTargetsQuery(message);
  // TODO: || isECTargetsQuery(message) || isCollegeTargetsQuery(message);
}