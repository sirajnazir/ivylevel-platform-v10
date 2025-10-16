-- DS7: Admissions Officer Perspectives (Knowledge Moat)
-- Insights from AOs about what colleges really look for
-- Created: 2025-10-16 (Week 7)

CREATE TABLE IF NOT EXISTS moat_ao_perspectives (
  perspective_id TEXT PRIMARY KEY,
  college_name TEXT NOT NULL,
  ao_role TEXT NOT NULL, -- 'dean', 'senior_reader', 'regional_director'

  -- Perspective details
  topic TEXT NOT NULL, -- 'essays', 'extracurriculars', 'academics', 'interviews', 'holistic_review'
  question TEXT NOT NULL, -- The question asked
  perspective_text TEXT NOT NULL, -- The AO's perspective

  -- Key insights (structured)
  key_points JSONB NOT NULL, -- array of main takeaways
  red_flags JSONB, -- things that raise concerns
  green_flags JSONB, -- things that impress AOs

  -- Context
  selectivity TEXT NOT NULL, -- 'highly_selective', 'selective', 'moderately_selective'
  admission_year INTEGER,

  -- Metadata
  source TEXT, -- 'conference', 'interview', 'panel', 'podcast'
  tags JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ao_college ON moat_ao_perspectives(college_name);
CREATE INDEX IF NOT EXISTS idx_ao_topic ON moat_ao_perspectives(topic);
CREATE INDEX IF NOT EXISTS idx_ao_selectivity ON moat_ao_perspectives(selectivity);
CREATE INDEX IF NOT EXISTS idx_ao_tags ON moat_ao_perspectives USING gin(tags);

-- View for search
CREATE OR REPLACE VIEW v_ao_insights AS
SELECT
  perspective_id,
  college_name,
  ao_role,
  topic,
  question,
  LEFT(perspective_text, 300) as excerpt,
  key_points,
  selectivity
FROM moat_ao_perspectives
ORDER BY college_name, topic;
