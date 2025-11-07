# v34 Universal Architecture Implementation Plan

**Date:** 2025-11-05
**Status:** 🟢 APPROVED - Ready for Implementation
**Approach:** Schema-based coverage + Universal Facts Protocol

---

## Executive Summary

**Team's Decision:** Replace fact-counting with **schema coverage checking** using Universal Facts Protocol.

**Key Insight:**
- ❌ Don't count Fact objects (arbitrary, brittle)
- ✅ Check schema coverage (semantic, production-aligned)

**Critical Safety Requirement:**
- Clone students (huda-v26-2025) must NOT overwrite real students (huda-2025) in production tables
- Need student isolation layer

---

## Implementation Priority (Team's Plan)

### Phase 1: Universal Fact Protocol + SchemaCoverage Class
**Estimated Time:** 4-6 hours

**Tasks:**
1. Create `UniversalFact` interface
2. Create `SchemaCoverage` class with schema-based completion logic
3. Add `ProductionTable` enum mapping
4. Add safety layer for clone student isolation

**Deliverables:**
- `src/facts/UniversalFact.ts` - Interface + types
- `src/facts/SchemaCoverage.ts` - Coverage calculation
- `src/facts/StudentIsolation.ts` - Clone safety layer

---

### Phase 2: Migrate Assessment Agent to Universal Facts
**Estimated Time:** 6-8 hours

**Tasks:**
1. Add `toUniversalFacts()` method to Assessment Agent
2. Replace `checkAssessmentCompletion()` with `calculateSchemaCoverage()`
3. Update handover logic to use schema coverage
4. Add clone student safety checks
5. Test with fresh session

**Deliverables:**
- Assessment Agent produces UniversalFacts
- Handover triggers on schema coverage (not fact count)
- Clone students isolated from real student data

---

### Phase 3: Test Handover with Schema-Based Completion
**Estimated Time:** 2-3 hours

**Tasks:**
1. End-to-end test: Assessment → GamePlan handover
2. Verify coverage calculation correct
3. Verify GamePlan receives facts
4. Verify clone isolation working

**Deliverables:**
- Working handover flow
- No data contamination

---

### Phase 4: Migrate Other Agents (Future)
**Estimated Time:** 2-3 days

**Tasks:**
1. GamePlan Agent → Universal Facts
2. Execution Agent → Universal Facts
3. Awards/ECs/Scholarships Agents → Universal Facts

**Deliverables:**
- All agents using Universal Facts Protocol
- Unified data architecture

---

## Critical Safety Layer: Clone Student Isolation

### The Problem

**Current State:**
```typescript
// Clone student mapped to real student
const studentMapping = {
  'huda-v26-2025': 'huda-2025'  // ← DANGER!
};

// If we write Universal Facts to production tables...
INSERT INTO students (student_id, grade, high_school)
VALUES ('huda-2025', 10, 'Dublin High')
ON CONFLICT (student_id) DO UPDATE SET
  grade = EXCLUDED.grade,
  high_school = EXCLUDED.high_school;

// ↑ OVERWRITES REAL HUDA'S DATA! ❌
```

**Risk:** Clone testing data contaminates real student records.

---

### Solution: Student Isolation Layer

**Principle:** Clone students write to separate namespace/tables, never touch production data.

**Implementation Options:**

#### Option A: Separate Clone Tables (Recommended)

```sql
-- Create clone mirror tables
CREATE TABLE students_clone (
  LIKE students INCLUDING ALL
);

CREATE TABLE weekly_vitals_clone (
  LIKE weekly_vitals INCLUDING ALL
);

CREATE TABLE kb_items_clone (
  LIKE kb_items INCLUDING ALL
);

-- ... mirror all 25+ tables with _clone suffix
```

**Routing Logic:**
```typescript
class StudentIsolation {
  /**
   * Determine if student is clone
   */
  static isCloneStudent(studentId: string): boolean {
    return studentId.includes('-v26-') ||
           studentId.includes('-clone-') ||
           studentId.endsWith('-2025') && studentId.startsWith('huda-v26');
  }

  /**
   * Get table name with clone suffix if needed
   */
  static getTableName(
    baseTable: ProductionTable,
    studentId: string
  ): string {
    if (this.isCloneStudent(studentId)) {
      return `${baseTable}_clone`;
    }
    return baseTable;
  }
}

// Usage in FactTransformer
class FactTransformer {
  async transformToStudentsTable(fact: UniversalFact): Promise<void> {
    // Get correct table (students or students_clone)
    const tableName = StudentIsolation.getTableName(
      ProductionTable.STUDENTS,
      fact.student_id
    );

    await this.pool.query(`
      INSERT INTO ${tableName} (student_id, grade, high_school, ...)
      VALUES ($1, $2, $3, ...)
      ON CONFLICT (student_id) DO UPDATE SET ...
    `, [fact.student_id, ...]);
  }
}
```

**Pros:**
- ✅ Complete isolation (zero contamination risk)
- ✅ Same schema as production (easy to test)
- ✅ Can compare clone vs real data
- ✅ Easy cleanup (DROP TABLE students_clone;)

**Cons:**
- ⚠️ Requires database migration
- ⚠️ 2x table count (50+ tables)

---

#### Option B: Clone Student ID Prefix (Alternative)

**Keep same tables, use ID prefix to isolate:**

```typescript
class StudentIsolation {
  /**
   * Convert clone student ID to isolated ID
   */
  static toIsolatedId(studentId: string): string {
    if (this.isCloneStudent(studentId)) {
      return `clone_${studentId}`;  // huda-v26-2025 → clone_huda-v26-2025
    }
    return studentId;
  }

  /**
   * Convert back to original ID
   */
  static fromIsolatedId(isolatedId: string): string {
    if (isolatedId.startsWith('clone_')) {
      return isolatedId.substring(6);
    }
    return isolatedId;
  }
}

// Usage
const isolatedId = StudentIsolation.toIsolatedId('huda-v26-2025');
// → 'clone_huda-v26-2025'

await this.pool.query(`
  INSERT INTO students (student_id, grade, ...)
  VALUES ($1, $2, ...)
`, [isolatedId, ...]);  // Uses clone_huda-v26-2025, not huda-2025
```

**Pros:**
- ✅ No database migration needed
- ✅ Same tables for clone + real
- ✅ Simple implementation

**Cons:**
- ⚠️ Clone data mixed with real data (harder to cleanup)
- ⚠️ Less obvious isolation
- ⚠️ Risk if isolation logic has bug

---

#### Option C: Separate Database/Schema (Overkill)

**Create entire clone database:**
```sql
CREATE DATABASE ivylevel_clone;
-- Mirror entire schema
```

**Pros:**
- ✅ Ultimate isolation
- ✅ Can test migrations safely

**Cons:**
- ❌ Expensive (2x infrastructure)
- ❌ Complex setup
- ❌ Overkill for testing

---

### Recommended: Option A (Clone Tables)

**Migration Script:**

```sql
-- migrations/034_create_clone_tables.sql

-- Mirror all production tables with _clone suffix

CREATE TABLE students_clone (LIKE students INCLUDING ALL);
CREATE TABLE weekly_vitals_clone (LIKE weekly_vitals INCLUDING ALL);
CREATE TABLE kb_items_clone (LIKE kb_items INCLUDING ALL);
CREATE TABLE ec_vitals_clone (LIKE ec_vitals INCLUDING ALL);
CREATE TABLE action_plans_clone (LIKE action_plans INCLUDING ALL);
CREATE TABLE action_items_clone (LIKE action_items INCLUDING ALL);
CREATE TABLE game_plan_clone (LIKE game_plan INCLUDING ALL);
CREATE TABLE gaps_clone (LIKE gaps INCLUDING ALL);
CREATE TABLE ivyscore_clone (LIKE ivyscore INCLUDING ALL);
CREATE TABLE awards_clone (LIKE awards INCLUDING ALL);
CREATE TABLE programs_clone (LIKE programs INCLUDING ALL);
CREATE TABLE scholarships_clone (LIKE scholarships INCLUDING ALL);
CREATE TABLE timeline_events_clone (LIKE timeline_events INCLUDING ALL);
CREATE TABLE test_scores_clone (LIKE test_scores INCLUDING ALL);

-- Add indexes (same as production)
CREATE INDEX idx_students_clone_student_id ON students_clone(student_id);
CREATE INDEX idx_weekly_vitals_clone_student_week ON weekly_vitals_clone(student_id, week_number);
-- ... all other indexes

-- Add comment for clarity
COMMENT ON TABLE students_clone IS 'Clone/test student data - isolated from production students';
```

**Cleanup Script:**
```sql
-- scripts/cleanup_clone_data.sql

-- Drop all clone student data
DROP TABLE IF EXISTS students_clone CASCADE;
DROP TABLE IF EXISTS weekly_vitals_clone CASCADE;
DROP TABLE IF EXISTS kb_items_clone CASCADE;
-- ... all clone tables
```

---

## Phase 1 Implementation: Universal Fact Protocol

### File 1: `src/facts/UniversalFact.ts`

```typescript
/**
 * Universal Fact Protocol v1.0
 *
 * All agents produce facts in this format.
 * Facts declare their target production table + data.
 */

/**
 * Production Table Enum
 * Maps to actual database tables
 */
export enum ProductionTable {
  // Core
  STUDENTS = 'students',
  WEEKLY_VITALS = 'weekly_vitals',
  KB_ITEMS = 'kb_items',

  // Extracurriculars
  EC_VITALS = 'ec_vitals',
  EC_CHIPS = 'ec_chips',

  // Awards & Recognition
  AWARDS = 'awards',
  PROGRAMS = 'programs',
  SCHOLARSHIPS = 'scholarships',

  // Execution
  ACTION_PLANS = 'action_plans',
  ACTION_ITEMS = 'action_items',
  JTBD = 'jtbd',

  // Assessment
  IVYSCORE = 'ivyscore',
  GAPS = 'gaps',

  // Planning
  GAME_PLAN = 'game_plan',
  TIMELINE_EVENTS = 'timeline_events',

  // Testing
  TEST_SCORES = 'test_scores',

  // Essays & Applications
  ESSAYS = 'essays',
  APPLICATIONS = 'applications'
}

/**
 * Fact Category (high-level domain)
 */
export enum FactCategory {
  PROFILE = 'profile',
  ACADEMIC = 'academic',
  EXTRACURRICULAR = 'extracurricular',
  AWARD = 'award',
  TESTING = 'testing',
  PLANNING = 'planning',
  EXECUTION = 'execution'
}

/**
 * Schema Target - Declares where this fact goes in production
 */
export interface SchemaTarget {
  primary_table: ProductionTable;
  related_tables?: ProductionTable[];
  update_strategy: 'insert' | 'upsert' | 'append' | 'merge';
}

/**
 * Fact Data - Table-ready payload
 */
export interface FactData {
  // Field-level data matching target table schema
  fields: Record<string, any>;

  // Metadata about this fact
  metadata?: {
    field_name?: string;           // Canonical field name (for coverage tracking)
    data_type?: string;             // Type of data
    schema_requirement?: 'required' | 'optional';
    [key: string]: any;
  };

  // References to related entities
  references?: {
    ec_chip_id?: string;
    award_id?: string;
    plan_id?: string;
    week_number?: number;
    [key: string]: any;
  };
}

/**
 * Fact Source - Complete provenance
 */
export interface FactSource {
  agent_id: string;                   // 'assessment-agent-v18'
  extraction_method: string;          // 'gpt4o_conversational_v28'
  source_type: 'conversation' | 'form' | 'document' | 'import';
  session_id?: string;
  message_id?: string;
}

/**
 * Universal Fact - Standard format for all agent outputs
 */
export interface UniversalFact {
  // Identity
  fact_id: string;
  student_id: string;

  // Classification
  category: FactCategory;
  subcategory?: string;

  // Schema Intent (declares target table)
  schema_target: SchemaTarget;

  // Fact Payload (table-ready data)
  data: FactData;

  // Provenance
  source: FactSource;
  confidence: number;                 // 0-1
  extracted_at: string;               // ISO timestamp
  verified: boolean;
}
```

---

### File 2: `src/facts/SchemaCoverage.ts`

```typescript
import { UniversalFact, FactCategory } from './UniversalFact.js';

/**
 * Schema Coverage Tracker
 *
 * Determines if enough data collected to proceed to next agent.
 * Based on production schema requirements, NOT arbitrary fact counts.
 */
export class SchemaCoverage {
  // Required fields (minimum for GamePlan handover)
  has_grade: boolean = false;
  has_high_school: boolean = false;
  has_interests: boolean = false;

  // Optional fields (improve profile quality)
  has_target_major: boolean = false;
  has_gpa: boolean = false;
  has_test_scores: boolean = false;
  has_activities: boolean = false;
  has_awards: boolean = false;

  // Metrics
  required_fields_complete: number = 0;
  required_fields_total: number = 3;
  optional_fields_complete: number = 0;
  optional_fields_total: number = 5;
  completion_percentage: number = 0;

  // Field map (for debugging)
  private fieldMap: Map<string, UniversalFact> = new Map();

  /**
   * Calculate coverage from facts
   */
  static fromFacts(facts: UniversalFact[]): SchemaCoverage {
    const coverage = new SchemaCoverage();

    // Group facts by canonical field name
    for (const fact of facts) {
      const fieldName = fact.data.metadata?.field_name;
      if (fieldName) {
        coverage.fieldMap.set(fieldName, fact);
      }
    }

    // Check required fields
    coverage.has_grade = coverage.fieldMap.has('grade');
    coverage.has_high_school = coverage.fieldMap.has('high_school');
    coverage.has_interests = coverage.fieldMap.has('interests');

    // Check optional fields
    coverage.has_target_major = coverage.fieldMap.has('target_major');
    coverage.has_gpa = coverage.fieldMap.has('gpa');
    coverage.has_test_scores =
      coverage.fieldMap.has('sat_score') ||
      coverage.fieldMap.has('act_score');
    coverage.has_activities = coverage.fieldMap.has('current_activities');
    coverage.has_awards = coverage.fieldMap.has('awards');

    // Calculate metrics
    coverage.required_fields_complete = [
      coverage.has_grade,
      coverage.has_high_school,
      coverage.has_interests
    ].filter(Boolean).length;

    coverage.optional_fields_complete = [
      coverage.has_target_major,
      coverage.has_gpa,
      coverage.has_test_scores,
      coverage.has_activities,
      coverage.has_awards
    ].filter(Boolean).length;

    const totalComplete = coverage.required_fields_complete + coverage.optional_fields_complete;
    const totalPossible = coverage.required_fields_total + coverage.optional_fields_total;
    coverage.completion_percentage = Math.round((totalComplete / totalPossible) * 100);

    return coverage;
  }

  /**
   * Check if minimum coverage achieved for GamePlan handover
   */
  isMinimumCoverageAchieved(): boolean {
    return this.has_grade &&
           this.has_high_school &&
           this.has_interests;
  }

  /**
   * Check if optimal coverage achieved
   */
  isOptimalCoverageAchieved(): boolean {
    return this.isMinimumCoverageAchieved() &&
           this.optional_fields_complete >= 2;
  }

  /**
   * Get missing required fields (for user feedback)
   */
  getMissingRequiredFields(): string[] {
    const missing: string[] = [];
    if (!this.has_grade) missing.push('grade');
    if (!this.has_high_school) missing.push('high_school');
    if (!this.has_interests) missing.push('interests');
    return missing;
  }

  /**
   * Get missing optional fields
   */
  getMissingOptionalFields(): string[] {
    const missing: string[] = [];
    if (!this.has_target_major) missing.push('target_major');
    if (!this.has_gpa) missing.push('gpa');
    if (!this.has_test_scores) missing.push('test_scores');
    if (!this.has_activities) missing.push('current_activities');
    if (!this.has_awards) missing.push('awards');
    return missing;
  }

  /**
   * Get user-friendly description of what's missing
   */
  getMissingFieldsDescription(): string {
    const missing = this.getMissingRequiredFields();

    if (missing.length === 0) {
      return 'All required information collected!';
    }

    const fieldNames = missing.map(f => {
      switch (f) {
        case 'grade': return 'current grade';
        case 'high_school': return 'high school';
        case 'interests': return 'interests and passions';
        default: return f.replace('_', ' ');
      }
    });

    if (fieldNames.length === 1) {
      return `I still need to know about your ${fieldNames[0]}.`;
    }

    const last = fieldNames.pop();
    return `I still need to know about your ${fieldNames.join(', ')} and ${last}.`;
  }

  /**
   * Convert to JSON for logging/metadata
   */
  toJSON() {
    return {
      required: {
        grade: this.has_grade,
        high_school: this.has_high_school,
        interests: this.has_interests
      },
      optional: {
        target_major: this.has_target_major,
        gpa: this.has_gpa,
        test_scores: this.has_test_scores,
        activities: this.has_activities,
        awards: this.has_awards
      },
      metrics: {
        required_complete: this.required_fields_complete,
        required_total: this.required_fields_total,
        optional_complete: this.optional_fields_complete,
        optional_total: this.optional_fields_total,
        completion_percentage: this.completion_percentage
      },
      status: {
        is_minimum_achieved: this.isMinimumCoverageAchieved(),
        is_optimal_achieved: this.isOptimalCoverageAchieved()
      },
      missing: {
        required: this.getMissingRequiredFields(),
        optional: this.getMissingOptionalFields()
      }
    };
  }
}
```

---

### File 3: `src/facts/StudentIsolation.ts`

```typescript
import { ProductionTable } from './UniversalFact.js';

/**
 * Student Isolation Layer
 *
 * Prevents clone/test student data from contaminating production student records.
 *
 * Strategy: Clone students write to {table}_clone tables
 */
export class StudentIsolation {
  /**
   * Patterns identifying clone students
   */
  private static readonly CLONE_PATTERNS = [
    /^.*-v\d+-.*$/,        // huda-v26-2025, huda-v27-2025
    /^.*-clone-.*$/,       // huda-clone-2025
    /^clone_.*$/,          // clone_huda
    /^test_.*$/,           // test_student_123
  ];

  /**
   * Check if student ID is a clone/test student
   */
  static isCloneStudent(studentId: string): boolean {
    return this.CLONE_PATTERNS.some(pattern => pattern.test(studentId));
  }

  /**
   * Get correct table name based on student type
   *
   * Clone students → {table}_clone
   * Real students → {table}
   */
  static getTableName(baseTable: ProductionTable, studentId: string): string {
    if (this.isCloneStudent(studentId)) {
      return `${baseTable}_clone`;
    }
    return baseTable;
  }

  /**
   * Validate table exists before writing
   * (Throws error if clone table not created yet)
   */
  static async validateTableExists(
    pool: any,
    tableName: string
  ): Promise<void> {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      ) as exists
    `, [tableName]);

    if (!result.rows[0].exists) {
      throw new Error(
        `Clone table '${tableName}' does not exist. ` +
        `Run migration 034_create_clone_tables.sql first.`
      );
    }
  }

  /**
   * Get all clone table names for a list of base tables
   */
  static getCloneTableNames(baseTables: ProductionTable[]): string[] {
    return baseTables.map(table => `${table}_clone`);
  }
}

/**
 * Example Usage:
 *
 * const studentId = 'huda-v26-2025';
 *
 * // Check if clone
 * const isClone = StudentIsolation.isCloneStudent(studentId);
 * // → true
 *
 * // Get table name
 * const tableName = StudentIsolation.getTableName(
 *   ProductionTable.STUDENTS,
 *   studentId
 * );
 * // → 'students_clone' (not 'students')
 *
 * // Use in query
 * await pool.query(`
 *   INSERT INTO ${tableName} (student_id, grade, ...)
 *   VALUES ($1, $2, ...)
 * `, [studentId, grade, ...]);
 * // Writes to students_clone, not students ✅
 */
```

---

## Phase 2 Implementation: Assessment Agent Migration

### Changes to `AssessmentAgentV3ConversationalRealtime.ts`

**Add imports:**
```typescript
import {
  UniversalFact,
  FactCategory,
  ProductionTable,
  SchemaTarget,
  FactData,
  FactSource
} from '../../facts/UniversalFact.js';
import { SchemaCoverage } from '../../facts/SchemaCoverage.js';
import { StudentIsolation } from '../../facts/StudentIsolation.js';
```

**Add new method: `toUniversalFacts()`**

```typescript
/**
 * Convert extracted data → Universal Facts
 *
 * Each fact declares its schema_target (which production table to populate)
 */
private toUniversalFacts(
  studentId: string,
  extractedData: any,
  sessionId: string
): UniversalFact[] {
  const facts: UniversalFact[] = [];
  const timestamp = Date.now();

  // Grade fact → students table
  if (extractedData.grade !== undefined) {
    facts.push({
      fact_id: `fact_${studentId}_grade_${timestamp}`,
      student_id: studentId,
      category: FactCategory.PROFILE,
      subcategory: 'grade',

      schema_target: {
        primary_table: ProductionTable.STUDENTS,
        related_tables: [ProductionTable.WEEKLY_VITALS],
        update_strategy: 'upsert'
      },

      data: {
        fields: {
          current_grade: extractedData.grade,
          graduation_year: this.calculateGradYear(extractedData.grade)
        },
        metadata: {
          field_name: 'grade',  // ← For coverage tracking
          data_type: 'integer',
          schema_requirement: 'required'
        }
      },

      source: {
        agent_id: 'assessment-agent-v18',
        extraction_method: 'gpt4o_conversational_v28',
        source_type: 'conversation',
        session_id: sessionId
      },
      confidence: 0.95,
      extracted_at: new Date().toISOString(),
      verified: true
    });
  }

  // High school fact → students table
  if (extractedData.high_school) {
    facts.push({
      fact_id: `fact_${studentId}_high_school_${timestamp}`,
      student_id: studentId,
      category: FactCategory.PROFILE,
      subcategory: 'high_school',

      schema_target: {
        primary_table: ProductionTable.STUDENTS,
        update_strategy: 'upsert'
      },

      data: {
        fields: {
          high_school_name: extractedData.high_school
        },
        metadata: {
          field_name: 'high_school',
          data_type: 'string',
          schema_requirement: 'required'
        }
      },

      source: {
        agent_id: 'assessment-agent-v18',
        extraction_method: 'gpt4o_conversational_v28',
        source_type: 'conversation',
        session_id: sessionId
      },
      confidence: 0.98,
      extracted_at: new Date().toISOString(),
      verified: true
    });
  }

  // Interests fact → kb_items table
  if (extractedData.interests && extractedData.interests.length > 0) {
    facts.push({
      fact_id: `fact_${studentId}_interests_${timestamp}`,
      student_id: studentId,
      category: FactCategory.PROFILE,
      subcategory: 'interests',

      schema_target: {
        primary_table: ProductionTable.KB_ITEMS,
        update_strategy: 'upsert'
      },

      data: {
        fields: {
          interests: extractedData.interests
        },
        metadata: {
          field_name: 'interests',
          data_type: 'array',
          schema_requirement: 'required'
        }
      },

      source: {
        agent_id: 'assessment-agent-v18',
        extraction_method: 'gpt4o_conversational_v28',
        source_type: 'conversation',
        session_id: sessionId
      },
      confidence: 0.90,
      extracted_at: new Date().toISOString(),
      verified: true
    });
  }

  // ... similar for target_major, gpa, test_scores, etc.

  return facts;
}
```

**Replace `handleQuery()` handover logic:**

```typescript
async handleQuery(query: AgentQuery): Promise<IntelligenceAgentResponse> {
  const sessionId = query.session_id || 'no-session';
  const studentId = query.entity_id;

  console.log('🔧 [v34.2 UNIVERSAL FACTS] Assessment Agent with schema coverage!');

  // STEP 1: Extract data from conversation
  const extractedData = await this.extractFromConversation(query);

  // STEP 2: Convert to Universal Facts
  const newFacts = this.toUniversalFacts(studentId, extractedData, sessionId);

  // STEP 3: Load existing Universal Facts for this student
  const existingFacts = await this.loadUniversalFacts(studentId);

  // STEP 4: Calculate schema coverage (NOT fact count!)
  const allFacts = [...existingFacts, ...newFacts];
  const coverage = SchemaCoverage.fromFacts(allFacts);

  log.event('assessment.schema_coverage', {
    session_id: sessionId,
    student_id: studentId,
    coverage: coverage.toJSON()
  });

  // STEP 5: Check if minimum coverage achieved
  const isComplete = coverage.isMinimumCoverageAchieved();
  const handoverExecuted = this.sessionHandovers.get(sessionId) || false;
  const shouldHandover = isComplete && !handoverExecuted;

  console.log('[v34.2] Schema coverage check:', {
    is_complete: isComplete,
    handover_executed: handoverExecuted,
    should_handover: shouldHandover,
    completion_pct: coverage.completion_percentage,
    missing: coverage.getMissingRequiredFields()
  });

  if (shouldHandover) {
    console.log('[v34.2] ✅ Schema coverage complete! Triggering handover...');

    this.sessionHandovers.set(sessionId, true);

    return {
      response: this.generateHandoverResponse(coverage),
      facts_used: allFacts.map(f => ({
        fact_id: f.fact_id,
        category: f.category,
        value: f.data.fields
      })),
      validation_score: 1.0,
      provenance: [],
      intelligence_triggered: ['TYPE-085', 'TYPE-086'],
      triggered_intelligence: ['TYPE-085', 'TYPE-086'],

      metadata: {
        assessment_complete: true,
        schema_coverage: coverage.toJSON(),
        universal_facts: newFacts,  // ← NEW: Pass facts to orchestrator

        signals: {
          requires_handover: [{
            from_agent: 'assessment-agent-v18',
            to_agent: 'gameplan-agent-v18',
            reason: 'Minimum schema coverage achieved',
            confidence: 1.0,
            schema_coverage: coverage.toJSON()
          }]
        }
      }
    };
  }

  // Not complete yet - continue assessment
  console.log('[v34.2] Assessment not complete, missing:', coverage.getMissingRequiredFields());

  // Generate response with intelligence
  const intelligenceResults = await this.processIntelligenceTypes(query, existingFacts);
  const response = await this.generateIntelligentConversationalResponse(
    query,
    existingFacts,
    intelligenceResults
  );

  return {
    response,
    facts_used: allFacts.map(f => ({
      fact_id: f.fact_id,
      category: f.category,
      value: f.data.fields
    })),
    validation_score: 1.0,
    provenance: [],
    intelligence_triggered: intelligenceResults.filter(r => r.triggered).map(r => r.type_id),
    triggered_intelligence: intelligenceResults.filter(r => r.triggered).map(r => r.type_id),

    metadata: {
      assessment_complete: false,
      schema_coverage: coverage.toJSON(),
      universal_facts: newFacts
    }
  };
}
```

**Add helper: `loadUniversalFacts()`**

```typescript
/**
 * Load Universal Facts for student
 * (Later will load from universal_facts table)
 * (For now, reconstruct from kb_items)
 */
private async loadUniversalFacts(studentId: string): Promise<UniversalFact[]> {
  // TODO Phase 3: Load from universal_facts table
  // For now, reconstruct from existing kb_items data

  const rows = await this.pool.query(`
    SELECT id, data, created_ts
    FROM kb_items.edges
    WHERE entity_id = $1
    AND source_ref = 'gpt4o_conversational_extraction_v28'
    ORDER BY created_ts ASC
  `, [studentId]);

  const facts: UniversalFact[] = [];

  for (const row of rows) {
    const data = row.data;
    const timestamp = row.created_ts.getTime();

    // Reconstruct Universal Facts from JSON data
    if (data.grade !== undefined) {
      facts.push({
        fact_id: `fact_${studentId}_grade_${timestamp}`,
        student_id: studentId,
        category: FactCategory.PROFILE,
        subcategory: 'grade',
        schema_target: {
          primary_table: ProductionTable.STUDENTS,
          update_strategy: 'upsert'
        },
        data: {
          fields: { current_grade: data.grade },
          metadata: { field_name: 'grade', schema_requirement: 'required' }
        },
        source: {
          agent_id: 'assessment-agent-v18',
          extraction_method: 'gpt4o_conversational_v28',
          source_type: 'conversation'
        },
        confidence: 0.95,
        extracted_at: row.created_ts.toISOString(),
        verified: true
      });
    }

    if (data.high_school) {
      facts.push({
        fact_id: `fact_${studentId}_high_school_${timestamp}`,
        student_id: studentId,
        category: FactCategory.PROFILE,
        subcategory: 'high_school',
        schema_target: {
          primary_table: ProductionTable.STUDENTS,
          update_strategy: 'upsert'
        },
        data: {
          fields: { high_school_name: data.high_school },
          metadata: { field_name: 'high_school', schema_requirement: 'required' }
        },
        source: {
          agent_id: 'assessment-agent-v18',
          extraction_method: 'gpt4o_conversational_v28',
          source_type: 'conversation'
        },
        confidence: 0.98,
        extracted_at: row.created_ts.toISOString(),
        verified: true
      });
    }

    if (data.interests && data.interests.length > 0) {
      facts.push({
        fact_id: `fact_${studentId}_interests_${timestamp}`,
        student_id: studentId,
        category: FactCategory.PROFILE,
        subcategory: 'interests',
        schema_target: {
          primary_table: ProductionTable.KB_ITEMS,
          update_strategy: 'upsert'
        },
        data: {
          fields: { interests: data.interests },
          metadata: { field_name: 'interests', schema_requirement: 'required' }
        },
        source: {
          agent_id: 'assessment-agent-v18',
          extraction_method: 'gpt4o_conversational_v28',
          source_type: 'conversation'
        },
        confidence: 0.90,
        extracted_at: row.created_ts.toISOString(),
        verified: true
      });
    }

    // ... reconstruct other facts
  }

  return facts;
}
```

**Update handover response generation:**

```typescript
private generateHandoverResponse(coverage: SchemaCoverage): string {
  return `Perfect! I've gathered the core information I need:

✅ Grade: ${coverage.has_grade ? 'Confirmed' : ''}
✅ High School: ${coverage.has_high_school ? 'Confirmed' : ''}
✅ Interests: ${coverage.has_interests ? 'Confirmed' : ''}

Based on your profile, I can see your authentic passion and direction. Let me hand you over to our Game Plan strategist who will create your personalized roadmap.

Ready to see your strategic plan?`;
}
```

---

## Testing Plan

### Test 1: Schema Coverage with 3 Required Fields

```bash
# Start fresh session
curl -X POST http://localhost:8787/api/v26/session/start \
  -H "Content-Type: application/json" \
  -d '{"student_id": "test-clone-001", "session_type": "onboarding"}'

# Message 1: Grade
curl -X POST http://localhost:8787/api/v26/agents/assessment-agent-v18/message \
  -H "Content-Type: application/json" \
  -d '{"session_id": "...", "student_id": "test-clone-001", "message": "10"}'

# Expected: coverage = {required_complete: 1/3, is_minimum_achieved: false}

# Message 2: High School
curl -X POST ... -d '{"message": "Dublin High"}'

# Expected: coverage = {required_complete: 2/3, is_minimum_achieved: false}

# Message 3: Interests
curl -X POST ... -d '{"message": "CS, Game Dev, Math"}'

# Expected: coverage = {required_complete: 3/3, is_minimum_achieved: true}
#           requires_handover signal set!

# Message 4: Confirmation
curl -X POST ... -d '{"message": "yes"}'

# Expected: Handover triggers, GamePlan activated
```

### Test 2: Clone Student Isolation

```bash
# Test clone student writes to clone tables
curl -X POST ... -d '{
  "student_id": "huda-v26-2025",
  "message": "I am in 11th grade"
}'

# Verify clone table used
psql -c "SELECT * FROM students_clone WHERE student_id = 'huda-v26-2025';"
# Should find row

psql -c "SELECT * FROM students WHERE student_id = 'huda-2025';"
# Should NOT be modified (real Huda data intact)
```

### Test 3: Real Student Still Works

```bash
# Test real student writes to production tables
curl -X POST ... -d '{
  "student_id": "huda-2025",
  "message": "I am in 12th grade"
}'

# Verify production table used
psql -c "SELECT * FROM students WHERE student_id = 'huda-2025';"
# Should update

psql -c "SELECT * FROM students_clone WHERE student_id = 'huda-2025';"
# Should NOT exist (not a clone)
```

---

## Success Criteria

After Phase 1-2 complete:

✅ `UniversalFact` interface defined
✅ `SchemaCoverage` class working
✅ `StudentIsolation` preventing data contamination
✅ Assessment Agent produces Universal Facts
✅ Handover triggers on schema coverage (NOT fact count)
✅ Clone students write to `*_clone` tables only
✅ Real students write to production tables only
✅ No infinite loops
✅ Clear user feedback on what's missing

---

## Timeline

**Phase 1:** 4-6 hours (Universal Fact Protocol + Safety)
**Phase 2:** 6-8 hours (Assessment Agent Migration)
**Phase 3:** 2-3 hours (Testing & Validation)

**Total:** ~2 days for complete Assessment → GamePlan handover

**Phase 4** (migrate other agents): Future work, ~2-3 days

---

## Conclusion

This Universal Data Architecture approach:

✅ **Fixes handover bug** - schema coverage, not fact count
✅ **Prevents data contamination** - clone student isolation
✅ **Aligns with production** - based on actual table requirements
✅ **Scalable** - all agents use same protocol
✅ **Clear semantics** - "need grade, school, interests" not "need 5 facts"
✅ **Future-proof** - foundation for all agents

**This is the right architecture for the long term.**
