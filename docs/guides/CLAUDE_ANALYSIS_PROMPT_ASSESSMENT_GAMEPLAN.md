# Claude Analysis Prompt: Multi-Student Assessment & GamePlan Intelligence Extraction

**Purpose:** Extract coaching intelligence from real-world assessment transcripts and GamePlan documents to build autonomous, proactive Assessment & GamePlan Agent

**Target Files:** 10+ students × 2 files each (Assessment Transcript + GamePlan Document)

**Strategic Goal:** Build Knowledge Moat by ingesting proven coaching strategies from real Stanford/Ivy+ admit coaches

---

## 📋 INSTRUCTIONS FOR CLAUDE CHAT

**Copy this entire prompt into Claude Chat, then upload ONE student's files at a time (Assessment Transcript + GamePlan Doc):**

---

# PROMPT FOR CLAUDE CHAT

I am building an autonomous AI coaching system for high school students applying to top colleges. I need you to analyze real coaching session data to extract intelligence that will power a proactive Assessment & GamePlan Agent.

## CONTEXT

**What You're Analyzing:**
- **File 1:** Assessment Video Call Session Transcript (60-90 min session with coach Jenny)
- **File 2:** GamePlan Document (the strategic plan crafted AFTER the assessment session)

**What This Powers:**
An autonomous agent that will:
1. Proactively lead assessment sessions (not wait for student to ask)
2. Adapt questioning based on student archetype
3. Generate precision GamePlans tailored to different student profiles
4. Continuously learn from new coaching data (building a Knowledge Moat)

**Success Metric:** Quality and depth of extracted strategies, tactics, and frameworks proven from real coaching sessions

---

## YOUR ANALYSIS TASK

Please analyze the attached files and extract intelligence in the following structure:

---

### PART 1: STUDENT ARCHETYPE CLASSIFICATION

**Extract:**
1. **Student Profile:**
   - Grade level (9th, 10th, 11th, 12th)
   - Current academic standing (GPA range, course rigor)
   - Current involvement level (minimal, moderate, high)
   - Starting readiness (just starting, partially built, well-developed)

2. **Student Type Classification:**
   - Achievement Orientation: High-achiever | Steady | Emerging
   - Execution Style: Self-directed | Needs structure | Needs heavy guidance
   - Passion Clarity: Clear spike | Multiple interests | Exploring
   - Resource Access: High (tutors, programs) | Medium | Limited
   - Parental Involvement: High support | Moderate | Low

3. **Student Archetype Label:**
   - Create a 2-3 word archetype label (e.g., "High-Achiever Late-Starter", "Emerging Multi-Passionate", "Structured Self-Starter")

4. **Key Challenges Identified in Session:**
   - List 3-5 main challenges/gaps this student faced
   - Quote specific moments from transcript where these were revealed

---

### PART 2: ASSESSMENT SESSION FRAMEWORK ANALYSIS

**Extract the STRUCTURE of how Jenny ran the session:**

1. **Session Opening (First 5-10 minutes):**
   - How did Jenny introduce the session?
   - Did she explain the roadmap/structure upfront?
   - How did she build rapport?
   - Quote exact opening lines

2. **Phase Sequencing:**
   - Identify distinct phases Jenny moved through (e.g., Discovery → Narrative → Strategy → Execution)
   - For each phase:
     - Purpose/goal of the phase
     - Approximate duration
     - Key questions asked
     - Transition language used to move to next phase

3. **Questioning Patterns:**
   - **Discovery Questions:** Extract 5-7 questions Jenny used to understand WHO the student is
   - **Narrative Questions:** Extract 5-7 questions used to help student find their story
   - **Strategy Questions:** Extract 5-7 questions about tactical execution (ECs, awards, programs)
   - **Time/Logistics Questions:** Extract 3-5 questions about capacity, timeline, resources

4. **Proactive Frameworks Introduced:**
   - Did Jenny proactively introduce frameworks (e.g., "168-hour framework", "narrative-first approach", "spike development")?
   - At what point in the session did she introduce each?
   - How did she explain the framework? (Extract exact language)
   - Did she offer to apply it immediately or wait for student to ask?

5. **Meta-Coaching Moments:**
   - Extract instances where Jenny explained WHY she was asking something
   - Extract instances where Jenny connected current question to broader strategy
   - Extract instances where Jenny referenced past student success stories

6. **Adaptive Behavior:**
   - How did Jenny adapt when student was confused?
   - How did Jenny adapt when student showed resistance?
   - How did Jenny adapt when student was highly engaged?
   - Extract specific examples from transcript

---

### PART 3: NARRATIVE & SPIKE DEVELOPMENT ANALYSIS

**Extract how Jenny helped this student find their "spike":**

1. **Initial State:**
   - What did student say about their interests/passions at start?
   - How clear was their narrative at the beginning? (Score 1-10)

2. **Discovery Process:**
   - What questions did Jenny ask to uncover passions?
   - What follow-up probes did she use?
   - How did she connect disparate interests?

3. **Narrative Synthesis:**
   - What was the FINAL narrative/spike that emerged?
   - How did Jenny articulate it back to the student?
   - Extract the exact language Jenny used to summarize the narrative

4. **Validation Moments:**
   - How did Jenny validate the narrative was authentic to the student?
   - Did student have "aha moments"? Extract quotes

5. **Differentiation Strategy:**
   - How did Jenny position this narrative as UNIQUE/differentiated?
   - What comparisons did she make to typical applicants?

---

### PART 4: STRATEGIC RECOMMENDATIONS ANALYSIS

**Extract the STRATEGY layer from the session:**

1. **Extracurricular Strategy:**
   - What specific ECs did Jenny recommend?
   - Why were they aligned with the narrative?
   - What ECs did Jenny recommend DROPPING/avoiding? Why?
   - Extract reasoning Jenny gave

2. **Awards/Recognition Strategy:**
   - What awards did Jenny recommend pursuing?
   - What was the strategic rationale? (e.g., "This demonstrates leadership in your spike area")
   - What was the prioritization logic? (high-impact vs. time investment)

3. **Summer Programs Strategy:**
   - What programs did Jenny recommend?
   - Why were they aligned with narrative?
   - What criteria did Jenny use to evaluate programs?

4. **Academic Rigor Strategy:**
   - What courses did Jenny recommend?
   - How did she balance rigor with capacity?
   - What AP/IB strategy did she outline?

5. **Timeline & Milestones:**
   - What milestones did Jenny set for next 3 months? 6 months? 12 months?
   - How did she prioritize what to tackle first?

---

### PART 5: GAMEPLAN DOCUMENT ANALYSIS

**Analyze the GamePlan document and extract:**

1. **GamePlan Structure:**
   - What sections does the GamePlan have? (e.g., Narrative Summary, EC Plan, Awards Plan, Timeline)
   - How is each section organized?
   - What's the hierarchy of information? (Strategic → Tactical → Execution)

2. **Narrative Articulation:**
   - How is the student's narrative articulated in the GamePlan?
   - Extract the exact language used
   - How long is the narrative section? (word count)

3. **Action Items:**
   - How are action items structured? (by category? by timeline?)
   - For each action item, extract:
     - What (the action)
     - Why (strategic rationale)
     - When (timeline/deadline)
     - How (specific steps)

4. **Prioritization Logic:**
   - How does the GamePlan communicate priority?
   - Is there explicit prioritization (e.g., "High Priority", "Must Do", "Nice to Have")?
   - What language is used to indicate urgency?

5. **Measurable Outcomes:**
   - Are there specific metrics/outcomes defined? (e.g., "Submit 3 essays to competitions by June")
   - How concrete are the goals?

6. **Differentiation from Generic Plans:**
   - What makes this GamePlan SPECIFIC to this student vs. generic advice?
   - Extract examples of personalization

---

### PART 6: COACHING TACTICS & TECHNIQUES

**Extract Jenny's coaching techniques:**

1. **Rapport-Building Tactics:**
   - How did Jenny make student feel heard/understood?
   - What language patterns did she use? (e.g., "I hear you saying...", "That makes sense because...")
   - Did she share personal anecdotes or past student stories?

2. **Probing Techniques:**
   - When student gave surface-level answer, how did Jenny dig deeper?
   - Extract examples of follow-up questions that revealed deeper insight

3. **Reframing Tactics:**
   - Did Jenny reframe student's perceived weaknesses as strengths?
   - Extract examples of reframing language

4. **Motivation Techniques:**
   - How did Jenny inspire confidence?
   - How did Jenny create urgency without overwhelming?
   - Extract motivational language used

5. **Parent Management (if applicable):**
   - If parents were involved, how did Jenny navigate their input?
   - How did Jenny balance parent concerns with student autonomy?

---

### PART 7: PATTERN MATCHING FOR ARCHETYPE

**Cross-reference with other students (if analyzing multiple):**

1. **Archetype-Specific Patterns:**
   - Do students of similar archetype (e.g., "High-Achiever Late-Starter") receive similar strategies?
   - What's consistent? What's customized?

2. **Question Sequencing Patterns:**
   - Do certain student types get asked discovery questions earlier/later?
   - Are there archetype-specific follow-up patterns?

3. **Framework Introduction Timing:**
   - When do different archetypes receive the 168-hour framework?
   - When do different archetypes get narrative vs. tactics focus?

4. **Success Metric Patterns:**
   - What metrics matter most for different archetypes?
   - (e.g., Emerging students → "Start 2 ECs", High-achievers → "Win national award")

---

### PART 8: CONTINUOUS LEARNING SCHEMA

**Extract data in a format that can be ingested by the AI system:**

1. **Session Metadata:**
```json
{
  "student_archetype": "High-Achiever Late-Starter",
  "grade_level": 11,
  "session_duration_minutes": 75,
  "coach_id": "jenny",
  "session_date": "YYYY-MM-DD",
  "student_readiness_score": 6.5,
  "narrative_clarity_start": 3,
  "narrative_clarity_end": 8
}
```

2. **Extracted Questions by Phase:**
```json
{
  "discovery_phase": [
    {
      "question": "Tell me about a cause that keeps you up at night",
      "purpose": "Identify authentic passion",
      "student_archetype_fit": ["all"],
      "typical_response_pattern": "Students often start broad, need follow-up to get specific"
    }
  ],
  "narrative_phase": [...],
  "strategy_phase": [...],
  "execution_phase": [...]
}
```

3. **Extracted Frameworks:**
```json
{
  "framework_name": "168-Hour Weekly Architecture",
  "introduced_at_phase": "execution",
  "introduced_when": "After student said 'I don't have enough time'",
  "introduction_language": "Let me show you how students who succeed manage their 168 hours...",
  "application_immediate": true,
  "student_archetype_relevance": ["all"],
  "effectiveness_indicator": "Student had 'aha moment' about time management"
}
```

4. **Extracted Strategies by Archetype:**
```json
{
  "archetype": "High-Achiever Late-Starter",
  "recommended_strategies": [
    {
      "category": "extracurriculars",
      "recommendation": "Focus on 1-2 depth ECs, not breadth",
      "rationale": "Limited time, need to show leadership quickly",
      "success_examples": "Student X got into Stanford with 2 deep ECs vs. 10 shallow"
    }
  ]
}
```

5. **GamePlan Template:**
```json
{
  "archetype": "High-Achiever Late-Starter",
  "gameplan_sections": [
    {
      "section_name": "Narrative Summary",
      "content_structure": "2-3 paragraphs: Who you are + Your spike + Why it matters",
      "example_language": "You are a [identity] who is passionate about [cause] because [personal connection]..."
    },
    {
      "section_name": "EC Action Plan",
      "content_structure": "Table: Activity | Role | Timeline | Strategic Rationale",
      "prioritization_logic": "Depth over breadth for late-starters"
    }
  ]
}
```

---

## OUTPUT FORMAT

Please provide your analysis in the following structure:

### EXECUTIVE SUMMARY
- Student archetype (2-3 word label)
- Key insights (3-5 bullet points)
- Most valuable coaching tactics observed (top 3)

### DETAILED EXTRACTION
- Follow the 8 parts above, providing as much detail as possible
- Use direct quotes from transcripts wherever possible
- Flag any patterns you notice that could be generalized
- Highlight any coaching tactics that seemed particularly effective

### RECOMMENDATIONS FOR AI SYSTEM
- What parts of this session should be automated?
- What parts require human nuance?
- How should the AI adapt for this student archetype?
- What frameworks should the AI proactively introduce for this archetype?

### KNOWLEDGE MOAT OPPORTUNITIES
- What unique insights from this session are NOT found in generic college prep advice?
- What coaching tactics seem proprietary to Jenny's approach?
- What strategies would be hard for competitors to replicate?

---

## CRITICAL REQUIREMENTS

1. **Be EXHAUSTIVE:** Extract as much intelligence as possible - this powers the AI
2. **Use DIRECT QUOTES:** Don't paraphrase - extract exact language Jenny used
3. **Identify PATTERNS:** Look for repeatable frameworks, not one-off advice
4. **Focus on DIFFERENTIATION:** What makes this coaching UNIQUE vs. generic
5. **Think SCALABILITY:** What can be codified into the AI agent?

---

## AFTER ANALYZING ALL 10+ STUDENTS

Once you've analyzed all students individually, I'll ask you to do a **CROSS-STUDENT SYNTHESIS:**

- Identify common patterns across all sessions
- Map archetype-specific strategies
- Extract universal frameworks used across all students
- Identify coaching tactics that work across all archetypes vs. archetype-specific
- Create a master "Coaching Playbook" JSON schema

---

**Ready? Please analyze the attached Assessment Transcript and GamePlan Document using this framework.**

