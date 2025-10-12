/**
 * v8.0: Proof Verification Service
 * Cryptographic verification of artifacts with hash checking
 */

import crypto from 'crypto';

export interface ProofArtifact {
  artifact_id: string;
  chip_id?: string;
  content: string;
  artifact_type: 'chip' | 'session' | 'outcome' | 'plan';
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
 */
export async function registerProof(
  artifact: ProofArtifact,
  db: any // database client
): Promise<ProofRegistry> {
  const hash = generateHash(artifact.content);
  const score = calculateProofScore(artifact, {
    hasChipReference: !!artifact.chip_id,
    hasCitation: !!artifact.metadata?.citation,
    hasTimestamp: !!artifact.metadata?.timestamp,
    hasSource: !!artifact.metadata?.source_id,
    contentLength: artifact.content.length,
  });

  const result = await db.query(
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

  return result.rows[0];
}

/**
 * Verify proof by artifact_id
 */
export async function verifyProof(
  artifactId: string,
  currentContent: string,
  db: any
): Promise<ProofVerificationResult> {
  const result = await db.query(
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
  await db.query(
    `INSERT INTO proof_audit_log (artifact_id, action, actor, new_score, reason)
     VALUES ($1, 'verify', 'system', $2, $3)`,
    [artifactId, storedProof.score, issues.join('; ') || 'Verification successful']
  );

  return {
    verified,
    score: storedProof.score,
    hash: hashCheck.actualHash,
    timestamp: storedProof.timestamp,
    artifact_id: artifactId,
    issues: issues.length > 0 ? issues : undefined,
  };
}

/**
 * Escalate to reviewer if proof score is below threshold
 */
export async function escalateToReviewer(
  artifactId: string,
  reason: string,
  db: any
): Promise<void> {
  await db.query(
    `INSERT INTO proof_audit_log (artifact_id, action, actor, reason, metadata)
     VALUES ($1, 'escalate', 'system', $2, $3)`,
    [
      artifactId,
      reason,
      JSON.stringify({ escalated_at: new Date().toISOString(), requires_manual_review: true }),
    ]
  );

  console.warn(`[ProofVerifier] Escalated artifact ${artifactId} to reviewer: ${reason}`);
}

/**
 * Get proof health metrics
 */
export async function getProofHealthMetrics(db: any): Promise<{
  totalArtifacts: number;
  verifiedCount: number;
  avgScore: number;
  verificationRate: number;
  byType: Record<string, { count: number; avgScore: number }>;
}> {
  const result = await db.query(`
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
}

/**
 * Batch verify multiple artifacts
 */
export async function batchVerifyProofs(
  artifacts: Array<{ artifactId: string; content: string }>,
  db: any
): Promise<ProofVerificationResult[]> {
  const results: ProofVerificationResult[] = [];

  for (const artifact of artifacts) {
    const result = await verifyProof(artifact.artifactId, artifact.content, db);
    results.push(result);
  }

  return results;
}
