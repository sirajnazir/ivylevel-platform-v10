/**
 * Feature Flags Utility
 * Purpose: Centralized feature flag management for v3.2 rollout
 */

export const featureFlags = {
  evidencePanel: () => import.meta.env.VITE_FEATURE_EVIDENCE_PANEL === 'true',
  hgtiGraph: () => import.meta.env.VITE_FEATURE_HGTI_GRAPH === 'true',
  missingEvidence: () => import.meta.env.VITE_FEATURE_412_UX === 'true',
  eqLayer: () => import.meta.env.VITE_FEATURE_EQ_LAYER === 'true',
  eqToggle: () => import.meta.env.VITE_FEATURE_EQ_TOGGLE === 'true',
  parentSignals: () => import.meta.env.VITE_FEATURE_PARENT_SIGNALS === 'true',
} as const;

export function useFeatureFlag(flag: keyof typeof featureFlags): boolean {
  return featureFlags[flag]();
}

export function getIvyScoreVersion(): number {
  return Number(import.meta.env.VITE_IVYSCORE_VERSION) || 1;
}

export function isRLSEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_RLS_CHECKS === 'true';
}

export function isPIIScrubEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_PII_SCRUBBING === 'true';
}
