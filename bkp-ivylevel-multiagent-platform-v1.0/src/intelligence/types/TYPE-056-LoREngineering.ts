/**
 * TYPE-056: LoR (Letter of Recommendation) Engineering Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: 4-Touch Recommendation Letter Sequencing
 *
 * Purpose: Cultivate strong letters of recommendation through strategic relationship building.
 * Prevents last-minute "who can write me a rec letter?" panic senior year.
 *
 * Algorithm: 4-Touch Sequence (Minimum 8 Weeks from Touch 1 to Touch 4)
 *
 * Touch 1: VISIBILITY (Weeks 1-2)
 *   - Show up consistently (office hours, class participation)
 *   - Contribute meaningfully (ask smart questions, help peers)
 *   - Goal: Teacher knows your name and work quality
 *
 * Touch 2: GRATITUDE (Weeks 3-4)
 *   - Thank teacher for specific guidance
 *   - Share impact ("Your feedback on X helped me Y")
 *   - Goal: Build genuine relationship, not transactional
 *
 * Touch 3: ARTIFACT (Weeks 5-6)
 *   - Share project/paper/work product
 *   - Ask for feedback (not for grade, for improvement)
 *   - Goal: Teacher sees depth of your work beyond class
 *
 * Touch 4: FORMAL ASK (Week 8+)
 *   - Request LoR with context packet
 *   - Context packet: Resume, transcript, why this teacher, key stories
 *   - Goal: Teacher has everything needed to write strong letter
 *
 * Minimum Timeline: 8 weeks from Touch 1 to Touch 4
 * Recommended: 12+ weeks for optimal relationship building
 *
 * Target Identification:
 * - Core academic teachers (English, Math, Science, History)
 * - Teacher who taught you 11th or 12th grade (recent is better)
 * - Teacher who knows your intellectual curiosity and growth
 * - Avoid: PE teachers, elective teachers (unless directly related to intended major)
 *
 * Data Sources:
 * - W000-STRATEGY-008 (LoR cultivation patterns from coaching)
 * - Student transcript (courses, teachers, grades)
 * - Activity facts (projects shared with teachers)
 * - Timeline: Current date → Application deadlines
 *
 * Output: LoREngineeringResult
 * - lor_targets: List of recommended teachers
 * - touch_sequences: Timeline for each target (4 touches)
 * - artifact_readiness: Projects ready to share (Touch 3)
 * - context_packet_status: What's ready for formal ask
 * - recommendations: Next actions for LoR cultivation
 *
 * Created: 2025-10-29
 * Version: v20.3
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Touch types in LoR sequence
 */
type TouchType = 'visibility' | 'gratitude' | 'artifact' | 'formal_ask';

/**
 * LoR target (teacher/recommender)
 */
interface LoRTarget {
  teacher_name: string;
  subject: string;
  grade_level: string; // '11th' | '12th' preferred
  relationship_strength: 'weak' | 'moderate' | 'strong';
  suitability_score: number; // 0-100
  why_recommended: string;
}

/**
 * Touch in the 4-touch sequence
 */
interface Touch {
  touch_number: 1 | 2 | 3 | 4;
  touch_type: TouchType;
  status: 'not_started' | 'in_progress' | 'completed';
  target_week: number; // Week number in sequence
  completion_date: string | null;
  action_items: string[];
  proof_required: string | null; // What artifact/proof needed
}

/**
 * Touch sequence for one LoR target
 */
interface TouchSequence {
  target_teacher: string;
  sequence_start_date: string;
  sequence_status: 'not_started' | 'in_progress' | 'completed';
  touches: Touch[];
  weeks_elapsed: number;
  next_touch_due: string | null;
}

/**
 * Artifact readiness (for Touch 3)
 */
interface ArtifactReadiness {
  artifact_name: string;
  artifact_type: 'project' | 'paper' | 'presentation' | 'portfolio';
  subject_alignment: string; // Which subject this artifact fits
  readiness_status: 'ready' | 'in_progress' | 'not_started';
  quality_score: number; // 0-100
}

/**
 * Context packet status (for Touch 4)
 */
interface ContextPacketStatus {
  resume_ready: boolean;
  transcript_ready: boolean;
  why_this_teacher: string | null;
  key_stories: string[]; // 2-3 stories teacher can reference
  completeness_score: number; // 0-100
}

/**
 * LoR engineering result
 */
interface LoREngineeringResult {
  lor_targets: LoRTarget[];
  touch_sequences: TouchSequence[];
  artifact_readiness: ArtifactReadiness[];
  context_packet_status: ContextPacketStatus;
  application_deadline: string | null;
  weeks_until_deadline: number | null;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export class LoREngineering implements IntelligenceType {
  type_id = 'TYPE-056';
  name = 'LoR (Letter of Recommendation) Engineering';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.3';

  /**
   * Process LoR engineering analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract facts
    const transcriptFacts = facts.facts.filter(f => f.category === 'ACADEMIC_PROFILE');
    const activityFacts = facts.facts.filter(f => f.category === 'ACTIVITIES');
    const timelineFacts = facts.facts.filter(f => f.category === 'TIMELINE');

    // Identify LoR targets (teachers)
    const lorTargets = this.identifyLoRTargets(transcriptFacts);

    // Generate touch sequences for each target
    const touchSequences = this.generateTouchSequences(lorTargets);

    // Assess artifact readiness (for Touch 3)
    const artifactReadiness = this.assessArtifactReadiness(activityFacts);

    // Check context packet status (for Touch 4)
    const contextPacketStatus = this.checkContextPacketStatus(facts);

    // Determine application deadline and urgency
    const deadline = this.getApplicationDeadline(timelineFacts);
    const weeksUntilDeadline = deadline
      ? Math.floor((new Date(deadline).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
      : null;
    const urgencyLevel = this.determineUrgencyLevel(weeksUntilDeadline, touchSequences);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      lorTargets,
      touchSequences,
      artifactReadiness,
      contextPacketStatus,
      weeksUntilDeadline
    );

    const result: LoREngineeringResult = {
      lor_targets: lorTargets,
      touch_sequences: touchSequences,
      artifact_readiness: artifactReadiness,
      context_packet_status: contextPacketStatus,
      application_deadline: deadline,
      weeks_until_deadline: weeksUntilDeadline,
      urgency_level: urgencyLevel,
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
   * Identify LoR targets (teachers who could write strong letters)
   */
  private identifyLoRTargets(transcriptFacts: any[]): LoRTarget[] {
    const targets: LoRTarget[] = [];

    // Extract courses from transcript
    const courses = transcriptFacts
      .filter(f => f.data?.courses || f.data?.course_name)
      .map(f => f.data);

    // Priority subjects for LoRs
    const prioritySubjects = ['English', 'Math', 'Science', 'History', 'Computer Science', 'Foreign Language'];

    courses.forEach(course => {
      const courseName = course.course_name || '';
      const teacher = course.teacher_name || 'Unknown Teacher';
      const grade = course.grade_level || course.grade || '11th';
      const gradeReceived = course.grade_received || 'A';

      // Determine subject
      let subject = 'Other';
      for (const prioritySubj of prioritySubjects) {
        if (courseName.toLowerCase().includes(prioritySubj.toLowerCase())) {
          subject = prioritySubj;
          break;
        }
      }

      // Calculate suitability score
      let suitabilityScore = 50; // Base score

      // Bonus: Core academic subject
      if (prioritySubjects.includes(subject)) {
        suitabilityScore += 20;
      }

      // Bonus: 11th or 12th grade (recent is better)
      if (grade === '12th' || grade === '12') {
        suitabilityScore += 15;
      } else if (grade === '11th' || grade === '11') {
        suitabilityScore += 10;
      }

      // Bonus: Good grade (A or B)
      if (gradeReceived === 'A' || gradeReceived === 'A+' || gradeReceived === 'A-') {
        suitabilityScore += 15;
      } else if (gradeReceived === 'B' || gradeReceived === 'B+') {
        suitabilityScore += 10;
      }

      // Determine relationship strength (heuristic based on course type)
      let relationshipStrength: 'weak' | 'moderate' | 'strong' = 'moderate';
      if (courseName.includes('AP') || courseName.includes('Honors')) {
        relationshipStrength = 'strong'; // AP/Honors = deeper engagement
      }

      // Why recommended
      const whyRecommended = `${subject} teacher (${grade}) - ${relationshipStrength} relationship, ${gradeReceived} performance`;

      targets.push({
        teacher_name: teacher,
        subject: subject,
        grade_level: grade,
        relationship_strength: relationshipStrength,
        suitability_score: Math.min(100, suitabilityScore),
        why_recommended: whyRecommended,
      });
    });

    // Sort by suitability score (highest first) and return top 5
    return targets
      .sort((a, b) => b.suitability_score - a.suitability_score)
      .slice(0, 5);
  }

  /**
   * Generate 4-touch sequences for each target
   */
  private generateTouchSequences(targets: LoRTarget[]): TouchSequence[] {
    const sequences: TouchSequence[] = [];

    // Focus on top 2-3 targets
    const topTargets = targets.slice(0, 3);

    topTargets.forEach(target => {
      const startDate = new Date();
      const touches: Touch[] = [
        {
          touch_number: 1,
          touch_type: 'visibility',
          status: 'not_started',
          target_week: 1,
          completion_date: null,
          action_items: [
            'Attend office hours (2x this week)',
            'Ask 1 smart question in class',
            'Participate actively in discussions',
          ],
          proof_required: null,
        },
        {
          touch_number: 2,
          touch_type: 'gratitude',
          status: 'not_started',
          target_week: 3,
          completion_date: null,
          action_items: [
            `Email ${target.teacher_name} thanking for specific feedback`,
            'Share impact: "Your guidance on X helped me Y"',
            'Keep it genuine (not transactional)',
          ],
          proof_required: 'Email sent',
        },
        {
          touch_number: 3,
          touch_type: 'artifact',
          status: 'not_started',
          target_week: 5,
          completion_date: null,
          action_items: [
            'Share project/paper related to class',
            'Ask for feedback (not for grade)',
            'Demonstrate depth of work beyond class requirements',
          ],
          proof_required: 'Artifact shared + feedback received',
        },
        {
          touch_number: 4,
          touch_type: 'formal_ask',
          status: 'not_started',
          target_week: 8,
          completion_date: null,
          action_items: [
            'Request LoR with context packet',
            'Provide: Resume, transcript, why this teacher, 2-3 key stories',
            'Give 4+ weeks notice before deadline',
          ],
          proof_required: 'Context packet delivered + teacher confirmed',
        },
      ];

      sequences.push({
        target_teacher: target.teacher_name,
        sequence_start_date: startDate.toISOString().split('T')[0],
        sequence_status: 'not_started',
        touches: touches,
        weeks_elapsed: 0,
        next_touch_due: this.calculateNextTouchDate(startDate, 1),
      });
    });

    return sequences;
  }

  /**
   * Calculate next touch due date
   */
  private calculateNextTouchDate(startDate: Date, targetWeek: number): string {
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + (targetWeek * 7));
    return nextDate.toISOString().split('T')[0];
  }

  /**
   * Assess artifact readiness (for Touch 3)
   */
  private assessArtifactReadiness(activityFacts: any[]): ArtifactReadiness[] {
    const artifacts: ArtifactReadiness[] = [];

    activityFacts.forEach(fact => {
      const activity = fact.data;
      if (!activity) return;

      // Identify projects that could be shared
      if (activity.activity_type === 'project' || activity.item_type === 'Project') {
        const artifactName = activity.name || activity.title || 'Unnamed Project';
        const artifactType = 'project';
        const subjectAlignment = this.inferSubjectAlignment(artifactName, activity.description);

        // Assess readiness (heuristic based on completion)
        let readinessStatus: 'ready' | 'in_progress' | 'not_started' = 'in_progress';
        let qualityScore = 60;

        if (activity.status === 'completed') {
          readinessStatus = 'ready';
          qualityScore = 80;
        } else if (activity.status === 'in_progress') {
          readinessStatus = 'in_progress';
          qualityScore = 50;
        }

        artifacts.push({
          artifact_name: artifactName,
          artifact_type: artifactType,
          subject_alignment: subjectAlignment,
          readiness_status: readinessStatus,
          quality_score: qualityScore,
        });
      }
    });

    return artifacts;
  }

  /**
   * Infer subject alignment for artifact
   */
  private inferSubjectAlignment(name: string, description: string): string {
    const text = (name + ' ' + (description || '')).toLowerCase();

    if (text.includes('code') || text.includes('app') || text.includes('website')) {
      return 'Computer Science';
    }
    if (text.includes('research') || text.includes('experiment') || text.includes('science')) {
      return 'Science';
    }
    if (text.includes('essay') || text.includes('write') || text.includes('story')) {
      return 'English';
    }
    if (text.includes('math') || text.includes('calculus') || text.includes('statistics')) {
      return 'Math';
    }
    if (text.includes('history') || text.includes('government') || text.includes('politics')) {
      return 'History';
    }

    return 'General';
  }

  /**
   * Check context packet status (for Touch 4)
   */
  private checkContextPacketStatus(facts: FactSet): ContextPacketStatus {
    // Check if resume exists
    const resumeFacts = facts.facts.filter(f =>
      f.category === 'DOCUMENTS' && f.data?.document_type === 'resume'
    );
    const resumeReady = resumeFacts.length > 0;

    // Check if transcript exists
    const transcriptFacts = facts.facts.filter(f => f.category === 'ACADEMIC_PROFILE');
    const transcriptReady = transcriptFacts.length > 0;

    // Why this teacher (needs to be crafted per teacher)
    const whyThisTeacher = null; // Will be filled during Touch 4

    // Key stories (extract from activities)
    const keyStories: string[] = [];
    const activityFacts = facts.facts.filter(f => f.category === 'ACTIVITIES');
    activityFacts.slice(0, 3).forEach(fact => {
      if (fact.data?.name) {
        keyStories.push(fact.data.name);
      }
    });

    // Calculate completeness
    let completeness = 0;
    if (resumeReady) completeness += 25;
    if (transcriptReady) completeness += 25;
    if (whyThisTeacher) completeness += 25;
    if (keyStories.length >= 2) completeness += 25;

    return {
      resume_ready: resumeReady,
      transcript_ready: transcriptReady,
      why_this_teacher: whyThisTeacher,
      key_stories: keyStories,
      completeness_score: completeness,
    };
  }

  /**
   * Get application deadline
   */
  private getApplicationDeadline(timelineFacts: any[]): string | null {
    // Look for college application deadline
    const deadlineFacts = timelineFacts.filter(f =>
      f.data?.event_type === 'deadline' || f.data?.milestone_type === 'deadline'
    );

    if (deadlineFacts.length > 0) {
      // Return earliest deadline
      const deadlines = deadlineFacts
        .map(f => f.data?.deadline_date || f.data?.date)
        .filter(Boolean)
        .sort();
      return deadlines[0] || null;
    }

    // Default: November 1 (Early Action) if senior year
    return null;
  }

  /**
   * Determine urgency level
   */
  private determineUrgencyLevel(
    weeksUntilDeadline: number | null,
    sequences: TouchSequence[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!weeksUntilDeadline) return 'low';

    // Check if any sequence started
    const anyStarted = sequences.some(s => s.sequence_status !== 'not_started');

    if (weeksUntilDeadline < 8 && !anyStarted) {
      return 'critical'; // Less than 8 weeks and haven't started!
    } else if (weeksUntilDeadline < 12) {
      return 'high';
    } else if (weeksUntilDeadline < 20) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    targets: LoRTarget[],
    sequences: TouchSequence[],
    artifacts: ArtifactReadiness[],
    contextPacket: ContextPacketStatus,
    weeksUntilDeadline: number | null
  ): string[] {
    const recommendations: string[] = [];

    // Critical urgency
    if (weeksUntilDeadline && weeksUntilDeadline < 8) {
      recommendations.push('🚨 CRITICAL: Less than 8 weeks to deadline - Start LoR cultivation NOW');
      recommendations.push('Action: Begin Touch 1 (Visibility) with top 2 teachers THIS WEEK');
      return recommendations;
    }

    // No targets identified
    if (targets.length === 0) {
      recommendations.push('⚠️ No LoR targets identified - Review transcript for core academic teachers');
      return recommendations;
    }

    // High priority: Start sequences
    if (sequences.every(s => s.sequence_status === 'not_started')) {
      recommendations.push(`🎯 Priority: Start LoR cultivation with ${targets[0].teacher_name} (${targets[0].subject})`);
      recommendations.push('This week: Touch 1 (Visibility) - Attend office hours 2x + ask smart questions');
    }

    // Check artifact readiness
    const readyArtifacts = artifacts.filter(a => a.readiness_status === 'ready');
    if (readyArtifacts.length === 0) {
      recommendations.push('📋 Prepare artifacts for Touch 3 - Complete 1-2 projects to strong quality');
    } else {
      recommendations.push(`✅ Artifacts ready for Touch 3: ${readyArtifacts.map(a => a.artifact_name).join(', ')}`);
    }

    // Check context packet
    if (contextPacket.completeness_score < 75) {
      if (!contextPacket.resume_ready) {
        recommendations.push('📄 Create resume for context packet (needed for Touch 4)');
      }
      if (contextPacket.key_stories.length < 2) {
        recommendations.push('📝 Identify 2-3 key stories teachers can reference in letters');
      }
    }

    // Timeline guidance
    if (weeksUntilDeadline && weeksUntilDeadline >= 12) {
      recommendations.push(`✅ Good timeline: ${weeksUntilDeadline} weeks until deadline - Plenty of time for 8-week sequence`);
      recommendations.push('Pace: 1 touch every 2 weeks + follow-up consistently');
    }

    return recommendations;
  }
}
