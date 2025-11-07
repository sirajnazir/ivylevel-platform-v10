/**
 * HandoverLogger
 *
 * Structured logging system for handover decisions
 * Creates human-readable debug logs and structured event logs
 *
 * Integration points:
 * - Used by HandoverDecisionEngine for all logging
 * - Writes to both console (pino) and file-based debug logs
 * - Provides handover decision audit trail
 *
 * @file src/handover/HandoverLogger.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { HandoverDecision } from './HandoverDecisionEngine.js';

// Simple console logger
const pinoLog = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || ''),
  event: (msg: string, data?: any) => console.log(`[EVENT] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

export interface HandoverLogEntry {
  timestamp: string;
  session_id: string;
  current_agent: string;
  event: string;
  data?: any;
}

export class HandoverLogger {
  private static DEBUG_LOG_PATH = path.join(
    process.cwd(),
    'logs',
    'handover-decisions.jsonl'
  );

  /**
   * Initialize logger (ensure logs directory exists)
   */
  static initialize(): void {
    const logsDir = path.dirname(this.DEBUG_LOG_PATH);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    pinoLog.info('handover.logger.initialized', {
      log_path: this.DEBUG_LOG_PATH
    });
  }

  /**
   * Log handover check start
   */
  static logCheckStart(
    sessionId: string,
    currentAgent: string,
    factsCount: number,
    conversationTurns: number
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'handover_check_start',
      data: {
        facts_count: factsCount,
        conversation_turns: conversationTurns
      }
    };

    this.writeDebugLog(entry);

    pinoLog.debug('handover.check.start', {
      session_id: sessionId,
      current_agent: currentAgent,
      facts_count: factsCount,
      conversation_turns: conversationTurns
    });
  }

  /**
   * Log missing configuration
   */
  static logNoConfig(sessionId: string, currentAgent: string): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'no_config',
      data: {
        reason: 'Agent not found in AgentHandoverConfig'
      }
    };

    this.writeDebugLog(entry);

    pinoLog.debug('handover.check.no_config', {
      session_id: sessionId,
      current_agent: currentAgent
    });
  }

  /**
   * Log no handover target
   */
  static logNoTarget(sessionId: string, currentAgent: string): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'no_handover_target',
      data: {
        reason: 'Agent has handover_to: null'
      }
    };

    this.writeDebugLog(entry);

    pinoLog.debug('handover.check.no_target', {
      session_id: sessionId,
      current_agent: currentAgent
    });
  }

  /**
   * Log insufficient conversation turns
   */
  static logInsufficientTurns(
    sessionId: string,
    currentAgent: string,
    currentTurns: number,
    requiredTurns: number
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'insufficient_turns',
      data: {
        current_turns: currentTurns,
        required_turns: requiredTurns,
        reason: `Need ${requiredTurns} turns, have ${currentTurns}`
      }
    };

    this.writeDebugLog(entry);

    pinoLog.debug('handover.check.insufficient_turns', {
      session_id: sessionId,
      current_agent: currentAgent,
      current_turns: currentTurns,
      required_turns: requiredTurns
    });
  }

  /**
   * Log custom validation failure
   */
  static logCustomValidationFailed(
    sessionId: string,
    currentAgent: string
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'custom_validation_failed',
      data: {
        reason: 'Custom validation function returned false'
      }
    };

    this.writeDebugLog(entry);

    pinoLog.debug('handover.check.custom_validation_failed', {
      session_id: sessionId,
      current_agent: currentAgent
    });
  }

  /**
   * Log HandoverValidator results
   */
  static logValidationComplete(
    sessionId: string,
    currentAgent: string,
    qualityScore: number,
    gatesPassed: number,
    gatesTotal: number,
    recommendation: string
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'validation_complete',
      data: {
        quality_score: qualityScore,
        gates_passed: gatesPassed,
        gates_total: gatesTotal,
        gates_percentage: Math.round((gatesPassed / gatesTotal) * 100),
        recommendation
      }
    };

    this.writeDebugLog(entry);

    pinoLog.debug('handover.validation.complete', {
      session_id: sessionId,
      current_agent: currentAgent,
      quality_score: qualityScore,
      gates_passed: gatesPassed,
      gates_total: gatesTotal,
      recommendation
    });
  }

  /**
   * Log quality threshold not met
   */
  static logBelowThreshold(
    sessionId: string,
    currentAgent: string,
    qualityScore: number,
    threshold: number,
    gatesPassed: number,
    gatesTotal: number,
    recommendation: string
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'below_threshold',
      data: {
        quality_score: qualityScore,
        threshold,
        gates_passed: `${gatesPassed}/${gatesTotal}`,
        recommendation,
        reason: `Quality score ${qualityScore} < threshold ${threshold}`
      }
    };

    this.writeDebugLog(entry);

    pinoLog.debug('handover.check.below_threshold', {
      session_id: sessionId,
      current_agent: currentAgent,
      quality_score: qualityScore,
      threshold,
      gates_passed: `${gatesPassed}/${gatesTotal}`,
      recommendation
    });
  }

  /**
   * Log missing required facts
   */
  static logMissingRequired(
    sessionId: string,
    currentAgent: string,
    missingFacts: string[],
    collectedFacts: string[]
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'missing_required_facts',
      data: {
        missing_facts: missingFacts,
        collected_facts: collectedFacts,
        reason: `Missing required facts: ${missingFacts.join(', ')}`
      }
    };

    this.writeDebugLog(entry);

    pinoLog.debug('handover.check.missing_required', {
      session_id: sessionId,
      current_agent: currentAgent,
      missing_facts: missingFacts,
      collected_facts: collectedFacts
    });
  }

  /**
   * Log successful handover decision
   */
  static logHandoverReady(
    sessionId: string,
    decision: HandoverDecision
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: decision.from_agent,
      event: 'handover_ready',
      data: {
        from_agent: decision.from_agent,
        to_agent: decision.to_agent,
        quality_score: decision.quality_score,
        gates_passed: `${decision.quality_gates_passed}/${decision.quality_gates_total}`,
        conversation_turns: decision.metadata?.conversation_turns,
        reason: decision.reason,
        collected_facts: decision.metadata?.collected_facts
      }
    };

    this.writeDebugLog(entry);

    pinoLog.event('handover.decision.ready', {
      session_id: sessionId,
      from_agent: decision.from_agent,
      to_agent: decision.to_agent,
      quality_score: decision.quality_score,
      gates_passed: `${decision.quality_gates_passed}/${decision.quality_gates_total}`,
      conversation_turns: decision.metadata?.conversation_turns
    });
  }

  /**
   * Log handover execution start
   */
  static logHandoverExecutionStart(
    sessionId: string,
    fromAgent: string,
    toAgent: string
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: fromAgent,
      event: 'handover_execution_start',
      data: {
        from_agent: fromAgent,
        to_agent: toAgent
      }
    };

    this.writeDebugLog(entry);

    pinoLog.event('handover.execution.start', {
      session_id: sessionId,
      from_agent: fromAgent,
      to_agent: toAgent
    });
  }

  /**
   * Log handover execution complete
   */
  static logHandoverExecutionComplete(
    sessionId: string,
    fromAgent: string,
    toAgent: string,
    success: boolean,
    error?: string
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: fromAgent,
      event: 'handover_execution_complete',
      data: {
        from_agent: fromAgent,
        to_agent: toAgent,
        success,
        error
      }
    };

    this.writeDebugLog(entry);

    if (success) {
      pinoLog.event('handover.execution.complete', {
        session_id: sessionId,
        from_agent: fromAgent,
        to_agent: toAgent
      });
    } else {
      pinoLog.error('handover.execution.failed', {
        session_id: sessionId,
        from_agent: fromAgent,
        to_agent: toAgent,
        error
      });
    }
  }

  /**
   * Log handover check error
   */
  static logError(
    sessionId: string,
    currentAgent: string,
    error: Error | string
  ): void {
    const entry: HandoverLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      current_agent: currentAgent,
      event: 'handover_check_error',
      data: {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    };

    this.writeDebugLog(entry);

    pinoLog.error('handover.check.error', {
      session_id: sessionId,
      current_agent: currentAgent,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  /**
   * Write entry to debug log file (JSONL format)
   */
  private static writeDebugLog(entry: HandoverLogEntry): void {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.DEBUG_LOG_PATH, line, 'utf8');
    } catch (error) {
      // Don't throw - logging should never crash the app
      console.error('[HandoverLogger] Failed to write debug log:', error);
    }
  }

  /**
   * Get recent handover decisions for debugging
   */
  static getRecentDecisions(limit: number = 100): HandoverLogEntry[] {
    try {
      if (!fs.existsSync(this.DEBUG_LOG_PATH)) {
        return [];
      }

      const content = fs.readFileSync(this.DEBUG_LOG_PATH, 'utf8');
      const lines = content.trim().split('\n');
      const recentLines = lines.slice(-limit);

      return recentLines
        .map(line => {
          try {
            return JSON.parse(line) as HandoverLogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is HandoverLogEntry => entry !== null);
    } catch (error) {
      console.error('[HandoverLogger] Failed to read debug log:', error);
      return [];
    }
  }

  /**
   * Clear debug log file (use for testing)
   */
  static clearDebugLog(): void {
    try {
      if (fs.existsSync(this.DEBUG_LOG_PATH)) {
        fs.unlinkSync(this.DEBUG_LOG_PATH);
      }
      pinoLog.info('handover.logger.cleared', {
        log_path: this.DEBUG_LOG_PATH
      });
    } catch (error) {
      pinoLog.error('handover.logger.clear_failed', {
        error: String(error)
      });
    }
  }
}
