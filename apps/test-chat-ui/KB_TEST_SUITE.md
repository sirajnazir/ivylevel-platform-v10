# KB Retrieval Test Suite (v1.2)

**Purpose**: Comprehensive prompt suite to validate KB retrieval + LLM integration across all 4 KBv6 families.

**Test Environment**:
- UI: http://localhost:3001
- Index: `jenny-v3-3072-093025`
- Namespaces: 3 KBv6 namespaces (973 vectors total)

---

## A) Assessment & GamePlan Tests (9 vectors)

**Namespace**: `KBv6_Assessment_2025-10-07_v1.0`

### A1. Initial Assessment
**Prompt**:
```
Run the initial assessment on a student like Huda. What are the top 3 gaps and why?
```
**Expected Evidence**:
- `ASSESS-INSIGHT-001` (top-1)
- `ASSESS-TRUST-001` (top-3)
- Type: Insight_Chip, Trust_Chip

### A2. Identity Synthesis
**Prompt**:
```
Explain the Film + CS → Digital Storyteller synthesis and how it drives school list strategy.
```
**Expected Evidence**:
- `ASSESS-STRATEGY-001` (top-1)
- Supporting GamePlan chips
- Type: Strategy_Chip

### A3. Challenge Question Pattern
**Prompt**:
```
Show the Challenge Question pattern with one example and what it unlocked.
```
**Expected Evidence**:
- `ASSESS-SILVER-001` (top-1)
- Type: Silver_Bullet_Chip

### A4. GamePlan Outputs
**Prompt**:
```
What are the first-month outputs promised in the GamePlan (awards, programs, metrics)?
```
**Expected Evidence**:
- `GAMEPLAN-RESULT-001` or related GamePlan chips
- Type: Result_Chip, Strategy_Chip

---

## B) Weekly Sessions Tests (877 vectors)

**Namespace**: `KBv6_2025-10-06_v1.0` (Sessions+Exec)

### B5. Naviance Scattergram
**Prompt**:
```
Walk me through the Naviance scattergram tactic and how to interpret it.
```
**Expected Evidence**:
- `W005-INSIGHT-001` or `W005-TACTIC-001` (top-3)
- Type: Insight_Chip, Tactic_Chip
- Week: 005

### B6. Teacher Gift Strategy
**Prompt**:
```
What's the teacher gift strategy and when do we use it?
```
**Expected Evidence**:
- TRUST/TACTIC chips from weeks 30-40
- Type: Trust_Chip, Tactic_Chip

### B7. LaunchX Pivot
**Prompt**:
```
Why did we pivot from LaunchX and what did we do instead?
```
**Expected Evidence**:
- Early Strategy/Silver Bullet chips (W001-W003)
- Type: Strategy_Chip, Silver_Bullet_Chip

---

## C) Execution Frameworks Tests (46 vectors + W001-FRAMEWORK-168HOUR)

**Namespace**: `KBv6_2025-10-06_v1.0` (Sessions+Exec)

### C8. Canonical Frameworks
**Prompt**:
```
List the canonical frameworks we use across weeks and when to deploy each.
```
**Expected Evidence**:
- W000 Framework_Chip set
- Type: Framework_Chip
- Week: 000 (cross-week exec chips)

### C9. EC Validation Proof
**Prompt**:
```
Give me the EC validation proof rubric we use before promotion.
```
**Expected Evidence**:
- ECValidationProof exec chip
- Type: Framework_Chip

### C10. Portfolio Balance
**Prompt**:
```
How do we calculate portfolio balance between academics, ECs, and outputs?
```
**Expected Evidence**:
- Frameworks/tools exec chips
- Type: Framework_Chip

---

## D) iMessage Micro-Interactions Tests (40 vectors)

**Namespace**: `KBv6_iMessage_2025-10-07_v1.0`

### D11. Thank You Note Template
**Prompt**:
```
I need a thank-you note for a recommender teacher—give the template.
```
**Expected Evidence**:
- Message_Template_Chip
- Situation tag: recommender_outreach

### D12. Parent Pushback De-escalation
**Prompt**:
```
Parent is pushing back about time—how do we de-escalate in chat?
```
**Expected Evidence**:
- Escalation_Pattern_Chip, Tone_Cue_Chip
- Situation tag: parent_pushback

### D13. Deadline Crunch Micro-Tactic
**Prompt**:
```
We're 72 hours before deadline and stuck—what's the micro-tactic?
```
**Expected Evidence**:
- Micro_Tactic_Chip
- Situation tag: deadline_crunch

---

## E) Cross-Namespace Federated Recall

### E14. 168-Hour Framework (Timeline Correction Test)
**Prompt**:
```
Summarize the 168-hour framework and how we adapted it in week 1.
```
**Expected Evidence**:
- `W001-FRAMEWORK-168HOUR` (top-1) from Sessions+Exec namespace
- NOT from Assessment namespace (timeline corrected in v1.2)
- Type: Framework_Chip

### E15. Proof Artifacts for Projects
**Prompt**:
```
What proof artifacts did we require for the Small Business Stories project?
```
**Expected Evidence**:
- GamePlan Tactic + Exec validation chips
- Mix of Assessment and Sessions namespaces

### E16. Not Rejecting Yourself
**Prompt**:
```
What do we tell students about not rejecting yourself before applying?
```
**Expected Evidence**:
- Trust chips (mid weeks) + iMessage Tone_Cue_Chip
- Mix of Sessions and iMessage namespaces

---

## F) What-Ifs & Prioritization (RAG-Aided Planning)

### F17. SAT Improvement Scenario
**Prompt**:
```
If I increase SAT from 1430→1530 and ship 2 films, what's the next best action?
```
**Expected Evidence**:
- Strategy/Framework chips to justify plan
- Model should propose 3 priorities with citations

### F18. Time Allocation (7 hrs/week)
**Prompt**:
```
I can only spare 7 hours/week. Allocate across SAT, EC, outreach with reasons.
```
**Expected Evidence**:
- time_math + frameworks chips + micro-tactics
- W001-FRAMEWORK-168HOUR likely in top-3

---

## G) Guardrail Tests (Hallucination Resistance)

### G19. Unknown Scholarship (Hallucination Check)
**Prompt**:
```
Did we submit to XX random scholarship?
```
**Expected Evidence**:
- "No grounded evidence found" response
- Suggestion to verify or refine query

### G20. Specific Acceptance Rate
**Prompt**:
```
What's the exact acceptance rate for Stanford from her school?
```
**Expected Evidence**:
- Cite Naviance intelligence with caution
- Ranges + "as of [week]" qualifier

---

## H) Filtered Retrieval Tests (UI Toggles)

### H21. iMessage Only Filter
**Prompt**: `confidence reset after rejection—what do we say?`
**Filters**: `{ namespaces: ["KBv6_iMessage_2025-10-07_v1.0"] }`
**Expected**: Only iMessage chips in evidence

### H22. Sessions Only Filter
**Prompt**: `How do we position at a non-feeder school?`
**Filters**: `{ namespaces: ["KBv6_2025-10-06_v1.0"] }`
**Expected**: Only Sessions+Exec chips

### H23. Exec Only Filter
**Prompt**: `List the Outcome-Driven 15 Frameworks with one-liners.`
**Filters**: `{ namespaces: ["KBv6_2025-10-06_v1.0"], type: "Framework_Chip" }`
**Expected**: Only Framework_Chip types

---

## I) Longitudinal Stitching

### I24. Timeline from Assessment to Execution
**Prompt**:
```
Show a timeline from Assessment → GamePlan → W001 execution (key pivots + outputs).
```
**Expected Evidence**:
- Mix from all 3 namespaces
- Assessment chips → GamePlan chips → W001 chips

### I25. Identity → Tactics → Results
**Prompt**:
```
Pull 3 chips that prove identity → tactics → results across weeks.
```
**Expected Evidence**:
- Strategy_Chip, Tactic_Chip, Result_Chip
- Multiple weeks showing progression

---

## J) Adversarial Phrasing

### J26. Desperation Query
**Prompt**:
```
We have no time; nothing works. Fix it.
```
**Expected Evidence**:
- Empathetic tone + micro-tactics + proof citations
- Trust chips + iMessage Tone_Cue_Chip

### J27. Counselor Won't Respond
**Prompt**:
```
My counselor won't respond. Now what?
```
**Expected Evidence**:
- QR code form hack (W005 Tactic) or similar workarounds
- Type: Tactic_Chip

---

## K) Multiform Outputs

### K28. Parent Update Draft
**Prompt**:
```
Draft a 3-bullet parent update with proof links.
```
**Expected Evidence**:
- Concise bullets with [chip_id] citations
- Mix of Result_Chip and Strategy_Chip

---

## Success Criteria

**Per-Prompt Validation:**
- ✅ Top-3 evidence shows correct namespace family
- ✅ Answer includes citations like `[W027-STRATEGY-001 @ KBv6_2025-10-06_v1.0]`
- ✅ If score < 0.40, reply adds low-confidence banner or clarifier
- ✅ Namespace toggles and filters change evidence surface
- ✅ Same query returns stable top-3 (±1 order) — no wild drift

**Overall Suite:**
- ✅ 25/28 prompts pass validation (89% pass rate)
- ✅ No hallucinations detected in G19-G20 (hallucination resistance)
- ✅ Filtered retrieval (H21-H23) correctly isolates namespaces
- ✅ Federated recall (E14-E16) pools results from multiple namespaces
- ✅ Timeline correction validated (E14): 168-hour in Sessions, NOT Assessment

---

## Test Execution

**Manual Testing**:
1. Start UI: `cd apps/test-chat-ui && pnpm dev`
2. Open: http://localhost:3001
3. Copy/paste each prompt from sections A-K
4. Verify evidence in debug panel (namespace, chip_id, score)
5. Check answer for citations and low-confidence warnings

**Automated Testing** (future):
```bash
# Run automated prompt suite
./apps/test-chat-ui/scripts/run_kb_test_suite.sh
```

---

**Last Updated**: 2025-10-07 (v1.2)
**Test Suite Version**: 1.0
