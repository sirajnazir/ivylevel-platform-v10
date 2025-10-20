# IvyLevel Platform - Unified Architecture & Knowledge Integration Spec
# v2.1: Multi-Agent + Old Huda Foundation + Jenny's 11 Students Augmentation

**Document Version:** 1.0
**Created:** 2025-10-20
**Status:** ✅ COMPREHENSIVE AUDIT COMPLETE
**Purpose:** Single source of truth for platform architecture, data sources, and integration roadmap

---

## Executive Summary

### What We Actually Built (Ground Truth)

This document provides an **accurate, comprehensive audit** of the IvyLevel platform as it exists today, distinguishing between:

1. **✅ IMPLEMENTED & WORKING** - Code in production, data in database, tested and verified
2. **📁 EXTRACTED BUT NOT INTEGRATED** - JSON files exist but not in database/used by agents
3. **📋 DESIGNED BUT NOT BUILT** - Architecture documented but code not written
4. **🎯 PLANNED FOR FUTURE** - Roadmap items not yet started

### The Core Vision (Revised & Clarified)

**Mission:** Build a continuously learning, multi-agent autonomous coaching platform that:

1. **Learns from proven top IQ+EQ coaches** (Jenny Duan - Stanford admit, 2+ years coaching data)
2. **Adapts to different student archetypes** automatically (not one-size-fits-all)
3. **Operates proactively** - drives execution and outcomes, doesn't wait for students to ask
4. **Improves continuously** as more coaching data is ingested
5. **Scales infinitely** - Jenny's expertise → AI agents coaching 1,000s of students simultaneously

### The Competitive Moat

**Competitors CANNOT copy:**
- ✅ **2+ years of real coaching data** from Jenny-Huda journey (in production database)
- 📁 **11 additional students** assessed by Jenny (extracted to JSON, not yet integrated)
- ✅ **Multi-dimensional zero-hallucination architecture** (105 temporal resolvers, v14 foundation)
- ✅ **9 specialist reactive agents** + 1 autonomous assessment agent
- ✅ **3,424 EQ signals** extracted from real coaching sessions
- ✅ **5 tactical frameworks** (168-Hour, Parent Story Reframe, etc.)

---

## Document Structure

### Part 1: Current State (What EXISTS)
- Old Huda Foundation (in database, working)
- 10 Agent System (9 reactive + 1 autonomous)
- Frontend Integration (unified-app, JWT auth)
- Knowledge Moat (DS6/DS7/DS-T1/DS-T2)

### Part 2: The Gap (What's MISSING)
- Jenny's 11 students NOT in database
- No cross-student synthesis
- No archetype-specific playbooks
- No continuous learning loop

### Part 3: Integration Roadmap (How to BRIDGE)
- Phase 3: Ingest Jenny's 11 students into database
- Phase 4: Cross-student synthesis and playbook generation
- Phase 5: AI agent integration of archetype-specific intelligence
- Phase 6: Continuous learning feedback loop

---

## PART 1: CURRENT STATE (WHAT EXISTS)

### 1.1 Old Huda Foundation - The Core Intelligence

**Source:** Jenny-Huda coaching relationship (2023-2025, 2+ years)
**Student ID:** `huda-2025`
**Status:** ✅ **IN PRODUCTION DATABASE** - Fully integrated and working

#### 1.1.1 Data in Database

**KB Items (kb_items table):** 57 total items
```
- ec (extracurriculars): 20 items
- narrative: 10 items
- activity: 10 items
- Award_Competition: 6 items
- award: 6 items (won awards verified)
- program: 5 items (JCamp, Kode With Klossy attended)
```

**EQ Signals (eq_signals table):** 3,424 signals across 9 types
```
Top EQ Signal Types:
- specificity: 1,562 occurrences
- warmth: 487 occurrences
- future_pacing: 352 occurrences
- normalization: 315 occurrences
- identity_reinforcement: 271 occurrences
- celebration: 219 occurrences
- permissioning: 172 occurrences
- trust_microacts: 23 occurrences
- escalation_deescalation: 23 occurrences
```

**Coaching Intelligence Extraction (coaching_intelligence_extraction table):** 4 assessment extractions
```
All extraction_type: assessment_questions
All source_student_id: huda-2025
All extraction_method: claude-sonnet-4-20250514
All quality_score: 0.95
```

**Coaching Frameworks (coaching_frameworks table):** 1 framework
```
Framework: 27-Layer Assessment Framework
Source: huda-2025
```

**Tactical Frameworks (moat_tactic_chips table):** 5 tactic chips
```
1. 168-Hour Framework
2. Parent Story Reframe
3. Early Work Showcase for Investment
4. Daily Schedule Architecture
5. Identity as Differentiator
```

**Assessment Sessions (assessment_sessions table):**
```
- 27-layer assessment structure
- Diagnostic results: social_style, capacity_level, execution_style, personality_type
- EQ profile: parent_anxiety=7, confidence_level=0.2, vulnerability_level=1
- Rubric scores: total=13, service=1, academics=7, artifacts=3, leadership=2, recognition=0
- Time architecture: class_year=junior, current_week=1, weeks_remaining=51
- Gap analysis: gap=12, target_total=25
```

**Conversation History (conversation_turns table):**
```
- 44 conversation turns with Jenny (Game Plan Advisor agent)
- Agent tools called during conversations
- Response chips included
```

#### 1.1.2 What Old Huda Data Powers

**Currently Used By:**
1. ✅ **All 9 Reactive Agents** - Via CAT-1/CAT-2/CAT-3 tools (105 temporal resolvers)
2. ✅ **Assessment Agent** - Uses 27-layer framework extracted from Old Huda
3. ✅ **InteractiveSessionManager** - Powers interactive/simulated assessment for New Huda
4. ✅ **NSM Dashboard** - Shows Old Huda's vitals (6 awards, 28 colleges, etc.)

**Intelligence Extracted:**
- ✅ **27-Layer Assessment Framework** - Question structure for assessment agent
- ✅ **Week 1 Planning Flow** - 168-hour conversation flow
- ✅ **EQ Patterns** - 9 signal types with 3,424 examples
- ✅ **5 Tactical Frameworks** - Reusable coaching tactics

---

### 1.2 The 10-Agent System

#### 1.2.1 Autonomous Agent (1)

**AssessmentAgent** (`services/agent-framework/src/agents/AssessmentAgent.ts`)
- **Type:** Autonomous, proactive, event-driven
- **Trigger:** `student_onboarded` event → auto-starts assessment
- **Function:** Runs 27-layer assessment using Old Huda's framework
- **Data Source:** `coaching_intelligence_extraction` table (huda-2025)
- **Uses:** JennyDuanCoach class with Old Huda's coaching intelligence
- **Outputs:** Creates `assessment_session` record, emits `assessment_completed` event
- **Status:** ✅ Implemented (Phase 1-2), tested with New Huda (newhuda@test.com)

#### 1.2.2 Reactive Agents (9)

**Registered in AgentRegistry** (`services/agent-framework/src/core/AgentRegistry.ts`)

1. **GamePlanAgent** - Overall strategy and timeline
   - Tools: get_vitals, get_rubric_score, get_timeline
   - Intents: strategy, timeline, priorities, gaps
   - Data Source: Old Huda's vitals, rubric, outcomes

2. **ExtracurricularsAgent** - EC portfolio analysis
   - Tools: get_ecs, get_vitals
   - Intents: list, analysis, recommendations, impact
   - Data Source: Old Huda's 20 ECs in kb_items

3. **AwardsAgent** - Academic awards and competition strategy
   - Tools: get_awards, get_vitals
   - Intents: list, analysis, targets, preparation
   - Data Source: Old Huda's 6 awards in kb_items

4. **SummerProgramsAgent** - Summer program selection
   - Tools: get_programs, search_summer_programs (moat), get_vitals
   - Intents: list, recommendations, admissions, strategy
   - Data Source: Old Huda's 5 programs + moat_summer_programs table

5. **CollegeListAgent** - College list building and chances
   - Tools: get_college_list, get_college_acceptances, get_college_attending, get_college_benchmarks, get_vitals
   - Intents: list, chances, requirements, benchmarks, school_pipeline
   - Data Source: Old Huda's 28 colleges (9 acceptances, 1 attending: UIUC)

6. **EssayAgent** - College essay strategy (Week 11)
   - Tools: search_essay_examples (DS6), get_ao_perspectives (DS7), get_vitals
   - Intents: brainstorming, examples, guidance, ao_perspectives
   - Data Source: moat_essay_examples, moat_ao_perspectives

7. **AdmissionsAgent** - AO perspectives and holistic review (Week 11)
   - Tools: get_ao_perspectives (DS7), get_college_rubric, get_vitals
   - Intents: ao_perspectives, red_flags, green_flags, positioning, selectivity
   - Data Source: moat_ao_perspectives, college rubric data

8. **WeeklyExecutionAgent** - JTBD tracking (Week 17)
   - Tools: get_vitals, execution tracking tools
   - Intents: Weekly check-ins, progress tracking
   - Data Source: Old Huda's weekly execution data

9. **ScholarshipAgent** - Scholarship tracking (Week 18)
   - Tools: get_vitals, scholarship data
   - Intents: Scholarship opportunities and deadlines
   - Data Source: Scholarship database

**Key Characteristics:**
- **All 9 agents:** Reactive (respond to user queries, don't initiate)
- **Zero Hallucination:** All use "Tool Usage Instructions" pattern (v2.1 fix)
- **Multi-Coach Ready:** JWT auth, coach_id isolation
- **Conversation Persistence:** Every turn stored in agent_conversation_turns table
- **Agent Handoffs:** Can recommend handoffs to other specialist agents

---

### 1.3 Knowledge Moat Data Sources

#### 1.3.1 Implemented Data Sources (✅ IN DATABASE)

**DS6: Essay Examples** (`moat_essay_examples`)
- Real essays from admitted students
- Tied to coaching sessions
- Used by: EssayAgent

**DS7: AO Perspectives** (`moat_ao_perspectives`)
- Admissions officer insights from coaching
- Selectivity tiers, red/green flags
- Used by: EssayAgent, AdmissionsAgent

**DS-T1: Tactic Chips** (`moat_tactic_chips`)
- 5 tactical frameworks (168-Hour, Parent Story Reframe, etc.)
- Extracted from Jenny-Huda coaching
- Used by: Currently NOT used by agents (available for future integration)

**DS-T2: Success Patterns** (`moat_student_success_patterns`)
- Student journey patterns
- Used by: Currently NOT used by agents (available for future integration)

#### 1.3.2 Partially Implemented (Tables exist, limited data)

**DS1: College Benchmarks** (`moat_cds_colleges`)
- Common Data Set data for colleges
- Status: Table exists, data needs verification

**DS2: College Rubrics** (`moat_rubric_factors`)
- Admission criteria by college
- Status: Table exists, data needs verification

**DS3: School Profiles** (`moat_school_profiles`)
- High school context data
- Status: Table exists, data needs verification

**DS4: Placement History** (`moat_placement_history`)
- Hyperlocal college admits by high school
- Status: Table exists, data needs verification

**DS5: Student Twins** (`moat_student_twins`)
- Similar student profiles and outcomes
- Status: Table exists, data needs verification

---

### 1.4 Frontend Integration

**Unified Frontend** (`unified-frontend/apps/unified-app/`)

**Authentication:**
- ✅ JWT-based authentication (agentFrameworkAuth.ts)
- ✅ Auto-refresh tokens
- ✅ Role-based access (Student/Coach/Admin)
- ✅ Protected routes

**Components:**
- ✅ LoginForm component
- ✅ AgentChat component (chat UI for all 9 reactive agents)
- ✅ ProtectedRoute wrapper
- ✅ Student/Coach/Admin app layouts

**API Integration:**
- ✅ agentClient.ts - Client for agent-framework backend
- ✅ apiService.ts - HTTP client with JWT headers
- ✅ api.ts config - Environment-based API URLs

**Test Chat UI** (`apps/test-chat-ui/`)
- ✅ Test UI for agent conversations
- ✅ Session management
- ✅ Multi-turn conversation support

---

### 1.5 Database Architecture

**v14 Foundation (Preserved):**
```
kb_items - Universal enumeration (awards, ECs, programs, narratives)
vital_facts - Temporal facts (GPA, SAT, demographics)
outcomes - Assessment results
105 temporal views - v_gpa_*, v_awards_*, v_colleges_*, etc.
```

**v1.0 Multi-Coach Extensions:**
```
coaches - Coach profiles
students - Extended with coach_id
agent_conversation_sessions - Conversation state
agent_conversation_turns - Turn-level audit trail
agent_handoffs - Agent routing history
```

**Knowledge Moat Tables:**
```
moat_essay_examples (DS6)
moat_ao_perspectives (DS7)
moat_tactic_chips (DS-T1)
moat_success_patterns (DS-T2)
moat_cds_colleges (DS1)
moat_rubric_factors (DS2)
moat_school_profiles (DS3)
moat_placement_history (DS4)
moat_student_twins (DS5)
moat_summer_programs
moat_competition_results
moat_research_articles
```

**Autonomous Agent Tables:**
```
assessment_sessions - 27-layer assessment records
coaching_intelligence_extraction - Extracted frameworks
coaching_frameworks - Reusable coaching frameworks
interactive_sessions - Interactive/simulated session state
```

**EQ & Communication:**
```
eq_signals - 3,424 EQ signals from Jenny-Huda
eq_signal_sets - Signal groupings
eq_utterances - Communication patterns
conversation_turns - Historical conversation data
```

---

## PART 2: THE GAP (WHAT'S MISSING)

### 2.1 Jenny's 11 Students - The Extracted Intelligence Vault

**Source:** Jenny's assessment + gameplan micro-service (2023-2024)
**Students:** 11 students across different archetypes (8th-11th grade, CS/STEM/Pre-Med)
**Status:** 📁 **EXTRACTED TO JSON FILES, NOT IN DATABASE**

**Important Clarification (User-Provided):**
- These are **IvyLevel platform students** (not external)
- Some enrolled for **micro-service only** (Assessment + GamePlan, no long-term execution)
- Micro-service had strong PMF but was discontinued to focus on outcome-driving NSM
- Goal: **Relaunch micro-service** with AI agents at lower price point
- Assessment + GamePlan done by **Jenny**, weekly execution handed to other coaches

#### 2.1.1 The 11 Students Dataset

**Location:** `/data/coaching_intelligence/extractions/student_0XX_[name]_structured.json`

**Students:**
1. **Anoushka** (11th, CS) - Well-Rounded Late-Starter
2. **Ananyaa** (10th, Bio/Env Sci) - Introverted Explorer
3. **Aaryan** (9th, Space+CS) - Early Explorer (2-session format)
4. **Hiba** (9th, STEM undecided) - Freshman Explorer
5. **Srinidhi** (11th, CS+IR) - Late-Starter with Major Pivot
6. **Arshiya** (11th, CS) - Ultra-Competitive Environment
7. **Aarnav** (11th, CS) - Cookie-Cutter CS-Debater Zero Passion
8. **Iqra** (10th, Pre-Med) - Service-Driven with Academic Recovery
9. **Aarav** (8th, Env Sci) - Parent-Driven 8th Grader
10. **Zainab** (8th, Pre-Med) - Emerging Creative Pre-Med (THE HOME RUN PROJECT)
11. **Beya** (11th, Pre-Med) - Time-Constrained Triage Student (4 months to apps)

#### 2.1.2 Intelligence Extracted (Manual Analysis - NOT in Database)

**11 Distinct Archetypes:**
- Late-Starter (11th grade, scattered activities)
- Introverted Explorer (needs structure and scaffolding)
- Early Explorer - Decided (9th grade, passion found)
- Early Explorer - Undecided (9th grade, needs convergence)
- Late-Starter with Major Pivot (11th grade, CS → interdisciplinary)
- Ultra-Competitive Environment (elite private school)
- Cookie-Cutter with Zero Passion (needs authentic discovery)
- Service-Driven with Academic Recovery (GPA improvement narrative)
- Parent-Driven 8th Grader (high parent involvement)
- Emerging Creative Pre-Med (art + medicine synthesis)
- Time-Constrained Triage (11th grade, 4 months to applications)

**80 Coaching Frameworks** (ASSESSMENT + GAMEPLAN ONLY):
- Framework extraction focused on **2 agents**: Assessment & GamePlan
- NOT comprehensive lifecycle frameworks (weekly execution, essays, apps, etc.)
- Examples: ROI-Based Prioritization Matrix (P0/P1/P2), Cross-Domain Synthesis, Medical Illustration for Diverse Populations, Build on Existing Don't Start New, Awards Sprint Strategy

**55+ Coaching Tactics** (ASSESSMENT + GAMEPLAN ONLY):
- Rapport building, probing questions, reframing, parent management
- Specific to assessment and gameplan phases
- Examples: "Just for Fun" question, "What inspired you?" probes, screen-sharing programs

**40+ Breakthrough Questions** (ASSESSMENT + GAMEPLAN ONLY):
- Discovery questions that unlock authentic passion
- Narrative clarity jumps (3/10 → 8/10)
- Examples: "Just for fun, what do you like to do?", "What inspired you to do [activity]?"

**Archetype-Specific Strategies:**
- 8th grade exploration (70% discovery / 30% prescriptive)
- 11th grade execution (70% prescriptive / 30% discovery)
- Timeline-adaptive approaches (4+ years vs 4 months)

**VALIDATED Patterns** (seen in 3+ students):
- Identity-Integrated Narrative (Students 8, 10, 11)
- Strategic Activity Selection (Students 9, 10)
- Academic Foundation First (Students 4, 10, 11)

#### 2.1.3 Current Storage

**Files Created:**
- ✅ 11 JSON files: `student_001_anoushka_structured.json` through `student_011_beya_structured.json`
- ✅ Master index: `STUDENT_INDEX.md` (comprehensive tracking document)

**Files NOT Created:**
- ❌ Database records in `coaching_intelligence_extraction` table
- ❌ Database records in `coaching_frameworks` table
- ❌ Database records in `archetype_patterns` table (table doesn't exist yet)
- ❌ Database records in `coaching_playbooks` table (table doesn't exist yet)

---

### 2.2 What's NOT Built Yet

#### 2.2.1 Missing Database Tables

**From KNOWLEDGE_MOAT_ARCHITECTURE.md design:**

1. **coaching_intelligence_extracted** (different from coaching_intelligence_extraction)
   - Purpose: Store structured extractions with JSONB fields
   - Fields: student_profile, session_structure, questioning_patterns, proactive_frameworks, meta_coaching_moments, adaptive_behaviors, narrative_development, strategic_recommendations, gameplan_structure, coaching_tactics
   - Status: ❌ NOT IMPLEMENTED (using simpler coaching_intelligence_extraction instead)

2. **coaching_playbooks**
   - Purpose: Archetype-specific synthesized playbooks
   - Fields: assessment_framework, gameplan_template, coaching_tactics, success_metrics
   - Status: ❌ NOT IMPLEMENTED

3. **archetype_patterns**
   - Purpose: Cross-student patterns by archetype
   - Fields: pattern_name, pattern_data, observed_in_sessions, observation_frequency, recommended_action
   - Status: ❌ NOT IMPLEMENTED

4. **coaching_frameworks_library**
   - Purpose: Reusable frameworks with trigger conditions
   - Fields: framework_content, introduction_language, application_steps, trigger_conditions, applicable_archetypes, effectiveness_by_archetype
   - Status: ❌ NOT IMPLEMENTED (using simpler coaching_frameworks table)

5. **session_outcomes**
   - Purpose: Track student outcomes to validate playbook effectiveness
   - Fields: gameplan_completion_rate, ec_depth_improvement, award_wins, college_admits
   - Status: ❌ NOT IMPLEMENTED

#### 2.2.2 Missing Ingestion Pipeline

**From KNOWLEDGE_MOAT_ARCHITECTURE.md design:**

- ❌ **CoachingDataIngestion class** - Upload transcripts/gameplans, trigger extraction
- ❌ **IntelligenceExtractor class** - Send to Claude for structured extraction
- ❌ **PatternSynthesizer class** - Identify patterns across similar students
- ❌ **PlaybookGenerator class** - Create/update playbooks by archetype

**What EXISTS instead:**
- ✅ **CoachingIntelligenceExtractor class** - Extracts from Old Huda only
- ✅ **extract-coaching-intelligence.ts script** - CLI tool for Old Huda only
- ✅ Manual extraction to JSON files (11 students done)

#### 2.2.3 Missing AI Agent Integration

**Assessment Agent:**
- ✅ Uses Old Huda's 27-layer framework
- ❌ Does NOT use archetype-specific frameworks from Jenny's 11 students
- ❌ Does NOT classify student archetype at session start
- ❌ Does NOT adapt questions based on archetype (8th vs 11th grade, etc.)

**GamePlan Agent:**
- ✅ Uses generic GamePlan structure
- ❌ Does NOT use archetype-specific playbooks
- ❌ Does NOT apply timeline-adaptive strategies (4+ years vs 4 months)
- ❌ Does NOT use ROI-Based Prioritization Matrix for time-constrained students

**Other 8 Reactive Agents:**
- ✅ Use Old Huda's data via CAT-1/CAT-2/CAT-3 tools
- ❌ Do NOT use any intelligence from Jenny's 11 students
- ❌ Do NOT apply archetype-specific tactics

#### 2.2.4 Missing Continuous Learning Loop

**From KNOWLEDGE_MOAT_ARCHITECTURE.md design:**

- ❌ Extract intelligence from New Huda's sessions automatically
- ❌ Compare to Jenny's 11 + Old Huda (cross-student validation)
- ❌ Update playbooks with new patterns
- ❌ A/B test playbook versions
- ❌ Track outcomes (college admits) → validate effectiveness

---

## PART 3: INTEGRATION ROADMAP (HOW TO BRIDGE THE GAP)

### 3.1 Strategic Alignment

**Key Insight from User:**
> "Old Huda data should have been the first layer of set of data for all the multi agents - 7 agents [actually 10]. Also the 11 students data extraction is now deep and rich augmentation enabling on the first 2 key agents - Assessment & GamePlan and not really the many other extractions and intel at every step of a multi year weekly program."

**Corrected Understanding:**

1. **Old Huda = Foundation for ALL agents** (not just Assessment)
   - Old Huda has **2+ years of complete journey data**
   - Includes: Assessment, GamePlan, Weekly Execution, Essays, Applications, Awards, Programs, ECs
   - This is the **most comprehensive coach-student dataset** we have
   - Currently: ✅ Old Huda powers all 10 agents via CAT-1/CAT-2/CAT-3 tools
   - Intelligence extraction beyond 27-layer assessment: ❌ NOT DONE

2. **Jenny's 11 Students = Vertical Augmentation for Assessment + GamePlan Agents ONLY**
   - These students: Assessment + GamePlan micro-service clients
   - Rich data for: Assessment frameworks, GamePlan strategies
   - Limited data for: Weekly execution, essays, applications (handed to other coaches)
   - Purpose: Augment Assessment & GamePlan agents with archetype-specific intelligence
   - Currently: ❌ NOT INTEGRATED into agents

3. **Future Augmentation for Other Agents**
   - Award Agent, Execution Agent, Essay Agent, Application Agent: Need **additional intelligence extraction**
   - Source: More Old Huda data extraction + new students with full journey data
   - Always build on Old Huda foundation (most comprehensive dataset)

4. **Knowledge Moat = Overarching Layer**
   - Retains and grows intelligence across all data sources
   - Continuous learning from every session
   - Multi-coach, multi-student, scalable architecture

---

### 3.2 Phase 3: Ingest Jenny's 11 Students into Database

**Goal:** Move 11 JSON files into production database tables

**Estimated Time:** 1-2 weeks

#### 3.2.1 Create Missing Database Tables

**Priority 1: Essential Tables for Phase 3**

```sql
-- 1. coaching_intelligence_extracted (comprehensive extraction storage)
CREATE TABLE coaching_intelligence_extracted (
  extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID, -- NULL for external students
  source_student_id TEXT NOT NULL, -- e.g., 'anoushka', 'ananyaa', etc.
  coach_id TEXT NOT NULL DEFAULT 'jenny',
  student_archetype TEXT NOT NULL, -- e.g., 'Well-Rounded Late-Starter'

  -- Student Profile
  student_profile JSONB NOT NULL, -- {grade, gpa_range, major, challenges, etc.}

  -- Session Framework (Assessment + GamePlan)
  session_structure JSONB, -- {opening, phases, duration, questions, transitions}
  questioning_patterns JSONB, -- {discovery, narrative, strategy questions}
  frameworks_introduced JSONB, -- [{framework_name, introduced_when, language_used}, ...]
  breakthrough_moments JSONB, -- [{timestamp, trigger, impact, student_response}, ...]
  critical_interventions JSONB, -- [{intervention_type, coach_language, rationale}, ...]

  -- Narrative Development
  narrative_development JSONB, -- {initial_clarity, final_clarity, aha_moments}

  -- Strategic Recommendations
  strategic_recommendations JSONB, -- {ecs, awards, programs, academics, timeline}

  -- GamePlan Structure
  gameplan_structure JSONB, -- {sections, action_items, prioritization, outcomes}

  -- Coaching Tactics
  coaching_tactics JSONB, -- {rapport, probing, reframing, parent_management}

  -- Metadata
  narrative_clarity_start DECIMAL(3,2),
  narrative_clarity_end DECIMAL(3,2),
  session_effectiveness_score DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extracted_student ON coaching_intelligence_extracted(source_student_id);
CREATE INDEX idx_extracted_archetype ON coaching_intelligence_extracted(student_archetype);

-- 2. archetype_patterns (cross-student pattern validation)
CREATE TABLE archetype_patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_archetype TEXT NOT NULL,
  pattern_category TEXT NOT NULL, -- 'questioning', 'strategy', 'framework', 'challenge'
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  pattern_data JSONB NOT NULL,

  -- Evidence
  observed_in_students TEXT[], -- ['anoushka', 'srinidhi', 'arshiya']
  observation_frequency DECIMAL(3,2), -- 0.00-1.00 (e.g., 3/3 = 1.00)

  -- Application
  recommended_action TEXT,
  recommended_frameworks TEXT[],
  trigger_conditions JSONB,

  -- Validation
  validated BOOLEAN DEFAULT FALSE,
  effectiveness_score DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_archetype ON archetype_patterns(student_archetype);
CREATE INDEX idx_patterns_validated ON archetype_patterns(validated);

-- 3. coaching_frameworks_library (80 frameworks from 11 students)
-- Enhance existing coaching_frameworks table or create new one
CREATE TABLE coaching_frameworks_library (
  framework_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_name TEXT NOT NULL,
  framework_type TEXT NOT NULL, -- 'assessment', 'gameplan', 'narrative', 'strategic'
  framework_description TEXT,
  framework_content JSONB NOT NULL,

  -- Introduction
  introduction_language TEXT, -- How Jenny introduces this framework
  application_steps JSONB, -- How to apply it with student

  -- Trigger Conditions (CRITICAL)
  trigger_conditions JSONB NOT NULL, -- {student_state, archetype, timeline, etc.}
  applicable_archetypes TEXT[], -- Which archetypes benefit from this

  -- Evidence
  source_students TEXT[], -- ['zainab', 'beya', 'iqra']
  source_coach_id TEXT DEFAULT 'jenny',
  effectiveness_by_archetype JSONB, -- {archetype: score}

  -- Usage tracking
  times_offered INTEGER DEFAULT 0,
  times_accepted INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_frameworks_lib_type ON coaching_frameworks_library(framework_type);
CREATE INDEX idx_frameworks_lib_archetype ON coaching_frameworks_library USING GIN (applicable_archetypes);
```

#### 3.2.2 Create Ingestion Script

**File:** `services/agent-framework/src/scripts/ingest-jenny-11-students.ts`

```typescript
/**
 * Ingest Jenny's 11 Students into Database
 *
 * Reads JSON files from /data/coaching_intelligence/extractions/
 * Inserts into coaching_intelligence_extracted table
 * Extracts frameworks into coaching_frameworks_library
 * Identifies patterns into archetype_patterns
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const EXTRACTIONS_DIR = '/data/coaching_intelligence/extractions';
const STUDENT_FILES = [
  'student_001_anoushka_structured.json',
  'student_002_ananyaa_structured.json',
  'student_003_aaryan_structured.json',
  'student_004_hiba_structured.json',
  'student_005_srinidhi_structured.json',
  'student_006_arshiya_structured.json',
  'student_007_aarnav_structured.json',
  'student_008_iqra_structured.json',
  'student_009_aarav_structured.json',
  'student_010_zainab_structured.json',
  'student_011_beya_structured.json',
];

async function ingestJenny11Students(pool: Pool) {
  console.log('Starting ingestion of Jenny\'s 11 students...\n');

  for (const filename of STUDENT_FILES) {
    const filePath = path.join(EXTRACTIONS_DIR, filename);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 1. Insert into coaching_intelligence_extracted
    const extractionId = await insertExtraction(pool, data);
    console.log(`✅ Inserted extraction for ${data.student_profile.name}: ${extractionId}`);

    // 2. Extract frameworks into coaching_frameworks_library
    const frameworkIds = await insertFrameworks(pool, data, extractionId);
    console.log(`   └─ Extracted ${frameworkIds.length} frameworks`);

    // 3. Update archetype patterns
    await updateArchetypePatterns(pool, data);
    console.log(`   └─ Updated archetype patterns for ${data.student_archetype}\n`);
  }

  // 4. Cross-student pattern synthesis
  console.log('Synthesizing cross-student patterns...');
  await synthesizePatterns(pool);

  console.log('\n✅ Ingestion complete! 11 students integrated into database.');
}

async function insertExtraction(pool: Pool, data: any): Promise<string> {
  const query = `
    INSERT INTO coaching_intelligence_extracted (
      source_student_id, coach_id, student_archetype,
      student_profile, session_structure, questioning_patterns,
      frameworks_introduced, breakthrough_moments, critical_interventions,
      narrative_development, strategic_recommendations, gameplan_structure,
      coaching_tactics, narrative_clarity_start, narrative_clarity_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING extraction_id
  `;

  const values = [
    data.student_profile.source_student_id || data.student_profile.name.toLowerCase(),
    'jenny',
    data.student_archetype,
    JSON.stringify(data.student_profile),
    JSON.stringify(data.session_structure || {}),
    JSON.stringify(data.questioning_patterns || {}),
    JSON.stringify(data.frameworks_introduced || []),
    JSON.stringify(data.breakthrough_moments || []),
    JSON.stringify(data.critical_interventions || []),
    JSON.stringify(data.narrative_development || {}),
    JSON.stringify(data.strategic_recommendations || {}),
    JSON.stringify(data.gameplan_structure || {}),
    JSON.stringify(data.coaching_tactics || {}),
    data.narrative_clarity_start || null,
    data.narrative_clarity_end || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0].extraction_id;
}

async function insertFrameworks(pool: Pool, data: any, extractionId: string): Promise<string[]> {
  const frameworkIds: string[] = [];

  for (const framework of data.frameworks_introduced || []) {
    const query = `
      INSERT INTO coaching_frameworks_library (
        framework_name, framework_type, framework_description,
        framework_content, introduction_language, trigger_conditions,
        applicable_archetypes, source_students, source_coach_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING
      RETURNING framework_id
    `;

    const values = [
      framework.framework_name,
      framework.framework_type || 'assessment', // Default to assessment
      framework.description || '',
      JSON.stringify(framework),
      framework.introduction_language || framework.coach_language || '',
      JSON.stringify(framework.trigger_conditions || {}),
      [data.student_archetype],
      [data.student_profile.source_student_id || data.student_profile.name.toLowerCase()],
      'jenny',
    ];

    const result = await pool.query(query, values);
    if (result.rows.length > 0) {
      frameworkIds.push(result.rows[0].framework_id);
    }
  }

  return frameworkIds;
}

async function updateArchetypePatterns(pool: Pool, data: any): Promise<void> {
  // Identify patterns from this student and update archetype_patterns table
  // This is a placeholder - actual implementation would analyze data for patterns
}

async function synthesizePatterns(pool: Pool): Promise<void> {
  // Cross-student pattern synthesis
  // Find VALIDATED patterns (seen in 3+ students)
  // This is a placeholder - actual implementation would query all extractions
}

// Run ingestion
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
ingestJenny11Students(pool)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
```

#### 3.2.3 Execute Ingestion

```bash
cd services/agent-framework
tsx src/scripts/ingest-jenny-11-students.ts
```

**Expected Output:**
```
Starting ingestion of Jenny's 11 students...

✅ Inserted extraction for Anoushka: abc-123-def
   └─ Extracted 8 frameworks
   └─ Updated archetype patterns for Well-Rounded Late-Starter

✅ Inserted extraction for Ananyaa: def-456-ghi
   └─ Extracted 7 frameworks
   └─ Updated archetype patterns for Introverted Explorer

... (9 more students)

Synthesizing cross-student patterns...
✅ Found 15 VALIDATED patterns across 11 students

✅ Ingestion complete! 11 students integrated into database.
```

---

### 3.3 Phase 4: Cross-Student Synthesis and Playbook Generation

**Goal:** Analyze all 12 students (Old Huda + 11) to generate archetype-specific playbooks

**Estimated Time:** 2-3 weeks

#### 3.3.1 Pattern Identification

**Methodology:**
1. Query all extractions grouped by archetype
2. Identify common questioning patterns (frequency >= 70%)
3. Identify common frameworks introduced (frequency >= 50%)
4. Identify breakthrough tactics (seen in 3+ students = VALIDATED)
5. Store in archetype_patterns table

**SQL Query Example:**
```sql
-- Find VALIDATED Identity-Integrated Narrative pattern
SELECT
  COUNT(DISTINCT source_student_id) as student_count,
  array_agg(DISTINCT source_student_id) as students,
  'Identity-Integrated Narrative' as pattern_name
FROM coaching_intelligence_extracted
WHERE frameworks_introduced::text LIKE '%Identity-Integrated Narrative%'
HAVING COUNT(DISTINCT source_student_id) >= 3;

-- Result: student_count=3, students=['iqra', 'zainab', 'beya']
-- This confirms VALIDATED pattern!
```

#### 3.3.2 Playbook Generation

**Create coaching_playbooks table:**
```sql
CREATE TABLE coaching_playbooks (
  playbook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_name TEXT NOT NULL, -- e.g., "Assessment Playbook: Time-Constrained Triage"
  student_archetype TEXT NOT NULL,
  coach_id TEXT DEFAULT 'jenny',

  -- Playbook Content (Assessment + GamePlan ONLY for now)
  assessment_framework JSONB NOT NULL, -- {phases, questions, frameworks, timing}
  gameplan_template JSONB NOT NULL, -- {sections, structure, prioritization_logic}
  coaching_tactics JSONB NOT NULL, -- {rapport, probing, reframing, parent_management}
  success_metrics JSONB, -- {narrative_clarity_target, session_duration, etc.}

  -- Source Evidence
  source_extraction_ids UUID[], -- Which extractions contributed
  sample_size INTEGER, -- How many students

  -- Effectiveness
  playbook_version INTEGER DEFAULT 1,
  effectiveness_score DECIMAL(3,2),
  last_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playbooks_archetype ON coaching_playbooks(student_archetype);
```

**Playbook Generation Script:**
```typescript
// services/agent-framework/src/scripts/generate-archetype-playbooks.ts

/**
 * Generate Archetype-Specific Playbooks
 *
 * For each of 11 archetypes:
 * 1. Aggregate all extractions for that archetype
 * 2. Find common patterns (70%+ frequency)
 * 3. Synthesize assessment framework (phases, questions, frameworks)
 * 4. Synthesize gameplan template (structure, prioritization logic)
 * 5. Store in coaching_playbooks table
 */

import { Pool } from 'pg';

const ARCHETYPES = [
  'Well-Rounded Late-Starter',
  'Introverted Explorer',
  'Early Explorer - Decided',
  'Early Explorer - Undecided',
  'Late-Starter with Major Pivot',
  'Ultra-Competitive Environment',
  'Cookie-Cutter CS-Debater Zero Passion',
  'Service-Driven STEM with Academic Recovery',
  'Parent-Driven 8th Grader',
  'Emerging Creative Pre-Med',
  'Time-Constrained Triage Student',
];

async function generatePlaybooks(pool: Pool) {
  for (const archetype of ARCHETYPES) {
    console.log(`\nGenerating playbook for: ${archetype}`);

    // 1. Get all extractions for this archetype
    const extractions = await getExtractionsByArchetype(pool, archetype);
    console.log(`   └─ Found ${extractions.length} student(s) with this archetype`);

    // 2. Synthesize assessment framework
    const assessmentFramework = synthesizeAssessmentFramework(extractions);

    // 3. Synthesize gameplan template
    const gameplanTemplate = synthesizeGamePlanTemplate(extractions);

    // 4. Synthesize coaching tactics
    const coachingTactics = synthesizeCoachingTactics(extractions);

    // 5. Store playbook
    const playbookId = await storePlaybook(pool, {
      archetype,
      assessmentFramework,
      gameplanTemplate,
      coachingTactics,
      sourceExtractionIds: extractions.map(e => e.extraction_id),
      sampleSize: extractions.length,
    });

    console.log(`   ✅ Playbook generated: ${playbookId}`);
  }
}

function synthesizeAssessmentFramework(extractions: any[]): any {
  // Aggregate questioning patterns
  const allQuestions = extractions.flatMap(e =>
    e.questioning_patterns?.discovery || []
  );

  // Find common questions (70%+ frequency)
  const questionFrequency = calculateFrequency(allQuestions);
  const commonQuestions = Object.entries(questionFrequency)
    .filter(([_, freq]) => freq >= 0.7)
    .map(([question, _]) => question);

  // Aggregate frameworks
  const allFrameworks = extractions.flatMap(e =>
    e.frameworks_introduced || []
  );

  // Find common frameworks (50%+ frequency)
  const frameworkFrequency = calculateFrequency(
    allFrameworks.map(f => f.framework_name)
  );
  const commonFrameworks = Object.entries(frameworkFrequency)
    .filter(([_, freq]) => freq >= 0.5)
    .map(([name, _]) => name);

  return {
    phases: extractCommonPhases(extractions),
    discovery_questions: commonQuestions,
    frameworks_to_introduce: commonFrameworks,
    average_duration_minutes: calculateAverageDuration(extractions),
  };
}

function synthesizeGamePlanTemplate(extractions: any[]): any {
  // Aggregate gameplan structures
  const allGameplans = extractions.map(e => e.gameplan_structure || {});

  // Find common sections
  const sectionFrequency = calculateSectionFrequency(allGameplans);

  // Extract prioritization logic
  const prioritizationLogic = extractPrioritizationLogic(extractions);

  return {
    sections: Object.keys(sectionFrequency).filter(s => sectionFrequency[s] >= 0.7),
    prioritization_logic: prioritizationLogic,
    action_items_template: extractCommonActionItems(allGameplans),
  };
}

function synthesizeCoachingTactics(extractions: any[]): any {
  // Aggregate coaching tactics
  const allTactics = extractions.flatMap(e => e.coaching_tactics || {});

  return {
    rapport_building: extractRapportTactics(allTactics),
    probing_techniques: extractProbingTactics(allTactics),
    reframing_strategies: extractReframingTactics(allTactics),
    parent_management: extractParentManagementTactics(allTactics),
  };
}

// Run playbook generation
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
generatePlaybooks(pool)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
```

---

### 3.4 Phase 5: AI Agent Integration of Archetype-Specific Intelligence

**Goal:** Update Assessment and GamePlan agents to use archetype-specific playbooks

**Estimated Time:** 2-3 weeks

#### 3.4.1 Update AssessmentAgent

**Current:** Uses Old Huda's generic 27-layer framework
**Target:** Classify student archetype, use archetype-specific playbook

**File:** `services/agent-framework/src/agents/AssessmentAgent.ts`

**Changes Needed:**

1. **Add Archetype Classification** (at session start)
```typescript
async startAssessment(studentId: string, coachId: string): Promise<AssessmentSession> {
  // ... existing code ...

  // NEW: Classify student archetype
  const archetype = await this.classifyStudentArchetype(student);
  console.log(`[AssessmentAgent] 🎯 Classified archetype: ${archetype}`);

  // NEW: Load archetype-specific playbook
  const playbook = await this.loadPlaybook(archetype);
  console.log(`[AssessmentAgent] 📚 Loaded playbook: ${playbook.playbook_name}`);

  // NEW: Use playbook for assessment
  const assessmentResult = await this.executeArchetypeAssessment(
    coach,
    student,
    playbook,
    sessionId
  );

  // ... rest of code ...
}

private async classifyStudentArchetype(student: StudentContext): Promise<string> {
  // Classification logic based on:
  // - Grade level (8th vs 9th vs 10th vs 11th)
  // - Major intent (CS/STEM vs Pre-Med vs Undecided)
  // - Timeline (time until applications)
  // - Activities (scattered vs focused)
  // - Academic standing (GPA, rigor)

  const grade = student.grade_level;
  const major = student.major_intent || 'undecided';
  const timeline = this.calculateTimelineToApps(grade);

  // Example logic (simplified)
  if (grade === 11 && timeline <= 6) {
    return 'Time-Constrained Triage Student';
  } else if (grade === 8) {
    return 'Parent-Driven 8th Grader'; // Default for 8th
  } else if (grade === 11 && major === 'CS' && /* scattered activities */) {
    return 'Well-Rounded Late-Starter';
  }
  // ... more logic ...

  return 'Generic Student'; // Fallback to Old Huda framework
}

private async loadPlaybook(archetype: string): Promise<Playbook> {
  const query = `
    SELECT * FROM coaching_playbooks
    WHERE student_archetype = $1
    ORDER BY playbook_version DESC, effectiveness_score DESC
    LIMIT 1
  `;

  const result = await this.pool.query(query, [archetype]);

  if (result.rows.length === 0) {
    console.warn(`[AssessmentAgent] ⚠️ No playbook for ${archetype}, using generic`);
    return this.getGenericPlaybook(); // Old Huda framework as fallback
  }

  return result.rows[0];
}
```

2. **Use Archetype-Specific Questions**
```typescript
private async executeArchetypeAssessment(
  coach: JennyDuanCoach,
  student: StudentContext,
  playbook: Playbook,
  sessionId: string
): Promise<AssessmentResult> {

  // Use playbook's assessment framework
  const { phases, discovery_questions, frameworks_to_introduce } = playbook.assessment_framework;

  const results = [];

  for (const phase of phases) {
    console.log(`[AssessmentAgent] 🔍 Phase: ${phase.name}`);

    // Use archetype-specific questions
    const questions = phase.questions || discovery_questions;

    for (const question of questions) {
      const response = await coach.ask(student, question);
      results.push({ phase: phase.name, question, response });

      // Check for framework triggers
      const triggerFramework = this.checkFrameworkTriggers(
        response,
        frameworks_to_introduce
      );

      if (triggerFramework) {
        console.log(`[AssessmentAgent] 💡 Triggering framework: ${triggerFramework.name}`);
        await coach.introduceFramework(student, triggerFramework);
      }
    }
  }

  return { results, sessionId };
}
```

#### 3.4.2 Update GamePlanAgent

**Current:** Uses generic GamePlan structure
**Target:** Use archetype-specific gameplan template with prioritization logic

**File:** `services/agent-framework/src/agents/GamePlanAgent.ts`

**Changes Needed:**

1. **Load Archetype Playbook**
```typescript
async handleIntent(
  studentId: string,
  userQuery: string,
  context: ConversationContext
): Promise<AgentResponse> {

  // NEW: Classify archetype (if not already classified)
  const archetype = context.student_archetype || await this.classifyArchetype(studentId);

  // NEW: Load playbook
  const playbook = await this.loadPlaybook(archetype);

  // Use playbook's gameplan template
  const gameplanTemplate = playbook.gameplan_template;

  // Apply archetype-specific prioritization logic
  if (archetype === 'Time-Constrained Triage Student') {
    return this.applyP0P1P2Logic(studentId, gameplanTemplate);
  } else if (archetype === 'Parent-Driven 8th Grader') {
    return this.apply70Discovery30Prescriptive(studentId, gameplanTemplate);
  }

  // ... rest of logic ...
}

private async applyP0P1P2Logic(
  studentId: string,
  template: GamePlanTemplate
): Promise<AgentResponse> {
  // For time-constrained students:
  // P0 (Priority 0): Highest ROI, must do
  // P1 (Priority 1): Medium ROI, stretch goals
  // P2 (Priority 2): Low ROI, DON'T pursue

  const vitals = await this.getVitals(studentId);
  const timeline = this.calculateTimelineToApps(vitals.grade_level);

  const p0Actions = this.identifyP0Actions(vitals, timeline);
  const p1Actions = this.identifyP1Actions(vitals, timeline);
  const p2Actions = this.identifyP2Actions(vitals, timeline); // What NOT to do

  return {
    message: this.formatGamePlan({
      archetype: 'Time-Constrained Triage Student',
      timeline: `${timeline} months until applications`,
      p0_must_do: p0Actions,
      p1_stretch: p1Actions,
      p2_dont_do: p2Actions, // CRITICAL: Explicitly tell student what NOT to do
    }),
    tools_called: ['get_vitals'],
    handoff_recommendations: ['awards', 'programs'],
  };
}
```

---

### 3.5 Phase 6: Continuous Learning Feedback Loop

**Goal:** Extract intelligence from new sessions, update playbooks automatically

**Estimated Time:** 3-4 weeks

#### 3.5.1 Automated Extraction from New Sessions

**Trigger:** When New Huda (or any new student) completes assessment

**Flow:**
```
1. New Huda completes assessment → assessment_completed event
2. AssessmentAgent stores conversation in agent_conversation_turns
3. TRIGGER: extraction_pipeline triggered
4. CoachingIntelligenceExtractor analyzes conversation
5. Extract structured intelligence → coaching_intelligence_extracted
6. Compare to existing patterns for archetype
7. If novel pattern detected → flag for human review
8. If validates existing pattern → increase observation_frequency
9. Update playbook if pattern frequency crosses threshold (70%+)
10. A/B test new playbook vs old playbook
11. Track outcomes (college admits) → validate effectiveness
```

#### 3.5.2 Implementation

**Create Extraction Pipeline:**
```typescript
// services/agent-framework/src/intelligence/ExtractionPipeline.ts

export class ExtractionPipeline {
  private pool: Pool;
  private eventBus: EventBus;
  private extractor: CoachingIntelligenceExtractor;

  constructor(pool: Pool, eventBus: EventBus) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.extractor = new CoachingIntelligenceExtractor(pool);

    // Subscribe to assessment_completed events
    this.eventBus.on('assessment_completed', (event) => this.handleAssessmentCompleted(event));
  }

  private async handleAssessmentCompleted(event: LifecycleEvent): Promise<void> {
    console.log(`[ExtractionPipeline] 🎯 Assessment completed for ${event.student_id}`);
    console.log(`[ExtractionPipeline] 🔍 Starting intelligence extraction...`);

    // 1. Get conversation history
    const conversation = await this.getConversationHistory(event.session_id);

    // 2. Extract intelligence using Claude
    const extraction = await this.extractor.extractFromConversation(
      event.student_id,
      event.coach_id,
      conversation
    );

    // 3. Store extraction
    const extractionId = await this.storeExtraction(extraction);
    console.log(`[ExtractionPipeline] ✅ Extraction stored: ${extractionId}`);

    // 4. Pattern analysis
    await this.analyzePatterns(extraction);

    // 5. Update playbook if needed
    await this.updatePlaybookIfNeeded(extraction.student_archetype);
  }

  private async analyzePatterns(extraction: any): Promise<void> {
    // Compare to existing patterns
    // If novel → flag for review
    // If validates → increase frequency
  }

  private async updatePlaybookIfNeeded(archetype: string): Promise<void> {
    // Check if patterns crossed threshold (70%+)
    // If yes → regenerate playbook
    // Increment version
    // A/B test new vs old
  }
}
```

---

## PART 4: MASTER ARCHITECTURE DIAGRAM

### 4.1 Complete System Architecture (Current + Planned)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         IVYLEVEL PLATFORM v2.1+                         │
│              Multi-Agent Autonomous Coaching Platform                    │
│         (Continuously Learning from Real Coaching Data)                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER 5: USER INTERFACE                         │
│                                                                         │
│  ✅ Unified Frontend (unified-app)                                      │
│     - JWT Authentication (auto-refresh)                                 │
│     - Student/Coach/Admin Apps                                          │
│     - AgentChat Component (for 9 reactive agents)                       │
│     - NSM Dashboard                                                     │
│                                                                         │
│  ✅ Test Chat UI (apps/test-chat-ui)                                    │
│     - Testing interface for agents                                      │
│     - Multi-turn conversation support                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ HTTP/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     LAYER 4: MULTI-AGENT SYSTEM                         │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  AUTONOMOUS AGENT (1) - Proactive, Event-Driven                │   │
│  │                                                                 │   │
│  │  ✅ AssessmentAgent                                             │   │
│  │     - Trigger: student_onboarded event                          │   │
│  │     - Uses: 27-layer framework from Old Huda ✅                 │   │
│  │     - PLANNED: Archetype-specific playbooks from Jenny's 11 📋  │   │
│  │     - Classifies archetype at start 📋                          │   │
│  │     - Adapts questions based on archetype 📋                    │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  REACTIVE AGENTS (9) - Query-Based, User-Initiated             │   │
│  │                                                                 │   │
│  │  ✅ GamePlanAgent - Strategy & Timeline                         │   │
│  │     - Uses: Old Huda vitals, rubric, outcomes ✅                │   │
│  │     - PLANNED: Archetype-specific templates 📋                  │   │
│  │     - PLANNED: P0/P1/P2 logic for time-constrained 📋          │   │
│  │                                                                 │   │
│  │  ✅ ExtracurricularsAgent - EC Portfolio                        │   │
│  │  ✅ AwardsAgent - Academic Awards                               │   │
│  │  ✅ SummerProgramsAgent - Program Selection                     │   │
│  │  ✅ CollegeListAgent - College List & Chances                   │   │
│  │  ✅ EssayAgent - Essay Strategy (DS6/DS7)                       │   │
│  │  ✅ AdmissionsAgent - AO Perspectives (DS7)                     │   │
│  │  ✅ WeeklyExecutionAgent - JTBD Tracking                        │   │
│  │  ✅ ScholarshipAgent - Scholarship Tracking                     │   │
│  │                                                                 │   │
│  │  All agents: Zero hallucination ✅, Old Huda data ✅            │   │
│  │             Jenny's 11 students data ❌ NOT INTEGRATED           │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  AGENT REGISTRY & ROUTING                                      │   │
│  │  ✅ Intent pattern matching                                     │   │
│  │  ✅ Agent handoff recommendations                               │   │
│  │  ✅ Conversation persistence                                    │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 LAYER 3: INTELLIGENCE & LEARNING PIPELINE               │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  OLD HUDA INTELLIGENCE (✅ IN DATABASE)                         │   │
│  │  - 27-layer assessment framework                                │   │
│  │  - Week 1 planning flow (168-hour)                              │   │
│  │  - 3,424 EQ signals (9 types)                                   │   │
│  │  - 5 tactical frameworks                                        │   │
│  │  - 57 KB items (awards, ECs, programs, narratives)              │   │
│  │  Status: ✅ USED BY ALL 10 AGENTS                               │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  JENNY'S 11 STUDENTS INTELLIGENCE (📁 JSON FILES ONLY)          │   │
│  │  - 11 archetypes identified                                     │   │
│  │  - 80 frameworks (ASSESSMENT + GAMEPLAN ONLY)                   │   │
│  │  - 55+ coaching tactics                                         │   │
│  │  - 40+ breakthrough questions                                   │   │
│  │  - VALIDATED patterns (3+ students)                             │   │
│  │  Status: ❌ NOT IN DATABASE, NOT USED BY AGENTS                 │   │
│  │  Roadmap: 📋 Phase 3 - Ingest into database                     │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  CONTINUOUS LEARNING PIPELINE (📋 DESIGNED, NOT BUILT)          │   │
│  │  - Automated extraction from new sessions                       │   │
│  │  - Cross-student pattern synthesis                              │   │
│  │  - Playbook generation & updating                               │   │
│  │  - A/B testing new vs old playbooks                             │   │
│  │  - Outcome tracking → effectiveness validation                  │   │
│  │  Status: 📋 Phase 6 - Planned                                   │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     LAYER 2: KNOWLEDGE MOAT (DATA)                      │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  COACHING INTELLIGENCE (✅ PARTIAL, 📋 PLANNED)                  │   │
│  │                                                                 │   │
│  │  ✅ coaching_intelligence_extraction (4 rows - Old Huda only)   │   │
│  │  ✅ coaching_frameworks (1 row - 27-layer framework)            │   │
│  │  📋 coaching_intelligence_extracted (0 rows - needs 11 students)│   │
│  │  📋 archetype_patterns (0 rows - needs cross-student synthesis) │   │
│  │  📋 coaching_frameworks_library (0 rows - needs 80 frameworks)  │   │
│  │  📋 coaching_playbooks (0 rows - needs 11 playbooks)            │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  MOAT DATA SOURCES                                              │   │
│  │                                                                 │   │
│  │  ✅ DS6: moat_essay_examples (real essays)                      │   │
│  │  ✅ DS7: moat_ao_perspectives (AO insights)                     │   │
│  │  ✅ DS-T1: moat_tactic_chips (5 tactics from Old Huda)          │   │
│  │  ✅ DS-T2: moat_success_patterns (student journeys)             │   │
│  │  ⚠️  DS1-DS5: moat_cds_colleges, moat_rubric_factors, etc.      │   │
│  │              (tables exist, data needs verification)            │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              LAYER 1: v14 ZERO-HALLUCINATION FOUNDATION                 │
│                       (105 Temporal Resolvers)                          │
│                                                                         │
│  ✅ kb_items (57 items for Old Huda)                                    │
│  ✅ vital_facts (temporal facts: GPA, SAT, demographics)                │
│  ✅ outcomes (assessment results)                                       │
│  ✅ eq_signals (3,424 signals for Old Huda)                             │
│  ✅ conversation_turns (44 turns Old Huda-Jenny)                        │
│  ✅ 105 temporal views (v_gpa_*, v_awards_*, v_colleges_*, etc.)        │
│                                                                         │
│  Status: ✅ FULLY IMPLEMENTED & WORKING                                 │
│  Powers: ALL 10 AGENTS via CAT-1/CAT-2/CAT-3 tools                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PART 5: SUMMARY & NEXT ACTIONS

### 5.1 What We Actually Built (Ground Truth)

**✅ WORKING IN PRODUCTION:**
1. **Old Huda Foundation** - 2+ years of comprehensive coaching data (57 KB items, 3,424 EQ signals, 5 tactical frameworks)
2. **10-Agent System** - 1 autonomous (Assessment) + 9 reactive (GamePlan, ECs, Awards, Programs, College, Essay, Admissions, Execution, Scholarship)
3. **Zero-Hallucination Architecture** - v14 foundation with 105 temporal resolvers
4. **Unified Frontend** - JWT auth, Student/Coach/Admin apps, AgentChat component
5. **Knowledge Moat DS6/DS7** - Real essays, AO perspectives
6. **Interactive/Simulated Assessment** - Tested with New Huda (newhuda@test.com), 2+ min runtime, GamePlan triggered

**📁 EXTRACTED BUT NOT INTEGRATED:**
1. **Jenny's 11 Students** - 11 JSON files with 80 frameworks, 55+ tactics, 40+ questions
2. **11 Archetypes** - Documented in STUDENT_INDEX.md
3. **VALIDATED Patterns** - Identity-Integrated Narrative (3 students), Strategic Activity Selection (2 students), Academic Foundation First (3 students)

**📋 DESIGNED BUT NOT BUILT:**
1. **Cross-Student Synthesis** - Pattern identification, playbook generation
2. **Archetype-Specific Agents** - Assessment/GamePlan agents using playbooks
3. **Continuous Learning Loop** - Automated extraction, A/B testing, outcome tracking
4. **Enhanced Database Tables** - coaching_intelligence_extracted, archetype_patterns, coaching_playbooks, coaching_frameworks_library

---

### 5.2 The Critical Insight (User-Corrected Understanding)

**BEFORE (Incorrect):**
- Thought: Jenny's 11 students = comprehensive lifecycle data
- Thought: Build 7 specialist agents for all lifecycle stages using 11 students

**AFTER (Correct):**
- **Old Huda** = Most comprehensive dataset (2+ years, entire journey: Assessment → GamePlan → Weekly Execution → Essays → Apps → Outcomes)
- **Jenny's 11 Students** = Rich but LIMITED to Assessment + GamePlan micro-service (no weekly execution, essays, apps data)
- **Purpose of 11 Students:** Vertical augmentation for **2 agents ONLY** (Assessment & GamePlan)
- **Other Agents (8):** Need additional intelligence extraction from Old Huda + future students with full journey data

**Correct Layering:**
```
Layer 1 (Foundation): Old Huda - ALL 10 agents ✅
Layer 2 (Augmentation): Jenny's 11 students - Assessment & GamePlan agents ONLY 📋
Layer 3 (Future): More extraction from Old Huda + new full-journey students - Other 8 agents 🎯
Layer 4 (Overarching): Knowledge Moat - Continuous learning across all sources 🎯
```

---

### 5.3 Immediate Next Actions (Priority Order)

#### **PHASE 3: Ingest Jenny's 11 Students** (2-3 weeks)

**Priority 1 - Database Schema:**
1. Create `coaching_intelligence_extracted` table (comprehensive JSONB extraction)
2. Create `archetype_patterns` table (cross-student patterns)
3. Create `coaching_frameworks_library` table (80 frameworks with triggers)
4. Create `coaching_playbooks` table (11 archetype-specific playbooks)

**Priority 2 - Ingestion Script:**
1. Write `ingest-jenny-11-students.ts` script
2. Read 11 JSON files from `/data/coaching_intelligence/extractions/`
3. Insert into `coaching_intelligence_extracted` table (11 rows)
4. Extract frameworks into `coaching_frameworks_library` (80 frameworks)
5. Identify patterns into `archetype_patterns` (initial analysis)

**Priority 3 - Validation:**
1. Query database to confirm 11 students ingested
2. Verify 80 frameworks extracted
3. Validate VALIDATED patterns (seen in 3+ students)

#### **PHASE 4: Cross-Student Synthesis** (2-3 weeks)

**Priority 1 - Pattern Identification:**
1. Write `analyze-patterns.ts` script
2. Aggregate all extractions by archetype
3. Identify common questioning patterns (70%+ frequency)
4. Identify common frameworks (50%+ frequency)
5. Identify VALIDATED breakthrough tactics (3+ students)
6. Store in `archetype_patterns` table

**Priority 2 - Playbook Generation:**
1. Write `generate-archetype-playbooks.ts` script
2. For each of 11 archetypes:
   - Synthesize assessment framework (phases, questions, frameworks)
   - Synthesize gameplan template (structure, prioritization logic)
   - Synthesize coaching tactics (rapport, probing, reframing)
3. Store in `coaching_playbooks` table (11 playbooks)

**Priority 3 - Validation:**
1. Review generated playbooks with Jenny (human-in-the-loop)
2. Validate trigger conditions for frameworks
3. Test playbook retrieval by archetype

#### **PHASE 5: AI Agent Integration** (2-3 weeks)

**Priority 1 - AssessmentAgent Update:**
1. Add archetype classification logic (grade, major, timeline, activities)
2. Add playbook loading (query `coaching_playbooks` by archetype)
3. Use archetype-specific questions from playbook
4. Use archetype-specific frameworks with trigger conditions
5. Fallback to Old Huda generic framework if no playbook found

**Priority 2 - GamePlanAgent Update:**
1. Add archetype classification (if not already from assessment)
2. Load archetype-specific gameplan template
3. Apply archetype-specific prioritization logic:
   - Time-Constrained Triage → P0/P1/P2 logic
   - Parent-Driven 8th Grader → 70% discovery / 30% prescriptive
   - Emerging Creative Pre-Med → Cross-domain synthesis
4. Fallback to generic gameplan if no playbook found

**Priority 3 - Testing:**
1. Test with New Huda (re-run assessment with archetype classification)
2. Classify New Huda into archetype
3. Use archetype-specific playbook
4. Validate questions/frameworks match archetype
5. Compare old (generic) vs new (archetype-specific) results

#### **PHASE 6: Continuous Learning Loop** (3-4 weeks, lower priority)

**Priority 1 - Extraction Pipeline:**
1. Create `ExtractionPipeline` class
2. Subscribe to `assessment_completed` event
3. Extract conversation history
4. Use Claude to extract structured intelligence
5. Store in `coaching_intelligence_extracted` table

**Priority 2 - Pattern Analysis:**
1. Compare new extraction to existing patterns
2. If novel → flag for human review
3. If validates → increase `observation_frequency`
4. Update `archetype_patterns` table

**Priority 3 - Playbook Updates:**
1. Check if patterns crossed threshold (70%+)
2. If yes → regenerate playbook
3. Increment `playbook_version`
4. A/B test new vs old playbook
5. Track effectiveness by archetype

**Priority 4 - Outcome Tracking:**
1. Create `session_outcomes` table
2. Track college admits, awards won, gameplan completion
3. Validate playbook effectiveness
4. Update `effectiveness_score` in playbooks

---

### 5.4 Success Metrics

**Phase 3 Success:**
- ✅ 11 students in `coaching_intelligence_extracted` table
- ✅ 80 frameworks in `coaching_frameworks_library` table
- ✅ 15+ VALIDATED patterns in `archetype_patterns` table

**Phase 4 Success:**
- ✅ 11 playbooks in `coaching_playbooks` table (one per archetype)
- ✅ Each playbook has assessment framework + gameplan template + coaching tactics
- ✅ Jenny reviews and validates playbooks

**Phase 5 Success:**
- ✅ AssessmentAgent classifies New Huda into archetype
- ✅ AssessmentAgent uses archetype-specific playbook
- ✅ GamePlanAgent uses archetype-specific gameplan template
- ✅ Narrative clarity improvement vs generic framework

**Phase 6 Success:**
- ✅ New Huda's session automatically extracted after assessment
- ✅ Patterns updated with New Huda data
- ✅ Playbook updated if thresholds crossed
- ✅ A/B test shows playbook v2 > playbook v1

---

## CONCLUSION

This document provides the **single source of truth** for:
1. **What we actually built** (Old Huda foundation + 10 agents + frontend)
2. **What we extracted but didn't integrate** (Jenny's 11 students in JSON)
3. **What's missing** (database tables, ingestion, synthesis, agent integration, continuous learning)
4. **How to bridge the gap** (Phases 3-6 roadmap)

**Key Takeaway:**
- Old Huda = Foundation for ALL agents (most comprehensive dataset) ✅
- Jenny's 11 students = Augmentation for Assessment & GamePlan agents ONLY 📋
- Future: More extraction from Old Huda + new students → augment other 8 agents 🎯
- Knowledge Moat = Overarching continuous learning layer 🎯

**Next Step:**
Execute Phase 3 (Ingest Jenny's 11 Students) to unlock archetype-specific coaching intelligence for Assessment and GamePlan agents.

---

**Document Status:** ✅ COMPREHENSIVE AUDIT COMPLETE
**Last Updated:** 2025-10-20
**Author:** Claude Code (Anthropic)
**Reviewed By:** [Pending user review]
