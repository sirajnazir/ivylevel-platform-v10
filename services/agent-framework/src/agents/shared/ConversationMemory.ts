/**
 * ConversationMemory.ts
 * Universal conversation state management for all agents
 *
 * Purpose:
 * - Track what's been asked (semantic, not exact match)
 * - Track what's been answered (with field mapping)
 * - Detect repetition across all agents
 * - Maintain conversation context
 *
 * Version: v36.0
 * Created: 2025-11-07
 */

import { Pool } from 'pg';

export interface ConversationTurn {
  turn_number: number;
  agent_id: string;
  question: string;
  question_intent: string;        // Semantic intent (e.g., "collect_current_classes")
  question_topics: string[];      // Topics mentioned (e.g., ["classes", "courses"])
  user_response: string;
  extracted_fields: string[];     // Canonical field names extracted
  extracted_data: Record<string, any>;
  frustration_signals: string[];  // Detected frustration indicators
  timestamp: Date;
}

export interface ConversationMemoryState {
  session_id: string;
  student_id: string;
  turns: ConversationTurn[];
  collected_fields: Set<string>;  // All canonical fields collected so far
  topic_coverage: Map<string, number>; // How many times each topic was asked
  frustration_level: number;      // 0-100 scale
  last_updated: Date;
}

export class ConversationMemory {
  private pool: Pool;
  private memoryCache: Map<string, ConversationMemoryState> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Load conversation memory for a session
   */
  async load(sessionId: string, studentId: string = ''): Promise<ConversationMemoryState> {
    // Check cache first
    if (this.memoryCache.has(sessionId)) {
      return this.memoryCache.get(sessionId)!;
    }

    // Load from database
    try {
      const result = await this.pool.query(
        `SELECT conversation_memory
         FROM multiagent_sessions
         WHERE id = $1`,
        [sessionId]
      );

      if (result.rows.length > 0 && result.rows[0].conversation_memory) {
        const memory = this.deserializeMemory(result.rows[0].conversation_memory);
        this.memoryCache.set(sessionId, memory);
        return memory;
      }
    } catch (error) {
      console.error('[ConversationMemory] Load error:', error);
    }

    // Create new memory state
    const newMemory: ConversationMemoryState = {
      session_id: sessionId,
      student_id: studentId,
      turns: [],
      collected_fields: new Set<string>(),
      topic_coverage: new Map<string, number>(),
      frustration_level: 0,
      last_updated: new Date(),
    };

    this.memoryCache.set(sessionId, newMemory);
    return newMemory;
  }

  /**
   * Add a conversation turn to memory
   */
  async addTurn(
    sessionId: string,
    agentId: string,
    question: string,
    userResponse: string,
    extractedData: Record<string, any>
  ): Promise<void> {
    const memory = await this.load(sessionId, '');

    // Analyze question intent and topics
    const questionIntent = this.extractIntent(question);
    const questionTopics = this.extractTopics(question);

    // Detect frustration in user response
    const frustrationSignals = this.detectFrustrationSignals(userResponse);

    // Get canonical field names from extracted data
    const extractedFields = Object.keys(extractedData);

    const turn: ConversationTurn = {
      turn_number: memory.turns.length + 1,
      agent_id: agentId,
      question,
      question_intent,
      question_topics,
      user_response: userResponse,
      extracted_fields,
      extracted_data,
      frustration_signals,
      timestamp: new Date(),
    };

    // Update memory state
    memory.turns.push(turn);

    // Track collected fields
    extractedFields.forEach(field => memory.collected_fields.add(field));

    // Track topic coverage
    questionTopics.forEach(topic => {
      const currentCount = memory.topic_coverage.get(topic) || 0;
      memory.topic_coverage.set(topic, currentCount + 1);
    });

    // Update frustration level
    if (frustrationSignals.length > 0) {
      memory.frustration_level = Math.min(100, memory.frustration_level + 20);
    } else {
      // Decay frustration over time
      memory.frustration_level = Math.max(0, memory.frustration_level - 5);
    }

    memory.last_updated = new Date();

    // Save to database
    await this.save(memory);
  }

  /**
   * Check if a topic has been asked about recently
   */
  hasRecentlyAskedAbout(
    memory: ConversationMemoryState,
    topic: string,
    lookbackTurns: number = 5
  ): boolean {
    const recentTurns = memory.turns.slice(-lookbackTurns);

    return recentTurns.some(turn =>
      turn.question_topics.includes(topic) ||
      turn.question_intent.includes(topic)
    );
  }

  /**
   * Check if field has been collected (with semantic matching)
   * Note: Requires CanonicalFieldMapper import - will be added in integration
   */
  hasCollectedField(
    memory: ConversationMemoryState,
    fieldName: string
  ): boolean {
    // Direct match
    if (memory.collected_fields.has(fieldName)) {
      return true;
    }

    // Semantic match will be added when CanonicalFieldMapper is integrated
    return false;
  }

  /**
   * Get frustration level (0-100)
   */
  getFrustrationLevel(memory: ConversationMemoryState): number {
    return memory.frustration_level;
  }

  /**
   * Extract intent from question (semantic understanding)
   */
  private extractIntent(question: string): string {
    const q = question.toLowerCase();

    // Intent patterns
    if (q.includes('grade') || q.includes('year')) return 'collect_grade';
    if (q.includes('school') || q.includes('attend')) return 'collect_school';
    if (q.includes('class') || q.includes('course') || q.includes('taking')) return 'collect_classes';
    if (q.includes('interest') || q.includes('passion') || q.includes('love')) return 'collect_interests';
    if (q.includes('major') || q.includes('study')) return 'collect_major';
    if (q.includes('activity') || q.includes('extracurricular')) return 'collect_activities';
    if (q.includes('award') || q.includes('recognition')) return 'collect_awards';
    if (q.includes('leadership') || q.includes('lead')) return 'collect_leadership';
    if (q.includes('goal') || q.includes('dream')) return 'collect_goals';

    return 'general_inquiry';
  }

  /**
   * Extract topics from question
   */
  private extractTopics(question: string): string[] {
    const topics: string[] = [];
    const q = question.toLowerCase();

    const topicKeywords = [
      'grade', 'school', 'classes', 'courses', 'subjects',
      'interests', 'passion', 'major', 'study',
      'activities', 'extracurricular', 'clubs', 'sports',
      'awards', 'recognition', 'competitions',
      'leadership', 'goals', 'dream', 'college'
    ];

    topicKeywords.forEach(keyword => {
      if (q.includes(keyword)) {
        topics.push(keyword);
      }
    });

    return topics;
  }

  /**
   * Detect frustration signals in user response
   */
  private detectFrustrationSignals(response: string): string[] {
    const signals: string[] = [];
    const r = response.toLowerCase();

    const frustrationPatterns = [
      { pattern: /already (told|said|mentioned|shared)/, signal: 'repetition_complaint' },
      { pattern: /i (just )?told you/, signal: 'repetition_complaint' },
      { pattern: /i (already )?said that/, signal: 'repetition_complaint' },
      { pattern: /why (are you|do you) (asking|ask) again/, signal: 'questioning_repetition' },
      { pattern: /(stop|please stop) asking/, signal: 'explicit_request_to_stop' },
      { pattern: /i don't know what else to (say|tell you)/, signal: 'exhaustion' },
      { pattern: /same question/, signal: 'repetition_complaint' },
      { pattern: /(again|repeat)/, signal: 'repetition_detected' },
    ];

    frustrationPatterns.forEach(({ pattern, signal }) => {
      if (pattern.test(r)) {
        signals.push(signal);
      }
    });

    return signals;
  }

  /**
   * Save memory to database
   */
  private async save(memory: ConversationMemoryState): Promise<void> {
    try {
      const serialized = this.serializeMemory(memory);

      await this.pool.query(
        `UPDATE multiagent_sessions
         SET conversation_memory = $1::jsonb
         WHERE id = $2`,
        [serialized, memory.session_id]
      );

      // Update cache
      this.memoryCache.set(memory.session_id, memory);

    } catch (error) {
      console.error('[ConversationMemory] Save error:', error);
    }
  }

  /**
   * Serialize memory for storage
   */
  private serializeMemory(memory: ConversationMemoryState): string {
    return JSON.stringify({
      session_id: memory.session_id,
      student_id: memory.student_id,
      turns: memory.turns,
      collected_fields: Array.from(memory.collected_fields),
      topic_coverage: Array.from(memory.topic_coverage.entries()),
      frustration_level: memory.frustration_level,
      last_updated: memory.last_updated.toISOString(),
    });
  }

  /**
   * Deserialize memory from storage
   */
  private deserializeMemory(data: any): ConversationMemoryState {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    return {
      session_id: parsed.session_id,
      student_id: parsed.student_id,
      turns: parsed.turns || [],
      collected_fields: new Set<string>(parsed.collected_fields || []),
      topic_coverage: new Map<string, number>(parsed.topic_coverage || []),
      frustration_level: parsed.frustration_level || 0,
      last_updated: new Date(parsed.last_updated),
    };
  }
}

// Export singleton
let conversationMemoryInstance: ConversationMemory | null = null;

export function initConversationMemory(pool: Pool): void {
  conversationMemoryInstance = new ConversationMemory(pool);
  console.log('[v36.0] ConversationMemory initialized');
}

export function getConversationMemory(): ConversationMemory {
  if (!conversationMemoryInstance) {
    throw new Error('ConversationMemory not initialized. Call initConversationMemory() first.');
  }
  return conversationMemoryInstance;
}
