# Agent Intelligence Extraction Prompt - Universal Template

**Document Version:** v1.0
**Created:** 2025-10-29
**Purpose:** Reusable prompt template for extracting domain-specific coaching intelligence for any new agent

---

## How to Use This Template

1. **Copy this entire document**
2. **Replace all `{PLACEHOLDERS}` with agent-specific values**
3. **Paste into Claude Code conversation**
4. **Claude will systematically extract and structure intelligence**
5. **Review output and validate**

---

## AGENT INTELLIGENCE EXTRACTION REQUEST

### Context

I need you to extract, structure, and catalog comprehensive coaching intelligence for the **{AGENT_NAME}Agent** following the same systematic approach we used for ExtracurricularsAgent.

**Agent Domain:** `{AGENT_DOMAIN}` (one of: assessment, gameplan, extracurriculars, awards, essays, college_list, scholarships, summer_programs, weekly_execution, admissions)

**Goal:** Build a complete intelligence catalog of 50-100 coaching intelligence chips (frameworks, strategies, tactics, techniques, tools, EQ patterns) specific to this domain, following the universal currency specification in `/docs/COACHING_INTELLIGENCE_CATALOG_SPEC.md`.

---

### STEP 1: Domain Understanding

**Before extracting intelligence, help me understand:**

#### 1.1 Core Domain Responsibilities
What does the {AGENT_NAME}Agent DO? List 5-7 core responsibilities:
- [Your input required]

#### 1.2 Key Frameworks Expected
Based on your knowledge of {AGENT_DOMAIN} coaching, what are 3-5 key frameworks you expect to find?
- [Your input required]

#### 1.3 Fact Categories Needed
Which Fact Categories (v18.0 Fact-First) should this agent require access to?
- [ ] ASSESSMENT_DATA
- [ ] ACTIVITY_DATA
- [ ] ACADEMIC_DATA
- [ ] STUDENT_PROFILE
- [ ] PROGRESS_DATA
- [ ] TIME_ALLOCATION_DATA
- [ ] TASK_MULTIPLICATION_DATA
- [ ] OBSTACLE_PIVOT_HISTORY
- [ ] Other: [specify]

#### 1.4 Event-Driven Triggers
What events should trigger this agent? (e.g., `ec_portfolio_updated`, `quarterly_review`)
- [Your input required]

#### 1.5 Success Metrics
How do we measure {AGENT_NAME}Agent quality? List top 3 benchmarks:
- [Your input required]

---

### STEP 2: Multi-Source Intelligence Extraction

Now systematically analyze ALL relevant data sources in priority order:

#### 2.1 TIER 1 SOURCES (Highest Quality - MUST ANALYZE)

**Source A: Execution Intel Chips**
- **File:** `/data/kb_intel_chips/exec-chips/EXEC_Intel_Chips_Batch_v2.jsonl`
- **Action:** Read entire file, extract ALL chips related to {AGENT_DOMAIN}
- **Search Keywords:** {LIST_KEYWORDS} (e.g., for ECs: "extracurricular", "activity", "leadership", "portfolio", "team", "impact", "scaling")
- **Expected Chips:** 15-25 chips

**Source B: Student Index Frameworks**
- **File:** `/data/coaching_intelligence/extractions/STUDENT_INDEX.md`
- **Action:** Search for frameworks tagged with {AGENT_DOMAIN}
- **Section:** Look for "{AGENT_NAME} frameworks Extracted from Sessions"
- **Expected Frameworks:** 5-10 frameworks

**Source C: Game Plan Reports (Assessment + Strategy Sessions)**
- **Directory:** `/data/coaching_intelligence/raw/gameplan reports/`
- **Files:** 12 PDFs covering complete student assessment + game plan sessions
- **Action:** For EACH file, extract {AGENT_DOMAIN}-specific strategies, frameworks, recommendations
- **Search Strategy:**
  - Look for sections covering {AGENT_DOMAIN} (e.g., "Extracurricular Strategy", "Award Recommendations")
  - Extract specific tactics used (numbers, timelines, success metrics)
  - Note cross-student patterns (what works across multiple students?)
- **Expected Intelligence:** 20-30 domain-specific patterns

**Source D: Assessment Transcripts**
- **Directory:** `/data/coaching_intelligence/raw/assess transcripts/`
- **Files:** 12 assessment call transcripts
- **Action:** Search transcripts for {AGENT_DOMAIN} discussion
- **Keywords:** {LIST_KEYWORDS}
- **Expected Intelligence:** 10-15 diagnostic/questioning frameworks

#### 2.2 TIER 2 SOURCES (High Quality - ANALYZE IF RELEVANT)

**Source E: Huda Assessment + GamePlan Extractions**
- **Directory:** `/data/coaching_intelligence/extractions/huda_assess_plus_gameplan/`
- **Files:**
  - `01-A-Huda-Assessment-Ivylevel-4Step-Session-Format.json`
  - `01-B-Assessment-Questioning-Framework.jsonl`
  - `01-C-Huda-Assessment-Conversation.json`
  - `02-A-Assessment-to-GamePlan-Translation.json`
  - `02-B-Huda-GamePlan-Creation.jsonl`
  - `02-C-Synthesis-Formulas.json`
  - `03-GamePlan-Architecture.json`
- **Action:** For EACH file, extract {AGENT_DOMAIN}-specific patterns
- **Focus Areas:**
  - Synthesis formulas relevant to {AGENT_DOMAIN}
  - Coaching techniques/scripts
  - Success metrics and validation approaches
- **Expected Intelligence:** 10-20 patterns

**Source F: Weekly Session Extractions (Strategic Sample)**
- **Directory:** `/data/eq/sessions/`
- **Files:** 93 weekly session JSON files (jenny_eq_session_w001_extract.json → w093_chips.json)
- **Sampling Strategy:**
  - **Foundation Phase (W001-W030):** Sample every 5th week → Analyze W005, W010, W015, W020, W025, W030
  - **Build Phase (W031-W060):** Sample every 5th week → Analyze W035, W040, W045, W050, W055, W060
  - **Decision Phase (W061-W093):** Sample every 5th week → Analyze W065, W070, W075, W080, W085, W090
  - **Total:** ~18 sessions analyzed (representative sample)
- **For EACH sampled session:**
  - Read full JSON (session summary, coaching intelligence, training examples, chip suggestions)
  - Extract {AGENT_DOMAIN}-specific techniques from `coaching_intelligence` section
  - Note EQ patterns from `speech_patterns` section
  - Capture tactical solutions from `training_examples`
  - Review `chip_suggestions` for {AGENT_DOMAIN} tags
- **Search Strategy:**
  - Primary keywords: {LIST_KEYWORDS}
  - Secondary keywords: "framework", "tactic", "strategy", "technique"
  - Look in: `conversation_summary.topics`, `coaching_intelligence.*`, `chip_suggestions[].tags`
- **Expected Intelligence:** 30-40 patterns across 93 weeks

#### 2.3 TIER 3 SOURCES (Contextual - ANALYZE IF TIME PERMITS)

**Source G: Weekly Chip Files (Granular Week-by-Week)**
- **Directory:** `/data/kb_intel_chips/chips/`
- **Files:** w*_chips.json (week-specific chip batches)
- **Sampling Strategy:** Analyze same 18 weeks sampled in Source F
- **Action:** For each sampled week's chip file, extract chips tagged with {AGENT_DOMAIN} themes
- **Expected Intelligence:** 10-15 additional chips

**Source H: iMessage Intel Chips**
- **Directory:** `/data/kb_intel_chips/imsg-chips/`
- **Files:**
  - `iMessage_Intel_Chips_Batch_v3.jsonl` (most recent)
  - `iMessage_Intel_Chips_Batch_v2.jsonl`
  - `iMessage_Intel_Chips_Batch_v1.jsonl`
- **Action:** Extract async coaching patterns relevant to {AGENT_DOMAIN}
- **Focus:** Crisis interventions, quick tactical advice, emotional support patterns
- **Expected Intelligence:** 5-10 patterns

---

### STEP 3: Intelligence Structuring

**For EVERY piece of intelligence extracted, structure into CoachingIntelligenceChip format:**

```typescript
{
  chip_id: "{DOMAIN}-{TYPE}-###",  // e.g., "EC-FRAMEWORK-001"
  chip_version: "v1.0",
  chip_type: "{TYPE}_Chip",  // Framework, Strategy, Tactic, Technique, Tool, EQ, Result, Silver_Bullet

  taxonomy: {
    domain: "{AGENT_DOMAIN}",
    tier: "foundational" | "tactical" | "meta" | "measurement",
    phase: ["P1-FOUNDATION", ...],  // Which phases does this apply to?
    archetype: ["universal", ...],  // Which student types benefit?
    themes: [...]  // Semantic tags
  },

  content: {
    name: "...",
    summary: "...",  // 120-200 char
    detailed_description: "...",
    when_to_apply: [...],
    inputs_required: [...],
    outputs_generated: [...],
    step_by_step: [...]  // If procedural
  },

  evidence: {
    source_sessions: [{week, phase, context}],
    student_examples: [{student_id, before_state, intervention, after_state, impact_multiplier}],
    quality_score: 0.0-1.0,
    confidence_score: 0.0-1.0,
    effectiveness_score: 0.0-1.0
  },

  cross_links: {
    related_chips: [...],
    prerequisite_chips: [...],
    composes_with: [...],
    required_facts: [FactCategory.ASSESSMENT_DATA, ...]
  },

  outcomes: {
    outcome_tags: ["admit", "award", "press", "lor", "scholarship", "leadership"],
    success_metrics: {},
    failure_modes: [...],
    mitigation_strategies: [...]
  },

  metadata: {
    silver_bullet: true/false,
    difficulty_level: "beginner" | "intermediate" | "advanced",
    time_to_execute: "..."
  }
}
```

---

### STEP 4: Intelligence Categorization

**Organize extracted intelligence into 4 tiers:**

#### Tier 1: Foundational Frameworks (Universal)
- High abstraction, broadly applicable
- Forms "mental models" layer
- Expected: 10-15 chips

#### Tier 2: Tactical Techniques (Execution-Specific)
- Medium abstraction, context-dependent
- Forms "playbook" layer
- Expected: 25-35 chips

#### Tier 3: Meta Patterns (Strategic Optimization)
- Very high abstraction, cross-cutting
- Forms "optimization" layer
- Expected: 5-10 chips

#### Tier 4: Measurement Frameworks (Quality Validation)
- Metric-focused, feedback loops
- Forms "quality assurance" layer
- Expected: 10-15 chips

**Target Total: 50-75 chips minimum**

---

### STEP 5: Cross-Linking & Composition

**For each chip, identify:**

1. **Related Chips** - Complementary techniques (e.g., "10 EC Optimization" relates to "Portfolio Effect Creation")
2. **Prerequisite Chips** - Must apply first (e.g., "168-Hour Architecture" before "Portfolio Operating Cadence")
3. **Composes With** - Best used together (e.g., "Task Multiplication 5X" + "Outcome Density Maximization")
4. **Required Facts** - Which FactCategories needed (v18.0 Fact-First integration)

---

### STEP 6: Evidence & Validation

**For EACH chip, document:**

1. **Source Sessions** - Which weeks, which phases, which contexts
2. **Student Examples** - At least 1 before/after case with quantified impact
3. **Quality Score** - Your assessment of evidence strength (0-1)
4. **Confidence Score** - How certain are you this works? (0-1)
5. **Effectiveness Score** - Estimated success rate when applied (0-1)

---

### STEP 7: Identify Silver Bullets

**Mark chips as `silver_bullet: true` if they meet ALL criteria:**
- ✅ Highest impact (changes outcomes dramatically)
- ✅ Broadly applicable (works across contexts)
- ✅ Evidence-backed (validated by multiple students)
- ✅ Difficult to replicate (proprietary insight)

**Expected:** 3-5 silver bullet chips per domain

---

### STEP 8: Output Format

**Deliver intelligence in 3 formats:**

#### Format 1: Comprehensive Catalog (Markdown)
```markdown
# {AGENT_NAME} Intelligence Catalog

## Tier 1: Foundational Frameworks (## chips)
### {CHIP_NAME} (chip_id: {ID})
- **Type:** Framework_Chip
- **Summary:** ...
- **When to Apply:** ...
- **Evidence:** W### (context), Student X (before/after)
- **Cross-Links:** Related to {...}
- **Silver Bullet:** Yes/No

[Repeat for all Tier 1 chips]

## Tier 2: Tactical Techniques (## chips)
[Same structure]

## Tier 3: Meta Patterns (## chips)
[Same structure]

## Tier 4: Measurement Frameworks (## chips)
[Same structure]

## Summary Statistics
- Total Chips: ##
- Silver Bullets: ##
- Sources Analyzed: ##
- Evidence Strength: Average quality_score
- Cross-Links: Average links per chip
```

#### Format 2: Structured JSON (for Pinecone ingestion)
```json
[
  {
    "chip_id": "...",
    "chip_version": "v1.0",
    ...
  },
  ...
]
```

#### Format 3: Agent Integration Code Snippet
```typescript
// {AGENT_NAME}Agent intelligence loader initialization
async initialize(studentContext: StudentContext): Promise<void> {
  this.domainIntelligence = await this.intelligenceLoader.loadForAgent(
    AgentDomain.{AGENT_DOMAIN_CAPS},
    studentContext
  );

  // Expected chips loaded: 50-75
  // Silver bullets: 3-5
  console.log(`Loaded ${this.domainIntelligence.length} intelligence chips`);
}
```

---

### STEP 9: Analysis Dimensions

**When analyzing sources, extract intelligence across these dimensions:**

#### Dimension 1: WHAT (Content/Strategy)
- What frameworks does Jenny use?
- What are the strategic approaches?
- What are the core principles?

#### Dimension 2: HOW (Execution/Tactics)
- How does Jenny execute this strategy?
- What are the specific steps?
- What templates/scripts does she use?

#### Dimension 3: WHEN (Timing/Context)
- When should this be applied?
- What are the trigger conditions?
- Which phase is this relevant to?

#### Dimension 4: WHY (Rationale/Psychology)
- Why does this work?
- What's the underlying psychology?
- What makes this effective?

#### Dimension 5: WHO (Student Context)
- Which student archetypes benefit most?
- Are there personality considerations?
- Cultural context factors?

#### Dimension 6: PROOF (Evidence/Outcomes)
- What outcomes were achieved?
- Which students exemplify this?
- What's the impact multiplier?

#### Dimension 7: FAILURE MODES (Limitations)
- When does this NOT work?
- What are the edge cases?
- How to mitigate failures?

---

### STEP 10: Quality Checks

**Before finalizing, verify:**

- [ ] **Completeness:** 50+ chips extracted
- [ ] **Evidence:** Every chip has ≥1 source session
- [ ] **Diversity:** Chips across all 4 tiers
- [ ] **Cross-Links:** Average ≥3 links per chip
- [ ] **Silver Bullets:** 3-5 identified
- [ ] **Fact Integration:** Required facts specified for each chip
- [ ] **Uniqueness:** No duplicate chips
- [ ] **Clarity:** Summaries are concise (120-200 char)
- [ ] **Actionability:** "When to apply" is specific
- [ ] **Validation:** Quality/confidence scores assigned

---

## EXAMPLE EXECUTION

### For ExtracurricularsAgent:

**Step 1: Domain Understanding**
- Core Responsibilities: EC portfolio analysis, gap identification, strategic recommendations, impact scaling, prioritization, success metrics, timeline planning
- Key Frameworks: 10 Activities Framework, Profile Trinity (Aptitude × Passion × Service), Formalization Ladder
- Fact Categories: ACTIVITY_DATA, ASSESSMENT_DATA, STUDENT_PROFILE, ACADEMIC_DATA, PROGRESS_DATA, TIME_ALLOCATION_DATA
- Event Triggers: `ec_portfolio_updated`, `quarterly_review`, `ec_ideation_request`
- Success Metrics: EC-Narrative Alignment (≥90%), Depth (2+ activities 3-year tenure), Impact Quantification Quality

**Step 2: Multi-Source Extraction**
- Source A (Exec Chips): Extracted 16 chips
- Source B (Student Index): Extracted 9 frameworks
- Source C (Game Plan Reports): Extracted 28 patterns across 12 students
- Source D (Assessment Transcripts): Extracted 12 diagnostic frameworks
- Source E (Huda Extractions): Extracted 18 patterns
- Source F (Weekly Sessions): Analyzed 18/93 weeks → Extracted 42 patterns
- Source G (Weekly Chips): Extracted 11 additional chips
- Source H (iMessage Chips): Extracted 7 async patterns

**Total Extracted:** 143 raw intelligence pieces → Deduplicated to 53 unique chips

**Step 3-10:** [Structured, categorized, cross-linked, validated as shown above]

**Final Output:** 53 chips (15 foundational, 20 tactical, 8 meta, 10 measurement) with 5 silver bullets

---

## CUSTOMIZATION GUIDE

### For Different Agent Types:

#### Assessment Agent
- **Keywords:** "assessment", "diagnostic", "questioning", "27-layer", "weak spot", "identity fusion"
- **Key Sources:** Assessment transcripts (primary), Huda assessment extractions
- **Expected Chips:** Heavy on EQ patterns, diagnostic frameworks

#### GamePlan Agent
- **Keywords:** "game plan", "strategy", "quarterly", "milestone", "timeline", "target schools"
- **Key Sources:** Game plan reports (primary), Huda gameplan extractions
- **Expected Chips:** Heavy on strategic frameworks, time architecture

#### Awards Agent
- **Keywords:** "award", "competition", "NCWIT", "recognition", "application", "arbitrage"
- **Key Sources:** Exec chips, weekly sessions (award application weeks)
- **Expected Chips:** Tactical techniques, timing optimization

#### Essay Agent
- **Keywords:** "essay", "narrative", "vulnerability", "story", "common app", "supplement"
- **Key Sources:** Game plan reports (essay sections), weekly sessions (essay review weeks)
- **Expected Chips:** Writing techniques, positioning frameworks

#### College List Agent
- **Keywords:** "college", "fit", "reach", "safety", "target", "school selection"
- **Key Sources:** Game plan reports, assessment transcripts
- **Expected Chips:** Selection frameworks, fit analysis

#### Scholarships Agent
- **Keywords:** "scholarship", "financial aid", "merit", "funding", "local scholarship"
- **Key Sources:** Exec chips, weekly sessions (scholarship season)
- **Expected Chips:** Search strategies, application optimization

#### Summer Programs Agent
- **Keywords:** "summer program", "TASP", "RSI", "internship", "research", "prestigious"
- **Key Sources:** Game plan reports, exec chips
- **Expected Chips:** Selection frameworks, ROI analysis

#### Weekly Execution Agent
- **Keywords:** "weekly", "task", "deadline", "execution", "planning", "action items"
- **Key Sources:** Exec chips (primary), weekly sessions (all)
- **Expected Chips:** Execution systems, time management

#### Admissions Agent
- **Keywords:** "admissions officer", "AO", "holistic review", "positioning", "application"
- **Key Sources:** Game plan reports, exec chips
- **Expected Chips:** AO perspective frameworks, positioning strategies

---

## PROMPT USAGE INSTRUCTIONS

### To Use This Template:

1. **Replace Placeholders:**
   - `{AGENT_NAME}` → e.g., "Awards"
   - `{AGENT_DOMAIN}` → e.g., "awards"
   - `{AGENT_DOMAIN_CAPS}` → e.g., "AWARDS"
   - `{LIST_KEYWORDS}` → Domain-specific keyword list

2. **Provide Initial Context (Step 1):**
   - Fill in core responsibilities, expected frameworks, fact categories, events, metrics

3. **Paste Full Prompt to Claude:**
   - Include this entire document with placeholders replaced
   - Claude will systematically execute Steps 2-10

4. **Review & Validate:**
   - Check extracted chips for accuracy
   - Validate evidence and cross-links
   - Approve for production

5. **Integrate into Agent:**
   - Use Format 3 code snippet
   - Load intelligence via CoachingIntelligenceLoader
   - Test agent with new intelligence

---

## SUCCESS CRITERIA

**Extraction is complete when:**
- ✅ 50+ chips extracted and structured
- ✅ All Tier 1 sources analyzed
- ✅ Evidence documented for every chip
- ✅ Cross-links established (avg ≥3 per chip)
- ✅ 3-5 silver bullets identified
- ✅ All 4 tiers represented
- ✅ Quality checks passed
- ✅ Three output formats delivered

**Estimated Time:** 2-3 hours for comprehensive extraction

---

## APPENDIX: Quick Reference

### Chip Type Selection Guide

| If intelligence is... | Use Chip Type |
|----------------------|---------------|
| High-level strategic architecture | Framework_Chip |
| Domain-specific approach | Strategy_Chip |
| Concrete operational technique | Tactic_Chip |
| Repeatable procedural method | Technique_Chip |
| Templated artifact or system | Tool_Chip |
| Emotional intelligence pattern | EQ_Chip |
| Outcome-validated playbook | Result_Chip |
| Highest-impact intervention | Silver_Bullet_Chip |

### Tier Selection Guide

| If intelligence... | Assign Tier |
|-------------------|-------------|
| Applies to all agents universally | Foundational |
| Specific to execution context | Tactical |
| Optimizes entire workflows | Meta |
| Measures quality/progress | Measurement |

### Phase Mapping

- **P1-FOUNDATION:** 9th-10th grade (exploration, foundation building)
- **P2-BUILD:** 10th-11th grade (depth, leadership, impact)
- **P3-JUNIOR:** 11th grade intensive (scaling, recognition)
- **P4-SUMMER:** Summer programs, internships
- **P5-SENIOR:** Application season (12th grade fall)

---

**Document Status:** ✅ v1.0 Complete - Ready for Use
**Maintained By:** Engineering Team
**Last Updated:** 2025-10-29
