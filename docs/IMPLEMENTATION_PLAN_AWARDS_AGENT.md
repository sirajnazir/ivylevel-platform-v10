# Awards Agent Implementation Plan

**Decision Date:** 2025-10-29
**Approach:** One agent at a time (design → extract → build → test)
**Current Phase:** Awards Agent (Phase 1 of 10)

---

## 🎯 Why Awards Agent First

**Strategic Rationale:**
1. ✅ **Spec Complete:** Gold standard specification already done (50,000 words, 14 intelligence types)
2. ✅ **Highest Impact:** "Most resonating, quickest high success rate, highest customer satisfaction"
3. ✅ **Clear Data:** 93 weeks validated, 33% win rate, 1.2 opportunities/interaction
4. ✅ **Reusable Intelligence:** TYPE-020 (Opportunity Pipeline) used by 4+ other agents
5. ✅ **Architecture Validation:** Proves Intelligence Types + Fact-First integration before scaling

---

## 📋 Implementation Phases

### Phase 1: Extract Intelligence (1-2 days)

**Goal:** Extract 3 priority intelligence types from coaching data into TypeScript implementations

**Intelligence Types to Build:**
1. **TYPE-023: Award Arbitrage System** (Core recommendation engine)
2. **TYPE-020: Opportunity Pipeline Architecture** (Universal - reusable by all agents)
3. **TYPE-027: Quick Wins Strategy** (8-week momentum builder)

**Data Sources:**
- `/data/coaching_intelligence/extractions/huda_assess_plus_gameplan/02-B-Huda-GamePlan-Creation.jsonl`
  - Line 7: Award probability sequencing (NCWIT 70%, Congressional 60%, YoungArts 40%)
  - Line 9: Quarterly momentum building
- `/data/coaching_intelligence/extractions/huda_assess_plus_gameplan/01-huda_assess_extraction.json`
  - Opportunity Pipeline patterns
- `/data/eq/sessions/jenny_eq_session_w008_extract.json`
  - Award reverse engineering technique
  - Opportunity bombardment patterns

**Extraction Tasks:**

#### Task 1.1: Extract TYPE-023 (Award Arbitrage)
**From:** Line 7 of GamePlan-Creation.jsonl + W008 session
**Extract:**
- Award scoring formula: `(Alignment × 3) + (Odds × 2) + (Prestige × 2) + (Essay Reuse × 1)`
- Probability calculations: NCWIT 70%, Congressional 60%, YoungArts 40%
- Strategic framing guidance
- Tier classification (T1-T4)

**Output:** `services/agent-framework/src/intelligence/types/AwardArbitrageSystem.ts`

#### Task 1.2: Extract TYPE-020 (Opportunity Pipeline)
**From:** Multiple sessions showing 1.2 opportunities/interaction pattern
**Extract:**
- Bombardment formula: 1.2 opportunities per interaction
- 70% application rate expectation
- 3:1 buffer ratio (3 opportunities → 1 application)
- <72hr recovery from rejection
- Opportunity pre-qualification logic

**Output:** `services/agent-framework/src/intelligence/types/OpportunityPipeline.ts`

#### Task 1.3: Extract TYPE-027 (Quick Wins)
**From:** Line 9 of GamePlan-Creation.jsonl (Quarterly momentum)
**Extract:**
- 8-week momentum engine
- Phased approach: Foundation → Recognition → Scale → Breakthrough
- Quick win identification criteria
- 2-week competition targeting

**Output:** `services/agent-framework/src/intelligence/types/QuickWinsStrategy.ts`

---

### Phase 2: Build IntelligenceRegistry (1 day)

**Goal:** Create global registry for managing intelligence types

**Files to Create:**
1. `services/agent-framework/src/intelligence/IntelligenceRegistry.ts`
2. `services/agent-framework/src/intelligence/types/BaseIntelligenceType.ts` (interface)
3. `services/agent-framework/src/intelligence/types/index.ts` (exports)

**Registry Pattern:**
```typescript
export class IntelligenceRegistry {
  private static modules: Map<string, IntelligenceType> = new Map();

  static register(module: IntelligenceType): void;
  static get(typeId: string): IntelligenceType;
  static initialize(): void; // Register all types at startup
}
```

**Initialization:**
```typescript
// At app startup
IntelligenceRegistry.initialize();
// Registers: TYPE-020, TYPE-023, TYPE-027

// Agents retrieve by ID
const arbitrage = IntelligenceRegistry.get('TYPE-023: Award_Arbitrage_System');
```

---

### Phase 3: Build AwardsAgentRefactored (2 days)

**Goal:** Create Awards Agent extending BaseAgent with Intelligence Types

**File to Create:**
`services/agent-framework/src/agents/v18/AwardsAgentRefactored.ts`

**Implementation Pattern:**
```typescript
export class AwardsAgentRefactored extends BaseAgent {
  protected agentDomain = 'awards' as const;

  // Declare domain-specific intelligence types
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [
    IntelligenceRegistry.get('TYPE-023: Award_Arbitrage_System'),
    IntelligenceRegistry.get('TYPE-027: Quick_Wins_Strategy'),
    IntelligenceRegistry.get('TYPE-020: Opportunity_Pipeline_Architecture'),  // Universal
  ];

  // Declare required facts
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,
      FactCategory.AWARDS_WON,
      FactCategory.ACTIVITY_DATA,
      FactCategory.UNIQUE_NARRATIVE,
      FactCategory.TARGET_SCHOOLS
    ];
  }

  // BaseAgent.handleQuery() will:
  // 1. Load facts from FactStore
  // 2. Validate facts
  // 3. Run all intelligence types in parallel
  // 4. Synthesize response
}
```

**Key Methods (inherited from BaseAgent):**
- ✅ `async handleQuery(query)` - Main entry point (ENFORCED by BaseAgent)
- ✅ `async loadFacts(entityId)` - Fetch from FactStore
- ✅ `validateFacts(facts)` - Check required categories present
- ✅ `synthesizeResponse(intelligenceResults, query, facts)` - Combine results

**Agent-Specific Customization:**
- `getRequiredFacts()` - Declare what facts Awards needs
- `DOMAIN_INTELLIGENCE` - Declare which intelligence types to use

---

### Phase 4: Update Registry (1 day)

**Goal:** Integrate AwardsAgent into routing system

**File to Update:**
`services/agent-framework/src/agents/registry.ts`

**Changes:**
```typescript
import { AwardsAgentRefactored } from './v18/AwardsAgentRefactored.js';

export class AgentRegistry {
  private awardsAgent: AwardsAgentRefactored | null = null;

  async initialize(pool: Pool): Promise<void> {
    // ... existing code

    // Initialize AwardsAgent v18 with FactStore
    this.awardsAgent = new AwardsAgentRefactored(this.factStore);
    this.awardsAgent.initializeEventBus(this.eventBus, pool);

    log.event('agent_registry.initialize_complete', {
      agents_initialized: [
        'GamePlanAgent-v18',
        'AssessmentAgent-v18',
        'ExtracurricularsAgent-v18',
        'AwardsAgent-v18'  // NEW
      ],
    });
  }

  getAwardsAgent(): AwardsAgentRefactored {
    if (!this.awardsAgent) {
      throw new Error('AwardsAgent not initialized. Call initialize() first.');
    }
    return this.awardsAgent;
  }

  async routeQuery(params: { student_id, query, session_id }) {
    const lowerQuery = query.toLowerCase();

    // Check for awards queries
    const isAwardsQuery =
      lowerQuery.includes('award') ||
      lowerQuery.includes('competition') ||
      lowerQuery.includes('honor') ||
      lowerQuery.includes('recognition') ||
      lowerQuery.includes('ncwit') ||
      lowerQuery.includes('congressional app');

    if (isAwardsQuery) {
      const awardsAgent = this.getAwardsAgent();
      const result = await awardsAgent.handleQuery({
        entity_id: params.student_id,
        query: params.query,
        session_id: params.session_id,
      });

      return {
        response: result.response,
        agent_used: 'AwardsAgent-v18',
        metadata: result.metadata,
      };
    }

    // ... existing routing logic
  }
}
```

---

### Phase 5: Test & Validate (2 days)

**Goal:** Test with real student queries, validate spec assumptions

**Test Queries:**
1. "What awards should I apply to?" (Core recommendation)
2. "I didn't win NCWIT" (Rejection handling via TYPE-005 universal)
3. "I need quick wins before college apps" (TYPE-027 Quick Wins)
4. "What are my chances of winning Congressional App?" (Award Arbitrage scoring)

**Validation Checklist:**
- [ ] Agent responds to all 4 test queries
- [ ] Returns scored award recommendations (TYPE-023)
- [ ] Demonstrates parallel processing of 3 intelligence types
- [ ] Facts loaded from FactStore before response
- [ ] Response includes `facts_used[]` array
- [ ] Response includes `validation_score`
- [ ] Opportunity Pipeline delivers 1.2 opportunities/interaction
- [ ] Quick Wins strategy identifies 8-week targets

**Success Metrics:**
- Award recommendations match Jenny's coaching patterns
- Parallel processing completes in <3 seconds
- Fact-First validation catches hallucinations
- Spec assumptions validated (or documented where different)

---

### Phase 6: Document Learnings (1 day)

**Goal:** Capture lessons learned for next 9 agents

**Document:**
1. **What worked well:**
   - Which parts of spec were accurate?
   - Which intelligence types were easiest to implement?
   - What patterns emerged?

2. **What needed adjustment:**
   - Spec vs. reality gaps
   - Implementation challenges
   - Performance issues

3. **Recommendations for next agents:**
   - Template improvements
   - Common pitfalls to avoid
   - Reusable patterns

**Output:** `docs/AWARDS_AGENT_LEARNINGS.md`

---

## 📁 File Structure (After Awards Agent)

```
services/agent-framework/src/
├── intelligence/
│   ├── IntelligenceRegistry.ts                    # NEW
│   ├── types/
│   │   ├── BaseIntelligenceType.ts               # NEW
│   │   ├── AwardArbitrageSystem.ts               # NEW (TYPE-023)
│   │   ├── OpportunityPipeline.ts                # NEW (TYPE-020)
│   │   ├── QuickWinsStrategy.ts                  # NEW (TYPE-027)
│   │   └── index.ts                              # NEW
│   └── README.md                                  # NEW
├── agents/
│   ├── registry.ts                                # UPDATED
│   └── v18/
│       ├── AwardsAgentRefactored.ts              # NEW
│       ├── GamePlanAgent.ts                       # Existing
│       ├── AssessmentAgent.ts                     # Existing
│       └── ExtracurricularsAgentRefactored.ts    # Existing
└── facts/
    ├── FactStore.ts                               # Existing
    └── FactValidator.ts                           # Existing
```

---

## ⏱️ Timeline

**Total: 7-9 days**

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Extract Intelligence | 1-2 days | ⏳ Next |
| 2. Build Registry | 1 day | ⏳ Pending |
| 3. Build Agent | 2 days | ⏳ Pending |
| 4. Update Registry | 1 day | ⏳ Pending |
| 5. Test & Validate | 2 days | ⏳ Pending |
| 6. Document Learnings | 1 day | ⏳ Pending |

---

## 🎯 Next Steps

**Immediate:** Start Phase 1 - Extract Intelligence Types

**Tasks:**
1. Read and analyze coaching data sources
2. Extract TYPE-023 (Award Arbitrage) implementation
3. Extract TYPE-020 (Opportunity Pipeline) implementation
4. Extract TYPE-027 (Quick Wins) implementation
5. Create TypeScript implementations with full intelligence type structure

**After Awards Agent Complete:**
- Apply learnings to GamePlan Agent
- Iterate through remaining 8 agents
- Each agent 5-7 days (faster as patterns emerge)

---

## 📊 Success Criteria

**Awards Agent is "done" when:**
- ✅ Agent responds intelligently to 4+ test queries
- ✅ Parallel processing of 3 intelligence types works
- ✅ Fact-First architecture prevents hallucinations
- ✅ Award recommendations match Jenny's coaching quality
- ✅ Spec validated and learnings documented

**Then move to:** GamePlan Agent (Phase 2)
