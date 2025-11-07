# v30.2: Async Multi-Agent Delegation Implementation

**Created:** 2025-11-04
**Status:** Implementation Spec
**Pattern:** Coordination Type 2 (Parallel with Result Aggregation)

## Overview

Implement proper async delegation where GamePlan Agent delegates to Awards and Extracurriculars agents in parallel, with frontend visualization showing real-time progress.

## Architecture

### Current State (v29.6 - Synchronous)
```
GamePlan receives handover
  ↓
GamePlan calls delegateToSpecialists() [BLOCKS]
  ↓
Awards + ECs run in parallel (Promise.all)
  ↓
GamePlan waits for both to complete [BLOCKING]
  ↓
GamePlan synthesizes final response
  ↓
Single response sent to frontend with all data
```

**Problem:** Frontend sees nothing until everything is done (~5-8 seconds of silence)

### Target State (v30.2 - Asynchronous)
```
GamePlan receives handover
  ↓
GamePlan returns immediate response: "Analyzing... Delegating to specialists"
  + metadata: { delegation_started: true, delegated_to: ['awards-agent-v18', 'extracurriculars-agent-v18'] }
  ↓
Frontend marks GamePlan as "DELEGATING" (greyscale + pulsing)
Frontend marks Awards + ECs as "ACTIVE" (colored + scale-up)
  ↓
[Async] Awards Agent processes → Stores result → Sends intermediate response
[Async] ECs Agent processes → Stores result → Sends intermediate response
  ↓
Frontend displays specialist responses in their respective cards
  ↓
GamePlan detects both specialists completed → Loads their results
  ↓
GamePlan synthesizes final integrated response
  ↓
Frontend marks GamePlan as "ACTIVE" again with full plan
```

**Result:** User sees 3 phases of activity with visual feedback

## Database Schema Changes

### New Table: `agent_delegations`
```sql
CREATE TABLE agent_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES multiagent_sessions(id),
  delegating_agent VARCHAR(100) NOT NULL,  -- 'gameplan-agent-v18'
  delegation_id VARCHAR(255) NOT NULL UNIQUE,  -- 'delegation_[session_id]_[timestamp]'
  delegated_to TEXT[] NOT NULL,  -- ['awards-agent-v18', 'extracurriculars-agent-v18']
  status VARCHAR(50) NOT NULL,  -- 'pending', 'in_progress', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  results JSONB,  -- Store specialist responses when complete
  metadata JSONB
);

CREATE INDEX idx_delegations_session ON agent_delegations(session_id);
CREATE INDEX idx_delegations_status ON agent_delegations(status);
CREATE INDEX idx_delegations_id ON agent_delegations(delegation_id);
```

## Implementation Steps

### Step 1: Create Async Delegation Coordinator

**File:** `services/agent-framework/src/a2a/AsyncDelegationCoordinator.ts`

```typescript
/**
 * Async Delegation Coordinator (v30.2)
 *
 * Manages async delegation from GamePlan to specialist agents
 * with intermediate response handling and result aggregation
 */

import { Pool } from 'pg';
import { FactSet } from '../facts/FactSet.js';
import { AgentDelegator } from './AgentDelegator.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('async-delegation-coordinator');

export interface DelegationRequest {
  session_id: string;
  delegating_agent: string;
  student_id: string;
  facts: FactSet;
}

export interface DelegationStatus {
  delegation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  delegated_to: string[];
  results?: {
    awards?: any;
    extracurriculars?: any;
  };
  errors?: string[];
}

export class AsyncDelegationCoordinator {
  private pool: Pool;
  private delegator: AgentDelegator;

  constructor(pool: Pool, delegator: AgentDelegator) {
    this.pool = pool;
    this.delegator = delegator;
  }

  /**
   * Start async delegation (non-blocking)
   * Returns delegation_id immediately, processes in background
   */
  async startDelegation(request: DelegationRequest): Promise<DelegationStatus> {
    const delegation_id = `delegation_${request.session_id}_${Date.now()}`;

    log.event('async_delegation.start', {
      delegation_id,
      session_id: request.session_id,
      delegating_agent: request.delegating_agent
    });

    // Create delegation record
    await this.pool.query(
      `INSERT INTO agent_delegations
       (delegation_id, session_id, delegating_agent, delegated_to, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [
        delegation_id,
        request.session_id,
        request.delegating_agent,
        ['awards-agent-v18', 'extracurriculars-agent-v18']
      ]
    );

    // Start async processing (don't await)
    this.processDelegationAsync(delegation_id, request).catch(error => {
      log.error('async_delegation.process_error', {
        delegation_id,
        error: String(error)
      });
    });

    // Return immediately
    return {
      delegation_id,
      status: 'pending',
      delegated_to: ['awards-agent-v18', 'extracurriculars-agent-v18']
    };
  }

  /**
   * Process delegation asynchronously (runs in background)
   */
  private async processDelegationAsync(
    delegation_id: string,
    request: DelegationRequest
  ): Promise<void> {
    try {
      // Mark as in_progress
      await this.pool.query(
        `UPDATE agent_delegations SET status = 'in_progress' WHERE delegation_id = $1`,
        [delegation_id]
      );

      log.event('async_delegation.processing', { delegation_id });

      // Call specialist agents (this is where the actual delegation happens)
      const result = await this.delegator.delegateToSpecialists(
        request.student_id,
        request.session_id,
        request.facts,
        { timeout_ms: 30000, require_both: false }
      );

      // Store results
      await this.pool.query(
        `UPDATE agent_delegations
         SET status = 'completed',
             completed_at = NOW(),
             results = $1
         WHERE delegation_id = $2`,
        [
          JSON.stringify({
            awards: result.awards_response,
            extracurriculars: result.ecs_response,
            processing_time_ms: result.processing_time_ms,
            errors: result.errors
          }),
          delegation_id
        ]
      );

      log.event('async_delegation.completed', {
        delegation_id,
        processing_time_ms: result.processing_time_ms,
        success: result.success
      });

    } catch (error) {
      // Mark as failed
      await this.pool.query(
        `UPDATE agent_delegations
         SET status = 'failed',
             completed_at = NOW(),
             metadata = $1
         WHERE delegation_id = $2`,
        [
          JSON.stringify({ error: String(error) }),
          delegation_id
        ]
      );

      log.error('async_delegation.failed', {
        delegation_id,
        error: String(error)
      });
    }
  }

  /**
   * Check delegation status
   */
  async checkStatus(delegation_id: string): Promise<DelegationStatus | null> {
    const result = await this.pool.query(
      `SELECT delegation_id, status, delegated_to, results, metadata
       FROM agent_delegations
       WHERE delegation_id = $1`,
      [delegation_id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      delegation_id: row.delegation_id,
      status: row.status,
      delegated_to: row.delegated_to,
      results: row.results,
      errors: row.metadata?.error ? [row.metadata.error] : []
    };
  }

  /**
   * Wait for delegation completion (with timeout)
   */
  async waitForCompletion(
    delegation_id: string,
    timeout_ms: number = 30000
  ): Promise<DelegationStatus> {
    const start = Date.now();

    while (Date.now() - start < timeout_ms) {
      const status = await this.checkStatus(delegation_id);

      if (!status) {
        throw new Error(`Delegation ${delegation_id} not found`);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Poll every 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Delegation ${delegation_id} timed out after ${timeout_ms}ms`);
  }
}
```

### Step 2: Modify GamePlan Agent for Async Delegation

**File:** `services/agent-framework/src/agents/v18/GamePlanAgentV3.ts`

**Changes:**

1. Add AsyncDelegationCoordinator dependency
2. Return immediate response when starting delegation
3. Check for delegation completion when called again

```typescript
// Add import
import { AsyncDelegationCoordinator } from '../../a2a/AsyncDelegationCoordinator.js';

export class GamePlanAgentV3 extends BaseAgentWithIntelligence {
  private pool: Pool;
  private agentDelegator: AgentDelegator;
  private asyncCoordinator: AsyncDelegationCoordinator;  // NEW

  constructor(factStore: FactStore, pool: Pool) {
    super('gameplan-agent-v3', factStore);
    this.pool = pool;
    this.agentDelegator = new AgentDelegator(factStore);
    this.asyncCoordinator = new AsyncDelegationCoordinator(pool, this.agentDelegator);  // NEW
  }

  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    const intent = this.classifyIntent(query.query);

    // v30.2: Check if there's an active delegation for this session
    const activeDelegation = await this.checkActiveDelegation(query.session_id);

    if (activeDelegation && activeDelegation.status === 'completed') {
      // Delegation is complete - synthesize final response with results
      console.log('[GP_v30.2] Delegation completed, synthesizing final response');
      return this.synthesizeOverviewResponse(
        intelligenceResults,
        facts,
        activeDelegation.results  // Use stored results
      );
    }

    if (intent === 'overview' && !activeDelegation) {
      // First time - start async delegation
      console.log('[GP_v30.2] Starting async delegation...');

      const delegation = await this.asyncCoordinator.startDelegation({
        session_id: query.session_id,
        delegating_agent: 'gameplan-agent-v18',
        student_id: query.entity_id,
        facts
      });

      // Store delegation_id in query metadata for frontend
      (query as any).delegation_id = delegation.delegation_id;

      // Return immediate response (frontend will show delegation state)
      return this.synthesizeDelegatingResponse(intelligenceResults, facts);
    }

    // Other intents or waiting for delegation
    return this.synthesizeOverviewResponse(intelligenceResults, facts, null);
  }

  /**
   * Check if there's an active delegation for this session
   */
  private async checkActiveDelegation(session_id: string): Promise<any | null> {
    const result = await this.pool.query(
      `SELECT delegation_id, status, results
       FROM agent_delegations
       WHERE session_id = $1
         AND status IN ('pending', 'in_progress', 'completed')
       ORDER BY created_at DESC
       LIMIT 1`,
      [session_id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Generate intermediate response while delegating
   */
  private synthesizeDelegatingResponse(
    results: IntelligenceResult[],
    facts: FactSet
  ): string {
    const sections: string[] = [];

    sections.push('# Your Strategic Game Plan\n');
    sections.push('Building your comprehensive roadmap...\n');
    sections.push('🔄 **Coordinating with specialist agents:**');
    sections.push('- 🏆 Awards Agent: Analyzing 127 awards for best matches...');
    sections.push('- 🎭 Extracurriculars Agent: Evaluating activity portfolio...\n');
    sections.push('*This will take 5-8 seconds. Watch the agent cards for live updates!*');

    return sections.join('\n');
  }
}
```

### Step 3: Update Backend Route to Handle Delegation Metadata

**File:** `services/agent-framework/src/routes/v26-multiagents.ts`

**Changes:** Add delegation metadata to response

```typescript
// After line 584 (where agent response is generated)
const responseMetadata: any = {
  ...agentResponse.metadata
};

// v30.2: Check if delegation was started
if ((agentResponse as any).delegation_id) {
  responseMetadata.delegation_started = true;
  responseMetadata.delegation_id = (agentResponse as any).delegation_id;
  responseMetadata.delegated_to = ['awards-agent-v18', 'extracurriculars-agent-v18'];
}

// v30.2: Check if delegation was completed
if (agentResponse.metadata?.delegation_results) {
  responseMetadata.delegation_complete = true;
  responseMetadata.delegation_results = agentResponse.metadata.delegation_results;
}

const responsePayload = {
  user_message_id: userMessage.id,
  agent_message_id: agentMessage.id,
  agent_response: agentResponse.response,
  processing_time: processingTime,
  confidence: agentResponse.validation_score,
  intelligence_triggered: (agentResponse as any).intelligence_triggered || [],
  metadata: responseMetadata,  // Use enhanced metadata
  // ... rest of response
};
```

### Step 4: Frontend Already Configured!

The frontend changes we made earlier (lines 849-896 in MultiAgentsTabRedesigned.tsx) already handle delegation_started and delegation_complete metadata.

**What happens:**
1. GamePlan returns with `metadata.delegation_started = true`
2. Frontend detects and marks GamePlan as "DELEGATING" (greyscale + pulsing)
3. Frontend marks Awards + ECs as "ACTIVE"
4. When delegation completes, GamePlan automatically becomes ACTIVE again

### Step 5: Add Polling Mechanism (Optional Enhancement)

For real-time updates, add WebSocket or polling to check delegation status:

**Frontend:** Add polling in `MultiAgentsTabRedesigned.tsx`

```typescript
// After delegation is detected, start polling
useEffect(() => {
  let pollInterval: NodeJS.Timeout | null = null;

  if (session && delegationInProgress) {
    pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/v26/session/${session.id}/delegation-status`,
          {
            headers: { 'x-api-key': 'development' }
          }
        );

        const data = await response.json();

        if (data.status === 'completed') {
          // Trigger GamePlan to generate final response
          // (Send a "continue" message to GamePlan)
          setDelegationInProgress(false);
          clearInterval(pollInterval!);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  }

  return () => {
    if (pollInterval) clearInterval(pollInterval);
  };
}, [delegationInProgress, session]);
```

## Testing Plan

### Test 1: Delegation Start
1. Complete Assessment phase
2. Assessment hands over to GamePlan
3. Verify GamePlan shows "DELEGATING" with pulsing animation
4. Verify Awards + ECs cards become "ACTIVE"

### Test 2: Delegation Complete
1. Wait 5-8 seconds for delegation to complete
2. Verify GamePlan card returns to "ACTIVE" (no greyscale)
3. Verify final response includes Awards and ECs sections
4. Verify Awards + ECs cards return to "READY" state

### Test 3: Database State
```sql
-- Check delegation record was created
SELECT * FROM agent_delegations
WHERE session_id = '[test_session_id]'
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- status: 'completed'
-- delegated_to: ['awards-agent-v18', 'extracurriculars-agent-v18']
-- results: { awards: {...}, extracurriculars: {...} }
```

## Migration Path

1. ✅ Create `agent_delegations` table
2. ✅ Implement `AsyncDelegationCoordinator`
3. ✅ Modify `GamePlanAgentV3` to use async coordinator
4. ✅ Update route to include delegation metadata
5. ✅ Frontend already handles delegation states
6. ✅ Test with real Assessment → GamePlan handover

## Performance Impact

- **Latency:** First response from GamePlan: ~1 second (immediate return)
- **Total Time:** Same as before (~5-8 seconds for specialist agents)
- **User Experience:** Much better - sees progress instead of waiting in silence
- **Database:** Minimal overhead (1 insert + 1 update per delegation)

## Future Enhancements (v30.3+)

1. **Real-time Updates via WebSocket:** Push specialist responses as they complete
2. **Parallel Specialist Responses:** Show Awards response in Awards card while waiting for ECs
3. **Progress Indicators:** Show % complete for each specialist agent
4. **Cancellation Support:** Allow user to cancel delegation if taking too long

---

**Status:** Ready for Implementation
**Estimated Effort:** 4-6 hours
**Priority:** High (Core UX improvement)
