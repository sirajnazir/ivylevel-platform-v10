-- v1.2 Smart Precision Opportunity Recommendation Engine
-- Additive migration - no breaking changes

-- Opportunities curated/ingested
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL, -- award|summer|research|scholarship|network
  tier TEXT, -- tier_1|tier_2|tier_3
  category TEXT, -- research_programs|summer_programs|competitions_awards|...
  mission TEXT,
  requirements JSONB, -- {gpa_min, skill_match, grade_levels, region, ...}
  recognition_level TEXT, -- local|regional|national|global
  commitment JSONB, -- {time_cost, financial_cost, duration_weeks}
  deadlines JSONB, -- [{name, date}]
  source TEXT, -- curated|sheet|doc|site
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_kind ON opportunities(kind);
CREATE INDEX IF NOT EXISTS idx_opportunities_tier ON opportunities(tier);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category);

-- Student-specific scores/recommendations
CREATE TABLE IF NOT EXISTS opportunity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  total_score NUMERIC NOT NULL,
  components JSONB NOT NULL, -- {academic_fit, narrative_fit, strategic_value, resource_fit, timeline_fit}
  bucket TEXT NOT NULL, -- immediate_action|priority_pipeline|strategic_reserve|reach|safety
  rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opp_scores_student ON opportunity_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_opp_scores_bucket ON opportunity_scores(student_id, bucket);

-- Bombardment episodes (bursts)
CREATE TABLE IF NOT EXISTS bombardment_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  window TSTZRANGE NOT NULL,
  trigger TEXT, -- rejection_spike|seasonal|coach_directive|morale_drop
  size INT NOT NULL,
  opportunities UUID[] NOT NULL,
  coach_rationale TEXT,
  outcomes JSONB, -- {wins, rejects, waitlists}
  derived_metrics JSONB, -- {yield, persistence_gain, assets_created}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_burst_student ON bombardment_episodes(student_id);
CREATE INDEX IF NOT EXISTS idx_burst_window ON bombardment_episodes USING GIST (window);

-- Add to migrations tracking
INSERT INTO migrations (name, executed_at) 
VALUES ('2025-09-25-opportunities-v1.2.sql', NOW())
ON CONFLICT (name) DO NOTHING;