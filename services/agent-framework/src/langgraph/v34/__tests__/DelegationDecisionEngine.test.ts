/**
 * DelegationDecisionEngine Tests
 *
 * Test suite for delegation routing logic
 *
 * Coverage:
 * - Rule 1: Agent authorization (only GamePlan can delegate)
 * - Rule 2: Delegation requests check
 * - Rule 3: Domain mapping (awards, ECs, programs, scholarships)
 * - Request validation
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { DelegationDecisionEngine } from '../DelegationDecisionEngine.js';
import { WorkflowState } from '../../state.js';
import { AgentCompletionSignals, DelegationRequest } from '../types.js';

describe('DelegationDecisionEngine', () => {
  let engine: DelegationDecisionEngine;
  let mockState: WorkflowState;

  beforeEach(() => {
    engine = new DelegationDecisionEngine();

    mockState = {
      student_id: 'test-student',
      session_id: 'test-session',
      conversation_history: [],
      collected_facts: {},
      agent_context: {
        current_agent: 'gameplan-agent-v18',  // Authorized agent
        assessment_progress: 1.0,
        previous_agent: 'assessment-agent-v18',
        handover_pending: false,
        delegation_pending: false,
        escalation_pending: false
      }
    } as WorkflowState;
  });

  // ========================================================================
  // RULE 1: Agent Authorization
  // ========================================================================

  describe('Rule 1: Agent Authorization', () => {
    test('should allow delegation from GamePlan agent', () => {
      mockState.agent_context.current_agent = 'gameplan-agent-v18';

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'awards',
          reason: 'Need award recommendations',
          context: { interests: ['STEM'] }
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(true);
      expect(decision.target_agents).toContain('awards-agent-v18');
    });

    test('should block delegation from Assessment agent', () => {
      mockState.agent_context.current_agent = 'assessment-agent-v18';

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'awards',
          reason: 'Test',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(false);
      expect(decision.metadata?.requesting_agent).toBe('assessment-agent-v18');
    });

    test('should block delegation from Execution agent', () => {
      mockState.agent_context.current_agent = 'execution-agent';

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'awards',
          reason: 'Test',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(false);
    });
  });

  // ========================================================================
  // RULE 2: Delegation Requests Check
  // ========================================================================

  describe('Rule 2: Delegation Requests Check', () => {
    test('should not delegate if no requests', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9
        // No requires_delegation
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(false);
    });

    test('should not delegate if empty requests array', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: []  // Empty
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(false);
    });

    test('should delegate if has valid requests', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'awards',
          reason: 'Need recommendations',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(true);
      expect(decision.delegation_requests).toHaveLength(1);
    });
  });

  // ========================================================================
  // RULE 3: Domain Mapping
  // ========================================================================

  describe('Rule 3: Domain Mapping', () => {
    test('should map awards domain to awards-agent-v18', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'awards',
          reason: 'Need award recommendations',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.target_agents).toContain('awards-agent-v18');
    });

    test('should map extracurriculars domain to extracurriculars-agent-v18', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'extracurriculars',
          reason: 'Need EC recommendations',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.target_agents).toContain('extracurriculars-agent-v18');
    });

    test('should map programs domain to summer-programs-agent-v18', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'programs',
          reason: 'Need program recommendations',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.target_agents).toContain('summer-programs-agent-v18');
    });

    test('should map scholarships domain to scholarships-agent-v18', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'scholarships',
          reason: 'Need scholarship recommendations',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.target_agents).toContain('scholarships-agent-v18');
    });

    test('should handle unknown domain gracefully', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'unknown' as any,
          reason: 'Test',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      // Should not delegate if no valid domains
      expect(decision.should_delegate).toBe(false);
      expect(decision.target_agents).toBeUndefined();
    });

    test('should handle multiple delegation requests', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [
          {
            domain: 'awards',
            reason: 'Need award recommendations',
            context: {}
          },
          {
            domain: 'extracurriculars',
            reason: 'Need EC recommendations',
            context: {}
          }
        ]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(true);
      expect(decision.target_agents).toHaveLength(2);
      expect(decision.target_agents).toContain('awards-agent-v18');
      expect(decision.target_agents).toContain('extracurriculars-agent-v18');
    });

    test('should deduplicate same domain requested multiple times', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [
          {
            domain: 'awards',
            reason: 'First request',
            context: {}
          },
          {
            domain: 'awards',
            reason: 'Second request',
            context: {}
          }
        ]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(true);
      expect(decision.target_agents).toHaveLength(1);  // Deduplicated
      expect(decision.target_agents).toContain('awards-agent-v18');
    });
  });

  // ========================================================================
  // Request Validation
  // ========================================================================

  describe('validateRequests', () => {
    test('should validate correct requests', () => {
      const requests: DelegationRequest[] = [{
        domain: 'awards',
        reason: 'Need recommendations',
        context: { interests: ['STEM'] }
      }];

      const validation = engine.validateRequests(requests);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should catch invalid domain', () => {
      const requests: DelegationRequest[] = [{
        domain: 'invalid' as any,
        reason: 'Test',
        context: {}
      }];

      const validation = engine.validateRequests(requests);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('Invalid domain "invalid"')
      );
    });

    test('should catch missing reason', () => {
      const requests: DelegationRequest[] = [{
        domain: 'awards',
        reason: '',  // Empty
        context: {}
      }];

      const validation = engine.validateRequests(requests);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('Reason is required')
      );
    });

    test('should catch missing context', () => {
      const requests: DelegationRequest[] = [{
        domain: 'awards',
        reason: 'Test',
        context: null as any  // Invalid
      }];

      const validation = engine.validateRequests(requests);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('Context must be an object')
      );
    });

    test('should report multiple errors', () => {
      const requests: DelegationRequest[] = [
        {
          domain: 'invalid1' as any,
          reason: '',
          context: null as any
        },
        {
          domain: 'invalid2' as any,
          reason: 'Valid',
          context: {}
        }
      ];

      const validation = engine.validateRequests(requests);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });
  });

  // ========================================================================
  // Delegation Map
  // ========================================================================

  describe('getDelegationMap', () => {
    test('should return delegation configuration', () => {
      const delegationMap = engine.getDelegationMap();

      expect(delegationMap.awards).toEqual({
        agent_id: 'awards-agent-v18',
        capabilities: expect.arrayContaining([
          expect.stringContaining('Award'),
          expect.stringContaining('Eligibility'),
          expect.stringContaining('Application')
        ])
      });

      expect(delegationMap.extracurriculars).toBeDefined();
      expect(delegationMap.programs).toBeDefined();
      expect(delegationMap.scholarships).toBeDefined();
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe('Integration: Full Delegation Flow', () => {
    test('should delegate to all specialist agents', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [
          { domain: 'awards', reason: 'Need awards', context: {} },
          { domain: 'extracurriculars', reason: 'Need ECs', context: {} },
          { domain: 'programs', reason: 'Need programs', context: {} },
          { domain: 'scholarships', reason: 'Need scholarships', context: {} }
        ]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.should_delegate).toBe(true);
      expect(decision.target_agents).toHaveLength(4);
      expect(decision.target_agents).toContain('awards-agent-v18');
      expect(decision.target_agents).toContain('extracurriculars-agent-v18');
      expect(decision.target_agents).toContain('summer-programs-agent-v18');
      expect(decision.target_agents).toContain('scholarships-agent-v18');
    });

    test('should include metadata for tracking', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        requires_delegation: [{
          domain: 'awards',
          reason: 'Test',
          context: {}
        }]
      };

      const decision = engine.shouldDelegate(mockState, signals);

      expect(decision.metadata?.requesting_agent).toBe('gameplan-agent-v18');
      expect(decision.metadata?.domains_requested).toContain('awards');
    });
  });
});
