# Architecture Decisions Log

**Purpose:** Record major architectural decisions with rationale and implementation status

**Last Updated:** 2025-10-29

---

## ADR-001: Intelligence Types Architecture (v3.0)

**Date:** 2025-10-29
**Status:** ✅ APPROVED - Specification complete, implementation pending
**Decision Makers:** Engineering Team + Product

### Context

Need to structure coaching intelligence extracted from 93+ weeks of Jenny's sessions in a reusable, scalable, and auditable way across all agents.

### Decision

Adopt **Intelligence Types Architecture** as the universal pattern for encoding coaching expertise:

- **Intelligence Type** = atomic reusable unit (Level 1)
- **5-Level Hierarchy:** Intelligence Type → Framework → Tactic → Technique → Chip
- **Two Categories:**
  - Universal Intelligence Types (7 types, inherited by ALL agents)
  - Domain-Specific Intelligence Types (per agent)
- **Parallel Processing:** All intelligence types process every query simultaneously
- **IntelligenceRegistry:** Global registry for managing intelligence modules

### Rationale

1. **Reusability:** Opportunity Pipeline used by Awards, Scholarships, Programs, Colleges
2. **Extensibility:** Add new intelligence type → all agents can access it
3. **Testability:** Mock intelligence types for isolated testing
4. **Maintainability:** Single source of truth per technique
5. **Auditability:** Every response traceable to intelligence types activated

### Consequences

**Positive:**
- Unified coaching intelligence across all 10 agents
- Clear separation between universal (cross-cutting) and domain-specific intelligence
- Holistic coaching responses (awards + celebration + opportunities in single query)
- Knowledge moat: 93+ weeks of validated coaching patterns encoded

**Negative:**
- Requires refactoring existing agents (GamePlan, Assessment, Extracurriculars)
- More complex than hardcoded agent logic
- Learning curve for new developers

### Implementation Status

- ✅ Complete specification (AWARDS_AGENT_TECH_SPEC.md)
- ✅ Foundation architecture updated (FOUNDATION_AGENTS_ARCHITECTURE.md v3.0)
- ✅ GamePlan agent spec updated (GAMEPLAN_AGENT_TECH_SPEC.md v3.0)
- ✅ Assessment agent spec updated (ASSESSMENT_AGENT_TECH_SPEC.md v3.0)
- ⏳ Remaining 7 agent specs to be updated
- 📋 Implementation of intelligence types (backlog)

**References:**
- `docs/agents/AWARDS_AGENT_TECH_SPEC.md` (Section 2)
- `docs/FOUNDATION_AGENTS_ARCHITECTURE.md` (Section 3)

---

## ADR-002: Real-Time Student Calibration Architecture

**Date:** 2025-10-29
**Status:** 📋 BACKLOG - Design approved, implementation deferred
**Decision Makers:** Engineering Team + Product

### Context

Intelligence types use default parameters (e.g., Opportunity Pipeline = 1.2 opportunities/interaction). Real students vary in absorption capacity, overwhelm thresholds, celebration sensitivity, etc. Need to adapt parameters based on observed behavior patterns.

### Problem

Should real-time calibration be:
- **Option A:** External Calibration Service
- **Option B:** Intrinsic to Intelligence Types (self-calibrating)
- **Option C:** Calibration as Facts (hybrid)

### Decision

**Option C: Calibration as Facts (Hybrid Approach)**

- Calibration data stored as Facts in FactStore
- New FactCategory: `STUDENT_BEHAVIORAL_PROFILE`
- CalibrationFactSource provides calibration facts
- CalibrationLearningService (external) analyzes interactions and updates calibration facts
- Intelligence Types consume calibration facts and apply to parameters

### Rationale

1. **Aligns with Fact-First Architecture:** Calibration is fundamentally data about the student → should be a Fact
2. **Separation of Concerns:**
   - CalibrationLearningService (external) = LEARNS from interactions
   - Intelligence Types (intrinsic) = APPLY calibration to decisions
3. **Auditability:** "Why only 1 opportunity?" → `facts_used: [{ fact_type: 'opportunity_absorption_rate', value: 0.8 }]`
4. **Extensibility:** Add new calibration dimension → add new FactType, all intelligence types can access
5. **Graceful Degradation:** Missing calibration facts → use defaults (1.0 absorption rate)

### Implementation Plan (Deferred)

**Phase 1: Data Layer**
- Create `student_calibration_profiles` table
- Create `CalibrationFactSource` implementing `FactSource`
- Register with FactStore

**Phase 2: Learning Service**
- Create `CalibrationLearningService`
- Listen to `interaction_completed` events
- Analyze behavior patterns:
  - Opportunity engagement rate
  - Celebration response
  - Overwhelm signals
  - Trust indicators
  - Complexity tolerance
- Update calibration facts in database

**Phase 3: Intelligence Type Integration**
- Update intelligence types to consume calibration facts
- Apply calibration to parameters:
  - Opportunity Pipeline: 1.2 × absorption_rate
  - Celebration Science: Adjust exclamation gradient
  - Task Multiplication: Adjust 5X formula
  - 3R Rejection: Adjust timing based on resilience

### Calibration Fact Types

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

### Consequences

**Positive:**
- Personalized intelligence type parameters per student
- Maintains Fact-First architecture consistency
- Full auditability of calibration decisions
- Can A/B test calibration strategies

**Negative:**
- Additional complexity (new table, new service)
- Requires sufficient interaction data to calibrate accurately
- Risk of overfitting to student quirks

### Why Deferred

**Current Priority:** Complete all 10 agent implementations with default parameters first.

**Reasoning:**
1. Calibration requires baseline agent functionality to work
2. Need production data (real interactions) to validate calibration logic
3. Default parameters (from Jenny's 93-week data) already effective
4. Can implement after agents are in production and generating interaction data

**Timeline:** Q1 2026 (after all agents deployed to production)

**References:**
- `docs/FOUNDATION_AGENTS_ARCHITECTURE.md` (Section 3.7 - Real-Time Student Calibration)

---

## Future ADRs

**Template for new decisions:**
- ADR-003: [Decision Name]
- ADR-004: [Decision Name]
- etc.

---

## Decision Review Process

1. **Proposal:** Document decision context, options, and recommendation
2. **Review:** Engineering team + Product review
3. **Approval:** Team consensus → Status = APPROVED
4. **Implementation:** Build phase → Status = IN PROGRESS
5. **Completion:** Shipped to production → Status = COMPLETED
6. **Retrospective:** 30 days after completion, assess outcomes

**Decision Lifecycle:**
```
PROPOSED → APPROVED → IN PROGRESS → COMPLETED → RETROSPECTIVE
           ↓
       REJECTED (with rationale)
           ↓
       BACKLOG (approved but deferred)
```
