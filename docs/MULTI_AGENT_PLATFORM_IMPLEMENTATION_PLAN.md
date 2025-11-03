# Multi-Agent Platform Implementation Plan

**Created:** 2025-10-28
**Status:** Ready for Execution
**Goal:** Build production-ready 10-agent coaching platform with real EQ intelligence

---

## 📊 Current State Audit

### Existing Agents (All Inherit from BaseAgent)

| Agent | Lines | Status | Assessment |
|-------|-------|--------|------------|
| **AssessmentAgent** | 530 | ✅ Strong | Event-driven, 4-phase, 27-layer, real EQ intelligence |
| **AdmissionsAgent** | 283 | ⚠️ Moderate | Has structure, needs real coaching patterns |
| **CollegeListAgent** | 250 | ⚠️ Moderate | Has tools/intents, needs real fit analysis data |
| **EssayAgent** | 219 | ⚠️ Moderate | Has structure, needs real Jenny essay coaching |
| **SummerProgramsAgent** | 213 | ⚠️ Moderate | Has tools, needs real program recommendation logic |
| **AwardsAgent** | 198 | ⚠️ Moderate | Has structure, needs real competition strategy |
| **ScholarshipAgent** | 188 | ⚠️ Moderate | Has tools, needs real scholarship matching |
| **ExtracurricularsAgent** | 185 | ⚠️ Moderate | Has tools/intents, needs real EC strategy |
| **WeeklyExecutionAgent** | 179 | ⚠️ Moderate | Has structure, needs JTBD integration |
| **GamePlanAgent** | 174 | ⚠️ Moderate | Has tools/intents, needs strategic orchestration |

### Available Real Data Sources

**93 Weekly Session Files** (`data/eq/sessions/`)
- jenny_eq_session_w001 → w093_extract.json
- Complete 2-year Jenny-Huda coaching journey
- Rich domain-specific coaching patterns

**7 iMessage Extract Files** (`data/eq/imsg/`)
- jenny_eq_extract_imsg_1-7.json
- 500+ real text interactions
- Emotional intelligence patterns

**Knowledge Moat** (74 tactics, 17 frameworks, 10 archetypes)
- Already indexed and searchable
- Available via KnowledgeMoatRepository

### What Works Well

✅ **BaseAgent Foundation**
- Zero-hallucination tool execution (OpenAI function calling)
- Pattern-based intent matching
- Handoff detection
- Session management
- Evidence tracking (chips/hits)

✅ **AgentRegistry**
- Centralized routing
- 10 agents registered
- Pattern matching functional

✅ **Tool Infrastructure**
- SQL-grounded resolvers working
- Academic, EC, Awards, Program, College tools exist
- NSM metrics integrated

✅ **v17.3 Integration**
- cat-3 composeEQResponse for authentic Jenny voice
- Reflection service for quality gates
- Context engineering pipeline

### What Needs Enhancement

⚠️ **Agent-Specific Intelligence**
- Current agents use generic system prompts
- Missing domain-specific coaching patterns from 93 sessions
- No extraction of real Jenny guidance per domain

⚠️ **Multi-Agent Orchestration**
- Handoffs exist but not well-tested
- No coordinated multi-agent workflows
- Missing agent collaboration patterns

⚠️ **Domain Expertise**
- Each agent needs real coaching examples for its domain
- Missing synthesis of 93 weeks of domain-specific guidance
- No domain-specific EQ adaptation

---

## 🎯 Implementation Strategy

### Phase 1: Extract Domain-Specific Intelligence (Week 1)

**For Each Agent Domain, Extract from 93 Session Files:**

1. **GamePlan Domain** (Strategic Planning)
   - Search sessions for: "strategy", "plan", "timeline", "priority", "focus"
   - Extract: Planning frameworks, prioritization logic, timeline creation
   - Real examples: When Jenny helped Huda create application strategy

2. **Extracurriculars Domain** (ECs/Leadership)
   - Search sessions for: "extracurricular", "activity", "leadership", "club", "president"
   - Extract: EC optimization, leadership development, impact amplification
   - Real examples: When Jenny guided EC strategy decisions

3. **Awards Domain** (Competitions/Recognition)
   - Search sessions for: "award", "competition", "NCWIT", "hackathon", "recognition"
   - Extract: Competition strategy, award application tactics, positioning
   - Real examples: When Jenny recommended specific competitions

4. **Essay Domain** (Writing/Narrative)
   - Search sessions for: "essay", "story", "narrative", "common app", "supplement"
   - Extract: Writing strategies, narrative development, vulnerability dosing
   - Real examples: When Jenny coached essay approach

5. **College List Domain** (Fit/Selection)
   - Search sessions for: "college", "Stanford", "MIT", "reach", "safety", "fit"
   - Extract: College selection criteria, fit analysis, strategic targeting
   - Real examples: When Jenny guided college list decisions

6. **Scholarship Domain** (Financial Aid)
   - Search sessions for: "scholarship", "financial aid", "merit", "funding"
   - Extract: Scholarship search strategy, application optimization
   - Real examples: When Jenny discussed financial opportunities

7. **Summer Programs Domain** (Opportunities)
   - Search sessions for: "summer program", "TASP", "RSI", "internship", "research"
   - Extract: Program selection, application strategy, ROI analysis
   - Real examples: When Jenny recommended summer opportunities

8. **Weekly Execution Domain** (Tasks/JTBD)
   - Search sessions for: "this week", "deadline", "todo", "next steps", "action items"
   - Extract: Task prioritization, deadline management, execution frameworks
   - Real examples: When Jenny broke down weekly tasks

9. **Admissions Domain** (AO Perspective)
   - Search sessions for: "admissions officer", "AO", "review process", "application"
   - Extract: AO mindset, review criteria, positioning strategy
   - Real examples: When Jenny explained admissions perspective

### Phase 2: Enhance Each Agent with Real Intelligence (Week 2-3)

**For Each Agent:**

1. **Extract Domain-Specific Coaching Examples**
   - Run automated extraction from 93 session files
   - Manual quality review (select best 10-20 examples per domain)
   - Format as few-shot examples for agent

2. **Build Domain-Specific System Prompt**
   - Start with BaseAgent prompt
   - Add domain expertise from real sessions
   - Include Jenny's authentic coaching patterns for that domain
   - Add domain-specific tool usage guidelines

3. **Integrate Real Few-Shot Examples**
   - Add to agent's buildSystemPrompt() method
   - Include 3-5 real coaching exchanges per common query type
   - Show authentic Jenny voice for that domain

4. **Add Domain-Specific Quality Checks**
   - What makes a good GamePlan response?
   - What makes a good EC recommendation?
   - Domain-specific success criteria

5. **Create Agent Specification Document**
   - Similar to Assessment Agent spec
   - Document domain intelligence sources
   - Implementation status, future enhancements

### Phase 3: Multi-Agent Orchestration (Week 4)

1. **Test Handoff Workflows**
   - GamePlan → ECs (when discussing activity strategy)
   - GamePlan → Awards (when discussing competitions)
   - GamePlan → Essay (when discussing narrative)
   - Verify handoff detection logic works

2. **Build Agent Collaboration Patterns**
   - Allow agents to consult each other
   - Example: EssayAgent asks GamePlanAgent for strategic context
   - Implement via agent-to-agent tool calls

3. **Create Multi-Agent Workflows**
   - Comprehensive assessment → GamePlan generation
   - EC portfolio review → Awards recommendations → Essay narrative
   - Test end-to-end student journey

4. **Agent Management Dashboard**
   - View all active agents
   - Monitor agent usage stats
   - Test agent routing decisions
   - Debug multi-agent conversations

---

## 📋 Detailed Agent Enhancement Plan

### Agent 1: GamePlan Agent

**Current State**: 174 lines, basic structure

**Enhancement Plan**:
1. Extract strategic planning examples from sessions w001-w093
2. Keywords: "strategy", "plan", "timeline", "priority", "focus", "game plan"
3. Add Jenny's planning frameworks:
   - 168-Hour Framework (time architecture)
   - IvyScore optimization approach
   - Rubric gap analysis method
   - High-ROI opportunity identification
4. Build system prompt with:
   - "Start with big picture, then details"
   - "Use numbered lists for timelines"
   - "Highlight urgent (next 1-2 weeks)"
   - "Be specific: Complete X by Y date"
5. Few-shot examples: 5 real strategic planning exchanges
6. Tools: get_nsm_dashboard, get_relevant_tactics, get_college_list, JTBD tools
7. Success criteria: Clear timeline, actionable next steps, priority areas identified

**Estimated Effort**: 2-3 days

---

### Agent 2: Extracurriculars Agent

**Current State**: 185 lines, has tools/intents

**Enhancement Plan**:
1. Extract EC strategy examples from sessions
2. Keywords: "extracurricular", "activity", "leadership", "club", "EC", "president"
3. Add Jenny's EC frameworks:
   - Tier classification (T1-T4 activities)
   - Impact amplification tactics
   - Leadership positioning strategies
   - Quality over quantity principle
4. Build system prompt with:
   - "Focus on depth over breadth"
   - "Leadership = impact + initiative"
   - "Quantify contributions"
   - "Connect ECs to narrative"
5. Few-shot examples: 5 real EC coaching exchanges
6. Tools: get_extracurriculars, get_leadership_roles, get_ec_hours, NSM leadership
7. Success criteria: Clear EC strategy, leadership path, impact metrics

**Estimated Effort**: 2 days

---

### Agent 3: Awards Agent

**Current State**: 198 lines, basic structure

**Enhancement Plan**:
1. Extract competition strategy from sessions
2. Keywords: "award", "competition", "NCWIT", "hackathon", "recognition", "honor"
3. Add Jenny's award frameworks:
   - High-ROI competitions (NCWIT, hackathons, Olympiads)
   - Application optimization tactics
   - Positioning for recognition
   - Strategic competition selection
4. Build system prompt with:
   - "Target high-ROI competitions"
   - "Quality applications over quantity"
   - "Positioning is everything"
   - "Timeline backwards from deadline"
5. Few-shot examples: 5 real award strategy exchanges
6. Tools: get_awards, search_competitions, NSM recognition
7. Success criteria: 3-5 targeted competitions, application strategy, timeline

**Estimated Effort**: 2 days

---

### Agent 4: Essay Agent

**Current State**: 219 lines, moderate structure

**Enhancement Plan**:
1. Extract essay coaching from sessions
2. Keywords: "essay", "story", "narrative", "common app", "supplement", "vulnerability"
3. Add Jenny's essay frameworks:
   - Vulnerability dosing (strategic self-disclosure)
   - Identity fusion in essays
   - Specificity enforcement (no generic narratives)
   - Cultural identity reframing
   - Parent story alchemy
4. Build system prompt with:
   - "Show, don't tell"
   - "Specificity beats generalities"
   - "Cultural identity as differentiator"
   - "Vulnerability dosing: authentic but strategic"
5. Few-shot examples: 5 real essay coaching exchanges
6. Tools: get_essays, get_essay_drafts, get_relevant_tactics (essay category)
7. Success criteria: Clear essay strategy, authentic voice, differentiation

**Estimated Effort**: 2-3 days

---

### Agent 5: College List Agent

**Current State**: 250 lines, has tools

**Enhancement Plan**:
1. Extract college selection strategy from sessions
2. Keywords: "college", "Stanford", "MIT", "reach", "safety", "fit", "list"
3. Add Jenny's college frameworks:
   - Strategic targeting (hidden dream school)
   - Fit analysis (academic + cultural + opportunity)
   - Reach/target/safety tiering
   - Application strategy per school type
4. Build system prompt with:
   - "Fit > prestige"
   - "Strategic targeting: know your reach goal"
   - "Safety schools you'd actually attend"
   - "Research opportunities matter for STEM"
5. Few-shot examples: 5 real college selection exchanges
6. Tools: get_college_list, get_college_fit_analysis, search_colleges
7. Success criteria: Balanced list (2-3 reach, 3-4 target, 2 safety), fit rationale

**Estimated Effort**: 2 days

---

### Agent 6: Scholarship Agent

**Current State**: 188 lines, basic tools

**Enhancement Plan**:
1. Extract scholarship strategy from sessions
2. Keywords: "scholarship", "financial aid", "merit", "funding", "cost"
3. Add Jenny's scholarship frameworks:
   - Merit vs need-based strategy
   - Local scholarship optimization
   - Essay recycling tactics
   - Timeline management
4. Build system prompt with:
   - "Start with local scholarships (highest ROI)"
   - "Recycle essays strategically"
   - "Quality applications > quantity"
   - "Track deadlines rigorously"
5. Few-shot examples: 3-5 real scholarship exchanges
6. Tools: search_scholarships, get_scholarship_applications, get_financial_aid_profile
7. Success criteria: 10-15 targeted scholarships, application timeline, essay plan

**Estimated Effort**: 1-2 days

---

### Agent 7: Summer Programs Agent

**Current State**: 213 lines, has tools

**Enhancement Plan**:
1. Extract summer program strategy from sessions
2. Keywords: "summer program", "TASP", "RSI", "internship", "research", "camp"
3. Add Jenny's program frameworks:
   - High-prestige programs (TASP, RSI, MITES, etc.)
   - ROI analysis (prestige vs learning vs cost)
   - Application strategy (essays, recs, timing)
   - Backup options (paid vs free, local vs national)
4. Build system prompt with:
   - "Target 2-3 reach programs + backups"
   - "Demonstrate genuine interest, not resume padding"
   - "Free programs first, paid if needed"
   - "Align with academic interests"
5. Few-shot examples: 3-5 real program recommendation exchanges
6. Tools: search_summer_programs, get_program_applications, get_program_fit_analysis
7. Success criteria: 5-8 program targets, application strategy, timeline

**Estimated Effort**: 1-2 days

---

### Agent 8: Weekly Execution Agent

**Current State**: 179 lines, basic structure

**Enhancement Plan**:
1. Extract task management from sessions
2. Keywords: "this week", "deadline", "todo", "next steps", "action items", "priority"
3. Add Jenny's execution frameworks:
   - 168-Hour Framework integration
   - Priority matrix (urgent/important)
   - Time-boxing tactics
   - Procrastination intervention
4. Build system prompt with:
   - "Focus on next 1-2 weeks only"
   - "Break down tasks to <2 hour chunks"
   - "Deadlines drive priorities"
   - "Celebrate completions"
5. Few-shot examples: 5 real weekly planning exchanges
6. Tools: get_weekly_tasks, get_deadlines, get_completed_tasks, update_task_status
7. Success criteria: Clear weekly priorities (3-5 tasks), time allocations, deadlines

**Estimated Effort**: 2 days

---

### Agent 9: Admissions Agent

**Current State**: 283 lines, moderate implementation

**Enhancement Plan**:
1. Extract AO perspective coaching from sessions
2. Keywords: "admissions officer", "AO", "review process", "holistic", "application"
3. Add Jenny's AO frameworks:
   - Holistic review criteria
   - What AOs look for (beyond stats)
   - Red flags to avoid
   - Positioning for review
4. Build system prompt with:
   - "Think like an AO"
   - "Holistic = academics + impact + character"
   - "Narrative coherence matters"
   - "Differentiation is key"
5. Few-shot examples: 3-5 real AO perspective exchanges
6. Tools: get_application_strength, analyze_positioning, NSM dashboard
7. Success criteria: Clear AO perspective, positioning insights, red flag identification

**Estimated Effort**: 1-2 days

---

## 🗓️ Implementation Timeline

### Week 1: Data Extraction & Analysis
- **Days 1-2**: Extract domain coaching examples from 93 session files
- **Days 3-4**: Manual quality review, select best examples per domain
- **Day 5**: Format examples as few-shot prompts, prepare agent enhancement data

### Week 2: Agent Enhancement (Batch 1)
- **Days 1-2**: Enhance GamePlan + ECs + Awards agents
- **Day 3**: Test enhanced agents, validate real coaching patterns
- **Days 4-5**: Enhance Essay + College List agents

### Week 3: Agent Enhancement (Batch 2)
- **Days 1-2**: Enhance Scholarship + Summer Programs agents
- **Days 2-3**: Enhance Weekly Execution + Admissions agents
- **Days 4-5**: Create agent specification docs (similar to Assessment spec)

### Week 4: Multi-Agent Integration
- **Days 1-2**: Test handoff workflows, agent-to-agent communication
- **Days 3-4**: Build multi-agent orchestration layer
- **Day 5**: Agent management dashboard, end-to-end testing

**Total Timeline**: 4 weeks to production-ready 10-agent platform

---

## 📊 Success Metrics

**Per-Agent Quality**:
- ✅ Real coaching examples integrated (3-5 few-shot per agent)
- ✅ Domain-specific system prompt with Jenny's authentic patterns
- ✅ Tool integration tested and working
- ✅ Agent spec document created

**Multi-Agent Quality**:
- ✅ Handoffs working between related agents
- ✅ No duplicate logic across agents
- ✅ Consistent Jenny voice across all agents
- ✅ End-to-end student journey testable

**Platform Quality**:
- ✅ All 10 agents production-ready
- ✅ AgentRegistry routing tested
- ✅ Agent management dashboard functional
- ✅ Documentation complete

---

## 🔄 Iteration Strategy

**After Initial Build**:
1. Collect real student usage data
2. Identify agent quality gaps
3. Extract more coaching examples for weak areas
4. Refine system prompts based on actual queries
5. Enhance multi-agent collaboration patterns

**After Multi-Agent Platform Complete**:
- Return to parked P0/P2 items (jenny_v11_eq, Pinecone, latency)
- Fine-tune specialized agent models
- Build agent analytics and optimization

---

## 📚 References

**Architecture Docs**:
- Foundation Agents Architecture: `docs/FOUNDATION_AGENTS_ARCHITECTURE.md`
- Assessment Agent Spec: `docs/ASSESSMENT_AGENT_SPEC.md`
- Backlog: `docs/BACKLOG_CRITICAL_ITEMS.md`

**Data Sources**:
- 93 sessions: `data/eq/sessions/jenny_eq_session_w001-w093_extract.json`
- 7 iMessage: `data/eq/imsg/jenny_eq_extract_imsg_1-7.json`
- Knowledge Moat: Available via KnowledgeMoatRepository

**Implementation**:
- Agents: `services/agent-framework/src/agents/`
- Tools: `services/agent-framework/src/tools/resolverTools.ts`
- Registry: `services/agent-framework/src/core/AgentRegistry.ts`

---

**Status**: Ready to begin Week 1 data extraction
**Next Step**: Extract domain-specific coaching examples from 93 session files
**Owner**: TBD
