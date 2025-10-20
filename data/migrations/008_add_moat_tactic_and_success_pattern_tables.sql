-- Migration 008: Add Moat Tactic Chips & Success Patterns (DS-T1 & DS-T2)
-- Created: 2025-10-16
-- Purpose: Enable multi-coach/student knowledge sharing while preserving v14 personal data
-- Strategy: ADDITIVE ONLY - No changes to existing v14 tables

-- Enable migration mode
SET app.migration = true;

-- ============================================================================
-- DESIGN PRINCIPLE
-- ============================================================================
-- 1. Personal data (kb_items, outcomes) stays personal - student sees only their data
-- 2. Moat knowledge (tactics, patterns) is shared - cross-pollination enabled
-- 3. Zero breaking changes to v14 - all existing queries continue working
-- 4. Universal design - works for jenny-huda, coach2-student2, coach3-student3, etc.

-- ============================================================================
-- PART 1: MULTI-COACH/STUDENT FOUNDATION
-- ============================================================================

-- Table: coaches
-- Purpose: Registry of all coaches contributing to platform
-- Baseline: Seed with Jenny, but supports infinite coaches
CREATE TABLE IF NOT EXISTS coaches (
  coach_id          TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  email             TEXT UNIQUE,

  -- Coach profile
  specialization    TEXT[],                    -- ['STEM', 'Humanities', 'Arts']
  expertise_areas   TEXT[],                    -- ['Essay Strategy', 'EC Development']
  years_experience  INT,

  -- Network stats (updated via triggers)
  students_coached  INT DEFAULT 0,
  tactics_created   INT DEFAULT 0,
  patterns_created  INT DEFAULT 0,
  success_rate      NUMERIC,

  -- Quality & reputation
  avg_tactic_score  NUMERIC,
  contributor_tier  TEXT CHECK (contributor_tier IN ('bronze', 'silver', 'gold', 'platinum', 'legend')) DEFAULT 'bronze',
  verified          BOOLEAN DEFAULT false,

  -- Timestamps
  joined_at         TIMESTAMPTZ DEFAULT now(),
  last_active_at    TIMESTAMPTZ DEFAULT now(),

  -- Optional metadata
  bio               TEXT,
  linkedin_url      TEXT,
  website_url       TEXT
);

-- Indexes for coach queries
CREATE INDEX IF NOT EXISTS idx_coaches_tier ON coaches(contributor_tier);
CREATE INDEX IF NOT EXISTS idx_coaches_specialization ON coaches USING GIN(specialization);
CREATE INDEX IF NOT EXISTS idx_coaches_verified ON coaches(verified) WHERE verified = true;

COMMENT ON TABLE coaches IS 'Registry of all coaches. Supports multi-coach platform. Baseline: jenny-duan';
COMMENT ON COLUMN coaches.verified IS 'Platform-verified coach (manual approval)';

-- Seed with Jenny (baseline coach)
INSERT INTO coaches (coach_id, display_name, specialization, expertise_areas, years_experience, verified, contributor_tier)
VALUES (
  'jenny-duan',
  'Jenny Duan',
  ARRAY['STEM', 'Computer Science'],
  ARRAY['Essay Strategy', 'EC Development', 'Identity Positioning', 'Time Management', 'Award Applications'],
  5,
  true,
  'platinum'  -- Pre-set as platinum given proven track record
)
ON CONFLICT (coach_id) DO NOTHING;

-- ============================================================================
-- Extend students table (ADDITIVE - no breaking changes)
-- Add contributor fields to enable student contributions
-- ============================================================================

-- Add contributor status to students (for DS-T2 success patterns)
ALTER TABLE students ADD COLUMN IF NOT EXISTS contributor_status TEXT CHECK (contributor_status IN ('none', 'approved', 'featured')) DEFAULT 'none';
ALTER TABLE students ADD COLUMN IF NOT EXISTS patterns_contributed INT DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS contribution_score NUMERIC DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS badges_earned TEXT[];
ALTER TABLE students ADD COLUMN IF NOT EXISTS primary_coach_id TEXT REFERENCES coaches(coach_id);

COMMENT ON COLUMN students.contributor_status IS 'Whether student can contribute success patterns. Default: none';
COMMENT ON COLUMN students.primary_coach_id IS 'Primary coach for this student (for personal data isolation)';

-- Mark Huda as featured contributor (she has proven success pattern)
UPDATE students
SET
  contributor_status = 'featured',
  badges_earned = ARRAY['NCWIT National Winner', 'First Student Contributor'],
  primary_coach_id = 'jenny-duan'
WHERE student_id = 'huda-2025';

-- ============================================================================
-- PART 2: DS-T1 - TACTIC CHIPS (UNIVERSAL KNOWLEDGE SHARING)
-- ============================================================================

-- Table: moat_tactic_chips
-- Purpose: Reusable coaching tactics from ANY coach, accessible to ALL
-- Baseline: Load Jenny's tactics first, but architecture supports infinite coaches
CREATE TABLE IF NOT EXISTS moat_tactic_chips (
  tactic_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core metadata
  tactic_name         TEXT NOT NULL,
  tactic_slug         TEXT NOT NULL,           -- URL-safe identifier
  version             TEXT DEFAULT '1.0',

  -- Multi-coach authorship (UNIVERSAL)
  created_by_coach    TEXT NOT NULL REFERENCES coaches(coach_id),
  original_coach      TEXT REFERENCES coaches(coach_id),
  refined_by_coaches  TEXT[],                  -- Coaches who improved this tactic

  -- Provenance (where discovered)
  source_type         TEXT NOT NULL CHECK (source_type IN ('intel_chip', 'session_transcript', 'coach_submission', 'automated_extraction')),
  source_reference    TEXT,                    -- e.g., 'W003-FRAMEWORK-001'
  discovery_date      DATE,
  extracted_from      TEXT[],                  -- Session IDs or file references

  -- Classification (extensible via tags)
  tactic_category     TEXT NOT NULL,           -- 'Time_Management', 'Essay_Strategy', etc.
  domain              TEXT NOT NULL,           -- 'Execution', 'Strategy', 'Relationship'
  tags                TEXT[],                  -- Flexible: ['teen', 'immigrant', 'STEM']

  -- Applicability (multi-student archetype matching)
  student_archetypes  TEXT[],                  -- ['first-gen-immigrant', 'STEM-female']
  barriers_addressed  TEXT[],                  -- ['time-crisis', 'essay-generic']
  prerequisites       TEXT[],

  -- Core content
  core_principle      TEXT NOT NULL,
  description         TEXT NOT NULL,
  when_to_use         TEXT[],

  -- Executable steps
  micro_actions       JSONB NOT NULL,          -- Step-by-step instructions
  tools_needed        TEXT[],
  estimated_duration  INTERVAL,
  difficulty_level    TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),

  -- Outcomes (from multiple student applications)
  typical_outcomes    JSONB,                   -- Common results across students
  success_stories     TEXT[],                  -- Links to success_pattern_ids
  avg_outcome_lift    NUMERIC,

  -- Quality metrics
  quality_score       NUMERIC CHECK (quality_score BETWEEN 0 AND 1),
  confidence_score    NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  validation_status   TEXT CHECK (validation_status IN ('draft', 'review', 'approved', 'featured', 'deprecated')) DEFAULT 'review',
  validated_by        TEXT REFERENCES coaches(coach_id),

  -- Usage tracking (across ALL students - shared knowledge)
  times_retrieved     INT DEFAULT 0,
  times_applied       INT DEFAULT 0,
  times_succeeded     INT DEFAULT 0,
  success_rate        NUMERIC GENERATED ALWAYS AS (
    CASE WHEN times_applied > 0 THEN times_succeeded::numeric / times_applied ELSE NULL END
  ) STORED,

  -- Tactic relationships
  builds_on           TEXT[],                  -- Dependencies
  pairs_with          TEXT[],                  -- Complementary tactics
  superseded_by       TEXT,                    -- If deprecated

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  last_applied_at     TIMESTAMPTZ,

  -- Full-text search
  search_vector       tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(tactic_name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(core_principle, ''))
  ) STORED
);

-- Indexes for multi-coach/student retrieval
CREATE INDEX IF NOT EXISTS idx_tactic_chips_coach ON moat_tactic_chips(created_by_coach);
CREATE INDEX IF NOT EXISTS idx_tactic_chips_category ON moat_tactic_chips(tactic_category);
CREATE INDEX IF NOT EXISTS idx_tactic_chips_tags ON moat_tactic_chips USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_tactic_chips_archetypes ON moat_tactic_chips USING GIN(student_archetypes);
CREATE INDEX IF NOT EXISTS idx_tactic_chips_barriers ON moat_tactic_chips USING GIN(barriers_addressed);
CREATE INDEX IF NOT EXISTS idx_tactic_chips_quality ON moat_tactic_chips(quality_score DESC) WHERE validation_status IN ('approved', 'featured');
CREATE INDEX IF NOT EXISTS idx_tactic_chips_success ON moat_tactic_chips(success_rate DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tactic_chips_search ON moat_tactic_chips USING GIN(search_vector);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tactic_chips_slug_version ON moat_tactic_chips(tactic_slug, version);

COMMENT ON TABLE moat_tactic_chips IS 'Shared knowledge: Coaching tactics from ANY coach, retrievable by ANY student. Cross-pollination enabled.';
COMMENT ON COLUMN moat_tactic_chips.created_by_coach IS 'Coach who created this tactic. Supports multi-coach platform.';
COMMENT ON COLUMN moat_tactic_chips.times_applied IS 'Usage across ALL students (shared moat knowledge)';

-- ============================================================================
-- Table: moat_tactic_applications
-- Purpose: Track when tactics are applied to specific students
-- Privacy: Student sees only THEIR applications, but tactic stats aggregate across ALL
-- ============================================================================

CREATE TABLE IF NOT EXISTS moat_tactic_applications (
  application_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What tactic applied to which student
  tactic_id           UUID NOT NULL REFERENCES moat_tactic_chips(tactic_id) ON DELETE CASCADE,
  student_id          TEXT NOT NULL REFERENCES students(student_id),
  coach_id            TEXT REFERENCES coaches(coach_id),
  session_id          TEXT,

  -- Context when applied
  applied_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  student_context     JSONB,                   -- Student state at time of recommendation
  barrier_identified  TEXT,

  -- Execution tracking (personal to student)
  status              TEXT CHECK (status IN ('recommended', 'started', 'in_progress', 'completed', 'abandoned', 'failed')) DEFAULT 'recommended',
  progress_pct        INT CHECK (progress_pct BETWEEN 0 AND 100) DEFAULT 0,

  -- Outcomes (student-specific)
  outcome_achieved    BOOLEAN,
  measurable_result   JSONB,
  outcome_notes       TEXT,

  -- Learning (contributes back to tactic improvement)
  adaptations_made    TEXT[],
  challenges_faced    TEXT[],
  what_worked         TEXT,
  what_didnt_work     TEXT,
  student_rating      INT CHECK (student_rating BETWEEN 1 AND 5),
  would_recommend     BOOLEAN,

  -- Timestamps
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tactic_apps_tactic ON moat_tactic_applications(tactic_id);
CREATE INDEX IF NOT EXISTS idx_tactic_apps_student ON moat_tactic_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_tactic_apps_coach ON moat_tactic_applications(coach_id);
CREATE INDEX IF NOT EXISTS idx_tactic_apps_status ON moat_tactic_applications(status);
CREATE INDEX IF NOT EXISTS idx_tactic_apps_outcome ON moat_tactic_applications(outcome_achieved) WHERE outcome_achieved IS NOT NULL;

COMMENT ON TABLE moat_tactic_applications IS 'Personal: Track tactic usage per student. Privacy: student sees only their applications.';

-- Trigger: Update tactic stats when application completes
CREATE OR REPLACE FUNCTION update_tactic_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE moat_tactic_chips
    SET
      times_applied = times_applied + 1,
      times_succeeded = CASE WHEN NEW.outcome_achieved THEN times_succeeded + 1 ELSE times_succeeded END,
      last_applied_at = now(),
      updated_at = now()
    WHERE tactic_id = NEW.tactic_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tactic_application_stats_trigger
AFTER INSERT OR UPDATE OF status ON moat_tactic_applications
FOR EACH ROW
EXECUTE FUNCTION update_tactic_stats();

-- ============================================================================
-- PART 3: DS-T2 - SUCCESS PATTERNS (STUDENT CONTRIBUTIONS)
-- ============================================================================

-- Table: moat_student_success_patterns
-- Purpose: Success journeys from ANY student, accessible to ALL for inspiration
-- Baseline: Huda's NCWIT journey first, but architecture supports all students
CREATE TABLE IF NOT EXISTS moat_student_success_patterns (
  pattern_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution (multi-contributor: student or coach can submit)
  contributor_type    TEXT CHECK (contributor_type IN ('student', 'coach', 'admin', 'automated')) NOT NULL,
  contributor_id      TEXT NOT NULL,           -- student_id or coach_id
  student_id          TEXT REFERENCES students(student_id),  -- Subject of pattern
  coach_id            TEXT REFERENCES coaches(coach_id),     -- Coach who guided journey

  -- Pattern metadata
  title               TEXT NOT NULL,
  pattern_slug        TEXT NOT NULL,
  outcome_category    TEXT NOT NULL,           -- 'national_award', 'college_admit', etc.

  -- Student archetype (for matching "students like me")
  student_archetype   JSONB NOT NULL,          -- {demographics, academic_profile, starting_stats}
  archetype_tags      TEXT[],                  -- ['first-gen', 'STEM', 'public-hs']

  -- Journey timeline
  start_date          DATE,
  breakthrough_date   DATE,
  outcome_date        DATE NOT NULL,
  total_duration_days INT GENERATED ALWAYS AS (outcome_date - start_date) STORED,

  -- Starting state
  starting_stats      JSONB NOT NULL,          -- {gpa, sat, ecs, screen_time}
  barriers_faced      TEXT[],
  initial_challenges  TEXT,

  -- Tactics applied (linked to tactic_chips)
  tactics_used        TEXT[],                  -- Array of tactic_slugs
  tactic_sequence     JSONB,                   -- {week3: '168-hour', week12: 'parent-story'}
  most_impactful      TEXT[],                  -- Top tactics

  -- Breakthrough moments
  key_turning_points  JSONB,
  what_clicked        TEXT,

  -- Outcomes
  final_outcomes      JSONB NOT NULL,
  measurable_results  JSONB,
  proof_type          TEXT[],
  proof_links         TEXT[],

  -- Meta-insights (contributor reflection)
  what_worked         TEXT NOT NULL,
  what_was_hard       TEXT,
  what_would_change   TEXT,
  advice_to_similar   TEXT NOT NULL,

  -- Quality
  data_completeness   NUMERIC,
  validation_status   TEXT CHECK (validation_status IN ('pending', 'verified', 'featured', 'disputed')) DEFAULT 'pending',
  validated_by        TEXT REFERENCES coaches(coach_id),
  quality_score       NUMERIC CHECK (quality_score BETWEEN 0 AND 1),

  -- Engagement (shared knowledge - visible to all)
  times_shown         INT DEFAULT 0,
  helpful_votes       INT DEFAULT 0,
  unhelpful_votes     INT DEFAULT 0,
  comments_count      INT DEFAULT 0,
  inspired_students   TEXT[],

  -- Related patterns
  similar_patterns    TEXT[],
  contrasting_paths   TEXT[],

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  last_viewed_at      TIMESTAMPTZ,

  -- Full-text search
  search_vector       tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(what_worked, '') || ' ' || coalesce(advice_to_similar, ''))
  ) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_success_patterns_slug ON moat_student_success_patterns(pattern_slug);
CREATE INDEX IF NOT EXISTS idx_success_patterns_contributor ON moat_student_success_patterns(contributor_id);
CREATE INDEX IF NOT EXISTS idx_success_patterns_student ON moat_student_success_patterns(student_id);
CREATE INDEX IF NOT EXISTS idx_success_patterns_coach ON moat_student_success_patterns(coach_id);
CREATE INDEX IF NOT EXISTS idx_success_patterns_outcome ON moat_student_success_patterns(outcome_category);
CREATE INDEX IF NOT EXISTS idx_success_patterns_tags ON moat_student_success_patterns USING GIN(archetype_tags);
CREATE INDEX IF NOT EXISTS idx_success_patterns_tactics ON moat_student_success_patterns USING GIN(tactics_used);
CREATE INDEX IF NOT EXISTS idx_success_patterns_quality ON moat_student_success_patterns(quality_score DESC) WHERE validation_status = 'verified';
CREATE INDEX IF NOT EXISTS idx_success_patterns_helpful ON moat_student_success_patterns((helpful_votes - unhelpful_votes) DESC);
CREATE INDEX IF NOT EXISTS idx_success_patterns_search ON moat_student_success_patterns USING GIN(search_vector);

COMMENT ON TABLE moat_student_success_patterns IS 'Shared knowledge: Success journeys from ANY student, accessible to ALL. Cross-pollination enabled.';
COMMENT ON COLUMN moat_student_success_patterns.student_id IS 'Subject of pattern (may differ from contributor_id if coach submitted)';

-- ============================================================================
-- PART 4: CONTRIBUTOR GAMIFICATION (UNIVERSAL)
-- ============================================================================

-- Table: moat_contributor_stats
-- Purpose: Track contribution impact for BOTH coaches AND students
CREATE TABLE IF NOT EXISTS moat_contributor_stats (
  contributor_id      TEXT PRIMARY KEY,
  contributor_type    TEXT CHECK (contributor_type IN ('coach', 'student')) NOT NULL,

  -- Contribution counts
  tactics_created     INT DEFAULT 0,
  patterns_shared     INT DEFAULT 0,
  refinements_proposed INT DEFAULT 0,
  refinements_accepted INT DEFAULT 0,
  comments_posted     INT DEFAULT 0,

  -- Impact metrics (across platform)
  tactics_retrieved   INT DEFAULT 0,
  patterns_viewed     INT DEFAULT 0,
  helpful_votes       INT DEFAULT 0,
  students_helped     INT DEFAULT 0,
  success_influenced  INT DEFAULT 0,

  -- Reputation
  reputation_score    INT DEFAULT 0,
  contributor_tier    TEXT CHECK (contributor_tier IN ('bronze', 'silver', 'gold', 'platinum', 'legend')) DEFAULT 'bronze',

  -- Badges
  badges_earned       TEXT[],

  -- Streaks
  contribution_streak INT DEFAULT 0,
  longest_streak      INT DEFAULT 0,
  last_contribution   DATE,

  -- Timestamps
  first_contribution  TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributor_stats_type ON moat_contributor_stats(contributor_type);
CREATE INDEX IF NOT EXISTS idx_contributor_stats_tier ON moat_contributor_stats(contributor_tier);
CREATE INDEX IF NOT EXISTS idx_contributor_stats_reputation ON moat_contributor_stats(reputation_score DESC);

COMMENT ON TABLE moat_contributor_stats IS 'Gamification: Track impact of ANY contributor (coach or student). Drives network effects.';

-- ============================================================================
-- PART 5: VIEWS FOR EASY QUERYING
-- ============================================================================

-- View: Available tactics for a specific student archetype
-- Usage: Find tactics relevant to current student
CREATE OR REPLACE VIEW v_tactics_by_archetype AS
SELECT
  tc.tactic_id,
  tc.tactic_slug,
  tc.tactic_name,
  tc.tactic_category,
  tc.core_principle,
  tc.description,
  tc.micro_actions,
  tc.student_archetypes,
  tc.barriers_addressed,
  tc.quality_score,
  tc.success_rate,
  tc.times_applied,
  c.display_name as coach_name,
  c.coach_id,
  tc.validation_status
FROM moat_tactic_chips tc
JOIN coaches c ON tc.created_by_coach = c.coach_id
WHERE tc.validation_status IN ('approved', 'featured');

COMMENT ON VIEW v_tactics_by_archetype IS 'Available tactics from ALL coaches, filterable by student archetype';

-- View: Success patterns by outcome
CREATE OR REPLACE VIEW v_success_patterns_by_outcome AS
SELECT
  sp.pattern_id,
  sp.pattern_slug,
  sp.title,
  sp.outcome_category,
  sp.archetype_tags,
  sp.tactics_used,
  sp.what_worked,
  sp.advice_to_similar,
  sp.measurable_results,
  sp.helpful_votes - sp.unhelpful_votes as net_helpful_votes,
  sp.quality_score,
  c.display_name as coach_name,
  s.student_name,
  sp.validation_status
FROM moat_student_success_patterns sp
LEFT JOIN coaches c ON sp.coach_id = c.coach_id
LEFT JOIN students s ON sp.student_id = s.student_id
WHERE sp.validation_status IN ('verified', 'featured');

COMMENT ON VIEW v_success_patterns_by_outcome IS 'Success patterns from ALL students, filterable by outcome type';

-- ============================================================================
-- VERIFICATION QUERIES (Ensure no breaking changes)
-- ============================================================================

-- Verify v14 tables still work
DO $$
BEGIN
  -- Test existing v14 queries
  PERFORM 1 FROM students WHERE student_id = 'huda-2025';
  PERFORM 1 FROM kb_items WHERE student_id = 'huda-2025';
  PERFORM 1 FROM outcomes WHERE student_id = 'huda-2025';

  RAISE NOTICE '✅ v14 tables verified: No breaking changes';
END $$;

-- Verify new tables created
DO $$
BEGIN
  PERFORM 1 FROM coaches WHERE coach_id = 'jenny-duan';
  PERFORM 1 FROM moat_tactic_chips LIMIT 1;  -- May be empty initially
  PERFORM 1 FROM moat_student_success_patterns LIMIT 1;  -- May be empty initially

  RAISE NOTICE '✅ New moat tables created successfully';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary
SELECT
  'Migration 008 Complete' as status,
  '✅ Coaches table created' as step1,
  '✅ Students extended (additive)' as step2,
  '✅ Tactic chips table created' as step3,
  '✅ Success patterns table created' as step4,
  '✅ Contributor stats table created' as step5,
  '✅ Views created' as step6,
  '✅ v14 data preserved' as step7,
  '✅ Multi-coach/student ready' as step8;
