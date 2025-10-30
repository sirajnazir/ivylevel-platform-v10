/**
 * TYPE-051: Task Decomposition Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent only)
 *
 * Purpose: Breaks down outcomes into 3-level execution hierarchy for weekly sprints
 *
 * Algorithm:
 * Level 1: Outcome (P0/P1/P2/P3) - What needs to happen this week
 * Level 2: ExecutionItems (2-4 per outcome) - 5Ws breakdown (Who/What/When/Where/Why)
 * Level 3: Tasks (3-8 per item) - Micro-steps with deadlines and dependencies
 *
 * Framework:
 * - Outcome = High-level weekly goal with priority level
 * - ExecutionItem = Concrete deliverable with 5Ws
 * - Task = Actionable micro-step (15-90 minutes) with dependencies
 *
 * Data Source: 62 execution chips (W000-FRAMEWORK-001) + session transcripts
 * Pattern: Real Jenny coaching - breaks ambitious goals into bite-sized actions
 *
 * Created: 2025-10-29 (v20.1 ExecutionAgent Expansion)
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

/**
 * Priority levels for outcomes
 */
type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Outcome - Level 1 of hierarchy
 */
interface Outcome {
  outcome_id: string;
  outcome_text: string;
  priority: PriorityLevel;
  deadline: Date;
  outcome_category: 'admission' | 'awards' | 'press' | 'lor' | 'scholarships' | 'project' | 'portfolio';
  estimated_effort_hours: number;
}

/**
 * ExecutionItem - Level 2 of hierarchy
 * 5Ws: Who, What, When, Where, Why
 */
interface ExecutionItem {
  item_id: string;
  outcome_id: string;
  item_text: string;
  who: string;    // Who is responsible / Who to contact
  what: string;   // What needs to be delivered
  when: Date;     // When is the deadline
  where: string;  // Where does this happen (platform, location, etc)
  why: string;    // Why this matters (impact, dependency)
  estimated_effort_hours: number;
  dependencies: string[]; // Other item_ids that must complete first
}

/**
 * Task - Level 3 of hierarchy
 */
interface Task {
  task_id: string;
  execution_item_id: string;
  task_text: string;
  estimated_effort_minutes: number; // 15-90 minutes per task
  deadline: Date;
  dependencies: string[]; // Other task_ids that must complete first
  proof_required: string; // What evidence validates completion
  status: 'todo' | 'in_progress' | 'blocked' | 'completed';
}

/**
 * Full task decomposition result
 */
interface TaskDecompositionResult {
  outcomes: Outcome[];
  execution_items: ExecutionItem[];
  tasks: Task[];
  total_estimated_hours: number;
  capacity_warning: string | null; // Warning if total > 20 hours (realistic weekly capacity)
  dependency_graph: {
    execution_item_id: string;
    depends_on: string[];
    blocks: string[];
  }[];
  critical_path: string[]; // Ordered list of task_ids on critical path
  recommendations: string[];
}

export class TaskDecomposition implements IntelligenceType {
  type_id = 'TYPE-051';
  name = 'Task Decomposition Intelligence';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query to decompose outcomes into execution hierarchy
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const profileFacts = facts.get(FactCategory.STUDENT_PROFILE) || [];
    const activityFacts = facts.get(FactCategory.ACTIVITY_DATA) || [];

    // Get current outcomes from query or game plan
    const outcomes = this.extractOutcomes(query, profileFacts, activityFacts);

    // Decompose each outcome into execution items
    const executionItems: ExecutionItem[] = [];
    for (const outcome of outcomes) {
      const items = this.decomposeOutcomeToItems(outcome);
      executionItems.push(...items);
    }

    // Decompose each execution item into tasks
    const tasks: Task[] = [];
    for (const item of executionItems) {
      const itemTasks = this.decomposeItemToTasks(item);
      tasks.push(...itemTasks);
    }

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(executionItems);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(tasks, dependencyGraph);

    // Calculate total effort
    const totalHours = outcomes.reduce((sum, o) => sum + o.estimated_effort_hours, 0);

    // Check capacity
    const capacityWarning = this.checkCapacity(totalHours);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      outcomes,
      executionItems,
      tasks,
      totalHours
    );

    const result: TaskDecompositionResult = {
      outcomes,
      execution_items: executionItems,
      tasks,
      total_estimated_hours: totalHours,
      capacity_warning: capacityWarning,
      dependency_graph: dependencyGraph,
      critical_path: criticalPath,
      recommendations,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: 0.9,
      data: result,
    };
  }

  /**
   * Extract outcomes from query or game plan facts
   * In production, this would query database for active outcomes
   */
  private extractOutcomes(
    query: AgentQuery,
    profileFacts: any[],
    activityFacts: any[]
  ): Outcome[] {
    // TODO: Query database for active outcomes
    // For now, return sample outcomes based on query

    const lowerQuery = query.query.toLowerCase();

    // Sample outcomes for demonstration
    const outcomes: Outcome[] = [];

    if (lowerQuery.includes('week') || lowerQuery.includes('should i do')) {
      // Default P0 outcome for current week
      outcomes.push({
        outcome_id: 'outcome-001',
        outcome_text: 'Complete Congressional App Challenge submission with polished demo',
        priority: 'P0',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        outcome_category: 'awards',
        estimated_effort_hours: 12,
      });

      outcomes.push({
        outcome_id: 'outcome-002',
        outcome_text: 'Publish portfolio website v2 with 3 project case studies',
        priority: 'P1',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        outcome_category: 'portfolio',
        estimated_effort_hours: 8,
      });
    }

    return outcomes;
  }

  /**
   * Decompose outcome into 2-4 execution items (5Ws)
   */
  private decomposeOutcomeToItems(outcome: Outcome): ExecutionItem[] {
    const items: ExecutionItem[] = [];

    // Pattern: Break outcome into logical deliverables
    // For awards outcome: item = application components
    // For portfolio outcome: item = website sections

    if (outcome.outcome_category === 'awards') {
      // Congressional App Challenge example
      items.push({
        item_id: `${outcome.outcome_id}-item-001`,
        outcome_id: outcome.outcome_id,
        item_text: 'Record and edit 2-minute demo video',
        who: 'Student (with optional parent/friend as camera operator)',
        what: '2-minute demo video showing app features + impact story',
        when: new Date(outcome.deadline.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before deadline
        where: 'Record at home, edit in iMovie/Premiere',
        why: 'Demo video is required for Congressional App submission (40% of evaluation)',
        estimated_effort_hours: 4,
        dependencies: [],
      });

      items.push({
        item_id: `${outcome.outcome_id}-item-002`,
        outcome_id: outcome.outcome_id,
        item_text: 'Write 500-word technical description',
        who: 'Student',
        what: 'Technical write-up: tech stack, architecture, challenges solved',
        when: new Date(outcome.deadline.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before deadline
        where: 'Google Docs',
        why: 'Technical description shows coding depth and problem-solving',
        estimated_effort_hours: 3,
        dependencies: [`${outcome.outcome_id}-item-001`], // After demo video (reuse script)
      });

      items.push({
        item_id: `${outcome.outcome_id}-item-003`,
        outcome_id: outcome.outcome_id,
        item_text: 'Submit application via official portal',
        who: 'Student',
        what: 'Complete online submission form with all artifacts',
        when: new Date(outcome.deadline.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day before deadline
        where: 'Congressional App Challenge website',
        why: 'Official submission deadline - no extensions',
        estimated_effort_hours: 1,
        dependencies: [`${outcome.outcome_id}-item-001`, `${outcome.outcome_id}-item-002`],
      });
    } else if (outcome.outcome_category === 'portfolio') {
      // Portfolio website example
      items.push({
        item_id: `${outcome.outcome_id}-item-001`,
        outcome_id: outcome.outcome_id,
        item_text: 'Write 3 project case studies',
        who: 'Student',
        what: '3 case studies (problem/solution/impact) for top projects',
        when: new Date(outcome.deadline.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days before deadline
        where: 'Google Docs (draft), then copy to website',
        why: 'Case studies show depth of thinking and impact measurement',
        estimated_effort_hours: 5,
        dependencies: [],
      });

      items.push({
        item_id: `${outcome.outcome_id}-item-002`,
        outcome_id: outcome.outcome_id,
        item_text: 'Design and code portfolio v2 layout',
        who: 'Student',
        what: 'Update website design with new layout + responsive mobile',
        when: new Date(outcome.deadline.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before deadline
        where: 'GitHub + Vercel/Netlify',
        why: 'Professional design signals seriousness and attention to detail',
        estimated_effort_hours: 6,
        dependencies: [`${outcome.outcome_id}-item-001`], // After case studies written
      });

      items.push({
        item_id: `${outcome.outcome_id}-item-003`,
        outcome_id: outcome.outcome_id,
        item_text: 'Deploy and share portfolio link',
        who: 'Student',
        what: 'Deploy to production + share on LinkedIn/Twitter',
        when: outcome.deadline,
        where: 'Vercel/Netlify + social media',
        why: 'Public launch creates momentum and feedback loop',
        estimated_effort_hours: 1,
        dependencies: [`${outcome.outcome_id}-item-002`],
      });
    }

    return items;
  }

  /**
   * Decompose execution item into 3-8 micro-tasks
   */
  private decomposeItemToTasks(item: ExecutionItem): Task[] {
    const tasks: Task[] = [];

    // Pattern: Break item into 15-90 minute micro-steps
    // Each task = one focused work session

    if (item.item_text.includes('demo video')) {
      // Demo video decomposition
      tasks.push({
        task_id: `${item.item_id}-task-001`,
        execution_item_id: item.item_id,
        task_text: 'Write demo script with 3 feature highlights',
        estimated_effort_minutes: 45,
        deadline: new Date(item.when.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before item deadline
        dependencies: [],
        proof_required: 'Google Doc with script (shared with coach)',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-002`,
        execution_item_id: item.item_id,
        task_text: 'Record 3-5 takes of demo walkthrough',
        estimated_effort_minutes: 60,
        deadline: new Date(item.when.getTime() - 1.5 * 24 * 60 * 60 * 1000),
        dependencies: [`${item.item_id}-task-001`],
        proof_required: 'Raw video files (MP4) uploaded to Google Drive',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-003`,
        execution_item_id: item.item_id,
        task_text: 'Edit video: add intro/outro, trim to 2 minutes',
        estimated_effort_minutes: 90,
        deadline: new Date(item.when.getTime() - 1 * 24 * 60 * 60 * 1000),
        dependencies: [`${item.item_id}-task-002`],
        proof_required: 'Final MP4 file (< 2:05 runtime)',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-004`,
        execution_item_id: item.item_id,
        task_text: 'Get feedback from 2 people (parent + friend)',
        estimated_effort_minutes: 30,
        deadline: new Date(item.when.getTime() - 0.5 * 24 * 60 * 60 * 1000),
        dependencies: [`${item.item_id}-task-003`],
        proof_required: 'Feedback notes (Google Doc)',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-005`,
        execution_item_id: item.item_id,
        task_text: 'Make final edits based on feedback',
        estimated_effort_minutes: 30,
        deadline: item.when,
        dependencies: [`${item.item_id}-task-004`],
        proof_required: 'Final demo video v2 (MP4)',
        status: 'todo',
      });
    } else if (item.item_text.includes('case studies')) {
      // Case studies decomposition
      tasks.push({
        task_id: `${item.item_id}-task-001`,
        execution_item_id: item.item_id,
        task_text: 'Select 3 projects to feature (strongest impact)',
        estimated_effort_minutes: 30,
        deadline: new Date(item.when.getTime() - 3 * 24 * 60 * 60 * 1000),
        dependencies: [],
        proof_required: 'List of 3 projects with selection rationale',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-002`,
        execution_item_id: item.item_id,
        task_text: 'Write case study 1: Problem/Solution/Impact',
        estimated_effort_minutes: 90,
        deadline: new Date(item.when.getTime() - 2.5 * 24 * 60 * 60 * 1000),
        dependencies: [`${item.item_id}-task-001`],
        proof_required: 'Google Doc with 300-word case study',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-003`,
        execution_item_id: item.item_id,
        task_text: 'Write case study 2: Problem/Solution/Impact',
        estimated_effort_minutes: 90,
        deadline: new Date(item.when.getTime() - 2 * 24 * 60 * 60 * 1000),
        dependencies: [`${item.item_id}-task-002`], // Sequential to reuse template
        proof_required: 'Google Doc with 300-word case study',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-004`,
        execution_item_id: item.item_id,
        task_text: 'Write case study 3: Problem/Solution/Impact',
        estimated_effort_minutes: 90,
        deadline: new Date(item.when.getTime() - 1.5 * 24 * 60 * 60 * 1000),
        dependencies: [`${item.item_id}-task-003`],
        proof_required: 'Google Doc with 300-word case study',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-005`,
        execution_item_id: item.item_id,
        task_text: 'Get coach feedback on all 3 case studies',
        estimated_effort_minutes: 45,
        deadline: new Date(item.when.getTime() - 1 * 24 * 60 * 60 * 1000),
        dependencies: [`${item.item_id}-task-004`],
        proof_required: 'Feedback notes from coach',
        status: 'todo',
      });

      tasks.push({
        task_id: `${item.item_id}-task-006`,
        execution_item_id: item.item_id,
        task_text: 'Revise all 3 case studies based on feedback',
        estimated_effort_minutes: 60,
        deadline: item.when,
        dependencies: [`${item.item_id}-task-005`],
        proof_required: 'Final case studies (Google Doc v2)',
        status: 'todo',
      });
    }

    return tasks;
  }

  /**
   * Build dependency graph for execution items
   */
  private buildDependencyGraph(
    items: ExecutionItem[]
  ): { execution_item_id: string; depends_on: string[]; blocks: string[] }[] {
    const graph = items.map((item) => {
      // Find items that depend on this item
      const blocks = items
        .filter((otherItem) => otherItem.dependencies.includes(item.item_id))
        .map((blockedItem) => blockedItem.item_id);

      return {
        execution_item_id: item.item_id,
        depends_on: item.dependencies,
        blocks,
      };
    });

    return graph;
  }

  /**
   * Calculate critical path through tasks
   * Critical path = longest dependency chain
   */
  private calculateCriticalPath(
    tasks: Task[],
    dependencyGraph: { execution_item_id: string; depends_on: string[]; blocks: string[] }[]
  ): string[] {
    // Simplified critical path calculation
    // In production, use proper topological sort with duration weighting

    // Find tasks with no dependencies (start nodes)
    const startTasks = tasks.filter((t) => t.dependencies.length === 0);

    if (startTasks.length === 0) {
      return [];
    }

    // Find longest path from any start task
    let longestPath: string[] = [];

    for (const startTask of startTasks) {
      const path = this.findLongestPathFrom(startTask.task_id, tasks);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }

    return longestPath;
  }

  /**
   * Find longest path from a starting task (recursive DFS)
   */
  private findLongestPathFrom(taskId: string, tasks: Task[]): string[] {
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task) return [];

    // Find tasks that depend on this task
    const dependentTasks = tasks.filter((t) => t.dependencies.includes(taskId));

    if (dependentTasks.length === 0) {
      return [taskId];
    }

    // Recursively find longest path from each dependent
    let longestSubPath: string[] = [];
    for (const depTask of dependentTasks) {
      const subPath = this.findLongestPathFrom(depTask.task_id, tasks);
      if (subPath.length > longestSubPath.length) {
        longestSubPath = subPath;
      }
    }

    return [taskId, ...longestSubPath];
  }

  /**
   * Check if total effort exceeds realistic weekly capacity
   */
  private checkCapacity(totalHours: number): string | null {
    // Jenny's coaching intelligence: 20 hours/week is realistic max for students
    // Beyond that = burnout risk

    if (totalHours > 25) {
      return `⚠️ CRITICAL: ${totalHours} hours planned exceeds realistic capacity by ${totalHours - 20} hours. High burnout risk. Recommend cutting P2/P3 outcomes or extending timeline.`;
    } else if (totalHours > 20) {
      return `⚠️ WARNING: ${totalHours} hours planned is ambitious (${totalHours - 20} hours over recommended max). Monitor stress levels and be ready to cut scope.`;
    } else if (totalHours < 8) {
      return `✅ Light week: ${totalHours} hours planned. Consider adding one P2 stretch goal if energy allows.`;
    }

    return null; // 8-20 hours = healthy range
  }

  /**
   * Generate strategic recommendations
   */
  private generateRecommendations(
    outcomes: Outcome[],
    items: ExecutionItem[],
    tasks: Task[],
    totalHours: number
  ): string[] {
    const recommendations: string[] = [];

    // Check P0 priority balance
    const p0Count = outcomes.filter((o) => o.priority === 'P0').length;
    if (p0Count > 2) {
      recommendations.push(
        `Consider demoting ${p0Count - 2} outcome(s) from P0 to P1. Multiple P0s increase stress and reduce focus.`
      );
    } else if (p0Count === 0) {
      recommendations.push(
        'No P0 outcomes this week. Ensure at least 1 P0 to maintain momentum.'
      );
    }

    // Check for parallel execution opportunities
    const independentItems = items.filter((item) => item.dependencies.length === 0);
    if (independentItems.length > 1) {
      recommendations.push(
        `${independentItems.length} execution items can be started in parallel. Consider tackling 2 simultaneously on different days.`
      );
    }

    // Check for long task chains
    const longestChain = Math.max(...items.map((item) => this.calculateChainLength(item, items)));
    if (longestChain > 4) {
      recommendations.push(
        `Longest dependency chain is ${longestChain} items. Consider breaking into 2 separate outcomes to reduce serial bottleneck.`
      );
    }

    // Check for proof-before-pitch pattern
    const proofTasks = tasks.filter((t) => t.proof_required.length > 0);
    if (proofTasks.length < tasks.length * 0.5) {
      recommendations.push(
        'Less than 50% of tasks have proof requirements. Add proof artifacts to validate completion.'
      );
    }

    return recommendations;
  }

  /**
   * Calculate length of dependency chain for an item
   */
  private calculateChainLength(item: ExecutionItem, allItems: ExecutionItem[]): number {
    if (item.dependencies.length === 0) {
      return 1;
    }

    // Recursive: max chain length of dependencies + 1
    const depLengths = item.dependencies.map((depId) => {
      const depItem = allItems.find((i) => i.item_id === depId);
      return depItem ? this.calculateChainLength(depItem, allItems) : 0;
    });

    return Math.max(...depLengths) + 1;
  }
}
