/**
 * EQ Pre-Classifier - Emotional Query Detection (v11.3)
 *
 * CAT-3 COMPONENT - Priority routing for emotional/coaching queries
 *
 * Purpose: Detect emotional/coaching queries BEFORE fact routing to ensure
 * they route to fine-tuned adapter instead of SQL/KB.
 *
 * Safety: ✅ Early exit pattern - does not modify CAT-1/CAT-2 flows
 * - CAT-1 (SQL facts): Only triggered if NOT emotional query
 * - CAT-2 (KB/RAG): Only triggered if NOT emotional query
 * - CAT-3 (EQ): Triggered FIRST if emotional query detected
 */

import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('eq-classifier');

/**
 * Emotional query patterns organized by category
 * These patterns indicate the user needs emotional support/coaching,
 * not factual information
 */
const EQ_PATTERNS = {
  // Emotional states (stress, anxiety, overwhelm)
  emotional_state: [
    'stress', 'stressed', 'anxious', 'anxiety', 'overwhelm', 'overwhelmed',
    'panic', 'panicking', 'breakdown', 'feeling', 'scared', 'worried',
    'nervous', 'tired', 'exhausted', 'frustrated', 'angry', 'sad', 'depressed',
    'can\'t handle', 'too much', 'can\'t do this', 'haven\'t started', 'behind',
    'so many', 'too many', 'can\'t focus', 'can\'t breathe', 'heart is racing', 'help'
  ],

  // Rejections and disappointments
  rejection: [
    'rejected', 'didn\'t get in', 'didn\'t make it', 'waitlisted',
    'deferred', 'denied', 'turned down', 'not accepted', 'don\'t know what to do'
  ],

  // Self-doubt and imposter syndrome
  self_doubt: [
    'not good enough', 'imposter', 'don\'t belong', 'don\'t deserve',
    'everyone else', 'smarter than me', 'not smart enough', 'feel behind',
    'everyone seems', 'can\'t compete', 'too low', 'don\'t think i\'m'
  ],

  // Celebration and wins
  celebration: [
    'got in!', 'accepted!', 'got into', 'won ', 'won!', 'accepted to',
    'made it', 'i got accepted', 'just got in', 'scholarship', 'full ride', 'got a scholarship'
  ],

  // Permissioning (seeking validation)
  permissioning: [
    'can i ', 'is it okay', 'should i ', 'am i allowed', 'is it bad if',
    'would it be okay', 'can i take a break', 'skip '
  ],

  // Time management and planning
  time_planning: [
    'help me plan', 'what should i do', 'first 60 minutes', 'daily plan',
    'how do i organize', 'prioritize', 'running out of time',
    'deadline', 'due tomorrow', 'essays due', 'due next week', 'apps due',
    'haven\'t started any', 'need to start', 'where do i start', 'text to counselor'
  ],

  // Motivation and passion
  motivation: [
    'stay motivated', 'lost passion', 'lost motivation', 'lost interest',
    'don\'t want to', 'why bother', 'giving up', 'want to quit'
  ],

  // Parent/family conflict
  parent_conflict: [
    'parents say', 'parents want', 'parents think', 'mom says', 'dad says',
    'family wants', 'parents won\'t let', 'parents are forcing'
  ],

  // Normalization (comparing to peers)
  normalization: [
    'everyone else', 'everyone has', 'everyone already', 'i\'m the only one',
    'everyone seems', 'behind everyone'
  ],

  // Future pacing
  future_pacing: [
    'what will happen', 'what happens after', 'what will college be like',
    'what comes next', 'after i submit'
  ],

  // Crisis language
  crisis: [
    'total breakdown', 'can\'t do this anymore', 'giving up', 'want to die',
    'ending it', 'not worth it', 'hate myself'
  ]
};

/**
 * Check if query is an emotional/coaching query
 *
 * @param query - User message
 * @returns true if emotional query (CAT-3), false if fact query (CAT-1/CAT-2)
 */
export function isEQQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Check each category of EQ patterns
  for (const [category, patterns] of Object.entries(EQ_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerQuery.includes(pattern)) {
        log.event('eq_classifier.match', {
          category,
          pattern,
          query_preview: query.slice(0, 80)
        });
        return true;
      }
    }
  }

  // v11.4: Fallback detection for emotional queries without explicit keywords
  // If query contains personal pronouns + emotional/distress indicators, classify as EQ
  const hasPersonalPronoun = /\b(i|my|i'm|i've|me|myself)\b/i.test(lowerQuery);
  const hasEmotionalIndicator = /\b(feel|feeling|can't|cannot|won't|don't|haven't|need|want|help|worried|scared|afraid|behind|lost)\b/i.test(lowerQuery);
  const hasDistressIndicator = /\b(breakdown|crisis|panic|anxious|stressed|overwhelmed|worried)\b/i.test(lowerQuery);

  if (hasPersonalPronoun && (hasEmotionalIndicator || hasDistressIndicator)) {
    log.event('eq_classifier.fallback_match', {
      method: 'pronoun+emotional',
      query_preview: query.slice(0, 80)
    });
    return true;
  }

  // Not an emotional query - proceed to fact routing
  log.event('eq_classifier.no_match', {
    query_preview: query.slice(0, 80)
  });
  return false;
}

/**
 * Get matched EQ category for observability
 * Useful for tracking which emotional patterns trigger most
 */
export function getEQCategory(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  for (const [category, patterns] of Object.entries(EQ_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerQuery.includes(pattern)) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Confidence score for EQ classification
 * Higher score = more confident this is emotional query
 *
 * @param query - User message
 * @returns 0.0-1.0 confidence score
 */
export function getEQConfidence(query: string): number {
  const lowerQuery = query.toLowerCase();
  let matches = 0;
  let totalWeight = 0;

  // Weight patterns by category importance
  const categoryWeights: Record<string, number> = {
    crisis: 1.0,           // Highest priority
    emotional_state: 0.9,
    rejection: 0.9,
    celebration: 0.8,
    self_doubt: 0.8,
    motivation: 0.7,
    parent_conflict: 0.7,
    permissioning: 0.6,
    time_planning: 0.5,    // Lower priority (could be fact query)
    normalization: 0.6,
    future_pacing: 0.5
  };

  for (const [category, patterns] of Object.entries(EQ_PATTERNS)) {
    const weight = categoryWeights[category] || 0.5;
    for (const pattern of patterns) {
      if (lowerQuery.includes(pattern)) {
        matches++;
        totalWeight += weight;
      }
    }
  }

  // Normalize: 1+ matches with high weight = high confidence
  if (matches === 0) return 0.0;
  if (matches === 1) return totalWeight; // Single match = its weight
  return Math.min(1.0, totalWeight / matches * 1.2); // Multiple matches boost confidence
}
