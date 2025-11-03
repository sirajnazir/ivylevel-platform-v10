# Fact-First Agent Architecture (Universal Primitive)

**Version:** 1.0
**Created:** 2025-10-29
**Status:** Design Specification

---

## 1. Core Primitive: FactStore

**Definition:** A `FactStore` is a universal abstraction that provides **truth-grounded data access** for all agents, enforcing zero-hallucination behavior.

### 1.1 What Constitutes a "Fact"?

A **Fact** is any piece of information that:
1. **Has a verifiable source** (database record, external API, public dataset)
2. **Has provenance** (timestamp, source URL, data version)
3. **Can be audited** (queryable, traceable to origin)
4. **Is immutable for a given timestamp** (facts don't change retroactively)

### 1.2 Fact Categories

```typescript
enum FactCategory {
  // Internal Facts (our database)
  STUDENT_PROFILE = 'student_profile',           // Student demographics, identity
  ASSESSMENT_DATA = 'assessment_data',           // Game plan, weak spots, strengths
  ACTIVITY_DATA = 'activity_data',               // ECs, awards, achievements
  ACADEMIC_DATA = 'academic_data',               // GPA, test scores, courses

  // External Facts (public data sources)
  COLLEGE_ADMISSIONS = 'college_admissions',     // Admit rates, CDS data
  HISTORICAL_PROFILES = 'historical_profiles',   // Past successful applicants
  SCHOLARSHIP_DATA = 'scholarship_data',         // Available scholarships
  PROGRAM_DATA = 'program_data',                 // Summer programs, competitions
  DEADLINE_DATA = 'deadline_data',               // Application deadlines

  // Derived Facts (computed from other facts)
  ELIGIBILITY = 'eligibility',                   // Computed from requirements
  MATCH_SCORE = 'match_score',                   // Computed fit scores
  TREND_ANALYSIS = 'trend_analysis',             // Computed from historical data
}
```

### 1.3 FactSource Interface

**Universal abstraction for all fact providers:**

```typescript
interface FactSource {
  source_id: string;                    // e.g., "postgres_game_plans", "cds_api", "college_board"
  source_type: 'database' | 'api' | 'file';
  category: FactCategory;

  // Core methods ALL sources must implement
  fetchFacts(query: FactQuery): Promise<Fact[]>;
  validateFact(fact: Fact): Promise<boolean>;
  getProvenance(fact: Fact): FactProvenance;
}

interface FactQuery {
  category: FactCategory;
  entity_id: string;                    // student_id, school_id, etc.
  filters?: Record<string, any>;
  timestamp?: Date;                     // For historical queries
}

interface Fact {
  fact_id: string;                      // Unique identifier
  category: FactCategory;
  entity_id: string;
  fact_type: string;                    // e.g., "gpa", "sat_score", "admit_rate"
  value: any;
  provenance: FactProvenance;
  confidence: number;                   // 0.0-1.0 (1.0 = verified, <1.0 = computed/estimated)
}

interface FactProvenance {
  source_id: string;
  timestamp: Date;
  source_url?: string;                  // For external APIs
  database_table?: string;              // For internal DB
  query_used?: string;                  // SQL or API query
  last_verified: Date;
}
```

---

## 2. Core Primitive: BaseAgent

**All agents inherit from `BaseAgent` which enforces fact-first behavior:**

```typescript
abstract class BaseAgent {
  protected factStore: FactStore;
  protected agentId: string;
  protected requiredFactCategories: FactCategory[];

  constructor(factStore: FactStore) {
    this.factStore = factStore;
  }

  /**
   * UNIVERSAL METHOD: All agents must implement
   * Defines which facts this agent needs
   */
  abstract getRequiredFacts(): FactCategory[];

  /**
   * UNIVERSAL METHOD: Fetch facts before responding
   * Enforced at base class level - cannot be bypassed
   */
  protected async loadFacts(entityId: string): Promise<FactSet> {
    const categories = this.getRequiredFacts();
    const factPromises = categories.map(category =>
      this.factStore.getFacts({
        category,
        entity_id: entityId,
      })
    );

    const results = await Promise.all(factPromises);
    return new FactSet(results.flat());
  }

  /**
   * UNIVERSAL METHOD: Validate response is fact-grounded
   * Called automatically before returning any response
   */
  protected async validateResponse(
    response: string,
    facts: FactSet
  ): Promise<ValidationResult> {
    // Check that response only contains facts from FactSet
    // Flag any statements that cannot be traced to a Fact
    return FactValidator.validate(response, facts);
  }

  /**
   * TEMPLATE METHOD: All agents follow this flow
   * Cannot be overridden - ensures fact-first behavior
   */
  async handleQuery(query: AgentQuery): Promise<AgentResponse> {
    // Step 1: Load facts (enforced)
    const facts = await this.loadFacts(query.entity_id);

    // Step 2: Check if sufficient facts exist
    if (!facts.hasSufficientData(this.getRequiredFacts())) {
      return this.generateInsufficientDataResponse(facts);
    }

    // Step 3: Generate response (agent-specific logic)
    const response = await this.generateResponse(query, facts);

    // Step 4: Validate response is fact-grounded (enforced)
    const validation = await this.validateResponse(response, facts);
    if (!validation.isValid) {
      console.error('[BaseAgent] Response contains non-fact statements:', validation.violations);
      // Either throw error or flag for review
    }

    // Step 5: Return with fact provenance
    return {
      response,
      facts_used: facts.getAllFacts(),
      validation_score: validation.score,
      provenance: facts.getProvenance(),
    };
  }

  /**
   * ABSTRACT METHOD: Each agent implements its own logic
   * But must use facts provided - cannot query directly
   */
  protected abstract generateResponse(
    query: AgentQuery,
    facts: FactSet
  ): Promise<string>;

  /**
   * TEMPLATE METHOD: Default insufficient data response
   * Can be overridden by agents
   */
  protected generateInsufficientDataResponse(facts: FactSet): AgentResponse {
    const missing = facts.getMissingCategories(this.getRequiredFacts());
    return {
      response: `I need more information to answer this. Missing: ${missing.join(', ')}`,
      facts_used: [],
      validation_score: 1.0,
      provenance: [],
    };
  }
}
```

---

## 3. FactStore Implementation

**Central registry of all fact sources:**

```typescript
class FactStore {
  private sources: Map<FactCategory, FactSource[]> = new Map();

  /**
   * Register a fact source (database, API, file)
   */
  registerSource(category: FactCategory, source: FactSource): void {
    if (!this.sources.has(category)) {
      this.sources.set(category, []);
    }
    this.sources.get(category)!.push(source);
  }

  /**
   * Fetch facts from all registered sources for a category
   */
  async getFacts(query: FactQuery): Promise<Fact[]> {
    const sources = this.sources.get(query.category) || [];

    // Fetch from all sources in parallel
    const factPromises = sources.map(source =>
      source.fetchFacts(query)
    );

    const results = await Promise.all(factPromises);
    const allFacts = results.flat();

    // Deduplicate and prioritize by confidence
    return this.deduplicateFacts(allFacts);
  }

  /**
   * Deduplicate facts (prefer higher confidence)
   */
  private deduplicateFacts(facts: Fact[]): Fact[] {
    const factMap = new Map<string, Fact>();

    facts.forEach(fact => {
      const key = `${fact.fact_type}_${fact.entity_id}`;
      const existing = factMap.get(key);

      if (!existing || fact.confidence > existing.confidence) {
        factMap.set(key, fact);
      }
    });

    return Array.from(factMap.values());
  }
}
```

---

## 4. Concrete FactSource Implementations

### 4.1 PostgresFactSource (Internal Database)

```typescript
class PostgresFactSource implements FactSource {
  source_id = 'postgres_ivylevel';
  source_type = 'database' as const;
  category: FactCategory;

  private pool: Pool;
  private tableMapping: Map<FactCategory, string>;

  constructor(pool: Pool, category: FactCategory) {
    this.pool = pool;
    this.category = category;
    this.initializeTableMapping();
  }

  private initializeTableMapping(): void {
    this.tableMapping = new Map([
      [FactCategory.STUDENT_PROFILE, 'students'],
      [FactCategory.ASSESSMENT_DATA, 'game_plans'],
      [FactCategory.ACTIVITY_DATA, 'game_plans'],  // profile_assessment.activities
      [FactCategory.ACADEMIC_DATA, 'students'],
    ]);
  }

  async fetchFacts(query: FactQuery): Promise<Fact[]> {
    const table = this.tableMapping.get(query.category);
    if (!table) return [];

    // Category-specific SQL queries
    switch (query.category) {
      case FactCategory.ASSESSMENT_DATA:
        return this.fetchAssessmentFacts(query.entity_id);
      case FactCategory.ACTIVITY_DATA:
        return this.fetchActivityFacts(query.entity_id);
      // ... etc
      default:
        return [];
    }
  }

  private async fetchAssessmentFacts(studentId: string): Promise<Fact[]> {
    const result = await this.pool.query(
      `SELECT
        profile_assessment,
        target_profile,
        target_schools,
        updated_at
      FROM game_plans
      WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) return [];

    const row = result.rows[0];
    const facts: Fact[] = [];

    // Convert database row to Facts
    if (row.target_profile?.narrative) {
      facts.push({
        fact_id: `narrative_${studentId}`,
        category: FactCategory.ASSESSMENT_DATA,
        entity_id: studentId,
        fact_type: 'unique_narrative',
        value: row.target_profile.narrative,
        provenance: {
          source_id: this.source_id,
          timestamp: row.updated_at,
          database_table: 'game_plans',
          query_used: 'target_profile->narrative',
          last_verified: row.updated_at,
        },
        confidence: 1.0,  // Direct DB record = 100% confidence
      });
    }

    // Convert weak_spots to facts
    if (row.profile_assessment?.weak_spots) {
      row.profile_assessment.weak_spots.forEach((ws: any) => {
        facts.push({
          fact_id: `weak_spot_${ws.weak_spot_id}`,
          category: FactCategory.ASSESSMENT_DATA,
          entity_id: studentId,
          fact_type: 'weak_spot',
          value: ws,
          provenance: {
            source_id: this.source_id,
            timestamp: row.updated_at,
            database_table: 'game_plans',
            query_used: 'profile_assessment->weak_spots',
            last_verified: row.updated_at,
          },
          confidence: 1.0,
        });
      });
    }

    return facts;
  }

  async validateFact(fact: Fact): Promise<boolean> {
    // Query database to verify fact still exists
    // Return false if data has changed
    return true;
  }

  getProvenance(fact: Fact): FactProvenance {
    return fact.provenance;
  }
}
```

### 4.2 CommonDataSetFactSource (External API)

```typescript
class CommonDataSetFactSource implements FactSource {
  source_id = 'cds_api';
  source_type = 'api' as const;
  category = FactCategory.COLLEGE_ADMISSIONS;

  async fetchFacts(query: FactQuery): Promise<Fact[]> {
    // query.entity_id would be a college_id
    const collegeId = query.entity_id;

    // Fetch from Common Data Set API
    const response = await fetch(`https://api.commondata.set/${collegeId}`);
    const data = await response.json();

    const facts: Fact[] = [];

    // Convert CDS data to Facts
    facts.push({
      fact_id: `admit_rate_${collegeId}`,
      category: FactCategory.COLLEGE_ADMISSIONS,
      entity_id: collegeId,
      fact_type: 'admit_rate',
      value: data.admission_rate,
      provenance: {
        source_id: this.source_id,
        timestamp: new Date(),
        source_url: `https://api.commondata.set/${collegeId}`,
        last_verified: new Date(),
      },
      confidence: 0.95,  // External API = high but not 100% confidence
    });

    return facts;
  }

  async validateFact(fact: Fact): Promise<boolean> {
    // Re-fetch from API to verify
    return true;
  }

  getProvenance(fact: Fact): FactProvenance {
    return fact.provenance;
  }
}
```

---

## 5. FactSet Utility Class

**Helper class for working with collections of facts:**

```typescript
class FactSet {
  private facts: Map<string, Fact> = new Map();

  constructor(facts: Fact[]) {
    facts.forEach(fact => {
      this.facts.set(fact.fact_id, fact);
    });
  }

  /**
   * Get all facts of a specific type
   */
  getFactsByType(factType: string): Fact[] {
    return Array.from(this.facts.values())
      .filter(f => f.fact_type === factType);
  }

  /**
   * Get all facts for a category
   */
  getFactsByCategory(category: FactCategory): Fact[] {
    return Array.from(this.facts.values())
      .filter(f => f.category === category);
  }

  /**
   * Check if sufficient data exists
   */
  hasSufficientData(requiredCategories: FactCategory[]): boolean {
    return requiredCategories.every(category =>
      this.getFactsByCategory(category).length > 0
    );
  }

  /**
   * Get missing categories
   */
  getMissingCategories(requiredCategories: FactCategory[]): FactCategory[] {
    return requiredCategories.filter(category =>
      this.getFactsByCategory(category).length === 0
    );
  }

  /**
   * Get all facts as array
   */
  getAllFacts(): Fact[] {
    return Array.from(this.facts.values());
  }

  /**
   * Get provenance for all facts
   */
  getProvenance(): FactProvenance[] {
    return this.getAllFacts().map(f => f.provenance);
  }
}
```

---

## 6. FactValidator

**Validates that responses only contain facts:**

```typescript
class FactValidator {
  /**
   * Validate that response only contains statements backed by facts
   */
  static async validate(
    response: string,
    facts: FactSet
  ): Promise<ValidationResult> {
    const violations: string[] = [];
    let score = 1.0;

    // Extract claims from response (simple version)
    const claims = this.extractClaims(response);

    // Check each claim against facts
    for (const claim of claims) {
      const isGrounded = this.isClaimGrounded(claim, facts);
      if (!isGrounded) {
        violations.push(claim);
        score -= 0.1;  // Penalize for ungrounded claims
      }
    }

    return {
      isValid: violations.length === 0,
      score: Math.max(0, score),
      violations,
    };
  }

  private static extractClaims(response: string): string[] {
    // Simple implementation: split by sentences
    // Production: Use NLP to extract factual claims
    return response.split(/[.!?]/).filter(s => s.trim());
  }

  private static isClaimGrounded(claim: string, facts: FactSet): boolean {
    // Simple implementation: check if claim contains fact values
    // Production: Use semantic similarity, NLP
    const allFacts = facts.getAllFacts();
    return allFacts.some(fact =>
      claim.toLowerCase().includes(String(fact.value).toLowerCase())
    );
  }
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  violations: string[];
}
```

---

## 7. Example: GamePlanAgent Using Universal Primitives

```typescript
class GamePlanAgent extends BaseAgent {
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,
      FactCategory.ASSESSMENT_DATA,
      FactCategory.ACTIVITY_DATA,
    ];
  }

  protected async generateResponse(
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    // Extract facts (strongly typed now)
    const narrative = facts.getFactsByType('unique_narrative')[0]?.value;
    const weakSpots = facts.getFactsByType('weak_spot')
      .filter(f => f.value.priority === 'P0');
    const strengths = facts.getFactsByType('standout_strength');

    // Build response using ONLY facts
    let response = "**Your Strategic Game Plan**\n\n";

    if (narrative) {
      response += `**Who You Are:**\n${narrative}\n\n`;
    }

    if (weakSpots.length > 0) {
      response += `**Top Priorities (P0):**\n`;
      weakSpots.forEach(ws => {
        response += `• ${ws.value.title}: ${ws.value.status}\n`;
      });
    }

    // ... rest of formatting

    return response;
  }
}
```

---

## 8. Benefits of This Architecture

### 8.1 Extensibility
- **Add new fact sources**: Just implement `FactSource` interface
- **Add external data**: Register new sources (CDS, College Board, etc.)
- **Add new fact types**: Extend `FactCategory` enum

### 8.2 Reusability
- **All agents** use same `BaseAgent` → consistent behavior
- **All fact access** goes through `FactStore` → single point of truth
- **All validation** uses same `FactValidator` → consistent quality

### 8.3 Auditability
- Every fact has **provenance** (source, timestamp, query)
- Every response includes **facts_used** (full traceability)
- Every response has **validation_score** (quality metric)

### 8.4 Testability
- Mock `FactSource` implementations for testing
- Verify agents only use provided facts
- Test validation logic independently

---

## 9. Migration Path

### Phase 1: Core Infrastructure
1. Implement `FactStore`, `BaseAgent`, `FactValidator`
2. Implement `PostgresFactSource` for existing database
3. Create `FactSet` utility class

### Phase 2: Migrate Existing Agents
1. Refactor `GamePlanAgent` to extend `BaseAgent`
2. Migrate other agents one by one
3. Deprecate direct database access in agents

### Phase 3: External Sources
1. Implement `CommonDataSetFactSource`
2. Implement `CollegeBoardFactSource`
3. Implement `HistoricalProfilesFactSource`

### Phase 4: Advanced Features
1. Add fact caching layer
2. Add fact versioning (time-travel queries)
3. Add automatic fact refresh
4. Add conflict resolution for competing facts

---

## 10. File Structure

```
services/agent-framework/src/
├── facts/
│   ├── FactStore.ts              # Central fact registry
│   ├── FactSource.ts             # Interface + base implementations
│   ├── FactSet.ts                # Utility for working with facts
│   ├── FactValidator.ts          # Response validation
│   ├── sources/
│   │   ├── PostgresFactSource.ts
│   │   ├── CommonDataSetFactSource.ts
│   │   ├── CollegeBoardFactSource.ts
│   │   └── HistoricalProfilesFactSource.ts
│   └── types.ts                  # Fact, FactCategory, FactProvenance types
├── agents/
│   ├── BaseAgent.ts              # Abstract base class
│   ├── v18/
│   │   ├── GamePlanAgent.ts      # Extends BaseAgent
│   │   └── AssessmentAgent.ts    # Extends BaseAgent
│   └── registry.ts
└── server-utfa.ts                # Initialize FactStore + sources
```

---

**End of Design Specification**
