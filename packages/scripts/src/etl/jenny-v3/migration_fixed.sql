-- Jenny AI v3 - Fixed Migration
-- Clean version without DO blocks

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop existing types if needed (be careful in production)
DROP TYPE IF EXISTS lifecycle_status CASCADE;
DROP TYPE IF EXISTS lifecycle_domain CASCADE;
DROP TYPE IF EXISTS outcome_type CASCADE;
DROP TYPE IF EXISTS admission_result CASCADE;
DROP TYPE IF EXISTS momentum_status CASCADE;
DROP TYPE IF EXISTS fact_confidence CASCADE;

-- 2. Create enum types
CREATE TYPE lifecycle_status AS ENUM ('planned','in_progress','submitted','outcome','archived');
CREATE TYPE lifecycle_domain AS ENUM ('application','award','test','essay','recommender','ec_portfolio','aid_css_fafsa','ops_policy');
CREATE TYPE outcome_type AS ENUM ('admission','plan','tracking','momentum','artifact','draft','submission','result','milestone','ops','policy','registry','content_bank','communication','planning','asset','proof','essay','narrative','applications','achievement','portfolio','recommendation','distribution','evidence');
CREATE TYPE admission_result AS ENUM ('accepted','waitlisted','rejected','deferred','withdrawn','unknown');
CREATE TYPE momentum_status AS ENUM ('booked','sent','received','logged','won');
CREATE TYPE fact_confidence AS ENUM ('high','medium','low');

-- 3. Reference tables
CREATE TABLE IF NOT EXISTS fact_kinds (
  kind TEXT PRIMARY KEY,
  description TEXT
);

CREATE TABLE IF NOT EXISTS tactic_kinds (
  name TEXT PRIMARY KEY,
  description TEXT
);

CREATE TABLE IF NOT EXISTS framework_kinds (
  name TEXT PRIMARY KEY,
  description TEXT
);

-- 4. Core tables
CREATE TABLE IF NOT EXISTS students (
  student_id TEXT PRIMARY KEY,
  full_name TEXT,
  grad_year INT,
  created_ts timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('transcript','exec_doc','imessage','artifact','submission','email','other')),
  title TEXT NOT NULL,
  date_start timestamptz,
  date_end timestamptz,
  drive_link TEXT,
  local_name TEXT,
  notes TEXT,
  created_ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sources_student ON sources(student_id);

CREATE TABLE IF NOT EXISTS jtbd (
  jtbd_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  jtbd_title TEXT NOT NULL,
  phase TEXT,
  date_start timestamptz,
  date_end timestamptz,
  domain lifecycle_domain,
  synopsis TEXT,
  created_ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jtbd_student ON jtbd(student_id);

CREATE TABLE IF NOT EXISTS lifecycle_items (
  item_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  jtbd_id TEXT REFERENCES jtbd(jtbd_id) ON DELETE SET NULL,
  domain lifecycle_domain NOT NULL,
  status lifecycle_status NOT NULL,
  school TEXT,
  submitted_at timestamptz,
  outcome_date timestamptz,
  created_ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_student ON lifecycle_items(student_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_jtbd ON lifecycle_items(jtbd_id);

CREATE TABLE IF NOT EXISTS vital_facts (
  fact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  kind TEXT NOT NULL REFERENCES fact_kinds(kind),
  value TEXT NOT NULL,
  unit TEXT,
  fact_date timestamptz NOT NULL,
  confidence fact_confidence NOT NULL DEFAULT 'high',
  source_id TEXT NOT NULL REFERENCES sources(source_id) ON DELETE RESTRICT,
  created_ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_facts_student_date ON vital_facts(student_id, fact_date DESC);
CREATE INDEX IF NOT EXISTS idx_facts_kind ON vital_facts(kind);

CREATE TABLE IF NOT EXISTS interactions (
  snippet_id TEXT PRIMARY KEY,
  jtbd_id TEXT NOT NULL REFERENCES jtbd(jtbd_id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,
  channel TEXT NOT NULL,
  user_ask TEXT,
  jenny_reply TEXT,
  tactic_name TEXT REFERENCES tactic_kinds(name),
  framework TEXT REFERENCES framework_kinds(name),
  tags TEXT[],
  source_id TEXT REFERENCES sources(source_id) ON DELETE SET NULL,
  confidence fact_confidence,
  excluded_from_tactic_scoring BOOLEAN NOT NULL DEFAULT FALSE,
  created_ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interactions_student_date ON interactions(student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_jtbd ON interactions(jtbd_id);
CREATE INDEX IF NOT EXISTS idx_interactions_tactic ON interactions(tactic_name);

CREATE TABLE IF NOT EXISTS outcomes (
  outcome_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jtbd_id TEXT REFERENCES jtbd(jtbd_id) ON DELETE SET NULL,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  type outcome_type NOT NULL,
  admission_result admission_result,
  lifecycle_item_id TEXT REFERENCES lifecycle_items(item_id) ON DELETE SET NULL,
  details_json JSONB,
  occurred_at timestamptz,
  source_id TEXT REFERENCES sources(source_id) ON DELETE SET NULL,
  created_ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outcomes_student_date ON outcomes(student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_jtbd ON outcomes(jtbd_id);

CREATE TABLE IF NOT EXISTS evidence_links (
  evidence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id TEXT NOT NULL REFERENCES sources(source_id) ON DELETE RESTRICT,
  snippet_id TEXT,
  offset_start INT,
  offset_end INT,
  quote TEXT,
  created_ts timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence_links(source_id);

-- 5. Seed reference data
INSERT INTO fact_kinds(kind, description) VALUES
 ('sat_total_score','Total SAT score'),
 ('sat_math','SAT Math section'),
 ('sat_ebrw','SAT EBRW section'),
 ('act_composite','ACT composite'),
 ('ap_score','AP exam score'),
 ('psat_selection_index','PSAT/NMSQT selection index'),
 ('gpa_weighted','Weighted GPA'),
 ('gpa_unweighted','Unweighted GPA'),
 ('class_rank_percentile','Class rank percentile'),
 ('uc_app_submitted','University of California application submitted'),
 ('uc_app_opened','University of California application opened'),
 ('commonapp_submitted','Common App submitted'),
 ('coalition_submitted','Coalition App submitted'),
 ('portfolio_demo_count','Portfolio demo count'),
 ('club_leadership_count','Leadership roles count'),
 ('volunteer_hours','Volunteer hours'),
 ('award_won','Award won marker'),
 ('award_level','Award level'),
 ('css_profile_submitted','CSS Profile submitted'),
 ('fafsa_submitted','FAFSA submitted'),
 ('lor_requested','Letter of recommendation requested'),
 ('lor_received','Letter of recommendation received'),
 ('essay_finalized','Essay finalized'),
 ('recommendation_quality_score','Internal quality score'),
 ('coach_session_count','Coach session count')
ON CONFLICT (kind) DO NOTHING;

INSERT INTO tactic_kinds(name, description) VALUES
 ('spaced_practice','Scheduling spaced repetitions'),
 ('deliberate_practice','Targeted deliberate drills'),
 ('pomodoro','Time‑boxed focus sprints'),
 ('micro_deadlines','Chunking outcomes into micro deadlines'),
 ('rubric_reverse_engineering','Infer rubric and work backward'),
 ('socratic_prompting','Guided questioning'),
 ('cold_email_outreach','Cold outreach to mentors/orgs'),
 ('mentor_outreach','Warm outreach and followup'),
 ('portfolio_slices','Atomic portfolio artifacts'),
 ('checklist_to_system','Convert checklist into system'),
 ('goal_backcasting','Define goal then backcast'),
 ('gap_drilldown','Find & drill gaps'),
 ('red_team_review','Critical red‑team review'),
 ('peer_review_circle','Peer feedback loop'),
 ('story_bank_build','Capture story bank entries'),
 ('coach_sync','Coach sync session'),
 ('parent_sync','Parent sync session'),
 ('weekly_retro','Weekly retrospective'),
 ('mock_interview','Mock interview practice'),
 ('essay_mini_outline','Mini outline generation')
ON CONFLICT (name) DO NOTHING;

INSERT INTO framework_kinds(name, description) VALUES
 ('SMART','Specific, Measurable, Achievable, Relevant, Time‑bound'),
 ('OKR','Objectives and Key Results'),
 ('WOOP','Wish, Outcome, Obstacle, Plan'),
 ('Feynman','Teach it simply'),
 ('GTD','Getting Things Done'),
 ('AtomicHabits','Cue‑Routine‑Reward loops'),
 ('ICE','Impact, Confidence, Effort'),
 ('RICE','Reach, Impact, Confidence, Effort'),
 ('4DX','4 Disciplines of Execution'),
 ('STAR','Situation, Task, Action, Result'),
 ('Cialdini','Influence principles')
ON CONFLICT (name) DO NOTHING;