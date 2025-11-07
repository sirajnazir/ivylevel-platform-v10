/**
 * ConversationIntelligenceConfig.ts
 * Configuration for Conversation Intelligence systems
 * Tune these values based on production data
 *
 * Version: v36.0
 * Created: 2025-11-07
 */

export const ConversationIntelligenceConfig = {
  // QuestionDeduplicationEngine
  deduplication: {
    similarity_threshold_block: 0.7,     // Block if >70% similar
    similarity_threshold_rephrase: 0.6,  // Warn if >60% similar
    lookback_turns: 5,                   // Check last 5 questions
  },

  // FrustrationDetector
  frustration: {
    mild_threshold: 1,      // 1 signal = mild
    moderate_threshold: 1,  // 1 explicit signal = moderate
    high_threshold: 2,      // 2+ signals = high
  },

  // ConversationMemory
  memory: {
    frustration_increment: 20,  // +20 per frustration signal
    frustration_decay: 5,        // -5 per good turn
    max_frustration: 100,
    frustration_action_threshold: 60,  // Take action at 60+
  },
};
