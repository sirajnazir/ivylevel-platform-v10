/**
 * ExtracurricularsAgentRefactored - v18.0 Fact-First Architecture
 *
 * Portfolio Architect + Narrative Synthesizer for EC optimization
 *
 * Domain: Extracurricular Activities Strategy & Optimization
 * Intelligence: 70+ coaching frameworks from 93 weeks of real coaching data
 * Spec: /docs/agents/EXTRACURRICULARS_AGENT_TECH_SPEC.md
 *
 * Core Capabilities:
 * - EC Portfolio Audit (Tier Classification T1-T4, Cookie-Cutter Detection)
 * - Narrative Synthesis (Coherent identity from scattered activities)
 * - Strategic Activity Selection (Exploration → Selection → Depth)
 * - Impact Engineering (M0 → M1 → M2 → M3 → M4 escalation)
 * - Time Architecture (168-Hour reality check)
 * - Crisis Management (Strategic Pivot Protocol 48-72h)
 *
 * @version 18.0
 * @date 2025-10-29
 */

import { BaseAgent } from '../BaseAgent';
import { AgentQuery, AgentResponse } from '../types';
import { FactCategory, FactSet, Fact } from '../../facts/types';
import { FactStore } from '../../facts/FactStore';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface Activity {
  activity_id?: string;
  name: string;
  role: string; // Founder, President, VP, Captain, Member
  category: string; // Technology, Service, Arts, etc.
  hours_per_week: number;
  weeks_per_year: number;
  hours_total: number;
  years: string; // "9, 10, 11, 12"
  scope: 'National' | 'Regional' | 'School';
  description: string;
  impact_description?: string;

  // Metrics
  users_reached?: number;
  beneficiaries_with_outcomes?: number;
  dollars_raised?: number;
  revenue?: number;
  media_mentions?: string[];

  // Metadata
  self_initiated?: boolean;
  leadership?: boolean;
  display_order?: number;

  // Intelligence scores
  tier?: 'T1' | 'T2' | 'T3' | 'T4';
  narrative_alignment_score?: number;
  task_multiplication_score?: number;
  metric_level?: 'M0' | 'M1' | 'M2' | 'M3' | 'M4';
}

interface TierClassification {
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  reasoning: string;
}

interface TierAudit {
  T1_count: number;
  T2_count: number;
  T3_count: number;
  T4_count: number;
  diagnosis: 'COMPETITIVE' | 'NEEDS_VALIDATION' | 'WEAK';
  recommendations: string[];
}

interface CookieCutterScore {
  score: number; // 0.0-1.0 (0 = unique, 1 = cookie-cutter)
  diagnosis: 'COOKIE_CUTTER' | 'DIFFERENTIATED' | 'MODERATELY_UNIQUE';
  red_flags: string[];
  recommendations: string[];
}

interface TrinityScore {
  aptitude: number; // 0-10
  passion: number; // 0-10
  service: number; // 0-10
  balanced: boolean;
  weakest_pillar: 'aptitude' | 'passion' | 'service';
}

interface PortfolioAudit {
  tier_audit: TierAudit;
  cookie_cutter_score: CookieCutterScore;
  narrative_alignment: {
    average_score: number;
    weak_activities: { name: string; score: number }[];
  };
  trinity_score: TrinityScore;
  hours_validation: HoursValidation;
}

interface HoursValidation {
  realistic: boolean;
  total_claimed: number;
  available: number;
  overclaimed_by?: number;
  recommendation?: string;
}

interface GapAnalysis {
  trinity_gaps: string[];
  leadership_gaps: string[];
  impact_gaps: { activity: string; current_level: string; target_level: string }[];
  prioritized_fixes: string[];
}

interface Recommendation {
  type: 'time_optimization' | 'activity_addition' | 'activity_pruning' | 'impact_escalation' | 'pivot';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  action_items: string[];
  timeline: string;
  expected_outcome: string;
}

interface StudentDemographic {
  ethnicity?: string;
  gender?: string;
  geography?: string;
}

// ============================================================================
// ExtracurricularsAgentRefactored Class
// ============================================================================

export class ExtracurricularsAgentRefactored extends BaseAgent {
  protected agentDomain = 'extracurriculars' as const;

  constructor(factStore: FactStore) {
    super(factStore);
  }

  /**
   * Define required facts - EC Agent needs comprehensive profile
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,
      FactCategory.ACTIVITIES_LIST,
      FactCategory.UNIQUE_NARRATIVE,
      FactCategory.WEAK_SPOTS,
      FactCategory.AVAILABLE_HOURS_WEEKLY,
      FactCategory.PHASE_GOALS,
      FactCategory.TARGET_SCHOOLS
    ];
  }

  /**
   * Main response generation - NEVER hallucinates, ALWAYS grounded in facts
   */
  protected async generateResponse(
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    // Step 1: Extract relevant facts
    const activities = this.extractActivities(facts);
    const narrative = facts.getValueByType('unique_narrative') as string;
    const weakSpots = facts.getFactsByType('weak_spots').map(f => f.value as string);
    const availableHours = facts.getValueByType('available_hours_weekly') as number || 70;
    const currentPhase = facts.getValueByType('phase') as string || 'FOUNDATION';
    const demographic = this.extractDemographic(facts);
    const grade = (facts.getValueByType('grade') as number) || 10;

    // Step 2: Run comprehensive portfolio audit
    const audit = await this.auditPortfolio(activities, narrative, demographic, availableHours);

    // Step 3: Identify gaps
    const gaps = this.identifyGaps(activities, weakSpots, audit.trinity_score);

    // Step 4: Generate recommendations
    const recommendations = this.generateRecommendations(
      audit,
      gaps,
      availableHours,
      currentPhase,
      grade,
      narrative
    );

    // Step 5: Format response
    return this.formatResponse(audit, gaps, recommendations, query.query);
  }

  // ==========================================================================
  // Portfolio Audit Methods
  // ==========================================================================

  private extractActivities(facts: FactSet): Activity[] {
    const activityFacts = facts.getFactsByType('activities_list');
    return activityFacts.map(f => f.value as Activity);
  }

  private extractDemographic(facts: FactSet): StudentDemographic {
    const demographicFacts = facts.getFactsByType('demographic_data');
    if (demographicFacts.length > 0) {
      return demographicFacts[0].value as StudentDemographic;
    }
    return {};
  }

  private async auditPortfolio(
    activities: Activity[],
    narrative: string,
    demographic: StudentDemographic,
    availableHours: number
  ): Promise<PortfolioAudit> {
    // Classify activities by tier
    const tier_audit = this.auditTiers(activities);

    // Detect cookie-cutter patterns
    const cookie_cutter_score = this.detectCookieCutter(activities, demographic);

    // Calculate narrative alignment
    const narrative_alignment = this.calculateNarrativeAlignment(activities, narrative);

    // Evaluate Profile Trinity (Aptitude × Passion × Service)
    const trinity_score = this.evaluateTrinity(activities);

    // Validate hours
    const hours_validation = this.validateHours(activities, availableHours);

    return {
      tier_audit,
      cookie_cutter_score,
      narrative_alignment,
      trinity_score,
      hours_validation
    };
  }

  /**
   * Tier Classification (T1-T4 Activity Prestige)
   * T1: National validation, $10K+ raised, published research
   * T2: Selective programs, regional leadership
   * T3: School leadership, participation in selective programs
   * T4: Generic participation (NHS, generic volunteering)
   */
  private classifyTier(activity: Activity): TierClassification {
    // T1: National validation
    if (
      activity.scope === 'National' ||
      (activity.dollars_raised && activity.dollars_raised >= 10000) ||
      (activity.media_mentions && activity.media_mentions.length >= 2)
    ) {
      return {
        tier: 'T1',
        reasoning: 'National scope, significant funding, or media validation'
      };
    }

    // T2: Selective programs, regional leadership
    if (
      activity.scope === 'Regional' ||
      (activity.role.match(/Founder|President/i) && activity.hours_per_week >= 6) ||
      activity.name.match(/Stanford|MIT|JCamp|WISE|AI4ALL/i)
    ) {
      return {
        tier: 'T2',
        reasoning: 'Regional leadership or selective program participation'
      };
    }

    // T3: School leadership
    if (
      activity.role.match(/Founder|President|Captain/i) ||
      (activity.leadership && activity.scope === 'School')
    ) {
      return {
        tier: 'T3',
        reasoning: 'School-level leadership'
      };
    }

    // T4: Generic participation
    return {
      tier: 'T4',
      reasoning: 'Generic participation without leadership'
    };
  }

  private auditTiers(activities: Activity[]): TierAudit {
    const classified = activities.map(a => this.classifyTier(a));

    const T1_count = classified.filter(c => c.tier === 'T1').length;
    const T2_count = classified.filter(c => c.tier === 'T2').length;
    const T3_count = classified.filter(c => c.tier === 'T3').length;
    const T4_count = classified.filter(c => c.tier === 'T4').length;

    let diagnosis: 'COMPETITIVE' | 'NEEDS_VALIDATION' | 'WEAK';
    const recommendations: string[] = [];

    if (T1_count + T2_count >= 2) {
      diagnosis = 'COMPETITIVE';
    } else if (T1_count + T2_count >= 1) {
      diagnosis = 'NEEDS_VALIDATION';
      recommendations.push('Add 1-2 more T1 or T2 activities (national awards, selective programs, or significant impact projects)');
    } else {
      diagnosis = 'WEAK';
      recommendations.push('CRITICAL: No T1 or T2 activities. Apply to selective programs (JCamp, MIT WISE, Stanford AI4ALL) or launch high-impact project with measurable outcomes.');
    }

    if (T4_count > 3) {
      recommendations.push(`Prune ${T4_count - 3} generic T4 activities (NHS, generic volunteering) to focus on depth in T1-T2 activities.`);
    }

    return {
      T1_count,
      T2_count,
      T3_count,
      T4_count,
      diagnosis,
      recommendations
    };
  }

  /**
   * Cookie-Cutter Detection
   * Identifies generic profiles that blend into competition
   */
  private detectCookieCutter(activities: Activity[], demographic: StudentDemographic): CookieCutterScore {
    const red_flags: string[] = [];
    let flagCount = 0;

    // Red Flag 1: Demographic stereotypes
    if (demographic.ethnicity === 'Asian' && activities.some(a => a.name.match(/Math|Debate/i))) {
      red_flags.push('Asian + Math/Debate = saturated demographic');
      flagCount++;
    }

    // Red Flag 2: Generic clubs (NHS, Key Club, STEM Club)
    const genericClubs = activities.filter(a => a.name.match(/NHS|Key Club|STEM Club|Science Olympiad/i));
    if (genericClubs.length >= 2) {
      red_flags.push(`${genericClubs.length} generic school clubs (NHS, Key Club, STEM) - low differentiation`);
      flagCount++;
    }

    // Red Flag 3: No self-initiated projects
    const selfInitiated = activities.filter(a => a.self_initiated || a.role.match(/Founder/i));
    if (selfInitiated.length === 0) {
      red_flags.push('No self-initiated projects - all school clubs or programs');
      flagCount++;
    }

    // Red Flag 4: No measurable impact (users, dollars, beneficiaries)
    const withImpact = activities.filter(a =>
      (a.users_reached && a.users_reached > 0) ||
      (a.dollars_raised && a.dollars_raised > 0) ||
      (a.beneficiaries_with_outcomes && a.beneficiaries_with_outcomes > 0)
    );
    if (withImpact.length < 2) {
      red_flags.push('Fewer than 2 activities with quantifiable impact (users, dollars, beneficiaries)');
      flagCount++;
    }

    // Red Flag 5: All activities are school-based
    const nonSchool = activities.filter(a => a.scope !== 'School');
    if (nonSchool.length === 0) {
      red_flags.push('All activities are school-based - no regional or national reach');
      flagCount++;
    }

    const score = flagCount / 5; // 0.0-1.0

    let diagnosis: 'COOKIE_CUTTER' | 'DIFFERENTIATED' | 'MODERATELY_UNIQUE';
    const recommendations: string[] = [];

    if (score >= 0.6) {
      diagnosis = 'COOKIE_CUTTER';
      recommendations.push('🚨 CRITICAL: Profile is cookie-cutter. You need interdisciplinary pivots or self-initiated projects to stand out.');
      recommendations.push('Consider: (1) Algorithmic Justice (CS + social impact), (2) Data Journalism (tech + storytelling), or (3) Climate Tech (STEM + environmental science).');
    } else if (score >= 0.3) {
      diagnosis = 'MODERATELY_UNIQUE';
      recommendations.push('Profile has some differentiation but needs 1-2 more unique elements (self-initiated projects, interdisciplinary focus, or measurable impact).');
    } else {
      diagnosis = 'DIFFERENTIATED';
    }

    return {
      score,
      diagnosis,
      red_flags,
      recommendations
    };
  }

  /**
   * Narrative Alignment Score
   * Calculates how well activities align with student's unique narrative
   */
  private calculateNarrativeAlignment(activities: Activity[], narrative: string): {
    average_score: number;
    weak_activities: { name: string; score: number }[];
  } {
    if (!narrative || narrative.trim() === '') {
      return {
        average_score: 0.5,
        weak_activities: []
      };
    }

    const narrativeKeywords = this.extractKeywords(narrative);

    const scores = activities.map(activity => {
      const activityKeywords = this.extractKeywords(activity.name + ' ' + activity.description);
      const overlap = narrativeKeywords.filter(k => activityKeywords.includes(k)).length;
      const alignmentScore = narrativeKeywords.length > 0 ? overlap / narrativeKeywords.length : 0;

      return {
        name: activity.name,
        score: Math.min(alignmentScore, 1.0)
      };
    });

    const average_score = scores.reduce((sum, s) => sum + s.score, 0) / (scores.length || 1);
    const weak_activities = scores.filter(s => s.score < 0.4);

    return {
      average_score,
      weak_activities
    };
  }

  private extractKeywords(text: string): string[] {
    const cleaned = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3); // Only words longer than 3 chars

    // Remove common stop words
    const stopWords = ['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'they'];
    return cleaned.filter(word => !stopWords.includes(word));
  }

  /**
   * Profile Trinity (Aptitude × Passion × Service)
   * All three pillars must be strong (7+/10) for competitive profile
   */
  private evaluateTrinity(activities: Activity[]): TrinityScore {
    // Aptitude: Awards, technical projects, rigor (inferred from categories)
    const technicalActivities = activities.filter(a =>
      a.category.match(/Technology|Computer Science|Research|Academic/i)
    );
    const aptitude = Math.min(technicalActivities.length * 2.5, 10); // Max 4 activities = 10/10

    // Passion: Self-initiated, multi-year, depth
    const passionActivities = activities.filter(a =>
      (a.self_initiated || a.role.match(/Founder/i)) &&
      a.years.split(',').length >= 2 &&
      a.hours_per_week >= 4
    );
    const passion = Math.min(passionActivities.length * 3, 10); // Max 3-4 activities = 10/10

    // Service: Hours, beneficiaries, measurable impact
    const serviceActivities = activities.filter(a =>
      a.category.match(/Service/i) ||
      (a.beneficiaries_with_outcomes && a.beneficiaries_with_outcomes > 0)
    );
    const totalServiceHours = serviceActivities.reduce((sum, a) => sum + a.hours_total, 0);
    const service = Math.min((totalServiceHours / 200) * 10, 10); // 200+ hours = 10/10

    const balanced = aptitude >= 7 && passion >= 7 && service >= 7;

    let weakest_pillar: 'aptitude' | 'passion' | 'service';
    if (aptitude <= passion && aptitude <= service) {
      weakest_pillar = 'aptitude';
    } else if (passion <= service) {
      weakest_pillar = 'passion';
    } else {
      weakest_pillar = 'service';
    }

    return {
      aptitude: Math.round(aptitude * 10) / 10,
      passion: Math.round(passion * 10) / 10,
      service: Math.round(service * 10) / 10,
      balanced,
      weakest_pillar
    };
  }

  /**
   * 168-Hour Weekly Architecture Reality Check
   * Validates claimed hours against realistic availability
   */
  private validateHours(activities: Activity[], availableHours: number): HoursValidation {
    const totalClaimed = activities.reduce((sum, a) => sum + a.hours_per_week, 0);

    if (totalClaimed > availableHours) {
      return {
        realistic: false,
        total_claimed: totalClaimed,
        available: availableHours,
        overclaimed_by: totalClaimed - availableHours,
        recommendation: `You've claimed ${totalClaimed}h/week but only have ${availableHours}h available (after sleep, school, meals). Reduce homework time or cut low-impact activities.`
      };
    }

    return {
      realistic: true,
      total_claimed: totalClaimed,
      available: availableHours
    };
  }

  // ==========================================================================
  // Gap Analysis Methods
  // ==========================================================================

  private identifyGaps(
    activities: Activity[],
    weakSpots: string[],
    trinityScore: TrinityScore
  ): GapAnalysis {
    const trinity_gaps: string[] = [];
    const leadership_gaps: string[] = [];
    const impact_gaps: { activity: string; current_level: string; target_level: string }[] = [];

    // Trinity gaps
    if (trinityScore.aptitude < 7) {
      trinity_gaps.push(`Aptitude pillar weak (${trinityScore.aptitude}/10). Add technical projects, research, or AP courses.`);
    }
    if (trinityScore.passion < 7) {
      trinity_gaps.push(`Passion pillar weak (${trinityScore.passion}/10). Launch self-initiated project or deepen existing activity to 8+ hours/week.`);
    }
    if (trinityScore.service < 7) {
      trinity_gaps.push(`Service pillar weak (${trinityScore.service}/10). Add teaching, tutoring, or community impact project with 200+ hours.`);
    }

    // Leadership gaps
    const leadershipActivities = activities.filter(a => a.role.match(/Founder|President|Captain/i));
    if (leadershipActivities.length < 2) {
      leadership_gaps.push(`Only ${leadershipActivities.length} leadership roles. Target: 2-3 founder/president positions by senior year.`);
    }

    // Impact gaps (Metric Ladder M0 → M4)
    activities.forEach(activity => {
      const currentLevel = this.diagnoseMetricLevel(activity);
      if (currentLevel === 'M0' && activity.hours_total >= 100) {
        impact_gaps.push({
          activity: activity.name,
          current_level: 'M0 (built only)',
          target_level: 'M1 (real users)'
        });
      } else if (currentLevel === 'M1' && activity.hours_total >= 200) {
        impact_gaps.push({
          activity: activity.name,
          current_level: 'M1 (users reached)',
          target_level: 'M2 (measurable outcomes)'
        });
      }
    });

    // Prioritize fixes
    const prioritized_fixes: string[] = [];
    if (trinity_gaps.length > 0) {
      prioritized_fixes.push(`Fix weakest Trinity pillar: ${trinityScore.weakest_pillar} (current: ${trinityScore[trinityScore.weakest_pillar]}/10)`);
    }
    if (leadership_gaps.length > 0) {
      prioritized_fixes.push(leadership_gaps[0]);
    }
    if (impact_gaps.length > 0) {
      prioritized_fixes.push(`Escalate impact for ${impact_gaps[0].activity} from ${impact_gaps[0].current_level} to ${impact_gaps[0].target_level}`);
    }

    return {
      trinity_gaps,
      leadership_gaps,
      impact_gaps,
      prioritized_fixes
    };
  }

  private diagnoseMetricLevel(activity: Activity): 'M0' | 'M1' | 'M2' | 'M3' | 'M4' {
    if (activity.media_mentions && activity.media_mentions.length > 0) return 'M4';
    if (activity.dollars_raised && activity.dollars_raised > 0) return 'M3';
    if (activity.beneficiaries_with_outcomes && activity.beneficiaries_with_outcomes > 0) return 'M2';
    if (activity.users_reached && activity.users_reached > 0) return 'M1';
    return 'M0';
  }

  // ==========================================================================
  // Recommendation Generation Methods
  // ==========================================================================

  private generateRecommendations(
    audit: PortfolioAudit,
    gaps: GapAnalysis,
    availableHours: number,
    currentPhase: string,
    grade: number,
    narrative: string
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 1. Hours validation (CRITICAL if overcapacity)
    if (!audit.hours_validation.realistic) {
      recommendations.push({
        type: 'time_optimization',
        priority: 'critical',
        message: audit.hours_validation.recommendation!,
        action_items: [
          'Reduce homework time from current to 14h/week (2h/day)',
          'Cut 1-2 low-impact T4 activities',
          'Focus on quality over quantity'
        ],
        timeline: 'This week',
        expected_outcome: `Free up ${audit.hours_validation.overclaimed_by}h/week for high-impact flagship activities`
      });
    }

    // 2. Cookie-cutter differentiation (CRITICAL if score > 0.6)
    if (audit.cookie_cutter_score.score >= 0.6) {
      recommendations.push({
        type: 'activity_addition',
        priority: 'critical',
        message: '🚨 Your profile is cookie-cutter. You need interdisciplinary pivots to stand out.',
        action_items: [
          'Choose 1 interdisciplinary path: (1) Algorithmic Justice (CS + social impact), (2) Data Journalism (tech + storytelling), or (3) Climate Tech (STEM + environment)',
          'Launch self-initiated project within 2 weeks (proof before pitch)',
          'Drop 1-2 generic activities (NHS, generic volunteering) to make time'
        ],
        timeline: '90-day exploration period to validate passion',
        expected_outcome: 'Cookie-cutter score drops from 0.6+ to <0.3, profile becomes memorable'
      });
    }

    // 3. Trinity gap filling (HIGH priority)
    if (gaps.trinity_gaps.length > 0) {
      const weakest = audit.trinity_score.weakest_pillar;
      let gapMessage = '';
      let actionItems: string[] = [];

      if (weakest === 'service') {
        gapMessage = `Service pillar is weak (${audit.trinity_score.service}/10). Add authentic service aligned with your "${narrative}" identity.`;
        actionItems = [
          `Option 1: Teaching/Tutoring aligned with passion (e.g., AI ethics to middle schoolers)`,
          `Option 2: Community impact project (e.g., immigrant support, if culturally relevant)`,
          `Option 3: Nonprofit with measurable beneficiaries (target: 200+ students/community members)`,
          `Timeline: Launch within 2 weeks, accumulate 100+ hours by end of phase`
        ];
      } else if (weakest === 'passion') {
        gapMessage = `Passion pillar is weak (${audit.trinity_score.passion}/10). Launch self-initiated project with 8+ hours/week commitment.`;
        actionItems = [
          `Identify genuine interest not yet explored in activities`,
          `Design project that excites you personally (not just for college apps)`,
          `Commit to 2+ year depth (sustained through senior year)`,
          `Apply Task Multiplication (5X Formula): ensure project serves leadership + essay + award + service + skills`
        ];
      } else {
        gapMessage = `Aptitude pillar is weak (${audit.trinity_score.aptitude}/10). Add technical projects or academic depth.`;
        actionItems = [
          `Launch coding project, research, or technical portfolio`,
          `Take additional AP courses in STEM subjects`,
          `Apply to selective programs (Stanford AI4ALL, MIT WISE, etc.)`
        ];
      }

      recommendations.push({
        type: 'activity_addition',
        priority: 'high',
        message: gapMessage,
        action_items: actionItems,
        timeline: currentPhase === 'FOUNDATION' ? '4-8 weeks' : '2-4 weeks (urgent)',
        expected_outcome: `${weakest} pillar increases to 7+/10, profile becomes balanced`
      });
    }

    // 4. Impact escalation (MEDIUM priority)
    if (gaps.impact_gaps.length > 0) {
      const firstGap = gaps.impact_gaps[0];
      recommendations.push({
        type: 'impact_escalation',
        priority: 'medium',
        message: `Escalate ${firstGap.activity} from ${firstGap.current_level} to ${firstGap.target_level}`,
        action_items: [
          firstGap.current_level === 'M0 (built only)'
            ? 'Ship to 10-50 real users this week (classmates, community members)'
            : 'Survey 50+ users and quantify measurable outcomes (e.g., "80% reported increased confidence")',
          'Document metrics in activity description (update Common App)',
          'Use metrics as proof for award applications (NCWIT, Congressional App)'
        ],
        timeline: '2-4 weeks',
        expected_outcome: `Move from ${firstGap.current_level} to ${firstGap.target_level}, strengthen credibility`
      });
    }

    // 5. Activity pruning (if narrative alignment weak)
    if (audit.narrative_alignment.weak_activities.length >= 2) {
      recommendations.push({
        type: 'activity_pruning',
        priority: 'medium',
        message: `${audit.narrative_alignment.weak_activities.length} activities have weak narrative alignment (<0.4)`,
        action_items: [
          `Drop or deprioritize: ${audit.narrative_alignment.weak_activities.slice(0, 3).map(a => a.name).join(', ')}`,
          `These activities don't reinforce your "${narrative}" identity`,
          `Redirect freed time to flagship activities aligned with narrative`
        ],
        timeline: '1-2 weeks',
        expected_outcome: `Average narrative alignment increases from ${(audit.narrative_alignment.average_score * 100).toFixed(0)}% to 70%+`
      });
    }

    // 6. Tier validation (if T1+T2 < 2)
    if (audit.tier_audit.diagnosis === 'NEEDS_VALIDATION' || audit.tier_audit.diagnosis === 'WEAK') {
      recommendations.push({
        type: 'activity_addition',
        priority: 'high',
        message: `Only ${audit.tier_audit.T1_count + audit.tier_audit.T2_count} T1-T2 activities. Need national/regional validation.`,
        action_items: [
          'Apply to selective summer programs (JCamp, MIT WISE, Stanford AI4ALL) - deadline awareness critical',
          'Submit to national awards (NCWIT, Congressional App, Bank of America Essay)',
          'Scale existing project to national reach (e.g., expand from school to regional to national)'
        ],
        timeline: grade >= 11 ? 'URGENT (2-4 weeks)' : '8-12 weeks',
        expected_outcome: `Add 1-2 T1 or T2 activities, reach "COMPETITIVE" status`
      });
    }

    return recommendations;
  }

  // ==========================================================================
  // Response Formatting
  // ==========================================================================

  private formatResponse(
    audit: PortfolioAudit,
    gaps: GapAnalysis,
    recommendations: Recommendation[],
    originalQuery: string
  ): string {
    let response = '# Extracurriculars Portfolio Audit\n\n';

    // Tier breakdown
    response += `## Activity Tier Breakdown\n\n`;
    response += `- **T1 (National Validation):** ${audit.tier_audit.T1_count} activities\n`;
    response += `- **T2 (Selective/Regional):** ${audit.tier_audit.T2_count} activities\n`;
    response += `- **T3 (School Leadership):** ${audit.tier_audit.T3_count} activities\n`;
    response += `- **T4 (Generic Participation):** ${audit.tier_audit.T4_count} activities\n`;
    response += `- **Diagnosis:** ${audit.tier_audit.diagnosis}\n\n`;

    if (audit.tier_audit.recommendations.length > 0) {
      response += audit.tier_audit.recommendations.map(r => `  - ${r}`).join('\n') + '\n\n';
    }

    // Cookie-cutter score
    response += `## Profile Differentiation\n\n`;
    response += `- **Cookie-Cutter Score:** ${(audit.cookie_cutter_score.score * 100).toFixed(0)}% (${audit.cookie_cutter_score.diagnosis})\n`;
    if (audit.cookie_cutter_score.red_flags.length > 0) {
      response += `- **Red Flags:**\n`;
      audit.cookie_cutter_score.red_flags.forEach(flag => {
        response += `  - ${flag}\n`;
      });
    }
    response += '\n';

    // Narrative alignment
    response += `## Narrative Coherence\n\n`;
    response += `- **Average Alignment:** ${(audit.narrative_alignment.average_score * 100).toFixed(0)}%\n`;
    if (audit.narrative_alignment.weak_activities.length > 0) {
      response += `- **Weak Activities (< 40% alignment):** ${audit.narrative_alignment.weak_activities.map(a => a.name).join(', ')}\n`;
    }
    response += '\n';

    // Profile Trinity
    response += `## Profile Trinity (Aptitude × Passion × Service)\n\n`;
    response += `- **Aptitude:** ${audit.trinity_score.aptitude}/10\n`;
    response += `- **Passion:** ${audit.trinity_score.passion}/10\n`;
    response += `- **Service:** ${audit.trinity_score.service}/10\n`;
    response += `- **Balanced:** ${audit.trinity_score.balanced ? 'Yes ✅' : `No ⚠️ (weakest: ${audit.trinity_score.weakest_pillar})`}\n\n`;

    // Hours validation
    response += `## Time Architecture (168-Hour Reality Check)\n\n`;
    response += `- **Total Claimed:** ${audit.hours_validation.total_claimed}h/week\n`;
    response += `- **Available:** ${audit.hours_validation.available}h/week\n`;
    response += `- **Realistic:** ${audit.hours_validation.realistic ? 'Yes ✅' : `No ⚠️ (overclaimed by ${audit.hours_validation.overclaimed_by}h)`}\n\n`;

    // Recommendations
    if (recommendations.length > 0) {
      response += `## Recommendations (Prioritized)\n\n`;
      recommendations
        .sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
        .forEach((rec, idx) => {
          response += `### ${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.message}\n\n`;
          response += `**Action Items:**\n`;
          rec.action_items.forEach(item => {
            response += `- ${item}\n`;
          });
          response += `\n**Timeline:** ${rec.timeline}\n`;
          response += `**Expected Outcome:** ${rec.expected_outcome}\n\n`;
          response += `---\n\n`;
        });
    }

    // Gap summary
    if (gaps.prioritized_fixes.length > 0) {
      response += `## Priority Fixes (Next 2-4 Weeks)\n\n`;
      gaps.prioritized_fixes.forEach((fix, idx) => {
        response += `${idx + 1}. ${fix}\n`;
      });
      response += '\n';
    }

    return response;
  }
}
