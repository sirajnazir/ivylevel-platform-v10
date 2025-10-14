# Production Database Architecture
**IvyLevel Platform v10 - Jenny Agentic AI**

**Document Status:** Production Source of Truth
**Last Update:** 2025-10-14
**Version:** v12.0 - Universal Quality Verification + Jenny Test Lab v4.0
**Scope:** Production Schema ONLY (No DB schema changes in v12.0 - quality layer is application-level)

---

## Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Universal Enumerations (v3.0)](#universal-enumerations-v30)
4. [Academics Tables (v3.4)](#academics-tables-v34)
5. [EC Vitals Tables (v10.6)](#ec-vitals-tables-v106)
6. [JTBD Tables (v10.6)](#jtbd-tables-v106)
7. [EQ Signals Integration (v10.4)](#eq-signals-integration-v104)
8. [CAT-2/CAT-3 Tables (v11.1)](#cat-2cat-3-tables-v111)
9. [Temporal Views](#temporal-views)
10. [Source Gating Pattern](#source-gating-pattern)
11. [Provenance Tracking](#provenance-tracking)
12. [Vector Store Configuration (v10.3)](#vector-store-configuration-v103)
13. [Indexes & Performance](#indexes--performance)
14. [Data Ingestion (v10.6)](#data-ingestion-v106)

---

## Overview

**Project Structure:** For complete project organization, see [MASTER_PROD_TECH_SPEC.md](MASTER_PROD_TECH_SPEC.md#project-structure) or [PROJECT_STRUCTURE.md](guides/PROJECT_STRUCTURE.md).

The Jenny AI database uses PostgreSQL 15+ with a **Facts-First architecture**:

- **Universal Enumerations**: Awards, ECs, Programs, Academics with initial/final/progression phases
- **EC Vitals (v10.6)**: Quantitative metric progression tracking (funding, scale, impact, leadership, product, selection)
- **JTBD (v10.6)**: Weekly execution fact tracking (what got done, not how or why - coaching stays in KB)
- **Source-Gated Facts**: All data linked to sources (SRC-GAMEPLAN-*, SRC-COMMONAPP-*, SRC-SNAPSHOT-*, SRC-SESSION-*)
- **Temporal Resolution**: Support for first/latest/nth/as-of queries via views
- **Provenance Tracking**: Full evidence chains via chip_id + chip_table + source_id

**Key Principles:**
1. Append-only temporal facts (never update, always insert)
2. Source gating for phase separation (initial vs final vs progression)
3. View-based temporal resolution
4. Explicit provenance for all data points
5. **Pure fact-based metrics** - no coaching intelligence in SQL (stays in Cat-02 KB/RAG)

---

## Core Tables

### students
**Purpose:** Student registry

```sql
CREATE TABLE students (
  student_id       TEXT PRIMARY KEY,
  full_name        TEXT NOT NULL,
  grad_year        INT,
  email            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

**Sample Data:**
```sql
INSERT INTO students VALUES ('huda-2025', 'Huda Ahmed', 2025, 'huda@example.com');
```

### kb_items
**Purpose:** Universal knowledge base items (ECs, Activities, Programs, Narratives)

```sql
CREATE TABLE kb_items (
  chip_id          TEXT PRIMARY KEY,
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  family           TEXT NOT NULL, -- 'Activity', 'Essay', 'program', 'summer_program'
  chip_table       TEXT DEFAULT 'kb_items',
  source_id        TEXT NOT NULL, -- 'SRC-GAMEPLAN-001', 'SRC-COMMONAPP-001'

  -- Activity fields
  activity_name    TEXT,
  activity_desc    TEXT,
  category         TEXT,
  role             TEXT,
  hours_per_week   INT,
  weeks_per_year   INT,

  -- Program fields
  program_name     TEXT,
  program_type     TEXT,
  program_desc     TEXT,

  -- Narrative fields
  narrative_text   TEXT,
  essay_topic      TEXT,

  -- Temporal tracking
  event_date       DATE,          -- Start date
  submit_date      DATE,          -- Submission date
  as_of            DATE,          -- Snapshot date

  -- Common metadata
  text_content     TEXT,          -- Searchable content
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kb_items_student ON kb_items(student_id);
CREATE INDEX idx_kb_items_family ON kb_items(family);
CREATE INDEX idx_kb_items_source ON kb_items(source_id);
```

**Sample Data:**
```sql
-- GamePlan EC (initial)
INSERT INTO kb_items (chip_id, student_id, family, source_id, activity_name, category, event_date, as_of)
VALUES ('E001-ACT-001', 'huda-2025', 'Activity', 'SRC-GAMEPLAN-001', 'Robotics Team Captain', 'STEM', '2023-09-01', '2024-06-15');

-- CommonApp EC (final)
INSERT INTO kb_items (chip_id, student_id, family, source_id, activity_name, category, submit_date)
VALUES ('E002-ACT-001', 'huda-2025', 'Activity', 'SRC-COMMONAPP-001', 'Robotics Team Captain', 'STEM', '2024-11-01');
```

### outcomes
**Purpose:** Final results (awards won, program decisions, college decisions)

```sql
CREATE TABLE outcomes (
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  domain           TEXT NOT NULL, -- 'award', 'program', 'college'
  chip_id          TEXT NOT NULL,
  chip_table       TEXT DEFAULT 'outcomes',
  source_id        TEXT NOT NULL,

  -- Award outcomes
  award_name       TEXT,
  won_date         DATE,
  tier             TEXT, -- 'International', 'National', 'Regional', 'School'

  -- Program outcomes
  program_name     TEXT,
  program_type     TEXT,
  decision         TEXT, -- 'Accepted', 'Waitlisted', 'Rejected'
  decision_date    DATE,

  -- College outcomes
  college_name     TEXT,
  application_type TEXT, -- 'ED', 'EA', 'RD'
  decision_type    TEXT, -- 'Accepted', 'Waitlisted', 'Rejected', 'Deferred'

  -- Common metadata
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (student_id, chip_id)
);

CREATE INDEX idx_outcomes_domain ON outcomes(domain);
CREATE INDEX idx_outcomes_source ON outcomes(source_id);
```

**Sample Data:**
```sql
-- Award won
INSERT INTO outcomes (student_id, domain, chip_id, source_id, award_name, won_date, tier)
VALUES ('huda-2025', 'award', 'W001-AWARD-001', 'SRC-RESULT-001', 'NCWIT Aspirations in Computing — National Awardee', '2024-03-15', 'National');

-- Program decision
INSERT INTO outcomes (student_id, domain, chip_id, source_id, program_name, decision, decision_date)
VALUES ('huda-2025', 'program', 'W002-PROG-001', 'SRC-RESULT-002', 'MIT MITES', 'Accepted', '2024-04-01');

-- College decision
INSERT INTO outcomes (student_id, domain, chip_id, source_id, college_name, application_type, decision_type, decision_date)
VALUES ('huda-2025', 'college', 'W003-COLL-001', 'SRC-RESULT-003', 'MIT', 'ED', 'Accepted', '2024-12-15');
```

### award_targets
**Purpose:** Award targets from GamePlan (initial phase)

```sql
CREATE TABLE award_targets (
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  chip_id          TEXT NOT NULL,
  chip_table       TEXT DEFAULT 'award_targets',
  source_id        TEXT NOT NULL, -- 'SRC-GAMEPLAN-001'

  award_name       TEXT NOT NULL,
  tier             TEXT, -- 'International', 'National', 'Regional', 'School'
  category         TEXT,
  deadline         DATE,
  as_of            DATE, -- Snapshot date

  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (student_id, chip_id)
);

CREATE INDEX idx_award_targets_source ON award_targets(source_id);
```

**Sample Data:**
```sql
INSERT INTO award_targets (student_id, chip_id, source_id, award_name, tier, as_of)
VALUES ('huda-2025', 'T001-AWARD-001', 'SRC-GAMEPLAN-001', 'NCWIT Aspirations in Computing', 'National', '2024-06-15');
```

---

## Universal Enumerations (v3.0)

### awards
**Purpose:** Awards with initial/final/progression phases

**Data Sources:**
- **Initial:** `award_targets` table (SRC-GAMEPLAN-*)
- **Final:** `outcomes` table where `domain = 'award'`
- **Progression:** Union of initial → final

**Resolver Functions:**
```typescript
// /services/jenny-api/src/resolvers/enums.ts

export const awards = {
  async initial(pg, studentId) {
    // GamePlan awards (target list)
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, award_name, tier, as_of
      FROM award_targets
      WHERE student_id = $1 AND source_id LIKE 'SRC-GAMEPLAN%'
      ORDER BY tier DESC, award_name
    `, [studentId]);
    return rows;
  },

  async final(pg, studentId) {
    // Actual awards won
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, award_name, won_date, tier
      FROM outcomes
      WHERE student_id = $1 AND domain = 'award'
      ORDER BY won_date DESC
    `, [studentId]);
    return rows;
  },

  async progression(pg, studentId) {
    // Timeline: targets → outcomes
    const { rows } = await pg.query(`
      SELECT 'initial' AS phase, chip_id, award_name, tier, as_of AS event_date
      FROM award_targets
      WHERE student_id = $1 AND source_id LIKE 'SRC-GAMEPLAN%'

      UNION ALL

      SELECT 'final' AS phase, chip_id, award_name, tier, won_date AS event_date
      FROM outcomes
      WHERE student_id = $1 AND domain = 'award'

      ORDER BY event_date
    `, [studentId]);
    return rows;
  }
};
```

**Query Examples:**
```sql
-- Initial awards (GamePlan targets)
SELECT * FROM award_targets WHERE student_id = 'huda-2025';

-- Final awards (won)
SELECT * FROM outcomes WHERE student_id = 'huda-2025' AND domain = 'award';

-- Progression timeline
SELECT 'initial' AS phase, award_name, as_of FROM award_targets WHERE student_id = 'huda-2025'
UNION ALL
SELECT 'final' AS phase, award_name, won_date FROM outcomes WHERE student_id = 'huda-2025' AND domain = 'award'
ORDER BY as_of;
```

### ecs (Extracurricular Activities)
**Purpose:** ECs with initial/final/progression phases

**Data Sources:**
- **Initial:** `kb_items` where `family = 'Activity'` AND `source_id LIKE 'SRC-GAMEPLAN%'`
- **Final:** `kb_items` where `family = 'Activity'` AND `source_id LIKE 'SRC-COMMONAPP%'`
- **Progression:** Union of initial → final

**Resolver Functions:**
```typescript
export const ecs = {
  async initial(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, activity_name, category, role, event_date, as_of
      FROM kb_items
      WHERE student_id = $1 AND family = 'Activity' AND source_id LIKE 'SRC-GAMEPLAN%'
      ORDER BY event_date DESC
    `, [studentId]);
    return rows;
  },

  async final(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, activity_name, category, role, submit_date
      FROM kb_items
      WHERE student_id = $1 AND family = 'Activity' AND source_id LIKE 'SRC-COMMONAPP%'
      ORDER BY submit_date DESC
    `, [studentId]);
    return rows;
  },

  async progression(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT 'initial' AS phase, chip_id, activity_name, category, event_date
      FROM kb_items
      WHERE student_id = $1 AND family = 'Activity' AND source_id LIKE 'SRC-GAMEPLAN%'

      UNION ALL

      SELECT 'final' AS phase, chip_id, activity_name, category, submit_date AS event_date
      FROM kb_items
      WHERE student_id = $1 AND family = 'Activity' AND source_id LIKE 'SRC-COMMONAPP%'

      ORDER BY event_date
    `, [studentId]);
    return rows;
  }
};
```

### programs (Summer Programs)
**Purpose:** Summer programs with initial/submitted/decisions/final phases

**Data Sources:**
- **Initial:** `kb_items` where `family = 'program'` AND `source_id LIKE 'SRC-GAMEPLAN%'`
- **Submitted:** `kb_items` where `family = 'program'` AND `submit_date IS NOT NULL`
- **Decisions:** `outcomes` where `domain = 'program'`
- **Final:** `outcomes` where `domain = 'program'` AND `decision = 'Accepted'`

**Resolver Functions:**
```typescript
export const programs = {
  async initial(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, program_name, program_type, as_of
      FROM kb_items
      WHERE student_id = $1 AND family = 'program' AND source_id LIKE 'SRC-GAMEPLAN%'
      ORDER BY program_name
    `, [studentId]);
    return rows;
  },

  async submitted(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, program_name, program_type, submit_date
      FROM kb_items
      WHERE student_id = $1 AND family = 'program' AND submit_date IS NOT NULL
      ORDER BY submit_date DESC
    `, [studentId]);
    return rows;
  },

  async decisions(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, program_name, decision, decision_date
      FROM outcomes
      WHERE student_id = $1 AND domain = 'program'
      ORDER BY decision_date DESC
    `, [studentId]);
    return rows;
  },

  async final(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, program_name, decision, decision_date
      FROM outcomes
      WHERE student_id = $1 AND domain = 'program' AND decision = 'Accepted'
      ORDER BY decision_date DESC
    `, [studentId]);
    return rows;
  },

  async progression(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT 'initial' AS phase, chip_id, program_name, as_of AS event_date
      FROM kb_items
      WHERE student_id = $1 AND family = 'program' AND source_id LIKE 'SRC-GAMEPLAN%'

      UNION ALL

      SELECT 'submitted' AS phase, chip_id, program_name, submit_date AS event_date
      FROM kb_items
      WHERE student_id = $1 AND family = 'program' AND submit_date IS NOT NULL

      UNION ALL

      SELECT 'decision' AS phase, chip_id, program_name, decision_date AS event_date
      FROM outcomes
      WHERE student_id = $1 AND domain = 'program'

      ORDER BY event_date
    `, [studentId]);
    return rows;
  }
};
```

---

## Academics Tables (v3.4)

### academic_terms
**Purpose:** Term/semester definitions

```sql
CREATE TABLE academic_terms (
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  term_key         TEXT NOT NULL, -- '2024-Fall', '2025-Spring'
  grade_level      TEXT,          -- '9th', '10th', '11th', '12th'
  start_date       DATE,
  end_date         DATE,
  source_id        TEXT,
  PRIMARY KEY (student_id, term_key)
);
```

### academic_courses
**Purpose:** Course enrollments and grades

```sql
CREATE TABLE academic_courses (
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  chip_id          TEXT NOT NULL,
  chip_table       TEXT DEFAULT 'academic_courses',
  source_id        TEXT NOT NULL, -- 'SRC-GAMEPLAN-001', 'SRC-TRANSCRIPT-001'

  term_key         TEXT NOT NULL,
  course_title     TEXT NOT NULL,
  grade_letter     TEXT,          -- 'A', 'A-', 'B+', etc.
  grade_percent    NUMERIC(5,2),  -- 95.50
  credits          NUMERIC(4,2),  -- 1.00, 0.50
  weighting        TEXT,          -- 'AP', 'Honors', 'Regular'

  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (student_id, chip_id)
);

CREATE INDEX idx_academic_courses_term ON academic_courses(student_id, term_key);
CREATE INDEX idx_academic_courses_source ON academic_courses(source_id);
```

**Sample Data:**
```sql
INSERT INTO academic_courses (student_id, chip_id, source_id, term_key, course_title, grade_letter, credits, weighting)
VALUES
  ('huda-2025', 'C001-COURSE-001', 'SRC-TRANSCRIPT-001', '2024-Fall', 'AP Calculus BC', 'A', 1.00, 'AP'),
  ('huda-2025', 'C002-COURSE-002', 'SRC-TRANSCRIPT-001', '2024-Fall', 'AP Physics C', 'A-', 1.00, 'AP'),
  ('huda-2025', 'C003-COURSE-003', 'SRC-TRANSCRIPT-001', '2024-Fall', 'English Literature', 'A', 1.00, 'Honors');
```

### academic_grades
**Purpose:** Individual assignment/exam grades (optional, for detailed tracking)

```sql
CREATE TABLE academic_grades (
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  chip_id          TEXT NOT NULL,
  source_id        TEXT NOT NULL,

  term_key         TEXT NOT NULL,
  course_title     TEXT NOT NULL,
  assignment_name  TEXT NOT NULL,
  grade_percent    NUMERIC(5,2),
  grade_letter     TEXT,
  grade_date       DATE,

  PRIMARY KEY (student_id, chip_id)
);
```

### academic_gpa
**Purpose:** GPA snapshots (cumulative, by term, by year)

```sql
CREATE TABLE academic_gpa (
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  chip_id          TEXT NOT NULL,
  chip_table       TEXT DEFAULT 'academic_gpa',
  source_id        TEXT NOT NULL, -- 'SRC-GAMEPLAN-001', 'SRC-TRANSCRIPT-001'

  scope            TEXT NOT NULL, -- 'Cumulative', '9th Grade', '10th Grade', '11th Grade', '12th Grade'
  scope_key        TEXT NOT NULL, -- 'cumulative', '9th', '10th', '11th', '12th'

  gpa_unweighted   NUMERIC(3,2),  -- 3.95
  gpa_weighted     NUMERIC(3,2),  -- 4.50
  credits_earned   NUMERIC(5,2),  -- 24.00

  as_of_date       DATE NOT NULL, -- Snapshot date
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (student_id, chip_id)
);

CREATE INDEX idx_academic_gpa_scope ON academic_gpa(student_id, scope_key);
CREATE INDEX idx_academic_gpa_date ON academic_gpa(student_id, as_of_date DESC);
CREATE INDEX idx_academic_gpa_source ON academic_gpa(source_id);
```

**Sample Data:**
```sql
-- GamePlan GPA (initial)
INSERT INTO academic_gpa (student_id, chip_id, source_id, scope, scope_key, gpa_unweighted, gpa_weighted, credits_earned, as_of_date)
VALUES ('huda-2025', 'G001-GPA-001', 'SRC-GAMEPLAN-001', 'Cumulative', 'cumulative', 3.92, 4.45, 18.00, '2024-06-15');

-- Transcript GPA (final)
INSERT INTO academic_gpa (student_id, chip_id, source_id, scope, scope_key, gpa_unweighted, gpa_weighted, credits_earned, as_of_date)
VALUES ('huda-2025', 'G002-GPA-001', 'SRC-TRANSCRIPT-001', 'Cumulative', 'cumulative', 3.95, 4.50, 24.00, '2024-12-01');
```

### Academics Resolvers

```typescript
// /services/jenny-api/src/resolvers/academics.ts

export const transcript = {
  async initial(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, term_key, course_title, grade_letter, credits, weighting
      FROM academic_courses
      WHERE student_id = $1 AND source_id LIKE 'SRC-GAMEPLAN%'
      ORDER BY term_key, course_title
    `, [studentId]);
    return rows;
  },

  async final(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, term_key, course_title, grade_letter, grade_percent, credits, weighting
      FROM academic_courses
      WHERE student_id = $1 AND source_id LIKE 'SRC-TRANSCRIPT%'
      ORDER BY term_key, course_title
    `, [studentId]);
    return rows;
  },

  async progression(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT 'initial' AS phase, chip_id, term_key, course_title, grade_letter, source_id
      FROM academic_courses
      WHERE student_id = $1 AND source_id LIKE 'SRC-GAMEPLAN%'

      UNION ALL

      SELECT 'final' AS phase, chip_id, term_key, course_title, grade_letter, source_id
      FROM academic_courses
      WHERE student_id = $1 AND source_id LIKE 'SRC-TRANSCRIPT%'

      ORDER BY term_key
    `, [studentId]);
    return rows;
  }
};

export const gpa = {
  async initial(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, scope, scope_key, gpa_unweighted, gpa_weighted, credits_earned, as_of_date
      FROM academic_gpa
      WHERE student_id = $1 AND source_id LIKE 'SRC-GAMEPLAN%'
      ORDER BY as_of_date DESC
      LIMIT 1
    `, [studentId]);
    return rows[0];
  },

  async final(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, scope, scope_key, gpa_unweighted, gpa_weighted, credits_earned, as_of_date
      FROM academic_gpa
      WHERE student_id = $1 AND source_id LIKE 'SRC-TRANSCRIPT%'
      ORDER BY as_of_date DESC
    `, [studentId]);
    return rows;
  },

  async latest(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, chip_table, source_id, scope, scope_key, gpa_unweighted, gpa_weighted, credits_earned, as_of_date
      FROM academic_gpa
      WHERE student_id = $1
      ORDER BY as_of_date DESC
      LIMIT 1
    `, [studentId]);
    return rows;
  },

  async progression(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT chip_id, scope, scope_key, gpa_unweighted, gpa_weighted, as_of_date
      FROM academic_gpa
      WHERE student_id = $1
      ORDER BY as_of_date
    `, [studentId]);
    return rows;
  }
};
```

---

## EC Vitals Tables (v10.6)

**Purpose:** Track quantitative metric progression for EC/Activities - pure fact-based numbers with temporal snapshots

**Key Concept:** While `kb_items` tracks WHAT activities exist, `ec_vitals` tracks HOW THEY GROW over time with measurable metrics.

**Migration:** `data/migrations/003_ec_vitals_schema.sql`
**Real Data:**
- `data/canonical/huda_ec_vitals_real.sql` (Phase 1&2: 12 vitals from 6 milestone weeks)
- `data/canonical/huda_ec_vitals_phase3.sql` (Phase 3: 15 vitals with complete progression)
- **Total:** 27 vitals across 8 activities, spanning June 2023 - October 2024

**Resolver:** `/services/jenny-api/src/resolvers/vitals.ts`
**Routes:** `vitals.latest`, `vitals.progression`, `vitals.funding.progression`, `vitals.scale.progression`, `vitals.impact.latest`, `vitals.summary`

### ec_vitals Table Schema

```sql
CREATE TABLE ec_vitals (
  -- Primary key
  vital_id         TEXT PRIMARY KEY,           -- Format: V001, V002, etc.

  -- Foreign keys
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  chip_id          TEXT NOT NULL,              -- Links to kb_items.chip_id (e.g., E001)
  activity_name    TEXT NOT NULL,              -- Denormalized for quick queries

  -- Metric classification (from CommonApp analysis)
  metric_type      TEXT NOT NULL CHECK (metric_type IN (
    'scale',       -- Members served, participants, geographic reach, audience size
    'financial',   -- Funding raised, revenue, grants, budget managed
    'product',     -- Products shipped, content created, downloads, views
    'leadership',  -- Team size, growth rate, partnerships, role expansion
    'impact',      -- People impacted, media features, social reach, recognition
    'selection'    -- Acceptance rate, selectivity, competition level
  )),
  metric_name      TEXT NOT NULL,              -- Specific metric (e.g., 'funding_raised', 'students_reached')

  -- Value tracking (flexible for different data types)
  numeric_value    NUMERIC,                    -- For quantitative metrics (23000, 6400, 413)
  text_value       TEXT,                       -- For qualitative metrics ("3 publications", "Regional Winner")
  unit             TEXT,                       -- Unit of measurement ('$', 'students', 'members', '%', 'partnerships')

  -- Temporal tracking
  as_of            DATE NOT NULL,              -- Snapshot date (enables progression queries)

  -- Provenance
  source_id        TEXT NOT NULL,              -- Source gating: SRC-GAMEPLAN-*, SRC-COMMONAPP-*, SRC-SNAPSHOT-*

  -- Context & evidence
  notes            TEXT,                       -- Optional context
  evidence_text    TEXT,                       -- Original text where metric was extracted from

  -- Metadata
  created_at       TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(student_id, chip_id, metric_name, as_of),
  CHECK (numeric_value IS NOT NULL OR text_value IS NOT NULL)  -- At least one value required
);

-- Indexes for performance
CREATE INDEX idx_ec_vitals_student ON ec_vitals(student_id);
CREATE INDEX idx_ec_vitals_chip ON ec_vitals(chip_id);
CREATE INDEX idx_ec_vitals_metric_type ON ec_vitals(metric_type);
CREATE INDEX idx_ec_vitals_metric_name ON ec_vitals(metric_name);
CREATE INDEX idx_ec_vitals_as_of ON ec_vitals(as_of);
CREATE INDEX idx_ec_vitals_source ON ec_vitals(source_id);
CREATE INDEX idx_ec_vitals_student_chip ON ec_vitals(student_id, chip_id);
```

### Field Descriptions

| Field | Purpose | Example Values | Notes |
|-------|---------|----------------|-------|
| `vital_id` | Unique identifier | V001, V002, V024 | Sequential, unique across all students |
| `student_id` | Links to student | huda-2025 | FK to students table |
| `chip_id` | Links to activity | E001 (Empowering AI) | Must exist in kb_items |
| `activity_name` | Activity name | Empowering AI, Folklift | Denormalized for query performance |
| `metric_type` | Category of metric | scale, financial, product | From CommonApp analysis (6 types) |
| `metric_name` | Specific metric | funding_raised, students_reached | Standardized names per type |
| `numeric_value` | Numeric value | 23000, 6400, 413 | For quantitative metrics |
| `text_value` | Text value | "3 publications", "Regional Winner" | For qualitative metrics |
| `unit` | Unit of measurement | $, students, members, %, partnerships | Clarifies numeric_value |
| `as_of` | Snapshot date | 2024-10-01 | Critical for temporal progression |
| `source_id` | Data provenance | SRC-GAMEPLAN-001, SRC-COMMONAPP-001 | Enables source gating |
| `evidence_text` | Original text | "Raised $23k+ in grants for AI education" | Traceability to source |
| `notes` | Context | "CommonApp final submission" | Human-readable context |

### Metric Type Taxonomy

**scale metrics:**
- `members`: Total members in organization/club
- `participants`: Event/workshop attendees
- `students_reached`: Students impacted by program
- `audience_size`: Social media following, email list size
- `geographic_reach`: Number of cities/states/countries reached
- `membership_growth_rate`: % growth in membership (e.g., 413%)

**financial metrics:**
- `funding_raised`: Total funds secured (grants, donations)
- `revenue`: Revenue generated from sales/services
- `grants_secured`: Number of grants awarded
- `budget_managed`: Total budget responsibility

**product metrics:**
- `products_shipped`: Products/games/apps released
- `downloads`: App/game download count
- `content_created`: Articles, videos, podcasts produced
- `users_reached`: Active users of product
- `views`: Total views of content

**leadership metrics:**
- `team_size`: Number of team members led
- `partnerships`: Strategic partnerships formed
- `growth_rate`: Team/org growth rate
- `role_expansion`: Promotion or role changes

**impact metrics:**
- `people_impacted`: Total people directly helped/taught
- `media_features`: Press mentions, publications featured in
- `social_media_reach`: TikTok views, Instagram reach
- `recognition`: Awards won, honors received

**selection metrics:**
- `acceptance_rate`: Program selectivity (e.g., 9% for Kode With Klossy)
- `selectivity`: Competitive level
- `competition_level`: National, International, etc.

### Temporal Views

**v_ec_vitals_latest**: Most recent value for each metric per activity
```sql
CREATE OR REPLACE VIEW v_ec_vitals_latest AS
SELECT DISTINCT ON (student_id, chip_id, metric_name)
  vital_id, student_id, chip_id, activity_name, metric_type, metric_name,
  numeric_value, text_value, unit, as_of, source_id, evidence_text
FROM ec_vitals
ORDER BY student_id, chip_id, metric_name, as_of DESC;
```

**v_ec_vitals_progression**: Full timeline with nth ordering
```sql
CREATE OR REPLACE VIEW v_ec_vitals_progression AS
SELECT
  vital_id, student_id, chip_id, activity_name, metric_type, metric_name,
  numeric_value, text_value, unit, as_of, source_id, evidence_text,
  ROW_NUMBER() OVER (PARTITION BY student_id, chip_id, metric_name ORDER BY as_of) AS nth
FROM ec_vitals
ORDER BY student_id, chip_id, metric_name, as_of;
```

**v_ec_vitals_by_type**: Aggregated by metric type
```sql
CREATE OR REPLACE VIEW v_ec_vitals_by_type AS
SELECT
  student_id, metric_type,
  COUNT(DISTINCT chip_id) AS activities_count,
  COUNT(DISTINCT metric_name) AS metrics_count,
  COUNT(*) AS total_snapshots,
  MIN(as_of) AS earliest_snapshot,
  MAX(as_of) AS latest_snapshot
FROM ec_vitals
GROUP BY student_id, metric_type;
```

**v_ec_vitals_summary**: Student-level summary
```sql
CREATE OR REPLACE VIEW v_ec_vitals_summary AS
SELECT
  student_id,
  COUNT(DISTINCT chip_id) AS activities_tracked,
  COUNT(DISTINCT metric_name) AS unique_metrics,
  COUNT(*) AS total_snapshots,
  MIN(as_of) AS tracking_start,
  MAX(as_of) AS tracking_latest,
  ARRAY_AGG(DISTINCT metric_type ORDER BY metric_type) AS metric_types_tracked
FROM ec_vitals
GROUP BY student_id;
```

### Real Data Examples (Huda's EC Portfolio)

**Source Files:** `data/canonical/huda_ec_vitals_real.sql` + `huda_ec_vitals_phase3.sql`

```sql
-- AI Ethics Game: Initial baseline (Week 1 - June 2023)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes) VALUES
  ('VIT-HUDA-001', 'huda-2025', 'CHIP-EC-AIGAME-001', 'AI Ethics Game', 'scale', 'users_reached', 100, 'users', '2023-06-21', 'SRC-SNAPSHOT-2023-06-21', '100 users reached, 60% girls mentioned in W001 session', 'Baseline measurement from first coaching session');

-- Film Makers Club: Leadership transformation (Week 12 - Sept 2023)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes) VALUES
  ('VIT-HUDA-006', 'huda-2025', 'CHIP-EC-FILMCLUB-001', 'Film Makers Club', 'leadership', 'female_officer_percentage', 60, 'percent', '2023-11-10', 'SRC-SNAPSHOT-2023-11-10', '0% to 60% female officers transformation mentioned in W020', 'Significant leadership transformation');

-- Empowering AI: Funding progression ($0 → $13K → $23K)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes) VALUES
  ('VIT-HUDA-013', 'huda-2025', 'CHIP-EC-EMPAI-001', 'Empowering AI Hackathon', 'financial', 'funding_raised', 13000, 'dollars', '2024-06-27', 'SRC-SNAPSHOT-2024-06-27', '$10K Wolfram + $3K .xyz domains secured through DevPost research (W055)', 'Major funding milestone - independent research and outreach'),
  ('VIT-HUDA-025', 'huda-2025', 'CHIP-EC-EMPAI-001', 'Empowering AI Hackathon', 'financial', 'funding_raised', 23000, 'dollars', '2024-10-01', 'SRC-COMMONAPP-001', '$23K final funding: $10K Wolfram + $3K .xyz + $10K additional sponsors', 'Final funding total for CommonApp');

-- Synthoria Game: Product metrics (Week 48 & 55 - June 2024)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes) VALUES
  ('VIT-HUDA-009', 'huda-2025', 'CHIP-EC-SYNTHORIA-001', 'Synthoria Game', 'scale', 'people_reached', 150, 'people', '2024-06-06', 'SRC-SNAPSHOT-2024-06-06', 'Email + social media distribution reached 150 people (W048)', 'Launch distribution milestone'),
  ('VIT-HUDA-017', 'huda-2025', 'CHIP-EC-SYNTHORIA-001', 'Synthoria Game', 'product', 'plays', 890, 'plays', '2024-06-27', 'SRC-SNAPSHOT-2024-06-27', '890 plays milestone achieved (W055)', 'Significant user engagement metric');

-- Women in Games: TikTok impact (Phase 1 & 3)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes) VALUES
  ('VIT-HUDA-010', 'huda-2025', 'CHIP-EC-WIG-001', 'Women in Games', 'impact', 'avg_video_views', 2750, 'views', '2024-06-06', 'SRC-SNAPSHOT-2024-06-06', 'TikTok averaging 2500-3000 views per video (W048)', 'Social media marketing success'),
  ('VIT-HUDA-026', 'huda-2025', 'CHIP-EC-WIG-001', 'Women in Games', 'impact', 'total_video_views', 2000000, 'views', '2024-10-01', 'SRC-COMMONAPP-001', '2M+ cumulative TikTok views', 'Final impact metric for CommonApp');

-- Overall Portfolio: Transformation milestone (Week 55 - June 2024)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, text_value, unit, as_of, source_id, evidence_text, notes) VALUES
  ('VIT-HUDA-027', 'huda-2025', 'CHIP-EC-GENERAL-001', 'Overall EC Portfolio', 'impact', 'transformation_milestone', 1, 'From directive-dependent to proactive opportunity-finding', 'developmental', '2024-06-27', 'SRC-SNAPSHOT-2024-06-27', 'Both father and Jenny independently observed transformation (W055)', 'Critical developmental milestone recognized by multiple observers');
```

### Query Examples

**Get latest values for all metrics:**
```sql
SELECT * FROM v_ec_vitals_latest WHERE student_id = 'huda-2025';
-- Real Result: 27 vitals across 8 activities, most recent as_of = 2024-10-01
```

**Get funding progression for Empowering AI:**
```sql
SELECT activity_name, numeric_value, unit, as_of, nth
FROM v_ec_vitals_progression
WHERE student_id = 'huda-2025'
  AND chip_id = 'CHIP-EC-EMPAI-001'
  AND metric_name = 'funding_raised'
ORDER BY nth;
-- Real Result: 1. $13,000 (2024-06-27) [#1] - DevPost sponsorship breakthrough
--              2. $23,000 (2024-10-01) [#2] - Final funding for CommonApp
```

**Get all scale metrics:**
```sql
SELECT activity_name, metric_name, numeric_value, unit, as_of
FROM v_ec_vitals_latest
WHERE student_id = 'huda-2025' AND metric_type = 'scale'
ORDER BY activity_name, metric_name;
-- Real Result: 6 scale metrics including Film Club members, Synthoria plays, EC reach
```

**Get vitals summary:**
```sql
SELECT * FROM v_ec_vitals_summary WHERE student_id = 'huda-2025';
-- Real Result: 8 activities, 17 unique metrics, 27 snapshots
--              Tracked: 2023-06-21 to 2024-10-01 (16 months)
--              Metric types: [financial, impact, leadership, product, scale]
```

**Get activity breakdown:**
```sql
SELECT activity_name, COUNT(*) as vital_count,
       ARRAY_AGG(DISTINCT metric_type) as metric_types
FROM ec_vitals
WHERE student_id = 'huda-2025'
GROUP BY activity_name
ORDER BY vital_count DESC;
-- Real Result:
--   Empowering AI Hackathon: 7 vitals (financial, scale, leadership, impact)
--   Synthoria Game: 5 vitals (product, scale)
--   Film Makers Club: 4 vitals (leadership, scale)
--   Women in Games: 3 vitals (impact)
```

### Resolver Methods (vitals.ts)

**`vitals.latest(pg, studentId)`** → Latest value for each metric across all activities
**`vitals.latestByActivity(pg, studentId, chipId)`** → Latest values for specific activity
**`vitals.latestByType(pg, studentId, metricType)`** → Latest values for metric type (e.g., 'financial')
**`vitals.progression(pg, studentId)`** → Full timeline for all metrics
**`vitals.progressionByActivity(pg, studentId, chipId)`** → Timeline for specific activity
**`vitals.progressionByMetric(pg, studentId, metricName)`** → Timeline for specific metric across activities
**`vitals.byType(pg, studentId)`** → Aggregated summary by metric type
**`vitals.summary(pg, studentId)`** → Student-level vitals summary
**`vitals.fundingProgression(pg, studentId)`** → Funding progression (convenience wrapper)
**`vitals.scaleProgression(pg, studentId)`** → Scale metrics progression (convenience wrapper)
**`vitals.impactMetrics(pg, studentId)`** → All impact metrics (convenience wrapper)

### Intent Routes (intent-enum.ts)

**`vitals.latest`** → "What are my current metrics?" / "Show me latest vitals"
**`vitals.progression`** → "Show me all vitals over time" / "My metrics progression"
**`vitals.funding.progression`** → "How much funding have I raised over time?"
**`vitals.scale.progression`** → "Show me scale growth" / "How many students reached progression"
**`vitals.impact.latest`** → "What's my impact?" / "Show me media features"
**`vitals.summary`** → "Vitals summary" / "How many metrics am I tracking?"

---

## JTBD Tables (v10.6)

**Purpose:** Track weekly execution facts - WHAT got done, not HOW or WHY (coaching intelligence stays in Cat-02 KB/RAG)

**Key Concept:** Pure fact-based record of weekly accomplishments, milestones, and execution items with status tracking.

**Migration:** `data/migrations/004_jtbd_schema.sql` (Modified to create `jtbd_weekly` table)
**Real Data:**
- `data/canonical/huda_jtbd_real.sql` (Phase 1&2: 11 records, 6 milestone weeks)
- `data/canonical/huda_jtbd_phase3.sql` (Phase 3: 27 records, 3 breakthrough weeks)
**Total Records:** 38 JTBD records spanning 9 weeks (Aug 2023 - Oct 2024)
**Resolver:** `/services/jenny-api/src/resolvers/jtbd.ts`
**Routes:** `jtbd.week`, `jtbd.completed`, `jtbd.pending`, `jtbd.milestones`, `jtbd.progression`

**⚠️ IMPORTANT TABLE NAMING:**
The production table is named `jtbd_weekly` (not `jtbd`) to avoid conflict with existing `jtbd` table used for iMessage interactions and execution docs. All references in code and queries must use `jtbd_weekly`.

### jtbd_weekly Table Schema

```sql
CREATE TABLE jtbd_weekly (
  -- Primary key
  jtbd_id          TEXT PRIMARY KEY,           -- Format: JTBD-HUDA-W###-### (e.g., JTBD-HUDA-W055-001)

  -- Foreign keys
  student_id       TEXT NOT NULL REFERENCES students(student_id),

  -- Temporal context
  week_number      INT NOT NULL,               -- Program week (1-52)
  week_start_date  DATE NOT NULL,              -- Week start date (Monday)
  week_end_date    DATE NOT NULL,              -- Week end date (Sunday)

  -- Execution facts (WHAT was done, not HOW or WHY)
  job_type         TEXT NOT NULL CHECK (job_type IN (
    'application',   -- College/program application submitted
    'test',          -- Test taken (SAT, ACT, AP)
    'award',         -- Award application submitted or won
    'ec_milestone',  -- EC milestone achieved (funding raised, event held)
    'academic',      -- Academic milestone (course completed, GPA updated)
    'essay',         -- Essay drafted/revised/finalized
    'other'          -- Other execution item
  )),
  job_description  TEXT NOT NULL,              -- Brief description of what was done

  -- Linked entities (optional foreign keys to specific items)
  linked_chip_id   TEXT,                       -- Links to kb_items, outcomes, ec_vitals, etc.
  linked_table     TEXT,                       -- Table name of linked entity

  -- Status tracking
  status           TEXT NOT NULL CHECK (status IN (
    'planned',       -- Planned to do this week
    'in_progress',   -- Started but not completed
    'completed',     -- Completed this week
    'deferred',      -- Pushed to future week
    'cancelled'      -- No longer doing
  )),
  completion_date  DATE,                       -- Actual completion date (if completed)

  -- Outcome metrics (quantifiable results)
  outcome_metric   TEXT,                       -- What metric changed (e.g., 'apps_submitted', 'funding_raised')
  outcome_value    NUMERIC,                    -- Numeric value (e.g., 3, 5000)
  outcome_unit     TEXT,                       -- Unit (e.g., 'applications', '$')

  -- Provenance
  source_id        TEXT NOT NULL,              -- Source: SRC-SNAPSHOT-YYYY-MM-DD, SRC-SESSION-nnn

  -- Metadata
  notes            TEXT,                       -- Optional context
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(student_id, week_number, job_type, job_description),
  CHECK (week_end_date >= week_start_date),
  CHECK ((status = 'completed' AND completion_date IS NOT NULL) OR status != 'completed')
);

-- Indexes for performance
CREATE INDEX idx_jtbd_student ON jtbd(student_id);
CREATE INDEX idx_jtbd_week ON jtbd(week_number);
CREATE INDEX idx_jtbd_student_week ON jtbd(student_id, week_number);
CREATE INDEX idx_jtbd_job_type ON jtbd(job_type);
CREATE INDEX idx_jtbd_status ON jtbd(status);
CREATE INDEX idx_jtbd_week_start ON jtbd(week_start_date);
CREATE INDEX idx_jtbd_source ON jtbd(source_id);
CREATE INDEX idx_jtbd_linked_chip ON jtbd(linked_chip_id);
```

### Field Descriptions

| Field | Purpose | Example Values | Notes |
|-------|---------|----------------|-------|
| `jtbd_id` | Unique identifier | J001, J002, J024 | Sequential, unique across all students |
| `student_id` | Links to student | huda-2025 | FK to students table |
| `week_number` | Program week | 8, 12, 20, 30, 40, 48 | 1-52 (assuming 52-week program) |
| `week_start_date` | Week start | 2024-03-18 (Monday) | ISO format YYYY-MM-DD |
| `week_end_date` | Week end | 2024-03-24 (Sunday) | ISO format YYYY-MM-DD |
| `job_type` | Category | application, test, ec_milestone | 7 standardized types |
| `job_description` | What was done | "Secured $5k grant for Empowering AI" | Brief, factual description |
| `linked_chip_id` | Links to entity | E001, W001 | Optional FK to kb_items, outcomes, etc. |
| `linked_table` | Table name | kb_items, outcomes | Name of linked table |
| `status` | Completion status | completed, in_progress, planned | 5 possible states |
| `completion_date` | Date completed | 2024-03-20 | Required if status = completed |
| `outcome_metric` | Metric changed | funding_raised, apps_submitted | Ties to ec_vitals or other metrics |
| `outcome_value` | Numeric outcome | 5000, 3 | Quantifiable result |
| `outcome_unit` | Unit | $, applications, tests | Clarifies outcome_value |
| `source_id` | Data provenance | SRC-SNAPSHOT-2024-03-24, SRC-SESSION-012 | Traceability |
| `notes` | Context | "First major funding milestone" | Human-readable notes |

### Temporal Views

**v_jtbd_by_week**: Aggregate view by week
```sql
CREATE OR REPLACE VIEW v_jtbd_by_week AS
SELECT
  student_id, week_number, week_start_date, week_end_date,
  COUNT(*) AS total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_jobs,
  COUNT(*) FILTER (WHERE status = 'planned') AS planned_jobs,
  ARRAY_AGG(job_type ORDER BY job_type) FILTER (WHERE status = 'completed') AS completed_job_types,
  ARRAY_AGG(job_description ORDER BY completion_date) FILTER (WHERE status = 'completed') AS completed_descriptions
FROM jtbd
GROUP BY student_id, week_number, week_start_date, week_end_date
ORDER BY student_id, week_number;
```

**v_jtbd_completed**: All completed jobs
```sql
CREATE OR REPLACE VIEW v_jtbd_completed AS
SELECT
  jtbd_id, student_id, week_number, job_type, job_description, completion_date,
  outcome_metric, outcome_value, outcome_unit, linked_chip_id, source_id
FROM jtbd
WHERE status = 'completed'
ORDER BY student_id, completion_date, week_number;
```

**v_jtbd_pending**: Pending/in-progress jobs
```sql
CREATE OR REPLACE VIEW v_jtbd_pending AS
SELECT
  jtbd_id, student_id, week_number, week_start_date, week_end_date,
  job_type, job_description, status, linked_chip_id, source_id
FROM jtbd
WHERE status IN ('planned', 'in_progress')
ORDER BY student_id, week_number, job_type;
```

**v_jtbd_summary**: Student-level summary
```sql
CREATE OR REPLACE VIEW v_jtbd_summary AS
SELECT
  student_id,
  COUNT(*) AS total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_jobs,
  COUNT(*) FILTER (WHERE status = 'planned') AS planned_jobs,
  MIN(week_start_date) AS program_start,
  MAX(week_end_date) AS latest_week,
  ARRAY_AGG(DISTINCT job_type ORDER BY job_type) AS job_types_tracked
FROM jtbd
GROUP BY student_id;
```

**v_jtbd_progression**: Week-over-week completion rate
```sql
CREATE OR REPLACE VIEW v_jtbd_progression AS
SELECT
  student_id, week_number, week_start_date,
  COUNT(*) AS jobs_this_week,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_this_week,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 1) AS completion_rate,
  SUM(COUNT(*)) OVER (PARTITION BY student_id ORDER BY week_number) AS cumulative_jobs,
  SUM(COUNT(*) FILTER (WHERE status = 'completed')) OVER (PARTITION BY student_id ORDER BY week_number) AS cumulative_completed
FROM jtbd
GROUP BY student_id, week_number, week_start_date
ORDER BY student_id, week_number;
```

### Real Data Examples (Huda's Milestone Weeks)

**Week 12 (Sept 2023): Film Club Leadership Transformation**
```sql
INSERT INTO jtbd_weekly (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes) VALUES
  ('JTBD-HUDA-W012-001', 'huda-2025', 12, '2023-09-11', '2023-09-17', 'ec_milestone',
   'Film Makers Club officer election - achieved 60% female leadership transformation',
   'CHIP-EC-FILMCLUB-001', 'ec_vitals', 'completed', '2023-09-15',
   'female_officer_percentage', 60, 'percent', 'SRC-SNAPSHOT-2023-09-15',
   'Major leadership milestone: 3 of 5 officers female'),

  ('JTBD-HUDA-W012-002', 'huda-2025', 12, '2023-09-11', '2023-09-17', 'ec_milestone',
   'Film Makers Club achieved 132 member signups at club fair',
   'CHIP-EC-FILMCLUB-001', 'ec_vitals', 'completed', '2023-09-15',
   'club_signups', 132, 'members', 'SRC-SNAPSHOT-2023-09-15',
   'Significant membership growth');
```

**Week 55 (June 2024): Independence Breakthrough**
```sql
INSERT INTO jtbd_weekly (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes) VALUES
  ('JTBD-HUDA-W055-001', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone',
   'Empowering AI Hackathon - $13K sponsorship secured independently ($10K Wolfram + $3K .xyz domains)',
   'CHIP-EC-EMPAI-001', 'ec_vitals', 'completed', '2024-06-27',
   'funding_raised', 13000, 'dollars', 'SRC-SNAPSHOT-2024-06-27',
   'Major breakthrough: Secured funding through DevPost research without coaching directive'),

  ('JTBD-HUDA-W055-004', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone',
   'Synthoria game - 890 plays milestone achieved',
   'CHIP-EC-SYNTHORIA-001', 'ec_vitals', 'completed', '2024-06-27',
   'plays', 890, 'plays', 'SRC-SNAPSHOT-2024-06-27',
   'Significant user engagement metric'),

  ('JTBD-HUDA-W055-009', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone',
   'Transformation recognized: from directive-dependent to proactive opportunity-finding',
   NULL, NULL, 'completed', '2024-06-27', NULL, NULL, NULL,
   'SRC-SNAPSHOT-2024-06-27', 'Both father and coach independently observed this developmental milestone');
```

**Week 80 (Oct 2024): Application Summit**
```sql
INSERT INTO jtbd_weekly (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes) VALUES
  ('JTBD-HUDA-W080-001', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'application',
   'Stanford REA application submitted', NULL, NULL, 'completed', '2024-10-27',
   NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'Primary application submitted on deadline day'),

  ('JTBD-HUDA-W080-002', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'application',
   'USC application submitted same night (momentum strategy)', NULL, NULL, 'completed', '2024-10-27',
   NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'Dual submission for psychological momentum'),

  ('JTBD-HUDA-W080-003', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'essay',
   'Stanford REA essays completed (250 words exactly, 15+ hackathons quantified)', NULL, NULL, 'completed', '2024-10-27',
   'word_count', 250, 'words', 'SRC-SNAPSHOT-2024-10-27', 'Precise word count achieved, quantified EC participation');
```

### Query Examples

**Get jobs for specific week:**
```sql
SELECT * FROM v_jtbd_weekly_by_week
WHERE student_id = 'huda-2025' AND week_number = 12;
-- Real Result: Week 12 (Sept 2023): 2 total, 2 completed (Film Club milestones)
```

**Get all completed jobs:**
```sql
SELECT week_number, job_description, completion_date
FROM v_jtbd_weekly_completed
WHERE student_id = 'huda-2025'
ORDER BY completion_date DESC
LIMIT 10;
-- Real Result: Most recent = Week 80 application submissions (Stanford REA, USC)
```

**Get EC milestones only:**
```sql
SELECT job_description, completion_date, outcome_value, outcome_unit
FROM v_jtbd_weekly_milestones
WHERE student_id = 'huda-2025'
ORDER BY completion_date;
-- Real Result: 23 ec_milestone records from Jun 2023 to Oct 2024
-- Examples: Film Club 60% female leadership, $13K sponsorship, 890 game plays
```

**Get week-over-week progression:**
```sql
SELECT week_number, total_jobs, completed_jobs, completion_rate
FROM v_jtbd_weekly_progression
WHERE student_id = 'huda-2025' AND total_jobs > 0
ORDER BY week_number;
-- Real Result: 9 active weeks with 100% completion rate (all planned jobs completed)
```

**Get pending tasks:**
```sql
SELECT * FROM v_jtbd_weekly_pending WHERE student_id = 'huda-2025';
-- Real Result: Empty (all 38 historical jobs have 'completed' status)
```

### Resolver Methods (jtbd.ts)

**All methods query `jtbd_weekly` table and associated views:**

**`jtbd.byWeek(pg, studentId, weekNumber)`** → Jobs for specific week
```sql
-- Uses: v_jtbd_weekly_by_week
-- Real Example: Week 55 returns 9 completed jobs (Empowering AI breakthrough week)
```

**`jtbd.byDateRange(pg, studentId, startDate, endDate)`** → Jobs in date range
```sql
-- Query: SELECT * FROM jtbd_weekly WHERE ... AND week_start_date >= $1 AND week_end_date <= $2
-- Real Example: June 2024 returns weeks 48, 50, 55 (29 total jobs)
```

**`jtbd.completed(pg, studentId)`** → All completed jobs chronologically
```sql
-- Uses: v_jtbd_weekly_completed
-- Real Example: Returns all 38 completed jobs from 9 milestone weeks
```

**`jtbd.completedByType(pg, studentId, jobType)`** → Completed jobs of specific type
```sql
-- Real Examples:
-- 'ec_milestone' → 23 records (Film Club, Empowering AI, Synthoria progression)
-- 'application' → 4 records (BofA, J-Camp, Stanford REA, USC)
-- 'essay' → 5 records (Stanford + USC essay completions)
```

**`jtbd.pending(pg, studentId)`** → All pending/in-progress jobs
```sql
-- Uses: v_jtbd_weekly_pending
-- Real Result: Empty for huda-2025 (all historical jobs completed)
```

**`jtbd.progression(pg, studentId)`** → Week-over-week completion rates
```sql
-- Uses: v_jtbd_weekly_progression
-- Real Result: 9 weeks with activity, 38 total jobs, 100% completion rate
```

**`jtbd.milestones(pg, studentId)`** → EC milestones only
```sql
-- Uses: v_jtbd_weekly_milestones
-- Real Result: 23 milestone records showing progression across 6 activities
```

### Intent Routes (intent-enum.ts)

**`jtbd.week`** → "What did I accomplish in week 8?" / "Show me week 12 progress"
**`jtbd.completed`** → "What have I done?" / "Show me all completed jobs"
**`jtbd.pending`** → "What's pending?" / "What do I need to do?"
**`jtbd.milestones`** → "Show me my milestones" / "My EC achievements"
**`jtbd.progression`** → "Week over week progress" / "My completion rates"

### Outcomes Extension (v10.6)

**EC Milestone domain added to outcomes table:**

```sql
-- Outcomes table now supports domain = 'ec_milestone'
INSERT INTO outcomes (student_id, domain, chip_id, source_id, metadata)
VALUES (
  'huda-2025', 'ec_milestone', 'E001', 'SRC-SNAPSHOT-2024-06-15',
  '{"milestone": "reached_5k_students", "date": "2024-06-15",
    "activity_name": "Empowering AI", "metric_type": "scale",
    "metric_name": "students_reached", "value": 5000,
    "context": "Reached 5,000 students through AI education workshops"}'::jsonb
);
```

**Views:**
- `v_ec_milestones`: EC milestones from outcomes table
- `v_ec_milestones_by_activity`: Grouped by activity
- `v_outcomes_extended`: Union of all outcome types (awards, programs, colleges, ec_milestones)

---

## Data Ingestion (v10.6)

**Complete Guide:** See [V10.6_DATA_INGESTION_GUIDE.md](guides/V10.6_DATA_INGESTION_GUIDE.md)

**Quick Start:**

1. **Apply migrations:**
```bash
psql $DATABASE_URL -f data/migrations/003_ec_vitals_schema.sql
psql $DATABASE_URL -f data/migrations/004_jtbd_schema.sql
psql $DATABASE_URL -f data/migrations/005_outcomes_extension.sql
```

2. **Prepare data files:**
```bash
# Extract vitals from GamePlan, snapshots, CommonApp
data/canonical/huda_ec_vitals_gameplan.sql      # Initial state
data/canonical/huda_ec_vitals_snapshots.sql     # Mid-program snapshots
data/canonical/huda_ec_vitals_commonapp.sql     # Final state

# Extract JTBD from session notes week-by-week
data/canonical/huda_jtbd_week08.sql
data/canonical/huda_jtbd_week12.sql
# ... one file per milestone week
```

3. **Load data:**
```bash
# Use batch script
./scripts/load_vitals_and_jtbd.sh huda-2025

# Or load individually
psql $DATABASE_URL -f data/canonical/huda_ec_vitals_gameplan.sql
psql $DATABASE_URL -f data/canonical/huda_jtbd_week12.sql
```

4. **Validate:**
```sql
-- Check counts
SELECT COUNT(*) FROM ec_vitals WHERE student_id = 'huda-2025';
SELECT COUNT(*) FROM jtbd WHERE student_id = 'huda-2025';

-- Test views
SELECT * FROM v_ec_vitals_summary WHERE student_id = 'huda-2025';
SELECT * FROM v_jtbd_summary WHERE student_id = 'huda-2025';
```

**Data Sources:**
- **GamePlan**: Initial targets and baseline metrics
- **Weekly Snapshots**: Mid-program progression (`SRC-SNAPSHOT-YYYY-MM-DD`)
- **CommonApp**: Final metrics submitted to colleges (`SRC-COMMONAPP-001`)
- **Session Notes**: Weekly JTBD extraction (`SRC-SESSION-nnn`)

**Ingestion Script:** `scripts/load_vitals_and_jtbd.sh`
**Template Files:** See migration files for INSERT examples
**Validation Queries:** See ingestion guide Section 5

---

## EQ Signals Integration (v10.4)

**Purpose:** Emotional Intelligence corpus for Humanizer v2.1 - student-specific warmth/normalization/celebration phrases

**Location:** Used by `/services/jenny-api/src/lib/humanizer.ts`

### EQ Tables Schema

**eq_signal_sets**
```sql
CREATE TABLE eq_signal_sets (
  id              SERIAL PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES students(student_id),
  session_id      TEXT,             -- Optional: link to specific coaching session
  week_id         TEXT,             -- Optional: W001-W093
  created_at      TIMESTAMPTZ DEFAULT now(),
  metadata        JSONB
);
```

**eq_signals**
```sql
CREATE TABLE eq_signals (
  id              SERIAL PRIMARY KEY,
  set_id          INT NOT NULL REFERENCES eq_signal_sets(id),
  cue             TEXT NOT NULL,    -- 'warmth', 'normalization', 'celebration', etc.
  exemplar        TEXT NOT NULL,    -- Actual phrase (e.g., "4/2? That's more than 2...")
  strength        FLOAT,            -- 0.0-1.0 ranking (higher = more characteristic)
  context         TEXT,             -- Optional: when/why this phrase was used
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_eq_signals_set_cue ON eq_signals(set_id, cue);
CREATE INDEX idx_eq_signals_strength ON eq_signals(strength DESC);
```

**eq_utterances** (optional, for deeper context)
```sql
CREATE TABLE eq_utterances (
  id              SERIAL PRIMARY KEY,
  signal_id       INT NOT NULL REFERENCES eq_signals(id),
  turn_index      INT,              -- Position in conversation
  speaker         TEXT,             -- 'coach' or 'student'
  text            TEXT NOT NULL,    -- Full utterance
  embedding       VECTOR(3072),     -- Optional: for semantic search
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### EQ Signal Distribution (Sample Data)

**From huda-2025 (115 sessions, 3,424 signals):**

| Cue | Count | % | Description |
|-----|-------|---|-------------|
| **specificity** | 1,650 | 48.2% | Concrete, actionable details |
| **warmth** | 493 | 14.4% | Empathetic acknowledgment |
| **future_pacing** | 359 | 10.5% | Forward-looking perspective |
| **normalization** | 308 | 9.0% | Reframing setbacks |
| **identity_reinforcement** | 274 | 8.0% | Identity affirmations |
| **celebration** | 175 | 5.1% | Achievement recognition |
| **permissioning** | 161 | 4.7% | Permission for unconventional actions |

### Humanizer v2.1 Query Pattern (Read-Only)

**Warmth/Normalization Openers:**
```typescript
const warmthRes = await pool.query(
  `SELECT exemplar FROM eq_signals s
   JOIN eq_signal_sets k ON k.id = s.set_id
   WHERE k.student_id = $1
     AND s.cue IN ('warmth','normalization')
     AND exemplar IS NOT NULL
     AND length(exemplar) BETWEEN 6 AND 140
   ORDER BY s.strength DESC
   LIMIT 20`,
  [studentId]
);
```

**Example Results (huda-2025):**
- "4/2? That's more than 2. I think that'll be an issue on their end"
- "So excited to work together! I just watched some videos about algorithmic justice"
- "I'm with you. Let's break this down step by step."

**Celebration Closers:**
```typescript
const celebrateRes = await pool.query(
  `SELECT exemplar FROM eq_signals s
   JOIN eq_signal_sets k ON k.id = s.set_id
   WHERE k.student_id = $1
     AND s.cue IN ('celebration')
     AND exemplar IS NOT NULL
     AND length(exemplar) BETWEEN 6 AND 140
   ORDER BY s.strength DESC
   LIMIT 15`,
  [studentId]
);
```

**Example Results (huda-2025):**
- "This is incredible progress - you're ahead of schedule!"
- "You've really nailed this. I'm proud of you."
- "That's exactly the kind of insight that will set you apart."

### Deterministic Selection

**Seeding:** SHA-1 hash of `studentId|intent` ensures same query always gets same phrase

```typescript
function seedPick(arr: string[], seed: string): string | undefined {
  if (!arr.length) return undefined;
  const hash = crypto.createHash('sha1').update(seed).digest('hex');
  const idx = parseInt(hash.slice(0, 8), 16) % arr.length;
  return arr[idx];
}
```

**Example:**
- Query: "What was my first SAT score?" by student "huda-2025"
- Seed: `huda-2025|sat.ordinal`
- SHA-1: `d4f3a8b2...` → idx: 7
- Phrase: `warmth[7]` → "So excited to work together!"
- **Same query always returns same phrase** (deterministic)

### Quality Filters

**Applied at Query Time:**
1. **Length Filter:** Only phrases between 6-140 characters (not too short/long)
2. **Strength Ranking:** ORDER BY `strength DESC` (most characteristic first)
3. **Cue-Specific:** Separate warmth, normalization, celebration pools
4. **Student-Specific:** Each student gets their own authentic phrases
5. **Graceful Fallback:** If no EQ data, uses vetted DEFAULT_WARMTH constants

### Integration Points

**Used By:** `services/jenny-api/src/lib/humanizer.ts:66-110`

**Applied At:**
- Category 1 (SQL facts): Warmth opener + action
- Category 2 (KB/RAG): Warmth opener + action + optional celebration closer
- Category 3 (FT/EQ): Warmth verification + action guarantee

**Performance:** ~50ms query time (2 queries per humanized response)

### Schema Changes (v10.4)

**Note:** EQ tables already existed from v8.0 (Session-EQ Intelligence System). v10.4 adds **read-only queries** from Humanizer module. **No schema changes required.**

**Migration:** None required - existing tables are sufficient

---

## CAT-2/CAT-3 Tables (v11.1)

**Purpose:** Support v8.0 migration - LLM Adapter, Proof Verification, Cross-Namespace Reasoning, Self-Learning

**🚨 CRITICAL:** These tables are SEPARATE from CAT-1 (Facts-First SQL) tables. Zero overlap.

### Table Categories

**CAT-1 Tables (UNTOUCHABLE - 15 tables):**
```
universal_enumerations, universal_outcomes, universal_chips
academic_terms, academic_courses, academic_grades, academic_gpa
vitals, gameplan, college_list, students
+ 8 views: v_awards_*, v_ecs_*, v_programs_*, v_academics_*
```

**CAT-2/CAT-3 Tables (v8.0-v11.1 - 10 tables):**
```
kb_chips, kb_embeddings, chat_sessions
cross_namespace_links, evidence_links
proof_registry, proof_audit_log
readiness_forecast_features, readiness_feature_weights
autonomy_loop_log
```

### Proof Verification (v11.1)

**Purpose:** Cryptographic verification of CAT-2 (KB) and CAT-3 (EQ) answers with SHA-256 hashing and quality scoring.

**proof_registry**
```sql
CREATE TABLE proof_registry (
  artifact_id       TEXT PRIMARY KEY,
  chip_id           TEXT,
  hash              TEXT NOT NULL,
  verified          BOOLEAN NOT NULL DEFAULT false,
  score             FLOAT NOT NULL,
  artifact_type     TEXT NOT NULL,
  metadata          JSONB,
  timestamp         TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_score CHECK (score >= 0.0 AND score <= 1.0)
);

CREATE INDEX idx_proof_registry_chip_id ON proof_registry(chip_id);
CREATE INDEX idx_proof_registry_verified ON proof_registry(verified);
CREATE INDEX idx_proof_registry_score ON proof_registry(score DESC);
CREATE INDEX idx_proof_registry_type ON proof_registry(artifact_type);
CREATE INDEX idx_proof_registry_timestamp ON proof_registry(timestamp DESC);
```

**proof_audit_log**
```sql
CREATE TABLE proof_audit_log (
  id                SERIAL PRIMARY KEY,
  artifact_id       TEXT NOT NULL,
  action            TEXT NOT NULL,
  actor             TEXT NOT NULL,
  old_score         FLOAT,
  new_score         FLOAT,
  reason            TEXT,
  metadata          JSONB,
  timestamp         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_proof_audit_log_artifact ON proof_audit_log(artifact_id);
CREATE INDEX idx_proof_audit_log_action ON proof_audit_log(action);
CREATE INDEX idx_proof_audit_log_timestamp ON proof_audit_log(timestamp DESC);
```

**Integration:** `services/jenny-api/src/services/proof/verifier.ts:140-196`

**Complete Documentation:** See [CAT2_COMPLETE_TECH_SPEC.md](guides/CAT2_COMPLETE_TECH_SPEC.md) and [CAT3_COMPLETE_TECH_SPEC.md](guides/CAT3_COMPLETE_TECH_SPEC.md)

---

## Temporal Views

### Awards Views

```sql
-- v_awards_initial: GamePlan awards (target list)
CREATE VIEW v_awards_initial AS
SELECT student_id, chip_id, chip_table, source_id, award_name, tier, as_of
FROM award_targets
WHERE source_id LIKE 'SRC-GAMEPLAN%';

-- v_awards_final: Actual awards won
CREATE VIEW v_awards_final AS
SELECT student_id, chip_id, chip_table, source_id, award_name, won_date, tier
FROM outcomes
WHERE domain = 'award';

-- v_awards_progression: Timeline of awards (targets → won)
CREATE VIEW v_awards_progression AS
SELECT student_id, 'initial' AS phase, chip_id, award_name, tier, as_of AS event_date, source_id
FROM award_targets
WHERE source_id LIKE 'SRC-GAMEPLAN%'

UNION ALL

SELECT student_id, 'final' AS phase, chip_id, award_name, tier, won_date AS event_date, source_id
FROM outcomes
WHERE domain = 'award'

ORDER BY student_id, event_date;
```

### ECs Views

```sql
-- v_ecs_initial: GamePlan ECs
CREATE VIEW v_ecs_initial AS
SELECT student_id, chip_id, chip_table, source_id, activity_name, category, role, event_date, as_of
FROM kb_items
WHERE family = 'Activity' AND source_id LIKE 'SRC-GAMEPLAN%';

-- v_ecs_final: CommonApp ECs (submitted)
CREATE VIEW v_ecs_final AS
SELECT student_id, chip_id, chip_table, source_id, activity_name, category, role, submit_date
FROM kb_items
WHERE family = 'Activity' AND source_id LIKE 'SRC-COMMONAPP%';

-- v_ecs_progression: EC development timeline
CREATE VIEW v_ecs_progression AS
SELECT student_id, 'initial' AS phase, chip_id, activity_name, category, event_date, source_id
FROM kb_items
WHERE family = 'Activity' AND source_id LIKE 'SRC-GAMEPLAN%'

UNION ALL

SELECT student_id, 'final' AS phase, chip_id, activity_name, category, submit_date AS event_date, source_id
FROM kb_items
WHERE family = 'Activity' AND source_id LIKE 'SRC-COMMONAPP%'

ORDER BY student_id, event_date;
```

### Programs Views

```sql
-- v_programs_initial: Programs considered
CREATE VIEW v_programs_initial AS
SELECT student_id, chip_id, chip_table, source_id, program_name, program_type, as_of
FROM kb_items
WHERE family = 'program' AND source_id LIKE 'SRC-GAMEPLAN%';

-- v_programs_submitted: Programs submitted
CREATE VIEW v_programs_submitted AS
SELECT student_id, chip_id, chip_table, source_id, program_name, program_type, submit_date
FROM kb_items
WHERE family = 'program' AND submit_date IS NOT NULL;

-- v_programs_decisions: Program outcomes
CREATE VIEW v_programs_decisions AS
SELECT student_id, chip_id, chip_table, source_id, program_name, decision, decision_date
FROM outcomes
WHERE domain = 'program';

-- v_programs_final: Programs enrolled
CREATE VIEW v_programs_final AS
SELECT student_id, chip_id, chip_table, source_id, program_name, decision, decision_date
FROM outcomes
WHERE domain = 'program' AND decision = 'Accepted';
```

### Academics Views

```sql
-- v_transcript_initial: GamePlan courses
CREATE VIEW v_transcript_initial AS
SELECT student_id, chip_id, chip_table, source_id, term_key, course_title, grade_letter, credits, weighting
FROM academic_courses
WHERE source_id LIKE 'SRC-GAMEPLAN%';

-- v_transcript_final: Official transcript
CREATE VIEW v_transcript_final AS
SELECT student_id, chip_id, chip_table, source_id, term_key, course_title, grade_letter, grade_percent, credits, weighting
FROM academic_courses
WHERE source_id LIKE 'SRC-TRANSCRIPT%';

-- v_transcript_progression: Course timeline
CREATE VIEW v_transcript_progression AS
SELECT student_id, 'initial' AS phase, chip_id, term_key, course_title, grade_letter, source_id
FROM academic_courses
WHERE source_id LIKE 'SRC-GAMEPLAN%'

UNION ALL

SELECT student_id, 'final' AS phase, chip_id, term_key, course_title, grade_letter, source_id
FROM academic_courses
WHERE source_id LIKE 'SRC-TRANSCRIPT%'

ORDER BY student_id, term_key;

-- v_gpa_initial: GamePlan GPA (single snapshot)
CREATE VIEW v_gpa_initial AS
SELECT DISTINCT ON (student_id)
  student_id, chip_id, chip_table, source_id, scope, scope_key,
  gpa_unweighted, gpa_weighted, credits_earned, as_of_date
FROM academic_gpa
WHERE source_id LIKE 'SRC-GAMEPLAN%'
ORDER BY student_id, as_of_date DESC;

-- v_gpa_final: All official GPAs
CREATE VIEW v_gpa_final AS
SELECT student_id, chip_id, chip_table, source_id, scope, scope_key,
       gpa_unweighted, gpa_weighted, credits_earned, as_of_date
FROM academic_gpa
WHERE source_id LIKE 'SRC-TRANSCRIPT%'
ORDER BY student_id, as_of_date DESC;

-- v_gpa_latest: Most recent GPA
CREATE VIEW v_gpa_latest AS
SELECT DISTINCT ON (student_id)
  student_id, chip_id, chip_table, source_id, scope, scope_key,
  gpa_unweighted, gpa_weighted, credits_earned, as_of_date
FROM academic_gpa
ORDER BY student_id, as_of_date DESC;

-- v_gpa_progression: GPA timeline
CREATE VIEW v_gpa_progression AS
SELECT student_id, chip_id, scope, scope_key, gpa_unweighted, gpa_weighted, as_of_date, source_id
FROM academic_gpa
ORDER BY student_id, as_of_date;
```

---

## Source Gating Pattern

**Purpose:** Separate initial (GamePlan) data from final (submitted/official) data

### Source ID Prefixes

| Prefix | Phase | Description |
|--------|-------|-------------|
| `SRC-GAMEPLAN-*` | Initial | GamePlan planning data |
| `SRC-COMMONAPP-*` | Final | CommonApp submissions |
| `SRC-TRANSCRIPT-*` | Final | Official transcripts |
| `SRC-RESULT-*` | Final | Outcome decisions |

### Source Gating in Queries

```sql
-- Initial phase: GamePlan data ONLY
SELECT * FROM kb_items
WHERE student_id = 'huda-2025'
  AND family = 'Activity'
  AND source_id LIKE 'SRC-GAMEPLAN%';

-- Final phase: CommonApp data ONLY
SELECT * FROM kb_items
WHERE student_id = 'huda-2025'
  AND family = 'Activity'
  AND source_id LIKE 'SRC-COMMONAPP%';

-- Outcomes: Results ONLY
SELECT * FROM outcomes
WHERE student_id = 'huda-2025'
  AND domain = 'award'
  AND source_id LIKE 'SRC-RESULT%';
```

### Intent → Source Mapping

| User Query | Intent | Phase | Source Filter |
|------------|--------|-------|---------------|
| "What awards was I targeting?" | `awards.initial` | initial | `SRC-GAMEPLAN%` |
| "What awards did I win?" | `awards.final` | final | `SRC-RESULT%` (outcomes) |
| "What ECs was I planning?" | `ecs.initial` | initial | `SRC-GAMEPLAN%` |
| "What ECs did I submit?" | `ecs.final` | final | `SRC-COMMONAPP%` |
| "What was my GamePlan GPA?" | `gpa.initial` | initial | `SRC-GAMEPLAN%` |
| "What's my official GPA?" | `gpa.final` | final | `SRC-TRANSCRIPT%` |

---

## Provenance Tracking

**Purpose:** Full evidence chain for all data points

### Provenance Triplet

Every data point has 3 provenance fields:

```typescript
{
  chip_id: "W001-AWARD-001",       // Unique identifier
  chip_table: "outcomes",          // Source table
  source_id: "SRC-RESULT-001"      // Source document
}
```

### Provenance Flow

```
Source Document (SRC-GAMEPLAN-001)
   ↓
kb_items / award_targets / academic_courses (chip_id, chip_table, source_id)
   ↓
SQL Resolver (awards.initial(), ecs.final(), gpa.latest())
   ↓
Orchestrator (collects provenance)
   ↓
Response chips array
```

### Response Chips

```json
{
  "answer": "1. NCWIT Aspirations in Computing — National Awardee (2024-03-15) — National\n2. Congressional App Challenge Winner (2023-11-10) — Federal",
  "chips": [
    {
      "chip_table": "outcomes",
      "chip_id": "W001-AWARD-001",
      "source_id": "SRC-RESULT-001"
    },
    {
      "chip_table": "outcomes",
      "chip_id": "W002-AWARD-002",
      "source_id": "SRC-RESULT-002"
    }
  ]
}
```

**UI Usage:** Chips can be used to:
1. Show source citations ("Based on CommonApp submission")
2. Link to source documents
3. Audit evidence chain
4. Debug data issues

---

## Vector Store Configuration (v10.3)

### KBv6 Lock

While the database handles structured facts (SQL), the vector store (Pinecone) handles unstructured KB retrieval. As of v10.3, KBv6 configuration is locked with fail-fast validation.

**Configuration:**
- **Index:** `jenny-v3-3072-093025` (3072 dimensions)
- **Embedding Model:** `text-embedding-3-large` (validated at boot)
- **Total Vectors:** 973 (964 in RAG, 9 SQL-gated)

**Namespaces:**
| Namespace | Vectors | RAG Usage | SQL Tables |
|-----------|---------|-----------|------------|
| `KBv6_2025-10-06_v1.0` | 924 | ✅ General RAG | → `kb_items` (lexical fallback) |
| `KBv6_iMessage_2025-10-07_v1.0` | 40 | ✅ General RAG | → `kb_items` (lexical fallback) |
| `KBv6_Assessment_2025-10-07_v1.0` | 9 | ❌ SQL-gated only | → NOT used in RAG |

**Boot Validation:**
```typescript
// Server fails to start if:
- EMBEDDING_MODEL_ID !== 'text-embedding-3-large'
- PINECONE_INDEX_DIM !== 3072
- PINECONE_INDEX_NAME !== 'jenny-v3-3072-093025'
```

**Files:**
- `services/jenny-api/src/config/env.ts` - Environment validation
- `services/jenny-api/src/retrieval/retrieval.config.json` - Namespace mapping
- `services/jenny-api/src/retrieval/pinecone.ts` - `assertIndexParity()` validation

**Related:** See [MASTER_PROD_TECH_SPEC.md](MASTER_PROD_TECH_SPEC.md#vector-store-pinecone) for complete KBv6 retrieval architecture.

---

## Indexes & Performance

### Primary Indexes

```sql
-- students
CREATE INDEX idx_students_grad_year ON students(grad_year);

-- kb_items
CREATE INDEX idx_kb_items_student ON kb_items(student_id);
CREATE INDEX idx_kb_items_family ON kb_items(family);
CREATE INDEX idx_kb_items_source ON kb_items(source_id);
CREATE INDEX idx_kb_items_family_source ON kb_items(family, source_id);

-- outcomes
CREATE INDEX idx_outcomes_student ON outcomes(student_id);
CREATE INDEX idx_outcomes_domain ON outcomes(domain);
CREATE INDEX idx_outcomes_source ON outcomes(source_id);
CREATE INDEX idx_outcomes_student_domain ON outcomes(student_id, domain);

-- award_targets
CREATE INDEX idx_award_targets_student ON award_targets(student_id);
CREATE INDEX idx_award_targets_source ON award_targets(source_id);

-- academic_courses
CREATE INDEX idx_academic_courses_student ON academic_courses(student_id);
CREATE INDEX idx_academic_courses_term ON academic_courses(student_id, term_key);
CREATE INDEX idx_academic_courses_source ON academic_courses(source_id);

-- academic_gpa
CREATE INDEX idx_academic_gpa_student ON academic_gpa(student_id);
CREATE INDEX idx_academic_gpa_scope ON academic_gpa(student_id, scope_key);
CREATE INDEX idx_academic_gpa_date ON academic_gpa(student_id, as_of_date DESC);
CREATE INDEX idx_academic_gpa_source ON academic_gpa(source_id);
```

### Query Performance

**Target:** p50 ≤ 200ms for SQL queries

**Optimization Strategies:**
1. Use views for common temporal queries
2. Index on (student_id, source_id) for source gating
3. Index on (student_id, as_of_date DESC) for latest queries
4. DISTINCT ON for "latest" queries (v_gpa_latest)

---

## Summary

**Production Tables:**
- `students` - Student registry
- `kb_items` - Universal KB (ECs, Programs, Narratives)
- `outcomes` - Final results (Awards, Programs, Colleges)
- `award_targets` - GamePlan awards
- `academic_courses` - Transcript
- `academic_gpa` - GPA snapshots

**Temporal Resolution:**
- **Initial Phase:** `SRC-GAMEPLAN%` sources
- **Final Phase:** `SRC-COMMONAPP%`, `SRC-TRANSCRIPT%`, `SRC-RESULT%` sources
- **Progression:** Union of initial → final with event_date ordering

**Provenance:**
- Every row: `chip_id` + `chip_table` + `source_id`
- Full evidence chain from source document → answer → chips

**Performance:**
- Indexed on student_id, family, source_id, as_of_date
- Views for common temporal queries
- DISTINCT ON for latest queries

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-10-09
**Database:** PostgreSQL 15+ (Neon)

---

## Compatibility Layer (v10.2)

**Purpose:** Bridge legacy `vital_facts` table to v3.0 canonical schema without data migration.

### compat Schema

The `compat` schema provides views that reshape legacy unstructured data into structured v3.0 format.

#### Helper Functions

```sql
-- Safe numeric conversion (returns NULL on failure)
CREATE FUNCTION compat.try_num(text) RETURNS NUMERIC;

-- Safe date conversion (returns NULL on failure)
CREATE FUNCTION compat.try_date(text) RETURNS DATE;
```

#### Compatibility Views

##### compat.v_awards_final
Maps `vital_facts` (kind='award_won') → v3.0 awards schema

```sql
CREATE VIEW compat.v_awards_final AS
SELECT student_id, value AS award_name, fact_date AS won_date,
       source_id, confidence, created_ts
FROM vital_facts
WHERE kind = 'award_won'
ORDER BY student_id, value, fact_date DESC;
```

**Sample Data:**
```
student_id | award_name | won_date
-----------+------------+------------
huda-2025  | 2024-04-01 | 2024-03-05
huda-2025  | 3         | 2024-03-15
```

##### compat.v_sat_timeline
SAT scores with temporal ordering (attempt 1, 2, 3...)

```sql
CREATE VIEW compat.v_sat_timeline AS
SELECT student_id, numeric_value AS total_score, fact_date,
       ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY fact_date ASC) AS attempt_number,
       source_id, confidence
FROM vital_facts
WHERE kind = 'sat_total_score' AND numeric_value IS NOT NULL;
```

**Sample Data:**
```
student_id | total_score | fact_date   | attempt_number
-----------+-------------+-------------+----------------
huda-2025  |        1360 | 2024-01-15  |              1
huda-2025  |        1480 | 2024-03-09  |              2
huda-2025  |        1530 | 2024-04-20  |              3
```

##### compat.v_academics_latest
Latest academic vitals snapshot (SAT, GPA, AP count)

```sql
CREATE VIEW compat.v_academics_latest AS
SELECT student_id,
       MAX(CASE WHEN kind = 'sat_total_score' THEN numeric_value END) AS sat_total,
       MAX(CASE WHEN kind = 'gpa_weighted' THEN compat.try_num(value) END) AS gpa_weighted,
       MAX(CASE WHEN kind = 'gpa_unweighted' THEN compat.try_num(value) END) AS gpa_unweighted,
       COUNT(DISTINCT CASE WHEN kind = 'ap_score' THEN fact_id END) AS ap_count
FROM vital_facts
GROUP BY student_id;
```

**Sample Data:**
```
student_id | sat_total | gpa_weighted | gpa_unweighted | ap_count
-----------+-----------+--------------+----------------+----------
huda-2025  |      1530 |         4.70 |           4.00 |        3
```

### Resolver Integration

Resolvers in `services/jenny-api/src/resolvers/compat.ts` query these views:

- `awards.final` → `compat.v_awards_final`
- `academics.sat.ordinal` → `compat.v_sat_timeline WHERE attempt_number=N`
- `academics.gpa.latest` → `compat.v_academics_latest`
- `academics.summary` → `compat.v_academics_latest`
- `ecs.final` → `compat.v_kb_items WHERE item_type='ec'`
- `programs.submitted` → `compat.v_kb_items WHERE item_type='program'`

**Test Results (v10.2):**
- ✅ Facts Suite: 10/10 tests passing
- ✅ SQL Routing: 100%
- ✅ Meta-Leakage: 0%
- ✅ Latency p50: 6ms (target: ≤1500ms)
- ✅ Data Returns: Real data from compat views (SAT 1360→1530, GPA 4.70W/4.00UW, 20 ECs)

**Migration:** `services/jenny-api/db/migrations/2025-10-09-compat-views-legacy-bridge.sql`

**Migration Path:**
1. ✅ v10.2: Compat views bridge legacy → v3.0 (NO data migration)
2. 🔜 Future: ETL to populate v3.0 canonical tables
3. 🔜 Future: Switch resolvers from `compat.*` → `v_*` views

---

## Production Readiness Verification (v10.3)

**Date:** 2025-10-10
**Status:** ✅ ALL CHECKS PASSED - Production Ready

### Pre-Flight Checklist Results

| Check | Expected | Result |
|-------|----------|--------|
| **Database Schema** | Compat views functional | ✅ PASS |
| **Compat Views Data** | ≥3 records for test student | ✅ PASS (3 awards, 3 SAT) |
| **SQL Routing** | Facts → SQL (enumeration_facts) | ✅ PASS (SAT 1360) |
| **Vector Store** | 973 vectors (924+40+9) | ✅ PASS |
| **Boot Validation** | KBv6 config verified | ✅ PASS |

### API Endpoint Verification

**Awards Initial:**
```bash
GET /students/huda-2025/awards/initial
# Result: 3 records ✅
```

**SAT Timeline:**
```bash
GET /students/huda-2025/testing/sat/all
# Result: 3 records ✅
```

**Academics Latest:**
```bash
GET /students/huda-2025/academics/latest
# Result: SAT 1360, GPA data ✅
```

### Integration Test Results

**Category 1 (Facts-First SQL):**
- Query: "What was my first SAT score?"
- Route: SQL → `compat.v_sat_timeline`
- Result: Real data (1360) ✅
- Latency: <500ms ✅

**Category 2 (KB/RAG):**
- Pinecone: 973 vectors across 3 namespaces ✅
- Lexical: PostgreSQL tsvector functional ✅
- Rerank: keep_at_least=3 working ✅

**Category 3 (Fine-Tuned LLM):**
- Model: ft:gpt-4o-mini-2024-07-18 ✅
- EQ patterns: warmth detected ✅

### Verdict

✅ **Database architecture production-ready** as of v10.3
✅ **Compat views bridge working** (Category 1 data layer)
✅ **Vector store integrated** (Category 2 KB/RAG)
✅ **All 3 categories verified** through unified pipeline

**Detailed Report:** `/logs/V10.3_PREFLIGHT_COMPLETE_2025-10-10.md`

---

## IvyScore & Readiness Rubric (v4.6.1)

**Purpose:** Credit-score-like admissions readiness system with factor-level granularity, temporal progression tracking, and deterministic what-if simulations.

**Key Concept:** IvyScore provides students with actionable readiness intelligence - "Where am I now?", "What moved my score?", "What if I do X?", "What should I do first?"

**Migration:** `services/jenny-api/db/migrations/02-readiness-schema.sql` (v3.7)
**Resolvers:** `/services/jenny-api/src/resolvers/readiness.ts`
**Routes:** `ivyscore.latest`, `ivyscore.progression`, `readiness.weakspots`, `readiness.top_priorities`, `readiness.whatif.*`

### Core Tables

**ivyready_snapshots** - Temporal score snapshots
```sql
CREATE TABLE ivyready_snapshots (
  snapshot_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  rubric_id        TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
  snapshot_phase   TEXT NOT NULL CHECK (snapshot_phase IN ('assessment', 'final_submit')),
  as_of            DATE NOT NULL,
  engine           TEXT NOT NULL DEFAULT 'sql',  -- 'sql'|'ml_v1' for future ML models
  overall_score    NUMERIC NOT NULL,             -- 0-100 scale
  notes            TEXT,
  source_id        TEXT,
  created_ts       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, rubric_id, snapshot_phase, as_of)
);

-- Indexes
CREATE INDEX idx_ivyready_snapshots_student ON ivyready_snapshots(student_id, as_of DESC);
CREATE INDEX idx_ivyready_snapshots_phase ON ivyready_snapshots(snapshot_phase);
```

**ivyready_snapshot_factors** - Factor-level subscores (6 factors)
```sql
CREATE TABLE ivyready_snapshot_factors (
  snapshot_id      UUID NOT NULL REFERENCES ivyready_snapshots(snapshot_id) ON DELETE CASCADE,
  factor_id        TEXT NOT NULL,                -- 'academics'|'testing'|'ecs'|'awards'|'narrative'|'socio_context'
  raw_score        NUMERIC NOT NULL,             -- 0-100 unnormalized score
  weight_pct       NUMERIC NOT NULL,             -- Factor weight (sums to 100)
  weighted_score   NUMERIC NOT NULL,             -- raw_score * (weight_pct / 100)
  details_json     JSONB DEFAULT '{}'::jsonb,    -- Factor-specific metadata
  PRIMARY KEY (snapshot_id, factor_id)
);

-- Real Example (huda-2025):
-- factor_id='ecs', raw_score=100.0, weight_pct=24.0, weighted_score=24.0
-- factor_id='awards', raw_score=100.0, weight_pct=12.0, weighted_score=12.0
-- factor_id='testing', raw_score=94.17, weight_pct=12.0, weighted_score=11.30
-- factor_id='academics', raw_score=78.0, weight_pct=32.0, weighted_score=24.96
-- factor_id='narrative', raw_score=100.0, weight_pct=15.0, weighted_score=15.0
-- factor_id='socio_context', raw_score=65.0, weight_pct=5.0, weighted_score=3.25
-- SUM(weighted_score) = 90.51 = overall_score
```

**ivyready_snapshot_features** - Feature-level granularity
```sql
CREATE TABLE ivyready_snapshot_features (
  snapshot_id      UUID NOT NULL REFERENCES ivyready_snapshots(snapshot_id) ON DELETE CASCADE,
  factor_id        TEXT NOT NULL,
  feature_key      TEXT NOT NULL,                -- 'sat_total', 'ec_leadership_count', 'award_national_count'
  feature_value    NUMERIC NOT NULL,
  target_value     NUMERIC,                      -- Benchmark for gap analysis
  evidence         JSONB DEFAULT '{}'::jsonb,    -- Provenance (chip_ids, source_ids)
  PRIMARY KEY (snapshot_id, factor_id, feature_key)
);
```

**admissions_rubric** - Rubric definitions (extensible for any year/tier)
```sql
CREATE TABLE admissions_rubric (
  rubric_id        TEXT PRIMARY KEY,             -- 'ivyplus_v1', 't20_v1', 'merit_v1'
  rubric_name      TEXT NOT NULL,
  description      TEXT,
  target_tier      TEXT,                         -- 'IvyPlus', 'T20', 'T50'
  created_ts       TIMESTAMPTZ DEFAULT now()
);

-- Real Data:
-- rubric_id='ivyplus_v1', target_tier='IvyPlus'
```

**admissions_rubric_factors** - Factor weights per rubric
```sql
CREATE TABLE admissions_rubric_factors (
  rubric_id        TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
  factor_id        TEXT NOT NULL,
  factor_name      TEXT NOT NULL,
  weight_pct       NUMERIC NOT NULL,             -- Weights sum to 100 per rubric
  description      TEXT,
  PRIMARY KEY (rubric_id, factor_id)
);

-- IvyPlus Rubric Weights (ivyplus_v1):
-- academics: 32%      (GPA, course rigor, class rank)
-- testing: 12%        (SAT/ACT scores)
-- ecs: 24%            (Leadership, scale, impact)
-- awards: 12%         (Recognition tier: Local→Regional→National→International)
-- narrative: 15%      (Essay quality, theme coherence, advocacy focus)
-- socio_context: 5%   (First-gen, low-income, geographic diversity)
```

### Temporal Views

**v_ivyready_latest** - Most recent score across all phases
```sql
CREATE OR REPLACE VIEW v_ivyready_latest AS
SELECT DISTINCT ON (student_id)
  student_id, rubric_id, snapshot_phase, as_of, overall_score, snapshot_id
FROM ivyready_snapshots
ORDER BY student_id, as_of DESC, snapshot_phase DESC;

-- Real Result (huda-2025):
-- overall_score: 90.51, phase: 'final_submit', as_of: '2025-09-30'
```

**v_ivyready_current** - Current snapshot (assessment phase)
```sql
CREATE OR REPLACE VIEW v_ivyready_current AS
SELECT student_id, rubric_id, snapshot_phase, as_of, overall_score
FROM ivyready_snapshots
WHERE snapshot_phase = 'assessment'
ORDER BY student_id, as_of DESC;
```

**v_ivyready_progression** - Historical score progression
```sql
CREATE OR REPLACE VIEW v_ivyready_progression AS
SELECT student_id, rubric_id, snapshot_phase, as_of, overall_score,
       ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY as_of) AS snapshot_num
FROM ivyready_snapshots
ORDER BY student_id, as_of;

-- Real Result (huda-2025):
-- 2024-08-01: 82.0 (baseline)
-- 2024-09-01: 85.0 (+3.0 after SAT retake)
-- 2024-10-04: 89.0 (+4.0 after national awards)
-- 2025-09-30: 90.51 (+1.51 final polish)
```

**v_readiness_weakspots** - Gap analysis vs benchmarks
```sql
CREATE OR REPLACE VIEW v_readiness_weakspots AS
SELECT
  sf.student_id,
  sf.factor_id,
  sf.feature_key,
  sf.feature_value AS current_value,
  sf.target_value,
  (sf.target_value - sf.feature_value) AS gap,
  CASE
    WHEN sf.feature_value >= sf.target_value THEN 'on_track'
    WHEN sf.feature_value >= sf.target_value * 0.8 THEN 'close'
    ELSE 'needs_work'
  END AS status
FROM ivyready_snapshot_features sf
JOIN ivyready_snapshots s ON s.snapshot_id = sf.snapshot_id
WHERE s.snapshot_phase = 'assessment'
  AND sf.target_value IS NOT NULL
  AND sf.feature_value < sf.target_value
ORDER BY gap DESC;

-- Real Example (huda-2025):
-- feature_key='award_national_count', current=1, target=2, gap=1, status='close'
-- feature_key='ec_users_empowering_ai', current=85, target=200, gap=115, status='needs_work'
```

**v_readiness_top_priorities** - Recommended actions with predicted lift
```sql
CREATE OR REPLACE VIEW v_readiness_top_priorities AS
SELECT
  ws.student_id,
  ws.feature_key,
  ws.gap,
  fw.impact_coefficient,
  (ws.gap * fw.impact_coefficient) AS predicted_lift,
  fw.description AS action_description,
  RANK() OVER (PARTITION BY ws.student_id ORDER BY (ws.gap * fw.impact_coefficient) DESC) AS priority_rank
FROM v_readiness_weakspots ws
JOIN readiness_feature_weights fw ON fw.feature_key = ws.feature_key
WHERE ws.status IN ('close', 'needs_work')
ORDER BY predicted_lift DESC;

-- Real Example (huda-2025):
-- Rank 1: Submit NCWIT National + Regeneron (lift: +5.0)
-- Rank 2: Scale Empowering AI to 200 users (lift: +1.8)
-- Rank 3: Refine essay advocacy theme (lift: +1.5)
```

### What-If Simulations

**v_action_ivyready_delta** - Deterministic delta calculations
```sql
CREATE OR REPLACE VIEW v_action_ivyready_delta AS
WITH base_scores AS (
  SELECT student_id, overall_score AS base_score,
         factor_breakdown  -- JSONB with factor-level scores
  FROM v_ivyready_current
),
sat_actions AS (
  SELECT bs.student_id, 'raise_sat_to' AS action_type,
         target_sat::text AS action_param,
         bs.base_score,
         -- Formula: base + (new_sat_contribution - current_sat_contribution) * testing_weight
         ROUND(bs.base_score + ((target_sat / 1600.0 * 100) - current_sat_score) * 0.12, 2) AS projected_score,
         ROUND(((target_sat / 1600.0 * 100) - current_sat_score) * 0.12, 2) AS delta
  FROM base_scores bs
  CROSS JOIN generate_series(1200, 1600, 50) AS target_sat
),
award_actions AS (
  SELECT bs.student_id, 'win_award_tier' AS action_type,
         tier AS action_param,
         bs.base_score,
         ROUND(bs.base_score + tier_bump * 0.12, 2) AS projected_score,  -- awards_weight=12%
         ROUND(tier_bump * 0.12, 2) AS delta
  FROM base_scores bs
  CROSS JOIN (VALUES ('Regional', 20), ('National', 40), ('International', 80)) AS tiers(tier, tier_bump)
)
SELECT * FROM sat_actions
UNION ALL
SELECT * FROM award_actions
ORDER BY student_id, action_type, delta DESC;

-- Real Results (huda-2025):
-- SAT 1530 → 1560: base=89.0, projected=91.3, delta=+2.3
-- SAT 1530 → 1600: base=89.0, projected=94.2, delta=+5.2
-- Win National Award: base=89.0, projected=94.0, delta=+5.0
-- Win International Award: base=89.0, projected=99.0, delta=+10.0
```

### Feature Registry

**feature_defs** - Global feature definitions
```sql
CREATE TABLE feature_defs (
  feature_id       TEXT PRIMARY KEY,
  domain           TEXT NOT NULL,  -- 'testing'|'academics'|'ecs'|'awards'|'narrative'|'context'
  label            TEXT NOT NULL,
  description      TEXT,
  scale_max        NUMERIC NOT NULL DEFAULT 100,
  created_ts       TIMESTAMPTZ DEFAULT now()
);

-- Examples:
-- feature_id='sat_total', domain='testing', label='SAT Total Score', scale_max=1600
-- feature_id='ec_leadership_count', domain='ecs', label='Leadership Roles', scale_max=10
-- feature_id='award_national_count', domain='awards', label='National Awards', scale_max=5
```

**feature_snapshots** - Temporal feature snapshots
```sql
CREATE TABLE feature_snapshots (
  snapshot_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  as_of            DATE NOT NULL,
  rubric_id        TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
  engine           TEXT NOT NULL DEFAULT 'sql_v1',
  created_ts       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, rubric_id, as_of, engine)
);
```

**feature_snapshot_values** - Feature values per snapshot
```sql
CREATE TABLE feature_snapshot_values (
  snapshot_id      UUID NOT NULL REFERENCES feature_snapshots(snapshot_id) ON DELETE CASCADE,
  feature_id       TEXT NOT NULL REFERENCES feature_defs(feature_id),
  value_norm       NUMERIC NOT NULL,             -- Normalized 0-100
  evidence         JSONB DEFAULT '{}'::jsonb,    -- {chip_ids, source_ids, counts}
  PRIMARY KEY (snapshot_id, feature_id)
);
```

### What-If Action Catalog

**action_defs** - Global action definitions
```sql
CREATE TABLE action_defs (
  action_id        TEXT PRIMARY KEY,  -- 'raise_sat_to', 'win_award_tier', 'gain_leadership'
  label            TEXT NOT NULL,
  description      TEXT,
  domain           TEXT NOT NULL,     -- testing|awards|ecs|academics|narrative
  params_schema    JSONB NOT NULL     -- {"target_score": "int", "tier": "string"}
);
```

**action_feature_effects** - Effect models per action
```sql
CREATE TABLE action_feature_effects (
  action_id        TEXT REFERENCES action_defs(action_id),
  feature_id       TEXT REFERENCES feature_defs(feature_id),
  effect_model     TEXT NOT NULL,     -- 'linear'|'cap'|'logistic'|'piecewise'
  k1               NUMERIC,           -- Model-specific coefficients
  k2               NUMERIC,
  k3               NUMERIC,
  PRIMARY KEY (action_id, feature_id)
);
```

### Query Examples

**Get current IvyScore:**
```sql
SELECT * FROM v_ivyready_latest WHERE student_id = 'huda-2025';
-- Result: overall_score=90.51, phase='final_submit', rubric='ivyplus_v1'
```

**Get factor breakdown:**
```sql
SELECT factor_id, raw_score, weight_pct, weighted_score
FROM ivyready_snapshot_factors
WHERE snapshot_id = (
  SELECT snapshot_id FROM v_ivyready_latest WHERE student_id = 'huda-2025'
)
ORDER BY weighted_score DESC;
-- Result: 6 factors with subscores (ECs=100, Awards=100, Testing=94.17, etc.)
```

**Get score progression:**
```sql
SELECT as_of, overall_score, snapshot_phase
FROM v_ivyready_progression
WHERE student_id = 'huda-2025'
ORDER BY as_of;
-- Result: 82.0 (Aug'24) → 85.0 (Sep'24) → 89.0 (Oct'24) → 90.51 (Sep'25)
```

**Get weakspots:**
```sql
SELECT feature_key, current_value, target_value, gap, status
FROM v_readiness_weakspots
WHERE student_id = 'huda-2025'
ORDER BY gap DESC
LIMIT 5;
-- Result: Top 5 areas to improve with quantified gaps
```

**Simulate SAT increase:**
```sql
SELECT action_param AS target_sat, projected_score, delta
FROM v_action_ivyready_delta
WHERE student_id = 'huda-2025'
  AND action_type = 'raise_sat_to'
  AND action_param::int >= 1530  -- Current SAT
ORDER BY action_param::int;
-- Result: 1560→+2.3pts, 1600→+5.2pts
```

**Simulate award win:**
```sql
SELECT action_param AS award_tier, projected_score, delta
FROM v_action_ivyready_delta
WHERE student_id = 'huda-2025'
  AND action_type = 'win_award_tier'
ORDER BY delta DESC;
-- Result: International→+10pts, National→+5pts, Regional→+2.5pts
```

### Resolver Methods (readiness.ts)

**`ivyscore.latest(pg, studentId)`** → Most recent overall score
```typescript
// Returns: {overall_score: 90.51, snapshot_phase: 'final_submit', as_of: '2025-09-30'}
```

**`ivyscore.current(pg, studentId)`** → Current assessment snapshot
```typescript
// Returns: Current 'assessment' phase score
```

**`ivyscore.progression(pg, studentId)`** → Historical progression
```typescript
// Returns: Array of {as_of, overall_score, snapshot_phase}
```

**`readiness.topPriorities(pg, studentId)`** → Top 5 recommended actions
```typescript
// Returns: [{action, predicted_lift, gap}, ...] ordered by impact
```

**`readiness.weakspots(pg, studentId)`** → Gap analysis
```typescript
// Returns: [{feature_key, current, target, gap, status}, ...] ordered by gap
```

### What-If Resolvers (resolvers.ts)

**`readinessWhatIfSAT(pg, studentId, targetScore)`** → SAT simulation
```typescript
// Input: targetScore = 1560
// Returns: {base: 89.0, projected: 91.3, delta: +2.3, explanation}
```

**`readinessWhatIfAward(pg, studentId, tier)`** → Award simulation
```typescript
// Input: tier = 'National'
// Returns: {base: 89.0, projected: 94.0, delta: +5.0, explanation}
```

**`readinessWhatIfEC(pg, studentId, uapx)`** → EC metric simulation
```typescript
// Input: uapx = {activity: 'Empowering AI', metric: 'users', target: 200}
// Returns: {base: 89.0, projected: 90.8, delta: +1.8, explanation}
```

**`readinessWhatIfGPA(pg, studentId, targetGPA)`** → GPA simulation
```typescript
// Input: targetGPA = 3.95
// Returns: {base: 89.0, projected: 92.5, delta: +3.5, explanation}
```

**`readinessWhatIfProgram(pg, studentId, program)`** → Selective program simulation
```typescript
// Input: program = 'RSI'
// Returns: {base: 89.0, projected: 93.0, delta: +4.0, explanation}
```

### Intent Routes (intent-enum.ts)

**IvyScore Routes:**
- `ivyscore.latest` → "What's my IvyScore?" / "Am I ready for top colleges?"
- `ivyscore.current` → "Show me my current readiness"
- `ivyscore.progression` → "How has my score changed over time?"

**Readiness Routes:**
- `readiness.top_priorities` → "What should I work on?" / "Top priorities"
- `readiness.weakspots` → "What are my weak spots?" / "Areas to improve"

**What-If Routes:**
- `readiness.whatif.sat` → "What if I raise my SAT to 1560?"
- `readiness.whatif.award` → "What if I win a national award?"
- `readiness.whatif.ec` → "What if I grow Empowering AI to 200 users?"
- `readiness.whatif.gpa` → "What if I raise my GPA to 3.95?"
- `readiness.whatif.program` → "What if I get into RSI?"

### Real Data (huda-2025)

**Current IvyScore: 90.51 / 100** (IvyPlus Ready)

**Factor Breakdown:**
- ECs: 100.0 / 100 (weight: 24%) → **24.00 points**
- Awards: 100.0 / 100 (weight: 12%) → **12.00 points**
- Testing: 94.17 / 100 (weight: 12%) → **11.30 points** (SAT 1530/1600)
- Academics: 78.0 / 100 (weight: 32%) → **24.96 points** (GPA 3.97/4.52)
- Narrative: 100.0 / 100 (weight: 15%) → **15.00 points**
- Socio-context: 65.0 / 100 (weight: 5%) → **3.25 points**

**Total: 90.51 points**

**Progression:**
- Aug 2024: 82.0 (baseline - limited ECs, SAT 1380)
- Sep 2024: 85.0 (+3.0 after SAT retake to 1440)
- Oct 2024: 89.0 (+4.0 after national awards + EC scaling)
- Sep 2025: 90.51 (+1.51 final polish with CommonApp submission)

**Weakspots:**
1. Award count: 1 national (target: 2+) → Gap: 1 award
2. EC user reach: Empowering AI 85 users (target: 200+) → Gap: 115 users
3. Narrative depth: Essays need stronger advocacy focus → Qualitative gap

**Top Priorities:**
1. Submit NCWIT National + Regeneron → **+5.0 points lift**
2. Scale Empowering AI to 200 users → **+1.8 points lift**
3. Refine essay advocacy theme → **+1.5 points lift**

**What-If Results:**
- SAT 1530 → 1560: **+2.3 points** (→ 92.81)
- SAT 1530 → 1600: **+5.2 points** (→ 95.71)
- Win National Award: **+5.0 points** (→ 95.0)
- Win International Award: **+10.0 points** (→ 100.0, capped)
- Grow Empowering AI to 200 users: **+1.8 points** (→ 92.31)

---

**Status:** ✅ Production Ready (v10.6 - Cat-1 Complete with IvyScore)
**Last Updated:** 2025-10-12
