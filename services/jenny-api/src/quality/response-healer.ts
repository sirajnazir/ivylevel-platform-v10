/**
 * Universal Response Healer (v11.4)
 * Automatically fixes responses that fail quality standards
 * Works for ALL sources: SQL, KB, EQ, Unified
 *
 * Self-healing approach:
 * 1. Verify response quality
 * 2. If fails, regenerate with explicit healing instructions
 * 3. Verify again (max 2 attempts)
 * 4. Return best effort with quality scores
 */

import { openai } from '../ai/openai.js';
import { verifyResponseQuality, QualityVerification, VerificationContext } from './response-verifier.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('response-healer');

export interface HealingResult {
  healed: boolean;
  finalResponse: string;
  attempts: number;
  improvements: {
    before: QualityVerification;
    after: QualityVerification;
  };
}

export interface StudentContext {
  studentId?: string;
  name?: string;
  profile?: any;
  recentData?: any;
}

/**
 * Heal response using iterative LLM-based improvement
 * Attempts to fix quality issues while preserving factual content
 */
export async function healResponse(
  query: string,
  response: string,
  source: 'sql' | 'kb' | 'eq' | 'unified',
  studentId: string,
  context?: VerificationContext & { studentContext?: StudentContext },
  maxAttempts: number = 2
): Promise<HealingResult> {

  let currentResponse = response;
  let attempts = 0;
  let initialVerification: QualityVerification | null = null;

  const startTime = Date.now();

  while (attempts < maxAttempts) {
    // Verify current response quality
    const verification = await verifyResponseQuality(
      query,
      currentResponse,
      source,
      studentId,
      context
    );

    if (attempts === 0) {
      initialVerification = verification;
    }

    // If quality is acceptable, we're done
    if (!verification.needsHealing) {
      const totalLatency = Date.now() - startTime;

      log.event('response_healing.success', {
        source,
        studentId,
        attempts: attempts + 1,
        final_score: verification.scores.overall,
        latency_ms: totalLatency
      });

      return {
        healed: attempts > 0,
        finalResponse: currentResponse,
        attempts: attempts + 1,
        improvements: {
          before: initialVerification!,
          after: verification
        }
      };
    }

    // Heal the response
    const healedResponse = await applyHealing(
      query,
      currentResponse,
      verification,
      source,
      context?.studentContext
    );

    currentResponse = healedResponse;
    attempts++;

    log.event('response_healing.attempt', {
      source,
      studentId,
      attempt: attempts,
      issues_found: verification.issues.length,
      before_score: verification.scores.overall
    });
  }

  // Max attempts reached, return best effort
  const finalVerification = await verifyResponseQuality(
    query,
    currentResponse,
    source,
    studentId,
    context
  );

  const totalLatency = Date.now() - startTime;

  log.event('response_healing.max_attempts', {
    source,
    studentId,
    final_score: finalVerification.scores.overall,
    remaining_issues: finalVerification.issues,
    latency_ms: totalLatency
  });

  return {
    healed: true,
    finalResponse: currentResponse,
    attempts,
    improvements: {
      before: initialVerification!,
      after: finalVerification
    }
  };
}

async function applyHealing(
  query: string,
  response: string,
  verification: QualityVerification,
  source: string,
  studentContext?: StudentContext
): Promise<string> {

  const healingPrompt = buildHealingPrompt(
    query,
    response,
    verification,
    source,
    studentContext
  );

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',  // Use stronger model for healing
      messages: [{ role: 'user', content: healingPrompt }],
      temperature: 0.7,
      max_tokens: 800
    });

    const healed = completion.choices[0].message.content || response;

    log.event('response_healing.applied', {
      source,
      before_length: response.length,
      after_length: healed.length,
      issues_addressed: verification.issues.length
    });

    return healed;

  } catch (error: any) {
    log.event('response_healing.error', {
      source,
      error: error.message
    });

    // Return original response if healing fails
    return response;
  }
}

function buildHealingPrompt(
  query: string,
  response: string,
  verification: QualityVerification,
  source: string,
  studentContext?: StudentContext
): string {

  const issuesText = verification.issues.length > 0
    ? verification.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
    : 'No specific issues detected, but overall quality needs improvement';

  const suggestionsText = verification.suggestions.length > 0
    ? verification.suggestions.map((sug, i) => `${i + 1}. ${sug}`).join('\n')
    : 'Improve warmth and actionability';

  const contextText = studentContext
    ? `\n\nSTUDENT CONTEXT:\nName: ${studentContext.name || 'Unknown'}\nID: ${studentContext.studentId}\n${studentContext.profile ? `Profile: ${JSON.stringify(studentContext.profile, null, 2)}` : ''}`
    : '';

  return `You are improving a response from an AI college counselor named Jenny.

STUDENT QUERY: "${query}"
SOURCE: ${source.toUpperCase()}

CURRENT RESPONSE:
"""
${response}
"""

ISSUES DETECTED:
${issuesText}

SUGGESTIONS FOR IMPROVEMENT:
${suggestionsText}

QUALITY SCORES (need improvement):
- Warmth: ${verification.scores.warmth}/100 ${verification.standards.warmth ? '✓' : '✗ NEEDS FIX'}
- Action: ${verification.scores.action}/100 ${verification.standards.action ? '✓' : '✗ NEEDS FIX'}
- Overall: ${verification.scores.overall}/100

---

REWRITE INSTRUCTIONS:

1. FIX ALL ISSUES: Address every item in the issues list above

2. PRESERVE FACTUAL CONTENT: Keep all data/facts from original response
   - Do NOT change numbers, dates, names, or factual information
   - Do NOT add fake data or make up information

3. ADD WARMTH (if warmth score < 70):
   - Start with human acknowledgment: "I see you're asking about...", "Great question!", "I hear you"
   - Use conversational tone, not robotic
   - Show you understand this matters to the student
   - Examples: "I understand this is important to you", "Let me help you with that"

4. ADD ACTION (if action score < 70):
   - End with clear next steps: "Here's what this means for you:", "Next, you can..."
   - Make guidance concrete and achievable
   - Connect facts to student's journey
   - Examples: "Based on this, I'd recommend...", "Your next step should be..."

5. REMOVE ARTIFACTS (if noArtifacts = false):
   - Strip training data contamination: "4/2? That's more than 2", "Happy Eid!", etc.
   - Remove JSON fragments: {"kind":"...", "value":"..."}
   - Remove system instruction leaks: "As an AI...", "[CONTEXT]", "**Next 1 step (today):**"
   - Remove markdown artifacts and meta-commentary

6. PERSONALIZE (if studentCentric = false):
   - Reference student context if available
   - Use "you/your" language
   - Connect to student's specific situation
   - Make it feel like Jenny is talking TO this student, not giving generic advice

7. MAINTAIN APPROPRIATENESS:
   - Match tone to query type
   - If emotional query → be empathetic and supportive
   - If factual query → be informative but still warm
   - If strategic query → be analytical but empowering
${contextText}

---

Return ONLY the improved response (no explanations, no meta-commentary, no markdown headers, just the final response text that Jenny would say to the student):`;
}
