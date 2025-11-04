/**
 * v26 Agent Message API Proxy
 * Proxies agent message requests to agent-framework backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.AGENT_FRAMEWORK_URL || 'http://localhost:8787';

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();

    console.log('[V26_AGENT_MESSAGE_PROXY] Agent:', agentId, 'Body:', body);

    const response = await fetch(`${BACKEND_URL}/api/v26/agents/${agentId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.AGENT_API_KEY || 'test-key',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[V26_AGENT_MESSAGE_PROXY] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Backend request failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[V26_AGENT_MESSAGE_PROXY] Success:', {
      agent: agentId,
      response_length: data.response?.length || 0,
      intelligence_activated: data.intelligence_activated?.length || 0,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[V26_AGENT_MESSAGE_PROXY] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
