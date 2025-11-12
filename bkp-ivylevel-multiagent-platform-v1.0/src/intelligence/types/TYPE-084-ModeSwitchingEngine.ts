/**
 * TYPE-084: Mode-Switching Engine Intelligence
 *
 * Purpose: Detect when discovery mode is failing and switch to prescriptive mode
 *
 * Framework: Discovery Mode → Fallback Detection → Prescriptive Mode
 * - Discovery Mode (default): Build narrative from student responses
 * - Fallback Detection: Recognize when discovery is yielding no value
 * - Prescriptive Mode: Propose concrete paths when student lacks clarity
 *
 * Intelligence Extraction: Student 7 (Aarnav) - Cookie-Cutter Case
 * "After 15+ minutes of discovery yielded only 'not really' responses,
 * Jenny explicitly switched: 'You're cookie cutter. I'm going to be direct.'"
 *
 * Created: 2025-11-03
 * Version: v27.0 Assessment Agent Intelligence Types
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Response Quality Score (0-1)
 */
interface ResponseQuality {
  score: number; // 0-1 (0 = useless, 1 = highly valuable)
  signals: string[];
  is_engaged: boolean;
}

/**
 * Discovery Failure Indicators
 */
interface DiscoveryFailure {
  consecutive_low_quality_responses: number;
  generic_responses_count: number; // "I don't know", "not really", "maybe"
  passive_agreement_count: number; // "sure", "okay", "sounds good"
  no_authentic_passion_detected: boolean;
  threshold_reached: boolean;
}

/**
 * Prescriptive Path
 */
interface PrescriptivePath {
  path_id: string;
  path_title: string;
  rationale: string; // Why this path fits based on limited data
  narrative_formula: string; // e.g., "CS + Debate + Algorithmic Justice"
  confidence: number; // 0-1
  exploration_period_weeks: number; // Time to validate path
}

/**
 * Mode-Switching Result
 */
interface ModeSwitchingResult {
  current_mode: 'discovery' | 'prescriptive';
  should_switch: boolean;
  switch_reason?: string;
  discovery_failure?: DiscoveryFailure;
  prescriptive_paths?: PrescriptivePath[];
  confrontation_message?: string; // e.g., "You're cookie cutter right now"
}

// ============================================================================
// MODE-SWITCHING ENGINE INTELLIGENCE
// ============================================================================

export const TYPE_084_ModeSwitchingEngine: IntelligenceType = {
  type_id: 'TYPE-084',
  name: 'Mode-Switching Engine',
  category: 'assessment',

  trigger: (query: AgentQuery, facts: FactSet): boolean => {
    // Trigger when we're in assessment phase
    const assessmentFact = facts.getFirst('assessment_data');
    return assessmentFact !== null;
  },

  execute: async (query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> => {
    const startTime = Date.now();

    try {
      // Analyze conversation history for response quality
      const messages = extractConversationHistory(facts);
      const responseQuality = analyzeResponseQuality(messages);
      const discoveryFailure = detectDiscoveryFailure(responseQuality);

      // Determine if we should switch modes
      const currentMode = getCurrentMode(facts);
      const shouldSwitch = shouldSwitchMode(currentMode, discoveryFailure);

      let prescriptivePaths: PrescriptivePath[] = [];
      let confrontationMessage: string | undefined;

      if (shouldSwitch && currentMode === 'discovery') {
        // Generate prescriptive paths based on limited data available
        prescriptivePaths = generatePrescriptivePaths(facts, responseQuality);
        confrontationMessage = generateConfrontationMessage(discoveryFailure, facts);
      }

      const result: ModeSwitchingResult = {
        current_mode: currentMode,
        should_switch,
        switch_reason: shouldSwitch ? discoveryFailure.signals.join('; ') : undefined,
        discovery_failure: shouldSwitch ? discoveryFailure : undefined,
        prescriptive_paths: prescriptivePaths.length > 0 ? prescriptivePaths : undefined,
        confrontation_message,
      };

      return {
        type_id: 'TYPE-084',
        triggered: shouldSwitch,
        confidence: shouldSwitch ? 0.9 : 0.5,
        data: result,
        processing_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type_id: 'TYPE-084',
        triggered: false,
        confidence: 0,
        data: { error: String(error) },
        processing_time_ms: Date.now() - startTime,
      };
    }
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractConversationHistory(facts: FactSet): Array<{role: string; content: string; turn: number}> {
  // Extract message history from facts
  const conversationFacts = facts.getAll().filter(f =>
    f.category === 'conversation_history' || f.subtype === 'message'
  );

  return conversationFacts.map((f, idx) => ({
    role: (f.edges as any).role || 'user',
    content: (f.edges as any).content || '',
    turn: idx + 1,
  }));
}

function analyzeResponseQuality(messages: Array<{role: string; content: string; turn: number}>): ResponseQuality[] {
  return messages
    .filter(m => m.role === 'user')
    .map(msg => {
      const content = msg.content.toLowerCase().trim();
      const wordCount = content.split(/\s+/).length;

      // Low-value response patterns
      const genericPatterns = [
        /^not really\.?$/,
        /^i don'?t know\.?$/,
        /^maybe\.?$/,
        /^sure\.?$/,
        /^okay\.?$/,
        /^yeah\.?$/,
        /^no\.?$/,
      ];

      const isGeneric = genericPatterns.some(p => p.test(content));
      const isTooShort = wordCount < 3;
      const hasNoSpecifics = !content.match(/\b(because|when|where|specifically|example|like|love|passion|excited)\b/);

      let score = 1.0;
      const signals: string[] = [];

      if (isGeneric) {
        score -= 0.8;
        signals.push('generic_response');
      }
      if (isTooShort && !isGeneric) {
        score -= 0.4;
        signals.push('too_short');
      }
      if (hasNoSpecifics && wordCount > 3) {
        score -= 0.3;
        signals.push('no_specifics');
      }

      return {
        score: Math.max(0, score),
        signals,
        is_engaged: score > 0.4,
      };
    });
}

function detectDiscoveryFailure(responseQuality: ResponseQuality[]): DiscoveryFailure {
  const recentResponses = responseQuality.slice(-5); // Last 5 responses

  const consecutiveLowQuality = recentResponses.filter(r => r.score < 0.3).length;
  const genericCount = recentResponses.filter(r => r.signals.includes('generic_response')).length;
  const passiveCount = recentResponses.filter(r => r.score < 0.5 && r.score > 0).length;

  const avgRecentScore = recentResponses.reduce((sum, r) => sum + r.score, 0) / recentResponses.length;

  const threshold_reached = (
    consecutiveLowQuality >= 3 ||
    genericCount >= 4 ||
    avgRecentScore < 0.4
  );

  return {
    consecutive_low_quality_responses: consecutiveLowQuality,
    generic_responses_count: genericCount,
    passive_agreement_count: passiveCount,
    no_authentic_passion_detected: avgRecentScore < 0.3,
    threshold_reached,
  };
}

function getCurrentMode(facts: FactSet): 'discovery' | 'prescriptive' {
  const modeFact = facts.getFirst('assessment_mode');
  return (modeFact?.edges as any)?.mode || 'discovery';
}

function shouldSwitchMode(currentMode: 'discovery' | 'prescriptive', failure: DiscoveryFailure): boolean {
  if (currentMode === 'prescriptive') return false; // Already switched
  return failure.threshold_reached;
}

function generatePrescriptivePaths(facts: FactSet, responseQuality: ResponseQuality[]): PrescriptivePath[] {
  // Based on limited data available, propose 2-3 concrete paths
  const profile = facts.getFirst('student_profile');
  const demographics = (profile?.edges as any) || {};

  const paths: PrescriptivePath[] = [];

  // Path 1: Default STEM path with social impact twist
  paths.push({
    path_id: 'path_algorithmic_justice',
    path_title: 'Algorithmic Justice (CS + Social Impact)',
    rationale: 'Combines technical skills with real-world impact - addresses bias in algorithms, AI ethics, data privacy',
    narrative_formula: 'CS as Tool + [Your Voice] + Social Justice as Reason',
    confidence: 0.7,
    exploration_period_weeks: 12,
  });

  // Path 2: Adjacent field arbitrage
  paths.push({
    path_id: 'path_climate_tech',
    path_title: 'Climate Technology (Sustainability + Engineering)',
    rationale: 'Lower admissions competition than pure CS, institutional priority at top schools, tangible impact',
    narrative_formula: 'Engineering Problem-Solving + Environmental Urgency + Innovation',
    confidence: 0.65,
    exploration_period_weeks: 12,
  });

  return paths;
}

function generateConfrontationMessage(failure: DiscoveryFailure, facts: FactSet): string {
  // Generate reality-check message based on Jenny's patterns
  if (failure.no_authentic_passion_detected) {
    return "I'm going to be very direct with you. Right now, your profile is pretty cookie cutter. " +
           "I'm not hearing any genuine passion or authentic interest. That's okay - we can work with this - " +
           "but we need to be honest about where you are so we can build something real.";
  }

  if (failure.generic_responses_count >= 4) {
    return "I notice you're giving me a lot of 'not really' and 'I don't know' answers. " +
           "That tells me we need to approach this differently. Instead of me asking you to discover your passion, " +
           "let me propose some specific directions and we can explore which one feels right.";
  }

  return "Let me switch gears here. Instead of more questions, let me share some concrete paths " +
         "that could work for your profile, and you tell me which direction feels most interesting.";
}
