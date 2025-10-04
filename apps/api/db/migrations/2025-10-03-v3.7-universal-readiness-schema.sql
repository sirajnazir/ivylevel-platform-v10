-- v3.7: Universal Readiness Scoring & Progress Tracking
-- Created: 2025-10-03
-- Purpose: Credit-score-like system with feature-level granularity, what-if simulations, and ROI recommendations
-- Design: Extensible (add features anytime), Explainable (evidence per feature), Universal (any rubric/year)

-- ============================================================================
-- 1) Feature Registry (global definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_defs (
  feature_id       TEXT PRIMARY KEY,         -- e.g., 'sat_total', 'ec_leadership_count', 'award_national_count'
  domain           TEXT NOT NULL,            -- 'testing'|'academics'|'ecs'|'awards'|'narrative'|'context'
  label            TEXT NOT NULL,            -- human name
  description      TEXT,
  scale_max        NUMERIC NOT NULL DEFAULT 100,  -- normalized cap
  created_ts       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factor_feature_map (
  rubric_id        TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
  factor_id        TEXT NOT NULL REFERENCES admissions_rubric_factors(factor_id),
  feature_id       TEXT NOT NULL REFERENCES feature_defs(feature_id),
  weight_pct       NUMERIC NOT NULL,         -- feature's share within factor (sums to ~100 per factor)
  PRIMARY KEY (rubric_id, factor_id, feature_id)
);

-- ============================================================================
-- 2) Student Feature Snapshots (computed & stored for reproducibility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_snapshots (
  snapshot_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  as_of            DATE NOT NULL,
  rubric_id        TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
  engine           TEXT NOT NULL DEFAULT 'sql_v1',   -- later 'ml_v1', etc.
  created_ts       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, rubric_id, as_of, engine)
);

CREATE TABLE IF NOT EXISTS feature_snapshot_values (
  snapshot_id      UUID NOT NULL REFERENCES feature_snapshots(snapshot_id) ON DELETE CASCADE,
  feature_id       TEXT NOT NULL REFERENCES feature_defs(feature_id),
  value_norm       NUMERIC NOT NULL,                 -- 0..scale_max (usually 0..100)
  evidence         JSONB DEFAULT '{}'::jsonb,        -- counts, ids, chips, etc.
  PRIMARY KEY (snapshot_id, feature_id)
);

-- ============================================================================
-- 3) What-If Action Catalog (global action definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS action_defs (
  action_id        TEXT PRIMARY KEY,   -- e.g., 'raise_sat_to', 'win_award_tier', 'gain_leadership', 'increase_ec_depth'
  label            TEXT NOT NULL,
  description      TEXT,
  domain           TEXT NOT NULL,      -- testing|awards|ecs|academics|narrative
  params_schema    JSONB NOT NULL      -- JSON schema for inputs (e.g., {"target_score": "int"})
);

CREATE TABLE IF NOT EXISTS action_feature_effects (
  action_id        TEXT REFERENCES action_defs(action_id),
  feature_id       TEXT REFERENCES feature_defs(feature_id),
  effect_model     TEXT NOT NULL,      -- 'linear'|'cap'|'logistic'|'piecewise'
  k1               NUMERIC,            -- model parameters (nullable; depends on effect_model)
  k2               NUMERIC,
  k3               NUMERIC,
  PRIMARY KEY (action_id, feature_id)
);

-- ============================================================================
-- 4) Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_snapshots_student ON feature_snapshots(student_id, as_of DESC);
CREATE INDEX IF NOT EXISTS idx_feature_snapshot_values_snapshot ON feature_snapshot_values(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_factor_feature_map_lookup ON factor_feature_map(rubric_id, factor_id);
