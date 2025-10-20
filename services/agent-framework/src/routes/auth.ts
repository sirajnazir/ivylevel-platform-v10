/**
 * Authentication Routes
 *
 * Provides endpoints for login, logout, profile, and token refresh
 * for self-hosted JWT authentication with coach_id support.
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import {
  generateTokenPair,
  comparePassword,
  verifyRefreshToken,
  hashPassword,
} from '../utils/jwt.js';
import { withJWT } from '../middleware/auth.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const router = Router();
const logger = createLogger('auth-api');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshRequest {
  refresh_token: string;
}

interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

interface Coach {
  coach_id: string;
  email: string;
  name: string;
  password_hash: string;
  is_active: boolean;
  password_updated_at?: Date;
  last_login_at?: Date;
  login_count: number;
}

// ============================================================================
// POST /api/auth/login
// ============================================================================

/**
 * Login endpoint
 *
 * Authenticates coach credentials and returns JWT tokens
 *
 * Request Body:
 *   - email: Coach email address
 *   - password: Plain text password
 *
 * Response:
 *   - access_token: Short-lived JWT with coach_id
 *   - refresh_token: Long-lived token for renewal
 *   - expires_in: Access token expiry in seconds
 *   - coach: Coach profile data
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required',
      });
    }

    logger.event('auth.login_attempt', { email });

    const normalizedEmail = email.toLowerCase().trim();

    // Try to find coach first
    const coachResult = await pool.query(
      `SELECT coach_id, email, name, password_hash,
              is_active, password_updated_at, last_login_at, login_count
       FROM coaches
       WHERE email = $1`,
      [normalizedEmail]
    );

    // If coach found, process coach login
    if (coachResult.rows.length > 0) {
      const coach: Coach = coachResult.rows[0];

      // Check if account is active
      if (!coach.is_active) {
        logger.event('auth.login_failed', {
          email,
          coach_id: coach.coach_id,
          reason: 'account_inactive',
        });
        return res.status(403).json({
          error: 'Account inactive',
          message: 'Your account has been deactivated. Please contact support.',
        });
      }

      // Check if password is set
      if (!coach.password_hash) {
        logger.event('auth.login_failed', {
          email,
          coach_id: coach.coach_id,
          reason: 'no_password',
        });
        return res.status(403).json({
          error: 'No password',
          message: 'Password not set for this account. Please contact support.',
        });
      }

      // Verify password
      const passwordValid = await comparePassword(password, coach.password_hash);

      if (!passwordValid) {
        logger.event('auth.login_failed', {
          email,
          coach_id: coach.coach_id,
          reason: 'invalid_password',
        });
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      // Generate tokens
      const tokens = generateTokenPair(
        coach.coach_id,
        coach.coach_id, // user_id = coach_id for coaches
        coach.email,
        'coach'
      );

      // Update login metadata
      await pool.query(
        `UPDATE coaches
         SET last_login_at = NOW(),
             login_count = COALESCE(login_count, 0) + 1
         WHERE coach_id = $1`,
        [coach.coach_id]
      );

      logger.event('auth.login_success', {
        email,
        coach_id: coach.coach_id,
        role: 'coach',
        login_count: coach.login_count + 1,
      });

      // Return tokens and coach profile
      return res.status(200).json({
        ...tokens,
        coach: {
          user_id: coach.coach_id,
          coach_id: coach.coach_id,
          email: coach.email,
          name: coach.name,
          role: 'coach',
          last_login_at: new Date().toISOString(),
        },
      });
    }

    // Try to find student
    const studentResult = await pool.query(
      `SELECT student_id, email, full_name as name, password_hash,
              password_updated_at, last_login_at, login_count, primary_coach_id
       FROM students
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (studentResult.rows.length === 0) {
      logger.event('auth.login_failed', { email, reason: 'user_not_found' });
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    const student = studentResult.rows[0];

    // Check if password is set
    if (!student.password_hash) {
      logger.event('auth.login_failed', {
        email,
        student_id: student.student_id,
        reason: 'no_password',
      });
      return res.status(403).json({
        error: 'No password',
        message: 'Password not set for this account. Please contact support.',
      });
    }

    // Verify password
    const passwordValid = await comparePassword(password, student.password_hash);

    if (!passwordValid) {
      logger.event('auth.login_failed', {
        email,
        student_id: student.student_id,
        reason: 'invalid_password',
      });
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // Generate tokens
    const tokens = generateTokenPair(
      student.student_id, // userId
      student.primary_coach_id || student.student_id, // coachId for RLS
      student.email,
      'student'
    );

    // Update login metadata
    await pool.query(
      `UPDATE students
       SET last_login_at = NOW(),
           login_count = COALESCE(login_count, 0) + 1
       WHERE student_id = $1`,
      [student.student_id]
    );

    logger.event('auth.login_success', {
      email,
      student_id: student.student_id,
      role: 'student',
      login_count: student.login_count + 1,
    });

    // Return tokens and student profile
    return res.status(200).json({
      ...tokens,
      student: {
        user_id: student.student_id,
        student_id: student.student_id,
        email: student.email,
        name: student.name,
        role: 'student',
        last_login_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during login',
    });
  }
});

// ============================================================================
// GET /api/auth/me
// ============================================================================

/**
 * Get current coach profile
 *
 * Requires JWT authentication (via middleware)
 * Returns coach profile data
 *
 * Headers:
 *   - Authorization: Bearer {access_token}
 *
 * Response:
 *   - coach: Coach profile data
 */
router.get('/me', withJWT, async (req: Request, res: Response) => {
  try {
    // Extract coach_id from JWT (set by auth middleware)
    const coachId = (req as any).user?.coach_id;

    if (!coachId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No coach_id in token',
      });
    }

    // Fetch coach from database
    const result = await pool.query(
      `SELECT coach_id, email, name, is_active,
              password_updated_at, last_login_at, login_count, created_at
       FROM coaches
       WHERE coach_id = $1`,
      [coachId]
    );

    if (result.rows.length === 0) {
      logger.event('auth.profile_not_found', { coach_id: coachId });
      return res.status(404).json({
        error: 'Coach not found',
        message: 'Coach profile not found',
      });
    }

    const coach = result.rows[0];

    logger.event('auth.profile_fetched', { coach_id: coachId });

    return res.status(200).json({
      coach: {
        coach_id: coach.coach_id,
        email: coach.email,
        name: coach.name,
        is_active: coach.is_active,
        password_updated_at: coach.password_updated_at,
        last_login_at: coach.last_login_at,
        login_count: coach.login_count,
        created_at: coach.created_at,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get profile error');
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred fetching profile',
    });
  }
});

// ============================================================================
// POST /api/auth/refresh
// ============================================================================

/**
 * Refresh access token
 *
 * Exchanges refresh token for new access token
 *
 * Request Body:
 *   - refresh_token: Valid refresh token
 *
 * Response:
 *   - access_token: New short-lived JWT
 *   - expires_in: Token expiry in seconds
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body as RefreshRequest;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch (error) {
      logger.event('auth.refresh_failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return res.status(401).json({
        error: 'Invalid token',
        message: error instanceof Error ? error.message : 'Token verification failed',
      });
    }

    // Verify coach still exists and is active
    const result = await pool.query(
      `SELECT coach_id, email, name, is_active
       FROM coaches
       WHERE coach_id = $1`,
      [payload.coach_id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      logger.event('auth.refresh_failed', {
        coach_id: payload.coach_id,
        reason: 'inactive_or_deleted',
      });
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Account is no longer active',
      });
    }

    const coach = result.rows[0];

    // Generate new access token
    const tokens = generateTokenPair(
      coach.coach_id,
      coach.coach_id,
      coach.email,
      'coach'
    );

    logger.event('auth.token_refreshed', { coach_id: coach.coach_id });

    return res.status(200).json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    });
  } catch (error) {
    logger.error({ error }, 'Refresh token error');
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred refreshing token',
    });
  }
});

// ============================================================================
// POST /api/auth/logout
// ============================================================================

/**
 * Logout endpoint
 *
 * Currently just returns success (client should discard tokens)
 * In future: Add token blacklist for revocation
 *
 * Response:
 *   - message: Success message
 */
router.post('/logout', withJWT, async (req: Request, res: Response) => {
  try {
    const coachId = (req as any).user?.coach_id;

    if (coachId) {
      logger.event('auth.logout', { coach_id: coachId });
    }

    // TODO: Add token blacklist/revocation if needed
    // For now, client-side token deletion is sufficient

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Logout error');
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during logout',
    });
  }
});

// ============================================================================
// POST /api/auth/change-password
// ============================================================================

/**
 * Change password endpoint
 *
 * Requires JWT authentication
 * Updates coach password after verifying old password
 *
 * Request Body:
 *   - old_password: Current password
 *   - new_password: New password
 *
 * Response:
 *   - message: Success message
 */
router.post('/change-password', withJWT, async (req: Request, res: Response) => {
  try {
    const coachId = (req as any).user?.coach_id;

    if (!coachId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const { old_password, new_password } = req.body as ChangePasswordRequest;

    if (!old_password || !new_password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Both old and new passwords are required',
      });
    }

    // Validate new password strength
    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters',
      });
    }

    // Fetch current password hash
    const result = await pool.query(
      `SELECT password_hash FROM coaches WHERE coach_id = $1`,
      [coachId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Coach not found',
        message: 'Coach profile not found',
      });
    }

    const currentHash = result.rows[0].password_hash;

    // Verify old password
    const passwordValid = await comparePassword(old_password, currentHash);

    if (!passwordValid) {
      logger.event('auth.password_change_failed', {
        coach_id: coachId,
        reason: 'invalid_old_password',
      });
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update password
    await pool.query(
      `UPDATE coaches
       SET password_hash = $1,
           password_updated_at = NOW()
       WHERE coach_id = $2`,
      [newHash, coachId]
    );

    logger.event('auth.password_changed', { coach_id: coachId });

    return res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Change password error');
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred changing password',
    });
  }
});

export default router;
