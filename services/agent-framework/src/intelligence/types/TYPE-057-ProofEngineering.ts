/**
 * TYPE-057: Proof Engineering Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: Proofpack Assembly ("Proof Before Pitch")
 *
 * Purpose: Assemble comprehensive proof artifacts BEFORE claiming achievements.
 * Prevents resume padding without evidence. Evidence >>> Claims.
 *
 * Algorithm: 6-Component Proofpack
 *
 * 1. **Hero Metric** - One impressive quantified result
 *    Examples: "500 users in 3 months", "$2K revenue", "10 press mentions"
 *
 * 2. **Timeline** - Start → Milestones → Current → Future
 *    Shows journey and momentum (not just endpoint)
 *
 * 3. **Screenshots/Demos** - Visual proof of work
 *    App screenshots, website demos, product in action
 *
 * 4. **User Quotes/Testimonials** - Social validation
 *    Real users saying real things (names + context)
 *
 * 5. **Links** - Verifiable online presence
 *    GitHub repo, live website, press articles, social media
 *
 * 6. **Maintenance Log** - Ongoing commitment proof
 *    Updates, bug fixes, new features (shows sustained effort)
 *
 * Validation Rule: Minimum 3/6 components before claiming achievement
 * - 2/6 = Incomplete (can't pitch yet)
 * - 3/6 = Minimum viable (can mention, but weak)
 * - 4/6 = Solid (can pitch confidently)
 * - 5-6/6 = Excellent (very strong proof)
 *
 * Proof-Before-Pitch Pattern:
 * - Assemble proofpack FIRST
 * - Then write about project (essays, resume, activities list)
 * - Never claim without proof to back it up
 *
 * Data Sources:
 * - W000-STRATEGY-013 (Proofpack assembly from coaching)
 * - Activity facts (projects, user counts, metrics)
 * - External links (GitHub, websites, press)
 *
 * Output: ProofEngineeringResult
 * - proofpacks: One per major project
 * - completeness_score: 0-100 per project
 * - missing_components: What's needed to strengthen proof
 * - assembly_checklist: Step-by-step to complete proofpack
 * - recommendations: Priority actions
 *
 * Created: 2025-10-29
 * Version: v20.4
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Proofpack component types
 */
type ProofpackComponent =
  | 'hero_metric'
  | 'timeline'
  | 'screenshots'
  | 'testimonials'
  | 'links'
  | 'maintenance_log';

/**
 * Component status
 */
interface ComponentStatus {
  component_name: ProofpackComponent;
  status: 'missing' | 'partial' | 'complete';
  quality_score: number; // 0-100
  artifacts: string[]; // What exists
  gaps: string[]; // What's missing
}

/**
 * Hero metric (one impressive quantified result)
 */
interface HeroMetric {
  metric_type: 'users' | 'revenue' | 'downloads' | 'engagement' | 'press' | 'impact';
  metric_value: number;
  metric_timeframe: string; // "in 3 months", "over 6 weeks"
  metric_statement: string; // "500 users in 3 months"
  credibility: 'unverified' | 'verified' | 'documented';
}

/**
 * Timeline component
 */
interface Timeline {
  project_start_date: string;
  key_milestones: { date: string; milestone: string }[];
  current_status: string;
  future_goals: string[];
  shows_momentum: boolean;
}

/**
 * Screenshots/Demos component
 */
interface ScreenshotsComponent {
  screenshot_count: number;
  demo_video_url: string | null;
  visual_quality: 'poor' | 'adequate' | 'professional';
  shows_functionality: boolean;
}

/**
 * Testimonials component
 */
interface TestimonialsComponent {
  testimonial_count: number;
  testimonials: { user_name: string; quote: string; context: string }[];
  has_named_users: boolean; // Not anonymous
  social_validation_score: number; // 0-100
}

/**
 * Links component
 */
interface LinksComponent {
  github_url: string | null;
  website_url: string | null;
  press_urls: string[];
  social_media_urls: string[];
  all_links_live: boolean; // No 404s
}

/**
 * Maintenance log component
 */
interface MaintenanceLogComponent {
  last_update_date: string | null;
  update_frequency: 'inactive' | 'sporadic' | 'regular' | 'active';
  recent_updates: string[]; // Last 3-5 updates
  shows_sustained_effort: boolean;
}

/**
 * Proofpack for one project
 */
interface Proofpack {
  project_name: string;
  project_id: string;
  hero_metric: HeroMetric | null;
  timeline: Timeline | null;
  screenshots: ScreenshotsComponent | null;
  testimonials: TestimonialsComponent | null;
  links: LinksComponent | null;
  maintenance_log: MaintenanceLogComponent | null;
  component_statuses: ComponentStatus[];
  completeness_score: number; // 0-100 (based on components present)
  proof_strength: 'weak' | 'minimum' | 'solid' | 'excellent';
  can_pitch: boolean; // True if ≥3 components complete
}

/**
 * Assembly checklist
 */
interface AssemblyChecklist {
  project_name: string;
  priority: 'P0' | 'P1' | 'P2';
  next_actions: string[];
  estimated_hours: number;
  deadline: string | null;
}

/**
 * Proof engineering result
 */
interface ProofEngineeringResult {
  proofpacks: Proofpack[];
  projects_ready_to_pitch: number;
  projects_need_work: number;
  priority_project: string | null;
  assembly_checklists: AssemblyChecklist[];
  recommendations: string[];
}

export class ProofEngineering implements IntelligenceType {
  type_id = 'TYPE-057';
  name = 'Proof Engineering';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.4';

  /**
   * Component weights for completeness scoring
   */
  private readonly COMPONENT_WEIGHTS = {
    hero_metric: 25,
    timeline: 15,
    screenshots: 20,
    testimonials: 20,
    links: 15,
    maintenance_log: 5,
  };

  /**
   * Process proof engineering analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract project facts
    const projectFacts = facts.facts.filter(f =>
      f.category === 'ACTIVITIES' &&
      (f.data?.activity_type === 'project' || f.data?.item_type === 'Project')
    );

    // If no projects, return guidance
    if (projectFacts.length === 0) {
      return {
        type_id: this.type_id,
        triggered: false,
        confidence: 0.5,
        data: {
          proofpacks: [],
          projects_ready_to_pitch: 0,
          projects_need_work: 0,
          priority_project: null,
          assembly_checklists: [],
          recommendations: [
            'No projects found for proofpack assembly',
            'Start with 1 flagship project and build proof as you go',
            'Remember: Proof Before Pitch (evidence >>> claims)',
          ],
        },
      };
    }

    // Build proofpack for each project
    const proofpacks = projectFacts.map(projectFact =>
      this.buildProofpack(projectFact)
    );

    // Count ready vs. needs work
    const projectsReadyToPitch = proofpacks.filter(p => p.can_pitch).length;
    const projectsNeedWork = proofpacks.length - projectsReadyToPitch;

    // Identify priority project (highest completeness)
    const priorityProject = proofpacks.length > 0
      ? proofpacks.reduce((max, p) => p.completeness_score > max.completeness_score ? p : max).project_name
      : null;

    // Generate assembly checklists
    const assemblyChecklists = proofpacks
      .filter(p => !p.can_pitch) // Only for projects needing work
      .map(p => this.generateAssemblyChecklist(p));

    // Generate recommendations
    const recommendations = this.generateRecommendations(proofpacks, priorityProject);

    const result: ProofEngineeringResult = {
      proofpacks: proofpacks,
      projects_ready_to_pitch: projectsReadyToPitch,
      projects_need_work: projectsNeedWork,
      priority_project: priorityProject,
      assembly_checklists: assemblyChecklists,
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
   * Build proofpack for one project
   */
  private buildProofpack(projectFact: any): Proofpack {
    const project = projectFact.data;
    const projectName = project.name || project.title || 'Unnamed Project';
    const projectId = project.project_id || projectFact.fact_id;

    // Extract each component
    const heroMetric = this.extractHeroMetric(project);
    const timeline = this.extractTimeline(project);
    const screenshots = this.extractScreenshots(project);
    const testimonials = this.extractTestimonials(project);
    const links = this.extractLinks(project);
    const maintenanceLog = this.extractMaintenanceLog(project);

    // Assess each component status
    const componentStatuses = this.assessComponentStatuses({
      hero_metric: heroMetric,
      timeline: timeline,
      screenshots: screenshots,
      testimonials: testimonials,
      links: links,
      maintenance_log: maintenanceLog,
    });

    // Calculate completeness score
    const completenessScore = this.calculateCompletenessScore(componentStatuses);

    // Determine proof strength
    const proofStrength = this.determineProofStrength(completenessScore, componentStatuses);

    // Can pitch if ≥3 components complete
    const completeComponents = componentStatuses.filter(c => c.status === 'complete').length;
    const canPitch = completeComponents >= 3;

    return {
      project_name: projectName,
      project_id: projectId,
      hero_metric: heroMetric,
      timeline: timeline,
      screenshots: screenshots,
      testimonials: testimonials,
      links: links,
      maintenance_log: maintenanceLog,
      component_statuses: componentStatuses,
      completeness_score: completenessScore,
      proof_strength: proofStrength,
      can_pitch: canPitch,
    };
  }

  /**
   * Extract hero metric from project
   */
  private extractHeroMetric(project: any): HeroMetric | null {
    const userCount = project.user_count || project.users || 0;
    const revenue = project.revenue || 0;
    const downloads = project.downloads || 0;
    const pressCount = project.press_mentions || 0;

    // Determine best metric
    if (userCount > 0) {
      return {
        metric_type: 'users',
        metric_value: userCount,
        metric_timeframe: project.timeframe || 'to date',
        metric_statement: `${userCount} users ${project.timeframe || 'to date'}`,
        credibility: project.analytics_verified ? 'verified' : 'unverified',
      };
    } else if (revenue > 0) {
      return {
        metric_type: 'revenue',
        metric_value: revenue,
        metric_timeframe: project.timeframe || 'to date',
        metric_statement: `$${revenue} revenue ${project.timeframe || 'to date'}`,
        credibility: project.revenue_verified ? 'verified' : 'unverified',
      };
    } else if (downloads > 0) {
      return {
        metric_type: 'downloads',
        metric_value: downloads,
        metric_timeframe: project.timeframe || 'to date',
        metric_statement: `${downloads} downloads ${project.timeframe || 'to date'}`,
        credibility: 'unverified',
      };
    } else if (pressCount > 0) {
      return {
        metric_type: 'press',
        metric_value: pressCount,
        metric_timeframe: 'to date',
        metric_statement: `${pressCount} press mentions`,
        credibility: 'documented',
      };
    }

    return null;
  }

  /**
   * Extract timeline from project
   */
  private extractTimeline(project: any): Timeline | null {
    const startDate = project.start_date || project.created_at;
    if (!startDate) return null;

    const milestones = project.milestones || [];
    const currentStatus = project.status || project.current_status || 'Active';
    const futureGoals = project.future_goals || project.roadmap || [];

    return {
      project_start_date: startDate,
      key_milestones: milestones,
      current_status: currentStatus,
      future_goals: Array.isArray(futureGoals) ? futureGoals : [],
      shows_momentum: milestones.length > 1,
    };
  }

  /**
   * Extract screenshots component
   */
  private extractScreenshots(project: any): ScreenshotsComponent | null {
    const screenshotUrls = project.screenshots || [];
    const demoUrl = project.demo_url || project.demo_video || null;

    return {
      screenshot_count: Array.isArray(screenshotUrls) ? screenshotUrls.length : 0,
      demo_video_url: demoUrl,
      visual_quality: project.visual_quality || 'adequate',
      shows_functionality: screenshotUrls.length > 0 || demoUrl !== null,
    };
  }

  /**
   * Extract testimonials component
   */
  private extractTestimonials(project: any): TestimonialsComponent | null {
    const testimonials = project.testimonials || project.user_feedback || [];

    const hasNamedUsers = Array.isArray(testimonials) &&
      testimonials.some((t: any) => t.user_name && t.user_name !== 'Anonymous');

    const socialValidationScore = hasNamedUsers ? 80 : 40;

    return {
      testimonial_count: Array.isArray(testimonials) ? testimonials.length : 0,
      testimonials: Array.isArray(testimonials) ? testimonials : [],
      has_named_users: hasNamedUsers,
      social_validation_score: socialValidationScore,
    };
  }

  /**
   * Extract links component
   */
  private extractLinks(project: any): LinksComponent | null {
    const githubUrl = project.github_url || project.repo_url || null;
    const websiteUrl = project.website_url || project.url || null;
    const pressUrls = project.press_urls || [];
    const socialUrls = project.social_media_urls || [];

    return {
      github_url: githubUrl,
      website_url: websiteUrl,
      press_urls: Array.isArray(pressUrls) ? pressUrls : [],
      social_media_urls: Array.isArray(socialUrls) ? socialUrls : [],
      all_links_live: true, // Assume live unless 404 detected
    };
  }

  /**
   * Extract maintenance log component
   */
  private extractMaintenanceLog(project: any): MaintenanceLogComponent | null {
    const lastUpdate = project.last_update || project.updated_at || null;
    const updates = project.updates || project.changelog || [];

    let updateFrequency: 'inactive' | 'sporadic' | 'regular' | 'active' = 'inactive';
    if (lastUpdate) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (24 * 60 * 60 * 1000));
      if (daysSinceUpdate < 7) {
        updateFrequency = 'active';
      } else if (daysSinceUpdate < 30) {
        updateFrequency = 'regular';
      } else if (daysSinceUpdate < 90) {
        updateFrequency = 'sporadic';
      }
    }

    return {
      last_update_date: lastUpdate,
      update_frequency: updateFrequency,
      recent_updates: Array.isArray(updates) ? updates.slice(0, 5) : [],
      shows_sustained_effort: updateFrequency === 'active' || updateFrequency === 'regular',
    };
  }

  /**
   * Assess component statuses
   */
  private assessComponentStatuses(components: {
    hero_metric: HeroMetric | null;
    timeline: Timeline | null;
    screenshots: ScreenshotsComponent | null;
    testimonials: TestimonialsComponent | null;
    links: LinksComponent | null;
    maintenance_log: MaintenanceLogComponent | null;
  }): ComponentStatus[] {
    const statuses: ComponentStatus[] = [];

    // Hero Metric
    if (components.hero_metric) {
      statuses.push({
        component_name: 'hero_metric',
        status: components.hero_metric.credibility === 'verified' || components.hero_metric.credibility === 'documented' ? 'complete' : 'partial',
        quality_score: components.hero_metric.credibility === 'verified' ? 100 : 70,
        artifacts: [components.hero_metric.metric_statement],
        gaps: components.hero_metric.credibility === 'unverified' ? ['Verify with analytics/documentation'] : [],
      });
    } else {
      statuses.push({
        component_name: 'hero_metric',
        status: 'missing',
        quality_score: 0,
        artifacts: [],
        gaps: ['No hero metric identified - add user count, revenue, or impact metric'],
      });
    }

    // Timeline
    if (components.timeline && components.timeline.shows_momentum) {
      statuses.push({
        component_name: 'timeline',
        status: 'complete',
        quality_score: 90,
        artifacts: [`Start: ${components.timeline.project_start_date}`, `${components.timeline.key_milestones.length} milestones`],
        gaps: [],
      });
    } else if (components.timeline) {
      statuses.push({
        component_name: 'timeline',
        status: 'partial',
        quality_score: 50,
        artifacts: [`Start: ${components.timeline.project_start_date}`],
        gaps: ['Add key milestones to show momentum'],
      });
    } else {
      statuses.push({
        component_name: 'timeline',
        status: 'missing',
        quality_score: 0,
        artifacts: [],
        gaps: ['Create timeline showing project journey'],
      });
    }

    // Screenshots
    if (components.screenshots && components.screenshots.shows_functionality) {
      statuses.push({
        component_name: 'screenshots',
        status: 'complete',
        quality_score: 85,
        artifacts: [`${components.screenshots.screenshot_count} screenshots`, components.screenshots.demo_video_url || ''].filter(Boolean),
        gaps: [],
      });
    } else {
      statuses.push({
        component_name: 'screenshots',
        status: 'missing',
        quality_score: 0,
        artifacts: [],
        gaps: ['Add screenshots or demo video showing product in action'],
      });
    }

    // Testimonials
    if (components.testimonials && components.testimonials.has_named_users && components.testimonials.testimonial_count >= 3) {
      statuses.push({
        component_name: 'testimonials',
        status: 'complete',
        quality_score: components.testimonials.social_validation_score,
        artifacts: [`${components.testimonials.testimonial_count} testimonials`],
        gaps: [],
      });
    } else if (components.testimonials && components.testimonials.testimonial_count > 0) {
      statuses.push({
        component_name: 'testimonials',
        status: 'partial',
        quality_score: 50,
        artifacts: [`${components.testimonials.testimonial_count} testimonials`],
        gaps: ['Need 3+ named user testimonials (not anonymous)'],
      });
    } else {
      statuses.push({
        component_name: 'testimonials',
        status: 'missing',
        quality_score: 0,
        artifacts: [],
        gaps: ['Collect 3+ user testimonials with names and context'],
      });
    }

    // Links
    if (components.links && (components.links.github_url || components.links.website_url)) {
      const linkCount = [components.links.github_url, components.links.website_url].filter(Boolean).length +
                        components.links.press_urls.length +
                        components.links.social_media_urls.length;
      statuses.push({
        component_name: 'links',
        status: linkCount >= 2 ? 'complete' : 'partial',
        quality_score: Math.min(100, linkCount * 25),
        artifacts: [components.links.github_url, components.links.website_url].filter(Boolean) as string[],
        gaps: linkCount < 2 ? ['Add more verifiable links (GitHub, website, press)'] : [],
      });
    } else {
      statuses.push({
        component_name: 'links',
        status: 'missing',
        quality_score: 0,
        artifacts: [],
        gaps: ['Add GitHub repo and/or live website link'],
      });
    }

    // Maintenance Log
    if (components.maintenance_log && components.maintenance_log.shows_sustained_effort) {
      statuses.push({
        component_name: 'maintenance_log',
        status: 'complete',
        quality_score: 80,
        artifacts: [`Last update: ${components.maintenance_log.last_update_date}`, `${components.maintenance_log.recent_updates.length} recent updates`],
        gaps: [],
      });
    } else if (components.maintenance_log && components.maintenance_log.last_update_date) {
      statuses.push({
        component_name: 'maintenance_log',
        status: 'partial',
        quality_score: 40,
        artifacts: [`Last update: ${components.maintenance_log.last_update_date}`],
        gaps: ['Update more frequently to show sustained effort'],
      });
    } else {
      statuses.push({
        component_name: 'maintenance_log',
        status: 'missing',
        quality_score: 0,
        artifacts: [],
        gaps: ['Start maintenance log with regular updates'],
      });
    }

    return statuses;
  }

  /**
   * Calculate completeness score
   */
  private calculateCompletenessScore(componentStatuses: ComponentStatus[]): number {
    let totalScore = 0;

    componentStatuses.forEach(status => {
      const weight = this.COMPONENT_WEIGHTS[status.component_name] || 10;
      const componentContribution = (status.quality_score / 100) * weight;
      totalScore += componentContribution;
    });

    return Math.round(totalScore);
  }

  /**
   * Determine proof strength
   */
  private determineProofStrength(
    completenessScore: number,
    componentStatuses: ComponentStatus[]
  ): 'weak' | 'minimum' | 'solid' | 'excellent' {
    const completeCount = componentStatuses.filter(c => c.status === 'complete').length;

    if (completeCount >= 5 || completenessScore >= 80) {
      return 'excellent';
    } else if (completeCount >= 4 || completenessScore >= 60) {
      return 'solid';
    } else if (completeCount >= 3 || completenessScore >= 40) {
      return 'minimum';
    } else {
      return 'weak';
    }
  }

  /**
   * Generate assembly checklist
   */
  private generateAssemblyChecklist(proofpack: Proofpack): AssemblyChecklist {
    const nextActions: string[] = [];
    let estimatedHours = 0;

    // Add actions for missing/partial components (prioritize high-weight)
    const sortedStatuses = [...proofpack.component_statuses].sort((a, b) => {
      const weightA = this.COMPONENT_WEIGHTS[a.component_name] || 0;
      const weightB = this.COMPONENT_WEIGHTS[b.component_name] || 0;
      return weightB - weightA;
    });

    sortedStatuses.forEach(status => {
      if (status.status === 'missing' || status.status === 'partial') {
        status.gaps.forEach(gap => {
          nextActions.push(`${status.component_name}: ${gap}`);
        });
        // Estimate hours per component
        if (status.component_name === 'hero_metric') estimatedHours += 1;
        else if (status.component_name === 'screenshots') estimatedHours += 2;
        else if (status.component_name === 'testimonials') estimatedHours += 3;
        else if (status.component_name === 'timeline') estimatedHours += 1;
        else if (status.component_name === 'links') estimatedHours += 1;
        else if (status.component_name === 'maintenance_log') estimatedHours += 1;
      }
    });

    return {
      project_name: proofpack.project_name,
      priority: proofpack.completeness_score > 40 ? 'P1' : 'P2',
      next_actions: nextActions,
      estimated_hours: estimatedHours,
      deadline: null, // Set based on application deadlines
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(proofpacks: Proofpack[], priorityProject: string | null): string[] {
    const recommendations: string[] = [];

    // No proofpacks
    if (proofpacks.length === 0) {
      return ['Start building proof for your flagship project', 'Remember: Proof Before Pitch'];
    }

    // Projects ready to pitch
    const readyProjects = proofpacks.filter(p => p.can_pitch);
    if (readyProjects.length > 0) {
      recommendations.push(`✅ ${readyProjects.length} project(s) ready to pitch with strong proof`);
      readyProjects.forEach(p => {
        recommendations.push(`  - ${p.project_name} (${p.completeness_score}% complete, ${p.proof_strength} proof)`);
      });
    }

    // Priority project needs work
    if (priorityProject) {
      const priorityPack = proofpacks.find(p => p.project_name === priorityProject);
      if (priorityPack && !priorityPack.can_pitch) {
        recommendations.push(`🎯 Priority: Complete proofpack for ${priorityProject}`);
        recommendations.push(`  Current: ${priorityPack.completeness_score}% complete (need ≥3 components)`);

        // Top 3 gaps
        const topGaps = priorityPack.component_statuses
          .filter(c => c.status !== 'complete')
          .sort((a, b) => {
            const weightA = this.COMPONENT_WEIGHTS[a.component_name] || 0;
            const weightB = this.COMPONENT_WEIGHTS[b.component_name] || 0;
            return weightB - weightA;
          })
          .slice(0, 3);

        topGaps.forEach(gap => {
          recommendations.push(`  - Add: ${gap.component_name} (${gap.gaps.join(', ')})`);
        });
      }
    }

    // General guidance
    if (proofpacks.some(p => p.completeness_score < 50)) {
      recommendations.push('⚠️ Remember: Never claim achievements without proof to back them up');
      recommendations.push('Focus on 1 project with excellent proof > 3 projects with weak proof');
    }

    return recommendations;
  }
}
