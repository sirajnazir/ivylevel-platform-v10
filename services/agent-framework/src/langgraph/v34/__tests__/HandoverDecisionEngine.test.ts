/**
 * HandoverDecisionEngine Tests
 *
 * Test suite for handover routing logic
 *
 * Coverage:
 * - Rule 1: Phase complete check
 * - Rule 2: Completion threshold
 * - Rule 3: Confidence threshold
 * - Rule 4: Agent routing (Assessment → GamePlan → Execution → Terminal)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { HandoverDecisionEngine } from '../HandoverDecisionEngine.js';
import { WorkflowState } from '../../state.js';
import { AgentCompletionSignals } from '../types.js';

describe('HandoverDecisionEngine', () => {
  let engine: HandoverDecisionEngine;
  let mockState: WorkflowState;

  beforeEach(() => {
    engine = new HandoverDecisionEngine();

    // Mock state
    mockState = {
      student_id: 'test-student',
      session_id: 'test-session',
      conversation_history: [],
      collected_facts: {},
      agent_context: {
        current_agent: 'assessment-agent-v18',
        assessment_progress: 0,
        previous_agent: undefined,
        handover_pending: false,
        delegation_pending: false,
        escalation_pending: false
      }
    } as WorkflowState;
  });

  // ========================================================================
  // RULE 1: Phase Complete Check
  // ========================================================================

  describe('Rule 1: Phase Complete Check', () => {
    test('should block handover if phase not complete', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,  // Not complete
        completion_percentage: 75,
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(false);
      expect(decision.reason).toBe('phase_incomplete');
      expect(decision.metadata?.phase_completion).toBe(75);
    });

    test('should pass if phase is complete', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: true,  // Complete
        completion_percentage: 100,
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(true);  // Passes all rules
      expect(decision.next_agent).toBe('gameplan-agent-v18');
    });
  });

  // ========================================================================
  // RULE 2: Completion Threshold
  // ========================================================================

  describe('Rule 2: Completion Threshold', () => {
    test('should block handover if completion below 100%', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 95,  // Below threshold
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(false);
      expect(decision.reason).toBe('below_completion_threshold');
      expect(decision.metadata?.phase_completion).toBe(95);
    });

    test('should pass if completion at 100%', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,  // At threshold
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(true);
    });
  });

  // ========================================================================
  // RULE 3: Confidence Threshold
  // ========================================================================

  describe('Rule 3: Confidence Threshold', () => {
    test('should block handover if confidence below 0.8', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.75  // Below threshold
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(false);
      expect(decision.reason).toBe('low_confidence');
      expect(decision.metadata?.confidence).toBe(0.75);
    });

    test('should pass if confidence at 0.8', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.8  // At threshold
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(true);
    });

    test('should pass if confidence above 0.8', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.95
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(true);
    });
  });

  // ========================================================================
  // RULE 4: Agent Routing
  // ========================================================================

  describe('Rule 4: Agent Routing', () => {
    test('should route Assessment → GamePlan', () => {
      mockState.agent_context.current_agent = 'assessment-agent-v18';

      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(true);
      expect(decision.next_agent).toBe('gameplan-agent-v18');
      expect(decision.reason).toBe('assessment_complete');
    });

    test('should route GamePlan → Execution', () => {
      mockState.agent_context.current_agent = 'gameplan-agent-v18';

      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(true);
      expect(decision.next_agent).toBe('execution-agent');
      expect(decision.reason).toBe('gameplan_complete');
    });

    test('should treat Execution as terminal (no handover)', () => {
      mockState.agent_context.current_agent = 'execution-agent';

      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(false);
      expect(decision.reason).toBe('terminal_agent');
      expect(decision.next_agent).toBeUndefined();
    });

    test('should handle unknown agent gracefully', () => {
      mockState.agent_context.current_agent = 'unknown-agent';

      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.should_handover).toBe(false);
      expect(decision.reason).toBe('unknown_agent');
    });
  });

  // ========================================================================
  // Routing Map
  // ========================================================================

  describe('getRoutingMap', () => {
    test('should return routing configuration', () => {
      const routingMap = engine.getRoutingMap();

      expect(routingMap['assessment-agent-v18']).toEqual({
        next_agent: 'gameplan-agent-v18',
        conditions: ['phase_complete', 'completion >= 100', 'confidence >= 0.8']
      });

      expect(routingMap['gameplan-agent-v18']).toEqual({
        next_agent: 'execution-agent',
        conditions: ['phase_complete', 'completion >= 100', 'confidence >= 0.8']
      });

      expect(routingMap['execution-agent']).toEqual({
        next_agent: 'terminal',
        conditions: ['no_handover']
      });
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe('Integration: Full Handover Flow', () => {
    test('should complete full Assessment → GamePlan → Execution flow', () => {
      // Start with Assessment Agent
      mockState.agent_context.current_agent = 'assessment-agent-v18';

      const completeSignals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.9
      };

      // Step 1: Assessment → GamePlan
      let decision = engine.shouldHandover(mockState, completeSignals);
      expect(decision.should_handover).toBe(true);
      expect(decision.next_agent).toBe('gameplan-agent-v18');

      // Update state
      mockState.agent_context.current_agent = 'gameplan-agent-v18';

      // Step 2: GamePlan → Execution
      decision = engine.shouldHandover(mockState, completeSignals);
      expect(decision.should_handover).toBe(true);
      expect(decision.next_agent).toBe('execution-agent');

      // Update state
      mockState.agent_context.current_agent = 'execution-agent';

      // Step 3: Execution = Terminal
      decision = engine.shouldHandover(mockState, completeSignals);
      expect(decision.should_handover).toBe(false);
      expect(decision.reason).toBe('terminal_agent');
    });

    test('should track rules evaluated in metadata', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: true,
        completion_percentage: 100,
        confidence: 0.9
      };

      const decision = engine.shouldHandover(mockState, signals);

      expect(decision.metadata?.rules_evaluated).toContain('phase_complete_check');
      expect(decision.metadata?.rules_evaluated).toContain('completion_threshold_check');
      expect(decision.metadata?.rules_evaluated).toContain('confidence_threshold_check');
      expect(decision.metadata?.rules_evaluated).toContain('agent_routing');
    });
  });
});
