/**
 * Agent Chat API Route (v1.0)
 * Routes queries to the agent-framework service
 * Created: 2025-10-16 (Week 5)
 */

import { NextRequest, NextResponse } from 'next/server';

// Agent service URL (configurable via environment)
// Uses AGENT_PORT from .env (defaults to 8788, but may be overridden)
const AGENT_SERVICE_URL =
  process.env.AGENT_SERVICE_URL || `http://localhost:${process.env.AGENT_PORT || '8788'}`;

/**
 * POST /api/agent-chat
 * Execute agent with user message
 *
 * Request body:
 * {
 *   student_id: string;
 *   message: string;
 *   agent_id?: string;     // Optional: specify agent
 *   session_id?: string;   // Optional: continue session
 * }
 *
 * Response:
 * {
 *   answer: string;
 *   chips: Array<{kind: string, text: string}>;
 *   hits: any[];
 *   debug: {...};
 *   session_id: string;
 *   handoff?: {...};
 * }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { student_id, message, agent_id, session_id } = body;

    // Validate required fields
    if (!student_id || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, message' },
        { status: 400 }
      );
    }

    console.log(`\n[Agent Chat] New query: "${message}"`);
    console.log(`[Agent Chat] Student: ${student_id}`);
    if (agent_id) {
      console.log(`[Agent Chat] Requested agent: ${agent_id}`);
    }
    if (session_id) {
      console.log(`[Agent Chat] Session: ${session_id}`);
    }

    // Forward to agent service
    const agentResponse = await fetch(`${AGENT_SERVICE_URL}/api/agents/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id,
        message,
        agent_id,
        session_id,
      }),
    });

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json();
      console.error('[Agent Chat] Agent service error:', errorData);
      return NextResponse.json(
        {
          error: errorData.error || 'Agent service error',
          details: errorData.message,
        },
        { status: agentResponse.status }
      );
    }

    const data = await agentResponse.json();
    const duration = Date.now() - startTime;

    console.log(
      `[Agent Chat] Response from ${data.debug?.agent_id || 'unknown'} (${duration}ms)`
    );
    console.log(`[Agent Chat] Tools called: ${data.debug?.tools_called?.join(', ') || 'none'}`);
    console.log(`[Agent Chat] Evidence chips: ${data.chips?.length || 0}`);

    // Return response in format compatible with UI
    return NextResponse.json({
      answer: data.answer,
      chips: data.chips || [],
      hits: data.hits || [],
      evidence: data.hits || [], // Compatibility with UI expecting 'evidence'
      session_id: data.session_id,
      debug: {
        agent_id: data.debug?.agent_id,
        tools_called: data.debug?.tools_called || [],
        took_ms: data.debug?.took_ms || duration,
        source: 'agent-framework',
      },
      handoff: data.handoff,
      meta: {
        executionMode: 'agent',
        agent_used: data.debug?.agent_id,
      },
    });
  } catch (error: any) {
    console.error('[Agent Chat] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-chat/list
 * List available agents
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path');

    let endpoint = '/api/agents/list';
    if (path === 'stats') {
      endpoint = '/api/agents/stats';
    }

    const agentResponse = await fetch(`${AGENT_SERVICE_URL}${endpoint}`);

    if (!agentResponse.ok) {
      throw new Error(`Agent service returned ${agentResponse.status}`);
    }

    const data = await agentResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Agent Chat] Error fetching agents:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
