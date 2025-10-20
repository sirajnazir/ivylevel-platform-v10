# Quick Test Prompts - Copy & Paste Ready

**Student ID:** huda-2025
**Purpose:** Verify zero hallucination across all agents

---

## 🚀 Quick Test Suite (Copy & Paste These)

### 1️⃣ Programs (SummerProgramsAgent)
```
Which summer programs did I get into?
```
**Expected:** JCamp (AAJA), Kode With Klossy | **NOT:** "Girls Who Code"

---

### 2️⃣ Awards (AwardsAgent)
```
What awards have I won?
```
**Expected:** 6 real awards | **NOT:** "AIME Qualifier", "State Math Competition"

---

### 3️⃣ Colleges (CollegeListAgent)
```
What colleges am I applying to?
```
**Expected:** 28 colleges (Barnard, Brown, CMU...) | **NOT:** "Palo Alto HS", "GPA: 4.15"

```
Where am I going to college?
```
**Expected:** UIUC | **NOT:** Multiple colleges

---

### 4️⃣ Extracurriculars (ExtracurricularsAgent)
```
What are my extracurricular activities?
```
**Expected:** Real ECs from database | **NOT:** "Robotics Team", "Science Research"

---

### 5️⃣ Scholarships (ScholarshipAgent)
```
What scholarships have I received?
```
**Expected:** Real data or "No data found" | **NOT:** "Community Foundation", "$25,000"

---

### 6️⃣ Weekly Tasks (WeeklyExecutionAgent)
```
What did I accomplish this week?
```
**Expected:** Real JTBD data or "No data found" | **NOT:** "MIT essay", "Ms. Johnson"

---

### 7️⃣ Game Plan (GamePlanAgent)
```
What should I be working on?
```
**Expected:** Strategy based on real data | **NOT:** "Ms. Johnson", "Stanford supplemental"

---

### 8️⃣ NSM Dashboard (Cross-Agent Test)
```
Show me my North Star Metrics dashboard
```
**Expected:** 6 awards, 28 colleges, 2 programs attended, 11 AP courses | **NOT:** Placeholder stats

---

## 🔴 RED FLAGS (Hallucinations)

If you see ANY of these, report immediately:

- ❌ "Girls Who Code Summer Program"
- ❌ "AIME Qualifier" or "State Math Competition"
- ❌ "GPA: 4.15" or "SAT: 1480"
- ❌ "Palo Alto High School"
- ❌ "Ms. Johnson" or "Mr. Chen"
- ❌ "$25,000" or "Community Foundation Scholarship"
- ❌ "MIT essay" or "UC PIQ #3"
- ❌ "Robotics Team Captain" or "Science Research"
- ❌ JCamp appearing in BOTH attended AND planned lists

---

## ✅ GREEN FLAGS (Correct Data)

These should appear:

- ✅ JCamp (AAJA) - programs attended
- ✅ Kode With Klossy - programs attended
- ✅ 6 awards (exact count)
- ✅ 28 colleges total
- ✅ 9 college acceptances
- ✅ UIUC as attending college
- ✅ 11 AP courses
- ✅ Real SAT/GPA from database
- ✅ "No data found" when appropriate

---

## 📝 Pass/Fail Checklist

```
[ ] Test 1: Programs - NO "Girls Who Code"
[ ] Test 2: Awards - NO "AIME Qualifier"
[ ] Test 3: Colleges - NO "Palo Alto HS" or placeholder stats
[ ] Test 4: ECs - NO "Robotics Team"
[ ] Test 5: Scholarships - NO "Community Foundation"
[ ] Test 6: Weekly - NO "MIT essay" or "Ms. Johnson"
[ ] Test 7: Game Plan - NO "Ms. Johnson" or fake colleges
[ ] Test 8: NSM - All counts accurate, NO duplicates

RESULT: _____ / 8 tests passed
```

---

**If all 8 tests pass → ✅ PRODUCTION READY**
**If any fail → 🚨 Report back with details**
