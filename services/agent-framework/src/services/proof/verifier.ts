/**
 * Proof Verification Service v11.1 (v8.0 Migration)
 *
 * CAT-2/CAT-3 COMPONENT - Does NOT touch CAT-1 infrastructure
 *
 * Purpose: Cryptographic verification of KB/RAG and EQ/coaching artifacts
 * - CAT-1 (SQL): NOT USED (SQL responses are fact-verified by design, no proof needed)
 * - CAT-2 (KB/RAG): Register proofs with chip_id linkage + citation scoring
 * - CAT-3 (EQ/Coaching): Register proofs for tone/warmth artifacts
 *
 * Safety: Uses v8.0 tables (proof_registry, proof_audit_log) - zero CAT-1 overlap
 *
 * Integration Point: Called AFTER compose step in orchestrator
 * - Orchestrator → Compose → [registerProof] → Response
 * - Only registers if route = 'kb' OR route = 'eq' (never 'sql')
 *
 * Database Tables (v8.0):
 * - proof_registry: artifact_id, chip_id, hash, score, verified, timestamp
 * - proof_audit_log: artifact_id, action, actor, new_score, reason
 */

import crypto from 'crypto';
import { pool } from '../../db/pool.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('proof-verifier');

export interface ProofArtifact {
  artifact_id: string;
  chip_id?: string;
  content: string;
  artifact_type: 'chip' | 'kb_answer' | 'eq_answer' | 'session' | 'outcome' | 'plan';
  metadata?: Record<string, any>;
}

export interface ProofVerificationResult {
  verified: boolean;
  score: number;
  hash: string;
  timestamp: string;
  artifact_id: string;
  issues?: string[];
}

export interface ProofRegistry {
  artifact_id: string;
  chip_id?: string;
  hash: string;
  timestamp: string;
  verified: boolean;
  score: number;
  artifact_type: string;
  metadata: Record<string, any>;
}

/**
 * Generate SHA-256 hash for artifact content
 */
export function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Calculate proof score based on multiple signals
 *
 * Scoring rubric (v8.0):
 * - Chip reference (30%): Has chip_id linkage
 * - Citation (25%): Has source_id or citation metadata
 * - Timestamp (15%): Has temporal metadata
 * - Source (15%): Has source_id or provenance
 * - Content quality (15%): Length 50-5000 chars
 *
 * Threshold: ≥ 0.7 = auto-verified, < 0.7 = requires review
 */
export function calculateProofScore(artifact: ProofArtifact, options?: {
  hasChipReference?: boolean;
  hasCitation?: boolean;
  hasTimestamp?: boolean;
  hasSource?: boolean;
  contentLength?: number;
}): number {
  let score = 0.0;
  const weights = {
    chipReference: 0.30,
    citation: 0.25,
    timestamp: 0.15,
    source: 0.15,
    contentQuality: 0.15,
  };

  // Chip reference exists
  if (options?.hasChipReference && artifact.chip_id) {
    score += weights.chipReference;
  }

  // Has citation/provenance
  if (options?.hasCitation) {
    score += weights.citation;
  }

  // Has timestamp
  if (options?.hasTimestamp) {
    score += weights.timestamp;
  }

  // Has source metadata
  if (options?.hasSource || artifact.metadata?.source_id) {
    score += weights.source;
  }

  // Content quality (length and structure)
  const contentLength = options?.contentLength || artifact.content.length;
  if (contentLength > 50 && contentLength < 5000) {
    score += weights.contentQuality;
  } else if (contentLength >= 5000) {
    score += weights.contentQuality * 0.5; // partial credit for very long content
  }

  return Math.min(score, 1.0);
}

/**
 * Verify artifact against stored hash
 */
export function verifyArtifactHash(
  content: string,
  storedHash: string
): { verified: boolean; actualHash: string; matches: boolean } {
  const actualHash = generateHash(content);
  const matches = actualHash === storedHash;

  return {
    verified: matches,
    actualHash,
    matches,
  };
}

/**
 * Create proof registry entry
 *
 * SAFETY: Uses v8.0 proof_registry table (not CAT-1)
 * - Called AFTER compose for CAT-2 (KB) and CAT-3 (EQ) routes
 * - Never called for CAT-1 (SQL) routes (SQL is fact-verified by design)
 */
export async function registerProof(
  artifact: ProofArtifact
): Promise<ProofRegistry> {
  const hash = generateHash(artifact.content);
  const score = calculateProofScore(artifact, {
    hasChipReference: !!artifact.chip_id,
    hasCitation: !!artifact.metadata?.citation,
    hasTimestamp: !!artifact.metadata?.timestamp,
    hasSource: !!artifact.metadata?.source_id,
    contentLength: artifact.content.length,
  });

  const t0 = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO proof_registry
       (artifact_id, chip_id, hash, verified, score, artifact_type, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (artifact_id)
       DO UPDATE SET
         hash = EXCLUDED.hash,
         verified = EXCLUDED.verified,
         score = EXCLUDED.score,
         updated_at = NOW()
       RETURNING *`,
      [
        artifact.artifact_id,
        artifact.chip_id,
        hash,
        score >= 0.7, // auto-verify if score >= 0.7
        score,
        artifact.artifact_type,
        JSON.stringify(artifact.metadata || {}),
      ]
    );

    log.event('proof_registered', {
      artifact_id: artifact.artifact_id,
      artifact_type: artifact.artifact_type,
      chip_id: artifact.chip_id,
      score,
      verified: score >= 0.7,
      latency_ms: Date.now() - t0
    });

    return result.rows[0];
  } catch (err) {
    log.error('proof_registration_failed', { artifact_id: artifact.artifact_id, error: String(err) });
    throw err;
  }
}

/**
 * Verify proof by artifact_id
 *
 * SAFETY: Reads from proof_registry (v8.0 table, not CAT-1)
 */
export async function verifyProof(
  artifactId: string,
  currentContent: string
): Promise<ProofVerificationResult> {
  try {
    const result = await pool.query(
      'SELECT * FROM proof_registry WHERE artifact_id = $1',
      [artifactId]
    );

    if (result.rows.length === 0) {
      return {
        verified: false,
        score: 0,
        hash: '',
        timestamp: new Date().toISOString(),
        artifact_id: artifactId,
        issues: ['Artifact not found in proof registry'],
      };
    }

    const storedProof = result.rows[0];
    const hashCheck = verifyArtifactHash(currentContent, storedProof.hash);
    const issues: string[] = [];

    if (!hashCheck.matches) {
      issues.push('Hash mismatch: content has been modified');
    }

    if (storedProof.score < 0.7) {
      issues.push(`Low proof score: ${storedProof.score.toFixed(2)}`);
    }

    const verified = hashCheck.matches && storedProof.score >= 0.7;

    // Log audit event
    await pool.query(
      `INSERT INTO proof_audit_log (artifact_id, action, actor, new_score, reason)
       VALUES ($1, 'verify', 'system', $2, $3)`,
      [artifactId, storedProof.score, issues.join('; ') || 'Verification successful']
    );

    log.event('proof_verified', {
      artifact_id: artifactId,
      verified,
      score: storedProof.score,
      issues: issues.length
    });

    return {
      verified,
      score: storedProof.score,
      hash: hashCheck.actualHash,
      timestamp: storedProof.timestamp,
      artifact_id: artifactId,
      issues: issues.length > 0 ? issues : undefined,
    };
  } catch (err) {
    log.error('proof_verification_failed', { artifact_id: artifactId, error: String(err) });
    throw err;
  }
}

/**
 * Escalate to reviewer if proof score is below threshold
 *
 * SAFETY: Writes to proof_audit_log (v8.0 table, not CAT-1)
 */
export async function escalateToReviewer(
  artifactId: string,
  reason: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO proof_audit_log (artifact_id, action, actor, reason, metadata)
       VALUES ($1, 'escalate', 'system', $2, $3)`,
      [
        artifactId,
        reason,
        JSON.stringify({ escalated_at: new Date().toISOString(), requires_manual_review: true }),
      ]
    );

    log.warn('proof_escalated', { artifact_id: artifactId, reason });
  } catch (err) {
    log.error('proof_escalation_failed', { artifact_id: artifactId, error: String(err) });
    throw err;
  }
}

/**
 * Get proof health metrics
 *
 * SAFETY: Reads from proof_registry (v8.0 table, not CAT-1)
 */
export async function getProofHealthMetrics(): Promise<{
  totalArtifacts: number;
  verifiedCount: number;
  avgScore: number;
  verificationRate: number;
  byType: Record<string, { count: number; avgScore: number }>;
}> {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_artifacts,
        SUM(CASE WHEN verified THEN 1 ELSE 0 END) as verified_count,
        AVG(score) as avg_score,
        artifact_type,
        COUNT(*) FILTER (WHERE artifact_type IS NOT NULL) as type_count,
        AVG(score) FILTER (WHERE artifact_type IS NOT NULL) as type_avg_score
      FROM proof_registry
      GROUP BY ROLLUP(artifact_type)
    `);

    const byType: Record<string, { count: number; avgScore: number }> = {};
    let totalArtifacts = 0;
    let verifiedCount = 0;
    let avgScore = 0;

    for (const row of result.rows) {
      if (row.artifact_type === null) {
        totalArtifacts = parseInt(row.total_artifacts);
        verifiedCount = parseInt(row.verified_count);
        avgScore = parseFloat(row.avg_score);
      } else {
        byType[row.artifact_type] = {
          count: parseInt(row.type_count),
          avgScore: parseFloat(row.type_avg_score),
        };
      }
    }

    return {
      totalArtifacts,
      verifiedCount,
      avgScore,
      verificationRate: totalArtifacts > 0 ? verifiedCount / totalArtifacts : 0,
      byType,
    };
  } catch (err) {
    log.error('proof_health_metrics_failed', { error: String(err) });
    throw err;
  }
}

/**
 * Batch verify multiple artifacts
 *
 * SAFETY: Uses verifyProof which only touches v8.0 tables
 */
export async function batchVerifyProofs(
  artifacts: Array<{ artifactId: string; content: string }>
): Promise<ProofVerificationResult[]> {
  const results: ProofVerificationResult[] = [];

  for (const artifact of artifacts) {
    const result = await verifyProof(artifact.artifactId, artifact.content);
    results.push(result);
  }

  return results;
}
