/**
 * v31.3: Deep Trace Debug Logger
 *
 * Purpose: Inch-by-inch logging for debugging Assessment Agent extraction issues
 * Writes detailed logs to file for easy analysis
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = '/Users/snazir/ivylevel-platform-v10/logs/debug';
const LOG_FILE = path.join(LOG_DIR, `assessment-debug-${new Date().toISOString().split('T')[0]}.log`);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export class DebugLogger {
  private static sessionLogs: Map<string, any[]> = new Map();

  /**
   * Log a debug event with full context
   */
  static log(category: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      category,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };

    // Console log
    console.log(`\n[DEBUG:${category}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // File log
    const logLine = `\n${'='.repeat(80)}\n[${timestamp}] [${category}] ${message}\n`;
    const dataLine = data ? `DATA: ${JSON.stringify(data, null, 2)}\n` : '';

    fs.appendFileSync(LOG_FILE, logLine + dataLine);
  }

  /**
   * Start tracking a new session
   */
  static startSession(sessionId: string, studentId: string): void {
    this.log('SESSION_START', `New session started`, {
      session_id: sessionId,
      student_id: studentId,
      log_file: LOG_FILE
    });

    this.sessionLogs.set(sessionId, []);
  }

  /**
   * Log extraction step
   */
  static logExtraction(step: string, data: any): void {
    this.log('EXTRACTION', step, data);
  }

  /**
   * Log database operation
   */
  static logDB(operation: string, data: any): void {
    this.log('DATABASE', operation, data);
  }

  /**
   * Log error with full stack
   */
  static logError(context: string, error: any): void {
    this.log('ERROR', context, {
      error: error.message || String(error),
      stack: error.stack,
      full_error: error
    });
  }

  /**
   * Get current log file path
   */
  static getLogFile(): string {
    return LOG_FILE;
  }

  /**
   * Flush all logs for a session
   */
  static flushSession(sessionId: string): void {
    const logs = this.sessionLogs.get(sessionId);
    if (logs) {
      this.log('SESSION_END', `Session completed with ${logs.length} events`, {
        session_id: sessionId,
        total_events: logs.length
      });
      this.sessionLogs.delete(sessionId);
    }
  }
}
