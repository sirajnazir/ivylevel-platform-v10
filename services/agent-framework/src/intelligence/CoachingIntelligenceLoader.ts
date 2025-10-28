/**
 * v15.3 Coaching Intelligence Loader
 *
 * Date: 2025-10-28
 * Purpose: Load and aggregate Jenny's coaching intelligence from 11 real sessions
 * Data Source: /data/coaching_intelligence/extractions/*.json
 * Architecture: Implements IntelligenceLoader<CoachingIntelligence>
 *
 * @module intelligence/CoachingIntelligenceLoader
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { IntelligenceLoader } from '../primitives/types';

// ============================================================================
// TYPES: Coaching Intelligence Structure (17 Layers)
// ============================================================================

export interface SessionMetadata {
  student_archetype: string;
  grade_level: number;
  session_duration_minutes: number;
  session_type: string;
  narrative_clarity_start: number;
  narrative_clarity_end: number;
}

export interface Framework {
  framework_name: string;
  introduction_language: string;
  positioned_as: string;
  effectiveness?: string;
  triggers?: string[];
}

export interface CoachingTactic {
  category: string;
  tactics: string[];
}

export interface Question {
  phase: string;
  question_text: string;
  meta_coaching_context?: string;
}

export interface CoachingIntelligence {
  student_id: string;
  extraction_date: string;
  coach_id: string;
  session_metadata: SessionMetadata;
  student_profile: any;
  key_challenges: Array<{ challenge: string; quote: string; severity: string }>;
  narrative_development: any;
  frameworks_introduced: Framework[];
  strategic_recommendations: any;
  coaching_tactics_observed: Record<string, string[]>;
  timeline_and_priorities: any;
  meta_coaching_moments: Record<string, string>;
  knowledge_moat_insights: any;
  questions_by_phase?: Record<string, string[]>;
  archetype_specific_patterns?: any;
  success_metrics_defined?: any;
  effectiveness_indicators?: any;
}

export interface AggregatedIntelligence {
  total_students: number;
  archetypes: string[];
  frameworks: Framework[];
  coaching_tactics: Record<string, string[]>;
  meta_coaching_patterns: string[];
  questions_by_phase: Record<string, string[]>;
  knowledge_moat: string[];
}

// ============================================================================
// COACHING INTELLIGENCE LOADER IMPLEMENTATION
// ============================================================================

export class CoachingIntelligenceLoader implements IntelligenceLoader<CoachingIntelligence> {
  private cache: Map<string, CoachingIntelligence> = new Map();
  private aggregatedCache: AggregatedIntelligence | null = null;
  private dataDirectory: string;

  constructor(dataDirectory?: string) {
    // Default to project data directory
    this.dataDirectory = dataDirectory || path.join(
      process.cwd(),
      'data',
      'coaching_intelligence',
      'extractions'
    );
  }

  /**
   * Load coaching intelligence for a specific student
   */
  async loadIntelligence(identifier: string): Promise<CoachingIntelligence> {
    // Check cache first
    if (this.cache.has(identifier)) {
      return this.cache.get(identifier)!;
    }

    // Determine file path based on identifier
    let filePath: string;

    if (identifier.startsWith('student_')) {
      // Direct student file reference
      filePath = path.join(this.dataDirectory, `${identifier}_structured.json`);
    } else {
      // Try to find by student_id in files
      const files = await this.getAllIntelligenceFiles();
      const found = files.find(f => {
        const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
        return data.student_id === identifier;
      });

      if (!found) {
        throw new Error(`Coaching intelligence not found for identifier: ${identifier}`);
      }

      filePath = found;
    }

    // Load and parse
    const content = await fs.readFile(filePath, 'utf-8');
    const intelligence = JSON.parse(content) as CoachingIntelligence;

    // Cache it
    this.cache.set(identifier, intelligence);

    return intelligence;
  }

  /**
   * Query coaching intelligence by category
   * Supported categories: frameworks, tactics, questions, archetypes, meta_coaching
   */
  async queryIntelligence(query: string, category: string): Promise<CoachingIntelligence[]> {
    const allIntelligence = await this.loadAllIntelligence();

    switch (category.toLowerCase()) {
      case 'frameworks':
        // Find students who used frameworks matching query
        return allIntelligence.filter(intel =>
          intel.frameworks_introduced?.some(f =>
            f.framework_name.toLowerCase().includes(query.toLowerCase())
          )
        );

      case 'archetypes':
        // Find students with matching archetype
        return allIntelligence.filter(intel =>
          intel.session_metadata.student_archetype.toLowerCase().includes(query.toLowerCase())
        );

      case 'tactics':
        // Find students where specific tactic was used
        return allIntelligence.filter(intel => {
          const tactics = Object.values(intel.coaching_tactics_observed || {}).flat();
          return tactics.some(t => t.toLowerCase().includes(query.toLowerCase()));
        });

      case 'questions':
        // Find students asked specific type of questions
        return allIntelligence.filter(intel => {
          const questions = Object.values(intel.questions_by_phase || {}).flat();
          return questions.some(q => q.toLowerCase().includes(query.toLowerCase()));
        });

      default:
        return [];
    }
  }

  /**
   * Load all 11 coaching intelligence files
   */
  async loadAllIntelligence(): Promise<CoachingIntelligence[]> {
    const files = await this.getAllIntelligenceFiles();
    const intelligence: CoachingIntelligence[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const data = JSON.parse(content) as CoachingIntelligence;
        intelligence.push(data);

        // Cache each one
        this.cache.set(data.student_id, data);
      } catch (error) {
        console.error(`Failed to load coaching intelligence from ${file}:`, error);
      }
    }

    return intelligence;
  }

  /**
   * Get aggregated intelligence across all 11 students
   */
  async getAggregatedIntelligence(): Promise<AggregatedIntelligence> {
    if (this.aggregatedCache) {
      return this.aggregatedCache;
    }

    const allIntelligence = await this.loadAllIntelligence();

    // Aggregate frameworks
    const frameworksMap = new Map<string, Framework>();
    allIntelligence.forEach(intel => {
      intel.frameworks_introduced?.forEach(f => {
        if (!frameworksMap.has(f.framework_name)) {
          frameworksMap.set(f.framework_name, f);
        }
      });
    });

    // Aggregate coaching tactics
    const tacticsMap = new Map<string, Set<string>>();
    allIntelligence.forEach(intel => {
      Object.entries(intel.coaching_tactics_observed || {}).forEach(([category, tactics]) => {
        if (!tacticsMap.has(category)) {
          tacticsMap.set(category, new Set());
        }
        tactics.forEach(t => tacticsMap.get(category)!.add(t));
      });
    });

    // Aggregate meta-coaching patterns
    const metaCoachingSet = new Set<string>();
    allIntelligence.forEach(intel => {
      Object.values(intel.meta_coaching_moments || {}).forEach(pattern => {
        metaCoachingSet.add(pattern);
      });
    });

    // Aggregate questions by phase
    const questionsMap = new Map<string, Set<string>>();
    allIntelligence.forEach(intel => {
      Object.entries(intel.questions_by_phase || {}).forEach(([phase, questions]) => {
        if (!questionsMap.has(phase)) {
          questionsMap.set(phase, new Set());
        }
        questions.forEach(q => questionsMap.get(phase)!.add(q));
      });
    });

    // Aggregate knowledge moat
    const knowledgeMoatSet = new Set<string>();
    allIntelligence.forEach(intel => {
      if (intel.knowledge_moat_insights?.proprietary_frameworks) {
        intel.knowledge_moat_insights.proprietary_frameworks.forEach((insight: string) => {
          knowledgeMoatSet.add(insight);
        });
      }
    });

    const aggregated: AggregatedIntelligence = {
      total_students: allIntelligence.length,
      archetypes: [...new Set(allIntelligence.map(i => i.session_metadata.student_archetype))],
      frameworks: Array.from(frameworksMap.values()),
      coaching_tactics: Object.fromEntries(
        Array.from(tacticsMap.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      meta_coaching_patterns: Array.from(metaCoachingSet),
      questions_by_phase: Object.fromEntries(
        Array.from(questionsMap.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      knowledge_moat: Array.from(knowledgeMoatSet)
    };

    this.aggregatedCache = aggregated;
    return aggregated;
  }

  /**
   * Get frameworks by trigger condition
   */
  async getFrameworksByTrigger(trigger: string): Promise<Framework[]> {
    const aggregated = await this.getAggregatedIntelligence();

    return aggregated.frameworks.filter(f =>
      f.triggers?.some(t => t.toLowerCase().includes(trigger.toLowerCase()))
    );
  }

  /**
   * Get coaching tactics by category
   */
  async getTacticsByCategory(category: string): Promise<string[]> {
    const aggregated = await this.getAggregatedIntelligence();
    return aggregated.coaching_tactics[category] || [];
  }

  /**
   * Get questions for specific assessment phase
   */
  async getQuestionsByPhase(phase: string): Promise<string[]> {
    const aggregated = await this.getAggregatedIntelligence();
    return aggregated.questions_by_phase[phase] || [];
  }

  /**
   * Get all unique archetypes
   */
  async getArchetypes(): Promise<string[]> {
    const aggregated = await this.getAggregatedIntelligence();
    return aggregated.archetypes;
  }

  /**
   * Find students by archetype
   */
  async getStudentsByArchetype(archetype: string): Promise<CoachingIntelligence[]> {
    const allIntelligence = await this.loadAllIntelligence();
    return allIntelligence.filter(intel =>
      intel.session_metadata.student_archetype.toLowerCase().includes(archetype.toLowerCase())
    );
  }

  /**
   * Get all intelligence file paths
   */
  private async getAllIntelligenceFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.dataDirectory);
      return files
        .filter(f => f.endsWith('_structured.json'))
        .map(f => path.join(this.dataDirectory, f));
    } catch (error) {
      console.error(`Failed to read coaching intelligence directory ${this.dataDirectory}:`, error);
      return [];
    }
  }

  /**
   * Clear cache (useful for testing or reloading data)
   */
  clearCache(): void {
    this.cache.clear();
    this.aggregatedCache = null;
  }
}
