/**
 * TYPE-014: Narrative Synthesis
 *
 * **Purpose:** Unify scattered activities under a single coherent identity.
 * Synthesizes extracurricular portfolio into unified narrative using Web Metaphor,
 * Identity Fusion Framework, and Cookie-Cutter Detection.
 *
 * **Core Frameworks:**
 * - Web Metaphor: Activities as interconnected nodes radiating from central identity
 * - Narrative Coherence: Single 2-4 word identity statement (e.g., "Digital Storyteller")
 * - Cookie-Cutter Detection: Diagnose generic profiles vs. differentiated
 * - Authenticity Test: "Would you do this without college apps?"
 *
 * **Data Dependencies:**
 * - STUDENT_INDEX.md: Web Metaphor examples, cookie-cutter confrontations
 * - EXEC Part 1: Outcome-Driven 15 Frameworks (Narrative Coherence)
 * - W048 Session: Real coaching data (Huda's identity fusion)
 *
 * **Example Usage:**
 * Query: "My activities are scattered - how do I unify them?"
 * TYPE-014 Output: "All activities connect to 'Computational Justice Advocate' narrative"
 *
 * **Spec Reference:**
 * /docs/agents/EXTRACURRICULARS_AGENT_TECH_SPEC.md (Lines 157, 216-220, 252-256)
 *
 * @module Intelligence/Types
 * @intelligence-type TYPE-014
 */

import { BaseIntelligenceType } from '../BaseIntelligenceType';
import { Fact } from '../../a2a/types';

// ==================== INTERFACES ====================

/**
 * Identity label with supporting evidence
 */
interface IdentitySynthesis {
  label: string; // 2-4 word identity statement ("Digital Storyteller", "Algorithmic Justice Advocate")
  confidence: number; // 0-1, based on how many activities align
  themes: string[]; // Extracted themes from activities (["storytelling", "technology", "social impact"])
  supporting_activities: string[]; // Activities that reinforce this identity
  orphaned_activities: string[]; // Activities that don't fit (pruning candidates)
}

/**
 * Web Metaphor visualization
 */
interface NarrativeWeb {
  central_node: string; // Core identity
  connected_nodes: {
    activity: string;
    connection: string; // How this activity reinforces the central identity
    strength: number; // 0-1, connection strength
  }[];
  orphaned_nodes: {
    activity: string;
    issue: string; // Why this doesn't fit
    suggested_action: 'prune' | 'reframe' | 'pivot';
  }[];
}

/**
 * Cookie-cutter analysis
 */
interface CookieCutterDiagnosis {
  score: number; // 0-1, higher = more cookie-cutter
  diagnosis: 'UNIQUE' | 'DIFFERENTIATED' | 'GENERIC' | 'COOKIE_CUTTER';
  red_flags: {
    pattern: string;
    activities: string[];
    severity: 'high' | 'medium' | 'low';
  }[];
  differentiation_plan: {
    priority: 'critical' | 'high' | 'medium';
    action: string;
    timeline: string;
    expected_impact: string;
  }[];
}

/**
 * Narrative coherence score
 */
interface NarrativeCoherence {
  score: number; // 0-1, target >0.6
  aligned_activities: { activity: string; alignment_reason: string }[];
  misaligned_activities: { activity: string; issue: string; fix: string }[];
  overall_assessment: string;
}

/**
 * Complete narrative synthesis result
 */
interface NarrativeSynthesisResult {
  identity: IdentitySynthesis;
  web: NarrativeWeb;
  coherence: NarrativeCoherence;
  cookie_cutter: CookieCutterDiagnosis;
  authenticity: {
    passed: boolean;
    evidence: string[];
    concerns: string[];
  };
  recommendations: string[];
}

// ==================== TYPE-014 IMPLEMENTATION ====================

export class NarrativeSynthesis extends BaseIntelligenceType {
  readonly typeId = 'TYPE-014';
  readonly name = 'Narrative_Synthesis';
  readonly category = 'extracurriculars';

  /**
   * Primary entry point: Synthesize scattered activities into unified narrative
   */
  async process(facts: Fact[]): Promise<Fact[]> {
    // Extract required facts
    const activities = facts.filter(f => f.fact_type === 'ACTIVITY');
    const profile = facts.find(f => f.fact_type === 'STUDENT_PROFILE');
    const existingNarrative = facts.find(f => f.fact_type === 'UNIQUE_NARRATIVE');
    const passionThemes = facts.filter(f => f.fact_type === 'PASSION_THEME');

    if (activities.length === 0) {
      return [{
        fact_type: 'NARRATIVE_SYNTHESIS',
        student_id: profile?.student_id || 'unknown',
        metadata: {
          status: 'insufficient_data',
          message: 'No activities found to synthesize. Need ACTIVITY facts.',
        },
      }];
    }

    // Perform narrative synthesis
    const synthesis = this.synthesizeNarrative(
      activities,
      existingNarrative?.metadata?.narrative,
      passionThemes,
      profile
    );

    // Convert to facts
    return this.convertSynthesisToFacts(synthesis, profile?.student_id || 'unknown');
  }

  // ==================== NARRATIVE SYNTHESIS ====================

  /**
   * Synthesize unified narrative from scattered activities
   */
  private synthesizeNarrative(
    activities: Fact[],
    existingNarrative: string | undefined,
    passionThemes: Fact[],
    profile: Fact | undefined
  ): NarrativeSynthesisResult {
    // Step 1: Extract themes from activities
    const themes = this.extractThemes(activities, passionThemes);

    // Step 2: Generate identity options
    const identity = this.generateIdentity(activities, themes, existingNarrative);

    // Step 3: Build narrative web (Web Metaphor)
    const web = this.buildNarrativeWeb(activities, identity.label);

    // Step 4: Calculate narrative coherence
    const coherence = this.calculateCoherence(activities, identity.label, themes);

    // Step 5: Detect cookie-cutter patterns
    const cookie_cutter = this.detectCookieCutter(activities, profile);

    // Step 6: Authenticity test
    const authenticity = this.testAuthenticity(activities, identity.label);

    // Step 7: Generate recommendations
    const recommendations = this.generateRecommendations(
      identity,
      coherence,
      cookie_cutter,
      authenticity
    );

    return {
      identity,
      web,
      coherence,
      cookie_cutter,
      authenticity,
      recommendations,
    };
  }

  // ==================== THEME EXTRACTION ====================

  /**
   * Extract themes from activities and passion facts
   */
  private extractThemes(activities: Fact[], passionThemes: Fact[]): string[] {
    const themes = new Set<string>();

    // Extract from passion themes (if available)
    for (const theme of passionThemes) {
      const themeName = theme.metadata?.theme?.toLowerCase();
      if (themeName) themes.add(themeName);
    }

    // Extract from activity names and descriptions
    const themeKeywords = [
      // Tech
      'coding', 'programming', 'cs', 'computer science', 'software', 'engineering',
      'robotics', 'ai', 'machine learning', 'data science', 'algorithms',
      // Arts/Media
      'film', 'filmmaking', 'video', 'photography', 'art', 'design', 'creative',
      'writing', 'journalism', 'storytelling', 'media', 'documentary',
      // Social Impact
      'service', 'volunteering', 'nonprofit', 'community', 'social justice',
      'advocacy', 'teaching', 'education', 'mentoring', 'tutoring',
      // Leadership
      'leadership', 'founder', 'president', 'captain', 'director', 'organizer',
      // Competition
      'competition', 'debate', 'math', 'olympiad', 'championship', 'award',
      // Research
      'research', 'science', 'experiment', 'lab', 'publication', 'study',
      // Entrepreneurship
      'business', 'entrepreneurship', 'startup', 'innovation', 'product',
    ];

    for (const activity of activities) {
      const name = activity.metadata?.activity_name?.toLowerCase() || '';
      const description = activity.metadata?.description?.toLowerCase() || '';
      const combined = `${name} ${description}`;

      for (const keyword of themeKeywords) {
        if (combined.includes(keyword)) {
          themes.add(keyword);
        }
      }
    }

    return Array.from(themes).slice(0, 5); // Top 5 themes
  }

  // ==================== IDENTITY GENERATION ====================

  /**
   * Generate 2-4 word identity label from themes and activities
   */
  private generateIdentity(
    activities: Fact[],
    themes: string[],
    existingNarrative?: string
  ): IdentitySynthesis {
    // If existing narrative provided, extract identity from it
    if (existingNarrative && existingNarrative.length > 10) {
      return this.extractIdentityFromNarrative(activities, existingNarrative);
    }

    // Otherwise, synthesize new identity from themes
    const identityOptions = this.generateIdentityOptions(themes);
    const bestIdentity = identityOptions[0]; // Pick highest confidence

    const supporting_activities: string[] = [];
    const orphaned_activities: string[] = [];

    for (const activity of activities) {
      const name = activity.metadata?.activity_name || '';
      const description = activity.metadata?.description || '';
      const combined = `${name} ${description}`.toLowerCase();

      // Check if activity aligns with identity themes
      const aligned = themes.some(theme => combined.includes(theme));
      if (aligned) {
        supporting_activities.push(name);
      } else {
        orphaned_activities.push(name);
      }
    }

    const confidence = supporting_activities.length / Math.max(activities.length, 1);

    return {
      label: bestIdentity,
      confidence,
      themes,
      supporting_activities,
      orphaned_activities,
    };
  }

  /**
   * Generate identity options based on themes
   */
  private generateIdentityOptions(themes: string[]): string[] {
    const identities: string[] = [];

    // Interdisciplinary combinations (most differentiating)
    if (themes.includes('film') && themes.includes('coding')) {
      identities.push('Digital Storyteller');
    }
    if (themes.includes('coding') && themes.includes('social justice')) {
      identities.push('Algorithmic Justice Advocate');
    }
    if (themes.includes('teaching') && themes.includes('coding')) {
      identities.push('CS Education Pioneer');
    }
    if (themes.includes('research') && themes.includes('entrepreneurship')) {
      identities.push('Science Entrepreneur');
    }
    if (themes.includes('writing') && themes.includes('advocacy')) {
      identities.push('Narrative Activist');
    }
    if (themes.includes('design') && themes.includes('engineering')) {
      identities.push('Creative Technologist');
    }

    // Single-domain identities (less differentiating but still coherent)
    if (themes.includes('coding') || themes.includes('engineering')) {
      identities.push('Tech Innovator');
    }
    if (themes.includes('teaching') || themes.includes('education')) {
      identities.push('Education Leader');
    }
    if (themes.includes('service') || themes.includes('nonprofit')) {
      identities.push('Community Organizer');
    }
    if (themes.includes('research') || themes.includes('science')) {
      identities.push('Young Researcher');
    }
    if (themes.includes('leadership') || themes.includes('founder')) {
      identities.push('Entrepreneurial Leader');
    }

    // Default fallback
    if (identities.length === 0) {
      identities.push('Multi-Passionate Learner');
    }

    return identities;
  }

  /**
   * Extract identity from existing narrative text
   */
  private extractIdentityFromNarrative(activities: Fact[], narrative: string): IdentitySynthesis {
    // Simple extraction: look for key phrases in narrative
    const narrativeLower = narrative.toLowerCase();

    // Try to find explicit identity statement
    let label = 'Emerging Leader'; // Default

    if (narrativeLower.includes('digital storyteller')) label = 'Digital Storyteller';
    else if (narrativeLower.includes('algorithmic justice')) label = 'Algorithmic Justice Advocate';
    else if (narrativeLower.includes('cs education') || narrativeLower.includes('teaching cs'))
      label = 'CS Education Pioneer';
    else if (narrativeLower.includes('science entrepreneur')) label = 'Science Entrepreneur';
    else if (narrativeLower.includes('creative technologist')) label = 'Creative Technologist';

    // Extract themes from narrative
    const themes = this.extractThemes(activities, []);

    // Calculate supporting vs orphaned activities
    const supporting_activities: string[] = [];
    const orphaned_activities: string[] = [];

    for (const activity of activities) {
      const name = activity.metadata?.activity_name || '';
      const aligned = narrativeLower.includes(name.toLowerCase());
      if (aligned) {
        supporting_activities.push(name);
      } else {
        // Check thematic alignment
        const description = activity.metadata?.description?.toLowerCase() || '';
        const themeAligned = themes.some(theme => description.includes(theme));
        if (themeAligned) {
          supporting_activities.push(name);
        } else {
          orphaned_activities.push(name);
        }
      }
    }

    const confidence = supporting_activities.length / Math.max(activities.length, 1);

    return {
      label,
      confidence,
      themes,
      supporting_activities,
      orphaned_activities,
    };
  }

  // ==================== WEB METAPHOR ====================

  /**
   * Build narrative web (Web Metaphor): central identity + connected activities
   */
  private buildNarrativeWeb(activities: Fact[], identity: string): NarrativeWeb {
    const connected_nodes: NarrativeWeb['connected_nodes'] = [];
    const orphaned_nodes: NarrativeWeb['orphaned_nodes'] = [];

    const identityKeywords = identity.toLowerCase().split(' ');

    for (const activity of activities) {
      const name = activity.metadata?.activity_name || '';
      const description = activity.metadata?.description || '';
      const combined = `${name} ${description}`.toLowerCase();

      // Calculate connection strength
      const matches = identityKeywords.filter(kw => combined.includes(kw)).length;
      const strength = matches / identityKeywords.length;

      if (strength >= 0.3) {
        // Connected node
        const connection = this.generateConnectionReason(name, description, identity);
        connected_nodes.push({ activity: name, connection, strength });
      } else {
        // Orphaned node
        const issue = `Activity does not align with "${identity}" narrative`;
        const suggested_action = strength > 0.1 ? 'reframe' : 'prune';
        orphaned_nodes.push({ activity: name, issue, suggested_action });
      }
    }

    return {
      central_node: identity,
      connected_nodes,
      orphaned_nodes,
    };
  }

  /**
   * Generate connection reason for Web Metaphor
   */
  private generateConnectionReason(name: string, description: string, identity: string): string {
    const identityLower = identity.toLowerCase();
    const descriptionLower = description.toLowerCase();

    if (identityLower.includes('storyteller') && (descriptionLower.includes('film') || descriptionLower.includes('media'))) {
      return `${name} reinforces storytelling through visual media`;
    }
    if (identityLower.includes('storyteller') && descriptionLower.includes('code')) {
      return `${name} uses technology to tell stories interactively`;
    }
    if (identityLower.includes('justice') && (descriptionLower.includes('service') || descriptionLower.includes('advocacy'))) {
      return `${name} advances social justice mission`;
    }
    if (identityLower.includes('education') && descriptionLower.includes('teaching')) {
      return `${name} directly contributes to educational impact`;
    }

    return `${name} supports ${identity} identity through related skills and experience`;
  }

  // ==================== NARRATIVE COHERENCE ====================

  /**
   * Calculate narrative coherence score (0-1, target >0.6)
   */
  private calculateCoherence(activities: Fact[], identity: string, themes: string[]): NarrativeCoherence {
    const aligned_activities: { activity: string; alignment_reason: string }[] = [];
    const misaligned_activities: { activity: string; issue: string; fix: string }[] = [];

    for (const activity of activities) {
      const name = activity.metadata?.activity_name || '';
      const description = activity.metadata?.description || '';
      const combined = `${name} ${description}`.toLowerCase();

      // Check alignment with themes
      const alignedThemes = themes.filter(theme => combined.includes(theme));

      if (alignedThemes.length > 0) {
        aligned_activities.push({
          activity: name,
          alignment_reason: `Aligns with themes: ${alignedThemes.join(', ')}`,
        });
      } else {
        misaligned_activities.push({
          activity: name,
          issue: 'Does not align with identity themes',
          fix: `Reframe to connect to ${themes[0]} or consider pruning`,
        });
      }
    }

    const score = aligned_activities.length / Math.max(activities.length, 1);

    const overall_assessment =
      score >= 0.8
        ? 'EXCELLENT coherence: 80%+ activities align with identity'
        : score >= 0.6
          ? 'GOOD coherence: Most activities align with identity'
          : score >= 0.4
            ? 'MODERATE coherence: Narrative needs strengthening'
            : 'LOW coherence: Profile is scattered, needs major synthesis';

    return {
      score,
      aligned_activities,
      misaligned_activities,
      overall_assessment,
    };
  }

  // ==================== COOKIE-CUTTER DETECTION ====================

  /**
   * Detect cookie-cutter patterns (generic profiles)
   */
  private detectCookieCutter(activities: Fact[], profile: Fact | undefined): CookieCutterDiagnosis {
    const red_flags: CookieCutterDiagnosis['red_flags'] = [];

    // Extract demographic data
    const ethnicity = profile?.metadata?.ethnicity?.toLowerCase() || '';
    const gender = profile?.metadata?.gender?.toLowerCase() || '';

    // Pattern 1: Asian male + CS + Debate + Math (highest severity)
    if (ethnicity.includes('asian') && gender.includes('male')) {
      const csActivity = activities.find(a =>
        a.metadata?.activity_name?.toLowerCase().includes('computer') ||
        a.metadata?.activity_name?.toLowerCase().includes('coding')
      );
      const debateActivity = activities.find(a =>
        a.metadata?.activity_name?.toLowerCase().includes('debate')
      );
      const mathActivity = activities.find(a =>
        a.metadata?.activity_name?.toLowerCase().includes('math')
      );

      if (csActivity && debateActivity && mathActivity) {
        red_flags.push({
          pattern: 'Classic Asian Male STEM Overachiever',
          activities: [
            csActivity.metadata?.activity_name || '',
            debateActivity.metadata?.activity_name || '',
            mathActivity.metadata?.activity_name || '',
          ],
          severity: 'high',
        });
      }
    }

    // Pattern 2: Generic STEM club + NHS + Hospital volunteering
    const stemClub = activities.find(a => {
      const name = a.metadata?.activity_name?.toLowerCase() || '';
      return name.includes('stem club') || name.includes('science club') || name.includes('coding club');
    });
    const nhs = activities.find(a =>
      a.metadata?.activity_name?.toLowerCase().includes('nhs') ||
      a.metadata?.activity_name?.toLowerCase().includes('national honor society')
    );
    const hospitalVol = activities.find(a =>
      a.metadata?.activity_name?.toLowerCase().includes('hospital') &&
      a.metadata?.activity_name?.toLowerCase().includes('volunteer')
    );

    if (stemClub && nhs && hospitalVol) {
      red_flags.push({
        pattern: 'Generic STEM + NHS + Hospital Volunteering',
        activities: [
          stemClub.metadata?.activity_name || '',
          nhs.metadata?.activity_name || '',
          hospitalVol.metadata?.activity_name || '',
        ],
        severity: 'medium',
      });
    }

    // Pattern 3: All school-based, zero self-initiated
    const selfInitiated = activities.filter(a => {
      const role = a.metadata?.role?.toLowerCase() || '';
      return role.includes('founder') || role.includes('created') || role.includes('launched');
    });

    if (selfInitiated.length === 0 && activities.length >= 5) {
      red_flags.push({
        pattern: 'Zero Self-Initiated Projects',
        activities: activities.slice(0, 5).map(a => a.metadata?.activity_name || ''),
        severity: 'high',
      });
    }

    // Pattern 4: Generic club memberships without leadership
    const genericMemberships = activities.filter(a => {
      const name = a.metadata?.activity_name?.toLowerCase() || '';
      const role = a.metadata?.role?.toLowerCase() || '';
      return (
        (name.includes('club') || name.includes('society')) &&
        role.includes('member') &&
        !role.includes('president') &&
        !role.includes('founder')
      );
    });

    if (genericMemberships.length >= 3) {
      red_flags.push({
        pattern: '3+ Generic Club Memberships Without Leadership',
        activities: genericMemberships.slice(0, 3).map(a => a.metadata?.activity_name || ''),
        severity: 'medium',
      });
    }

    // Calculate cookie-cutter score
    const severityWeights = { high: 0.4, medium: 0.25, low: 0.15 };
    const score = Math.min(
      1.0,
      red_flags.reduce((sum, flag) => sum + severityWeights[flag.severity], 0)
    );

    // Determine diagnosis
    let diagnosis: CookieCutterDiagnosis['diagnosis'];
    if (score >= 0.6) diagnosis = 'COOKIE_CUTTER';
    else if (score >= 0.4) diagnosis = 'GENERIC';
    else if (score >= 0.2) diagnosis = 'DIFFERENTIATED';
    else diagnosis = 'UNIQUE';

    // Generate differentiation plan
    const differentiation_plan = this.generateDifferentiationPlan(red_flags, score);

    return {
      score,
      diagnosis,
      red_flags,
      differentiation_plan,
    };
  }

  /**
   * Generate differentiation plan to fix cookie-cutter profile
   */
  private generateDifferentiationPlan(
    red_flags: CookieCutterDiagnosis['red_flags'],
    score: number
  ): CookieCutterDiagnosis['differentiation_plan'] {
    const plan: CookieCutterDiagnosis['differentiation_plan'] = [];

    if (score >= 0.6) {
      // Critical: Major pivot needed
      plan.push({
        priority: 'critical',
        action: 'Launch interdisciplinary flagship project (e.g., Film + CS, Law + Tech, Art + STEM)',
        timeline: '8-12 weeks',
        expected_impact: 'Transforms generic profile into differentiated narrative',
      });
      plan.push({
        priority: 'critical',
        action: 'Prune 2-3 generic club memberships (NHS, Key Club, generic STEM clubs)',
        timeline: 'Immediate',
        expected_impact: 'Reduces cookie-cutter score, creates space for flagship',
      });
    }

    if (red_flags.some(f => f.pattern.includes('Zero Self-Initiated'))) {
      plan.push({
        priority: 'critical',
        action: 'Create self-initiated project (nonprofit, app, research, teaching program)',
        timeline: '4-8 weeks to launch',
        expected_impact: 'Demonstrates autonomy and authentic passion',
      });
    }

    if (score >= 0.4) {
      plan.push({
        priority: 'high',
        action: 'Scale 1 existing activity to regional/national level (competition win, media coverage, 100+ users)',
        timeline: '12-16 weeks',
        expected_impact: 'Elevates activity from T3 to T2/T1 tier',
      });
    }

    if (plan.length === 0) {
      // Low cookie-cutter score - just optimization
      plan.push({
        priority: 'medium',
        action: 'Continue deepening unique activities, target external validation (awards, media)',
        timeline: 'Ongoing',
        expected_impact: 'Maintains differentiation, builds prestige',
      });
    }

    return plan;
  }

  // ==================== AUTHENTICITY TEST ====================

  /**
   * Test authenticity: "Would you do this without college apps?"
   */
  private testAuthenticity(activities: Fact[], identity: string): {
    passed: boolean;
    evidence: string[];
    concerns: string[];
  } {
    const evidence: string[] = [];
    const concerns: string[] = [];

    // Evidence 1: Multi-year commitment (pre-college focus)
    const multiYear = activities.filter(a => {
      const duration = a.metadata?.duration_years || 0;
      return duration >= 2;
    });
    if (multiYear.length >= 1) {
      evidence.push(`${multiYear.length} activities with 2+ year commitment (pre-college focus)`);
    }

    // Evidence 2: Self-initiated projects
    const selfInitiated = activities.filter(a => {
      const role = a.metadata?.role?.toLowerCase() || '';
      return role.includes('founder') || role.includes('created');
    });
    if (selfInitiated.length >= 1) {
      evidence.push(`${selfInitiated.length} self-initiated projects (demonstrates autonomy)`);
    }

    // Evidence 3: Measurable organic impact (users, reach, dollars)
    const organicImpact = activities.filter(a => {
      const users = a.metadata?.users || 0;
      const dollars = a.metadata?.dollars || 0;
      const reach = a.metadata?.reach || 0;
      return users > 50 || dollars > 1000 || reach > 10000;
    });
    if (organicImpact.length >= 1) {
      evidence.push(`${organicImpact.length} activities with measurable organic impact`);
    }

    // Concern 1: All activities started junior year (resume padding)
    const recentOnly = activities.every(a => {
      const startGrade = a.metadata?.start_grade?.toLowerCase() || '';
      return startGrade.includes('11') || startGrade.includes('junior') || startGrade.includes('12') || startGrade.includes('senior');
    });
    if (recentOnly && activities.length >= 3) {
      concerns.push('All activities started junior/senior year (suggests resume padding)');
    }

    // Concern 2: Generic club memberships with minimal time
    const minimalCommitment = activities.filter(a => {
      const hours = a.metadata?.hours_per_week || 0;
      const role = a.metadata?.role?.toLowerCase() || '';
      return hours < 2 && role.includes('member');
    });
    if (minimalCommitment.length >= 3) {
      concerns.push(`${minimalCommitment.length} activities with <2 hrs/week commitment (not genuine passion)`);
    }

    // Concern 3: No connection to identity
    const disconnected = activities.filter(a => {
      const name = a.metadata?.activity_name?.toLowerCase() || '';
      const identityLower = identity.toLowerCase();
      const identityWords = identityLower.split(' ');
      return !identityWords.some(word => name.includes(word));
    });
    if (disconnected.length >= activities.length * 0.5) {
      concerns.push('50%+ activities disconnected from stated identity (forced narrative)');
    }

    const passed = evidence.length >= 2 && concerns.length === 0;

    return { passed, evidence, concerns };
  }

  // ==================== RECOMMENDATIONS ====================

  /**
   * Generate recommendations based on synthesis results
   */
  private generateRecommendations(
    identity: IdentitySynthesis,
    coherence: NarrativeCoherence,
    cookie_cutter: CookieCutterDiagnosis,
    authenticity: { passed: boolean; evidence: string[]; concerns: string[] }
  ): string[] {
    const recommendations: string[] = [];

    // Rec 1: Identity confidence
    if (identity.confidence < 0.6) {
      recommendations.push(
        `⚠️ NARRATIVE UNCLEAR: Only ${Math.round(identity.confidence * 100)}% of activities align with "${identity.label}". Prune ${identity.orphaned_activities.length} orphaned activities or reframe them to fit narrative.`
      );
    } else {
      recommendations.push(
        `✅ NARRATIVE COHERENT: ${Math.round(identity.confidence * 100)}% of activities align with "${identity.label}". Continue deepening this identity.`
      );
    }

    // Rec 2: Cookie-cutter diagnosis
    if (cookie_cutter.score >= 0.4) {
      recommendations.push(
        `⚠️ ${cookie_cutter.diagnosis}: ${cookie_cutter.red_flags.length} cookie-cutter patterns detected. Action: ${cookie_cutter.differentiation_plan[0]?.action}`
      );
    }

    // Rec 3: Coherence score
    if (coherence.score < 0.6) {
      recommendations.push(
        `⚠️ LOW COHERENCE (${Math.round(coherence.score * 100)}%): ${coherence.misaligned_activities.length} activities don't fit narrative. ${coherence.overall_assessment}`
      );
    }

    // Rec 4: Authenticity concerns
    if (!authenticity.passed) {
      recommendations.push(
        `⚠️ AUTHENTICITY CONCERNS: ${authenticity.concerns.join(', ')}. Recommendation: Ensure activities reflect genuine long-term passion, not resume padding.`
      );
    } else {
      recommendations.push(
        `✅ AUTHENTICITY CONFIRMED: ${authenticity.evidence.join('; ')}. Profile reflects genuine passion.`
      );
    }

    // Rec 5: Orphaned activities
    if (identity.orphaned_activities.length > 0) {
      recommendations.push(
        `🔧 PRUNING CANDIDATES: ${identity.orphaned_activities.length} activities don't fit "${identity.label}": ${identity.orphaned_activities.slice(0, 3).join(', ')}. Consider reframing or pruning to strengthen narrative.`
      );
    }

    return recommendations;
  }

  // ==================== FACT CONVERSION ====================

  /**
   * Convert narrative synthesis to structured facts
   */
  private convertSynthesisToFacts(synthesis: NarrativeSynthesisResult, studentId: string): Fact[] {
    const facts: Fact[] = [];

    // Fact 1: Identity synthesis
    facts.push({
      fact_type: 'IDENTITY_SYNTHESIS',
      student_id: studentId,
      metadata: {
        identity_label: synthesis.identity.label,
        confidence: synthesis.identity.confidence,
        themes: synthesis.identity.themes,
        supporting_activities: synthesis.identity.supporting_activities,
        orphaned_activities: synthesis.identity.orphaned_activities,
      },
    });

    // Fact 2: Narrative web
    facts.push({
      fact_type: 'NARRATIVE_WEB',
      student_id: studentId,
      metadata: {
        central_node: synthesis.web.central_node,
        connected_nodes: synthesis.web.connected_nodes,
        orphaned_nodes: synthesis.web.orphaned_nodes,
      },
    });

    // Fact 3: Coherence analysis
    facts.push({
      fact_type: 'NARRATIVE_COHERENCE',
      student_id: studentId,
      metadata: {
        score: synthesis.coherence.score,
        aligned_activities: synthesis.coherence.aligned_activities,
        misaligned_activities: synthesis.coherence.misaligned_activities,
        overall_assessment: synthesis.coherence.overall_assessment,
      },
    });

    // Fact 4: Cookie-cutter diagnosis
    facts.push({
      fact_type: 'COOKIE_CUTTER_DIAGNOSIS',
      student_id: studentId,
      metadata: {
        score: synthesis.cookie_cutter.score,
        diagnosis: synthesis.cookie_cutter.diagnosis,
        red_flags: synthesis.cookie_cutter.red_flags,
        differentiation_plan: synthesis.cookie_cutter.differentiation_plan,
      },
    });

    // Fact 5: Authenticity test
    facts.push({
      fact_type: 'AUTHENTICITY_TEST',
      student_id: studentId,
      metadata: {
        passed: synthesis.authenticity.passed,
        evidence: synthesis.authenticity.evidence,
        concerns: synthesis.authenticity.concerns,
      },
    });

    // Fact 6: Recommendations
    facts.push({
      fact_type: 'NARRATIVE_RECOMMENDATIONS',
      student_id: studentId,
      metadata: {
        recommendations: synthesis.recommendations,
      },
    });

    return facts;
  }
}
