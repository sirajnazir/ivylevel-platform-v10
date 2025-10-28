# Quick Start: Analyzing Assessment & GamePlan Files with Claude

**Goal:** Extract coaching intelligence from 10+ students to build Knowledge Moat

**Time Required:** ~20-30 minutes per student (with Claude Sonnet 4.5)

---

## 🚀 STEP-BY-STEP PROCESS

### Step 1: Open Claude Chat
- Go to: https://claude.ai
- Start a new conversation
- Select: **Claude Sonnet 4.5** (critical - this model has the capacity for deep analysis)

---

### Step 2: Copy the Master Prompt
- Open: `/docs/guides/CLAUDE_ANALYSIS_PROMPT_ASSESSMENT_GAMEPLAN.md`
- **Copy the ENTIRE prompt** (starting from "# PROMPT FOR CLAUDE CHAT")
- Paste into Claude Chat

---

### Step 3: Upload Student Files (One Student at a Time)
**For EACH student, upload 2 files:**
1. **Assessment Transcript** (PDF/TXT) - the video call session transcript
2. **GamePlan Document** (PDF/DOCX) - the strategic plan created after assessment

**Important:** Do ONE student at a time for best results

---

### Step 4: Let Claude Analyze
- Claude will analyze for ~2-5 minutes
- It will extract intelligence in the structured format we defined
- Review the output to ensure quality

---

### Step 5: Save the Output
**Create a file for each student:**

```
/data/coaching_intelligence/extractions/
  ├── student_001_extraction.json  (Claude's output as JSON)
  ├── student_002_extraction.json
  ├── student_003_extraction.json
  ...
  └── student_010_extraction.json
```

**Format:** Copy Claude's entire response and save as JSON (or text if not structured as JSON)

---

### Step 6: Repeat for All Students
- Do this for all 10+ students
- Keep the same conversation thread in Claude (it will learn patterns across students)

---

### Step 7: Cross-Student Synthesis
**After analyzing all students individually, ask Claude:**

```
I've now uploaded 10+ students. Please perform a CROSS-STUDENT SYNTHESIS:

1. Identify common patterns across ALL sessions
2. Map archetype-specific strategies (what's different for each student type)
3. Extract universal frameworks used across all students
4. Identify coaching tactics that work universally vs. archetype-specific
5. Create a master "Coaching Playbook" JSON schema

Format the output as a comprehensive synthesis document.
```

---

## 📊 WHAT YOU'LL GET

### Per-Student Outputs (10+ files)
Each will contain:
- Student archetype classification
- Session structure analysis
- Question-by-question breakdown
- Narrative development process
- Strategic recommendations
- Coaching tactics used
- GamePlan structure

### Cross-Student Synthesis (1 master file)
Will contain:
- Common patterns across all sessions
- Archetype-specific playbooks
- Universal frameworks
- Coaching tactics library
- Question banks by phase
- Success patterns

---

## 📁 FILE ORGANIZATION

**Recommended structure:**

```
/data/coaching_intelligence/
├── raw_files/
│   ├── student_001/
│   │   ├── assessment_transcript.pdf
│   │   └── gameplan.pdf
│   ├── student_002/
│   │   ├── assessment_transcript.pdf
│   │   └── gameplan.pdf
│   └── ...
├── extractions/
│   ├── student_001_extraction.json
│   ├── student_002_extraction.json
│   └── ...
└── synthesis/
    └── cross_student_synthesis.json
```

---

## ⚠️ IMPORTANT TIPS

### For Best Results:
1. ✅ **Use Claude Sonnet 4.5** (not Haiku, not older versions)
2. ✅ **One student at a time** (don't batch upload)
3. ✅ **Keep same conversation** (Claude learns patterns across students)
4. ✅ **Review each extraction** (spot-check for quality)
5. ✅ **Save outputs immediately** (don't lose the data!)

### Common Issues:
- ❌ **Claude hits token limit:** Break transcript into chunks (Part 1, Part 2)
- ❌ **Low-quality extraction:** Re-run with more specific prompts
- ❌ **Missing data:** Go back and ask Claude to fill in gaps

---

## 🎯 QUALITY CHECKS

**After each student extraction, verify:**
- [ ] Student archetype was classified
- [ ] Session structure was identified (phases, questions)
- [ ] Narrative development was tracked (start → end)
- [ ] Strategic recommendations were extracted
- [ ] Coaching tactics were captured
- [ ] GamePlan structure was analyzed
- [ ] Direct quotes were included (not just paraphrasing)

**If any missing → ask Claude to fill in the gaps**

---

## 📝 EXAMPLE PROMPT FOR GAPS

If Claude missed something, use this follow-up:

```
I notice you didn't extract [SPECIFIC SECTION].

Can you go back to the transcript and extract:
- [Specific thing you need]
- Include direct quotes from the transcript
- Follow the structure in Part [X] of the original prompt

Thank you!
```

---

## 🚀 NEXT STEPS AFTER EXTRACTION

**Once you have all extractions:**

1. **Share with me** - I'll build the ingestion pipeline
2. **I'll create database tables** - Store all intelligence
3. **I'll build pattern synthesis** - Identify cross-student patterns
4. **I'll generate playbooks** - Create archetype-specific coaching playbooks
5. **I'll integrate with AI Agent** - Assessment agent uses playbooks in real-time

---

## 📊 EXPECTED TIMELINE

- **Extraction Phase:** 1-2 days (20-30 min per student × 10 students)
- **Database Setup:** 1 day (me)
- **Pattern Synthesis:** 2-3 days (me + Claude)
- **Playbook Generation:** 2-3 days (me)
- **AI Agent Integration:** 3-4 days (me)
- **Testing & Validation:** 2-3 days (both)

**Total: ~2 weeks from extraction to live AI agent with Knowledge Moat**

---

## 🎉 THE PAYOFF

**After this process, you'll have:**

✅ **10+ Student Archetypes Mapped** (with specific strategies for each)
✅ **Coaching Playbooks** (proven frameworks from real sessions)
✅ **Question Banks** (organized by phase, validated by real data)
✅ **Framework Library** (168-hour, narrative-first, etc. with usage patterns)
✅ **Proactive Triggers** (when to offer frameworks based on student signals)
✅ **Knowledge Moat** (proprietary intelligence competitors can't replicate)

**This becomes the foundation for the ENTIRE autonomous coaching system.**

---

**Ready to start? Open Claude Chat and let's build the Knowledge Moat!** 🚀

---

**Questions? Reference these docs:**
- Master Prompt: `/docs/guides/CLAUDE_ANALYSIS_PROMPT_ASSESSMENT_GAMEPLAN.md`
- Architecture: `/docs/guides/KNOWLEDGE_MOAT_ARCHITECTURE.md`
- Proactivity Gap Analysis: `/docs/guides/PROACTIVITY_GAP_ANALYSIS.md`
