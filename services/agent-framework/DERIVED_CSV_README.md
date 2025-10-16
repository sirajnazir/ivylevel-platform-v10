# Derived CSV Files - Universal Enumerations Data

**Date Created:** October 3, 2025
**Student:** huda-2025
**Purpose:** Seed data for universal enumerations system (Awards, ECs, Programs)

---

## Files Overview

### Initial Phase (Game Plan - July 2023)

**1. derived_ecs_initial_gameplan.csv**
- **Description:** 10 initial extracurricular activities from Game Plan
- **Source:** SRC-GP-2023-07-29
- **Target Table:** kb_items
- **Rows:** 10
- **Columns:** item_id, student_id, item_type, title_name, subtype, tier1_state, event_date, status_detail, source_ref
- **Items:**
  1. Synthoria (Game Development)
  2. Empowering AI (AI/Tech)
  3. Interactive Media Arts Club (Arts/Media)
  4. Folklift (Cultural/Tech)
  5. YAC - Youth Advisory Council (Leadership)
  6. ASB Leadership (Leadership)
  7. AI Ethics Advocacy (Advocacy)
  8. VFX Club (Media/Tech)
  9. News Anchor/Editor (Media/Journalism)
  10. Filmmakers Club (Media/Film)

**2. derived_programs_initial_gameplan.csv**
- **Description:** 5 initial summer programs from Game Plan
- **Source:** SRC-GP-2023-07-29
- **Target Table:** kb_items
- **Rows:** 5
- **Columns:** item_id, student_id, item_type, title_name, subtype, tier1_state, event_date, status_detail, source_ref
- **Items:**
  1. Notre Dame Leadership Seminars
  2. AAJA JCamp
  3. Bank of America Student Leaders
  4. Yale Young Global Scholars (YYGS)
  5. AI Scholars

**3. derived_ec_targets_initial.csv**
- **Description:** 15 initial targets (10 ECs + 5 summer programs) for ec_targets table
- **Source:** SRC-GP-2023-07-29
- **Target Table:** ec_targets
- **Rows:** 15
- **Columns:** student_id, phase, item_label, as_of, source_id, jtbd_id
- **Phase:** initial
- **Items:** All 10 ECs + all 5 summer programs from above

---

### Final Phase (Submitted Common App)

**4. derived_ecs_final_commonapp.csv**
- **Description:** 10 final extracurricular activities from submitted Common App
- **Source:** SRC-COMMONAPP-UNC
- **Target Table:** kb_items
- **Rows:** 10
- **Columns:** item_id, student_id, item_type, subtype, title_name, tier1_state, tier2_substate, status_detail, key_metric_type, key_metric_value, key_metric_unit, deadline_date, event_date, submit_date, outcome_date, owner, cadence, evidence_links, source_ref, confidence
- **Items:**
  1. Empowering AI (AI/Tech) - Founder - 15 hrs/week
  2. Synthoria (Game Development) - Founder/Solo Developer - 20 hrs/week
  3. Filmmaker's Club (Media/Film) - President - 5 hrs/week
  4. JCamp (AAJA) (summer_program) - Student Leader - 40 hrs/week
  5. MH Muslim Association (Community Service) - Sunday School Teacher - 3 hrs/week
  6. Folklift (Cultural/Tech) - Founder - 10 hrs/week
  7. Kode With Klossy (summer_program) - Scholar - 40 hrs/week
  8. Women in Games (Advocacy) - Ambassador - 3 hrs/week
  9. Mustang Studios Podcast Club (Media/Journalism) - Vice President - 4 hrs/week
  10. Tech Influencer & Freelancer (Entrepreneurship) - 8 hrs/week

**5. derived_awards_final_outcomes.csv**
- **Description:** 6 final awards won (outcomes table format)
- **Sources:** SRC-INT-NCWIT-NAT, SRC-INT-NCWIT-REG, SRC-INT-CTE, SRC-INT-APSD, SRC-INT-G4C, SRC-INT-CB-NRSTA
- **Target Table:** outcomes
- **Rows:** 6
- **Columns:** student_id, type, occurred_at, source_id, details_json
- **Type:** achievement
- **Items:**
  1. NCWIT Aspirations in Computing — National Awardee (2024-03-15) - National
  2. NCWIT Aspirations in Computing — Northern California Regional Winner (2024-03-15) - Regional
  3. Mountain House HS Computer Science CTE Award (2024-06-01) - School
  4. AP Scholar with Distinction (2024-07-01) - National
  5. Games for Change — Writing Impact Award (2024-07-20) - International
  6. College Board National Rural & Small Town Award (2024-09-01) - National

**6. derived_awards_final_kb_items.csv**
- **Description:** 6 final awards won (kb_items ledger format)
- **Sources:** Same as above (SRC-INT-*)
- **Target Table:** kb_items
- **Rows:** 6
- **Columns:** item_id, student_id, item_type, subtype, title_name, tier1_state, tier2_substate, status_detail, key_metric_type, key_metric_value, key_metric_unit, deadline_date, event_date, submit_date, outcome_date, owner, cadence, evidence_links, source_ref, confidence
- **Items:** Same 6 awards as outcomes table, mirrored in kb_items ledger

---

## Loading Instructions

### Initial Phase Data

```bash
# 1. Load initial ECs
psql $DATABASE_URL << EOF
\copy kb_items(item_id,student_id,item_type,title_name,subtype,tier1_state,event_date,status_detail,source_ref)
FROM 'derived_ecs_initial_gameplan.csv' WITH (FORMAT csv, HEADER true);
EOF

# 2. Load initial summer programs
psql $DATABASE_URL << EOF
\copy kb_items(item_id,student_id,item_type,title_name,subtype,tier1_state,event_date,status_detail,source_ref)
FROM 'derived_programs_initial_gameplan.csv' WITH (FORMAT csv, HEADER true);
EOF

# 3. Load ec_targets
psql $DATABASE_URL << EOF
\copy ec_targets(student_id,phase,item_label,as_of,source_id,jtbd_id)
FROM 'derived_ec_targets_initial.csv' WITH (FORMAT csv, HEADER true);
EOF
```

### Final Phase Data

```bash
# 4. Load final ECs
psql $DATABASE_URL << EOF
\copy kb_items(item_id,student_id,item_type,subtype,title_name,tier1_state,tier2_substate,status_detail,key_metric_type,key_metric_value,key_metric_unit,deadline_date,event_date,submit_date,outcome_date,owner,cadence,evidence_links,source_ref,confidence)
FROM 'derived_ecs_final_commonapp.csv' WITH (FORMAT csv, HEADER true);
EOF

# 5. Load final awards (outcomes table)
psql $DATABASE_URL << EOF
\copy outcomes(student_id,type,occurred_at,source_id,details_json)
FROM 'derived_awards_final_outcomes.csv' WITH (FORMAT csv, HEADER true);
EOF

# 6. Load final awards (kb_items ledger)
psql $DATABASE_URL << EOF
\copy kb_items(item_id,student_id,item_type,subtype,title_name,tier1_state,tier2_substate,status_detail,key_metric_type,key_metric_value,key_metric_unit,deadline_date,event_date,submit_date,outcome_date,owner,cadence,evidence_links,source_ref,confidence)
FROM 'derived_awards_final_kb_items.csv' WITH (FORMAT csv, HEADER true);
EOF
```

---

## Validation Queries

### Test Initial Lists

```bash
# Initial ECs
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"what was my initial EC list?","stream":false}' | jq -r '.answer'

# Initial Summer Programs
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"what were my initial summer programs?","stream":false}' | jq -r '.answer'
```

### Test Final Lists

```bash
# Final ECs
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"what were my final ECs?","stream":false}' | jq -r '.answer'

# Final Awards
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"what were my final awards?","stream":false}' | jq -r '.answer'
```

### Verify Facts-First SQL Routing

```bash
# Check that NO RAG is used
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"what were my final awards?","stream":false}' \
  | jq '{model, route: .trace.enumeration.route, hits: (.hits | length)}'

# Expected output:
# {
#   "model": "deterministic-sql",
#   "route": "awards.final",
#   "hits": 0
# }
```

---

## Data Integrity

### No Hallucinations ✅
All data extracted from actual source documents:
- Game Plan (July 29, 2023)
- Common App (Submitted to UNC)
- Interview sources (for awards)

### No Duplicates ✅
- Each item has unique item_id
- Proper phase separation (initial vs final)
- No overlap between initial and final data

### Full Provenance ✅
- Every row has source_ref or source_id
- Temporal information preserved (as_of, event_date, outcome_date)
- Confidence levels tracked

### Summer Programs Classification ✅
- Initial: stored in kb_items with item_type='program'
- Final: stored in kb_items with item_type='ec' and subtype='summer_program'
- Both queryable via proper routes

---

## Schema Mapping

### kb_items Table
```sql
item_id          TEXT PRIMARY KEY
student_id       TEXT NOT NULL
item_type        TEXT NOT NULL  -- 'ec', 'award', 'program'
subtype          TEXT            -- Category/classification
title_name       TEXT NOT NULL   -- Item name
tier1_state      TEXT NOT NULL   -- 'Planned', 'In Transit', 'Submitted', 'Outcome'
tier2_substate   TEXT            -- 'initial', 'final', etc.
status_detail    TEXT            -- Role, notes, etc.
key_metric_type  TEXT            -- 'hours_per_week', etc.
key_metric_value TEXT            -- Numeric value as text
key_metric_unit  TEXT            -- Unit of measurement
deadline_date    DATE
event_date       DATE            -- Start date
submit_date      DATE            -- Submission date
outcome_date     DATE            -- Result date
owner            TEXT
cadence          TEXT
evidence_links   TEXT[]          -- Array of links
source_ref       TEXT NOT NULL   -- Source reference
confidence       TEXT            -- 'high', 'medium', 'low'
```

### outcomes Table
```sql
outcome_id       UUID PRIMARY KEY
student_id       TEXT NOT NULL
type             outcome_type NOT NULL  -- 'achievement' for awards
occurred_at      TIMESTAMP
source_id        TEXT
details_json     JSONB            -- Contains label, level, etc.
```

### ec_targets Table
```sql
id               BIGINT PRIMARY KEY
student_id       TEXT NOT NULL
phase            TEXT NOT NULL     -- 'initial', 'revised', 'final'
item_label       TEXT NOT NULL     -- Activity/program name
as_of            DATE
source_id        TEXT
jtbd_id          TEXT
```

---

## File Sizes

```
-rw-r--r--  978B  derived_awards_final_kb_items.csv
-rw-r--r--  874B  derived_awards_final_outcomes.csv
-rw-r--r--  1.0K  derived_ec_targets_initial.csv
-rw-r--r--  1.8K  derived_ecs_final_commonapp.csv
-rw-r--r--  1.4K  derived_ecs_initial_gameplan.csv
-rw-r--r--  862B  derived_programs_initial_gameplan.csv
```

**Total:** ~6.9KB

---

## Related Documentation

- `CORRECT_GAMEPLAN_DATA_LOADED.md` - Initial data loading process
- `FINAL_ECS_LOADED.md` - Final ECs loading process
- `UNIVERSAL_ENUMERATIONS_COMPLETE.md` - Complete system documentation
- `UI_TRACE_FIX_COMPLETE.md` - UI trace viewer fixes

---

## Maintenance

### Adding New Students
1. Create similar CSVs with new student_id
2. Ensure source_id references exist in sources table
3. Load using same \copy commands
4. Validate with curl queries

### Updating Existing Data
1. Export current data to backup CSV
2. Delete rows for specific phase (e.g., WHERE tier1_state='Submitted')
3. Load updated CSV
4. Verify with validation queries

### Data Migration
All CSVs use standard PostgreSQL COPY format with headers, making them portable across environments.

---

**Status:** Production-ready
**Last Updated:** October 3, 2025
**Maintained By:** Universal Enumerations System
