# IvyLevel Traditional Jenny Platform - Full Stack Architecture

**Version:** v30.0 (Production)
**Student Profile:** Huda's 2-Year Coaching Journey (2023-2025)
**Date:** 2025-11-04
**Status:** ✅ PRODUCTION - Real coaching data from 92 weeks of sessions
**Coach:** Jenny (Fine-tuned GPT-4o-mini model)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Database Schema & Tables](#database-schema--tables)
4. [Fact-Based Data Model](#fact-based-data-model)
5. [Knowledge Base (KB) System](#knowledge-base-kb-system)
6. [Frontend Tab Architecture](#frontend-tab-architecture)
7. [Data Flow: DB → Backend → Frontend](#data-flow-db--backend--frontend)
8. [Real Huda Data Examples](#real-huda-data-examples)
9. [Intelligence & Insights System](#intelligence--insights-system)
10. [Timeline & Growth Journey](#timeline--growth-journey)

---

## Executive Summary

### Platform Purpose

The IvyLevel Traditional Jenny Platform is a **human-coached digital insights platform** that delivers personalized college admissions coaching through structured data tracking, AI-powered analysis, and intelligent recommendations. The platform tracks a student's complete college preparation journey from sophomore/junior year through application submission.

### Huda's Success Story (2023-2025)

**Student:** Huda A. (student_id: `huda-2025`)
**Coaching Period:** 92 weeks (June 2023 - March 2025)
**Outcome:** UNC Chapel Hill Early Action **ACCEPTED** (Dec 2024)
**Notable Achievements:**
- SAT: 1530 (EBRW: 750, Math: 780)
- Weighted GPA: 3.93/4.0
- 6 AP Exams: 4 scores of 5, 2 scores of 4
- 4 Major Extracurriculars with quantifiable impact:
  - AI Ethics Game: Reached 100+ users, 60% girls, 40% STEM confidence increase
  - Film Makers Club: Transformed 0% → 60% female leadership
  - Folklift Youth Journalism: 5 writers, 3+ published pieces
  - Synthoria Educational Game: 150 people reached, 2750 avg TikTok views
- 89 weeks of progress tracking with 1,151 action items

### Platform Capabilities

**Data Capture:**
- Academic vitals (GPA, test scores, coursework)
- Extracurricular activities with quantifiable metrics
- Awards and recognitions
- Weekly progress snapshots
- Growth events and transformation milestones

**Analysis & Insights:**
- IvyScore calculation (composite readiness score)
- Gap analysis across 6 dimensions
- Strength/weakness identification
- Opportunity recommendations
- Timeline visualization with 30+ milestone types

**Planning & Execution:**
- 4-Phase Assessment (Academic → ECs → Awards → Essays)
- Strategic Game Plan with roadmap
- Weekly action plans with task decomposition
- Progress tracking and accountability

---

## System Architecture Overview

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      USER (Coach / Student)                             │
│                   Browser: Chrome / Safari                              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js React App)                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Navigation Tabs                                               │   │
│  │  ┌────────────┬────────────┬────────────┬────────────┐         │   │
│  │  │ Assessment │ Game Plan  │ Preparation│ Growth     │         │   │
│  │  │    Tab     │    Tab     │    Tab     │  Journey   │         │   │
│  │  └────────────┴────────────┴────────────┴────────────┘         │   │
│  │                                                                 │   │
│  │  Assessment Tab Components:                                    │   │
│  │  - IvyScore Dashboard (overall readiness: 0-100)               │   │
│  │  - Gap Analysis Cards (6 gap categories)                       │   │
│  │  - Strengths & Weaknesses                                      │   │
│  │  - Rubric Scoring Visualization                                │   │
│  │                                                                 │   │
│  │  Game Plan Tab Components:                                     │   │
│  │  - Strategic Roadmap (3-phase journey)                         │   │
│  │  - Opportunities Grid (Awards / Programs / Scholarships)       │   │
│  │  - Timeline Gantt Chart                                        │   │
│  │  - Priority Rankings                                           │   │
│  │                                                                 │   │
│  │  Preparation Tab Components:                                   │   │
│  │  - Weekly Action Plans (89 weeks)                              │   │
│  │  - Task Lists (1,151 action items)                             │   │
│  │  - Progress Metrics                                            │   │
│  │  - Calendar View                                               │   │
│  │                                                                 │   │
│  │  Growth Journey Tab Components:                                │   │
│  │  - Timeline Visualization (30+ milestone types)                │   │
│  │  - Transformation Events                                       │   │
│  │  - EC Vitals Progression Charts                                │   │
│  │  - Achievement Highlights                                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                    Port: 5173 (Vite Dev Server)                        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP API Calls
                                 │ GET /students/:id/assessment
                                 │ GET /students/:id/gameplan
                                 │ GET /students/:id/weekly-vitals
                                 │ GET /students/:id/timeline
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express + TypeScript)                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  API Routes                                                     │   │
│  │  - GET /students/:id/vitals           (weekly progress)        │   │
│  │  - GET /students/:id/assessment       (IvyScore + gaps)        │   │
│  │  - GET /students/:id/gameplan         (roadmap + opps)         │   │
│  │  - GET /students/:id/action-plans     (weekly tasks)           │   │
│  │  - GET /students/:id/timeline         (growth events)          │   │
│  │  - POST /agent/chat                   (Jenny AI chat)          │   │
│  └──────────────────────────┬─────────────────────────────────────┘   │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Business Logic Layer                                          │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  PostgresFactSource (Fact Extraction Layer)              │ │   │
│  │  │  - extractAcademicFacts()                                │ │   │
│  │  │  - extractExtracurricularFacts()                         │ │   │
│  │  │  - extractAwardFacts()                                   │ │   │
│  │  │  - extractTestingFacts()                                 │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  Intelligence Layer (40 Active Types)                    │ │   │
│  │  │  - TYPE-001: Game Plan Synthesis                        │ │   │
│  │  │  - TYPE-002: Weak Spot Prioritization                   │ │   │
│  │  │  - TYPE-080: 4-Phase Assessment Flow                    │ │   │
│  │  │  - TYPE-081: IvyScore Calculation                       │ │   │
│  │  │  - TYPE-082: Gap Analysis Engine                        │ │   │
│  │  │  - ... (35 more intelligence types)                     │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  Jenny AI Agent (Fine-tuned GPT-4o-mini)                 │ │   │
│  │  │  Model: ft:gpt-4o-mini-2024-07-18:personal:jenny-v1     │ │   │
│  │  │  - Conversational coaching                              │ │   │
│  │  │  - Strategy recommendations                             │ │   │
│  │  │  - Personalized guidance                                │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                    Port: 8787 (Express Server)                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   PostgreSQL Database       │   │   Pinecone Vector Store     │
│   Database: ivylevel        │   │   Index: jenny-v3-3072      │
│   Port: 5432                │   │   Dimension: 3072           │
│                             │   │   Model: text-embedding-    │
│   Tables (25):              │   │          3-large            │
│   - students                │   │                             │
│   - weekly_vitals (89)      │   │   Knowledge Base:           │
│   - kb_items (facts)        │   │   - Coaching sessions: 924  │
│   - ec_vitals (12)          │   │   - iMessage chat: 40       │
│   - jtbd (12)               │   │   - Assessment data: 9      │
│   - timeline_events (30+)   │   │                             │
│   - action_plans (80)       │   │   RAG Retrieval for:        │
│   - action_items (1,151)    │   │   - Similar student cases   │
│   - game_plan               │   │   - Best practices          │
│   - ivyscore                │   │   - Strategy templates      │
│   - gaps (6 categories)     │   │                             │
│   - awards (32)             │   │                             │
│   - programs (18)           │   │                             │
│   - scholarships (25)       │   │                             │
│   - ... (11 more tables)    │   │                             │
│                             │   │                             │
│   Real Data:                │   │                             │
│   huda-2025 (92 weeks)      │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
```

---

## Database Schema & Tables

### Core Production Tables

#### 1. students - Student Profiles

**Purpose:** Core student demographic and enrollment data

```sql
CREATE TABLE students (
  student_id VARCHAR(50) PRIMARY KEY,           -- 'huda-2025'
  email VARCHAR(255) UNIQUE NOT NULL,           -- 'hudasir4j@gmail.com'
  first_name VARCHAR(100),                      -- 'Huda'
  last_name VARCHAR(100),                       -- 'A.'
  graduation_year INTEGER,                       -- 2025
  demographic_data JSONB,                        -- { gender, ethnicity, ... }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Huda's Data:**
```json
{
  "student_id": "huda-2025",
  "email": "hudasir4j@gmail.com",
  "first_name": "Huda",
  "last_name": "A.",
  "graduation_year": 2025,
  "demographic_data": {
    "gender": "Female",
    "ethnicity": "Asian/Middle Eastern",
    "state": "California",
    "school": "Evergreen Valley High School"
  }
}
```

---

#### 2. weekly_vitals - Weekly Progress Snapshots

**Purpose:** Comprehensive weekly student progress tracking
**Data Coverage:** 89 weeks for huda-2025 (Aug 2023 - March 2025)

```sql
CREATE TABLE weekly_vitals (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) REFERENCES students(student_id),
  week_number INTEGER NOT NULL,
  week_start_date TIMESTAMP NOT NULL,
  week_end_date TIMESTAMP NOT NULL,

  -- Academic Progress (JSONB)
  academic_vitals JSONB,
  /*
    Structure:
    {
      "gpa_weighted": 3.93,
      "gpa_scale": 4,
      "sat": {
        "ebrw": 750,
        "math": 780,
        "total": 1530,
        "attempts": [
          { "date": "2023-11-10", "total": 1530 }
        ]
      },
      "ap_exams": [
        { "subject": "Human Geography", "score": 5, "year": 2023 },
        { "subject": "Calculus AB", "score": 4, "year": 2024 },
        ...
      ],
      "current_courses": [
        { "name": "AP Calculus BC", "grade": "A", "level": "AP" }
      ]
    }
  */

  -- Extracurricular Activity (JSONB)
  extracurricular_vitals JSONB,
  /*
    Structure:
    {
      "activities": [
        {
          "name": "AI Ethics Game",
          "role": "Creator/Founder",
          "hours_per_week": 5,
          "weeks_per_year": 52,
          "total_years": 2,
          "leadership": true,
          "impact_metrics": {
            "users_reached": 100,
            "female_percentage": 60,
            "stem_confidence_increase": 40
          }
        }
      ]
    }
  */

  -- Awards & Recognition (JSONB)
  award_vitals JSONB,
  /*
    Structure:
    {
      "awards": [
        {
          "name": "AP Scholar with Distinction",
          "level": "National",
          "date_received": "2024-07-15"
        }
      ]
    }
  */

  -- Summer Programs (JSONB)
  program_vitals JSONB,

  -- Essay Progress (JSONB)
  essay_vitals JSONB,

  -- Application Progress (JSONB)
  application_vitals JSONB,

  -- Gap Analysis (JSONB) - 6 Core Gaps
  gap_analysis JSONB,
  /*
    Structure:
    {
      "academic": { "severity": "low", "score": 85 },
      "extracurricular": { "severity": "moderate", "score": 70 },
      "awards": { "severity": "moderate", "score": 65 },
      "testing": { "severity": "low", "score": 90 },
      "leadership": { "severity": "low", "score": 80 },
      "impact": { "severity": "moderate", "score": 75 }
    }
  */

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(student_id, week_number)
);
```

**Example Weekly Vital (Week 48 - June 2024):**
```json
{
  "week_number": 48,
  "week_start_date": "2024-06-03",
  "week_end_date": "2024-06-09",
  "academic_vitals": {
    "gpa_weighted": 3.93,
    "sat_total": 1530,
    "ap_exams_taken": 6
  },
  "extracurricular_vitals": {
    "activities": [
      {
        "name": "Synthoria Educational Game",
        "role": "Creator",
        "milestone": "Distribution campaign - reached 150 people"
      }
    ]
  },
  "gap_analysis": {
    "academic": { "severity": "low", "score": 88 },
    "extracurricular": { "severity": "low", "score": 85 },
    "awards": { "severity": "moderate", "score": 68 }
  }
}
```

---

#### 3. kb_items - Knowledge Base Items (Facts)

**Purpose:** Atomic fact storage with multi-category support
**Source:** Coaching sessions, iMessage conversations, conversational assessment

```sql
CREATE TABLE kb_items (
  item_id VARCHAR(255) PRIMARY KEY,     -- 'huda-2025_academic_conversational_v28'
  student_id VARCHAR(255) NOT NULL,     -- 'huda-2025'
  item_type VARCHAR(100) NOT NULL,      -- 'Academic' | 'Activity' | 'Award' | 'Testing' | ...
  subtype VARCHAR(100),                 -- Specific fact type (e.g., 'gpa', 'sat_score')
  title_name TEXT,                      -- Human-readable title
  tier1_state VARCHAR(50),              -- 'In Transit' | 'Planned' | 'Outcome'
  source_ref VARCHAR(100),              -- 'gpt4o_conversational_extraction_v28'
  confidence VARCHAR(20),               -- 'high' | 'medium' | 'low'

  -- Multi-Category Fact Storage (v28.1)
  edges JSONB,
  /*
    Structure:
    {
      "gpa": 3.93,
      "sat_total": 1530,
      "ap_exams_count": 6,
      "v28_metadata": {
        "confidence": 0.95,
        "extraction_method": "gpt4o_conversational",
        "source_agent": "assessment-agent-v18",
        "created_at": "2024-06-06T10:30:00Z"
      }
    }
  */

  created_ts TIMESTAMP DEFAULT NOW(),
  updated_ts TIMESTAMP DEFAULT NOW()
);
```

**Example kb_item (Academic Facts):**
```json
{
  "item_id": "huda-2025_academic_final_2025",
  "student_id": "huda-2025",
  "item_type": "Academic",
  "subtype": "transcript",
  "title_name": "Final Academic Profile",
  "tier1_state": "Outcome",
  "source_ref": "gpt4o_conversational_extraction_v28",
  "confidence": "high",
  "edges": {
    "gpa_weighted": 3.93,
    "gpa_scale": 4.0,
    "sat_total": 1530,
    "sat_ebrw": 750,
    "sat_math": 780,
    "ap_exams_count": 6,
    "ap_scores_5": 4,
    "ap_scores_4": 2,
    "v28_metadata": {
      "confidence": 0.98,
      "extraction_method": "gpt4o_conversational",
      "source_agent": "assessment-agent-v18",
      "created_at": "2024-12-15T14:22:00Z"
    }
  }
}
```

---

#### 4. ec_vitals - Extracurricular Activity Metrics

**Purpose:** Quantifiable progression snapshots for each activity
**Data Coverage:** 12 vitals for huda-2025 (4 activities x 3 snapshots each)

```sql
CREATE TABLE ec_vitals (
  vital_id VARCHAR(50) PRIMARY KEY,         -- 'VIT-HUDA-001'
  student_id VARCHAR(50) NOT NULL,          -- 'huda-2025'
  chip_id VARCHAR(50),                      -- 'CHIP-EC-AIGAME-001'
  activity_name VARCHAR(255) NOT NULL,      -- 'AI Ethics Game'
  metric_type VARCHAR(50),                  -- 'scale' | 'impact' | 'leadership' | 'product'
  metric_name VARCHAR(100),                 -- 'users_reached' | 'female_percentage'
  numeric_value INTEGER,                    -- 100
  text_value TEXT,                          -- NULL
  unit VARCHAR(50),                         -- 'users' | 'percent' | 'officers'
  as_of TIMESTAMP,                          -- '2023-06-21'
  source_id VARCHAR(100),                   -- 'SRC-SNAPSHOT-2023-06-21'
  evidence_text TEXT,                       -- '100 users reached, 60% girls'
  notes TEXT,                               -- 'Baseline measurement'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example ec_vital (Film Club Leadership Transformation):**
```json
{
  "vital_id": "VIT-HUDA-006",
  "student_id": "huda-2025",
  "chip_id": "CHIP-EC-FILMCLUB-001",
  "activity_name": "Film Makers Club",
  "metric_type": "leadership",
  "metric_name": "female_officer_percentage",
  "numeric_value": 60,
  "unit": "percent",
  "as_of": "2023-11-10",
  "source_id": "SRC-SNAPSHOT-2023-11-10",
  "evidence_text": "0% to 60% female officers transformation",
  "notes": "Significant leadership transformation - 3 of 5 officers now female"
}
```

---

#### 5. jtbd - Jobs To Be Done (Weekly Milestones)

**Purpose:** Track completed jobs/milestones from coaching sessions
**Data Coverage:** 12 jobs across 6 milestone weeks

```sql
CREATE TABLE jtbd (
  jtbd_id VARCHAR(50) PRIMARY KEY,          -- 'JTBD-HUDA-W048-001'
  student_id VARCHAR(50) NOT NULL,          -- 'huda-2025'
  week_number INTEGER NOT NULL,              -- 48
  week_start_date TIMESTAMP,                 -- '2024-06-03'
  week_end_date TIMESTAMP,                   -- '2024-06-09'
  job_type VARCHAR(50),                      -- 'ec_milestone' | 'application' | 'test' | 'award'
  job_description TEXT,                      -- 'Synthoria game distribution'
  linked_chip_id VARCHAR(50),                -- 'CHIP-EC-SYNTHORIA-001'
  linked_table VARCHAR(50),                  -- 'ec_vitals'
  status VARCHAR(20),                        -- 'completed' | 'in_progress' | 'planned'
  completion_date TIMESTAMP,                 -- '2024-06-06'
  outcome_metric VARCHAR(100),               -- 'people_reached'
  outcome_value INTEGER,                     -- 150
  outcome_unit VARCHAR(50),                  -- 'people'
  source_id VARCHAR(100),                    -- 'SRC-SNAPSHOT-2024-06-06'
  notes TEXT,                                -- 'Major distribution milestone'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example JTBD (Platform Pivot):**
```json
{
  "jtbd_id": "JTBD-HUDA-W030-001",
  "student_id": "huda-2025",
  "week_number": 30,
  "week_start_date": "2024-01-29",
  "week_end_date": "2024-02-04",
  "job_type": "ec_milestone",
  "job_description": "Folklift platform pivot from Muslim businesses to youth journalism",
  "linked_chip_id": "CHIP-EC-FOLKLIFT-001",
  "linked_table": "ec_vitals",
  "status": "completed",
  "completion_date": "2024-01-30",
  "outcome_metric": "writers_recruited",
  "outcome_value": 5,
  "outcome_unit": "writers",
  "source_id": "SRC-SNAPSHOT-2024-01-30",
  "notes": "Strategic pivot with immediate traction: 5 writers recruited"
}
```

---

#### 6. timeline_events - Growth Journey Events

**Purpose:** Transformation milestones for Timeline visualization
**Milestone Types:** 30+ types (leadership_emerged, impact_scaled, award_won, etc.)

```sql
CREATE TABLE timeline_events (
  event_id VARCHAR(50) PRIMARY KEY,          -- 'EVT-HUDA-001'
  student_id VARCHAR(50) NOT NULL,           -- 'huda-2025'
  event_type VARCHAR(100),                   -- 'leadership_transformation' | 'impact_scaled'
  event_date TIMESTAMP NOT NULL,             -- '2023-09-15'
  title TEXT,                                -- 'Film Club Leadership Transformation'
  description TEXT,                          -- 'Achieved 60% female leadership'
  impact_category VARCHAR(50),               -- 'Leadership' | 'Impact' | 'Academic'
  source_table VARCHAR(50),                  -- 'ec_vitals' | 'kb_items' | 'jtbd'
  source_id VARCHAR(100),                    -- 'VIT-HUDA-006'
  metadata JSONB,                            -- Additional event details
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example Timeline Event (Leadership Transformation):**
```json
{
  "event_id": "EVT-HUDA-012",
  "student_id": "huda-2025",
  "event_type": "leadership_transformation",
  "event_date": "2023-09-15",
  "title": "Film Makers Club: 60% Female Leadership Achieved",
  "description": "Transformed club officer structure from 0% to 60% female leadership (3 of 5 officers)",
  "impact_category": "Leadership",
  "source_table": "ec_vitals",
  "source_id": "VIT-HUDA-006",
  "metadata": {
    "metric": "female_officer_percentage",
    "before": 0,
    "after": 60,
    "unit": "percent",
    "impact_type": "gender_equity"
  }
}
```

---

#### 7. action_plans - Weekly Execution Plans

**Purpose:** Weekly strategic plans with goals and themes
**Data Coverage:** 80 weeks for huda-2025

```sql
CREATE TABLE action_plans (
  plan_id VARCHAR(50) PRIMARY KEY,           -- 'PLAN-HUDA-W048'
  student_id VARCHAR(50) NOT NULL,           -- 'huda-2025'
  week_number INTEGER NOT NULL,              -- 48
  week_start_date TIMESTAMP,                 -- '2024-06-03'
  week_end_date TIMESTAMP,                   -- '2024-06-09'
  plan_title TEXT,                           -- 'Synthoria Distribution Campaign'
  plan_theme VARCHAR(100),                   -- 'Marketing & Outreach'
  weekly_goals JSONB,
  /*
    Structure:
    {
      "primary_goal": "Reach 150 people with game distribution",
      "secondary_goals": [
        "Launch TikTok marketing campaign",
        "Gather user feedback"
      ]
    }
  */
  context TEXT,                              -- Coach's strategic context
  status VARCHAR(20),                        -- 'completed' | 'in_progress'
  completion_percentage INTEGER,             -- 95
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### 8. action_items - Task Decomposition

**Purpose:** Granular tasks within weekly action plans
**Data Coverage:** 1,151 items for huda-2025

```sql
CREATE TABLE action_items (
  item_id VARCHAR(50) PRIMARY KEY,           -- 'ITEM-HUDA-W048-001'
  plan_id VARCHAR(50) REFERENCES action_plans(plan_id),
  student_id VARCHAR(50) NOT NULL,           -- 'huda-2025'
  item_type VARCHAR(50),                     -- 'task' | 'milestone' | 'deadline'
  description TEXT,                          -- 'Email game link to school list (50 people)'
  priority VARCHAR(20),                      -- 'high' | 'medium' | 'low'
  estimated_hours DECIMAL(4,2),              -- 2.5
  actual_hours DECIMAL(4,2),                 -- 3.0
  status VARCHAR(20),                        -- 'completed' | 'in_progress' | 'pending'
  completion_date TIMESTAMP,                 -- '2024-06-06'
  linked_ec_chip VARCHAR(50),                -- 'CHIP-EC-SYNTHORIA-001'
  notes TEXT,                                -- 'Resulted in 50+ responses'
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### 9. game_plan - Strategic Roadmap

**Purpose:** Overall strategic plan for college admissions journey

```sql
CREATE TABLE game_plan (
  plan_id VARCHAR(50) PRIMARY KEY,           -- 'GP-HUDA-2025'
  student_id VARCHAR(50) NOT NULL,           -- 'huda-2025'
  created_at TIMESTAMP,                      -- '2023-08-15'
  updated_at TIMESTAMP,                      -- '2024-12-01'

  -- Strategic Overview
  roadmap JSONB,
  /*
    Structure:
    {
      "phases": [
        {
          "phase": "Foundation Building",
          "timeline": "Aug 2023 - Dec 2023",
          "goals": [
            "Establish 4 core ECs with measurable impact",
            "Achieve SAT 1500+",
            "Maintain GPA 3.9+"
          ]
        },
        {
          "phase": "Amplification & Scale",
          "timeline": "Jan 2024 - Aug 2024",
          "goals": [
            "Scale EC impact metrics by 2x",
            "Apply to 3+ summer programs",
            "Draft all college essays"
          ]
        },
        {
          "phase": "Application Execution",
          "timeline": "Sep 2024 - Jan 2025",
          "goals": [
            "Submit 12 college applications",
            "Complete 8 scholarship applications",
            "Finalize all supplemental essays"
          ]
        }
      ]
    }
  */

  -- Opportunity Targeting
  opportunities JSONB,
  /*
    Structure:
    {
      "awards": [
        {
          "name": "Scholastic Art & Writing Awards",
          "deadline": "2024-01-15",
          "priority": "high",
          "fit_score": 85
        }
      ],
      "programs": [
        {
          "name": "Bank of America Student Leaders",
          "deadline": "2023-11-10",
          "priority": "high",
          "fit_score": 90
        }
      ],
      "scholarships": [
        {
          "name": "Coca-Cola Scholars",
          "deadline": "2024-10-31",
          "priority": "medium",
          "fit_score": 75
        }
      ]
    }
  */

  -- Timeline
  timeline JSONB,
  /*
    Structure:
    {
      "milestones": [
        {
          "date": "2023-11-10",
          "event": "SAT Test Date",
          "type": "deadline"
        },
        {
          "date": "2024-06-06",
          "event": "Synthoria Distribution Launch",
          "type": "ec_milestone"
        }
      ]
    }
  */

  -- Weak Spot Prioritization (TYPE-002)
  weak_spots JSONB,
  /*
    Structure:
    {
      "identified_gaps": [
        {
          "category": "Awards",
          "severity": "moderate",
          "description": "Limited national-level recognition",
          "priority": 2,
          "action_plan": "Apply to 5+ competitions Q1 2024"
        }
      ]
    }
  */

  status VARCHAR(20)                         -- 'active' | 'completed'
);
```

---

#### 10. ivyscore - Composite Readiness Score

**Purpose:** Overall college readiness calculation (TYPE-081)

```sql
CREATE TABLE ivyscore (
  score_id VARCHAR(50) PRIMARY KEY,          -- 'SCORE-HUDA-2024-12'
  student_id VARCHAR(50) NOT NULL,           -- 'huda-2025'
  calculated_at TIMESTAMP,                   -- '2024-12-01'

  -- Overall Score (0-100)
  overall_score INTEGER,                     -- 78

  -- Component Scores
  academic_score INTEGER,                    -- 88 (GPA + Test Scores + Rigor)
  extracurricular_score INTEGER,             -- 85 (Impact + Leadership + Depth)
  awards_score INTEGER,                      -- 68 (Recognition level + Selectivity)
  essay_score INTEGER,                       -- 75 (Quality + Authenticity)
  letters_score INTEGER,                     -- 80 (Relationship + Specificity)
  interview_score INTEGER,                   -- 70 (Preparedness + Engagement)

  -- Detailed Breakdown
  score_breakdown JSONB,
  /*
    Structure:
    {
      "academic": {
        "gpa_weighted": 3.93,
        "sat_total": 1530,
        "ap_exams": 6,
        "rigor_rating": "High",
        "score": 88,
        "weight": 0.35
      },
      "extracurricular": {
        "activities_count": 4,
        "leadership_roles": 3,
        "impact_documented": true,
        "score": 85,
        "weight": 0.25
      },
      "awards": {
        "national_level": 1,
        "state_level": 2,
        "local_level": 5,
        "score": 68,
        "weight": 0.15
      },
      ...
    }
  */

  -- College Targeting Recommendations
  recommendations JSONB,
  /*
    Structure:
    {
      "reach_schools": ["Stanford", "MIT", "Harvard"],
      "target_schools": ["UC Berkeley", "UNC Chapel Hill", "UVA"],
      "safety_schools": ["UC Davis", "UC Irvine"],
      "fit_analysis": "Strong STEM profile with social impact focus..."
    }
  */

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example IvyScore (Dec 2024):**
```json
{
  "score_id": "SCORE-HUDA-2024-12",
  "student_id": "huda-2025",
  "calculated_at": "2024-12-01",
  "overall_score": 78,
  "academic_score": 88,
  "extracurricular_score": 85,
  "awards_score": 68,
  "essay_score": 75,
  "letters_score": 80,
  "interview_score": 70,
  "score_breakdown": {
    "academic": {
      "gpa_weighted": 3.93,
      "sat_total": 1530,
      "ap_exams": 6,
      "score": 88,
      "justification": "Strong GPA, competitive SAT, rigorous course load with 6 APs"
    },
    "extracurricular": {
      "activities_count": 4,
      "leadership_roles": 3,
      "quantifiable_impact": true,
      "score": 85,
      "justification": "Deep involvement in 4 ECs with documented metrics, clear narrative around tech+education+equity"
    }
  }
}
```

---

#### 11. gaps - Gap Analysis (6 Core Dimensions)

**Purpose:** Identify weaknesses and action items (TYPE-082, TYPE-086)

```sql
CREATE TABLE gaps (
  gap_id VARCHAR(50) PRIMARY KEY,            -- 'GAP-HUDA-AWARDS-2024'
  student_id VARCHAR(50) NOT NULL,           -- 'huda-2025'
  gap_category VARCHAR(50),                  -- 'Academic' | 'Extracurricular' | 'Awards' | 'Testing' | 'Leadership' | 'Impact'
  severity VARCHAR(20),                      -- 'critical' | 'high' | 'moderate' | 'low'
  description TEXT,                          -- 'Limited national-level awards'
  recommendation TEXT,                       -- 'Apply to 5+ national competitions'
  priority_rank INTEGER,                     -- 1-6 (1 = highest priority)
  identified_at TIMESTAMP,                   -- '2024-01-15'
  resolved_at TIMESTAMP,                     -- NULL (if still open)
  status VARCHAR(20),                        -- 'open' | 'in_progress' | 'resolved'

  -- Gap-specific metrics
  current_state JSONB,
  /*
    Structure (for Awards gap):
    {
      "national_awards": 1,
      "state_awards": 2,
      "local_awards": 5,
      "total": 8
    }
  */

  target_state JSONB,
  /*
    Structure (for Awards gap):
    {
      "national_awards": 3,
      "state_awards": 5,
      "local_awards": 8,
      "total": 16
    }
  */

  action_items JSONB,
  /*
    Structure:
    [
      {
        "action": "Apply to Scholastic Art & Writing Awards",
        "deadline": "2024-01-15",
        "status": "completed"
      },
      {
        "action": "Submit to Congressional App Challenge",
        "deadline": "2024-10-15",
        "status": "completed"
      }
    ]
  */

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example Gap (Awards):**
```json
{
  "gap_id": "GAP-HUDA-AWARDS-2024",
  "student_id": "huda-2025",
  "gap_category": "Awards",
  "severity": "moderate",
  "description": "Limited national-level recognition - only 1 national award (AP Scholar with Distinction). Need 2-3 more competitive national awards to strengthen application.",
  "recommendation": "Apply to 5+ national competitions aligned with CS/education theme: Scholastic Art & Writing, Congressional App Challenge, NCWIT, etc.",
  "priority_rank": 2,
  "identified_at": "2024-01-15",
  "resolved_at": null,
  "status": "in_progress",
  "current_state": {
    "national_awards": 1,
    "state_awards": 2,
    "local_awards": 5,
    "total": 8
  },
  "target_state": {
    "national_awards": 3,
    "state_awards": 5,
    "local_awards": 8,
    "total": 16
  },
  "action_items": [
    {
      "action": "Apply to Scholastic Art & Writing Awards (Interactive category)",
      "deadline": "2024-01-15",
      "status": "completed",
      "outcome": "Regional Silver Key"
    },
    {
      "action": "Submit to Congressional App Challenge",
      "deadline": "2024-10-15",
      "status": "completed",
      "outcome": "District Winner"
    }
  ]
}
```

---

## Fact-Based Data Model

### Fact Architecture

The IvyLevel platform uses a **fact-based data model** where every piece of information is stored as an atomic, verifiable fact with complete provenance tracking.

#### Fact Categories

**7 Core Fact Categories:**

1. **Academic** - GPA, coursework, grades
2. **Testing** - SAT, ACT, AP exams
3. **Activity** - Extracurricular activities, clubs
4. **Award** - Recognitions, honors, scholarships
5. **Program** - Summer programs, camps
6. **Essay** - Personal statement, supplementals
7. **Application** - College applications, deadlines

#### Fact Storage in kb_items

```sql
-- Example: Multiple facts in one kb_item (Multi-Category Storage v28.1)
{
  "item_id": "huda-2025_comprehensive_profile_2025",
  "student_id": "huda-2025",
  "item_type": "Comprehensive",
  "source_ref": "gpt4o_conversational_extraction_v28",
  "edges": {
    // Academic Facts
    "gpa_weighted": 3.93,
    "gpa_unweighted": 3.8,
    "gpa_scale": 4.0,
    "class_rank": null,

    // Testing Facts
    "sat_total": 1530,
    "sat_ebrw": 750,
    "sat_math": 780,
    "act_composite": null,
    "ap_exams_count": 6,

    // Activity Facts
    "ec_count": 4,
    "ec_leadership_roles": 3,
    "ec_hours_weekly": 20,

    // Award Facts
    "awards_national": 1,
    "awards_state": 2,
    "awards_local": 5,

    "v28_metadata": {
      "confidence": 0.98,
      "extraction_method": "gpt4o_conversational",
      "source_agent": "assessment-agent-v18",
      "created_at": "2024-12-15T14:22:00Z",
      "fact_count": 18
    }
  }
}
```

#### Fact Extraction Layer (PostgresFactSource)

**File:** `services/agent-framework/src/facts/PostgresFactSource.ts`

```typescript
class PostgresFactSource implements FactSource {
  async extractAcademicFacts(student_id: string): Promise<AcademicFact[]> {
    // Query students table + weekly_vitals.academic_vitals + kb_items
    const gpaFact = await this.pool.query(`
      SELECT
        (academic_vitals->>'gpa_weighted')::decimal as gpa_weighted,
        (academic_vitals->>'gpa_scale')::decimal as gpa_scale
      FROM weekly_vitals
      WHERE student_id = $1
      ORDER BY week_number DESC
      LIMIT 1
    `, [student_id]);

    return [{
      fact_type: 'gpa',
      value: gpaFact.rows[0].gpa_weighted,
      scale: gpaFact.rows[0].gpa_scale,
      source: 'weekly_vitals',
      verified: true,
      as_of: new Date()
    }];
  }

  async extractExtracurricularFacts(student_id: string): Promise<ECFact[]> {
    // Query ec_vitals table for quantifiable metrics
    const vitals = await this.pool.query(`
      SELECT
        activity_name,
        metric_name,
        numeric_value,
        unit,
        as_of
      FROM ec_vitals
      WHERE student_id = $1
      ORDER BY as_of DESC
    `, [student_id]);

    return vitals.rows.map(v => ({
      activity_name: v.activity_name,
      metric: v.metric_name,
      value: v.numeric_value,
      unit: v.unit,
      measured_at: v.as_of,
      source: 'ec_vitals',
      verified: true
    }));
  }

  // Similar methods for Awards, Testing, Programs, etc.
}
```

---

## Knowledge Base (KB) System

### Pinecone Vector Store

**Index:** `jenny-v3-3072-093025`
**Dimension:** 3072
**Embedding Model:** `text-embedding-3-large`

#### Namespaces

**1. Sessions/JTBD (924 vectors)**
- Coaching session transcripts
- Weekly conversation summaries
- Strategic insights
- Action recommendations

**2. iMessage (40 vectors)**
- Casual check-ins
- Quick questions
- Progress updates
- Relationship building

**3. Assessment (9 vectors)**
- Initial profile assessment
- Gap analysis results
- Strength identification
- Target recommendations

#### RAG Retrieval for Context

```typescript
// Example: Retrieve similar coaching scenarios
async function getCoachingContext(query: string, student_id: string) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query
  });

  const results = await pinecone.query({
    vector: embedding.data[0].embedding,
    topK: 5,
    namespace: 'sessions_jtbd',
    filter: {
      student_id: student_id  // Filter to same student for consistency
    }
  });

  return results.matches;  // Returns top 5 most similar session contexts
}
```

**Use Cases:**
- **Consistency:** Retrieve previous similar situations and responses
- **Context:** Load relevant background before generating response
- **Learning:** Find successful strategies from past weeks
- **Personalization:** Understand student's communication style

---

## Frontend Tab Architecture

### Tab 1: Assessment

**Purpose:** Display overall readiness, gaps, and actionable insights

**URL:** `/students/huda-2025/assessment`

#### Components

**1. IvyScore Dashboard**

```typescript
// Component: IvyScoreDashboard.tsx
interface IvyScoreData {
  overall_score: number;        // 0-100
  academic_score: number;
  extracurricular_score: number;
  awards_score: number;
  essay_score: number;
  letters_score: number;
  interview_score: number;
}

// Rendered as radial chart
<RadialChart
  value={ivyScore.overall_score}
  max={100}
  size="large"
  color={getScoreColor(ivyScore.overall_score)}
/>

// Score Color Logic:
// 85-100: Green (Strong)
// 70-84: Yellow (Competitive)
// 55-69: Orange (Developing)
// 0-54: Red (Needs Work)
```

**API Endpoint:**
```typescript
GET /students/:student_id/assessment

Response:
{
  ivyscore: {
    overall_score: 78,
    academic_score: 88,
    extracurricular_score: 85,
    awards_score: 68,
    essay_score: 75,
    calculated_at: "2024-12-01T10:00:00Z"
  }
}

// SQL Query:
SELECT
  overall_score,
  academic_score,
  extracurricular_score,
  awards_score,
  essay_score,
  letters_score,
  interview_score,
  calculated_at
FROM ivyscore
WHERE student_id = 'huda-2025'
ORDER BY calculated_at DESC
LIMIT 1
```

**2. Gap Analysis Cards**

```typescript
// Component: GapAnalysisGrid.tsx
interface Gap {
  gap_category: string;        // 'Awards' | 'Academic' | ...
  severity: string;            // 'critical' | 'high' | 'moderate' | 'low'
  description: string;
  recommendation: string;
  priority_rank: number;
  current_state: object;
  target_state: object;
}

// Rendered as 6 cards (one per gap category)
<Grid cols={2}>
  {gaps.map(gap => (
    <GapCard
      key={gap.gap_category}
      category={gap.gap_category}
      severity={gap.severity}
      description={gap.description}
      recommendation={gap.recommendation}
      progress={calculateProgress(gap.current_state, gap.target_state)}
    />
  ))}
</Grid>

// Card Color by Severity:
// critical: Red border
// high: Orange border
// moderate: Yellow border
// low: Green border
```

**API Endpoint:**
```typescript
GET /students/:student_id/gaps

Response:
{
  gaps: [
    {
      gap_category: "Awards",
      severity: "moderate",
      description: "Limited national-level recognition",
      recommendation: "Apply to 5+ national competitions",
      priority_rank: 2,
      current_state: { national_awards: 1, state_awards: 2 },
      target_state: { national_awards: 3, state_awards: 5 }
    },
    // ... 5 more gaps
  ]
}

// SQL Query:
SELECT
  gap_category,
  severity,
  description,
  recommendation,
  priority_rank,
  current_state,
  target_state,
  status
FROM gaps
WHERE student_id = 'huda-2025'
  AND status IN ('open', 'in_progress')
ORDER BY priority_rank ASC
```

**3. Strengths & Weaknesses**

```typescript
// Component: StrengthsWeaknesses.tsx
// Data Source: Derived from ivyscore.score_breakdown JSONB

interface Strength {
  category: string;
  score: number;
  evidence: string[];
}

// Displayed as two-column layout
<div className="grid grid-cols-2 gap-4">
  <div className="strengths">
    <h3>Strengths</h3>
    {strengths.map(s => (
      <StrengthItem
        category={s.category}
        score={s.score}
        evidence={s.evidence}
      />
    ))}
  </div>
  <div className="weaknesses">
    <h3>Areas to Improve</h3>
    {weaknesses.map(w => (
      <WeaknessItem
        category={w.category}
        score={w.score}
        recommendations={w.recommendations}
      />
    ))}
  </div>
</div>
```

**API Endpoint:**
```typescript
GET /students/:student_id/strengths-weaknesses

Response:
{
  strengths: [
    {
      category: "Academic",
      score: 88,
      evidence: [
        "Weighted GPA 3.93",
        "SAT 1530 (97th percentile)",
        "6 AP exams with 4 scores of 5"
      ]
    },
    {
      category: "Extracurricular",
      score: 85,
      evidence: [
        "4 deep ECs with quantifiable impact",
        "3 leadership roles",
        "60% female leadership transformation in Film Club"
      ]
    }
  ],
  weaknesses: [
    {
      category: "Awards",
      score: 68,
      recommendations: [
        "Apply to 5+ national competitions",
        "Target CS/education-aligned awards",
        "Leverage existing projects for submissions"
      ]
    }
  ]
}

// SQL Query: Parse ivyscore.score_breakdown JSONB
```

---

### Tab 2: Game Plan

**Purpose:** Strategic roadmap, opportunities, timeline

**URL:** `/students/huda-2025/gameplan`

#### Components

**1. Strategic Roadmap (3 Phases)**

```typescript
// Component: StrategicRoadmap.tsx
interface Phase {
  phase: string;
  timeline: string;
  goals: string[];
  status: 'completed' | 'in_progress' | 'upcoming';
}

// Rendered as horizontal timeline
<Timeline orientation="horizontal">
  {roadmap.phases.map(phase => (
    <TimelineItem
      title={phase.phase}
      subtitle={phase.timeline}
      status={phase.status}
    >
      <ul>
        {phase.goals.map(goal => (
          <li>{goal}</li>
        ))}
      </ul>
    </TimelineItem>
  ))}
</Timeline>
```

**API Endpoint:**
```typescript
GET /students/:student_id/gameplan

Response:
{
  roadmap: {
    phases: [
      {
        phase: "Foundation Building",
        timeline: "Aug 2023 - Dec 2023",
        status: "completed",
        goals: [
          "Establish 4 core ECs with measurable impact",
          "Achieve SAT 1500+",
          "Maintain GPA 3.9+"
        ]
      },
      {
        phase: "Amplification & Scale",
        timeline: "Jan 2024 - Aug 2024",
        status: "completed",
        goals: [
          "Scale EC impact metrics by 2x",
          "Apply to 3+ summer programs",
          "Draft all college essays"
        ]
      },
      {
        phase: "Application Execution",
        timeline: "Sep 2024 - Jan 2025",
        status: "in_progress",
        goals: [
          "Submit 12 college applications",
          "Complete 8 scholarship applications",
          "Finalize all supplemental essays"
        ]
      }
    ]
  }
}

// SQL Query:
SELECT roadmap
FROM game_plan
WHERE student_id = 'huda-2025'
ORDER BY updated_at DESC
LIMIT 1
```

**2. Opportunities Grid**

```typescript
// Component: OpportunitiesGrid.tsx
interface Opportunity {
  type: 'award' | 'program' | 'scholarship';
  name: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  fit_score: number;  // 0-100
  status: 'planned' | 'applied' | 'accepted' | 'declined';
}

// Rendered as filterable grid with tabs
<Tabs defaultValue="awards">
  <TabsList>
    <TabsTrigger value="awards">Awards</TabsTrigger>
    <TabsTrigger value="programs">Programs</TabsTrigger>
    <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
  </TabsList>
  <TabsContent value="awards">
    <OpportunityGrid opportunities={opportunities.awards} />
  </TabsContent>
  // ... other tabs
</Tabs>
```

**API Endpoint:**
```typescript
GET /students/:student_id/opportunities

Response:
{
  awards: [
    {
      name: "Scholastic Art & Writing Awards",
      deadline: "2024-01-15",
      priority: "high",
      fit_score: 85,
      status: "applied",
      outcome: "Regional Silver Key"
    },
    // ... more awards
  ],
  programs: [
    {
      name: "Bank of America Student Leaders",
      deadline: "2023-11-10",
      priority: "high",
      fit_score: 90,
      status: "applied",
      outcome: "Selected"
    },
    // ... more programs
  ],
  scholarships: [
    {
      name: "Coca-Cola Scholars",
      deadline: "2024-10-31",
      priority: "medium",
      fit_score: 75,
      status: "planned"
    },
    // ... more scholarships
  ]
}

// SQL Query:
SELECT opportunities
FROM game_plan
WHERE student_id = 'huda-2025'
ORDER BY updated_at DESC
LIMIT 1
```

---

### Tab 3: Preparation (Weekly Action Plans)

**Purpose:** Weekly execution, task tracking, progress monitoring

**URL:** `/students/huda-2025/preparation`

#### Components

**1. Weekly Calendar View**

```typescript
// Component: WeeklyCalendar.tsx
// Shows all 89 weeks with status indicators

interface Week {
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  has_action_plan: boolean;
  completion_percentage: number;
  tasks_total: number;
  tasks_completed: number;
}

// Rendered as calendar grid
<Calendar>
  {weeks.map(week => (
    <CalendarWeek
      key={week.week_number}
      weekNumber={week.week_number}
      startDate={week.week_start_date}
      status={getWeekStatus(week)}
      completion={week.completion_percentage}
      onClick={() => selectWeek(week.week_number)}
    />
  ))}
</Calendar>

// Week Status:
// 100% complete: Green
// 50-99% complete: Yellow
// 1-49% complete: Orange
// No plan: Grey
```

**API Endpoint:**
```typescript
GET /students/:student_id/weekly-vitals?include_action_plans=true

Response:
{
  weeks: [
    {
      week_number: 48,
      week_start_date: "2024-06-03",
      week_end_date: "2024-06-09",
      has_action_plan: true,
      plan_title: "Synthoria Distribution Campaign",
      plan_theme: "Marketing & Outreach",
      completion_percentage: 95,
      tasks_total: 8,
      tasks_completed: 7
    },
    // ... 88 more weeks
  ]
}

// SQL Query:
SELECT
  wv.week_number,
  wv.week_start_date,
  wv.week_end_date,
  ap.plan_title,
  ap.plan_theme,
  ap.completion_percentage,
  COUNT(ai.item_id) as tasks_total,
  SUM(CASE WHEN ai.status = 'completed' THEN 1 ELSE 0 END) as tasks_completed
FROM weekly_vitals wv
LEFT JOIN action_plans ap ON wv.student_id = ap.student_id AND wv.week_number = ap.week_number
LEFT JOIN action_items ai ON ap.plan_id = ai.plan_id
WHERE wv.student_id = 'huda-2025'
GROUP BY wv.week_number, ap.plan_id
ORDER BY wv.week_number ASC
```

**2. Action Plan Detail View**

```typescript
// Component: ActionPlanDetail.tsx
// Shows selected week's plan + tasks

interface ActionPlan {
  plan_title: string;
  plan_theme: string;
  weekly_goals: {
    primary_goal: string;
    secondary_goals: string[];
  };
  context: string;
  tasks: ActionItem[];
}

interface ActionItem {
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimated_hours: number;
  actual_hours: number;
  status: 'completed' | 'in_progress' | 'pending';
  completion_date: string;
}

// Rendered as detail panel
<ActionPlanPanel>
  <Header>
    <h2>{plan.plan_title}</h2>
    <Badge>{plan.plan_theme}</Badge>
  </Header>
  <Goals>
    <PrimaryGoal>{plan.weekly_goals.primary_goal}</PrimaryGoal>
    <SecondaryGoals>
      {plan.weekly_goals.secondary_goals.map(g => <li>{g}</li>)}
    </SecondaryGoals>
  </Goals>
  <TaskList>
    {plan.tasks.map(task => (
      <TaskItem
        description={task.description}
        priority={task.priority}
        status={task.status}
        hours={task.actual_hours}
      />
    ))}
  </TaskList>
</ActionPlanPanel>
```

**API Endpoint:**
```typescript
GET /students/:student_id/action-plans/:week_number

Response:
{
  plan_title: "Synthoria Distribution Campaign",
  plan_theme: "Marketing & Outreach",
  weekly_goals: {
    primary_goal: "Reach 150 people with game distribution",
    secondary_goals: [
      "Launch TikTok marketing campaign",
      "Gather user feedback"
    ]
  },
  context: "Week 48 focus: Amplify Synthoria reach through multi-channel distribution...",
  tasks: [
    {
      description: "Email game link to school list (50 people)",
      priority: "high",
      estimated_hours: 2.5,
      actual_hours: 3.0,
      status: "completed",
      completion_date: "2024-06-04"
    },
    {
      description: "Create 3 TikTok videos showcasing game features",
      priority: "high",
      estimated_hours: 5.0,
      actual_hours: 6.0,
      status: "completed",
      completion_date: "2024-06-06"
    },
    // ... 6 more tasks
  ]
}

// SQL Query:
SELECT
  ap.*,
  json_agg(ai.*) as tasks
FROM action_plans ap
LEFT JOIN action_items ai ON ap.plan_id = ai.plan_id
WHERE ap.student_id = 'huda-2025'
  AND ap.week_number = 48
GROUP BY ap.plan_id
```

---

### Tab 4: Growth Journey (Timeline)

**Purpose:** Visualize transformation milestones and progression

**URL:** `/students/huda-2025/timeline`

#### Components

**1. Timeline Visualization**

```typescript
// Component: GrowthTimeline.tsx
// Interactive timeline with 30+ milestone types

interface TimelineEvent {
  event_id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string;
  impact_category: string;
  metadata: object;
}

// Milestone Types (30+):
const milestoneTypes = [
  'leadership_transformation',
  'impact_scaled',
  'award_won',
  'program_accepted',
  'test_score_achieved',
  'gpa_milestone',
  'ec_launched',
  'competition_submitted',
  'scholarship_won',
  'essay_completed',
  'lor_secured',
  'application_submitted',
  'acceptance_received',
  // ... 17 more types
];

// Rendered as vertical timeline with icons
<VerticalTimeline>
  {events.map(event => (
    <TimelineEvent
      key={event.event_id}
      type={event.event_type}
      date={event.event_date}
      icon={getEventIcon(event.event_type)}
      color={getEventColor(event.impact_category)}
    >
      <TimelineEventCard>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        {event.metadata.metric && (
          <Metric>
            {event.metadata.metric}: {event.metadata.before} → {event.metadata.after}
          </Metric>
        )}
      </TimelineEventCard>
    </TimelineEvent>
  ))}
</VerticalTimeline>
```

**API Endpoint:**
```typescript
GET /students/:student_id/timeline

Response:
{
  events: [
    {
      event_id: "EVT-HUDA-001",
      event_type: "leadership_transformation",
      event_date: "2023-09-15",
      title: "Film Makers Club: 60% Female Leadership Achieved",
      description: "Transformed club officer structure from 0% to 60% female leadership",
      impact_category: "Leadership",
      metadata: {
        metric: "female_officer_percentage",
        before: 0,
        after: 60,
        unit: "percent"
      }
    },
    {
      event_id: "EVT-HUDA-012",
      event_type: "impact_scaled",
      event_date: "2024-06-06",
      title: "Synthoria Distribution Milestone",
      description: "Reached 150 people through multi-channel distribution campaign",
      impact_category: "Impact",
      metadata: {
        metric: "people_reached",
        value: 150,
        channels: ["email", "social_media", "tiktok"]
      }
    },
    {
      event_id: "EVT-HUDA-030",
      event_type: "acceptance_received",
      event_date: "2024-12-15",
      title: "UNC Chapel Hill - ACCEPTED (Early Action)",
      description: "Accepted to dream school with likely admission to Honors Program",
      impact_category: "Outcome",
      metadata: {
        college: "UNC Chapel Hill",
        decision_type: "Early Action",
        admission_status: "Accepted"
      }
    },
    // ... 27 more events
  ]
}

// SQL Query:
SELECT
  event_id,
  event_type,
  event_date,
  title,
  description,
  impact_category,
  metadata
FROM timeline_events
WHERE student_id = 'huda-2025'
ORDER BY event_date ASC
```

**2. EC Vitals Progression Charts**

```typescript
// Component: ECProgressionCharts.tsx
// Line charts showing metric growth over time

interface ECMetric {
  activity_name: string;
  metric_name: string;
  data_points: {
    date: string;
    value: number;
  }[];
}

// Rendered as multi-line chart
<LineChart data={ecMetrics}>
  {ecMetrics.map(metric => (
    <Line
      key={`${metric.activity_name}-${metric.metric_name}`}
      dataKey="value"
      data={metric.data_points}
      name={`${metric.activity_name}: ${metric.metric_name}`}
      stroke={getActivityColor(metric.activity_name)}
    />
  ))}
</LineChart>

// Example: Film Club female_officer_percentage
// Data points: [(2023-08-01, 0), (2023-09-15, 60), (2024-06-01, 60)]
```

**API Endpoint:**
```typescript
GET /students/:student_id/ec-progression

Response:
{
  metrics: [
    {
      activity_name: "AI Ethics Game",
      metric_name: "users_reached",
      data_points: [
        { date: "2023-06-21", value: 100 },
        { date: "2024-06-06", value: 150 }
      ]
    },
    {
      activity_name: "Film Makers Club",
      metric_name: "female_officer_percentage",
      data_points: [
        { date: "2023-08-01", value: 0 },
        { date: "2023-09-15", value: 60 },
        { date: "2024-06-01", value: 60 }
      ]
    },
    {
      activity_name: "Synthoria Educational Game",
      metric_name: "tiktok_avg_views",
      data_points: [
        { date: "2024-06-06", value: 2750 }
      ]
    }
    // ... more metrics
  ]
}

// SQL Query:
SELECT
  activity_name,
  metric_name,
  json_agg(json_build_object(
    'date', as_of,
    'value', numeric_value
  ) ORDER BY as_of ASC) as data_points
FROM ec_vitals
WHERE student_id = 'huda-2025'
GROUP BY activity_name, metric_name
```

---

## Data Flow: DB → Backend → Frontend

### Complete Request Flow Example

**User Action:** Student clicks "Assessment" tab

```
1. Frontend (React Component)
   File: AssessmentTab.tsx

   useEffect(() => {
     fetchAssessmentData('huda-2025');
   }, []);

   ↓

2. API Call
   GET http://localhost:8787/students/huda-2025/assessment

   ↓

3. Backend Route Handler
   File: routes/students.ts

   router.get('/students/:student_id/assessment', async (req, res) => {
     const { student_id } = req.params;

     // Parallel queries for performance
     const [ivyscore, gaps, strengths] = await Promise.all([
       getIvyScore(student_id),
       getGaps(student_id),
       getStrengthsWeaknesses(student_id)
     ]);

     res.json({ ivyscore, gaps, strengths });
   });

   ↓

4. Business Logic Layer
   File: services/assessmentService.ts

   async function getIvyScore(student_id: string) {
     // Query PostgreSQL
     const result = await pool.query(`
       SELECT
         overall_score,
         academic_score,
         extracurricular_score,
         awards_score,
         essay_score,
         score_breakdown,
         calculated_at
       FROM ivyscore
       WHERE student_id = $1
       ORDER BY calculated_at DESC
       LIMIT 1
     `, [student_id]);

     return result.rows[0];
   }

   async function getGaps(student_id: string) {
     const result = await pool.query(`
       SELECT
         gap_category,
         severity,
         description,
         recommendation,
         priority_rank,
         current_state,
         target_state,
         status
       FROM gaps
       WHERE student_id = $1
         AND status IN ('open', 'in_progress')
       ORDER BY priority_rank ASC
     `, [student_id]);

     return result.rows;
   }

   async function getStrengthsWeaknesses(student_id: string) {
     // Extract from ivyscore.score_breakdown JSONB
     const result = await pool.query(`
       SELECT score_breakdown
       FROM ivyscore
       WHERE student_id = $1
       ORDER BY calculated_at DESC
       LIMIT 1
     `, [student_id]);

     const breakdown = result.rows[0].score_breakdown;

     // Categorize by score threshold
     const strengths = [];
     const weaknesses = [];

     for (const [category, data] of Object.entries(breakdown)) {
       if (data.score >= 80) {
         strengths.push({
           category,
           score: data.score,
           evidence: extractEvidence(data)
         });
       } else if (data.score < 70) {
         weaknesses.push({
           category,
           score: data.score,
           recommendations: extractRecommendations(data)
         });
       }
     }

     return { strengths, weaknesses };
   }

   ↓

5. Database Query Execution
   PostgreSQL Database: ivylevel

   Tables accessed:
   - ivyscore (1 row)
   - gaps (6 rows)

   Execution time: ~50ms

   ↓

6. Response Sent to Frontend
   HTTP 200 OK

   {
     "ivyscore": {
       "overall_score": 78,
       "academic_score": 88,
       "extracurricular_score": 85,
       "awards_score": 68,
       "essay_score": 75,
       "calculated_at": "2024-12-01T10:00:00Z"
     },
     "gaps": [
       {
         "gap_category": "Awards",
         "severity": "moderate",
         "description": "Limited national-level recognition",
         "recommendation": "Apply to 5+ national competitions",
         "priority_rank": 2
       },
       // ... 5 more gaps
     ],
     "strengths": [
       {
         "category": "Academic",
         "score": 88,
         "evidence": ["GPA 3.93", "SAT 1530", "6 APs"]
       },
       {
         "category": "Extracurricular",
         "score": 85,
         "evidence": ["4 deep ECs", "3 leadership roles", "Quantifiable impact"]
       }
     ],
     "weaknesses": [
       {
         "category": "Awards",
         "score": 68,
         "recommendations": ["Apply to national competitions", "Leverage existing projects"]
       }
     ]
   }

   ↓

7. Frontend Rendering
   Component: AssessmentTab.tsx

   const [data, setData] = useState(null);

   // Update state with API response
   setData(response.data);

   // Render components
   return (
     <div>
       <IvyScoreDashboard score={data.ivyscore} />
       <GapAnalysisGrid gaps={data.gaps} />
       <StrengthsWeaknesses
         strengths={data.strengths}
         weaknesses={data.weaknesses}
       />
     </div>
   );

   ↓

8. User Sees Rendered UI
   - IvyScore radial chart showing 78/100
   - 6 gap cards with severity colors
   - Strengths list (Academic, Extracurricular)
   - Weaknesses list (Awards)
   - All data sourced from database with complete traceability
```

---

## Real Huda Data Examples

### Week 48 Snapshot (June 2024)

**Date Range:** June 3-9, 2024
**Theme:** Synthoria Distribution Campaign

#### Weekly Vital
```json
{
  "week_number": 48,
  "week_start_date": "2024-06-03",
  "week_end_date": "2024-06-09",
  "academic_vitals": {
    "gpa_weighted": 3.93,
    "sat_total": 1530,
    "ap_exams_complete": 6
  },
  "extracurricular_vitals": {
    "activities": [
      {
        "name": "Synthoria Educational Game",
        "hours_this_week": 12,
        "milestone": "Distribution launch - 150 people reached"
      }
    ]
  },
  "gap_analysis": {
    "academic": { "severity": "low", "score": 88 },
    "extracurricular": { "severity": "low", "score": 85 },
    "awards": { "severity": "moderate", "score": 68 }
  }
}
```

#### JTBD (Jobs Completed)
```json
[
  {
    "jtbd_id": "JTBD-HUDA-W048-001",
    "job_type": "ec_milestone",
    "job_description": "Synthoria game distribution - reached 150 people via email and social media",
    "outcome_metric": "people_reached",
    "outcome_value": 150,
    "status": "completed"
  },
  {
    "jtbd_id": "JTBD-HUDA-W048-002",
    "job_type": "ec_milestone",
    "job_description": "TikTok marketing campaign for Synthoria achieving 2500-3000 views per video",
    "outcome_metric": "avg_video_views",
    "outcome_value": 2750,
    "status": "completed"
  }
]
```

#### EC Vitals (Progression Snapshots)
```json
[
  {
    "vital_id": "VIT-HUDA-010",
    "activity_name": "Synthoria Educational Game",
    "metric_type": "scale",
    "metric_name": "people_reached",
    "numeric_value": 150,
    "unit": "people",
    "as_of": "2024-06-06",
    "evidence_text": "Sent to 150 people via email/social in W048"
  },
  {
    "vital_id": "VIT-HUDA-011",
    "activity_name": "Synthoria Educational Game",
    "metric_type": "impact",
    "metric_name": "tiktok_avg_views",
    "numeric_value": 2750,
    "unit": "views",
    "as_of": "2024-06-06",
    "evidence_text": "TikTok posts getting 2500-3000 views (avg 2750)"
  }
]
```

#### Action Plan
```json
{
  "plan_id": "PLAN-HUDA-W048",
  "plan_title": "Synthoria Distribution Campaign",
  "plan_theme": "Marketing & Outreach",
  "weekly_goals": {
    "primary_goal": "Reach 150 people with game distribution",
    "secondary_goals": [
      "Launch TikTok marketing campaign",
      "Gather user feedback for iterations"
    ]
  },
  "status": "completed",
  "completion_percentage": 95
}
```

#### Action Items (8 tasks)
```json
[
  {
    "description": "Email game link to school contact list (50 people)",
    "priority": "high",
    "estimated_hours": 2.5,
    "actual_hours": 3.0,
    "status": "completed"
  },
  {
    "description": "Share on social media channels (Instagram, Facebook)",
    "priority": "high",
    "estimated_hours": 1.5,
    "actual_hours": 2.0,
    "status": "completed"
  },
  {
    "description": "Create 3 TikTok videos showcasing game features",
    "priority": "high",
    "estimated_hours": 5.0,
    "actual_hours": 6.0,
    "status": "completed"
  },
  // ... 5 more tasks
]
```

---

## Intelligence & Insights System

### Intelligence Types (40 Active)

The platform uses 40 active intelligence types across the coaching journey:

**Assessment Phase (6 types):**
- TYPE-080: 4-Phase Assessment Flow
- TYPE-081: IvyScore Calculation
- TYPE-082: Gap Analysis Engine
- TYPE-083: Potential Indicator Extraction
- TYPE-085: Rubric Scoring Engine
- TYPE-086: Gap Priority Analyzer

**GamePlan Phase (6 types):**
- TYPE-001: Game Plan Synthesis
- TYPE-002: Weak Spot Prioritization
- TYPE-003: Timeline Architecture
- TYPE-004: Multi-Path Convergence
- TYPE-006: Quarterly Adaptation
- TYPE-007: Time Mathematician

**Execution Phase (15 types):**
- TYPE-049 through TYPE-063 (detailed in v30.0 spec)

**Specialist Agents (13 types):**
- Awards Agent: TYPE-022 through TYPE-027 (7 types)
- ECs Agent: TYPE-013 through TYPE-019 (6 types)

### Intelligence Activation Example

**Scenario:** Student submits Week 48 update

```typescript
// 1. Intelligence Registry triggers TYPE-082 (Gap Analysis)
const gapAnalysisResult = await intelligenceRegistry.execute('TYPE-082', {
  student_id: 'huda-2025',
  week_number: 48,
  current_data: {
    academic_score: 88,
    ec_score: 85,
    awards_score: 68
  }
});

// Result:
{
  gaps_identified: [
    {
      category: 'Awards',
      severity: 'moderate',
      current_score: 68,
      target_score: 80,
      recommendation: 'Apply to 3+ national competitions by Q1 2025'
    }
  ],
  action_items: [
    'Research CS/education-aligned awards',
    'Prepare Synthoria for competition submissions',
    'Draft award application essays'
  ]
}

// 2. Store in gaps table
await pool.query(`
  INSERT INTO gaps (student_id, gap_category, severity, description, recommendation)
  VALUES ($1, $2, $3, $4, $5)
`, [
  'huda-2025',
  'Awards',
  'moderate',
  'Limited national-level recognition (score 68/100)',
  'Apply to 3+ national competitions leveraging existing projects'
]);

// 3. Update weekly_vitals.gap_analysis JSONB
await pool.query(`
  UPDATE weekly_vitals
  SET gap_analysis = jsonb_set(
    gap_analysis,
    '{awards}',
    '{"severity": "moderate", "score": 68}'
  )
  WHERE student_id = $1 AND week_number = $2
`, ['huda-2025', 48]);
```

---

## Timeline & Growth Journey

### 30+ Milestone Types

**Leadership Milestones:**
- leadership_emerged
- leadership_transformation
- leadership_scaled

**Impact Milestones:**
- impact_initiated
- impact_scaled
- impact_documented

**Academic Milestones:**
- gpa_milestone
- test_score_achieved
- ap_exam_scored
- course_completed

**EC Milestones:**
- ec_launched
- ec_membership_growth
- ec_impact_measured
- ec_recognition

**Award Milestones:**
- award_won
- competition_submitted
- recognition_received

**Application Milestones:**
- program_accepted
- scholarship_won
- essay_completed
- lor_secured
- application_submitted
- acceptance_received

### Timeline Generation Logic

```typescript
// File: services/timelineService.ts

async function generateTimeline(student_id: string): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // 1. Extract from ec_vitals (quantifiable milestones)
  const ecVitals = await pool.query(`
    SELECT *
    FROM ec_vitals
    WHERE student_id = $1
    ORDER BY as_of ASC
  `, [student_id]);

  for (const vital of ecVitals.rows) {
    if (vital.metric_type === 'leadership' && vital.numeric_value >= 50) {
      events.push({
        event_type: 'leadership_transformation',
        event_date: vital.as_of,
        title: `${vital.activity_name}: Leadership Milestone`,
        description: `${vital.metric_name} reached ${vital.numeric_value}${vital.unit}`,
        source_table: 'ec_vitals',
        source_id: vital.vital_id
      });
    }

    if (vital.metric_type === 'scale' && vital.numeric_value >= 100) {
      events.push({
        event_type: 'impact_scaled',
        event_date: vital.as_of,
        title: `${vital.activity_name}: Scaled to ${vital.numeric_value} ${vital.unit}`,
        description: vital.evidence_text,
        source_table: 'ec_vitals',
        source_id: vital.vital_id
      });
    }
  }

  // 2. Extract from jtbd (completed jobs)
  const jobs = await pool.query(`
    SELECT *
    FROM jtbd
    WHERE student_id = $1
      AND status = 'completed'
      AND job_type IN ('award', 'application', 'ec_milestone')
    ORDER BY completion_date ASC
  `, [student_id]);

  for (const job of jobs.rows) {
    const eventType = getEventTypeFromJob(job.job_type);
    events.push({
      event_type: eventType,
      event_date: job.completion_date,
      title: job.job_description,
      description: `Completed in Week ${job.week_number}`,
      source_table: 'jtbd',
      source_id: job.jtbd_id
    });
  }

  // 3. Extract from weekly_vitals (academic milestones)
  const vitals = await pool.query(`
    SELECT
      week_number,
      week_start_date,
      academic_vitals
    FROM weekly_vitals
    WHERE student_id = $1
    ORDER BY week_number ASC
  `, [student_id]);

  let previousGPA = null;
  let previousSAT = null;

  for (const week of vitals.rows) {
    const academics = week.academic_vitals;

    // GPA milestone (crossed 3.9 threshold)
    if (academics.gpa_weighted >= 3.9 && (!previousGPA || previousGPA < 3.9)) {
      events.push({
        event_type: 'gpa_milestone',
        event_date: week.week_start_date,
        title: `GPA Milestone: ${academics.gpa_weighted}`,
        description: `Achieved weighted GPA of ${academics.gpa_weighted}`,
        source_table: 'weekly_vitals',
        source_id: `WK-${week.week_number}`
      });
    }

    // SAT milestone (crossed 1500 threshold)
    if (academics.sat?.total >= 1500 && (!previousSAT || previousSAT < 1500)) {
      events.push({
        event_type: 'test_score_achieved',
        event_date: week.week_start_date,
        title: `SAT ${academics.sat.total} Achieved`,
        description: `EBRW: ${academics.sat.ebrw}, Math: ${academics.sat.math}`,
        source_table: 'weekly_vitals',
        source_id: `WK-${week.week_number}`
      });
    }

    previousGPA = academics.gpa_weighted;
    previousSAT = academics.sat?.total;
  }

  // 4. Sort all events chronologically
  events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  return events;
}
```

---

## Summary

This document provides a complete technical architecture of the Traditional Jenny Coaching Platform, including:

✅ **Database Schema** - 25 tables with complete field definitions
✅ **Real Huda Data** - 92 weeks of coaching data from actual sessions
✅ **Fact-Based Model** - Atomic facts with provenance tracking
✅ **Knowledge Base** - 973 vectors across 3 namespaces
✅ **Frontend Tabs** - 4 major tabs with component breakdown
✅ **Data Flow** - Complete request/response cycles with SQL queries
✅ **Intelligence System** - 40 active intelligence types
✅ **Timeline System** - 30+ milestone types with generation logic

**Key Achievement:** Huda's successful UNC Chapel Hill Early Action acceptance validates the platform's effectiveness in delivering personalized, data-driven college coaching at scale.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Maintained By:** Platform Engineering Team
