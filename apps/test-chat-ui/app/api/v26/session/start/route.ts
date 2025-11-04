/**
 * v26 Session Start API Proxy
 * Proxies session start requests to agent-framework backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.AGENT_FRAMEWORK_URL || 'http://localhost:8787';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[V26_SESSION_START_PROXY] Forwarding request:', body);

    const response = await fetch(`${BACKEND_URL}/api/v26/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.AGENT_API_KEY || 'test-key',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[V26_SESSION_START_PROXY] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Backend request failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[V26_SESSION_START_PROXY] Success:', data);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[V26_SESSION_START_PROXY] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
