# Future Extensibility Guide
**IvyLevel Platform v10 - Adding New Fact Types**

**Document Status:** Configuration Reference
**Last Update:** 2025-10-11
**Version:** v1.0 (Based on v10.5.2 Restoration)
**Purpose:** Step-by-step guide for adding new Cat-1 fact-based data types

---

## Table of Contents

1. [Overview](#overview)
2. [Adding a New Score Type (Example: SAT Subject Tests)](#adding-a-new-score-type-example-sat-subject-tests)
3. [Adding a New List Type (Example: Scholarships)](#adding-a-new-list-type-example-scholarships)
4. [Adding a New Summary Type (Example: Activities Summary)](#adding-a-new-summary-type-example-activities-summary)
5. [Pattern Library](#pattern-library)
6. [Testing Checklist](#testing-checklist)
7. [Common Pitfalls](#common-pitfalls)

---

## Overview

This guide documents the EXACT steps to add new fact-based (Cat-1) data types to the Jenny AI system, based on the successful v10.5.2 restoration of IvyScore, College List, and GamePlan.

**Core Pattern (3-Layer Architecture):**
```
1. Intent Classification → Detect user query patterns
2. Resolver Function → Query database views/tables
3. Text Composition → Format results for display
```

**Files You'll Modify:**
- `services/jenny-api/src/orchestrator/intent-enum.ts` - Intent patterns
- `services/jenny-api/src/orchestrator/agentChat-utfa.ts` - Composition logic
- `services/jenny-api/src/resolvers/<module>.ts` - SQL resolvers (if new)
- Database views/tables (SQL) - Data source (if new schema needed)

---

## Adding a New Score Type (Example: SAT Subject Tests)

**Goal:** Add support for queries like "What were my SAT Subject Test scores?"

### Step 1: Intent Classification

**File:** `services/jenny-api/src/orchestrator/intent-enum.ts`

**Action 1.1: Add Synonym Array (around line 40)**
```typescript
// After existing IVYSCORE_SYNS, COLLEGE_SYNS, etc.
const SAT_SUBJECT_SYNS = [
  'sat subject', 'subject test', 'subject tests', 'sat ii', 'sat 2',
  'biology subject', 'math subject', 'physics subject', 'chemistry subject'
];
```

**Action 1.2: Add Route Type (around line 75)**
```typescript
export type EnumRoute =
  // ... existing routes ...
  | 'sat_subject.list'       // NEW: List all subject tests
  | 'sat_subject.latest'     // NEW: Most recent scores
  | 'sat_subject.by_subject' // NEW: Specific subject
  | null;
```

**Action 1.3: Add Classification Logic (around line 270)**
```typescript
// After IvyScore/College/GamePlan classification blocks
// v10.X: SAT Subject Tests
if (any(s, SAT_SUBJECT_SYNS)) {
  // Check for specific subject
  if (s.includes('biology') || s.includes('bio')) {
    log.event('intent_classified', { route: 'sat_subject.by_subject', query: q.slice(0, 80) });
    return 'sat_subject.by_subject';
  }

  // Check for latest/recent
  if (s.includes('latest') || s.includes('recent') || s.includes('last')) {
    log.event('intent_classified', { route: 'sat_subject.latest', query: q.slice(0, 80) });
    return 'sat_subject.latest';
  }

  // Default: list all
  log.event('intent_classified', { route: 'sat_subject.list', query: q.slice(0, 80) });
  return 'sat_subject.list';
}
```

**Action 1.4: Update isEnumerationQuery() (around line 355)**
```typescript
// Add to detection function
if (any(m, SAT_SUBJECT_SYNS)) return true;
```

### Step 2: Database Resolver

**File:** `services/jenny-api/src/resolvers/testing.ts` (create if doesn't exist)

```typescript
import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-testing');

export const sat_subject = {
  async list(pg: Pool, studentId: string) {
    const start = Date.now();
    console.log('[RESOLVER:sat_subject.list] 🎯 Called with studentId:', studentId);
    log.event('sat_subject.list_start', { student_id: studentId });

    const query = `
      SELECT student_id, subject_name, score, test_date, chip_id, source_id
      FROM sat_subject_tests
      WHERE student_id=$1
      ORDER BY test_date DESC
    `;
    console.log('[RESOLVER:sat_subject.list] → Executing SQL:', query);

    const { rows } = await pg.query(query, [studentId]);

    console.log('[RESOLVER:sat_subject.list] ✓ Query returned', rows.length, 'rows');
    log.event('sat_subject.list_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  async latest(pg: Pool, studentId: string) {
    const { rows } = await pg.query(`
      SELECT student_id, subject_name, score, test_date
      FROM sat_subject_tests
      WHERE student_id=$1
      ORDER BY test_date DESC
      LIMIT 1
    `, [studentId]);

    return rows[0] || null;
  },

  async by_subject(pg: Pool, studentId: string, subjectName: string) {
    const { rows } = await pg.query(`
      SELECT student_id, subject_name, score, test_date
      FROM sat_subject_tests
      WHERE student_id=$1 AND subject_name ILIKE $2
      ORDER BY test_date DESC
    `, [studentId, `%${subjectName}%`]);

    return rows;
  }
};
```

**Note:** Import this resolver in `agentChat-utfa.ts`:
```typescript
// Line ~12 in agentChat-utfa.ts
import { sat_subject } from '../resolvers/testing.js';
```

### Step 3: Text Composition

**File:** `services/jenny-api/src/orchestrator/agentChat-utfa.ts`

**Action 3.1: Add switch case in maybeEnumAnswer() (around line 135)**
```typescript
switch (route) {
  // ... existing cases ...

  // v10.X: SAT Subject Tests
  case 'sat_subject.list': {
    const items = await sat_subject.list(pg, student_id);
    return { route, list: items };
  }
  case 'sat_subject.latest': {
    const item = await sat_subject.latest(pg, student_id);
    return { route, item };
  }
  case 'sat_subject.by_subject': {
    // Extract subject from original query
    const subjectMatch = userText.match(/(biology|physics|chemistry|math|history|literature)/i);
    const subject = subjectMatch ? subjectMatch[1] : '';
    const items = await sat_subject.by_subject(pg, student_id, subject);
    return { route, list: items };
  }

  default:
    return null;
}
```

**Action 3.2: Add composition formatting in composeEnumText() (around line 230)**
```typescript
function composeEnumText(result: EnumResult): string {
  const { route, list, item } = result;

  // ... existing formatting ...

  // v10.X: SAT Subject Tests
  if (route.startsWith('sat_subject.')) {
    if (route === 'sat_subject.latest') {
      if (!item) return 'No SAT Subject Test scores found.';
      const date = item.test_date ? new Date(item.test_date).toLocaleDateString() : 'unknown date';
      return `Latest SAT Subject Test: ${item.subject_name} — ${item.score}/800 (${date})`;
    }

    if (route === 'sat_subject.list' || route === 'sat_subject.by_subject') {
      if (!list || !list.length) return 'No SAT Subject Test scores found.';
      const lines = list.map((r: any, i: number) => {
        const date = r.test_date ? new Date(r.test_date).toLocaleDateString() : 'N/A';
        return `${i+1}. ${r.subject_name} — ${r.score}/800 (${date})`;
      });
      return lines.join('\n');
    }
  }

  // ... rest of function ...
}
```

**Action 3.3: Add item formatting (around line 195)**
```typescript
// v10.X: SAT Subject Test list item
if (route.startsWith('sat_subject.')) {
  const date = r.test_date ? new Date(r.test_date).toLocaleDateString() : 'N/A';
  return `${i+1}. ${r.subject_name} — ${r.score}/800 (${date})`;
}
```

### Step 4: Database Schema (if needed)

**File:** SQL migration (e.g., `db/migrations/2025-10-11-sat-subject-tests.sql`)

```sql
-- Create SAT Subject Tests table
CREATE TABLE IF NOT EXISTS sat_subject_tests (
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  chip_id          TEXT NOT NULL,
  chip_table       TEXT DEFAULT 'sat_subject_tests',
  source_id        TEXT NOT NULL, -- 'SRC-COLLEGEBOARD-001'

  subject_name     TEXT NOT NULL, -- 'Biology M', 'Math Level 2', etc.
  score            INT NOT NULL, -- 200-800
  test_date        DATE NOT NULL,
  percentile       INT, -- Optional: 1-99

  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (student_id, chip_id)
);

CREATE INDEX idx_sat_subject_student ON sat_subject_tests(student_id);
CREATE INDEX idx_sat_subject_date ON sat_subject_tests(student_id, test_date DESC);
```

### Step 5: Test

**Query:** "What were my SAT Subject Test scores?"

**Expected Response:**
```
1. Biology M — 780/800 (6/5/2024)
2. Math Level 2 — 800/800 (5/1/2024)
3. Chemistry — 750/800 (5/1/2024)
```

**Debug Verification:**
```
[ORCH:maybeEnumAnswer] → Classified route: sat_subject.list
[RESOLVER:sat_subject.list] ✓ Query returned 3 rows
IvyScore: 90.5/100 (final_submit phase, as of 9/30/2025)
```

---

## Adding a New List Type (Example: Scholarships)

**Goal:** Add support for queries like "What scholarships did I apply for?"

### Step 1: Intent Classification

**File:** `services/jenny-api/src/orchestrator/intent-enum.ts`

**Action 1.1: Add Synonym Array**
```typescript
const SCHOLARSHIP_SYNS = [
  'scholarship', 'scholarships', 'merit aid', 'financial aid', 'grant', 'grants',
  'scholarship application', 'scholarship list'
];
```

**Action 1.2: Add Route Types**
```typescript
export type EnumRoute =
  // ... existing routes ...
  | 'scholarship.applied'   // Scholarships applied for
  | 'scholarship.won'       // Scholarships won/received
  | 'scholarship.list'      // All scholarships
  | null;
```

**Action 1.3: Add Classification Logic**
```typescript
// v10.X: Scholarships
if (any(s, SCHOLARSHIP_SYNS)) {
  if (s.includes('won') || s.includes('received') || s.includes('got') || s.includes('awarded')) {
    log.event('intent_classified', { route: 'scholarship.won', query: q.slice(0, 80) });
    return 'scholarship.won';
  }

  if (s.includes('applied') || s.includes('submit') || s.includes('application')) {
    log.event('intent_classified', { route: 'scholarship.applied', query: q.slice(0, 80) });
    return 'scholarship.applied';
  }

  // Default: all scholarships
  log.event('intent_classified', { route: 'scholarship.list', query: q.slice(0, 80) });
  return 'scholarship.list';
}
```

**Action 1.4: Update isEnumerationQuery()**
```typescript
if (any(m, SCHOLARSHIP_SYNS)) return true;
```

### Step 2: Database Resolver

**File:** `services/jenny-api/src/resolvers/scholarships.ts` (create if doesn't exist)

```typescript
import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-scholarships');

export const scholarship = {
  async applied(pg: Pool, studentId: string) {
    const { rows } = await pg.query(`
      SELECT student_id, scholarship_name, amount, deadline, status, chip_id, source_id
      FROM scholarship_applications
      WHERE student_id=$1
      ORDER BY deadline DESC
    `, [studentId]);

    return rows;
  },

  async won(pg: Pool, studentId: string) {
    const { rows } = await pg.query(`
      SELECT student_id, scholarship_name, amount, awarded_date, chip_id, source_id
      FROM scholarship_outcomes
      WHERE student_id=$1 AND status='awarded'
      ORDER BY awarded_date DESC
    `, [studentId]);

    return rows;
  },

  async list(pg: Pool, studentId: string) {
    const { rows } = await pg.query(`
      SELECT 'applied' AS phase, scholarship_name, amount, deadline AS event_date
      FROM scholarship_applications
      WHERE student_id=$1

      UNION ALL

      SELECT 'won' AS phase, scholarship_name, amount, awarded_date AS event_date
      FROM scholarship_outcomes
      WHERE student_id=$1 AND status='awarded'

      ORDER BY event_date DESC
    `, [studentId]);

    return rows;
  }
};
```

### Step 3: Text Composition

**In agentChat-utfa.ts switch statement:**
```typescript
case 'scholarship.applied': {
  const items = await scholarship.applied(pg, student_id);
  return { route, list: items };
}
case 'scholarship.won': {
  const items = await scholarship.won(pg, student_id);
  return { route, list: items };
}
case 'scholarship.list': {
  const items = await scholarship.list(pg, student_id);
  return { route, list: items };
}
```

**In composeEnumText() function:**
```typescript
// v10.X: Scholarships
if (route.startsWith('scholarship.')) {
  if (!list || !list.length) return 'No scholarship data found.';

  const lines = list.map((r: any, i: number) => {
    const amount = r.amount ? `$${Number(r.amount).toLocaleString()}` : 'Amount N/A';
    const date = r.event_date ? new Date(r.event_date).toLocaleDateString() : 'N/A';
    const phase = r.phase ? ` (${r.phase})` : '';
    return `${i+1}. ${r.scholarship_name} — ${amount} (${date})${phase}`;
  });

  return lines.join('\n');
}
```

**Item formatting (around line 195):**
```typescript
// v10.X: Scholarship list item
if (route.startsWith('scholarship.')) {
  const amount = r.amount ? `$${Number(r.amount).toLocaleString()}` : 'Amount N/A';
  const status = r.status ? ` — ${r.status}` : '';
  return `${i+1}. ${r.scholarship_name} — ${amount}${status}`;
}
```

---

## Adding a New Summary Type (Example: Activities Summary)

**Goal:** Add support for queries like "Summarize my extracurricular activities"

### Step 1: Intent Classification

**File:** `services/jenny-api/src/orchestrator/intent-enum.ts`

**Action 1.1: Add Synonym Array**
```typescript
const EC_SUMMARY_SYNS = [
  'activities summary', 'ec summary', 'extracurricular summary',
  'summarize activities', 'summarize ecs', 'overview of activities',
  'how many activities', 'activities breakdown'
];
```

**Action 1.2: Add Route Type**
```typescript
export type EnumRoute =
  // ... existing routes ...
  | 'ecs.summary'  // Activities summary with counts
  | null;
```

**Action 1.3: Add Classification Logic**
```typescript
// v10.X: EC Summary
if (any(s, EC_SUMMARY_SYNS)) {
  log.event('intent_classified', { route: 'ecs.summary', query: q.slice(0, 80) });
  return 'ecs.summary';
}
```

**Note:** This is SEPARATE from existing `ecs.list` - summary returns aggregate counts, list returns individual items.

### Step 2: Database Resolver

**File:** `services/jenny-api/src/resolvers/enums.ts` (add to existing ecs object)

```typescript
export const ecs = {
  // ... existing initial, final, progression ...

  async summary(pg: Pool, studentId: string) {
    const { rows } = await pg.query(`
      SELECT
        student_id,
        COUNT(*) as total_count,
        COUNT(CASE WHEN category='STEM' THEN 1 END) as stem_count,
        COUNT(CASE WHEN category='Leadership' THEN 1 END) as leadership_count,
        COUNT(CASE WHEN category='Arts' THEN 1 END) as arts_count,
        COUNT(CASE WHEN category='Community Service' THEN 1 END) as service_count,
        SUM(hours_per_week * weeks_per_year) as total_hours
      FROM kb_items
      WHERE student_id=$1 AND family='Activity' AND source_id LIKE 'SRC-COMMONAPP%'
      GROUP BY student_id
    `, [studentId]);

    return rows[0] || null;
  }
};
```

### Step 3: Text Composition

**In agentChat-utfa.ts switch statement:**
```typescript
case 'ecs.summary': {
  const item = await ecs.summary(pg, student_id);
  return { route, item };
}
```

**In composeEnumText() function:**
```typescript
// v10.X: EC Summary
if (route === 'ecs.summary') {
  if (!item) return 'No activities summary available.';

  const total = item.total_count || 0;
  const stem = item.stem_count || 0;
  const leadership = item.leadership_count || 0;
  const arts = item.arts_count || 0;
  const service = item.service_count || 0;
  const hours = item.total_hours || 0;

  return `Activities Summary:
- Total Activities: ${total}
- STEM: ${stem}
- Leadership: ${leadership}
- Arts: ${arts}
- Community Service: ${service}
- Total Estimated Hours: ${hours.toLocaleString()}`;
}
```

---

## Pattern Library

### Common Synonym Patterns

**Score/Rating Queries:**
```typescript
const SCORE_SYNS = ['score', 'rating', 'points', 'grade', 'result'];
const QUALIFIER_SYNS = ['latest', 'recent', 'first', 'last', 'current', 'best', 'highest'];
```

**List/Collection Queries:**
```typescript
const LIST_SYNS = ['list', 'all', 'show me', 'what are', 'which', 'view'];
const FILTER_SYNS = ['applied', 'submitted', 'won', 'accepted', 'rejected', 'completed'];
```

**Summary/Aggregate Queries:**
```typescript
const SUMMARY_SYNS = ['summary', 'overview', 'breakdown', 'how many', 'count', 'total'];
const COMPARISON_SYNS = ['compare', 'vs', 'versus', 'difference', 'gap'];
```

### Intent Detection Pattern

**Template:**
```typescript
if (any(s, PRIMARY_SYNS)) {
  // 1. Check for specific qualifiers first (most specific)
  if (any(s, SPECIFIC_QUALIFIER)) {
    return 'domain.specific_route';
  }

  // 2. Check for temporal qualifiers
  if (any(s, TEMPORAL_SYNS)) {
    return 'domain.temporal_route';
  }

  // 3. Default to general route
  return 'domain.general_route';
}
```

### Resolver Pattern

**Template:**
```typescript
export const domain = {
  async route_name(pg: Pool, studentId: string, ...filters) {
    const start = Date.now();
    console.log('[RESOLVER:domain.route_name] 🎯 Called with studentId:', studentId);
    log.event('domain.route_name_start', { student_id: studentId });

    const query = `SELECT ... FROM table WHERE student_id=$1 ...`;
    console.log('[RESOLVER:domain.route_name] → Executing SQL:', query);

    const { rows } = await pg.query(query, [studentId, ...]);

    console.log('[RESOLVER:domain.route_name] ✓ Query returned', rows.length, 'rows');
    log.event('domain.route_name_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;  // or rows[0] for single item
  }
};
```

### Composition Pattern

**List Formatting:**
```typescript
if (route.startsWith('domain.')) {
  if (!list || !list.length) return 'No domain data found.';

  const lines = list.map((r: any, i: number) => {
    const field1 = r.field1 || 'N/A';
    const field2 = r.field2 ? formatField2(r.field2) : '';
    return `${i+1}. ${r.primary_field} — ${field1}${field2}`;
  });

  return lines.join('\n');
}
```

**Single Item Formatting:**
```typescript
if (route === 'domain.specific') {
  if (!item) return 'No domain data found.';
  const value = formatValue(item.value);
  const date = item.date ? new Date(item.date).toLocaleDateString() : 'unknown date';
  return `Domain: ${value} (as of ${date})`;
}
```

---

## Testing Checklist

### Phase 1: Intent Detection ✅
- [ ] Query with primary synonym: "What is my X?"
- [ ] Query with alternative synonym: "Show me my X scores"
- [ ] Query with qualifier: "What was my latest X?"
- [ ] Negative test: Unrelated query should return NULL

**Verification:**
```
[ORCH:maybeEnumAnswer] → Classified route: domain.route_name
```

### Phase 2: Resolver Execution ✅
- [ ] SQL query executes without errors
- [ ] Returns expected data structure
- [ ] Handles empty results gracefully
- [ ] Debug logs show row count

**Verification:**
```
[RESOLVER:domain.route_name] ✓ Query returned N rows
[RESOLVER:domain.route_name] → First row: {"field1":"value",...}
```

### Phase 3: Text Composition ✅
- [ ] List items formatted correctly
- [ ] Single item formatted correctly
- [ ] Empty results show appropriate message
- [ ] NO "undefined" or "null" in output

**Verification:**
```
1. Item Name — Value (Date)
2. Item Name — Value (Date)
```

### Phase 4: Integration ✅
- [ ] Query through full pipeline
- [ ] Humanizer layer adds warmth (if enabled)
- [ ] Response time <1.5s
- [ ] All 3 categories still working

**Verification:**
```bash
curl -X POST http://localhost:8787/agent/chat/gpt5 \
  -d '{"student_id":"huda-2025","message":"What is my X?"}'
```

---

## Common Pitfalls

### Pitfall 1: Missing Intent Patterns ❌

**Symptom:** Query returns generic LLM response instead of SQL facts

**Cause:** Synonym array missing or classification logic not added

**Fix:** Double-check `any(s, YOUR_SYNS)` in intent-enum.ts and `isEnumerationQuery()`

**Debug:** Check logs for:
```
[ORCH:maybeEnumAnswer] → Classified route: NULL (not an enum query)
```

### Pitfall 2: Resolver Not Imported ❌

**Symptom:** TypeError: "resolver.function is not a function"

**Cause:** Forgot to import resolver in agentChat-utfa.ts

**Fix:** Add import at line ~12:
```typescript
import { your_resolver } from '../resolvers/your_module.js';
```

### Pitfall 3: Composition Returns "undefined" ❌

**Symptom:** Response shows "1. undefined" or blank lines

**Cause:** `composeEnumText()` missing formatting case for your route

**Fix:** Add `if (route.startsWith('your_domain.')) { ... }` block with proper field access

**Debug:** Check that resolver returns data:
```
[RESOLVER:domain.route] → First row: {"field1":"value"}
```

### Pitfall 4: Database View/Table Missing ❌

**Symptom:** SQL error or empty results despite correct resolver

**Cause:** Database migration not run or table name incorrect

**Fix:**
1. Check table exists: `\dt your_table` in psql
2. Check view exists: `\dv your_view` in psql
3. Run migration if needed
4. Verify data: `SELECT * FROM your_table WHERE student_id='huda-2025' LIMIT 5;`

### Pitfall 5: Wrong Import Path ❌

**Symptom:** Module not found error at runtime

**Cause:** Relative import path incorrect (e.g., `../resolvers/compat.js` instead of `../resolvers/enums.js`)

**Fix:** Double-check file location and use correct relative path:
```typescript
// Correct for agentChat-utfa.ts:
import { resolver } from '../resolvers/module.js';  // ✅

// Wrong:
import { resolver } from './resolvers/module.js';   // ❌ (missing ../)
import { resolver } from '../resolver/module.js';   // ❌ (typo in folder)
```

### Pitfall 6: Forgetting to Add Route to Switch ❌

**Symptom:** Intent detected but no data returned

**Cause:** Added classification logic but forgot switch case in `maybeEnumAnswer()`

**Fix:** Add case in switch statement:
```typescript
switch (route) {
  // ... existing cases ...
  case 'your_domain.route': {
    const items = await your_resolver.function(pg, student_id);
    return { route, list: items };
  }
}
```

### Pitfall 7: SQL Syntax Errors ❌

**Symptom:** Database query fails with syntax error

**Common Issues:**
- Missing comma in SELECT list
- Wrong table alias
- Incorrect JOIN syntax
- Typo in column name

**Fix:** Test SQL in psql first:
```sql
-- Test your query manually:
SELECT student_id, field1, field2
FROM your_table
WHERE student_id='huda-2025'
LIMIT 5;
```

---

## Quick Reference: File Locations

**Intent Classification:**
- File: `services/jenny-api/src/orchestrator/intent-enum.ts`
- Line ~40: Add synonym arrays
- Line ~75: Add route types
- Line ~270: Add classification logic
- Line ~355: Update `isEnumerationQuery()`

**Resolver Functions:**
- File: `services/jenny-api/src/resolvers/<domain>.ts`
- Pattern: `export const domain = { async route_name(pg, studentId) { ... } }`
- Import in: `services/jenny-api/src/orchestrator/agentChat-utfa.ts:12`

**Text Composition:**
- File: `services/jenny-api/src/orchestrator/agentChat-utfa.ts`
- Line ~135: Add switch case in `maybeEnumAnswer()`
- Line ~195: Add item formatting (for lists)
- Line ~230: Add composition logic in `composeEnumText()`

**Database Schema:**
- File: `services/jenny-api/db/migrations/*.sql`
- Pattern: `CREATE TABLE domain_name (...)`
- Run with: `psql $DATABASE_URL < migration.sql`

---

## Example: Complete Implementation

**Goal:** Add ACT Score tracking

**1. Intent (intent-enum.ts):**
```typescript
const ACT_SYNS = ['act', 'act score', 'act test'];

export type EnumRoute = ... | 'act.latest' | 'act.progression' | null;

// In classification:
if (any(s, ACT_SYNS)) {
  if (any(s, PROG_SYNS)) return 'act.progression';
  return 'act.latest';
}

// In isEnumerationQuery:
if (any(m, ACT_SYNS)) return true;
```

**2. Resolver (resolvers/testing.ts):**
```typescript
export const act = {
  async latest(pg: Pool, studentId: string) {
    const { rows } = await pg.query(`
      SELECT student_id, composite_score, english, math, reading, science, test_date
      FROM act_scores
      WHERE student_id=$1
      ORDER BY test_date DESC
      LIMIT 1
    `, [studentId]);
    return rows[0] || null;
  }
};
```

**3. Composition (agentChat-utfa.ts):**
```typescript
// Import at line 12:
import { act } from '../resolvers/testing.js';

// Switch case at line 135:
case 'act.latest': {
  const item = await act.latest(pg, student_id);
  return { route, item };
}

// Formatting at line 230:
if (route === 'act.latest') {
  if (!item) return 'No ACT scores found.';
  const date = item.test_date ? new Date(item.test_date).toLocaleDateString() : 'N/A';
  return `ACT Score: ${item.composite_score} (English: ${item.english}, Math: ${item.math}, Reading: ${item.reading}, Science: ${item.science}) — ${date}`;
}
```

**4. Database Schema:**
```sql
CREATE TABLE act_scores (
  student_id TEXT NOT NULL,
  chip_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  composite_score INT NOT NULL,
  english INT,
  math INT,
  reading INT,
  science INT,
  test_date DATE NOT NULL,
  PRIMARY KEY (student_id, chip_id)
);
```

**Test:**
```bash
curl -X POST http://localhost:8787/agent/chat/gpt5 \
  -d '{"student_id":"huda-2025","message":"What was my ACT score?"}'

# Expected:
# ACT Score: 34 (English: 35, Math: 34, Reading: 33, Science: 34) — 3/15/2024
```

**Done!** ✅

---

## Version History

**v1.0 (2025-10-11)** - Initial guide based on v10.5.2 restoration
- Documented 3-layer pattern (intent → resolver → composition)
- Provided 3 complete examples (score, list, summary types)
- Included pattern library and testing checklist
- Added common pitfalls and fixes

---

**Status:** ✅ Configuration Reference Complete
**Last Updated:** 2025-10-11
**Based On:** v10.5.2 (IvyScore/College/GamePlan restoration)
**Next Review:** When adding next new fact type
