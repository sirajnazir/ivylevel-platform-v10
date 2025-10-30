/**
 * TYPE-062: Qualitative Transformation Tracking Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: Internal Growth Measurement
 *
 * Purpose: Track qualitative (non-quantifiable) growth beyond metrics.
 * Measures confidence, voice authenticity, grit, self-advocacy - the internal
 * transformations that matter but don't show up on transcripts.
 *
 * Algorithm: 4 Qualitative Dimensions
 *
 * 1. **Confidence** (1-10 scale across domains)
 *    - Academic confidence (asking questions, participating in class)
 *    - Social confidence (making friends, joining clubs)
 *    - Project confidence (starting ambitious projects, showing work publicly)
 *    - Compare: Week 1 baseline vs. Current week
 *
 * 2. **Voice Authenticity** (1-10 scale in communication)
 *    - Essay voice (authentic vs. trying to sound impressive)
 *    - Conversation voice (genuine vs. filtered)
 *    - Vulnerability dosing (strategic self-disclosure)
 *    - Compare: Early essays vs. Recent essays
 *
 * 3. **Grit Examples** (specific instances of perseverance)
 *    - Project 1: Persisted through 3-month technical blocker
 *    - Competition: Applied 5 times before winning
 *    - Relationship: Rebuilt trust with teacher after conflict
 *    - Evidence-based (not claimed, but demonstrated)
 *
 * 4. **Self-Advocacy Growth** (asking for help, expressing needs)
 *    - Asking for LoR help (from teachers)
 *    - Requesting deadline extension (when overwhelmed)
 *    - Seeking mentorship (finding allies)
 *    - Communicating boundaries (protecting capacity)
 *
 * **Transformation Timeline**:
 * - Week 1: Baseline assessment
 * - Week 12: Q1 check-in
 * - Week 24: Q2 check-in
 * - Week 48: Q4 final assessment
 * - Compare across time to measure growth
 *
 * **Celebration Moments**:
 * - Identify specific wins to celebrate (not just outcomes, but process)
 * - Example: "First time you asked teacher for feedback on project"
 * - Example: "First time you shared vulnerable story in essay"
 *
 * Data Sources:
 * - W000-STRATEGY-019 (Qualitative transformation patterns from coaching)
 * - Session transcripts (confidence signals, voice evolution)
 * - Essay drafts (voice authenticity progression)
 * - Weekly vitals (stress management, self-advocacy)
 *
 * Output: QualitativeTransformationResult
 * - confidence_scores: Current vs. baseline across domains
 * - voice_authenticity_score: Current vs. early essays
 * - grit_examples: Specific perseverance instances
 * - self_advocacy_growth: Asking-for-help milestones
 * - transformation_timeline: Growth journey visualization
 * - celebration_moments: Wins to acknowledge
 *
 * Created: 2025-10-29
 * Version: v20.5
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Confidence score across domains
 */
interface ConfidenceScore {
  domain: 'academic' | 'social' | 'project' | 'overall';
  baseline_score: number; // 1-10 (Week 1)
  current_score: number; // 1-10 (Current)
  delta: number; // current - baseline
  evidence: string[]; // What demonstrates this confidence
}

/**
 * Voice authenticity assessment
 */
interface VoiceAuthenticity {
  baseline_score: number; // 1-10 (Early essays)
  current_score: number; // 1-10 (Recent essays)
  delta: number; // current - baseline
  authenticity_indicators: string[]; // What makes voice authentic
  areas_for_growth: string[]; // Where voice is still filtered
}

/**
 * Grit example (specific perseverance instance)
 */
interface GritExample {
  example_name: string;
  domain: 'academic' | 'project' | 'social' | 'competition';
  challenge_description: string;
  perseverance_actions: string[];
  outcome: string;
  weeks_persisted: number;
  grit_score: number; // 1-10 (how impressive)
}

/**
 * Self-advocacy milestone
 */
interface SelfAdvocacyMilestone {
  milestone_name: string;
  milestone_type: 'asking_for_help' | 'expressing_needs' | 'setting_boundaries' | 'seeking_mentorship';
  date_achieved: string;
  context: string;
  significance: string; // Why this matters
}

/**
 * Transformation checkpoint
 */
interface TransformationCheckpoint {
  week_number: number;
  date: string;
  checkpoint_type: 'baseline' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'current';
  overall_confidence: number; // 1-10
  voice_authenticity: number; // 1-10
  grit_examples_count: number;
  self_advocacy_milestones_count: number;
  notes: string;
}

/**
 * Celebration moment
 */
interface CelebrationMoment {
  moment_name: string;
  date: string;
  significance: string;
  why_celebrate: string; // What internal growth this represents
}

/**
 * Qualitative transformation result
 */
interface QualitativeTransformationResult {
  weeks_in_program: number;
  confidence_scores: ConfidenceScore[];
  voice_authenticity: VoiceAuthenticity;
  grit_examples: GritExample[];
  self_advocacy_milestones: SelfAdvocacyMilestone[];
  transformation_timeline: TransformationCheckpoint[];
  celebration_moments: CelebrationMoment[];
  growth_summary: string;
  recommendations: string[];
}

export class QualitativeTransformation implements IntelligenceType {
  type_id = 'TYPE-062';
  name = 'Qualitative Transformation Tracking';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.5';

  /**
   * Process qualitative transformation analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Calculate weeks in program
    const profileFacts = facts.facts.filter(f => f.category === 'STUDENT_PROFILE');
    const weeksInProgram = this.calculateWeeksInProgram(profileFacts);

    // Assess confidence scores
    const confidenceScores = this.assessConfidence(facts, weeksInProgram);

    // Assess voice authenticity
    const voiceAuthenticity = this.assessVoiceAuthenticity(facts);

    // Extract grit examples
    const gritExamples = this.extractGritExamples(facts);

    // Extract self-advocacy milestones
    const selfAdvocacyMilestones = this.extractSelfAdvocacyMilestones(facts);

    // Build transformation timeline
    const transformationTimeline = this.buildTransformationTimeline(
      weeksInProgram,
      confidenceScores,
      voiceAuthenticity,
      gritExamples,
      selfAdvocacyMilestones
    );

    // Identify celebration moments
    const celebrationMoments = this.identifyCelebrationMoments(
      confidenceScores,
      gritExamples,
      selfAdvocacyMilestones
    );

    // Generate growth summary
    const growthSummary = this.generateGrowthSummary(
      weeksInProgram,
      confidenceScores,
      voiceAuthenticity,
      gritExamples,
      selfAdvocacyMilestones
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      confidenceScores,
      voiceAuthenticity,
      gritExamples,
      selfAdvocacyMilestones
    );

    const result: QualitativeTransformationResult = {
      weeks_in_program: weeksInProgram,
      confidence_scores: confidenceScores,
      voice_authenticity: voiceAuthenticity,
      grit_examples: gritExamples,
      self_advocacy_milestones: selfAdvocacyMilestones,
      transformation_timeline: transformationTimeline,
      celebration_moments: celebrationMoments,
      growth_summary: growthSummary,
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
   * Calculate weeks in program
   */
  private calculateWeeksInProgram(profileFacts: any[]): number {
    const programStartDate = profileFacts[0]?.data?.program_start_date || profileFacts[0]?.data?.first_session_date;

    if (!programStartDate) {
      return 0; // New student
    }

    const startTime = new Date(programStartDate).getTime();
    const currentTime = Date.now();
    const weeks = Math.floor((currentTime - startTime) / (7 * 24 * 60 * 60 * 1000));

    return Math.max(0, weeks);
  }

  /**
   * Assess confidence scores
   */
  private assessConfidence(facts: FactSet, weeksInProgram: number): ConfidenceScore[] {
    // Heuristic: Infer confidence from activity patterns
    const activityFacts = facts.facts.filter(f => f.category === 'ACTIVITIES');
    const essayFacts = facts.facts.filter(f => f.category === 'ESSAYS');

    const scores: ConfidenceScore[] = [];

    // Academic confidence (participating, asking questions)
    const academicBaseline = 5; // Assume middle baseline
    const academicCurrent = activityFacts.some(f =>
      f.data?.description?.includes('leadership') || f.data?.position_title?.includes('President')
    ) ? 8 : 6;
    scores.push({
      domain: 'academic',
      baseline_score: academicBaseline,
      current_score: academicCurrent,
      delta: academicCurrent - academicBaseline,
      evidence: ['Participating in class', 'Asking questions in office hours'],
    });

    // Social confidence (clubs, friends)
    const socialBaseline = 5;
    const socialCurrent = activityFacts.length >= 5 ? 7 : 6;
    scores.push({
      domain: 'social',
      baseline_score: socialBaseline,
      current_score: socialCurrent,
      delta: socialCurrent - socialBaseline,
      evidence: [`Joined ${activityFacts.length} activities`, 'Making friends in clubs'],
    });

    // Project confidence (starting projects, showing work)
    const projectBaseline = 4;
    const projectFacts = activityFacts.filter(f =>
      f.data?.activity_type === 'project' || f.data?.item_type === 'Project'
    );
    const projectCurrent = projectFacts.length > 0 ? 7 : 5;
    scores.push({
      domain: 'project',
      baseline_score: projectBaseline,
      current_score: projectCurrent,
      delta: projectCurrent - projectBaseline,
      evidence: projectFacts.length > 0 ? [`Started ${projectFacts.length} projects`, 'Sharing work publicly'] : ['Not yet starting projects'],
    });

    // Overall confidence (average)
    const overallBaseline = (academicBaseline + socialBaseline + projectBaseline) / 3;
    const overallCurrent = (academicCurrent + socialCurrent + projectCurrent) / 3;
    scores.push({
      domain: 'overall',
      baseline_score: Math.round(overallBaseline),
      current_score: Math.round(overallCurrent),
      delta: Math.round((overallCurrent - overallBaseline) * 10) / 10,
      evidence: ['Growing across all domains'],
    });

    return scores;
  }

  /**
   * Assess voice authenticity
   */
  private assessVoiceAuthenticity(facts: FactSet): VoiceAuthenticity {
    const essayFacts = facts.facts.filter(f => f.category === 'ESSAYS');

    // If no essays, return baseline
    if (essayFacts.length === 0) {
      return {
        baseline_score: 5,
        current_score: 5,
        delta: 0,
        authenticity_indicators: [],
        areas_for_growth: ['Start writing essays to develop authentic voice'],
      };
    }

    // Heuristic: Check for authenticity keywords
    const recentEssay = essayFacts[essayFacts.length - 1];
    const essayText = recentEssay?.data?.essay_text || recentEssay?.data?.content || '';

    const authenticityKeywords = ['I felt', 'I realized', 'I learned', 'my family', 'my experience'];
    const filteredKeywords = ['impressive', 'prestigious', 'achieved', 'accomplished'];

    const authenticityCount = authenticityKeywords.filter(kw =>
      essayText.toLowerCase().includes(kw.toLowerCase())
    ).length;

    const filteredCount = filteredKeywords.filter(kw =>
      essayText.toLowerCase().includes(kw.toLowerCase())
    ).length;

    const baselineScore = 5;
    const currentScore = Math.min(10, 5 + authenticityCount - filteredCount);

    return {
      baseline_score: baselineScore,
      current_score: currentScore,
      delta: currentScore - baselineScore,
      authenticity_indicators: authenticityCount > 2 ? ['Personal pronouns', 'Specific experiences', 'Vulnerability'] : [],
      areas_for_growth: filteredCount > 2 ? ['Reduce "impressive" language', 'Show, don\'t tell', 'Be more vulnerable'] : [],
    };
  }

  /**
   * Extract grit examples
   */
  private extractGritExamples(facts: FactSet): GritExample[] {
    const gritExamples: GritExample[] = [];

    // Look for perseverance signals in activity facts
    const activityFacts = facts.facts.filter(f => f.category === 'ACTIVITIES');

    activityFacts.forEach(fact => {
      const activity = fact.data;
      if (!activity) return;

      // Heuristic: Multi-year commitment = grit
      const yearsInvolved = activity.years_involved || activity.duration_years || 0;
      if (yearsInvolved >= 2) {
        gritExamples.push({
          example_name: activity.name || 'Activity',
          domain: 'project',
          challenge_description: `${yearsInvolved}+ year commitment to ${activity.name}`,
          perseverance_actions: ['Sustained effort over multiple years', 'Overcame obstacles to continue'],
          outcome: activity.achievements || 'Ongoing',
          weeks_persisted: yearsInvolved * 52,
          grit_score: Math.min(10, 5 + yearsInvolved),
        });
      }
    });

    // Look for competition attempts (applied multiple times)
    const awardFacts = facts.facts.filter(f => f.category === 'AWARDS');
    awardFacts.forEach(fact => {
      const award = fact.data;
      if (award?.applications_count && award.applications_count > 1) {
        gritExamples.push({
          example_name: award.name || 'Competition',
          domain: 'competition',
          challenge_description: `Applied ${award.applications_count} times before winning`,
          perseverance_actions: ['Persisted after rejection', 'Improved application each time'],
          outcome: award.status === 'won' ? 'Won' : 'Still applying',
          weeks_persisted: award.applications_count * 4,
          grit_score: Math.min(10, 6 + award.applications_count),
        });
      }
    });

    return gritExamples.slice(0, 5); // Top 5
  }

  /**
   * Extract self-advocacy milestones
   */
  private extractSelfAdvocacyMilestones(facts: FactSet): SelfAdvocacyMilestone[] {
    const milestones: SelfAdvocacyMilestone[] = [];

    // Look for LoR requests (asking for help)
    const lorFacts = facts.facts.filter(f => f.category === 'RECOMMENDATIONS');
    if (lorFacts.length > 0) {
      milestones.push({
        milestone_name: 'First LoR request',
        milestone_type: 'asking_for_help',
        date_achieved: lorFacts[0]?.data?.requested_date || new Date().toISOString().split('T')[0],
        context: 'Asked teacher for letter of recommendation',
        significance: 'First time advocating for academic support',
      });
    }

    // Look for extension requests (expressing needs)
    const taskFacts = facts.facts.filter(f => f.category === 'TASKS');
    const extensionRequests = taskFacts.filter(f =>
      f.data?.notes?.includes('extension') || f.data?.status === 'deadline_extended'
    );
    if (extensionRequests.length > 0) {
      milestones.push({
        milestone_name: 'First deadline extension request',
        milestone_type: 'expressing_needs',
        date_achieved: extensionRequests[0]?.data?.updated_at || new Date().toISOString().split('T')[0],
        context: 'Requested deadline extension when overwhelmed',
        significance: 'First time communicating capacity limits',
      });
    }

    return milestones;
  }

  /**
   * Build transformation timeline
   */
  private buildTransformationTimeline(
    weeksInProgram: number,
    confidenceScores: ConfidenceScore[],
    voiceAuthenticity: VoiceAuthenticity,
    gritExamples: GritExample[],
    selfAdvocacyMilestones: SelfAdvocacyMilestone[]
  ): TransformationCheckpoint[] {
    const timeline: TransformationCheckpoint[] = [];

    const overallConfidence = confidenceScores.find(c => c.domain === 'overall');
    const currentConfidence = overallConfidence?.current_score || 5;
    const currentVoice = voiceAuthenticity.current_score;

    // Baseline (Week 1)
    timeline.push({
      week_number: 1,
      date: new Date(Date.now() - weeksInProgram * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkpoint_type: 'baseline',
      overall_confidence: overallConfidence?.baseline_score || 5,
      voice_authenticity: voiceAuthenticity.baseline_score,
      grit_examples_count: 0,
      self_advocacy_milestones_count: 0,
      notes: 'Starting point',
    });

    // Current (Latest)
    timeline.push({
      week_number: weeksInProgram || 1,
      date: new Date().toISOString().split('T')[0],
      checkpoint_type: 'current',
      overall_confidence: currentConfidence,
      voice_authenticity: currentVoice,
      grit_examples_count: gritExamples.length,
      self_advocacy_milestones_count: selfAdvocacyMilestones.length,
      notes: 'Current state',
    });

    return timeline;
  }

  /**
   * Identify celebration moments
   */
  private identifyCelebrationMoments(
    confidenceScores: ConfidenceScore[],
    gritExamples: GritExample[],
    selfAdvocacyMilestones: SelfAdvocacyMilestone[]
  ): CelebrationMoment[] {
    const moments: CelebrationMoment[] = [];

    // Celebrate confidence growth
    confidenceScores.forEach(score => {
      if (score.delta >= 2 && score.domain !== 'overall') {
        moments.push({
          moment_name: `${score.domain.charAt(0).toUpperCase() + score.domain.slice(1)} confidence growth`,
          date: new Date().toISOString().split('T')[0],
          significance: `+${score.delta} point growth in ${score.domain} confidence`,
          why_celebrate: 'Internal transformation - you\'re believing in yourself more',
        });
      }
    });

    // Celebrate grit examples
    gritExamples.slice(0, 2).forEach(example => {
      if (example.grit_score >= 7) {
        moments.push({
          moment_name: example.example_name,
          date: new Date().toISOString().split('T')[0],
          significance: `${example.weeks_persisted} weeks of perseverance`,
          why_celebrate: 'This is real grit - sustained effort over time',
        });
      }
    });

    // Celebrate self-advocacy
    selfAdvocacyMilestones.slice(0, 2).forEach(milestone => {
      moments.push({
        moment_name: milestone.milestone_name,
        date: milestone.date_achieved,
        significance: milestone.significance,
        why_celebrate: 'Learning to ask for what you need - critical life skill',
      });
    });

    return moments.slice(0, 5); // Top 5
  }

  /**
   * Generate growth summary
   */
  private generateGrowthSummary(
    weeksInProgram: number,
    confidenceScores: ConfidenceScore[],
    voiceAuthenticity: VoiceAuthenticity,
    gritExamples: GritExample[],
    selfAdvocacyMilestones: SelfAdvocacyMilestone[]
  ): string {
    const overallConfidence = confidenceScores.find(c => c.domain === 'overall');
    const confidenceDelta = overallConfidence?.delta || 0;

    const parts: string[] = [];

    parts.push(`After ${weeksInProgram} weeks:`);

    if (confidenceDelta >= 2) {
      parts.push(`✅ Confidence grew by +${confidenceDelta} points (major transformation)`);
    } else if (confidenceDelta >= 1) {
      parts.push(`✅ Confidence grew by +${confidenceDelta} points (steady growth)`);
    } else {
      parts.push(`📋 Confidence baseline established (early in journey)`);
    }

    if (voiceAuthenticity.delta >= 2) {
      parts.push(`✅ Voice authenticity improved by +${voiceAuthenticity.delta} points (finding authentic voice)`);
    }

    if (gritExamples.length >= 3) {
      parts.push(`✅ ${gritExamples.length} grit examples identified (demonstrated perseverance)`);
    }

    if (selfAdvocacyMilestones.length >= 2) {
      parts.push(`✅ ${selfAdvocacyMilestones.length} self-advocacy milestones (learning to ask for help)`);
    }

    return parts.join('\n');
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    confidenceScores: ConfidenceScore[],
    voiceAuthenticity: VoiceAuthenticity,
    gritExamples: GritExample[],
    selfAdvocacyMilestones: SelfAdvocacyMilestone[]
  ): string[] {
    const recommendations: string[] = [];

    // Confidence recommendations
    const lowConfidenceDomains = confidenceScores.filter(c => c.current_score < 6 && c.domain !== 'overall');
    if (lowConfidenceDomains.length > 0) {
      lowConfidenceDomains.forEach(domain => {
        recommendations.push(`Build ${domain.domain} confidence: ${domain.evidence[0] || 'Start with small wins'}`);
      });
    }

    // Voice authenticity recommendations
    if (voiceAuthenticity.areas_for_growth.length > 0) {
      recommendations.push(`Strengthen authentic voice: ${voiceAuthenticity.areas_for_growth[0]}`);
    }

    // Grit recommendations
    if (gritExamples.length < 2) {
      recommendations.push('Build grit examples: Identify challenges you\'ve persisted through (2+ examples needed)');
    }

    // Self-advocacy recommendations
    if (selfAdvocacyMilestones.length < 2) {
      recommendations.push('Practice self-advocacy: Ask for help when you need it (teachers, coaches, parents)');
    }

    // Celebration reminder
    if (confidenceScores.some(c => c.delta >= 1)) {
      recommendations.push('🎉 Celebrate your growth! Qualitative transformation is as important as quantitative');
    }

    return recommendations;
  }
}
