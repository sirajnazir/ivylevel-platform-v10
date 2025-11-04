/**
 * TYPE-013: EC Portfolio Optimization
 *
 * **Purpose:** Executes 10-slot Common App strategy for extracurricular portfolio construction.
 * Categorizes and positions student activities into strategic tiers (flagship, supporting, validation).
 *
 * **Core Frameworks:**
 * - 10 Activities Framework: 2-3 flagship + 3-4 supporting + 2-3 validation + 2 service
 * - Tier Classification: T1-T4 prestige hierarchy based on leadership, impact, time
 * - Portfolio Operating Cadence: Phase-based execution aligned with EXEC chips (W001-W093)
 *
 * **Data Dependencies:**
 * - 10 Activities Framework (STUDENT_INDEX.md)
 * - Flagship vs. Supporting Framework (W048)
 * - Portfolio Operating Cadence (EXEC chips)
 *
 * **Example Usage:**
 * Query: "How can I make my coding club more impressive?"
 * TYPE-013 Output: "Position as flagship activity, add 2 supporting projects"
 *
 * **Spec Reference:**
 * /docs/agents/EXTRACURRICULARS_AGENT_TECH_SPEC.md
 * - Lines 157-215 (Type definition + data sources)
 * - Lines 242-263 (Primary functions)
 * - Lines 420-458 (Portfolio audit logic)
 *
 * @module Intelligence/Types
 * @intelligence-type TYPE-013
 */

import { BaseIntelligenceType } from '../BaseIntelligenceType';
import { Fact } from '../../a2a/types';

// ==================== INTERFACES ====================

/**
 * Activity tier classification
 */
export enum ActivityTier {
  T1 = 'T1', // National/International prestige, founder roles, major recognition
  T2 = 'T2', // Regional/state leadership, significant awards, strong time commitment
  T3 = 'T3', // School-level leadership, moderate engagement, solid proof of interest
  T4 = 'T4', // Participation roles, basic membership, validation activities
}

/**
 * Activity role in 10-slot portfolio strategy
 */
export enum PortfolioRole {
  FLAGSHIP = 'flagship',         // 2-3 activities: Deep commitment, leadership, defining identity
  SUPPORTING = 'supporting',     // 3-4 activities: Moderate engagement, breadth, skill proof
  VALIDATION = 'validation',     // 2-3 activities: Interest proof, time-efficient, rounding
  SERVICE = 'service',           // 2 activities: Community impact, cultural fit, values
}

/**
 * Student phase in college prep journey
 */
export enum StudentPhase {
  FOUNDATION = 'foundation',     // W001-W025: Discovery, launch, fill gaps
  BUILDING = 'building',         // W026-W046: Scale, awards, leadership
  JUNIOR = 'junior',             // W047-W064: Formal kickoff, 10-slot strategy
  SUMMER = 'summer',             // W065-W072: Finalization, essay materials
  SENIOR = 'senior',             // W073-W093+: Framing, quantification, optimization
}

/**
 * Classified activity with tier and role assignment
 */
interface ClassifiedActivity {
  activity: Fact;
  tier: ActivityTier;
  suggestedRole: PortfolioRole;
  tierJustification: string;
  roleJustification: string;
  metrics: {
    hoursPerWeek: number;
    weeksPerYear: number;
    leadershipLevel: string;
    impactReach: string;
  };
}

/**
 * 10-slot portfolio optimization result
 */
interface SlotOptimization {
  currentSlots: {
    flagship: ClassifiedActivity[];
    supporting: ClassifiedActivity[];
    validation: ClassifiedActivity[];
    service: ClassifiedActivity[];
  };
  targetSlots: {
    flagshipNeeded: number;
    supportingNeeded: number;
    validationNeeded: number;
    serviceNeeded: number;
  };
  gaps: {
    category: PortfolioRole;
    count: number;
    priority: 'critical' | 'high' | 'medium';
    suggestedActivities: string[];
  }[];
  overcommitment: {
    detected: boolean;
    totalHoursPerWeek: number;
    recommendation: string;
  };
}

/**
 * Cookie-cutter detection result
 */
interface CookieCutterAnalysis {
  score: number; // 0-100, higher = more cookie-cutter
  flags: {
    activity: string;
    reason: string;
    severity: 'high' | 'medium' | 'low';
  }[];
  recommendation: string;
}

/**
 * EC-Narrative alignment score
 */
interface AlignmentScore {
  score: number; // 0-100, higher = better alignment
  strongAlignments: { activity: string; reason: string }[];
  weakAlignments: { activity: string; issue: string; fix: string }[];
  overallNarrative: string;
}

/**
 * Portfolio audit result
 */
interface PortfolioAudit {
  classifiedActivities: ClassifiedActivity[];
  slotOptimization: SlotOptimization;
  cookieCutterAnalysis: CookieCutterAnalysis;
  alignmentScore: AlignmentScore;
  phaseRecommendation: {
    currentPhase: StudentPhase;
    nextSteps: string[];
    timeline: string;
  };
}

// ==================== TYPE-013 IMPLEMENTATION ====================

export class ECPortfolioOptimization extends BaseIntelligenceType {
  readonly typeId = 'TYPE-013';
  readonly name = 'EC_Portfolio_Optimization';
  readonly category = 'extracurriculars';

  /**
   * Primary entry point: Audit student's EC portfolio and optimize for 10-slot strategy
   */
  async process(facts: Fact[]): Promise<Fact[]> {
    // Extract required facts
    const activities = facts.filter(f => f.fact_type === 'ACTIVITY');
    const profile = facts.find(f => f.fact_type === 'STUDENT_PROFILE');
    const narrative = facts.find(f => f.fact_type === 'UNIQUE_NARRATIVE');

    if (activities.length === 0) {
      return [{
        fact_type: 'EC_PORTFOLIO_AUDIT',
        student_id: profile?.student_id || 'unknown',
        metadata: {
          status: 'insufficient_data',
          message: 'No activities found to audit. Need ACTIVITY facts.',
        },
      }];
    }

    const grade = this.extractGrade(profile);
    const currentPhase = this.determinePhase(grade);

    // Perform comprehensive portfolio audit
    const audit = this.auditPortfolio(activities, narrative?.metadata?.narrative || '', currentPhase);

    // Convert audit to facts
    return this.convertAuditToFacts(audit, profile?.student_id || 'unknown');
  }

  // ==================== PORTFOLIO AUDIT ====================

  /**
   * Perform comprehensive portfolio audit
   */
  private auditPortfolio(
    activities: Fact[],
    narrative: string,
    phase: StudentPhase
  ): PortfolioAudit {
    // Step 1: Classify all activities by tier
    const classifiedActivities = activities.map(a => this.classifyActivity(a));

    // Step 2: Optimize 10-slot allocation
    const slotOptimization = this.optimizeTenSlots(classifiedActivities);

    // Step 3: Detect cookie-cutter patterns
    const cookieCutterAnalysis = this.detectCookieCutter(classifiedActivities);

    // Step 4: Calculate EC-Narrative alignment
    const alignmentScore = this.calculateAlignment(classifiedActivities, narrative);

    // Step 5: Generate phase-specific recommendations
    const phaseRecommendation = this.generatePhaseRecommendations(
      classifiedActivities,
      slotOptimization,
      phase
    );

    return {
      classifiedActivities,
      slotOptimization,
      cookieCutterAnalysis,
      alignmentScore,
      phaseRecommendation,
    };
  }

  // ==================== TIER CLASSIFICATION ====================

  /**
   * Classify activity into T1-T4 tier based on prestige, leadership, impact
   */
  private classifyActivity(activity: Fact): ClassifiedActivity {
    const name = activity.metadata?.activity_name || '';
    const role = activity.metadata?.role || '';
    const hoursPerWeek = activity.metadata?.hours_per_week || 0;
    const weeksPerYear = activity.metadata?.weeks_per_year || 0;
    const scope = activity.metadata?.scope || '';
    const impact = activity.metadata?.impact || '';

    let tier: ActivityTier;
    let tierJustification: string;

    // Tier classification logic
    if (this.isT1Activity(name, role, scope, impact)) {
      tier = ActivityTier.T1;
      tierJustification = this.generateT1Justification(role, scope, impact);
    } else if (this.isT2Activity(name, role, scope, impact)) {
      tier = ActivityTier.T2;
      tierJustification = this.generateT2Justification(role, scope, impact);
    } else if (this.isT3Activity(name, role, scope, impact)) {
      tier = ActivityTier.T3;
      tierJustification = this.generateT3Justification(role, scope);
    } else {
      tier = ActivityTier.T4;
      tierJustification = 'Participation role, basic membership, or validation activity';
    }

    // Suggest portfolio role based on tier + time commitment
    const suggestedRole = this.suggestPortfolioRole(tier, hoursPerWeek, weeksPerYear);
    const roleJustification = this.generateRoleJustification(suggestedRole, tier, hoursPerWeek);

    return {
      activity,
      tier,
      suggestedRole,
      tierJustification,
      roleJustification,
      metrics: {
        hoursPerWeek,
        weeksPerYear,
        leadershipLevel: this.extractLeadershipLevel(role),
        impactReach: this.extractImpactReach(impact),
      },
    };
  }

  /**
   * T1 Activity Detection: National/International prestige, founder roles, major recognition
   */
  private isT1Activity(name: string, role: string, scope: string, impact: string): boolean {
    const t1Keywords = [
      'founder', 'national champion', 'international', 'patent', 'published research',
      'nonprofit 501(c)(3)', 'national finalist', 'ISEF finalist', 'RSI', 'TASP',
      'presidential scholar', 'national merit finalist'
    ];

    const nameLower = name.toLowerCase();
    const roleLower = role.toLowerCase();
    const scopeLower = scope.toLowerCase();
    const impactLower = impact.toLowerCase();

    return t1Keywords.some(kw =>
      nameLower.includes(kw) || roleLower.includes(kw) || scopeLower.includes(kw) || impactLower.includes(kw)
    ) || (roleLower.includes('founder') && (scopeLower.includes('national') || scopeLower.includes('state')));
  }

  /**
   * T2 Activity Detection: Regional/state leadership, significant awards, strong time commitment
   */
  private isT2Activity(name: string, role: string, scope: string, impact: string): boolean {
    const t2Keywords = [
      'president', 'captain', 'state finalist', 'regional champion', 'editor-in-chief',
      'varsity', 'all-state', 'county finalist', 'director', 'head of'
    ];

    const roleLower = role.toLowerCase();
    const scopeLower = scope.toLowerCase();
    const impactLower = impact.toLowerCase();

    return t2Keywords.some(kw =>
      roleLower.includes(kw) || scopeLower.includes(kw) || impactLower.includes(kw)
    );
  }

  /**
   * T3 Activity Detection: School-level leadership, moderate engagement
   */
  private isT3Activity(name: string, role: string, scope: string, impact: string): boolean {
    const t3Keywords = [
      'vice president', 'secretary', 'treasurer', 'officer', 'team member',
      'school-level', 'club member', 'volunteer coordinator'
    ];

    const roleLower = role.toLowerCase();
    const scopeLower = scope.toLowerCase();

    return t3Keywords.some(kw => roleLower.includes(kw) || scopeLower.includes(kw));
  }

  /**
   * Generate T1 tier justification
   */
  private generateT1Justification(role: string, scope: string, impact: string): string {
    return `T1 Tier: National/international prestige activity. Role: ${role}. Scope: ${scope}. Impact: ${impact}. This is a flagship-worthy activity that demonstrates exceptional achievement and leadership.`;
  }

  /**
   * Generate T2 tier justification
   */
  private generateT2Justification(role: string, scope: string, impact: string): string {
    return `T2 Tier: Regional/state leadership or significant recognition. Role: ${role}. Scope: ${scope}. Impact: ${impact}. Strong supporting or potential flagship activity.`;
  }

  /**
   * Generate T3 tier justification
   */
  private generateT3Justification(role: string, scope: string): string {
    return `T3 Tier: School-level leadership or solid engagement. Role: ${role}. Scope: ${scope}. Good supporting or validation activity.`;
  }

  // ==================== PORTFOLIO ROLE ASSIGNMENT ====================

  /**
   * Suggest portfolio role (flagship/supporting/validation/service) based on tier + time commitment
   */
  private suggestPortfolioRole(tier: ActivityTier, hoursPerWeek: number, weeksPerYear: number): PortfolioRole {
    const annualHours = hoursPerWeek * weeksPerYear;

    // Flagship criteria: T1-T2 tier + significant time commitment (8+ hrs/week, 40+ weeks/year)
    if ((tier === ActivityTier.T1 || tier === ActivityTier.T2) && hoursPerWeek >= 8 && weeksPerYear >= 40) {
      return PortfolioRole.FLAGSHIP;
    }

    // Supporting criteria: T2-T3 tier + moderate commitment (4-8 hrs/week)
    if ((tier === ActivityTier.T2 || tier === ActivityTier.T3) && hoursPerWeek >= 4) {
      return PortfolioRole.SUPPORTING;
    }

    // Service detection: Look for service-oriented activities
    // (This would ideally check activity_name/description for service keywords)
    // Placeholder: Assign service if low-tier + consistent commitment
    if (tier === ActivityTier.T3 && annualHours >= 100) {
      return PortfolioRole.SERVICE;
    }

    // Default: Validation (proof of interest, time-efficient rounding)
    return PortfolioRole.VALIDATION;
  }

  /**
   * Generate role justification
   */
  private generateRoleJustification(role: PortfolioRole, tier: ActivityTier, hoursPerWeek: number): string {
    switch (role) {
      case PortfolioRole.FLAGSHIP:
        return `Flagship Activity: ${tier} prestige + ${hoursPerWeek} hrs/week commitment signals deep passion and leadership. Position as 1 of 2-3 defining activities.`;
      case PortfolioRole.SUPPORTING:
        return `Supporting Activity: ${tier} tier + ${hoursPerWeek} hrs/week provides breadth and skill validation. Use as 1 of 3-4 moderate-engagement activities.`;
      case PortfolioRole.SERVICE:
        return `Service Activity: Community impact focus. Position as 1 of 2 service activities to demonstrate values and cultural fit.`;
      case PortfolioRole.VALIDATION:
        return `Validation Activity: ${tier} tier. Time-efficient interest proof. Use as 1 of 2-3 rounding activities.`;
    }
  }

  /**
   * Extract leadership level from role string
   */
  private extractLeadershipLevel(role: string): string {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('founder') || roleLower.includes('president')) return 'High';
    if (roleLower.includes('vice president') || roleLower.includes('officer')) return 'Medium';
    return 'Low';
  }

  /**
   * Extract impact reach from impact string
   */
  private extractImpactReach(impact: string): string {
    const impactLower = impact.toLowerCase();
    if (impactLower.includes('national') || impactLower.includes('international')) return 'National+';
    if (impactLower.includes('state') || impactLower.includes('regional')) return 'Regional';
    if (impactLower.includes('school') || impactLower.includes('community')) return 'Local';
    return 'Unknown';
  }

  // ==================== 10-SLOT OPTIMIZATION ====================

  /**
   * Optimize 10-slot portfolio allocation
   * Target: 2-3 flagship + 3-4 supporting + 2-3 validation + 2 service = 10 slots
   */
  private optimizeTenSlots(classified: ClassifiedActivity[]): SlotOptimization {
    const flagship = classified.filter(c => c.suggestedRole === PortfolioRole.FLAGSHIP);
    const supporting = classified.filter(c => c.suggestedRole === PortfolioRole.SUPPORTING);
    const validation = classified.filter(c => c.suggestedRole === PortfolioRole.VALIDATION);
    const service = classified.filter(c => c.suggestedRole === PortfolioRole.SERVICE);

    const totalSlots = flagship.length + supporting.length + validation.length + service.length;

    // Calculate gaps
    const gaps = [];

    if (flagship.length < 2) {
      gaps.push({
        category: PortfolioRole.FLAGSHIP,
        count: 2 - flagship.length,
        priority: 'critical' as const,
        suggestedActivities: [
          'Launch a high-impact project aligned with your narrative (e.g., nonprofit, research, startup)',
          'Take on founder/president role in existing activity with growth potential',
          'Scale current T2 activity to national/regional level'
        ],
      });
    }

    if (supporting.length < 3) {
      gaps.push({
        category: PortfolioRole.SUPPORTING,
        count: 3 - supporting.length,
        priority: 'high' as const,
        suggestedActivities: [
          'Join leadership position in school clubs (VP, Secretary, Team Lead)',
          'Start regional-level competition team (debate, robotics, olympiads)',
          'Take on teaching/mentoring role (tutor, workshop leader)'
        ],
      });
    }

    if (service.length < 2) {
      gaps.push({
        category: PortfolioRole.SERVICE,
        count: 2 - service.length,
        priority: 'high' as const,
        suggestedActivities: [
          'Launch community service initiative addressing local need',
          'Volunteer consistently at nonprofit (food bank, literacy program, hospital)',
          'Organize fundraising campaign for cause aligned with your values'
        ],
      });
    }

    if (validation.length < 2 && totalSlots < 10) {
      gaps.push({
        category: PortfolioRole.VALIDATION,
        count: 2 - validation.length,
        priority: 'medium' as const,
        suggestedActivities: [
          'Join interest-aligned clubs (CS club if STEM-focused, debate if policy-focused)',
          'Participate in subject-specific competitions (math olympiad, writing contests)',
          'Take on part-time job or internship related to career interest'
        ],
      });
    }

    // Check for overcommitment
    const totalHoursPerWeek = classified.reduce((sum, c) => sum + c.metrics.hoursPerWeek, 0);
    const overcommitment = {
      detected: totalHoursPerWeek > 40, // 168-hour reality check: 40 hrs/week for ECs is unrealistic
      totalHoursPerWeek,
      recommendation: totalHoursPerWeek > 40
        ? `Current commitment (${totalHoursPerWeek} hrs/week) exceeds realistic limit. Prune ${Math.ceil((totalHoursPerWeek - 30) / 5)} low-impact activities or reduce hours on validation activities.`
        : 'Time commitment is realistic.',
    };

    return {
      currentSlots: { flagship, supporting, validation, service },
      targetSlots: {
        flagshipNeeded: Math.max(2 - flagship.length, 0),
        supportingNeeded: Math.max(3 - supporting.length, 0),
        validationNeeded: Math.max(2 - validation.length, 0),
        serviceNeeded: Math.max(2 - service.length, 0),
      },
      gaps,
      overcommitment,
    };
  }

  // ==================== COOKIE-CUTTER DETECTION ====================

  /**
   * Detect cookie-cutter patterns: generic debate, STEM club, NHS without differentiation
   */
  private detectCookieCutter(classified: ClassifiedActivity[]): CookieCutterAnalysis {
    const flags: { activity: string; reason: string; severity: 'high' | 'medium' | 'low' }[] = [];

    const cookieCutterPatterns = [
      { keywords: ['debate', 'model un'], severity: 'high' as const, reason: 'Generic debate/MUN without unique angle or national success' },
      { keywords: ['stem club', 'science club', 'coding club'], severity: 'medium' as const, reason: 'Generic STEM club without flagship project or external validation' },
      { keywords: ['nhs', 'national honor society'], severity: 'medium' as const, reason: 'NHS membership without leadership or impact differentiation' },
      { keywords: ['key club', 'interact club'], severity: 'low' as const, reason: 'Generic service club without unique initiative' },
      { keywords: ['varsity'], severity: 'low' as const, reason: 'Varsity sport without recruitment potential or national recognition' },
    ];

    for (const activity of classified) {
      const activityName = activity.activity.metadata?.activity_name?.toLowerCase() || '';
      for (const pattern of cookieCutterPatterns) {
        if (pattern.keywords.some(kw => activityName.includes(kw))) {
          // Only flag if activity lacks differentiation (not T1, no founder role)
          if (activity.tier !== ActivityTier.T1 && !activity.activity.metadata?.role?.toLowerCase().includes('founder')) {
            flags.push({
              activity: activity.activity.metadata?.activity_name || 'Unknown',
              reason: pattern.reason,
              severity: pattern.severity,
            });
          }
        }
      }
    }

    const score = Math.min(100, flags.length * 20 + flags.filter(f => f.severity === 'high').length * 20);

    const recommendation = score > 60
      ? 'HIGH COOKIE-CUTTER RISK: Portfolio lacks differentiation. Recommend: (1) Add unique flagship project, (2) Scale 1-2 activities to regional/national level, (3) Prune generic memberships.'
      : score > 30
        ? 'MODERATE COOKIE-CUTTER RISK: Some generic activities detected. Consider adding unique angle or external validation to differentiate.'
        : 'LOW COOKIE-CUTTER RISK: Portfolio has good differentiation.';

    return { score, flags, recommendation };
  }

  // ==================== EC-NARRATIVE ALIGNMENT ====================

  /**
   * Calculate EC-Narrative alignment score (0-100)
   */
  private calculateAlignment(classified: ClassifiedActivity[], narrative: string): AlignmentScore {
    if (!narrative || narrative.length < 10) {
      return {
        score: 50,
        strongAlignments: [],
        weakAlignments: [],
        overallNarrative: 'Insufficient narrative data to calculate alignment.',
      };
    }

    const narrativeLower = narrative.toLowerCase();
    const strongAlignments: { activity: string; reason: string }[] = [];
    const weakAlignments: { activity: string; issue: string; fix: string }[] = [];

    // Extract key themes from narrative (simple keyword matching - would be enhanced with LLM)
    const themes = this.extractThemes(narrativeLower);

    for (const activity of classified) {
      const activityName = activity.activity.metadata?.activity_name?.toLowerCase() || '';
      const activityDescription = activity.activity.metadata?.description?.toLowerCase() || '';

      let aligned = false;
      for (const theme of themes) {
        if (activityName.includes(theme) || activityDescription.includes(theme)) {
          strongAlignments.push({
            activity: activity.activity.metadata?.activity_name || 'Unknown',
            reason: `Strongly aligns with narrative theme: "${theme}"`,
          });
          aligned = true;
          break;
        }
      }

      // Flag weak alignments (flagship/supporting activities that don't align with narrative)
      if (!aligned && (activity.suggestedRole === PortfolioRole.FLAGSHIP || activity.suggestedRole === PortfolioRole.SUPPORTING)) {
        weakAlignments.push({
          activity: activity.activity.metadata?.activity_name || 'Unknown',
          issue: 'Activity does not align with narrative themes',
          fix: `Either reframe activity to connect to narrative (e.g., "${themes[0]}" angle) or consider pruning if not essential.`,
        });
      }
    }

    const alignmentRatio = strongAlignments.length / Math.max(classified.length, 1);
    const score = Math.round(alignmentRatio * 100);

    return {
      score,
      strongAlignments,
      weakAlignments,
      overallNarrative: `Narrative themes detected: ${themes.join(', ')}. ${strongAlignments.length}/${classified.length} activities aligned.`,
    };
  }

  /**
   * Extract key themes from narrative (simple keyword extraction)
   */
  private extractThemes(narrative: string): string[] {
    const themes = new Set<string>();

    const themeKeywords = [
      'education', 'teaching', 'stem', 'cs', 'coding', 'engineering', 'robotics',
      'service', 'community', 'healthcare', 'policy', 'advocacy', 'justice',
      'entrepreneurship', 'business', 'leadership', 'research', 'science',
      'arts', 'music', 'writing', 'journalism', 'media', 'design'
    ];

    for (const keyword of themeKeywords) {
      if (narrative.includes(keyword)) {
        themes.add(keyword);
      }
    }

    return Array.from(themes).slice(0, 3); // Top 3 themes
  }

  // ==================== PHASE-SPECIFIC RECOMMENDATIONS ====================

  /**
   * Generate phase-specific recommendations based on Portfolio Operating Cadence
   */
  private generatePhaseRecommendations(
    classified: ClassifiedActivity[],
    slotOptimization: SlotOptimization,
    phase: StudentPhase
  ): { currentPhase: StudentPhase; nextSteps: string[]; timeline: string } {
    const nextSteps: string[] = [];

    switch (phase) {
      case StudentPhase.FOUNDATION:
        nextSteps.push(
          '🔍 DISCOVERY: Explore 5-7 activities across different domains (STEM, arts, service, leadership)',
          '🚀 LAUNCH: Initiate 1-2 projects with growth potential (club, initiative, competition team)',
          '📋 FILL GAPS: Ensure coverage of Profile Trinity (Aptitude × Passion × Service)',
          '⏰ TIMELINE: Focus on breadth → depth transition by end of freshman year'
        );
        return { currentPhase: phase, nextSteps, timeline: 'W001-W025 (Freshman Year)' };

      case StudentPhase.BUILDING:
        nextSteps.push(
          '📈 SCALE: Grow 1-2 flagship activities to regional/state level (50+ members, competition wins, media)',
          '🏆 AWARDS: Apply to 5-10 competitions/scholarships to validate expertise',
          '👥 LEADERSHIP: Secure president/founder roles in 2-3 activities',
          '⏰ TIMELINE: Achieve T1-T2 status in flagship activities by end of sophomore year'
        );
        return { currentPhase: phase, nextSteps, timeline: 'W026-W046 (Sophomore Year)' };

      case StudentPhase.JUNIOR:
        nextSteps.push(
          '📝 10-SLOT STRATEGY: Finalize Common App activities list (2-3 flagship, 3-4 supporting, 2-3 validation, 2 service)',
          '💼 REC LETTER POSITIONING: Ensure flagship activities visible to teachers/counselors',
          '📊 IMPACT METRICS: Quantify all activities (users, $, reach, outcomes)',
          '⏰ TIMELINE: Lock 10-slot portfolio by end of junior spring'
        );
        if (slotOptimization.gaps.length > 0) {
          nextSteps.push(`⚠️ URGENT GAPS: ${slotOptimization.gaps.map(g => `Need ${g.count} more ${g.category} activities`).join(', ')}`);
        }
        return { currentPhase: phase, nextSteps, timeline: 'W047-W064 (Junior Year)' };

      case StudentPhase.SUMMER:
        nextSteps.push(
          '✅ FINALIZATION: Complete all pending projects, gather testimonials, document outcomes',
          '📝 ESSAY MATERIALS: Extract stories, metrics, and themes from flagship activities',
          '🎯 FRAMING: Craft 1-2 sentence descriptions for each activity (focus on impact, not just role)',
          '⏰ TIMELINE: Finalize activities descriptions by end of summer'
        );
        return { currentPhase: phase, nextSteps, timeline: 'W065-W072 (Summer Before Senior Year)' };

      case StudentPhase.SENIOR:
        nextSteps.push(
          '🎨 FRAMING: Optimize Common App activities list for narrative coherence',
          '🔢 QUANTIFICATION: Add specific metrics (hours, weeks, beneficiaries, dollars, reach)',
          '🏆 AWARDS POSITIONING: List awards in prestige order (national > regional > school)',
          '⏰ TIMELINE: Submit Common App activities list by EA/ED deadlines'
        );
        return { currentPhase: phase, nextSteps, timeline: 'W073-W093+ (Senior Year)' };
    }
  }

  /**
   * Determine student phase based on grade
   */
  private determinePhase(grade: string | null): StudentPhase {
    if (!grade) return StudentPhase.JUNIOR; // Default assumption

    const gradeLower = grade.toLowerCase();
    if (gradeLower.includes('9') || gradeLower.includes('freshman')) return StudentPhase.FOUNDATION;
    if (gradeLower.includes('10') || gradeLower.includes('sophomore')) return StudentPhase.BUILDING;
    if (gradeLower.includes('11') || gradeLower.includes('junior')) return StudentPhase.JUNIOR;
    if (gradeLower.includes('12') || gradeLower.includes('senior')) return StudentPhase.SENIOR;

    return StudentPhase.JUNIOR; // Default
  }

  /**
   * Extract grade from student profile
   */
  private extractGrade(profile: Fact | undefined): string | null {
    return profile?.metadata?.grade || null;
  }

  // ==================== FACT CONVERSION ====================

  /**
   * Convert portfolio audit to structured facts for knowledge base
   */
  private convertAuditToFacts(audit: PortfolioAudit, studentId: string): Fact[] {
    const facts: Fact[] = [];

    // Fact 1: Overall portfolio audit summary
    facts.push({
      fact_type: 'EC_PORTFOLIO_AUDIT',
      student_id: studentId,
      metadata: {
        total_activities: audit.classifiedActivities.length,
        flagship_count: audit.slotOptimization.currentSlots.flagship.length,
        supporting_count: audit.slotOptimization.currentSlots.supporting.length,
        validation_count: audit.slotOptimization.currentSlots.validation.length,
        service_count: audit.slotOptimization.currentSlots.service.length,
        cookie_cutter_score: audit.cookieCutterAnalysis.score,
        alignment_score: audit.alignmentScore.score,
        current_phase: audit.phaseRecommendation.currentPhase,
        gaps: audit.slotOptimization.gaps,
        overcommitment: audit.slotOptimization.overcommitment,
      },
    });

    // Fact 2: Classified activities (individual tier/role assignments)
    for (const activity of audit.classifiedActivities) {
      facts.push({
        fact_type: 'ACTIVITY_CLASSIFICATION',
        student_id: studentId,
        metadata: {
          activity_name: activity.activity.metadata?.activity_name,
          tier: activity.tier,
          portfolio_role: activity.suggestedRole,
          tier_justification: activity.tierJustification,
          role_justification: activity.roleJustification,
          metrics: activity.metrics,
        },
      });
    }

    // Fact 3: Phase-specific recommendations
    facts.push({
      fact_type: 'EC_PHASE_RECOMMENDATIONS',
      student_id: studentId,
      metadata: {
        current_phase: audit.phaseRecommendation.currentPhase,
        next_steps: audit.phaseRecommendation.nextSteps,
        timeline: audit.phaseRecommendation.timeline,
      },
    });

    // Fact 4: Cookie-cutter flags (if detected)
    if (audit.cookieCutterAnalysis.flags.length > 0) {
      facts.push({
        fact_type: 'COOKIE_CUTTER_FLAGS',
        student_id: studentId,
        metadata: {
          flags: audit.cookieCutterAnalysis.flags,
          recommendation: audit.cookieCutterAnalysis.recommendation,
        },
      });
    }

    // Fact 5: Alignment issues (if detected)
    if (audit.alignmentScore.weakAlignments.length > 0) {
      facts.push({
        fact_type: 'EC_NARRATIVE_MISALIGNMENT',
        student_id: studentId,
        metadata: {
          weak_alignments: audit.alignmentScore.weakAlignments,
          overall_narrative: audit.alignmentScore.overallNarrative,
        },
      });
    }

    return facts;
  }
}
