/**
 * v8.0: Agent Act API
 * POST /api/agent/act
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAutonomyLoop } from '@/lib/autonomyLoop';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, action = 'full_loop' } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (action === 'full_loop') {
      const startTime = Date.now();
      const result = await runAutonomyLoop(user_id);
      const latency = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        user_id,
        result,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "full_loop"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Agent] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
