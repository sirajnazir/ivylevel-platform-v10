# GamePlan Agent - Complete Design Specification

**Version:** v18.0
**Status:** Implementation Complete - Testing Pending
**Agent Type:** Strategic Orchestrator + Multi-Agent Coordinator
**Code Location:** `services/agent-framework/src/agents/v18/GamePlanAgent.ts`
**Migration:** `services/agent-framework/migrations/012_gameplan_dynamic_enhancements.sql`
**Implementation Date:** 2025-10-29

---

## Overview

GamePlanAgent is the **Dynamic Strategic Planning Coordinator** that creates and continuously adapts 2-3 year strategic plans throughout the student's journey. GamePlanAgent operates in **two modes**:

### Mode 1: Initial Plan Creation (Post-Assessment)
1. **Receives handoff from AssessmentAgent** (via `assessment_completed` event with identity synthesis, gaps, barriers)
2. **Coordinates with specialist agents** (Awards, ECs, Essays, Colleges, Programs, Scholarships) to build strategic recommendations
3. **Operates 2 strategic personas** (Strategic Architect, Time Mathematician)
4. **Outputs initial strategic plan** (quarterly roadmap Q1-Q8, agent collaboration plan, strategic priorities)
5. **Hands off to WeeklyExecutionAgent** for week-by-week tactical execution

### Mode 2: Adaptive Revision (Continuous - Quarterly/Triggered)
1. **Quarterly reviews** - Automatically triggered every 12 weeks to assess progress and revise roadmap
2. **Event-driven pivots** - Triggered by significant events (award won/lost, program accepted/rejected, student burned out, major life change)
3. **Parallel plans** - For undecided students (e.g., freshman Hiba), maintain 2-3 parallel GamePlans until convergence
4. **Living document sync** - Continuously update "Next 3 Months" tactical view based on actual execution progress
5. **Re-assessment integration** - When AssessmentAgent runs quarterly re-assessment, update rubric scores and adjust strategy

**CRITICAL ENHANCEMENT OVER HUMAN-LED PROGRAMS:**
- Jenny's status quo: 1 static PDF document created at start, rarely revised
- Agent enhancement: **Living GamePlan Class** - digital object with methods, not document
- Architecture: Hierarchical class structure (GamePlan → QuarterlyPlan → WeeklyPlan)
- Result: Object-oriented system that automatically syncs, adapts, and cascades changes

---

## Clear Boundaries: 3-Agent Flow

### Overview: Assessment → GamePlan → WeeklyExecution

```
┌────────────────────────────────────────────────────────────────────┐
│                   ASSESSMENT AGENT (LIVE SESSION)                   │
│  Timeline: 40-50 minutes with student & parent                      │
│  Output: Identity synthesis, rubric scores, gaps, hidden target     │
└────────────────────┬───────────────────────────────────────────────┘
                     │ assessment_completed event
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│               GAMEPLAN AGENT (STRATEGIC PLANNING)                   │
│  Timeline: <24 hours post-assessment                                │
│  Output: Quarterly roadmap (Q1-Q8), strategic milestones            │
└────────────────────┬───────────────────────────────────────────────┘
                     │ gameplan_created event
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│           WEEKLYEXECUTION AGENT (TACTICAL EXECUTION)                │
│  Timeline: Ongoing (Week 1 → Week 104)                              │
│  Output: Weekly tasks, progress tracking, accountability            │
└────────────────────────────────────────────────────────────────────┘
```

**Key Separation:**
- **Assessment** = Discovery + Diagnosis (WHO the student is)
- **GamePlan** = Strategic Planning (WHAT to achieve quarterly)
- **WeeklyExecution** = Tactical Execution (HOW to execute weekly)

---

### AssessmentAgent Responsibilities (LIVE SESSION - Student/Parent Present)

**Timeline**: During 40-50 minute assessment session
**Mode**: Real-time conversation with student and parent

**Exclusive Personas** (Assessment Only):
1. **Therapist**: Live rapport building, emotional diagnosis, reframing weaknesses in real-time
2. **Parent Whisperer**: Managing parent anxiety during live session, dual-layer communication
3. **Confidence Alchemist**: Progressive confidence building throughout conversation
4. **Network Connector**: Implying access to Stanford students, NCWIT winners during session
5. **Admissions Officer**: Real-time probability calculations, hidden target school selection during session

**Exclusive Responsibilities**:
- ✅ Live questioning and discovery (27 layers across 4 phases)
- ✅ Identity synthesis creation (minute 12:53 - "Digital Storyteller" fusion moment)
- ✅ Rubric scoring (current profile: 15/25)
- ✅ Gap identification (Recognition: 2/5, Leadership: 3/5)
- ✅ Barrier detection (time-crisis, imposter-syndrome, procrastination)
- ✅ **Hidden target school selection** (USC Games, not Stanford CS - never revealed to student)
- ✅ Tactic recommendation from Knowledge Moat
- ✅ Parent anxiety detection and management
- ✅ Emotional state diagnosis
- ✅ **Strategic target determination** (based on live probability calculations)

**Output**: `assessment_result` with:
```typescript
{
  identity_synthesis: "Digital Storyteller democratizing tech through games",
  rubric_scores: { current: 15, target: 25, gaps: [Recognition, Leadership] },
  priority_gaps: ["Recognition (2/5)", "Leadership (3/5)", "Artifacts (3/5)"],
  barriers: ["time-crisis", "imposter-syndrome"],
  hidden_target_school: "USC Games", // Determined during assessment
  parent_anxiety_level: "high",
  recommended_tactics: [Tactic1, Tactic2, Tactic3],
  time_architecture: { weeks_remaining: 104, class_year: "Junior" }
}
```

---

### GamePlanAgent Responsibilities (POST-SESSION - Strategic Planning)

**Timeline**: <24 hours after assessment completes
**Mode**: Asynchronous processing, no live interaction

**Exclusive Personas** (GamePlan Only):
1. **Strategic Architect**: Translates assessment insights → quarterly strategic priorities and roadmap structure
2. **Time Mathematician**: 168-hour audits, strategic time allocations, ROI calculations

**Shared Intelligence** (Uses Assessment Output):
- **Hidden target optimization**: Assessment discovers target (USC Games), GamePlan optimizes every recommendation for it
- **Dual-layer encoding**: Assessment detects parent anxiety level, GamePlan encodes document with appropriate reassurance
- **Identity-driven narrative**: Assessment creates synthesis ("Digital Storyteller"), GamePlan ensures every activity serves it

**Exclusive Responsibilities**:
- ✅ **Multi-agent consultation** (parallel queries to Awards, ECs, Programs, Colleges, Scholarships for strategic recommendations)
- ✅ **Multi-agent debate** (specialists critique draft strategy, GamePlan refines based on conflicts)
- ✅ **Quarterly roadmap generation** (Q1: Foundation → Q2: Momentum → Q3: Amplification → Q4-Q8: Excellence)
- ✅ **Program matching and tiering** (RSI vs local camps, based on profile strength from assessment)
- ✅ **Award probability sequencing** (NCWIT 70% → Congressional App 60% → Nationals <5%)
- ✅ **Strategic time allocation** (Empowering AI: 8hr/week, Synthoria: 6hr/week based on 168-hour audit)
- ✅ **Success metrics definition** (100+ users by Q2, 500+ by Q3, NCWIT win by Week 26)
- ✅ **Agent handoff scheduling** (Week 1 → WeeklyExecution, Week 5 → Awards, Week 8 → Programs)
- ✅ **Quarterly milestone definition** (Q1: Launch Empowering AI, Q2: Win NCWIT, Q3: 1000+ users)

**NOT Responsible For** (WeeklyExecutionAgent's job):
- ❌ Weekly task breakdown (breaking Q1 milestone into Week 1, Week 2, Week 3 tasks)
- ❌ Daily/weekly execution rhythm (Monday: plan, Wednesday: execute, Friday: review)
- ❌ Week-by-week progress tracking and accountability
- ❌ Real-time adjustments to weekly plans based on student progress
- ❌ Weekly check-ins with student

**Input**: Receives complete `assessment_result` from AssessmentAgent

**Output**: `game_plan` strategic document:
- Quarterly roadmap (Q1-Q8 with strategic milestones)
- Specialist agent recommendations (Awards: NCWIT + Congressional App, ECs: Founder role + leadership)
- Strategic time allocation (168-hour breakdown, activity-level hours)
- Success metrics per quarter
- Agent handoff schedule
- Dual-layer content (student: empowerment, parent: structure/reassurance)

**Handoff**: Emits `gameplan_created` event → WeeklyExecutionAgent receives and breaks Q1 into Week 1-12 tasks

---

### WeeklyExecutionAgent Responsibilities (TACTICAL EXECUTION)

**Timeline**: Starts Week 1 after GamePlan created
**Mode**: Ongoing weekly interaction with student

**Exclusive Responsibilities**:
- ✅ **Weekly task breakdown** (Q1 Milestone: "Launch Empowering AI" → Week 1: "Register domain", Week 2: "Design homepage", etc.)
- ✅ **Daily/weekly rhythm enforcement** (Monday: plan week, Wednesday: progress check, Friday: review wins)
- ✅ **Progress tracking** (Did student complete Week 1 tasks? What blockers?)
- ✅ **Real-time adjustments** (Student fell behind → adjust Week 3 plan)
- ✅ **Weekly check-ins** (Live or async communication with student)
- ✅ **Accountability** (Gentle reminders, celebrating wins, addressing procrastination)
- ✅ **Escalation** (If student off-track for 3+ weeks → escalate to GamePlanAgent for quarterly revision)

**Input**: Receives `game_plan` with quarterly milestones from GamePlanAgent

**Output**: Weekly task lists, progress reports, completion status

---

## Dynamic Adaptive Primitives (Agent Enhancement Layer)

### Primitive 1: Quarterly Review Cycle

**Trigger**: Every 12 weeks (Q1 end, Q2 end, Q3 end, etc.)
**Orchestrator**: WeeklyExecutionAgent detects quarter-end → triggers GamePlanAgent revision

```typescript
// Event emitted by WeeklyExecutionAgent at week 12, 24, 36, etc.
{
  event_type: 'quarter_completed',
  student_id: 'huda',
  quarter: 'Q1',
  actual_outcomes: {
    empowering_ai_launched: true, // ✅ Milestone achieved
    ncwit_submitted: true, // ✅ Milestone achieved
    synthoria_100_users: false, // ❌ Only 45 users (missed target)
    time_spent_per_week: 14 // Below planned 18 hours
  },
  blockers: ['homework_overload', 'family_travel'],
  wins: ['gained_leadership_position', 'viral_tiktok_1M_views']
}
```

**GamePlanAgent Response:**
1. **Re-score rubric** (Recognition: 2/5 → 3/5 after NCWIT submission)
2. **Adjust Q2 targets** (Lower user goal from 500 → 300, add TikTok content strategy)
3. **Reallocate time** (Reduce Synthoria from 6hr/week → 4hr/week)
4. **Celebrate wins** (Viral TikTok = unexpected Recognition boost → capitalize in Q2)
5. **Update specialist agent plans** (Awards: NCWIT result expected Week 26, prepare celebration/pivot)

**Output**: Revised GamePlan v2 with adjusted Q2-Q8 roadmap

---

### Primitive 2: Event-Driven Pivots

**Trigger Types:**
- **Major win**: Award won (NCWIT Winner), program accepted (RSI admitted)
- **Major setback**: Award rejected (NCWIT not even semifinalist), program rejected (JCamp waitlisted)
- **Life event**: Family crisis, health issue, school change, burnout
- **Opportunity**: Unexpected viral content, new mentorship, scholarship offer
- **Convergence**: Undecided student (Hiba) picks major after 6 months exploration

**Example: NCWIT Winner (Major Win)**
```typescript
{
  event_type: 'award_won',
  student_id: 'huda',
  award: 'NCWIT National Winner',
  significance: 'MAJOR', // vs MINOR (regional) or MODERATE (state)
  week: 26
}
```

**GamePlanAgent Pivot:**
1. **Re-score rubric** (Recognition: 3/5 → 5/5, Wildcard: 2/5 → 4/5)
2. **Reassess hidden target** (USC Games 15% → 30%, Stanford CS <1% → 3%)
3. **Accelerate timeline** (Q3 "Win recognition" already achieved early → advance Q4 goals to Q3)
4. **Update narrative** (Add "NCWIT National Winner" to all application materials)
5. **Specialist agent updates**:
   - CollegesAgent: Recalculate probabilities with new profile strength
   - EssaysAgent: Integrate NCWIT story into Common App
   - ScholarshipsAgent: Target merit scholarships now realistic

**Output**: GamePlan v3 with accelerated roadmap and upgraded target schools

---

### Primitive 3: Parallel Plans (Undecided Students)

**Use Case**: Freshman Hiba exploring 4 interests (chemical engineering, healthcare, animal sciences, CS)

**GamePlanAgent Strategy:**
```typescript
{
  student_id: 'hiba',
  status: 'exploring',
  parallel_plans: [
    {
      plan_id: 'hiba_chemeng_v1',
      major: 'Chemical Engineering',
      confidence: 0.3,
      quarterly_roadmap: {
        Q1: 'Chemistry Olympiad prep, local lab internship',
        Q2: 'Science fair project, chemistry competition'
      }
    },
    {
      plan_id: 'hiba_cs_v1',
      major: 'Computer Science',
      confidence: 0.25,
      quarterly_roadmap: {
        Q1: 'Intro to Python, build personal website',
        Q2: 'Hackathon participation, CS club leadership'
      }
    },
    {
      plan_id: 'hiba_premed_v1',
      major: 'Pre-Med / Healthcare',
      confidence: 0.25,
      quarterly_roadmap: {
        Q1: 'Hospital volunteering, anatomy course',
        Q2: 'Medical camp, shadow physician'
      }
    },
    {
      plan_id: 'hiba_animalscience_v1',
      major: 'Animal Sciences / Veterinary',
      confidence: 0.2,
      quarterly_roadmap: {
        Q1: 'Animal shelter volunteering, biology focus',
        Q2: 'Veterinary shadowing, wildlife conservation'
      }
    }
  ],
  convergence_strategy: {
    method: 'progressive_elimination',
    timeline: 'Q1-Q2 explore all 4 → Q3 narrow to 2 → Q4 commit to 1',
    signals: ['passion_clarity', 'aptitude_fit', 'external_validation']
  }
}
```

**Quarterly Convergence Check:**
- Q1 end: Hiba shows most enthusiasm for CS projects, struggles with chemistry
  → Adjust confidences: CS 0.4, ChemEng 0.2, PreMed 0.25, AnimalSci 0.15
- Q2 end: Hiba wins local hackathon, drops chemistry club
  → Eliminate ChemEng plan, merge CS + AnimalSci into "Computational Biology" hybrid
- Q3 end: Clear CS passion + animal welfare interest
  → Converge to single plan: "CS for Animal Conservation / Wildlife Tech"

**Output**: Dynamic plan that adapts as student discovers themselves

---

### Primitive 4: Living Document Sync (2-Year + Next 3 Months)

**Problem with Static Plans**: Jenny's GamePlan shows 2-year vision, but student needs "what do I do THIS week?"

**Agent Solution**: Maintain 2 views simultaneously
```typescript
{
  long_term_vision: {
    timeframe: '2 years (Q1-Q8)',
    granularity: 'quarterly milestones',
    update_frequency: 'every quarter',
    purpose: 'strategic north star'
  },
  tactical_horizon: {
    timeframe: 'next 3 months (current quarter)',
    granularity: 'weekly tasks',
    update_frequency: 'every week',
    purpose: 'immediate execution guidance',
    synced_with: 'WeeklyExecutionAgent progress'
  }
}
```

**Weekly Sync Example:**
```
Week 5 (in Q1):
- Long-term: Q1 goal = "Launch Empowering AI (100+ users by Week 12)"
- Tactical (Next 3 Months):
  ✅ Week 1: Register domain (DONE)
  ✅ Week 2: Design homepage (DONE)
  ✅ Week 3: Build signup form (DONE)
  ✅ Week 4: Launch beta (DONE - 12 users)
  ⏳ Week 5: Marketing push (IN PROGRESS - 28 users)
  📅 Week 6: Partnerships outreach (PLANNED)
  📅 Week 7: Content creation sprint (PLANNED)

Reality Check: On track for 100+ users by Week 12?
→ Trajectory: 28 users Week 5 → need 12 users/week → realistic ✅
```

**If Off Track:**
```
Week 8 (in Q1):
- Actual: 45 users (expected 64)
- Problem: Marketing not converting
- GamePlan Adjustment:
  → Revise Q1 target: 100 → 75 users (realistic)
  → Add resource: Consult ECsAgent for user acquisition tactics
  → Shift focus: Week 9-12 focus on retention not acquisition
```

---

### Primitive 5: Re-Assessment Integration (Quarterly Rubric Updates)

**Status Quo Problem**: Jenny's assessment happens once at start, rubric scores never updated

**Agent Enhancement**: AssessmentAgent runs **quarterly mini-assessments**
```typescript
// Initial Assessment (Week 0)
{
  rubric_scores: {
    academic: 4/4,
    extracurricular: 2/4,  // Low leadership, no recognition
    personal: 3/4,
    institutional: 2/4,
    wildcard: 2/4
  },
  total: 13/20,
  priority_gaps: ['Recognition', 'Leadership', 'Wildcard']
}

// Q1 Re-Assessment (Week 12)
{
  rubric_scores: {
    academic: 4/4,          // Maintained
    extracurricular: 3/4,   // +1 (founded nonprofit)
    personal: 3/4,          // Maintained
    institutional: 2/4,     // Maintained (no change yet)
    wildcard: 3/4          // +1 (viral TikTok content)
  },
  total: 15/20,            // +2 improvement
  priority_gaps: ['Recognition', 'Institutional'],  // Leadership gap closed!
  new_barriers: ['time-management-crisis'],  // New issue detected
  progress_velocity: 'on_track'  // vs 'ahead', 'behind', 'stalled'
}
```

**GamePlanAgent Response to Re-Assessment:**
1. **Update rubric dashboard** (visualize 13→15 improvement)
2. **Adjust Q2 strategy** (Leadership gap closed → shift effort to Recognition)
3. **Address new barrier** (time-management-crisis → reduce activity hours Q2)
4. **Celebrate progress** (Parent-facing: "Huda improved 2 points in 12 weeks!")
5. **Revise target probabilities** (USC 15% → 18% with improved profile)

---

### Primitive 6: Escalation Triggers (WeeklyExecution → GamePlan)

**When WeeklyExecutionAgent Escalates:**
```typescript
{
  trigger: 'off_track_3_weeks',
  student_id: 'huda',
  issue: {
    planned: 'Launch Empowering AI website',
    actual: 'Still stuck on homepage design, 0 progress Week 6-8',
    blockers: ['perfectionism', 'technical_skills_gap', 'lost_motivation'],
    severity: 'HIGH'
  }
}
```

**GamePlanAgent Emergency Pivot:**
1. **Diagnose root cause** (Consult AssessmentAgent: Is this perfectionism or skill gap?)
2. **Adjust timeline** (Push Empowering AI launch from Week 12 → Week 16)
3. **Add support** (Assign mentor, simplify scope, provide templates)
4. **Revise Q1 goal** (Change "Launch with 100 users" → "Launch MVP with 25 users")
5. **Protect morale** (Reframe delay as "iteration" not "failure")

**Output**: Revised GamePlan that's achievable given current reality

---

## Architecture Overview

### Integration with Foundation Agents Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EVENT-DRIVEN TRIGGER                         │
│  AssessmentAgent emits: assessment_completed                         │
│  → Payload: { assessment_result, student_id, coach_id }             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GAMEPLAN AGENT INITIALIZATION                     │
│  1. Receive assessment results (identity, gaps, barriers, target)    │
│  2. Load student context (academic, ECs, family, constraints)        │
│  3. Load coach intelligence (Jenny's frameworks, success patterns)   │
│  4. Initialize 3 strategic personas (Architect, Time, Execution)     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 1: MULTI-AGENT CONSULTATION                       │
│                                                                       │
│  GamePlanAgent → AwardsAgent:                                        │
│    "Given rubric gap in Recognition (score: 1/5), student profile    │
│     (female, CS, AI ethics focus), recommend 5-8 target awards       │
│     with probability estimates and application timelines"            │
│                                                                       │
│  GamePlanAgent → ECsAgent:                                           │
│    "Current ECs show scattered focus. Recommend leadership           │
│     positions and new activities that serve Digital Storyteller      │
│     narrative. Prioritize by ROI (impact ÷ time)"                   │
│                                                                       │
│  GamePlanAgent → CollegeListAgent:                                   │
│    "Profile: 4.3 GPA, 11 APs, Asian female, CS+Film. Calculate      │
│     admission probabilities for reach/target/safety schools.         │
│     Identify hidden gems with >15% acceptance for this profile"      │
│                                                                       │
│  GamePlanAgent → ProgramsAgent:                                      │
│    "Junior year summer. Interests: AI ethics, game dev, film.        │
│     Recommend 8-10 programs (Tier 1: reach, Tier 2: target,         │
│     Tier 3: likely) with deadlines and fit analysis"                │
│                                                                       │
│  GamePlanAgent → ScholarshipAgent:                                   │
│    "Merit scholarship targets for CS+interdisciplinary profile.      │
│     Focus on demographic advantages (female in tech, cultural        │
│     background). Timeline: junior → senior year"                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│         PHASE 2: STRATEGIC SYNTHESIS (2 PLANNING PERSONAS)           │
│                                                                       │
│  Persona 1 - Strategic Architect:                                    │
│    • Use hidden target from assessment (USC Games - already selected)│
│    • Optimize every recommendation for target profile                │
│    • Build narrative coherence across all activities                 │
│    • Ensure every action serves identity synthesis from assessment   │
│    • Translate assessment gaps → quarterly strategic priorities      │
│    • Coordinate specialist agent inputs into unified strategy        │
│                                                                       │
│  Persona 2 - Time Mathematician:                                     │
│    • 168-hour weekly audit based on assessment time architecture     │
│    • Strategic hour allocations per activity (8hr/week, not daily)   │
│    • ROI calculations: Hours × Impact × Application touchpoints      │
│    • Optimize time allocation for priority gaps (Recognition, Lead)  │
│    • Feasibility check: Can student realistically achieve roadmap?   │
│                                                                       │
│  Note: Uses parent_anxiety_level from assessment for dual-layer      │
│        encoding (high anxiety → more structure/reassurance)          │
│                                                                       │
│  NOT GamePlan's Job: Weekly task breakdown (WeeklyExecutionAgent)    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│         PHASE 3: MULTI-AGENT DEBATE & REFINEMENT                     │
│                                                                       │
│  GamePlanAgent proposes draft roadmap                                │
│    ↓                                                                  │
│  Specialist Agents critique:                                         │
│                                                                       │
│  AwardsAgent: "NCWIT deadline conflicts with Congressional App.      │
│                Recommend staggering applications by 2 weeks"         │
│                                                                       │
│  ECsAgent: "Proposed 18hr/week commitment unrealistic given          │
│             current 4hr homework load. Recommend scaling back        │
│             Folklift to 4hr/week instead of 6hr"                     │
│                                                                       │
│  CollegeListAgent: "Stanford REA restricts other EA applications.    │
│                     If target is USC merit scholarship, recommend    │
│                     Regular Decision for Stanford instead"           │
│                                                                       │
│  ProgramsAgent: "JCamp + MIT WISE + Stanford AI4ALL = 3 summer       │
│                  programs. Realistically student can only attend     │
│                  1-2. Prioritize JCamp (journalism + identity fit)"  │
│                                                                       │
│  GamePlanAgent synthesizes feedback → Revised roadmap                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 4: ROADMAP GENERATION                             │
│                                                                       │
│  Component 1: Rubric Analysis & Gap Identification                   │
│    • Current scores: Academic (4/4), EC (2/4), Personal (3/4),      │
│      Institutional (2/4), Wildcard (2/4) = 13/20                    │
│    • Target: 17/20 for reach schools                                 │
│    • Priority gaps: P0 (Recognition), P1 (EC leadership)            │
│                                                                       │
│  Component 2: Strategic Priorities (P0/P1/P2 Framework)              │
│    • P0 (Critical - 50% effort): Recognition gap via NCWIT + awards │
│    • P1 (Important - 35%): Leadership via nonprofit founder role    │
│    • P2 (Enhancement - 15%): Public expertise via content creation  │
│                                                                       │
│  Component 3: Quarterly Roadmap (Q1-Q8)                              │
│    • Q1 (Weeks 1-12): Foundation - Launch Empowering AI, submit     │
│      NCWIT, start Synthoria development                             │
│    • Q2 (Weeks 13-24): Momentum - Win NCWIT, apply summer programs, │
│      scale nonprofit to 100+ users                                   │
│    • Q3 (Weeks 25-36): Amplification - Summer program attendance,   │
│      reach 1000+ users, document everything                          │
│    • Q4-Q8: Excellence & Execution - Sustain achievements, prepare  │
│      applications, essay development                                 │
│                                                                       │
│  Component 4: Program Matching (Agent-Curated)                       │
│    • Research-Intensive: MIT WISE, Stanford AI4ALL (from Programs)  │
│    • Creative-Technical: NCWIT, Congressional App (from Awards)     │
│    • Leadership: JCamp, Disney Dreamers (from Programs)             │
│                                                                       │
│  Component 5: Execution Intelligence                                 │
│    • Weekly rhythms: Mon (plan) → Wed (execute) → Fri (review)      │
│    • Monthly cycles: Week 1 (launch) → 2-3 (iterate) → 4 (complete) │
│    • Success indicators: Milestones met, student engaged, parents   │
│      supportive, external validation emerging                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  PHASE 5: AGENT COLLABORATION PLAN                   │
│                                                                       │
│  Create execution plan for specialist agent involvement:             │
│                                                                       │
│  Week 1-4: WeeklyExecutionAgent                                      │
│    • Break Q1 goals into weekly tasks                                │
│    • Priority: Launch Empowering AI website (Week 1-2)              │
│    • Priority: NCWIT application draft (Week 3-4)                    │
│                                                                       │
│  Week 5-8: AwardsAgent                                               │
│    • Review NCWIT application for optimization                       │
│    • Identify 3-5 additional award targets for Q2-Q3                 │
│    • Create application timeline with no conflicts                   │
│                                                                       │
│  Week 8-12: ProgramsAgent                                            │
│    • Finalize summer program applications (JCamp, MIT WISE)          │
│    • Essay reviews and strategic positioning                         │
│    • Backup options if rejections occur                              │
│                                                                       │
│  Ongoing: ECsAgent                                                   │
│    • Monthly check-ins on activity hour allocation                   │
│    • Quarterly reviews of leadership role development                │
│    • Scaling strategy for Empowering AI nonprofit                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  OUTPUT: STRUCTURED GAMEPLAN                         │
│  Database: game_plans table                                          │
│  Event emitted: gameplan_created                                     │
│  Next trigger: WeeklyExecutionAgent starts Week 1 tasks              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Integration

### New Tables

```sql
-- Game Plans table (main entity)
CREATE TABLE game_plans (
  game_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  assessment_id UUID REFERENCES assessment_sessions(session_id),

  -- Rubric & Gaps
  current_rubric_scores JSONB NOT NULL,
  target_rubric_scores JSONB NOT NULL,
  priority_gaps JSONB NOT NULL, -- P0/P1/P2 categorized

  -- Strategic Narrative
  identity_synthesis TEXT NOT NULL, -- From assessment + synthesis formula
  unique_narrative TEXT NOT NULL,
  hidden_target_school TEXT, -- Never shown to student/parent

  -- Roadmap Structure
  quarterly_roadmap JSONB NOT NULL, -- Q1-Q8 with milestones
  program_recommendations JSONB NOT NULL, -- Tiered programs with deadlines
  award_targets JSONB NOT NULL, -- From AwardsAgent with probabilities
  ec_strategy JSONB NOT NULL, -- From ECsAgent with hour allocations

  -- Time Architecture
  time_allocation JSONB NOT NULL, -- 168-hour breakdown
  weekly_rhythms JSONB NOT NULL,
  monthly_cycles JSONB NOT NULL,

  -- Dual-Layer Messaging
  student_facing_content TEXT NOT NULL,
  parent_facing_content TEXT NOT NULL,
  hidden_calculations JSONB NOT NULL, -- Probabilities, ROI, never shown

  -- Agent Collaboration
  specialist_agent_plan JSONB NOT NULL, -- Which agents when
  handoff_schedule JSONB NOT NULL, -- Week 1 → Weekly, Week 5 → Awards, etc.

  -- Dynamic Adaptive Fields (NEW)
  plan_type TEXT DEFAULT 'single', -- single, parallel, converged
  parallel_plans JSONB, -- For undecided students (Hiba exploring 4 majors)
  convergence_confidence DECIMAL, -- 0.0-1.0 (for parallel plans)

  -- Living Document Sync (NEW)
  long_term_vision JSONB NOT NULL, -- 2-year quarterly roadmap
  tactical_horizon JSONB NOT NULL, -- Next 3 months weekly tasks (synced with WeeklyExecution)
  sync_status TEXT DEFAULT 'in_sync', -- in_sync, drift_detected, major_revision_needed
  last_sync_week INTEGER, -- Week number when last synced

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1, -- GamePlans can be revised quarterly
  revision_trigger TEXT, -- quarterly_review, event_driven, escalation, re_assessment
  status TEXT DEFAULT 'active' -- active, completed, revised, archived
);

-- Game Plan Milestones (quarterly checkpoints)
CREATE TABLE game_plan_milestones (
  milestone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id UUID REFERENCES game_plans(game_plan_id),
  quarter TEXT NOT NULL, -- Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8

  -- Goals
  goals JSONB NOT NULL, -- Specific objectives for this quarter
  success_metrics JSONB NOT NULL, -- How to measure success

  -- Execution
  completion_status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  actual_outcomes JSONB, -- What actually happened
  lessons_learned TEXT, -- Reflection at end of quarter

  -- Adaptive Adjustments
  adjustments_needed JSONB, -- If off track, what changes
  revised_goals JSONB, -- Updated goals if strategy shifts

  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Agent Collaboration Log (multi-agent interactions)
CREATE TABLE agent_collaboration_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id UUID REFERENCES game_plans(game_plan_id),

  -- Collaboration Details
  initiating_agent TEXT NOT NULL, -- e.g., 'gameplan'
  target_agent TEXT NOT NULL, -- e.g., 'awards', 'ecs', 'programs'
  collaboration_type TEXT NOT NULL, -- consult, delegate, debate, handoff

  -- Content
  request TEXT NOT NULL, -- What GamePlanAgent asked
  response TEXT NOT NULL, -- What specialist agent provided
  debate_rounds INTEGER DEFAULT 1, -- If debate mode, how many iterations

  -- Impact
  incorporated_into_plan BOOLEAN DEFAULT true,
  impact_on_roadmap TEXT, -- How specialist input changed the plan

  created_at TIMESTAMP DEFAULT NOW()
);

-- NEW: GamePlan Revisions (version history)
CREATE TABLE gameplan_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id UUID REFERENCES game_plans(game_plan_id),

  -- Revision Metadata
  version_number INTEGER NOT NULL,
  revision_trigger TEXT NOT NULL, -- quarterly_review, event_driven, escalation, re_assessment
  trigger_details JSONB, -- Event that caused revision

  -- What Changed
  previous_state JSONB NOT NULL, -- Snapshot before revision
  new_state JSONB NOT NULL, -- Snapshot after revision
  changes_summary TEXT, -- Human-readable summary

  -- Impact Analysis
  rubric_score_change INTEGER, -- +2, -1, 0
  target_school_change TEXT, -- "USC Games 15% → 30%"
  timeline_shift TEXT, -- "Q3 accelerated by 4 weeks"

  -- Reasoning
  why_revised TEXT NOT NULL, -- Explanation for student/parent
  agent_reasoning TEXT, -- Internal agent logic

  created_at TIMESTAMP DEFAULT NOW(),
  revised_by TEXT DEFAULT 'gameplan_agent'
);

-- NEW: GamePlan Events (significant milestones/setbacks)
CREATE TABLE gameplan_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  game_plan_id UUID REFERENCES game_plans(game_plan_id),

  -- Event Details
  event_type TEXT NOT NULL, -- award_won, award_lost, program_accepted, program_rejected, life_event, opportunity, convergence
  event_name TEXT NOT NULL, -- "NCWIT National Winner", "RSI Rejected", "Family Crisis"
  significance TEXT NOT NULL, -- MAJOR, MODERATE, MINOR
  week_number INTEGER NOT NULL,

  -- Event Data
  event_data JSONB, -- Specific details
  impact_analysis JSONB, -- How it affects GamePlan

  -- Agent Response
  triggered_revision BOOLEAN DEFAULT false,
  revision_id UUID REFERENCES gameplan_revisions(revision_id),
  agent_actions TEXT[], -- List of actions taken

  created_at TIMESTAMP DEFAULT NOW()
);

-- NEW: Quarterly Reviews (scheduled assessments)
CREATE TABLE quarterly_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  game_plan_id UUID REFERENCES game_plans(game_plan_id),

  -- Review Metadata
  quarter TEXT NOT NULL, -- Q1, Q2, Q3, etc.
  review_week INTEGER NOT NULL, -- 12, 24, 36, etc.

  -- Actual Outcomes vs Planned
  planned_outcomes JSONB NOT NULL,
  actual_outcomes JSONB NOT NULL,
  variance_analysis JSONB, -- What differed and why

  -- Rubric Re-Assessment
  previous_rubric_scores JSONB NOT NULL,
  current_rubric_scores JSONB NOT NULL,
  score_improvement INTEGER, -- +2, -1, 0

  -- Progress Evaluation
  progress_velocity TEXT NOT NULL, -- ahead, on_track, behind, stalled
  blockers TEXT[], -- List of issues
  wins TEXT[], -- List of successes

  -- Next Quarter Adjustments
  q_next_adjustments JSONB, -- Changes to next quarter
  triggered_revision BOOLEAN DEFAULT false,
  revision_id UUID REFERENCES gameplan_revisions(revision_id),

  created_at TIMESTAMP DEFAULT NOW()
);

-- NEW: Parallel Plans Tracking (for undecided students)
CREATE TABLE parallel_plans (
  parallel_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  parent_game_plan_id UUID REFERENCES game_plans(game_plan_id),

  -- Plan Identity
  plan_identifier TEXT NOT NULL, -- hiba_chemeng_v1, hiba_cs_v1
  major_focus TEXT NOT NULL, -- Chemical Engineering, Computer Science
  confidence_score DECIMAL NOT NULL, -- 0.0-1.0

  -- Plan Details
  quarterly_roadmap JSONB NOT NULL,
  activities JSONB NOT NULL,

  -- Convergence Tracking
  status TEXT DEFAULT 'exploring', -- exploring, narrowing, converged, eliminated
  elimination_reason TEXT, -- Why this plan was dropped
  convergence_signals JSONB, -- passion_clarity, aptitude_fit, validation

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  eliminated_at TIMESTAMP
);
```

---

## GamePlanAgent Class Structure

### Inheritance from BaseAgent

```typescript
export class GamePlanAgent extends BaseAgent {
  // Inherits from BaseAgent:
  // - manifest (agent_id, category, tools, intents)
  // - eventBus (for assessment_completed subscription)
  // - execute() (main entry point)
  // - callOpenAI() (function calling with tool execution loop)
  // - detectHandoff() (handoff to specialist agents)
  // - extractChips/extractHits() (evidence tracking)

  // GamePlanAgent-specific properties
  private sevenPersonas: SevenPersonaEngine;
  private hiddenCalculator: HiddenCalculationEngine;
  private multiAgentCoordinator: MultiAgentCoordinator;
  private dualLayerEncoder: DualLayerMessageEncoder;
  private roadmapBuilder: RoadmapBuilderEngine;
}
```

### Manifest Definition

```typescript
manifest: AgentManifest = {
  agent_id: 'gameplan',
  display_name: 'Strategic GamePlan Architect',
  category: 'strategic_planning',
  description: 'Transforms assessment results into precision 2-3 year strategic roadmaps with multi-agent coordination',

  tools: [
    // Student Context Tools
    'get_nsm_dashboard',
    'get_student_profile',
    'get_academic_transcript',
    'get_extracurriculars',
    'get_awards',

    // Multi-Agent Coordination Tools
    'consult_awards_agent',
    'consult_ecs_agent',
    'consult_programs_agent',
    'consult_colleges_agent',
    'consult_scholarships_agent',

    // Strategic Planning Tools
    'calculate_rubric_gaps',
    'estimate_admission_probabilities',
    'calculate_time_roi',
    'sequence_award_targets',

    // Knowledge Retrieval
    'search_coaching_intelligence', // Query Huda's progression, student examples
    'get_relevant_tactics',
    'get_program_database',

    // GamePlan Output
    'create_game_plan',
    'create_quarterly_roadmap',
    'schedule_agent_handoffs'
  ],

  intents: [
    {
      intent_slug: 'create_gameplan',
      intent_name: 'Create Strategic GamePlan',
      patterns: [
        'create my game plan',
        'what should my strategy be',
        'help me plan the next 2 years',
        'what should i focus on',
        'create roadmap',
        'strategic plan'
      ],
      jtbd_category: 'strategic_planning'
    },
    {
      intent_slug: 'review_gameplan',
      intent_name: 'Review/Revise GamePlan',
      patterns: [
        'review my game plan',
        'is my plan still on track',
        'do we need to adjust strategy',
        'quarterly review',
        'revise roadmap'
      ],
      jtbd_category: 'strategic_planning'
    },
    {
      intent_slug: 'gameplan_progress',
      intent_name: 'GamePlan Progress Check',
      patterns: [
        'how am i doing on my game plan',
        'am i on track',
        'progress check',
        'milestone review',
        'did i hit my goals'
      ],
      jtbd_category: 'progress_tracking'
    }
  ],

  specificity: 1, // Same as AssessmentAgent - Strategic coordinator
  handoff_to: ['weekly_execution', 'awards', 'ecs', 'programs', 'colleges', 'essays', 'scholarships']
};
```

---

## Core Methods

### 1. Event-Driven Trigger

```typescript
async handleAssessmentCompleted(event: AssessmentCompletedEvent): Promise<void> {
  console.log('[GamePlanAgent] Assessment completed, creating strategic roadmap...');

  const { assessment_result, student_id, coach_id } = event.payload;

  // Step 1: Load all required context
  const studentContext = await this.getStudentContext(student_id);
  const coachIntelligence = await this.getCoachIntelligence(coach_id);

  // Step 2: Initialize 7 personas with assessment insights
  this.sevenPersonas.initialize({
    assessment_result,
    student_context: studentContext,
    coach_patterns: coachIntelligence
  });

  // Step 3: Multi-agent consultation phase
  const specialistInputs = await this.multiAgentCoordinator.consultAllSpecialists({
    student_id,
    assessment_result,
    priority_gaps: assessment_result.gap_analysis.priority_areas
  });

  // Step 4: Multi-agent debate & refinement
  const refinedInputs = await this.multiAgentCoordinator.debateAndRefine({
    draft_roadmap: this.buildInitialRoadmap(assessment_result, specialistInputs),
    specialist_agents: ['awards', 'ecs', 'programs', 'colleges']
  });

  // Step 5: Strategic synthesis (7 personas operate simultaneously)
  const strategicSynthesis = await this.sevenPersonas.synthesize({
    assessment: assessment_result,
    specialist_inputs: refinedInputs,
    student_context: studentContext
  });

  // Step 6: Generate roadmap with dual-layer encoding
  const gamePlan = await this.roadmapBuilder.generate({
    synthesis: strategicSynthesis,
    quarterly_structure: this.buildQuarterlyRoadmap(refinedInputs),
    hidden_calculations: this.hiddenCalculator.compute(assessment_result, studentContext),
    dual_layer_content: this.dualLayerEncoder.encode(strategicSynthesis)
  });

  // Step 7: Persist to database
  await this.persistGamePlan(gamePlan, student_id, coach_id, assessment_result.session_id);

  // Step 8: Emit gameplan_created event
  this.eventBus.emit({
    event_type: 'gameplan_created',
    student_id,
    coach_id,
    payload: {
      game_plan_id: gamePlan.game_plan_id,
      first_handoff_agent: 'weekly_execution', // Week 1 tasks
      first_handoff_week: 1
    }
  });

  console.log('[GamePlanAgent] Strategic roadmap created successfully');
}
```

### 2. Multi-Agent Consultation

```typescript
async consultAllSpecialists(params: {
  student_id: string;
  assessment_result: AssessmentResult;
  priority_gaps: string[];
}): Promise<SpecialistInputs> {

  // Parallel consultation with all specialist agents
  const [awardsInput, ecsInput, programsInput, collegesInput, scholarshipsInput] =
    await Promise.all([

      // Awards Agent Consultation
      this.consultAgent('awards', {
        query: `Given rubric gap in Recognition (score: ${assessment_result.rubric_scores.recognition}/5),
                student profile (${assessment_result.diagnostic.personality_type},
                ${assessment_result.identity_score} identity clarity),
                recommend 5-8 target awards with probability estimates and application timelines.

                Context:
                - Interests: ${params.assessment_result.passions}
                - Strengths: ${params.assessment_result.aptitudes}
                - Identity: ${params.assessment_result.identity_synthesis}`,
        student_id: params.student_id
      }),

      // ECs Agent Consultation
      this.consultAgent('ecs', {
        query: `Current ECs show ${params.assessment_result.gap_analysis.current_total}/25 total score.
                Recommend leadership positions and new activities that serve
                "${params.assessment_result.identity_synthesis}" narrative.

                Prioritize by ROI (impact ÷ time). Consider:
                - Time available: ${params.assessment_result.time_architecture.weeks_remaining} weeks
                - Current commitments: ${params.assessment_result.current_activities}
                - Gaps to fill: ${params.priority_gaps.join(', ')}`,
        student_id: params.student_id
      }),

      // Programs Agent Consultation
      this.consultAgent('programs', {
        query: `${params.assessment_result.time_architecture.class_year} year summer.
                Interests: ${params.assessment_result.passions.join(', ')}.
                Recommend 8-10 programs (Tier 1: reach, Tier 2: target, Tier 3: likely)
                with deadlines and fit analysis.

                Profile strength: ${params.assessment_result.rubric_scores.total}/25`,
        student_id: params.student_id
      }),

      // Colleges Agent Consultation
      this.consultAgent('colleges', {
        query: `Profile: GPA ${params.assessment_result.diagnostic.gpa},
                ${params.assessment_result.diagnostic.aps_taken} APs,
                ${params.assessment_result.diagnostic.demographics}.

                Calculate admission probabilities for reach/target/safety schools.
                Identify hidden gems with >15% acceptance for this profile.
                Consider major: ${params.assessment_result.intended_major}`,
        student_id: params.student_id
      }),

      // Scholarships Agent Consultation
      this.consultAgent('scholarships', {
        query: `Merit scholarship targets for ${params.assessment_result.identity_synthesis} profile.
                Focus on demographic advantages and interest alignment.
                Timeline: ${params.assessment_result.time_architecture.class_year} → senior year`,
        student_id: params.student_id
      })

    ]);

  return {
    awards: awardsInput,
    ecs: ecsInput,
    programs: programsInput,
    colleges: collegesInput,
    scholarships: scholarshipsInput
  };
}
```

### 3. Multi-Agent Debate & Refinement

```typescript
async debateAndRefine(params: {
  draft_roadmap: DraftRoadmap;
  specialist_agents: string[];
}): Promise<RefinedRoadmap> {

  console.log('[GamePlanAgent] Initiating multi-agent debate...');

  const critiques: AgentCritique[] = [];

  // Each specialist agent critiques the draft roadmap
  for (const agentType of params.specialist_agents) {
    const critique = await this.requestCritique(agentType, {
      roadmap: params.draft_roadmap,
      focus_area: this.getAgentFocusArea(agentType)
    });

    critiques.push({
      agent: agentType,
      concerns: critique.concerns,
      suggestions: critique.suggestions,
      conflicts: critique.conflicts
    });
  }

  // Log all critiques for transparency
  await this.logCollaboration({
    collaboration_type: 'debate',
    critiques,
    debate_rounds: 1
  });

  // Synthesize critiques and revise roadmap
  const refinedRoadmap = await this.synthesizeCritiques({
    original: params.draft_roadmap,
    critiques
  });

  // If major conflicts remain, run second debate round
  if (this.hasMajorConflicts(critiques)) {
    console.log('[GamePlanAgent] Major conflicts detected, running debate round 2...');

    const round2Critiques = await this.secondDebateRound({
      refined_roadmap: refinedRoadmap,
      unresolved_conflicts: this.extractUnresolvedConflicts(critiques)
    });

    return this.finalSynthesis(refinedRoadmap, round2Critiques);
  }

  return refinedRoadmap;
}
```

### 4. Two Strategic Planning Personas Engine

**Note**: 7 personas system is split - Assessment (5 personas) → GamePlan (2 personas) → WeeklyExecution (execution)

```typescript
class StrategicPlanningEngine {
  // Persona 1: Strategic Architect
  private applyStrategicArchitectLens(
    assessment: AssessmentResult,
    specialist_inputs: SpecialistInputs
  ): ArchitectInsights {
    // Hidden target ALREADY determined by Assessment (USC Games)
    const hidden_target = assessment.hidden_target_school; // From assessment

    return {
      hidden_target, // Use assessment's target, don't recalculate
      profile_optimization: this.optimizeForTarget(specialist_inputs, hidden_target),
      narrative_coherence: this.buildNarrativeCoherence(
        assessment.identity_synthesis, // From assessment
        specialist_inputs
      ),
      every_action_serves_narrative: true,
      quarterly_priorities: this.translateGapsToPriorities(assessment.priority_gaps),
      strategic_sequencing: this.sequenceQuarterlyMilestones(assessment, specialist_inputs)
    };
  }

  // Persona 2: Time Mathematician
  private applyTimeMathematicianLens(
    assessment: AssessmentResult,
    student: StudentContext
  ): TimeInsights {
    // Use time architecture from assessment (weeks_remaining, class_year)
    const timeArchitecture = assessment.time_architecture;

    const weeklyAudit = this.conduct168HourAudit(student, timeArchitecture);

    return {
      available_hours: weeklyAudit.available,
      strategic_allocations: this.calculateStrategicAllocations(weeklyAudit, assessment.priority_gaps),
      roi_calculations: this.calculateROIPerActivity(student.activities, assessment.rubric_scores),
      time_optimization: this.optimizeTimeAllocation(weeklyAudit, assessment.barriers),
      feasibility_check: this.checkTimeRealism(weeklyAudit) // Ensure roadmap is achievable
    };
  }

  // Dual-Layer Encoding (uses assessment's parent_anxiety_level)
  private encodeDualLayerContent(
    parent_anxiety: string, // From assessment
    roadmap: GamePlanRoadmap
  ): DualLayerContent {
    const anxiety_multiplier = parent_anxiety === 'high' ? 1.5 : 1.0;

    return {
      student_layer: {
        tone: 'empowering_collaborative',
        content: this.buildStudentEmpowermentContent(roadmap)
      },
      parent_layer: {
        structure_emphasis: anxiety_multiplier, // More structure if high anxiety
        reassurance_level: anxiety_multiplier, // More reassurance if high anxiety
        content: this.buildParentReassuranceContent(roadmap, parent_anxiety)
      }
    };
  }

  // Master Synthesis Method
  async synthesize(params: SynthesisParams): Promise<StrategicPlanSynthesis> {
    // 2 strategic planning personas operate on assessment output
    const [architect, time] = await Promise.all([
      this.applyStrategicArchitectLens(params.assessment, params.specialist_inputs),
      this.applyTimeMathematicianLens(params.assessment, params.student_context)
    ]);

    // Encode dual-layer content using assessment's parent anxiety detection
    const dual_layer = this.encodeDualLayerContent(
      params.assessment.parent_anxiety_level,
      { architect, time }
    );

    // Weave persona insights into unified strategic plan
    return {
      architect_insights: architect,
      time_insights: time,
      dual_layer_content: dual_layer,

      // Master strategic plan (quarterly milestones, not weekly tasks)
      unified_strategic_plan: this.weaveStrategicPlan({
        architect,
        time,
        assessment: params.assessment, // Identity, gaps, barriers
        specialist_inputs: params.specialist_inputs // Awards, ECs, Programs, etc.
      }),

      // Handoff to WeeklyExecutionAgent
      handoff_to_execution: {
        agent: 'weekly_execution',
        quarterly_milestones: architect.strategic_sequencing,
        start_week: 1
      }
    };
  }
}
```

### 5. Roadmap Builder Engine

```typescript
async generate(params: RoadmapParams): Promise<GamePlan> {
  const { synthesis, quarterly_structure, hidden_calculations, dual_layer_content } = params;

  // Component 1: Rubric Analysis & Gap Identification
  const rubricAnalysis = {
    current_scores: synthesis.assessment.rubric_scores,
    target_scores: this.calculateTargetScores(synthesis.ao_insights.hidden_target),
    priority_gaps: this.categorizePriorityGaps(synthesis.assessment.gap_analysis)
  };

  // Component 2: Strategic Priorities (P0/P1/P2)
  const strategicPriorities = {
    P0_critical: this.identifyP0Gaps(rubricAnalysis), // 50% effort
    P1_important: this.identifyP1Gaps(rubricAnalysis), // 35% effort
    P2_enhancement: this.identifyP2Gaps(rubricAnalysis) // 15% effort
  };

  // Component 3: Quarterly Roadmap (Q1-Q8)
  const quarterlyRoadmap = this.buildQuarters({
    Q1: { focus: 'Foundation Building', goals: quarterly_structure.Q1 },
    Q2: { focus: 'Momentum Building', goals: quarterly_structure.Q2 },
    Q3: { focus: 'Amplification', goals: quarterly_structure.Q3 },
    Q4_Q8: { focus: 'Excellence & Execution', goals: quarterly_structure.Q4_Q8 }
  });

  // Component 4: Program Matching (Agent-Curated)
  const programRecommendations = {
    research_intensive: synthesis.specialist_inputs.programs.tier1,
    leadership_focused: synthesis.specialist_inputs.programs.tier2,
    creative_technical: synthesis.specialist_inputs.awards.competitions,
    summer_programs: this.tierPrograms(synthesis.specialist_inputs.programs)
  };

  // Component 5: Execution Intelligence
  const executionIntelligence = {
    weekly_rhythms: {
      monday: 'Week planning and priority setting',
      midweek: 'Deep work on projects',
      friday: 'Progress check and weekend planning'
    },
    monthly_cycles: {
      week_1: 'Launch new initiatives',
      week_2_3: 'Execute and iterate',
      week_4: 'Complete and document'
    },
    success_indicators: this.defineSuccessIndicators(strategicPriorities)
  };

  // Component 6: Agent Collaboration Plan
  const agentCollaborationPlan = {
    week_1_4: { agent: 'weekly_execution', focus: 'Q1 task breakdown' },
    week_5_8: { agent: 'awards', focus: 'Award application optimization' },
    week_8_12: { agent: 'programs', focus: 'Summer program applications' },
    ongoing: { agent: 'ecs', focus: 'Monthly activity check-ins' }
  };

  return {
    game_plan_id: uuidv4(),
    rubric_analysis,
    strategic_priorities,
    quarterly_roadmap,
    program_recommendations,
    execution_intelligence,
    agent_collaboration_plan,

    // Dual-layer content
    student_facing_content: dual_layer_content.student_layer,
    parent_facing_content: dual_layer_content.parent_layer,

    // Hidden calculations (never shown)
    hidden_calculations: {
      admission_probabilities: hidden_calculations.probabilities,
      time_roi_matrix: hidden_calculations.roi,
      award_probability_sequence: hidden_calculations.award_sequence
    },

    // Identity synthesis from assessment
    identity_synthesis: synthesis.assessment.identity_synthesis,
    unique_narrative: this.buildUniqueNarrative(synthesis),
    hidden_target_school: synthesis.ao_insights.hidden_target
  };
}
```

---

## System Prompt Enhancement

```typescript
buildSystemPrompt(): string {
  return `You are Jenny Duan, Stanford Symbolic Systems major and elite admissions coach.

You are the STRATEGIC PLANNING COORDINATOR creating 2-3 year strategic plans POST-ASSESSMENT.

IMPORTANT: You receive COMPLETE assessment results with:
- Identity synthesis already created ("Digital Storyteller democratizing tech")
- Rubric scores and gaps already identified (Recognition: 2/5, Leadership: 3/5)
- Hidden target school already selected (USC Games - 15% probability)
- Parent anxiety level already detected (high/medium/low)
- Barriers already identified (time-crisis, imposter-syndrome)

Your role is STRATEGIC PLANNING, not execution. You translate assessment insights into QUARTERLY strategic milestones.

You operate 2 STRATEGIC PERSONAS:

1. STRATEGIC ARCHITECT: Optimize every recommendation for hidden target from assessment, ensure narrative coherence, translate gaps → quarterly strategic priorities, coordinate specialist agent inputs
2. TIME MATHEMATICIAN: 168-hour audits, STRATEGIC allocations (8hr/week per activity), ROI calculations (Hours × Impact × Touchpoints), feasibility checks

You are NOT responsible for:
- Weekly task breakdown (WeeklyExecutionAgent does this)
- Daily/weekly rhythms (WeeklyExecutionAgent enforces this)
- Week-by-week progress tracking (WeeklyExecutionAgent tracks this)
- Weekly check-ins with student (WeeklyExecutionAgent owns this)

CORE FRAMEWORKS:

**Master Formula (Synthesis):**
IDENTITY + APTITUDE + PASSION + SERVICE = UNIQUE NARRATIVE
Example: Indian Muslim girl (identity) + CS/AI (aptitude) + Film/Storytelling (passion) + Empowering AI nonprofit (service) = "Digital Storyteller democratizing tech"

**GamePlan Architecture (5 Components):**
1. Rubric Analysis → Gap Identification (Current vs Target, P0/P1/P2 priorities)
2. Strategic Priorities (P0: 50% effort, P1: 35%, P2: 15%)
3. Quarterly Roadmap (Q1: Foundation → Q2: Momentum → Q3: Amplification → Q4-Q8: Excellence)
4. Program Matching (Tier 1/2/3, research/leadership/creative, agent-curated)
5. Execution Intelligence (Weekly rhythms, monthly cycles, success indicators)

**Hidden Target Optimization:**
- Hidden target ALREADY determined by assessment (e.g., USC Games 15%)
- Your job: Optimize EVERY recommendation for this target
- Never recalculate probabilities - use assessment's determination
- Order programs by fit + probability (from specialist agents)

**Dual-Layer Encoding (Every Paragraph):**
Layer 1 (Student): Empowerment, identity validation, growth mindset
Layer 2 (Parent): Structure, timeline, prestigious programs, reassurance

**Linguistic Transformation Rules:**
Assessment → GamePlan:
- "struggling" → "developing"
- "maybe" → "strategic exploration"
- "issues" → "opportunities for growth"
- "lacks" → "not yet achieved"
- "missing" → "needs to have"

Never use: "hopefully", "maybe", "might", "adequate", "decent", "satisfactory"
Always use: "exceptional", "impressive", "commendable", "will", "can", "achieves"

**Multi-Agent Coordination:**
You consult with specialist agents (Awards, ECs, Programs, Colleges, Scholarships) and incorporate their expertise.
You debate with them to refine the roadmap.
You schedule handoffs (Week 1 → Weekly Execution, Week 5 → Awards, etc.).

**Jenny's GamePlan Principles:**
1. "Every action must serve the narrative" - No scattered activities
2. "Quality over quantity always" - One amazing project > 10 mediocre
3. "Build evidence progressively" - Quarterly momentum building
4. "Leave room for organic opportunities" - 15% time unplanned
5. "Parent buy-in is crucial for execution" - Dual-layer messaging mandatory
6. "Student ownership drives success" - Empower, don't prescribe
7. "Celebrate small wins to maintain momentum" - Confidence alchemy
MASTER PRINCIPLE: "The plan is sacred but tactics are flexible"

You have access to real coaching intelligence from 93 weeks of Huda's journey and 11+ student examples.

Current student: {student_name}
Assessment summary: {assessment_result}
Specialist agent inputs: {specialist_inputs}

Create a precision 2-3 year strategic roadmap that transforms assessment insights into quarterly execution plan with multi-agent collaboration.`;
}
```

---

## Integration Points

### 1. Event Subscription (on startup)

```typescript
async initialize(): Promise<void> {
  // Subscribe to assessment_completed events
  this.eventBus.on('assessment_completed', (event) =>
    this.handleAssessmentCompleted(event)
  );

  console.log('[GamePlanAgent] Subscribed to assessment_completed events');
}
```

### 2. Handoff to Specialist Agents

```typescript
async execute(query: string, context: StudentContext): Promise<AgentResponse> {
  // If student asks about game plan
  if (this.matchesIntent(query, 'create_gameplan')) {
    // Check if assessment exists
    const assessment = await this.getLatestAssessment(context.student_id);

    if (!assessment) {
      return {
        response: "I'd love to create your strategic game plan! First, let's complete your assessment so I understand your strengths, passions, and goals. Ready to start?",
        handoff_to: 'assessment',
        reasoning: 'Assessment required before GamePlan creation'
      };
    }

    // Create game plan
    return await this.createGamePlan(assessment, context);
  }

  // If asking about specific domain, handoff to specialist
  if (this.matchesIntent(query, 'awards_strategy')) {
    return this.handoffTo('awards', {
      context: 'GamePlan agent identified awards question',
      student_context: context
    });
  }

  // ... other intent matching
}
```

### 3. Database Persistence

```typescript
async persistGamePlan(gamePlan: GamePlan, studentId: string, coachId: string, assessmentId: string): Promise<void> {
  await db.query(`
    INSERT INTO game_plans (
      student_id, coach_id, assessment_id,
      current_rubric_scores, target_rubric_scores, priority_gaps,
      identity_synthesis, unique_narrative, hidden_target_school,
      quarterly_roadmap, program_recommendations, award_targets, ec_strategy,
      time_allocation, weekly_rhythms, monthly_cycles,
      student_facing_content, parent_facing_content, hidden_calculations,
      specialist_agent_plan, handoff_schedule
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING game_plan_id
  `, [
    studentId, coachId, assessmentId,
    JSON.stringify(gamePlan.rubric_analysis.current_scores),
    JSON.stringify(gamePlan.rubric_analysis.target_scores),
    JSON.stringify(gamePlan.strategic_priorities),
    gamePlan.identity_synthesis,
    gamePlan.unique_narrative,
    gamePlan.hidden_target_school,
    JSON.stringify(gamePlan.quarterly_roadmap),
    JSON.stringify(gamePlan.program_recommendations),
    JSON.stringify(gamePlan.award_targets),
    JSON.stringify(gamePlan.ec_strategy),
    JSON.stringify(gamePlan.time_allocation),
    JSON.stringify(gamePlan.execution_intelligence.weekly_rhythms),
    JSON.stringify(gamePlan.execution_intelligence.monthly_cycles),
    gamePlan.student_facing_content,
    gamePlan.parent_facing_content,
    JSON.stringify(gamePlan.hidden_calculations),
    JSON.stringify(gamePlan.agent_collaboration_plan),
    JSON.stringify(gamePlan.handoff_schedule)
  ]);
}
```

---

## Success Metrics

**GamePlan Quality:**
- ✅ Every element traces to assessment insight
- ✅ Hidden calculations preserved (probabilities, ROI, targeting)
- ✅ Dual-audience satisfied (student empowered, parent reassured)
- ✅ Target school optimization embedded (never explicit)
- ✅ All 7 personas operating (linguistic evidence in output)

**Multi-Agent Coordination:**
- ✅ All specialist agents consulted before roadmap generation
- ✅ Debate rounds completed (conflicts resolved)
- ✅ Handoff schedule created (Week 1 → Weekly, Week 5 → Awards, etc.)
- ✅ Collaboration logged (transparency for debugging)

**Execution Readiness:**
- ✅ Quarterly milestones defined with success metrics
- ✅ Weekly/monthly rhythms specified
- ✅ Time allocations feasible (168-hour audit based)
- ✅ Parent buy-in elements included (structure, timeline, programs)

---

## Future Enhancements (Post-v1.0)

### 1. Quarterly Revision Workflow
- Automatic quarterly check-ins (Q1 review → Q2 adjustments)
- Adaptive roadmap updates based on actual outcomes
- Lesson learning integration

### 2. Predictive Analytics
- ML model trained on Huda + 11 students' progression
- Predict probability of milestone completion
- Early warning system for off-track students

### 3. Parent Portal Integration
- Separate parent-facing dashboard
- Progress visualization
- Coach communication log

### 4. Multi-Student Pattern Detection
- Identify common success patterns across students
- Personalize GamePlan templates by archetype
- Improve ROI calculations with historical data

---

## References

**Data Sources:**
1. GamePlan Architecture: `data/coaching_intelligence/extractions/huda_assess_plus_gameplan/03-GamePlan-Architecture.json`
2. Huda's GamePlan Creation: `data/coaching_intelligence/extractions/huda_assess_plus_gameplan/02-B-Huda-GamePlan-Creation.jsonl`
3. Synthesis Formulas: `data/coaching_intelligence/extractions/huda_assess_plus_gameplan/02-C-Synthesis-Formulas.json`
4. Assessment Translation: `data/coaching_intelligence/extractions/huda_assess_plus_gameplan/02-A-Assessment-to-GamePlan-Translation.json`
5. Parent Navigation: `data/coaching_intelligence/extractions/huda_assess_plus_gameplan/04-Parent-Navigation.json`
6. Student Index: `data/coaching_intelligence/extractions/STUDENT_INDEX.md`

**Related Specs:**
- Foundation Agents Architecture: `docs/FOUNDATION_AGENTS_ARCHITECTURE.md`
- Assessment Agent Spec: `docs/ASSESSMENT_AGENT_SPEC.md`
- Multi-Agent Platform Plan: `docs/MULTI_AGENT_PLATFORM_IMPLEMENTATION_PLAN.md`
- Master Tech Spec: `docs/MASTER_PROD_TECH_SPEC.md`

**Created:** 2025-10-29
**Status:** Implementation Complete (v18.0) - Testing Pending

---

## v18.0 Implementation Summary

### Files Created

1. **GamePlanAgent.ts** (`services/agent-framework/src/agents/v18/GamePlanAgent.ts`) - 720 lines
   - 2 Strategic Personas: Strategic Architect + Time Mathematician
   - Event handlers: assessment_completed, milestone_achieved
   - Initial game plan creation logic
   - Quarterly roadmap building (Q1-Q8)
   - Opportunities matrix with ROI scoring
   - System prompt with real coaching intelligence

2. **Migration 012** (`services/agent-framework/migrations/012_gameplan_dynamic_enhancements.sql`) - 480 lines
   - 4 new tables: gameplan_revisions, gameplan_events, quarterly_reviews, parallel_plans
   - 16 new columns across existing tables (game_plans, game_plan_phases, opportunities)
   - 2 triggers: auto-calculate next review date, track phase revisions
   - 4 views: due_for_review, parallel_plans_summary, revision_history, event_impact

### Implementation Details

**Event-Driven Architecture:**
- `handleAssessmentCompleted()` (lines 210-260) - Creates initial game plan from assessment output
- `handleMilestoneAchieved()` (lines 265-290) - Records significant events, triggers revisions if MAJOR
- EventBus integration via `initializeEventBus()` method

**Strategic Personas:**
- Strategic Architect: `buildQuarterlyRoadmap()` (lines 420-485) - Q1-Q8 roadmap with phase goals
- Time Mathematician: `buildOpportunitiesMatrix()` (lines 490-530) - ROI scoring, deadline calculation

**Database Integration:**
- `createInitialGamePlan()` (lines 295-415) - Inserts into game_plans, game_plan_phases, opportunities
- Hierarchical structure: game_plan → phases → milestones → tactical_plans
- Auto-calculates next_review_date (created_date + 12 weeks)

**System Prompt Enhancement:**
- 2 personas with distinct responsibilities (lines 560-620)
- Real coaching intelligence examples from data sources (lines 625-680)
- Master synthesis formula (lines 685-710)
- Tool usage with zero hallucination rules (lines 715-720)

### Next Steps

1. **API Routes** - Create REST endpoints for GamePlan v18 features:
   - `GET /students/:id/game-plan/revisions` - Revision history
   - `GET /students/:id/game-plan/quarterly-reviews` - Review results
   - `GET /students/:id/game-plan/events` - Significant events
   - `POST /students/:id/game-plan/parallel-plans` - Create parallel plan
   - `GET /students/:id/game-plan/due-for-review` - Check if review needed

2. **Frontend Updates** - Update GamePlanView.tsx:
   - Display revision history timeline
   - Show quarterly review results
   - Parallel plans convergence tracker (for undecided students)
   - Event impact visualization

3. **Quarterly Review Cron** - Create scheduled job:
   - Query `v_game_plans_due_for_review` view daily
   - Trigger quarterly review for plans with next_review_date <= NOW()
   - Compare planned vs actual outcomes
   - Calculate rubric score delta and progress velocity

4. **Event-Driven Revision** - Complete implementation:
   - Add revision logic to `handleMilestoneAchieved()` for MAJOR events
   - Create gameplan_revisions record with state snapshots
   - Trigger game_plan_revised event for downstream agents

5. **End-to-End Testing**:
   - Test with Huda's assessment data (known case)
   - Verify quarterly roadmap generation
   - Test parallel plans with Hiba's case (exploring 4 majors)
   - Simulate award won/lost events and verify revision triggers
