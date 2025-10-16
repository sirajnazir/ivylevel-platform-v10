-- DS6: Essay Examples (Knowledge Moat)
-- Sample essays from successful applicants with analysis
-- Created: 2025-10-16 (Week 6)

CREATE TABLE IF NOT EXISTS moat_essay_examples (
  essay_id TEXT PRIMARY KEY,
  college_name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL, -- 'common_app', 'supplemental', 'uc_piq', 'coalition'
  essay_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,

  -- Student profile (anonymized)
  student_profile JSONB, -- {gpa, sat, intended_major, demographics}
  admission_result TEXT NOT NULL, -- 'accepted', 'waitlisted', 'deferred_accepted'
  admission_year INTEGER NOT NULL,

  -- Analysis
  strengths JSONB, -- array of strength descriptions
  themes JSONB, -- array of themes: 'leadership', 'resilience', 'intellectual_curiosity', etc.
  writing_quality TEXT, -- 'exceptional', 'strong', 'good'

  -- Metadata
  tags JSONB, -- searchable tags
  reviewer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_essay_college ON moat_essay_examples(college_name);
CREATE INDEX IF NOT EXISTS idx_essay_prompt_type ON moat_essay_examples(prompt_type);
CREATE INDEX IF NOT EXISTS idx_essay_year ON moat_essay_examples(admission_year);
CREATE INDEX IF NOT EXISTS idx_essay_themes ON moat_essay_examples USING gin(themes);
CREATE INDEX IF NOT EXISTS idx_essay_tags ON moat_essay_examples USING gin(tags);

-- View for search
CREATE OR REPLACE VIEW v_essay_search AS
SELECT
  essay_id,
  college_name,
  prompt_type,
  LEFT(essay_text, 200) as excerpt,
  word_count,
  admission_result,
  admission_year,
  themes,
  writing_quality
FROM moat_essay_examples
ORDER BY admission_year DESC, college_name;
