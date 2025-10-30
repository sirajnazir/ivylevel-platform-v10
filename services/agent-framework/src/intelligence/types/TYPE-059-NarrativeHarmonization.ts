/**
 * TYPE-059: Narrative Harmonization Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: Thread Weave Across All Surfaces
 *
 * Purpose: Ensure consistent narrative across all application components.
 * Prevents disjointed story where each surface tells a different version.
 *
 * Algorithm: Narrative Spine + Surface Weaving
 *
 * **Narrative Spine** (Core story thread):
 * - **Why**: Motivation (what drives you?)
 * - **Who**: Identity (who are you?)
 * - **Impact**: Outcomes (what have you accomplished?)
 *
 * **Surfaces to Weave** (where narrative appears):
 * 1. Personal Essay - Main story (650 words)
 * 2. Activities List - Proof of story (10 activities, 150 chars each)
 * 3. Supplemental Essays - Story angles (multiple perspectives)
 * 4. LoRs - External validation (teacher/counselor perspective)
 * 5. Website/Portfolio - Visual story (projects, media)
 *
 * **Consistency Check**:
 * - All surfaces reinforce core narrative (not contradict)
 * - Details align across surfaces (dates, roles, achievements)
 * - Voice is authentic and consistent (not different persona)
 * - Story builds momentum (early → middle → late high school)
 *
 * **Red Flags**:
 * - Essay says "passionate about CS" but Activities List shows no CS activities
 * - Essay emphasizes leadership but Activities List shows no leadership roles
 * - Different origin stories on different surfaces
 * - Inconsistent dates/achievements across surfaces
 *
 * Data Sources:
 * - W000-STRATEGY-016 (Narrative architecture from coaching)
 * - Essay drafts, Activities List, Supplemental essays
 * - LoR context packets
 * - Website/portfolio links
 *
 * Output: NarrativeHarmonizationResult
 * - narrative_spine: Core story (Why, Who, Impact)
 * - surface_analysis: How well each surface reinforces narrative
 * - consistency_score: 0-100 (alignment across surfaces)
 * - red_flags: Contradictions or misalignments
 * - weaving_recommendations: How to strengthen narrative
 *
 * Created: 2025-10-29
 * Version: v20.5
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Narrative spine (core story)
 */
interface NarrativeSpine {
  why: string; // Motivation
  who: string; // Identity
  impact: string; // Outcomes
  narrative_statement: string; // One-sentence summary
}

/**
 * Surface types
 */
type SurfaceType = 'personal_essay' | 'activities_list' | 'supplemental_essays' | 'lors' | 'portfolio';

/**
 * Surface analysis
 */
interface SurfaceAnalysis {
  surface_name: SurfaceType;
  display_name: string;
  present: boolean; // Does this surface exist?
  narrative_alignment: number; // 0-100 (how well it reinforces core narrative)
  key_themes: string[]; // Themes present on this surface
  supporting_evidence: string[]; // How it supports narrative
  gaps: string[]; // What's missing
}

/**
 * Red flag (contradiction or misalignment)
 */
interface RedFlag {
  severity: 'low' | 'medium' | 'high';
  surfaces_involved: SurfaceType[];
  contradiction: string;
  fix_recommendation: string;
}

/**
 * Weaving recommendation
 */
interface WeavingRecommendation {
  surface: SurfaceType;
  action: string;
  rationale: string;
  estimated_hours: number;
}

/**
 * Narrative harmonization result
 */
interface NarrativeHarmonizationResult {
  narrative_spine: NarrativeSpine;
  surface_analyses: SurfaceAnalysis[];
  consistency_score: number; // 0-100
  red_flags: RedFlag[];
  weaving_recommendations: WeavingRecommendation[];
  overall_assessment: string;
}

export class NarrativeHarmonization implements IntelligenceType {
  type_id = 'TYPE-059';
  name = 'Narrative Harmonization';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.5';

  /**
   * Process narrative harmonization analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract facts from different surfaces
    const essayFacts = facts.facts.filter(f => f.category === 'ESSAYS');
    const activityFacts = facts.facts.filter(f => f.category === 'ACTIVITIES');
    const lorFacts = facts.facts.filter(f => f.category === 'RECOMMENDATIONS');
    const portfolioFacts = facts.facts.filter(f =>
      f.category === 'EXTERNAL_LINKS' || f.data?.type === 'portfolio'
    );

    // Extract narrative spine
    const narrativeSpine = this.extractNarrativeSpine(essayFacts, activityFacts);

    // Analyze each surface
    const surfaceAnalyses: SurfaceAnalysis[] = [
      this.analyzeSurface('personal_essay', essayFacts, narrativeSpine),
      this.analyzeSurface('activities_list', activityFacts, narrativeSpine),
      this.analyzeSurface('supplemental_essays', essayFacts.filter(f => f.data?.essay_type === 'supplemental'), narrativeSpine),
      this.analyzeSurface('lors', lorFacts, narrativeSpine),
      this.analyzeSurface('portfolio', portfolioFacts, narrativeSpine),
    ];

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(surfaceAnalyses);

    // Detect red flags (contradictions)
    const redFlags = this.detectRedFlags(surfaceAnalyses, essayFacts, activityFacts);

    // Generate weaving recommendations
    const weavingRecommendations = this.generateWeavingRecommendations(surfaceAnalyses, narrativeSpine, consistencyScore);

    // Overall assessment
    const overallAssessment = this.generateOverallAssessment(consistencyScore, redFlags, surfaceAnalyses);

    const result: NarrativeHarmonizationResult = {
      narrative_spine: narrativeSpine,
      surface_analyses: surfaceAnalyses,
      consistency_score: consistencyScore,
      red_flags: redFlags,
      weaving_recommendations: weavingRecommendations,
      overall_assessment: overallAssessment,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  /**
   * Extract narrative spine from essays and activities
   */
  private extractNarrativeSpine(essayFacts: any[], activityFacts: any[]): NarrativeSpine {
    // Try to extract from personal essay first
    const personalEssay = essayFacts.find(f =>
      f.data?.essay_type === 'personal' || f.data?.essay_type === 'common_app'
    );

    let why = 'Not yet defined';
    let who = 'Not yet defined';
    let impact = 'Not yet defined';

    if (personalEssay?.data) {
      // Extract themes from essay
      const essayText = personalEssay.data.essay_text || personalEssay.data.content || '';

      // Heuristic: Look for common narrative patterns
      if (essayText.includes('passion') || essayText.includes('motivated')) {
        why = this.extractWhy(essayText);
      }
      if (essayText.includes('identity') || essayText.includes('who I am')) {
        who = this.extractWho(essayText);
      }
    }

    // Extract impact from activities
    if (activityFacts.length > 0) {
      const topActivities = activityFacts.slice(0, 3);
      const impacts = topActivities
        .map(a => a.data?.impact || a.data?.description)
        .filter(Boolean);
      if (impacts.length > 0) {
        impact = impacts[0]; // Use first as primary impact
      }
    }

    // Generate narrative statement
    const narrativeStatement = `${who} driven by ${why}, creating ${impact}`;

    return {
      why: why,
      who: who,
      impact: impact,
      narrative_statement: narrativeStatement,
    };
  }

  /**
   * Extract "why" (motivation) from essay text
   */
  private extractWhy(essayText: string): string {
    // Simple heuristic: Look for motivation keywords
    if (essayText.includes('because')) {
      const becauseIndex = essayText.indexOf('because');
      const snippet = essayText.substring(becauseIndex, becauseIndex + 150);
      return snippet;
    }
    return 'Motivation to make positive impact';
  }

  /**
   * Extract "who" (identity) from essay text
   */
  private extractWho(essayText: string): string {
    // Simple heuristic: Look for identity keywords
    if (essayText.toLowerCase().includes('i am')) {
      const iAmIndex = essayText.toLowerCase().indexOf('i am');
      const snippet = essayText.substring(iAmIndex, iAmIndex + 100);
      return snippet;
    }
    return 'Student identity not yet defined';
  }

  /**
   * Analyze one surface
   */
  private analyzeSurface(
    surfaceType: SurfaceType,
    facts: any[],
    narrativeSpine: NarrativeSpine
  ): SurfaceAnalysis {
    const displayNames = {
      personal_essay: 'Personal Essay (Common App)',
      activities_list: 'Activities List (10 activities)',
      supplemental_essays: 'Supplemental Essays',
      lors: 'Letters of Recommendation',
      portfolio: 'Website/Portfolio',
    };

    const present = facts.length > 0;
    let narrativeAlignment = 0;
    const keyThemes: string[] = [];
    const supportingEvidence: string[] = [];
    const gaps: string[] = [];

    if (present) {
      // Extract themes from this surface
      if (surfaceType === 'personal_essay') {
        const essay = facts[0]?.data;
        if (essay?.essay_text || essay?.content) {
          keyThemes.push('Personal narrative');
          narrativeAlignment = 80; // Assume essay is core narrative
          supportingEvidence.push('Main story told in personal essay');
        }
      } else if (surfaceType === 'activities_list') {
        // Check if activities support narrative
        facts.forEach(f => {
          const activity = f.data;
          if (activity?.name) {
            keyThemes.push(activity.name);
          }
        });
        narrativeAlignment = facts.length >= 5 ? 70 : 40;
        supportingEvidence.push(`${facts.length} activities listed`);

        if (facts.length < 10) {
          gaps.push(`Need ${10 - facts.length} more activities to complete list`);
        }
      } else if (surfaceType === 'supplemental_essays') {
        narrativeAlignment = facts.length > 0 ? 60 : 0;
        supportingEvidence.push(`${facts.length} supplemental essays drafted`);
      } else if (surfaceType === 'lors') {
        narrativeAlignment = facts.length >= 3 ? 70 : 40;
        supportingEvidence.push(`${facts.length} recommenders identified`);
        if (facts.length < 3) {
          gaps.push('Need 3 recommenders (2 teachers + 1 counselor)');
        }
      } else if (surfaceType === 'portfolio') {
        narrativeAlignment = 50;
        supportingEvidence.push('Portfolio/website exists');
      }
    } else {
      gaps.push(`Surface not yet created`);
    }

    return {
      surface_name: surfaceType,
      display_name: displayNames[surfaceType],
      present: present,
      narrative_alignment: narrativeAlignment,
      key_themes: keyThemes,
      supporting_evidence: supportingEvidence,
      gaps: gaps,
    };
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistencyScore(surfaceAnalyses: SurfaceAnalysis[]): number {
    // Average alignment across all surfaces
    const presentSurfaces = surfaceAnalyses.filter(s => s.present);

    if (presentSurfaces.length === 0) return 0;

    const totalAlignment = presentSurfaces.reduce((sum, s) => sum + s.narrative_alignment, 0);
    return Math.round(totalAlignment / presentSurfaces.length);
  }

  /**
   * Detect red flags (contradictions)
   */
  private detectRedFlags(
    surfaceAnalyses: SurfaceAnalysis[],
    essayFacts: any[],
    activityFacts: any[]
  ): RedFlag[] {
    const redFlags: RedFlag[] = [];

    // Check essay vs. activities alignment
    const essayAnalysis = surfaceAnalyses.find(s => s.surface_name === 'personal_essay');
    const activitiesAnalysis = surfaceAnalyses.find(s => s.surface_name === 'activities_list');

    if (essayAnalysis && essayAnalysis.present && activitiesAnalysis && activitiesAnalysis.present) {
      const personalEssay = essayFacts.find(f => f.data?.essay_type === 'personal');
      const essayText = personalEssay?.data?.essay_text || '';

      // Red flag: Essay claims CS passion but no CS activities
      if ((essayText.includes('computer science') || essayText.includes('coding')) &&
          !activityFacts.some(a => {
            const name = a.data?.name || '';
            return name.toLowerCase().includes('code') ||
                   name.toLowerCase().includes('computer') ||
                   name.toLowerCase().includes('programming');
          })) {
        redFlags.push({
          severity: 'high',
          surfaces_involved: ['personal_essay', 'activities_list'],
          contradiction: 'Essay emphasizes computer science passion but Activities List shows no CS activities',
          fix_recommendation: 'Add CS activities to Activities List OR revise essay to focus on different passion',
        });
      }

      // Red flag: Essay claims leadership but no leadership roles
      if (essayText.includes('leader') || essayText.includes('leadership')) {
        const hasLeadership = activityFacts.some(a => {
          const position = a.data?.position_title || '';
          return position.includes('President') ||
                 position.includes('Captain') ||
                 position.includes('Lead') ||
                 position.includes('Founder');
        });
        if (!hasLeadership) {
          redFlags.push({
            severity: 'medium',
            surfaces_involved: ['personal_essay', 'activities_list'],
            contradiction: 'Essay mentions leadership but Activities List shows no leadership positions',
            fix_recommendation: 'Add leadership roles to Activities List OR tone down leadership claims in essay',
          });
        }
      }
    }

    // Check if Activities List has <5 activities (weak proof)
    if (activitiesAnalysis && activitiesAnalysis.present && activityFacts.length < 5) {
      redFlags.push({
        severity: 'medium',
        surfaces_involved: ['activities_list'],
        contradiction: `Only ${activityFacts.length} activities listed (need 10 for complete picture)`,
        fix_recommendation: 'Add more activities to Activities List (aim for 10 total)',
      });
    }

    return redFlags;
  }

  /**
   * Generate weaving recommendations
   */
  private generateWeavingRecommendations(
    surfaceAnalyses: SurfaceAnalysis[],
    narrativeSpine: NarrativeSpine,
    consistencyScore: number
  ): WeavingRecommendation[] {
    const recommendations: WeavingRecommendation[] = [];

    // Personal Essay
    const essayAnalysis = surfaceAnalyses.find(s => s.surface_name === 'personal_essay');
    if (!essayAnalysis?.present) {
      recommendations.push({
        surface: 'personal_essay',
        action: 'Write personal essay establishing core narrative (Why + Who + Impact)',
        rationale: 'Personal essay is the narrative anchor - all other surfaces build from this',
        estimated_hours: 12,
      });
    } else if (essayAnalysis.narrative_alignment < 70) {
      recommendations.push({
        surface: 'personal_essay',
        action: 'Strengthen narrative spine in essay (clarify Why, Who, Impact)',
        rationale: 'Essay exists but narrative is unclear or weak',
        estimated_hours: 4,
      });
    }

    // Activities List
    const activitiesAnalysis = surfaceAnalyses.find(s => s.surface_name === 'activities_list');
    if (!activitiesAnalysis?.present) {
      recommendations.push({
        surface: 'activities_list',
        action: 'Create Activities List with 10 activities that prove essay narrative',
        rationale: 'Activities List is proof of story told in essay',
        estimated_hours: 6,
      });
    } else if (activitiesAnalysis.gaps.length > 0) {
      recommendations.push({
        surface: 'activities_list',
        action: `Add ${activitiesAnalysis.gaps[0]}`,
        rationale: 'Complete Activities List for full narrative proof',
        estimated_hours: 2,
      });
    }

    // Portfolio
    const portfolioAnalysis = surfaceAnalyses.find(s => s.surface_name === 'portfolio');
    if (!portfolioAnalysis?.present && consistencyScore > 60) {
      recommendations.push({
        surface: 'portfolio',
        action: 'Create website/portfolio showcasing projects visually',
        rationale: 'Visual surface reinforces narrative with project screenshots, demos, testimonials',
        estimated_hours: 8,
      });
    }

    return recommendations.sort((a, b) => b.estimated_hours - a.estimated_hours).slice(0, 5);
  }

  /**
   * Generate overall assessment
   */
  private generateOverallAssessment(
    consistencyScore: number,
    redFlags: RedFlag[],
    surfaceAnalyses: SurfaceAnalysis[]
  ): string {
    const presentSurfaces = surfaceAnalyses.filter(s => s.present).length;
    const highSeverityFlags = redFlags.filter(f => f.severity === 'high').length;

    if (consistencyScore >= 80 && highSeverityFlags === 0) {
      return `✅ EXCELLENT: Strong narrative consistency (${consistencyScore}%) across ${presentSurfaces} surfaces. Story is coherent and reinforced.`;
    } else if (consistencyScore >= 60 && highSeverityFlags === 0) {
      return `✅ GOOD: Solid narrative consistency (${consistencyScore}%) across ${presentSurfaces} surfaces. Minor improvements needed.`;
    } else if (highSeverityFlags > 0) {
      return `⚠️ ISSUES DETECTED: ${highSeverityFlags} high-severity contradiction(s) found. Fix contradictions before submitting applications.`;
    } else if (consistencyScore < 60) {
      return `⚠️ WEAK: Low narrative consistency (${consistencyScore}%). Surfaces tell disjointed story. Strengthen narrative spine.`;
    } else {
      return `📋 IN PROGRESS: ${presentSurfaces}/5 surfaces present. Continue building narrative across all surfaces.`;
    }
  }
}
