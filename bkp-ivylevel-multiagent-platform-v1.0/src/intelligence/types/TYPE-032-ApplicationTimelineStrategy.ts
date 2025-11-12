/**
 * TYPE-032: Application Timeline Strategy
 * Category: DOMAIN_SPECIFIC (ScholarshipsAgent only)
 *
 * Purpose: Strategic scholarship application timeline planning to maximize success
 * while minimizing overwhelm through deadline clustering and application batching.
 *
 * Formula:
 * Batch Size = 2-3 scholarships per 2-week window
 * Priority Rule: Earlier deadlines get higher priority IF award amount >$5K
 *
 * Strategy:
 * 1. Group scholarships into 2-week deadline windows
 * 2. Prioritize by: Deadline proximity × Award amount × Win odds
 * 3. Batch applications to maintain sustainable pace (max 3 per window)
 * 4. Front-load high-value, high-odds scholarships
 * 5. Leave buffer time before college application deadlines
 *
 * Source: TYPE-029 (Program Application Strategy) pattern + scholarship-specific timing
 * Pattern: Deadline batching to prevent student overwhelm + strategic sequencing
 *
 * Created: 2025-10-29 (v21.0 ScholarshipsAgent Foundation)
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

interface ScholarshipDeadline {
  scholarship_id: string;
  scholarship_name: string;
  deadline: Date;
  award_amount: number;
  win_probability: number;
  estimated_effort_hours: number;
  essay_required: boolean;
  priority_score: number; // Deadline proximity × Award amount × Win odds
}

interface DeadlineWindow {
  window_id: string;
  window_start: Date;
  window_end: Date;
  scholarships: ScholarshipDeadline[];
  total_award_potential: number;
  total_effort_hours: number;
  recommended_batch: ScholarshipDeadline[]; // Max 3 scholarships
  urgency_level: 'critical' | 'high' | 'moderate' | 'low';
}

interface ApplicationTimelineResult {
  deadline_windows: DeadlineWindow[];
  recommended_sequence: ScholarshipDeadline[]; // Ordered by strategic priority
  current_window: DeadlineWindow | null;
  next_window: DeadlineWindow | null;
  buffer_alerts: string[]; // Warnings about college app deadline conflicts
  pacing_recommendations: string[];
  total_applications_planned: number;
  total_estimated_hours: number;
}

export class ApplicationTimelineStrategy implements IntelligenceType {
  type_id = 'TYPE-032';
  name = 'Application Timeline Strategy';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query to generate strategic application timeline
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const profileFacts = facts.get(FactCategory.STUDENT_PROFILE) || [];
    const activityFacts = facts.get(FactCategory.ACTIVITY_DATA) || [];

    // Get scholarship opportunities with scores (from TYPE-031 or database)
    const scholarshipsWithScores = this.getScholarshipScores(activityFacts);

    // Group scholarships into 2-week deadline windows
    const deadlineWindows = this.createDeadlineWindows(scholarshipsWithScores);

    // Generate recommended application sequence
    const recommendedSequence = this.generateApplicationSequence(deadlineWindows);

    // Identify current and next windows
    const now = new Date();
    const currentWindow = deadlineWindows.find(
      (w) => w.window_start <= now && w.window_end >= now
    ) || null;
    const nextWindow = deadlineWindows.find((w) => w.window_start > now) || null;

    // Check for buffer conflicts with college application deadlines
    const bufferAlerts = this.checkCollegeAppBuffers(deadlineWindows, profileFacts);

    // Generate pacing recommendations
    const pacingRecommendations = this.generatePacingRecommendations(
      deadlineWindows,
      currentWindow,
      nextWindow
    );

    // Calculate totals
    const totalApplications = recommendedSequence.length;
    const totalHours = recommendedSequence.reduce((sum, s) => sum + s.estimated_effort_hours, 0);

    const result: ApplicationTimelineResult = {
      deadline_windows: deadlineWindows,
      recommended_sequence: recommendedSequence,
      current_window: currentWindow,
      next_window: nextWindow,
      buffer_alerts: bufferAlerts,
      pacing_recommendations: pacingRecommendations,
      total_applications_planned: totalApplications,
      total_estimated_hours: totalHours,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: 0.85,
      data: result,
    };
  }

  /**
   * Get scholarship scores (mock data - in production, call TYPE-031 or query database)
   */
  private getScholarshipScores(activityFacts: any[]): ScholarshipDeadline[] {
    const now = new Date();

    return [
      {
        scholarship_id: 'ncwit-aspirations-2025',
        scholarship_name: 'NCWIT Aspirations in Computing',
        deadline: new Date('2025-02-15'),
        award_amount: 10000,
        win_probability: 0.7,
        estimated_effort_hours: 8,
        essay_required: true,
        priority_score: 0, // Will be calculated
      },
      {
        scholarship_id: 'coca-cola-scholars-2025',
        scholarship_name: 'Coca-Cola Scholars Program',
        deadline: new Date('2024-10-31'),
        award_amount: 20000,
        win_probability: 0.15,
        estimated_effort_hours: 10,
        essay_required: true,
        priority_score: 0,
      },
      {
        scholarship_id: 'gates-scholarship-2025',
        scholarship_name: 'Gates Scholarship',
        deadline: new Date('2024-09-15'),
        award_amount: 100000,
        win_probability: 0.1,
        estimated_effort_hours: 15,
        essay_required: true,
        priority_score: 0,
      },
      {
        scholarship_id: 'dell-scholars-2025',
        scholarship_name: 'Dell Scholars Program',
        deadline: new Date('2024-12-01'),
        award_amount: 20000,
        win_probability: 0.5,
        estimated_effort_hours: 8,
        essay_required: true,
        priority_score: 0,
      },
      {
        scholarship_id: 'jack-kent-cooke-2025',
        scholarship_name: 'Jack Kent Cooke College Scholarship',
        deadline: new Date('2024-11-14'),
        award_amount: 40000,
        win_probability: 0.3,
        estimated_effort_hours: 12,
        essay_required: true,
        priority_score: 0,
      },
      {
        scholarship_id: 'horatio-alger-2025',
        scholarship_name: 'Horatio Alger Scholarship',
        deadline: new Date('2024-10-25'),
        award_amount: 25000,
        win_probability: 0.4,
        estimated_effort_hours: 6,
        essay_required: true,
        priority_score: 0,
      },
    ].map((s) => ({
      ...s,
      priority_score: this.calculatePriorityScore(s, now),
    }));
  }

  /**
   * Calculate priority score: Deadline proximity × Award amount × Win odds
   */
  private calculatePriorityScore(scholarship: ScholarshipDeadline, now: Date): number {
    const daysUntilDeadline = Math.ceil(
      (scholarship.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Deadline proximity score (0-10, higher = more urgent)
    let proximityScore = 10;
    if (daysUntilDeadline > 180) proximityScore = 2;
    else if (daysUntilDeadline > 120) proximityScore = 4;
    else if (daysUntilDeadline > 60) proximityScore = 6;
    else if (daysUntilDeadline > 30) proximityScore = 8;
    else if (daysUntilDeadline > 14) proximityScore = 9;
    // else 10 (within 2 weeks)

    // Award amount score (0-10)
    let amountScore = 1;
    if (scholarship.award_amount >= 50000) amountScore = 10;
    else if (scholarship.award_amount >= 25000) amountScore = 8;
    else if (scholarship.award_amount >= 10000) amountScore = 6;
    else if (scholarship.award_amount >= 5000) amountScore = 4;
    else if (scholarship.award_amount >= 1000) amountScore = 2;

    // Win probability score (0-10)
    const winScore = scholarship.win_probability * 10;

    // Weighted priority: Proximity × 2 + Amount × 2 + Win Odds × 1
    return proximityScore * 2 + amountScore * 2 + winScore * 1;
  }

  /**
   * Create 2-week deadline windows
   */
  private createDeadlineWindows(scholarships: ScholarshipDeadline[]): DeadlineWindow[] {
    // Sort scholarships by deadline
    const sortedScholarships = [...scholarships].sort(
      (a, b) => a.deadline.getTime() - b.deadline.getTime()
    );

    const windows: DeadlineWindow[] = [];
    let windowId = 1;

    for (let i = 0; i < sortedScholarships.length; i++) {
      const scholarship = sortedScholarships[i];
      const windowStart = new Date(scholarship.deadline);
      windowStart.setDate(windowStart.getDate() - 14); // 2 weeks before deadline

      const windowEnd = scholarship.deadline;

      // Check if this scholarship fits into an existing window
      let existingWindow = windows.find(
        (w) =>
          scholarship.deadline >= w.window_start && scholarship.deadline <= w.window_end
      );

      if (!existingWindow) {
        // Create new window
        existingWindow = {
          window_id: `window-${windowId++}`,
          window_start: windowStart,
          window_end: windowEnd,
          scholarships: [],
          total_award_potential: 0,
          total_effort_hours: 0,
          recommended_batch: [],
          urgency_level: 'moderate',
        };
        windows.push(existingWindow);
      }

      // Add scholarship to window
      existingWindow.scholarships.push(scholarship);
      existingWindow.total_award_potential += scholarship.award_amount;
      existingWindow.total_effort_hours += scholarship.estimated_effort_hours;
    }

    // For each window, select recommended batch (max 3 scholarships)
    windows.forEach((window) => {
      const sortedByPriority = [...window.scholarships].sort(
        (a, b) => b.priority_score - a.priority_score
      );
      window.recommended_batch = sortedByPriority.slice(0, 3);

      // Determine urgency level
      const now = new Date();
      const daysUntilWindow = Math.ceil(
        (window.window_start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilWindow <= 7) window.urgency_level = 'critical';
      else if (daysUntilWindow <= 14) window.urgency_level = 'high';
      else if (daysUntilWindow <= 30) window.urgency_level = 'moderate';
      else window.urgency_level = 'low';
    });

    return windows.sort((a, b) => a.window_start.getTime() - b.window_start.getTime());
  }

  /**
   * Generate recommended application sequence (ordered by strategic priority)
   */
  private generateApplicationSequence(
    windows: DeadlineWindow[]
  ): ScholarshipDeadline[] {
    const sequence: ScholarshipDeadline[] = [];

    // Strategy: Front-load high-value, high-odds scholarships
    // Then add earlier deadlines to avoid missing opportunities

    windows.forEach((window) => {
      window.recommended_batch.forEach((scholarship) => {
        sequence.push(scholarship);
      });
    });

    // Sort by priority score (descending)
    return sequence.sort((a, b) => b.priority_score - a.priority_score);
  }

  /**
   * Check for buffer conflicts with college application deadlines
   */
  private checkCollegeAppBuffers(
    windows: DeadlineWindow[],
    profileFacts: any[]
  ): string[] {
    const alerts: string[] = [];

    // TODO: Extract college application deadlines from profileFacts or database
    // For now, use standard deadlines

    const eaDeadline = new Date('2024-11-01'); // Early Action
    const rdDeadline = new Date('2025-01-01'); // Regular Decision
    const ucDeadline = new Date('2024-11-30'); // UC Applications

    // Check if any scholarship windows overlap with critical college app periods
    windows.forEach((window) => {
      // EA buffer: 2 weeks before EA deadline
      const eaBufferStart = new Date(eaDeadline);
      eaBufferStart.setDate(eaBufferStart.getDate() - 14);

      if (
        window.window_start <= eaDeadline &&
        window.window_end >= eaBufferStart &&
        window.recommended_batch.length > 0
      ) {
        alerts.push(
          `⚠️ Window "${window.window_id}" overlaps with Early Action deadline (Nov 1). Consider completing scholarships earlier or pushing to later window.`
        );
      }

      // UC buffer: 2 weeks before UC deadline
      const ucBufferStart = new Date(ucDeadline);
      ucBufferStart.setDate(ucBufferStart.getDate() - 14);

      if (
        window.window_start <= ucDeadline &&
        window.window_end >= ucBufferStart &&
        window.recommended_batch.length > 0
      ) {
        alerts.push(
          `⚠️ Window "${window.window_id}" overlaps with UC application deadline (Nov 30). Prioritize college apps over scholarships.`
        );
      }

      // RD buffer: 2 weeks before RD deadline
      const rdBufferStart = new Date(rdDeadline);
      rdBufferStart.setDate(rdBufferStart.getDate() - 14);

      if (
        window.window_start <= rdDeadline &&
        window.window_end >= rdBufferStart &&
        window.recommended_batch.length > 0
      ) {
        alerts.push(
          `⚠️ Window "${window.window_id}" overlaps with Regular Decision deadline (Jan 1). Focus on college apps first.`
        );
      }
    });

    return alerts;
  }

  /**
   * Generate pacing recommendations
   */
  private generatePacingRecommendations(
    windows: DeadlineWindow[],
    currentWindow: DeadlineWindow | null,
    nextWindow: DeadlineWindow | null
  ): string[] {
    const recommendations: string[] = [];

    // Current window recommendations
    if (currentWindow) {
      if (currentWindow.recommended_batch.length === 0) {
        recommendations.push('✅ No scholarships due in current window. Good time to work ahead.');
      } else if (currentWindow.recommended_batch.length <= 2) {
        recommendations.push(
          `Focus on ${currentWindow.recommended_batch.length} scholarship(s) this week: ${currentWindow.recommended_batch.map((s) => s.scholarship_name).join(', ')}`
        );
      } else {
        recommendations.push(
          `⚠️ ${currentWindow.recommended_batch.length} scholarships due soon. Prioritize top 2: ${currentWindow.recommended_batch.slice(0, 2).map((s) => s.scholarship_name).join(', ')}`
        );
      }
    }

    // Next window preview
    if (nextWindow) {
      recommendations.push(
        `Next window (${nextWindow.window_id}): ${nextWindow.recommended_batch.length} scholarship(s) - start drafting essays now`
      );
    }

    // Overall pacing check
    const totalApplications = windows.reduce((sum, w) => sum + w.recommended_batch.length, 0);

    if (totalApplications > 8) {
      recommendations.push(
        `⚠️ Total ${totalApplications} applications planned. This is ambitious - consider reducing to top 5-6 for quality.`
      );
    } else if (totalApplications < 3) {
      recommendations.push(
        `Consider adding 1-2 more safety scholarships (high win probability) to increase chances.`
      );
    } else {
      recommendations.push(
        `✅ ${totalApplications} applications is a sustainable pace. Aim for 2-3 submissions per week.`
      );
    }

    // Effort check
    const totalHours = windows.reduce((sum, w) => sum + w.total_effort_hours, 0);
    const weeksAvailable = windows.length * 2; // Assuming 2 weeks per window

    if (totalHours / weeksAvailable > 20) {
      recommendations.push(
        `⚠️ Estimated ${Math.round(totalHours / weeksAvailable)} hours/week required. This may conflict with schoolwork - reduce applications or start earlier.`
      );
    }

    return recommendations;
  }
}
