/**
 * TYPE-060: Seasonal Energy Allocation Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: Exploration→Exploitation Ratio per Phase
 *
 * Purpose: Adjust activity mix based on college application phase.
 * Prevents exploration burnout (trying too many things too late) and
 * protects application throughput (finishing strong when it matters).
 *
 * Algorithm: Phase-Based Energy Allocation
 *
 * **Phase 1-2 (9th-10th Grade): 70% Explore / 30% Exploit**
 * - Explore: Try many activities, find passion, build foundation
 * - Exploit: Double down on 1-2 proven interests
 * - Rationale: Discovery phase - cast wide net, see what sticks
 * - Activities: Clubs, sports, arts, volunteering, coding, research (try everything)
 *
 * **Phase 3-4 (11th Grade): 50% Explore / 50% Exploit**
 * - Explore: Test new opportunities (summer programs, competitions)
 * - Exploit: Scale flagship projects, build leadership
 * - Rationale: Focus phase - proven interests become signature work
 * - Activities: Leadership roles, project scale-up, awards applications
 *
 * **Phase 5 (12th Grade Fall): 20% Explore / 80% Exploit**
 * - Explore: Only if high-ROI (quick win competitions, scholarships)
 * - Exploit: Finish strong, protect application throughput
 * - Rationale: Execution phase - complete what you started, no new rabbit holes
 * - Activities: Application completion, proofpack assembly, sustain existing work
 *
 * **Energy Allocation Formula**:
 * Total weekly hours = Explore hours + Exploit hours
 * Explore% = (New activities + Exploration tasks) / Total
 * Exploit% = (Existing projects + Sustaining tasks) / Total
 *
 * **Red Flags**:
 * - 11th grade with 90% Explore → Too scattered, no depth
 * - 12th fall with 60% Explore → Starting new projects too late
 * - 9th grade with 10% Explore → Too narrow too early, missing discovery
 *
 * Data Sources:
 * - W000-STRATEGY-021 (Seasonal energy patterns from coaching)
 * - Student grade level (9th, 10th, 11th, 12th)
 * - Activity facts (new vs. ongoing)
 * - Current date (to determine phase)
 *
 * Output: SeasonalEnergyResult
 * - current_phase: Phase 1-5
 * - recommended_ratio: Explore% / Exploit%
 * - actual_ratio: Current Explore% / Exploit%
 * - alignment_score: How well actual matches recommended (0-100)
 * - activity_prioritization: Which activities to continue/start/drop
 * - recommendations: Adjustments to energy allocation
 *
 * Created: 2025-10-29
 * Version: v20.5
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Application phase
 */
type ApplicationPhase = 'Phase1-2' | 'Phase3-4' | 'Phase5';

/**
 * Energy ratio
 */
interface EnergyRatio {
  explore_percentage: number; // 0-100
  exploit_percentage: number; // 0-100
}

/**
 * Activity categorization
 */
interface ActivityCategorization {
  activity_name: string;
  category: 'explore' | 'exploit';
  rationale: string;
  hours_per_week: number;
}

/**
 * Activity prioritization
 */
interface ActivityPrioritization {
  activity_name: string;
  recommendation: 'continue' | 'scale_up' | 'scale_down' | 'drop';
  rationale: string;
  impact_if_dropped: 'low' | 'medium' | 'high';
}

/**
 * Seasonal energy result
 */
interface SeasonalEnergyResult {
  current_phase: ApplicationPhase;
  phase_description: string;
  recommended_ratio: EnergyRatio;
  actual_ratio: EnergyRatio;
  alignment_score: number; // 0-100
  activity_categorizations: ActivityCategorization[];
  activity_prioritizations: ActivityPrioritization[];
  red_flags: string[];
  recommendations: string[];
}

export class SeasonalEnergyAllocation implements IntelligenceType {
  type_id = 'TYPE-060';
  name = 'Seasonal Energy Allocation';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.5';

  /**
   * Phase definitions
   */
  private readonly PHASE_DEFINITIONS = {
    'Phase1-2': {
      description: '9th-10th Grade: Discovery Phase',
      recommended_ratio: { explore_percentage: 70, exploit_percentage: 30 },
      guidance: 'Try many things, find passion, build foundation',
    },
    'Phase3-4': {
      description: '11th Grade: Focus Phase',
      recommended_ratio: { explore_percentage: 50, exploit_percentage: 50 },
      guidance: 'Focus on proven interests, scale projects, build leadership',
    },
    'Phase5': {
      description: '12th Grade Fall: Execution Phase',
      recommended_ratio: { explore_percentage: 20, exploit_percentage: 80 },
      guidance: 'Finish strong, protect application throughput, no new rabbit holes',
    },
  };

  /**
   * Process seasonal energy analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Determine current phase
    const profileFacts = facts.facts.filter(f => f.category === 'STUDENT_PROFILE');
    const currentPhase = this.determinePhase(profileFacts);
    const phaseDefn = this.PHASE_DEFINITIONS[currentPhase];

    // Extract activity facts
    const activityFacts = facts.facts.filter(f => f.category === 'ACTIVITIES');

    // Categorize activities as explore vs. exploit
    const activityCategorizations = this.categorizeActivities(activityFacts, currentPhase);

    // Calculate actual energy ratio
    const actualRatio = this.calculateActualRatio(activityCategorizations);

    // Calculate alignment score
    const alignmentScore = this.calculateAlignmentScore(actualRatio, phaseDefn.recommended_ratio);

    // Prioritize activities (continue/scale/drop)
    const activityPrioritizations = this.prioritizeActivities(activityCategorizations, currentPhase, actualRatio, phaseDefn.recommended_ratio);

    // Detect red flags
    const redFlags = this.detectRedFlags(currentPhase, actualRatio, phaseDefn.recommended_ratio);

    // Generate recommendations
    const recommendations = this.generateRecommendations(currentPhase, actualRatio, phaseDefn.recommended_ratio, alignmentScore, activityPrioritizations);

    const result: SeasonalEnergyResult = {
      current_phase: currentPhase,
      phase_description: phaseDefn.description,
      recommended_ratio: phaseDefn.recommended_ratio,
      actual_ratio: actualRatio,
      alignment_score: alignmentScore,
      activity_categorizations: activityCategorizations,
      activity_prioritizations: activityPrioritizations,
      red_flags: redFlags,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  /**
   * Determine current application phase
   */
  private determinePhase(profileFacts: any[]): ApplicationPhase {
    const gradeLevel = profileFacts[0]?.data?.grade_level || profileFacts[0]?.data?.current_grade || '11';

    if (gradeLevel === '9' || gradeLevel === '10' || gradeLevel === '9th' || gradeLevel === '10th') {
      return 'Phase1-2';
    } else if (gradeLevel === '11' || gradeLevel === '11th') {
      return 'Phase3-4';
    } else {
      return 'Phase5'; // 12th grade
    }
  }

  /**
   * Categorize activities as explore or exploit
   */
  private categorizeActivities(activityFacts: any[], currentPhase: ApplicationPhase): ActivityCategorization[] {
    const categorizations: ActivityCategorization[] = [];

    activityFacts.forEach(fact => {
      const activity = fact.data;
      if (!activity) return;

      const activityName = activity.name || activity.title || 'Unnamed Activity';
      const hoursPerWeek = activity.hours_per_week || activity.weekly_hours || 2;
      const startDate = activity.start_date || activity.date_started;
      const yearsInvolved = activity.years_involved || 1;

      // Determine if explore or exploit
      let category: 'explore' | 'exploit';
      let rationale = '';

      // Exploit criteria: Long-term commitment (2+ years) OR leadership role
      const isLongTerm = yearsInvolved >= 2;
      const isLeadership = (activity.position_title || '').match(/President|Captain|Founder|Lead|Director/i);

      if (isLongTerm || isLeadership) {
        category = 'exploit';
        rationale = isLongTerm
          ? `${yearsInvolved}+ years commitment (exploit existing investment)`
          : 'Leadership role (exploit established position)';
      } else {
        // Explore: New activity (< 1 year) OR trying out something
        category = 'explore';
        rationale = 'New activity or exploration (< 2 years involvement)';
      }

      categorizations.push({
        activity_name: activityName,
        category: category,
        rationale: rationale,
        hours_per_week: hoursPerWeek,
      });
    });

    return categorizations;
  }

  /**
   * Calculate actual energy ratio
   */
  private calculateActualRatio(categorizations: ActivityCategorization[]): EnergyRatio {
    const totalHours = categorizations.reduce((sum, c) => sum + c.hours_per_week, 0);

    if (totalHours === 0) {
      return { explore_percentage: 0, exploit_percentage: 0 };
    }

    const exploreHours = categorizations
      .filter(c => c.category === 'explore')
      .reduce((sum, c) => sum + c.hours_per_week, 0);

    const exploitHours = categorizations
      .filter(c => c.category === 'exploit')
      .reduce((sum, c) => sum + c.hours_per_week, 0);

    return {
      explore_percentage: Math.round((exploreHours / totalHours) * 100),
      exploit_percentage: Math.round((exploitHours / totalHours) * 100),
    };
  }

  /**
   * Calculate alignment score
   */
  private calculateAlignmentScore(actual: EnergyRatio, recommended: EnergyRatio): number {
    // Calculate distance from recommended ratio
    const exploreDiff = Math.abs(actual.explore_percentage - recommended.explore_percentage);
    const exploitDiff = Math.abs(actual.exploit_percentage - recommended.exploit_percentage);
    const totalDiff = (exploreDiff + exploitDiff) / 2;

    // Score: 100 - (distance from ideal)
    const score = Math.max(0, 100 - totalDiff);
    return Math.round(score);
  }

  /**
   * Prioritize activities (continue/scale/drop)
   */
  private prioritizeActivities(
    categorizations: ActivityCategorization[],
    currentPhase: ApplicationPhase,
    actualRatio: EnergyRatio,
    recommendedRatio: EnergyRatio
  ): ActivityPrioritization[] {
    const prioritizations: ActivityPrioritization[] = [];

    categorizations.forEach(categorization => {
      let recommendation: 'continue' | 'scale_up' | 'scale_down' | 'drop';
      let rationale = '';
      let impactIfDropped: 'low' | 'medium' | 'high' = 'medium';

      // Exploit activities
      if (categorization.category === 'exploit') {
        if (currentPhase === 'Phase5') {
          // 12th grade: Sustain exploit activities
          recommendation = 'continue';
          rationale = 'Sustain flagship work through application season';
          impactIfDropped = 'high'; // Don't drop exploit in Phase 5
        } else {
          // Earlier phases: Scale up exploit if strong
          recommendation = 'scale_up';
          rationale = 'Focus on proven interests, build depth';
          impactIfDropped = 'high';
        }
      }
      // Explore activities
      else {
        if (currentPhase === 'Phase1-2') {
          // 9th-10th: Continue exploring
          recommendation = 'continue';
          rationale = 'Discovery phase - keep exploring';
          impactIfDropped = 'low';
        } else if (currentPhase === 'Phase3-4') {
          // 11th: Scale down explore if too much exploration
          if (actualRatio.explore_percentage > recommendedRatio.explore_percentage + 10) {
            recommendation = 'scale_down';
            rationale = '11th grade - shift from explore to exploit';
            impactIfDropped = 'low';
          } else {
            recommendation = 'continue';
            rationale = 'Balanced exploration OK in 11th grade';
            impactIfDropped = 'medium';
          }
        } else {
          // 12th: Drop explore unless high-ROI
          recommendation = 'drop';
          rationale = '12th grade - protect application throughput, no new projects';
          impactIfDropped = 'low'; // OK to drop explore in Phase 5
        }
      }

      prioritizations.push({
        activity_name: categorization.activity_name,
        recommendation: recommendation,
        rationale: rationale,
        impact_if_dropped: impactIfDropped,
      });
    });

    return prioritizations;
  }

  /**
   * Detect red flags
   */
  private detectRedFlags(
    currentPhase: ApplicationPhase,
    actualRatio: EnergyRatio,
    recommendedRatio: EnergyRatio
  ): string[] {
    const redFlags: string[] = [];

    // Phase 3-4 (11th grade) with >70% Explore
    if (currentPhase === 'Phase3-4' && actualRatio.explore_percentage > 70) {
      redFlags.push('🚨 11th grade with >70% Explore - Too scattered, need more depth in proven interests');
    }

    // Phase 5 (12th fall) with >40% Explore
    if (currentPhase === 'Phase5' && actualRatio.explore_percentage > 40) {
      redFlags.push('🚨 12th grade fall with >40% Explore - Starting new projects too late, protect application throughput');
    }

    // Phase 1-2 (9th-10th) with <40% Explore
    if (currentPhase === 'Phase1-2' && actualRatio.explore_percentage < 40) {
      redFlags.push('⚠️ 9th-10th grade with <40% Explore - Too narrow too early, missing discovery opportunities');
    }

    // No exploit activities in Phase 3-4/5
    if ((currentPhase === 'Phase3-4' || currentPhase === 'Phase5') && actualRatio.exploit_percentage < 30) {
      redFlags.push('⚠️ No flagship projects to scale - need depth in 1-2 proven interests');
    }

    return redFlags;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    currentPhase: ApplicationPhase,
    actualRatio: EnergyRatio,
    recommendedRatio: EnergyRatio,
    alignmentScore: number,
    prioritizations: ActivityPrioritization[]
  ): string[] {
    const recommendations: string[] = [];

    // Overall alignment
    if (alignmentScore >= 80) {
      recommendations.push(`✅ Excellent energy allocation (${alignmentScore}% aligned with phase ${currentPhase})`);
    } else if (alignmentScore >= 60) {
      recommendations.push(`✅ Good energy allocation (${alignmentScore}% aligned), minor adjustments recommended`);
    } else {
      recommendations.push(`⚠️ Energy allocation misaligned (${alignmentScore}% aligned) - significant adjustments needed`);
    }

    // Phase-specific guidance
    if (currentPhase === 'Phase1-2') {
      recommendations.push('Phase 1-2 Focus: Try many activities, find what energizes you');
      recommendations.push('Target: 70% Explore (try new things) / 30% Exploit (double down on 1-2 proven interests)');

      if (actualRatio.explore_percentage < 60) {
        recommendations.push('Action: Add 2-3 new exploration activities (clubs, volunteering, competitions)');
      }
    } else if (currentPhase === 'Phase3-4') {
      recommendations.push('Phase 3-4 Focus: Scale proven interests, build leadership');
      recommendations.push('Target: 50% Explore (test opportunities) / 50% Exploit (flagship projects)');

      if (actualRatio.explore_percentage > 60) {
        recommendations.push('Action: Drop 1-2 exploration activities, focus on scaling your flagship project');
      }
      if (actualRatio.exploit_percentage < 40) {
        recommendations.push('Action: Identify 1-2 flagship projects and scale up (leadership, user growth, impact)');
      }
    } else {
      recommendations.push('Phase 5 Focus: Finish strong, protect application throughput');
      recommendations.push('Target: 20% Explore (quick wins only) / 80% Exploit (sustain existing work)');

      if (actualRatio.explore_percentage > 30) {
        const explorePrioritizations = prioritizations.filter(p =>
          p.recommendation === 'drop' || p.recommendation === 'scale_down'
        );
        recommendations.push('Action: Drop new projects - focus on completing what you started');
        explorePrioritizations.slice(0, 3).forEach(p => {
          recommendations.push(`  - Consider dropping: ${p.activity_name} (${p.rationale})`);
        });
      }
    }

    return recommendations;
  }
}
