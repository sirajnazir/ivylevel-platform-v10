/**
 * EscalationDecisionEngine Tests
 *
 * Test suite for human escalation logic
 *
 * Coverage:
 * - Rule 1: Explicit escalation request
 * - Rule 2: Low confidence threshold
 * - Rule 3: Conversation length limit
 * - Rule 4: Data quality issues
 * - Rule 5: Conversation loop detection
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { EscalationDecisionEngine } from '../EscalationDecisionEngine.js';
import { WorkflowState } from '../../state.js';
import { AgentCompletionSignals } from '../types.js';

describe('EscalationDecisionEngine', () => {
  let engine: EscalationDecisionEngine;
  let mockState: WorkflowState;

  beforeEach(() => {
    engine = new EscalationDecisionEngine();

    mockState = {
      student_id: 'test-student',
      session_id: 'test-session',
      conversation_history: [],
      collected_facts: {},
      agent_context: {
        current_agent: 'assessment-agent-v18',
        assessment_progress: 0.5,
        previous_agent: undefined,
        handover_pending: false,
        delegation_pending: false,
        escalation_pending: false
      }
    } as WorkflowState;
  });

  // ========================================================================
  // RULE 1: Explicit Escalation Request
  // ========================================================================

  describe('Rule 1: Explicit Escalation Request', () => {
    test('should escalate when agent requests it', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        needs_human_escalation: true  // Explicit request
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(true);
      expect(decision.escalation_type).toBe('human_coach');
      expect(decision.metadata?.trigger).toBe('agent_request');
    });

    test('should not escalate if agent does not request it', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.9,
        needs_human_escalation: false
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });
  });

  // ========================================================================
  // RULE 2: Low Confidence Threshold
  // ========================================================================

  describe('Rule 2: Low Confidence Threshold', () => {
    test('should escalate when confidence below 0.3', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.25  // Below threshold
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(true);
      expect(decision.escalation_type).toBe('human_coach');
      expect(decision.metadata?.trigger).toBe('low_confidence');
      expect(decision.metadata?.confidence_at_escalation).toBe(0.25);
    });

    test('should not escalate when confidence at 0.3', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.3  // At threshold
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });

    test('should not escalate when confidence above 0.3', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });
  });

  // ========================================================================
  // RULE 3: Conversation Length Limit
  // ========================================================================

  describe('Rule 3: Conversation Length Limit', () => {
    test('should escalate when conversation exceeds 50 turns', () => {
      // Create 51 messages
      mockState.conversation_history = Array(51).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'agent' as const,
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(true);
      expect(decision.escalation_type).toBe('human_coach');
      expect(decision.metadata?.trigger).toBe('conversation_length');
      expect(decision.metadata?.conversation_length).toBe(51);
    });

    test('should not escalate when conversation at 50 turns', () => {
      mockState.conversation_history = Array(50).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'agent' as const,
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });

    test('should not escalate when conversation below 50 turns', () => {
      mockState.conversation_history = Array(10).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'agent' as const,
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });
  });

  // ========================================================================
  // RULE 4: Data Quality Issues
  // ========================================================================

  describe('Rule 4: Data Quality Issues', () => {
    test('should escalate when fact coverage below 0.2 and needs more data', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8,
        needs_more_data: true,
        fact_coverage: 0.15  // Below threshold
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(true);
      expect(decision.escalation_type).toBe('data_quality');
      expect(decision.metadata?.trigger).toBe('low_fact_coverage');
    });

    test('should not escalate when fact coverage at 0.2', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8,
        needs_more_data: true,
        fact_coverage: 0.2  // At threshold
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });

    test('should not escalate when needs_more_data is false', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8,
        needs_more_data: false,
        fact_coverage: 0.1  // Below threshold, but not needed
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });

    test('should not escalate when fact_coverage is undefined', () => {
      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8,
        needs_more_data: true
        // fact_coverage undefined
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });
  });

  // ========================================================================
  // RULE 5: Conversation Loop Detection
  // ========================================================================

  describe('Rule 5: Conversation Loop Detection', () => {
    test('should escalate when conversation is looping', () => {
      // Create repeating agent messages
      mockState.conversation_history = [
        { role: 'user', content: 'Tell me about awards', timestamp: new Date() },
        { role: 'agent', content: 'What are your academic interests and achievements in STEM areas?', timestamp: new Date() },
        { role: 'user', content: 'I like science', timestamp: new Date() },
        { role: 'agent', content: 'What are your specific academic interests and achievements in STEM?', timestamp: new Date() },
        { role: 'user', content: 'Chemistry mainly', timestamp: new Date() },
        { role: 'agent', content: 'What are your academic interests and main achievements in STEM fields?', timestamp: new Date() }
      ];

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(true);
      expect(decision.escalation_type).toBe('human_coach');
      expect(decision.metadata?.trigger).toBe('conversation_loop');
    });

    test('should not escalate when messages are different', () => {
      mockState.conversation_history = [
        { role: 'user', content: 'Tell me about awards', timestamp: new Date() },
        { role: 'agent', content: 'What are your interests?', timestamp: new Date() },
        { role: 'user', content: 'STEM', timestamp: new Date() },
        { role: 'agent', content: 'What grade are you in?', timestamp: new Date() },
        { role: 'user', content: '11th', timestamp: new Date() },
        { role: 'agent', content: 'What is your GPA?', timestamp: new Date() }
      ];

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });

    test('should not escalate when conversation too short', () => {
      mockState.conversation_history = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'agent', content: 'Hi! What can I help with?', timestamp: new Date() }
      ];

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });
  });

  // ========================================================================
  // Escalation Rules
  // ========================================================================

  describe('getEscalationRules', () => {
    test('should return escalation configuration', () => {
      const rules = engine.getEscalationRules();

      expect(rules).toContainEqual({
        rule: 'explicit_request',
        trigger: 'Agent sets needs_human_escalation: true',
        threshold: 'N/A'
      });

      expect(rules).toContainEqual({
        rule: 'low_confidence',
        trigger: 'Confidence < threshold',
        threshold: 0.3
      });

      expect(rules).toContainEqual({
        rule: 'conversation_length',
        trigger: 'Turns > threshold',
        threshold: 50
      });

      expect(rules).toContainEqual({
        rule: 'low_fact_coverage',
        trigger: 'Fact coverage < threshold',
        threshold: 0.2
      });

      expect(rules).toContainEqual({
        rule: 'conversation_loop',
        trigger: 'Repeated agent messages (similarity > 60%)',
        threshold: 0.6
      });
    });
  });

  // ========================================================================
  // Message Formatting
  // ========================================================================

  describe('formatEscalationMessage', () => {
    test('should format agent_request message', () => {
      const decision = {
        should_escalate: true,
        escalation_type: 'human_coach' as const,
        metadata: { trigger: 'agent_request', confidence_at_escalation: 0.5 }
      };

      const message = engine.formatEscalationMessage(decision);

      expect(message).toContain('human coach');
      expect(message).toContain('personalized');
    });

    test('should format low_confidence message', () => {
      const decision = {
        should_escalate: true,
        escalation_type: 'human_coach' as const,
        metadata: { trigger: 'low_confidence', confidence_at_escalation: 0.2 }
      };

      const message = engine.formatEscalationMessage(decision);

      expect(message).toContain('best advice');
      expect(message).toContain('human coach');
    });

    test('should format conversation_length message', () => {
      const decision = {
        should_escalate: true,
        escalation_type: 'human_coach' as const,
        metadata: { trigger: 'conversation_length', conversation_length: 60 }
      };

      const message = engine.formatEscalationMessage(decision);

      expect(message).toContain('chatting for a while');
      expect(message).toContain('efficiently');
    });

    test('should format low_fact_coverage message', () => {
      const decision = {
        should_escalate: true,
        escalation_type: 'data_quality' as const,
        metadata: { trigger: 'low_fact_coverage' }
      };

      const message = engine.formatEscalationMessage(decision);

      expect(message).toContain('more information');
      expect(message).toContain('details');
    });

    test('should format conversation_loop message', () => {
      const decision = {
        should_escalate: true,
        escalation_type: 'human_coach' as const,
        metadata: { trigger: 'conversation_loop' }
      };

      const message = engine.formatEscalationMessage(decision);

      expect(message).toContain('circles');
      expect(message).toContain('clarify');
    });

    test('should return empty string if no escalation', () => {
      const decision = {
        should_escalate: false
      };

      const message = engine.formatEscalationMessage(decision);

      expect(message).toBe('');
    });

    test('should have default message for unknown trigger', () => {
      const decision = {
        should_escalate: true,
        escalation_type: 'human_coach' as const,
        metadata: { trigger: 'unknown_trigger' }
      };

      const message = engine.formatEscalationMessage(decision);

      expect(message).toContain('human coach');
      expect(message).toContain('support');
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe('Integration: Multiple Escalation Scenarios', () => {
    test('should prioritize explicit request over other rules', () => {
      // Set up conditions that would trigger multiple rules
      mockState.conversation_history = Array(51).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'agent' as const,
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.1,  // Would trigger low confidence
        needs_human_escalation: true  // Explicit request (should be trigger)
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(true);
      expect(decision.metadata?.trigger).toBe('agent_request');  // First rule wins
    });

    test('should not escalate when no rules triggered', () => {
      mockState.conversation_history = Array(10).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'agent' as const,
        content: `Different message ${i}`,
        timestamp: new Date()
      }));

      const signals: AgentCompletionSignals = {
        phase_complete: false,
        completion_percentage: 50,
        confidence: 0.8,  // Good confidence
        needs_human_escalation: false
      };

      const decision = engine.shouldEscalate(mockState, signals);

      expect(decision.should_escalate).toBe(false);
    });
  });
});
