-- Week 14: Create DS6 (Essay Examples) and DS7 (AO Perspectives) Tables
-- Purpose: Knowledge Moat real admissions essay examples and AO perspectives
-- Created: 2025-10-16

-- ==============================================================================
-- DS6: Essay Examples - Real successful essays from admitted students
-- ==============================================================================
CREATE TABLE IF NOT EXISTS moat_essay_examples (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  college_name TEXT NOT NULL,
  prompt_type TEXT NOT NULL, -- 'common_app', 'uc_piq', 'supplemental'
  admission_year INTEGER NOT NULL,
  essay_text TEXT NOT NULL,
  themes TEXT[] DEFAULT '{}',
  writing_quality TEXT, -- 'excellent', 'good', 'average'
  word_count INTEGER,
  student_admitted BOOLEAN DEFAULT false,
  student_enrolled BOOLEAN DEFAULT false,
  analysis_notes TEXT,
  key_takeaways TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT essay_examples_unique UNIQUE (student_id, college_name, prompt_type)
);

CREATE INDEX IF NOT EXISTS idx_essay_examples_college ON moat_essay_examples(college_name);
CREATE INDEX IF NOT EXISTS idx_essay_examples_themes ON moat_essay_examples USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_essay_examples_admitted ON moat_essay_examples(student_admitted) WHERE student_admitted = true;

COMMENT ON TABLE moat_essay_examples IS 'DS6: Real essay examples from admitted students extracted from coaching sessions';
COMMENT ON COLUMN moat_essay_examples.essay_text IS 'Full or partial essay text';
COMMENT ON COLUMN moat_essay_examples.themes IS 'Essay themes: identity, family, resilience, passion, community, creativity';

-- ==============================================================================
-- DS7: AO Perspectives - Admissions officer insights and perspectives
-- ==============================================================================
CREATE TABLE IF NOT EXISTS moat_ao_perspectives (
  id SERIAL PRIMARY KEY,
  college_name TEXT NOT NULL,
  ao_role TEXT, -- 'Admissions Officer', 'Dean of Admissions', 'AO Reader'
  topic TEXT NOT NULL, -- 'essays', 'extracurriculars', 'academics', 'holistic_review'
  selectivity TEXT, -- 'highly_selective', 'selective', 'moderate'
  question TEXT NOT NULL,
  perspective_text TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  source_type TEXT, -- 'coaching_intelligence', 'public_statement', 'interview'
  source_url TEXT,
  year_published INTEGER,
  credibility_score DECIMAL(3,2) DEFAULT 0.50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT ao_perspectives_unique UNIQUE (college_name, question)
);

CREATE INDEX IF NOT EXISTS idx_ao_perspectives_college ON moat_ao_perspectives(college_name);
CREATE INDEX IF NOT EXISTS idx_ao_perspectives_topic ON moat_ao_perspectives(topic);
CREATE INDEX IF NOT EXISTS idx_ao_perspectives_selectivity ON moat_ao_perspectives(selectivity);
CREATE INDEX IF NOT EXISTS idx_ao_perspectives_credibility ON moat_ao_perspectives(credibility_score);

COMMENT ON TABLE moat_ao_perspectives IS 'DS7: Admissions officer perspectives extracted from coaching intelligence and public sources';
COMMENT ON COLUMN moat_ao_perspectives.credibility_score IS 'Quality score 0.00-1.00 based on source reliability';
COMMENT ON COLUMN moat_ao_perspectives.key_points IS 'Main takeaways from AO perspective';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'DS6/DS7 Tables Created Successfully';
END $$;
