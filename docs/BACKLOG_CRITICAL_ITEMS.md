# Critical Backlog - Parked Items

**Last Updated:** 2025-10-29
**Status:** Active Tracking - P0 & P2 Parked, Ready for Full Multi-Agent Implementation
**Priority System:** P0 (Critical) → P1 (High) → P2 (Medium) → P3 (Low)

**Current Focus:** Complete 7 CORE student development agents (9th-11th grade, 3+ years value)
**Strategic Decision:** Deprioritize college apps agents (EssayAgent, CollegeListAgent, AdmissionsAgent) - use traditional tools instead
**See:** PRIORITY_ROADMAP_REFOCUSED.md for full rationale

**Parked Until Core Agents Complete:**
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

### 4. v20.1-v20.5: ExecutionAgent Intelligence Types Expansion

**Date Added:** 2025-10-29
**Context:** Post-v20.0 Foundation - 12 stub intelligence types ready for full implementation

**Current State (v20.1):** ✅ **PHASE 1 COMPLETE**
- ExecutionAgent deployed with 6 complete intelligence types:
  - TYPE-049: Execution Ladder Navigation (557 lines) - ✅ Complete (v20.0)
  - TYPE-050: Outcome Engineering (406 lines) - ✅ Complete (v20.0)
  - TYPE-051: Task Decomposition (580 lines) - ✅ Complete (v20.1)
  - TYPE-052: Portfolio Operating Cadence (470 lines) - ✅ Complete (v20.1)
  - TYPE-061: Multi-Agent Delegation (480 lines) - ✅ Complete (v20.1)
  - TYPE-063: Progress Velocity & Momentum (540 lines) - ✅ Complete (v20.1)
- 8 stub implementations remaining (TYPE-053-060, TYPE-062) for v20.2-v20.5
- Agent operational with 8-section response synthesis (Velocity → Ladder → Outcome → Task Decomp → Cadence → Delegation → Stubs → Next Actions)
- Remaining stubs marked with version targets: v20.2 (2 types), v20.3 (2 types), v20.4 (2 types), v20.5 (2 types)

**Gap Identified:**
ExecutionAgent is Jenny's digital twin - the master orchestrator for weekly tactical execution. Currently limited to ladder positioning and outcome generation. Missing 12 critical execution frameworks extracted from 93-week coaching intelligence:

1. **Weekly Operating Rhythm** (TYPE-051, TYPE-052) - How to structure weekly sprints
2. **Capacity Management** (TYPE-053, TYPE-054) - Time allocation + metric tracking
3. **Blocking & Recovery** (TYPE-055, TYPE-056) - Stall detection + LoR engineering
4. **Proof Generation** (TYPE-057, TYPE-058) - Proofpack assembly + application throughput
5. **Narrative & Energy** (TYPE-059, TYPE-060) - Story harmonization + seasonal pacing
6. **Multi-Agent Coordination** (TYPE-061, TYPE-063) - Delegation + velocity tracking
7. **Qualitative Transformation** (TYPE-062) - Confidence + grit measurement

**Implementation Plan:**

#### **Phase 1: v20.1 - Core Execution Primitives (1 week)**
Expand 4 HIGH-PRIORITY intelligence types:

**TYPE-051: Task Decomposition Intelligence**
- **Framework:** 3-Level Hierarchy (Outcomes → ExecutionItems → Tasks)
- **Algorithm:**
  ```typescript
  Outcome (P0/P1/P2/P3) → 2-4 ExecutionItems (5Ws: Who/What/When/Where/Why)
  ExecutionItem → 3-8 Tasks (micro-steps with deadlines)
  ```
- **Data Source:** 62 execution chips (W000-FRAMEWORK-001)
- **Output:** Structured task breakdown with dependency mapping
- **Estimated Lines:** 350-400 lines

**TYPE-052: Portfolio Operating Cadence**
- **Framework:** Monday→Sunday Weekly Rhythm
- **Algorithm:**
  ```
  Monday: Prioritize (P0/P1 selection)
  Tue-Thu: Produce (deep work blocks)
  Friday: Publish (share progress publicly)
  Saturday: Propagate (amplify on social, email)
  Sunday: Post-mortem (reflect, adjust next week)
  ```
- **Data Source:** W000-STRATEGY-002, W007 session transcript
- **Output:** Day-by-day action plan with energy allocation
- **Estimated Lines:** 300-350 lines

**TYPE-061: Multi-Agent Delegation Intelligence** ⚡ HIGH PRIORITY
- **Framework:** Specialist Agent Routing + Response Synthesis
- **Algorithm:**
  ```typescript
  Detect specialist intent (awards, programs, ECs, gameplan)
  → Delegate to specialist agent
  → Synthesize response into weekly execution summary
  → Return integrated action plan
  ```
- **Data Source:** W000-STRATEGY-015, cross-agent handoff patterns
- **Output:** Delegated queries with integrated responses
- **Estimated Lines:** 400-450 lines
- **Critical:** Enables ExecutionAgent to orchestrate other agents

**TYPE-063: Progress Velocity & Momentum** ⚡ HIGH PRIORITY
- **Framework:** Completion Velocity Tracking
- **Algorithm:**
  ```
  Velocity = Actual Completion / Expected Completion
  >1.0 = ahead (celebrate!)
  0.8-1.0 = on track (maintain)
  <0.8 = at risk (escalate)
  ```
- **Data Source:** W000-STRATEGY-021, weekly progress snapshots
- **Output:** Velocity score + momentum indicators + acceleration recommendations
- **Estimated Lines:** 350-400 lines

**Database Schema Changes (v20.1):**
```sql
-- Migration 22: Task decomposition support
ALTER TABLE tasks
  ADD COLUMN parent_execution_item_id TEXT REFERENCES execution_items(item_id),
  ADD COLUMN dependency_task_ids TEXT[],
  ADD COLUMN estimated_effort_minutes INTEGER;

-- Migration 23: Velocity tracking
CREATE TABLE velocity_snapshots (
  snapshot_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  expected_completion_count INTEGER,
  actual_completion_count INTEGER,
  velocity_score NUMERIC, -- actual / expected
  momentum_indicator TEXT, -- 'accelerating' | 'steady' | 'decelerating'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Estimated Effort:** 1 week (4 types × ~350 lines each = ~1400 lines total)
**Status:** ✅ **COMPLETE** (2025-10-29)
**Actual Delivery:** ~2070 lines total code (580 + 470 + 480 + 540)
**Files Created:**
- `services/agent-framework/src/intelligence/types/TYPE-051-TaskDecomposition.ts` (580 lines)
- `services/agent-framework/src/intelligence/types/TYPE-052-PortfolioOperatingCadence.ts` (470 lines)
- `services/agent-framework/src/intelligence/types/TYPE-061-MultiAgentDelegation.ts` (480 lines)
- `services/agent-framework/src/intelligence/types/TYPE-063-ProgressVelocity.ts` (540 lines)
**Files Updated:**
- `services/agent-framework/src/intelligence/IntelligenceRegistry.ts` (imports + registrations)
- `services/agent-framework/src/agents/v18/ExecutionAgent.ts` (8-section synthesis + 4 formatters)

---

#### **Phase 2: v20.2 - Capacity Management (4-5 days)**
Expand 2 intelligence types:

**TYPE-053: Time Architecture & Capacity**
- **Framework:** 168-Hour Weekly Framework
- **Algorithm:**
  ```
  168 hours/week = Fixed (school 40h + sleep 56h + family 20h = 116h)
                   + Available (52h discretionary)
  Available = Deep Work (30h) + Social (10h) + Buffer (12h)
  ```
- **Data Source:** W007 session transcript, time capacity assessment
- **Output:** Time allocation plan with capacity stress testing
- **Estimated Lines:** 400-450 lines

**TYPE-054: Metric Ladder Instrumentation**
- **Framework:** M0→M4 Milestone Tracking
- **Algorithm:**
  ```
  M0: Setup complete (GitHub, website, basic demo)
  M1: 1 user (friend/family validation)
  M2: 10 users (local network growth)
  M3: 100 users (viral loop working)
  M4: 1,000 users (product-market fit)

  Each milestone = proof requirements + evidence artifacts
  ```
- **Data Source:** W000-FRAMEWORK-004, project growth tracking
- **Output:** Current milestone + next proof requirements + trajectory estimate
- **Estimated Lines:** 350-400 lines

**Estimated Effort:** 4-5 days (2 types × ~400 lines each = ~800 lines total)

---

#### **Phase 3: v20.3 - Blocking & Recovery (4-5 days)**
Expand 2 intelligence types:

**TYPE-055: Blocking Detection & Escalation**
- **Framework:** 2-Cycle Stall Triggers
- **Algorithm:**
  ```
  If task stalled 2+ weeks:
    Escalation Playbook = Scope Cut OR Ally Recruit OR Deadline Swap

  Scope Cut: Reduce to MVP (e.g., 10 users → 5 users)
  Ally Recruit: Find collaborator (parent, friend, coach)
  Deadline Swap: Move to next cycle (accept delay, adjust timeline)
  ```
- **Data Source:** W000-STRATEGY-012, blocking patterns from session transcripts
- **Output:** Blocked tasks + escalation recommendations + timeline adjustments
- **Estimated Lines:** 400-450 lines

**TYPE-056: LoR Engineering**
- **Framework:** 4-Touch Recommendation Letter Sequencing
- **Algorithm:**
  ```
  Touch 1: Visibility (show up, contribute, ask smart questions)
  Touch 2: Gratitude (thank for specific guidance, show impact)
  Touch 3: Artifact (share project/paper, get feedback)
  Touch 4: Formal Ask (request LoR with context packet)

  Minimum 8 weeks between Touch 1 and Touch 4
  ```
- **Data Source:** W000-STRATEGY-008, LoR cultivation patterns
- **Output:** LoR target list + touch sequence timelines + artifact readiness
- **Estimated Lines:** 350-400 lines

**Estimated Effort:** 4-5 days (2 types × ~400 lines each = ~800 lines total)

---

#### **Phase 4: v20.4 - Proof & Applications (4-5 days)**
Expand 2 intelligence types:

**TYPE-057: Proof Engineering**
- **Framework:** Proofpack Assembly ("Proof Before Pitch")
- **Algorithm:**
  ```
  Proofpack Components:
  1. Hero Metric (e.g., "500 users in 3 months")
  2. Timeline (project start → current state → future milestones)
  3. Screenshots/Demos (visual proof of work)
  4. User Quotes/Testimonials (social validation)
  5. Links (GitHub, website, press mentions)
  6. Maintenance Log (ongoing commitment proof)

  Validation: Minimum 3/6 components before asking for support
  ```
- **Data Source:** W000-STRATEGY-013, proofpack assembly patterns
- **Output:** Proofpack completeness score + missing artifacts + assembly checklist
- **Estimated Lines:** 400-450 lines

**TYPE-058: Application Mastery Rail**
- **Framework:** 5-Lane Throughput Model
- **Algorithm:**
  ```
  5 Parallel Lanes (work on all simultaneously):
  1. Personal Essay Lane (Common App main essay)
  2. Academic Lane (transcript, test scores, coursework)
  3. EC Lane (Activities List + EC essay)
  4. LoR Lane (recommendation letter cultivation)
  5. Financial Lane (FAFSA, CSS Profile, scholarships)

  Each lane = checklist + blockers + completion %
  ```
- **Data Source:** W000-FRAMEWORK-007, application throughput patterns
- **Output:** 5-lane status dashboard + lane-specific next actions + bottleneck identification
- **Estimated Lines:** 450-500 lines

**Estimated Effort:** 4-5 days (2 types × ~450 lines each = ~900 lines total)

---

#### **Phase 5: v20.5 - Narrative & Qualitative (5-6 days)**
Expand 3 intelligence types:

**TYPE-059: Narrative Harmonization**
- **Framework:** Thread Weave Across All Surfaces
- **Algorithm:**
  ```
  Narrative Spine = Why (motivation) + Who (identity) + Impact (outcomes)

  Weave across:
  - Personal essay (main story)
  - Activities List (proof of story)
  - Supplemental essays (story angles)
  - LoRs (external validation of story)
  - Website/portfolio (visual story)

  Consistency Check: All surfaces reinforce core narrative
  ```
- **Data Source:** W000-STRATEGY-016, narrative architecture patterns
- **Output:** Narrative spine + surface-level weaving recommendations + consistency score
- **Estimated Lines:** 400-450 lines

**TYPE-060: Seasonal Energy Allocation**
- **Framework:** Exploration→Exploitation Ratio per Phase
- **Algorithm:**
  ```
  Phase 1-2 (9th-10th grade): 70% Explore / 30% Exploit
    → Try many things, find passion, build foundation

  Phase 3-4 (11th grade): 50% Explore / 50% Exploit
    → Focus on proven interests, scale projects

  Phase 5 (12th fall): 20% Explore / 80% Exploit
    → Protect application throughput, finish strong
  ```
- **Data Source:** W000-STRATEGY-021, seasonal energy patterns
- **Output:** Current phase + energy allocation recommendations + activity prioritization
- **Estimated Lines:** 300-350 lines

**TYPE-062: Qualitative Transformation Tracking**
- **Framework:** Internal Growth Measurement
- **Algorithm:**
  ```
  Track qualitative metrics:
  - Confidence (1-10 scale) across domains
  - Voice Authenticity (1-10 scale) in essays/communication
  - Grit Examples (specific instances of perseverance)
  - Self-Advocacy Growth (asking for help, expressing needs)

  Compare: Week 1 baseline vs. Current week
  ```
- **Data Source:** W000-STRATEGY-019, qualitative transformation patterns
- **Output:** Transformation timeline + growth areas + celebration moments
- **Estimated Lines:** 350-400 lines

**Estimated Effort:** 5-6 days (3 types × ~350 lines each = ~1050 lines total)

---

### **Summary: Full Expansion Roadmap**

| Version | Intelligence Types | Focus | Estimated Effort | Actual Lines | Status |
|---------|-------------------|-------|------------------|-------------|--------|
| v20.0 ✅ | TYPE-049, TYPE-050 (+ 12 stubs) | Foundation | 1 week | 1200 lines | ✅ Complete |
| v20.1 ✅ | TYPE-051, TYPE-052, TYPE-061, TYPE-063 | Core Execution | 1 week | 2070 lines | ✅ Complete |
| v20.2 ✅ | TYPE-053, TYPE-054 | Capacity Management | 4-5 days | 1150 lines | ✅ Complete (2025-10-29) |
| v20.3 ✅ | TYPE-055, TYPE-056 | Blocking & Recovery | 4-5 days | 1120 lines | ✅ Complete (2025-10-29) |
| v20.4 ✅ | TYPE-057, TYPE-058 | Proof & Applications | 4-5 days | 1370 lines | ✅ Complete (2025-10-29) |
| v20.5 ✅ | TYPE-059, TYPE-060, TYPE-062 | Narrative & Qualitative | 5-6 days | 1460 lines | ✅ Complete (2025-10-29) |
| **TOTAL** | **16 Intelligence Types** | **Full ExecutionAgent** | **~4-5 weeks** | **~8370 lines** | **✅ 100% Complete** |

**✅ Delivered Impact (v20.5 Complete):**
- ✅ Complete ExecutionAgent with all 16 execution frameworks from 93-week coaching intelligence
- ✅ Jenny's Digital Twin fully operational as master orchestrator
- ✅ Weekly action planning with proof generation, capacity management, blocking detection
- ✅ Multi-agent delegation enabling cross-agent workflows
- ✅ Qualitative transformation tracking (confidence, grit, voice)
- ✅ Full application throughput management (5-lane model)
- ✅ Time architecture with 168-hour capacity management
- ✅ M0→M4 metric ladder with proof requirements
- ✅ 2-cycle blocking detection with escalation playbook
- ✅ 4-touch LoR engineering sequences
- ✅ 6-component proofpack assembly
- ✅ Narrative harmonization across all surfaces
- ✅ Seasonal energy allocation (explore/exploit ratios)

**Dependencies:**
- v20.0 ExecutionAgent Foundation (✅ complete)
- Database migrations 22-23 (task decomposition + velocity tracking)
- Existing agent implementations (for TYPE-061 delegation)

**Owner:** TBD
**Status:** 🚀 **40% COMPLETE** - v20.1 Phase 1 done (4 types), v20.2-v20.5 ready for implementation (8 types remaining)

**References:**
- Deep-dive analysis: `docs/agents/EXECUTION_AGENT_INTELLIGENCE_ARCHITECTURE.md` (500+ lines)
- Stub implementations: `services/agent-framework/src/intelligence/types/TYPE-051-063-Stubs.ts`
- ExecutionAgent: `services/agent-framework/src/agents/v18/ExecutionAgent.ts`
- Complete implementations: `TYPE-049-ExecutionLadderNavigation.ts` (557 lines), `TYPE-050-OutcomeEngineering.ts` (406 lines)
- Data source: `data/kb_intel_chips/exec-chips/EXEC_Intel_Chips_Batch_v2.jsonl` (62 chips)

**Timeline:** Q4 2025 - Q1 2026 (incremental expansion after v20.0 production validation)

---

### 5. Foundation Agents Architecture Spec - Reverse Engineering

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
**Core Student Development Platform (7 Agents for 9th-11th Grade)**
- ✅ Complete: ExtracurricularsAgent, AwardsAgent, SummerProgramsAgent, ScholarshipsAgent (v18.0-v21.0)
- 🚧 In Progress: ExecutionAgent v20.1 (40% complete, 6/16 intelligence types)
- 📋 Next: Complete ExecutionAgent v20.2-v20.5 (8 intelligence types remaining)
- 📋 After: Refresh GamePlanAgent + AssessmentAgent to v3.0 Intelligence Types Architecture
- ⏸️ Deprioritized: EssayAgent, CollegeListAgent, AdmissionsAgent (use traditional tools instead)

**Rationale**: Focus on 3+ YEARS of student development (9th-11th) vs. 3 MONTHS of college apps (12th fall).
Traditional tools (Essays.ai, Scoir, consultants) handle apps phase well. Jenny's Knowledge Moat is in the development phase.

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
