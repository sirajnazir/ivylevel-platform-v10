/**
 * config/flags.ts
 * Feature flags for OpenAI Agents SDK migration
 *
 * Decision: Use Responses API + Agents SDK as primary path,
 * with Assistants API compatibility wrapper for legacy flows.
 *
 * Context: OpenAI SDK v6.4.0 has submitToolOutputs regression (GitHub #1605)
 * where thread_id is lost, causing /threads/undefined/... errors.
 *
 * Roadmap: OpenAI promoting Responses API + Agents SDK;
 * Assistants API sunset mid-2026.
 *
 * Created: 2025-10-17
 */

export interface FeatureFlags {
  /**
   * Primary path: Use Responses API + Agents SDK for multi-agent orchestration
   * Default: true (production-ready, no submitToolOutputs regression)
   */
  useAgentsSdk: boolean;

  /**
   * Legacy path: Use REST wrapper for Assistants API tool outputs
   * Default: false (only for existing Assistants threads)
   *
   * When enabled, bypasses Node SDK's broken submitToolOutputs
   * by calling REST API directly via fetch.
   */
  assistantsCompat: boolean;

  /**
   * Pin to known-good SDK version: openai@5.10.1
   * Default: false (only if forced via env var)
   *
   * Use only behind flag; building forward on Responses/Agents.
   */
  assistantsSdkPin: boolean;

  /**
   * Enable OTel tracing for agent spans
   * Default: true (production observability)
   */
  enableTracing: boolean;

  /**
   * Enable synthetic canaries for compat wrapper
   * Default: true in staging/prod, false in local dev
   */
  enableCanaries: boolean;
}

/**
 * Load feature flags from environment
 */
export const FLAGS: FeatureFlags = {
  // Primary path (default on)
  useAgentsSdk: process.env.USE_AGENTS_SDK !== 'false',

  // Legacy compat (default off, enable for existing Assistants threads)
  assistantsCompat: process.env.ASSISTANTS_COMPAT === 'true',

  // Pin known-good SDK (default off, use only if forced)
  assistantsSdkPin: process.env.ASSISTANTS_SDK_PIN === '5.10.1',

  // Observability (default on)
  enableTracing: process.env.ENABLE_TRACING !== 'false',

  // Canaries (on in staging/prod)
  enableCanaries: process.env.NODE_ENV !== 'development' && process.env.ENABLE_CANARIES !== 'false',
};

/**
 * Log active flags on startup
 */
export function logFlags() {
  console.log('[FLAGS] Feature flags loaded:');
  console.log(`  useAgentsSdk: ${FLAGS.useAgentsSdk} (primary path)`);
  console.log(`  assistantsCompat: ${FLAGS.assistantsCompat} (legacy REST wrapper)`);
  console.log(`  assistantsSdkPin: ${FLAGS.assistantsSdkPin} (pin to 5.10.1)`);
  console.log(`  enableTracing: ${FLAGS.enableTracing} (OTel spans)`);
  console.log(`  enableCanaries: ${FLAGS.enableCanaries} (synthetic tests)`);
}

/**
 * Validate flag combinations
 */
export function validateFlags() {
  // Cannot use both Agents SDK and pin old SDK
  if (FLAGS.useAgentsSdk && FLAGS.assistantsSdkPin) {
    throw new Error('Invalid flag combination: useAgentsSdk=true + assistantsSdkPin=true');
  }

  // Assistants compat requires Agents SDK off
  if (FLAGS.assistantsCompat && !FLAGS.assistantsSdkPin && FLAGS.useAgentsSdk) {
    console.warn('[FLAGS] Warning: assistantsCompat enabled but useAgentsSdk=true (compat may not be needed)');
  }
}
