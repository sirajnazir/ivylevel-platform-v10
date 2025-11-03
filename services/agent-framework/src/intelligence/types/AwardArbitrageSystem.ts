/**
 * TYPE-023: Award Arbitrage System
 *
 * Domain-Specific Intelligence Type for Awards Agent
 *
 * Purpose: Score and rank awards using 4-dimension matrix to maximize
 * win probability while maintaining prestige and essay reusability.
 *
 * Formula: Score = (Alignment × 3) + (Odds × 2) + (Prestige × 2) + (Essay Reuse × 1)
 *
 * Data Source:
 * - /data/coaching_intelligence/extractions/huda_assess_plus_gameplan/02-B-Huda-GamePlan-Creation.jsonl (Line 7)
 * - /data/eq/sessions/jenny_eq_session_w008_extract.json (Award reverse engineering)
 * - 93 weeks validated: 33% win rate, NCWIT 70% probability, Congressional App 60%
 *
 * Created: 2025-10-29
 */

import {
  BaseIntelligenceType,
  AgentQuery,
  IntelligenceResult,
  IntelligenceComponents
} from './BaseIntelligenceType.js';
import { FactSet } from '../../facts/FactSet.js';

/**
 * Award data structure
 */
interface Award {
  award_id: string;
  name: string;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  deadline: string;
  categories: string[];        // e.g., ['computing', 'women_in_tech', 'creative']
  past_winner_profiles: string[]; // Patterns from past winners
  essay_required: boolean;
  essay_word_count?: number;
  eligibility: {
    gender?: string[];
    grade?: number[];
    location?: string[];
    interests?: string[];
  };
}

/**
 * Scored award result
 */
interface ScoredAward extends Award {
  alignment_score: number;    // 0-10
  odds_score: number;         // 0-10
  prestige_score: number;     // 0-10
  essay_reuse_score: number;  // 0-10
  total_score: number;        // Weighted sum
  reasoning: string;          // Why this score
  probability: number;        // 0-100% win probability
  strategic_positioning: string; // How to frame project
}

/**
 * Award Arbitrage System Intelligence Type
 */
export class AwardArbitrageSystem extends BaseIntelligenceType {
  type_id = 'TYPE-023';
  name = 'Award Arbitrage System';
  category = 'DOMAIN_SPECIFIC' as const;
  description = '4-dimension scoring matrix: Alignment, Odds, Prestige, Essay Reuse';

  components: IntelligenceComponents = {
    framework: {
      name: 'Award Arbitrage Framework',
      description: 'Score awards across 4 dimensions to find highest ROI opportunities',
      mental_model: 'Like stock picking: maximize returns (prestige) while minimizing risk (low odds)'
    },

    tactics: [
      {
        name: 'Reverse Engineering',
        description: 'Study past winners to identify winning patterns',
        steps: [
          'Research past 3 years of winners',
          'Identify common themes (AI ethics, games for good, education)',
          'Extract winning project characteristics',
          'Match student project to winner patterns',
          'Frame student work using winner language'
        ],
        when_to_use: 'Before applying to any competitive award'
      },
      {
        name: '4-Dimension Scoring',
        description: 'Calculate weighted score across all dimensions',
        steps: [
          'Calculate Alignment (student profile + narrative fit): 0-10',
          'Calculate Odds (competition saturation + fit): 0-10',
          'Calculate Prestige (tier + recognition level): 0-10',
          'Calculate Essay Reuse (word count + prompt similarity): 0-10',
          'Apply weights: (Alignment × 3) + (Odds × 2) + (Prestige × 2) + (Essay Reuse × 1)',
          'Filter by score threshold (≥50 recommended)',
          'Order by probability (not prestige)'
        ]
      },
      {
        name: 'Strategic Positioning',
        description: 'Frame student work to match award criteria',
        steps: [
          'Identify award\'s core values (e.g., NCWIT: women + computing + impact)',
          'Extract 2-3 positioning angles from student work',
          'Align project description to award language',
          'Emphasize dimensions award cares about',
          'De-emphasize aspects award doesn\'t value'
        ],
        when_to_use: 'When drafting award applications'
      }
    ],

    techniques: [
      { name: 'Alignment Calculation', action: 'Score narrative fit + demographic match + project type' },
      { name: 'Odds Calculation', action: 'Assess competition level + regional vs. national + applicant pool size' },
      { name: 'Prestige Mapping', action: 'Map award tier (T1-T4) to prestige score (10-2)' },
      { name: 'Essay Reuse Assessment', action: 'Calculate similarity between prompts + word count overlap' }
    ],

    chips: [
      {
        type: 'formula',
        name: 'Award Score Formula',
        content: {
          formula: '(Alignment × 3) + (Odds × 2) + (Prestige × 2) + (Essay Reuse × 1)',
          weights: { alignment: 3, odds: 2, prestige: 2, essay_reuse: 1 },
          threshold: 50,
          max_score: 80
        }
      },
      {
        type: 'data',
        name: 'NCWIT Victory Blueprint',
        content: {
          award_name: 'NCWIT Aspirations in Computing',
          probability: 70,
          winning_patterns: [
            'AI ethics + education',
            'Games for social good',
            'Tech education platforms',
            'Women in computing focus',
            'Measurable impact metrics'
          ],
          strategic_framing: 'Frame project as education tool for young women in tech',
          past_winners: ['AI ethics game', 'CS teaching platform', 'Diversity in tech initiative']
        }
      },
      {
        type: 'data',
        name: 'Congressional App Challenge Blueprint',
        content: {
          award_name: 'Congressional App Challenge',
          probability: 60,
          winning_patterns: [
            'Local community impact',
            'Clear problem-solution',
            'Well-documented code',
            'User testimonials'
          ],
          strategic_framing: 'Emphasize local district impact and community benefit',
          advantage: 'Regional competition, less saturated than national'
        }
      },
      {
        type: 'data',
        name: 'Award Tier Classification',
        content: {
          T1: { prestige: 10, examples: ['ISEF finalist', 'Presidential Scholar', 'National YoungArts winner'] },
          T2: { prestige: 7, examples: ['NCWIT', 'Congressional App winner', 'Scholastic Gold Key'] },
          T3: { prestige: 4, examples: ['Regional Science Fair winner', 'State-level honors'] },
          T4: { prestige: 2, examples: ['School-level awards', 'Participation certificates'] }
        }
      }
    ],

    metrics: {
      success_criteria: [
        '33% overall win rate across applications',
        '70% application rate (from recommendations)',
        'Average score ≥60 for recommended awards',
        'Top 3 awards have ≥60% win probability'
      ],
      validation: 'Validate recommendations against past student outcomes',
      target_metrics: {
        win_rate: 0.33,
        application_rate: 0.70,
        avg_score: 60,
        top_3_probability: 0.60
      }
    },

    triggers: {
      conditions: [
        'award',
        'competition',
        'recognition',
        'honor',
        'win',
        'apply',
        'ncwit',
        'congressional app',
        'scholastic',
        'what awards'
      ]
    }
  };

  /**
   * Process query and return scored award recommendations
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    // Check if this intelligence should activate
    if (!this.shouldActivate(query, facts)) {
      return this.createInactiveResult('award_recommendations');
    }

    try {
      // Extract required facts
      const narrative = facts.getValueByType('unique_narrative') as string;
      const activities = facts.getValueByType('activity_data') as any[];
      const demographic = facts.getValueByType('student_profile') as any;
      const targetSchools = facts.getValueByType('target_schools') as string[];

      // Get award database (placeholder - would come from database/external source)
      const awardDatabase = this.getAwardDatabase();

      // Score each award
      const scoredAwards = awardDatabase.map(award =>
        this.scoreAward(award, narrative, activities, demographic, targetSchools)
      );

      // Filter by threshold and sort by score
      const recommendedAwards = scoredAwards
        .filter(award => award.total_score >= 50)
        .sort((a, b) => b.probability - a.probability)  // Order by probability, not prestige!
        .slice(0, 10);  // Top 10

      return {
        type_id: this.type_id,
        component: 'award_recommendations',
        data: {
          recommended_awards: recommendedAwards,
          total_evaluated: awardDatabase.length,
          above_threshold: scoredAwards.filter(a => a.total_score >= 50).length,
          scoring_breakdown: recommendedAwards.map(a => ({
            name: a.name,
            total_score: a.total_score,
            probability: a.probability,
            dimensions: {
              alignment: a.alignment_score,
              odds: a.odds_score,
              prestige: a.prestige_score,
              essay_reuse: a.essay_reuse_score
            }
          }))
        },
        confidence: 0.9,
        metadata: {
          formula_applied: this.components.chips[0].content,
          narrative_used: narrative?.slice(0, 100) + '...'
        },
        chips_used: ['Award Score Formula', 'NCWIT Victory Blueprint', 'Award Tier Classification'],
        triggered: true
      };

    } catch (error) {
      console.error('Award Arbitrage processing error:', error);
      return {
        type_id: this.type_id,
        component: 'award_recommendations',
        data: { error: 'Failed to process award recommendations' },
        confidence: 0,
        triggered: true
      };
    }
  }

  /**
   * Score individual award across 4 dimensions
   */
  private scoreAward(
    award: Award,
    narrative: string,
    activities: any[],
    demographic: any,
    targetSchools: string[]
  ): ScoredAward {
    // Dimension 1: Alignment (0-10)
    const alignment_score = this.calculateAlignment(award, narrative, activities, demographic);

    // Dimension 2: Odds (0-10)
    const odds_score = this.calculateOdds(award, demographic);

    // Dimension 3: Prestige (0-10)
    const prestige_score = this.getTierScore(award.tier);

    // Dimension 4: Essay Reuse (0-10)
    const essay_reuse_score = award.essay_required ? this.calculateEssayReuse(award) : 5;

    // Apply formula: (Alignment × 3) + (Odds × 2) + (Prestige × 2) + (Essay Reuse × 1)
    const total_score = (alignment_score * 3) + (odds_score * 2) + (prestige_score * 2) + (essay_reuse_score * 1);

    // Convert score to probability (rough heuristic)
    const probability = this.scoreToProbability(total_score, odds_score);

    return {
      ...award,
      alignment_score,
      odds_score,
      prestige_score,
      essay_reuse_score,
      total_score,
      probability,
      reasoning: this.generateReasoning(alignment_score, odds_score, prestige_score, award),
      strategic_positioning: this.generatePositioning(award, narrative)
    };
  }

  /**
   * Calculate alignment score (0-10)
   */
  private calculateAlignment(award: Award, narrative: string, activities: any[], demographic: any): number {
    let score = 5; // Baseline

    // Narrative alignment
    if (narrative && award.categories.some(cat => narrative.toLowerCase().includes(cat))) {
      score += 2;
    }

    // Demographic match (e.g., female for women in tech awards)
    if (demographic.gender && award.eligibility.gender?.includes(demographic.gender)) {
      score += 2;
    }

    // Activity type match
    const hasRelevantActivity = activities?.some(act =>
      award.categories.some(cat => act.activity_name?.toLowerCase().includes(cat))
    );
    if (hasRelevantActivity) {
      score += 1;
    }

    return Math.min(10, score);
  }

  /**
   * Calculate odds score (0-10) - higher = better odds
   */
  private calculateOdds(award: Award, demographic: any): number {
    let score = 5; // Baseline

    // Regional competitions have better odds
    if (award.name.toLowerCase().includes('regional') || award.name.toLowerCase().includes('congressional')) {
      score += 3;
    }

    // Tier affects odds (lower tier = better odds)
    if (award.tier === 'T3' || award.tier === 'T4') {
      score += 2;
    } else if (award.tier === 'T1') {
      score -= 2;
    }

    return Math.max(1, Math.min(10, score));
  }

  /**
   * Get prestige score from tier (0-10)
   */
  private getTierScore(tier: string): number {
    const tierScores = { T1: 10, T2: 7, T3: 4, T4: 2 };
    return tierScores[tier as keyof typeof tierScores] || 5;
  }

  /**
   * Calculate essay reuse potential (0-10)
   */
  private calculateEssayReuse(award: Award): number {
    if (!award.essay_required) return 10;

    // Common essay length gets higher reuse score
    if (award.essay_word_count && award.essay_word_count <= 500) {
      return 8;
    } else if (award.essay_word_count && award.essay_word_count <= 1000) {
      return 6;
    }

    return 4;
  }

  /**
   * Convert total score to win probability %
   */
  private scoreToProbability(totalScore: number, oddsScore: number): number {
    // Rough heuristic: score 80 = ~70% probability, score 50 = ~30% probability
    const baseProbability = (totalScore / 80) * 70;

    // Adjust based on odds
    const oddsFactor = oddsScore / 10;

    return Math.min(90, Math.max(10, baseProbability * (0.7 + oddsFactor * 0.3)));
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(alignment: number, odds: number, prestige: number, award: Award): string {
    const reasons: string[] = [];

    if (alignment >= 8) reasons.push('Excellent narrative fit');
    else if (alignment >= 6) reasons.push('Good alignment with profile');
    else reasons.push('Moderate fit');

    if (odds >= 7) reasons.push('Strong winning odds');
    else if (odds >= 5) reasons.push('Competitive but achievable');
    else reasons.push('Highly competitive');

    if (prestige >= 8) reasons.push('High prestige (T1/T2)');
    else if (prestige >= 5) reasons.push('Solid recognition (T2/T3)');

    return reasons.join(', ');
  }

  /**
   * Generate strategic positioning advice
   */
  private generatePositioning(award: Award, narrative: string): string {
    // Match NCWIT pattern
    if (award.name.includes('NCWIT')) {
      return 'Frame project as education tool for young women in tech. Emphasize measurable impact and community benefit.';
    }

    // Match Congressional App pattern
    if (award.name.includes('Congressional')) {
      return 'Emphasize local district impact and community benefit. Include user testimonials.';
    }

    // Generic positioning
    return 'Align project description to award values. Quantify impact with specific metrics.';
  }

  /**
   * Get award database (placeholder - would query real database)
   */
  private getAwardDatabase(): Award[] {
    // TODO: Replace with actual database query
    return [
      {
        award_id: 'ncwit_aspirations',
        name: 'NCWIT Aspirations in Computing',
        tier: 'T2',
        deadline: 'October 1',
        categories: ['computing', 'women_in_tech', 'education', 'impact'],
        past_winner_profiles: ['AI ethics', 'tech education', 'games for good'],
        essay_required: true,
        essay_word_count: 500,
        eligibility: { gender: ['female'], grade: [9, 10, 11, 12] }
      },
      {
        award_id: 'congressional_app',
        name: 'Congressional App Challenge',
        tier: 'T2',
        deadline: 'November 1',
        categories: ['coding', 'app', 'community_impact'],
        past_winner_profiles: ['local impact', 'social good', 'education'],
        essay_required: true,
        essay_word_count: 300,
        eligibility: { grade: [9, 10, 11, 12] }
      },
      {
        award_id: 'scholastic_art_writing',
        name: 'Scholastic Art & Writing Awards',
        tier: 'T2',
        deadline: 'December 15',
        categories: ['creative', 'writing', 'art', 'film'],
        past_winner_profiles: ['creative work', 'storytelling', 'visual arts'],
        essay_required: false,
        eligibility: { grade: [7, 8, 9, 10, 11, 12] }
      }
      // Add more awards...
    ];
  }
}
