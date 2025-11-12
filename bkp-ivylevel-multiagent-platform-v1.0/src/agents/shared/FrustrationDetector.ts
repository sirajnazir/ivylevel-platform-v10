/**
 * FrustrationDetector.ts
 * Universal student frustration detection for all agents
 *
 * Purpose:
 * - Detect when student is frustrated
 * - Identify specific frustration signals
 * - Provide recommendations for agent behavior
 *
 * Version: v36.0
 * Created: 2025-11-07
 */

export interface FrustrationAnalysis {
  is_frustrated: boolean;
  frustration_level: 'none' | 'mild' | 'moderate' | 'high';
  signals_detected: string[];
  suggested_action: 'continue' | 'apologize' | 'skip_topic' | 'end_session';
  reasoning: string;
}

export class FrustrationDetector {
  /**
   * Analyze user response for frustration
   */
  static analyze(
    userResponse: string,
    conversationHistory: string[] = []
  ): FrustrationAnalysis {
    const signals: string[] = [];
    const r = userResponse.toLowerCase().trim();

    // Pattern 1: Explicit repetition complaints
    if (/already (told|said|mentioned|shared|answered)/.test(r)) {
      signals.push('explicit_repetition_complaint');
    }
    if (/i (just )?told you/.test(r)) {
      signals.push('explicit_repetition_complaint');
    }
    if (/i (already )?said that/.test(r)) {
      signals.push('explicit_repetition_complaint');
    }

    // Pattern 2: Questioning repetition
    if (/why (are you|do you) (asking|ask) (me )?(this |that )?again/.test(r)) {
      signals.push('questioning_repetition');
    }
    if (/same question/.test(r)) {
      signals.push('questioning_repetition');
    }

    // Pattern 3: Explicit requests to stop
    if (/(stop|please stop) asking/.test(r)) {
      signals.push('explicit_stop_request');
    }
    if (/can we move on/.test(r)) {
      signals.push('explicit_stop_request');
    }

    // Pattern 4: Exhaustion
    if (/i don't know what else to (say|tell you)/.test(r)) {
      signals.push('exhaustion');
    }
    if (/nothing (else|more)/.test(r)) {
      signals.push('exhaustion');
    }

    // Pattern 5: Short, dismissive responses
    if (r.length < 10 && /^(idk|whatever|sure|fine|ok|okay|yes|no)\.?$/.test(r)) {
      signals.push('dismissive_response');
    }

    // v36.2: Pattern 5a: Short affirmative (very common in loops)
    if (/^(yes|yeah|yep|sure|ok|okay)\s*\.?$/i.test(r)) {
      signals.push('short_affirmative');
    }

    // v36.2: Pattern 5b: Short negative (indicates disengagement)
    if (/^(no|nope|nah)\s*\.?$/i.test(r)) {
      signals.push('short_negative');
    }

    // v36.2: Pattern 5c: Explicit repetition reference
    if (/same as before|like i said|as i mentioned/i.test(r)) {
      signals.push('explicit_repetition');
    }

    // Pattern 6: Repetition of previous answer
    if (conversationHistory.length > 0) {
      const lastResponse = conversationHistory[conversationHistory.length - 1]?.toLowerCase();
      if (lastResponse && r === lastResponse) {
        signals.push('repeated_answer');
      }
    }

    // Determine frustration level
    let frustrationLevel: 'none' | 'mild' | 'moderate' | 'high' = 'none';
    if (signals.length === 0) {
      frustrationLevel = 'none';
    } else if (signals.length === 1 && signals.includes('dismissive_response')) {
      frustrationLevel = 'mild';
    } else if (signals.length === 1) {
      frustrationLevel = 'moderate';
    } else {
      frustrationLevel = 'high';
    }

    // Suggest action
    let suggestedAction: 'continue' | 'apologize' | 'skip_topic' | 'end_session' = 'continue';
    let reasoning = 'No frustration detected';

    if (frustrationLevel === 'mild') {
      suggestedAction = 'continue';
      reasoning = 'Mild frustration - continue but be aware';
    } else if (frustrationLevel === 'moderate') {
      suggestedAction = 'apologize';
      reasoning = 'Moderate frustration - acknowledge and move to next topic';
    } else if (frustrationLevel === 'high') {
      if (signals.includes('explicit_stop_request')) {
        suggestedAction = 'skip_topic';
        reasoning = 'High frustration with explicit stop request - skip this topic entirely';
      } else {
        suggestedAction = 'skip_topic';
        reasoning = 'High frustration - apologize and skip to different topic';
      }
    }

    const analysis: FrustrationAnalysis = {
      is_frustrated: signals.length > 0,
      frustration_level: frustrationLevel,
      signals_detected: signals,
      suggested_action: suggestedAction,
      reasoning,
    };

    if (signals.length > 0) {
      console.log('[FrustrationDetector] 🚨 FRUSTRATION DETECTED:', {
        level: frustrationLevel,
        signals,
        action: suggestedAction,
      });
    }

    return analysis;
  }

  /**
   * Generate apology message based on frustration type
   */
  static generateApology(signals: string[]): string {
    if (signals.includes('explicit_repetition_complaint')) {
      return "I apologize - you're absolutely right, you already shared that with me. Let me move on to something else.";
    }
    if (signals.includes('explicit_stop_request')) {
      return "I hear you - let's move forward. I appreciate your patience.";
    }
    if (signals.includes('exhaustion')) {
      return "No worries at all! You've given me great information. Let's shift gears.";
    }
    return "I appreciate you sharing that. Let me ask about something different.";
  }
}
