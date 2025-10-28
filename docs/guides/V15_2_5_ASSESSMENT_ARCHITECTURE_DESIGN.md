# v15.2.5 Assessment Agent - Gold Standard Architecture Design

**Date:** 2025-10-28
**Status:** 🎯 DESIGN SPECIFICATION
**Approach:** Pattern-First → Intelligence-Filled

---

## Design Principles Applied

### 1. **Planning Pattern** (Autonomous Goal Decomposition)
- LLM autonomously manages 4-phase progression
- State-space traversal: initial → discovery → narrative → strategy → time → complete
- Adaptive: Can pause, clarify, or introduce frameworks mid-flow

### 2. **Prompt Chaining** (Multi-Step Decomposition)
```
User: "Start Interactive Assessment"
  ↓
CHAIN STEP 1: Session Protocol Introduction
  → Output: Roadmap explanation, phase structure, time estimate
  ↓
CHAIN STEP 2: Phase 1 (Discovery) - Autonomous Questioning
  → Output: 7 questions about passions, values, identity
  → Context passed: Student responses accumulate
  ↓
CHAIN STEP 3: Phase 2 (Narrative) - Synthesis
  → Input: Discovery responses
  → Output: Narrative synthesis + 8 validation questions
  ↓
CHAIN STEP 4: Phase 3 (Strategy) - Tactical Alignment
  → Input: Narrative from Phase 2
  → Output: EC/award recommendations aligned with narrative
  ↓
CHAIN STEP 5: Phase 4 (Time Architecture) - Execution
  → Input: Strategy from Phase 3
  → Output: 168-hour framework application + milestones
```

### 3. **Reflection Pattern** (Producer-Critic) ✅
- Already implemented in v15.2 ReflectionService
- Will inherit quality gates for assessment responses

### 4. **Tool Use Pattern** (Data Integration)
**Tools Available:**
- SQL Facts: `ContextEngineeringPipeline.getSQLFacts()` ✅
- Coaching Intelligence: Load from `/data/coaching_intelligence/extractions/*.json`
- Pinecone RAG: Few-shot examples from real assessment transcripts ✅

### 5. **Memory Pattern** (Session State Management)
**Session State Schema:**
```typescript
{
  session_id: string,
  student_id: string,
  current_phase: 1-4,
  phase_progress: {
    discovery: { questions_asked: 7, clarity_score: 0.8 },
    narrative: { synthesis_complete: true, narrative: "..." },
    strategy: { recommendations_given: 5 },
    time: { framework_introduced: true }
  },
  narrative_clarity: 0.0-1.0,
  frameworks_introduced: ["web_metaphor", "168_hour"],
  proactive_interventions: [...],
  student_profile: {...} // From SQL facts
}
```

### 6. **Routing Pattern** (Intent Classification) ✅
- Add "interactive_assessment" intent type
- Route to specialized AssessmentOrchestrator

---

## Component Architecture

### **New Component 1: AssessmentOrchestrator**
**Purpose:** Autonomous multi-phase assessment conductor
**Pattern:** Planning + Prompt Chaining + Memory

```typescript
class AssessmentOrchestrator {
  private sessionState: AssessmentSessionState;
  private coachingIntelligence: CoachingIntelligenceLoader;
  private sessionProtocol: SessionProtocolManager;
  private phaseExecutor: PhaseExecutor;

  async startAssessment(studentId: string, sessionId: string): Promise<AssessmentResponse> {
    // CHAIN STEP 1: Introduction
    const intro = await this.sessionProtocol.introduceSession('assessment', studentId);

    // Initialize state
    this.sessionState = {
      current_phase: 1,
      narrative_clarity: 0,
      frameworks_introduced: [],
      discovery_responses: []
    };

    // Start Phase 1
    const phase1Start = await this.phaseExecutor.startPhase(1, this.sessionState);

    return {
      message: intro + "\n\n" + phase1Start,
      phase: 1,
      session_state: this.sessionState
    };
  }

  async processResponse(sessionId: string, response: string): Promise<AssessmentResponse> {
    // Update state with response
    this.updateState(response);

    // Check for proactive triggers
    const trigger = await this.detectProactiveTrigger(response);
    if (trigger) {
      return this.handleProactiveTrigger(trigger);
    }

    // Check if phase complete
    if (this.isPhaseComplete(this.sessionState.current_phase)) {
      return this.transitionToNextPhase();
    }

    // Continue current phase
    return this.continuePhase();
  }
}
```

### **New Component 2: SessionProtocolManager**
**Purpose:** Session structure communication
**Pattern:** Proactivity (from Gap Analysis)

```typescript
class SessionProtocolManager {
  async introduceSession(type: 'assessment', studentId: string): Promise<string> {
    const studentData = await this.getSQLFacts(studentId);
    const studentName = studentData.first_name || 'there';

    return `Hi ${studentName}! I'm so excited to start your IvyLevel journey! 🎓

Before we dive in, let me walk you through our proven 4-phase assessment framework:

📋 **Phase 1: Discovery** (10 min, 7 questions)
- Your passions, values, and what drives you
- Your community identity and causes you care about
- Your natural aptitude and interests

🎯 **Phase 2: Narrative Building** (15 min, 8 questions)
- Crafting your unique story
- Identifying your "spike" (what makes you different)
- Finding your authentic voice

🏆 **Phase 3: Strategic Alignment** (15 min, 7 questions)
- Aligning ECs, awards, programs with your narrative
- Identifying high-ROI opportunities
- Building a differentiated profile

⏰ **Phase 4: Time Architecture** (5 min, 5 questions)
- Your 168-hour weekly framework
- Balancing execution and well-being
- Setting realistic milestones

**Total time:** ~45 minutes
**You can pause anytime and pick up later**

Ready to start with Phase 1? Let's discover who you are! 🚀`;
  }

  async introducePhase(phaseNum: number, context: any): Promise<string> {
    const phases = {
      1: "Let's start by understanding who you are - your authentic self, not what you think colleges want to hear.",
      2: "Based on what you've shared, now let's craft your unique narrative - the story only YOU can tell.",
      3: "Now that we have your narrative, let's talk strategy - how to PROVE your story through ECs, awards, and programs.",
      4: "You have a clear narrative and strategy - now let's architect your TIME to execute on it."
    };

    return `\n📍 **Entering Phase ${phaseNum}**\n${phases[phaseNum]}\n`;
  }
}
```

### **New Component 3: CoachingIntelligenceLoader**
**Purpose:** Load real coaching data to inform responses
**Pattern:** Tool Use (data retrieval)

```typescript
class CoachingIntelligenceLoader {
  private intelligenceCache: Map<string, any> = new Map();

  async loadFrameworks(): Promise<CoachingFramework[]> {
    // Load from /data/coaching_intelligence/extractions/*.json
    const files = await fs.readdir('/path/to/extractions');
    const frameworks = [];

    for (const file of files) {
      const data = JSON.parse(await fs.readFile(file));
      frameworks.push(...data.frameworks_introduced);
    }

    return frameworks;
  }

  async getQuestionsForPhase(phase: 'discovery' | 'narrative' | 'strategy' | 'time'): Promise<Question[]> {
    // Extract questions from coaching intelligence by phase
    // Example: student_001_anoushka_structured.json has question patterns
    return this.extractedQuestions[phase];
  }

  async getFrameworkForTrigger(trigger: string): Promise<Framework> {
    // Map trigger keywords to frameworks
    // e.g., "overwhelmed" → 168-hour framework
    // From coaching intelligence: frameworks_introduced array
  }
}
```

### **New Component 4: PhaseExecutor**
**Purpose:** Execute each phase autonomously
**Pattern:** Prompt Chaining + Autonomous Planning

```typescript
class PhaseExecutor {
  async startPhase(phaseNum: number, state: AssessmentSessionState): Promise<string> {
    const phaseConfig = await this.getPhaseConfig(phaseNum);
    const firstQuestion = phaseConfig.questions[0];

    return `${phaseConfig.intro}\n\n**Question 1 of ${phaseConfig.questions.length}:**\n${firstQuestion.text}`;
  }

  async continuePhase(phaseNum: number, state: AssessmentSessionState): Promise<string> {
    const nextQuestion = this.getNextQuestion(phaseNum, state);

    // Add meta-coaching context
    const metaContext = this.generateMetaContext(nextQuestion, state);

    return `${metaContext}\n\n**Question ${state.questions_answered + 1}:**\n${nextQuestion.text}`;
  }

  private generateMetaContext(question: Question, state: AssessmentSessionState): string {
    // "Before I ask this, let me explain WHY..."
    return question.meta_coaching_context || "";
  }
}
```

---

## Data Integration Strategy

### **From Coaching Intelligence JSON:**

**File:** `student_001_anoushka_structured.json`

**Extract:**
1. **Frameworks** → Load into `CoachingIntelligenceLoader`
   ```json
   "frameworks_introduced": [
     {
       "framework_name": "Web Metaphor for Extracurriculars",
       "introduction_language": "I think about extracurriculars...",
       "positioned_as": "visual_framework"
     }
   ]
   ```

2. **Session Structure** → Map to phases
   ```json
   "session_metadata": {
     "session_type": "360_assessment",
     "phases": ["discovery", "narrative", "strategy", "execution"]
   }
   ```

3. **Question Patterns** → Not explicitly in JSON but can infer from narrative_development

**Extract:**
- Discovery questions: About passions, community, authentic self
- Narrative questions: About spike, story, differentiation
- Strategy questions: About ECs, awards, programs aligned with narrative
- Time questions: About capacity, sustainability, milestones

### **From SQL Database:**
Use existing `ContextEngineeringPipeline.getSQLFacts()`:
- Student profile (GPA, SAT, current ECs, awards)
- Target schools
- Current standing

---

## Intent Router Update

**File:** `services/agent-framework/src/v15.2/routing/IntentRoutingService.ts`

**Update classification prompt:**
```typescript
const classificationPrompt = `You are an intent classifier...

Intent Types:
- interactive_assessment: Student starting formal 360° assessment session
  Examples: "Start Interactive Assessment", "Let's do my assessment", "I want to do the full profile review"

- gameplan_strategy: Strategic planning questions...
- ec_discovery: Finding opportunities...
...
```

---

## Context Engineering Update

**File:** `services/agent-framework/src/v15.2/context/ContextEngineeringPipeline.ts`

**Add assessment persona:**
```typescript
private async getCoachPersona(intent: IntentType): Promise<string> {
  const personas: Record<IntentType, string> = {
    interactive_assessment: `You are Jenny Duan conducting an autonomous 360° college admissions assessment.

CRITICAL: YOU ARE LEADING THIS SESSION - Be proactive, structured, and authoritative.

Your goal: Guide the student through 4 phases:
1. Discovery: WHO they are (passions, values, authentic self)
2. Narrative: WHAT their story is (spike, differentiation)
3. Strategy: HOW to prove it (ECs, awards, programs aligned with narrative)
4. Time: WHEN to execute (168-hour framework, milestones)

VOICE: Professional yet warm. Use meta-coaching ("Let me explain WHY I'm asking this..."). Reference frameworks proactively. Validate throughout.

STRUCTURE: Always explain the phase, the purpose, and the progress. Don't just ask questions - teach the methodology.

FRAMEWORKS TO INTRODUCE:
- "Web Metaphor" for visualizing EC connections
- "Free = Prestigious" for summer programs
- "168-Hour Architecture" for time management
- "Narrative-First Approach" for authentic storytelling

Begin each phase by explaining its purpose. End each phase by synthesizing insights before moving forward.`,

    gameplan_strategy: `...`,
    // ... other personas
  };
}
```

---

## Implementation Plan

### **Step 1:** Add Intent Type ✅ (DONE)
- Added to `types/index.ts`

### **Step 2:** Create AssessmentOrchestrator
- New file: `services/agent-framework/src/v15.2/assessment/AssessmentOrchestrator.ts`
- Implements Planning Pattern + Prompt Chaining

### **Step 3:** Create Supporting Components
- `SessionProtocolManager.ts` - Proactive structure communication
- `CoachingIntelligenceLoader.ts` - Load JSON data
- `PhaseExecutor.ts` - Phase-specific execution

### **Step 4:** Update Intent Router
- Add classification for "interactive_assessment"
- Route to AssessmentOrchestrator

### **Step 5:** Update Context Engineering
- Add autonomous assessment persona
- Load coaching intelligence as context

### **Step 6:** Test End-to-End
- Click "Start Interactive Assessment"
- Verify: Roadmap shown, proactive leadership, structured phases

---

## Success Criteria

**Before (Current - Passive):**
- ❌ Agent: "What are your goals?"
- ❌ Student: "I don't know, you tell me"
- ❌ Agent: "Well, what do you think?"

**After (New - Autonomous):**
- ✅ Agent: "Here's our 4-phase roadmap..."
- ✅ Agent: "Let's start with Phase 1: Discovery..."
- ✅ Agent: "I'm asking this because I want to understand your authentic passions..."
- ✅ Agent: "Before we move to tactics, let me introduce the 168-Hour Framework..."

**Quality Metrics:**
- Proactivity Score: Agent introduces structure unprompted (100%)
- Narrative-First: No tactics before narrative clarity (100%)
- Framework Usage: Agent offers frameworks without being asked (80%+)
- Quality Score: Avg 8.5+/10 (from Reflection pattern)

---

**Status:** 🎯 DESIGN COMPLETE - READY FOR IMPLEMENTATION
**Next:** Implement AssessmentOrchestrator with full pattern integration
