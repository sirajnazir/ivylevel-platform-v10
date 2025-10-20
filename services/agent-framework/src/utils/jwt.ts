/**
 * JWT Utility Functions for Authentication
 *
 * Provides token generation, verification, and password hashing utilities
 * for self-hosted authentication system with coach_id support.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ============================================================================
// Environment Variables
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '1h'; // 1 hour
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface JWTPayload {
  user_id: string;
  coach_id: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate access token with coach_id for RLS enforcement
 *
 * @param userId - User/coach unique identifier
 * @param coachId - Coach ID for RLS (e.g., 'jenny')
 * @param email - Coach email address
 * @param role - User role (default: 'coach')
 * @returns JWT access token (short-lived)
 */
export function generateAccessToken(
  userId: string,
  coachId: string,
  email: string,
  role: string = 'coach'
): string {
  const payload: JWTPayload = {
    user_id: userId,
    coach_id: coachId,
    email,
    role,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
    issuer: 'ivylevel-agent-framework',
    audience: 'ivylevel-platform',
  });
}

/**
 * Generate refresh token for token renewal
 *
 * @param userId - User/coach unique identifier
 * @param coachId - Coach ID for RLS
 * @param email - Coach email address
 * @returns JWT refresh token (long-lived)
 */
export function generateRefreshToken(
  userId: string,
  coachId: string,
  email: string
): string {
  const payload: JWTPayload = {
    user_id: userId,
    coach_id: coachId,
    email,
    role: 'coach',
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
    issuer: 'ivylevel-agent-framework',
    audience: 'ivylevel-platform',
  });
}

/**
 * Generate both access and refresh tokens
 *
 * @param userId - User/coach unique identifier
 * @param coachId - Coach ID for RLS
 * @param email - Coach email address
 * @param role - User role
 * @returns Token pair object
 */
export function generateTokenPair(
  userId: string,
  coachId: string,
  email: string,
  role: string = 'coach'
): TokenPair {
  const access_token = generateAccessToken(userId, coachId, email, role);
  const refresh_token = generateRefreshToken(userId, coachId, email);

  // Calculate expiry in seconds (for frontend)
  const expiresIn = JWT_ACCESS_EXPIRY.endsWith('h')
    ? parseInt(JWT_ACCESS_EXPIRY) * 3600
    : JWT_ACCESS_EXPIRY.endsWith('m')
    ? parseInt(JWT_ACCESS_EXPIRY) * 60
    : 3600; // default 1 hour

  return {
    access_token,
    refresh_token,
    expires_in: expiresIn,
  };
}

// ============================================================================
// Token Verification
// ============================================================================

/**
 * Verify and decode JWT token
 *
 * @param token - JWT token to verify
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'ivylevel-agent-framework',
      audience: 'ivylevel-platform',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Verify token and extract coach_id for RLS
 *
 * @param token - JWT token to verify
 * @returns Coach ID for RLS filtering
 * @throws Error if token is invalid or missing coach_id
 */
export function extractCoachId(token: string): string {
  const payload = verifyToken(token);

  if (!payload.coach_id) {
    throw new Error('Token missing coach_id');
  }

  return payload.coach_id;
}

/**
 * Verify refresh token (ensures type is 'refresh')
 *
 * @param token - Refresh token to verify
 * @returns Decoded payload if valid refresh token
 * @throws Error if not a refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  const payload = verifyToken(token);

  if (payload.type !== 'refresh') {
    throw new Error('Not a refresh token');
  }

  return payload;
}

// ============================================================================
// Password Hashing
// ============================================================================

/**
 * Hash password using bcrypt
 *
 * @param password - Plain text password
 * @param saltRounds - Bcrypt salt rounds (default: 10)
 * @returns Hashed password
 */
export async function hashPassword(
  password: string,
  saltRounds: number = 10
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 *
 * @param password - Plain text password
 * @param hash - Bcrypt hash from database
 * @returns True if password matches
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value (e.g., 'Bearer token123')
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Check if token is expired without throwing error
 *
 * @param token - JWT token to check
 * @returns True if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return false;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return true;
    }
    // Other errors (invalid token, etc.) also count as "expired"
    return true;
  }
}

/**
 * Decode token without verification (for debugging)
 * WARNING: Do not use for authentication, only logging/debugging
 *
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
export function decodeTokenUnsafe(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
