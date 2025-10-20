/**
 * Job Handlers for SchedulerService
 * Week 17 - Autonomous Weekly Check-ins
 *
 * Implements handlers for scheduled jobs:
 * - weekly_plan: Generate weekly execution plan
 * - deadline_reminder: Remind about approaching deadlines
 * - task_overdue_nudge: Nudge about overdue tasks
 * - no_activity_nudge: Nudge inactive students
 */

import { Pool } from 'pg';
import type { ScheduledJob, JobHandler } from './SchedulerService.js';
import { agentRegistry } from '../core/AgentRegistry.js';
import { SessionManager } from '../core/SessionManager.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const logger = createLogger('job-handlers');

/**
 * Weekly Plan Handler
 * Generates a proactive weekly execution plan for the student
 */
export const weeklyPlanHandler: JobHandler = async (job: ScheduledJob) => {
  try {
    logger.info({ job_id: job.job_id, student_id: job.student_id }, 'Executing weekly_plan job');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sessionManager = new SessionManager(pool);

    // Get WeeklyExecutionAgent
    const agent = agentRegistry.getAgent('weekly-execution-agent');
    if (!agent) {
      throw new Error('WeeklyExecutionAgent not found');
    }

    // Create autonomous session
    const session = await sessionManager.createSession({
      student_id: job.student_id,
      coach_id: job.coach_id,
      session_type: 'autonomous',
      metadata: {
        job_id: job.job_id,
        job_type: job.job_type,
        week_start_date: job.payload?.week_start_date,
      },
    });

    // Build context
    const context = await sessionManager.buildContext(session.session_id, pool);

    // Execute agent with weekly check-in message
    const response = await agent.execute({
      session,
      message: `Generate a weekly execution plan for this week. Show: 1) Last week's completion summary, 2) This week's priorities (pending jobs), 3) Upcoming deadlines, 4) Tactical recommendations.`,
      context,
      pool,
    });

    // Store the plan as a message in conversation history
    await pool.query(
      `INSERT INTO conversation_history (session_id, student_id, coach_id, role, content, created_at)
       VALUES ($1, $2, $3, 'assistant', $4, NOW())`,
      [session.session_id, job.student_id, job.coach_id, response.content]
    );

    await pool.end();

    logger.info({ job_id: job.job_id, student_id: job.student_id, session_id: session.session_id }, 'Weekly plan generated');

    return {
      success: true,
      result: {
        session_id: session.session_id,
        plan_length: response.content.length,
        tools_used: response.tool_calls?.length || 0,
      },
    };
  } catch (error: any) {
    logger.error({ job_id: job.job_id, error: error.message }, 'Weekly plan job failed');
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Deadline Reminder Handler
 * Sends reminder about approaching deadline
 */
export const deadlineReminderHandler: JobHandler = async (job: ScheduledJob) => {
  try {
    logger.info({ job_id: job.job_id, student_id: job.student_id }, 'Executing deadline_reminder job');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sessionManager = new SessionManager(pool);

    // Get GamePlanAgent (handles tasks and deadlines)
    const agent = agentRegistry.getAgent('gameplan-agent');
    if (!agent) {
      throw new Error('GamePlanAgent not found');
    }

    // Create autonomous session
    const session = await sessionManager.createSession({
      student_id: job.student_id,
      coach_id: job.coach_id,
      session_type: 'autonomous',
      metadata: {
        job_id: job.job_id,
        job_type: job.job_type,
        task_id: job.payload?.task_id,
      },
    });

    const context = await sessionManager.buildContext(session.session_id, pool);

    const { task_title, due_date, days_until_due } = job.payload;
    const message = `Reminder: "${task_title}" is due in ${days_until_due} day${days_until_due > 1 ? 's' : ''} (${due_date}). Please review and provide tactical guidance.`;

    const response = await agent.execute({
      session,
      message,
      context,
      pool,
    });

    // Store reminder in conversation history
    await pool.query(
      `INSERT INTO conversation_history (session_id, student_id, coach_id, role, content, created_at)
       VALUES ($1, $2, $3, 'assistant', $4, NOW())`,
      [session.session_id, job.student_id, job.coach_id, response.content]
    );

    await pool.end();

    logger.info({ job_id: job.job_id, student_id: job.student_id, task_id: job.payload?.task_id }, 'Deadline reminder sent');

    return {
      success: true,
      result: {
        session_id: session.session_id,
        task_id: job.payload?.task_id,
      },
    };
  } catch (error: any) {
    logger.error({ job_id: job.job_id, error: error.message }, 'Deadline reminder job failed');
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Task Overdue Nudge Handler
 * Nudges student about overdue tasks
 */
export const taskOverdueNudgeHandler: JobHandler = async (job: ScheduledJob) => {
  try {
    logger.info({ job_id: job.job_id, student_id: job.student_id }, 'Executing task_overdue_nudge job');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sessionManager = new SessionManager(pool);

    const agent = agentRegistry.getAgent('gameplan-agent');
    if (!agent) {
      throw new Error('GamePlanAgent not found');
    }

    const session = await sessionManager.createSession({
      student_id: job.student_id,
      coach_id: job.coach_id,
      session_type: 'autonomous',
      metadata: {
        job_id: job.job_id,
        job_type: job.job_type,
        task_id: job.payload?.task_id,
      },
    });

    const context = await sessionManager.buildContext(session.session_id, pool);

    const { task_title, due_date } = job.payload;
    const message = `Task "${task_title}" is now overdue (was due ${due_date}). Please provide encouragement and tactical next steps to get back on track.`;

    const response = await agent.execute({
      session,
      message,
      context,
      pool,
    });

    await pool.query(
      `INSERT INTO conversation_history (session_id, student_id, coach_id, role, content, created_at)
       VALUES ($1, $2, $3, 'assistant', $4, NOW())`,
      [session.session_id, job.student_id, job.coach_id, response.content]
    );

    await pool.end();

    logger.info({ job_id: job.job_id, student_id: job.student_id, task_id: job.payload?.task_id }, 'Overdue nudge sent');

    return {
      success: true,
      result: {
        session_id: session.session_id,
        task_id: job.payload?.task_id,
      },
    };
  } catch (error: any) {
    logger.error({ job_id: job.job_id, error: error.message }, 'Task overdue nudge job failed');
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * No Activity Nudge Handler
 * Nudges students who haven't engaged in 3+ days
 */
export const noActivityNudgeHandler: JobHandler = async (job: ScheduledJob) => {
  try {
    logger.info({ job_id: job.job_id, student_id: job.student_id }, 'Executing no_activity_nudge job');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sessionManager = new SessionManager(pool);

    const agent = agentRegistry.getAgent('gameplan-agent');
    if (!agent) {
      throw new Error('GamePlanAgent not found');
    }

    const session = await sessionManager.createSession({
      student_id: job.student_id,
      coach_id: job.coach_id,
      session_type: 'autonomous',
      metadata: {
        job_id: job.job_id,
        job_type: job.job_type,
        days_inactive: job.payload?.days_inactive,
      },
    });

    const context = await sessionManager.buildContext(session.session_id, pool);

    const { days_inactive } = job.payload;
    const message = `It's been ${days_inactive} days since we last connected. Let's check in on your progress and see if there's anything I can help with.`;

    const response = await agent.execute({
      session,
      message,
      context,
      pool,
    });

    await pool.query(
      `INSERT INTO conversation_history (session_id, student_id, coach_id, role, content, created_at)
       VALUES ($1, $2, $3, 'assistant', $4, NOW())`,
      [session.session_id, job.student_id, job.coach_id, response.content]
    );

    await pool.end();

    logger.info({ job_id: job.job_id, student_id: job.student_id, days_inactive }, 'No activity nudge sent');

    return {
      success: true,
      result: {
        session_id: session.session_id,
        days_inactive,
      },
    };
  } catch (error: any) {
    logger.error({ job_id: job.job_id, error: error.message }, 'No activity nudge job failed');
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Register all job handlers with the scheduler
 */
export function registerJobHandlers(scheduler: any): void {
  scheduler.registerJobHandler('weekly_plan', weeklyPlanHandler);
  scheduler.registerJobHandler('deadline_reminder', deadlineReminderHandler);
  scheduler.registerJobHandler('task_overdue_nudge', taskOverdueNudgeHandler);
  scheduler.registerJobHandler('no_activity_nudge', noActivityNudgeHandler);

  logger.info('All job handlers registered');
}
