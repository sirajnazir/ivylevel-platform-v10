/**
 * QuestionDeduplicationEngine.ts
 * Universal repetitive question detection for all agents
 *
 * Purpose:
 * - Detect when asking same question (semantic, not exact)
 * - Prevent infinite loops
 * - Track topic coverage
 * - Suggest alternative questions
 *
 * Version: v36.0
 * Created: 2025-11-07
 */

import { ConversationMemoryState } from './ConversationMemory.js';
import { CanonicalFieldMapper } from './CanonicalFieldMapper.js';

export interface QuestionAnalysis {
  is_repetitive: boolean;
  similarity_score: number;      // 0-1, how similar to previous questions
  similar_to: string[];           // Previous questions that are similar
  topic: string;                  // Main topic of question
  intent: string;                 // What field is being collected
  recommended_action: 'block' | 'rephrase' | 'allow';
  reason: string;
}

export class QuestionDeduplicationEngine {
  /**
   * Analyze if a proposed question is repetitive
   */
  static analyze(
    proposedQuestion: string,
    memory: ConversationMemoryState,
    agentId: string
  ): QuestionAnalysis {
    // Extract question characteristics
    const proposedIntent = this.extractIntent(proposedQuestion);
    const proposedTopics = this.extractTopics(proposedQuestion);

    // Check recent questions (last 5 turns)
    const recentTurns = memory.turns.slice(-5);
    const similarQuestions: string[] = [];
    let maxSimilarity = 0;

    for (const turn of recentTurns) {
      const similarity = this.calculateSimilarity(
        proposedQuestion,
        turn.question,
        proposedIntent,
        turn.question_intent,
        proposedTopics,
        turn.question_topics
      );

      if (similarity > 0.6) {
        similarQuestions.push(turn.question);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }

    // Check if student has already provided data for this intent
    const canonicalField = this.intentToCanonicalField(proposedIntent);
    const hasCollectedData = canonicalField && memory.collected_fields.has(canonicalField);

    // Check frustration level
    const isFrustrated = memory.frustration_level > 40;

    // Determine action
    let recommendedAction: 'block' | 'rephrase' | 'allow' = 'allow';
    let reason = 'Question is unique and relevant';

    if (hasCollectedData && maxSimilarity > 0.7) {
      recommendedAction = 'block';
      reason = `Already collected data for "${canonicalField}" and question is ${(maxSimilarity * 100).toFixed(0)}% similar to previous`;
    } else if (maxSimilarity > 0.8) {
      recommendedAction = 'block';
      reason = `Question is ${(maxSimilarity * 100).toFixed(0)}% similar to recent question`;
    } else if (isFrustrated && maxSimilarity > 0.5) {
      recommendedAction = 'block';
      reason = `Student is frustrated (level: ${memory.frustration_level}) and question is similar`;
    } else if (maxSimilarity > 0.6) {
      recommendedAction = 'rephrase';
      reason = `Question is somewhat similar (${(maxSimilarity * 100).toFixed(0)}%), consider rephrasing`;
    }

    const analysis: QuestionAnalysis = {
      is_repetitive: similarQuestions.length > 0,
      similarity_score: maxSimilarity,
      similar_to: similarQuestions,
      topic: proposedTopics[0] || 'general',
      intent: proposedIntent,
      recommended_action: recommendedAction,
      reason,
    };

    console.log('[QuestionDeduplication] Analysis:', {
      proposed: proposedQuestion.substring(0, 60),
      similarity: (maxSimilarity * 100).toFixed(0) + '%',
      action: recommendedAction,
      reason,
    });

    return analysis;
  }

  /**
   * Calculate similarity between two questions
   */
  private static calculateSimilarity(
    q1: string,
    q2: string,
    intent1: string,
    intent2: string,
    topics1: string[],
    topics2: string[]
  ): number {
    // Intent match (50% weight)
    const intentMatch = intent1 === intent2 ? 0.5 : 0;

    // Topic overlap (30% weight)
    const topicIntersection = topics1.filter(t => topics2.includes(t));
    const topicUnion = [...new Set([...topics1, ...topics2])];
    const topicScore = topicUnion.length > 0
      ? (topicIntersection.length / topicUnion.length) * 0.3
      : 0;

    // Term overlap (20% weight)
    const terms1 = this.extractKeyTerms(q1);
    const terms2 = this.extractKeyTerms(q2);
    const termIntersection = terms1.filter(t => terms2.includes(t));
    const termUnion = [...new Set([...terms1, ...terms2])];
    const termScore = termUnion.length > 0
      ? (termIntersection.length / termUnion.length) * 0.2
      : 0;

    return intentMatch + topicScore + termScore;
  }

  /**
   * Extract intent from question
   */
  private static extractIntent(question: string): string {
    const q = question.toLowerCase();

    // Map to canonical field intents
    if (q.includes('grade') || q.includes('year')) return 'collect_student_grade';
    if (q.includes('school') || q.includes('attend')) return 'collect_high_school';
    if (q.includes('class') || q.includes('course') || q.includes('taking')) return 'collect_current_classes';
    if (q.includes('interest') || q.includes('passion') || q.includes('love')) return 'collect_interests';
    if (q.includes('major') || q.includes('study')) return 'collect_target_major';
    if (q.includes('activity') || q.includes('extracurricular')) return 'collect_activities';
    if (q.includes('award') || q.includes('recognition')) return 'collect_awards';
    if (q.includes('leadership') || q.includes('lead')) return 'collect_leadership_roles';
    if (q.includes('goal') || q.includes('dream')) return 'collect_target_colleges';

    return 'general_inquiry';
  }

  /**
   * Map intent to canonical field name
   */
  private static intentToCanonicalField(intent: string): string | null {
    const mapping: Record<string, string> = {
      'collect_student_grade': 'student_grade',
      'collect_high_school': 'high_school',
      'collect_current_classes': 'current_classes',
      'collect_interests': 'interests',
      'collect_target_major': 'target_major',
      'collect_activities': 'activities',
      'collect_awards': 'awards',
      'collect_leadership_roles': 'leadership_roles',
      'collect_target_colleges': 'target_colleges',
    };

    return mapping[intent] || null;
  }

  /**
   * Extract topics from question
   */
  private static extractTopics(question: string): string[] {
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
   * Extract key terms from question
   */
  private static extractKeyTerms(question: string): string[] {
    const q = question.toLowerCase();

    // Remove common question words
    const filtered = q.replace(/\b(what|which|how|where|when|why|tell|me|about|your|the|is|are|do|you|can|could|would)\b/g, '');

    // Split into words
    const words = filtered.split(/\s+/).filter(w => w.length > 3);

    return words;
  }
}
