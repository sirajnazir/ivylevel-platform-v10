# UI Test Guide — v1.4 Scale Features

## 🚀 Quick Start

1. Open browser: **http://localhost:3001/kb-test**
2. Make sure "Show Debug Panel" is checked ✅
3. Run the test queries below

---

## ✅ Test 1: Intent Lexicon Expansion (New Tags)

**What to test**: New intent rules fire and apply tag-specific priors

### Query 1: Self-Rejection/Mindset
```
I don't think I'm good enough for top schools
```

**Expected**:
- 🧭 **Scaffold Routing Debug** panel shows:
  - **Matched Tags**: `[escalation, mindset]` or `[self_reject, mindset]`
  - **Applied Priors**: Should see `"mindset"` → `"KBv6_Assessment_2025-10-07_v1.0": 0.12`
- Evidence should include **Assessment** or **Trust_Chip** content

---

### Query 2: Parent Pushback
```
my parents want me to apply to all ivies but I don't want to
```

**Expected**:
- 🧭 **Matched Tags**: `[escalation, message_template]` or `[parent_pushback, ...]`
- **Applied Priors**: `"escalation"` → `"KBv6_iMessage_2025-10-07_v1.0": 0.12`
- Evidence from **iMessage namespace** (micro-tactics/escalation patterns)

---

### Query 3: Awards/Competition
```
what awards should I apply to?
```

**Expected**:
- 🧭 **Matched Tags**: `[execution_framework, tactic]` or `[award_hunting, ...]`
- **Scaffold Selected**: Auto-scaffold like `scaffold.auto.tactic.chip...` or `scaffold.auto.framework.chip...`
- Evidence: **Tactic_Chip** or **Framework_Chip** content

---

### Query 4: Time Management
```
how do I balance school and extracurriculars?
```

**Expected**:
- 🧭 **Matched Tags**: `[execution_framework, tactic]` or `[time_allocation, ...]`
- **Applied Priors**: `"execution_framework"` → `"KBv6_2025-10-06_v1.0": 0.10`
- Evidence from **Sessions+Exec namespace**

---

## ✅ Test 2: Auto-Scaffolds (33 Generated)

**What to test**: Auto-generated scaffolds fire for less common chip types

### Query 5: Micro-Tactic
```
show me a micro-tactic for deadline crunch
```

**Expected**:
- 🧭 **Scaffold Selected**: `scaffold.auto.micro.tactic.chip.kbv6_imessage_2025_10_07_v1_0`
- **Top-1 Score**: Should be high (> 0.50)
- Evidence: **Micro_Tactic_Chip** from **iMessage namespace**

---

### Query 6: Escalation Pattern
```
what do I do when parent escalates?
```

**Expected**:
- 🧭 **Scaffold Selected**: `scaffold.auto.escalation.pattern.chip.kbv6_imessage_2025_10_07_v1_0`
- Evidence: **Escalation_Pattern_Chip** content

---

### Query 7: Silver Bullet (Challenge Question)
```
what's the challenge question for identity?
```

**Expected**:
- 🧭 **Scaffold Selected**: `scaffold.auto.silver.bullet.chip...` (from Sessions or Assessment)
- Evidence: **Silver_Bullet_Chip**

---

## ✅ Test 3: Type-Aware Fallback

**What to test**: Graceful rendering when no scaffold matches

### Query 8: Rare Chip Type (Crisis, Breakthrough, etc.)
```
show me a crisis chip
```

**Expected**:
- 🧭 **Scaffold Selected**: `type_aware_fallback`
- **Answer format**:
  ```
  **Crisis_Chip** (W0XX-CRISIS-XXX):

  [content snippet]

  *Source*: KBv6_2025-10-06_v1.0
  ```
- No scaffold matched, but still renders nicely

---

### Query 9: Multiple Types in Fallback
```
show me innovation and breakthrough chips
```

**Expected**:
- 🧭 **Scaffold Selected**: `type_aware_fallback`
- **Answer**: Top 3 chips rendered with structured format
- Each chip clearly labeled with type (e.g., **Innovation_Chip**, **Breakthrough_Chip**)

---

## ✅ Test 4: LRU Cache

**What to test**: Same query twice = cache hit (faster, no embedding/Pinecone query)

### Query 10: Cache Test
**Step 1**: Run this query:
```
what is the 168-hour framework?
```

**Step 2**: Look at browser Network tab timing (or just note the response time)

**Step 3**: Run **exact same query** again immediately

**Expected**:
- Second request should be **much faster** (~50-100ms vs ~300-500ms)
- Check server logs (terminal) — should see:
  ```
  [Retrieval] Cache hit for: "what is the 168-hour framework..."
  ```
- 🧭 **Scaffold Selected**: `scaffold.time_math.168h` (handcrafted, high priority)

---

## ✅ Test 5: Low Confidence Guard (Budget Control)

**What to test**: Off-topic queries return clarifier without full RAG

### Query 11: Off-Topic
```
write me an essay about my summer vacation
```

**Expected**:
- ⚠️ **Low-confidence match detected** banner
- **Answer**: Clarifier message like:
  ```
  Could you:
  • Add more context (who/when/which)?
  • Rephrase with specific keywords?
  • Clarify if you're looking for tactics, insights, or templates?
  ```
- 🧭 **Top-1 Score**: < 0.40 (below threshold)
- System avoided expensive LLM call (token budget guard)

---

## ✅ Test 6: Scaffold Routing Debug Panel

**What to test**: Full visibility into routing decisions

### Query 12: Complex Intent
```
I need a template for thanking my teacher for the letter of recommendation
```

**Expected**:
- 🧭 **Matched Tags**: `[message_template, lor_cadence]` or `[teacher_thanks, ...]`
- 🧭 **Applied Priors**: Should show:
  ```json
  {
    "KBv6_iMessage_2025-10-07_v1.0": 0.08,
    "tags": {
      "message_template": {
        "KBv6_iMessage_2025-10-07_v1.0": 0.12
      }
    }
  }
  ```
- 🧭 **Scaffold Selected**: `scaffold.message.template` (handcrafted, priority 90) OR auto-scaffold
- 🧭 **Top-1 Score**: High confidence (> 0.60)

---

## ✅ Test 7: Universal Type Renderers (All Chip Types)

**What to test**: Each chip type has structured rendering

Try these chip types and verify structured output:

### Strategy_Chip
```
show me a strategy for college list building
```
**Expected format**:
- **Thesis**: ...
- **Decision Rule**: Use when optimizing for...
- **Trade-offs**: ...
- **Next Test**: Validate with...

---

### Tactic_Chip
```
show me a tactic for EC validation
```
**Expected format**:
- **Steps**: 1. ... 2. ... 3. ...
- **Owner**: Student (with coach support)
- **Success Metric**: Completion + tangible output/proof

---

### Framework_Chip
```
what's the framework for naviance?
```
**Expected format**:
- **What**: ...
- **Context**: ...
- **Action**: Apply this framework when...

---

### Message_Template_Chip
```
show me a teacher thank you template
```
**Expected format**:
- Template with {{placeholders}} clearly shown
- **Placeholders**: {{student_name}}, {{teacher_name}}, etc.

---

## ✅ Test 8: Analytics Logging

**What to test**: Full routing trace in server logs

### Query 13: Any Query
```
what are my top 3 gaps?
```

**Expected in terminal logs**:
```json
[Analytics] {
  "timestamp": "2025-10-07T...",
  "query": "what are my top 3 gaps?",
  "tags": ["assessment"],
  "chosen_scaffold_id": "scaffold.assessment.top3gaps",
  "top_hit_namespace": "KBv6_Assessment_2025-10-07_v1.0",
  "top_hit_id": "ASSESS-INSIGHT-001",
  "top_hit_type": "Insight_Chip",
  "top_score": 0.8234,
  "hit_count": 6
}
```

---

## ✅ Test 9: Policy Priors Working

**What to test**: Tag-specific priors boost correct namespaces

### Query 14: Escalation (should favor iMessage)
```
parent is pushing back on my school list
```

**Expected**:
- 🧭 **Matched Tags**: `[escalation, ...]`
- 🧭 **Applied Priors**: `"escalation"` → `"KBv6_iMessage_2025-10-07_v1.0": 0.12`
- **Evidence**: Top hits from **iMessage namespace** (40 vectors)

---

### Query 15: Assessment (should favor Assessment namespace)
```
diagnose my profile
```

**Expected**:
- 🧭 **Matched Tags**: `[assessment, ...]`
- 🧭 **Applied Priors**: `"assessment"` → `"KBv6_Assessment_2025-10-07_v1.0": 0.15`
- **Evidence**: Top hits from **Assessment namespace** (9 vectors)

---

## ✅ Test 10: Handcrafted Scaffolds Still Win

**What to test**: High-priority handcrafted scaffolds take precedence over auto-scaffolds

### Query 16: 168-Hour Framework (handcrafted priority 90)
```
what is the 168-hour framework?
```

**Expected**:
- 🧭 **Scaffold Selected**: `scaffold.time_math.168h` (handcrafted)
- **NOT**: `scaffold.auto.framework.chip...` (priority 50)

---

### Query 17: Top 3 Gaps (handcrafted priority 90)
```
what are my top 3 gaps?
```

**Expected**:
- 🧭 **Scaffold Selected**: `scaffold.assessment.top3gaps` (handcrafted)
- **Answer**: Beautiful formatted 3-gap analysis with action items

---

## 📊 Success Criteria

After running all tests, you should see:

- ✅ **33 intent rules** firing (check Matched Tags)
- ✅ **36 scaffolds** available (3 handcrafted + 33 auto)
- ✅ **12+ chip types** rendering gracefully
- ✅ **Cache hits** on repeated queries
- ✅ **Low confidence guard** on off-topic queries
- ✅ **Full debug visibility** in routing panel
- ✅ **Analytics logs** in terminal for every query
- ✅ **Tag-specific priors** boosting correct namespaces

---

## 🐛 Troubleshooting

### Debug Panel Not Showing?
- Check "Show Debug Panel" checkbox is ✅
- Refresh page
- Make sure you're on `/kb-test` route

### No Scaffolds Matching?
- Check server logs for `[ComposeAnswer] No scaffold matched, using type-aware fallback`
- This is normal for rare chip types — fallback should still render nicely

### Cache Not Working?
- Must be **exact same query** (case-insensitive, but punctuation matters)
- Cache TTL is 120s — wait 2 minutes and try again to see fresh retrieval

### Low Scores?
- Normal for generic/vague queries
- Try adding more specific keywords from intent_lexicon.yaml

---

## 🎯 Quick 5-Minute Test

Don't have time for all 17 queries? Run these 5:

1. **Intent Lexicon**: `I don't think I'm good enough for top schools`
2. **Auto-Scaffold**: `show me a micro-tactic for deadline crunch`
3. **Cache**: `what is the 168-hour framework?` (twice)
4. **Low Confidence**: `write me an essay about my summer vacation`
5. **Debug Panel**: `I need a template for thanking my teacher`

If all 5 work → system is 🟢 operational!
