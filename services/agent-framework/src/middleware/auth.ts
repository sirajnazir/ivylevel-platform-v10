/**
 * JWT Authentication Middleware
 *
 * Provides middleware functions for protecting routes with JWT authentication
 * and extracting coach_id for RLS enforcement.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const logger = createLogger('auth-middleware');

// ============================================================================
// Extend Express Request Type
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        coach_id: string;
        email: string;
        role: string;
      };
    }
  }
}

// ============================================================================
// JWT Authentication Middleware
// ============================================================================

/**
 * Require JWT authentication
 *
 * Verifies JWT token from Authorization header and adds user to request
 * Returns 401 if token is missing or invalid
 *
 * Usage:
 *   router.get('/protected', withJWT, async (req, res) => {
 *     const coachId = req.user.coach_id;
 *     // ... route logic
 *   });
 */
export function withJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logger.event('auth.jwt_missing', { path: req.path });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      return;
    }

    // Verify token
    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      logger.event('auth.jwt_verification_failed', {
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(401).json({
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid token',
      });
      return;
    }

    // Validate required fields
    if (!payload.coach_id || !payload.email) {
      logger.event('auth.jwt_missing_fields', { path: req.path });
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token missing required fields (coach_id, email)',
      });
      return;
    }

    // Add user to request
    req.user = {
      user_id: payload.user_id,
      coach_id: payload.coach_id,
      email: payload.email,
      role: payload.role,
    };

    logger.event('auth.jwt_authenticated', {
      path: req.path,
      coach_id: payload.coach_id,
      email: payload.email,
    });

    next();
  } catch (error) {
    logger.error({ error, path: req.path }, 'JWT middleware error');
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication error',
    });
  }
}

/**
 * Optional JWT authentication
 *
 * Verifies JWT token if present, but allows request to proceed without token
 * Useful for routes that have different behavior for authenticated users
 *
 * Usage:
 *   router.get('/mixed', withOptionalJWT, async (req, res) => {
 *     if (req.user) {
 *       // Authenticated user
 *     } else {
 *       // Anonymous user
 *     }
 *   });
 */
export function withOptionalJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided - continue without authentication
      next();
      return;
    }

    // Try to verify token
    try {
      const payload = verifyToken(token);

      if (payload.coach_id && payload.email) {
        req.user = {
          user_id: payload.user_id,
          coach_id: payload.coach_id,
          email: payload.email,
          role: payload.role,
        };

        logger.event('auth.optional_jwt_authenticated', {
          path: req.path,
          coach_id: payload.coach_id,
        });
      }
    } catch (error) {
      // Invalid token - continue without authentication
      logger.event('auth.optional_jwt_failed', { path: req.path });
    }

    next();
  } catch (error) {
    logger.error({ error, path: req.path }, 'Optional JWT middleware error');
    // Don't block request on error - continue without authentication
    next();
  }
}

/**
 * Require specific role
 *
 * Must be used after withJWT middleware
 * Returns 403 if user doesn't have required role
 *
 * Usage:
 *   router.post('/admin', withJWT, withRole('admin'), async (req, res) => {
 *     // Only admin users can access
 *   });
 */
export function withRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.event('auth.role_check_failed', {
        path: req.path,
        reason: 'no_user',
      });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== requiredRole) {
      logger.event('auth.role_check_failed', {
        path: req.path,
        role: req.user.role,
        required: requiredRole,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: `This endpoint requires '${requiredRole}' role`,
      });
      return;
    }

    logger.event('auth.role_check_passed', {
      path: req.path,
      role: req.user.role,
    });
    next();
  };
}

/**
 * Require one of multiple roles
 *
 * Must be used after withJWT middleware
 * Returns 403 if user doesn't have any of the allowed roles
 *
 * Usage:
 *   router.get('/data', withJWT, withAnyRole(['coach', 'admin']), async (req, res) => {
 *     // Coaches and admins can access
 *   });
 */
export function withAnyRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.event('auth.role_check_failed', {
        path: req.path,
        reason: 'no_user',
      });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.event('auth.role_check_failed', {
        path: req.path,
        role: req.user.role,
        allowed: allowedRoles,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: `This endpoint requires one of: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    logger.event('auth.role_check_passed', {
      path: req.path,
      role: req.user.role,
    });
    next();
  };
}

/**
 * Extract coach_id for RLS context
 *
 * Helper function to get coach_id from authenticated request
 * Throws error if not authenticated (use after withJWT)
 *
 * Usage:
 *   router.get('/sessions', withJWT, async (req, res) => {
 *     const coachId = getCoachId(req);
 *     // Use coachId for RLS queries
 *   });
 */
export function getCoachId(req: Request): string {
  if (!req.user || !req.user.coach_id) {
    throw new Error('No coach_id in authenticated request');
  }
  return req.user.coach_id;
}

/**
 * Get coach_id or return default
 *
 * Helper function to get coach_id with fallback
 * Useful for optional authentication scenarios
 *
 * Usage:
 *   router.get('/public', withOptionalJWT, async (req, res) => {
 *     const coachId = getCoachIdOrDefault(req, 'jenny');
 *     // Use coachId (from JWT or default)
 *   });
 */
export function getCoachIdOrDefault(req: Request, defaultCoachId: string): string {
  return req.user?.coach_id || defaultCoachId;
}
