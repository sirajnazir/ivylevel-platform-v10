/**
 * v10.0 API Routes - All 6 UI/UX Gaps
 * Purpose: Backend APIs for Weekly Vitals, Tasks, Timeline, Applications, Session Prep, Projects
 * Database: All schemas created in migration 18-19
 * Date: 2025-10-25
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function v10Router(pool: Pool): Router {
  const router = Router();

  // ============================================================================
  // GAP 1: WEEKLY VITALS API
  // ============================================================================

  /**
   * GET /students/:id/vitals/current-week
   * Get current week vitals with deadlines and tasks
   * Uses materialized view mv_current_week_vitals
   */
  router.get('/students/:id/vitals/current-week', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;

      // Get current week vitals from materialized view
      const result = await pool.query(`
        SELECT *
        FROM mv_current_week_vitals
        WHERE student_id = $1
      `, [studentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'No current week vitals found',
          message: 'Weekly vitals have not been created yet'
        });
      }

      const vitals = result.rows[0];

      // Transform to frontend format
      res.json({
        week_number: vitals.week_number,
        week_start: vitals.week_start_date,
        week_end: vitals.week_end_date,
        focus_areas: vitals.focus_areas || [],
        progress_status: vitals.progress_status,
        completion_percentage: parseFloat(vitals.completion_percentage),
        vitals: {
          academic: vitals.academic_vitals || {},
          extracurricular: vitals.ec_vitals || {},
          growth: vitals.growth_vitals || {}
        },
        upcoming_deadlines: vitals.upcoming_deadlines || [],
        active_tasks: vitals.active_tasks || []
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching current week vitals:', error);
      res.status(500).json({
        error: 'Failed to fetch current week vitals',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/vitals/weeks
   * Get weekly vitals history with optional filtering
   * Query params: start_week, end_week, limit
   */
  router.get('/students/:id/vitals/weeks', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { start_week, end_week, limit = '10' } = req.query;

      let query = `
        SELECT
          week_number,
          week_start_date,
          week_end_date,
          focus_areas,
          progress_status,
          completion_percentage,
          academic_vitals,
          ec_vitals,
          growth_vitals,
          ec_details,
          award_details,
          program_details,
          session_summary,
          session_topics,
          created_at,
          updated_at
        FROM weekly_vitals
        WHERE student_id = $1
      `;

      const params: any[] = [studentId];
      let paramIndex = 2;

      if (start_week) {
        query += ` AND week_number >= $${paramIndex}`;
        params.push(parseInt(start_week as string, 10));
        paramIndex++;
      }

      if (end_week) {
        query += ` AND week_number <= $${paramIndex}`;
        params.push(parseInt(end_week as string, 10));
        paramIndex++;
      }

      query += ` ORDER BY week_number DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string, 10));

      const result = await pool.query(query, params);

      res.json({
        weeks: result.rows.map(row => ({
          week_number: row.week_number,
          week_start: row.week_start_date,
          week_end: row.week_end_date,
          focus_areas: row.focus_areas || [],
          progress_status: row.progress_status,
          completion_percentage: parseFloat(row.completion_percentage),
          // v3.0: academic_vitals at root level (new schema)
          academic_vitals: row.academic_vitals || null,
          // v1.0 backwards compatibility: nested vitals
          vitals: {
            academic: row.academic_vitals || {},
            extracurricular: row.ec_vitals || {},
            growth: row.growth_vitals || {}
          },
          ec_details: row.ec_details || [],
          award_details: row.award_details || [],
          program_details: row.program_details || [],
          session_summary: row.session_summary,
          session_topics: row.session_topics || []
        })),
        total_weeks: result.rows.length
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching weekly vitals:', error);
      res.status(500).json({
        error: 'Failed to fetch weekly vitals',
        message: error.message
      });
    }
  });

  // ============================================================================
  // GAP 2: TASK MANAGER API
  // ============================================================================

  /**
   * GET /students/:id/tasks
   * Get tasks for student with optional filtering
   * Query params: status, category, overdue_only, limit
   */
  router.get('/students/:id/tasks', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { status, category, overdue_only, limit = '50' } = req.query;

      let query = `
        SELECT
          id,
          title,
          description,
          status,
          priority,
          category,
          due_date,
          completed_at,
          week_number,
          completion_proof,
          coach_feedback,
          created_at,
          updated_at
        FROM tasks
        WHERE student_id = $1
      `;

      const params: any[] = [studentId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (overdue_only === 'true') {
        query += ` AND status != 'completed' AND due_date < CURRENT_DATE`;
      }

      query += ` ORDER BY
        CASE
          WHEN status = 'completed' THEN 2
          WHEN due_date < CURRENT_DATE THEN 0
          ELSE 1
        END,
        due_date ASC NULLS LAST
        LIMIT $${paramIndex}
      `;
      params.push(parseInt(limit as string, 10));

      const result = await pool.query(query, params);

      res.json({
        tasks: result.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          category: row.category,
          due_date: row.due_date,
          completed_at: row.completed_at,
          week_number: row.week_number,
          completion_proof: row.completion_proof || {},
          coach_feedback: row.coach_feedback,
          is_overdue: row.status !== 'completed' && row.due_date && new Date(row.due_date) < new Date()
        })),
        total: result.rows.length
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching tasks:', error);
      res.status(500).json({
        error: 'Failed to fetch tasks',
        message: error.message
      });
    }
  });

  /**
   * POST /students/:id/tasks
   * Create a new task
   */
  router.post('/students/:id/tasks', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { title, description, priority, category, due_date, week_number } = req.body;

      if (!title) {
        return res.status(400).json({
          error: 'Missing required field: title'
        });
      }

      const result = await pool.query(`
        INSERT INTO tasks (
          student_id, title, description, status, priority, category, due_date, week_number
        )
        VALUES ($1, $2, $3, 'not_started', $4, $5, $6, $7)
        RETURNING *
      `, [
        studentId,
        title,
        description || null,
        priority || 'medium',
        category || 'other',
        due_date || null,
        week_number || null
      ]);

      // Refresh task completion stats
      await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_task_completion_stats');

      res.status(201).json({
        task: result.rows[0],
        message: 'Task created successfully'
      });
    } catch (error: any) {
      console.error('[v10.0] Error creating task:', error);
      res.status(500).json({
        error: 'Failed to create task',
        message: error.message
      });
    }
  });

  /**
   * PATCH /students/:id/tasks/:task_id
   * Update a task (status, completion, etc.)
   */
  router.patch('/students/:id/tasks/:task_id', async (req: Request, res: Response) => {
    try {
      const { id: studentId, task_id } = req.params;
      const updates = req.body;

      // Build dynamic update query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const allowedFields = ['title', 'description', 'status', 'priority', 'category', 'due_date', 'completion_proof', 'coach_feedback'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          params.push(field === 'completion_proof' ? JSON.stringify(updates[field]) : updates[field]);
          paramIndex++;
        }
      }

      // If status changed to completed, set completed_at
      if (updates.status === 'completed') {
        updateFields.push(`completed_at = NOW()`);
      } else if (updates.status && updates.status !== 'completed') {
        updateFields.push(`completed_at = NULL`);
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 1) { // Only updated_at
        return res.status(400).json({
          error: 'No valid fields to update'
        });
      }

      params.push(task_id, studentId);

      const result = await pool.query(`
        UPDATE tasks
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND student_id = $${paramIndex + 1}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Task not found'
        });
      }

      // Refresh task completion stats
      await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_task_completion_stats');

      res.json({
        task: result.rows[0],
        message: 'Task updated successfully'
      });
    } catch (error: any) {
      console.error('[v10.0] Error updating task:', error);
      res.status(500).json({
        error: 'Failed to update task',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/tasks/stats
   * Get task completion statistics
   * Uses materialized view mv_task_completion_stats
   */
  router.get('/students/:id/tasks/stats', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;

      const result = await pool.query(`
        SELECT *
        FROM mv_task_completion_stats
        WHERE student_id = $1
      `, [studentId]);

      if (result.rows.length === 0) {
        return res.json({
          total_tasks: 0,
          completed: 0,
          in_progress: 0,
          not_started: 0,
          overdue: 0,
          completion_rate: 0,
          by_category: [],
          by_priority: []
        });
      }

      const stats = result.rows[0];

      res.json({
        total_tasks: stats.total_tasks,
        completed: stats.completed_tasks,
        in_progress: stats.in_progress_tasks,
        not_started: stats.not_started_tasks,
        overdue: stats.overdue_tasks,
        completion_rate: parseFloat(stats.completion_rate),
        avg_completion_days: stats.avg_completion_days ? parseFloat(stats.avg_completion_days) : null
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching task stats:', error);
      res.status(500).json({
        error: 'Failed to fetch task statistics',
        message: error.message
      });
    }
  });

  // ============================================================================
  // GAP 3: TIMELINE VISUALIZATION API
  // ============================================================================

  /**
   * GET /students/:id/timeline
   * Get timeline events with optional filtering
   * Query params: event_type, start_date, end_date, limit
   */
  router.get('/students/:id/timeline', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { event_type, start_date, end_date, limit = '100' } = req.query;

      let query = `
        SELECT
          id,
          title,
          description,
          event_date,
          week_number,
          event_type,
          icon,
          color,
          importance,
          evidence_chips,
          proof_url,
          created_at
        FROM timeline_events
        WHERE student_id = $1
      `;

      const params: any[] = [studentId];
      let paramIndex = 2;

      if (event_type) {
        query += ` AND event_type = $${paramIndex}`;
        params.push(event_type);
        paramIndex++;
      }

      if (start_date) {
        query += ` AND event_date >= $${paramIndex}`;
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND event_date <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }

      query += ` ORDER BY event_date DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string, 10));

      const result = await pool.query(query, params);

      res.json({
        events: result.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          event_date: row.event_date,
          week_number: row.week_number,
          event_type: row.event_type,
          icon: row.icon,
          color: row.color,
          importance: row.importance,
          evidence_chips: row.evidence_chips || [],
          proof_url: row.proof_url
        })),
        total: result.rows.length
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching timeline:', error);
      res.status(500).json({
        error: 'Failed to fetch timeline events',
        message: error.message
      });
    }
  });

  /**
   * POST /students/:id/timeline
   * Create a new timeline event
   */
  router.post('/students/:id/timeline', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { title, description, event_date, event_type, icon, color, importance, evidence_chips, proof_url } = req.body;

      if (!title || !event_date || !event_type) {
        return res.status(400).json({
          error: 'Missing required fields: title, event_date, event_type'
        });
      }

      const result = await pool.query(`
        INSERT INTO timeline_events (
          student_id, title, description, event_date, event_type, icon, color, importance, evidence_chips, proof_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        studentId,
        title,
        description || null,
        event_date,
        event_type,
        icon || '📌',
        color || 'gray',
        importance || 'medium',
        evidence_chips ? JSON.stringify(evidence_chips) : null,
        proof_url || null
      ]);

      // Refresh timeline summary
      await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_timeline_summary');

      res.status(201).json({
        event: result.rows[0],
        message: 'Timeline event created successfully'
      });
    } catch (error: any) {
      console.error('[v10.0] Error creating timeline event:', error);
      res.status(500).json({
        error: 'Failed to create timeline event',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/timeline/summary
   * Get timeline statistics and summary
   * Uses materialized view mv_timeline_summary
   */
  router.get('/students/:id/timeline/summary', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;

      const result = await pool.query(`
        SELECT *
        FROM mv_timeline_summary
        WHERE student_id = $1
      `, [studentId]);

      if (result.rows.length === 0) {
        return res.json({
          total_events: 0,
          by_type: {},
          journey_start: null,
          journey_end: null
        });
      }

      const summary = result.rows[0];

      res.json({
        total_events: summary.total_events,
        by_type: {
          growth_events: summary.growth_events || 0,
          academic: summary.academic_events || 0,
          awards: summary.award_events || 0,
          programs: summary.program_events || 0,
          decisions: summary.decision_events || 0
        },
        journey_start: summary.journey_start,
        journey_end: summary.journey_end
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching timeline summary:', error);
      res.status(500).json({
        error: 'Failed to fetch timeline summary',
        message: error.message
      });
    }
  });

  // ============================================================================
  // GAP 4: APPLICATION MANAGER API
  // ============================================================================

  /**
   * GET /students/:id/applications
   * Get all college applications with status tracking
   */
  router.get('/students/:id/applications', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;

      const result = await pool.query(`
        SELECT
          college_name,
          decision_plan,
          decision_result,
          application_status,
          submission_date,
          documents_checklist,
          essays_required,
          financial_aid_amount,
          financial_aid_details,
          created_at,
          updated_at
        FROM college_list
        WHERE student_id = $1
        ORDER BY
          CASE decision_plan
            WHEN 'ED' THEN 1
            WHEN 'REA' THEN 2
            WHEN 'EA' THEN 3
            WHEN 'RD' THEN 4
            ELSE 5
          END,
          college_name
      `, [studentId]);

      res.json({
        applications: result.rows.map(row => ({
          college_name: row.college_name,
          decision_plan: row.decision_plan,
          decision_result: row.decision_result,
          application_status: row.application_status || 'not_started',
          submission_date: row.submission_date,
          documents_checklist: row.documents_checklist || {},
          essays_required: row.essays_required || {},
          financial_aid: {
            amount: row.financial_aid_amount,
            details: row.financial_aid_details || {}
          }
        })),
        total: result.rows.length
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching applications:', error);
      res.status(500).json({
        error: 'Failed to fetch applications',
        message: error.message
      });
    }
  });

  /**
   * PATCH /students/:id/applications/:college_name
   * Update application status and tracking
   */
  router.patch('/students/:id/applications/:college_name', async (req: Request, res: Response) => {
    try {
      const { id: studentId, college_name } = req.params;
      const updates = req.body;

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const allowedFields = [
        'application_status',
        'submission_date',
        'documents_checklist',
        'essays_required',
        'financial_aid_amount',
        'financial_aid_details'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          if (field === 'documents_checklist' || field === 'essays_required' || field === 'financial_aid_details') {
            params.push(JSON.stringify(updates[field]));
          } else {
            params.push(updates[field]);
          }
          paramIndex++;
        }
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 1) {
        return res.status(400).json({
          error: 'No valid fields to update'
        });
      }

      params.push(decodeURIComponent(college_name), studentId);

      const result = await pool.query(`
        UPDATE college_list
        SET ${updateFields.join(', ')}
        WHERE college_name = $${paramIndex} AND student_id = $${paramIndex + 1}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Application not found'
        });
      }

      // Refresh application progress stats
      await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_application_progress');

      res.json({
        application: result.rows[0],
        message: 'Application updated successfully'
      });
    } catch (error: any) {
      console.error('[v10.0] Error updating application:', error);
      res.status(500).json({
        error: 'Failed to update application',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/applications/stats
   * Get application progress statistics
   * Uses materialized view mv_application_progress
   */
  router.get('/students/:id/applications/stats', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;

      const result = await pool.query(`
        SELECT *
        FROM mv_application_progress
        WHERE student_id = $1
      `, [studentId]);

      if (result.rows.length === 0) {
        return res.json({
          total_colleges: 0,
          submitted: 0,
          pending: 0,
          by_plan: {},
          decisions: {},
          total_aid_offered: 0
        });
      }

      const stats = result.rows[0];

      res.json({
        total_colleges: stats.total_colleges,
        submitted: stats.submitted_count || 0,
        pending: stats.pending_count || 0,
        by_plan: {
          rea: stats.rea_count || 0,
          ea: stats.ea_count || 0,
          ed: stats.ed_count || 0,
          rd: stats.rd_count || 0
        },
        decisions: {
          accepted: stats.accepted_count || 0,
          waitlisted: stats.waitlisted_count || 0,
          rejected: stats.rejected_count || 0,
          pending: stats.pending_decisions || 0
        },
        total_aid_offered: stats.total_aid_offered || 0
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching application stats:', error);
      res.status(500).json({
        error: 'Failed to fetch application statistics',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/essays
   * Get all essays for student
   */
  router.get('/students/:id/essays', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { essay_type, status } = req.query;

      let query = `
        SELECT
          id,
          essay_type,
          prompt,
          draft_version,
          content,
          word_count,
          status,
          feedback,
          college_name,
          created_at,
          updated_at
        FROM essays
        WHERE student_id = $1
      `;

      const params: any[] = [studentId];
      let paramIndex = 2;

      if (essay_type) {
        query += ` AND essay_type = $${paramIndex}`;
        params.push(essay_type);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);

      res.json({
        essays: result.rows.map(row => ({
          id: row.id,
          essay_type: row.essay_type,
          prompt: row.prompt,
          draft_version: row.draft_version,
          content: row.content,
          word_count: row.word_count,
          status: row.status,
          feedback: row.feedback || [],
          college_name: row.college_name
        })),
        total: result.rows.length
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching essays:', error);
      res.status(500).json({
        error: 'Failed to fetch essays',
        message: error.message
      });
    }
  });

  // ============================================================================
  // GAP 5: SESSION PREP API
  // ============================================================================

  /**
   * POST /students/:id/session-prep
   * Create new session prep submission
   */
  router.post('/students/:id/session-prep', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const {
        session_date,
        week_number,
        wins,
        challenges,
        questions,
        priorities,
        mood_rating,
        prep_time_minutes,
        additional_notes
      } = req.body;

      if (!session_date || !week_number) {
        return res.status(400).json({
          error: 'Missing required fields: session_date, week_number'
        });
      }

      const result = await pool.query(`
        INSERT INTO session_prep (
          student_id,
          session_date,
          week_number,
          wins,
          challenges,
          questions,
          priorities,
          mood_rating,
          prep_time_minutes,
          additional_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        studentId,
        session_date,
        week_number,
        wins ? JSON.stringify(wins) : null,
        challenges ? JSON.stringify(challenges) : null,
        questions ? JSON.stringify(questions) : null,
        priorities ? JSON.stringify(priorities) : null,
        mood_rating || null,
        prep_time_minutes || null,
        additional_notes || null
      ]);

      res.status(201).json({
        prep: result.rows[0],
        message: 'Session prep submitted successfully'
      });
    } catch (error: any) {
      console.error('[v10.0] Error creating session prep:', error);
      res.status(500).json({
        error: 'Failed to create session prep',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/session-prep/upcoming
   * Get session prep for upcoming session
   */
  router.get('/students/:id/session-prep/upcoming', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;

      const result = await pool.query(`
        SELECT *
        FROM session_prep
        WHERE student_id = $1
        AND session_date >= CURRENT_DATE
        ORDER BY session_date ASC
        LIMIT 1
      `, [studentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'No upcoming session prep found',
          message: 'No session prep has been submitted for upcoming sessions'
        });
      }

      const prep = result.rows[0];

      res.json({
        id: prep.id,
        session_date: prep.session_date,
        week_number: prep.week_number,
        wins: prep.wins || [],
        challenges: prep.challenges || [],
        questions: prep.questions || [],
        priorities: prep.priorities || [],
        mood_rating: prep.mood_rating,
        prep_time_minutes: prep.prep_time_minutes,
        additional_notes: prep.additional_notes,
        submitted_at: prep.created_at
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching upcoming session prep:', error);
      res.status(500).json({
        error: 'Failed to fetch session prep',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/session-prep/history
   * Get past session prep submissions
   */
  router.get('/students/:id/session-prep/history', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { limit = '10' } = req.query;

      const result = await pool.query(`
        SELECT *
        FROM session_prep
        WHERE student_id = $1
        ORDER BY session_date DESC
        LIMIT $2
      `, [studentId, parseInt(limit as string, 10)]);

      res.json({
        preps: result.rows.map(row => ({
          id: row.id,
          session_date: row.session_date,
          week_number: row.week_number,
          wins: row.wins || [],
          challenges: row.challenges || [],
          questions: row.questions || [],
          priorities: row.priorities || [],
          mood_rating: row.mood_rating,
          prep_time_minutes: row.prep_time_minutes,
          submitted_at: row.created_at
        })),
        total: result.rows.length
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching session prep history:', error);
      res.status(500).json({
        error: 'Failed to fetch session prep history',
        message: error.message
      });
    }
  });

  // ============================================================================
  // GAP 6: PROJECT WORKSPACE API
  // ============================================================================

  /**
   * GET /students/:id/projects
   * Get all projects for student
   */
  router.get('/students/:id/projects', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { status, category } = req.query;

      let query = `
        SELECT
          id,
          title,
          description,
          category,
          status,
          start_date,
          target_completion_date,
          actual_completion_date,
          milestones,
          metrics,
          files,
          external_links,
          used_in_applications,
          created_at,
          updated_at
        FROM projects
        WHERE student_id = $1
      `;

      const params: any[] = [studentId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'planning' THEN 2
          WHEN 'completed' THEN 3
          WHEN 'paused' THEN 4
          ELSE 5
        END,
        created_at DESC
      `;

      const result = await pool.query(query, params);

      res.json({
        projects: result.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          status: row.status,
          start_date: row.start_date,
          target_completion_date: row.target_completion_date,
          actual_completion_date: row.actual_completion_date,
          milestones: row.milestones || [],
          metrics: row.metrics || {},
          files: row.files || [],
          external_links: row.external_links || [],
          used_in_applications: row.used_in_applications,
          progress: calculateProjectProgress(row.milestones || [])
        })),
        total: result.rows.length
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching projects:', error);
      res.status(500).json({
        error: 'Failed to fetch projects',
        message: error.message
      });
    }
  });

  /**
   * PATCH /students/:id/projects/:project_id
   * Update project (status, milestones, etc.)
   */
  router.patch('/students/:id/projects/:project_id', async (req: Request, res: Response) => {
    try {
      const { id: studentId, project_id } = req.params;
      const updates = req.body;

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const allowedFields = [
        'title',
        'description',
        'status',
        'category',
        'target_completion_date',
        'actual_completion_date',
        'milestones',
        'metrics',
        'files',
        'external_links',
        'used_in_applications'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          if (['milestones', 'metrics', 'files', 'external_links'].includes(field)) {
            params.push(JSON.stringify(updates[field]));
          } else {
            params.push(updates[field]);
          }
          paramIndex++;
        }
      }

      updateFields.push('updated_at = NOW()');

      if (updateFields.length === 1) {
        return res.status(400).json({
          error: 'No valid fields to update'
        });
      }

      params.push(project_id, studentId);

      const result = await pool.query(`
        UPDATE projects
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND student_id = $${paramIndex + 1}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }

      res.json({
        project: result.rows[0],
        message: 'Project updated successfully'
      });
    } catch (error: any) {
      console.error('[v10.0] Error updating project:', error);
      res.status(500).json({
        error: 'Failed to update project',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/projects/:project_id
   * Get single project details
   */
  router.get('/students/:id/projects/:project_id', async (req: Request, res: Response) => {
    try {
      const { id: studentId, project_id } = req.params;

      const result = await pool.query(`
        SELECT *
        FROM projects
        WHERE id = $1 AND student_id = $2
      `, [project_id, studentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }

      const project = result.rows[0];

      res.json({
        id: project.id,
        title: project.title,
        description: project.description,
        category: project.category,
        status: project.status,
        start_date: project.start_date,
        target_completion_date: project.target_completion_date,
        actual_completion_date: project.actual_completion_date,
        milestones: project.milestones || [],
        metrics: project.metrics || {},
        files: project.files || [],
        external_links: project.external_links || [],
        used_in_applications: project.used_in_applications,
        progress: calculateProjectProgress(project.milestones || []),
        created_at: project.created_at,
        updated_at: project.updated_at
      });
    } catch (error: any) {
      console.error('[v10.0] Error fetching project:', error);
      res.status(500).json({
        error: 'Failed to fetch project',
        message: error.message
      });
    }
  });

  // ============================================================================
  // GAP 7: WEEKLY ACTION PLAN & TASKS API (v10.9)
  // ============================================================================

  /**
   * GET /students/:id/weeks/:weekNumber/action-plan
   * Get complete action plan for specific week
   * Returns: outcomes, execution items, tasks, resource allocation, progress tracking
   */
  router.get('/students/:id/weeks/:weekNumber/action-plan', async (req: Request, res: Response) => {
    try {
      const { id: studentId, weekNumber } = req.params;

      const result = await pool.query(`
        SELECT
          week_number,
          week_start_date,
          week_end_date,
          action_plan,
          academic_vitals,
          ec_details,
          award_details,
          program_details
        FROM weekly_vitals
        WHERE student_id = $1 AND week_number = $2
      `, [studentId, parseInt(weekNumber)]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Week not found',
          message: `No data found for week ${weekNumber}`
        });
      }

      const row = result.rows[0];

      res.json({
        success: true,
        data: {
          week_number: row.week_number,
          week_start_date: row.week_start_date,
          week_end_date: row.week_end_date,
          action_plan: row.action_plan || null,
          linked_vitals: {
            academic_vitals: row.academic_vitals,
            ec_details: row.ec_details,
            award_details: row.award_details,
            program_details: row.program_details
          }
        }
      });
    } catch (error: any) {
      console.error('[v10.9] Error fetching action plan:', error);
      res.status(500).json({
        error: 'Failed to fetch action plan',
        message: error.message
      });
    }
  });

  /**
   * POST /students/:id/weeks/:weekNumber/action-plan
   * Create or update action plan for week
   */
  router.post('/students/:id/weeks/:weekNumber/action-plan', async (req: Request, res: Response) => {
    try {
      const { id: studentId, weekNumber } = req.params;
      const actionPlan = req.body;

      // Upsert action plan
      const result = await pool.query(`
        UPDATE weekly_vitals
        SET
          action_plan = $1::jsonb,
          updated_at = NOW()
        WHERE student_id = $2 AND week_number = $3
        RETURNING week_number, action_plan->>'plan_id' as plan_id
      `, [JSON.stringify(actionPlan), studentId, parseInt(weekNumber)]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Week not found',
          message: `Cannot create action plan - week ${weekNumber} does not exist`
        });
      }

      res.json({
        success: true,
        data: {
          plan_id: result.rows[0].plan_id,
          week_number: result.rows[0].week_number,
          created_at: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('[v10.9] Error creating action plan:', error);
      res.status(500).json({
        error: 'Failed to create action plan',
        message: error.message
      });
    }
  });

  /**
   * PATCH /students/:id/weeks/:weekNumber/action-plan
   * Partial update to action plan
   */
  router.patch('/students/:id/weeks/:weekNumber/action-plan', async (req: Request, res: Response) => {
    try {
      const { id: studentId, weekNumber } = req.params;
      const updates = req.body;

      // Get existing action plan
      const existing = await pool.query(`
        SELECT action_plan
        FROM weekly_vitals
        WHERE student_id = $1 AND week_number = $2
      `, [studentId, parseInt(weekNumber)]);

      if (existing.rows.length === 0) {
        return res.status(404).json({
          error: 'Week not found',
          message: `No data found for week ${weekNumber}`
        });
      }

      const existingPlan = existing.rows[0].action_plan || {};
      const mergedPlan = { ...existingPlan, ...updates, last_updated_at: new Date().toISOString() };

      // Update
      await pool.query(`
        UPDATE weekly_vitals
        SET
          action_plan = $1::jsonb,
          updated_at = NOW()
        WHERE student_id = $2 AND week_number = $3
      `, [JSON.stringify(mergedPlan), studentId, parseInt(weekNumber)]);

      res.json({
        success: true,
        message: 'Action plan updated successfully'
      });
    } catch (error: any) {
      console.error('[v10.9] Error updating action plan:', error);
      res.status(500).json({
        error: 'Failed to update action plan',
        message: error.message
      });
    }
  });

  /**
   * POST /students/:id/weeks/:weekNumber/outcomes
   * Add new outcome to week's action plan
   */
  router.post('/students/:id/weeks/:weekNumber/outcomes', async (req: Request, res: Response) => {
    try {
      const { id: studentId, weekNumber } = req.params;
      const newOutcome = req.body;

      // Get existing action plan
      const existing = await pool.query(`
        SELECT action_plan
        FROM weekly_vitals
        WHERE student_id = $1 AND week_number = $2
      `, [studentId, parseInt(weekNumber)]);

      if (existing.rows.length === 0) {
        return res.status(404).json({
          error: 'Week not found'
        });
      }

      const actionPlan = existing.rows[0].action_plan || { outcomes: [] };
      actionPlan.outcomes = actionPlan.outcomes || [];
      actionPlan.outcomes.push(newOutcome);
      actionPlan.last_updated_at = new Date().toISOString();

      // Update
      await pool.query(`
        UPDATE weekly_vitals
        SET
          action_plan = $1::jsonb,
          updated_at = NOW()
        WHERE student_id = $2 AND week_number = $3
      `, [JSON.stringify(actionPlan), studentId, parseInt(weekNumber)]);

      res.json({
        success: true,
        data: {
          outcome_id: newOutcome.outcome_id,
          week_number: parseInt(weekNumber)
        }
      });
    } catch (error: any) {
      console.error('[v10.9] Error adding outcome:', error);
      res.status(500).json({
        error: 'Failed to add outcome',
        message: error.message
      });
    }
  });

  /**
   * PATCH /students/:id/weeks/:weekNumber/outcomes/:outcomeId
   * Update specific outcome
   */
  router.patch('/students/:id/weeks/:weekNumber/outcomes/:outcomeId', async (req: Request, res: Response) => {
    try {
      const { id: studentId, weekNumber, outcomeId } = req.params;
      const updates = req.body;

      // Use PostgreSQL jsonb_set to update specific outcome
      const result = await pool.query(`
        UPDATE weekly_vitals
        SET
          action_plan = jsonb_set(
            action_plan,
            '{outcomes}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN outcome->>'outcome_id' = $4
                  THEN outcome || $3::jsonb
                  ELSE outcome
                END
              )
              FROM jsonb_array_elements(action_plan->'outcomes') outcome
            )
          ),
          updated_at = NOW()
        WHERE student_id = $1 AND week_number = $2
        RETURNING week_number
      `, [studentId, parseInt(weekNumber), JSON.stringify(updates), outcomeId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Week or outcome not found'
        });
      }

      res.json({
        success: true,
        message: 'Outcome updated successfully'
      });
    } catch (error: any) {
      console.error('[v10.9] Error updating outcome:', error);
      res.status(500).json({
        error: 'Failed to update outcome',
        message: error.message
      });
    }
  });

  /**
   * POST /students/:id/weeks/:weekNumber/execution-items
   * Add execution item to action plan
   */
  router.post('/students/:id/weeks/:weekNumber/execution-items', async (req: Request, res: Response) => {
    try {
      const { id: studentId, weekNumber } = req.params;
      const newItem = req.body;

      const existing = await pool.query(`
        SELECT action_plan
        FROM weekly_vitals
        WHERE student_id = $1 AND week_number = $2
      `, [studentId, parseInt(weekNumber)]);

      if (existing.rows.length === 0) {
        return res.status(404).json({
          error: 'Week not found'
        });
      }

      const actionPlan = existing.rows[0].action_plan || { execution_items: [] };
      actionPlan.execution_items = actionPlan.execution_items || [];
      actionPlan.execution_items.push(newItem);
      actionPlan.last_updated_at = new Date().toISOString();

      await pool.query(`
        UPDATE weekly_vitals
        SET
          action_plan = $1::jsonb,
          updated_at = NOW()
        WHERE student_id = $2 AND week_number = $3
      `, [JSON.stringify(actionPlan), studentId, parseInt(weekNumber)]);

      res.json({
        success: true,
        data: {
          execution_item_id: newItem.execution_item_id,
          week_number: parseInt(weekNumber)
        }
      });
    } catch (error: any) {
      console.error('[v10.9] Error adding execution item:', error);
      res.status(500).json({
        error: 'Failed to add execution item',
        message: error.message
      });
    }
  });

  /**
   * POST /students/:id/weeks/:weekNumber/tasks
   * Add task to action plan
   */
  router.post('/students/:id/weeks/:weekNumber/tasks', async (req: Request, res: Response) => {
    try {
      const { id: studentId, weekNumber } = req.params;
      const newTask = req.body;

      const existing = await pool.query(`
        SELECT action_plan
        FROM weekly_vitals
        WHERE student_id = $1 AND week_number = $2
      `, [studentId, parseInt(weekNumber)]);

      if (existing.rows.length === 0) {
        return res.status(404).json({
          error: 'Week not found'
        });
      }

      const actionPlan = existing.rows[0].action_plan || { tasks: [] };
      actionPlan.tasks = actionPlan.tasks || [];
      actionPlan.tasks.push(newTask);
      actionPlan.last_updated_at = new Date().toISOString();

      await pool.query(`
        UPDATE weekly_vitals
        SET
          action_plan = $1::jsonb,
          updated_at = NOW()
        WHERE student_id = $2 AND week_number = $3
      `, [JSON.stringify(actionPlan), studentId, parseInt(weekNumber)]);

      res.json({
        success: true,
        data: {
          task_id: newTask.task_id,
          week_number: parseInt(weekNumber)
        }
      });
    } catch (error: any) {
      console.error('[v10.9] Error adding task:', error);
      res.status(500).json({
        error: 'Failed to add task',
        message: error.message
      });
    }
  });

  /**
   * PATCH /students/:id/weeks/:weekNumber/tasks/:taskId/complete
   * Mark task as complete with optional proof
   */
  router.patch('/students/:id/weeks/:weekNumber/tasks/:taskId/complete', async (req: Request, res: Response) => {
    try {
      const { id: studentId, weekNumber, taskId } = req.params;
      const { completion_proof, proof_artifacts, completion_notes, actual_duration_minutes } = req.body;

      const updates = {
        completion_state: 'completed',
        completed_date: new Date().toISOString(),
        completion_verified: !!proof_artifacts,
        ...(completion_proof && { completion_proof }),
        ...(proof_artifacts && { verification_evidence: proof_artifacts }),
        ...(completion_notes && { execution_notes: completion_notes }),
        ...(actual_duration_minutes && { actual_duration_minutes })
      };

      const result = await pool.query(`
        UPDATE weekly_vitals
        SET
          action_plan = jsonb_set(
            action_plan,
            '{tasks}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN task->>'task_id' = $4
                  THEN task || $3::jsonb
                  ELSE task
                END
              )
              FROM jsonb_array_elements(action_plan->'tasks') task
            )
          ),
          updated_at = NOW()
        WHERE student_id = $1 AND week_number = $2
        RETURNING week_number
      `, [studentId, parseInt(weekNumber), JSON.stringify(updates), taskId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Week or task not found'
        });
      }

      res.json({
        success: true,
        data: {
          task_id: taskId,
          completion_state: 'completed',
          completed_date: updates.completed_date
        }
      });
    } catch (error: any) {
      console.error('[v10.9] Error completing task:', error);
      res.status(500).json({
        error: 'Failed to complete task',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/action-plans/summary
   * Get multi-week action plan summary
   * Query params: start_week, end_week, weeks_back
   */
  router.get('/students/:id/action-plans/summary', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { start_week, end_week, weeks_back = '4' } = req.query;

      let query = `
        SELECT
          week_number,
          action_plan
        FROM weekly_vitals
        WHERE student_id = $1 AND action_plan IS NOT NULL
      `;

      const params: any[] = [studentId];

      if (start_week && end_week) {
        query += ` AND week_number BETWEEN $2 AND $3`;
        params.push(parseInt(start_week as string), parseInt(end_week as string));
      } else if (weeks_back) {
        query += ` AND week_number >= (SELECT MAX(week_number) - $2 FROM weekly_vitals WHERE student_id = $1)`;
        params.push(parseInt(weeks_back as string));
      }

      query += ` ORDER BY week_number DESC`;

      const result = await pool.query(query, params);

      // Calculate aggregate metrics
      let totalOutcomes = 0;
      let completedOutcomes = 0;
      let totalHoursEstimated = 0;
      let totalHoursActual = 0;
      const frameworkUsage: Record<string, number> = {};

      result.rows.forEach(row => {
        const plan = row.action_plan;
        if (plan.outcomes) {
          totalOutcomes += plan.outcomes.length;
          completedOutcomes += plan.outcomes.filter((o: any) => o.completion_state === 'completed').length;
        }
        if (plan.execution_items) {
          plan.execution_items.forEach((item: any) => {
            if (item.estimated_duration_minutes) totalHoursEstimated += item.estimated_duration_minutes / 60;
            if (item.actual_duration_minutes) totalHoursActual += item.actual_duration_minutes / 60;
          });
        }
        if (plan.framework_applications) {
          plan.framework_applications.forEach((fw: any) => {
            frameworkUsage[fw.framework_name] = (frameworkUsage[fw.framework_name] || 0) + 1;
          });
        }
      });

      const topFrameworks = Object.entries(frameworkUsage)
        .map(([name, count]) => ({ framework_name: name, times_applied: count }))
        .sort((a, b) => b.times_applied - a.times_applied)
        .slice(0, 5);

      res.json({
        success: true,
        data: {
          student_id: studentId,
          weeks_analyzed: result.rows.map(r => r.week_number),
          aggregate_metrics: {
            total_outcomes: totalOutcomes,
            completed_outcomes: completedOutcomes,
            overall_completion_rate: totalOutcomes > 0 ? Math.round((completedOutcomes / totalOutcomes) * 100) : 0,
            total_hours_estimated: Math.round(totalHoursEstimated * 10) / 10,
            total_hours_actual: Math.round(totalHoursActual * 10) / 10,
            time_efficiency_ratio: totalHoursEstimated > 0 ? Math.round((totalHoursActual / totalHoursEstimated) * 100) / 100 : 0
          },
          top_frameworks_used: topFrameworks
        }
      });
    } catch (error: any) {
      console.error('[v10.9] Error fetching action plan summary:', error);
      res.status(500).json({
        error: 'Failed to fetch action plan summary',
        message: error.message
      });
    }
  });

  return router;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate project completion progress from milestones
 */
function calculateProjectProgress(milestones: any[]): number {
  if (!milestones || milestones.length === 0) {
    return 0;
  }

  const completedCount = milestones.filter((m: any) => m.completed === true).length;
  return Math.round((completedCount / milestones.length) * 100);
}
