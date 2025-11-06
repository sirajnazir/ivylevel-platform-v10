/**
 * AgentHandoverConfig
 *
 * Declarative configuration for agent handover requirements
 * Single source of truth for handover logic across all agents
 *
 * Integration points:
 * - Used by HandoverDecisionEngine for handover checks
 * - Defines minimum_required facts, quality thresholds, turn counts
 * - Supports custom validation functions per agent
 *
 * @file src/config/AgentHandoverConfig.ts
 */

import { UniversalFact } from '../facts/UniversalFact.js';
import { AssessmentFactTracker, AssessmentProgress } from '../agents/v18/AssessmentFactTracker.js';

export interface AgentConfig {
  agent_name: string;
  handover_to: string | null;
  minimum_required: string[];
  quality_threshold: number;
  minimum_turns: number;
  minimum_facts_count?: number;  // NEW: Minimum total facts required (for assessment)
  minimum_conversation_turns?: number;  // NEW: Minimum conversation turns (for assessment)
  can_delegate_to?: string[];
  custom_validation?: (facts: UniversalFact[], conversationTurns?: number) => Promise<boolean>;
}

/**
 * Agent Handover Configuration Map
 *
 * This is the single source of truth for all handover logic.
 * To change handover behavior, update this configuration.
 */
const AGENT_CONFIG_MAP: Record<string, AgentConfig> = {
  // ========================================
  // PRIMARY AGENTS
  // ========================================

  'assessment-agent-v18': {
    agent_name: 'assessment-agent-v18',
    handover_to: 'gameplan-agent-v18',

    // RAISED STANDARDS (v34.3): From 3 facts → 95 facts
    // Based on Jenny's 1-hour comprehensive assessment standard
    minimum_required: [
      // Core assessment facts (95 required)
      ...AssessmentFactTracker.getAllRequiredFacts(),

      // Synthesis facts (generated at completion)
      'unique_narrative',
      'rubric_scores',
      'ivyscore',
      'gaps_identified'
    ],

    // RAISED: From 0.75 (7.5/10) → 0.85 (8.5/10) quality threshold
    quality_threshold: 0.85,

    // RAISED: From 3 turns → 45 turns (Jenny standard)
    minimum_turns: 45,

    // NEW: Minimum fact count requirement
    minimum_facts_count: 90,

    // NEW: Minimum conversation turns requirement
    minimum_conversation_turns: 45,

    can_delegate_to: [],

    custom_validation: async (facts: UniversalFact[], conversationTurns: number = 0) => {
      // Convert UniversalFact[] to Map<string, any> for AssessmentFactTracker
      const factsMap = new Map<string, any>();
      for (const fact of facts) {
        if (fact.data.metadata?.field_name) {
          factsMap.set(fact.data.metadata.field_name, fact.data.fields);
        }
      }

      // Calculate comprehensive assessment progress
      const progress: AssessmentProgress = AssessmentFactTracker.calculateProgress(
        factsMap,
        conversationTurns
      );

      // Handover approval criteria (ALL must be true):
      // 1. Assessment marked complete (all tiers meet required %)
      // 2. Quality score >= 8.5
      // 3. At least 45 conversation turns
      // 4. At least 90 facts collected
      const isComplete = progress.is_complete &&
                        progress.quality_score >= 8.5 &&
                        conversationTurns >= 45 &&
                        progress.total_facts_collected >= 90;

      return isComplete;
    }
  },

  'gameplan-agent-v18': {
    agent_name: 'gameplan-agent-v18',
    handover_to: 'execution-agent-v18',
    minimum_required: [
      'grade',
      'high_school',
      'interests',
      'gameplan_vision',
      'gameplan_objectives'
    ],
    quality_threshold: 0.80,
    minimum_turns: 5,
    can_delegate_to: [
      'scholarships-agent-v18',
      'summer-programs-agent-v18',
      'awards-agent-v18'
    ],
    custom_validation: async (facts: UniversalFact[]) => {
      // Ensure we have a concrete game plan
      const hasVision = facts.some(f =>
        f.data.fields?.gameplan_vision !== undefined
      );

      const hasObjectives = facts.some(f =>
        f.data.fields?.gameplan_objectives !== undefined
      );

      return hasVision && hasObjectives;
    }
  },

  'execution-agent-v18': {
    agent_name: 'execution-agent-v18',
    handover_to: null, // Terminal agent - no handover
    minimum_required: [
      'grade',
      'high_school',
      'interests',
      'gameplan_vision',
      'gameplan_objectives',
      'execution_tasks'
    ],
    quality_threshold: 0.85,
    minimum_turns: 3,
    can_delegate_to: [
      'scholarships-agent-v18',
      'summer-programs-agent-v18',
      'awards-agent-v18',
      'extracurriculars-agent-v18'
    ],
    custom_validation: async (facts: UniversalFact[]) => {
      // Ensure we have actionable execution tasks
      const hasTasks = facts.some(f =>
        f.data.fields?.execution_tasks !== undefined
      );

      return hasTasks;
    }
  },

  // ========================================
  // SPECIALIST AGENTS (No handover, return to caller)
  // ========================================

  'extracurriculars-agent-v18': {
    agent_name: 'extracurriculars-agent-v18',
    handover_to: null, // Returns to delegating agent
    minimum_required: ['interests', 'grade'],
    quality_threshold: 0.70,
    minimum_turns: 1,
    can_delegate_to: []
  },

  'scholarships-agent-v18': {
    agent_name: 'scholarships-agent-v18',
    handover_to: null, // Returns to delegating agent
    minimum_required: ['grade', 'interests'],
    quality_threshold: 0.70,
    minimum_turns: 1,
    can_delegate_to: []
  },

  'summer-programs-agent-v18': {
    agent_name: 'summer-programs-agent-v18',
    handover_to: null, // Returns to delegating agent
    minimum_required: ['grade', 'interests'],
    quality_threshold: 0.70,
    minimum_turns: 1,
    can_delegate_to: []
  },

  'awards-agent-v18': {
    agent_name: 'awards-agent-v18',
    handover_to: null, // Returns to delegating agent
    minimum_required: ['grade', 'interests'],
    quality_threshold: 0.70,
    minimum_turns: 1,
    can_delegate_to: []
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get configuration for specific agent
 */
export function getAgentConfig(agentName: string): AgentConfig | null {
  return AGENT_CONFIG_MAP[agentName] || null;
}

/**
 * Get all agents that can handover to another agent
 */
export function getHandoverAgents(): string[] {
  return Object.values(AGENT_CONFIG_MAP)
    .filter(config => config.handover_to !== null)
    .map(config => config.agent_name);
}

/**
 * Get all specialist agents (no handover)
 */
export function getSpecialistAgents(): string[] {
  return Object.values(AGENT_CONFIG_MAP)
    .filter(config => config.handover_to === null)
    .map(config => config.agent_name);
}

/**
 * Validate agent configuration at startup
 */
export function validateAgentConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const [agentName, config] of Object.entries(AGENT_CONFIG_MAP)) {
    // Validate agent_name matches key
    if (config.agent_name !== agentName) {
      errors.push(
        `Config key '${agentName}' does not match agent_name '${config.agent_name}'`
      );
    }

    // Validate quality_threshold is 0-1
    if (config.quality_threshold < 0 || config.quality_threshold > 1) {
      errors.push(
        `${agentName}: quality_threshold must be between 0 and 1 (got ${config.quality_threshold})`
      );
    }

    // Validate minimum_turns is positive
    if (config.minimum_turns < 0) {
      errors.push(
        `${agentName}: minimum_turns must be >= 0 (got ${config.minimum_turns})`
      );
    }

    // Validate handover_to exists if specified
    if (config.handover_to && !AGENT_CONFIG_MAP[config.handover_to]) {
      errors.push(
        `${agentName}: handover_to references unknown agent '${config.handover_to}'`
      );
    }

    // Validate can_delegate_to agents exist
    if (config.can_delegate_to) {
      for (const targetAgent of config.can_delegate_to) {
        if (!AGENT_CONFIG_MAP[targetAgent]) {
          errors.push(
            `${agentName}: can_delegate_to references unknown agent '${targetAgent}'`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get all configured agent names
 */
export function getAllAgentNames(): string[] {
  return Object.keys(AGENT_CONFIG_MAP);
}

/**
 * Check if agent exists in configuration
 */
export function isValidAgent(agentName: string): boolean {
  return agentName in AGENT_CONFIG_MAP;
}
