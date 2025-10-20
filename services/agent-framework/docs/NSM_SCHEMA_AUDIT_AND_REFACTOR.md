# NSM Schema Audit & Refactoring Plan

**Date:** 2025-10-17
**Issue:** NSM tracking created duplicate tables that ignore existing schema
**Solution:** Leverage existing schema, add only what's missing

---

## 🚨 Problem: Duplicate Data Structures

### What I Created (WRONG - Duplicates Existing Schema)

**v15_005_nsm_tracking_infrastructure.sql created 11 NEW tables:**

1. `nsm_ivyscore_tracking` - **DUPLICATE** of `feature_snapshots` + `feature_snapshot_values`
2. `nsm_academic_vitals` - **DUPLICATE** of `kb_items` (Test items) + `feature_defs` (sat_total, gpa, etc.)
3. `nsm_recognition_vitals` - **DUPLICATE** of `kb_items` (Award_Competition items)
4. `nsm_leadership_vitals` - **DUPLICATE** of `kb_items` (EC items with leadership roles)
5. `nsm_service_vitals` - **DUPLICATE** of `kb_items` (EC items with volunteer hours)
6. `nsm_artifacts_vitals` - **DUPLICATE** of `kb_items` (EC_Project, Research items)
7. `nsm_program_vitals` - **DUPLICATE** of `moat_summer_programs` + `kb_items` (Program items)
8. `nsm_essay_vitals` - **NO DUPLICATE** (essays not in existing schema)
9. `nsm_college_list_vitals` - **DUPLICATE** of `college_list`
10. `nsm_admission_vitals` - **PARTIAL DUPLICATE** of `kb_items` (Application items)
11. `nsm_lagging_outcomes` - **DUPLICATE** of `college_list` (decision_result) + `scholarships`

**Result:** 9/11 tables are duplicates or redundant!

---

## ✅ What Already Exists (USE THIS)

### 1. Core Data Tables

#### `kb_items` - Universal Ledger (ALL Activities)

**Schema:**
```sql
CREATE TABLE kb_items (
  item_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  item_type TEXT NOT NULL,         -- 'Award_Competition' | 'EC_Project' | 'EC_Club' | 'Test' | 'Application' | 'Decision'
  subtype TEXT,                    -- 'SAT' | 'ACT' | 'National' | 'Regional'
  title_name TEXT NOT NULL,
  tier1_state TEXT NOT NULL,       -- 'Planned' | 'In Transit' | 'Submitted' | 'Outcome' | 'Archived'
  tier2_substate TEXT,
  status_detail TEXT,              -- 'Winner' | 'Finalist' | 'Honorable Mention'
  key_metric_type TEXT,            -- 'score_total' | 'placement' | 'hours_per_week'
  key_metric_value TEXT,
  key_metric_unit TEXT,
  deadline_date DATE,
  event_date DATE,
  submit_date DATE,
  outcome_date DATE,
  owner TEXT,
  evidence_links TEXT[],
  source_ref TEXT NOT NULL,
  created_ts TIMESTAMPTZ,
  updated_ts TIMESTAMPTZ
);
```

**What it covers:**
- ✅ **Awards** (item_type = 'Award_Competition') → NSM Recognition score
- ✅ **ECs** (item_type = 'EC_Project' | 'EC_Club' | 'EC_Service') → NSM Leadership + Service scores
- ✅ **Tests** (item_type = 'Test', subtype = 'SAT' | 'ACT') → NSM Academics score
- ✅ **Applications** (item_type = 'Application') → NSM Admission execution
- ✅ **Decisions** (item_type = 'Decision') → NSM Lagging outcomes

**Existing Views:**
- `v_awards_initial` - Planned awards
- `v_awards_won` - Won awards (tier1_state = 'Outcome')
- `v_awards_timeline` - All award state changes
- `v_ecs_timeline` - All EC activity
- `v_testing_timeline` - All test attempts (SAT, ACT)
- `v_applications_timeline` - All college applications
- `v_decisions_timeline` - All college decisions

#### `feature_defs` + `feature_snapshots` - IvyScore/Readiness System

**Schema:**
```sql
CREATE TABLE feature_defs (
  feature_id TEXT PRIMARY KEY,     -- 'sat_total', 'ec_leadership_count', 'award_national_count', 'gpa_weighted'
  domain TEXT NOT NULL,            -- 'testing' | 'academics' | 'ecs' | 'awards' | 'narrative'
  label TEXT NOT NULL,
  scale_max NUMERIC DEFAULT 100
);

CREATE TABLE feature_snapshots (
  snapshot_id UUID PRIMARY KEY,
  student_id TEXT NOT NULL,
  as_of DATE NOT NULL,
  rubric_id TEXT NOT NULL,
  engine TEXT DEFAULT 'sql_v1',
  UNIQUE(student_id, rubric_id, as_of, engine)
);

CREATE TABLE feature_snapshot_values (
  snapshot_id UUID NOT NULL,
  feature_id TEXT NOT NULL,
  value_norm NUMERIC NOT NULL,     -- 0..100 normalized score
  evidence JSONB DEFAULT '{}'::jsonb,  -- {"kb_item_ids": [...], "count": N}
  PRIMARY KEY (snapshot_id, feature_id)
);
```

**What it covers:**
- ✅ **IvyScore/Readiness Tracking** → NSM IvyScore trajectory
- ✅ **Feature Snapshots** → Monthly snapshots (as_of date)
- ✅ **Evidence Trail** → Which kb_items contributed to score
- ✅ **Rubric Mapping** → Factor → Feature → kb_items

**Existing Functions:**
- `get_kb_items_by_type_state(student_id, item_type, tier1_state)` → Get awards/ECs/tests by state
- `get_kb_items_progression(student_id, item_type)` → Get timeline of item state changes

#### `college_list` - College Applications & Decisions

**Schema:**
```sql
CREATE TABLE college_list (
  college_id SERIAL PRIMARY KEY,
  student_id TEXT,
  college_name TEXT NOT NULL,
  bucket_category TEXT,            -- 'Reach' | 'Match' | 'Safety' | 'Wild Card'
  decision_plan TEXT,              -- 'EA' | 'ED' | 'RD' | 'REA'
  decision_result TEXT,            -- 'Accepted' | 'Rejected' | 'Waitlisted' | 'Deferred'
  program TEXT,                    -- Major/program applied to
  supplements TEXT,                -- Essay supplements
  location TEXT,
  acceptance_rate NUMERIC,
  interview_status TEXT,
  ivyready_score_at_submit NUMERIC  -- Snapshot of readiness at submission time
);
```

**What it covers:**
- ✅ **College List Optimization** → NSM College List vitals (reach/match/safety counts)
- ✅ **Decision Results** → NSM Lagging outcomes (acceptances by tier)
- ✅ **Readiness at Submit** → Snapshot of IvyScore at application time

#### `scholarships` - Scholarship Applications & Awards

**Schema:**
```sql
CREATE TABLE scholarships (
  scholarship_id SERIAL PRIMARY KEY,
  student_id TEXT,
  scholarship_name TEXT NOT NULL,
  sponsor_org TEXT,
  amount_usd NUMERIC,
  application_status TEXT,         -- 'Applied' | 'Accepted' | 'Rejected' | 'Pending'
  decision_date DATE,
  notes TEXT
);
```

**What it covers:**
- ✅ **Scholarship $ Tracking** → NSM Lagging outcomes (total scholarship $ awarded)

#### `moat_summer_programs` - Prestigious Summer Programs

**Schema:**
```sql
CREATE TABLE moat_summer_programs (
  program_id SERIAL PRIMARY KEY,
  program_name TEXT NOT NULL,
  acceptance_rate NUMERIC,
  prestige_tier TEXT,              -- 'Tier 1' (RSI, TASP) | 'Tier 2' | 'Tier 3'
  ivyscore_impact INTEGER,         -- +5, +8, etc.
  application_deadline DATE
);
```

**What it covers:**
- ✅ **Summer Program Database** → NSM Program vitals (RSI, TASP, SSP)
- ✅ **IvyScore Impact** → Pre-calculated impact values

---

## 📊 NSM Metrics → Existing Schema Mapping

### Lagging Indicators (Ultimate NSM)

| NSM Metric | Existing Table(s) | Query |
|------------|-------------------|-------|
| **Tier 1/2/3 Acceptances** | `college_list` | `SELECT COUNT(*) FROM college_list WHERE student_id = ? AND decision_result = 'Accepted' AND bucket_category = 'Reach'` |
| **Total Scholarship $** | `scholarships` | `SELECT SUM(amount_usd) FROM scholarships WHERE student_id = ? AND application_status = 'Accepted'` |
| **Tier Improvement** | `college_list` | Compare `bucket_category` (initial) vs `decision_result` (final) |

### Leading Indicators

#### 1. IvyScore Trajectory (Overall)

| NSM Metric | Existing Table(s) | Feature ID | Query |
|------------|-------------------|------------|-------|
| **Total IvyScore** | `feature_snapshots` + `feature_snapshot_values` | (sum of all features) | `SELECT SUM(value_norm) FROM feature_snapshot_values WHERE snapshot_id = ?` |
| **Academics Score** | `feature_snapshot_values` | `sat_total`, `gpa_weighted`, `ap_count` | `SELECT SUM(value_norm) FROM feature_snapshot_values WHERE feature_id IN ('sat_total', 'gpa_weighted', 'ap_count')` |
| **Recognition Score** | `feature_snapshot_values` | `award_national_count`, `award_regional_count` | `SELECT SUM(value_norm) FROM feature_snapshot_values WHERE feature_id LIKE 'award_%'` |
| **Leadership Score** | `feature_snapshot_values` | `ec_leadership_count`, `ec_officer_count` | `SELECT SUM(value_norm) FROM feature_snapshot_values WHERE feature_id LIKE 'ec_leadership_%'` |
| **Service Score** | `feature_snapshot_values` | `ec_volunteer_hours`, `ec_community_impact` | `SELECT SUM(value_norm) FROM feature_snapshot_values WHERE feature_id LIKE 'ec_service_%'` |
| **Artifacts Score** | `feature_snapshot_values` | `ec_research_count`, `ec_portfolio_count` | `SELECT SUM(value_norm) FROM feature_snapshot_values WHERE feature_id LIKE 'ec_artifact_%'` |

#### 2. Academic Vitals

| NSM Metric | Existing Table(s) | Item Type / Feature ID | Query |
|------------|-------------------|------------------------|-------|
| **SAT Score** | `kb_items` | item_type = 'Test', subtype = 'SAT' | `SELECT key_metric_value FROM kb_items WHERE item_type = 'Test' AND subtype = 'SAT' ORDER BY event_date DESC LIMIT 1` |
| **GPA Weighted** | `feature_defs` → `sat_total` | feature_id = 'gpa_weighted' | `SELECT value_norm FROM feature_snapshot_values WHERE feature_id = 'gpa_weighted'` |
| **AP Courses Taken** | `feature_defs` | feature_id = 'ap_count' | `SELECT value_norm FROM feature_snapshot_values WHERE feature_id = 'ap_count'` |
| **Course Rigor** | `feature_defs` | feature_id = 'course_rigor' | `SELECT value_norm FROM feature_snapshot_values WHERE feature_id = 'course_rigor'` |

#### 3. Recognition Vitals (Awards)

| NSM Metric | Existing Table(s) | Item Type / Query |
|------------|-------------------|-------------------|
| **National Awards Won** | `kb_items` | `SELECT COUNT(*) FROM kb_items WHERE item_type = 'Award_Competition' AND subtype = 'National' AND tier1_state = 'Outcome'` |
| **Regional Awards Won** | `kb_items` | `SELECT COUNT(*) FROM kb_items WHERE item_type = 'Award_Competition' AND subtype = 'Regional' AND tier1_state = 'Outcome'` |
| **Award Applications** | `kb_items` | `SELECT COUNT(*) FROM kb_items WHERE item_type = 'Award_Competition' AND tier1_state IN ('In Transit', 'Submitted')` |
| **Award Win Rate** | `kb_items` | `(COUNT where tier1_state = 'Outcome') / (COUNT where tier1_state IN ('Submitted', 'Outcome'))` |

#### 4. Leadership Vitals (ECs)

| NSM Metric | Existing Table(s) | Item Type / Attribute |
|------------|-------------------|----------------------|
| **Officer Positions** | `kb_items` | `SELECT COUNT(*) FROM kb_items WHERE item_type LIKE 'EC_%' AND status_detail LIKE '%President%' OR '%Officer%'` |
| **Club Founding** | `kb_items` | `SELECT COUNT(*) FROM kb_items WHERE item_type = 'EC_Club' AND status_detail LIKE '%Founder%'` |
| **Leadership Hours** | `kb_items` | `SELECT SUM(key_metric_value::int) FROM kb_items WHERE item_type LIKE 'EC_%' AND key_metric_type = 'hours_per_week' AND status_detail LIKE '%Lead%'` |

#### 5. Service Vitals (Volunteer ECs)

| NSM Metric | Existing Table(s) | Item Type / Attribute |
|------------|-------------------|----------------------|
| **Volunteer Hours** | `kb_items` | `SELECT SUM(key_metric_value::int * 52) FROM kb_items WHERE item_type = 'EC_Service' AND key_metric_type = 'hours_per_week'` |
| **Community Impact** | `kb_items` | `SELECT SUM(key_metric_value::int) FROM kb_items WHERE item_type = 'EC_Service' AND key_metric_type = 'people_impacted'` |

#### 6. Artifacts Vitals (Projects/Research)

| NSM Metric | Existing Table(s) | Item Type / Attribute |
|------------|-------------------|----------------------|
| **Research Papers** | `kb_items` | `SELECT COUNT(*) FROM kb_items WHERE item_type = 'EC_Project' AND subtype = 'Research' AND tier1_state = 'Outcome'` |
| **Portfolio Projects** | `kb_items` | `SELECT COUNT(*) FROM kb_items WHERE item_type = 'EC_Project'` |
| **GitHub Contributions** | `kb_items` | `SELECT SUM(key_metric_value::int) FROM kb_items WHERE item_type = 'EC_Project' AND key_metric_type = 'github_commits'` |

#### 7. Summer Program Vitals

| NSM Metric | Existing Table(s) | Join |
|------------|-------------------|------|
| **Programs Applied** | `kb_items` | `SELECT COUNT(*) FROM kb_items WHERE item_type = 'Program' AND tier1_state IN ('In Transit', 'Submitted')` |
| **Prestigious Accepted** | `kb_items` + `moat_summer_programs` | `SELECT COUNT(*) FROM kb_items ki JOIN moat_summer_programs msp ON ki.title_name = msp.program_name WHERE ki.item_type = 'Program' AND ki.tier1_state = 'Outcome' AND msp.prestige_tier = 'Tier 1'` |

#### 8. College List Vitals

| NSM Metric | Existing Table(s) | Query |
|------------|-------------------|-------|
| **Reach Schools Count** | `college_list` | `SELECT COUNT(*) FROM college_list WHERE bucket_category = 'Reach'` |
| **Match Schools Count** | `college_list` | `SELECT COUNT(*) FROM college_list WHERE bucket_category = 'Match'` |
| **Safety Schools Count** | `college_list` | `SELECT COUNT(*) FROM college_list WHERE bucket_category = 'Safety'` |
| **ED/EA Strategy** | `college_list` | `SELECT COUNT(*) FROM college_list WHERE decision_plan IN ('ED', 'EA', 'REA')` |

#### 9. Admission Execution Vitals

| NSM Metric | Existing Table(s) | Query |
|------------|-------------------|-------|
| **Applications On Time** | `kb_items` + `college_list` | `SELECT COUNT(*) FROM kb_items WHERE item_type = 'Application' AND tier1_state = 'Submitted' AND submit_date <= deadline_date` |
| **Applications Total** | `kb_items` OR `college_list` | `SELECT COUNT(*) FROM college_list` |

---

## 🔧 Refactoring Plan: Delete Duplicates, Add Missing

### Phase 1: DELETE v15_005 (Duplicates)

**Action:** Delete `db/migrations/v15_005_nsm_tracking_infrastructure.sql`

**Why:** 9/11 tables are duplicates. The 2 unique tables (essay_vitals, partial admission_vitals) can be added to existing schema.

### Phase 2: Extend Existing Schema (Add Missing)

**Only these are missing:**

#### Missing 1: Essay Quality Tracking

**Gap:** No table tracks essay drafts, revisions, identity fusion clarity

**Solution:** Add `essay_progress` table

```sql
CREATE TABLE IF NOT EXISTS essay_progress (
  essay_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id),
  essay_type TEXT NOT NULL,        -- 'Common App' | 'Supplemental' | 'UC PIQ'
  college_name TEXT,               -- NULL for Common App
  draft_version INTEGER DEFAULT 1,
  quality_rating TEXT,             -- 'draft' | 'good' | 'exceptional'
  identity_fusion_clarity TEXT,    -- 'weak' | 'moderate' | 'strong'
  word_count INTEGER,
  revision_count INTEGER DEFAULT 0,
  last_revised_date TIMESTAMPTZ,
  created_ts TIMESTAMPTZ DEFAULT NOW()
);
```

#### Missing 2: Admission Execution Checklist

**Gap:** No table tracks recommendation letters, transcripts, fee waivers, interview prep

**Solution:** Add `admission_checklist` table

```sql
CREATE TABLE IF NOT EXISTS admission_checklist (
  checklist_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id),
  college_id INTEGER REFERENCES college_list(college_id),

  -- Documents
  recommendation_letters_secured INTEGER DEFAULT 0,  -- Target: 3
  transcript_submitted BOOLEAN DEFAULT FALSE,
  test_scores_sent BOOLEAN DEFAULT FALSE,
  fee_waiver_obtained BOOLEAN DEFAULT FALSE,

  -- Interview
  interview_scheduled BOOLEAN DEFAULT FALSE,
  interview_completed BOOLEAN DEFAULT FALSE,
  interview_prep_done BOOLEAN DEFAULT FALSE,

  -- Timestamps
  application_submitted_date TIMESTAMPTZ,
  deadline_date TIMESTAMPTZ,
  on_time BOOLEAN GENERATED ALWAYS AS (application_submitted_date <= deadline_date) STORED,

  created_ts TIMESTAMPTZ DEFAULT NOW(),
  updated_ts TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 3: Extend `feature_defs` (Add Missing Features)

**Gap:** Some NSM metrics not defined as features

**Solution:** Add feature definitions

```sql
-- Essay quality feature
INSERT INTO feature_defs (feature_id, domain, label, scale_max) VALUES
  ('essay_common_app_quality', 'narrative', 'Common App Essay Quality', 100),
  ('essay_identity_fusion_clarity', 'narrative', 'Identity Fusion Clarity', 100),
  ('essay_supplemental_count', 'narrative', 'Supplemental Essays Complete', 15);

-- Admission execution features
INSERT INTO feature_defs (feature_id, domain, label, scale_max) VALUES
  ('admission_on_time_rate', 'execution', 'Applications On Time %', 100),
  ('admission_rec_letters_secured', 'execution', 'Recommendation Letters Secured', 3),
  ('admission_interview_prep', 'execution', 'Interview Prep Complete', 1);
```

### Phase 4: Create NSM Views (Leverage Existing Tables)

**Action:** Create views that aggregate existing data into NSM metrics

```sql
-- NSM IvyScore Trajectory (from feature_snapshots)
CREATE OR REPLACE VIEW v_nsm_ivyscore_trajectory AS
SELECT
  fs.student_id,
  fs.as_of AS snapshot_month,
  SUM(CASE WHEN fd.domain = 'academics' THEN fsv.value_norm ELSE 0 END) / 100 * 5 AS academics_score,
  SUM(CASE WHEN fd.domain = 'ecs' AND fd.feature_id LIKE '%leadership%' THEN fsv.value_norm ELSE 0 END) / 100 * 5 AS leadership_score,
  SUM(CASE WHEN fd.domain = 'ecs' AND fd.feature_id LIKE '%service%' THEN fsv.value_norm ELSE 0 END) / 100 * 5 AS service_score,
  SUM(CASE WHEN fd.domain = 'ecs' AND fd.feature_id LIKE '%artifact%' THEN fsv.value_norm ELSE 0 END) / 100 * 5 AS artifacts_score,
  SUM(CASE WHEN fd.domain = 'awards' THEN fsv.value_norm ELSE 0 END) / 100 * 5 AS recognition_score,
  (SUM(CASE WHEN fd.domain = 'academics' THEN fsv.value_norm ELSE 0 END) / 100 * 5 +
   SUM(CASE WHEN fd.domain = 'ecs' AND fd.feature_id LIKE '%leadership%' THEN fsv.value_norm ELSE 0 END) / 100 * 5 +
   SUM(CASE WHEN fd.domain = 'ecs' AND fd.feature_id LIKE '%service%' THEN fsv.value_norm ELSE 0 END) / 100 * 5 +
   SUM(CASE WHEN fd.domain = 'ecs' AND fd.feature_id LIKE '%artifact%' THEN fsv.value_norm ELSE 0 END) / 100 * 5 +
   SUM(CASE WHEN fd.domain = 'awards' THEN fsv.value_norm ELSE 0 END) / 100 * 5) AS total_ivyscore
FROM feature_snapshots fs
JOIN feature_snapshot_values fsv ON fs.snapshot_id = fsv.snapshot_id
JOIN feature_defs fd ON fsv.feature_id = fd.feature_id
GROUP BY fs.student_id, fs.as_of
ORDER BY fs.student_id, fs.as_of;

-- NSM Recognition Vitals (from kb_items awards)
CREATE OR REPLACE VIEW v_nsm_recognition_vitals AS
SELECT
  student_id,
  COUNT(*) FILTER (WHERE subtype = 'National' AND tier1_state = 'Outcome') AS national_awards_won,
  COUNT(*) FILTER (WHERE subtype = 'Regional' AND tier1_state = 'Outcome') AS regional_awards_won,
  COUNT(*) FILTER (WHERE subtype = 'Local' AND tier1_state = 'Outcome') AS local_awards_won,
  COUNT(*) FILTER (WHERE tier1_state IN ('In Transit', 'Submitted')) AS award_applications_submitted,
  COUNT(*) FILTER (WHERE tier1_state = 'Outcome')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tier1_state IN ('Submitted', 'Outcome')), 0) AS award_win_rate
FROM kb_items
WHERE item_type = 'Award_Competition'
GROUP BY student_id;

-- NSM Leadership Vitals (from kb_items ECs)
CREATE OR REPLACE VIEW v_nsm_leadership_vitals AS
SELECT
  student_id,
  COUNT(*) FILTER (WHERE status_detail LIKE '%President%' OR status_detail LIKE '%Officer%') AS officer_positions_held,
  COUNT(*) FILTER (WHERE status_detail LIKE '%Founder%') AS club_founding_count,
  SUM((key_metric_value::int * 52)) FILTER (WHERE key_metric_type = 'hours_per_week' AND status_detail LIKE '%Lead%') AS volunteer_hours_leadership
FROM kb_items
WHERE item_type LIKE 'EC_%'
GROUP BY student_id;

-- NSM Service Vitals (from kb_items ECs)
CREATE OR REPLACE VIEW v_nsm_service_vitals AS
SELECT
  student_id,
  SUM((key_metric_value::int * 52)) FILTER (WHERE key_metric_type = 'hours_per_week') AS volunteer_hours_total,
  SUM(key_metric_value::int) FILTER (WHERE key_metric_type = 'people_impacted') AS community_impact_people,
  (EXTRACT(month FROM AGE(MAX(outcome_date), MIN(event_date))))::int AS sustained_service_months
FROM kb_items
WHERE item_type = 'EC_Service'
GROUP BY student_id;

-- NSM Artifacts Vitals (from kb_items projects)
CREATE OR REPLACE VIEW v_nsm_artifacts_vitals AS
SELECT
  student_id,
  COUNT(*) FILTER (WHERE subtype = 'Research' AND tier1_state = 'Outcome') AS research_papers_published,
  COUNT(*) FILTER (WHERE subtype = 'Conference') AS conference_presentations,
  COUNT(*) AS portfolio_projects_count,
  SUM(key_metric_value::int) FILTER (WHERE key_metric_type = 'github_commits') AS github_contributions
FROM kb_items
WHERE item_type = 'EC_Project'
GROUP BY student_id;

-- NSM Lagging Outcomes (from college_list + scholarships)
CREATE OR REPLACE VIEW v_nsm_lagging_outcomes AS
SELECT
  cl.student_id,
  COUNT(*) FILTER (WHERE cl.bucket_category = 'Reach' AND cl.decision_result = 'Accepted') AS tier1_acceptances,
  COUNT(*) FILTER (WHERE cl.bucket_category = 'Match' AND cl.decision_result = 'Accepted') AS tier2_acceptances,
  COUNT(*) FILTER (WHERE cl.bucket_category = 'Safety' AND cl.decision_result = 'Accepted') AS tier3_acceptances,
  COUNT(*) FILTER (WHERE cl.decision_result = 'Accepted') AS total_acceptances,
  COALESCE(SUM(s.amount_usd) FILTER (WHERE s.application_status = 'Accepted'), 0) AS total_scholarship_dollars
FROM college_list cl
LEFT JOIN scholarships s ON cl.student_id = s.student_id
GROUP BY cl.student_id;
```

---

## ✅ Final Refactored NSM Implementation

### Database Changes (Minimal)

**DELETE:**
- ❌ `db/migrations/v15_005_nsm_tracking_infrastructure.sql` (9/11 tables are duplicates)

**ADD:**
- ✅ `db/migrations/v15_005_nsm_extensions.sql` (2 new tables + feature defs + views)

**Result:**
- Leverage existing `kb_items`, `feature_snapshots`, `college_list`, `scholarships`
- Add only `essay_progress` and `admission_checklist` (truly missing)
- Create NSM views that aggregate existing data

### Agent Integration (Use Existing Data)

**AwardsAgent:**
```typescript
// OLD (wrong - duplicate table)
await pool.query('UPDATE nsm_recognition_vitals SET national_awards_won = ...');

// NEW (correct - use kb_items)
await pool.query(`
  INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, ...)
  VALUES ($1, $2, 'Award_Competition', 'National', 'NCWIT', 'Outcome', ...)
`);
// NSM metric auto-computed by v_nsm_recognition_vitals view
```

**GamePlanAgent:**
```typescript
// OLD (wrong - duplicate table)
await pool.query('UPDATE nsm_academic_vitals SET sat_score = ...');

// NEW (correct - use kb_items + feature_snapshots)
await pool.query(`
  INSERT INTO kb_items (item_id, student_id, item_type, subtype, key_metric_value, ...)
  VALUES ($1, $2, 'Test', 'SAT', '1500', ...)
`);
// IvyScore auto-recomputed by feature snapshot engine
```

---

## 📊 NSM Dashboard (Query Existing Schema)

**Real-time IvyScore:**
```sql
SELECT * FROM v_nsm_ivyscore_trajectory WHERE student_id = 'huda-2025' ORDER BY snapshot_month;
```

**All Vitals:**
```sql
SELECT
  s.student_id,
  ivs.total_ivyscore,
  rv.national_awards_won,
  lv.officer_positions_held,
  sv.volunteer_hours_total,
  av.research_papers_published,
  lo.total_scholarship_dollars
FROM students s
LEFT JOIN v_nsm_ivyscore_trajectory ivs ON s.student_id = ivs.student_id
LEFT JOIN v_nsm_recognition_vitals rv ON s.student_id = rv.student_id
LEFT JOIN v_nsm_leadership_vitals lv ON s.student_id = lv.student_id
LEFT JOIN v_nsm_service_vitals sv ON s.student_id = sv.student_id
LEFT JOIN v_nsm_artifacts_vitals av ON s.student_id = av.student_id
LEFT JOIN v_nsm_lagging_outcomes lo ON s.student_id = lo.student_id;
```

---

## ✅ Summary: Unified Data Model

**Before (Wrong):**
- 11 new NSM tables (duplicates)
- 2 data dictionaries (kb_items vs nsm_*)
- Agents write to 2 places

**After (Correct):**
- 2 new tables (essay_progress, admission_checklist)
- 1 data dictionary (kb_items + feature_defs)
- Agents write to 1 place (kb_items)
- NSM metrics = views over existing data

**Result:** Zero duplication, single source of truth

---

**Status:** REFACTOR PLAN COMPLETE
**Next:** Implement v15_005_nsm_extensions.sql (2 tables + views)
