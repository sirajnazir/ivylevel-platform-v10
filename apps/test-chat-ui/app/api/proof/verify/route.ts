/**
 * v8.0: Proof Verification API Endpoint
 * POST /api/proof/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyProof, registerProof, escalateToReviewer, generateHash } from '@/lib/proofVerifier';
import { getDbClient } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artifact_id, artifact_url, content, hash, action = 'verify' } = body;

    if (!artifact_id) {
      return NextResponse.json(
        { error: 'artifact_id is required' },
        { status: 400 }
      );
    }

    const db = await getDbClient();

    // Action: verify existing proof
    if (action === 'verify') {
      if (!content && !hash) {
        return NextResponse.json(
          { error: 'Either content or hash must be provided for verification' },
          { status: 400 }
        );
      }

      const actualContent = content || '';
      const result = await verifyProof(artifact_id, actualContent, db);

      // Auto-escalate if verification fails
      if (!result.verified && result.score < 0.7) {
        await escalateToReviewer(
          artifact_id,
          `Low proof score: ${result.score.toFixed(2)}. Issues: ${result.issues?.join(', ')}`,
          db
        );
      }

      return NextResponse.json(result);
    }

    // Action: register new proof
    if (action === 'register') {
      if (!content) {
        return NextResponse.json(
          { error: 'content is required for registration' },
          { status: 400 }
        );
      }

      const { chip_id, artifact_type = 'chip', metadata = {} } = body;

      const artifact = {
        artifact_id,
        chip_id,
        content,
        artifact_type,
        metadata: {
          ...metadata,
          artifact_url,
          registered_at: new Date().toISOString(),
        },
      };

      const registered = await registerProof(artifact, db);

      return NextResponse.json({
        success: true,
        artifact_id: registered.artifact_id,
        hash: registered.hash,
        score: registered.score,
        verified: registered.verified,
      });
    }

    // Action: get proof health
    if (action === 'health') {
      const healthResult = await db.query('SELECT * FROM v_proof_health LIMIT 30');
      return NextResponse.json({
        health: healthResult.rows,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "verify", "register", or "health"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[ProofVerify] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const artifactId = searchParams.get('artifact_id');

    if (!artifactId) {
      return NextResponse.json(
        { error: 'artifact_id query parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDbClient();
    const result = await db.query(
      'SELECT * FROM proof_registry WHERE artifact_id = $1',
      [artifactId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('[ProofVerify] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
