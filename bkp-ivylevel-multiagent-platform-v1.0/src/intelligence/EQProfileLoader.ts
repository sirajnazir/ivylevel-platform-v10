/**
 * v15.3 EQ Profile Loader
 *
 * Date: 2025-10-28
 * Purpose: Load Jenny's Emotional Intelligence (EQ) profile - coaching DNA
 * Architecture: Implements IntelligenceLoader<EQProfile>
 * Data Source: Database table `eq_profiles` + exemplar chunks from coaching sessions
 *
 * EQ Profile Components:
 * 1. Tone Vectors: Warmth, Directness, Expertise, Urgency (0.0-1.0)
 * 2. Lexical Cadence: Sentence patterns, punctuation style, question patterns
 * 3. Style Weights: Meta-coaching, validation, reframing, transparency
 * 4. Exemplar Chunks: Real coaching snippets demonstrating Jenny's style
 * 5. Forbidden Phrases: Patterns to avoid (e.g., overly clinical language)
 *
 * @module intelligence/EQProfileLoader
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { IntelligenceLoader } from '../primitives/types';
import { CommunicationIntelligenceLoader, CoachCommunicationProfile } from './CommunicationIntelligenceLoader';

// ============================================================================
// TYPES: EQ Profile Structure
// ============================================================================

/**
 * Tone Vectors: Quantified coaching style dimensions
 */
export interface ToneVectors {
  warmth: number;        // 0.0 = clinical/formal, 1.0 = warm/personal
  directness: number;    // 0.0 = indirect/soft, 1.0 = direct/assertive
  expertise: number;     // 0.0 = peer/guide, 1.0 = authoritative/expert
  urgency: number;       // 0.0 = patient/exploratory, 1.0 = urgent/decisive
}

/**
 * Lexical Cadence: Sentence-level style patterns
 */
export interface LexicalCadence {
  sentence_length_avg: number;        // Average words per sentence
  sentence_length_std_dev: number;    // Variability in sentence length
  em_dash_frequency: number;          // Em-dashes per 100 words
  question_ratio: number;             // Questions / total sentences
  exclamation_ratio: number;          // Exclamations / total sentences
  paragraph_break_frequency: number;  // Paragraphs per 100 words
}

/**
 * Style Weights: Coaching technique preferences
 */
export interface StyleWeights {
  meta_coaching: number;       // Explaining the process (0-1)
  validation: number;          // Affirming student's feelings (0-1)
  reframing: number;           // Reframing negatives to positives (0-1)
  transparency: number;        // Explaining reasoning openly (0-1)
  socratic_questioning: number; // Asking vs telling (0-1)
  future_orientation: number;  // Focus on forward momentum (0-1)
}

/**
 * Exemplar Chunk: Real coaching snippet demonstrating style
 */
export interface ExemplarChunk {
  chunk_id: string;
  text: string;
  context: string;              // When this style is used (e.g., "rapport building")
  tone_vector: ToneVectors;     // Specific tone for this chunk
  techniques_used: string[];    // Coaching techniques demonstrated
  student_archetype?: string;   // Which student type this worked well for
}

/**
 * Complete EQ Profile: Jenny's coaching DNA
 */
export interface EQProfile {
  eq_profile_id: string;
  coach_id: string;              // 'jenny_duan'
  version: string;               // 'v1.0'
  created_at: Date;
  updated_at: Date;

  // Core EQ components
  tone_vectors: ToneVectors;
  lexical_cadence: LexicalCadence;
  style_weights: StyleWeights;

  // Training data
  exemplar_chunks: ExemplarChunk[];
  forbidden_phrases: string[];

  // Rich communication intelligence (NEW - from iMessages + sessions)
  communication_profile?: CoachCommunicationProfile;

  // Metadata
  source_sessions: number;       // Number of sessions analyzed
  confidence_score: number;      // 0-1, how well-defined this profile is
}

/**
 * Context-Aware EQ Adaptation
 * EQ profile adjusted for specific situations
 */
export interface EQAdaptation {
  base_profile: EQProfile;
  adaptations: {
    condition: string;           // e.g., "student is anxious"
    adjusted_tone: Partial<ToneVectors>;
    adjusted_style: Partial<StyleWeights>;
    recommended_techniques: string[];
  }[];
}

// ============================================================================
// EQ PROFILE LOADER IMPLEMENTATION
// ============================================================================

/**
 * EQProfileLoader: Load and adapt Jenny's coaching DNA
 */
export class EQProfileLoader implements IntelligenceLoader<EQProfile> {
  private cache: Map<string, EQProfile> = new Map();
  private db: any;
  private dataDirectory: string;
  private communicationLoader: CommunicationIntelligenceLoader;

  constructor(db: any, dataDirectory?: string) {
    this.db = db;
    // Default to repository root data directory
    // process.cwd() = /Users/snazir/ivylevel-platform-v10/services/agent-framework
    // We need: /Users/snazir/ivylevel-platform-v10/data/eq_profiles
    this.dataDirectory = dataDirectory || path.join(
      process.cwd(),
      '../..',  // Go up two levels to repository root
      'data',
      'eq_profiles'
    );
    // Initialize communication intelligence loader
    this.communicationLoader = new CommunicationIntelligenceLoader();
  }

  /**
   * Load EQ profile for a specific coach
   *
   * @param identifier - Coach ID (e.g., 'jenny_duan')
   * @returns EQ profile with all coaching DNA components
   */
  async loadIntelligence(identifier: string): Promise<EQProfile> {
    // Check cache first
    if (this.cache.has(identifier)) {
      return this.cache.get(identifier)!;
    }

    // Try loading from database first
    let profile: EQProfile;
    if (this.db) {
      try {
        const dbProfile = await this.loadFromDatabase(identifier);
        if (dbProfile) {
          profile = dbProfile;
        } else {
          profile = await this.loadFromFileSystem(identifier);
        }
      } catch (error) {
        console.warn(`Failed to load EQ profile from DB for ${identifier}, trying file system:`, error);
        profile = await this.loadFromFileSystem(identifier);
      }
    } else {
      // Fallback to file system
      profile = await this.loadFromFileSystem(identifier);
    }

    // Load rich communication profile (iMessages + sessions)
    console.log(`[EQProfileLoader] Loading communication profile for ${identifier}...`);
    try {
      const communicationProfile = await this.communicationLoader.loadIntelligence(identifier);
      profile.communication_profile = communicationProfile;

      console.log(`[EQProfileLoader] ✅ Loaded communication profile:`);
      console.log(`  - ${communicationProfile.total_conversations} conversations analyzed`);
      console.log(`  - ${communicationProfile.total_utterances_analyzed} utterances`);
      console.log(`  - ${communicationProfile.linguistic_markers.length} linguistic markers`);
      console.log(`  - ${communicationProfile.move_types.length} move types`);
      console.log(`  - ${communicationProfile.training_examples.length} training examples`);
    } catch (error) {
      console.warn(`[EQProfileLoader] Failed to load communication profile:`, error);
    }

    this.cache.set(identifier, profile);
    return profile;
  }

  /**
   * Query EQ profiles by criteria
   * (Not heavily used since we typically have 1 coach, but included for interface compliance)
   */
  async queryIntelligence(query: string, category: string): Promise<EQProfile[]> {
    // For now, just return all loaded profiles that match
    const allProfiles = Array.from(this.cache.values());

    switch (category.toLowerCase()) {
      case 'coach':
        return allProfiles.filter(p => p.coach_id.toLowerCase().includes(query.toLowerCase()));
      case 'version':
        return allProfiles.filter(p => p.version.toLowerCase().includes(query.toLowerCase()));
      default:
        return allProfiles;
    }
  }

  /**
   * Get context-aware EQ adaptation
   *
   * Adjusts EQ profile based on situational context (e.g., student anxiety, resistance)
   *
   * @param baseProfile - Base EQ profile
   * @param context - Situational context (e.g., { student_emotion: 'anxious' })
   * @returns Adapted EQ profile with adjusted tone/style
   */
  async getAdaptedProfile(baseProfile: EQProfile, context: any): Promise<EQProfile> {
    // Start with base profile
    const adapted: EQProfile = JSON.parse(JSON.stringify(baseProfile));

    // Apply context-specific adaptations
    if (context.student_emotion) {
      switch (context.student_emotion.toLowerCase()) {
        case 'anxious':
        case 'stressed':
          // Increase warmth, decrease urgency
          adapted.tone_vectors.warmth = Math.min(1.0, baseProfile.tone_vectors.warmth + 0.2);
          adapted.tone_vectors.urgency = Math.max(0.0, baseProfile.tone_vectors.urgency - 0.3);
          adapted.style_weights.validation = Math.min(1.0, baseProfile.style_weights.validation + 0.3);
          break;

        case 'resistant':
        case 'defensive':
          // Increase transparency, decrease directness
          adapted.tone_vectors.directness = Math.max(0.0, baseProfile.tone_vectors.directness - 0.2);
          adapted.style_weights.transparency = Math.min(1.0, baseProfile.style_weights.transparency + 0.2);
          adapted.style_weights.socratic_questioning = Math.min(1.0, baseProfile.style_weights.socratic_questioning + 0.2);
          break;

        case 'overwhelmed':
          // Increase structure, increase future_orientation
          adapted.tone_vectors.expertise = Math.min(1.0, baseProfile.tone_vectors.expertise + 0.2);
          adapted.style_weights.future_orientation = Math.min(1.0, baseProfile.style_weights.future_orientation + 0.3);
          adapted.style_weights.reframing = Math.min(1.0, baseProfile.style_weights.reframing + 0.2);
          break;

        case 'motivated':
        case 'excited':
          // Maintain energy, increase directness
          adapted.tone_vectors.urgency = Math.min(1.0, baseProfile.tone_vectors.urgency + 0.2);
          adapted.tone_vectors.directness = Math.min(1.0, baseProfile.tone_vectors.directness + 0.1);
          break;
      }
    }

    // Apply archetype-specific adaptations
    if (context.student_archetype) {
      switch (context.student_archetype.toLowerCase()) {
        case 'high_achiever':
          // More direct, more expertise
          adapted.tone_vectors.directness = Math.min(1.0, baseProfile.tone_vectors.directness + 0.1);
          adapted.tone_vectors.expertise = Math.min(1.0, baseProfile.tone_vectors.expertise + 0.1);
          break;

        case 'anxious_perfectionist':
          // More warmth, more validation, less urgency
          adapted.tone_vectors.warmth = Math.min(1.0, baseProfile.tone_vectors.warmth + 0.2);
          adapted.style_weights.validation = Math.min(1.0, baseProfile.style_weights.validation + 0.3);
          adapted.tone_vectors.urgency = Math.max(0.0, baseProfile.tone_vectors.urgency - 0.2);
          break;

        case 'disengaged':
          // More socratic, more transparency
          adapted.style_weights.socratic_questioning = Math.min(1.0, baseProfile.style_weights.socratic_questioning + 0.3);
          adapted.style_weights.transparency = Math.min(1.0, baseProfile.style_weights.transparency + 0.2);
          break;
      }
    }

    return adapted;
  }

  /**
   * Get exemplar chunks for specific context
   *
   * @param profile - EQ profile
   * @param context - Context string (e.g., "rapport_building", "difficult_news")
   * @param limit - Max chunks to return
   * @returns Relevant exemplar chunks
   */
  getExemplarChunks(profile: EQProfile, context: string, limit: number = 3): ExemplarChunk[] {
    return profile.exemplar_chunks
      .filter(chunk => chunk.context.toLowerCase().includes(context.toLowerCase()))
      .slice(0, limit);
  }

  /**
   * Check if phrase should be avoided
   *
   * @param profile - EQ profile
   * @param text - Text to check
   * @returns Array of forbidden phrases found in text
   */
  checkForbiddenPhrases(profile: EQProfile, text: string): string[] {
    const lowerText = text.toLowerCase();
    return profile.forbidden_phrases.filter(phrase =>
      lowerText.includes(phrase.toLowerCase())
    );
  }

  /**
   * Clear cache (useful for testing or reloading)
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ============================================================================
  // PRIVATE METHODS: Data Loading
  // ============================================================================

  /**
   * Load EQ profile from database
   */
  private async loadFromDatabase(coachId: string): Promise<EQProfile | null> {
    if (!this.db) {
      return null;
    }

    // Load main profile
    const profileResult = await this.db.query(
      `SELECT * FROM eq_profiles WHERE coach_id = $1 ORDER BY version DESC LIMIT 1`,
      [coachId]
    );

    if (profileResult.rows.length === 0) {
      return null;
    }

    const row = profileResult.rows[0];

    // Load exemplar chunks
    const chunksResult = await this.db.query(
      `SELECT * FROM eq_exemplar_chunks WHERE eq_profile_id = $1`,
      [row.eq_profile_id]
    );

    return {
      eq_profile_id: row.eq_profile_id,
      coach_id: row.coach_id,
      version: row.version,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      tone_vectors: row.tone_vectors,
      lexical_cadence: row.lexical_cadence,
      style_weights: row.style_weights,
      exemplar_chunks: chunksResult.rows.map(this.parseExemplarChunk),
      forbidden_phrases: row.forbidden_phrases || [],
      source_sessions: row.source_sessions || 0,
      confidence_score: row.confidence_score || 0.8,
    };
  }

  /**
   * Load EQ profile from file system
   */
  private async loadFromFileSystem(coachId: string): Promise<EQProfile> {
    const filePath = path.join(this.dataDirectory, `${coachId}_eq_profile.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      return {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };
    } catch (error) {
      console.error(`Failed to load EQ profile from ${filePath}:`, error);
      // Return default profile
      return this.getDefaultProfile(coachId);
    }
  }

  /**
   * Parse exemplar chunk from DB row
   */
  private parseExemplarChunk(row: any): ExemplarChunk {
    return {
      chunk_id: row.chunk_id,
      text: row.text,
      context: row.context,
      tone_vector: row.tone_vector,
      techniques_used: row.techniques_used || [],
      student_archetype: row.student_archetype,
    };
  }

  /**
   * Get default EQ profile (fallback)
   * Based on analysis of Jenny's 11 coaching sessions
   */
  private getDefaultProfile(coachId: string): EQProfile {
    return {
      eq_profile_id: `${coachId}_default`,
      coach_id: coachId,
      version: 'v1.0-default',
      created_at: new Date(),
      updated_at: new Date(),

      tone_vectors: {
        warmth: 0.85,        // Jenny is highly warm and personal
        directness: 0.70,    // Balanced - direct but not harsh
        expertise: 0.75,     // Authoritative but not overbearing
        urgency: 0.60,       // Patient but time-aware
      },

      lexical_cadence: {
        sentence_length_avg: 15.0,
        sentence_length_std_dev: 5.0,
        em_dash_frequency: 2.5,
        question_ratio: 0.25,
        exclamation_ratio: 0.05,
        paragraph_break_frequency: 4.0,
      },

      style_weights: {
        meta_coaching: 0.80,          // Jenny frequently explains the process
        validation: 0.85,             // High emphasis on validation
        reframing: 0.75,              // Strong reframing skills
        transparency: 0.90,           // Very transparent about reasoning
        socratic_questioning: 0.70,   // Balances asking vs telling
        future_orientation: 0.80,     // Strong focus on forward momentum
      },

      exemplar_chunks: [],  // Would be populated from real sessions
      forbidden_phrases: [
        'you should have',
        'you need to',
        'the problem with you is',
        'obviously',
        'just do this',
      ],

      source_sessions: 11,
      confidence_score: 0.85,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create EQProfileLoader with database connection
 */
export function createEQProfileLoader(db: any): EQProfileLoader {
  return new EQProfileLoader(db);
}
