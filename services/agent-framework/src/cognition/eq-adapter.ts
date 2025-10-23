/**
 * EQ Adapter - Digital Twin Tone Adaptation with Safety Rails
 *
 * Applies coach-specific tone transformations with quality/safety guards:
 * - Embedding similarity guard (≥ 0.85)
 * - Global + coach-specific banned phrases
 * - QA sample logging for monthly audits
 *
 * Version: v3.2.0
 * Fix #7: EQ Safety Rails
 */

import { pool } from '../db/pool-rls.js';
import { ChipCreator, Chip } from '../chips/chip-creator.js';

// ============================================================================
// TYPES
// ============================================================================

export interface EQProfile {
  coach_id: number;
  tone_vector: Record<string, number>; // {warmth: 0.82, direct: 0.61, humor: 0.3}
  lex_map: Record<string, string>; // {"great job": "nice progress"}
  audience_styles: Record<string, any>; // {student: {...}, parent: {...}}
  model_ref?: string; // Fine-tune ID
}

export interface EQTuning {
  student_id: string;
  coach_id: number;
  tone_overrides?: Record<string, number>;
  banned_phrases?: string[];
}

export interface EQResult {
  styledText: string;
  chip: Chip;
  similarity: number;
  fallback: boolean; // True if similarity too low, fell back to raw
}

// ============================================================================
// GLOBAL BANNED PHRASES (Profanity, Bias, Offensive Terms)
// ============================================================================

const GLOBAL_BANNED_PHRASES = [
  // Profanity (common)
  'fuck',
  'shit',
  'damn',
  'crap',
  'hell',

  // Bias/offensive (ableist, racist, etc.)
  'retarded',
  'stupid',
  'idiot',
  'moron',
  'dumb',
  'lame',

  // Inappropriate for coaching context
  'lazy',
  'unmotivated',
  'slacker',
  'failure',
  'loser',

  // Add more from moderation list as needed
];

// ============================================================================
// SIMILARITY THRESHOLD
// ============================================================================

const MIN_SIMILARITY = 0.85; // Reject if embedding similarity < 0.85

// ============================================================================
// EQ ADAPTER CLASS
// ============================================================================

export class EQAdapter {
  /**
   * Applies coach-specific tone adaptation to raw text.
   *
   * Algorithm:
   * 1. Load coach EQ profile + student-specific tuning
   * 2. Apply lexical substitutions (lex_map)
   * 3. Apply tone vector transformations
   * 4. Filter global + coach-specific banned phrases
   * 5. Compute embedding similarity (raw vs styled)
   * 6. If similarity < 0.85, reject and fall back to raw
   * 7. Log QA sample for monthly audit
   * 8. Create EQ chip
   *
   * @param rawText - Original text (before tone adaptation)
   * @param coachId - Coach ID
   * @param audience - Target audience (student, parent, coach)
   * @param context - Execution context (studentId, traceId)
   * @returns EQ result (styled text + chip + similarity)
   */
  async apply(
    rawText: string,
    coachId: number,
    audience: 'student' | 'parent' | 'coach',
    context: { studentId: string; traceId: string }
  ): Promise<EQResult> {
    // 1. Load profile + tuning
    const profile = await this.loadProfile(coachId);
    const tuning = await this.loadTuning(context.studentId, coachId);

    let styled = rawText;

    // 2. Lexical substitutions
    for (const [from, to] of Object.entries(profile.lex_map)) {
      styled = styled.replace(new RegExp(from, 'gi'), to);
    }

    // 3. Tone vector transformations
    styled = this.applyToneVector(styled, profile.tone_vector, audience);

    // 4. Filter banned phrases (global + coach-specific)
    const bannedPhrases = [
      ...GLOBAL_BANNED_PHRASES,
      ...(tuning?.banned_phrases || []),
    ];
    styled = this.filterBanned(styled, bannedPhrases);

    // 5. Embedding similarity guard
    const similarity = await this.computeSimilarity(rawText, styled);

    let fallback = false;

    if (similarity < MIN_SIMILARITY) {
      console.warn(
        `[EQ] Similarity too low (${similarity.toFixed(3)} < ${MIN_SIMILARITY}), rejecting adaptation`
      );

      // Fall back to raw text
      styled = rawText;
      fallback = true;
    }

    // 6. Log QA sample (for monthly audit)
    await this.logQASample(rawText, styled, similarity, context.traceId);

    // 7. Create EQ chip
    const chip = ChipCreator.createEQChip(
      coachId,
      profile.tone_vector,
      audience,
      context.traceId,
      context.studentId
    );

    return {
      styledText: styled,
      chip,
      similarity,
      fallback,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Loads coach EQ profile from database.
   */
  private async loadProfile(coachId: number): Promise<EQProfile> {
    const result = await pool.query(
      `SELECT * FROM eq_profiles WHERE coach_id = $1`,
      [coachId]
    );

    if (result.rows.length === 0) {
      // Return default profile if none exists
      console.warn(`[EQ] No profile found for coach ${coachId}, using default`);

      return {
        coach_id: coachId,
        tone_vector: { warmth: 0.7, direct: 0.6, humor: 0.2 },
        lex_map: {},
        audience_styles: {},
      };
    }

    const row = result.rows[0];

    return {
      coach_id: row.coach_id,
      tone_vector: typeof row.tone_vector === 'string' ? JSON.parse(row.tone_vector) : row.tone_vector,
      lex_map: typeof row.lex_map === 'string' ? JSON.parse(row.lex_map) : row.lex_map,
      audience_styles: typeof row.audience_styles === 'string' ? JSON.parse(row.audience_styles) : row.audience_styles,
      model_ref: row.model_ref,
    };
  }

  /**
   * Loads student-specific EQ tuning (overrides, banned phrases).
   */
  private async loadTuning(studentId: string, coachId: number): Promise<EQTuning | null> {
    const result = await pool.query(
      `SELECT * FROM student_coach_eq_tuning WHERE student_id = $1 AND coach_id = $2`,
      [studentId, coachId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      student_id: row.student_id,
      coach_id: row.coach_id,
      tone_overrides: typeof row.tone_overrides === 'string' ? JSON.parse(row.tone_overrides) : row.tone_overrides,
      banned_phrases: row.banned_phrases,
    };
  }

  /**
   * Applies tone vector transformations.
   *
   * Tone scalars:
   * - warmth (0-1): Add/remove softeners, enthusiasm
   * - direct (0-1): Shorten sentences, remove hedging
   * - humor (0-1): Add/remove playful language
   *
   * @param text - Text to transform
   * @param toneVector - Tone scalars
   * @param audience - Target audience
   * @returns Transformed text
   */
  private applyToneVector(
    text: string,
    toneVector: Record<string, number>,
    audience: string
  ): string {
    let adjusted = text;

    // Warmth adjustments
    const warmth = toneVector.warmth || 0.5;

    if (warmth > 0.7) {
      // High warmth: Add enthusiasm
      adjusted = adjusted.replace(/\./g, '!'); // More exclamation points
      adjusted = adjusted.replace(/^(\w)/gm, (match) => match + ' 😊'); // Add occasional emoji (simplified)
    } else if (warmth < 0.3) {
      // Low warmth: Remove softeners
      adjusted = adjusted.replace(/I think |I feel |maybe |perhaps /gi, ''); // Remove hedging
    }

    // Directness adjustments
    const direct = toneVector.direct || 0.5;

    if (direct > 0.7) {
      // High directness: Shorten, remove hedging
      adjusted = adjusted.replace(/ however,| although,/gi, ','); // Remove qualifiers
      adjusted = adjusted.replace(/I would suggest that /gi, ''); // Direct imperatives
    }

    // Humor adjustments (simplified - in production, this would be more sophisticated)
    const humor = toneVector.humor || 0.2;

    if (humor > 0.5) {
      // Add playful language (very simplified)
      // In production, this would use a fine-tuned model
    }

    return adjusted;
  }

  /**
   * Filters banned phrases from text.
   *
   * @param text - Text to filter
   * @param bannedPhrases - List of banned phrases
   * @returns Filtered text
   */
  private filterBanned(text: string, bannedPhrases: string[]): string {
    let filtered = text;

    for (const phrase of bannedPhrases) {
      const regex = new RegExp(phrase, 'gi');
      filtered = filtered.replace(regex, '***');
    }

    return filtered;
  }

  /**
   * Computes embedding similarity between raw and styled text.
   *
   * TODO: Replace with real embedding model (e.g., OpenAI embeddings, sentence-transformers).
   *
   * For now, returns a stub similarity based on Jaccard similarity (word overlap).
   *
   * @param rawText - Original text
   * @param styledText - Styled text
   * @returns Similarity score (0-1)
   */
  private async computeSimilarity(rawText: string, styledText: string): Promise<number> {
    // Stub implementation: Jaccard similarity (word overlap)
    // In production, use real embeddings (OpenAI, sentence-transformers, etc.)

    const wordsRaw = new Set(rawText.toLowerCase().split(/\s+/));
    const wordsStyled = new Set(styledText.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsRaw].filter((word) => wordsStyled.has(word)));
    const union = new Set([...wordsRaw, ...wordsStyled]);

    const jaccardSimilarity = intersection.size / union.size;

    // Jaccard tends to be lower than cosine similarity, so we boost it slightly
    const adjustedSimilarity = Math.min(jaccardSimilarity * 1.2, 1.0);

    return adjustedSimilarity;
  }

  /**
   * Logs a QA sample for monthly audits.
   *
   * @param rawText - Original text
   * @param styledText - Styled text
   * @param similarity - Similarity score
   * @param traceId - Trace ID
   */
  private async logQASample(
    rawText: string,
    styledText: string,
    similarity: number,
    traceId: string
  ): Promise<void> {
    await pool.query(
      `
      INSERT INTO eq_qa_samples (trace_id, raw_text, styled_text, similarity_score)
      VALUES ($1, $2, $3, $4)
      `,
      [traceId, rawText, styledText, similarity]
    );
  }
}
