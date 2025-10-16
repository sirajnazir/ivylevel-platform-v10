# Agent Framework API Usage Guide

**Version:** v1.0
**Last Updated:** 2025-10-16
**Base URL:** `http://localhost:8788` (development)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
3. [Request/Response Examples](#requestresponse-examples)
4. [Agent Details](#agent-details)
5. [Error Handling](#error-handling)
6. [Integration Guide](#integration-guide)

---

## Quick Start

### 1. Start the Agent Server

```bash
cd services/agent-framework
pnpm dev:agents
```

Server starts on port **8788** by default (configurable via `AGENT_PORT` env variable).

### 2. Test Health Check

```bash
curl http://localhost:8788/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "agent-framework",
  "version": "1.0.0",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

### 3. Execute Your First Agent Query

```bash
curl -X POST http://localhost:8788/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "huda-2025",
    "message": "What is my game plan?"
  }'
```

---

## API Endpoints

### 1. Execute Agent
**POST** `/api/agents/chat`

Execute an agent with a user message. Agent is automatically selected based on query intent, or you can specify one.

**Request Body:**
```typescript
{
  student_id: string;        // Required: Student UUID
  message: string;           // Required: User query
  agent_id?: string;         // Optional: Specify agent (auto-route if omitted)
  session_id?: string;       // Optional: Continue existing session
}
```

**Response:**
```typescript
{
  answer: string;            // Agent's response
  chips: Array<{            // Evidence citations
    kind: 'evidence' | 'insight' | 'source';
    text: string;           // Display text (e.g., "v_awards_won")
  }>;
  hits: any[];              // Raw data hits from queries
  debug: {                  // Debug information
    agent_id: string;       // Which agent executed
    tools_called: string[]; // Tools used
    took_ms: number;        // Response time
  };
  session_id: string;       // Session ID for follow-up queries
  handoff?: {               // Optional: Suggested agent handoff
    to_agent: string;       // Target agent ID
    reason: string;         // Why handoff suggested
  };
}
```

---

### 2. List All Agents
**GET** `/api/agents/list`

Get list of all available agents.

**Response:**
```typescript
{
  agents: Array<{
    agent_id: string;        // e.g., "gameplan-agent"
    display_name: string;    // e.g., "Jenny - Game Plan Advisor"
    tagline: string;         // e.g., "your college application planning strategist"
    category: string;        // e.g., "gameplan"
    version: string;         // e.g., "1.0.0"
    tools_count: number;     // Number of tools available
    intents_count: number;   // Number of intent patterns
  }>
}
```

---

### 3. Get Agent Details
**GET** `/api/agents/:agent_id`

Get detailed information about a specific agent.

**URL Parameters:**
- `agent_id`: Agent identifier (e.g., `gameplan-agent`)

**Response:**
```typescript
{
  agent_id: string;
  display_name: string;
  tagline: string;
  category: string;
  version: string;
  jtbd: {                    // Jobs to be Done
    student: string;         // Student's goal
    parent: string;          // Parent's goal
    success_metric: string;  // Success criteria
  };
  tools: Array<{            // Available tools
    name: string;           // e.g., "get_ecs_list"
    description: string;    // Tool description
  }>;
  intents: Array<{          // Intent patterns
    intent_id: string;      // e.g., "gameplan.overview"
    category: string;       // e.g., "gameplan"
    patterns: string[];     // Matching patterns
    priority: number;       // Routing priority
  }>;
  handoffs: string[];       // Agents this can hand off to
}
```

---

### 4. Get Usage Statistics
**GET** `/api/agents/stats`

Get usage statistics for all agents.

**Response:**
```typescript
{
  total_agents: number;
  total_requests: number;
  agents: Array<{
    agent_id: string;
    display_name: string;
    request_count: number;
    last_used: string;       // ISO timestamp
    status: 'active' | 'inactive';
  }>;
}
```

---

### 5. Get Session Statistics
**GET** `/api/agents/sessions/stats`

Get session management statistics.

**Response:**
```typescript
{
  total_sessions: number;
  active_sessions: number;
  sessions: Array<{
    session_id: string;
    student_id: string;
    turn_count: number;
    created_at: string;      // ISO timestamp
    last_active: string;     // ISO timestamp
  }>;
}
```

---

### 6. Clean Up Old Sessions
**POST** `/api/agents/sessions/cleanup`

Remove old inactive sessions from memory.

**Request Body:**
```typescript
{
  max_age_ms?: number;       // Optional: Max session age in ms (default: 1 hour)
}
```

**Response:**
```typescript
{
  cleared_count: number;     // Number of sessions removed
  max_age_ms: number;        // Max age used
}
```

---

## Request/Response Examples

### Example 1: Auto-Routed Query (Game Plan)

**Request:**
```bash
curl -X POST http://localhost:8788/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "huda-2025",
    "message": "What should I focus on this month?"
  }'
```

**Response:**
```json
{
  "answer": "Based on your profile, here's what to focus on this month:\n\n**Week 1-2 (Most Urgent):**\n1. Finalize your Common App essay first draft...",
  "chips": [
    {
      "kind": "evidence",
      "text": "v_gameplan_summary_initial"
    }
  ],
  "hits": [...],
  "debug": {
    "agent_id": "gameplan-agent",
    "tools_called": ["get_game_plan"],
    "took_ms": 10810
  },
  "session_id": "sess_huda-2025_1697462400000"
}
```

---

### Example 2: Specific Agent Request (Awards)

**Request:**
```bash
curl -X POST http://localhost:8788/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "huda-2025",
    "message": "What awards do I have?",
    "agent_id": "awards-agent"
  }'
```

**Response:**
```json
{
  "answer": "Here's a summary of your current awards:\n\n### Award Summary\n1. **NCWIT Aspirations in Computing**...",
  "chips": [
    {
      "kind": "evidence",
      "text": "v_awards_won"
    }
  ],
  "hits": [...],
  "debug": {
    "agent_id": "awards-agent",
    "tools_called": ["get_awards_list"],
    "took_ms": 5179
  },
  "session_id": "sess_huda-2025_1697462401000"
}
```

---

### Example 3: Multi-Turn Conversation

**Turn 1:**
```bash
curl -X POST http://localhost:8788/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "huda-2025",
    "message": "What are my chances at Stanford?"
  }'
```

**Response:**
```json
{
  "answer": "### Stanford University Chances Assessment\n\n**Benchmarks:**...",
  "session_id": "sess_huda-2025_1697462402000",
  ...
}
```

**Turn 2 (continue same session):**
```bash
curl -X POST http://localhost:8788/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "huda-2025",
    "message": "What about MIT?",
    "session_id": "sess_huda-2025_1697462402000"
  }'
```

---

### Example 4: List Available Agents

**Request:**
```bash
curl http://localhost:8788/api/agents/list
```

**Response:**
```json
{
  "agents": [
    {
      "agent_id": "gameplan-agent",
      "display_name": "Jenny - Game Plan Advisor",
      "tagline": "your college application planning strategist",
      "category": "gameplan",
      "version": "1.0.0",
      "tools_count": 4,
      "intents_count": 3
    },
    {
      "agent_id": "ecs-agent",
      "display_name": "Jenny - Extracurriculars Advisor",
      "tagline": "your EC portfolio strategist",
      "category": "ecs",
      "version": "1.0.0",
      "tools_count": 2,
      "intents_count": 4
    },
    ...
  ]
}
```

---

### Example 5: Get Agent Details

**Request:**
```bash
curl http://localhost:8788/api/agents/gameplan-agent
```

**Response:**
```json
{
  "agent_id": "gameplan-agent",
  "display_name": "Jenny - Game Plan Advisor",
  "tagline": "your college application planning strategist",
  "category": "gameplan",
  "version": "1.0.0",
  "jtbd": {
    "student": "I want to understand my overall college application strategy and know what to prioritize next",
    "parent": "I want to see my child application plan and ensure they are on track",
    "success_metric": "Student has clear understanding of their plan and next actions"
  },
  "tools": [
    {
      "name": "get_game_plan",
      "description": "Get student's comprehensive game plan including narrative framework, award targets, EC targets, and program targets"
    },
    ...
  ],
  "intents": [
    {
      "intent_id": "gameplan.overview",
      "category": "gameplan",
      "patterns": [
        "what is my game plan",
        "show me my application plan",
        "what should i be working on",
        "timeline",
        "application strategy"
      ],
      "priority": 1
    },
    ...
  ],
  "handoffs": ["ecs-agent", "awards-agent", "programs-agent", "college-agent"]
}
```

---

## Agent Details

### Available Agents

| Agent ID | Display Name | Specialty | Tools | Intents |
|----------|--------------|-----------|-------|---------|
| `gameplan-agent` | Jenny - Game Plan Advisor | Overall application strategy | 4 | 3 |
| `ecs-agent` | Jenny - Extracurriculars Advisor | EC portfolio analysis | 2 | 4 |
| `awards-agent` | Jenny - Awards & Honors Advisor | Awards strategy | 2 | 4 |
| `programs-agent` | Jenny - Summer Programs Advisor | Program selection | 3 | 4 |
| `college-agent` | Jenny - College List Advisor | College chances & list building | 7 | 5 |

### Agent Routing

Agents are automatically selected based on query intent patterns:

**Example Routing:**
- "What is my game plan?" → `gameplan-agent`
- "Show me my extracurriculars" → `ecs-agent`
- "What awards do I have?" → `awards-agent`
- "Which summer programs?" → `programs-agent`
- "What are my chances at Stanford?" → `college-agent`

**Default:** If no pattern matches, defaults to `gameplan-agent`.

### Agent Tools

Each agent has access to specific tools (v14 SQL resolvers wrapped as OpenAI functions):

**GamePlan Tools:**
- `get_game_plan` - Comprehensive game plan summary
- `get_vitals` - Student vitals (GPA, SAT, school)
- `get_ecs_list` - Extracurricular activities
- `get_awards_list` - Awards and honors

**ECs Tools:**
- `get_ecs_list` - Extracurricular activities
- `get_vitals` - Student vitals

**Awards Tools:**
- `get_awards_list` - Awards and honors
- `get_vitals` - Student vitals

**Programs Tools:**
- `get_programs_list` - Student's program applications
- `get_summer_programs_catalog` - Knowledge Moat catalog
- `get_vitals` - Student vitals

**College Tools:**
- `get_college_benchmark` - College CDS data (DS1)
- `get_college_rubric` - College rubric factors (DS2)
- `get_placement_history` - Hyperlocal placement (DS3+DS4)
- `find_similar_profiles` - Student twins (DS5)
- `get_sat_scores` - SAT scores
- `get_gpa_records` - GPA records
- `get_vitals` - Student vitals

---

## Error Handling

### Common Errors

**400 Bad Request - Missing Required Fields**
```json
{
  "error": "Missing required fields: student_id, message"
}
```

**404 Not Found - Agent Not Found**
```json
{
  "error": "Agent not found: invalid-agent-id"
}
```

**404 Not Found - Session Not Found**
```json
{
  "error": "Session not found: sess_invalid_123"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "Tool execution failed: get_ecs_list",
  "details": "..." // Only in development mode
}
```

### Error Response Format

All errors follow this structure:
```typescript
{
  error: string;           // Error type
  message?: string;        // Detailed message
  details?: string;        // Stack trace (development only)
}
```

---

## Integration Guide

### Next.js Integration

**1. Create API Route Handler**

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const AGENT_API = process.env.AGENT_API_URL || 'http://localhost:8788';

export async function POST(req: NextRequest) {
  const { student_id, message, session_id } = await req.json();

  const response = await fetch(`${AGENT_API}/api/agents/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, message, session_id }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

**2. Client-Side Hook**

```typescript
// hooks/useAgent.ts
import { useState } from 'react';

export function useAgent() {
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const chat = async (studentId: string, message: string) => {
    setLoading(true);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        message,
        session_id: sessionId,
      }),
    });

    const data = await response.json();
    setSessionId(data.session_id);
    setLoading(false);

    return data;
  };

  return { chat, loading, sessionId };
}
```

**3. React Component**

```typescript
// components/ChatBox.tsx
'use client';

import { useState } from 'react';
import { useAgent } from '@/hooks/useAgent';

export function ChatBox({ studentId }: { studentId: string }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const { chat, loading } = useAgent();

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: input }]);

    // Get agent response
    const response = await chat(studentId, input);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: response.answer, chips: response.chips },
    ]);

    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
            {msg.chips && (
              <div className="chips">
                {msg.chips.map((chip: any, j: number) => (
                  <span key={j} className="chip">{chip.text}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Ask Jenny..."
        disabled={loading}
      />
      <button onClick={handleSend} disabled={loading}>
        {loading ? 'Thinking...' : 'Send'}
      </button>
    </div>
  );
}
```

---

### Testing with curl

**Quick Test Script:**

```bash
#!/bin/bash

# test-agent-api.sh
AGENT_API="http://localhost:8788"
STUDENT_ID="huda-2025"

# Test 1: Health check
echo "1. Health Check"
curl -s $AGENT_API/health | jq .
echo ""

# Test 2: List agents
echo "2. List Agents"
curl -s $AGENT_API/api/agents/list | jq '.agents[] | {id: .agent_id, name: .display_name}'
echo ""

# Test 3: Execute query
echo "3. Execute Query"
curl -s -X POST $AGENT_API/api/agents/chat \
  -H "Content-Type: application/json" \
  -d "{\"student_id\": \"$STUDENT_ID\", \"message\": \"What is my game plan?\"}" \
  | jq '{answer: .answer, agent: .debug.agent_id, tools: .debug.tools_called}'
echo ""

# Test 4: Get stats
echo "4. Usage Stats"
curl -s $AGENT_API/api/agents/stats | jq .
echo ""
```

**Run:**
```bash
chmod +x test-agent-api.sh
./test-agent-api.sh
```

---

## Environment Variables

**Required:**
```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/ivylevel
OPENAI_API_KEY=sk-...
JENNY_V9_EQ_MODEL=gpt-4o-mini  # or gpt-4o
```

**Optional:**
```bash
AGENT_PORT=8788                # Default: 8788
NODE_ENV=development           # development | production
```

---

## Performance Notes

**Average Response Times (from tests):**
- GamePlan queries: ~8-11s
- Awards queries: ~5s
- ECs queries: ~5s
- Programs queries: ~10-13s (multiple Knowledge Moat queries)
- College queries: ~10-11s (multiple Knowledge Moat queries)

**Factors Affecting Speed:**
- Number of tools called
- Number of Knowledge Moat queries
- Database query complexity
- OpenAI API latency
- Function calling iterations (up to 5)

**Optimization Ideas:**
- Parallel tool execution (currently sequential)
- Knowledge Moat query caching
- Database connection pooling
- Response streaming (for long answers)

---

## Next Steps

1. **Multi-Turn Testing:** Test conversation memory across multiple turns
2. **Handoff Testing:** Test agent-to-agent handoffs
3. **Error Cases:** Test with invalid student IDs, missing data
4. **Performance:** Optimize response times with parallel execution
5. **Integration:** Connect to test-chat-ui frontend

---

## Support

**Documentation:**
- Master Spec: `/docs/MASTER_PROD_TECH_SPEC.md`
- Database Schema: `/docs/PROD_DB_ARCH.md`
- Test Results: `/services/agent-framework/TEST_RESULTS.md`

**Code Locations:**
- Agents: `/services/agent-framework/src/agents/`
- Tools: `/services/agent-framework/src/tools/resolverTools.ts`
- Routes: `/services/agent-framework/src/routes/agents.ts`
- Server: `/services/agent-framework/src/server-agents.ts`
