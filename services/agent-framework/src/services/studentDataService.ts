/**
 * Student Data Service - Real Database Integration for v17.0 Orchestration
 *
 * Purpose: Provides real student data from Postgres for StrategyOrchestrator
 * Replaces placeholder data with actual facts from vital_facts and kb_items
 *
 * From: v17.2 Database Integration
 * Version: v17.2
 */

import { pool } from '../db/pool.js';
import { pgQuery } from '../observability/wrappers.js';
import { resolveFacts } from './facts-canonical.js';

/**
 * Get student context for intent classification
 */
export async function getStudentContext(studentId: string) {
  try {
    // Query vital facts for basic student info
    const facts = await resolveFacts(studentId, [
      'gpa_unweighted',
      'gpa_weighted',
      'sat_total_score',
      'act_composite',
      'grade_level'
    ]);

    // Get KB items count (ECs, awards, etc.)
    const { rows: kbCounts } = await pgQuery(
      pool,
      'student_kb_counts',
      `SELECT
         COUNT(*) FILTER (WHERE item_type = 'EC') as ec_count,
         COUNT(*) FILTER (WHERE item_type = 'Award_Competition') as award_count,
         COUNT(*) FILTER (WHERE item_type LIKE 'Leadership%') as leadership_count
       FROM kb_items
       WHERE student_id = $1 AND current_state NOT IN ('Archived', 'Deleted')`,
      [studentId]
    );

    const kbData = kbCounts[0] || { ec_count: 0, award_count: 0, leadership_count: 0 };

    // Determine archetype based on actual data
    let archetype = 'high_achiever'; // default
    const gpa = parseFloat(facts.gpa_unweighted?.value || '0');
    const sat = parseInt(facts.sat_total_score?.value || '0');
    const ecCount = parseInt(kbData.ec_count);

    if (gpa >= 3.9 && sat >= 1500 && ecCount >= 10) {
      archetype = 'high_achiever';
    } else if (gpa >= 3.7 && ecCount >= 8) {
      archetype = 'well_rounded';
    } else if (ecCount >= 12) {
      archetype = 'super_involved';
    }

    // Calculate burnout level (placeholder - could be enhanced with actual metrics)
    const burnoutLevel = ecCount > 15 ? 0.5 : ecCount > 10 ? 0.35 : 0.2;

    return {
      student_id: studentId,
      archetype,
      grade: parseInt(facts.grade_level?.value || '11'),
      burnout_level: burnoutLevel,
    };
  } catch (error) {
    console.error('[StudentDataService] Error fetching student context:', error);
    // Fallback to defaults
    return {
      student_id: studentId,
      archetype: 'high_achiever',
      grade: 11,
      burnout_level: 0.35,
    };
  }
}

/**
 * Get detailed student context for context engineering
 */
export async function getStudentContextInput(studentId: string) {
  try {
    // Get comprehensive fact set
    const facts = await resolveFacts(studentId, [
      'gpa_unweighted',
      'gpa_weighted',
      'sat_total_score',
      'sat_math_score',
      'sat_ebrw_score',
      'act_composite',
      'grade_level'
    ]);

    // Get KB items for detailed state
    const { rows: kbCounts } = await pgQuery(
      pool,
      'student_detailed_kb',
      `SELECT
         COUNT(*) FILTER (WHERE item_type = 'EC') as ec_count,
         COUNT(*) FILTER (WHERE item_type = 'Award_Competition') as award_count,
         COUNT(*) FILTER (WHERE item_type LIKE 'Leadership%') as leadership_count,
         COUNT(*) FILTER (WHERE item_type = 'Summer_Program') as program_count
       FROM kb_items
       WHERE student_id = $1 AND current_state NOT IN ('Archived', 'Deleted')`,
      [studentId]
    );

    const kbData = kbCounts[0] || { ec_count: 0, award_count: 0, leadership_count: 0, program_count: 0 };

    // Determine archetype
    const gpa = parseFloat(facts.gpa_unweighted?.value || '3.8');
    const sat = parseInt(facts.sat_total_score?.value || '1400');
    const ecCount = parseInt(kbData.ec_count);

    let archetype = 'high_achiever';
    if (gpa >= 3.9 && sat >= 1500 && ecCount >= 10) {
      archetype = 'high_achiever';
    } else if (gpa >= 3.7 && ecCount >= 8) {
      archetype = 'well_rounded';
    } else if (ecCount >= 12) {
      archetype = 'super_involved';
    }

    // Calculate momentum (positive = trending up, negative = trending down)
    const momentum = sat >= 1500 ? 0.75 : sat >= 1400 ? 0.6 : 0.5;

    // Calculate burnout
    const burnoutLevel = ecCount > 15 ? 0.5 : ecCount > 10 ? 0.35 : 0.2;

    return {
      student_id: studentId,
      current_query: '', // Will be set by orchestrator
      archetype,
      state: {
        burnout_level: burnoutLevel,
        momentum,
        gpa: parseFloat(facts.gpa_unweighted?.value || '3.8'),
        test_scores: {
          sat: sat || undefined,
          sat_math: parseInt(facts.sat_math_score?.value || '0') || undefined,
          sat_ebrw: parseInt(facts.sat_ebrw_score?.value || '0') || undefined,
          act: parseInt(facts.act_composite?.value || '0') || undefined,
        },
        ec_count: parseInt(kbData.ec_count),
        leadership_positions: parseInt(kbData.leadership_count),
        awards_count: parseInt(kbData.award_count),
        programs_count: parseInt(kbData.program_count),
      },
    };
  } catch (error) {
    console.error('[StudentDataService] Error fetching detailed student context:', error);
    // Fallback to defaults
    return {
      student_id: studentId,
      current_query: '',
      archetype: 'high_achiever',
      state: {
        burnout_level: 0.35,
        momentum: 0.75,
        gpa: 3.98,
        test_scores: { sat: 1520 },
        ec_count: 12,
        leadership_positions: 4,
        awards_count: 5,
        programs_count: 2,
      },
    };
  }
}

/**
 * Get coach persona (currently hardcoded to Jenny)
 */
export async function getCoachPersona(coachId: string) {
  // In the future, query coaches/eq_profiles table
  // For now, return Jenny's default profile
  return {
    coach_id: coachId,
    coach_name: 'Jenny',
    eq_profile: {
      warmth: 0.85,
      directness: 0.70,
      humor: 0.65,
      empathy: 0.90,
      cheerfulness: 0.80,
    },
    linguistic_style: {
      formality: 0.4,
      enthusiasm: 0.8,
      emoji_use: true,
    },
    intervention_style: {
      directive_ratio: 0.4,
      socratic_ratio: 0.6,
    },
  };
}

/**
 * Get SQL-grounded facts for context engineering
 * These are the authoritative facts that prevent hallucination
 */
export async function getGroundingFacts(studentId: string): Promise<string[]> {
  try {
    const facts = await resolveFacts(studentId, [
      'gpa_unweighted',
      'gpa_weighted',
      'sat_total_score',
      'sat_math_score',
      'sat_ebrw_score',
      'act_composite',
      'grade_level'
    ]);

    const groundingFacts: string[] = [];

    if (facts.gpa_unweighted?.value) {
      groundingFacts.push(`Student has unweighted GPA: ${facts.gpa_unweighted.value}`);
    }
    if (facts.gpa_weighted?.value) {
      groundingFacts.push(`Student has weighted GPA: ${facts.gpa_weighted.value}`);
    }
    if (facts.sat_total_score?.value) {
      groundingFacts.push(`Student's SAT total score: ${facts.sat_total_score.value}`);
    }
    if (facts.sat_math_score?.value) {
      groundingFacts.push(`Student's SAT Math: ${facts.sat_math_score.value}`);
    }
    if (facts.sat_ebrw_score?.value) {
      groundingFacts.push(`Student's SAT EBRW: ${facts.sat_ebrw_score.value}`);
    }
    if (facts.act_composite?.value) {
      groundingFacts.push(`Student's ACT composite: ${facts.act_composite.value}`);
    }
    if (facts.grade_level?.value) {
      groundingFacts.push(`Student is in grade ${facts.grade_level.value}`);
    }

    // Get KB items summary
    const { rows: kbSummary } = await pgQuery(
      pool,
      'grounding_kb_summary',
      `SELECT
         item_type,
         COUNT(*) as count
       FROM kb_items
       WHERE student_id = $1 AND current_state NOT IN ('Archived', 'Deleted')
       GROUP BY item_type
       ORDER BY count DESC`,
      [studentId]
    );

    for (const row of kbSummary) {
      groundingFacts.push(`Student has ${row.count} ${row.item_type} items`);
    }

    return groundingFacts;
  } catch (error) {
    console.error('[StudentDataService] Error fetching grounding facts:', error);
    return ['Student data is currently being loaded'];
  }
}
