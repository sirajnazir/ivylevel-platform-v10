# v34.0 Universal Orchestration - Implementation Roadmap

**Version:** v34.0
**Date:** 2025-11-05
**Status:** ✅ APPROVED - Ready for Implementation
**Team Review Score:** A+ (95/100)

---

## Executive Summary

**Architecture validated by team as production-ready, enterprise-grade design.**

**Key Improvements from Team Feedback:**
1. ✅ Add signal extensibility (`extensions` field)
2. ✅ Comprehensive decision engine tests (must-have)
3. ✅ Structured logging for observability (must-have)
4. ✅ Migration checklist for agents (must-have)
5. ⭐ Configuration-driven routing (defer to v35.0)

---

## Sprint Plan (6 Weeks = 3 Sprints x 2 Weeks)

### Sprint 1 (Weeks 1-2): Core Orchestrator + Decision Engines

**Goal:** Build v34.0 orchestrator with backward compatibility

**Deliverables:**
- [ ] LangGraphOrchestratorV34 implementation
- [ ] Decision engines (Handover, Delegation, Escalation)
- [ ] Signal extraction with v26 fallback
- [ ] Comprehensive unit tests (80%+ coverage)
- [ ] Structured logging
- [ ] Test with existing v32.0 agents

---

### Sprint 2 (Weeks 3-4): Agent Migration + Protocol

**Goal:** Migrate agents to universal signal protocol

**Deliverables:**
- [ ] Assessment Agent returns signals
- [ ] GamePlan Agent returns signals
- [ ] Execution Agent returns signals
- [ ] Remove v26 fallback code
- [ ] Update agent tests
- [ ] End-to-end workflow tests

---

### Sprint 3 (Weeks 5-6): Frontend + Production Polish

**Goal:** Frontend integration and production readiness

**Deliverables:**
- [ ] Update MultiAgentsTabRedesigned.tsx
- [ ] Handover timeline visualization
- [ ] Delegation progress indicators
- [ ] Performance testing
- [ ] Documentation
- [ ] Production deployment

---

## Week-by-Week Breakdown

### Week 1: Foundation + Decision Engines

#### Day 1: Project Setup
- [ ] Create `services/agent-framework/src/langgraph/v34/` directory
- [ ] Copy `LangGraphOrchestratorV31.ts` → `LangGraphOrchestratorV34.ts`
- [ ] Update imports and class name

#### Day 2-3: Signal Protocol
**File:** `services/agent-framework/src/langgraph/v34/types.ts`

```typescript
/**
 * Universal Agent Completion Signals
 *
 * v34.0: Agents return signals (not orchestration commands)
 */
export interface AgentCompletionSignals {
  // Core completion state
  phase_complete: boolean;
  completion_percentage: number;  // 0-100
  confidence: number;              // 0-1

  // Next step suggestions (hints, not commands)
  suggested_next_phase?: 'gameplan' | 'execution';
  requires_delegation?: DelegationRequest[];

  // Conditions
  needs_human_escalation?: boolean;
  needs_more_data?: boolean;

  // Quality metrics
  fact_coverage?: number;          // 0-1
  conversation_depth?: number;     // 1-5

  // v34.0: Extensibility (team feedback)
  extensions?: Record<string, any>;
}

export interface DelegationRequest {
  domain: 'awards' | 'extracurriculars' | 'programs' | 'scholarships';
  reason: string;
  context: Record<string, any>;
}

export interface HandoverDecision {
  should_handover: boolean;
  next_agent?: string;
  reason: string;
}

export interface DelegationDecision {
  should_delegate: boolean;
  target_agents?: string[];
  delegation_requests?: DelegationRequest[];
}

export interface EscalationDecision {
  should_escalate: boolean;
  reason?: string;
  escalation_type?: 'human_coach' | 'technical_support' | 'data_quality';
}
```

#### Day 4-5: Decision Engines
**File:** `services/agent-framework/src/langgraph/v34/HandoverDecisionEngine.ts`

```typescript
import { WorkflowState } from '../state.js';
import { AgentCompletionSignals, HandoverDecision } from './types.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('handover-decision-engine');

/**
 * Handover Decision Engine
 *
 * Orchestrator owns routing decisions (not agents)
 */
export class HandoverDecisionEngine {
  /**
   * Decide if handover should occur
   */
  shouldHandover(
    state: WorkflowState,
    signals: AgentCompletionSignals
  ): HandoverDecision {
    const currentAgent = state.agent_context.current_agent;

    log.event('handover.evaluate', {
      current_agent: currentAgent,
      phase_complete: signals.phase_complete,
      completion: signals.completion_percentage,
      confidence: signals.confidence
    });

    // Rule 1: Phase must be complete
    if (!signals.phase_complete) {
      return {
        should_handover: false,
        reason: 'phase_incomplete'
      };
    }

    // Rule 2: Minimum completion threshold
    if (signals.completion_percentage < 100) {
      return {
        should_handover: false,
        reason: 'below_completion_threshold'
      };
    }

    // Rule 3: Confidence threshold
    if (signals.confidence < 0.8) {
      return {
        should_handover: false,
        reason: 'low_confidence'
      };
    }

    // Rule 4: Route based on current agent
    const decision = this.routeAgent(currentAgent, signals);

    log.event('handover.decision', {
      current_agent: currentAgent,
      should_handover: decision.should_handover,
      next_agent: decision.next_agent,
      reason: decision.reason
    });

    return decision;
  }

  /**
   * Route to next agent
   *
   * TODO v35.0: Make this configuration-driven
   */
  private routeAgent(
    currentAgent: string,
    signals: AgentCompletionSignals
  ): HandoverDecision {
    // Assessment → GamePlan
    if (currentAgent === 'assessment-agent-v18') {
      return {
        should_handover: true,
        next_agent: 'gameplan-agent-v18',
        reason: 'assessment_complete'
      };
    }

    // GamePlan → Execution
    if (currentAgent === 'gameplan-agent-v18') {
      return {
        should_handover: true,
        next_agent: 'execution-agent',
        reason: 'gameplan_complete'
      };
    }

    // Terminal agents
    if (currentAgent === 'execution-agent') {
      return {
        should_handover: false,
        reason: 'terminal_agent'
      };
    }

    // Unknown agent (shouldn't happen)
    log.error('handover.unknown_agent', { agent: currentAgent });
    return {
      should_handover: false,
      reason: 'unknown_agent'
    };
  }
}
```

**File:** `services/agent-framework/src/langgraph/v34/DelegationDecisionEngine.ts`

```typescript
import { WorkflowState } from '../state.js';
import { AgentCompletionSignals, DelegationDecision } from './types.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('delegation-decision-engine');

/**
 * Delegation Decision Engine
 *
 * Decides when to call specialist agents
 */
export class DelegationDecisionEngine {
  shouldDelegate(
    state: WorkflowState,
    signals: AgentCompletionSignals
  ): DelegationDecision {
    const currentAgent = state.agent_context.current_agent;

    // Only GamePlan can delegate
    if (currentAgent !== 'gameplan-agent-v18') {
      return { should_delegate: false };
    }

    // Check if agent requested delegation
    if (!signals.requires_delegation || signals.requires_delegation.length === 0) {
      return { should_delegate: false };
    }

    // Map delegation requests to target agents
    const targetAgents = signals.requires_delegation.map(req => {
      switch (req.domain) {
        case 'awards':
          return 'awards-agent-v18';
        case 'extracurriculars':
          return 'extracurriculars-agent-v18';
        case 'programs':
        case 'scholarships':
          return 'scholarships-agent';
        default:
          log.error('delegation.unknown_domain', { domain: req.domain });
          return null;
      }
    }).filter(Boolean) as string[];

    log.event('delegation.decision', {
      current_agent: currentAgent,
      should_delegate: targetAgents.length > 0,
      target_agents: targetAgents,
      request_count: signals.requires_delegation.length
    });

    return {
      should_delegate: targetAgents.length > 0,
      target_agents: targetAgents,
      delegation_requests: signals.requires_delegation
    };
  }
}
```

**File:** `services/agent-framework/src/langgraph/v34/EscalationDecisionEngine.ts`

```typescript
import { WorkflowState } from '../state.js';
import { AgentCompletionSignals, EscalationDecision } from './types.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('escalation-decision-engine');

/**
 * Escalation Decision Engine
 *
 * Decides when human coach is needed
 */
export class EscalationDecisionEngine {
  shouldEscalate(
    state: WorkflowState,
    signals: AgentCompletionSignals
  ): EscalationDecision {
    // Rule 1: Agent explicitly requests escalation
    if (signals.needs_human_escalation === true) {
      log.event('escalation.agent_requested', {
        agent: state.agent_context.current_agent
      });

      return {
        should_escalate: true,
        reason: 'agent_requested_escalation',
        escalation_type: 'human_coach'
      };
    }

    // Rule 2: Student explicitly asks for human coach
    const lastMessage = state.conversation_history[state.conversation_history.length - 1];
    if (lastMessage && this.detectHumanCoachRequest(lastMessage.content)) {
      log.event('escalation.student_requested', {
        message_preview: lastMessage.content.substring(0, 50)
      });

      return {
        should_escalate: true,
        reason: 'student_requested_human',
        escalation_type: 'human_coach'
      };
    }

    // Rule 3: Very low confidence
    if (signals.confidence < 0.5) {
      log.event('escalation.low_confidence', {
        confidence: signals.confidence
      });

      return {
        should_escalate: true,
        reason: 'low_confidence',
        escalation_type: 'human_coach'
      };
    }

    // Rule 4: No progress after many turns
    if (state.conversation_history.length > 10 &&
        Object.keys(state.collected_facts).length < 3) {
      log.event('escalation.no_progress', {
        turns: state.conversation_history.length,
        facts_count: Object.keys(state.collected_facts).length
      });

      return {
        should_escalate: true,
        reason: 'no_progress',
        escalation_type: 'human_coach'
      };
    }

    return { should_escalate: false };
  }

  private detectHumanCoachRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const triggers = [
      'human coach',
      'talk to someone',
      'speak to a person',
      'real person',
      'human help'
    ];

    return triggers.some(trigger => lowerMessage.includes(trigger));
  }
}
```

---

### Week 2: Orchestrator Implementation + Tests

#### Day 6-8: Update LangGraphOrchestratorV34
**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV34.ts`

Key changes from v31.4:
1. Import decision engines
2. Add `extractSignalsFromResponse()` method with v26 fallback
3. Update workflow nodes to use decision engines
4. Add structured logging throughout

#### Day 9-10: Comprehensive Tests
**File:** `services/agent-framework/src/langgraph/v34/__tests__/`

Create test files:
- `HandoverDecisionEngine.test.ts`
- `DelegationDecisionEngine.test.ts`
- `EscalationDecisionEngine.test.ts`
- `LangGraphOrchestratorV34.integration.test.ts`

**Test Coverage Target:** 80%+

Example test:
```typescript
describe('HandoverDecisionEngine', () => {
  let engine: HandoverDecisionEngine;

  beforeEach(() => {
    engine = new HandoverDecisionEngine();
  });

  describe('Assessment → GamePlan handover', () => {
    it('should handover when all conditions met', () => {
      const state: WorkflowState = {
        agent_context: { current_agent: 'assessment-agent-v18' }
      };

      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.85
      };

      const decision = engine.shouldHandover(state, signals);

      expect(decision.should_handover).toBe(true);
      expect(decision.next_agent).toBe('gameplan-agent-v18');
      expect(decision.reason).toBe('assessment_complete');
    });

    it('should NOT handover when phase incomplete', () => {
      const state: WorkflowState = {
        agent_context: { current_agent: 'assessment-agent-v18' }
      };

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.85
      };

      const decision = engine.shouldHandover(state, signals);

      expect(decision.should_handover).toBe(false);
      expect(decision.reason).toBe('phase_incomplete');
    });

    it('should NOT handover when confidence too low', () => {
      // ... test low confidence scenario
    });

    it('should NOT handover when completion below threshold', () => {
      // ... test completion threshold
    });
  });

  describe('GamePlan → Execution handover', () => {
    // ... similar tests
  });

  describe('Unknown agent', () => {
    it('should return false for unknown agent', () => {
      // ... test edge case
    });
  });
});
```

---

### Week 3-4: Agent Migration

#### Migration Checklist per Agent

**For each agent (Assessment, GamePlan, Execution):**

1. **Add signal generation method**
```typescript
// In agent class
protected generateCompletionSignals(
  facts: FactSet,
  intelligenceResults: IntelligenceResult[]
): AgentCompletionSignals {
  // Extract completion state from intelligence results
  const type080 = intelligenceResults.find(r => r.type_id === 'TYPE-080');
  const completion = type080?.data?.overall_completion || 0;

  return {
    phase_complete: completion >= 100,
    completion_percentage: completion,
    confidence: this.calculateConfidence(facts, intelligenceResults),
    suggested_next_phase: completion >= 100 ? 'gameplan' : undefined
  };
}
```

2. **Update handleQuery to return signals**
```typescript
// In handleQuery() method
return {
  response: responseText,
  intelligence_triggered: triggered,
  intelligence_results: intelligenceResults,
  signals: this.generateCompletionSignals(facts, intelligenceResults),  // v34.0
  // ... rest
};
```

3. **Update tests**
```typescript
it('should return signals in response', async () => {
  const result = await agent.handleQuery(query);

  expect(result.signals).toBeDefined();
  expect(result.signals.phase_complete).toBeDefined();
  expect(result.signals.completion_percentage).toBeGreaterThanOrEqual(0);
  expect(result.signals.confidence).toBeGreaterThanOrEqual(0);
});
```

4. **Test end-to-end**
```bash
npm test -- AssessmentAgentV3ConversationalRealtime
```

---

### Week 5: Frontend Integration

#### Update MultiAgentsTabRedesigned.tsx

**Add handover timeline visualization:**
```typescript
const HandoverTimeline = ({ messages }) => {
  const handovers = messages
    .filter(m => m.metadata?.handover === true)
    .map(m => ({
      from_agent: m.metadata.from_agent,
      to_agent: m.metadata.to_agent,
      timestamp: m.timestamp,
      reason: m.metadata.reason
    }));

  return (
    <div className="handover-timeline">
      <h3>Agent Transitions</h3>
      {handovers.map((h, i) => (
        <div key={i} className="handover-event">
          <span className="timestamp">{formatTime(h.timestamp)}</span>
          <span className="from-agent">{h.from_agent}</span>
          <span className="arrow">→</span>
          <span className="to-agent">{h.to_agent}</span>
          <span className="reason">{h.reason}</span>
        </div>
      ))}
    </div>
  );
};
```

---

### Week 6: Production Polish

#### Checklist

- [ ] Performance testing (simulate 100 concurrent users)
- [ ] Load testing (Redis checkpointing under load)
- [ ] Error scenario testing (agent fails, Redis down, etc.)
- [ ] Documentation updates (all master specs)
- [ ] Production deployment plan
- [ ] Rollback procedure documented
- [ ] Monitoring dashboards (agent transitions, handovers, delegations)
- [ ] Alert thresholds configured

---

## Success Metrics

### Must Pass Before Production

- [ ] All unit tests pass (80%+ coverage)
- [ ] Integration tests pass (Assessment → GamePlan → Execution)
- [ ] Intelligence types still work (zero regression)
- [ ] Sessions resume from Redis (100% success rate)
- [ ] Handover latency < 500ms
- [ ] Delegation latency < 2s (parallel specialists)
- [ ] Zero data loss during handovers
- [ ] Frontend shows agent transitions correctly

---

## Rollback Plan

If critical issues found in production:

1. **Immediate:** Set feature flag `ORCHESTRATION_VERSION=v31.4`
2. **Routes:** Revert to `LangGraphOrchestratorV31` in v26-multiagents.ts
3. **Verify:** System falls back to v31.4 behavior
4. **Investigate:** Debug issue in staging
5. **Fix forward:** Patch and redeploy v34.0

---

## Files to Create (Complete List)

### New Files
1. `services/agent-framework/src/langgraph/v34/types.ts`
2. `services/agent-framework/src/langgraph/v34/HandoverDecisionEngine.ts`
3. `services/agent-framework/src/langgraph/v34/DelegationDecisionEngine.ts`
4. `services/agent-framework/src/langgraph/v34/EscalationDecisionEngine.ts`
5. `services/agent-framework/src/langgraph/LangGraphOrchestratorV34.ts`
6. `services/agent-framework/src/langgraph/v34/__tests__/HandoverDecisionEngine.test.ts`
7. `services/agent-framework/src/langgraph/v34/__tests__/DelegationDecisionEngine.test.ts`
8. `services/agent-framework/src/langgraph/v34/__tests__/EscalationDecisionEngine.test.ts`
9. `services/agent-framework/src/langgraph/v34/__tests__/LangGraphOrchestratorV34.integration.test.ts`
10. `docs/guides/V34_UNIVERSAL_ORCHESTRATION_ARCHITECTURE.md` ✅
11. `docs/guides/V34_IMPLEMENTATION_ROADMAP.md` (this file)

### Files to Modify
1. `services/agent-framework/src/agents/v18/AssessmentAgentV3ConversationalRealtime.ts`
2. `services/agent-framework/src/agents/v18/GamePlanAgentV3.ts`
3. `services/agent-framework/src/agents/v18/ExecutionAgent.ts`
4. `services/agent-framework/src/langgraph/state.ts`
5. `services/agent-framework/src/routes/v26-multiagents.ts`
6. `unified-frontend/apps/unified-app/src/components/v26/MultiAgentsTabRedesigned.tsx`
7. `docs/PROD_FEATURE_RELEASE_DETAILS.md`
8. `docs/MASTER_PROD_TECH_SPEC.md`
9. `CHANGELOG.md`

---

## Team Assignments (Suggested)

### Backend Team
- **Lead:** Orchestrator implementation + decision engines
- **Support:** Agent migration + tests

### Frontend Team
- **Lead:** MultiAgentsTab updates
- **Support:** Handover timeline visualization

### QA Team
- **Lead:** Test plan + integration testing
- **Support:** Performance testing

---

## Daily Standups

**Focus Questions:**
1. What did you complete yesterday?
2. What will you complete today?
3. Any blockers?
4. Test coverage status?

**Weekly Reviews:**
- End of Week 2: Demo orchestrator with v31.4 agents
- End of Week 4: Demo migrated agents with signals
- End of Week 6: Production readiness review

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Intelligence types break | Critical | Very Low | Independent code path, extensive tests |
| Signal extraction fails | High | Low | v26 fallback, logging |
| Redis downtime | Medium | Low | Fallback to stateless mode |
| Migration takes longer | Medium | Medium | Phase 1 delivers working system |
| Performance issues | Medium | Low | Load testing, optimization |

---

## Final Checklist Before Go-Live

- [ ] All tests green (unit + integration)
- [ ] Intelligence types verified working
- [ ] Redis checkpointing tested
- [ ] Handover flow tested end-to-end
- [ ] Delegation tested (parallel specialists)
- [ ] Frontend shows transitions correctly
- [ ] Performance meets SLAs
- [ ] Documentation complete
- [ ] Rollback plan tested
- [ ] Monitoring dashboards live
- [ ] Team trained on new architecture
- [ ] Stakeholders approve

---

**Status:** Ready for Sprint 1 Kickoff
**Start Date:** TBD
**Target Completion:** 6 weeks from start
**Confidence:** High (95%)
