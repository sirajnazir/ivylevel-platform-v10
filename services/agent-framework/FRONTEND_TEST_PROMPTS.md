# Frontend Test Prompts - Hallucination Verification
**Date:** 2025-10-20
**Purpose:** Test all 7 fixed agents in the frontend UI
**Student ID:** huda-2025

---

## 🎯 Test Objectives

1. **Verify agents use tools** (not hard-coded examples)
2. **Verify NO hallucinated data** (no "Girls Who Code", "AIME", "Ms. Johnson", etc.)
3. **Verify real data from database** (JCamp, real colleges, real awards, etc.)
4. **Verify final precedence logic** (no duplicate programs in planned vs. attended)

---

## Test Setup

### Login Credentials
```
Email: huda@example.com
Password: TestPassword2025! (or whatever is set for huda-2025)
```

### Expected Data for huda-2025 (from database)
- **Programs Attended:** JCamp (AAJA), Kode With Klossy
- **Programs Planned:** ~4 programs (NOT including JCamp)
- **Awards:** 6 awards (from v_awards_won)
- **Colleges:** 28 colleges total, 9 acceptances, attending UIUC
- **SAT:** First attempt, latest scores
- **GPA:** Unweighted and weighted
- **AP Courses:** 11 total

---

## 📝 Test Prompts

### TEST 1: SummerProgramsAgent
**Category:** Programs
**Risk:** Previously hallucinated "Girls Who Code Summer Program"

#### Prompt 1.1: Programs Attended
```
Which summer programs did I get into?
```

**Expected Response:**
- ✅ JCamp (AAJA)
- ✅ Kode With Klossy
- ❌ NO "Girls Who Code Summer Program"
- ❌ NO other hallucinated programs

**What to Check:**
- [ ] Agent calls `get_programs_list` tool (check logs if available)
- [ ] Response shows exactly 2 programs
- [ ] NO "Girls Who Code" mentioned anywhere
- [ ] Program names match database exactly

---

#### Prompt 1.2: Programs Planned
```
What programs am I planning to apply to?
```

**Expected Response:**
- ✅ ~4-5 planned programs from v_programs_initial
- ❌ JCamp should NOT appear here (final precedence)
- ❌ Kode With Klossy should NOT appear here (final precedence)
- ❌ NO "Girls Who Code" mentioned

**What to Check:**
- [ ] Agent calls `get_programs_list` with phase="initial"
- [ ] JCamp is NOT in planned list (it's in attended)
- [ ] Kode With Klossy is NOT in planned list (it's in attended)
- [ ] Only programs NOT in attended list appear here

---

### TEST 2: AwardsAgent
**Category:** Awards
**Risk:** Previously hallucinated "AIME Qualifier", "State Math Competition"

#### Prompt 2.1: Awards Won
```
What awards have I won?
```

**Expected Response:**
- ✅ 6 awards from v_awards_won
- ❌ NO "AIME Qualifier"
- ❌ NO "State Math Competition"
- ❌ NO "USAMO"

**What to Check:**
- [ ] Agent calls `get_awards_list` tool
- [ ] Response shows exactly 6 awards
- [ ] Award names match database exactly
- [ ] NO math competition examples unless actually in database

---

#### Prompt 2.2: Award Recommendations
```
What awards should I target next?
```

**Expected Response:**
- ✅ Strategic recommendations based on actual profile
- ✅ May mention general award types (e.g., "national science competitions")
- ❌ Should first call `get_awards_list` to see what student already has
- ❌ Should NOT assume student has specific awards

**What to Check:**
- [ ] Agent first queries current awards before recommending
- [ ] Recommendations are based on actual gaps in profile
- [ ] NO assumptions about awards student already has

---

### TEST 3: CollegeListAgent
**Category:** College List
**Risk:** Previously hallucinated "GPA: 4.15", "SAT: 1480", "Palo Alto High School"

#### Prompt 3.1: College List
```
What colleges am I applying to?
```

**Expected Response:**
- ✅ 28 colleges from college_list table
- ✅ Grouped by bucket: Reach, Match, Safety
- ❌ NO "Palo Alto High School" mentioned
- ❌ NO placeholder stats like "GPA: 4.15" or "SAT: 1480"

**What to Check:**
- [ ] Agent calls `get_college_list` tool
- [ ] Response shows 28 colleges (or close to it)
- [ ] Colleges are real names from database (Barnard, Brown, CMU, etc.)
- [ ] NO "Stanford" or "MIT" unless actually in student's college list

---

#### Prompt 3.2: College Acceptances
```
Which colleges accepted me?
```

**Expected Response:**
- ✅ 9 acceptances from college_list table
- ✅ Shows college names, programs, decision results
- ❌ NO placeholder data

**What to Check:**
- [ ] Agent calls `get_college_acceptances` tool
- [ ] Response shows exactly 9 acceptances
- [ ] College names match database exactly

---

#### Prompt 3.3: College Attending
```
Where am I going to college?
```

**Expected Response:**
- ✅ UIUC (University of Illinois Urbana-Champaign)
- ✅ Shows program and attending status
- ❌ NO other college mentioned as attending

**What to Check:**
- [ ] Agent calls `get_college_attending` tool
- [ ] Response shows exactly 1 college with attending=true
- [ ] UIUC is the college mentioned

---

### TEST 4: ExtracurricularsAgent
**Category:** Extracurriculars
**Risk:** Previously hallucinated "Robotics Team Captain", "Science Research"

#### Prompt 4.1: EC List
```
What are my extracurricular activities?
```

**Expected Response:**
- ✅ Actual ECs from kb_items (item_type = EC)
- ❌ NO "Robotics Team"
- ❌ NO "Science Research"

**What to Check:**
- [ ] Agent calls `get_ecs_list` tool
- [ ] Response shows actual ECs from database
- [ ] NO hard-coded EC examples mentioned

---

#### Prompt 4.2: EC Recommendations
```
How can I improve my extracurriculars?
```

**Expected Response:**
- ✅ First queries current ECs using `get_ecs_list`
- ✅ Provides strategic recommendations based on actual profile
- ❌ NO assumptions about what ECs student currently has

**What to Check:**
- [ ] Agent calls `get_ecs_list` before recommending
- [ ] Recommendations are based on actual gaps
- [ ] NO hallucinated current activities

---

### TEST 5: ScholarshipAgent
**Category:** Scholarships
**Risk:** Previously hallucinated "$25,000", "Community Foundation Scholarship"

#### Prompt 5.1: Scholarship List
```
What scholarships have I received?
```

**Expected Response:**
- ✅ Actual scholarships from database (if any)
- ❌ NO "$25,000 in scholarships"
- ❌ NO "Community Foundation Scholarship"
- ❌ NO "Gates Millennium Scholarship"
- ❌ NO "Dell Scholars Program"

**What to Check:**
- [ ] Agent calls scholarship tools
- [ ] If no scholarships in database, should say "No scholarship data found"
- [ ] NO hard-coded scholarship names or amounts

---

#### Prompt 5.2: Scholarship Summary
```
Give me a scholarship summary
```

**Expected Response:**
- ✅ Actual counts and totals from database
- ❌ NO placeholder percentages like "42% acceptance rate"
- ❌ NO placeholder amounts like "$25,000 total"

**What to Check:**
- [ ] Agent queries actual scholarship data
- [ ] Calculates totals from real data (not placeholders)
- [ ] If no data, says "No scholarship data available"

---

### TEST 6: WeeklyExecutionAgent
**Category:** Weekly Tasks / JTBD
**Risk:** Previously hallucinated "MIT essay", "UC PIQ #3", "Ms. Johnson"

#### Prompt 6.1: Weekly Progress
```
What did I accomplish this week?
```

**Expected Response:**
- ✅ Actual JTBD data from database (if any)
- ❌ NO "MIT essay draft"
- ❌ NO "UC Personal Insight #3"
- ❌ NO "Ms. Johnson" or "Mr. Chen"
- ❌ NO "Stanford supplemental"

**What to Check:**
- [ ] Agent calls `get_jtbd_week` tool
- [ ] If no data, should say "No weekly data found"
- [ ] NO hard-coded task names or teacher names

---

#### Prompt 6.2: Pending Tasks
```
What do I need to do this week?
```

**Expected Response:**
- ✅ Actual pending tasks from JTBD system (if any)
- ❌ NO invented deadlines or tasks

**What to Check:**
- [ ] Agent calls `get_jtbd_pending` tool
- [ ] Only shows actual pending items from database
- [ ] NO fabricated tasks

---

### TEST 7: GamePlanAgent
**Category:** Game Plan / Strategy
**Risk:** Previously hallucinated "Ms. Johnson", "Mr. Chen", "Stanford", "MIT"

#### Prompt 7.1: Game Plan Overview
```
What should I be working on?
```

**Expected Response:**
- ✅ Strategic recommendations based on actual NSM dashboard data
- ✅ May call `get_nsm_dashboard`, `get_college_list`, `get_jtbd_pending`
- ❌ NO "Request recommendation from Ms. Johnson"
- ❌ NO "Draft Stanford supplemental essay"
- ❌ NO "Complete UC PIQ #3"
- ❌ NO specific teacher names unless from database

**What to Check:**
- [ ] Agent calls `get_nsm_dashboard` to get profile status
- [ ] Agent calls `get_college_list` to see application targets
- [ ] Recommendations are based on actual data (not examples)
- [ ] NO hard-coded teacher names, colleges, or essay prompts

---

#### Prompt 7.2: Profile Assessment
```
Where do I stand in the college application process?
```

**Expected Response:**
- ✅ Calls `get_nsm_dashboard` for comprehensive metrics
- ✅ Shows actual stats: SAT, GPA, awards count, ECs count, etc.
- ❌ NO placeholder stats like "GPA: 4.15" or "SAT: 1480"

**What to Check:**
- [ ] Agent calls NSM tools to get actual profile data
- [ ] Shows real stats from database
- [ ] NO fabricated or example data

---

### TEST 8: NSM Dashboard (Cross-Agent Test)
**Category:** North Star Metrics
**Purpose:** Verify comprehensive profile data

#### Prompt 8.1: NSM Dashboard
```
Show me my North Star Metrics dashboard
```

**Expected Response:**
- ✅ Recognition vitals: 6 awards won
- ✅ Academic vitals: SAT scores, GPA, 11 AP courses
- ✅ College vitals: 28 colleges, 9 acceptances, 1 attending (UIUC)
- ✅ Program vitals: 2 attended, ~4 planned
- ❌ NO placeholder data
- ❌ NO hallucinated metrics

**What to Check:**
- [ ] Agent calls `get_nsm_dashboard` tool
- [ ] All metrics match database exactly
- [ ] Programs: 2 attended (JCamp, Kode With Klossy), NO duplicates in planned
- [ ] Awards: 6 total
- [ ] Colleges: 28 total, 9 acceptances, UIUC attending

---

#### Prompt 8.2: Academic Metrics
```
What are my academic stats?
```

**Expected Response:**
- ✅ SAT scores (actual from database)
- ✅ GPA (unweighted and weighted)
- ✅ AP courses: 11 total
- ❌ NO "SAT: 1480" placeholder
- ❌ NO "GPA: 4.15" placeholder

**What to Check:**
- [ ] Agent calls `get_nsm_academic` or `get_sat_scores` / `get_gpa`
- [ ] Shows actual SAT/GPA from database
- [ ] AP course count is 11 (or matches database)

---

## 🔍 How to Identify Hallucinations

### Red Flags (Signs of Hallucination)
❌ **Hard-coded Examples:**
- "Girls Who Code Summer Program"
- "AIME Qualifier", "State Math Competition", "USAMO"
- "GPA: 4.15", "SAT: 1480"
- "Palo Alto High School"
- "Ms. Johnson", "Mr. Chen"
- "$25,000", "Community Foundation Scholarship", "Gates Millennium"
- "MIT essay", "UC PIQ #3", "Stanford supplemental"
- "Robotics Team Captain", "Science Research"

❌ **Placeholder Stats:**
- "42% acceptance rate" (unless calculated from real data)
- "71% completion rate" (unless from JTBD system)
- "3-week streak" (unless from real data)

❌ **Duplicate Programs:**
- JCamp appearing in BOTH attended and planned lists

### Green Flags (Correct Behavior)
✅ **Real Data from Database:**
- JCamp (AAJA), Kode With Klossy
- Barnard, Brown, Carnegie Mellon (real colleges)
- UIUC as attending college
- 6 awards (exact count)
- 28 colleges, 9 acceptances
- 11 AP courses

✅ **Agent Behavior:**
- Calls database tools before responding
- Says "No data found" when appropriate (instead of making up data)
- Uses EXACT names from database
- Calculates totals from real data (not placeholders)

---

## 📊 Test Results Template

Use this template to record your test results:

```
TEST RESULTS - HALLUCINATION VERIFICATION
Date: 2025-10-20
Tester: [Your Name]
Student ID: huda-2025

TEST 1: SummerProgramsAgent
  Prompt 1.1: "Which summer programs did I get into?"
  ✅ / ❌ Shows JCamp (AAJA) and Kode With Klossy
  ✅ / ❌ NO "Girls Who Code" mentioned
  ✅ / ❌ Agent called get_programs_list tool
  Notes: _______________________

  Prompt 1.2: "What programs am I planning to apply to?"
  ✅ / ❌ Shows planned programs only (no JCamp)
  ✅ / ❌ NO "Girls Who Code" mentioned
  ✅ / ❌ Final precedence working (no duplicates)
  Notes: _______________________

TEST 2: AwardsAgent
  Prompt 2.1: "What awards have I won?"
  ✅ / ❌ Shows 6 awards
  ✅ / ❌ NO "AIME Qualifier" or "State Math Competition"
  ✅ / ❌ Agent called get_awards_list tool
  Notes: _______________________

TEST 3: CollegeListAgent
  Prompt 3.1: "What colleges am I applying to?"
  ✅ / ❌ Shows 28 colleges
  ✅ / ❌ NO "Palo Alto High School" or placeholder stats
  ✅ / ❌ Real college names (Barnard, Brown, CMU, etc.)
  Notes: _______________________

  Prompt 3.3: "Where am I going to college?"
  ✅ / ❌ Shows UIUC only
  ✅ / ❌ Agent called get_college_attending tool
  Notes: _______________________

TEST 4: ExtracurricularsAgent
  Prompt 4.1: "What are my extracurricular activities?"
  ✅ / ❌ Shows real ECs from database
  ✅ / ❌ NO "Robotics Team" or "Science Research"
  ✅ / ❌ Agent called get_ecs_list tool
  Notes: _______________________

TEST 5: ScholarshipAgent
  Prompt 5.1: "What scholarships have I received?"
  ✅ / ❌ Shows real scholarships OR "No data found"
  ✅ / ❌ NO "Community Foundation" or "$25,000"
  ✅ / ❌ Agent called scholarship tools
  Notes: _______________________

TEST 6: WeeklyExecutionAgent
  Prompt 6.1: "What did I accomplish this week?"
  ✅ / ❌ Shows real JTBD data OR "No weekly data"
  ✅ / ❌ NO "MIT essay" or "Ms. Johnson"
  ✅ / ❌ Agent called get_jtbd_week tool
  Notes: _______________________

TEST 7: GamePlanAgent
  Prompt 7.1: "What should I be working on?"
  ✅ / ❌ Shows recommendations based on real data
  ✅ / ❌ NO "Ms. Johnson" or "Stanford supplemental"
  ✅ / ❌ Agent called get_nsm_dashboard tool
  Notes: _______________________

TEST 8: NSM Dashboard
  Prompt 8.1: "Show me my North Star Metrics dashboard"
  ✅ / ❌ Shows 6 awards, 28 colleges, 2 programs attended
  ✅ / ❌ NO placeholder data
  ✅ / ❌ Programs: NO duplicates (JCamp only in attended)
  Notes: _______________________

OVERALL RESULT:
✅ PASSED - All tests passed, zero hallucinations
❌ FAILED - Hallucinations detected (see notes above)

Additional Notes:
_______________________
_______________________
```

---

## 🚨 If You Find Hallucinations

**If any agent returns hard-coded examples:**

1. **Document the issue:**
   - Which agent? (AwardsAgent, ProgramsAgent, etc.)
   - Which prompt triggered it?
   - What was the hallucinated response?
   - Screenshot if possible

2. **Check agent file:**
   - Open `src/agents/[AgentName].ts`
   - Search for the hallucinated text
   - Verify it was removed from system prompt

3. **Check server restart:**
   - Verify agent server was restarted after code changes
   - Check process: `lsof -ti :4101`
   - Restart if needed: `pkill -f "tsx src/server-agents.ts" && tsx src/server-agents.ts &`

4. **Report back:**
   - Agent name + exact prompt + response
   - We'll investigate and fix immediately

---

## ✅ Expected Success Criteria

**ALL tests should pass with:**
- ✅ Zero hard-coded examples mentioned
- ✅ Real data from database displayed
- ✅ Agents calling tools (not hallucinating)
- ✅ Final precedence working (no duplicate programs)
- ✅ Accurate counts (6 awards, 28 colleges, 2 programs attended, etc.)

**If all tests pass → PRODUCTION READY**

---

**Test Suite Version:** 1.0
**Last Updated:** 2025-10-20
**Status:** Ready for frontend testing
