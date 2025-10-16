# Database Schema Summary - v14.0

**Generated:** 2025-10-16  
**Database:** jenny_db (PostgreSQL)  
**Total Views:** 105  
**Full Schema:** 9,807 lines

---

## Files Generated

1. **full-schema-v14.0.sql** (9,807 lines)
   - Complete database schema (tables + views + indexes + constraints)
   - Generated with: `pg_dump --schema-only --no-owner $DATABASE_URL`

2. **views-only-v14.0.sql** (3,091 lines)
   - All 105 view definitions extracted from full schema
   - Includes both public and compat schemas

---

## Key View Definitions (Production v14.0)

### 1. v_awards_initial
**Purpose:** Awards from initial phase (Gameplan/session data)  
**Base Table:** award_targets_enum  
**Phase Filter:** 'initial'

```sql
CREATE VIEW public.v_awards_initial AS
 WITH base AS (
         SELECT award_targets_enum.student_id,
            award_targets_enum.item_label AS award_label,
            ''::text AS tier,
            ''::text AS rationale,
            award_targets_enum.as_of,
            award_targets_enum.source_id,
            NULL::text AS chip_id,
            public.canon_label(award_targets_enum.item_label) AS canon
           FROM public.award_targets_enum
          WHERE (award_targets_enum.phase = 'initial'::text)
        )
 SELECT DISTINCT ON (base.student_id, base.canon) 
    base.student_id,
    base.award_label AS award_name,
    base.tier,
    base.rationale,
    base.as_of,
    base.source_id,
    base.chip_id
   FROM base
  ORDER BY base.student_id, base.canon, base.as_of DESC;
```

**Usage:** resolvers.awards.initial(pg, studentId)

---

### 2. v_ecs_initial
**Purpose:** Extracurricular activities in "Planned" state  
**Base View:** v_ecs_all  
**State Filter:** tier1_state = 'Planned'

```sql
CREATE VIEW public.v_ecs_initial AS
 SELECT v_ecs_all.student_id,
    v_ecs_all.activity_name,
    v_ecs_all.category,
    v_ecs_all.tier1_state,
    v_ecs_all.tier2_substate,
    v_ecs_all.status_detail,
    v_ecs_all.key_metric_type,
    v_ecs_all.key_metric_value,
    v_ecs_all.key_metric_unit,
    v_ecs_all.event_date,
    v_ecs_all.submit_date,
    v_ecs_all.outcome_date,
    v_ecs_all.evidence_links,
    v_ecs_all.source_id,
    v_ecs_all.confidence,
    v_ecs_all.chip_id
   FROM public.v_ecs_all
  WHERE (v_ecs_all.tier1_state = 'Planned'::text);
```

**Usage:** resolvers.ecs.initial(pg, studentId)

---

### 3. v_gpa_latest
**Purpose:** Most recent GPA per student/scope/scope_key  
**Base Table:** academic_gpa  
**Ordering:** CommonApp source prioritized, then by confidence and recorded_at

```sql
CREATE VIEW public.v_gpa_latest AS
 SELECT DISTINCT ON (academic_gpa.student_id, academic_gpa.scope, academic_gpa.scope_key) 
    academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence,
    academic_gpa.gpa_id AS chip_id,
    'academic_gpa'::text AS chip_table
   FROM public.academic_gpa
  ORDER BY academic_gpa.student_id, 
           academic_gpa.scope, 
           academic_gpa.scope_key, 
           (academic_gpa.source_id = 'SRC-COMMONAPP-UNC'::text) DESC, 
           academic_gpa.confidence DESC, 
           academic_gpa.recorded_at DESC;
```

**Usage:** resolvers.gpa.latest(pg, studentId)

---

### 4. v_transcript_final
**Purpose:** Final transcript with course grades from CommonApp  
**Base Tables:** academic_terms, academic_courses, academic_grades  
**Source Filter:** CommonApp only, final grades only

```sql
CREATE VIEW public.v_transcript_final AS
 SELECT t.student_id,
    t.term_code,
    t.grade_level,
    c.course_title,
    c.subject_area,
    c.level,
    g.grade_letter,
    g.grade_percent,
    g.credits,
    g.weighting,
    t.source_id AS term_source,
    c.source_id AS course_source,
    g.source_id AS grade_source,
    LEAST(g.confidence, c.confidence, t.confidence) AS confidence,
    c.course_id AS chip_id,
    'academic_courses'::text AS chip_table
   FROM ((public.academic_terms t
     JOIN public.academic_courses c ON ((c.term_id = t.term_id)))
     JOIN public.academic_grades g ON ((g.course_id = c.course_id)))
  WHERE ((t.source_id = 'SRC-COMMONAPP-UNC'::text) 
     AND (g.status = 'final'::text));
```

**Usage:** resolvers.academics.transcript.final(pg, studentId)

---

### 5. v_jtbd_weekly_completed
**Purpose:** Completed weekly jobs/milestones with temporal tracking  
**Base Table:** jtbd_weekly  
**Status Filter:** 'completed' only  
**Ordering:** completion_date ascending

```sql
CREATE VIEW public.v_jtbd_weekly_completed AS
 SELECT jtbd_weekly.jtbd_id,
    jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    jtbd_weekly.job_type,
    jtbd_weekly.job_description,
    jtbd_weekly.linked_chip_id,
    jtbd_weekly.linked_table,
    jtbd_weekly.status,
    jtbd_weekly.completion_date,
    jtbd_weekly.outcome_metric,
    jtbd_weekly.outcome_value,
    jtbd_weekly.outcome_unit,
    jtbd_weekly.source_id,
    jtbd_weekly.notes,
    jtbd_weekly.created_at
   FROM public.jtbd_weekly
  WHERE (jtbd_weekly.status = 'completed'::text)
  ORDER BY jtbd_weekly.completion_date;
```

**Usage:** resolvers.jtbd.completed(pg, studentId)

---

## All Views by Category

### Academic Views (18)
- v_gpa_latest, v_gpa_progression
- v_transcript_initial, v_transcript_final, v_transcript_progression
- v_academics_latest, v_academics_overview, v_academics_trend, v_academics_series
- v_sat_timeline, v_sat_latest, v_sat_first, v_sat_progression
- v_academic_vitals_latest

### Enumeration Views (18)
- v_awards_initial, v_awards_final, v_awards_progression, v_awards_won
- v_ecs_initial, v_ecs_final, v_ecs_progression, v_ecs_all
- v_programs_initial, v_programs_submitted, v_programs_decisions, v_programs_final

### JTBD/Journey Views (8)
- v_jtbd_weekly_completed
- v_jtbd_milestones_ec, v_jtbd_milestones_application
- v_jtbd_progression_weekly

### College/Outcomes Views (12)
- v_college_list_all, v_college_attending, v_college_accepted
- v_outcomes_all, v_outcomes_by_college
- compat.v_outcomes (legacy)

### EQ/Signal Views (10)
- eq_cue_summary, eq_cues_by_source
- eq_signal_cues, eq_signal_tactics
- eq_tactics_by_student

### Quality/Observability Views (8)
- facts_normalized, fact_invalid_examples, fact_quality_report
- recent_traces
- v_kb_items (compat)

### Vitals/Profile Views (6)
- v_student_vitals_latest
- v_academic_vitals_latest
- v_ec_vitals_latest
- v_profile_summary (future)

### Legacy Compat Views (25)
- compat.v_academics_latest, compat.v_academics_series
- compat.v_awards_final
- compat.v_kb_items
- compat.v_outcomes
- compat.v_sat_timeline
- (All maintained for backward compatibility)

---

## Key Tables (Base Schema)

### Core Academic Tables
- **academic_terms** - School terms/semesters
- **academic_courses** - Courses taken with metadata
- **academic_grades** - Grades per course (initial/final)
- **academic_gpa** - GPA records (cumulative/semester)

### Enumeration Tables
- **award_targets_enum** - Awards won
- **ec_targets_enum** - Extracurricular activities
- **program_targets_enum** - Summer programs

### College/Outcomes
- **college_list** - Colleges applied to
- **college_outcomes** - Application decisions

### JTBD (Jobs To Be Done)
- **jtbd_weekly** - Weekly execution facts with completion_date

### EQ (Emotional Intelligence)
- **eq_signals** - Emotional pattern signals
- **eq_cues** - Emotional cue database
- **eq_tactics** - Response tactics

### Observability
- **fact_audit** - Fact validation audit trail
- **trace_log** - Query tracing

---

## Temporal Resolution Patterns

All views follow temporal resolution pattern:
- **_initial**: Initial/planned state (Gameplan/session data)
- **_final**: Final/submitted state (CommonApp data)
- **_progression**: Time-series showing change over time
- **_latest**: Most recent value (DISTINCT ON with ORDER BY)

**Source Priority:**
1. SRC-COMMONAPP-* (highest priority, official submitted data)
2. SRC-GAMEPLAN-* (medium priority, session/planning data)
3. SRC-BACKFILL-* (lowest priority, inferred data)

---

## Usage in v14.0 Resolvers

### profileSummary() - services/jenny-api/src/services/resolvers.ts:2124-2282
Uses 7 views:
- ivyready_snapshots (via ivyReadyScore)
- v_gpa_latest (via gpa.latest)
- test_scores (via sat.latest)
- v_transcript_final (via academics.transcript.final)
- v_awards_initial (via awards.initial)
- v_ecs_initial (via ecs.initial)
- v_programs_initial (via programs.initial)

### journeyTimeline() - services/jenny-api/src/services/resolvers.ts:1959-2049
Uses 1 view:
- v_jtbd_weekly_completed (via jtbd.completed)

### collegeDeadlines() - services/jenny-api/src/services/resolvers.ts:2292-2341
Uses 1 table directly:
- college_list (SELECT college_name, decision_plan)

### collegeComparison() - services/jenny-api/src/services/resolvers.ts:2352-2373
Uses 1 table directly:
- college_list (SELECT with ANY() for multiple colleges)

---

## Schema Evolution

**v14.0 Changes:**
- ✅ NO schema changes (all enhancements at application layer)
- ✅ All 105 views preserved from v12.0
- ✅ Zero SQL duplication (additive enhancement pattern)
- ✅ New resolvers reuse existing views

**Future Extension Points (v14.0+):**
- External deadline API (collegeDeadlines future enhancement)
- College rankings/stats (collegeComparison future enhancement)
- Admissions statistics (external data integration)
- Scholarship deadlines (external data integration)

---

## Access Pattern

**All resolvers follow this pattern:**
```typescript
// 1. Query view
const rows = await pg.query(`
  SELECT * FROM v_gpa_latest 
  WHERE student_id = $1
`, [studentId]);

// 2. Transform to domain model
const result = rows.map(row => ({
  gpa_unweighted: row.gpa_unweighted,
  gpa_weighted: row.gpa_weighted,
  // ...
}));

// 3. Return with provenance
return {
  data: result,
  source: 'v_gpa_latest',
  confidence: result[0]?.confidence || 0
};
```

---

## Files Location

```
services/jenny-api/db/schema/
├── full-schema-v14.0.sql       (9,807 lines - complete schema)
├── views-only-v14.0.sql        (3,091 lines - 105 views)
└── SCHEMA_SUMMARY_v14.0.md     (this file)
```

---

## Documentation References

- **Full Database Architecture:** docs/PROD_DB_ARCH.md
- **Resolver Documentation:** docs/PROD_DB_ARCH.md (Section 2: v14.0 Resolver Architecture)
- **Implementation Guide:** docs/guides/V14_IMPLEMENTATION_GUIDE.md
- **Master Tech Spec:** docs/MASTER_PROD_TECH_SPEC.md

---

**Status:** ✅ v14.0 Production Schema - Complete and Documented
