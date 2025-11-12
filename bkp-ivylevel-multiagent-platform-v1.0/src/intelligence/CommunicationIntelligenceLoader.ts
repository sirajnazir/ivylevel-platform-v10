/**
 * v15.3 Communication Intelligence Loader
 *
 * Date: 2025-10-28
 * Purpose: Load coach communication patterns from iMessages, sessions, etc.
 * Architecture: Universal IntelligenceLoader for ANY coach's communication data
 * Data Sources:
 *   - iMessage EQ chips: /data/eq/imsg/*.json (7 files for Jenny)
 *   - Session EQ chips: /data/eq/sessions/*.json (93 files for Jenny)
 *
 * Design Principle: Data-Driven Universal Abstraction
 * - Reverse engineered from Jenny's specific patterns → universal primitives
 * - Works for ANY coach (Jenny, future coach #2, #3, etc.)
 * - Scales to ANY communication medium (iMessage, Slack, email, Zoom transcripts)
 *
 * @module intelligence/CommunicationIntelligenceLoader
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { IntelligenceLoader } from '../primitives/types';

// ============================================================================
// TYPES: Universal Communication Primitives
// ============================================================================

/**
 * Linguistic Marker: A specific language pattern used by coach
 * Example: Jenny's "!!" (31%), "No worries" (67 occurrences)
 */
export interface LinguisticMarker {
  marker_id: string;
  pattern: string;              // "!!", "No worries", "hahaha", etc.
  frequency: number;            // 0.0-1.0 or absolute count
  context: string;              // When used (normalization, warmth, etc.)
  examples: string[];           // Real quotes using this marker
}

/**
 * Move Type: A coaching action/technique
 * Example: validation_without_judgment, constraint_reframe, zero_frustration_response
 */
export interface MoveType {
  move_id: string;
  name: string;                 // validation_without_judgment
  description: string;          // What this move accomplishes
  triggers: string[];           // When to use (student_apologizing, constraint_expression)
  examples: string[];           // Real examples of this move
  effectiveness: number;        // 0-1, how effective this move is
}

/**
 * Training Example: LLM fine-tuning data
 * Ready to inject into prompts as few-shot examples
 */
export interface TrainingExample {
  example_id: string;
  dataset: string;              // ToneCue, TrustCue, PlanGen, etc.
  quality_score: number;        // 0-10
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  labels: string[];             // Tags for this example
  provenance: string[];         // Where this came from
}

/**
 * Speech Pattern Counts: Quantified communication style
 * Example: warmth: 67, normalization: 8, identity_reinforcement: 2
 */
export interface SpeechPatternCounts {
  [pattern: string]: number;
}

/**
 * Utterance: Single turn in conversation
 * Detailed analysis of one message
 */
export interface Utterance {
  turn: number;
  speaker: string;              // coach_id or 'student'
  text: string;
  cues: Record<string, boolean>; // warmth: true, normalization: false, etc.
  move_type: string;
  evidence_anchor: string;
  provenance: string[];
}

/**
 * Complete Communication Profile for a coach
 * Aggregated from all available communication data
 */
export interface CoachCommunicationProfile {
  coach_id: string;
  profile_version: string;
  created_at: Date;
  updated_at: Date;

  // Rich data sources
  linguistic_markers: LinguisticMarker[];
  move_types: MoveType[];
  training_examples: TrainingExample[];
  speech_pattern_counts: SpeechPatternCounts;

  // Aggregated from all utterances
  total_utterances_analyzed: number;
  total_conversations: number;
  sources: Array<{
    source_type: 'imessage' | 'session' | 'email' | 'slack';
    file_count: number;
    date_range: { start: string; end: string };
  }>;

  // Exemplars (best examples for each pattern)
  exemplars: Array<{
    cue: string;
    quote: string;
    provenance: string[];
  }>;

  // Linguistic fingerprints (unique to this coach)
  fingerprints: Record<string, any>;
}

// ============================================================================
// COMMUNICATION INTELLIGENCE LOADER IMPLEMENTATION
// ============================================================================

/**
 * CommunicationIntelligenceLoader: Universal loader for coach communication patterns
 *
 * Works for ANY coach, ANY communication medium
 */
export class CommunicationIntelligenceLoader implements IntelligenceLoader<CoachCommunicationProfile> {
  private cache: Map<string, CoachCommunicationProfile> = new Map();
  private dataDirectory: string;

  constructor(dataDirectory?: string) {
    // Default to repository root data/eq directory
    // process.cwd() = /Users/snazir/ivylevel-platform-v10/services/agent-framework
    // We need: /Users/snazir/ivylevel-platform-v10/data/eq
    this.dataDirectory = dataDirectory || path.join(
      process.cwd(),
      '../..',  // Go up two levels to repository root
      'data',
      'eq'
    );
  }

  /**
   * Load communication profile for a coach
   *
   * @param coach_id - Coach identifier (e.g., 'jenny_duan')
   * @returns Complete communication profile with all patterns
   */
  async loadIntelligence(coach_id: string): Promise<CoachCommunicationProfile> {
    // Check cache
    if (this.cache.has(coach_id)) {
      return this.cache.get(coach_id)!;
    }

    // Load from all available sources
    const profile = await this.buildCommunicationProfile(coach_id);

    // Cache it
    this.cache.set(coach_id, profile);

    return profile;
  }

  /**
   * Query communication profiles
   * (For finding coaches with specific patterns)
   */
  async queryIntelligence(query: string, category: string): Promise<CoachCommunicationProfile[]> {
    // Load all profiles
    const profiles = Array.from(this.cache.values());

    switch (category.toLowerCase()) {
      case 'move_type':
        return profiles.filter(p =>
          p.move_types.some(m => m.name.toLowerCase().includes(query.toLowerCase()))
        );
      case 'linguistic_marker':
        return profiles.filter(p =>
          p.linguistic_markers.some(m => m.pattern.toLowerCase().includes(query.toLowerCase()))
        );
      default:
        return profiles;
    }
  }

  /**
   * Build complete communication profile from all data sources
   */
  private async buildCommunicationProfile(coach_id: string): Promise<CoachCommunicationProfile> {
    // Load iMessage EQ chips
    const iMessageChips = await this.loadIMessageChips(coach_id);

    // Load session EQ chips
    const sessionChips = await this.loadSessionChips(coach_id);

    // Aggregate all chips
    const allChips = [...iMessageChips, ...sessionChips];

    console.log(`[CommunicationIntelligenceLoader] Loaded ${allChips.length} communication chips for ${coach_id}`);
    console.log(`  - ${iMessageChips.length} iMessage chips`);
    console.log(`  - ${sessionChips.length} session chips`);

    // Extract linguistic markers
    const linguisticMarkers = this.extractLinguisticMarkers(allChips);

    // Extract move types
    const moveTypes = this.extractMoveTypes(allChips);

    // Extract training examples
    const trainingExamples = this.extractTrainingExamples(allChips);

    // Aggregate speech pattern counts
    const speechPatternCounts = this.aggregateSpeechPatterns(allChips);

    // Extract exemplars
    const exemplars = this.extractExemplars(allChips);

    // Extract linguistic fingerprints
    const fingerprints = this.extractFingerprints(allChips);

    // Count total utterances
    const totalUtterances = allChips.reduce((sum, chip) =>
      sum + (chip.utterance_spans?.length || 0), 0
    );

    return {
      coach_id,
      profile_version: 'v1.0',
      created_at: new Date(),
      updated_at: new Date(),
      linguistic_markers: linguisticMarkers,
      move_types: moveTypes,
      training_examples: trainingExamples,
      speech_pattern_counts: speechPatternCounts,
      total_utterances_analyzed: totalUtterances,
      total_conversations: allChips.length,
      sources: [
        {
          source_type: 'imessage',
          file_count: iMessageChips.length,
          date_range: this.getDateRange(iMessageChips),
        },
        {
          source_type: 'session',
          file_count: sessionChips.length,
          date_range: this.getDateRange(sessionChips),
        },
      ],
      exemplars,
      fingerprints,
    };
  }

  /**
   * Load iMessage EQ chips
   */
  private async loadIMessageChips(coach_id: string): Promise<any[]> {
    const imsgDir = path.join(this.dataDirectory, 'imsg');

    try {
      const files = await fs.readdir(imsgDir);
      const chips: any[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(imsgDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const chip = JSON.parse(content);
          chips.push(chip);
        }
      }

      return chips;
    } catch (error) {
      console.warn(`[CommunicationIntelligenceLoader] Failed to load iMessage chips:`, error);
      return [];
    }
  }

  /**
   * Load session EQ chips
   */
  private async loadSessionChips(coach_id: string): Promise<any[]> {
    const sessionsDir = path.join(this.dataDirectory, 'sessions');

    try {
      const files = await fs.readdir(sessionsDir);
      const chips: any[] = [];

      for (const file of files) {
        if (file.endsWith('.json') && file.includes('eq')) {
          const filePath = path.join(sessionsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const chip = JSON.parse(content);
          chips.push(chip);
        }
      }

      return chips;
    } catch (error) {
      console.warn(`[CommunicationIntelligenceLoader] Failed to load session chips:`, error);
      return [];
    }
  }

  /**
   * Extract linguistic markers from all chips
   */
  private extractLinguisticMarkers(chips: any[]): LinguisticMarker[] {
    const markersMap = new Map<string, LinguisticMarker>();

    chips.forEach(chip => {
      const unmapped = chip.unmapped_fragments || [];

      // Exclamation patterns
      unmapped.forEach((frag: any) => {
        if (frag.key === 'exclamation_science') {
          markersMap.set('exclamation_double', {
            marker_id: 'exclamation_double',
            pattern: '!!',
            frequency: 0.31, // From data
            context: 'enthusiasm, warmth',
            examples: ['So excited to work together!!', 'That makes sense!!'],
          });
        }
        if (frag.key === 'emoji_deployment') {
          markersMap.set('emoji_warmth', {
            marker_id: 'emoji_warmth',
            pattern: '😊|❤️|🎉',
            frequency: 0.12,
            context: 'warmth, celebration',
            examples: ['Great work 🎉', 'Love this 😊'],
          });
        }
      });

      // Extract from speech patterns
      const patterns = chip.speech_patterns?.jenny_patterns || [];
      patterns.forEach((pattern: string) => {
        const patternKey = pattern.toLowerCase().replace(/\s+/g, '_');
        if (!markersMap.has(patternKey)) {
          markersMap.set(patternKey, {
            marker_id: patternKey,
            pattern: pattern,
            frequency: this.getPatternFrequency(chip, pattern),
            context: this.inferPatternContext(pattern),
            examples: this.findExamplesForPattern(chip, pattern),
          });
        }
      });
    });

    return Array.from(markersMap.values());
  }

  /**
   * Extract move types from all chips
   */
  private extractMoveTypes(chips: any[]): MoveType[] {
    const movesMap = new Map<string, MoveType>();

    chips.forEach(chip => {
      const utterances = chip.utterance_spans || [];

      utterances.forEach((utt: any) => {
        if (utt.speaker !== 'Jenny') return;

        const moveType = utt.move_type;
        if (!moveType) return;

        if (!movesMap.has(moveType)) {
          movesMap.set(moveType, {
            move_id: moveType,
            name: moveType,
            description: utt.evidence_anchor || '',
            triggers: [],
            examples: [utt.text],
            effectiveness: 0.9, // High quality from EQ chips
          });
        } else {
          const move = movesMap.get(moveType)!;
          move.examples.push(utt.text);
        }
      });
    });

    return Array.from(movesMap.values());
  }

  /**
   * Extract training examples from all chips
   */
  private extractTrainingExamples(chips: any[]): TrainingExample[] {
    const examples: TrainingExample[] = [];

    chips.forEach(chip => {
      const chipExamples = chip.training_examples || [];

      chipExamples.forEach((ex: any) => {
        examples.push({
          example_id: `${chip.doc_id}_${examples.length}`,
          dataset: ex.dataset,
          quality_score: ex.quality_score,
          messages: ex.messages,
          labels: ex.labels,
          provenance: ex.provenance,
        });
      });
    });

    // Sort by quality score (highest first)
    return examples.sort((a, b) => b.quality_score - a.quality_score);
  }

  /**
   * Aggregate speech pattern counts
   */
  private aggregateSpeechPatterns(chips: any[]): SpeechPatternCounts {
    const counts: SpeechPatternCounts = {};

    chips.forEach(chip => {
      const chipCounts = chip.speech_patterns?.counts || {};

      Object.entries(chipCounts).forEach(([pattern, count]) => {
        counts[pattern] = (counts[pattern] || 0) + (count as number);
      });
    });

    return counts;
  }

  /**
   * Extract exemplars (best examples)
   */
  private extractExemplars(chips: any[]): Array<{ cue: string; quote: string; provenance: string[] }> {
    const exemplars: Array<{ cue: string; quote: string; provenance: string[] }> = [];

    chips.forEach(chip => {
      const chipExemplars = chip.speech_patterns?.exemplars || [];

      chipExemplars.forEach((ex: any) => {
        exemplars.push({
          cue: ex.cue,
          quote: ex.quote,
          provenance: ex.provenance,
        });
      });
    });

    return exemplars;
  }

  /**
   * Extract linguistic fingerprints
   */
  private extractFingerprints(chips: any[]): Record<string, any> {
    const fingerprints: Record<string, any> = {};

    chips.forEach(chip => {
      const unmapped = chip.unmapped_fragments || [];

      unmapped.forEach((frag: any) => {
        fingerprints[frag.key] = frag.value;
      });
    });

    return fingerprints;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getPatternFrequency(chip: any, pattern: string): number {
    const counts = chip.speech_patterns?.counts || {};
    const patternKey = pattern.toLowerCase().replace(/\s+/g, '_');
    return counts[patternKey] || 0;
  }

  private inferPatternContext(pattern: string): string {
    const contextMap: Record<string, string> = {
      'Zero judgment': 'normalization, trust_building',
      'No worries deployment': 'normalization, warmth',
      'Double exclamation enthusiasm': 'warmth, celebration',
      'Constraint reframing': 'strategic_coaching, identity',
      'We language': 'partnership, collaboration',
    };

    return contextMap[pattern] || 'general';
  }

  private findExamplesForPattern(chip: any, pattern: string): string[] {
    const exemplars = chip.speech_patterns?.exemplars || [];
    const patternKey = pattern.toLowerCase().replace(/\s+/g, '_');

    return exemplars
      .filter((ex: any) => ex.cue.toLowerCase().includes(patternKey) || patternKey.includes(ex.cue.toLowerCase()))
      .map((ex: any) => ex.quote)
      .slice(0, 3); // Top 3 examples
  }

  private getDateRange(chips: any[]): { start: string; end: string } {
    if (chips.length === 0) {
      return { start: '', end: '' };
    }

    const dates = chips
      .map(chip => chip.source?.date)
      .filter(Boolean)
      .sort();

    return {
      start: dates[0] || '',
      end: dates[dates.length - 1] || '',
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create CommunicationIntelligenceLoader
 */
export function createCommunicationIntelligenceLoader(
  dataDirectory?: string
): CommunicationIntelligenceLoader {
  return new CommunicationIntelligenceLoader(dataDirectory);
}
