/**
 * Universal Response Quality Verifier (v11.4)
 * Evaluates response quality across ALL sources: SQL, KB, EQ, Unified
 *
 * Quality Standards:
 * - Warmth: Human empathy, validation, acknowledgment
 * - Action: Concrete next steps, actionable guidance
 * - No Artifacts: Clean of training data contamination
 * - No Meta-Leak: No system instructions visible
 * - Student-Centric: Personalized, not generic
 * - Appropriate: Tone matches query category
 */

import { openai } from '../ai/openai.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('response-verifier');

export interface ResponseQualityStandards {
  warmth: boolean;
  action: boolean;
  noArtifacts: boolean;
  noMetaLeak: boolean;
  studentCentric: boolean;
  appropriate: boolean;
}

export interface QualityScores {
  warmth: number;      // 0-100
  action: number;      // 0-100
  overall: number;     // 0-100
}

export interface QualityVerification {
  standards: ResponseQualityStandards;
  scores: QualityScores;
  issues: string[];
  suggestions: string[];
  needsHealing: boolean;
}

export interface VerificationContext {
  category?: string;
  intent?: string;
  expectedTone?: 'factual' | 'empathetic' | 'balanced';
  evidence?: {
    sql?: boolean;
    kb?: boolean;
    eq?: boolean;
  };
}

/**
 * Verify response quality using LLM-based evaluation
 * Works universally for any query category or source
 */
export async function verifyResponseQuality(
  query: string,
  response: string,
  source: 'sql' | 'kb' | 'eq' | 'unified',
  studentId: string,
  context?: VerificationContext
): Promise<QualityVerification> {

  const startTime = Date.now();

  try {
    const verificationPrompt = buildUniversalVerificationPrompt(
      query,
      response,
      source,
      context
    );

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: verificationPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1000
    });

    const latency = Date.now() - startTime;
    const result = JSON.parse(completion.choices[0].message.content || '{}');

    // Ensure all required fields exist with defaults
    const verification: QualityVerification = {
      standards: {
        warmth: result.standards?.warmth ?? false,
        action: result.standards?.action ?? false,
        noArtifacts: result.standards?.noArtifacts ?? true,
        noMetaLeak: result.standards?.noMetaLeak ?? true,
        studentCentric: result.standards?.studentCentric ?? false,
        appropriate: result.standards?.appropriate ?? true
      },
      scores: {
        warmth: result.scores?.warmth ?? 0,
        action: result.scores?.action ?? 0,
        overall: result.scores?.overall ?? 0
      },
      issues: result.issues ?? [],
      suggestions: result.suggestions ?? [],
      needsHealing: result.needsHealing ?? false
    };

    log.event('response_quality.verified', {
      source,
      studentId,
      warmth_score: verification.scores.warmth,
      action_score: verification.scores.action,
      overall_score: verification.scores.overall,
      needs_healing: verification.needsHealing,
      latency_ms: latency
    });

    return verification;

  } catch (error: any) {
    log.event('response_quality.verification_error', {
      source,
      studentId,
      error: error.message
    });

    // Return safe defaults on error
    return {
      standards: {
        warmth: false,
        action: false,
        noArtifacts: true,
        noMetaLeak: true,
        studentCentric: false,
        appropriate: true
      },
      scores: {
        warmth: 0,
        action: 0,
        overall: 0
      },
      issues: ['Verification failed: ' + error.message],
      suggestions: ['Manual review recommended'],
      needsHealing: true
    };
  }
}

function buildUniversalVerificationPrompt(
  query: string,
  response: string,
  source: string,
  context?: VerificationContext
): string {
  return `You are a response quality evaluator for an AI college counselor named Jenny.

QUERY TYPE: ${source.toUpperCase()} (${context?.category || 'unknown'})
STUDENT QUERY: "${query}"

RESPONSE TO EVALUATE:
"""
${response}
"""

---

EVALUATION CRITERIA (apply universally to ALL response types):

1. WARMTH (0-100):
   - Does response acknowledge the student as a person?
   - Is there empathy, validation, or emotional acknowledgment?
   - Examples: "I hear you", "I understand", "That makes sense", "Great question", "I see", "I'm sorry"
   - IMPORTANT: Even factual queries need human warmth ("Here's what I found for you...")
   - Score 0 if robotic/cold, 100 if genuinely warm and empathetic

2. ACTION (0-100):
   - Does response provide clear next steps?
   - Is guidance concrete and actionable?
   - Examples: "Here's what this means for you", "Next step:", "You can...", "Try this:", "First, X. Then, Y."
   - IMPORTANT: Even factual answers need action context ("Now that you know this, you can...")
   - Score 0 if no guidance, 100 if clear actionable steps

3. ARTIFACTS (detect contamination):
   - Training data leakage: "4/2? That's more than 2", "Happy Eid!", "Copy the most relevant insight"
   - JSON fragments: {"kind":"...", "value":"..."}, {\"role\":, {\"content\":
   - System instruction leaks: "As an AI...", "I cannot...", "[CONTEXT]", "**Next 1 step (today):**"
   - Meta-commentary: "Status check ➡️ scoreboard", markdown artifacts

4. META-LEAK (system instructions visible):
   - Check for leaked prompts, system instructions, or internal commands
   - Examples: "You are a...", "Your role is to...", "<think>", "</think>"

5. STUDENT-CENTRIC (personalization):
   - Does response reference student's actual context/data?
   - Is it personalized or generic?
   - Examples: "Looking at your profile...", "Based on your applications...", "You mentioned..."
   - Using student's name or specific details

6. APPROPRIATENESS (tone matching):
   - Does tone match query type?
   - Factual query → informative + warm
   - Emotional query → empathetic + supportive + actionable
   - Strategic query → analytical + empowering

---

SCORING GUIDELINES:
- Warmth threshold for pass: 50+ for factual queries, 70+ for emotional queries
- Action threshold for pass: 60+ for all queries
- Overall = (warmth + action) / 2
- needsHealing = true if ANY standard is false OR overall score < 70

---

Return JSON (strictly follow this format):
{
  "standards": {
    "warmth": true/false,
    "action": true/false,
    "noArtifacts": true/false,
    "noMetaLeak": true/false,
    "studentCentric": true/false,
    "appropriate": true/false
  },
  "scores": {
    "warmth": 0-100,
    "action": 0-100,
    "overall": 0-100
  },
  "issues": ["specific problem 1", "specific problem 2", ...],
  "suggestions": ["specific fix 1", "specific fix 2", ...],
  "needsHealing": true/false
}

Be strict but fair - students deserve high-quality responses.`;
}
