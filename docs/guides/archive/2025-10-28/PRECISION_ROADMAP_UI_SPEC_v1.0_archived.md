# Precision Roadmap UI Specification v1.0

**Document Version:** v1.0
**Created:** 2025-10-27
**Status:** DRAFT - AWAITING APPROVAL
**Author:** Claude Code Analysis
**Purpose:** Comprehensive UI/UX and technical specification for Game Plan / Precision Roadmap feature

---

## Executive Summary

This document specifies the design and implementation of the **Precision Roadmap** - a hierarchical, data-driven multi-year planning interface that connects:

1. **Long-term Strategic Planning** (3-4 year game plan)
2. **Phase-based Execution** (semester/year-based phases)
3. **Weekly Action Plans** (preparation tab with outcomes, execution items, tasks)
4. **Real-time Progress Tracking** (completion metrics, time allocation)
5. **College Application Mapping** (direct links to Common App / UC sections)

### Key Design Principles

**Working Backwards from Outcomes**
- Every element traces back to target college admission outcomes
- Hierarchical structure: College Goals → Phase Goals → Weekly Outcomes → Daily Tasks

**First-Principles Based**
- Start from student assessment (readiness score /10)
- Identify weak spots with highest ROI
- Create precision strategies with measurable success criteria
- Execute with weekly accountability and progress tracking

**Future Extensible**
- Data model supports arbitrary nesting levels
- Easy to add new phases, domains, and frameworks
- API-first design enables coach tools and analytics

---

## Part 1: Game Plan Evolution Analysis (Huda 2023 vs Hiba 2025)

### Huda's Game Plan (2023) - Key Characteristics

**Structure:**
- Simple 3-year program (Sophomore → Junior → Senior)
- Focus: Awards gap, passion project completion, college applications
- Limited specificity on HOW to execute strategies
- Mostly narrative-driven with some bullet points

**Content Sections:**
1. Target Ivy+ Awards Profile (7 specific awards listed)
2. Program Proposal (2-year plan)
3. Year-by-year goals with general categories
4. Program cadence (weekly/bi-weekly sessions)
5. Why IvyLevel section (value proposition)

**Strengths:**
- Clear target awards identified
- Specific student context (large public school, STEM background)
- Personalized coaching match (shared background)

**Weaknesses:**
- Lack of measurable success criteria
- No progress tracking mechanism
- Missing tactical execution details
- No time allocation framework
- Limited connection between strategy and Common App sections
- No priority levels or dependencies

### Hiba's Game Plan (2025) - Major Enhancements

**Structure:**
- **Comprehensive 4-phase framework:**
  - Introduction & US Admissions Context
  - Assessment (Readiness Score /10, Weak Spots with ROI Analysis)
  - Immediate Action (Summer 2025 Smart Plan with Specific Opportunities)
  - 3-Year Roadmap with Phase-based Goals and Expected Outcomes

**Content Enhancements:**

**1. Data-Driven Assessment Section**
```
Current Profile Readiness Score: 4.5/10

Broken down by:
- Academic Excellence: 5.5/10
- Extracurricular Impact: 3.5/10
- Personal Story: 5/10
- Institutional Fit: 4/10
```

**2. Prioritized Weak Spot Analysis**
```
P0: Highest Priority (Highest ROI)
  - Weak Spot 1: Lack of Extracurricular Depth
  - Weak Spot 2: Academic Course Rigor
  - Weak Spot 3: Undecided Academic Direction
  - Weak Spot 4: Limited Leadership Experience
  - Weak Spot 5: Undeveloped Self-Awareness

P1: Medium Priority
  - Weak Spot 6: Lack of Academic Competitions/Honors
  - Weak Spot 7: Standardized Testing Preparation
```

Each weak spot includes:
- Why High Priority (impact %)
- Feasibility (HIGH/MEDIUM/LOW with 3-year timeline)
- Expected Impact (specific outcomes)

**3. SMART Immediate Action Plan (Summer 2025)**

Structure:
- Strategic Goals (6 specific goals with success criteria)
- Expected Outcomes by September 2025 (8 measurable deliverables)
- Specific Handpicked Opportunities (organized by pathway)
  - Computer Science (5 programs with URLs)
  - Animal Sciences (3 opportunities with URLs)
  - Chemical Engineering (3 activities)
  - STEM Competition Entry (4 competitions)
  - Passion Project Formation (4 specific project ideas)

**4. 3-Year Tactical Roadmap with Phases**

Each phase includes:
- Phase Goals (3-5 strategic objectives)
- Expected Outcomes (measurable by end of phase)
- Tactical Plan broken down by:
  - Academic Strategy (specific courses, GPA targets, test scores)
  - Career Exploration (interviews, shadowing, research)
  - Extracurricular Foundation (specific activities, hours/week)
  - Leadership Development (roles, measurable impact)
  - Summer Programs (tier 1/2/3 with backup options)

**5. Admissions Context Education**

New sections:
- Holistic Admissions Approach (US vs International systems)
- Admissions Factors Table (UC vs Ivies/T20 weight breakdown)
- School Context (Mountain House HS profile, ranking, admission rates)
- Personal Story Advantages (Muslim American, school transitions, immigrant journey)

**6. Coach Matching Section**

Enhanced with:
- Why specific coach (Noor - Stanford CS/Bio/Neuro)
- Shared background (Muslim American, interdisciplinary STEM)
- How coach will help with specific strategies

---

### Key Innovations in Hiba's Format (2025)

**Innovation 1: Readiness Scoring System**
- Quantitative assessment (X/10) for each dimension
- Allows progress tracking over time
- Enables ROI-based prioritization

**Innovation 2: ROI-Based Weak Spot Framework**
```
Priority Level + (Why High Priority × Feasibility) = Expected Impact
```

**Innovation 3: Time-Sensitive Opportunities with URLs**
- Immediate action items with application links
- Deadline-driven execution
- Research already done for student

**Innovation 4: Expected Outcomes Framework**
- Every phase has specific, measurable outcomes
- Enables accountability and progress tracking
- Links to college application sections

**Innovation 5: Tactical Plan Detail Level**
- Not just "take rigorous courses" but:
  - "AP Biology or AP Chemistry (depending on direction)"
  - "Maintain 3.8+ unweighted GPA"
  - "SAT 1400+ or ACT 32+"
  - "5+ hours weekly in leadership role"

**Innovation 6: Framework Applications**
- 168-Hour Time Framework
- 5W Execution Framework (Why, What, When, Where, Who)
- P0/P1/P2 Priority System
- Domain-based Organization (academic, test_prep, extracurricular, application, creative_project)

**Innovation 7: Hierarchical Linking Architecture**
```
Game Plan → Phase → Summer/Semester → Week → Outcome → Execution Item → Task
```

This creates a clear thread from 3-year vision down to specific daily tasks, enabling the connection to the Preparation Tab's Weekly Action Plans.

---

## Part 2: Weekly Action Plan Card Analysis (Current Implementation)

### Current Data Model (from enrich_weekly_vitals_v2_standardized.ts)

**Hierarchy:**
```
WeeklyActionPlan
├── outcomes[]                    # Strategic outcomes for the week
│   ├── outcome_id
│   ├── title
│   ├── description
│   ├── outcome_domain            # academic, test_preparation, extracurricular, etc.
│   ├── priority_level           # P0, P1, P2, P3
│   ├── completion_state         # not_started, in_progress, completed, blocked
│   └── completion_percentage    # 0-100
├── execution_items[]            # Tactical actions (5W framework)
│   ├── execution_item_id
│   ├── parent_outcome_id        # Links to outcome
│   ├── title
│   ├── why                      # Why this matters
│   ├── what                     # What to do
│   ├── when                     # When to do it
│   ├── priority_level
│   └── completion_state
├── tasks[]                      # Specific action items
│   ├── task_id
│   ├── parent_execution_item_id # Links to execution item
│   ├── task_title
│   ├── deadline
│   └── completion_state
├── progress_tracking
│   └── completion_metrics
│       ├── overall_completion_percentage
│       ├── total_outcomes / completed_outcomes
│       ├── total_execution_items / completed_execution_items
│       └── total_tasks / completed_tasks
├── resource_allocation
│   └── time_allocation
│       ├── total_hours_in_period    # 168 hours/week
│       ├── total_fixed_hours        # School, sleep, etc.
│       ├── available_hours          # For action plan items
│       └── fixed_commitments[]
└── framework_applications[]
    ├── framework_name
    └── application_context
```

**Strengths of Current Implementation:**
- Hierarchical structure (Outcome → Execution Item → Task)
- 5W framework for execution items
- Priority levels (P0-P3)
- Completion tracking at each level
- 168-Hour time framework integration
- Domain categorization

**Gaps for Game Plan Integration:**
- No link to parent Game Plan phases
- No link to specific weak spots being addressed
- No link to college application sections
- No long-term goal visibility
- No phase context (which semester/year)
- No success criteria or expected outcomes

---

## Part 3: Precision Roadmap UI Design Specification

### Design Philosophy

**1. Hierarchical Information Architecture**
- Top-down view: Start with long-term vision, drill down to weekly details
- Bottom-up traceability: From daily task, trace up to ultimate college goal
- Context-aware: Always show "where am I" in the overall journey

**2. Visual Hierarchy**
- Use color, size, spacing to indicate levels
- Progressive disclosure: Collapse/expand sections
- Consistent visual language across all hierarchy levels

**3. Data Density vs Clarity**
- Dashboard view: High-level metrics, trends, at-risk items
- Phase view: Goals, progress, key milestones
- Week view: Detailed action plan (current Preparation tab)

### Core UI Components

#### Component 1: Game Plan Dashboard (New)

**Purpose:** Entry point to Precision Roadmap, shows overall progress and health

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Your Precision Roadmap                                      │
│  Multi-year journey to [Target Schools: BU, UCB, UCLA, ...] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Overall Readiness Score:  7.2/10  ↑ from 4.5/10        │  │
│  │ [████████████░░░░░░░░] 72%                              │  │
│  │                                                           │  │
│  │ Academic: 8.5/10 | Extracurricular: 7.8/10 |            │  │
│  │ Personal Story: 6.5/10 | Institutional Fit: 6.0/10      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────┬───────────────┬───────────────┬─────────┐  │
│  │ Phase 1       │ Phase 2       │ Phase 3       │ Phase 4 │  │
│  │ Exploration   │ Deepening     │ Excellence    │ Apply   │  │
│  │ ✅ Complete   │ ⏳ Current    │ 🔒 Locked     │ 🔒      │  │
│  │ 100%          │ 45%           │ 0%            │ 0%      │  │
│  └───────────────┴───────────────┴───────────────┴─────────┘  │
│                                                                 │
│  📊 Current Phase Progress (Phase 2: Deepening & Achieving)   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Week 45 of 156 total weeks | 18 weeks into Phase 2      │  │
│  │                                                           │  │
│  │ ✅ 12 outcomes completed    ⏳ 3 in progress            │  │
│  │ ✅ 34 execution items done  ⏳ 8 in progress            │  │
│  │ ✅ 89 tasks completed       ⏳ 12 active                │  │
│  │                                                           │  │
│  │ 🎯 Phase 2 Goals:                                        │  │
│  │ • Narrow to 1-2 academic pathways ............... 60%    │  │
│  │ • Secure leadership role ....................... 80%    │  │
│  │ • Launch signature passion project .............. 40%    │  │
│  │ • Complete selective summer program ............. 0%     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ⚠️  At-Risk Items (Need Attention This Week)                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • [P0] Chemical Engineering internship application      │  │
│  │   Due: Nov 1 (5 days) | Status: Not Started             │  │
│  │                                                           │  │
│  │ • [P0] Science Olympiad regional registration           │  │
│  │   Due: Oct 30 (3 days) | Status: Blocked                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [View Full Roadmap] [View Current Week] [Chat with Jenny]    │
└─────────────────────────────────────────────────────────────────┘
```

**Key Data Points:**
- Overall readiness score (current + starting + trend)
- Breakdown by 4 assessment dimensions
- Phase progress (visual timeline)
- Current phase goals with % completion
- At-risk items (deadlines approaching, blocked items)
- Quick actions (view roadmap, view current week, chat)

**UI Features:**
- Animated progress bars
- Color-coded phases (green=complete, blue=current, gray=future)
- Expandable at-risk items section
- Click phases to drill down
- Tooltips showing calculation methodology

---

#### Component 2: Phase Detail View (New)

**Purpose:** Show goals, timeline, and progress for a specific phase (e.g., Phase 2: Deepening & Achieving)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                            │
│                                                                 │
│  Phase 2: Deepening & Achieving                                │
│  Sophomore Spring → Junior Fall 2026                            │
│  Status: ⏳ IN PROGRESS (45% complete)                          │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  📋 PHASE GOALS                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Goal 1: Narrow to 1-2 academic pathways                  │  │
│  │ [████████████░░░░░░] 60%                                  │  │
│  │                                                           │  │
│  │ ✅ Completed 5+ informational interviews                 │  │
│  │ ✅ Shadowed chemical engineer at BASF                    │  │
│  │ ⏳ Complete online ChemE course ............ Due Nov 15  │  │
│  │ ⏳ Attend 2 industry conferences ........... Due Dec 30  │  │
│  │                                                           │  │
│  │ Expected Outcome: Clear direction on Chemical Eng vs     │  │
│  │ CS vs Healthcare by January 2027                          │  │
│  │                                                           │  │
│  │ [View Related Weeks: W30, W35, W40, W45]                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Goal 2: Secure leadership role in 1-2 organizations      │  │
│  │ [████████████████░░] 80%                                  │  │
│  │                                                           │  │
│  │ ✅ Elected MSA Secretary                                  │  │
│  │ ✅ Founded Animal Welfare Club                           │  │
│  │ ⏳ Organize MSA interfaith event ........... Due Nov 10  │  │
│  │ ⏳ Launch animal adoption campaign ......... Due Dec 1   │  │
│  │                                                           │  │
│  │ Expected Outcome: Documented leadership impact with      │  │
│  │ measurable results (increased membership 25%+, raised    │  │
│  │ $1000+, reached 200+ community members)                  │  │
│  │                                                           │  │
│  │ [View Related Weeks: W31, W36, W42, W48]                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Goal 3: Launch signature passion project                 │  │
│  │ [████████░░░░░░░░░░] 40%                                  │  │
│  │                                                           │  │
│  │ ✅ Identified project: "ChemE for Animal Healthcare"     │  │
│  │ ✅ Created project plan & timeline                        │  │
│  │ ⏳ Complete Phase 1 research .............. Due Oct 31   │  │
│  │ ⏳ Build project website .................. Due Nov 30   │  │
│  │ ⏳ Launch pilot with local shelter ........ Due Jan 15   │  │
│  │                                                           │  │
│  │ Expected Outcome: Working project with documented        │  │
│  │ impact, website, and presentation ready for competitions │  │
│  │                                                           │  │
│  │ [View Related Weeks: W33, W38, W44, W50]                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📅 TIMELINE & MILESTONES                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [Timeline visualization showing weeks 30-70 with         │  │
│  │  milestones marked, current week highlighted, completed  │  │
│  │  milestones checked, upcoming milestones flagged]        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📊 PROGRESS METRICS                                            │
│  ┌───────────┬───────────┬───────────┬───────────┬─────────┐  │
│  │ Outcomes  │ Execution │ Tasks     │ Time      │ Weak    │  │
│  │ 12/20     │ 34/56     │ 89/145    │ 240/400hr │ Spots   │  │
│  │ 60%       │ 61%       │ 61%       │ 60%       │ 3/5 ✅  │  │
│  └───────────┴───────────┴───────────┴───────────┴─────────┘  │
│                                                                 │
│  🎯 WEAK SPOTS BEING ADDRESSED                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [P0] Undecided Academic Direction ................ 60% ✅ │  │
│  │ [P0] Limited Leadership Experience ............... 80% ✅ │  │
│  │ [P0] Lack of Extracurricular Depth .............. 70% ✅ │  │
│  │ [P1] Lack of Academic Competitions .............. 30% ⏳ │  │
│  │ [P1] Standardized Testing ........................ 10% ⏳ │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  🏆 EXPECTED OUTCOMES BY END OF PHASE (Jan 2027)                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ✅ Academic Direction: Selected course pathway with 3-4  │  │
│  │    AP/advanced courses                                   │  │
│  │ ⏳ Leadership Position: Officer role + measurable impact │  │
│  │ ⏳ Signature Achievement: Launched passion project       │  │
│  │ 🔒 Specialized Experience: Selective summer program     │  │
│  │ 🔒 Academic Excellence: Maintained 3.8+ GPA             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [View Weekly Breakdown] [View Tactical Plan] [Chat with Coach]│
└─────────────────────────────────────────────────────────────────┘
```

**Key Data Points:**
- Phase name, date range, status, % complete
- Goals with sub-items (completed ✅, in progress ⏳, not started 🔒)
- Expected outcomes for each goal
- Links to related weeks
- Timeline visualization
- Progress metrics (outcomes, execution items, tasks, time, weak spots)
- Weak spots being addressed with progress
- Phase-end expected outcomes checklist

**UI Features:**
- Click goals to expand/collapse sub-items
- Click weeks to jump to week detail
- Hover over progress to see calculation
- Color-coded completion states
- Animated progress bars
- Export phase report button

---

#### Component 3: Enhanced Preparation Tab (Current + New)

**Purpose:** Weekly action plan with hierarchical context and upward linking

**Current Implementation:** WeeklyActionPlanCard.tsx (analyzed above)

**Enhancements Needed:**

**A. Add Contextual Header**
```
┌─────────────────────────────────────────────────────────────────┐
│  📍 YOU ARE HERE                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Phase 2: Deepening & Achieving (Week 45 of 70)           │  │
│  │ [████████░░░░░░░░░░░] 64% phase complete                 │  │
│  │                                                           │  │
│  │ 🎯 This Week's Focus: Launch passion project website    │  │
│  │    Links to: Phase Goal 3 "Signature Passion Project"   │  │
│  │    Addresses: [P0] Lack of Extracurricular Depth        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📋 Weekly Action Plan - Week 45                                │
│  Oct 20 - Oct 26, 2025                                          │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**B. Add Upward Links to Each Outcome**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Outcome: Build project website                            │
│ Priority: P0 | Domain: creative_project | Progress: 40%     │
│                                                              │
│ 🔗 Links to:                                                 │
│ • Phase Goal: "Launch signature passion project" (Goal 3)   │
│ • Weak Spot: [P0] Lack of Extracurricular Depth            │
│ • College App: Common App Activities #1 (Passion Project)  │
│                                                              │
│ Why this matters: Building online presence for passion      │
│ project creates portfolio piece for college applications    │
│ and demonstrates technical + creative skills                │
│                                                              │
│ Success Criteria:                                            │
│ • Website live with 5+ pages                                │
│ • Includes project description, research, impact data       │
│ • Mobile-responsive design                                   │
│ • 50+ visitors in first week                                │
│                                                              │
│ [View in Phase Roadmap] [View Weak Spot Details]            │
└─────────────────────────────────────────────────────────────┘
```

**C. Add College Application Mapping Section**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎓 COLLEGE APPLICATION IMPACT                                │
│                                                              │
│ This week's outcomes will contribute to:                    │
│                                                              │
│ Common App:                                                  │
│ • Activities Section:                                        │
│   - Activity #1: "ChemE for Animal Healthcare Project"      │
│   - Activity #2: "Animal Welfare Club - Founder"            │
│ • Additional Information:                                    │
│   - Passion project development story                        │
│ • Personal Essay:                                            │
│   - Overcoming technical challenges (potential topic)       │
│                                                              │
│ UC Application:                                              │
│ • PIQ #3 (talent/skill): Chemical engineering applications  │
│ • PIQ #7 (community): Animal welfare impact                 │
│ • Activities & Awards:                                       │
│   - Educational Prep Program: Website development skills    │
│                                                              │
│ [View Full Application Mapping] [Preview Activities Section]│
└─────────────────────────────────────────────────────────────┘
```

**D. Keep Current Structure**
- Outcomes with execution items and tasks (already great!)
- Progress tracking (keep it)
- Time allocation (keep it)
- Framework applications (keep it)
- Link indicator (enhance with more specific links)

---

#### Component 4: College Application Mapping View (New)

**Purpose:** Show how game plan items map to specific Common App / UC sections

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🎓 College Application Impact Map                              │
│  See how your work translates to application components         │
│                                                                 │
│  [Common App] [UC Application] [Coalition App]                 │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  📝 COMMON APP - ACTIVITIES SECTION (10 slots)                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Activity #1: ChemE for Animal Healthcare Project (150ch) │  │
│  │ Position: Founder & Lead Researcher                      │  │
│  │ Years: 10th, 11th, 12th  |  Hours: 10 hrs/wk, 40 wks/yr │  │
│  │                                                           │  │
│  │ 📊 Evidence from Game Plan:                              │  │
│  │ • Phase 2, Goal 3: Signature Passion Project             │  │
│  │ • Week 45: Built project website (completed ✅)          │  │
│  │ • Week 50: Launched pilot with shelter (in progress ⏳)  │  │
│  │ • Week 60: Presented at Science Fair (future 🔒)        │  │
│  │                                                           │  │
│  │ 📈 Progress: 60% ready for application                   │  │
│  │ ⚠️  Still needed: Competition awards, published results │  │
│  │                                                           │  │
│  │ [View Full Activity Details] [Preview Common App Entry]  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Activity #2: Muslim Student Association - Secretary      │  │
│  │ Position: Secretary (11th), President (12th)             │  │
│  │ Years: 10th, 11th, 12th  |  Hours: 5 hrs/wk, 36 wks/yr  │  │
│  │                                                           │  │
│  │ 📊 Evidence from Game Plan:                              │  │
│  │ • Phase 2, Goal 2: Leadership Development                │  │
│  │ • Week 36: Elected MSA Secretary (completed ✅)          │  │
│  │ • Week 42: Organized interfaith event (completed ✅)     │  │
│  │ • Week 48: Increased membership 40% (completed ✅)       │  │
│  │                                                           │  │
│  │ 📈 Progress: 85% ready for application                   │  │
│  │ ✅ Strong measurable impact, leadership role confirmed   │  │
│  │                                                           │  │
│  │ [View Full Activity Details] [Preview Common App Entry]  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Continue for Activities #3-10...]                            │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  📝 COMMON APP - PERSONAL ESSAY (650 words)                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Potential Topics (from Game Plan experiences):           │  │
│  │                                                           │  │
│  │ Option 1: "The Chemistry of Compassion"                  │  │
│  │ • Angle: Using ChemE to help animal shelter              │  │
│  │ • Evidence: Phase 2 passion project, Week 45-60 outcomes │  │
│  │ • Strength: Shows STEM + service integration            │  │
│  │                                                           │  │
│  │ Option 2: "Finding My Voice Through Leadership"          │  │
│  │ • Angle: MSA leadership journey, interfaith work         │  │
│  │ • Evidence: Phase 2 leadership goals, Week 36-48 outcomes│  │
│  │ • Strength: Shows personal growth, community impact      │  │
│  │                                                           │  │
│  │ [View More Topics] [Start Essay Draft]                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  📝 UC APPLICATION - PERSONAL INSIGHT QUESTIONS (4 of 8)        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ PIQ #3: Talent or Skill (350 words)                      │  │
│  │ Recommended Topic: Chemical Engineering Applications     │  │
│  │                                                           │  │
│  │ Evidence from Game Plan:                                 │  │
│  │ • Phase 1: Chemical engineering exploration (✅)         │  │
│  │ • Phase 2: Passion project development (⏳ 60%)         │  │
│  │ • Phase 3: Advanced coursework & research (🔒 future)   │  │
│  │                                                           │  │
│  │ [View PIQ Details] [Start Draft]                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Continue for PIQs #1, #7, #8...]                             │
│                                                                 │
│  [View Full Application Readiness] [Export Application Draft]  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Data Points:**
- Common App 10 activities (with game plan evidence)
- Personal essay topics (linked to experiences)
- UC PIQs (with game plan evidence)
- Additional Information section suggestions
- Letters of recommendation alignment
- Progress % for each section
- Gaps / still needed items

---

## Part 4: Data Model & Database Schema

### New Tables Required

**1. game_plans**
```sql
CREATE TABLE game_plans (
  game_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  plan_version VARCHAR(50),                    -- e.g., "v1.0"
  created_by_coach_id UUID REFERENCES coaches(id),
  status VARCHAR(50),                          -- draft, active, archived

  -- Assessment Data
  initial_readiness_score DECIMAL(3,1),        -- e.g., 4.5
  current_readiness_score DECIMAL(3,1),        -- updated over time
  target_readiness_score DECIMAL(3,1),         -- e.g., 8.5

  readiness_breakdown JSONB,                   -- { academic: 5.5, extracurricular: 3.5, ... }

  -- Target Schools
  target_schools JSONB,                        -- [{ name: "Boston University", tier: "reach" }, ...]

  -- Timeline
  start_date DATE,
  target_graduation_date DATE,
  total_weeks INTEGER,

  -- Context
  school_name VARCHAR(255),
  school_context JSONB,                        -- { ranking: 210, ap_participation: 52, ... }

  -- Full document (if needed for quick retrieval)
  full_game_plan_document JSONB
);

CREATE INDEX idx_game_plans_student ON game_plans(student_id);
CREATE INDEX idx_game_plans_status ON game_plans(status);
```

**2. game_plan_phases**
```sql
CREATE TABLE game_plan_phases (
  phase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id UUID NOT NULL REFERENCES game_plans(game_plan_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Phase Info
  phase_number INTEGER NOT NULL,               -- 1, 2, 3, 4
  phase_name VARCHAR(255),                     -- "Exploration & Convergence"
  phase_description TEXT,

  -- Timeline
  start_date DATE,
  end_date DATE,
  start_week_number INTEGER,
  end_week_number INTEGER,

  -- Status
  status VARCHAR(50),                          -- not_started, in_progress, completed
  completion_percentage DECIMAL(5,2),          -- 0.00 to 100.00

  -- Goals
  phase_goals JSONB,                           -- [{ goal_id, title, description, expected_outcome, completion_%, ... }]

  -- Expected Outcomes
  expected_outcomes JSONB,                     -- [{ outcome_id, title, criteria, status, ... }]

  -- Progress Metrics
  total_outcomes INTEGER DEFAULT 0,
  completed_outcomes INTEGER DEFAULT 0,
  total_execution_items INTEGER DEFAULT 0,
  completed_execution_items INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  total_allocated_hours DECIMAL(10,2),
  actual_hours_spent DECIMAL(10,2)
);

CREATE INDEX idx_phases_game_plan ON game_plan_phases(game_plan_id);
CREATE INDEX idx_phases_status ON game_plan_phases(status);
```

**3. weak_spots**
```sql
CREATE TABLE weak_spots (
  weak_spot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id UUID NOT NULL REFERENCES game_plans(game_plan_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identification
  weak_spot_number INTEGER,                    -- 1, 2, 3, ...
  title VARCHAR(500),                          -- "Lack of Extracurricular Depth"
  description TEXT,

  -- Prioritization
  priority_level VARCHAR(10),                  -- P0, P1, P2, P3
  why_high_priority TEXT,
  feasibility VARCHAR(20),                     -- HIGH, MEDIUM, LOW
  expected_impact TEXT,

  -- ROI Calculation
  impact_score DECIMAL(5,2),                   -- 0-100 (subjective or calculated)
  effort_score DECIMAL(5,2),                   -- 0-100
  roi_score DECIMAL(5,2),                      -- impact_score / effort_score

  -- Progress
  status VARCHAR(50),                          -- not_started, in_progress, addressed, completed
  completion_percentage DECIMAL(5,2),

  -- Links
  addressed_in_phases INTEGER[],               -- [2, 3] means Phase 2 and 3 address this
  related_outcome_ids UUID[],                  -- Links to weekly outcomes
  related_goal_ids UUID[]                      -- Links to phase goals
);

CREATE INDEX idx_weak_spots_game_plan ON weak_spots(game_plan_id);
CREATE INDEX idx_weak_spots_priority ON weak_spots(priority_level);
CREATE INDEX idx_weak_spots_status ON weak_spots(status);
```

**4. college_application_mapping**
```sql
CREATE TABLE college_application_mapping (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  game_plan_id UUID REFERENCES game_plans(game_plan_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Application Section
  application_type VARCHAR(50),                -- common_app, uc_app, coalition_app
  section_type VARCHAR(100),                   -- activities, personal_essay, piq_3, additional_info
  section_number INTEGER,                      -- For activities (1-10), PIQs (1-8)

  -- Content
  title VARCHAR(500),
  content_draft TEXT,
  word_count INTEGER,
  character_count INTEGER,

  -- Evidence from Game Plan
  evidence_sources JSONB,                      -- [{ type: "phase_goal", id: "...", title: "...", completion: 60 }, ...]

  -- Progress
  readiness_percentage DECIMAL(5,2),           -- How ready is this section? 0-100
  status VARCHAR(50),                          -- not_started, drafting, reviewing, finalized

  -- Gaps
  still_needed TEXT[],                         -- ["Competition awards", "Published results"]

  -- Coach Notes
  coach_notes TEXT,
  last_reviewed_by_coach_id UUID REFERENCES coaches(id),
  last_reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_app_mapping_student ON college_application_mapping(student_id);
CREATE INDEX idx_app_mapping_game_plan ON college_application_mapping(game_plan_id);
CREATE INDEX idx_app_mapping_type_section ON college_application_mapping(application_type, section_type);
```

**5. Enhance existing weekly_action_plans table**
```sql
-- Add columns to existing weekly_action_plans
ALTER TABLE weekly_action_plans
ADD COLUMN game_plan_id UUID REFERENCES game_plans(game_plan_id),
ADD COLUMN phase_id UUID REFERENCES game_plan_phases(phase_id),
ADD COLUMN week_number_in_game_plan INTEGER,
ADD COLUMN week_focus TEXT,                    -- "Launch passion project website"
ADD COLUMN links_to_phase_goals UUID[],        -- Array of goal IDs from game_plan_phases
ADD COLUMN addresses_weak_spots UUID[];        -- Array of weak_spot_ids

-- Add indexes
CREATE INDEX idx_weekly_action_plans_game_plan ON weekly_action_plans(game_plan_id);
CREATE INDEX idx_weekly_action_plans_phase ON weekly_action_plans(phase_id);
```

**6. Enhance existing weekly_outcomes table**
```sql
-- Add columns to existing weekly_outcomes
ALTER TABLE weekly_outcomes
ADD COLUMN links_to_phase_goal_id UUID,        -- Which phase goal does this support?
ADD COLUMN addresses_weak_spot_id UUID REFERENCES weak_spots(weak_spot_id),
ADD COLUMN contributes_to_application_section_ids UUID[], -- Array of mapping_ids
ADD COLUMN success_criteria JSONB,             -- [{ criterion: "...", met: true/false }, ...]
ADD COLUMN roi_justification TEXT;             -- Why this outcome matters

-- Add indexes
CREATE INDEX idx_weekly_outcomes_phase_goal ON weekly_outcomes(links_to_phase_goal_id);
CREATE INDEX idx_weekly_outcomes_weak_spot ON weekly_outcomes(addresses_weak_spot_id);
```

---

### Entity Relationships

```
game_plans
├── game_plan_phases (1:N)
│   ├── weekly_action_plans (1:N) via phase_id
│   │   ├── weekly_outcomes (1:N)
│   │   │   ├── weekly_execution_items (1:N)
│   │   │   │   └── weekly_tasks (1:N)
│   └── phase_goals (embedded in JSONB)
│
├── weak_spots (1:N)
│   └── linked to weekly_outcomes (N:M via addresses_weak_spot_id)
│
└── college_application_mapping (1:N)
    └── evidence_sources → weekly_outcomes, phase_goals, etc.

students
├── game_plans (1:N)
└── weekly_action_plans (1:N)
```

---

## Part 5: API Endpoints Specification

### Game Plan APIs

**1. GET /api/v10/students/:studentId/game-plan**

Returns the complete game plan for a student.

Response:
```json
{
  "game_plan_id": "uuid",
  "student_id": "uuid",
  "plan_version": "v1.0",
  "status": "active",

  "readiness_scores": {
    "initial": 4.5,
    "current": 7.2,
    "target": 8.5,
    "breakdown": {
      "academic": { "initial": 5.5, "current": 8.5, "target": 9.0 },
      "extracurricular": { "initial": 3.5, "current": 7.8, "target": 8.5 },
      "personal_story": { "initial": 5.0, "current": 6.5, "target": 7.5 },
      "institutional_fit": { "initial": 4.0, "current": 6.0, "target": 8.0 }
    }
  },

  "target_schools": [
    { "name": "Boston University", "tier": "reach", "acceptance_rate": 14 },
    { "name": "UC Berkeley", "tier": "reach", "acceptance_rate": 11 },
    { "name": "UCLA", "tier": "reach", "acceptance_rate": 9 }
  ],

  "timeline": {
    "start_date": "2025-05-01",
    "target_graduation_date": "2028-06-15",
    "total_weeks": 156,
    "current_week": 45
  },

  "phases": [
    {
      "phase_id": "uuid",
      "phase_number": 1,
      "phase_name": "Exploration & Convergence",
      "start_date": "2025-05-01",
      "end_date": "2025-12-31",
      "status": "completed",
      "completion_percentage": 100.0,
      "goals_summary": "3/3 goals completed",
      "outcomes_summary": "15/15 outcomes achieved"
    },
    {
      "phase_id": "uuid",
      "phase_number": 2,
      "phase_name": "Deepening & Achieving",
      "start_date": "2026-01-01",
      "end_date": "2026-08-31",
      "status": "in_progress",
      "completion_percentage": 45.0,
      "goals_summary": "1/3 goals completed, 2 in progress",
      "outcomes_summary": "12/20 outcomes completed"
    }
  ],

  "weak_spots_summary": {
    "total": 7,
    "p0_count": 5,
    "p1_count": 2,
    "addressed": 3,
    "in_progress": 2,
    "not_started": 2
  },

  "overall_progress": {
    "total_outcomes": 65,
    "completed_outcomes": 27,
    "total_execution_items": 184,
    "completed_execution_items": 89,
    "total_tasks": 456,
    "completed_tasks": 267,
    "completion_percentage": 58.5
  },

  "at_risk_items": [
    {
      "type": "outcome",
      "id": "uuid",
      "title": "Chemical Engineering internship application",
      "priority": "P0",
      "deadline": "2025-11-01",
      "days_until_deadline": 5,
      "status": "not_started",
      "phase": "Phase 2",
      "week": 45
    }
  ]
}
```

**2. GET /api/v10/students/:studentId/game-plan/phases/:phaseId**

Returns detailed information for a specific phase.

Response:
```json
{
  "phase_id": "uuid",
  "phase_number": 2,
  "phase_name": "Deepening & Achieving",
  "phase_description": "Narrow focus to 1-2 primary pathways...",

  "timeline": {
    "start_date": "2026-01-01",
    "end_date": "2026-08-31",
    "start_week_number": 30,
    "end_week_number": 70,
    "current_week_in_phase": 15,
    "total_weeks_in_phase": 40
  },

  "status": "in_progress",
  "completion_percentage": 45.0,

  "goals": [
    {
      "goal_id": "uuid",
      "goal_number": 1,
      "title": "Narrow to 1-2 academic pathways",
      "description": "Based on exploration findings...",
      "completion_percentage": 60.0,
      "status": "in_progress",

      "sub_items": [
        {
          "item_id": "uuid",
          "title": "Completed 5+ informational interviews",
          "status": "completed",
          "completed_date": "2026-02-15"
        },
        {
          "item_id": "uuid",
          "title": "Shadowed chemical engineer at BASF",
          "status": "completed",
          "completed_date": "2026-03-10"
        },
        {
          "item_id": "uuid",
          "title": "Complete online ChemE course",
          "status": "in_progress",
          "deadline": "2026-11-15",
          "progress_percentage": 40
        }
      ],

      "expected_outcome": "Clear direction on Chemical Eng vs CS vs Healthcare by January 2027",

      "related_weeks": [30, 35, 40, 45],
      "addresses_weak_spots": ["uuid1", "uuid2"]
    }
  ],

  "expected_outcomes_by_end": [
    {
      "outcome_id": "uuid",
      "title": "Academic Direction: Selected course pathway with 3-4 AP/advanced courses",
      "status": "completed",
      "completion_date": "2026-06-01"
    },
    {
      "outcome_id": "uuid",
      "title": "Leadership Position: Officer role + measurable impact",
      "status": "in_progress",
      "progress_percentage": 80
    }
  ],

  "progress_metrics": {
    "outcomes": { "completed": 12, "total": 20, "percentage": 60 },
    "execution_items": { "completed": 34, "total": 56, "percentage": 61 },
    "tasks": { "completed": 89, "total": 145, "percentage": 61 },
    "time": { "spent_hours": 240, "allocated_hours": 400, "percentage": 60 }
  },

  "weak_spots_progress": [
    {
      "weak_spot_id": "uuid",
      "title": "Undecided Academic Direction",
      "priority": "P0",
      "completion_percentage": 60,
      "status": "in_progress"
    }
  ],

  "milestones": [
    {
      "milestone_id": "uuid",
      "title": "Secured MSA Secretary Position",
      "date": "2026-03-15",
      "status": "completed"
    }
  ]
}
```

**3. GET /api/v10/students/:studentId/weak-spots**

Returns all weak spots with progress tracking.

Response:
```json
{
  "weak_spots": [
    {
      "weak_spot_id": "uuid",
      "weak_spot_number": 1,
      "title": "Lack of Extracurricular Depth & Commitment",
      "description": "Limited activities with no leadership...",

      "prioritization": {
        "priority_level": "P0",
        "why_high_priority": "Limited extracurricular engagement; extracurriculars account for 25-30% of UC review",
        "feasibility": "HIGH",
        "expected_impact": "Could transform profile from sparse to compelling with 3-4 significant activities showing progression and leadership"
      },

      "roi_scores": {
        "impact_score": 90,
        "effort_score": 60,
        "roi_score": 1.5
      },

      "progress": {
        "status": "in_progress",
        "completion_percentage": 70,
        "addressed_in_phases": [1, 2],
        "related_outcomes_count": 12,
        "related_goals_count": 3
      },

      "evidence_of_progress": [
        {
          "type": "phase_goal",
          "phase": 2,
          "goal_title": "Establish 3-4 core activities with consistent weekly involvement",
          "status": "completed",
          "completion_date": "2026-05-01"
        },
        {
          "type": "weekly_outcome",
          "week": 42,
          "outcome_title": "Organized MSA interfaith event with 200+ attendees",
          "status": "completed",
          "completion_date": "2026-04-15"
        }
      ],

      "remaining_work": [
        "Secure 2nd leadership role by end of Phase 2",
        "Document measurable impact metrics"
      ]
    }
  ]
}
```

**4. GET /api/v10/students/:studentId/application-mapping**

Returns college application readiness with game plan evidence.

Response:
```json
{
  "application_type": "common_app",

  "activities_section": [
    {
      "activity_number": 1,
      "title": "ChemE for Animal Healthcare Project",
      "position": "Founder & Lead Researcher",
      "years": ["10", "11", "12"],
      "hours_per_week": 10,
      "weeks_per_year": 40,

      "readiness_percentage": 60,
      "status": "in_progress",

      "evidence_from_game_plan": [
        {
          "source_type": "phase_goal",
          "phase": 2,
          "goal_number": 3,
          "goal_title": "Launch signature passion project",
          "completion_percentage": 60
        },
        {
          "source_type": "weekly_outcome",
          "week": 45,
          "outcome_title": "Built project website",
          "status": "completed",
          "completion_date": "2026-10-25"
        },
        {
          "source_type": "weekly_outcome",
          "week": 50,
          "outcome_title": "Launched pilot with local animal shelter",
          "status": "in_progress",
          "expected_completion": "2026-12-01"
        }
      ],

      "still_needed": [
        "Competition awards (Science Fair, etc.)",
        "Published research results or presentation",
        "Measurable impact data (e.g., animals helped)"
      ],

      "draft_description": "Founded interdisciplinary research project applying chemical engineering principles..."
    }
  ],

  "personal_essay": {
    "word_limit": 650,
    "status": "not_started",
    "readiness_percentage": 25,

    "potential_topics": [
      {
        "topic_title": "The Chemistry of Compassion",
        "angle": "Using ChemE to help animal shelter",
        "evidence_sources": [
          { "type": "phase_goal", "phase": 2, "goal": 3 },
          { "type": "weekly_outcomes", "weeks": [45, 50, 60] }
        ],
        "strength": "Shows STEM + service integration, unique angle",
        "coach_recommendation": "Strong choice - authentic passion evident"
      }
    ]
  },

  "additional_information": {
    "suggested_content": [
      {
        "topic": "Passion project development story",
        "evidence": "Phase 2 detailed journey from ideation to implementation",
        "word_count_estimate": 150
      }
    ]
  }
}
```

**5. PATCH /api/v10/students/:studentId/game-plan/readiness-score**

Updates readiness scores (manual override by coach).

Request:
```json
{
  "current_readiness_score": 7.5,
  "readiness_breakdown": {
    "academic": 8.5,
    "extracurricular": 8.0,
    "personal_story": 6.5,
    "institutional_fit": 6.5
  },
  "updated_by_coach_id": "uuid",
  "update_reason": "Completed Phase 2 goals, significantly improved extracurricular depth and leadership"
}
```

**6. POST /api/v10/weekly-outcomes/:outcomeId/link-to-game-plan**

Links a weekly outcome to phase goals, weak spots, and application sections.

Request:
```json
{
  "links_to_phase_goal_id": "uuid",
  "addresses_weak_spot_id": "uuid",
  "contributes_to_application_section_ids": ["uuid1", "uuid2"],
  "success_criteria": [
    { "criterion": "Website live with 5+ pages", "met": true },
    { "criterion": "Mobile-responsive design", "met": true },
    { "criterion": "50+ visitors in first week", "met": false }
  ],
  "roi_justification": "Building online presence for passion project creates portfolio piece for college applications and demonstrates technical + creative skills"
}
```

---

## Part 6: Implementation Roadmap

### Phase 1: Data Model & Backend (Week 1-2)

**Tasks:**
1. Create new database tables (game_plans, game_plan_phases, weak_spots, college_application_mapping)
2. Add columns to existing tables (weekly_action_plans, weekly_outcomes)
3. Write migration scripts
4. Implement CRUD APIs for game plan entities
5. Implement linking logic (outcomes → phase goals, weak spots, app sections)
6. Add calculated fields (readiness scores, completion percentages)

**Deliverables:**
- Database schema deployed to dev/staging
- API endpoints functional and tested
- Postman collection for all endpoints
- Sample data for Hiba (test student)

### Phase 2: Game Plan Dashboard UI (Week 3-4)

**Tasks:**
1. Create GamePlanDashboard component
2. Implement readiness score visualization
3. Create phase timeline component
4. Build at-risk items section
5. Add navigation to phase details
6. Integrate with backend APIs
7. Add loading states and error handling

**Deliverables:**
- GamePlanDashboard.tsx component
- Functional dashboard with real data
- Mobile-responsive design

### Phase 3: Phase Detail View UI (Week 5-6)

**Tasks:**
1. Create PhaseDetailView component
2. Implement goals section with sub-items
3. Build timeline/milestones visualization
4. Create progress metrics cards
5. Add weak spots progress section
6. Implement expected outcomes checklist
7. Add drill-down to weekly breakdown

**Deliverables:**
- PhaseDetailView.tsx component
- Full phase view with navigation
- Export phase report functionality

### Phase 4: Enhanced Preparation Tab (Week 7-8)

**Tasks:**
1. Enhance WeeklyActionPlanCard with context header
2. Add upward links (phase goals, weak spots, app sections)
3. Implement college application impact section
4. Add success criteria display
5. Create ROI justification tooltips
6. Add "View in Phase Roadmap" navigation

**Deliverables:**
- Enhanced WeeklyActionPlanCard.tsx
- Full hierarchical linking functional
- Context-aware navigation working

### Phase 5: College Application Mapping UI (Week 9-10)

**Tasks:**
1. Create CollegeApplicationMapping component
2. Implement activities section (10 slots)
3. Build evidence display from game plan
4. Create readiness percentage calculation
5. Add "still needed" items tracking
6. Implement essay topics section
7. Add draft preview functionality

**Deliverables:**
- CollegeApplicationMapping.tsx component
- Activities-to-gameplan mapping functional
- Essay topic suggestions working

### Phase 6: Coach Tools & Analytics (Week 11-12)

**Tasks:**
1. Create coach dashboard for game plan management
2. Implement game plan creation wizard
3. Build weak spot analyzer tool
4. Create readiness score calculator
5. Implement progress tracking analytics
6. Add automated alerts for at-risk items

**Deliverables:**
- Coach-facing game plan tools
- Analytics dashboard
- Automated monitoring system

### Phase 7: Testing & Polish (Week 13-14)

**Tasks:**
1. End-to-end testing of all flows
2. User acceptance testing with real students/coaches
3. Performance optimization
4. Mobile responsiveness final touches
5. Accessibility improvements
6. Documentation and training materials

**Deliverables:**
- Production-ready system
- Test reports
- User documentation
- Training videos

---

## Part 7: Visual Design System

### Color Palette

**Primary Colors:**
- IvyLevel Red: `#FF5733` (main brand, CTAs, alerts)
- IvyLevel Gold: `#FFC300` (secondary actions, highlights)

**Status Colors:**
- Completed: `#28a745` (green)
- In Progress: `#007bff` (blue)
- Not Started: `#6c757d` (gray)
- Blocked: `#dc3545` (red)
- At Risk: `#ffc107` (yellow/amber)

**Priority Colors:**
- P0 (Critical): `#dc3545` (red)
- P1 (High): `#ffc107` (yellow)
- P2 (Medium): `#17a2b8` (cyan)
- P3 (Low): `#6c757d` (gray)

**Domain Colors:**
- Academic: `#6f42c1` (purple)
- Test Preparation: `#fd7e14` (orange)
- Extracurricular: `#20c997` (teal)
- Application: `#e83e8c` (pink)
- Creative Project: `#17a2b8` (cyan)
- Service: `#28a745` (green)

**Background Colors:**
- Page Background: `#FAFAFA`
- Card Background: `#FFFFFF`
- Hover Background: `#f8f9fa`
- Section Background: `#e9ecef`

### Typography

**Font Family:**
- Primary: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- Monospace (for data): `'SF Mono', Monaco, 'Courier New', monospace`

**Font Sizes:**
- Page Title: `32px` (bold)
- Section Title: `24px` (bold)
- Card Title: `18px` (600 weight)
- Body Text: `14px` (normal)
- Small Text: `12px` (normal)
- Tiny Text: `11px` (normal)

### Spacing System

- Base unit: `4px`
- Spacing scale: `4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px`
- Card padding: `24px`
- Section margin: `16px` (between cards)
- Inner spacing: `12px` (within cards)

### Component Patterns

**Progress Bars:**
- Height: `8px` (overall), `6px` (sub-items), `4px` (mini)
- Border radius: `4px`
- Background: `#e9ecef`
- Fill: Gradient or solid based on status color
- Animated on load (0.3s ease)

**Badges:**
- Padding: `2px 8px`
- Border radius: `10px` (pill shape)
- Font size: `11px`
- Font weight: `500`
- Background: Status/priority/domain color
- Text color: `white` (with sufficient contrast)

**Cards:**
- Background: `white`
- Border radius: `8px`
- Box shadow: `0 2px 8px rgba(0,0,0,0.1)`
- Hover: Slight transform or shadow increase
- Border-left accent: `3px` solid (status/priority color)

**Buttons:**
- Primary: `#FF5733` background, `white` text
- Secondary: `#6c757d` background, `white` text
- Outline: `#FF5733` border, `#FF5733` text
- Height: `40px`
- Padding: `12px 24px`
- Border radius: `6px`
- Font size: `14px`
- Font weight: `600`

### Icons

**Library:** Lucide React (consistent with current implementation)

**Common Icons:**
- Target: `Target` (goals, outcomes)
- Calendar: `Calendar` (dates, deadlines)
- CheckCircle: `CheckCircle` (completed items)
- Clock: `Clock` (in progress, pending)
- AlertCircle: `AlertCircle` (blocked, at-risk)
- TrendingUp: `TrendingUp` (progress, growth)
- Award: `Award` (achievements, milestones)
- Book: `Book` (academic)
- Users: `Users` (extracurricular, service)
- FileText: `FileText` (application, essays)
- Zap: `Zap` (priority, urgency)

---

## Part 8: Success Criteria & Metrics

### User Success Metrics

**For Students:**
- Can understand overall progress at a glance (< 5 seconds)
- Can navigate from weekly task to ultimate college goal (< 3 clicks)
- Can see application readiness for each Common App section
- Feels motivated by visible progress and clear path forward

**For Coaches:**
- Can create comprehensive game plan in < 2 hours (with wizard)
- Can identify at-risk students/items in < 30 seconds
- Can track student progress across all dimensions
- Can generate application-ready evidence for each student

### Technical Success Metrics

**Performance:**
- Game Plan Dashboard loads in < 2 seconds
- Phase Detail View renders in < 1 second
- All API endpoints respond in < 500ms (p95)
- Database queries optimized (< 100ms for most)

**Data Integrity:**
- 100% of weekly outcomes link to phase goals
- 100% of phase goals link to weak spots
- 100% of application sections have evidence sources
- Readiness scores recalculate automatically on updates

**Scalability:**
- Support 1000+ concurrent students
- Handle 3-4 years of data per student (156+ weeks)
- Efficient queries even with 10,000+ outcomes per student

---

## Part 9: Future Enhancements

### Version 2.0 (Post-Launch)

**AI-Powered Features:**
- Automated game plan generation from assessment data
- Predictive analytics for college admission chances
- Intelligent suggestions for next steps
- Natural language interface for game plan exploration

**Coach Collaboration:**
- Multi-coach assignments (primary + specialty coaches)
- Coach notes and recommendations
- Version control for game plan changes
- Automated progress reports to parents

**Student Engagement:**
- Gamification elements (badges, streaks, leaderboards)
- Peer comparison (anonymized, opt-in)
- Motivational notifications and reminders
- Student self-reflection journal

**Advanced Analytics:**
- Correlation analysis (which strategies lead to best outcomes?)
- Cohort analysis (how do students with similar profiles perform?)
- Time allocation optimization
- ROI analysis for different activities

### Version 3.0 (Long-term Vision)

**Platform Expansion:**
- Graduate school application support
- Career planning beyond college
- Alumni network integration
- Parent portal with read-only access

**Integrations:**
- Common App API (direct submission)
- Naviance integration
- Google Calendar sync
- Notion/Evernote export

**Machine Learning:**
- Personalized recommendations based on successful patterns
- Automated essay feedback and suggestions
- Optimal time allocation algorithms
- Admissions outcome prediction models

---

## Appendix A: Sample Data Structures

### Sample Game Plan JSON
```json
{
  "game_plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "student_id": "123e4567-e89b-12d3-a456-426614174000",
  "plan_version": "v1.0",
  "status": "active",

  "student_context": {
    "name": "Hiba Shaikh",
    "current_grade": 9,
    "school": "Mountain House High School",
    "school_ranking": 210,
    "gpa": 3.8
  },

  "assessment": {
    "assessment_date": "2025-04-29",
    "readiness_scores": {
      "initial": 4.5,
      "current": 4.5,
      "target": 8.5,
      "breakdown": {
        "academic": { "initial": 5.5, "current": 5.5, "target": 9.0 },
        "extracurricular": { "initial": 3.5, "current": 3.5, "target": 8.5 },
        "personal_story": { "initial": 5.0, "current": 5.0, "target": 7.5 },
        "institutional_fit": { "initial": 4.0, "current": 4.0, "target": 8.0 }
      }
    }
  },

  "target_schools": [
    { "name": "Boston University", "tier": "reach", "acceptance_rate": 14 },
    { "name": "UC Berkeley", "tier": "reach", "acceptance_rate": 11 },
    { "name": "UCLA", "tier": "reach", "acceptance_rate": 9 },
    { "name": "UC Davis", "tier": "target", "acceptance_rate": 37 },
    { "name": "UC Irvine", "tier": "target", "acceptance_rate": 21 }
  ],

  "weak_spots": [
    {
      "weak_spot_id": "uuid1",
      "weak_spot_number": 1,
      "title": "Lack of Extracurricular Depth & Commitment",
      "description": "Limited activities with no leadership or sustained involvement",
      "priority_level": "P0",
      "why_high_priority": "Extracurriculars account for 25-30% of UC review; currently sparse profile",
      "feasibility": "HIGH",
      "expected_impact": "Could transform profile from sparse to compelling with 3-4 significant activities showing progression and leadership",
      "roi_score": 1.5,
      "status": "not_started",
      "completion_percentage": 0,
      "addressed_in_phases": [1, 2]
    }
  ],

  "phases": [
    {
      "phase_id": "uuid-phase-1",
      "phase_number": 1,
      "phase_name": "Exploration & Convergence",
      "start_date": "2025-05-01",
      "end_date": "2025-12-31",
      "start_week_number": 1,
      "end_week_number": 30,
      "status": "not_started",
      "completion_percentage": 0,

      "goals": [
        {
          "goal_id": "uuid-goal-1-1",
          "goal_number": 1,
          "title": "Identify potential academic pathways aligned with interests",
          "description": "Explore chemical engineering, healthcare, animal sciences through hands-on experiences",
          "expected_outcome": "Determined 2-3 specific academic areas of focus with supporting course plan",
          "completion_percentage": 0,
          "status": "not_started",

          "sub_items": [
            {
              "sub_item_id": "uuid-sub-1-1-1",
              "title": "Complete 5+ informational interviews across fields",
              "status": "not_started",
              "deadline": "2025-08-31"
            },
            {
              "sub_item_id": "uuid-sub-1-1-2",
              "title": "Participate in 2+ summer programs/workshops",
              "status": "not_started",
              "deadline": "2025-09-01"
            }
          ],

          "addresses_weak_spots": ["uuid1", "uuid3"]
        }
      ]
    }
  ]
}
```

---

## Appendix B: Coach Game Plan Creation Wizard

### Wizard Flow

**Step 1: Student Assessment Input**
- Import assessment data (readiness scores, weak spots)
- Or manual entry if no assessment exists
- Validate all required fields

**Step 2: Target Schools & Timeline**
- Select target schools (search + add)
- Set graduation date
- Calculate total weeks
- Confirm phase structure (default 4 phases, can customize)

**Step 3: Weak Spot Identification & Prioritization**
- List all weak spots (title, description)
- Assign priority (P0, P1, P2, P3)
- Set feasibility (HIGH, MEDIUM, LOW)
- Describe expected impact
- System calculates ROI score

**Step 4: Phase Goals Setup**
- For each phase:
  - Name the phase
  - Set date range
  - Add 3-5 goals
  - For each goal:
    - Title, description
    - Expected outcome
    - Sub-items (tactical steps)
    - Link to weak spots being addressed

**Step 5: Summer Program & Opportunity Research**
- System suggests programs based on student profile
- Coach can add custom opportunities
- Include URLs, deadlines, application requirements

**Step 6: Review & Finalize**
- Preview entire game plan
- Generate PDF version
- Share with student/parents
- Activate game plan (status: "active")

### Wizard Components (Code Snippets)

```tsx
// GamePlanWizard.tsx (high-level structure)

interface WizardStep {
  number: number;
  title: string;
  component: React.ComponentType<any>;
  isValid: () => boolean;
}

const wizardSteps: WizardStep[] = [
  {
    number: 1,
    title: "Student Assessment",
    component: AssessmentInputStep,
    isValid: () => validateAssessment()
  },
  {
    number: 2,
    title: "Target Schools & Timeline",
    component: TargetSchoolsStep,
    isValid: () => validateTargetSchools()
  },
  {
    number: 3,
    title: "Weak Spots",
    component: WeakSpotsStep,
    isValid: () => validateWeakSpots()
  },
  {
    number: 4,
    title: "Phase Goals",
    component: PhaseGoalsStep,
    isValid: () => validatePhaseGoals()
  },
  {
    number: 5,
    title: "Opportunities",
    component: OpportunitiesStep,
    isValid: () => true // Optional step
  },
  {
    number: 6,
    title: "Review & Finalize",
    component: ReviewStep,
    isValid: () => true
  }
];

export function GamePlanWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [gamePlanData, setGamePlanData] = useState<Partial<GamePlan>>({});

  const CurrentStepComponent = wizardSteps[currentStep - 1].component;

  return (
    <WizardContainer>
      <WizardProgress steps={wizardSteps} currentStep={currentStep} />
      <CurrentStepComponent
        data={gamePlanData}
        onUpdate={(updates) => setGamePlanData({ ...gamePlanData, ...updates })}
        onNext={() => setCurrentStep(currentStep + 1)}
        onBack={() => setCurrentStep(currentStep - 1)}
      />
    </WizardContainer>
  );
}
```

---

## Conclusion

This specification provides a comprehensive blueprint for implementing the Precision Roadmap UI - a first-principles, hierarchical, data-driven system that connects long-term strategic planning with weekly execution.

**Key Innovations:**
1. **Hierarchical Linking:** Every task traces to ultimate college goals
2. **ROI-Based Prioritization:** Focus on highest-impact activities
3. **Readiness Scoring:** Quantitative progress tracking
4. **College Application Mapping:** Direct evidence from game plan to application
5. **168-Hour Framework:** Realistic time allocation
6. **Coach & Student Views:** Tailored interfaces for each role

**Next Steps:**
1. **Review & Approval:** Stakeholder review of this specification
2. **Technical Refinement:** Backend team review of data model
3. **Design Mockups:** Create high-fidelity Figma designs
4. **Sprint Planning:** Break down into 2-week sprints
5. **Implementation:** Follow the phased roadmap (14 weeks)

**Questions for Stakeholders:**
- Is the readiness scoring methodology acceptable?
- Should we include parent-facing views?
- Are there additional application types beyond Common App / UC?
- What analytics/reports do coaches need most?
- Should students be able to self-update progress, or coach-only?

---

**Document Status:** DRAFT - AWAITING APPROVAL
**Next Review:** [Date]
**Approved By:** [Name]
**Implementation Start Date:** [Date]

---

*This specification is a living document and will be updated as implementation progresses and new requirements emerge.*
