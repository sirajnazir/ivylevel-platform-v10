/**
 * LLM Adapter v2 - Fine-tuned Model Router (v11.1)
 *
 * CAT-2/CAT-3 COMPONENT - Does NOT touch CAT-1 infrastructure
 *
 * Integrates jenny_v8_adapter fine-tuned model into unified pipeline:
 * - Prompt → GPT-5 Intent → SQL (CAT-1) OR RAG (CAT-2/CAT-3)
 * - Adapter selection happens at COMPOSE step (after routing, after SQL)
 * - Traffic split: 50/50 (adapter vs base) for tone-sensitive intents
 * - Cohort assignment: SHA-256 hash for deterministic bucketing
 *
 * Safety: ✅ Additive only - does not modify intentRouter, resolvers, or CAT-1 flows
 */

import crypto from 'crypto';
import registry from '../../config/model_registry.json' assert { type: 'json' };
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('llm-adapter');

/**
 * SHA256-based hash function for deterministic cohort assignment
 * Same hash for same studentId = consistent experience
 */
function simpleHash(str: string): number {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return parseInt(hash.slice(0, 6), 16) % 100; // 0..99
}

/**
 * Choose model for composition based on intent, cohort, and traffic split
 *
 * Logic:
 * 1. If tone-sensitive intent + allowlisted student → always use adapter
 * 2. If tone-sensitive + canary eligible + hash bucket < split → use adapter
 * 3. Otherwise → use base model
 *
 * @param intent - Intent from router (e.g., "kb_query", "rejection_response", "awards.final")
 * @param studentId - Student identifier for cohort assignment
 * @param route - Route type ("sql" for CAT-1, "kb" for CAT-2, "eq" for CAT-3)
 * @returns Model ID from registry
 */
export function chooseModel(
  intent: string,
  studentId: string | undefined,
  route: 'sql' | 'kb' | 'eq' = 'kb'
): string {
  const cfg = registry.config;
  const toneSensitive = new Set(cfg.tone_sensitive_intents);
  const allowlist = new Set(cfg.adapter_allowlist);

  // Cohort key: use studentId or fallback
  const cohortKey = studentId ?? 'anon';

  // v11.1: CAT-1 (SQL) routes NEVER use adapter - facts-first requires base model
  // Only CAT-2 (KB) and CAT-3 (EQ) can use adapter for tone enhancement
  if (route === 'sql') {
    log.event('adapter.choose_model', {
      intent,
      cohortKey,
      route,
      decision: 'base',
      reason: 'CAT-1 SQL route - always use base model'
    });
    return registry.models.composer_base;
  }

  // Check if intent is tone-sensitive
  const isTone = toneSensitive.has(intent);

  if (!isTone) {
    // Non-tone intent → always use base
    log.event('adapter.choose_model', {
      intent,
      cohortKey,
      route,
      decision: 'base',
      reason: 'non-tone-sensitive intent'
    });
    return registry.models.composer_base;
  }

  // Allowlist override: always use adapter for QA consistency
  if (allowlist.has(studentId ?? '')) {
    log.event('adapter.choose_model', {
      intent,
      cohortKey,
      route,
      decision: 'adapter',
      reason: 'allowlisted student',
      isTone: true
    });
    return registry.models.jenny_v8_adapter;
  }

  // Canary eligibility check
  const canaryEligible = cfg.canary_eligible_cohorts.some(prefix =>
    cohortKey.startsWith(prefix)
  );

  if (!canaryEligible) {
    log.event('adapter.choose_model', {
      intent,
      cohortKey,
      route,
      decision: 'base',
      reason: 'not canary eligible',
      isTone: true
    });
    return registry.models.composer_base;
  }

  // Traffic split based on hash
  const hash = simpleHash(cohortKey);
  const splitPct = Math.round((cfg.traffic_split.jenny_v8_adapter ?? 0) * 100);
  const inCanary = hash < splitPct;

  const useAdapter = inCanary;

  log.event('adapter.choose_model', {
    intent,
    cohortKey,
    route,
    bucket: hash,
    splitPct,
    isTone: true,
    canaryEligible: true,
    inCanary,
    decision: useAdapter ? 'adapter' : 'base'
  });

  return useAdapter ? registry.models.jenny_v8_adapter : registry.models.composer_base;
}

/**
 * Check if a model is the fine-tuned adapter
 */
export function isAdapterModel(model: string): boolean {
  return model.includes('ft:') || model === registry.models.jenny_v8_adapter;
}

/**
 * Get model badge for UI display
 */
export function getModelBadge(model: string): string {
  return isAdapterModel(model) ? '🔶 Adapter v8' : '⚪ Base';
}

/**
 * Get traffic split config (for monitoring/debugging)
 */
export function getTrafficSplit() {
  return {
    adapter_pct: registry.config.traffic_split.jenny_v8_adapter * 100,
    base_pct: registry.config.traffic_split.composer_base * 100,
    tone_intents: registry.config.tone_sensitive_intents,
    allowlist: registry.config.adapter_allowlist
  };
}
