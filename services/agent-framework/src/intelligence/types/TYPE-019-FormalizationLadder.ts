/**
 * TYPE-019: Formalization Ladder (7-Step Legitimacy Stack)
 *
 * **Purpose:** Provide 7-step framework for escalating informal student projects from hobby stage
 * to institutional legitimacy (nonprofit, partnerships, media recognition).
 *
 * **Core Framework:**
 * - Step 1: Idea/Prototype (MVP, proof-of-concept, 2-4 weeks)
 * - Step 2: Structure (website, branding, mission, 4-8 weeks)
 * - Step 3: Legitimacy (nonprofit status, adult advisor, partnerships, 6-12 weeks)
 * - Step 4: Team (defined roles, accountability systems, ongoing)
 * - Step 5: Scale (metrics, fundraising, geographic expansion, 6-12+ months)
 *
 * **Data Dependencies:**
 * - W048: Formalization Ladder, Legitimacy Stack, Synchronous Send, Role Threat
 * - Huda's Empowering AI case study (real progression across all 5 steps)
 * - EXEC chips: 10-50 Rule, partnership outreach tactics
 *
 * **Example Usage:**
 * Query: "My coding club is informal - how do I make it more legitimate?"
 * TYPE-019 Output: "Move from Step 2 (structure) to Step 3 (legitimacy): File for nonprofit status, recruit adult advisor"
 *
 * **Spec Reference:**
 * /docs/agents/EXTRACURRICULARS_AGENT_TECH_SPEC.md (Lines 157, 200, 236-239)
 *
 * @module Intelligence/Types
 * @intelligence-type TYPE-019
 */

import { BaseIntelligenceType } from '../BaseIntelligenceType';
import { Fact } from '../../a2a/types';

// ==================== INTERFACES ====================

/**
 * Formalization step (1-5)
 */
export enum FormalizationStep {
  STEP_1 = 1, // Idea/Prototype
  STEP_2 = 2, // Structure
  STEP_3 = 3, // Legitimacy
  STEP_4 = 4, // Team
  STEP_5 = 5, // Scale
}

/**
 * Project with formalization level
 */
interface FormalizationDiagnosis {
  project_name: string;
  current_step: FormalizationStep;
  current_step_evidence: string;
  next_step: {
    step: FormalizationStep;
    title: string;
    action: string;
    timeline: string;
    expected_outcome: string;
    blockers: string[];
  } | null;
  stagnation_risk: boolean; // True if stuck at same step for >12 weeks
  recommendation: string;
}

/**
 * Step completion checklist
 */
interface StepCompletionChecklist {
  step: FormalizationStep;
  title: string;
  required_items: {
    item: string;
    completed: boolean;
    evidence?: string;
  }[];
  completion_percentage: number;
  next_actions: string[];
}

/**
 * Crisis formalization plan (team dysfunction recovery)
 */
interface CrisisFormalizationPlan {
  crisis_type: 'team_dysfunction' | 'partnership_rejection' | 'stagnation' | 'nonprofit_filing_failure';
  current_step: FormalizationStep;
  recovery_actions: {
    priority: 'critical' | 'high' | 'medium';
    action: string;
    timeline: string;
    expected_impact: string;
  }[];
  timeline_to_recovery: string;
}

/**
 * Portfolio-level formalization assessment
 */
interface PortfolioFormalizationAssessment {
  projects_by_step: {
    [key in FormalizationStep]: FormalizationDiagnosis[];
  };
  flagship_progress: {
    flagship_name: string;
    current_step: FormalizationStep;
    target_step: FormalizationStep;
    on_track: boolean;
    time_in_current_step_weeks: number;
  }[];
  portfolio_health: {
    stuck_projects: number; // Projects stagnant >12 weeks
    scaled_projects: number; // Projects at Step 5
    overall_score: number; // 0-100
  };
  recommendations: string[];
}

// ==================== TYPE-019 IMPLEMENTATION ====================

export class FormalizationLadder extends BaseIntelligenceType {
  readonly typeId = 'TYPE-019';
  readonly name = 'Formalization_Ladder';
  readonly category = 'extracurriculars';

  // Formalization step definitions
  private readonly STEP_DEFINITIONS = {
    [FormalizationStep.STEP_1]: {
      title: 'Idea/Prototype',
      description: 'MVP or proof-of-concept, solo or small team',
      typical_duration: '2-4 weeks',
      required_items: [
        'Working demo or beta version',
        'Core concept validated with 3-5 test users',
        'Initial feedback collected',
      ],
    },
    [FormalizationStep.STEP_2]: {
      title: 'Structure',
      description: 'Professional presence and documentation',
      typical_duration: '4-8 weeks',
      required_items: [
        'Website with mission statement',
        'Branding (logo, color scheme)',
        'Social media accounts',
        'Email list or contact system',
        'Curriculum or process documentation',
      ],
    },
    [FormalizationStep.STEP_3]: {
      title: 'Legitimacy',
      description: 'Institutional backing and legal status',
      typical_duration: '6-12 weeks',
      required_items: [
        'Nonprofit 501(c)(3) filed OR fiscal sponsorship secured',
        'Adult advisor/mentor committed',
        'Partnerships with established organizations (MOU signed)',
        'Board structure or governance defined',
      ],
    },
    [FormalizationStep.STEP_4]: {
      title: 'Team',
      description: 'Defined roles and accountability systems',
      typical_duration: 'Ongoing',
      required_items: [
        'Clear roles defined (CEO, Marketing, Development, etc.)',
        'Responsibility matrix (who owns what)',
        'Accountability systems (regular check-ins, metrics)',
        'Team commitment confirmed (5+ hrs/week per member)',
      ],
    },
    [FormalizationStep.STEP_5]: {
      title: 'Scale',
      description: 'Quantified metrics, fundraising, geographic expansion',
      typical_duration: '6-12+ months',
      required_items: [
        'Quantified metrics (users, reach, financial impact)',
        'Fundraising (grants, donations, sponsorships)',
        'Geographic expansion (multiple cities/regions)',
        'Media coverage and external validation',
      ],
    },
  };

  /**
   * Primary entry point: Assess formalization level and provide escalation roadmap
   */
  async process(facts: Fact[]): Promise<Fact[]> {
    // Extract required facts
    const activities = facts.filter(f => f.fact_type === 'ACTIVITY');
    const profile = facts.find(f => f.fact_type === 'STUDENT_PROFILE');
    const classifications = facts.filter(f => f.fact_type === 'ACTIVITY_CLASSIFICATION');
    const obstacles = facts.filter(f => f.fact_type === 'OBSTACLE');

    if (activities.length === 0) {
      return [{
        fact_type: 'FORMALIZATION_ASSESSMENT',
        student_id: profile?.student_id || 'unknown',
        metadata: {
          status: 'insufficient_data',
          message: 'No activities found to assess. Need ACTIVITY facts.',
        },
      }];
    }

    // Perform portfolio-level formalization assessment
    const assessment = this.assessPortfolioFormalization(
      activities,
      classifications,
      obstacles
    );

    // Convert to facts
    return this.convertAssessmentToFacts(assessment, profile?.student_id || 'unknown');
  }

  // ==================== PORTFOLIO FORMALIZATION ASSESSMENT ====================

  /**
   * Assess formalization across entire portfolio
   */
  private assessPortfolioFormalization(
    activities: Fact[],
    classifications: Fact[],
    obstacles: Fact[]
  ): PortfolioFormalizationAssessment {
    // Diagnose each project's formalization level
    const diagnoses = activities.map(a => this.diagnoseProjectFormalization(a, obstacles));

    // Group by formalization step
    const projects_by_step = {
      [FormalizationStep.STEP_1]: diagnoses.filter(d => d.current_step === FormalizationStep.STEP_1),
      [FormalizationStep.STEP_2]: diagnoses.filter(d => d.current_step === FormalizationStep.STEP_2),
      [FormalizationStep.STEP_3]: diagnoses.filter(d => d.current_step === FormalizationStep.STEP_3),
      [FormalizationStep.STEP_4]: diagnoses.filter(d => d.current_step === FormalizationStep.STEP_4),
      [FormalizationStep.STEP_5]: diagnoses.filter(d => d.current_step === FormalizationStep.STEP_5),
    };

    // Assess flagship project progress
    const flagship_progress = this.assessFlagshipFormalization(diagnoses, classifications);

    // Calculate portfolio health
    const portfolio_health = this.calculateFormalizationHealth(diagnoses);

    // Generate recommendations
    const recommendations = this.generateFormalizationRecommendations(
      projects_by_step,
      flagship_progress,
      portfolio_health
    );

    return {
      projects_by_step,
      flagship_progress,
      portfolio_health,
      recommendations,
    };
  }

  // ==================== PROJECT-LEVEL FORMALIZATION DIAGNOSIS ====================

  /**
   * Diagnose single project's formalization level
   */
  private diagnoseProjectFormalization(
    activity: Fact,
    obstacles: Fact[]
  ): FormalizationDiagnosis {
    const name = activity.metadata?.activity_name || 'Unknown Project';

    // Determine current formalization step based on evidence
    let current_step = FormalizationStep.STEP_1;
    let current_step_evidence = 'Project exists (idea/prototype)';

    // Check for Step 5 indicators
    if (this.hasScaleEvidence(activity)) {
      current_step = FormalizationStep.STEP_5;
      current_step_evidence = this.generateScaleEvidence(activity);
    }
    // Check for Step 4 indicators
    else if (this.hasTeamEvidence(activity)) {
      current_step = FormalizationStep.STEP_4;
      current_step_evidence = this.generateTeamEvidence(activity);
    }
    // Check for Step 3 indicators
    else if (this.hasLegitimacyEvidence(activity)) {
      current_step = FormalizationStep.STEP_3;
      current_step_evidence = this.generateLegitimacyEvidence(activity);
    }
    // Check for Step 2 indicators
    else if (this.hasStructureEvidence(activity)) {
      current_step = FormalizationStep.STEP_2;
      current_step_evidence = this.generateStructureEvidence(activity);
    }

    // Determine next step
    const next_step = this.determineNextStep(current_step, activity);

    // Check for stagnation (simplified: if project >1 year old and still at Step 1-2)
    const years_active = activity.metadata?.years?.length || 0;
    const stagnation_risk = current_step <= FormalizationStep.STEP_2 && years_active >= 2;

    // Check for crisis conditions
    const project_obstacles = obstacles.filter(
      o => o.metadata?.activity_name === name
    );
    const has_crisis = project_obstacles.length > 0;

    // Generate recommendation
    const recommendation = this.generateProjectRecommendation(
      current_step,
      next_step,
      stagnation_risk,
      has_crisis
    );

    return {
      project_name: name,
      current_step,
      current_step_evidence,
      next_step,
      stagnation_risk,
      recommendation,
    };
  }

  /**
   * Check if project has Step 2 (Structure) evidence
   */
  private hasStructureEvidence(activity: Fact): boolean {
    const metadata = activity.metadata || {};
    return !!(
      metadata.website ||
      metadata.social_media ||
      metadata.branding ||
      metadata.curriculum_documented
    );
  }

  /**
   * Check if project has Step 3 (Legitimacy) evidence
   */
  private hasLegitimacyEvidence(activity: Fact): boolean {
    const metadata = activity.metadata || {};
    return !!(
      metadata.nonprofit_status === 'filed' ||
      metadata.nonprofit_status === 'approved' ||
      metadata.fiscal_sponsorship ||
      metadata.adult_advisor ||
      metadata.partnerships?.length > 0
    );
  }

  /**
   * Check if project has Step 4 (Team) evidence
   */
  private hasTeamEvidence(activity: Fact): boolean {
    const metadata = activity.metadata || {};
    const team_size = metadata.team_size || 0;
    return !!(
      team_size >= 3 &&
      metadata.defined_roles &&
      metadata.accountability_system
    );
  }

  /**
   * Check if project has Step 5 (Scale) evidence
   */
  private hasScaleEvidence(activity: Fact): boolean {
    const metadata = activity.metadata || {};
    const users = metadata.users || 0;
    const dollars = (metadata.dollars_raised || 0) + (metadata.revenue || 0);
    const cities = metadata.cities_reached || 0;
    const media = metadata.media_coverage?.length || 0;

    return users >= 100 || dollars >= 5000 || cities >= 5 || media >= 2;
  }

  /**
   * Generate evidence strings for each step
   */
  private generateStructureEvidence(activity: Fact): string {
    const items = [];
    if (activity.metadata?.website) items.push('Website');
    if (activity.metadata?.social_media) items.push('Social media');
    if (activity.metadata?.branding) items.push('Branding');
    if (activity.metadata?.curriculum_documented) items.push('Documentation');

    return `Step 2 (Structure): ${items.join(', ')} established`;
  }

  private generateLegitimacyEvidence(activity: Fact): string {
    const items = [];
    if (activity.metadata?.nonprofit_status) items.push(`Nonprofit (${activity.metadata.nonprofit_status})`);
    if (activity.metadata?.adult_advisor) items.push('Adult advisor');
    if (activity.metadata?.partnerships?.length)
      items.push(`${activity.metadata.partnerships.length} partnerships`);

    return `Step 3 (Legitimacy): ${items.join(', ')}`;
  }

  private generateTeamEvidence(activity: Fact): string {
    const team_size = activity.metadata?.team_size || 0;
    return `Step 4 (Team): ${team_size} members with defined roles and accountability`;
  }

  private generateScaleEvidence(activity: Fact): string {
    const users = activity.metadata?.users || 0;
    const dollars = (activity.metadata?.dollars_raised || 0) + (activity.metadata?.revenue || 0);
    const cities = activity.metadata?.cities_reached || 0;
    const media = activity.metadata?.media_coverage?.length || 0;

    const items = [];
    if (users >= 100) items.push(`${users} users`);
    if (dollars >= 5000) items.push(`$${dollars.toLocaleString()} raised`);
    if (cities >= 5) items.push(`${cities} cities`);
    if (media >= 2) items.push(`${media} media mentions`);

    return `Step 5 (Scale): ${items.join(', ')}`;
  }

  /**
   * Determine next step on Formalization Ladder
   */
  private determineNextStep(
    current: FormalizationStep,
    activity: Fact
  ): FormalizationDiagnosis['next_step'] {
    if (current === FormalizationStep.STEP_5) {
      return null; // Maximized - no further step
    }

    const next_step_number = (current + 1) as FormalizationStep;
    const next_step_def = this.STEP_DEFINITIONS[next_step_number];

    // Identify blockers (items not yet completed)
    const blockers: string[] = [];
    if (next_step_number === FormalizationStep.STEP_2) {
      if (!activity.metadata?.website) blockers.push('No website');
      if (!activity.metadata?.branding) blockers.push('No branding');
    } else if (next_step_number === FormalizationStep.STEP_3) {
      if (!activity.metadata?.nonprofit_status) blockers.push('Nonprofit not filed');
      if (!activity.metadata?.adult_advisor) blockers.push('No adult advisor');
    } else if (next_step_number === FormalizationStep.STEP_4) {
      const team_size = activity.metadata?.team_size || 0;
      if (team_size < 3) blockers.push(`Team too small (${team_size}, need 3+)`);
      if (!activity.metadata?.defined_roles) blockers.push('Roles not defined');
    } else if (next_step_number === FormalizationStep.STEP_5) {
      const users = activity.metadata?.users || 0;
      if (users < 100) blockers.push(`Low users (${users}, target 100+)`);
    }

    return {
      step: next_step_number,
      title: next_step_def.title,
      action: `Move to ${next_step_def.title}: ${next_step_def.description}`,
      timeline: next_step_def.typical_duration,
      expected_outcome: `${next_step_def.required_items[0]}`,
      blockers,
    };
  }

  /**
   * Generate project-level recommendation
   */
  private generateProjectRecommendation(
    current: FormalizationStep,
    next: FormalizationDiagnosis['next_step'],
    stagnant: boolean,
    has_crisis: boolean
  ): string {
    if (current === FormalizationStep.STEP_5) {
      return '✅ MAXIMIZED: Project fully formalized at Step 5 (Scale). Continue maintaining and expanding.';
    }

    if (has_crisis) {
      return `🚨 CRISIS DETECTED: Apply Crisis Formalization Protocol. ${next?.action || 'Stabilize project'}`;
    }

    if (stagnant) {
      return `⚠️ STAGNATION RISK: Stuck at Step ${current} for too long. ${next?.action || 'Move to next step immediately'}. Timeline: ${next?.timeline || 'TBD'}`;
    }

    return `📈 NEXT STEP: ${next?.action || 'Continue progressing'}. Timeline: ${next?.timeline || 'TBD'}. Blockers: ${next?.blockers.join(', ') || 'None'}`;
  }

  // ==================== FLAGSHIP FORMALIZATION TRACKING ====================

  /**
   * Assess formalization progress of flagship projects specifically
   */
  private assessFlagshipFormalization(
    diagnoses: FormalizationDiagnosis[],
    classifications: Fact[]
  ): PortfolioFormalizationAssessment['flagship_progress'] {
    const flagship_progress: PortfolioFormalizationAssessment['flagship_progress'] = [];

    // Find flagship activities from classifications
    const flagships = classifications.filter(c => c.metadata?.portfolio_role === 'flagship');

    for (const flagship of flagships) {
      const name = flagship.metadata?.activity_name || '';
      const diagnosis = diagnoses.find(d => d.project_name === name);

      if (!diagnosis) continue;

      // Target: Flagship projects should reach Step 3-4 by senior year
      const target_step = FormalizationStep.STEP_4;
      const on_track = diagnosis.current_step >= FormalizationStep.STEP_3;

      // Estimate time in current step (simplified: assume 1 year if stagnant)
      const time_in_current_step_weeks = diagnosis.stagnation_risk ? 52 : 8;

      flagship_progress.push({
        flagship_name: name,
        current_step: diagnosis.current_step,
        target_step,
        on_track,
        time_in_current_step_weeks,
      });
    }

    return flagship_progress;
  }

  // ==================== PORTFOLIO HEALTH ====================

  /**
   * Calculate overall portfolio formalization health (0-100 score)
   */
  private calculateFormalizationHealth(
    diagnoses: FormalizationDiagnosis[]
  ): PortfolioFormalizationAssessment['portfolio_health'] {
    const stuck_projects = diagnoses.filter(d => d.stagnation_risk).length;
    const scaled_projects = diagnoses.filter(d => d.current_step === FormalizationStep.STEP_5).length;

    // Scoring formula
    let overall_score = 50; // Baseline

    // Penalties
    overall_score -= stuck_projects * 15; // -15 per stagnant project

    // Bonuses
    overall_score += scaled_projects * 30; // +30 per scaled project
    overall_score += diagnoses.filter(d => d.current_step >= FormalizationStep.STEP_3).length * 10; // +10 per Step 3+ project

    // Clamp to 0-100
    overall_score = Math.max(0, Math.min(100, overall_score));

    return {
      stuck_projects,
      scaled_projects,
      overall_score,
    };
  }

  // ==================== RECOMMENDATIONS ====================

  /**
   * Generate portfolio-level formalization recommendations
   */
  private generateFormalizationRecommendations(
    projects_by_step: PortfolioFormalizationAssessment['projects_by_step'],
    flagship_progress: PortfolioFormalizationAssessment['flagship_progress'],
    portfolio_health: PortfolioFormalizationAssessment['portfolio_health']
  ): string[] {
    const recommendations: string[] = [];

    // Rec 1: Overall health assessment
    if (portfolio_health.overall_score >= 75) {
      recommendations.push(
        `✅ STRONG FORMALIZATION (${portfolio_health.overall_score}/100): ${portfolio_health.scaled_projects} projects at Step 5 (Scale).`
      );
    } else if (portfolio_health.overall_score >= 50) {
      recommendations.push(
        `📊 MODERATE FORMALIZATION (${portfolio_health.overall_score}/100): Need to escalate more projects to Step 3+ (Legitimacy).`
      );
    } else {
      recommendations.push(
        `⚠️ LOW FORMALIZATION (${portfolio_health.overall_score}/100): Most projects stuck at Step 1-2. URGENT: Move to legitimacy.`
      );
    }

    // Rec 2: Stagnation warnings
    if (portfolio_health.stuck_projects > 0) {
      const stagnant_projects = [
        ...projects_by_step[FormalizationStep.STEP_1].filter(d => d.stagnation_risk).map(d => d.project_name),
        ...projects_by_step[FormalizationStep.STEP_2].filter(d => d.stagnation_risk).map(d => d.project_name),
      ].slice(0, 3);

      recommendations.push(
        `⚠️ STAGNATION ALERT: ${portfolio_health.stuck_projects} projects stuck at Step 1-2 for >1 year. Stagnant projects: ${stagnant_projects.join(', ')}. Action: Formalize or pivot.`
      );
    }

    // Rec 3: Flagship tracking
    const flagships_off_track = flagship_progress.filter(f => !f.on_track);
    if (flagships_off_track.length > 0) {
      recommendations.push(
        `🎯 FLAGSHIP ALERT: ${flagships_off_track.length} flagship projects below Step 3 target. Flagships: ${flagships_off_track.map(f => `${f.flagship_name} (Step ${f.current_step})`).join(', ')}. Must reach Step 3-4 by senior year.`
      );
    }

    // Rec 4: Step 5 opportunities
    if (portfolio_health.scaled_projects === 0 && projects_by_step[FormalizationStep.STEP_4].length > 0) {
      const step4_candidates = projects_by_step[FormalizationStep.STEP_4].slice(0, 2).map(d => d.project_name);
      recommendations.push(
        `📈 SCALE OPPORTUNITY: ${step4_candidates.length} projects at Step 4 (Team). Next: Scale to 100+ users, multiple cities, or media coverage for: ${step4_candidates.join(', ')}.`
      );
    }

    // Rec 5: Legitimacy priority (if many at Step 2)
    if (projects_by_step[FormalizationStep.STEP_2].length >= 2 && projects_by_step[FormalizationStep.STEP_3].length < 2) {
      recommendations.push(
        `📋 LEGITIMACY PRIORITY: ${projects_by_step[FormalizationStep.STEP_2].length} projects have structure (Step 2) but no legitimacy (Step 3). Action: File for nonprofit status or secure fiscal sponsorship for top project.`
      );
    }

    return recommendations;
  }

  // ==================== FACT CONVERSION ====================

  /**
   * Convert formalization assessment to structured facts
   */
  private convertAssessmentToFacts(
    assessment: PortfolioFormalizationAssessment,
    studentId: string
  ): Fact[] {
    const facts: Fact[] = [];

    // Fact 1: Overall portfolio formalization health
    facts.push({
      fact_type: 'FORMALIZATION_PORTFOLIO_HEALTH',
      student_id: studentId,
      metadata: {
        overall_score: assessment.portfolio_health.overall_score,
        stuck_projects: assessment.portfolio_health.stuck_projects,
        scaled_projects: assessment.portfolio_health.scaled_projects,
        recommendations: assessment.recommendations,
      },
    });

    // Fact 2: Project-level diagnoses (grouped by step)
    for (const step of Object.keys(assessment.projects_by_step) as unknown as FormalizationStep[]) {
      const projects = assessment.projects_by_step[step];
      if (projects.length > 0) {
        facts.push({
          fact_type: `FORMALIZATION_STEP_${step}`,
          student_id: studentId,
          metadata: {
            count: projects.length,
            projects: projects.map(p => ({
              name: p.project_name,
              evidence: p.current_step_evidence,
              next_step: p.next_step,
              recommendation: p.recommendation,
            })),
          },
        });
      }
    }

    // Fact 3: Flagship formalization progress
    if (assessment.flagship_progress.length > 0) {
      facts.push({
        fact_type: 'FLAGSHIP_FORMALIZATION_PROGRESS',
        student_id: studentId,
        metadata: {
          flagships: assessment.flagship_progress,
          off_track_count: assessment.flagship_progress.filter(f => !f.on_track).length,
        },
      });
    }

    // Fact 4: Individual project diagnoses
    for (const step of Object.keys(assessment.projects_by_step) as unknown as FormalizationStep[]) {
      for (const diagnosis of assessment.projects_by_step[step]) {
        facts.push({
          fact_type: 'PROJECT_FORMALIZATION_DIAGNOSIS',
          student_id: studentId,
          metadata: {
            project_name: diagnosis.project_name,
            current_step: diagnosis.current_step,
            evidence: diagnosis.current_step_evidence,
            next_step: diagnosis.next_step,
            stagnation_risk: diagnosis.stagnation_risk,
            recommendation: diagnosis.recommendation,
          },
        });
      }
    }

    return facts;
  }
}
