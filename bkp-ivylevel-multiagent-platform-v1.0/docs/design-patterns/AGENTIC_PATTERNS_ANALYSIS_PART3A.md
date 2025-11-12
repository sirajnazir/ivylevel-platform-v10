# Agentic Design Patterns Analysis - Part 3-A
## IvyLevel Platform v10 Assessment

**Assessment Date**: 2025-10-28
**IvyLevel Version**: v10.1
**Book Reference**: "Agentic Design Patterns" by Antonio Gulli (Part 3-A: Chapters 13-16)
**Analyst**: Claude Code

---

## Executive Summary

This analysis evaluates the IvyLevel Platform v10's implementation against **four advanced agentic patterns** from Part 3-A of "Agentic Design Patterns":

1. **Human-in-the-Loop (HITL)** - Chapter 13
2. **Knowledge Retrieval (RAG)** - Chapter 14
3. **Inter-Agent Communication (A2A)** - Chapter 15
4. **Resource-Aware Optimization** - Chapter 16

### Overall Assessment: 5.8/10

| Pattern | Score | Status |
|---------|-------|--------|
| Human-in-the-Loop (HITL) | 4/10 | 🟡 Partial - Basic monitoring, no escalation |
| Knowledge Retrieval (RAG) | 9/10 | 🟢 Strong - Full hybrid RAG with reranking |
| Inter-Agent Communication (A2A) | 6/10 | 🟡 Moderate - Internal handoffs, no A2A protocol |
| Resource-Aware Optimization | 4/10 | 🟡 Partial - Static model config, no dynamic selection |

### Key Findings

**Strengths:**
- ✅ **Production-grade RAG**: IvyLevel has sophisticated hybrid search combining Pinecone vector search, lexical search, and Cohere reranking
- ✅ **Conversation persistence**: Full conversation history with session management and analytics
- ✅ **Agent handoffs**: Multi-agent architecture with context-aware handoffs between 9 specialized agents
- ✅ **Notification infrastructure**: Multi-channel notification system (SMS, email, in-app, push)

**Critical Gaps:**
- ❌ **No human escalation policies**: Agents cannot escalate complex or sensitive issues to human coaches
- ❌ **No feedback collection**: Missing satisfaction ratings (👍/👎) or quality feedback from students
- ❌ **No A2A protocol**: Agents communicate internally but don't expose standard A2A interfaces
- ❌ **No dynamic model selection**: Single model per agent, no cost/latency-based routing
- ❌ **No fallback mechanisms**: No circuit breakers or model fallbacks for failures

---

## Chapter 13: Human-in-the-Loop (HITL) Pattern

### Pattern Definition (from book)

**Human-in-the-Loop (HITL)** integrates human intelligence into AI workflows to ensure safety, ethics, and effectiveness. Key aspects:

1. **Human Oversight**: Monitoring AI agent performance via logs, dashboards, or real-time supervision
2. **Intervention and Correction**: Humans rectify errors, supply missing data, or guide agents when they make mistakes
3. **Human Feedback for Learning**: Feedback loops (e.g., RLHF) where human input improves model behavior
4. **Decision Augmentation**: AI provides analysis/recommendations, humans make final decisions
5. **Human-Agent Collaboration**: Cooperative interaction leveraging respective strengths
6. **Escalation Policies**: Protocols defining when agents should hand off to humans

**Applications**: Content moderation, autonomous driving, fraud detection, legal review, customer support, data labeling

**Caveats**: Scalability limitations, dependence on domain experts, privacy concerns

### Current IvyLevel Implementation

#### 1. Human Oversight: 6/10 (Moderate)

**Evidence Found:**

```typescript
// services/agent-framework/src/repositories/ConversationRepository.ts:86-535

export class ConversationRepository {
  // Comprehensive conversation logging
  async recordTurn(session, userMessage, result, agentManifest) {
    // Logs every turn with:
    // - User message
    // - Agent response
    // - Tools called
    // - Execution time
    // - Tokens used
    // - Handoff suggestions
    // - Errors
  }

  // Session analytics
  async getConversationAnalytics(sessionId: string) // v_conversation_analytics view

  // Agent performance metrics
  async getAgentPerformanceMetrics() // v_agent_performance view

  // Search conversations by filters
  async searchConversations(filters: { studentId, agentId, category, status, ... })
}
```

**Database Schema** (supports oversight):
- `agent_conversation_sessions` - Session tracking with resolution_status, satisfaction_rating
- `agent_conversation_turns` - Turn-by-turn conversation log
- `agent_handoffs` - Handoff tracking (suggested vs executed)
- Views: `v_conversation_analytics`, `v_agent_performance`

**Score Rationale:**
- ✅ **Complete conversation persistence**: Every interaction is logged with metadata
- ✅ **Performance metrics**: Agent performance views for analytics
- ✅ **Search and replay**: Can search conversations and replay full sessions
- ❌ **No real-time dashboard**: Logging exists but no UI for coaches to monitor live
- ❌ **No alerting**: No proactive alerts for problematic interactions

#### 2. Intervention and Correction: 2/10 (Minimal)

**Evidence Found:**

```typescript
// services/agent-framework/src/repositories/ConversationRepository.ts:331-353

// Session status tracking
async updateSessionStatus(
  sessionId: string,
  status: 'active' | 'resolved' | 'abandoned' | 'escalated'
)

// Satisfaction rating
async addSatisfactionRating(sessionId: string, rating: number)
```

**Score Rationale:**
- ✅ **Status tracking**: Can mark sessions as "escalated"
- ❌ **No escalation workflow**: Status field exists but no mechanism to trigger escalation
- ❌ **No coach intervention tools**: Coaches cannot jump into active conversations
- ❌ **No correction mechanism**: No way to override or correct agent responses
- ❌ **Ratings exist but not collected**: `satisfaction_rating` field exists but not used in UI

#### 3. Human Feedback for Learning: 1/10 (Not Implemented)

**Evidence Found:**
- `satisfaction_rating` field in `agent_conversation_sessions` table
- No frontend implementation of feedback collection
- No RLHF or fine-tuning pipeline using feedback

**Score Rationale:**
- ❌ **No feedback UI**: No thumbs up/down or rating system in student interface
- ❌ **No feedback analysis**: Even if ratings were collected, no analysis pipeline
- ❌ **No RLHF**: No reinforcement learning from human feedback
- ❌ **No fine-tuning loop**: Agents use fixed models, no continuous improvement

#### 4. Decision Augmentation: 7/10 (Strong)

**Evidence Found:**

```typescript
// Agents provide analysis but don't take actions directly
// Examples from agent system prompts:

// services/agent-framework/src/agents/GamePlanAgent.ts
"Present strategic options with trade-offs, let student decide priorities"

// services/agent-framework/src/agents/CollegeListAgent.ts
"Suggest college targets with fit analysis, student makes final list"

// services/agent-framework/src/agents/EssayAgent.ts
"Provide essay topic ideas and feedback, student writes the essay"
```

**NotificationService** (augmentation, not automation):

```typescript
// services/agent-framework/src/services/NotificationService.ts:62-406

export class NotificationService {
  // Agents can send notifications but don't take actions
  async send(request: NotificationRequest): Promise<number> {
    // Channels: SMS, email, in-app, push
    // Use case: Remind/nudge student, but student decides action
  }
}
```

**Score Rationale:**
- ✅ **Advisory role**: Agents provide analysis and recommendations
- ✅ **Student-driven decisions**: Students choose colleges, essay topics, activities
- ✅ **Notification without action**: Agents remind but don't auto-submit applications
- ❌ **No explicit augmentation mode**: Pattern is implicit, not architected

#### 5. Escalation Policies: 2/10 (Not Implemented)

**Evidence Found:**

```typescript
// Handoff infrastructure exists but only for agent-to-agent
// services/agent-framework/src/repositories/ConversationRepository.ts:232-274

async recordHandoffSuggestion(
  sessionId: string,
  turnId: string,
  fromAgentId: string,
  toAgentId: string,  // ❌ Always another agent, never "human-coach"
  reason: string
)

// Session status includes 'escalated' but no triggering logic
// services/agent-framework/src/repositories/ConversationRepository.ts:34
resolution_status?: 'active' | 'resolved' | 'abandoned' | 'escalated';
```

**Score Rationale:**
- ✅ **Handoff infrastructure**: Database schema supports escalation tracking
- ✅ **Status field**: `resolution_status = 'escalated'` exists
- ❌ **No escalation triggers**: Agents never escalate to humans automatically
- ❌ **No human routing**: Handoffs only go to other agents, not coaches
- ❌ **No escalation conditions**: No rules for when to escalate (safety, uncertainty, etc.)

### HITL Alignment Score: 4/10

| Aspect | Score | Evidence |
|--------|-------|----------|
| Human Oversight | 6/10 | Conversation logging + analytics, no live dashboard |
| Intervention/Correction | 2/10 | Status tracking exists, no intervention workflow |
| Feedback for Learning | 1/10 | Rating field exists, not collected or used |
| Decision Augmentation | 7/10 | Agents advise, students decide (implicit pattern) |
| Escalation Policies | 2/10 | Infrastructure exists, no escalation logic |
| **Overall HITL** | **4/10** | **Partial implementation** |

### Gaps and Recommendations

#### Gap 1: No Human Escalation Workflow

**Missing:**
- Agents cannot escalate complex/sensitive issues to human coaches
- No "transfer to human coach" option for students
- No conditions that trigger automatic escalation

**Recommendation - Implement Escalation System:**

```typescript
// services/agent-framework/src/core/EscalationManager.ts (NEW)

export interface EscalationCondition {
  condition_id: string;
  trigger: 'uncertainty' | 'safety' | 'policy_violation' | 'user_request' | 'complexity';
  threshold?: number; // e.g., confidence < 0.3 for uncertainty
  description: string;
}

export class EscalationManager {
  private pool: Pool;

  // Check if conversation should be escalated
  async shouldEscalate(
    sessionId: string,
    context: {
      agentConfidence?: number;
      topicSensitivity?: string;
      userFrustration?: boolean;
      conversationTurns?: number;
    }
  ): Promise<{ escalate: boolean; reason: string; priority: 'low' | 'medium' | 'high' }> {
    // Rule 1: Low confidence (< 30%)
    if (context.agentConfidence && context.agentConfidence < 0.3) {
      return {
        escalate: true,
        reason: 'Agent confidence below threshold',
        priority: 'medium'
      };
    }

    // Rule 2: Sensitive topics (mental health, safety)
    if (context.topicSensitivity && ['mental_health', 'safety', 'crisis'].includes(context.topicSensitivity)) {
      return {
        escalate: true,
        reason: 'Sensitive topic detected',
        priority: 'high'
      };
    }

    // Rule 3: User frustration (explicit request)
    if (context.userFrustration) {
      return {
        escalate: true,
        reason: 'User requested human assistance',
        priority: 'high'
      };
    }

    // Rule 4: Extended unresolved conversation (> 10 turns)
    if (context.conversationTurns && context.conversationTurns > 10) {
      return {
        escalate: true,
        reason: 'Extended conversation without resolution',
        priority: 'medium'
      };
    }

    return { escalate: false, reason: '', priority: 'low' };
  }

  // Create escalation and notify coach
  async escalateToCoach(
    sessionId: string,
    reason: string,
    priority: 'low' | 'medium' | 'high'
  ): Promise<void> {
    // 1. Update session status
    await this.pool.query(
      `UPDATE agent_conversation_sessions
       SET resolution_status = 'escalated', escalation_reason = $1, escalation_priority = $2, escalated_at = NOW()
       WHERE session_id = $3`,
      [reason, priority, sessionId]
    );

    // 2. Assign to available coach
    const coach = await this.getAvailableCoach(priority);

    // 3. Notify coach
    const notification = new NotificationService(this.pool);
    await notification.send({
      student_id: sessionId, // Get from session
      coach_id: coach.coach_id,
      channel: 'email', // High-priority: SMS, else email
      recipient: coach.email,
      subject: `${priority.toUpperCase()} Priority Escalation: Student Session`,
      message: `Session ${sessionId} escalated. Reason: ${reason}. Please review and respond.`,
      metadata: { sessionId, reason, priority }
    });

    // 4. Log escalation event
    logger.event('escalation.created', { sessionId, reason, priority, coachId: coach.coach_id });
  }
}
```

**Integration in BaseAgent:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts (MODIFICATION)

async execute(context: AgentExecutionContext, registry?: any): Promise<AgentExecutionResult> {
  // ... existing execution logic ...

  // NEW: Check for escalation after agent response
  const escalationManager = new EscalationManager(pool);
  const shouldEscalate = await escalationManager.shouldEscalate(context.session.session_id, {
    agentConfidence: this.calculateConfidence(finalResponse),
    topicSensitivity: this.detectSensitiveTopic(context.user_message),
    userFrustration: this.detectFrustration(context.user_message),
    conversationTurns: context.session.turn_count
  });

  if (shouldEscalate.escalate) {
    await escalationManager.escalateToCoach(
      context.session.session_id,
      shouldEscalate.reason,
      shouldEscalate.priority
    );

    // Add escalation notice to response
    response.answer += "\n\n*I've notified your coach to provide personalized guidance on this. They'll reach out soon!*";
  }

  return { response, session: updatedSession, ... };
}
```

**Database Schema Addition:**

```sql
-- Add escalation tracking columns
ALTER TABLE agent_conversation_sessions
  ADD COLUMN escalation_reason TEXT,
  ADD COLUMN escalation_priority VARCHAR(10) CHECK (escalation_priority IN ('low', 'medium', 'high')),
  ADD COLUMN escalated_at TIMESTAMPTZ,
  ADD COLUMN assigned_coach_id VARCHAR(50),
  ADD COLUMN coach_responded_at TIMESTAMPTZ;

-- Create escalation rules table
CREATE TABLE escalation_rules (
  rule_id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100),
  condition_type VARCHAR(50), -- 'uncertainty', 'safety', 'complexity', etc.
  threshold NUMERIC,
  priority VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track escalation history
CREATE TABLE escalations (
  escalation_id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES agent_conversation_sessions(session_id),
  escalated_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  priority VARCHAR(10),
  assigned_coach_id VARCHAR(50),
  coach_responded_at TIMESTAMPTZ,
  resolution_time_minutes INTEGER,
  outcome VARCHAR(50) -- 'resolved', 'returned_to_agent', 'ongoing'
);
```

**Implementation Priority:** 🔴 **HIGH** - Critical for safety and user trust

---

#### Gap 2: No Feedback Collection System

**Missing:**
- No thumbs up/down buttons in student UI
- `satisfaction_rating` field exists but not populated
- No feedback analysis pipeline

**Recommendation - Implement Feedback System:**

**Frontend (React):**

```typescript
// unified-frontend/apps/unified-app/src/components/v3.2/AgentResponseCard.tsx (NEW)

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export function AgentResponseCard({ sessionId, turnNumber, agentResponse }) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const handleRating = async (value: 1 | 5) => {
    setRating(value);

    // Send rating to backend
    await fetch(`/api/agents/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        turnNumber,
        rating: value,
        feedbackText: feedbackText || null
      })
    });

    // Show feedback form for negative ratings
    if (value === 1) {
      setShowFeedbackForm(true);
    }
  };

  return (
    <div className="agent-response-card">
      <div className="response-content">
        {agentResponse}
      </div>

      <div className="feedback-buttons">
        <button
          onClick={() => handleRating(5)}
          disabled={rating !== null}
          className={rating === 5 ? 'selected' : ''}
        >
          <ThumbsUp size={16} />
          Helpful
        </button>

        <button
          onClick={() => handleRating(1)}
          disabled={rating !== null}
          className={rating === 1 ? 'selected' : ''}
        >
          <ThumbsDown size={16} />
          Not Helpful
        </button>
      </div>

      {showFeedbackForm && (
        <div className="feedback-form">
          <textarea
            placeholder="What could we improve? (optional)"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <button onClick={() => {
            // Re-submit with feedback text
            handleRating(1);
            setShowFeedbackForm(false);
          }}>
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  );
}
```

**Backend API Endpoint:**

```typescript
// services/agent-framework/src/routes/agents.ts (MODIFICATION)

router.post('/feedback', async (req, res) => {
  const { sessionId, turnNumber, rating, feedbackText } = req.body;

  try {
    // Update conversation turn with feedback
    await pool.query(
      `UPDATE agent_conversation_turns
       SET user_rating = $1, user_feedback = $2, feedback_at = NOW()
       WHERE session_id = $3 AND turn_number = $4`,
      [rating, feedbackText, sessionId, turnNumber]
    );

    // If negative rating, create escalation
    if (rating === 1) {
      const escalationManager = new EscalationManager(pool);
      await escalationManager.escalateToCoach(
        sessionId,
        `Negative feedback: ${feedbackText || 'Not helpful'}`,
        'medium'
      );
    }

    // Log for analytics
    logger.event('feedback.received', { sessionId, turnNumber, rating, hasFeedbackText: !!feedbackText });

    res.json({ success: true });
  } catch (error) {
    logger.error('feedback.error', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Get feedback analytics
router.get('/feedback/analytics', async (req, res) => {
  const { agentId, startDate, endDate } = req.query;

  const result = await pool.query(`
    SELECT
      agent_id,
      COUNT(*) as total_ratings,
      AVG(CASE WHEN user_rating = 5 THEN 1.0 ELSE 0.0 END) as positive_rate,
      AVG(CASE WHEN user_rating = 1 THEN 1.0 ELSE 0.0 END) as negative_rate,
      COUNT(CASE WHEN user_feedback IS NOT NULL THEN 1 END) as feedback_count
    FROM agent_conversation_turns
    WHERE agent_id = $1
      AND feedback_at BETWEEN $2 AND $3
    GROUP BY agent_id
  `, [agentId, startDate, endDate]);

  res.json(result.rows[0]);
});
```

**Database Schema Modification:**

```sql
-- Add feedback columns to conversation turns
ALTER TABLE agent_conversation_turns
  ADD COLUMN user_rating INTEGER CHECK (user_rating IN (1, 5)), -- 1=👎, 5=👍
  ADD COLUMN user_feedback TEXT,
  ADD COLUMN feedback_at TIMESTAMPTZ;

-- Create feedback analytics view
CREATE VIEW v_agent_feedback_metrics AS
SELECT
  agent_id,
  COUNT(*) as total_ratings,
  SUM(CASE WHEN user_rating = 5 THEN 1 ELSE 0 END) as positive_count,
  SUM(CASE WHEN user_rating = 1 THEN 1 ELSE 0 END) as negative_count,
  ROUND(AVG(CASE WHEN user_rating = 5 THEN 1.0 ELSE 0.0 END), 2) as positive_rate,
  COUNT(CASE WHEN user_feedback IS NOT NULL THEN 1 END) as detailed_feedback_count
FROM agent_conversation_turns
WHERE user_rating IS NOT NULL
GROUP BY agent_id;
```

**Implementation Priority:** 🟡 **MEDIUM** - Important for quality monitoring

---

#### Gap 3: No Real-Time Oversight Dashboard

**Missing:**
- Conversation logs exist in database but no coach UI
- No live monitoring of active student sessions
- No alerts for problematic interactions

**Recommendation - Build Coach Dashboard:**

```typescript
// unified-frontend/apps/unified-app/src/app/coach-dashboard/page.tsx (NEW)

import { useEffect, useState } from 'react';

export default function CoachDashboard() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [agentMetrics, setAgentMetrics] = useState([]);

  useEffect(() => {
    // Poll for active sessions
    const interval = setInterval(async () => {
      const sessions = await fetch('/api/coach/active-sessions').then(r => r.json());
      setActiveSessions(sessions);

      const escals = await fetch('/api/coach/escalations?status=pending').then(r => r.json());
      setEscalations(escals);
    }, 5000); // 5-second polling

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="coach-dashboard">
      <h1>Coach Oversight Dashboard</h1>

      {/* Escalations requiring attention */}
      <section className="escalations">
        <h2>Pending Escalations ({escalations.length})</h2>
        {escalations.map(esc => (
          <div key={esc.session_id} className={`escalation priority-${esc.priority}`}>
            <span className="student">{esc.student_name}</span>
            <span className="reason">{esc.reason}</span>
            <span className="time">{formatRelativeTime(esc.escalated_at)}</span>
            <button onClick={() => joinSession(esc.session_id)}>
              Join Session
            </button>
          </div>
        ))}
      </section>

      {/* Active sessions (live monitoring) */}
      <section className="active-sessions">
        <h2>Active Sessions ({activeSessions.length})</h2>
        {activeSessions.map(sess => (
          <div key={sess.session_id} className="session">
            <span className="student">{sess.student_name}</span>
            <span className="agent">{sess.current_agent}</span>
            <span className="turns">{sess.turn_count} turns</span>
            <span className="duration">{formatDuration(sess.started_at)}</span>
            <button onClick={() => viewSession(sess.session_id)}>
              View
            </button>
          </div>
        ))}
      </section>

      {/* Agent performance metrics */}
      <section className="agent-metrics">
        <h2>Agent Performance (Last 7 Days)</h2>
        {agentMetrics.map(agent => (
          <div key={agent.agent_id} className="agent-card">
            <h3>{agent.display_name}</h3>
            <div className="metrics">
              <div className="metric">
                <span className="label">Total Interactions</span>
                <span className="value">{agent.total_turns}</span>
              </div>
              <div className="metric">
                <span className="label">Positive Feedback</span>
                <span className="value">{agent.positive_rate}%</span>
              </div>
              <div className="metric">
                <span className="label">Avg Response Time</span>
                <span className="value">{agent.avg_response_ms}ms</span>
              </div>
              <div className="metric">
                <span className="label">Handoff Rate</span>
                <span className="value">{agent.handoff_rate}%</span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
```

**Backend API Endpoints:**

```typescript
// services/agent-framework/src/routes/coach.ts (NEW)

import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

// Get active sessions
router.get('/active-sessions', async (req, res) => {
  const result = await pool.query(`
    SELECT
      s.session_id,
      s.student_id,
      s.student_context->>'student_name' as student_name,
      t.agent_name as current_agent,
      COUNT(t.turn_id) as turn_count,
      s.started_at,
      EXTRACT(EPOCH FROM (NOW() - s.started_at)) as duration_seconds
    FROM agent_conversation_sessions s
    LEFT JOIN LATERAL (
      SELECT agent_name
      FROM agent_conversation_turns
      WHERE session_id = s.session_id
      ORDER BY turn_number DESC
      LIMIT 1
    ) t ON true
    WHERE s.resolution_status = 'active'
      AND s.last_active_at > NOW() - INTERVAL '30 minutes'
    ORDER BY s.last_active_at DESC
  `);

  res.json(result.rows);
});

// Get pending escalations
router.get('/escalations', async (req, res) => {
  const { status } = req.query;

  const result = await pool.query(`
    SELECT
      e.escalation_id,
      e.session_id,
      e.reason,
      e.priority,
      e.escalated_at,
      s.student_context->>'student_name' as student_name,
      e.assigned_coach_id,
      e.coach_responded_at
    FROM escalations e
    JOIN agent_conversation_sessions s ON e.session_id = s.session_id
    WHERE e.outcome IS NULL OR e.outcome = $1
    ORDER BY
      CASE e.priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END,
      e.escalated_at ASC
  `, [status || 'ongoing']);

  res.json(result.rows);
});

// Coach joins escalated session
router.post('/join-session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { coachId } = req.body;

  // Mark escalation as responded
  await pool.query(`
    UPDATE escalations
    SET coach_responded_at = NOW(), assigned_coach_id = $1
    WHERE session_id = $2 AND coach_responded_at IS NULL
  `, [coachId, sessionId]);

  // Get full conversation replay
  const replay = await pool.query(
    `SELECT get_conversation_replay($1) as replay`,
    [sessionId]
  );

  res.json(replay.rows[0].replay);
});

export default router;
```

**Implementation Priority:** 🟡 **MEDIUM** - Important for oversight but not blocking

---

## Chapter 14: Knowledge Retrieval (RAG) Pattern

### Pattern Definition (from book)

**Retrieval-Augmented Generation (RAG)** enhances LLMs by connecting them to external, current, context-specific information. Key concepts:

1. **Embeddings**: Numerical vector representations of text capturing semantic meaning
2. **Semantic Similarity**: Measuring how alike two pieces of text are in meaning (cosine similarity, dot product)
3. **Chunking**: Breaking documents into smaller, manageable pieces for retrieval
4. **Vector Databases**: Specialized databases for storing and querying embeddings (Pinecone, Weaviate, ChromaDB, Milvus, Qdrant, FAISS)
5. **Retrieval Techniques**:
   - **Vector Search**: Semantic similarity using embeddings
   - **BM25**: Keyword-based lexical search
   - **Hybrid Search**: Combining vector + lexical for better recall
6. **GraphRAG**: Using knowledge graphs for relationship-based retrieval
7. **Agentic RAG**: Adding reasoning layer for validation, conflict reconciliation, multi-step reasoning

### Current IvyLevel Implementation

#### RAG Architecture: 9/10 (Excellent)

**IvyLevel implements a sophisticated hybrid RAG system combining:**

1. **Vector Search** (Pinecone)
2. **Lexical Search** (PostgreSQL full-text)
3. **Reranking** (Cohere)
4. **Student-scoped retrieval**

**Evidence:**

```typescript
// services/agent-framework/src/retrieval/hybrid.ts:1-44

export async function hybridSearch(q: string, studentId: string) {
  // 1. Query vector namespaces in parallel
  const jobs = [
    queryVectors('jtbd', q, cfg.rag_topk_per_ns),        // Jobs-to-be-done
    queryVectors('interactions', q, cfg.rag_topk_per_ns), // Student interactions
  ];

  // Optional: Include assessments namespace
  if (cfg.include_assessments_in_rag) {
    jobs.push(queryVectors('assessments', q, cfg.rag_topk_per_ns));
  }

  const results = await Promise.all(jobs);
  const [jtbd, inter, assess = []] = results;

  // 2. Student-scoped lexical search
  const scoped = await lexicalSearch(studentId, q, cfg.lexical_topk);

  // 3. Global fallback if no student-scoped results
  const globalFallback = scoped.length ? [] : await lexicalSearch(null, q, cfg.lexical_topk);

  // 4. Merge all results
  const merged = [...jtbd, ...inter, ...assess, ...scoped, ...globalFallback]
    .map(m => ({ ...m, _text: getText(m) }))
    .filter(m => m._text?.trim().length > 0);

  // 5. Rerank with Cohere for relevance
  return rerank(q, merged, cfg.rerank);
}
```

#### 1. Embeddings: 10/10 (Full Implementation)

**Evidence:**

```typescript
// services/agent-framework/src/retrieval/pinecone.ts:1-57

import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from '../ai/openai'; // OpenAI text-embedding-3-large

// Configuration validation
export async function assertIndexParity(
  expectedDim: number = 3072,  // text-embedding-3-large dimension
  expectedModel: string = 'text-embedding-3-large'
) {
  const dim = CFG.PINECONE_INDEX_DIM;
  const model = CFG.EMBEDDING_MODEL_ID;

  if (dim !== expectedDim) {
    throw new Error(`Dimension mismatch: got ${dim}, expected ${expectedDim}`);
  }

  if (model !== expectedModel) {
    throw new Error(`Model mismatch: got ${model}, expected ${expectedModel}`);
  }
}

export async function queryVectors(ns: string, q: string, topK: number = 6) {
  // Generate embedding for query
  const vector = await embed(q); // OpenAI embedding

  // Query Pinecone index
  const res = await getPinecone()
    .index(CFG.PINECONE_INDEX_NAME)
    .namespace(actualNamespace)
    .query({
      vector,
      topK,
      includeMetadata: true
    });

  return res.matches.map(m => ({
    id: m.id,
    namespace: actualNamespace,
    text: m.metadata?.text ?? '',
    score: m.score ?? 0,
    metadata: m.metadata
  }));
}
```

**Configuration** (`retrieval.config.json`):
```json
{
  "rag_topk_per_ns": 6,
  "lexical_topk": 5,
  "include_assessments_in_rag": false,
  "rerank": {
    "topk": 12,
    "min_score": 0.12,
    "keep_at_least": 3
  },
  "namespaces": {
    "jtbd": "v6_jtbd_ns",
    "interactions": "v6_interactions_ns",
    "assessments": "v6_assessments_ns"
  }
}
```

**Score Rationale:**
- ✅ **Production embedding model**: OpenAI text-embedding-3-large (3072 dimensions)
- ✅ **Dimension validation**: Asserting parity between model and index
- ✅ **Namespace isolation**: Separate namespaces for different knowledge types
- ✅ **Metadata inclusion**: Rich metadata for result interpretation

#### 2. Vector Databases: 10/10 (Production Pinecone)

**Evidence:**

```typescript
// Pinecone configuration (services/agent-framework/src/retrieval/pinecone.ts)
- Index: ivylevel-kb-v6 (3072 dimensions)
- Namespaces: v6_jtbd_ns (924 vectors), v6_interactions_ns (40 vectors), v6_assessments_ns (9 vectors)
- Total: 973 vectors
```

**Score Rationale:**
- ✅ **Production vector database**: Pinecone with 973 indexed vectors
- ✅ **Multi-namespace architecture**: Logical separation of knowledge types
- ✅ **Configurable topK**: Adjustable retrieval count per namespace
- ✅ **Metadata filtering**: Can filter by student_id, category, etc.

#### 3. Hybrid Search: 10/10 (Vector + Lexical)

**Evidence:**

```typescript
// services/agent-framework/src/retrieval/lexical.ts (PostgreSQL full-text search)

export async function lexicalSearch(
  studentId: string | null,
  query: string,
  limit: number = 5
): Promise<any[]> {
  // Student-scoped search
  if (studentId) {
    return pool.query(`
      SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
      FROM kb_items
      WHERE student_id = $2
        AND search_vector @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $3
    `, [query, studentId, limit]);
  }

  // Global search (fallback)
  return pool.query(`
    SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
    FROM kb_items
    WHERE search_vector @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT $2
  `, [query, limit]);
}
```

**Score Rationale:**
- ✅ **True hybrid**: Combines semantic (Pinecone) + keyword (PostgreSQL)
- ✅ **Student-scoped lexical**: Lexical search filtered by student_id
- ✅ **Global fallback**: Falls back to global search if no student results
- ✅ **Parallel execution**: Vector and lexical searches run concurrently

#### 4. Reranking: 10/10 (Cohere Rerank)

**Evidence:**

```typescript
// services/agent-framework/src/retrieval/rerank.ts:1-57

import { CohereClient } from 'cohere-ai';

export async function rerank(
  query: string,
  candidates: any[],
  config: RerankConfig
) {
  const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

  // Rerank with Cohere model
  const { results } = await cohere.rerank({
    model: 'rerank-english-v3.0',
    query,
    documents: candidates.map(c => c._text || c.text || ''),
    topN: Math.min(cfg.topk, candidates.length)
  });

  // Map rerank scores back to candidates
  const scored = results.map(r => ({
    ...candidates[r.index],
    rerankScore: r.relevanceScore
  }));

  // Filter by min_score
  const passThreshold = scored.filter(x => x.rerankScore >= cfg.min_score);

  // Keep at least N results (prevent zero results)
  if (passThreshold.length >= cfg.keep_at_least) {
    return passThreshold;
  }

  // Fallback: return top-N scored items
  return scored.slice(0, cfg.keep_at_least);
}
```

**Configuration:**
- Model: `rerank-english-v3.0`
- TopK: 12
- Min Score: 0.12
- Keep at Least: 3 (prevents zero results)

**Score Rationale:**
- ✅ **Production reranker**: Cohere rerank-english-v3.0
- ✅ **Quality filtering**: Min score threshold (0.12)
- ✅ **Zero-result prevention**: Always keeps at least 3 results
- ✅ **Configurable thresholds**: Tunable via config file

#### 5. Chunking Strategy: 8/10 (Implicit, not explicit)

**Evidence:**

IvyLevel stores knowledge as **chips** (atomic units) rather than documents:

```typescript
// KB items are pre-chunked as "chips"
// Database: kb_items table with chip_id, insight_vector, student_id
// Namespaces: jtbd (924 chips), interactions (40 chips), assessments (9 chips)
```

**Score Rationale:**
- ✅ **Atomic knowledge units**: Chips are already chunked
- ✅ **Optimal chunk size**: Each chip represents a single fact/insight
- ❌ **No explicit chunking strategy**: Documents aren't chunked on ingestion (pre-chunked externally)
- ❌ **No overlap handling**: No sliding window or overlap between chunks

#### 6. Agentic RAG: 7/10 (Partial - Validation, no reflection)

**Evidence:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts
// Agents validate retrieved knowledge before using

protected buildSystemPrompt(context: AgentExecutionContext): string {
  return `
    You are ${this.manifest.display_name}.

    When using retrieved knowledge:
    1. Only cite facts directly from tool results
    2. If knowledge conflicts, state both views
    3. If uncertain, say "I don't have enough information"
    4. Never hallucinate or invent information

    Tools available: ${this.manifest.tools.map(t => t.name).join(', ')}
  `;
}
```

**Score Rationale:**
- ✅ **Source validation**: Agents only cite from tool results
- ✅ **Conflict acknowledgment**: Prompt instructs handling conflicting sources
- ✅ **Uncertainty handling**: Agents admit when information is insufficient
- ❌ **No reflection loop**: No self-critique or query refinement
- ❌ **No multi-step reasoning**: Single-pass retrieval, no iterative queries
- ❌ **No knowledge gap identification**: Agents don't identify missing information

### RAG Alignment Score: 9/10

| Aspect | Score | Evidence |
|--------|-------|----------|
| Embeddings | 10/10 | OpenAI text-embedding-3-large (3072-dim) |
| Vector Database | 10/10 | Pinecone with 973 vectors across 3 namespaces |
| Hybrid Search | 10/10 | Vector (Pinecone) + Lexical (PostgreSQL) |
| Reranking | 10/10 | Cohere rerank-english-v3.0 with quality filtering |
| Chunking | 8/10 | Pre-chunked chips, no explicit strategy |
| Agentic RAG | 7/10 | Validation yes, reflection/multi-step no |
| **Overall RAG** | **9/10** | **Strong production implementation** |

### Recommendations

#### Enhancement 1: Add Agentic RAG Reflection Loop

**Missing:**
- Single-pass retrieval (no query refinement)
- No self-critique of retrieved results
- No iterative retrieval for complex queries

**Recommendation - Implement Reflection Agent:**

```typescript
// services/agent-framework/src/retrieval/AgenticRAG.ts (NEW)

interface RetrievalCritique {
  isRelevant: boolean;
  isComplete: boolean;
  hasMissingInfo: boolean;
  suggestedRefinement?: string;
  confidence: number;
}

export class AgenticRAGRetriever {
  private maxIterations = 3;

  async retrieveWithReflection(
    query: string,
    studentId: string,
    context?: string
  ): Promise<{ results: any[]; iterations: number; critique: RetrievalCritique[] }> {
    let currentQuery = query;
    let allResults: any[] = [];
    let critiques: RetrievalCritique[] = [];

    for (let i = 0; i < this.maxIterations; i++) {
      // 1. Retrieve with current query
      const results = await hybridSearch(currentQuery, studentId);

      // 2. Critique the results
      const critique = await this.critiqueResults(query, results, context);
      critiques.push(critique);

      // 3. If results are good enough, return
      if (critique.isRelevant && critique.isComplete && critique.confidence > 0.7) {
        return { results, iterations: i + 1, critiques };
      }

      // 4. If results are poor, refine query
      if (critique.suggestedRefinement) {
        logger.info(`Refining query: ${currentQuery} → ${critique.suggestedRefinement}`);
        currentQuery = critique.suggestedRefinement;
        allResults.push(...results);
      } else {
        // No refinement possible, return what we have
        return { results, iterations: i + 1, critiques };
      }
    }

    // Max iterations reached, return all results
    return {
      results: this.deduplicateResults(allResults),
      iterations: this.maxIterations,
      critiques
    };
  }

  private async critiqueResults(
    originalQuery: string,
    results: any[],
    context?: string
  ): Promise<RetrievalCritique> {
    // Use LLM to critique retrieval quality
    const prompt = `
      You are a retrieval quality critic. Evaluate these search results.

      Original Query: "${originalQuery}"
      Context: ${context || 'None'}

      Retrieved Results:
      ${results.map((r, i) => `${i + 1}. ${r._text} (score: ${r.rerankScore})`).join('\n')}

      Evaluate:
      1. Are results relevant to the query?
      2. Are results complete enough to answer the query?
      3. Is there missing information?
      4. If results are insufficient, suggest a refined query.

      Respond in JSON:
      {
        "isRelevant": true/false,
        "isComplete": true/false,
        "hasMissingInfo": true/false,
        "missingInfoDescription": "What's missing?",
        "suggestedRefinement": "Refined query or null",
        "confidence": 0.0-1.0
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  }

  private deduplicateResults(results: any[]): any[] {
    const seen = new Set<string>();
    return results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }
}
```

**Integration:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts (MODIFICATION)

async execute(context: AgentExecutionContext, registry?: any): Promise<AgentExecutionResult> {
  // ... existing code ...

  // Use agentic RAG for complex queries
  const agenticRAG = new AgenticRAGRetriever();
  const { results, iterations, critiques } = await agenticRAG.retrieveWithReflection(
    context.user_message,
    context.session.student_id,
    this.buildContextSummary(context.session)
  );

  // Include retrieval metadata in response
  response.debug.rag_iterations = iterations;
  response.debug.rag_critique = critiques[critiques.length - 1];

  // ... rest of execution ...
}
```

**Implementation Priority:** 🟡 **MEDIUM** - Nice-to-have enhancement

---

#### Enhancement 2: Add GraphRAG for Relationship-Based Retrieval

**Missing:**
- Current RAG retrieves isolated chunks
- No relationship traversal (e.g., "Find ECs related to intended major")
- No multi-hop reasoning

**Recommendation - Build Knowledge Graph:**

```sql
-- Create knowledge graph edges table
CREATE TABLE kg_edges (
  edge_id SERIAL PRIMARY KEY,
  from_chip_id VARCHAR(255) REFERENCES kb_items(chip_id),
  to_chip_id VARCHAR(255) REFERENCES kb_items(chip_id),
  relation_type VARCHAR(50), -- 'relates_to', 'supports', 'contradicts', 'part_of'
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kg_from ON kg_edges(from_chip_id);
CREATE INDEX idx_kg_to ON kg_edges(to_chip_id);
CREATE INDEX idx_kg_relation ON kg_edges(relation_type);

-- Example: Build graph from existing chips
-- Relation: EC → Intended Major
INSERT INTO kg_edges (from_chip_id, to_chip_id, relation_type, weight)
SELECT
  ec.chip_id,
  major.chip_id,
  'supports_major',
  0.8
FROM kb_items ec
JOIN kb_items major ON ec.student_id = major.student_id
WHERE ec.kb_category = 'ec'
  AND major.kb_category = 'major'
  AND ec.insight_vector ILIKE '%' || major.insight_vector || '%'; -- Naive matching
```

**GraphRAG Query:**

```typescript
// services/agent-framework/src/retrieval/GraphRAG.ts (NEW)

export async function graphRAGSearch(
  startingChipIds: string[],
  relationTypes: string[],
  maxDepth: number = 2
): Promise<any[]> {
  // Traverse graph from starting chips
  const query = `
    WITH RECURSIVE graph_traverse AS (
      -- Base case: starting chips
      SELECT
        chip_id,
        insight_vector as text,
        0 as depth,
        ARRAY[chip_id] as path
      FROM kb_items
      WHERE chip_id = ANY($1)

      UNION ALL

      -- Recursive case: follow edges
      SELECT
        ki.chip_id,
        ki.insight_vector as text,
        gt.depth + 1,
        gt.path || ki.chip_id
      FROM graph_traverse gt
      JOIN kg_edges e ON e.from_chip_id = gt.chip_id
      JOIN kb_items ki ON ki.chip_id = e.to_chip_id
      WHERE gt.depth < $2
        AND e.relation_type = ANY($3)
        AND NOT (ki.chip_id = ANY(gt.path)) -- Prevent cycles
    )
    SELECT DISTINCT chip_id, text, depth
    FROM graph_traverse
    ORDER BY depth ASC;
  `;

  const result = await pool.query(query, [startingChipIds, maxDepth, relationTypes]);
  return result.rows;
}

// Usage: "Find ECs that support student's intended major"
export async function findRelatedKnowledge(
  query: string,
  studentId: string,
  relationTypes: string[] = ['supports_major', 'relates_to']
): Promise<any[]> {
  // 1. Initial vector search
  const initialResults = await hybridSearch(query, studentId);
  const startingChipIds = initialResults.slice(0, 3).map(r => r.id);

  // 2. Graph traversal
  const graphResults = await graphRAGSearch(startingChipIds, relationTypes, 2);

  // 3. Merge and rerank
  const merged = [...initialResults, ...graphResults];
  return rerank(query, merged, { topk: 10, min_score: 0.1, keep_at_least: 5 });
}
```

**Implementation Priority:** 🔵 **LOW** - Advanced feature, current RAG is sufficient

---

## Chapter 15: Inter-Agent Communication (A2A) Pattern

### Pattern Definition (from book)

**Agent-to-Agent (A2A) Protocol** is an open standard for enabling agent-to-agent communication across frameworks. Key concepts:

1. **Core Actors**:
   - **User**: Human initiating request
   - **A2A Client**: Agent making request to remote agent
   - **A2A Server**: Remote agent providing capabilities

2. **Agent Card**: JSON file defining agent identity, capabilities, skills, authentication
   ```json
   {
     "name": "WeatherBot",
     "description": "Provides weather forecasts",
     "url": "http://weather-service.example.com/a2a",
     "version": "1.0.0",
     "capabilities": { "streaming": true },
     "authentication": { "schemes": ["apiKey"] },
     "skills": [...]
   }
   ```

3. **Agent Discovery**:
   - **Well-known URI**: `/.well-known/agent.json`
   - **Curated registries**: Centralized agent directories
   - **Direct configuration**: Hardcoded agent endpoints

4. **Communication Protocol**:
   - **JSON-RPC 2.0** over HTTP(S)
   - **Messages**: Structured with attributes (sender, recipient, timestamp) and parts (text, images, files)
   - **Tasks**: Asynchronous units of work with states (submitted, working, completed, failed)

5. **Interaction Mechanisms**:
   - **Synchronous**: Request/response (blocking)
   - **Asynchronous (Polling)**: Submit task, poll for completion
   - **Streaming (SSE)**: Server-Sent Events for real-time updates
   - **Push Notifications (Webhooks)**: Server notifies client when done

6. **Security**:
   - Mutual TLS
   - Audit logs
   - OAuth 2.0 / API keys

7. **Supported by**: Google, Microsoft, Atlassian, Box, LangChain, MongoDB, Salesforce, SAP, ServiceNow

### Current IvyLevel Implementation

#### A2A Alignment: 6/10 (Internal handoffs, no A2A protocol)

IvyLevel implements **agent-to-agent handoffs** but uses an **internal protocol**, not the standard A2A specification.

#### 1. Agent Discovery: 5/10 (Internal registry, no agent cards)

**Evidence:**

```typescript
// services/agent-framework/src/core/AgentRegistry.ts:32-106

export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();

  constructor() {
    this.initializeAgents(); // Registers 9 agents
  }

  // Internal agent registration (not A2A compliant)
  private initializeAgents(): void {
    const agentConstructors = [
      { name: 'GamePlanAgent', constructor: GamePlanAgent },
      { name: 'ExtracurricularsAgent', constructor: ExtracurricularsAgent },
      { name: 'AwardsAgent', constructor: AwardsAgent },
      // ... 6 more agents
    ];

    for (const { name, constructor } of agentConstructors) {
      const agent = new constructor();
      const manifest = agent.getManifest();

      this.agents.set(manifest.agent_id, {
        manifest,
        instance: agent,
        status: 'active',
        last_used: new Date(),
        request_count: 0,
      });
    }
  }

  // Get agent by ID (internal lookup, not A2A discovery)
  getAgent(agentId: string): BaseAgent | null {
    return this.agents.get(agentId)?.instance || null;
  }
}
```

**Agent Manifest** (internal, not A2A agent card):

```typescript
// services/agent-framework/src/core/types.ts

export interface AgentManifest {
  agent_id: string;            // Internal ID
  display_name: string;        // Human-readable name
  tagline: string;             // One-liner description
  version: string;             // Agent version
  category: AgentCategory;     // Internal category
  tools: ChatCompletionTool[]; // OpenAI function calling format
  intents: IntentPattern[];    // Intent matching patterns
  jtbd: {                      // Jobs-to-be-Done
    student: string;
    parent: string;
    success_metric: string;
  };
  temperature?: number;        // LLM config
  max_tokens?: number;         // LLM config
  handoffs?: string[];         // Internal handoff list
  model?: string;              // Model override
}
```

**Comparison to A2A Agent Card:**

| A2A Standard | IvyLevel | Status |
|--------------|----------|--------|
| `name` | ✅ `display_name` | Present |
| `description` | ✅ `tagline` | Present |
| `url` | ❌ Not exposed | Missing |
| `version` | ✅ `version` | Present |
| `capabilities` | ❌ Not defined | Missing |
| `authentication` | ❌ Not exposed | Missing |
| `skills` | ⚠️ `intents` (different format) | Partial |

**Score Rationale:**
- ✅ **Internal registry**: Centralized agent management (AgentRegistry)
- ✅ **Agent metadata**: Comprehensive manifest with identity, capabilities, tools
- ❌ **No agent cards**: Agents not exposed as A2A-compliant JSON files
- ❌ **No /.well-known/agent.json**: No standard discovery endpoint
- ❌ **No external discovery**: Agents only discoverable internally

#### 2. Agent-to-Agent Communication: 7/10 (Internal handoffs, not A2A protocol)

**Evidence:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts:137-193

protected detectHandoff(
  userMessage: string,
  registry?: any
): { to_agent: string; reason: string } | undefined {
  if (!registry) return undefined;

  // Strategy: Only handoff FROM less specific TO more specific
  const suggestedAgent = registry.routeQuery(userMessage);

  if (suggestedAgent.getManifest().agent_id === this.manifest.agent_id) {
    return undefined; // Already the right agent
  }

  // Check if suggested agent is more specific
  const currentSpecificity = this.getSpecificity();
  const suggestedSpecificity = this.getSpecificityForAgent(suggestedAgent.getManifest().agent_id);

  if (suggestedSpecificity > currentSpecificity) {
    return {
      to_agent: suggestedAgent.getManifest().agent_id,
      reason: `Your question is better answered by ${suggestedAgent.getManifest().display_name}`
    };
  }

  return undefined;
}
```

**Handoff Tracking:**

```typescript
// services/agent-framework/src/repositories/ConversationRepository.ts:232-274

async recordHandoffSuggestion(
  sessionId: string,
  turnId: string,
  fromAgentId: string,
  toAgentId: string,
  reason: string
): Promise<AgentHandoff> {
  const handoffId = `handoff_${uuidv4()}`;

  await this.pool.query(`
    INSERT INTO agent_handoffs (
      handoff_id, session_id, turn_id, from_agent_id, to_agent_id, handoff_reason, suggested_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [handoffId, sessionId, turnId, fromAgentId, toAgentId, reason]);

  return result.rows[0];
}

async markHandoffExecuted(
  sessionId: string,
  fromAgentId: string,
  toAgentId: string,
  userAccepted: boolean = true
): Promise<void> {
  await this.pool.query(`
    UPDATE agent_handoffs
    SET executed_at = NOW(), user_accepted = $4
    WHERE session_id = $1 AND from_agent_id = $2 AND to_agent_id = $3
  `, [sessionId, fromAgentId, toAgentId, userAccepted]);
}
```

**Database Schema:**

```sql
-- agent_handoffs table
CREATE TABLE agent_handoffs (
  handoff_id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES agent_conversation_sessions(session_id),
  turn_id VARCHAR(255),
  from_agent_id VARCHAR(100),
  to_agent_id VARCHAR(100),
  handoff_reason TEXT,
  suggested_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  user_accepted BOOLEAN,
  context_transferred JSONB
);
```

**Score Rationale:**
- ✅ **Handoff detection**: Agents detect when to handoff based on query specificity
- ✅ **Handoff tracking**: Full lifecycle tracking (suggested → executed)
- ✅ **Context transfer**: Session context preserved across handoffs
- ✅ **User acceptance**: Tracks if user accepted handoff suggestion
- ❌ **Not A2A protocol**: Uses internal protocol, not JSON-RPC 2.0
- ❌ **No external agents**: Only internal agents, can't communicate with external services
- ❌ **No tasks/streaming**: Handoffs are synchronous, no async task model

#### 3. Inter-Framework Communication: 2/10 (Not implemented)

**Evidence:**
- No A2A client implementation
- No A2A server endpoints
- Agents don't communicate with external frameworks (LangChain, CrewAI, etc.)

**Score Rationale:**
- ❌ **No A2A client**: Can't call external A2A-compliant agents
- ❌ **No A2A server**: Can't expose IvyLevel agents to external clients
- ❌ **No JSON-RPC 2.0**: Internal protocol is REST-like, not JSON-RPC
- ❌ **No agent cards**: Agents not describable via standard format

### A2A Alignment Score: 6/10

| Aspect | Score | Evidence |
|--------|-------|----------|
| Agent Discovery | 5/10 | Internal registry, no agent cards/well-known URI |
| Agent-to-Agent Communication | 7/10 | Internal handoffs with tracking, not A2A protocol |
| Inter-Framework Communication | 2/10 | No external agent communication |
| Task Management | 3/10 | Synchronous handoffs, no async task model |
| Streaming/Webhooks | 1/10 | No SSE or webhook support for agent responses |
| Authentication/Security | 5/10 | API auth exists, not A2A-specific (OAuth, mTLS) |
| **Overall A2A** | **6/10** | **Internal handoffs work, not A2A standard** |

### Gaps and Recommendations

#### Gap 1: No A2A-Compliant Agent Cards

**Missing:**
- Agents not exposed as A2A-compliant JSON files
- No `/.well-known/agent.json` endpoint

**Recommendation - Expose Agent Cards:**

```typescript
// services/agent-framework/src/routes/a2a.ts (NEW)

import express from 'express';
import { AgentRegistry } from '../core/AgentRegistry.js';

const router = express.Router();
const registry = new AgentRegistry();

// A2A Agent Card endpoint for each agent
router.get('/.well-known/agent/:agentId.json', (req, res) => {
  const { agentId } = req.params;
  const agent = registry.getAgent(agentId);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const manifest = agent.getManifest();

  // Convert IvyLevel manifest to A2A agent card
  const agentCard = {
    name: manifest.display_name,
    description: manifest.tagline,
    url: `${process.env.BASE_URL}/api/a2a/agents/${agentId}`,
    version: manifest.version,
    capabilities: {
      streaming: false, // TODO: Implement streaming
      pushNotifications: false // TODO: Implement webhooks
    },
    authentication: {
      schemes: ['bearer'] // Requires API key in Authorization header
    },
    skills: manifest.intents.map(intent => ({
      id: intent.intent_id,
      name: intent.intent_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `Handles ${intent.category} queries`,
      examples: intent.patterns.slice(0, 3) // First 3 patterns as examples
    })),
    metadata: {
      jtbd: manifest.jtbd,
      tools: manifest.tools.map(t => t.function.name),
      handoffs: manifest.handoffs
    }
  };

  res.json(agentCard);
});

// List all available agents
router.get('/.well-known/agents.json', (req, res) => {
  const agents = registry.getAllAgents();
  const agentCards = agents.map(agent => {
    const manifest = agent.getManifest();
    return {
      name: manifest.display_name,
      id: manifest.agent_id,
      url: `${process.env.BASE_URL}/.well-known/agent/${manifest.agent_id}.json`,
      category: manifest.category,
      tagline: manifest.tagline
    };
  });

  res.json({ agents: agentCards });
});

export default router;
```

**Implementation Priority:** 🔵 **LOW** - Nice-to-have for external integration

---

#### Gap 2: No A2A Client for External Agents

**Missing:**
- Can't call external A2A-compliant agents (e.g., weather agent, calendar agent)

**Recommendation - Implement A2A Client:**

```typescript
// services/agent-framework/src/a2a/A2AClient.ts (NEW)

import axios from 'axios';

interface A2AAgentCard {
  name: string;
  url: string;
  authentication: { schemes: string[] };
  skills: Array<{ id: string; name: string; examples: string[] }>;
}

export class A2AClient {
  private agentCards: Map<string, A2AAgentCard> = new Map();

  // Discover remote agent
  async discoverAgent(agentUrl: string): Promise<A2AAgentCard> {
    const cardUrl = `${agentUrl}/.well-known/agent.json`;
    const response = await axios.get(cardUrl);
    const card = response.data as A2AAgentCard;

    this.agentCards.set(card.name, card);
    return card;
  }

  // Call remote agent (JSON-RPC 2.0)
  async callAgent(
    agentName: string,
    skillId: string,
    message: string,
    context?: any
  ): Promise<any> {
    const card = this.agentCards.get(agentName);
    if (!card) {
      throw new Error(`Agent ${agentName} not discovered. Call discoverAgent() first.`);
    }

    // JSON-RPC 2.0 request
    const rpcRequest = {
      jsonrpc: '2.0',
      id: uuidv4(),
      method: 'execute_skill',
      params: {
        skill_id: skillId,
        message: {
          sender: 'ivylevel-jenny',
          recipient: agentName,
          timestamp: new Date().toISOString(),
          parts: [
            { type: 'text', content: message }
          ]
        },
        context: context || {}
      }
    };

    // Send request
    const response = await axios.post(card.url, rpcRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.A2A_API_KEY}` // If required
      }
    });

    if (response.data.error) {
      throw new Error(`A2A Error: ${response.data.error.message}`);
    }

    return response.data.result;
  }
}

// Usage example in agent:

// services/agent-framework/src/agents/GamePlanAgent.ts (MODIFICATION)

import { A2AClient } from '../a2a/A2AClient.js';

export class GamePlanAgent extends BaseAgent {
  private a2aClient = new A2AClient();

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    // Check if query requires external agent (e.g., weather, calendar)
    if (this.requiresWeatherData(context.user_message)) {
      // Discover weather agent (once)
      if (!this.a2aClient.hasAgent('WeatherBot')) {
        await this.a2aClient.discoverAgent('https://weather-service.example.com');
      }

      // Call external agent
      const weatherData = await this.a2aClient.callAgent(
        'WeatherBot',
        'get_current_weather',
        'What is the weather in Palo Alto, CA?'
      );

      // Use external data in response
      context.external_data = { weather: weatherData };
    }

    // Continue with normal execution
    return super.execute(context);
  }
}
```

**Implementation Priority:** 🔵 **LOW** - Only needed if integrating external services

---

## Chapter 16: Resource-Aware Optimization Pattern

### Pattern Definition (from book)

**Resource-Aware Optimization** enables agents to dynamically adjust resource usage based on query complexity, cost constraints, latency requirements, and availability. Key concepts:

1. **Cost-Optimized LLM Usage**: Choosing between expensive/accurate (Gemini Pro, GPT-4) vs cheap/fast (Gemini Flash, GPT-4o-mini) models
2. **Latency-Sensitive Operations**: Faster reasoning paths for real-time systems
3. **Energy Efficiency**: Optimizing for battery life on edge devices
4. **Fallback Mechanisms**: Switching to backup models when primary unavailable
5. **Query Router Agent**: LLM or ML-based routing based on query complexity
6. **Critique Agent**: Evaluating responses for quality, providing feedback for self-correction

**Example**: Simple "What's 2+2?" uses Gemini Flash, complex "Analyze my college strategy" uses Gemini Pro

### Current IvyLevel Implementation

#### Resource Optimization: 4/10 (Static configuration, no dynamic selection)

#### 1. Model Selection: 3/10 (Static per agent, no routing)

**Evidence:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts:36-53

constructor(manifest: AgentManifest) {
  this.manifest = manifest;

  // Initialize OpenAI client
  this.openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Use fine-tuned model from env or manifest override
  this.model = manifest.model || process.env.JENNY_V9_EQ_MODEL || 'gpt-4o-mini';

  log.event('agent.initialized', {
    agent_id: manifest.agent_id,
    model: this.model, // ❌ Static assignment, no dynamic selection
    tools_count: manifest.tools.length,
  });
}
```

**Model Configuration** (`.env`):
```bash
JENNY_V9_EQ_MODEL=gpt-4o-mini  # Default for all agents
OPENAI_API_KEY=sk-...
```

**Score Rationale:**
- ✅ **Model configuration**: Can override model per agent via manifest
- ✅ **Environment-driven**: Model specified in .env (easy to change)
- ❌ **No dynamic selection**: Model is static per agent, no query-based routing
- ❌ **No complexity analysis**: All queries use same model regardless of difficulty
- ❌ **No cost optimization**: No logic to prefer cheaper models for simple queries

#### 2. Fallback Mechanisms: 2/10 (Basic error handling, no model fallback)

**Evidence:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts:116-133

try {
  // Call OpenAI with function calling
  const toolCalls: ToolCall[] = [];
  let finalResponse = await this.callOpenAI(messages, toolCalls);

  // ... build response ...
} catch (error: any) {
  log.error('agent.execute_error', error, {
    agent_id: this.manifest.agent_id,
    student_id: context.session.student_id,
  });

  // ❌ No fallback to different model
  // Just returns error response
  return {
    response: {
      answer: `I encountered an error: ${error.message}. Please try rephrasing your question.`,
      chips: [{ kind: 'evidence', text: 'error' }],
      hits: [],
    },
    session: context.session,
    execution_time_ms: Date.now() - startTime,
    tokens_used: 0,
  };
}
```

**Score Rationale:**
- ✅ **Error handling**: Catches OpenAI errors gracefully
- ❌ **No model fallback**: If GPT-4o-mini fails, doesn't try GPT-4o or GPT-3.5
- ❌ **No circuit breaker**: No logic to skip broken models temporarily
- ❌ **No retry logic**: Single attempt, no retries with exponential backoff

#### 3. Latency Optimization: 5/10 (Some optimizations, no dynamic routing)

**Evidence:**

**Parallel Tool Execution:**
```typescript
// services/agent-framework/src/core/BaseAgent.ts
// Tools execute in parallel via OpenAI function calling
// But no latency-based routing between models
```

**RAG Optimization:**
```typescript
// services/agent-framework/src/retrieval/hybrid.ts:14-26
// Vector + Lexical searches run in parallel
const jobs = [
  queryVectors('jtbd', q, cfg.rag_topk_per_ns),
  queryVectors('interactions', q, cfg.rag_topk_per_ns),
];
const results = await Promise.all(jobs); // ✅ Parallel execution
```

**Score Rationale:**
- ✅ **Parallel RAG**: Vector and lexical searches run concurrently
- ✅ **Efficient model**: Default gpt-4o-mini is fast (not gpt-4)
- ❌ **No latency-based routing**: No logic to use faster models for real-time queries
- ❌ **No timeout handling**: No query timeouts or fast-path fallbacks

#### 4. Cost Optimization: 3/10 (Cheap default model, no dynamic pricing awareness)

**Evidence:**

```typescript
// Default model: gpt-4o-mini (cheap)
this.model = manifest.model || process.env.JENNY_V9_EQ_MODEL || 'gpt-4o-mini';

// No cost tracking or optimization
// Pricing (as of 2024):
// - gpt-4o-mini: $0.15/1M input tokens, $0.6/1M output tokens (CHEAP)
// - gpt-4o: $2.50/1M input tokens, $10/1M output tokens (EXPENSIVE)
// - gpt-4-turbo: $10/1M input tokens, $30/1M output tokens (MOST EXPENSIVE)
```

**Score Rationale:**
- ✅ **Cheap default**: gpt-4o-mini is cost-effective
- ❌ **No cost awareness**: No logic to estimate query cost before execution
- ❌ **No budget constraints**: No per-student or per-day token/cost limits
- ❌ **No cost tracking**: Token usage logged but not accumulated or analyzed

#### 5. Query Routing: 1/10 (Intent-based routing, not complexity-based)

**Evidence:**

```typescript
// services/agent-framework/src/core/AgentRegistry.ts:153-192

routeQuery(query: string): BaseAgent {
  const queryLower = query.toLowerCase();

  // ❌ Routes based on INTENT, not COMPLEXITY
  for (const registered of this.agents.values()) {
    for (const intent of registered.manifest.intents) {
      for (const pattern of intent.patterns) {
        if (queryLower.includes(pattern.toLowerCase())) {
          return registered.instance; // Route to agent
        }
      }
    }
  }

  // Default to GamePlanAgent
  return this.agents.get('gameplan-agent').instance;
}
```

**Score Rationale:**
- ✅ **Intent routing**: Routes queries to specialized agents (ECs, Awards, etc.)
- ❌ **No complexity routing**: Doesn't route simple vs complex queries to different models
- ❌ **No query analysis**: No LLM-based complexity estimation
- ❌ **Static routing**: Pattern matching, not learned or adaptive

### Resource Optimization Alignment Score: 4/10

| Aspect | Score | Evidence |
|--------|-------|----------|
| Model Selection | 3/10 | Static per agent, no dynamic selection |
| Fallback Mechanisms | 2/10 | Error handling yes, model fallback no |
| Latency Optimization | 5/10 | Parallel execution, no dynamic routing |
| Cost Optimization | 3/10 | Cheap default model, no cost tracking |
| Query Routing | 1/10 | Intent-based, not complexity-based |
| Critique/Quality Check | 6/10 | Prompt-based validation, no separate critique |
| **Overall Resource Opt** | **4/10** | **Static config, needs dynamic optimization** |

### Gaps and Recommendations

#### Gap 1: No Dynamic Model Selection

**Missing:**
- All queries use same model (gpt-4o-mini)
- No complexity analysis or routing

**Recommendation - Implement Query Router:**

```typescript
// services/agent-framework/src/optimization/QueryRouter.ts (NEW)

interface QueryComplexity {
  score: number; // 0-10 (0=trivial, 10=very complex)
  factors: {
    length: number;          // Query token count
    ambiguity: number;       // Multiple interpretations?
    multiStep: boolean;      // Requires multi-step reasoning?
    domainSpecific: boolean; // Requires specialized knowledge?
  };
  suggestedModel: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo';
  estimatedCost: number;     // USD
  estimatedLatency: number;  // ms
}

export class QueryRouter {
  // Analyze query complexity
  async analyzeComplexity(query: string, context?: any): Promise<QueryComplexity> {
    // Use fast model to assess complexity
    const prompt = `
      Analyze the complexity of this query. Consider:
      1. Length and specificity
      2. Ambiguity (multiple interpretations?)
      3. Multi-step reasoning required?
      4. Domain-specific knowledge needed?

      Query: "${query}"
      Context: ${JSON.stringify(context || {})}

      Respond in JSON:
      {
        "complexityScore": 0-10,
        "reasoning": "Why this score?",
        "isMultiStep": true/false,
        "requiresSpecializedKnowledge": true/false
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use cheap model for routing decision
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 200 // Keep routing fast
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    // Map complexity to model
    let suggestedModel: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo';
    if (analysis.complexityScore <= 3) {
      suggestedModel = 'gpt-4o-mini'; // Simple queries
    } else if (analysis.complexityScore <= 7) {
      suggestedModel = 'gpt-4o'; // Moderate complexity
    } else {
      suggestedModel = 'gpt-4-turbo'; // High complexity
    }

    return {
      score: analysis.complexityScore,
      factors: {
        length: query.split(' ').length,
        ambiguity: analysis.complexityScore > 5 ? 0.7 : 0.2,
        multiStep: analysis.isMultiStep,
        domainSpecific: analysis.requiresSpecializedKnowledge
      },
      suggestedModel,
      estimatedCost: this.estimateCost(query, suggestedModel),
      estimatedLatency: this.estimateLatency(suggestedModel)
    };
  }

  // Estimate cost based on model and query length
  private estimateCost(query: string, model: string): number {
    const inputTokens = Math.ceil(query.length / 4); // Rough estimate
    const outputTokens = 500; // Assume 500 tokens average response

    const pricing = {
      'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
      'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
      'gpt-4-turbo': { input: 10 / 1_000_000, output: 30 / 1_000_000 }
    };

    const p = pricing[model];
    return (inputTokens * p.input) + (outputTokens * p.output);
  }

  // Estimate latency based on model
  private estimateLatency(model: string): number {
    const latencies = {
      'gpt-4o-mini': 800,   // ~800ms average
      'gpt-4o': 1500,       // ~1.5s average
      'gpt-4-turbo': 3000   // ~3s average
    };
    return latencies[model];
  }

  // Route query to optimal model
  async routeQuery(
    query: string,
    context?: any,
    constraints?: {
      maxCost?: number;    // Max USD per query
      maxLatency?: number; // Max ms
      preferCheap?: boolean;
    }
  ): Promise<{ model: string; complexity: QueryComplexity }> {
    const complexity = await this.analyzeComplexity(query, context);
    let selectedModel = complexity.suggestedModel;

    // Apply constraints
    if (constraints?.maxCost && complexity.estimatedCost > constraints.maxCost) {
      selectedModel = 'gpt-4o-mini'; // Fallback to cheap
    }

    if (constraints?.maxLatency && complexity.estimatedLatency > constraints.maxLatency) {
      selectedModel = 'gpt-4o-mini'; // Fallback to fast
    }

    if (constraints?.preferCheap) {
      selectedModel = 'gpt-4o-mini'; // Always use cheap
    }

    logger.event('query.routed', {
      query_preview: query.substring(0, 50),
      suggested_model: complexity.suggestedModel,
      selected_model: selectedModel,
      complexity_score: complexity.score,
      estimated_cost: complexity.estimatedCost,
      estimated_latency: complexity.estimatedLatency
    });

    return { model: selectedModel, complexity };
  }
}
```

**Integration in BaseAgent:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts (MODIFICATION)

import { QueryRouter } from '../optimization/QueryRouter.js';

async execute(context: AgentExecutionContext, registry?: any): Promise<AgentExecutionResult> {
  // NEW: Route query to optimal model
  const router = new QueryRouter();
  const { model, complexity } = await router.routeQuery(
    context.user_message,
    context.session.context,
    {
      maxCost: 0.01,      // Max $0.01 per query
      maxLatency: 5000,   // Max 5s
      preferCheap: false  // Allow expensive models for complex queries
    }
  );

  // Override agent's default model with routed model
  this.model = model;

  logger.event('agent.model_selected', {
    agent_id: this.manifest.agent_id,
    model: model,
    complexity_score: complexity.score,
    estimated_cost: complexity.estimatedCost
  });

  // ... rest of execution with selected model ...
}
```

**Implementation Priority:** 🟡 **MEDIUM** - Cost savings for production

---

#### Gap 2: No Fallback Mechanisms

**Missing:**
- No model fallback if primary model fails
- No circuit breaker for repeatedly failing models
- No retry logic

**Recommendation - Implement Fallback System:**

```typescript
// services/agent-framework/src/optimization/FallbackManager.ts (NEW)

interface FallbackConfig {
  primaryModel: string;
  fallbackModels: string[];
  maxRetries: number;
  retryDelay: number; // ms
}

export class FallbackManager {
  private failureCount: Map<string, number> = new Map(); // Track model failures
  private circuitOpen: Map<string, boolean> = new Map(); // Circuit breaker state

  // Execute with fallback
  async executeWithFallback(
    config: FallbackConfig,
    executeFn: (model: string) => Promise<any>
  ): Promise<any> {
    const modelsToTry = [config.primaryModel, ...config.fallbackModels];

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];

      // Check circuit breaker
      if (this.circuitOpen.get(model)) {
        logger.warn(`Circuit breaker open for ${model}, skipping`);
        continue;
      }

      // Try executing with this model
      for (let retry = 0; retry < config.maxRetries; retry++) {
        try {
          const result = await executeFn(model);

          // Success - reset failure count
          this.failureCount.set(model, 0);

          logger.event('fallback.success', {
            model,
            attempt: i + 1,
            retry: retry + 1
          });

          return result;
        } catch (error: any) {
          logger.error(`Attempt ${retry + 1} failed for ${model}:`, error);

          // Increment failure count
          const failures = (this.failureCount.get(model) || 0) + 1;
          this.failureCount.set(model, failures);

          // Open circuit breaker if too many failures (5+)
          if (failures >= 5) {
            logger.warn(`Opening circuit breaker for ${model} (${failures} failures)`);
            this.circuitOpen.set(model, true);

            // Auto-close circuit after 5 minutes
            setTimeout(() => {
              logger.info(`Closing circuit breaker for ${model}`);
              this.circuitOpen.set(model, false);
              this.failureCount.set(model, 0);
            }, 5 * 60 * 1000);
          }

          // Wait before retrying
          if (retry < config.maxRetries - 1) {
            await this.sleep(config.retryDelay * Math.pow(2, retry)); // Exponential backoff
          }
        }
      }
    }

    // All models failed
    throw new Error(`All models exhausted: ${modelsToTry.join(', ')}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Integration:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts (MODIFICATION)

import { FallbackManager } from '../optimization/FallbackManager.js';

async execute(context: AgentExecutionContext, registry?: any): Promise<AgentExecutionResult> {
  const fallbackManager = new FallbackManager();

  // Execute with fallback
  const result = await fallbackManager.executeWithFallback(
    {
      primaryModel: this.model,
      fallbackModels: ['gpt-4o', 'gpt-3.5-turbo'], // Fallback chain
      maxRetries: 3,
      retryDelay: 1000 // 1s initial delay
    },
    async (model) => {
      // Execute with this model
      this.model = model;
      return await this.callOpenAI(messages, toolCalls);
    }
  );

  // ... continue with result ...
}
```

**Implementation Priority:** 🟡 **MEDIUM** - Important for reliability

---

#### Gap 3: No Cost Tracking or Budget Constraints

**Missing:**
- Token usage logged but not accumulated
- No per-student cost limits
- No budget alerts

**Recommendation - Implement Cost Tracking:**

```typescript
// services/agent-framework/src/optimization/CostTracker.ts (NEW)

interface UsageRecord {
  student_id: string;
  session_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  timestamp: Date;
}

export class CostTracker {
  private pool: Pool;

  // Track usage
  async trackUsage(record: UsageRecord): Promise<void> {
    await this.pool.query(`
      INSERT INTO llm_usage (
        student_id, session_id, model, input_tokens, output_tokens, cost_usd, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      record.student_id,
      record.session_id,
      record.model,
      record.input_tokens,
      record.output_tokens,
      record.cost_usd
    ]);
  }

  // Get student's usage (last 30 days)
  async getStudentUsage(studentId: string): Promise<{
    total_cost: number;
    total_queries: number;
    avg_cost_per_query: number;
  }> {
    const result = await this.pool.query(`
      SELECT
        SUM(cost_usd) as total_cost,
        COUNT(*) as total_queries,
        AVG(cost_usd) as avg_cost_per_query
      FROM llm_usage
      WHERE student_id = $1
        AND timestamp > NOW() - INTERVAL '30 days'
    `, [studentId]);

    return result.rows[0];
  }

  // Check if student exceeds budget
  async checkBudget(studentId: string, budgetUsd: number = 10.0): Promise<{
    withinBudget: boolean;
    currentUsage: number;
    remaining: number;
  }> {
    const usage = await this.getStudentUsage(studentId);
    const remaining = budgetUsd - usage.total_cost;

    return {
      withinBudget: remaining > 0,
      currentUsage: usage.total_cost,
      remaining: Math.max(0, remaining)
    };
  }
}

// Database schema
CREATE TABLE llm_usage (
  usage_id SERIAL PRIMARY KEY,
  student_id VARCHAR(255),
  session_id VARCHAR(255),
  model VARCHAR(50),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_student ON llm_usage(student_id, timestamp);
```

**Integration:**

```typescript
// services/agent-framework/src/core/BaseAgent.ts (MODIFICATION)

async execute(context: AgentExecutionContext, registry?: any): Promise<AgentExecutionResult> {
  const costTracker = new CostTracker(pool);

  // Check budget before executing
  const budget = await costTracker.checkBudget(context.session.student_id);
  if (!budget.withinBudget) {
    return {
      response: {
        answer: "You've reached your monthly usage limit. Please contact support for an upgrade.",
        chips: [],
        hits: []
      },
      session: context.session,
      execution_time_ms: 0,
      tokens_used: 0
    };
  }

  // Execute query
  const response = await this.callOpenAI(messages, toolCalls);

  // Track usage
  await costTracker.trackUsage({
    student_id: context.session.student_id,
    session_id: context.session.session_id,
    model: this.model,
    input_tokens: response.usage.prompt_tokens,
    output_tokens: response.usage.completion_tokens,
    cost_usd: this.calculateCost(response.usage, this.model),
    timestamp: new Date()
  });

  // ... rest of execution ...
}
```

**Implementation Priority:** 🟡 **MEDIUM** - Important for cost control at scale

---

## Overall Part 3-A Summary

### Pattern Implementation Matrix

| Pattern | Score | Status | Key Strengths | Critical Gaps |
|---------|-------|--------|---------------|---------------|
| **Human-in-the-Loop** | 4/10 | 🟡 Partial | Conversation logging, notification system | No escalation policies, no feedback collection |
| **Knowledge Retrieval (RAG)** | 9/10 | 🟢 Strong | Hybrid search, Pinecone vectors, Cohere reranking | No agentic reflection, no GraphRAG |
| **Inter-Agent Communication** | 6/10 | 🟡 Moderate | Internal handoffs with tracking | No A2A protocol, no external agents |
| **Resource Optimization** | 4/10 | 🟡 Partial | Cheap default model, parallel execution | No dynamic model selection, no fallbacks |
| **Overall Part 3-A** | **5.8/10** | 🟡 **Moderate** | **Strong RAG, weak optimization/HITL** | **Need escalation, routing, fallbacks** |

### Implementation Priorities

#### 🔴 HIGH Priority (Critical for production safety/quality)
1. **Human Escalation System** (HITL Gap 1)
   - Escalation policies and conditions
   - Coach notification workflow
   - Automatic escalation for sensitive topics
   - **Impact**: User trust, safety, compliance

#### 🟡 MEDIUM Priority (Important for quality/cost)
2. **Feedback Collection System** (HITL Gap 2)
   - Thumbs up/down UI
   - Negative feedback escalation
   - Feedback analytics dashboard
   - **Impact**: Quality monitoring, continuous improvement

3. **Query Router** (Resource Opt Gap 1)
   - Complexity analysis
   - Dynamic model selection
   - Cost-aware routing
   - **Impact**: 30-50% cost reduction at scale

4. **Fallback Manager** (Resource Opt Gap 2)
   - Model fallback chain
   - Circuit breaker pattern
   - Retry with exponential backoff
   - **Impact**: Reliability, uptime

5. **Cost Tracker** (Resource Opt Gap 3)
   - Token usage tracking
   - Per-student budgets
   - Usage analytics
   - **Impact**: Cost control, budget management

#### 🔵 LOW Priority (Nice-to-have enhancements)
6. **Coach Dashboard** (HITL Gap 3)
   - Real-time session monitoring
   - Agent performance metrics
   - Escalation management UI
   - **Impact**: Coach efficiency, oversight

7. **Agentic RAG Reflection** (RAG Enhancement 1)
   - Query refinement loop
   - Result critique agent
   - Multi-step retrieval
   - **Impact**: Retrieval quality for complex queries

8. **A2A Protocol Support** (A2A Gap 1-2)
   - Agent card exposure
   - A2A client for external agents
   - JSON-RPC 2.0 endpoints
   - **Impact**: External service integration

9. **GraphRAG** (RAG Enhancement 2)
   - Knowledge graph relationships
   - Multi-hop traversal
   - Relationship-based retrieval
   - **Impact**: Better relational queries

---

## Conclusion

IvyLevel Platform v10 demonstrates **strong RAG implementation (9/10)** with production-grade hybrid search, vector databases, and reranking. However, it has significant gaps in **Human-in-the-Loop (4/10)** and **Resource Optimization (4/10)** patterns.

**Immediate Action Items:**
1. Implement escalation system for safety/trust
2. Add feedback collection for quality monitoring
3. Build query router for cost optimization
4. Add fallback mechanisms for reliability

**Long-term Enhancements:**
- Coach oversight dashboard
- Agentic RAG with reflection
- A2A protocol for external integration
- GraphRAG for relational queries

With these improvements, IvyLevel can achieve **8-9/10 alignment** across all Part 3-A patterns, positioning it as a production-ready, cost-optimized, human-supervised agentic platform.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
**Next Review**: After implementing HIGH priority gaps
**Related Documents**:
- [AGENTIC_PATTERNS_ANALYSIS_PART1A.md](./AGENTIC_PATTERNS_ANALYSIS_PART1A.md)
- [AGENTIC_PATTERNS_ANALYSIS_PART1B.md](./AGENTIC_PATTERNS_ANALYSIS_PART1B.md)
- [AGENTIC_PATTERNS_ANALYSIS_PART2A.md](./AGENTIC_PATTERNS_ANALYSIS_PART2A.md)
- [AGENTIC_PATTERNS_ANALYSIS_PART2B.md](./AGENTIC_PATTERNS_ANALYSIS_PART2B.md)
