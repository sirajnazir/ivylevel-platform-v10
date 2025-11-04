/**
 * TYPE-025: Content Recycling Matrix (15+ Touchpoints)
 * Category: DOMAIN_SPECIFIC (AwardsAgent)
 *
 * Purpose: Maximize ROI per hour of writing by recycling core narratives
 * across 15+ application touchpoints (award essays, college supplements,
 * activities descriptions, interviews, etc.)
 *
 * Framework: Single Core → 15+ Touchpoints
 *
 * Pattern: Write ONE foundational 400-word narrative (8 hours) →
 * Reuse across 15+ touchpoints (10 hours adaptations) = 5,000+ words output
 * vs. Writing from scratch: 50+ hours for same 5,000 words
 * Efficiency Gain: 2.8X
 *
 * Critical Rule: Adaptation (20-30%) prevents generic applications while
 * maintaining efficiency. Never copy-paste 100% - always contextualize.
 *
 * Source: W001 Huda essay reuse strategy (weeks 40-50), content analysis
 *
 * Created: 2025-11-04
 * Version: v29.6
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

/**
 * Touchpoint type
 */
type TouchpointType =
  | 'common_app_personal_statement'
  | 'award_essay'
  | 'college_supplement'
  | 'scholarship_essay'
  | 'activity_description'
  | 'additional_info'
  | 'interview_prep'
  | 'resume_summary'
  | 'linkedin_about'
  | 'video_script'
  | 'blog_post';

/**
 * Content touchpoint
 */
interface ContentTouchpoint {
  touchpoint_id: string;
  touchpoint_name: string;
  touchpoint_type: TouchpointType;
  reuse_percentage: number; // 0-100
  word_count: number;
  adaptation_needed: string; // What needs to be customized
  status: 'not_started' | 'in_progress' | 'completed';
}

/**
 * Core narrative
 */
interface CoreNarrative {
  narrative_id: string;
  narrative_title: string; // e.g., "The Connection Moment"
  word_count: number;
  time_investment_hours: number;
  key_elements: string[]; // Story beats
  themes: string[]; // Identity, synthesis, impact, vision
  touchpoints: ContentTouchpoint[]; // All applications using this narrative
}

/**
 * Content recycling result
 */
interface ContentRecyclingResult {
  core_narratives: CoreNarrative[];
  total_touchpoints: number;
  total_word_count: number;
  total_time_investment_hours: number;
  efficiency_multiplier: number; // vs. writing from scratch
  reuse_map: Record<string, string[]>; // Core narrative → Touchpoints
  recommendations: string[];
}

export class ContentRecyclingMatrix implements IntelligenceType {
  type_id = 'TYPE-025';
  name = 'Content Recycling Matrix';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'AwardsAgent';
  version = 'v29.6';

  /**
   * Recommended reuse percentages by touchpoint type
   */
  private readonly REUSE_GUIDELINES: Record<TouchpointType, number> = {
    common_app_personal_statement: 100, // Use core narrative fully
    award_essay: 90, // High reuse, add award-specific context
    college_supplement: 80, // Adapt for school fit
    scholarship_essay: 90, // High reuse, add financial context
    activity_description: 70, // Focused on specific activity
    additional_info: 60, // Supplement main narrative
    interview_prep: 80, // Speaking notes based on core
    resume_summary: 50, // Condensed version
    linkedin_about: 60, // Professional adaptation
    video_script: 70, // Visual storytelling format
    blog_post: 80, // Expanded narrative version
  };

  /**
   * Process content recycling strategy
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const profileFacts = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE);
    const narrativeFacts = facts.get(FactCategory.UNIQUE_NARRATIVE) || [];

    // Identify core narratives (would come from kb_items in production)
    const coreNarratives = this.identifyCoreNarratives(narrativeFacts, profileFacts);

    // Generate touchpoint recommendations for each narrative
    const narrativesWithTouchpoints = coreNarratives.map((narrative) =>
      this.generateTouchpoints(narrative)
    );

    // Calculate efficiency metrics
    const totalTouchpoints = narrativesWithTouchpoints.reduce(
      (sum, n) => sum + n.touchpoints.length,
      0
    );
    const totalWordCount = narrativesWithTouchpoints.reduce(
      (sum, n) => sum + n.touchpoints.reduce((s, t) => s + t.word_count, 0),
      0
    );
    const totalTimeInvestment = narrativesWithTouchpoints.reduce(
      (sum, n) => sum + n.time_investment_hours,
      0
    );

    // Calculate efficiency multiplier (vs. writing from scratch)
    const scratchTimeEstimate = totalWordCount / 100; // 100 words/hour for original writing
    const efficiencyMultiplier = scratchTimeEstimate / totalTimeInvestment;

    // Build reuse map
    const reuseMap: Record<string, string[]> = {};
    narrativesWithTouchpoints.forEach((narrative) => {
      reuseMap[narrative.narrative_title] = narrative.touchpoints.map((t) => t.touchpoint_name);
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      narrativesWithTouchpoints,
      totalTouchpoints
    );

    const result: ContentRecyclingResult = {
      core_narratives: narrativesWithTouchpoints,
      total_touchpoints: totalTouchpoints,
      total_word_count: totalWordCount,
      total_time_investment_hours: totalTimeInvestment,
      efficiency_multiplier: Math.round(efficiencyMultiplier * 10) / 10,
      reuse_map: reuseMap,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      component: 'content_recycling',
      triggered: true,
      confidence: 0.85,
      data: result,
    };
  }

  /**
   * Identify core narratives from student facts
   */
  private identifyCoreNarratives(narrativeFacts: any[], profileFacts: any[]): CoreNarrative[] {
    // For v29.6, return mock core narrative to establish architecture
    // TODO: Extract from kb_items where item_type='Essay' or 'Narrative'

    const mockNarrative: CoreNarrative = {
      narrative_id: 'core_narrative_001',
      narrative_title: 'The Connection Moment',
      word_count: 400,
      time_investment_hours: 8,
      key_elements: [
        'Sophomore film class (weeks for 3-min scene) vs. CS class (3-hour app) → feeling broken',
        'Discovered interactive storytelling → code becomes narrative',
        'Identity: Not choosing between film and CS, building bridges',
        'Evolution: Synthoria → Empowering AI → Folklift',
        'Vision: Democratizing narrative technology for marginalized voices',
      ],
      themes: ['Identity synthesis', 'Technical creativity', 'Social impact', 'Bridge-building'],
      touchpoints: [], // Will be populated by generateTouchpoints()
    };

    return [mockNarrative];
  }

  /**
   * Generate touchpoints for a core narrative
   */
  private generateTouchpoints(narrative: CoreNarrative): CoreNarrative {
    const touchpoints: ContentTouchpoint[] = [
      {
        touchpoint_id: 'tp_001',
        touchpoint_name: 'Common App Personal Statement',
        touchpoint_type: 'common_app_personal_statement',
        reuse_percentage: 100,
        word_count: 650,
        adaptation_needed: 'Expand core narrative by 250 words (650 total)',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_002',
        touchpoint_name: 'NCWIT Computing Journey Essay',
        touchpoint_type: 'award_essay',
        reuse_percentage: 90,
        word_count: 500,
        adaptation_needed: 'Emphasize teaching/impact angle, add NCWIT values alignment',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_003',
        touchpoint_name: 'Congressional App Impact Essay',
        touchpoint_type: 'award_essay',
        reuse_percentage: 70,
        word_count: 300,
        adaptation_needed: 'Focus on Synthoria app specifics, technical implementation',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_004',
        touchpoint_name: 'USC Why This Major Supplement',
        touchpoint_type: 'college_supplement',
        reuse_percentage: 80,
        word_count: 250,
        adaptation_needed: 'Connect digital storytelling to USC Games program, add school-specific fit',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_005',
        touchpoint_name: 'MIT Activities Essay',
        touchpoint_type: 'college_supplement',
        reuse_percentage: 70,
        word_count: 300,
        adaptation_needed: 'Technical emphasis, computational creativity, MIT culture fit',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_006',
        touchpoint_name: 'Gates Scholarship Essay',
        touchpoint_type: 'scholarship_essay',
        reuse_percentage: 90,
        word_count: 500,
        adaptation_needed: 'Add financial need context, family background',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_007',
        touchpoint_name: 'Common App Activity #1: Empowering AI',
        touchpoint_type: 'activity_description',
        reuse_percentage: 70,
        word_count: 150,
        adaptation_needed: 'Condense to project-specific impact metrics',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_008',
        touchpoint_name: 'Common App Activity #2: Synthoria',
        touchpoint_type: 'activity_description',
        reuse_percentage: 60,
        word_count: 150,
        adaptation_needed: 'Focus on technical implementation, user impact',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_009',
        touchpoint_name: 'Common App Activity #3: Folklift',
        touchpoint_type: 'activity_description',
        reuse_percentage: 60,
        word_count: 150,
        adaptation_needed: 'Highlight cultural preservation angle, technical innovation',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_010',
        touchpoint_name: 'Additional Info Section',
        touchpoint_type: 'additional_info',
        reuse_percentage: 50,
        word_count: 300,
        adaptation_needed: 'Supplement main essay with context (parent immigration story)',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_011',
        touchpoint_name: 'Interview Talking Points',
        touchpoint_type: 'interview_prep',
        reuse_percentage: 80,
        word_count: 400,
        adaptation_needed: 'Convert to speaking notes, add conversation flow',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_012',
        touchpoint_name: 'Resume Summary',
        touchpoint_type: 'resume_summary',
        reuse_percentage: 50,
        word_count: 100,
        adaptation_needed: 'Condense to 2-3 sentences, professional tone',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_013',
        touchpoint_name: 'LinkedIn About Section',
        touchpoint_type: 'linkedin_about',
        reuse_percentage: 60,
        word_count: 200,
        adaptation_needed: 'Professional adaptation, add call-to-action',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_014',
        touchpoint_name: 'YouTube Channel Intro Video Script',
        touchpoint_type: 'video_script',
        reuse_percentage: 70,
        word_count: 400,
        adaptation_needed: 'Visual storytelling format, add B-roll notes',
        status: 'not_started',
      },
      {
        touchpoint_id: 'tp_015',
        touchpoint_name: 'Blog Post: My Journey',
        touchpoint_type: 'blog_post',
        reuse_percentage: 80,
        word_count: 600,
        adaptation_needed: 'Expand with recent updates, casual tone',
        status: 'not_started',
      },
    ];

    // Calculate time investment for adaptations (18 hours total for all touchpoints)
    const adaptationTimeHours = 10;
    const updatedNarrative = {
      ...narrative,
      touchpoints: touchpoints,
      time_investment_hours: narrative.time_investment_hours + adaptationTimeHours,
    };

    return updatedNarrative;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    narratives: CoreNarrative[],
    totalTouchpoints: number
  ): string[] {
    const recommendations: string[] = [];

    if (narratives.length === 0) {
      recommendations.push('🎯 Priority 1: Develop core narrative (400 words, 8 hours investment)');
      recommendations.push(
        '   → Focus: Synthesis moment that captures identity, journey, and vision'
      );
      recommendations.push('   → This investment pays 15X dividends across applications');
    } else {
      recommendations.push(
        `✅ Core narrative exists: "${narratives[0].narrative_title}" (${narratives[0].word_count} words)`
      );
      recommendations.push(`📋 Can be reused across ${totalTouchpoints} application touchpoints`);
    }

    if (totalTouchpoints > 0) {
      recommendations.push(
        '\n💡 Adaptation Strategy: Always customize 20-30% per touchpoint'
      );
      recommendations.push('   → Add school-specific details (USC Games, Stanford Symbolic Systems)');
      recommendations.push('   → Emphasize different aspects (technical for MIT, creative for USC)');
      recommendations.push('   → Add prompt-specific examples (recent achievement, challenge)');
    }

    recommendations.push(
      '\n⚡ Efficiency Gain: 2.8X faster than writing from scratch'
    );
    recommendations.push('   → Core (8h) + Adaptations (10h) = 18h total');
    recommendations.push('   → vs. 50+ hours writing 5,000 words from scratch');

    return recommendations;
  }
}
