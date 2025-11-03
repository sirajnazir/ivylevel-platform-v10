# Intelligence Module

**Architecture Version:** v3.0
**Created:** 2025-10-29
**Purpose:** Atomic reusable units of coaching intelligence for multi-agent system

---

## 📋 Overview

The Intelligence Module implements the **Intelligence Types Architecture** - a pattern for packaging coaching intelligence into atomic, reusable, composable units.

### Key Concepts

**Intelligence Type = Atomic Reusable Unit**

Each intelligence type bundles:
- **Framework** - Conceptual model (how to think)
- **Tactics** - Executable procedures (what to do)
- **Techniques** - Atomic actions (specific steps)
- **Chips** - Knowledge artifacts (data, templates, examples)
- **Metrics** - Success criteria (how to measure)
- **Triggers** - Activation conditions (when to fire)

### 5-Level Hierarchy

```
Level 1: Intelligence Type (atomic unit)
   ↓
Level 2: Framework (conceptual model)
   ↓
Level 3: Tactic (executable procedure)
   ↓
Level 4: Technique (atomic action)
   ↓
Level 5: Chip (knowledge artifact)
```

---

## 🏗️ Architecture

### Intelligence Categories

**UNIVERSAL Intelligence Types**
- Inherited by ALL agents
- Cross-cutting concerns (rejection handling, opportunity pipeline, celebration)
- Examples: TYPE-020 (Opportunity Pipeline), TYPE-005 (3R Rejection Protocol)

**DOMAIN-SPECIFIC Intelligence Types**
- Per-agent expertise
- Domain-focused logic (award scoring, essay strategy, summer program fit)
- Examples: TYPE-023 (Award Arbitrage), TYPE-027 (Quick Wins Strategy)

### Parallel Multi-Threaded Processing

**Key Design Decision:** All intelligence types process every query **simultaneously**.

```typescript
async handleQuery(query: AgentQuery) {
  // 1. Load facts from FactStore
  const facts = await this.factStore.getFacts(query.entity_id);

  // 2. Run ALL intelligence types in parallel
  const results = await Promise.all(
    this.allIntelligenceTypes.map(type => type.process(query, facts))
  );

  // 3. Filter triggered results
  const triggered = results.filter(r => r.triggered);

  // 4. Synthesize response
  return this.synthesizeResponse(triggered, query, facts);
}
```

**Benefits:**
- Maximizes intelligence coverage
- Prevents missed opportunities
- Scales linearly with intelligence types
- Aligns with non-linear student journeys

---

## 📂 Directory Structure

```
/services/agent-framework/src/intelligence/
├── IntelligenceRegistry.ts              # Global registry
├── types/
│   ├── BaseIntelligenceType.ts         # Interface + abstract class
│   ├── index.ts                        # Exports
│   │
│   ├── OpportunityPipeline.ts          # TYPE-020 (UNIVERSAL)
│   │
│   ├── AwardArbitrageSystem.ts         # TYPE-023 (Awards)
│   └── QuickWinsStrategy.ts            # TYPE-027 (Awards)
│
└── README.md                            # This file
```

---

## 🚀 Usage

### 1. Initialize Registry (at app startup)

```typescript
import { IntelligenceRegistry } from './intelligence/IntelligenceRegistry.js';

// In server initialization
IntelligenceRegistry.initialize();
```

### 2. Retrieve Intelligence Types (in agents)

```typescript
import { IntelligenceRegistry } from '../intelligence/IntelligenceRegistry.js';

export class AwardsAgentRefactored extends BaseAgent {
  protected DOMAIN_INTELLIGENCE = [
    IntelligenceRegistry.get('TYPE-023'), // Award Arbitrage
    IntelligenceRegistry.get('TYPE-027'), // Quick Wins
    IntelligenceRegistry.get('TYPE-020'), // Opportunity Pipeline (universal)
  ];
}
```

### 3. Process Query (inherited from BaseAgent)

```typescript
const result = await awardsAgent.handleQuery({
  entity_id: 'student_123',
  query: 'What awards should I apply to?',
  session_id: 'session_456'
});
```

---

## 📦 Intelligence Type Implementation Pattern

### Step 1: Extend BaseIntelligenceType

```typescript
import { BaseIntelligenceType, AgentQuery, IntelligenceResult } from './BaseIntelligenceType.js';
import { FactSet } from '../../facts/FactSet.js';

export class MyIntelligenceType extends BaseIntelligenceType {
  type_id = 'TYPE-XXX';
  name = 'My Intelligence Type';
  category = 'DOMAIN_SPECIFIC' as const;
  description = 'Brief purpose';

  components = {
    framework: { /* ... */ },
    tactics: [ /* ... */ ],
    techniques: [ /* ... */ ],
    chips: [ /* ... */ ],
    metrics: { /* ... */ },
    triggers: { conditions: ['keyword1', 'keyword2'] }
  };

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    // 1. Check activation
    if (!this.shouldActivate(query, facts)) {
      return this.createInactiveResult('component_name');
    }

    // 2. Extract facts
    const narrative = facts.getValueByType('unique_narrative');

    // 3. Process intelligence
    const result = this.myIntelligenceLogic(narrative);

    // 4. Return result
    return {
      type_id: this.type_id,
      component: 'component_name',
      data: result,
      confidence: 0.85,
      triggered: true
    };
  }
}
```

### Step 2: Register in IntelligenceRegistry

```typescript
// In IntelligenceRegistry.initialize()
this.register(new MyIntelligenceType());
```

### Step 3: Use in Agent

```typescript
export class MyAgent extends BaseAgent {
  protected DOMAIN_INTELLIGENCE = [
    IntelligenceRegistry.get('TYPE-XXX')
  ];
}
```

---

## 📊 Current Intelligence Types

### UNIVERSAL (1 implemented)

| Type ID | Name | Status | Agent |
|---------|------|--------|-------|
| TYPE-020 | Opportunity Pipeline Architecture | ✅ Implemented | All |

**Pending (6 types):**
- TYPE-005: 3R Rejection Protocol
- TYPE-010: Permission Field
- TYPE-011: Celebration Science
- TYPE-012: Rejection Alchemy
- TYPE-018: Strategic Pivot Protocol
- TYPE-021: Parent Navigation Matrix

### DOMAIN-SPECIFIC (2 implemented)

| Type ID | Name | Status | Agent |
|---------|------|--------|-------|
| TYPE-023 | Award Arbitrage System | ✅ Implemented | Awards |
| TYPE-027 | Quick Wins Strategy | ✅ Implemented | Awards |

**Pending (see agent specs for full list)**

---

## 🔍 Intelligence Type Components

### Framework (Conceptual Model)

**Purpose:** How to think about this intelligence

**Example:**
```typescript
framework: {
  name: 'Award Arbitrage Framework',
  description: 'Score awards across 4 dimensions to find highest ROI',
  mental_model: 'Like stock picking: maximize returns while minimizing risk'
}
```

### Tactics (Executable Procedures)

**Purpose:** Step-by-step procedures for execution

**Example:**
```typescript
tactics: [
  {
    name: 'Reverse Engineering',
    description: 'Study past winners to identify patterns',
    steps: [
      'Research past 3 years of winners',
      'Identify common themes',
      'Match student project to patterns'
    ],
    when_to_use: 'Before applying to competitive award'
  }
]
```

### Techniques (Atomic Actions)

**Purpose:** Specific actions to take

**Example:**
```typescript
techniques: [
  {
    name: 'Alignment Calculation',
    action: 'Score narrative fit + demographic match + project type'
  }
]
```

### Chips (Knowledge Artifacts)

**Purpose:** Data, templates, examples, formulas

**Example:**
```typescript
chips: [
  {
    type: 'formula',
    name: 'Award Score Formula',
    content: {
      formula: '(Alignment × 3) + (Odds × 2) + (Prestige × 2) + (Essay × 1)',
      weights: { alignment: 3, odds: 2, prestige: 2, essay: 1 }
    }
  }
]
```

### Metrics (Success Criteria)

**Purpose:** How to measure success

**Example:**
```typescript
metrics: {
  success_criteria: [
    '33% win rate across applications',
    'Top 3 awards have ≥60% probability'
  ],
  validation: 'Compare against past student outcomes',
  target_metrics: { win_rate: 0.33 }
}
```

### Triggers (Activation Conditions)

**Purpose:** When to activate this intelligence

**Example:**
```typescript
triggers: {
  conditions: ['award', 'competition', 'recognition', 'ncwit']
}
```

---

## 🧪 Testing Intelligence Types

### Unit Test Pattern

```typescript
import { MyIntelligenceType } from './MyIntelligenceType.js';
import { FactSet } from '../../facts/FactSet.js';

describe('MyIntelligenceType', () => {
  it('should activate on trigger keywords', () => {
    const intel = new MyIntelligenceType();
    const query = { query: 'keyword1 example', entity_id: '123', session_id: 'abc' };
    const facts = new FactSet('123');

    expect(intel.shouldActivate(query, facts)).toBe(true);
  });

  it('should process and return result', async () => {
    const intel = new MyIntelligenceType();
    const query = { query: 'keyword1', entity_id: '123', session_id: 'abc' };
    const facts = new FactSet('123');

    const result = await intel.process(query, facts);

    expect(result.triggered).toBe(true);
    expect(result.type_id).toBe('TYPE-XXX');
  });
});
```

---

## 📈 Performance Considerations

### Parallel Processing

- All intelligence types run in parallel via `Promise.all()`
- Expected: <3 seconds for full processing cycle
- Monitor: Track individual intelligence type latency

### Caching

- Consider caching intelligence results per session
- Cache key: `${student_id}_${query_hash}`
- TTL: 5 minutes

### Optimization

- Early return on `shouldActivate()` check
- Lazy load heavy data structures
- Use indexes for fact lookups

---

## 🔮 Future Enhancements

**Q1 2026: Real-Time Student Calibration**
- Calibration as Facts (ADR-002)
- Adjust intelligence parameters based on student patterns
- Example: Adjust opportunity bombardment rate (1.2 → 0.8) if student overwhelmed

**Q2 2026: Intelligence Type Composition**
- Compose complex intelligence from primitives
- Example: Award Strategy = Arbitrage + Quick Wins + Pipeline

**Q3 2026: Self-Improving Intelligence**
- Track success rate per intelligence type
- Auto-tune weights and thresholds
- A/B test intelligence variations

---

## 📚 References

- **Architecture:** [FOUNDATION_AGENTS_ARCHITECTURE.md](../../docs/FOUNDATION_AGENTS_ARCHITECTURE.md)
- **Awards Spec:** [AWARDS_AGENT_TECH_SPEC.md](../../docs/agents/AWARDS_AGENT_TECH_SPEC.md)
- **Implementation Plan:** [IMPLEMENTATION_PLAN_AWARDS_AGENT.md](../../docs/IMPLEMENTATION_PLAN_AWARDS_AGENT.md)
- **Architecture Decisions:** [ARCHITECTURE_DECISIONS.md](../../docs/ARCHITECTURE_DECISIONS.md)

---

**Status:** ✅ Phase 2 Complete - IntelligenceRegistry operational
**Next:** Phase 3 - Build AwardsAgentRefactored
**Timeline:** Awards Agent completion in 5-7 days
