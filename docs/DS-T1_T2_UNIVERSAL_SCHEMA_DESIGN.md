# DS-T1 & DS-T2 Universal Schema Design
**Document Created:** 2025-10-16
**Design Status:** ✅ **FINAL - MULTI-COACH/STUDENT READY**
**Design Principle:** Jenny-Huda as baseline, architecture for infinite scale

---

## Design Philosophy

### Core Principle
> **"Start with Jenny-Huda excellence, design for infinite coaches and students"**

**What This Means:**
1. **Bootstrap:** Load Jenny-Huda tactics and patterns as seed data (proven quality)
2. **Architecture:** Every table supports `coach_id` + `student_id` (not hardcoded)
3. **Extensibility:** New coaches/students add data without schema changes
4. **Quality:** Inherit v14 gold standard, evolve for network effects

### Anti-Patterns to Avoid
❌ Hardcoding "Jenny" or "huda-2025" in schema
❌ Single-coach assumptions in queries
❌ Student-specific logic in application code
❌ Non-extensible enums (must support growth)

### Patterns to Follow
✅ Foreign keys to `coaches` and `students` tables
✅ Coach/student as query parameters (not constants)
✅ Quality scoring independent of contributor identity
✅ Extensible categorization (tags, not enums)

---

## Part 1: Multi-Coach/Student Foundation Tables

### New Required Tables

#### 1. Coaches Registry
**Purpose:** Support multiple coaches contributing tactics and patterns

```sql
CREATE TABLE coaches (
  coach_id          TEXT PRIMARY KEY,          -- 'jenny-duan', 'sarah-smith', 'coach-xyz'
  display_name      TEXT NOT NULL,             -- 'Jenny Duan', 'Sarah Smith'
  email             TEXT UNIQUE,

  -- Coach profile
  specialization    TEXT[],                    -- ['STEM', 'Humanities', 'Arts']
  expertise_areas   TEXT[],                    -- ['Essay Strategy', 'EC Development', 'Test Prep']
  years_experience  INT,

  -- Network stats
  students_coached  INT DEFAULT 0,
  tactics_created   INT DEFAULT 0,
  success_rate      NUMERIC,                   -- % of students achieving goals

  -- Quality & reputation
  avg_tactic_score  NUMERIC,                   -- Average quality of tactics created
  contributor_tier  TEXT CHECK (contributor_tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
  verified          BOOLEAN DEFAULT false,     -- Platform-verified coach

  -- Timestamps
  joined_at         TIMESTAMPTZ DEFAULT now(),
  last_active_at    TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  bio               TEXT,
  linkedin_url      TEXT,
  website_url       TEXT
);

-- Seed with Jenny
INSERT INTO coaches (coach_id, display_name, specialization, expertise_areas, years_experience, verified)
VALUES ('jenny-duan', 'Jenny Duan', ARRAY['STEM', 'CS'], ARRAY['Essay Strategy', 'EC Development', 'Identity Positioning', 'Time Management'], 5, true);

CREATE INDEX idx_coaches_specialization ON coaches USING GIN(specialization);
CREATE INDEX idx_coaches_tier ON coaches(contributor_tier);
```

#### 2. Students Registry Enhancement
**Purpose:** Support student contributors (not just data subjects)

```sql
-- Extend existing students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS contributor_status TEXT CHECK (contributor_status IN ('none', 'approved', 'featured')) DEFAULT 'none';
ALTER TABLE students ADD COLUMN IF NOT EXISTS patterns_contributed INT DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS contribution_score NUMERIC DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS badges_earned TEXT[];

-- Enable Huda as contributor
UPDATE students SET contributor_status = 'featured', badges_earned = ARRAY['First Student Contributor', 'NCWIT National Winner']
WHERE student_id = 'huda-2025';
```

---

## Part 2: DS-T1 Universal Tactic Chips Schema

### Design Goals
1. **Multi-coach contributions:** Any coach can create/refine tactics
2. **Quality inheritance:** Preserve Jenny's proven tactics as baseline
3. **Versioning:** Support tactic evolution (v1.0 → v2.0 of same tactic)
4. **Attribution:** Credit original creator, track refiners
5. **Reusability:** Work across any student archetype

```sql
CREATE TABLE moat_tactic_chips (
  tactic_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core metadata
  tactic_name         TEXT NOT NULL,             -- '168-Hour Framework'
  tactic_slug         TEXT UNIQUE NOT NULL,      -- '168-hour-framework' (URL-safe)
  version             TEXT DEFAULT '1.0',        -- Support evolution

  -- Multi-coach authorship
  created_by_coach    TEXT NOT NULL REFERENCES coaches(coach_id),
  original_coach      TEXT REFERENCES coaches(coach_id),  -- May differ if refined
  refined_by_coaches  TEXT[],                    -- Array of coach_ids who improved it

  -- Provenance (where discovered)
  source_type         TEXT NOT NULL,             -- 'session_transcript', 'coach_submission', 'automated_extraction'
  source_reference    TEXT,                      -- 'W003-FRAMEWORK-001' or session filename
  discovery_date      DATE,
  extracted_from      TEXT[],                    -- Multiple sessions if pattern detected across many

  -- Classification (extensible via tags, not enums)
  tactic_category     TEXT NOT NULL,             -- 'Time_Management', 'Essay_Strategy', etc.
  domain              TEXT NOT NULL,             -- 'Execution', 'Strategy', 'Relationship'
  tags                TEXT[],                    -- Flexible categorization: ['teen', 'immigrant', 'STEM']

  -- Applicability (multi-student)
  student_archetypes  TEXT[],                    -- ['first-gen-immigrant', 'STEM-female', 'public-hs']
  barriers_addressed  TEXT[],                    -- ['time-crisis', 'essay-generic', 'identity-uncertainty']
  prerequisites       TEXT[],                    -- ['basic-schedule', 'parent-buyin']

  -- Core content
  core_principle      TEXT NOT NULL,
  description         TEXT NOT NULL,
  when_to_use         TEXT[],

  -- Executable (JSON for flexibility)
  micro_actions       JSONB NOT NULL,            -- Detailed steps
  tools_needed        TEXT[],
  estimated_duration  INTERVAL,
  difficulty_level    TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),

  -- Outcomes (multi-student evidence)
  typical_outcomes    JSONB,                     -- {time_saved: '20h/week', confidence_boost: 'high'}
  success_stories     TEXT[],                    -- Links to success_pattern_ids
  avg_outcome_lift    NUMERIC,                   -- Average improvement across applications

  -- Quality metrics (universal)
  quality_score       NUMERIC CHECK (quality_score BETWEEN 0 AND 1),
  confidence_score    NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  validation_status   TEXT CHECK (validation_status IN ('draft', 'review', 'approved', 'featured', 'deprecated')) DEFAULT 'review',
  validated_by        TEXT REFERENCES coaches(coach_id),

  -- Usage tracking (across all students)
  times_retrieved     INT DEFAULT 0,
  times_applied       INT DEFAULT 0,
  times_succeeded     INT DEFAULT 0,
  success_rate        NUMERIC GENERATED ALWAYS AS (
    CASE WHEN times_applied > 0 THEN times_succeeded::numeric / times_applied ELSE NULL END
  ) STORED,

  -- Related tactics (network of knowledge)
  builds_on           TEXT[],                    -- Tactic slugs this depends on
  pairs_with          TEXT[],                    -- Complementary tactics
  superseded_by       TEXT,                      -- If deprecated, what replaces it

  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  last_applied_at     TIMESTAMPTZ,

  -- Full-text search
  search_vector       tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(tactic_name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(core_principle, ''))
  ) STORED
);

-- Indexes for multi-coach/student queries
CREATE INDEX idx_tactic_chips_coach ON moat_tactic_chips(created_by_coach);
CREATE INDEX idx_tactic_chips_category ON moat_tactic_chips(tactic_category);
CREATE INDEX idx_tactic_chips_tags ON moat_tactic_chips USING GIN(tags);
CREATE INDEX idx_tactic_chips_archetypes ON moat_tactic_chips USING GIN(student_archetypes);
CREATE INDEX idx_tactic_chips_barriers ON moat_tactic_chips USING GIN(barriers_addressed);
CREATE INDEX idx_tactic_chips_quality ON moat_tactic_chips(quality_score DESC) WHERE validation_status = 'approved';
CREATE INDEX idx_tactic_chips_success_rate ON moat_tactic_chips(success_rate DESC NULLS LAST);
CREATE INDEX idx_tactic_chips_search ON moat_tactic_chips USING GIN(search_vector);
CREATE UNIQUE INDEX idx_tactic_chips_slug_version ON moat_tactic_chips(tactic_slug, version);
```

### Tactic Applications Tracking (Multi-Student)

```sql
CREATE TABLE moat_tactic_applications (
  application_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who applied what
  tactic_id           UUID NOT NULL REFERENCES moat_tactic_chips(tactic_id),
  student_id          TEXT NOT NULL REFERENCES students(student_id),
  coach_id            TEXT REFERENCES coaches(coach_id),  -- Who recommended it
  session_id          TEXT,                               -- Which session

  -- Context
  applied_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  student_context     JSONB,                              -- State when recommended
  barrier_identified  TEXT,

  -- Execution tracking
  status              TEXT CHECK (status IN ('recommended', 'started', 'in_progress', 'completed', 'abandoned', 'failed')) DEFAULT 'recommended',
  progress_pct        INT CHECK (progress_pct BETWEEN 0 AND 100) DEFAULT 0,

  -- Outcomes (student-specific)
  outcome_achieved    BOOLEAN,
  measurable_result   JSONB,                              -- Specific to this student
  outcome_notes       TEXT,

  -- Learning & adaptation
  adaptations_made    TEXT[],                             -- How tactic was customized
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

CREATE INDEX idx_tactic_applications_tactic ON moat_tactic_applications(tactic_id);
CREATE INDEX idx_tactic_applications_student ON moat_tactic_applications(student_id);
CREATE INDEX idx_tactic_applications_coach ON moat_tactic_applications(coach_id);
CREATE INDEX idx_tactic_applications_status ON moat_tactic_applications(status);
CREATE INDEX idx_tactic_applications_outcome ON moat_tactic_applications(outcome_achieved) WHERE outcome_achieved IS NOT NULL;
```

### Tactic Refinement Queue (Crowdsourced Improvement)

```sql
CREATE TABLE moat_tactic_refinements (
  refinement_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What's being refined
  tactic_id           UUID NOT NULL REFERENCES moat_tactic_chips(tactic_id),

  -- Who's suggesting refinement
  proposed_by_type    TEXT CHECK (proposed_by_type IN ('coach', 'student', 'admin')) NOT NULL,
  proposed_by_id      TEXT NOT NULL,  -- coach_id or student_id

  -- Refinement details
  refinement_type     TEXT CHECK (refinement_type IN ('micro_action_addition', 'outcome_update', 'archetype_expansion', 'prerequisite_clarification', 'version_upgrade')) NOT NULL,
  description         TEXT NOT NULL,
  proposed_changes    JSONB NOT NULL,  -- Structured diff
  rationale           TEXT,

  -- Evidence
  based_on_sessions   TEXT[],          -- Session IDs where this refinement was observed
  student_examples    TEXT[],          -- Student IDs who would benefit

  -- Review process
  status              TEXT CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'implemented')) DEFAULT 'pending',
  reviewed_by         TEXT REFERENCES coaches(coach_id),
  review_notes        TEXT,

  -- Voting (if community-driven)
  upvotes             INT DEFAULT 0,
  downvotes           INT DEFAULT 0,

  created_at          TIMESTAMPTZ DEFAULT now(),
  reviewed_at         TIMESTAMPTZ
);

CREATE INDEX idx_tactic_refinements_tactic ON moat_tactic_refinements(tactic_id);
CREATE INDEX idx_tactic_refinements_status ON moat_tactic_refinements(status);
CREATE INDEX idx_tactic_refinements_proposer ON moat_tactic_refinements(proposed_by_id);
```

---

## Part 3: DS-T2 Universal Success Patterns Schema

### Design Goals
1. **Every student can contribute:** Post-outcome retrospectives
2. **Every coach can submit:** On behalf of successful students
3. **Archetype matching:** Find students "like me" who succeeded
4. **Multi-path success:** Same goal, different tactics
5. **Living knowledge base:** Patterns improve as more data added

```sql
CREATE TABLE moat_student_success_patterns (
  pattern_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution (multi-contributor)
  contributor_type    TEXT CHECK (contributor_type IN ('student', 'coach', 'admin', 'automated')) NOT NULL,
  contributor_id      TEXT NOT NULL,  -- student_id or coach_id
  student_id          TEXT REFERENCES students(student_id),  -- Subject of pattern (may differ from contributor)
  coach_id            TEXT REFERENCES coaches(coach_id),     -- Coach who guided this journey

  -- Pattern metadata
  title               TEXT NOT NULL,
  pattern_slug        TEXT UNIQUE NOT NULL,
  outcome_category    TEXT NOT NULL,  -- 'national_award', 'college_admit', 'ec_growth', 'test_improvement'

  -- Student archetype (for matching)
  student_archetype   JSONB NOT NULL,  -- {demographics, academic_profile, starting_stats}
  archetype_tags      TEXT[],          -- ['first-gen', 'STEM', 'public-hs', 'low-income']

  -- Journey timeline
  start_date          DATE,
  breakthrough_date   DATE,
  outcome_date        DATE NOT NULL,
  total_duration_days INT GENERATED ALWAYS AS (outcome_date - start_date) STORED,

  -- Starting state (multi-dimensional)
  starting_stats      JSONB NOT NULL,  -- {gpa, test_scores, ecs, awards, time_management}
  barriers_faced      TEXT[],
  initial_challenges  TEXT,

  -- Tactics applied (linked to tactic_chips)
  tactics_used        TEXT[],          -- Array of tactic_slugs
  tactic_sequence     JSONB,           -- {week1: ['168-hour'], week5: ['parent-story']}
  most_impactful      TEXT[],          -- Top 3 tactics that drove success

  -- Breakthrough moments
  key_turning_points  JSONB,           -- [{date, week, moment, tactic_applied, impact}]
  what_clicked        TEXT,

  -- Outcomes (specific + measurable)
  final_outcomes      JSONB NOT NULL,  -- {award_won, colleges_accepted, metrics_improved}
  measurable_results  JSONB,           -- {sat_gain: 190, gpa_lift: 0.3, ec_users: 100}
  proof_type          TEXT[],          -- ['award_email', 'college_acceptance', 'test_score']
  proof_links         TEXT[],

  -- Meta-insights (contributor's reflection)
  what_worked         TEXT NOT NULL,
  what_was_hard       TEXT,
  what_would_change   TEXT,
  advice_to_similar   TEXT NOT NULL,

  -- Quality & validation
  data_completeness   NUMERIC,         -- How much of journey is documented
  validation_status   TEXT CHECK (validation_status IN ('pending', 'verified', 'featured', 'disputed')) DEFAULT 'pending',
  validated_by        TEXT REFERENCES coaches(coach_id),
  quality_score       NUMERIC CHECK (quality_score BETWEEN 0 AND 1),

  -- Usage & engagement (network effects)
  times_shown         INT DEFAULT 0,
  helpful_votes       INT DEFAULT 0,
  unhelpful_votes     INT DEFAULT 0,
  comments_count      INT DEFAULT 0,
  inspired_students   TEXT[],          -- Student IDs who applied this pattern

  -- Related patterns
  similar_patterns    TEXT[],          -- Other pattern_slugs
  contrasting_paths   TEXT[],          -- Different tactics, same outcome

  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  last_viewed_at      TIMESTAMPTZ,

  -- Full-text search
  search_vector       tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(what_worked, '') || ' ' || coalesce(advice_to_similar, ''))
  ) STORED
);

-- Indexes for archetype matching and search
CREATE INDEX idx_success_patterns_contributor ON moat_student_success_patterns(contributor_id);
CREATE INDEX idx_success_patterns_student ON moat_student_success_patterns(student_id);
CREATE INDEX idx_success_patterns_coach ON moat_student_success_patterns(coach_id);
CREATE INDEX idx_success_patterns_outcome_cat ON moat_student_success_patterns(outcome_category);
CREATE INDEX idx_success_patterns_archetype_tags ON moat_student_success_patterns USING GIN(archetype_tags);
CREATE INDEX idx_success_patterns_tactics ON moat_student_success_patterns USING GIN(tactics_used);
CREATE INDEX idx_success_patterns_quality ON moat_student_success_patterns(quality_score DESC) WHERE validation_status = 'verified';
CREATE INDEX idx_success_patterns_helpful ON moat_student_success_patterns((helpful_votes - unhelpful_votes) DESC);
CREATE INDEX idx_success_patterns_search ON moat_student_success_patterns USING GIN(search_vector);
```

### Pattern Comments (Community Engagement)

```sql
CREATE TABLE moat_pattern_comments (
  comment_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pattern_id          UUID NOT NULL REFERENCES moat_student_success_patterns(pattern_id) ON DELETE CASCADE,

  -- Who's commenting
  commenter_type      TEXT CHECK (commenter_type IN ('student', 'coach')) NOT NULL,
  commenter_id        TEXT NOT NULL,

  -- Comment content
  comment_text        TEXT NOT NULL,
  comment_type        TEXT CHECK (comment_type IN ('question', 'insight', 'application_report', 'suggestion')),

  -- If application report
  applied_pattern     BOOLEAN DEFAULT false,
  outcome_achieved    BOOLEAN,
  adaptations_made    TEXT,

  -- Engagement
  helpful_votes       INT DEFAULT 0,

  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pattern_comments_pattern ON moat_pattern_comments(pattern_id);
CREATE INDEX idx_pattern_comments_commenter ON moat_pattern_comments(commenter_id);
```

---

## Part 4: Contributor Gamification (Universal)

### Purpose: Incentivize contributions from ALL coaches and students

```sql
CREATE TABLE moat_contributor_stats (
  contributor_id      TEXT PRIMARY KEY,  -- coach_id or student_id
  contributor_type    TEXT CHECK (contributor_type IN ('coach', 'student')) NOT NULL,

  -- Contribution counts
  tactics_created     INT DEFAULT 0,
  patterns_shared     INT DEFAULT 0,
  refinements_proposed INT DEFAULT 0,
  refinements_accepted INT DEFAULT 0,
  comments_posted     INT DEFAULT 0,

  -- Impact metrics
  tactics_retrieved   INT DEFAULT 0,     -- How many times their tactics were shown
  patterns_viewed     INT DEFAULT 0,     -- How many times their patterns were viewed
  helpful_votes       INT DEFAULT 0,     -- Across all contributions
  students_helped     INT DEFAULT 0,     -- Unique student_ids who applied their tactics/patterns
  success_influenced  INT DEFAULT 0,     -- Students who succeeded using their contributions

  -- Reputation
  reputation_score    INT DEFAULT 0,     -- Calculated from impact metrics
  contributor_tier    TEXT CHECK (contributor_tier IN ('bronze', 'silver', 'gold', 'platinum', 'legend')) DEFAULT 'bronze',

  -- Badges earned
  badges_earned       TEXT[],

  -- Streaks & milestones
  contribution_streak INT DEFAULT 0,     -- Consecutive weeks with contributions
  longest_streak      INT DEFAULT 0,
  last_contribution   DATE,

  -- Timestamps
  first_contribution  TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contributor_stats_type ON moat_contributor_stats(contributor_type);
CREATE INDEX idx_contributor_stats_tier ON moat_contributor_stats(contributor_tier);
CREATE INDEX idx_contributor_stats_reputation ON moat_contributor_stats(reputation_score DESC);

-- Trigger to update stats on new contributions
CREATE OR REPLACE FUNCTION update_contributor_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO moat_contributor_stats (contributor_id, contributor_type)
  VALUES (NEW.created_by_coach, 'coach')
  ON CONFLICT (contributor_id) DO UPDATE
  SET tactics_created = moat_contributor_stats.tactics_created + 1,
      last_contribution = CURRENT_DATE,
      updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tactic_chip_contribution_trigger
AFTER INSERT ON moat_tactic_chips
FOR EACH ROW EXECUTE FUNCTION update_contributor_stats();
```

### Badges System (Universal Achievements)

```sql
CREATE TABLE moat_badges (
  badge_id            TEXT PRIMARY KEY,
  badge_name          TEXT NOT NULL,
  badge_description   TEXT,
  badge_icon          TEXT,  -- URL or emoji

  -- Criteria (JSONB for flexibility)
  unlock_criteria     JSONB NOT NULL,  -- {type: 'tactics_created', threshold: 5}
  badge_tier          TEXT CHECK (badge_tier IN ('bronze', 'silver', 'gold', 'platinum')),

  -- Stats
  times_awarded       INT DEFAULT 0,

  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Seed badges
INSERT INTO moat_badges (badge_id, badge_name, badge_description, unlock_criteria, badge_tier) VALUES
('first-tactic', 'First Tactic', 'Created your first tactic', '{"type": "tactics_created", "threshold": 1}', 'bronze'),
('tactic-master', 'Tactic Master', 'Created 10+ tactics', '{"type": "tactics_created", "threshold": 10}', 'silver'),
('pattern-pioneer', 'Pattern Pioneer', 'Shared your first success pattern', '{"type": "patterns_shared", "threshold": 1}', 'bronze'),
('ncwit-winner', 'NCWIT National Winner', 'Won NCWIT National Award', '{"type": "outcome_achieved", "value": "NCWIT National"}', 'gold'),
('student-helper', 'Student Helper', 'Your tactics helped 5+ students', '{"type": "students_helped", "threshold": 5}', 'silver'),
('top-contributor', 'Top Contributor', 'Reached platinum tier', '{"type": "contributor_tier", "value": "platinum"}', 'platinum');
```

---

## Part 5: Universal Query Patterns

### Finding Tactics for Any Student (Multi-Coach Data)

```sql
-- Example: Find tactics for a first-gen immigrant STEM student struggling with time management
-- This works whether tactics came from Jenny, Sarah, or any coach

SELECT
  tc.tactic_name,
  tc.core_principle,
  tc.created_by_coach,
  c.display_name as coach_name,
  tc.success_rate,
  tc.quality_score,
  tc.times_succeeded || '/' || tc.times_applied as track_record
FROM moat_tactic_chips tc
JOIN coaches c ON tc.created_by_coach = c.coach_id
WHERE tc.validation_status = 'approved'
  AND 'Time_Management' = ANY(tc.tags)
  AND 'first-gen-immigrant' = ANY(tc.student_archetypes)
  AND 'time-crisis' = ANY(tc.barriers_addressed)
ORDER BY tc.success_rate DESC NULLS LAST, tc.quality_score DESC
LIMIT 10;
```

### Finding Success Patterns from Similar Students (Multi-Student Data)

```sql
-- Example: Find patterns from students like current student
-- Works across all students in platform, not just Huda

SELECT
  sp.title,
  sp.contributor_id,
  sp.student_id,
  sp.coach_id,
  sp.outcome_category,
  sp.final_outcomes,
  sp.what_worked,
  sp.advice_to_similar,
  sp.helpful_votes,
  c.display_name as coach_name
FROM moat_student_success_patterns sp
LEFT JOIN coaches c ON sp.coach_id = c.coach_id
WHERE sp.validation_status = 'verified'
  AND 'first-gen' = ANY(sp.archetype_tags)
  AND 'STEM' = ANY(sp.archetype_tags)
  AND sp.outcome_category = 'national_award'
ORDER BY (sp.helpful_votes - sp.unhelpful_votes) DESC, sp.quality_score DESC
LIMIT 10;
```

### Leaderboard (All Contributors)

```sql
-- Top contributors across coaches and students
SELECT
  cs.contributor_id,
  cs.contributor_type,
  CASE
    WHEN cs.contributor_type = 'coach' THEN c.display_name
    WHEN cs.contributor_type = 'student' THEN s.student_name
  END as name,
  cs.reputation_score,
  cs.contributor_tier,
  cs.tactics_created,
  cs.patterns_shared,
  cs.students_helped,
  cs.badges_earned
FROM moat_contributor_stats cs
LEFT JOIN coaches c ON cs.contributor_type = 'coach' AND cs.contributor_id = c.coach_id
LEFT JOIN students s ON cs.contributor_type = 'student' AND cs.contributor_id = s.student_id
ORDER BY cs.reputation_score DESC
LIMIT 50;
```

---

## Part 6: Migration from Jenny-Huda Intel Chips

### Automated Import Script (Preserves Quality, Scales to Any Coach)

```sql
-- Transform existing intel chips into universal schema
-- This script can be reused for ANY coach's intel chips

INSERT INTO moat_tactic_chips (
  tactic_slug,
  tactic_name,
  created_by_coach,
  original_coach,
  source_type,
  source_reference,
  discovery_date,
  tactic_category,
  domain,
  tags,
  student_archetypes,
  barriers_addressed,
  core_principle,
  description,
  micro_actions,
  quality_score,
  confidence_score,
  validation_status,
  validated_by
)
SELECT
  lower(regexp_replace(chip_data->>'tactic_name', '[^a-zA-Z0-9]+', '-', 'g')) as tactic_slug,
  chip_data->>'tactic_name' as tactic_name,
  'jenny-duan' as created_by_coach,  -- For Jenny's chips
  'jenny-duan' as original_coach,
  'automated_extraction' as source_type,
  chip_id as source_reference,
  (metadata->>'date')::date as discovery_date,
  chip_data->>'category' as tactic_category,
  chip_data->>'domain' as domain,
  ARRAY['huda-journey', 'proven'] as tags,  -- Initial tags
  ARRAY['first-gen-immigrant', 'STEM-female', 'public-hs'] as student_archetypes,
  chip_data->'barriers' as barriers_addressed,
  chip_data->>'core_principle' as core_principle,
  content as description,
  chip_data->'micro_actions' as micro_actions,
  (metadata->>'quality_score')::numeric as quality_score,
  (metadata->>'confidence_score')::numeric as confidence_score,
  'approved' as validation_status,  -- Pre-approved from Jenny
  'jenny-duan' as validated_by
FROM (
  -- Parse intel chips JSON files
  SELECT
    chip_id,
    type,
    metadata,
    content,
    jsonb_build_object(
      'tactic_name', regexp_replace(content, '^(.*?):.*', '\1'),
      'core_principle', insight_vector,
      'category', CASE
        WHEN type = 'Framework_Chip' THEN 'Systems_Architecture'
        WHEN type = 'Tactic_Chip' THEN 'Execution_Planning'
        WHEN type = 'Silver_Bullet_Chip' THEN 'Breakthrough_Techniques'
        ELSE 'General'
      END,
      'domain', metadata->>'phase_enum'
    ) as chip_data
  FROM jsonb_to_recordset(
    -- Load from file: data/kb_intel_chips/chips/w003_intel_chips_batch.json
    pg_read_file('/path/to/w003_intel_chips_batch.json')::jsonb
  ) AS x(chip_id text, type text, metadata jsonb, content text, insight_vector text)
  WHERE type IN ('Framework_Chip', 'Tactic_Chip', 'Silver_Bullet_Chip')
) intel_chips
ON CONFLICT (tactic_slug, version) DO NOTHING;

-- This same script works for coach-sarah's chips, coach-xyz's chips, etc.
-- Just change 'jenny-duan' to the appropriate coach_id
```

---

## Part 7: API Design (Universal, Not Hardcoded)

### Contribution Endpoints (Open to All)

```typescript
// ANY coach can contribute
POST /api/moat/tactics/contribute
{
  "coach_id": "jenny-duan" | "sarah-smith" | ...,  // NOT hardcoded
  "tactic_name": "New Framework Name",
  "category": "Essay_Strategy",
  // ... rest of tactic data
}

// ANY student can contribute success pattern
POST /api/moat/patterns/contribute
{
  "contributor_type": "student",
  "student_id": "huda-2025" | "john-2026" | ...,  // NOT hardcoded
  "coach_id": "jenny-duan",  // Who helped them
  "outcome_category": "national_award",
  // ... rest of pattern data
}
```

### Retrieval Endpoints (Work Across All Data)

```typescript
// Find tactics regardless of which coach created them
GET /api/moat/tactics/search?category=Time_Management&archetype=first-gen&barrier=time-crisis
// Returns tactics from Jenny, Sarah, any coach with matching criteria

// Find success patterns from any student
GET /api/moat/patterns/similar?student_id=current-student-123
// Matches archetypes, returns patterns from Huda, others, ranked by relevance

// Leaderboard across all contributors
GET /api/moat/contributors/leaderboard?type=all
// Shows coaches AND students, ranked by impact
```

---

## Conclusion

### What This Schema Achieves

✅ **Bootstrapped with Quality:** Jenny-Huda data as proven baseline
✅ **Scales Infinitely:** Add coach_id='new-coach', it just works
✅ **Student Contributors:** Every student can share their success pattern
✅ **Network Effects:** More contributions → smarter platform → more value
✅ **No Hardcoding:** Zero "if jenny then..." logic in code
✅ **Quality Preserved:** Validation, scoring, tiers maintain excellence
✅ **Future-Proof:** Adding coach #100 or student #10,000 requires zero schema changes

### Implementation Timeline

**Week 12 (Now):**
- ✅ Create universal schemas (coaches, tactics, patterns, contributors)
- ✅ Migrate Jenny-Huda intel chips (proof of concept)
- ✅ Build retrieval tools (multi-coach aware)

**Week 13:**
- ✅ Build contribution API (open to any coach/student)
- ✅ Integrate into agents (works with any data source)

**Week 14-15:**
- ✅ Build contributor UI (coach + student modes)
- ✅ Add gamification (badges, leaderboards)
- ✅ Enable first external coach/student contributions

**This is the v1.0 way:** Excellence from Jenny-Huda, architecture for infinite scale. 🚀
