# IvyLevel Platform - Database Architecture & Implementation Specification

**Document Version:** v1.0
**Platform Version:** v14.0
**Last Updated:** 2025-10-28
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Overview](#database-overview)
3. [Core Data Architecture](#core-data-architecture)
4. [Frontend Tab Architecture](#frontend-tab-architecture)
5. [Huda's Current Data Implementation](#hudas-current-data-implementation)
6. [Multi-Student Extensibility](#multi-student-extensibility)
7. [Scaling Architecture](#scaling-architecture)
8. [Data Integrity & Isolation](#data-integrity--isolation)
9. [Index Strategy & Performance](#index-strategy--performance)
10. [Migration & Evolution](#migration--evolution)

---

## Executive Summary

### Purpose

This document provides a comprehensive top-down specification of the IvyLevel Platform's database architecture, focusing on:

- **WHY**: Design decisions and business rationale
- **WHAT**: Table structures, relationships, and data models
- **HOW**: Current implementation for Huda and extensibility for future students

### Database Technology Stack

- **Database:** PostgreSQL 14+
- **Connection Pool:** node-postgres (`pg`)
- **Total Tables:** 143 tables
- **Active Production Tables:** 35 core tables (as of v14.0)
- **Current Students:** 1 (huda-2025)
- **Total Records:** 516+ records across core tables for Huda

### Key Design Principles

1. **Student-Centric Isolation:** Every table scoped to `student_id` with RLS policies
2. **Temporal Flexibility:** All facts and events have temporal metadata
3. **Source Attribution:** Every data point links back to source for provenance
4. **JSONB for Flexibility:** Complex nested data stored as JSONB for schema evolution
5. **Enumerated Types:** Controlled vocabularies via CHECK constraints
6. **Cascading Deletes:** Student deletion cascades to all dependent data
7. **UUID Primary Keys:** Globally unique identifiers for distributed systems

---

## Database Overview

### Database Statistics (Production)

```
Database Name: ivylevel
Total Tables: 143
Active Tables (v14.0): 35 core + 108 supporting
Current Students: 1 (huda-2025)
Total Core Records: 516+
Database Size: ~250 MB
```

### Table Categories

The 143 tables are organized into 10 functional domains:

#### 1. **Student Identity & Profile** (3 tables)
- `students` - Core student profiles
- `student_coach_assignments` - Coach relationships
- `student_context` - Additional context metadata

#### 2. **Assessment & Scoring** (8 tables)
- `admissions_rubric` - Rubric definitions
- `admissions_rubric_factors` - Factor definitions
- `admissions_rubric_scores` - Historical scores
- `ivyready_snapshots` - Point-in-time assessments
- `ivyready_snapshot_factors` - Factor scores per snapshot
- `ivyready_snapshot_features` - Feature values per snapshot
- `feature_snapshots` - Feature computation snapshots
- `feature_snapshot_values` - Individual feature values

#### 3. **Strategic Planning** (7 tables)
- `game_plans` - Master game plan records
- `game_plan_phases` - Phase breakdown
- `game_plan_milestones` - Milestone tracking
- `tactical_plans` - Tactical execution plans
- `opportunities` - Identified opportunities
- `strategic_insights` - Strategic recommendations
- `gameplan_reports` - Generated reports

#### 4. **Weekly Execution** (4 tables)
- `weekly_vitals` - Weekly progress snapshots
- `weekly_progress_snapshots` - Aggregated progress
- `weekly_execution_plans` - Week-by-week plans
- `jtbd_weekly` - Jobs-to-be-done tracking

#### 5. **Growth & Timeline** (3 tables)
- `timeline_events` - Universal event timeline
- `growth_events` - HGTI growth breakthroughs
- `emotional_trajectory` - Emotional state tracking

#### 6. **Knowledge Base** (12 tables)
- `kb_items` - Universal ledger of all items
- `kb_chips` - Intelligence chips
- `kb_embeddings` - Vector embeddings
- `kb_docs` - Document storage
- `kb_sources` - Source definitions
- `kb_chip_links` - Chip relationships
- `kb_scan_cursors` - Ingestion cursors
- `vital_facts` - Temporal fact store (UTFA)
- `fact_kinds` - Fact type definitions
- `fact_priorities` - Fact priority rules
- `fact_observations` - Fact observation log
- `sources` - Data source registry

#### 7. **Academic Data** (8 tables)
- `academic_courses` - Course enrollment
- `academic_grades` - Grade records
- `academic_gpa` - GPA calculations
- `academic_terms` - Term definitions
- `academic_vitals` - Academic metrics
- `academics_events` - Academic milestones

#### 8. **Extracurricular & Applications** (15 tables)
- `ec_vitals` - EC metrics and scaling
- `ec_targets` - EC targets/goals
- `award_targets` - Award applications
- `award_targets_enum` - Award definitions
- `college_list` - College applications
- `outcomes` - Application outcomes
- `essays` - Essay tracking
- `essay_progress` - Essay drafts/progress
- `projects` - Project tracking
- `deadlines` - Deadline management
- `scholarships` - Scholarship tracking
- `admission_checklist` - Task checklists
- `application_components` - Application parts
- `lifecycle_items` - Lifecycle milestones
- `narrative_targets` - Narrative goals

#### 9. **Coaching & Sessions** (18 tables)
- `sessions` - Coaching session records
- `session_prep` - Session preparation
- `interactions` - Student-coach interactions
- `interactions_fts` - Full-text search index
- `interactive_sessions` - Interactive Q&A sessions
- `assessment_sessions` - Assessment sessions
- `jtbd` - Jobs-to-be-done framework
- `eq_signals` - EQ signal detection
- `eq_utterances` - Utterance analysis
- `eq_qa_samples` - QA training samples
- `eq_signal_sets` - Signal groupings
- `coaching_frameworks` - Framework definitions
- `coaching_intelligence` - Intelligence extraction
- `coaching_intelligence_extraction` - Extraction records
- `coach_intelligence` - Coach-specific intel
- `coaches` - Coach profiles
- `unified_context` - Unified student context
- `cross_namespace_links` - Cross-domain links

#### 10. **Agent & System Infrastructure** (65 tables)
- Agent execution (`agent_runs`, `agent_conversation_*`)
- Chat system (`chat_*`)
- Query tracing (`query_*`)
- Feature engineering (`feature_*`, `action_*`)
- Knowledge moat (`moat_*`) - 15 tables
- System events & logs
- Proof registry & audit logs
- Task management
- Notification system
- Scheduled jobs
- Training data tables

---

## Core Data Architecture

### 1. Student Identity Foundation

#### `students` Table

**Purpose:** Central identity and profile for each student

```sql
CREATE TABLE students (
    student_id TEXT PRIMARY KEY,          -- Unique identifier (e.g., 'huda-2025')
    full_name TEXT,
    email TEXT,
    grad_year INTEGER,                    -- Graduation year
    high_school TEXT,

    -- Academic snapshot (denormalized for quick access)
    gpa_unweighted NUMERIC(3,2),
    gpa_weighted NUMERIC(3,2),
    sat_score INTEGER,
    act_score INTEGER,
    ap_courses_count INTEGER DEFAULT 0,

    -- Strategic positioning
    ec_spike_theme TEXT,                  -- Primary EC focus
    target_schools TEXT[],                -- Array of target colleges
    target_major TEXT,
    early_decision_school TEXT,

    -- Platform metadata
    primary_coach_id TEXT REFERENCES coaches(coach_id),
    assessment_mode TEXT DEFAULT 'interactive',  -- 'interactive' | 'simulated'
    password_hash TEXT,
    last_login_at TIMESTAMPTZ,

    -- Extensibility
    parent_student_id TEXT REFERENCES students(student_id),  -- For synthetic/test students
    is_synthetic BOOLEAN DEFAULT false,
    test_run_id TEXT,

    created_ts TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**WHY:**
- Single source of truth for student identity
- Denormalized key metrics for performance (avoid joins for dashboard)
- `parent_student_id` enables test data linking to real students
- `assessment_mode` controls simulated vs. real assessments

**HOW (Huda's Implementation):**
```sql
student_id: 'huda-2025'
full_name: 'Huda Shaik'
email: 'newhuda@test.com'
grad_year: 2025
gpa_unweighted: 3.95
gpa_weighted: 4.62
sat_score: 1530
ec_spike_theme: 'AI Education & Social Impact'
target_schools: ['Stanford', 'MIT', 'UC Berkeley', ...]
is_synthetic: false
```

**Extensibility:**
- Add new student: `INSERT INTO students (student_id, full_name, ...) VALUES ('jane-2026', 'Jane Doe', ...)`
- Row-level security isolates data automatically
- All child tables cascade from `student_id` foreign key

---

### 2. Temporal Fact Store (UTFA Architecture)

#### `vital_facts` Table

**Purpose:** Universal Temporal Fact Architecture - stores all temporal facts with first/latest/nth resolution

```sql
CREATE TABLE vital_facts (
    fact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    kind TEXT NOT NULL REFERENCES fact_kinds(kind),
    value TEXT NOT NULL,
    numeric_value INTEGER,                -- Denormalized for range queries
    unit TEXT,
    fact_date TIMESTAMPTZ NOT NULL,       -- When the fact occurred
    source_id TEXT NOT NULL REFERENCES sources(source_id),
    confidence fact_confidence NOT NULL DEFAULT 'high',
    modality TEXT,                        -- 'official' | 'practice' | NULL
    created_ts TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT sat_score_range CHECK (
        kind <> 'sat_total_score' OR
        numeric_value IS NULL OR
        (numeric_value >= 200 AND numeric_value <= 1600)
    ),
    CONSTRAINT act_score_range CHECK (
        kind <> 'act_composite' OR
        numeric_value IS NULL OR
        (numeric_value >= 1 AND numeric_value <= 36)
    )
);

CREATE INDEX idx_facts_student_date ON vital_facts(student_id, fact_date DESC);
CREATE INDEX idx_facts_kind ON vital_facts(kind);
```

**WHY:**
- **Temporal Resolution:** Answers "What was my first/second/latest SAT score?"
- **Source Attribution:** Every fact traces back to where it came from
- **Confidence Levels:** Track certainty of extracted data
- **Modality Filtering:** Distinguish official vs. practice test scores
- **Extensible:** Any new fact kind can be added without schema changes

**WHAT (Fact Kinds):**
```sql
-- Academic Facts
'sat_total_score', 'sat_math', 'sat_ebrw'
'act_composite', 'act_english', 'act_math', 'act_reading', 'act_science'
'gpa_unweighted', 'gpa_weighted', 'gpa_uc'
'ap_score_<subject>'

-- Timeline Facts
'award_won', 'award_applied'
'ec_leadership_position', 'ec_hours_per_week'
'program_attended', 'program_applied'
```

**HOW (Huda's Implementation):**
- **258 vital facts** stored
- SAT progression: 3 scores (1360 → 1480 → 1530)
- AP scores: 15 scores across subjects
- GPA trajectory: 8 snapshots over time
- Awards/programs: 25+ temporal facts

**Example Query (UTFA in action):**
```sql
-- Get Huda's first SAT score
SELECT numeric_value, fact_date
FROM vital_facts
WHERE student_id = 'huda-2025'
  AND kind = 'sat_total_score'
  AND modality = 'official'
ORDER BY fact_date ASC
LIMIT 1;
-- Returns: 1360 on 2023-03-15

-- Get Huda's latest SAT score
SELECT numeric_value, fact_date
FROM vital_facts
WHERE student_id = 'huda-2025'
  AND kind = 'sat_total_score'
  AND modality = 'official'
ORDER BY fact_date DESC
LIMIT 1;
-- Returns: 1530 on 2024-05-10

-- Get SAT superscore (max of each section across all dates)
SELECT
    MAX(CASE WHEN kind = 'sat_math' THEN numeric_value END) as math_max,
    MAX(CASE WHEN kind = 'sat_ebrw' THEN numeric_value END) as ebrw_max
FROM vital_facts
WHERE student_id = 'huda-2025'
  AND kind IN ('sat_math', 'sat_ebrw');
```

**Extensibility:**
- Adding new student: Facts automatically isolated by `student_id`
- Adding new fact kind: `INSERT INTO fact_kinds (kind, ...) VALUES ('new_fact_type', ...)`
- No schema changes needed for new fact types

---

### 3. Universal Knowledge Ledger

#### `kb_items` Table

**Purpose:** Universal ledger for all trackable items (ECs, awards, programs, applications, essays)

```sql
CREATE TABLE kb_items (
    item_id TEXT PRIMARY KEY,             -- Human-readable ID (e.g., 'APP-FINAL-001')
    student_id TEXT NOT NULL,
    item_type TEXT NOT NULL,              -- 'ec' | 'award' | 'program' | 'application' | 'essay'
    subtype TEXT,                         -- e.g., 'Summer Program', 'National Award'
    title_name TEXT NOT NULL,

    -- FSM State Model (Finite State Machine)
    tier1_state TEXT NOT NULL,            -- 'Planned' | 'In Transit' | 'Submitted' | 'Outcome' | 'Archived'
    tier2_substate TEXT,                  -- Sub-state within tier1
    status_detail TEXT,

    -- Key Metric (flexible per item type)
    key_metric_type TEXT,                 -- e.g., 'hours_per_week', 'amount_raised', 'score'
    key_metric_value TEXT,
    key_metric_unit TEXT,

    -- Temporal Lifecycle
    deadline_date DATE,
    event_date DATE,
    submit_date DATE,
    outcome_date DATE,

    -- Metadata
    owner TEXT,                           -- Who owns this (student, parent, coach)
    cadence TEXT,                         -- Frequency (weekly, monthly, one-time)
    evidence_links TEXT[],                -- Links to evidence/artifacts
    source_ref TEXT NOT NULL,             -- Source of this data
    confidence TEXT DEFAULT 'medium',

    -- Graph Relationships
    edges JSONB DEFAULT '[]'::jsonb,      -- Array of {type, target_id} edges

    created_ts TIMESTAMPTZ DEFAULT NOW(),
    updated_ts TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT kb_items_tier1_state_check CHECK (
        tier1_state IN ('Planned', 'In Transit', 'Submitted', 'Outcome', 'Archived')
    )
);

CREATE INDEX idx_kb_items_by_student ON kb_items(student_id);
CREATE INDEX idx_kb_items_type_state ON kb_items(item_type, tier1_state, outcome_date, event_date, submit_date);
CREATE INDEX kb_items_temporal ON kb_items(student_id, item_type, COALESCE(outcome_date, event_date, submit_date, deadline_date));
CREATE INDEX idx_kb_items_edges ON kb_items USING gin(edges);
```

**WHY:**
- **Universal Ledger:** One table for all trackable student activities
- **FSM State Model:** Clear lifecycle progression for every item
- **Flexible Metrics:** Each item type has different metrics (hours, dollars, scores)
- **Temporal Completeness:** Capture all lifecycle dates (deadline, submit, outcome)
- **Graph-Ready:** `edges` JSONB enables relationship mapping without junction tables

**WHAT (Item Types):**
```sql
-- Extracurriculars
item_type='ec', subtype='Leadership', key_metric_type='hours_per_week'
item_type='ec', subtype='Research', key_metric_type='publications'

-- Awards
item_type='award', subtype='National', key_metric_type='placement'
item_type='award', subtype='School', key_metric_type='recognition_level'

-- Programs
item_type='program', subtype='Summer Program', key_metric_type='acceptance_rate'
item_type='program', subtype='Research Program', key_metric_type='stipend'

-- Applications
item_type='application', subtype='RD', key_metric_type='deadline'
item_type='application', subtype='EA', key_metric_type='submit_date'

-- Essays
item_type='essay', subtype='Common App', key_metric_type='word_count'
```

**HOW (Huda's Implementation):**
- **57 kb_items** total
- **Breakdown:**
  - 56 college applications (RD, EA, ED, REA, Rolling)
  - 3 major ECs (Empowering AI, Synthoria, Folklift)
  - 7 awards won
  - 5 summer programs attended
  - 10 essays tracked

**Example Records:**
```sql
-- Major EC Example
item_id: 'EC-FINAL-001'
title_name: 'Empowering AI - Founder & CEO'
item_type: 'ec'
subtype: 'Nonprofit Founder'
tier1_state: 'Outcome'
key_metric_type: 'cities'
key_metric_value: '44'
event_date: '2023-01-01'
outcome_date: '2024-07-01'

-- Award Example
item_id: 'AW-FINAL-001'
title_name: 'NCWIT — National Awardee'
item_type: 'award'
subtype: 'National Recognition'
tier1_state: 'Outcome'
outcome_date: '2024-10-01'

-- Application Example
item_id: 'APP-FINAL-001'
title_name: 'Stanford University'
item_type: 'application'
subtype: 'REA'
tier1_state: 'Submitted'
deadline_date: '2024-11-01'
submit_date: '2024-10-28'
```

**Extensibility:**
- **New Student:** All items scoped by `student_id`
- **New Item Types:** Add to item_type without schema changes
- **New Metrics:** Flexible key_metric_* fields accommodate any measurement
- **Scaling:** GIN index on edges enables graph traversal at scale

---

## Frontend Tab Architecture

### Tab 1: Assessment Scoring

**Purpose:** Calculate and display IvyReady scores across 8 admissions factors

#### Core Tables

##### `admissions_rubric`
```sql
CREATE TABLE admissions_rubric (
    rubric_id TEXT PRIMARY KEY,
    rubric_name TEXT NOT NULL,
    version TEXT NOT NULL,
    created_ts TIMESTAMPTZ DEFAULT NOW()
);
```

**Current Rubric:**
```sql
rubric_id: 'rubric-v2-ivyready'
rubric_name: 'IvyReady Assessment v2.0'
version: 'v2.0'
```

##### `admissions_rubric_factors`
```sql
CREATE TABLE admissions_rubric_factors (
    factor_id TEXT PRIMARY KEY,
    rubric_id TEXT REFERENCES admissions_rubric(rubric_id),
    factor_name TEXT NOT NULL,
    weight NUMERIC NOT NULL,
    category TEXT,
    created_ts TIMESTAMPTZ DEFAULT NOW()
);
```

**8 Factors:**
1. `academic_gpa` (weight: 15%)
2. `academic_rigor` (weight: 15%)
3. `standardized_tests` (weight: 10%)
4. `extracurricular_depth` (weight: 15%)
5. `extracurricular_leadership` (weight: 12%)
6. `awards_recognition` (weight: 10%)
7. `essays_narrative` (weight: 13%)
8. `recommendations` (weight: 10%)

##### `ivyready_snapshots`
```sql
CREATE TABLE ivyready_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    rubric_id TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
    snapshot_phase TEXT NOT NULL,         -- 'assessment' | 'midpoint' | 'final_submit' | 'rolling'
    as_of DATE NOT NULL,                  -- Point-in-time date
    engine TEXT NOT NULL DEFAULT 'sql',   -- Computation engine
    overall_score NUMERIC,                -- Weighted aggregate
    notes TEXT,
    source_id TEXT REFERENCES sources(source_id),
    created_ts TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT ivyready_snapshots_snapshot_phase_check CHECK (
        snapshot_phase IN ('assessment', 'midpoint', 'final_submit', 'rolling')
    ),

    UNIQUE(student_id, rubric_id, snapshot_phase, as_of)
);
```

##### `ivyready_snapshot_factors`
```sql
CREATE TABLE ivyready_snapshot_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID REFERENCES ivyready_snapshots(snapshot_id) ON DELETE CASCADE,
    factor_id TEXT NOT NULL,
    score NUMERIC NOT NULL,               -- 0-100
    reasoning TEXT,
    evidence_items JSONB,                 -- Array of supporting evidence
    created_ts TIMESTAMPTZ DEFAULT NOW()
);
```

**WHY:**
- **Point-in-Time Snapshots:** Capture assessment at different lifecycle phases
- **Weighted Scoring:** Flexible factor weights per rubric version
- **Evidence Linking:** Each factor score links to supporting kb_items
- **Version Control:** Multiple rubrics can coexist, students migrate between versions
- **SQL Engine:** Deterministic scoring from database facts (vs. AI-generated scores)

**HOW (Huda's Implementation):**
```sql
-- 2 snapshots stored
Snapshot 1 (Initial Assessment):
  snapshot_id: <uuid>
  student_id: 'huda-2025'
  rubric_id: 'rubric-v2-ivyready'
  snapshot_phase: 'assessment'
  as_of: '2024-01-15'
  overall_score: 82.4

  Factor Scores:
    academic_gpa: 95 (3.95 UW, 4.62 W)
    academic_rigor: 90 (7 AP courses)
    standardized_tests: 98 (SAT 1530)
    extracurricular_depth: 85 (3 major ECs with scaling)
    extracurricular_leadership: 88 (Founder roles)
    awards_recognition: 75 (7 awards, 2 national)
    essays_narrative: 70 (in-progress)
    recommendations: 65 (not yet submitted)

Snapshot 2 (Final Submit):
  snapshot_id: <uuid>
  student_id: 'huda-2025'
  rubric_id: 'rubric-v2-ivyready'
  snapshot_phase: 'final_submit'
  as_of: '2024-10-28'
  overall_score: 91.2

  Factor Scores:
    academic_gpa: 95
    academic_rigor: 92 (added 2 more APs)
    standardized_tests: 98
    extracurricular_depth: 92 (Empowering AI scaled to 44 cities)
    extracurricular_leadership: 95 (national leadership demonstrated)
    awards_recognition: 88 (NCWIT National, Games for Change)
    essays_narrative: 90 (strong narrative developed)
    recommendations: 85 (submitted recommendations)
```

**Extensibility:**
- **New Students:** Snapshots isolated by `student_id`, RLS policies enforce
- **New Rubrics:** Create new `admissions_rubric` with different factors/weights
- **Phase Tracking:** Add custom phases to enum if needed
- **Historical Analysis:** Query score progression over time across snapshots

**SQL Query Example (Get Latest Assessment):**
```sql
SELECT
    s.snapshot_id,
    s.overall_score,
    s.as_of,
    json_object_agg(
        f.factor_id,
        json_build_object(
            'score', sf.score,
            'reasoning', sf.reasoning
        )
    ) as factors
FROM ivyready_snapshots s
JOIN ivyready_snapshot_factors sf ON sf.snapshot_id = s.snapshot_id
JOIN admissions_rubric_factors f ON f.factor_id = sf.factor_id
WHERE s.student_id = 'huda-2025'
  AND s.snapshot_phase = 'final_submit'
GROUP BY s.snapshot_id, s.overall_score, s.as_of
ORDER BY s.as_of DESC
LIMIT 1;
```

---

### Tab 2: Game Plan

**Purpose:** Strategic college prep roadmap with phases, milestones, and opportunities

#### Core Tables

##### `game_plans`
```sql
CREATE TABLE game_plans (
    game_plan_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,

    -- Assessment Summary
    profile_assessment JSONB NOT NULL,    -- Snapshot of student profile at creation
    readiness_score JSONB NOT NULL,       -- IvyReady scores at creation
    target_profile JSONB NOT NULL,        -- Target student archetype
    target_schools JSONB,                 -- Array of target colleges with fit scores

    -- Contextual Info
    school_context JSONB,                 -- High school environment
    family_context JSONB,                 -- Family situation

    -- Current State
    current_phase_id TEXT,                -- Active phase reference

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_plans_student ON game_plans(student_id);
CREATE INDEX idx_game_plans_version ON game_plans(student_id, version DESC);
```

##### `game_plan_phases`
```sql
CREATE TABLE game_plan_phases (
    phase_id TEXT PRIMARY KEY,
    game_plan_id TEXT NOT NULL REFERENCES game_plans(game_plan_id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    description TEXT,
    goals JSONB,                          -- Array of goals for this phase
    status TEXT DEFAULT 'pending',        -- 'pending' | 'active' | 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### `game_plan_milestones`
```sql
CREATE TABLE game_plan_milestones (
    milestone_id TEXT PRIMARY KEY,
    phase_id TEXT NOT NULL REFERENCES game_plan_phases(phase_id) ON DELETE CASCADE,
    milestone_name TEXT NOT NULL,
    target_date DATE,
    completion_date DATE,
    status TEXT DEFAULT 'pending',        -- 'pending' | 'in_progress' | 'completed' | 'blocked'
    description TEXT,
    success_criteria JSONB,               -- Array of success criteria
    linked_kb_items TEXT[],               -- Links to relevant kb_items
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**WHY:**
- **Strategic Planning:** Break down 2-year journey into manageable phases
- **JSONB Flexibility:** Profile/context stored as JSON for rich nested data
- **Version Control:** Multiple game plan versions per student (revisions)
- **Milestone Tracking:** Concrete deliverables with dates and success criteria
- **KB Integration:** Milestones link to actual items in universal ledger

**WHAT (Typical Phases):**
1. **Foundation Building** (Months 1-6)
   - Academic rigor ramp-up
   - EC depth development
   - Testing strategy baseline

2. **Spike Development** (Months 7-12)
   - EC leadership scaling
   - Award applications
   - Summer program participation

3. **Positioning** (Months 13-18)
   - Narrative development
   - College list finalization
   - Testing completion

4. **Application Execution** (Months 19-24)
   - Essay writing
   - Application submission
   - Interview preparation

**HOW (Huda's Implementation):**
```json
{
  "game_plan_id": "gp-huda-2025-v1",
  "student_id": "huda-2025",
  "version": 1,
  "profile_assessment": {
    "strengths": ["AI/CS depth", "Social impact focus", "Scaling leadership"],
    "gaps": ["Testing (initial 1360)", "Awards (initially limited)", "Narrative clarity"],
    "spike": "AI Education & Equity"
  },
  "readiness_score": {
    "overall": 82.4,
    "factors": {...}
  },
  "target_profile": "AI/CS Impact Founder",
  "target_schools": [
    {"name": "Stanford", "fit_score": 92, "why": "CS + Social Impact alignment"},
    {"name": "MIT", "fit_score": 88, "why": "Technical depth + innovation culture"},
    ...
  ],
  "phases": [
    {
      "phase_id": "phase-1-foundation",
      "phase_number": 1,
      "phase_name": "Foundation Building",
      "start_date": "2023-01-01",
      "end_date": "2023-06-30",
      "goals": [
        "Raise SAT to 1480+",
        "Launch Empowering AI nonprofit",
        "Complete 2 AP exams with 5s"
      ],
      "milestones": [
        {
          "milestone_id": "m-sat-1480",
          "milestone_name": "SAT 1480 Achievement",
          "target_date": "2023-05-01",
          "completion_date": "2023-05-10",
          "status": "completed"
        },
        {
          "milestone_id": "m-ea-launch",
          "milestone_name": "Empowering AI Soft Launch",
          "target_date": "2023-03-01",
          "completion_date": "2023-02-15",
          "status": "completed"
        }
      ]
    },
    {
      "phase_id": "phase-2-spike",
      "phase_number": 2,
      "phase_name": "Spike Development",
      "start_date": "2023-07-01",
      "end_date": "2024-01-31",
      "goals": [
        "Scale Empowering AI to 15 cities",
        "Win 2+ national awards",
        "Launch Synthoria to 200 classrooms"
      ]
    },
    {
      "phase_id": "phase-3-positioning",
      "phase_number": 3,
      "phase_name": "Positioning & Narrative",
      "start_date": "2024-02-01",
      "end_date": "2024-08-31",
      "goals": [
        "Achieve SAT 1530",
        "Finalize college list (15 schools)",
        "Draft Common App essay v1"
      ]
    },
    {
      "phase_id": "phase-4-execution",
      "phase_number": 4,
      "phase_name": "Application Execution",
      "start_date": "2024-09-01",
      "end_date": "2025-01-15",
      "goals": [
        "Submit all EA/ED applications by Nov 1",
        "Complete all RD applications by Jan 1",
        "Prepare for admissions interviews"
      ]
    }
  ]
}
```

**Extensibility:**
- **New Students:** Game plans isolated by `student_id`
- **Custom Phases:** JSONB allows arbitrary phase structures per student
- **Template System:** Copy phases from high-performing students as templates
- **Milestone Patterns:** Identify common milestones across students for playbook development

---

### Tab 3: Weekly Execution (Preparation)

**Purpose:** Week-by-week progress tracking, session summaries, and action plan execution

#### Core Table

##### `weekly_vitals`
```sql
CREATE TABLE weekly_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id),
    week_number INTEGER NOT NULL,         -- Sequential week number (1, 2, 3...)
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,

    -- Progress Metrics
    focus_areas JSONB,                    -- Array of focus areas for the week
    progress_status TEXT,                 -- 'behind' | 'on_track' | 'ahead'
    completion_percentage NUMERIC(5,2),   -- 0-100%

    -- Domain-Specific Vitals
    academic_vitals JSONB,                -- GPA, test prep, coursework
    ec_vitals JSONB,                      -- EC hours, milestones, outcomes
    growth_vitals JSONB,                  -- Soft skills, mindset, barriers

    -- Session Context
    session_summary TEXT,                 -- Coach session notes
    session_topics TEXT[],                -- Topics discussed
    action_items JSONB,                   -- To-dos from session
    deadlines JSONB,                      -- Upcoming deadlines
    key_achievements TEXT[],              -- Wins for the week
    challenges TEXT[],                    -- Blockers/challenges
    coach_notes TEXT,                     -- Coach observations

    -- Execution Plan
    action_plan JSONB,                    -- Structured action plan

    -- Relationships
    linked_milestone_ids JSONB,           -- Links to game_plan_milestones
    linked_tactical_plan_ids JSONB,       -- Links to tactical_plans

    -- Enhanced Details (v14.0+)
    ec_details JSONB,                     -- EC scaling details
    award_details JSONB,                  -- Award application details
    program_details JSONB,                -- Program participation details

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id, week_number),
    CONSTRAINT weekly_vitals_progress_status_check CHECK (
        progress_status IN ('behind', 'on_track', 'ahead')
    )
);

CREATE INDEX idx_weekly_vitals_student_week ON weekly_vitals(student_id, week_number DESC);
CREATE INDEX idx_weekly_vitals_dates ON weekly_vitals(week_start_date, week_end_date);
CREATE INDEX idx_weekly_vitals_action_plan ON weekly_vitals USING gin(action_plan);
CREATE INDEX idx_weekly_vitals_milestones ON weekly_vitals USING gin(linked_milestone_ids);

-- Row Level Security
CREATE POLICY weekly_vitals_policy ON weekly_vitals
    USING (student_id = current_setting('app.current_student_id', true));
```

**WHY:**
- **Longitudinal Tracking:** Sequential week numbers enable time-series analysis
- **Multi-Domain Vitals:** Academic, EC, and growth metrics in one place
- **Session Integration:** Coaching sessions populate weekly vitals
- **Action Plan Execution:** Track week-to-week execution and completion
- **JSONB Flexibility:** Rich nested data without schema changes
- **Milestone Linking:** Connect weekly work to strategic game plan milestones

**WHAT (Typical Weekly Vital Structure):**
```json
{
  "week_number": 45,
  "week_start_date": "2024-10-21",
  "week_end_date": "2024-10-27",
  "progress_status": "on_track",
  "completion_percentage": 85,

  "focus_areas": [
    "Stanford REA application final review",
    "Common App essay polish",
    "Empowering AI monthly report"
  ],

  "academic_vitals": {
    "gpa": 3.95,
    "courses_on_track": 6,
    "test_prep_hours": 0,
    "ap_studying": ["AP Calculus BC", "AP Computer Science A"]
  },

  "ec_vitals": {
    "empowering_ai": {
      "hours": 15,
      "milestones": ["Completed EmpowHER Hacks event planning"],
      "cities_active": 44,
      "funds_raised_ytd": 23000
    },
    "synthoria": {
      "classrooms": 200,
      "students_reached": 6400,
      "lesson_kits_distributed": 40
    }
  },

  "growth_vitals": {
    "confidence_level": 8,
    "stress_level": 6,
    "breakthrough": false,
    "barriers_addressed": ["Time management for app deadlines"]
  },

  "session_summary": "Reviewed Stanford REA application. Discussed narrative positioning around AI equity. Finalized Common App essay. Addressed mild stress about upcoming deadlines.",

  "session_topics": [
    "Stanford REA application review",
    "Common App essay final edits",
    "Time management strategies",
    "Interview preparation"
  ],

  "action_items": [
    {"task": "Submit Stanford REA by 11/1", "status": "in_progress", "due": "2024-11-01"},
    {"task": "Request final recommendation letter", "status": "completed", "due": "2024-10-25"},
    {"task": "Schedule interview prep session", "status": "pending", "due": "2024-11-05"}
  ],

  "key_achievements": [
    "Completed Stanford REA application",
    "Reached 44 cities with Empowering AI",
    "Won NCWIT National Award"
  ],

  "challenges": [
    "Balancing app deadlines with senior coursework",
    "Managing stress during EA/REA crunch"
  ],

  "linked_milestone_ids": ["m-stanford-rea-submit", "m-empowering-ai-44-cities"]
}
```

**HOW (Huda's Implementation):**
- **89 weekly vitals** stored (covering ~21 months of coaching)
- **Week 1:** Initial assessment (Jan 2023)
- **Week 45:** Stanford REA submission (Oct 2024)
- **Week 89:** Final RD applications (Dec 2024)

**Data Enrichment Sources:**
1. **Coaching Sessions:** Session transcripts populate `session_summary`, `session_topics`, `action_items`
2. **KB Items:** EC milestones from `kb_items` populate `ec_vitals`
3. **Vital Facts:** Test scores, GPAs from `vital_facts` populate `academic_vitals`
4. **Growth Events:** HGTI breakthroughs from `growth_events` populate `growth_vitals`

**Extensibility:**
- **New Students:** Weekly vitals isolated by `student_id`, each starts at week 1
- **Custom Vitals:** JSONB fields allow student-specific tracking (e.g., athletics, arts)
- **Aggregation:** Query across weeks for trend analysis
- **Action Plan Templates:** Common action items can be templated for efficiency

**SQL Query Example (Last 4 Weeks Summary):**
```sql
SELECT
    week_number,
    week_start_date,
    progress_status,
    completion_percentage,
    key_achievements,
    challenges
FROM weekly_vitals
WHERE student_id = 'huda-2025'
ORDER BY week_number DESC
LIMIT 4;
```

---

### Tab 4: Growth Journey (Timeline)

**Purpose:** Comprehensive 2-year journey timeline showing applications, growth breakthroughs, awards, EC milestones, and phase transitions

#### Core Tables

##### `timeline_events`
```sql
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,             -- 7 types (see CHECK constraint)
    subtype TEXT,                         -- Event-specific subtype
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    description TEXT NOT NULL,
    impact TEXT,                          -- 'minor' | 'moderate' | 'major'
    metadata JSONB DEFAULT '{}'::jsonb,   -- Type-specific metadata
    source_table TEXT,                    -- Which table this came from
    source_id UUID,                       -- FK to source record
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT timeline_events_event_type_check CHECK (
        event_type IN ('growth_event', 'phase_transition', 'academic', 'application', 'project', 'award', 'program')
    ),
    CONSTRAINT timeline_events_impact_check CHECK (
        impact IN ('minor', 'moderate', 'major')
    )
);

CREATE INDEX idx_timeline_events_student_date ON timeline_events(student_id, event_date DESC);
CREATE INDEX idx_timeline_events_type ON timeline_events(event_type);
CREATE INDEX idx_timeline_events_impact ON timeline_events(impact) WHERE impact = 'major';
CREATE INDEX idx_timeline_events_source ON timeline_events(source_table, source_id) WHERE source_table IS NOT NULL;
CREATE INDEX idx_timeline_events_metadata ON timeline_events USING gin(metadata);

-- Row Level Security
CREATE POLICY timeline_events_student_isolation ON timeline_events
    USING (student_id = current_setting('app.student_id', true));
```

##### `growth_events`
```sql
CREATE TABLE growth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    barrier_type TEXT NOT NULL,           -- HGTI barrier taxonomy
    trigger TEXT NOT NULL,                -- What triggered this growth event
    coach_reflection TEXT NOT NULL,       -- Coach's observation
    student_reflection TEXT,              -- Student's self-reflection
    breakthrough BOOLEAN DEFAULT false,   -- Major breakthrough vs. incremental growth
    transformation_delta NUMERIC,         -- 0-1 score (HGTI delta)
    occurred_at DATE NOT NULL,
    linked_artifacts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_synthetic BOOLEAN DEFAULT false,
    test_run_id TEXT,

    CONSTRAINT growth_events_barrier_type_check CHECK (
        barrier_type IN (
            'INTERNAL_CONFIDENCE', 'SOCIAL_EXCLUSION', 'NEURODIVERSITY',
            'PARENT_CONFLICT', 'SELF_IMAGE', 'MOTIVATION_DROP',
            'BURNOUT', 'TIME_MANAGEMENT'
        )
    ),
    CONSTRAINT growth_events_transformation_delta_check CHECK (
        transformation_delta >= 0 AND transformation_delta <= 1
    )
);

CREATE INDEX idx_growth_events_student ON growth_events(student_id, occurred_at DESC);
CREATE INDEX idx_growth_events_barrier ON growth_events(barrier_type);
CREATE INDEX idx_growth_events_breakthrough ON growth_events(breakthrough) WHERE breakthrough = true;

-- Row Level Security
CREATE POLICY growth_events_student_isolation ON growth_events
    USING (student_id = current_setting('app.student_id', true));
```

**WHY:**
- **Universal Timeline:** Single view of all student milestones across domains
- **7 Event Types:** Comprehensive coverage (growth, academic, applications, awards, etc.)
- **HGTI Integration:** Growth events track Human Growth Transformation Index
- **Impact Scoring:** Differentiate major breakthroughs from incremental progress
- **Source Attribution:** Each event links back to source table for provenance
- **Graph-Ready Metadata:** JSONB enables complex event relationships

**WHAT (7 Event Types):**

1. **growth_event** - Psychological/behavioral breakthroughs
   - Subtypes: INTERNAL_CONFIDENCE, SELF_IMAGE, TIME_MANAGEMENT, PARENT_CONFLICT, etc.
   - Example: "Breakthrough: Self Image" (transformation_delta: 0.85)

2. **phase_transition** - Major lifecycle shifts
   - Subtypes: Assessment → Spike Development → Positioning → Execution
   - Example: "Entered Application Execution Phase"

3. **academic** - Academic milestones
   - Subtypes: standardized_test, gpa_achievement, course_completion
   - Example: "SAT Final: 1530 (+170 points total)"

4. **application** - College applications
   - Subtypes: EA, ED, REA, RD, Rolling
   - Example: "Stanford REA - Submitted" (major impact)

5. **project** - EC scaling milestones
   - Subtypes: founding, fundraising, scaling, peak_impact
   - Example: "Empowering AI: 44 Cities + $23K Raised" (major impact)

6. **award** - Awards and recognitions
   - Subtypes: computing, academic, impact, national_recognition
   - Example: "NCWIT — National Awardee" (major impact)

7. **program** - Summer programs and enrichment
   - Subtypes: summer_program, research_program
   - Example: "Yale Young Global Scholars (YYGS)" (major impact)

**HOW (Huda's Implementation):**

**93 Total Timeline Events:**
```
By Type:
  56 applications (Stanford, MIT, Berkeley, etc.)
  11 growth_event (8 HGTI breakthroughs + 3 SAT milestones initially counted as growth)
   8 project (EC scaling milestones)
   6 award (NCWIT, Games for Change, AP Scholar, etc.)
   5 program (YYGS, AAJA JCamp, Notre Dame Leadership, etc.)
   4 phase_transition (Assessment → Spike → Positioning → Execution)
   3 academic (3 SAT progression milestones)

By Year:
   8 events in 2023 (early transformation phase)
  63 events in 2024 (major growth year)
  22 events in 2025 (applications & admissions)

By Impact:
  Major: 28 events (breakthroughs, national awards, top app submissions)
  Moderate: 42 events
  Minor: 23 events
```

**Example Events:**

```sql
-- Growth Event (HGTI Breakthrough)
{
  "event_type": "growth_event",
  "subtype": "SELF_IMAGE",
  "title": "Breakthrough: Self Image",
  "event_date": "2024-05-15",
  "description": "Huda experienced a major breakthrough in self-image after winning the NCWIT regional award...",
  "impact": "major",
  "metadata": {
    "barrier_type": "SELF_IMAGE",
    "breakthrough": true,
    "transformation_delta": 0.85,
    "trigger": "NCWIT Award Win",
    "student_reflection": "I finally see myself as a legitimate CS leader..."
  },
  "source_table": "growth_events",
  "source_id": "<growth_event_uuid>"
}

-- Academic Milestone (SAT)
{
  "event_type": "academic",
  "subtype": "standardized_test",
  "title": "SAT Final: 1530 (+170 points total)",
  "event_date": "2024-05-10",
  "description": "Final SAT score of 1530 (+170 points from baseline). Reached target score range for top colleges...",
  "impact": "major",
  "metadata": {
    "score": 1530,
    "test_type": "sat_total_score",
    "improvement_from_baseline": 170,
    "percentile": 99
  },
  "source_table": "vital_facts",
  "source_id": "<vital_fact_uuid>"
}

-- Project Milestone (EC Scaling)
{
  "event_type": "project",
  "subtype": "peak_impact",
  "title": "Empowering AI: 44 Cities + $23K Raised",
  "event_date": "2024-07-01",
  "description": "Reached peak impact: Expanded to 44 cities nationwide, raised $23,000 total, built 10-person national leadership team...",
  "impact": "major",
  "metadata": {
    "project": "Empowering AI",
    "milestone": "peak",
    "cities": 44,
    "amount_raised": 23000,
    "students_reached": 500,
    "org_size": 10
  },
  "source_table": "weekly_vitals",
  "source_id": "<uuid>"
}

-- Award
{
  "event_type": "award",
  "subtype": "computing",
  "title": "NCWIT — National Awardee",
  "event_date": "2024-10-01",
  "description": "Won national recognition from National Center for Women & Information Technology for excellence in computing and leadership...",
  "impact": "major",
  "metadata": {
    "award_name": "NCWIT — National Awardee",
    "award_type": "computing",
    "scope": "national"
  },
  "source_table": "kb_items",
  "source_id": "<uuid>"
}

-- Application
{
  "event_type": "application",
  "subtype": "REA",
  "title": "Stanford REA - Submitted",
  "event_date": "2024-10-28",
  "description": "Submitted Restrictive Early Action application to Stanford University...",
  "impact": "major",
  "metadata": {
    "college": "Stanford University",
    "app_type": "REA",
    "deadline": "2024-11-01"
  },
  "source_table": "kb_items",
  "source_id": "<uuid>"
}
```

**Data Enrichment Process (v14.0):**

Timeline events are populated from 5 source tables:

1. **growth_events** → 8 HGTI breakthrough events
2. **vital_facts** → 3 SAT progression milestones
3. **kb_items** (awards) → 6 major awards
4. **kb_items** + **weekly_vitals** (projects) → 8 EC scaling milestones
5. **kb_items** (programs) → 5 summer program participations
6. **kb_items** (applications) → 56 college applications
7. **Manual insertion** (phase_transition) → 4 phase transitions

**Extensibility:**
- **New Students:** Timeline events isolated by `student_id`
- **New Event Types:** CHECK constraint updated if new categories emerge
- **Automated Enrichment:** Migration scripts can populate from any data source
- **Graph Analysis:** GIN index on metadata enables complex temporal queries
- **Multi-Student Comparison:** Query across students for pattern detection

**SQL Query Examples:**

```sql
-- Get all major impact events for Huda
SELECT event_type, title, event_date, description
FROM timeline_events
WHERE student_id = 'huda-2025'
  AND impact = 'major'
ORDER BY event_date DESC;

-- Get timeline summary by year and type
SELECT
    EXTRACT(YEAR FROM event_date) as year,
    event_type,
    COUNT(*) as count
FROM timeline_events
WHERE student_id = 'huda-2025'
GROUP BY year, event_type
ORDER BY year, count DESC;

-- Get growth events with breakthrough flag
SELECT
    te.title,
    te.event_date,
    te.description,
    (te.metadata->>'transformation_delta')::numeric as delta
FROM timeline_events te
WHERE te.student_id = 'huda-2025'
  AND te.event_type = 'growth_event'
  AND (te.metadata->>'breakthrough')::boolean = true
ORDER BY te.event_date;

-- Get EC scaling progression
SELECT
    te.title,
    te.event_date,
    te.metadata->>'cities' as cities,
    te.metadata->>'amount_raised' as amount_raised
FROM timeline_events te
WHERE te.student_id = 'huda-2025'
  AND te.event_type = 'project'
  AND te.metadata->>'project' = 'Empowering AI'
ORDER BY te.event_date;
```

---

## Huda's Current Data Implementation

### Data Volume Summary

```sql
-- Huda's data footprint (student_id = 'huda-2025')
students: 1 record
vital_facts: 258 records
kb_items: 57 records
weekly_vitals: 89 records
timeline_events: 93 records
growth_events: 8 records
ivyready_snapshots: 2 records
game_plans: 1 record
academic_courses: 7 records

-- Total core records: 516+
```

### Data Journey: January 2023 → October 2024

#### Phase 1: Foundation Building (Jan 2023 - Jun 2023)

**Week 1-26:**
- Initial assessment completed
- IvyReady score: 82.4
- Academic baseline: GPA 3.95, SAT 1360
- EC foundation: Launched Empowering AI (Jan 2023)
- Growth event: TIME_MANAGEMENT framework established (Week 8)

**Key Timeline Events (8 events in 2023):**
- Founded Empowering AI Nonprofit (Jan 1, 2023)
- SAT Baseline: 1360 (Mar 15, 2023)
- Launched Synthoria AI Ethics Game (Feb 15, 2023)
- Empowering AI: $5,000 Raised (Aug 1, 2023)

#### Phase 2: Spike Development (Jul 2023 - Jan 2024)

**Week 27-52:**
- SAT improvement: 1360 → 1480 (+120 points)
- Empowering AI scaling: 1 city → 15 cities
- Synthoria scaling: 150 students → 1,500 students
- Growth event: INTERNAL_CONFIDENCE breakthrough (Week 35)
- NCWIT NorCal Regional Winner (Nov 2023)

**Weekly Vitals Snapshot (Week 40):**
```json
{
  "week_number": 40,
  "progress_status": "ahead",
  "completion_percentage": 92,
  "academic_vitals": {"gpa": 3.95, "sat": 1480},
  "ec_vitals": {
    "empowering_ai": {"cities": 15, "funds_raised_ytd": 8000},
    "synthoria": {"classrooms": 50, "students_reached": 1500}
  },
  "key_achievements": [
    "SAT score increased to 1480",
    "Empowering AI expanded to 15 cities",
    "Won NCWIT NorCal Regional Award"
  ]
}
```

#### Phase 3: Positioning & Narrative (Feb 2024 - Aug 2024)

**Week 53-78:**
- SAT peak: 1530 (99th percentile)
- Empowering AI: 44 cities, $23K raised, 10-person team
- Synthoria: 200 classrooms, 6,400 students
- Founded Folklift youth journalism (Jan 2024)
- Growth event: SELF_IMAGE breakthrough after NCWIT National (May 2024)
- Growth event: PARENT_CONFLICT resolution (Jun 2024)
- College list finalized: 15 schools
- Common App essay v3 completed

**Timeline Events (Major milestones Q2 2024):**
1. SAT Final: 1530 (May 10, 2024) - **major impact**
2. SELF_IMAGE Breakthrough (May 15, 2024) - **major impact**
3. Empowering AI: 44 Cities + $23K (Jul 1, 2024) - **major impact**
4. Synthoria: 200 Classes, 6,400 Students (Jul 15, 2024) - **major impact**
5. Games for Change Writing Impact Award (Aug 1, 2024) - **moderate impact**

**IvyReady Snapshot (Midpoint - Jun 1, 2024):**
```json
{
  "snapshot_phase": "midpoint",
  "overall_score": 88.5,
  "factors": {
    "academic_gpa": 95,
    "academic_rigor": 92,
    "standardized_tests": 98,
    "extracurricular_depth": 90,
    "extracurricular_leadership": 92,
    "awards_recognition": 85,
    "essays_narrative": 82,
    "recommendations": 75
  }
}
```

#### Phase 4: Application Execution (Sep 2024 - Jan 2025)

**Week 79-89 (Current):**
- Stanford REA application submitted (Oct 28, 2024)
- 56 total applications prepared (EA, ED, REA, RD)
- Growth event: MOTIVATION_DROP addressed (Oct 2024)
- Final IvyReady score: 91.2
- Essay portfolio: 10 essays across all schools

**Application Breakdown (56 applications in kb_items):**
```sql
SELECT
    subtype as app_type,
    COUNT(*) as count,
    tier1_state as status
FROM kb_items
WHERE student_id = 'huda-2025'
  AND item_type = 'application'
GROUP BY subtype, tier1_state
ORDER BY count DESC;

Results:
RD (Regular Decision): 35 applications
EA (Early Action): 12 applications
REA (Restrictive Early Action): 1 application (Stanford)
ED (Early Decision): 5 applications
Rolling: 3 applications
```

**Weekly Vitals Snapshot (Week 89 - Oct 21-27, 2024):**
```json
{
  "week_number": 89,
  "progress_status": "on_track",
  "completion_percentage": 95,
  "focus_areas": [
    "Stanford REA final review",
    "RD applications prep",
    "Interview preparation"
  ],
  "academic_vitals": {
    "gpa": 3.95,
    "senior_year_courses": 6,
    "ap_exams_planned": 2
  },
  "ec_vitals": {
    "empowering_ai": {
      "cities": 44,
      "funds_raised_ytd": 23000,
      "team_size": 10,
      "students_impacted": 500
    },
    "synthoria": {
      "classrooms": 200,
      "students_reached": 6400
    },
    "folklift": {
      "articles_published": 12,
      "writers": 8,
      "readers_monthly": 2000
    }
  },
  "key_achievements": [
    "Submitted Stanford REA application",
    "Reached 44 cities with Empowering AI",
    "Completed all EA/ED essays"
  ],
  "challenges": [
    "Managing stress during EA/REA crunch",
    "Balancing senior coursework with applications"
  ]
}
```

**Final IvyReady Snapshot (Final Submit - Oct 28, 2024):**
```json
{
  "snapshot_phase": "final_submit",
  "overall_score": 91.2,
  "factors": {
    "academic_gpa": 95,
    "academic_rigor": 92,
    "standardized_tests": 98,
    "extracurricular_depth": 92,
    "extracurricular_leadership": 95,
    "awards_recognition": 88,
    "essays_narrative": 90,
    "recommendations": 85
  },
  "notes": "Strong profile across all dimensions. AI/equity spike fully developed. National recognition achieved. Narrative clarity excellent."
}
```

### Academic Data Implementation

#### `academic_courses` (7 records)

**Senior Year (2024-2025) Course Load:**
```sql
SELECT course_title, level
FROM academic_courses
WHERE student_id = 'huda-2025'
  AND term_id LIKE '2024-2025-%'
ORDER BY course_title;

Results:
1. AP Calculus BC (level: AP)
2. AP Computer Science A (level: AP)
3. AP English Literature (level: AP)
4. AP Government (level: AP)
5. Physics Honors (level: Honors)
6. Advanced Spanish IV (level: Advanced)
7. Economics (level: Regular)
```

#### `vital_facts` (258 records) - Breakdown

**SAT Scores (9 records):**
- 3 total scores: 1360, 1480, 1530
- 3 math scores: 680, 740, 770
- 3 EBRW scores: 680, 740, 760

**AP Scores (15 records):**
```sql
SELECT value as subject, numeric_value as score, fact_date
FROM vital_facts
WHERE student_id = 'huda-2025'
  AND kind LIKE 'ap_score_%'
ORDER BY fact_date;

Results:
AP Computer Science Principles: 5 (2023)
AP World History: 5 (2023)
AP Calculus AB: 5 (2024)
AP English Language: 5 (2024)
AP US History: 4 (2024)
... (10 more AP scores)
```

**GPA Progression (12 records):**
```sql
SELECT
    kind,
    value,
    TO_CHAR(fact_date, 'YYYY-MM') as period
FROM vital_facts
WHERE student_id = 'huda-2025'
  AND kind IN ('gpa_unweighted', 'gpa_weighted')
ORDER BY fact_date;

Results:
2023-01 | gpa_unweighted | 3.92
2023-01 | gpa_weighted   | 4.45
2023-06 | gpa_unweighted | 3.94
2023-06 | gpa_weighted   | 4.52
2024-01 | gpa_unweighted | 3.95
2024-01 | gpa_weighted   | 4.58
2024-06 | gpa_unweighted | 3.95
2024-06 | gpa_weighted   | 4.62
```

**Awards & Programs (25 records):**
- NCWIT National Awardee (outcome_date: 2024-10-01)
- NCWIT NorCal Regional Winner (outcome_date: 2023-11-15)
- Games for Change Writing Impact Award (outcome_date: 2024-08-01)
- AP Scholar with Distinction (outcome_date: 2024-07-01)
- Yale Young Global Scholars attended (event_date: 2024-07-15)
- ... (20 more award/program facts)

**EC Metrics (197 records):**
- Empowering AI scaling data: 52 metrics (cities, funds, team size, events)
- Synthoria impact data: 28 metrics (classrooms, students, resources)
- Folklift growth data: 15 metrics (articles, writers, readers)
- Other ECs: 102 metrics

### Knowledge Base Implementation

#### `kb_items` (57 records) - Full Breakdown

**Applications (56 records):**
```sql
SELECT subtype, tier1_state, COUNT(*) as count
FROM kb_items
WHERE student_id = 'huda-2025'
  AND item_type = 'application'
GROUP BY subtype, tier1_state;

Results:
REA | Submitted | 1  (Stanford)
EA  | Submitted | 8
EA  | Planned   | 4
RD  | Planned   | 30
RD  | In Transit| 5
ED  | Planned   | 5
Rolling | Planned | 3
```

**Top Applications (Sample):**
```json
[
  {
    "item_id": "APP-FINAL-001",
    "title_name": "Stanford University",
    "subtype": "REA",
    "tier1_state": "Submitted",
    "submit_date": "2024-10-28",
    "deadline_date": "2024-11-01"
  },
  {
    "item_id": "APP-FINAL-002",
    "title_name": "MIT",
    "subtype": "EA",
    "tier1_state": "In Transit",
    "deadline_date": "2024-11-01"
  },
  {
    "item_id": "APP-FINAL-003",
    "title_name": "UC Berkeley",
    "subtype": "RD",
    "tier1_state": "Planned",
    "deadline_date": "2024-11-30"
  }
]
```

**Extracurriculars (3 records):**
```json
[
  {
    "item_id": "EC-FINAL-001",
    "title_name": "Empowering AI - Founder & CEO",
    "item_type": "ec",
    "subtype": "Nonprofit Founder",
    "tier1_state": "Outcome",
    "key_metric_type": "cities",
    "key_metric_value": "44",
    "event_date": "2023-01-01",
    "outcome_date": "2024-07-01"
  },
  {
    "item_id": "EC-FINAL-002",
    "title_name": "Synthoria - Solo Developer",
    "item_type": "ec",
    "subtype": "EdTech Product",
    "tier1_state": "Outcome",
    "key_metric_type": "students_reached",
    "key_metric_value": "6400",
    "event_date": "2023-02-15"
  },
  {
    "item_id": "EC-FINAL-003",
    "title_name": "Folklift - Founder & Editor-in-Chief",
    "item_type": "ec",
    "subtype": "Youth Journalism",
    "tier1_state": "In Transit",
    "key_metric_type": "articles_published",
    "key_metric_value": "12",
    "event_date": "2024-01-01"
  }
]
```

**Awards (7 records):**
```json
[
  {"item_id": "AW-FINAL-001", "title_name": "NCWIT — National Awardee", "outcome_date": "2024-10-01"},
  {"item_id": "AW-FINAL-002", "title_name": "NCWIT — NorCal Regional Winner", "outcome_date": "2023-11-15"},
  {"item_id": "AW-FINAL-003", "title_name": "Games for Change — Writing Impact Award", "outcome_date": "2024-08-01"},
  {"item_id": "AW-FINAL-004", "title_name": "AP Scholar with Distinction", "outcome_date": "2024-07-01"},
  {"item_id": "AW-FINAL-005", "title_name": "College Board National Rural & Small Town Award", "outcome_date": "2024-09-01"},
  {"item_id": "AW-FINAL-006", "title_name": "Mountain House HS Computer Science CTE Award", "outcome_date": "2024-06-01"},
  {"item_id": "AW-FINAL-007", "title_name": "Honor Roll (All Semesters)", "outcome_date": "2024-06-01"}
]
```

**Programs (5 records):**
```json
[
  {"item_id": "PROG-001", "title_name": "Yale Young Global Scholars (YYGS)", "event_date": "2024-07-15"},
  {"item_id": "PROG-002", "title_name": "Notre Dame Leadership Seminars", "event_date": "2023-07-20"},
  {"item_id": "PROG-003", "title_name": "AAJA JCamp", "event_date": "2024-08-10"},
  {"item_id": "PROG-004", "title_name": "AI Scholars", "event_date": "2024-06-15"},
  {"item_id": "PROG-005", "title_name": "Bank of America Student Leaders", "event_date": "2023-08-05"}
]
```

### Growth Events Implementation

#### `growth_events` (8 records) - HGTI Breakthroughs

```sql
SELECT
    barrier_type,
    breakthrough,
    transformation_delta,
    TO_CHAR(occurred_at, 'YYYY-MM-DD') as date
FROM growth_events
WHERE student_id = 'huda-2025'
ORDER BY occurred_at;

Results:
1. TIME_MANAGEMENT         | false | 0.65 | 2023-02-10
2. INTERNAL_CONFIDENCE     | false | 0.68 | 2023-09-15
3. SELF_IMAGE              | true  | 0.85 | 2024-05-15
4. SOCIAL_EXCLUSION        | false | 0.62 | 2024-02-20
5. PARENT_CONFLICT         | false | 0.70 | 2024-06-10
6. MOTIVATION_DROP         | true  | 0.82 | 2024-10-05
7. BURNOUT                 | false | 0.60 | 2024-08-20
8. TIME_MANAGEMENT         | false | 0.68 | 2024-09-10
```

**Major Breakthroughs (transformation_delta >= 0.80):**

**1. SELF_IMAGE Breakthrough (May 15, 2024) - Delta: 0.85**
```json
{
  "barrier_type": "SELF_IMAGE",
  "breakthrough": true,
  "transformation_delta": 0.85,
  "trigger": "NCWIT National Award Win",
  "coach_reflection": "Huda experienced a major breakthrough in self-image after winning the NCWIT national award. She finally sees herself as a legitimate CS leader, not just an aspiring one. This shift unlocked confidence in her Stanford narrative.",
  "student_reflection": "I finally see myself as a legitimate CS leader. Winning the NCWIT National Award made me realize I'm not just 'trying' to be in this space—I belong here."
}
```

**2. MOTIVATION_DROP → Clarity Breakthrough (Oct 5, 2024) - Delta: 0.82**
```json
{
  "barrier_type": "MOTIVATION_DROP",
  "breakthrough": true,
  "transformation_delta": 0.82,
  "trigger": "College Positioning Clarity Session",
  "coach_reflection": "Huda was experiencing motivation drop during EA/REA crunch. We had a breakthrough session clarifying her 'why'—she's not applying to impress others, she's seeking communities that will amplify her AI equity mission. This reframing reignited her motivation.",
  "student_reflection": "I realized I was losing motivation because I was focusing on the wrong thing—getting into schools to prove something. But my real goal is finding the right community to scale my impact. That clarity changed everything."
}
```

---

## Multi-Student Extensibility

### Design Principles for Scaling

#### 1. Student-Centric Isolation

**Every table has `student_id` as the primary scoping key.**

```sql
-- Pattern used across all tables
CREATE TABLE <table_name> (
    <primary_key> <type> PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    ...
);

-- Row Level Security (RLS) enforces isolation
CREATE POLICY <table>_policy ON <table>
    USING (student_id = current_setting('app.current_student_id', true));
```

**WHY:**
- **Data Isolation:** Students cannot access each other's data
- **Automatic Cleanup:** Deleting student cascades to all child records
- **Query Simplicity:** All queries filter by `student_id`
- **RLS Enforcement:** Database-level security, not application-level

**HOW to Add New Student:**

```sql
-- Step 1: Insert into students table
INSERT INTO students (
    student_id,
    full_name,
    email,
    grad_year,
    high_school,
    assessment_mode
) VALUES (
    'jane-2026',
    'Jane Doe',
    'jane@example.com',
    2026,
    'Lincoln High School',
    'interactive'
);

-- Step 2: Set RLS context for session
SET app.current_student_id = 'jane-2026';

-- Step 3: All subsequent queries automatically scoped to Jane
-- Example: Create initial assessment
INSERT INTO ivyready_snapshots (student_id, rubric_id, snapshot_phase, as_of, overall_score)
VALUES ('jane-2026', 'rubric-v2-ivyready', 'assessment', CURRENT_DATE, 0);
-- This record is automatically isolated to Jane
```

#### 2. Source Attribution & Provenance

**Every data point links to a source.**

```sql
-- sources table (central registry)
CREATE TABLE sources (
    source_id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(student_id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,            -- 'session' | 'document' | 'chat' | 'manual' | 'import'
    source_ref TEXT,                      -- Reference to original source
    created_ts TIMESTAMPTZ DEFAULT NOW()
);

-- vital_facts references sources
CREATE TABLE vital_facts (
    ...
    source_id TEXT NOT NULL REFERENCES sources(source_id),
    ...
);

-- kb_items references sources
CREATE TABLE kb_items (
    ...
    source_ref TEXT NOT NULL,             -- Human-readable source reference
    ...
);
```

**WHY:**
- **Auditability:** Track where every fact came from
- **Confidence Scoring:** Higher confidence for official documents vs. chat extractions
- **Data Quality:** Identify and fix issues at the source
- **Multi-Student Patterns:** Identify which sources work best across students

**HOW (Adding New Student with Source Tracking):**

```sql
-- Step 1: Create source for initial assessment session
INSERT INTO sources (source_id, student_id, source_type, source_ref)
VALUES ('src-jane-initial-assessment', 'jane-2026', 'session', 'Initial Assessment Session - 2024-11-01');

-- Step 2: Add facts extracted from that session
INSERT INTO vital_facts (student_id, kind, value, numeric_value, fact_date, source_id, confidence)
VALUES
    ('jane-2026', 'sat_total_score', '1450', 1450, '2024-09-15', 'src-jane-initial-assessment', 'high'),
    ('jane-2026', 'gpa_unweighted', '3.88', NULL, '2024-06-01', 'src-jane-initial-assessment', 'high'),
    ('jane-2026', 'gpa_weighted', '4.35', NULL, '2024-06-01', 'src-jane-initial-assessment', 'high');

-- Step 3: Add kb_items (ECs, awards) from same session
INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, source_ref, confidence)
VALUES
    ('EC-JANE-001', 'jane-2026', 'ec', 'Robotics', 'Robotics Team Captain', 'Outcome', 'src-jane-initial-assessment', 'high'),
    ('AW-JANE-001', 'jane-2026', 'award', 'Regional', 'FIRST Robotics Regional Winner', 'Outcome', 'src-jane-initial-assessment', 'high');
```

#### 3. Temporal Flexibility (UTFA Architecture)

**All facts and events are temporally indexed.**

```sql
-- vital_facts: fact_date tracks when the fact occurred
CREATE TABLE vital_facts (
    ...
    fact_date TIMESTAMPTZ NOT NULL,       -- When the fact occurred (not when recorded)
    ...
);

-- timeline_events: event_date tracks when the event occurred
CREATE TABLE timeline_events (
    ...
    event_date DATE NOT NULL,
    ...
);

-- weekly_vitals: week_start_date and week_end_date define the temporal window
CREATE TABLE weekly_vitals (
    ...
    week_number INTEGER NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    ...
);
```

**WHY:**
- **First/Latest/Nth Queries:** "What was Jane's first SAT score?" "What was her second SAT score?"
- **As-Of Queries:** "What was Jane's profile as of June 1, 2024?"
- **Trend Analysis:** "How did Jane's GPA progress over 4 years?"
- **Timeline Reconstruction:** Build complete student journey from temporal data

**HOW (Multi-Student Temporal Queries):**

```sql
-- Get first SAT score for each student
SELECT DISTINCT ON (student_id)
    student_id,
    numeric_value as first_sat,
    fact_date
FROM vital_facts
WHERE kind = 'sat_total_score'
  AND modality = 'official'
ORDER BY student_id, fact_date ASC;

-- Returns:
-- huda-2025 | 1360 | 2023-03-15
-- jane-2026 | 1450 | 2024-09-15

-- Get latest SAT score for each student
SELECT DISTINCT ON (student_id)
    student_id,
    numeric_value as latest_sat,
    fact_date
FROM vital_facts
WHERE kind = 'sat_total_score'
  AND modality = 'official'
ORDER BY student_id, fact_date DESC;

-- Returns:
-- huda-2025 | 1530 | 2024-05-10
-- jane-2026 | 1450 | 2024-09-15

-- Get SAT improvement for each student
WITH first_sat AS (
    SELECT DISTINCT ON (student_id)
        student_id,
        numeric_value as first_score
    FROM vital_facts
    WHERE kind = 'sat_total_score' AND modality = 'official'
    ORDER BY student_id, fact_date ASC
),
latest_sat AS (
    SELECT DISTINCT ON (student_id)
        student_id,
        numeric_value as latest_score
    FROM vital_facts
    WHERE kind = 'sat_total_score' AND modality = 'official'
    ORDER BY student_id, fact_date DESC
)
SELECT
    f.student_id,
    f.first_score,
    l.latest_score,
    l.latest_score - f.first_score as improvement
FROM first_sat f
JOIN latest_sat l ON l.student_id = f.student_id
WHERE f.first_score < l.latest_score;

-- Returns:
-- huda-2025 | 1360 | 1530 | 170
-- (jane has only one SAT score so far, no improvement to show)
```

#### 4. JSONB for Schema Evolution

**Complex nested data stored as JSONB to avoid schema changes.**

```sql
-- weekly_vitals example
CREATE TABLE weekly_vitals (
    ...
    academic_vitals JSONB,                -- Flexible academic metrics
    ec_vitals JSONB,                      -- Flexible EC metrics
    growth_vitals JSONB,                  -- Flexible growth metrics
    action_plan JSONB,                    -- Flexible action plan structure
    ...
);

-- GIN indexes enable fast queries on JSONB
CREATE INDEX idx_weekly_vitals_action_plan ON weekly_vitals USING gin(action_plan);
```

**WHY:**
- **No Schema Changes:** Add new vitals without ALTER TABLE
- **Student-Specific Tracking:** Jane tracks robotics hours, Huda tracks nonprofit metrics
- **Query Flexibility:** GIN indexes enable fast JSON queries
- **Future-Proof:** New features don't require migrations

**HOW (Student-Specific JSONB):**

```sql
-- Huda's Week 45 (AI/nonprofit focus)
INSERT INTO weekly_vitals (student_id, week_number, ec_vitals, ...)
VALUES (
    'huda-2025',
    45,
    '{
        "empowering_ai": {
            "cities": 44,
            "funds_raised_ytd": 23000,
            "hours": 15,
            "team_size": 10
        },
        "synthoria": {
            "classrooms": 200,
            "students_reached": 6400
        }
    }'::jsonb,
    ...
);

-- Jane's Week 12 (Robotics focus)
INSERT INTO weekly_vitals (student_id, week_number, ec_vitals, ...)
VALUES (
    'jane-2026',
    12,
    '{
        "robotics_team": {
            "hours_per_week": 20,
            "competitions_entered": 3,
            "awards_won": 1,
            "role": "Captain"
        },
        "stem_club": {
            "hours_per_week": 5,
            "projects_completed": 2
        }
    }'::jsonb,
    ...
);

-- Query: Get all students with robotics involvement
SELECT student_id, week_number, ec_vitals->'robotics_team' as robotics
FROM weekly_vitals
WHERE ec_vitals ? 'robotics_team';

-- Returns:
-- jane-2026 | 12 | {"hours_per_week": 20, "competitions_entered": 3, ...}
```

#### 5. Enumerated Constraints for Data Quality

**CHECK constraints enforce controlled vocabularies.**

```sql
-- Example: timeline_events event_type constraint
CREATE TABLE timeline_events (
    ...
    event_type TEXT NOT NULL,
    ...
    CONSTRAINT timeline_events_event_type_check CHECK (
        event_type IN ('growth_event', 'phase_transition', 'academic', 'application', 'project', 'award', 'program')
    )
);

-- Example: weekly_vitals progress_status constraint
CREATE TABLE weekly_vitals (
    ...
    progress_status TEXT,
    ...
    CONSTRAINT weekly_vitals_progress_status_check CHECK (
        progress_status IN ('behind', 'on_track', 'ahead')
    )
);

-- Example: kb_items tier1_state constraint
CREATE TABLE kb_items (
    ...
    tier1_state TEXT NOT NULL,
    ...
    CONSTRAINT kb_items_tier1_state_check CHECK (
        tier1_state IN ('Planned', 'In Transit', 'Submitted', 'Outcome', 'Archived')
    )
);
```

**WHY:**
- **Data Quality:** Prevent typos and invalid values
- **Consistent Queries:** No need to handle variations like 'on-track' vs 'on_track'
- **API Validation:** Database enforces valid values, API doesn't need to
- **Multi-Student Consistency:** All students use same controlled vocabularies

**HOW (Adding New Student with Constraints):**

```sql
-- Invalid insert will fail
INSERT INTO timeline_events (student_id, event_type, title, event_date, description)
VALUES ('jane-2026', 'invalid_type', 'Test Event', CURRENT_DATE, 'Test');
-- ERROR: new row for relation "timeline_events" violates check constraint "timeline_events_event_type_check"

-- Valid insert
INSERT INTO timeline_events (student_id, event_type, subtype, title, event_date, description, impact)
VALUES (
    'jane-2026',
    'award',                              -- Valid event_type
    'regional',
    'FIRST Robotics Regional Winner',
    '2024-03-15',
    'Won regional championship',
    'major'                               -- Valid impact value
);
-- SUCCESS
```

---

## Scaling Architecture

### Current State (1 Student)

```
Database: PostgreSQL 14+
Students: 1 (huda-2025)
Core Records: 516+
Database Size: ~250 MB
Query Performance: <50ms (95th percentile)
Concurrent Connections: 5 (local dev)
```

### 10-Student Scale (Next Phase)

**Expected Data Growth:**
```
Students: 10
Core Records: ~5,160 (10x current)
Database Size: ~2.5 GB
Concurrent Connections: 20
Expected QPS: ~50 queries/sec
```

**Required Changes:**
- ✅ **No Schema Changes:** Current architecture supports 10 students as-is
- ✅ **Index Strategy:** Existing indexes handle 10-student queries efficiently
- ✅ **RLS Policies:** Already in place, no changes needed
- ⚠️ **Connection Pooling:** Increase pool size from 5 to 20
- ⚠️ **Monitoring:** Add query performance monitoring
- ⚠️ **Backup Strategy:** Implement automated daily backups

**Index Performance at 10 Students:**

```sql
-- Query: Get latest weekly vital for all students
SELECT DISTINCT ON (student_id)
    student_id,
    week_number,
    progress_status,
    completion_percentage
FROM weekly_vitals
ORDER BY student_id, week_number DESC;

-- Performance:
-- 1 student (89 records): 2ms
-- 10 students (890 records): 8ms (estimated)
-- Index used: idx_weekly_vitals_student_week
```

### 100-Student Scale (Production Phase)

**Expected Data Growth:**
```
Students: 100
Core Records: ~51,600
Database Size: ~25 GB
Concurrent Connections: 100
Expected QPS: ~500 queries/sec
```

**Required Changes:**
- ✅ **Schema:** No changes required (student-centric isolation)
- ✅ **Indexes:** Current indexes scale to 100 students
- ⚠️ **Partitioning:** Consider partitioning `weekly_vitals` by student_id (sharding prep)
- ⚠️ **Read Replicas:** Add 1-2 read replicas for dashboard queries
- ⚠️ **Caching Layer:** Add Redis for frequently accessed data (IvyReady scores, game plans)
- ⚠️ **Connection Pooling:** Use PgBouncer with pool size 100-200
- ⚠️ **Query Optimization:** Add materialized views for aggregate queries

**Partitioning Strategy (for 100+ students):**

```sql
-- Partition weekly_vitals by student_id hash
CREATE TABLE weekly_vitals (
    ...
) PARTITION BY HASH (student_id);

-- Create 10 partitions (each handles ~10 students)
CREATE TABLE weekly_vitals_p0 PARTITION OF weekly_vitals
    FOR VALUES WITH (MODULUS 10, REMAINDER 0);
CREATE TABLE weekly_vitals_p1 PARTITION OF weekly_vitals
    FOR VALUES WITH (MODULUS 10, REMAINDER 1);
...
CREATE TABLE weekly_vitals_p9 PARTITION OF weekly_vitals
    FOR VALUES WITH (MODULUS 10, REMAINDER 9);

-- Queries automatically route to correct partition
-- No application code changes required
```

**Materialized View Example (for 100+ students):**

```sql
-- Materialized view for dashboard queries
CREATE MATERIALIZED VIEW student_dashboard_summary AS
SELECT
    s.student_id,
    s.full_name,
    s.grad_year,
    s.gpa_unweighted,
    s.sat_score,
    (SELECT overall_score FROM ivyready_snapshots ir
     WHERE ir.student_id = s.student_id
     ORDER BY as_of DESC LIMIT 1) as latest_ivyready_score,
    (SELECT COUNT(*) FROM kb_items ki
     WHERE ki.student_id = s.student_id
     AND ki.item_type = 'application') as total_apps,
    (SELECT COUNT(*) FROM timeline_events te
     WHERE te.student_id = s.student_id) as total_timeline_events
FROM students s;

-- Refresh daily
CREATE INDEX idx_dashboard_summary_grad_year ON student_dashboard_summary(grad_year);

-- Refresh strategy (nightly cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY student_dashboard_summary;
```

### 1,000-Student Scale (Enterprise Phase)

**Expected Data Growth:**
```
Students: 1,000
Core Records: ~516,000
Database Size: ~250 GB
Concurrent Connections: 500-1,000
Expected QPS: ~5,000 queries/sec
```

**Required Architecture Changes:**

#### 1. **Database Sharding**

Shard by `student_id` across multiple PostgreSQL instances.

```
Shard Strategy: Hash-based on student_id
Number of Shards: 10 (each handles 100 students)

Shard 0: student_id hash % 10 = 0
Shard 1: student_id hash % 10 = 1
...
Shard 9: student_id hash % 10 = 9
```

**Routing Logic (Application Layer):**

```typescript
// Shard routing function
function getShardId(studentId: string): number {
    const hash = crypto.createHash('md5').update(studentId).digest('hex');
    const numericHash = parseInt(hash.substring(0, 8), 16);
    return numericHash % 10;  // 10 shards
}

// Connection pool per shard
const shardPools: Record<number, Pool> = {
    0: new Pool({ host: 'db-shard-0.ivylevel.com', ... }),
    1: new Pool({ host: 'db-shard-1.ivylevel.com', ... }),
    ...
    9: new Pool({ host: 'db-shard-9.ivylevel.com', ... })
};

// Query routing
async function queryStudent(studentId: string, query: string) {
    const shardId = getShardId(studentId);
    const pool = shardPools[shardId];
    return pool.query(query, [studentId]);
}
```

#### 2. **Read Replicas per Shard**

Each shard has 2 read replicas for dashboard/reporting queries.

```
Shard 0:
  - Primary (Write): db-shard-0-primary.ivylevel.com
  - Replica 1 (Read): db-shard-0-replica-1.ivylevel.com
  - Replica 2 (Read): db-shard-0-replica-2.ivylevel.com
```

#### 3. **Caching Strategy**

Use Redis for frequently accessed data.

```typescript
// Cache key pattern: <table>:<student_id>:<key>
// Example: ivyready_snapshots:huda-2025:latest
// Example: game_plans:huda-2025:current

// Cache TTL strategy:
// - IvyReady scores: 1 hour (updated infrequently)
// - Weekly vitals: 10 minutes (updated during sessions)
// - Timeline events: 1 hour (updated infrequently)
// - Student profile: 1 day (rarely changes)

// Example: Get latest IvyReady score with caching
async function getLatestIvyReadyScore(studentId: string): Promise<number> {
    const cacheKey = `ivyready_snapshots:${studentId}:latest`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Cache miss - query database
    const shardId = getShardId(studentId);
    const result = await shardPools[shardId].query(`
        SELECT overall_score
        FROM ivyready_snapshots
        WHERE student_id = $1
        ORDER BY as_of DESC
        LIMIT 1
    `, [studentId]);

    // Cache result
    await redis.setex(cacheKey, 3600, JSON.stringify(result.rows[0].overall_score));

    return result.rows[0].overall_score;
}
```

#### 4. **Query Optimization**

**Materialized Views for Cross-Shard Aggregations:**

```sql
-- Problem: Aggregate queries across all students require hitting all shards
-- Solution: Materialized view refreshed nightly on a separate analytics database

-- Analytics database (separate from shards)
CREATE MATERIALIZED VIEW all_students_summary AS
SELECT
    student_id,
    full_name,
    grad_year,
    gpa_unweighted,
    sat_score,
    (SELECT overall_score FROM ivyready_snapshots ir
     WHERE ir.student_id = s.student_id
     ORDER BY as_of DESC LIMIT 1) as latest_ivyready_score,
    (SELECT COUNT(*) FROM kb_items ki
     WHERE ki.student_id = s.student_id
     AND ki.item_type = 'application') as total_apps
FROM students s;

-- Refresh nightly via background job
-- Coaches query this view for class-wide analytics
```

**Partial Indexes for Common Queries:**

```sql
-- Index only major impact events (saves 60% index size)
CREATE INDEX idx_timeline_major_impact ON timeline_events(student_id, event_date DESC)
WHERE impact = 'major';

-- Index only submitted applications
CREATE INDEX idx_submitted_apps ON kb_items(student_id, submit_date)
WHERE item_type = 'application' AND tier1_state = 'Submitted';

-- Index only breakthroughs (not all growth events)
CREATE INDEX idx_breakthrough_events ON growth_events(student_id, occurred_at DESC)
WHERE breakthrough = true;
```

#### 5. **Background Job Architecture**

Use asynchronous job queues for heavy operations.

```typescript
// Job queue: BullMQ (Redis-backed)

// Job types:
// 1. Timeline Enrichment (runs daily)
// 2. IvyReady Score Calculation (runs on-demand)
// 3. Game Plan Generation (runs on-demand)
// 4. Weekly Vitals Aggregation (runs weekly)

// Example: Timeline enrichment job
interface TimelineEnrichmentJob {
    studentId: string;
    sourceTable: 'vital_facts' | 'kb_items' | 'growth_events' | 'weekly_vitals';
}

// Job processor
async function processTimelineEnrichment(job: Job<TimelineEnrichmentJob>) {
    const { studentId, sourceTable } = job.data;

    // Query source table for new data
    const shardId = getShardId(studentId);
    const pool = shardPools[shardId];

    // Extract events from source
    const events = await extractEventsFromSource(studentId, sourceTable, pool);

    // Insert into timeline_events
    for (const event of events) {
        await pool.query(`
            INSERT INTO timeline_events (student_id, event_type, title, event_date, description, metadata, source_table, source_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT DO NOTHING
        `, [studentId, event.type, event.title, event.date, event.description, event.metadata, sourceTable, event.sourceId]);
    }

    // Invalidate cache
    await redis.del(`timeline_events:${studentId}:*`);
}

// Enqueue job
await timelineEnrichmentQueue.add('enrich', {
    studentId: 'huda-2025',
    sourceTable: 'growth_events'
});
```

#### 6. **Monitoring & Observability**

**Key Metrics to Track:**

```typescript
// Performance Metrics
- Query latency (p50, p95, p99) per table
- Queries per second (QPS) per shard
- Connection pool utilization per shard
- Cache hit rate
- Background job queue depth

// Data Metrics
- Students per shard (for rebalancing)
- Records per student (for outlier detection)
- Database size per shard
- Index bloat per table

// Application Metrics
- API endpoint latency
- Error rate per endpoint
- Student session duration
- Concurrent active students
```

**Alerting Thresholds:**

```yaml
# Prometheus alerts
- Query latency p95 > 500ms → Investigate slow queries
- Cache hit rate < 80% → Adjust cache strategy
- Shard imbalance > 15% → Rebalance students across shards
- Database size growth > 10 GB/day → Investigate data bloat
- Connection pool utilization > 80% → Increase pool size
```

---

## Data Integrity & Isolation

### Row-Level Security (RLS)

**All student-scoped tables enforce RLS.**

```sql
-- Enable RLS on table
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Create policy: Students can only see their own data
CREATE POLICY timeline_events_student_isolation ON timeline_events
    USING (student_id = current_setting('app.student_id', true));

-- Apply to all student tables
ALTER TABLE ivyready_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY ivyready_snapshots_policy ON ivyready_snapshots
    USING (student_id = current_setting('app.current_student_id', true));

ALTER TABLE weekly_vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY weekly_vitals_policy ON weekly_vitals
    USING (student_id = current_setting('app.current_student_id', true));

ALTER TABLE growth_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY growth_events_student_isolation ON growth_events
    USING (student_id = current_setting('app.student_id', true));

-- ... repeat for all 35 core tables
```

**Application-Level Context Setting:**

```typescript
// Express middleware to set RLS context
app.use(async (req, res, next) => {
    const studentId = req.user?.studentId;  // From JWT token
    if (studentId) {
        await pool.query(`SET app.current_student_id = $1`, [studentId]);
    }
    next();
});

// Now all queries automatically filtered by student_id
// Developer doesn't need to remember to add WHERE student_id = ...
const result = await pool.query(`SELECT * FROM weekly_vitals ORDER BY week_number DESC LIMIT 10`);
// RLS policy automatically adds: WHERE student_id = 'huda-2025'
```

### Foreign Key Cascades

**Deleting a student cascades to all child records.**

```sql
-- Example: Delete student and all associated data
DELETE FROM students WHERE student_id = 'test-student-001';

-- Automatically deletes from:
-- - vital_facts (258 records)
-- - kb_items (57 records)
-- - weekly_vitals (89 records)
-- - timeline_events (93 records)
-- - growth_events (8 records)
-- - ivyready_snapshots (2 records)
-- - ivyready_snapshot_factors (~16 records)
-- - ivyready_snapshot_features (~hundreds of records)
-- - game_plans (1 record)
-- - game_plan_phases (4 records)
-- - game_plan_milestones (~20 records)
-- - academic_courses (7 records)
-- - academic_grades (~28 records)
-- - academic_gpa (8 records)
-- ... (all 35 core tables)

-- Total: ~600+ records deleted with single DELETE statement
```

### Unique Constraints & Deduplication

**Prevent duplicate records.**

```sql
-- Example: Prevent duplicate weekly vitals
ALTER TABLE weekly_vitals
    ADD CONSTRAINT weekly_vitals_student_id_week_number_key
    UNIQUE (student_id, week_number);

-- Example: Prevent duplicate snapshots
ALTER TABLE ivyready_snapshots
    ADD CONSTRAINT ivyready_snapshots_student_id_rubric_id_snapshot_phase_as_o_key
    UNIQUE (student_id, rubric_id, snapshot_phase, as_of);

-- Example: Prevent duplicate courses
ALTER TABLE academic_courses
    ADD CONSTRAINT academic_courses_student_id_term_id_course_title_key
    UNIQUE (student_id, term_id, course_title);
```

**Insert with ON CONFLICT:**

```sql
-- Idempotent insert: won't fail if record exists
INSERT INTO timeline_events (student_id, event_type, title, event_date, description, source_table, source_id)
VALUES ('huda-2025', 'award', 'NCWIT National', '2024-10-01', '...', 'kb_items', '<uuid>')
ON CONFLICT DO NOTHING;

-- Or update if exists
INSERT INTO weekly_vitals (student_id, week_number, completion_percentage, updated_at)
VALUES ('huda-2025', 45, 85, NOW())
ON CONFLICT (student_id, week_number)
DO UPDATE SET
    completion_percentage = EXCLUDED.completion_percentage,
    updated_at = NOW();
```

---

## Index Strategy & Performance

### Current Index Coverage (Per Table)

#### `students`
```sql
PRIMARY KEY: student_id
idx_students_email: email
idx_students_grad_year: graduation_year
idx_students_coach: primary_coach_id
idx_students_target_schools (GIN): target_schools
idx_students_parent: parent_student_id
idx_students_synthetic: test_run_id WHERE is_synthetic
```

#### `vital_facts`
```sql
PRIMARY KEY: fact_id
idx_facts_student_date: (student_id, fact_date DESC)  -- Most common query
idx_facts_kind: kind
```

#### `kb_items`
```sql
PRIMARY KEY: item_id
idx_kb_items_by_student: student_id
idx_kb_items_type_state: (item_type, tier1_state, outcome_date, event_date, submit_date)
kb_items_temporal: (student_id, item_type, COALESCE(outcome_date, event_date, submit_date, deadline_date))
idx_kb_items_edges (GIN): edges
kb_items_source_ref: source_ref
```

#### `weekly_vitals`
```sql
PRIMARY KEY: id
UNIQUE: (student_id, week_number)
idx_weekly_vitals_student_week: (student_id, week_number DESC)  -- Most common query
idx_weekly_vitals_dates: (week_start_date, week_end_date)
idx_weekly_vitals_action_plan (GIN): action_plan
idx_weekly_vitals_milestones (GIN): linked_milestone_ids
idx_weekly_vitals_tactical_plans (GIN): linked_tactical_plan_ids
```

#### `timeline_events`
```sql
PRIMARY KEY: id
idx_timeline_events_student_date: (student_id, event_date DESC)  -- Most common query
idx_timeline_events_type: event_type
idx_timeline_events_impact: impact WHERE impact = 'major'  -- Partial index
idx_timeline_events_source: (source_table, source_id) WHERE source_table IS NOT NULL
idx_timeline_events_metadata (GIN): metadata
```

#### `growth_events`
```sql
PRIMARY KEY: id
idx_growth_events_student: (student_id, occurred_at DESC)
idx_growth_events_barrier: barrier_type
idx_growth_events_breakthrough: breakthrough WHERE breakthrough = true  -- Partial index
```

#### `ivyready_snapshots`
```sql
PRIMARY KEY: snapshot_id
UNIQUE: (student_id, rubric_id, snapshot_phase, as_of)
(Inherits foreign key indexes from students and admissions_rubric)
```

### Query Performance Benchmarks (1 Student)

```sql
-- Query 1: Get latest weekly vital
EXPLAIN ANALYZE
SELECT * FROM weekly_vitals
WHERE student_id = 'huda-2025'
ORDER BY week_number DESC
LIMIT 1;

-- Performance:
-- Planning Time: 0.12 ms
-- Execution Time: 0.45 ms
-- Index Used: idx_weekly_vitals_student_week (btree)

-- Query 2: Get all major impact timeline events
EXPLAIN ANALYZE
SELECT * FROM timeline_events
WHERE student_id = 'huda-2025'
  AND impact = 'major'
ORDER BY event_date DESC;

-- Performance:
-- Planning Time: 0.15 ms
-- Execution Time: 0.68 ms
-- Index Used: idx_timeline_events_impact (partial btree)

-- Query 3: Get SAT progression
EXPLAIN ANALYZE
SELECT numeric_value, fact_date
FROM vital_facts
WHERE student_id = 'huda-2025'
  AND kind = 'sat_total_score'
ORDER BY fact_date ASC;

-- Performance:
-- Planning Time: 0.10 ms
-- Execution Time: 0.52 ms
-- Index Used: idx_facts_student_date (btree)

-- Query 4: Get latest IvyReady snapshot with factors
EXPLAIN ANALYZE
SELECT
    s.overall_score,
    s.as_of,
    json_object_agg(f.factor_id, sf.score) as factors
FROM ivyready_snapshots s
JOIN ivyready_snapshot_factors sf ON sf.snapshot_id = s.snapshot_id
JOIN admissions_rubric_factors f ON f.factor_id = sf.factor_id
WHERE s.student_id = 'huda-2025'
  AND s.snapshot_phase = 'final_submit'
GROUP BY s.snapshot_id, s.overall_score, s.as_of
ORDER BY s.as_of DESC
LIMIT 1;

-- Performance:
-- Planning Time: 0.25 ms
-- Execution Time: 1.84 ms
-- Indexes Used:
--   - ivyready_snapshots_pkey
--   - ivyready_snapshot_factors_snapshot_id_fkey
--   - admissions_rubric_factors_pkey
```

### Index Maintenance

**Periodic REINDEX (monthly):**

```sql
-- Rebuild indexes to reduce bloat
REINDEX TABLE vital_facts;
REINDEX TABLE kb_items;
REINDEX TABLE weekly_vitals;
REINDEX TABLE timeline_events;

-- Or rebuild specific index
REINDEX INDEX idx_facts_student_date;
```

**Monitor Index Bloat:**

```sql
-- Query to check index bloat
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Migration & Evolution

### Migration Strategy

**Sequential SQL Migrations:**

```
/scripts/migration_v14_to_v32/
├── 01_create_students.sql
├── 02_create_vital_facts.sql
├── 03_create_kb_items.sql
├── 04_create_academic_tables.sql
├── 05_create_ivyready_tables.sql
├── 06_create_game_plan_tables.sql
├── 07_create_weekly_vitals.sql
├── 08_create_timeline_events.sql
├── 09_create_growth_events.sql
├── 10_populate_huda_baseline.sql
├── 11_populate_huda_vital_facts.sql
├── 12_populate_huda_kb_items.sql
├── 13_enrich_timeline_transformations.sql
└── README.md
```

**Migration Execution:**

```bash
# Run all migrations in order
for file in scripts/migration_v14_to_v32/*.sql; do
    echo "Running migration: $file"
    PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -f "$file"
    if [ $? -ne 0 ]; then
        echo "Migration failed: $file"
        exit 1
    fi
done

echo "All migrations completed successfully"
```

### Schema Evolution Patterns

#### Pattern 1: Add New Column (Backward Compatible)

```sql
-- Add new column with default value
ALTER TABLE weekly_vitals
ADD COLUMN coach_rating INTEGER DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN weekly_vitals.coach_rating IS 'Coach rating of week execution (1-5 scale)';

-- Create index if needed
CREATE INDEX idx_weekly_vitals_coach_rating ON weekly_vitals(coach_rating) WHERE coach_rating IS NOT NULL;

-- Application code can ignore new column until ready to use
-- Old queries still work
```

#### Pattern 2: Add New Event Type (Enum Extension)

```sql
-- Current constraint
ALTER TABLE timeline_events
DROP CONSTRAINT timeline_events_event_type_check;

-- Add new event type to enum
ALTER TABLE timeline_events
ADD CONSTRAINT timeline_events_event_type_check CHECK (
    event_type IN ('growth_event', 'phase_transition', 'academic', 'application', 'project', 'award', 'program', 'interview')  -- Added 'interview'
);

-- Application code can now insert 'interview' events
INSERT INTO timeline_events (student_id, event_type, title, event_date, description)
VALUES ('huda-2025', 'interview', 'Stanford REA Interview', '2024-11-15', 'Virtual interview with alumni');
```

#### Pattern 3: Add New Table (Zero Downtime)

```sql
-- Create new table
CREATE TABLE interview_prep (
    interview_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    interview_date DATE NOT NULL,
    college_name TEXT NOT NULL,
    prep_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_interview_prep_student ON interview_prep(student_id, interview_date DESC);

-- Enable RLS
ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;
CREATE POLICY interview_prep_policy ON interview_prep
    USING (student_id = current_setting('app.current_student_id', true));

-- Application code can start using immediately
-- Existing code unaffected
```

#### Pattern 4: Backfill Historical Data

```sql
-- Example: Backfill missing timeline events from kb_items
-- Run as background job during low-traffic hours

INSERT INTO timeline_events (
    student_id,
    event_type,
    subtype,
    title,
    event_date,
    description,
    impact,
    metadata,
    source_table,
    source_id
)
SELECT
    student_id,
    'program' as event_type,
    subtype,
    title_name as title,
    event_date,
    'Attended ' || title_name || ' program for academic and leadership development.' as description,
    CASE WHEN subtype LIKE '%Ivy League%' THEN 'major' ELSE 'moderate' END as impact,
    jsonb_build_object(
        'program_name', title_name,
        'program_type', subtype
    ) as metadata,
    'kb_items' as source_table,
    gen_random_uuid() as source_id
FROM kb_items
WHERE item_type = 'program'
  AND event_date IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM timeline_events te
      WHERE te.student_id = kb_items.student_id
        AND te.event_type = 'program'
        AND te.title = kb_items.title_name
  )
ON CONFLICT DO NOTHING;

-- Verify backfill
SELECT COUNT(*) FROM timeline_events WHERE event_type = 'program';
```

### Data Quality Checks

```sql
-- Check 1: Ensure all students have at least one IvyReady snapshot
SELECT s.student_id, s.full_name
FROM students s
LEFT JOIN ivyready_snapshots ir ON ir.student_id = s.student_id
WHERE ir.snapshot_id IS NULL;
-- Expected: 0 rows

-- Check 2: Ensure all timeline events have valid source references
SELECT COUNT(*)
FROM timeline_events te
WHERE te.source_table IS NOT NULL
  AND te.source_id IS NULL;
-- Expected: 0

-- Check 3: Ensure all weekly vitals are sequential
SELECT
    student_id,
    week_number,
    LAG(week_number) OVER (PARTITION BY student_id ORDER BY week_number) as prev_week
FROM weekly_vitals
WHERE week_number - COALESCE(LAG(week_number) OVER (PARTITION BY student_id ORDER BY week_number), week_number - 1) > 1;
-- Expected: 0 rows (no gaps in week numbers)

-- Check 4: Ensure all vital_facts have valid fact_date
SELECT COUNT(*)
FROM vital_facts
WHERE fact_date IS NULL OR fact_date > NOW();
-- Expected: 0

-- Check 5: Ensure all kb_items in 'Submitted' state have submit_date
SELECT COUNT(*)
FROM kb_items
WHERE tier1_state = 'Submitted'
  AND submit_date IS NULL;
-- Expected: 0
```

---

## Summary & Key Takeaways

### Architecture Strengths

1. **Student-Centric Isolation:**
   - Every table scoped to `student_id`
   - RLS enforces data isolation
   - Zero-config multi-tenancy

2. **Temporal Flexibility:**
   - All facts and events have temporal metadata
   - First/latest/nth queries built-in
   - Timeline reconstruction from data

3. **JSONB for Evolution:**
   - Complex nested data without schema changes
   - Student-specific tracking
   - Future-proof extensibility

4. **Source Attribution:**
   - Every data point links to source
   - Full provenance tracking
   - Data quality transparency

5. **Scalability:**
   - Current: 1 student, 516 records, <50ms queries
   - 10 students: No changes needed
   - 100 students: Add read replicas + caching
   - 1,000 students: Shard by student_id

### Current Implementation (Huda)

- **516+ core records** across 35 tables
- **89 weeks** of coaching tracked
- **93 timeline events** spanning 2023-2025
- **258 vital facts** (SAT, GPA, AP scores, awards)
- **57 kb_items** (applications, ECs, awards, programs)
- **8 growth events** (HGTI breakthroughs)
- **2 IvyReady snapshots** (initial: 82.4 → final: 91.2)

### Extensibility Proof Points

- ✅ Add new student: Single `INSERT INTO students`
- ✅ Add new fact kind: Zero schema changes
- ✅ Add new event type: Single enum constraint update
- ✅ Add new vitals metric: JSONB field extension
- ✅ Scale to 1,000 students: Student-centric sharding

### Production Readiness

**Status:** ✅ PRODUCTION READY (v14.0)

- ✅ Database schema finalized
- ✅ Indexes optimized for common queries
- ✅ RLS policies enforced
- ✅ Foreign key cascades configured
- ✅ Data quality constraints in place
- ✅ Migration strategy documented
- ✅ Scaling architecture defined

**Next Steps (10-Student Launch):**
1. Increase connection pool size (5 → 20)
2. Add query performance monitoring
3. Implement automated daily backups
4. Deploy staging environment with 3 test students
5. Conduct load testing with 10 concurrent users

---

**Document Version:** v1.0
**Last Updated:** 2025-10-28
**Maintained By:** IvyLevel Platform Team
**Contact:** [technical documentation owner]

