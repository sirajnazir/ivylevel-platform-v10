/**
 * TYPE-082: Gap Analysis Engine Intelligence
 *
 * Purpose: Identify gaps across Academic, EC, Awards, and Narrative dimensions
 * with priority categorization and gap-closing action recommendations.
 *
 * Framework: 4-Category Gap Analysis (Academics, ECs, Awards, Narrative)
 * - Gap Size = Target Score - Current Score
 * - Gap Priority = Gap Size × Dimension Weight × Urgency
 * - Categories: P0 (critical), P1 (high), P2 (medium), P3 (low)
 *
 * Core Algorithm:
 * 1. Compare current state vs ideal rubric benchmarks
 * 2. Calculate gap sizes per dimension
 * 3. Prioritize gaps by urgency and impact
 * 4. Generate gap-closing actions
 * 5. Estimate time/effort required
 *
 * Created: 2025-10-29
 * Version: v23.0 AssessmentAgent Intelligence Types
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

interface Gap {
  category: 'academic' | 'ec' | 'awards' | 'narrative';
  gap_title: string;
  current_state: string;
  target_state: string;
  gap_size: number; // 0-10
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  closing_actions: string[];
  estimated_weeks: number;
  impact_on_ivyscore: number; // Points boost if closed
}

interface GapAnalysisResult {
  student_id: string;
  total_gaps: number;
  p0_gaps: Gap[];
  p1_gaps: Gap[];
  p2_gaps: Gap[];
  overall_gap_score: number; // 0-100 (lower = more gaps)
  quick_wins: Gap[]; // High impact, low effort
  long_term_gaps: Gap[]; // High impact, high effort
  next_actions: string[];
}

export class GapAnalysisEngine implements IntelligenceType {
  type_id = 'TYPE-082';
  name = 'Gap Analysis Engine';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';
  description = 'Identifies gaps across Academic, EC, Awards, Narrative dimensions with priority categorization';

  components = {
    framework: {
      name: '4-Category Gap Analysis',
      description: 'Systematic gap identification and prioritization across key dimensions',
      mental_model: 'Gap = Where you need to be - Where you are now',
    },
    tactics: [
      {
        name: 'Gap Identification',
        description: 'Compare current vs target state',
        steps: ['Define target benchmarks', 'Assess current state', 'Calculate gap size', 'Prioritize by impact × urgency'],
      },
    ],
    techniques: [],
    chips: [],
    metrics: {
      success_criteria: ['All critical gaps identified', 'Actions assigned to P0 gaps', 'Timeline feasible'],
      validation: 'Gap closure correlates with IvyScore improvement',
    },
    triggers: {
      conditions: ['gaps', 'weaknesses', 'improve', 'missing', 'need'],
    },
  };

  private readonly IDEAL_BENCHMARKS = {
    academic: { gpa: 3.9, ap_courses: 8, test_scores: '1500+' },
    ec: { activities: 5, leadership_roles: 2, depth_years: 3 },
    awards: { national: 1, regional: 3, school: 5 },
    narrative: { identity_clarity: 9, story_coherence: 8, authenticity: 9 },
  };

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;
    const allFacts = facts.getAllFacts();

    // Identify gaps across categories
    const academicGaps = this.identifyAcademicGaps(allFacts);
    const ecGaps = this.identifyECGaps(allFacts);
    const awardsGaps = this.identifyAwardsGaps(allFacts);
    const narrativeGaps = this.identifyNarrativeGaps(allFacts);

    const allGaps = [...academicGaps, ...ecGaps, ...awardsGaps, ...narrativeGaps];

    // Categorize by priority
    const p0Gaps = allGaps.filter(g => g.priority === 'P0');
    const p1Gaps = allGaps.filter(g => g.priority === 'P1');
    const p2Gaps = allGaps.filter(g => g.priority === 'P2');

    // Identify quick wins (high impact, <8 weeks)
    const quickWins = allGaps.filter(g => g.impact_on_ivyscore >= 5 && g.estimated_weeks <= 8);

    // Calculate overall gap score
    const overallGapScore = Math.max(0, 100 - (allGaps.reduce((sum, g) => sum + g.gap_size, 0) * 2));

    const nextActions = this.generateNextActions(p0Gaps, quickWins);

    const result: GapAnalysisResult = {
      student_id: studentId,
      total_gaps: allGaps.length,
      p0_gaps: p0Gaps,
      p1_gaps: p1Gaps,
      p2_gaps: p2Gaps,
      overall_gap_score: overallGapScore,
      quick_wins: quickWins,
      long_term_gaps: allGaps.filter(g => g.estimated_weeks > 20),
      next_actions: nextActions,
    };

    return {
      type_id: this.type_id,
      component: 'gap_analysis_engine',
      triggered: true,
      confidence: 0.85,
      data: result,
    };
  }

  private identifyAcademicGaps(facts: any[]): Gap[] {
    const gaps: Gap[] = [];

    // GPA gap
    const gpaFact = facts.find(f => JSON.stringify(f).toLowerCase().includes('gpa'));
    const gpa = gpaFact ? parseFloat(JSON.stringify(gpaFact).match(/(\d\.\d+)/)?.[1] || '0') : 0;
    if (gpa < this.IDEAL_BENCHMARKS.academic.gpa) {
      gaps.push({
        category: 'academic',
        gap_title: 'GPA below target',
        current_state: `GPA: ${gpa}`,
        target_state: `GPA: ${this.IDEAL_BENCHMARKS.academic.gpa}+`,
        gap_size: (this.IDEAL_BENCHMARKS.academic.gpa - gpa) * 10,
        priority: 'P0',
        closing_actions: ['Focus on core subjects', 'Seek tutoring if needed', 'Maintain upward trend'],
        estimated_weeks: 52,
        impact_on_ivyscore: 8,
      });
    }

    // AP/rigor gap
    const apCount = facts.filter(f => JSON.stringify(f).toLowerCase().includes('ap')).length;
    if (apCount < 5) {
      gaps.push({
        category: 'academic',
        gap_title: 'Limited course rigor',
        current_state: `${apCount} AP courses`,
        target_state: '8+ AP courses',
        gap_size: 6,
        priority: 'P1',
        closing_actions: ['Enroll in AP courses next year', 'Consider dual enrollment', 'Take summer courses'],
        estimated_weeks: 40,
        impact_on_ivyscore: 6,
      });
    }

    return gaps;
  }

  private identifyECGaps(facts: any[]): Gap[] {
    const gaps: Gap[] = [];
    const activityCount = facts.filter(f => f.category === 'ACTIVITY_DATA').length;

    if (activityCount < 3) {
      gaps.push({
        category: 'ec',
        gap_title: 'Insufficient extracurricular activities',
        current_state: `${activityCount} activities`,
        target_state: '5+ activities with depth',
        gap_size: 7,
        priority: 'P0',
        closing_actions: ['Join 2-3 aligned clubs', 'Seek leadership roles', 'Build consistent involvement'],
        estimated_weeks: 24,
        impact_on_ivyscore: 7,
      });
    }

    const leadershipCount = facts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('president') || JSON.stringify(f).toLowerCase().includes('captain')
    ).length;
    if (leadershipCount === 0) {
      gaps.push({
        category: 'ec',
        gap_title: 'No leadership positions',
        current_state: '0 leadership roles',
        target_state: '2+ leadership roles',
        gap_size: 8,
        priority: 'P0',
        closing_actions: ['Run for club leadership', 'Found new initiative', 'Take captain role in sport/activity'],
        estimated_weeks: 16,
        impact_on_ivyscore: 8,
      });
    }

    return gaps;
  }

  private identifyAwardsGaps(facts: any[]): Gap[] {
    const gaps: Gap[] = [];
    const awardCount = facts.filter(f => JSON.stringify(f).toLowerCase().includes('award')).length;

    if (awardCount < 2) {
      gaps.push({
        category: 'awards',
        gap_title: 'Limited recognition/awards',
        current_state: `${awardCount} awards`,
        target_state: '3+ awards (at least 1 regional+)',
        gap_size: 8,
        priority: 'P1',
        closing_actions: ['Apply to NCWIT, Scholastic, etc.', 'Enter subject competitions', 'Submit to science fairs'],
        estimated_weeks: 12,
        impact_on_ivyscore: 9,
      });
    }

    return gaps;
  }

  private identifyNarrativeGaps(facts: any[]): Gap[] {
    const gaps: Gap[] = [];
    const narrativeFacts = facts.filter(f => f.category === 'ASSESSMENT_DATA');

    if (narrativeFacts.length < 2) {
      gaps.push({
        category: 'narrative',
        gap_title: 'Identity/narrative unclear',
        current_state: 'Limited self-awareness',
        target_state: 'Clear identity thread + authentic voice',
        gap_size: 7,
        priority: 'P1',
        closing_actions: ['Complete discovery phase', 'Define identity keywords', 'Craft narrative thread'],
        estimated_weeks: 8,
        impact_on_ivyscore: 7,
      });
    }

    return gaps;
  }

  private generateNextActions(p0Gaps: Gap[], quickWins: Gap[]): string[] {
    const actions: string[] = [];

    if (p0Gaps.length > 0) {
      actions.push(`🎯 Address ${p0Gaps.length} critical gaps (P0) immediately`);
      actions.push(`Start: ${p0Gaps[0].gap_title} → ${p0Gaps[0].closing_actions[0]}`);
    }

    if (quickWins.length > 0) {
      actions.push(`⚡ ${quickWins.length} quick wins available (high impact, <8 weeks)`);
    }

    return actions;
  }
}
