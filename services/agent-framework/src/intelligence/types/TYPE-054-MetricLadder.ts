/**
 * TYPE-054: Metric Ladder Instrumentation Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: M0→M4 Milestone Tracking
 *
 * Purpose: Track project growth through measurable milestone progression.
 * Each milestone requires specific proof artifacts before claiming completion.
 * Prevents resume padding ("10,000 users!" with zero proof).
 *
 * Algorithm:
 * M0: Setup Complete
 *   - Proof: GitHub repo live, basic website/demo deployed
 *   - Artifacts: GitHub link, website URL, demo video/screenshots
 *
 * M1: 1 User
 *   - Proof: 1 real user (not self) using product
 *   - Artifacts: User testimonial, usage screenshot, feedback
 *
 * M2: 10 Users
 *   - Proof: 10 real users from local network
 *   - Artifacts: User list, usage stats, testimonials (3+)
 *
 * M3: 100 Users
 *   - Proof: 100 users with viral loop working
 *   - Artifacts: Analytics dashboard, growth chart, user testimonials (10+)
 *
 * M4: 1,000 Users
 *   - Proof: 1,000+ users with product-market fit
 *   - Artifacts: Analytics, press mentions, revenue (if applicable)
 *
 * Proof-Before-Pitch Pattern:
 * - Can only claim milestone AFTER proof artifacts assembled
 * - Minimum 3 artifacts required per milestone
 * - Evidence >>> claims
 *
 * Data Sources:
 * - W000-FRAMEWORK-004 (Metric Ladder Framework)
 * - Student projects from kb_items (item_type='Project')
 * - Activity facts (project updates, user counts)
 *
 * Output: MetricLadderResult
 * - current_milestone: M0-M4
 * - proof_artifacts: Submitted proof for current milestone
 * - next_milestone: Next target
 * - proof_requirements: What's needed for next milestone
 * - trajectory_estimate: Time to next milestone based on growth rate
 *
 * Created: 2025-10-29
 * Version: v20.2
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Milestone levels (M0-M4)
 */
type MilestoneLevel = 'M0' | 'M1' | 'M2' | 'M3' | 'M4';

/**
 * Proof artifact types
 */
interface ProofArtifact {
  artifact_type: 'github_link' | 'website_url' | 'demo_video' | 'screenshot' |
                  'user_testimonial' | 'usage_stats' | 'analytics_dashboard' |
                  'press_mention' | 'revenue_data';
  artifact_url: string;
  artifact_description: string;
  date_added: string;
}

/**
 * Milestone definition
 */
interface MilestoneDefinition {
  level: MilestoneLevel;
  name: string;
  user_count_target: number;
  proof_requirements: string[];
  minimum_artifacts: number;
  typical_duration_weeks: number; // How long typically takes to reach
}

/**
 * Project status on metric ladder
 */
interface ProjectMilestoneStatus {
  project_name: string;
  current_milestone: MilestoneLevel;
  current_user_count: number;
  proof_artifacts_submitted: ProofArtifact[];
  milestone_completion_date: string | null;
  proof_completeness_score: number; // 0.0-1.0
}

/**
 * Growth trajectory analysis
 */
interface GrowthTrajectory {
  growth_rate: number; // Users per week
  weeks_at_current_milestone: number;
  estimated_weeks_to_next: number | null;
  momentum: 'stalled' | 'slow' | 'steady' | 'accelerating';
  blockers: string[];
}

/**
 * Metric ladder result
 */
interface MetricLadderResult {
  projects: ProjectMilestoneStatus[];
  current_milestone: MilestoneLevel;
  next_milestone: MilestoneLevel | null;
  next_milestone_requirements: string[];
  proof_gaps: string[]; // What proof is missing
  growth_trajectory: GrowthTrajectory;
  recommendations: string[];
}

export class MetricLadder implements IntelligenceType {
  type_id = 'TYPE-054';
  name = 'Metric Ladder Instrumentation';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.2';

  /**
   * Milestone definitions (M0-M4)
   */
  private readonly MILESTONES: MilestoneDefinition[] = [
    {
      level: 'M0',
      name: 'Setup Complete',
      user_count_target: 0,
      proof_requirements: [
        'GitHub repository live (public or documented private)',
        'Basic website/landing page deployed',
        'Demo video or screenshots showing functionality',
      ],
      minimum_artifacts: 2, // GitHub + (website OR demo)
      typical_duration_weeks: 2,
    },
    {
      level: 'M1',
      name: '1 User Validation',
      user_count_target: 1,
      proof_requirements: [
        '1 real user (not self) actively using product',
        'User testimonial or feedback quote',
        'Usage screenshot or data proving engagement',
      ],
      minimum_artifacts: 2, // User testimonial + proof
      typical_duration_weeks: 2,
    },
    {
      level: 'M2',
      name: '10 Users - Local Network',
      user_count_target: 10,
      proof_requirements: [
        '10 real users from local network (school, friends, family)',
        'Usage statistics or analytics',
        '3+ user testimonials showing value',
      ],
      minimum_artifacts: 3, // Stats + testimonials
      typical_duration_weeks: 4,
    },
    {
      level: 'M3',
      name: '100 Users - Viral Loop',
      user_count_target: 100,
      proof_requirements: [
        '100+ users with organic growth (viral loop working)',
        'Analytics dashboard showing growth chart',
        '10+ user testimonials',
        'Evidence of word-of-mouth or social sharing',
      ],
      minimum_artifacts: 3, // Analytics + testimonials + viral evidence
      typical_duration_weeks: 12,
    },
    {
      level: 'M4',
      name: '1,000 Users - Product-Market Fit',
      user_count_target: 1000,
      proof_requirements: [
        '1,000+ active users',
        'Analytics showing retention and engagement',
        'Press mentions or media coverage',
        'Revenue data (if applicable)',
        'Strong user testimonials (20+)',
      ],
      minimum_artifacts: 4, // Analytics + press + testimonials + retention
      typical_duration_weeks: 24,
    },
  ];

  /**
   * Process metric ladder analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract project facts
    const projectFacts = facts.facts.filter(f =>
      f.category === 'ACTIVITIES' &&
      (f.data?.activity_type === 'project' || f.data?.item_type === 'Project')
    );

    // If no projects, return basic guidance
    if (projectFacts.length === 0) {
      return {
        type_id: this.type_id,
        triggered: true,
        confidence: 0.5,
        data: {
          projects: [],
          current_milestone: 'M0' as MilestoneLevel,
          next_milestone: 'M0' as MilestoneLevel,
          next_milestone_requirements: this.MILESTONES[0].proof_requirements,
          proof_gaps: ['No projects found - start with M0 (setup)'],
          growth_trajectory: {
            growth_rate: 0,
            weeks_at_current_milestone: 0,
            estimated_weeks_to_next: this.MILESTONES[0].typical_duration_weeks,
            momentum: 'stalled' as const,
            blockers: ['No project started yet'],
          },
          recommendations: [
            'Start with M0: Set up GitHub repo + basic website/demo',
            'Focus on one flagship project (not multiple small projects)',
            'Target: M0 complete in 2 weeks',
          ],
        },
      };
    }

    // Analyze each project's milestone status
    const projectStatuses = projectFacts.map(fact =>
      this.analyzeProjectMilestone(fact)
    );

    // Find the most advanced project (primary focus)
    const primaryProject = this.findPrimaryProject(projectStatuses);

    // Determine current and next milestones
    const currentMilestone = primaryProject.current_milestone;
    const nextMilestone = this.getNextMilestone(currentMilestone);

    // Analyze growth trajectory
    const growthTrajectory = this.analyzeGrowthTrajectory(primaryProject, facts);

    // Identify proof gaps
    const proofGaps = this.identifyProofGaps(primaryProject);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      primaryProject,
      growthTrajectory,
      proofGaps
    );

    const result: MetricLadderResult = {
      projects: projectStatuses,
      current_milestone: currentMilestone,
      next_milestone: nextMilestone,
      next_milestone_requirements: nextMilestone
        ? this.getMilestoneDefinition(nextMilestone).proof_requirements
        : [],
      proof_gaps: proofGaps,
      growth_trajectory: growthTrajectory,
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
   * Analyze individual project milestone status
   */
  private analyzeProjectMilestone(projectFact: any): ProjectMilestoneStatus {
    const projectName = projectFact.data?.name || projectFact.data?.title || 'Unnamed Project';
    const userCount = projectFact.data?.user_count || projectFact.data?.users || 0;

    // Extract proof artifacts from project data
    const proofArtifacts: ProofArtifact[] = [];

    if (projectFact.data?.github_url) {
      proofArtifacts.push({
        artifact_type: 'github_link',
        artifact_url: projectFact.data.github_url,
        artifact_description: 'GitHub repository',
        date_added: projectFact.data.created_at || new Date().toISOString(),
      });
    }

    if (projectFact.data?.website_url) {
      proofArtifacts.push({
        artifact_type: 'website_url',
        artifact_url: projectFact.data.website_url,
        artifact_description: 'Project website',
        date_added: projectFact.data.created_at || new Date().toISOString(),
      });
    }

    if (projectFact.data?.demo_url) {
      proofArtifacts.push({
        artifact_type: 'demo_video',
        artifact_url: projectFact.data.demo_url,
        artifact_description: 'Demo video',
        date_added: projectFact.data.created_at || new Date().toISOString(),
      });
    }

    // Determine current milestone based on user count and proof
    const currentMilestone = this.determineMilestone(userCount, proofArtifacts);

    // Calculate proof completeness score
    const milestoneDefn = this.getMilestoneDefinition(currentMilestone);
    const proofScore = Math.min(1.0, proofArtifacts.length / milestoneDefn.minimum_artifacts);

    return {
      project_name: projectName,
      current_milestone: currentMilestone,
      current_user_count: userCount,
      proof_artifacts_submitted: proofArtifacts,
      milestone_completion_date: projectFact.data?.milestone_date || null,
      proof_completeness_score: Math.round(proofScore * 100) / 100,
    };
  }

  /**
   * Determine milestone based on user count and proof artifacts
   */
  private determineMilestone(userCount: number, proofArtifacts: ProofArtifact[]): MilestoneLevel {
    // No proof artifacts? Still at M0
    if (proofArtifacts.length === 0) {
      return 'M0';
    }

    // Has GitHub/website? At least M0
    const hasSetup = proofArtifacts.some(a =>
      a.artifact_type === 'github_link' || a.artifact_type === 'website_url'
    );
    if (!hasSetup) {
      return 'M0';
    }

    // Determine by user count
    if (userCount === 0) return 'M0';
    if (userCount >= 1 && userCount < 10) return 'M1';
    if (userCount >= 10 && userCount < 100) return 'M2';
    if (userCount >= 100 && userCount < 1000) return 'M3';
    return 'M4';
  }

  /**
   * Get milestone definition
   */
  private getMilestoneDefinition(level: MilestoneLevel): MilestoneDefinition {
    return this.MILESTONES.find(m => m.level === level)!;
  }

  /**
   * Get next milestone
   */
  private getNextMilestone(current: MilestoneLevel): MilestoneLevel | null {
    const milestoneOrder: MilestoneLevel[] = ['M0', 'M1', 'M2', 'M3', 'M4'];
    const currentIndex = milestoneOrder.indexOf(current);
    if (currentIndex === milestoneOrder.length - 1) return null; // Already at M4
    return milestoneOrder[currentIndex + 1];
  }

  /**
   * Find primary project (most advanced milestone)
   */
  private findPrimaryProject(projects: ProjectMilestoneStatus[]): ProjectMilestoneStatus {
    if (projects.length === 0) {
      // Return default empty project
      return {
        project_name: 'No project',
        current_milestone: 'M0',
        current_user_count: 0,
        proof_artifacts_submitted: [],
        milestone_completion_date: null,
        proof_completeness_score: 0,
      };
    }

    const milestoneOrder: MilestoneLevel[] = ['M0', 'M1', 'M2', 'M3', 'M4'];
    return projects.reduce((primary, current) => {
      const primaryIndex = milestoneOrder.indexOf(primary.current_milestone);
      const currentIndex = milestoneOrder.indexOf(current.current_milestone);
      return currentIndex > primaryIndex ? current : primary;
    });
  }

  /**
   * Analyze growth trajectory
   */
  private analyzeGrowthTrajectory(
    project: ProjectMilestoneStatus,
    facts: FactSet
  ): GrowthTrajectory {
    // Calculate weeks at current milestone (estimate if no completion date)
    const weeksAtMilestone = project.milestone_completion_date
      ? Math.floor((Date.now() - new Date(project.milestone_completion_date).getTime()) / (7 * 24 * 60 * 60 * 1000))
      : 4; // Default estimate

    // Calculate growth rate (users per week)
    const growthRate = weeksAtMilestone > 0
      ? Math.round((project.current_user_count / weeksAtMilestone) * 10) / 10
      : 0;

    // Determine momentum
    let momentum: 'stalled' | 'slow' | 'steady' | 'accelerating';
    if (growthRate === 0 && weeksAtMilestone > 4) {
      momentum = 'stalled';
    } else if (growthRate < 1) {
      momentum = 'slow';
    } else if (growthRate >= 1 && growthRate < 5) {
      momentum = 'steady';
    } else {
      momentum = 'accelerating';
    }

    // Estimate weeks to next milestone
    const nextMilestone = this.getNextMilestone(project.current_milestone);
    let estimatedWeeksToNext: number | null = null;
    const blockers: string[] = [];

    if (nextMilestone) {
      const nextMilestoneDef = this.getMilestoneDefinition(nextMilestone);
      const usersNeeded = nextMilestoneDef.user_count_target - project.current_user_count;

      if (growthRate > 0) {
        estimatedWeeksToNext = Math.ceil(usersNeeded / growthRate);
      } else {
        estimatedWeeksToNext = nextMilestoneDef.typical_duration_weeks;
        blockers.push('Zero growth rate - user acquisition stalled');
      }

      // Check for proof gaps as blockers
      if (project.proof_completeness_score < 0.7) {
        blockers.push('Insufficient proof artifacts for current milestone');
      }
    }

    return {
      growth_rate: growthRate,
      weeks_at_current_milestone: weeksAtMilestone,
      estimated_weeks_to_next: estimatedWeeksToNext,
      momentum: momentum,
      blockers: blockers,
    };
  }

  /**
   * Identify proof gaps
   */
  private identifyProofGaps(project: ProjectMilestoneStatus): string[] {
    const gaps: string[] = [];
    const milestoneDefn = this.getMilestoneDefinition(project.current_milestone);

    // Check if minimum artifacts met
    if (project.proof_artifacts_submitted.length < milestoneDefn.minimum_artifacts) {
      gaps.push(
        `Missing ${milestoneDefn.minimum_artifacts - project.proof_artifacts_submitted.length} proof artifacts for ${project.current_milestone}`
      );
    }

    // Check specific requirements
    milestoneDefn.proof_requirements.forEach(requirement => {
      if (requirement.includes('GitHub') && !project.proof_artifacts_submitted.some(a => a.artifact_type === 'github_link')) {
        gaps.push('Missing: GitHub repository link');
      }
      if (requirement.includes('website') && !project.proof_artifacts_submitted.some(a => a.artifact_type === 'website_url')) {
        gaps.push('Missing: Website/landing page URL');
      }
      if (requirement.includes('testimonial') && !project.proof_artifacts_submitted.some(a => a.artifact_type === 'user_testimonial')) {
        gaps.push('Missing: User testimonials');
      }
      if (requirement.includes('Analytics') && !project.proof_artifacts_submitted.some(a => a.artifact_type === 'analytics_dashboard')) {
        gaps.push('Missing: Analytics dashboard/usage stats');
      }
    });

    return gaps;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    project: ProjectMilestoneStatus,
    trajectory: GrowthTrajectory,
    proofGaps: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Address stalled momentum
    if (trajectory.momentum === 'stalled') {
      recommendations.push(`🚨 STALLED: ${project.project_name} has zero growth for ${trajectory.weeks_at_current_milestone}+ weeks`);
      recommendations.push('Action: Either revive project (new user acquisition strategy) OR pivot to different project');
      recommendations.push('Do NOT continue claiming progress without proof of user growth');
    }

    // Address proof gaps first
    if (proofGaps.length > 0) {
      recommendations.push(`📋 Proof gaps detected for ${project.current_milestone}:`);
      proofGaps.forEach(gap => recommendations.push(`  - ${gap}`));
      recommendations.push('Complete proof requirements BEFORE claiming milestone on resume/apps');
    }

    // Provide next milestone guidance
    const nextMilestone = this.getNextMilestone(project.current_milestone);
    if (nextMilestone && trajectory.estimated_weeks_to_next) {
      const nextDef = this.getMilestoneDefinition(nextMilestone);
      recommendations.push(`🎯 Next: ${nextMilestone} (${nextDef.name}) - Target: ${trajectory.estimated_weeks_to_next} weeks`);
      recommendations.push(`  Proof needed: ${nextDef.proof_requirements.join(', ')}`);
    }

    // Celebrate good momentum
    if (trajectory.momentum === 'accelerating') {
      recommendations.push(`✅ Excellent momentum! Growth rate: ${trajectory.growth_rate} users/week`);
      recommendations.push('Keep current strategy - document growth for proofpack');
    }

    return recommendations;
  }
}
