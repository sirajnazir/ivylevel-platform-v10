/**
 * SchedulerService - Background job scheduler for autonomous agent lifecycle
 *
 * Purpose: Enable proactive agent behaviors via cron jobs
 * Use cases:
 *   - Weekly execution plan generation (every Monday 8am)
 *   - Deadline reminders (3 days before, 1 day before)
 *   - Task overdue notifications
 *   - No-activity nudges (if student hasn't engaged in 3 days)
 *
 * Week 17 - Proactivity Foundation
 * Version: v10.2
 */

import cron from 'node-cron';
import { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const logger = createLogger('scheduler-service');

export interface ScheduledJob {
  job_id: number;
  job_type: string;
  student_id: string;
  coach_id: string;
  scheduled_for: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  payload?: any;
  result?: any;
  error?: string;
}

export interface JobHandler {
  (job: ScheduledJob): Promise<{ success: boolean; result?: any; error?: string }>;
}

/**
 * SchedulerService - Manages background cron jobs for autonomous behaviors
 */
export class SchedulerService {
  private pool: Pool;
  private jobHandlers: Map<string, JobHandler> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Register a job handler for a specific job type
   * @param jobType - Type of job (e.g., 'weekly_plan', 'deadline_reminder')
   * @param handler - Async function to execute the job
   */
  registerJobHandler(jobType: string, handler: JobHandler): void {
    this.jobHandlers.set(jobType, handler);
    logger.info({ jobType }, 'Job handler registered');
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    logger.info('Starting SchedulerService...');

    // Every minute: Check for pending jobs that are due
    const processJobsTask = cron.schedule('* * * * *', async () => {
      await this.processPendingJobs();
    });
    this.cronJobs.set('process_jobs', processJobsTask);

    // Every Monday at 8am: Generate weekly execution plans
    const weeklyPlanTask = cron.schedule('0 8 * * 1', async () => {
      await this.scheduleWeeklyPlans();
    });
    this.cronJobs.set('weekly_plans', weeklyPlanTask);

    // Every day at 9am: Check for approaching deadlines
    const deadlineCheckTask = cron.schedule('0 9 * * *', async () => {
      await this.scheduleDeadlineReminders();
    });
    this.cronJobs.set('deadline_reminders', deadlineCheckTask);

    // Every day at 10am: Update overdue tasks
    const overdueTasksTask = cron.schedule('0 10 * * *', async () => {
      await this.updateOverdueTasks();
    });
    this.cronJobs.set('overdue_tasks', overdueTasksTask);

    // Every day at 11am: Check for no-activity students
    const noActivityTask = cron.schedule('0 11 * * *', async () => {
      await this.scheduleNoActivityNudges();
    });
    this.cronJobs.set('no_activity_nudges', noActivityTask);

    this.isRunning = true;
    logger.info({ jobCount: this.cronJobs.size }, 'SchedulerService started');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping SchedulerService...');

    for (const [name, task] of this.cronJobs.entries()) {
      task.stop();
      logger.info({ jobName: name }, 'Cron job stopped');
    }

    this.cronJobs.clear();
    this.isRunning = false;
    logger.info('SchedulerService stopped');
  }

  /**
   * Process all pending jobs that are due
   */
  private async processPendingJobs(): Promise<void> {
    try {
      // Get all pending jobs that are past their scheduled time
      const result = await this.pool.query<ScheduledJob>(
        `SELECT * FROM scheduled_jobs
         WHERE status = 'pending'
           AND scheduled_for <= NOW()
         ORDER BY scheduled_for ASC
         LIMIT 10`
      );

      const jobs = result.rows;
      if (jobs.length === 0) {
        return;
      }

      logger.info({ jobCount: jobs.length }, 'Processing pending jobs');

      for (const job of jobs) {
        await this.executeJob(job);
      }
    } catch (error) {
      logger.error({ error }, 'Error processing pending jobs');
    }
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    const handler = this.jobHandlers.get(job.job_type);

    if (!handler) {
      logger.warn({ job_id: job.job_id, job_type: job.job_type }, 'No handler registered for job type');
      await this.markJobFailed(job.job_id, 'No handler registered for job type');
      return;
    }

    try {
      // Mark job as running
      await this.pool.query(
        `UPDATE scheduled_jobs
         SET status = 'running', executed_at = NOW()
         WHERE job_id = $1`,
        [job.job_id]
      );

      logger.info({ job_id: job.job_id, job_type: job.job_type, student_id: job.student_id }, 'Executing job');

      // Execute the job handler
      const { success, result, error } = await handler(job);

      if (success) {
        await this.markJobCompleted(job.job_id, result);
        logger.info({ job_id: job.job_id, job_type: job.job_type }, 'Job completed successfully');
      } else {
        await this.markJobFailed(job.job_id, error || 'Job handler returned success: false');
        logger.error({ job_id: job.job_id, job_type: job.job_type, error }, 'Job failed');
      }
    } catch (error: any) {
      await this.markJobFailed(job.job_id, error.message);
      logger.error({ job_id: job.job_id, job_type: job.job_type, error: error.message }, 'Job execution error');
    }
  }

  /**
   * Schedule weekly execution plans for all active students
   */
  private async scheduleWeeklyPlans(): Promise<void> {
    try {
      logger.info('Scheduling weekly execution plans');

      // Get all students in active_execution state
      const result = await this.pool.query(
        `SELECT student_id, coach_id
         FROM student_state
         WHERE current_state = 'active_execution'`
      );

      const students = result.rows;
      logger.info({ studentCount: students.length }, 'Found active students for weekly plans');

      for (const student of students) {
        await this.scheduleJob({
          job_type: 'weekly_plan',
          student_id: student.student_id,
          coach_id: student.coach_id,
          scheduled_for: new Date(), // Execute immediately
          payload: {
            week_start_date: new Date().toISOString().split('T')[0],
          },
        });
      }

      logger.info({ jobsScheduled: students.length }, 'Weekly plans scheduled');
    } catch (error) {
      logger.error({ error }, 'Error scheduling weekly plans');
    }
  }

  /**
   * Schedule deadline reminders for approaching deadlines
   */
  private async scheduleDeadlineReminders(): Promise<void> {
    try {
      logger.info('Scheduling deadline reminders');

      // Get tasks due within 3 days
      const result = await this.pool.query(
        `SELECT t.*, s.coach_id
         FROM student_tasks t
         JOIN student_state s ON t.student_id = s.student_id
         WHERE t.status = 'pending'
           AND t.due_date <= CURRENT_DATE + INTERVAL '3 days'
           AND t.due_date > CURRENT_DATE`
      );

      const tasks = result.rows;
      logger.info({ taskCount: tasks.length }, 'Found tasks with approaching deadlines');

      for (const task of tasks) {
        const daysUntilDue = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        await this.scheduleJob({
          job_type: 'deadline_reminder',
          student_id: task.student_id,
          coach_id: task.coach_id,
          scheduled_for: new Date(),
          payload: {
            task_id: task.task_id,
            task_title: task.title,
            due_date: task.due_date,
            days_until_due: daysUntilDue,
          },
        });
      }

      logger.info({ remindersScheduled: tasks.length }, 'Deadline reminders scheduled');
    } catch (error) {
      logger.error({ error }, 'Error scheduling deadline reminders');
    }
  }

  /**
   * Update overdue tasks
   */
  private async updateOverdueTasks(): Promise<void> {
    try {
      logger.info('Updating overdue tasks');

      const result = await this.pool.query(
        `UPDATE student_tasks
         SET status = 'overdue', updated_at = NOW()
         WHERE status = 'pending'
           AND due_date < CURRENT_DATE
         RETURNING task_id, student_id`
      );

      const updatedTasks = result.rows;
      logger.info({ taskCount: updatedTasks.length }, 'Marked tasks as overdue');

      // Schedule nudges for overdue tasks
      for (const task of updatedTasks) {
        const taskDetails = await this.pool.query(
          `SELECT t.*, s.coach_id
           FROM student_tasks t
           JOIN student_state s ON t.student_id = s.student_id
           WHERE t.task_id = $1`,
          [task.task_id]
        );

        if (taskDetails.rows.length > 0) {
          const taskData = taskDetails.rows[0];
          await this.scheduleJob({
            job_type: 'task_overdue_nudge',
            student_id: taskData.student_id,
            coach_id: taskData.coach_id,
            scheduled_for: new Date(),
            payload: {
              task_id: taskData.task_id,
              task_title: taskData.title,
              due_date: taskData.due_date,
            },
          });
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error updating overdue tasks');
    }
  }

  /**
   * Schedule no-activity nudges for students who haven't engaged in 3 days
   */
  private async scheduleNoActivityNudges(): Promise<void> {
    try {
      logger.info('Scheduling no-activity nudges');

      // Find students with no conversation activity in last 3 days
      const result = await this.pool.query(
        `SELECT DISTINCT s.student_id, s.coach_id
         FROM student_state s
         WHERE s.current_state = 'active_execution'
           AND NOT EXISTS (
             SELECT 1 FROM conversation_history ch
             WHERE ch.student_id = s.student_id
               AND ch.created_at >= NOW() - INTERVAL '3 days'
           )`
      );

      const students = result.rows;
      logger.info({ studentCount: students.length }, 'Found students with no recent activity');

      for (const student of students) {
        await this.scheduleJob({
          job_type: 'no_activity_nudge',
          student_id: student.student_id,
          coach_id: student.coach_id,
          scheduled_for: new Date(),
          payload: {
            days_inactive: 3,
          },
        });
      }

      logger.info({ nudgesScheduled: students.length }, 'No-activity nudges scheduled');
    } catch (error) {
      logger.error({ error }, 'Error scheduling no-activity nudges');
    }
  }

  /**
   * Schedule a new job
   */
  async scheduleJob(params: {
    job_type: string;
    student_id: string;
    coach_id: string;
    scheduled_for: Date;
    payload?: any;
  }): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO scheduled_jobs (job_type, student_id, coach_id, scheduled_for, payload, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING job_id`,
      [params.job_type, params.student_id, params.coach_id, params.scheduled_for, JSON.stringify(params.payload || {})]
    );

    const job_id = result.rows[0].job_id;
    logger.info({ job_id, ...params }, 'Job scheduled');
    return job_id;
  }

  /**
   * Mark job as completed
   */
  private async markJobCompleted(job_id: number, result?: any): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs
       SET status = 'completed', result = $1
       WHERE job_id = $2`,
      [JSON.stringify(result || {}), job_id]
    );
  }

  /**
   * Mark job as failed
   */
  private async markJobFailed(job_id: number, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs
       SET status = 'failed', error = $1
       WHERE job_id = $2`,
      [error, job_id]
    );
  }

  /**
   * Get job status
   */
  async getJobStatus(job_id: number): Promise<ScheduledJob | null> {
    const result = await this.pool.query<ScheduledJob>(
      `SELECT * FROM scheduled_jobs WHERE job_id = $1`,
      [job_id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(job_id: number): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE scheduled_jobs
       SET status = 'cancelled'
       WHERE job_id = $1 AND status = 'pending'
       RETURNING job_id`,
      [job_id]
    );

    const cancelled = result.rows.length > 0;
    if (cancelled) {
      logger.info({ job_id }, 'Job cancelled');
    }
    return cancelled;
  }
}

export default SchedulerService;
