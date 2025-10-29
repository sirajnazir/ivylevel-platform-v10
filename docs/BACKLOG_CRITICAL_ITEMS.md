# Critical Backlog - Parked Items

**Last Updated:** 2025-10-29
**Status:** Active Tracking - P0 & P2 Parked, Ready for Full Multi-Agent Implementation
**Priority System:** P0 (Critical) → P1 (High) → P2 (Medium) → P3 (Low)

**Current Focus:** Complete all 10 agent implementations with Intelligence Types Architecture (v3.0)
**Parked Until All Agents Complete:**
- P0: jenny_v11_eq fine-tuning (2-3 weeks)
- P1: Real-Time Student Calibration (CalibrationFactSource + CalibrationLearningService)
- P1: Universal Intelligence Types implementation (7 types)
- P1: Domain-Specific Intelligence Types implementation (per agent)
- P2: Pinecone population (3-4 days)
- P2: v17.0 latency optimization (1 week)

---

## 📋 Overview

This document tracks critical but parked items that should be revisited after core systems are implemented. Items here have been analyzed, scoped, and are ready for implementation when prioritized.

---

## 🔴 P0: Critical (Blocks Production Quality)

### 1. Fine-Tuned Model Enhancement: jenny_v11_eq

**Current State:**
- Using `jenny_v9_eq` (46.3% CAT-3 pass rate)
- Generic coaching voice, lacks authentic Jenny warmth
- Compensated with cat-3 post-processing layers

**Problem:**
- jenny_v9_eq trained on only 690 curated technical coaching examples
- Missing emotional warmth from real Jenny-Huda 93-week sessions
- jenny_v10_eq_combined failed (0% pass rate) due to contamination

**Solution Designed (Not Implemented):**
- jenny_v9.1_eq_targeted approach from `tools/training/extract_targeted_v9_1.py`
- Base: 690 v9 examples (proven quality)
- Add: 200-300 curated iMessage examples (warmth-rich)
- Target: 55-65% CAT-3 pass rate (vs 46.3%)

**Implementation Plan:**
1. Extract warmth-rich examples from `data/eq/imsg/jenny_eq_extract_imsg_*.json`
2. Manual quality review (≥8/10 score required)
3. Focus on: rejection support, celebration, stress/overwhelm, crisis navigation
4. Format for OpenAI fine-tuning API
5. Train jenny_v11_eq on gpt-4o-mini base
6. Validate with CAT-3 test suite

**Files to Use:**
- Training script: `tools/training/extract_targeted_v9_1.py`
- Gap analysis: `tools/training/analyze_training_gap.py`
- Data sources: `data/eq/imsg/` (7 files, 500+ interactions)
- Base data: `archive/2025-10-16-pre-v14.0/training-data/jenny_v9_eq_training.jsonl`

**Estimated Effort:** 2-3 weeks
**Expected Impact:** +10-15pp CAT-3 pass rate improvement
**Dependencies:** None (can start immediately)
**Owner:** TBD
**Status:** ⏸️ **PARKED** - Revisit after full multi-agent platform complete

**References:**
- Training history scan: Deep dive completed 2025-10-28
- Spec location: `tools/training/analyze_training_gap.py:lines 316-337`

**Rationale for Parking:**
- Current v17.3 with cat-3 post-processing achieves authentic Jenny voice (production-acceptable)
- Fine-tuning requires 2-3 weeks of dedicated effort
- More valuable to complete multi-agent platform first, then enhance model quality
- All tools and data ready when we return to this

---

## 🟠 P1: High Priority (Enhances Core Functionality)

### 2. v19.1: Summer Programs Cascade Integration

**Date Added:** 2025-10-29
**Context:** Post-v19.0 iMsg data analysis revealed authentic Jenny coaching pattern

**Current State (v19.0):**
- Summer Programs Agent operational with 3 intelligence types:
  - TYPE-028: Program Selection Matrix (multi-dimensional scoring)
  - TYPE-029: Program Application Strategy (deadline clustering, reach/match/safety)
  - TYPE-030: Cost-Benefit Intelligence (ROI analysis)
- Solid foundational algorithms, production-ready
- 4/4 tests passing, 15ms average response time
- Zero hallucinations validated

**Gap Identified from iMsg Data:**
Real Jenny coaching pattern differs from v19.0 implementation. Found in `data/eq/sessions/jenny_eq_session_w014_extraction.json`:

**"Competition Cascade" Pattern:**
```
Real Jenny: "Let me research this with you right now. [Types while talking]
Okay, there's the Swift Student Challenge from Apple - let me see if this is
still a thing. Yes! Then there's Games for Change Student Challenge with a
$10,000 scholarship - perfect for you since your game is about social change.
USC Games Expo 2024 - wait, that's one of your target schools! Getting your
game presented there would be amazing. NYU Tisch has a 4-week game design
summer program, Carnegie Mellon has a Game Academy. Here's the strategy:
you can submit the SAME game to ALL of these competitions. Each one values
different aspects - social change, technical excellence, educational value,
game design quality. Your game checks all those boxes."
```

**Missing Elements in v19.0:**
1. **Cascade Integration**: Bundle summer programs WITH competitions (TYPE-023 Award Arbitrage)
2. **Target School Alignment**: "USC Games Expo - wait, that's one of your target schools!" scoring boost
3. **Live Research Energy**: "Let me research this with you right now. [Types while talking]" pattern
4. **Multi-Dimensional Value Positioning**: "Each one values different aspects" framework
5. **Same Project → Multiple Opportunities**: Cascade submission strategy across programs+competitions

**Solution Design:**

**Phase 1: Cascade Intelligence Type** (NEW TYPE-031)
```typescript
/**
 * TYPE-031: Program-Competition Cascade
 * Category: UNIVERSAL
 *
 * Framework: Multi-Opportunity Cascade Submission
 * - Identify student's projects/artifacts (from activities facts)
 * - Find summer programs accepting that artifact type
 * - Find competitions accepting that artifact type
 * - Bundle into cascade submission strategy
 * - Prioritize based on target school alignment
 *
 * Output: "Submit your AI ethics game to: USC Games Expo (target school!),
 * Games for Change ($10K prize), Swift Student Challenge (Apple prestige)"
 */
export class ProgramCompetitionCascade implements IntelligenceType {
  type_id = 'TYPE-031';
  name = 'Program-Competition Cascade';
  category = 'UNIVERSAL';

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const artifacts = this.extractStudentArtifacts(facts);
    const programs = this.findMatchingPrograms(artifacts);
    const competitions = this.findMatchingCompetitions(artifacts);
    const targetSchools = this.getTargetSchools(facts);

    const cascades = this.buildCascadeOpportunities(
      artifacts,
      programs,
      competitions,
      targetSchools
    );

    return {
      type_id: this.type_id,
      triggered: true,
      data: { cascades, total_opportunities: cascades.length }
    };
  }
}
```

**Phase 2: Target School Alignment** (Enhance TYPE-028)
```typescript
// TYPE-028-ProgramSelectionMatrix.ts enhancement
private scoreAlignment(program: any, facts: any[]): number {
  let score = 5; // baseline

  // Existing logic...

  // NEW: Target school boost
  const targetSchools = this.getTargetSchools(facts);
  if (targetSchools.includes(program.host_institution)) {
    score += 3; // "wait, that's one of your target schools!" boost
  }

  return Math.min(score, 10);
}
```

**Phase 3: Live Research Energy Pattern** (Enhance synthesis)
```typescript
// SummerProgramsAgentRefactored.ts enhancement
protected async synthesizeResponse(
  intelligenceResults: IntelligenceResult[],
  query: AgentQuery,
  facts: FactSet
): Promise<string> {
  const sections: string[] = [];

  // NEW: Add live research energy opening
  const cascadeResult = intelligenceResults.find(r => r.type_id === 'TYPE-031');
  if (cascadeResult && cascadeResult.data.cascades.length > 0) {
    sections.push(this.formatLiveResearchOpening(cascadeResult));
  }

  // Existing synthesis logic...

  return sections.join('\n\n');
}

private formatLiveResearchOpening(result: IntelligenceResult): string {
  return `Let me research this with you right now...

Okay! I found ${result.data.total_opportunities} opportunities that match your work.
Here's the exciting part - you can submit the SAME project to ALL of these.
Each one values different aspects of your work.`;
}
```

**Implementation Plan:**
1. Create `TYPE-031-ProgramCompetitionCascade.ts` (2-3 days)
   - Extract artifacts from activity facts
   - Cross-reference with kb_items (programs + competitions)
   - Build cascade opportunities with submission strategy

2. Enhance TYPE-028 with target school alignment (1 day)
   - Add `target_schools` extraction from profile/assessment facts
   - Apply +3 alignment boost for target school matches

3. Update SummerProgramsAgentRefactored synthesis (1 day)
   - Add live research energy pattern
   - Format cascade opportunities with multi-dimensional value positioning

4. Database enhancement (1 day)
   - Add `artifact_type` column to kb_items table
   - Add `host_institution` column for programs
   - Populate with data for cascade matching

5. Test suite update (1 day)
   - Add cascade test case
   - Add target school alignment test case
   - Validate live research energy pattern

**Database Schema Changes:**
```sql
-- Migration 21: Cascade enablement
ALTER TABLE kb_items
  ADD COLUMN artifact_type TEXT,           -- 'game', 'research_paper', 'app', 'robot', etc.
  ADD COLUMN host_institution TEXT,        -- 'USC', 'MIT', 'Stanford', etc.
  ADD COLUMN accepts_artifact_types TEXT[]; -- ['game', 'app'] for competitions/programs

-- Example data
UPDATE kb_items
SET artifact_type = 'game',
    accepts_artifact_types = ARRAY['game', 'app', 'software']
WHERE item_id = 'games-for-change-2025';

UPDATE kb_items
SET host_institution = 'USC'
WHERE item_id = 'usc-games-expo-2025';
```

**Example v19.1 Output:**
```
Let me research this with you right now...

Okay! I found 6 opportunities that match your AI ethics game. Here's the
exciting part - you can submit the SAME game to ALL of these. Each one
values different aspects of your work.

## 🎯 Cascade Submission Strategy

### Target School Opportunities (Priority!)
1. **USC Games Expo 2024** - wait, that's one of your target schools!
   - Why: Game design showcase at your #3 target school
   - Artifact: Your AI ethics game (perfect fit)
   - Bonus: Face time with USC admissions

### High-Impact Competitions
2. **Games for Change Student Challenge** - $10,000 scholarship
   - Why: Values social change focus (your game's core theme)
   - Deadline: March 15, 2025

3. **Apple Swift Student Challenge**
   - Why: Technical excellence + prestige (Apple recognition)
   - Deadline: February 20, 2025

### Summer Programs (Research Track)
4. **MIT Game Lab Summer Program**
   - Why: Develop game further with MIT mentorship
   - Deadline: January 15, 2025

**Cascade Strategy:** Submit to competitions first (Feb-March), use
results/feedback to strengthen summer program applications. Your game
checks all these boxes: social change, technical quality, educational value.
```

**Estimated Effort:** 1 week (5-7 days)
**Expected Impact:**
- Authentic Jenny cascade coaching pattern
- 3-5X more opportunities per artifact (same work, multiple submissions)
- Target school alignment prioritization
- Live research energy in responses
- Better integration with Awards Agent (TYPE-023)

**Dependencies:**
- v19.0 Summer Programs Agent (✅ complete)
- v18.1 Awards Agent with TYPE-023 Award Arbitrage (✅ complete)
- Database migration 21 (new columns)

**Owner:** TBD
**Status:** 📋 **READY FOR IMPLEMENTATION** - Priority after v19.0 release

**References:**
- iMsg source: `data/eq/sessions/jenny_eq_session_w014_extraction.json:lines 450-520`
- Pattern analysis: Competition Cascade (dataset quality_score: 10/10)
- Related Intelligence: TYPE-023 (Award Arbitrage), TYPE-020 (Opportunity Pipeline)

**Timeline:** Q4 2025 (after v19.0 production validation)

---

### 3. Real-Time Student Calibration System

**Date Added:** 2025-10-29
**Architecture Decision:** ADR-002 (Calibration as Facts - Hybrid Option C)

**Current State:**
- Intelligence Types use default parameters (e.g., Opportunity Pipeline = 1.2 opportunities/interaction)
- Parameters derived from Jenny's 93-week coaching data (aggregated across all students)
- No per-student behavioral adaptation

**Problem:**
- Real students vary in:
  - Opportunity absorption capacity (some overwhelmed by 1.2, others can handle 2.0)
  - Celebration sensitivity (some respond well to high enthusiasm, others prefer moderate)
  - Overwhelm thresholds (some handle 5X task multiplication, others need 3X)
  - Trust progression speed (some share vulnerabilities quickly, others need gradual buildup)
- One-size-fits-all parameters suboptimal for personalization

**Solution Approved:**
- **Calibration as Facts** (Hybrid Option C)
- Store calibration data as Facts in FactStore (new category: `STUDENT_BEHAVIORAL_PROFILE`)
- CalibrationFactSource provides calibration facts to agents
- CalibrationLearningService (external) analyzes interactions and updates calibration
- Intelligence Types consume calibration facts and apply to parameters

**Calibration Fact Types:**
```typescript
const CALIBRATION_FACTS = [
  'opportunity_absorption_rate',    // 0.0-2.0 (default 1.0)
  'celebration_sensitivity',        // 'low' | 'moderate' | 'high'
  'overwhelm_threshold',            // 'low' | 'medium' | 'high'
  'trust_progression_speed',        // 'gradual' | 'medium' | 'fast'
  'complexity_tolerance',           // 'low' | 'medium' | 'high'
  'rejection_resilience',           // 0.0-1.0 (affects 3R timing)
  'parent_navigation_mode'          // 'student_primary' | 'balanced' | 'parent_primary'
];
```

**Implementation Plan:**
1. **Phase 1: Data Layer**
   - Create `student_calibration_profiles` table
   - Implement `CalibrationFactSource` extending `FactSource`
   - Register with FactStore under `STUDENT_BEHAVIORAL_PROFILE` category
   - Default values for new students

2. **Phase 2: Learning Service**
   - Implement `CalibrationLearningService`
   - Listen to `interaction_completed` events from EventBus
   - Analyze behavior patterns:
     - Opportunity engagement rate (clicked links, asked follow-ups, applied)
     - Celebration response (positive engagement vs. muted response)
     - Overwhelm signals (dropped tasks, expressed stress, reduced engagement)
     - Trust indicators (shared vulnerabilities, asked personal questions)
     - Complexity tolerance (completed complex tasks vs. struggled)
   - Update calibration facts in database

3. **Phase 3: Intelligence Type Integration**
   - Update each intelligence type to consume calibration facts
   - Apply calibration to parameters:
     - Opportunity Pipeline: `1.2 × absorption_rate`
     - Celebration Science: Adjust exclamation gradient based on sensitivity
     - Task Multiplication: Adjust 5X formula based on complexity_tolerance
     - 3R Rejection Protocol: Adjust timing based on rejection_resilience
     - Permission Field: Adjust vulnerability progression based on trust_speed
   - Graceful degradation: Default to 1.0 if calibration facts missing

**Database Schema:**
```sql
CREATE TABLE student_calibration_profiles (
  student_id TEXT PRIMARY KEY,

  -- Calibration parameters
  opportunity_absorption_rate NUMERIC DEFAULT 1.0,
  celebration_sensitivity TEXT DEFAULT 'high',
  overwhelm_threshold TEXT DEFAULT 'medium',
  trust_progression_speed TEXT DEFAULT 'medium',
  complexity_tolerance TEXT DEFAULT 'high',
  rejection_resilience NUMERIC DEFAULT 0.7,
  parent_navigation_mode TEXT DEFAULT 'balanced',

  -- Meta
  total_interactions INTEGER DEFAULT 0,
  last_calibration_update TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example Impact:**
```
Student A (high absorption):
  Opportunity Pipeline: 1.2 × 1.5 = 1.8 opportunities
  → "Here are 2 awards to consider: NCWIT, Congressional App"

Student B (low absorption, overwhelm signals):
  Opportunity Pipeline: 1.2 × 0.6 = 0.72 ≈ 1 opportunity
  → "Focus on NCWIT first - perfect fit for your profile"
```

**Estimated Effort:** 1-2 weeks
**Expected Impact:**
- Personalized intelligence type parameters per student
- Reduced overwhelm (better pacing for sensitive students)
- Increased engagement (more opportunities for high-capacity students)
- Better parent/student balance calibration

**Dependencies:**
- Requires baseline agent implementations to generate interaction data
- Requires EventBus `interaction_completed` events

**Owner:** TBD
**Status:** ⏸️ **PARKED** - Revisit after all 10 agents implemented

**Rationale for Parking:**
1. Need baseline agent functionality first (can't calibrate without interactions)
2. Requires production interaction data to validate calibration logic
3. Default parameters (from Jenny's 93-week data) already effective
4. All agents should be working before adding calibration complexity

**Timeline:** Q1 2026 (after all agents deployed and generating interaction data)

**References:**
- Architecture Decision: `docs/ARCHITECTURE_DECISIONS.md` (ADR-002)
- Placeholder Implementation: `docs/FOUNDATION_AGENTS_ARCHITECTURE.md` (Section 3.7)

---

### 3. Foundation Agents Architecture Spec - Reverse Engineering

**Current State:**
- v17.0 Assessment Agent architecture implemented
- v17.3 integrated with cat-3 compose-eq
- Working end-to-end orchestration pipeline

**Problem:**
- Architecture evolved organically without formal spec
- No single source of truth for agent framework design
- Difficult for new developers to understand system

**Solution Needed:**
- Reverse engineer complete Foundation Agents Architecture spec
- Document:
  - Agent registry and routing system
  - Intent classification pipeline
  - Context engineering patterns
  - Reflection/quality gates
  - Strategy orchestration flow
  - Integration points with cat-3

**Implementation Plan:**
1. Analyze existing agent implementations:
   - `services/agent-framework/src/agents/*.ts` (10 agents)
   - `services/agent-framework/src/core/AgentRegistry.ts`
   - `services/agent-framework/src/core/BaseAgent.ts`
2. Document orchestration patterns:
   - `services/agent-framework/src/orchestration/StrategyOrchestrator.ts`
   - `services/agent-framework/src/routing/IntentRouterService.ts`
   - `services/agent-framework/src/context/ContextEngineeringPipeline.ts`
3. Create comprehensive architecture diagram
4. Write formal specification document
5. Update `docs/MASTER_PROD_TECH_SPEC.md` with agent framework section

**Estimated Effort:** 1 week
**Expected Impact:** Improved developer onboarding, easier maintenance
**Dependencies:** None
**Owner:** TBD

---

### 3. Assessment Management Agent Spec - Reverse Engineering

**Current State:**
- v15.3 Assessment Agent partially implemented
- v17.0 orchestration pipeline working
- 6-step coaching flow: Intent → Context → Strategy → Reflection → Adaptation → Response

**Problem:**
- Assessment agent behavior not formally specified
- Phased assessment approach (4 phases) not documented
- Planner logic exists but lacks specification

**Solution Needed:**
- Reverse engineer Assessment Management Agent specification
- Document:
  - 4-phase assessment structure (Discovery → Narrative → Strategy → Time)
  - Question generation logic
  - Student state tracking
  - IvyScore calculation integration
  - Assessment memory/continuity
  - Transition criteria between phases

**Implementation Plan:**
1. Analyze assessment agent code:
   - `services/agent-framework/src/agents/AssessmentAgent.ts`
   - `services/agent-framework/src/primitives/AssessmentPlanner.ts`
2. Document existing phase logic
3. Identify gaps in current implementation
4. Create formal spec for complete 4-phase assessment
5. Define success metrics per phase

**Files to Analyze:**
- `services/agent-framework/src/agents/AssessmentAgent.ts`
- `services/agent-framework/src/primitives/AssessmentPlanner.ts`
- `services/agent-framework/src/primitives/ToneAdapterTool.ts`

**Estimated Effort:** 1 week
**Expected Impact:** Complete assessment agent implementation
**Dependencies:** Foundation Agents Architecture Spec (P1 #2)
**Owner:** TBD

---

## 🟡 P2: Medium Priority (Quality of Life)

### 4. Pinecone Few-Shot Memory Population

**Current State:**
- Pinecone `coaching-memory` index returns empty results
- Using hardcoded fallback Jenny examples in `ContextEngineeringPipeline.ts:107-120`
- Semantic search not functioning for few-shot retrieval

**Problem:**
- Can't leverage semantic similarity for coaching examples
- Missing high-impact intervention examples (IvyScore delta ≥5)
- Fallback examples are static, not contextually retrieved

**Solution Needed:**
- Populate Pinecone with curated coaching interventions
- Index by intervention_type, ivyscore_delta
- Enable semantic few-shot retrieval

**Implementation Plan:**
1. Extract coaching interventions from real sessions
2. Calculate IvyScore deltas for each intervention
3. Generate embeddings with `text-embedding-3-small`
4. Upload to Pinecone namespace `jenny-coaching`
5. Add metadata: intervention_type, ivyscore_delta, quality_score
6. Test semantic retrieval in ContextEngineeringPipeline

**Files to Modify:**
- Ingestion script: Create `tools/ingest/populate_coaching_memory.py`
- Retrieval: `services/agent-framework/src/context/ContextEngineeringPipeline.ts:187-226`

**Estimated Effort:** 3-4 days
**Expected Impact:** Better few-shot examples, improved response quality
**Dependencies:** None
**Owner:** TBD
**Status:** ⏸️ **PARKED** - Revisit after full multi-agent platform complete

**Rationale for Parking:**
- Hardcoded fallback examples working adequately for now
- Not blocking core multi-agent functionality
- Can be enhanced after platform is feature-complete

---

### 5. v17.0 Latency Optimization

**Current State:**
- Total pipeline: ~35 seconds end-to-end
- Target: <10 seconds for production UX

**Bottlenecks Identified:**
1. Intent classification: ~2-3s
2. Context engineering: ~3-4s (Pinecone + hybrid search)
3. Initial response generation (cat-3): ~8-10s
4. Reflection loop (GPT-4 + Claude): ~15-20s (3 iterations)
5. Voice adaptation: ~2-3s

**Solution Needed:**
- Parallel execution where possible
- Cache intent classifications for similar queries
- Reduce reflection iterations (3 → 2 max)
- Pre-compute student context
- Use faster models for non-critical steps

**Implementation Plan:**
1. Add parallel execution to independent steps
2. Implement intent classification cache
3. Reduce reflection max_iterations from 3 to 2
4. Use gpt-4o-mini for reflection producer (instead of gpt-4)
5. Add performance monitoring/tracing

**Files to Modify:**
- `services/agent-framework/src/orchestration/StrategyOrchestrator.ts:73-155`
- `services/agent-framework/src/reflection/ReflectionService.ts`
- `services/agent-framework/src/routing/IntentRouterService.ts`

**Estimated Effort:** 1 week
**Expected Impact:** 35s → ~12s (target <10s)
**Dependencies:** None
**Owner:** TBD
**Status:** ⏸️ **PARKED** - Revisit after full multi-agent platform complete

**Rationale for Parking:**
- 35s is acceptable for comprehensive assessment with reflection
- Focus on feature completeness before optimization
- Optimization easier to measure after full platform is functional

---

## 🟢 P3: Low Priority (Future Enhancements)

### 6. Multi-Coach Persona Support

**Current State:**
- System hardcoded to Jenny persona
- EQ profile exists but only Jenny's data loaded

**Solution Needed:**
- Support multiple coach personas (Jenny, Alex, Maria, etc.)
- Per-coach EQ profiles
- Per-coach fine-tuned models
- Coach assignment logic

**Estimated Effort:** 2-3 weeks
**Dependencies:** P0 #1 (jenny_v11_eq complete)
**Owner:** TBD

---

### 7. Assessment Phase Continuity

**Current State:**
- Each assessment query treated independently
- No memory of previous assessment phase

**Solution Needed:**
- Track assessment state per student
- Resume from previous phase
- Store phase completion criteria
- Generate phase summary reports

**Estimated Effort:** 1-2 weeks
**Dependencies:** P1 #3 (Assessment Agent Spec)
**Owner:** TBD

---

### 8. A/B Testing Framework for Fine-Tuned Models

**Current State:**
- No systematic way to test model improvements
- Manual validation with CAT-3 test suite

**Solution Needed:**
- A/B testing infrastructure for fine-tuned models
- Automated quality metrics collection
- Student feedback integration
- Statistical significance testing

**Estimated Effort:** 2 weeks
**Dependencies:** P0 #1 (jenny_v11_eq)
**Owner:** TBD

---

## 📊 Tracking

### Completed Items
- ✅ v17.3 cat-3 integration (2025-10-28) - Authentic Jenny voice achieved
- ✅ Training history deep scan (2025-10-28) - Root cause identified
- ✅ Foundation Agents Architecture Spec (2025-10-28) - Complete reverse engineering
- ✅ Assessment Management Agent Spec (2025-10-28) - 4-phase structure documented

### Parked Items (Revisit After Multi-Agent Platform Complete)
- ⏸️ P0: jenny_v11_eq fine-tuning (2-3 weeks)
- ⏸️ P2: Pinecone few-shot population (3-4 days)
- ⏸️ P2: v17.0 latency optimization (1 week)

### Next Milestone
**Full Multi-Agent Platform Implementation**
- Complete all 10 Foundation Agents (GamePlan, ECs, Awards, Essays, Colleges, Programs, Scholarships, Admissions, Weekly Execution, Assessment)
- Implement multi-agent routing and handoffs
- Build agent orchestration layer
- Create agent management dashboard
- Test end-to-end multi-agent workflows

### Next Review Date
**After Multi-Agent Platform Complete** - Then revisit parked P0/P2 items for quality enhancements

### Owner Assignment Process
1. Identify sprint capacity
2. Pull highest priority item from backlog
3. Assign owner and create detailed task breakdown
4. Move to active sprint tracking
5. Update this doc with status

---

## 📚 Reference Documents

**Architecture & Specs:**
- `docs/MASTER_PROD_TECH_SPEC.md` - Main architecture
- `docs/PROD_FEATURE_RELEASE_DETAILS.md` - Release history
- `docs/PROD_DB_ARCH.md` - Database schema

**Training & Models:**
- `tools/training/analyze_training_gap.py` - jenny_v9_eq gap analysis
- `tools/training/extract_targeted_v9_1.py` - jenny_v9.1 extraction script
- `archive/2025-10-16-pre-v14.0/training-data/` - Historical training data

**Agent Framework:**
- `services/agent-framework/src/agents/` - Agent implementations
- `services/agent-framework/src/orchestration/` - Orchestration pipeline
- `services/agent-framework/src/routing/` - Intent routing

---

## 💬 Notes

- Items in this backlog are **analyzed and ready** for implementation
- Each item includes problem statement, solution design, and estimated effort
- Priority can be adjusted based on business needs
- Review this doc monthly or when major milestones complete

**Last Reviewed:** 2025-10-28
**Next Review:** 2025-11-15
**Maintained By:** Engineering Team
