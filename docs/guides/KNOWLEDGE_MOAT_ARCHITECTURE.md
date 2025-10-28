# Knowledge Moat Architecture: Continuous Learning from Real Coaching Data

**Purpose:** Build a continuously learning Assessment & GamePlan Agent by ingesting real coaching intelligence from multiple coaches and students

**Strategic Goal:** Create proprietary coaching intelligence that competitors cannot replicate

**Status:** 🔴 DESIGN PHASE - Ready for Implementation

---

## 🎯 VISION: THE KNOWLEDGE MOAT

### What We're Building

**A self-improving AI coaching system that:**
1. Learns from every real coaching session (assessment + gameplan)
2. Extracts proven strategies from top coaches (Jenny, others)
3. Adapts to different student archetypes automatically
4. Gets smarter over time as more data is ingested
5. Becomes impossible to replicate (proprietary intelligence vault)

### Why This Is a Moat

**Competitors can copy:**
- ❌ Generic college prep advice (available on Reddit, YouTube)
- ❌ Static frameworks (anyone can write "create a narrative")
- ❌ One-size-fits-all templates

**Competitors CANNOT copy:**
- ✅ **10+ years of real coaching session data** from Stanford/Ivy+ admit coaches
- ✅ **Archetype-specific strategies** proven to work for different student types
- ✅ **Coaching playbooks** extracted from thousands of hours of real sessions
- ✅ **Continuous learning** from new sessions (data compounds over time)

**This is our competitive advantage.**

---

## 📊 DATA SOURCES

### Current Data (Phase 1)
- **Coach:** Jenny (Stanford admit coach)
- **Students:** 10+ different archetypes
- **Files per student:**
  - Assessment Video Transcript (60-90 min session)
  - GamePlan Document (strategic plan post-assessment)

### Future Data Sources (Phase 2+)
1. **Same Coach (Jenny), More Students:**
   - Past students (historical data)
   - Current students (ongoing sessions)
   - New students (future sessions)

2. **Different Coaches:**
   - Other Stanford/Ivy+ admit coaches
   - Specialized coaches (CS, pre-med, humanities, etc.)
   - Regional coaches (different high school contexts)

3. **Automated Collection:**
   - Real-time session transcripts (via Zoom integration)
   - Generated GamePlans (from platform)
   - Student outcomes (college admits, scholarships)

---

## 🏗️ DATABASE ARCHITECTURE

### Table 1: `coaching_sessions_raw`
**Purpose:** Store raw coaching session data

```sql
CREATE TABLE coaching_sessions_raw (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id VARCHAR(50) NOT NULL,
  student_id VARCHAR(50), -- NULL if anonymized
  session_type VARCHAR(50), -- 'assessment', 'weekly_checkin', 'gameplan_review'
  session_date DATE,
  session_duration_minutes INTEGER,

  -- Raw data
  transcript_text TEXT, -- Full transcript
  transcript_file_path TEXT, -- Path to source file
  gameplan_text TEXT, -- Full gameplan doc
  gameplan_file_path TEXT, -- Path to source file

  -- Metadata
  student_grade_level INTEGER, -- 9, 10, 11, 12
  student_archetype VARCHAR(100), -- e.g., "High-Achiever Late-Starter"
  session_quality_score DECIMAL(3,2), -- 0.00-1.00 (for filtering low-quality data)

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  extracted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coaching_sessions_coach ON coaching_sessions_raw(coach_id);
CREATE INDEX idx_coaching_sessions_archetype ON coaching_sessions_raw(student_archetype);
CREATE INDEX idx_coaching_sessions_processed ON coaching_sessions_raw(processed);
```

---

### Table 2: `coaching_intelligence_extracted`
**Purpose:** Store extracted intelligence from sessions (structured data)

```sql
CREATE TABLE coaching_intelligence_extracted (
  extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions_raw(session_id),
  coach_id VARCHAR(50) NOT NULL,
  student_archetype VARCHAR(100),

  -- Student Profile (Part 1 from prompt)
  student_profile JSONB, -- {grade, gpa_range, involvement_level, readiness, etc.}
  student_challenges JSONB, -- [{challenge, quote_from_transcript}, ...]

  -- Session Framework (Part 2 from prompt)
  session_structure JSONB, -- {opening, phases: [{phase, duration, questions, transitions}]}
  questioning_patterns JSONB, -- {discovery: [...], narrative: [...], strategy: [...]}
  proactive_frameworks JSONB, -- [{framework_name, introduced_when, language_used}, ...]
  meta_coaching_moments JSONB, -- [{moment, quote, context}, ...]
  adaptive_behaviors JSONB, -- [{trigger, adaptation, example}, ...]

  -- Narrative Development (Part 3 from prompt)
  narrative_development JSONB, -- {initial_state, discovery_process, final_narrative, aha_moments}

  -- Strategic Recommendations (Part 4 from prompt)
  strategic_recommendations JSONB, -- {ecs, awards, programs, academics, timeline}

  -- GamePlan Structure (Part 5 from prompt)
  gameplan_structure JSONB, -- {sections, action_items, prioritization, outcomes}

  -- Coaching Tactics (Part 6 from prompt)
  coaching_tactics JSONB, -- {rapport, probing, reframing, motivation, parent_mgmt}

  -- Quality scores
  narrative_clarity_start DECIMAL(3,2), -- 0.00-1.00
  narrative_clarity_end DECIMAL(3,2), -- 0.00-1.00
  session_effectiveness_score DECIMAL(3,2), -- 0.00-1.00

  -- Continuous learning flags
  archetype_pattern_match BOOLEAN, -- Does this match patterns from similar archetypes?
  novel_insight BOOLEAN, -- Does this contain unique insights not seen before?

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intelligence_coach ON coaching_intelligence_extracted(coach_id);
CREATE INDEX idx_intelligence_archetype ON coaching_intelligence_extracted(student_archetype);
CREATE INDEX idx_intelligence_novel ON coaching_intelligence_extracted(novel_insight);
```

---

### Table 3: `coaching_playbooks`
**Purpose:** Store synthesized playbooks by archetype (cross-student patterns)

```sql
CREATE TABLE coaching_playbooks (
  playbook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_name VARCHAR(200), -- e.g., "Assessment Playbook: High-Achiever Late-Starter"
  student_archetype VARCHAR(100),
  coach_id VARCHAR(50), -- NULL if synthesized from multiple coaches

  -- Playbook content
  assessment_framework JSONB, -- {phases, questions, frameworks, timing}
  gameplan_template JSONB, -- {sections, structure, prioritization_logic}
  coaching_tactics JSONB, -- {rapport_building, probing, reframing, motivation}
  success_metrics JSONB, -- {metrics_to_track, target_outcomes}

  -- Source data
  source_session_ids UUID[], -- Array of session_ids this was synthesized from
  sample_size INTEGER, -- How many sessions contributed to this playbook

  -- Effectiveness
  playbook_version INTEGER DEFAULT 1, -- Increments as playbook is updated
  effectiveness_score DECIMAL(3,2), -- 0.00-1.00 (based on student outcomes)
  last_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playbooks_archetype ON coaching_playbooks(student_archetype);
CREATE INDEX idx_playbooks_effectiveness ON coaching_playbooks(effectiveness_score DESC);
```

---

### Table 4: `coaching_frameworks_library`
**Purpose:** Store reusable frameworks (168-hour, narrative-first, etc.)

```sql
CREATE TABLE coaching_frameworks_library (
  framework_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_name VARCHAR(100) NOT NULL, -- e.g., "168-Hour Framework"
  framework_type VARCHAR(50), -- 'time_management', 'narrative', 'execution', 'strategic'

  -- Framework content
  framework_description TEXT,
  framework_content JSONB, -- {structure, steps, examples}
  introduction_language TEXT, -- How to introduce this framework
  application_steps JSONB, -- How to apply it with student

  -- When to use
  trigger_conditions JSONB, -- {keywords, phases, student_states}
  applicable_archetypes VARCHAR(100)[], -- Which student types benefit most

  -- Evidence
  source_coach_ids VARCHAR(50)[], -- Which coaches use this
  source_session_ids UUID[], -- Which sessions featured this
  effectiveness_by_archetype JSONB, -- {archetype: effectiveness_score}
  success_stories JSONB, -- [{student_archetype, outcome, quote}, ...]

  -- Usage tracking
  times_offered INTEGER DEFAULT 0,
  times_accepted INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(3,2), -- Auto-calculated

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_frameworks_type ON coaching_frameworks_library(framework_type);
CREATE INDEX idx_frameworks_effectiveness ON coaching_frameworks_library(((effectiveness_by_archetype->>'overall')::decimal) DESC);
```

---

### Table 5: `archetype_patterns`
**Purpose:** Store cross-student patterns for each archetype

```sql
CREATE TABLE archetype_patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_archetype VARCHAR(100) NOT NULL,
  pattern_category VARCHAR(50), -- 'questioning', 'strategy', 'framework', 'challenge'

  -- Pattern data
  pattern_name VARCHAR(200), -- e.g., "Late-starters need urgency without overwhelm"
  pattern_description TEXT,
  pattern_data JSONB, -- Structured pattern data

  -- Evidence
  observed_in_sessions UUID[], -- Which sessions showed this pattern
  observation_frequency DECIMAL(3,2), -- 0.00-1.00 (% of sessions with this pattern)

  -- Application
  recommended_action TEXT, -- What the AI should do when this pattern is detected
  recommended_frameworks VARCHAR(100)[], -- Which frameworks to offer

  -- Validation
  validated BOOLEAN DEFAULT FALSE, -- Has human coach confirmed this pattern?
  effectiveness_score DECIMAL(3,2), -- 0.00-1.00

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_archetype ON archetype_patterns(student_archetype);
CREATE INDEX idx_patterns_frequency ON archetype_patterns(observation_frequency DESC);
CREATE INDEX idx_patterns_validated ON archetype_patterns(validated);
```

---

### Table 6: `session_outcomes`
**Purpose:** Track student outcomes to validate playbook effectiveness

```sql
CREATE TABLE session_outcomes (
  outcome_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions_raw(session_id),
  student_id VARCHAR(50),
  student_archetype VARCHAR(100),

  -- Outcome metrics
  gameplan_completion_rate DECIMAL(3,2), -- 0.00-1.00 (% of gameplan executed)
  ec_depth_improvement DECIMAL(3,2), -- Increase in EC depth score
  award_wins INTEGER, -- Number of awards won
  college_admits JSONB, -- [{college, admit_type, scholarship}, ...]

  -- Timeline
  assessment_date DATE,
  outcome_date DATE, -- When outcome was measured
  months_elapsed INTEGER,

  -- Attribution
  playbook_used UUID REFERENCES coaching_playbooks(playbook_id),
  frameworks_used UUID[], -- Array of framework_ids

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outcomes_archetype ON session_outcomes(student_archetype);
CREATE INDEX idx_outcomes_playbook ON session_outcomes(playbook_used);
```

---

## 🔄 CONTINUOUS LEARNING PIPELINE

### Step 1: Data Ingestion
**Process:** Upload new coaching session files

```typescript
class CoachingDataIngestion {
  async ingestSession(
    transcriptFile: File,
    gameplanFile: File,
    metadata: {
      coach_id: string;
      student_grade: number;
      session_date: Date;
    }
  ): Promise<string> {
    // 1. Store raw files
    const sessionId = await this.storeRawSession(transcriptFile, gameplanFile, metadata);

    // 2. Trigger extraction pipeline
    await this.triggerExtraction(sessionId);

    return sessionId;
  }
}
```

---

### Step 2: Intelligence Extraction
**Process:** Use Claude to extract structured intelligence

```typescript
class IntelligenceExtractor {
  async extractFromSession(sessionId: string): Promise<void> {
    // 1. Get raw session data
    const session = await this.getRawSession(sessionId);

    // 2. Send to Claude with extraction prompt
    const extraction = await this.callClaude({
      prompt: EXTRACTION_PROMPT, // The comprehensive prompt we created
      transcript: session.transcript_text,
      gameplan: session.gameplan_text
    });

    // 3. Store structured extraction
    await this.storeExtraction(sessionId, extraction);

    // 4. Update archetype patterns
    await this.updateArchetypePatterns(extraction);
  }

  private async callClaude(input: {
    prompt: string;
    transcript: string;
    gameplan: string;
  }): Promise<ExtractedIntelligence> {
    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `${input.prompt}\n\n---\n\nASSESSMENT TRANSCRIPT:\n${input.transcript}\n\n---\n\nGAMEPLAN DOCUMENT:\n${input.gameplan}`
        }
      ]
    });

    // Parse Claude's structured output
    return this.parseExtractionResponse(response.content[0].text);
  }
}
```

---

### Step 3: Pattern Synthesis
**Process:** Identify patterns across similar students

```typescript
class PatternSynthesizer {
  async synthesizePatterns(archetype: string): Promise<void> {
    // 1. Get all extractions for this archetype
    const extractions = await this.getExtractionsByArchetype(archetype);

    // 2. Find common patterns
    const patterns = this.identifyPatterns(extractions);

    // 3. Store patterns
    for (const pattern of patterns) {
      await this.storePattern(archetype, pattern);
    }

    // 4. Update playbook
    await this.updatePlaybook(archetype, patterns);
  }

  private identifyPatterns(extractions: ExtractedIntelligence[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Example: Identify common questioning patterns
    const allQuestions = extractions.flatMap(e => e.questioning_patterns.discovery);
    const questionFrequency = this.calculateFrequency(allQuestions);

    // If a question appears in 70%+ of sessions → it's a pattern
    for (const [question, frequency] of Object.entries(questionFrequency)) {
      if (frequency >= 0.7) {
        patterns.push({
          category: 'questioning',
          name: 'Common Discovery Question',
          data: { question, frequency },
          recommended_action: 'Include this question in assessment for this archetype'
        });
      }
    }

    return patterns;
  }
}
```

---

### Step 4: Playbook Generation
**Process:** Create/update playbooks by archetype

```typescript
class PlaybookGenerator {
  async generatePlaybook(archetype: string): Promise<UUID> {
    // 1. Get all patterns for this archetype
    const patterns = await this.getPatternsByArchetype(archetype);

    // 2. Get all extractions for this archetype
    const extractions = await this.getExtractionsByArchetype(archetype);

    // 3. Synthesize playbook
    const playbook = {
      archetype,
      assessment_framework: this.synthesizeAssessmentFramework(extractions),
      gameplan_template: this.synthesizeGamePlanTemplate(extractions),
      coaching_tactics: this.synthesizeCoachingTactics(extractions),
      success_metrics: this.synthesizeSuccessMetrics(extractions)
    };

    // 4. Store playbook
    const playbookId = await this.storePlaybook(playbook);

    return playbookId;
  }

  private synthesizeAssessmentFramework(extractions: ExtractedIntelligence[]): AssessmentFramework {
    // Find most common phase structure
    const phaseStructures = extractions.map(e => e.session_structure.phases);
    const commonStructure = this.findMostCommon(phaseStructures);

    // Find most effective questions by phase
    const questionsByPhase = this.aggregateQuestionsByPhase(extractions);

    // Find frameworks most often introduced
    const frameworks = this.findCommonFrameworks(extractions);

    return {
      phases: commonStructure,
      questions_by_phase: questionsByPhase,
      frameworks_to_introduce: frameworks,
      meta_coaching_prompts: this.extractMetaCoachingPrompts(extractions)
    };
  }
}
```

---

### Step 5: AI Agent Integration
**Process:** Assessment agent uses playbooks at runtime

```typescript
class ProactiveAssessmentAgent {
  async startAssessment(studentId: string): Promise<SessionResponse> {
    // 1. Classify student archetype (based on initial data)
    const archetype = await this.classifyStudentArchetype(studentId);

    // 2. Load playbook for this archetype
    const playbook = await this.loadPlaybook(archetype);

    // 3. Use playbook to guide session
    const sessionStructure = playbook.assessment_framework.phases;

    // 4. Introduce session with playbook language
    const intro = this.generateSessionIntro(playbook);

    // 5. Start with phase 1 questions from playbook
    const phase1Questions = playbook.assessment_framework.questions_by_phase['discovery'];

    return {
      message: intro + "\n\n" + phase1Questions[0].question,
      session_id: sessionId,
      current_phase: 'discovery',
      playbook_id: playbook.playbook_id
    };
  }

  async handleResponse(sessionId: string, userResponse: string): Promise<SessionResponse> {
    // 1. Get session state + playbook
    const session = await this.getSession(sessionId);
    const playbook = await this.loadPlaybook(session.archetype);

    // 2. Check for proactive triggers (from patterns)
    const patterns = await this.getPatternsForArchetype(session.archetype);
    const trigger = this.detectTrigger(userResponse, patterns);

    if (trigger) {
      // Proactively offer framework
      const framework = await this.getFramework(trigger.recommended_framework);
      return this.offerFramework(sessionId, framework);
    }

    // 3. Otherwise, move to next question from playbook
    return this.moveToNextQuestion(sessionId, playbook);
  }
}
```

---

## 📈 CONTINUOUS IMPROVEMENT LOOP

### Feedback Loop Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  1. NEW COACHING SESSION                                    │
│     (Assessment transcript + GamePlan doc)                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  2. EXTRACTION (Claude analysis)                            │
│     → Extract student archetype                             │
│     → Extract session structure                             │
│     → Extract strategies                                    │
│     → Extract coaching tactics                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  3. PATTERN IDENTIFICATION                                  │
│     → Compare to existing patterns                          │
│     → Identify novel insights                               │
│     → Update archetype patterns                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  4. PLAYBOOK UPDATE                                         │
│     → Regenerate playbook for archetype                     │
│     → Version increment                                     │
│     → A/B test new vs. old playbook                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  5. AI AGENT USES NEW PLAYBOOK                              │
│     → Next student with same archetype                      │
│     → Uses updated strategies                               │
│     → Tracks effectiveness                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  6. OUTCOME TRACKING                                        │
│     → Student completes gameplan                            │
│     → Track college admits                                  │
│     → Validate playbook effectiveness                       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ↓ (FEEDBACK TO STEP 4)
```

---

## 🎯 SUCCESS METRICS

### Knowledge Moat Depth
- **Total Sessions Ingested:** Target 100+ by Year 1
- **Unique Student Archetypes:** Target 15-20 archetypes
- **Coaches Contributing:** Target 5+ coaches by Year 1
- **Novel Insights Extracted:** Target 200+ unique coaching tactics

### AI Agent Effectiveness
- **Playbook Usage Rate:** % of sessions using playbooks (Target 95%+)
- **Proactive Framework Offers:** # of frameworks offered without student asking (Target 80%+)
- **Narrative Clarity Improvement:** Start score → End score (Target +0.4+)
- **GamePlan Completion Rate:** % of gameplan actions completed (Target 70%+)

### Continuous Learning Velocity
- **New Patterns Identified:** # per month (Target 10+ new patterns/month)
- **Playbook Update Frequency:** Updates per archetype (Target 1x/month)
- **Cross-Coach Synthesis:** # of multi-coach playbooks (Target 50%+ of playbooks)

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
- [ ] Create all 6 database tables
- [ ] Build ingestion pipeline (upload transcripts + gameplans)
- [ ] Integrate Claude extraction with comprehensive prompt
- [ ] Test with 1-2 students manually

### Phase 2: Extraction Pipeline (Week 3-4)
- [ ] Automate extraction for all 10+ students
- [ ] Store all extractions in database
- [ ] Validate extraction quality (spot-check)
- [ ] Build extraction analytics dashboard

### Phase 3: Pattern Synthesis (Week 5-6)
- [ ] Build pattern identification algorithms
- [ ] Generate archetype patterns table
- [ ] Create initial playbooks (1 per archetype)
- [ ] Validate playbooks with coach Jenny

### Phase 4: AI Agent Integration (Week 7-8)
- [ ] Update InteractiveSessionManager to use playbooks
- [ ] Add proactive trigger system
- [ ] Add archetype classification at session start
- [ ] Test with New Huda account

### Phase 5: Continuous Learning Loop (Week 9-10)
- [ ] Build outcome tracking system
- [ ] Build playbook versioning + A/B testing
- [ ] Build automated playbook update pipeline
- [ ] Set up monthly synthesis runs

---

## 📝 NEXT STEPS

**Immediate Actions:**
1. ✅ Create comprehensive Claude prompt (DONE)
2. ⏳ Upload 10+ student transcripts/gameplans to Claude Chat
3. ⏳ Extract intelligence using prompt
4. ⏳ Store extractions in structured JSON format
5. ⏳ Build database tables
6. ⏳ Build ingestion pipeline
7. ⏳ Integrate with Assessment Agent

**Ready to execute when you provide the green light!**

---

**Status:** 🟡 READY FOR DATA INGESTION
**Owner:** TBD
**Timeline:** 10 weeks to full continuous learning system
