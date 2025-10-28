# EQ Architecture Integration: Emotional Intelligence as First-Class Primitive

**Date:** 2025-10-28
**Purpose:** Formalize Emotional Intelligence (EQ) as a first-class middleware component in the Universal Agent architecture
**Status:** 🎯 ARCHITECTURAL ENHANCEMENT - CRITICAL FOR JENNY'S DNA

---

## Executive Summary

This document extends `FUNDAMENTAL_AGENT_ARCHITECTURE_V1.md` to integrate **Emotional Intelligence (EQ)** as a **first-class middleware component** that preserves Jenny's coaching DNA (tone, style, empathy) while maintaining the "Proof Over Promise" principle.

**Key Insight:** EQ is not a separate system—it's a **governable, traceable, auditable component** that plugs into the Universal Agent's 6-phase lifecycle using existing primitives.

**Architecture Pattern:** EQ functionality is implemented as **Tools + Middleware** that enhance Perception, Context, and Synthesis phases without breaking the core computational model.

---

## Part 1: EQ as Computational Primitives

### EQ Components Mapped to Existing Primitives

| EQ Component | Computational Primitive | Integration Point | Purpose |
|--------------|------------------------|-------------------|---------|
| **EQ Profile Loader** | `ContextLoader<EQProfile>` | Phase 2: Context | Load Jenny's tone vectors, lexical cadence, style weights |
| **EQ-Sense** | `Perceptor<TInput, EmotionalContext>` | Phase 1: Perception | Detect sentiment, urgency, frustration, audience register |
| **ToneAdapter Tool** | `Tool<RawText, StyledText>` | Phase 5: Synthesis | Apply Jenny's style to LLM output (post-generation) |
| **Critic Guard** | `Verifier<StyledOutput, ProvenanceCheck>` | Phase 5: Synthesis | Ensure style didn't remove factual evidence |
| **EQ Chip Logger** | `StateStore<EQChip>` | Phase 6: Memory | Audit trail for style vectors applied |
| **Narrative Memory** | `MemoryStore<NarrativeChip>` | Phase 2: Context | Retrieve exemplar chunks for relatable experiences |

**Critical Design Decision:** EQ is **middleware**, not a separate agent. It enhances existing primitives without violating the Universal Agent lifecycle.

---

## Part 2: Incremental Integration Plan (4 Phases)

### Phase 1: Data and Context Integration

**Goal:** Make Jenny's tone/style DNA available to every agent at session start

#### Components

**1. Enhanced CoachingIntelligenceLoader**

```typescript
interface EQProfile {
  eq_profile_id: string;
  coach_id: string;
  version: string;

  // Jenny's DNA
  tone_vectors: {
    warmth: number;        // 0.0-1.0
    directness: number;    // 0.0-1.0
    expertise: number;     // 0.0-1.0
    urgency: number;       // 0.0-1.0
  };

  lexical_cadence: {
    sentence_length_avg: number;
    em_dash_frequency: number;
    question_ratio: number;
    exclamation_ratio: number;
  };

  style_weights: {
    meta_coaching: number;      // "Let me explain WHY..."
    validation: number;          // "Amazing", "Awesome"
    reframing: number;          // Weakness → Strategic advantage
    transparency: number;        // "No BS, no filter"
  };

  exemplar_chunks: string[];    // Real Jenny quotes for style transfer
  forbidden_phrases: string[];  // Generic AI-speak to avoid
}

class CoachingIntelligenceLoader extends ContextLoader<CoachingContext> {
  async loadContext(studentId: string, sessionId: string): Promise<CoachingContext> {
    // EXISTING: Load coaching intelligence, student profile, SQL facts
    const coachingIntel = await this.loadCoachingIntelligence();
    const studentProfile = await this.loadStudentProfile(studentId);

    // NEW: Load EQ Profile
    const eqProfile = await this.loadEQProfile(studentProfile.coach_id);

    return {
      ...coachingIntel,
      ...studentProfile,
      eq_profile: eqProfile,  // ✅ Jenny's DNA available to all agents
      eq_profile_version: eqProfile.version
    };
  }

  private async loadEQProfile(coachId: string): Promise<EQProfile> {
    // Load from Narrative Plane: eq_profiles table
    const profile = await this.db.query(`
      SELECT
        eq_profile_id,
        coach_id,
        version,
        tone_vectors,
        lexical_cadence,
        style_weights,
        exemplar_chunks,
        forbidden_phrases
      FROM eq_profiles
      WHERE coach_id = $1
        AND active = true
      ORDER BY created_at DESC
      LIMIT 1
    `, [coachId]);

    return profile.rows[0];
  }
}
```

**2. Narrative Memory Integration**

```typescript
class NarrativeMemoryStore extends MemoryStore<NarrativeChip> {
  async retrieveExemplarChunks(
    context: string,
    audienceRegister: 'student' | 'parent',
    limit: number = 3
  ): Promise<NarrativeChip[]> {
    // Semantic search in Pinecone for relatable micro-stories
    const queryEmbedding = await this.embeddings.embed(context);

    const results = await this.pinecone.query({
      vector: queryEmbedding,
      topK: limit,
      filter: {
        chip_type: 'narrative',
        audience_register: audienceRegister,
        effectiveness_score: { $gte: 0.8 }  // Only successful interventions
      }
    });

    return results.matches.map(m => ({
      content: m.metadata.content,
      context: m.metadata.original_context,
      effectiveness: m.metadata.effectiveness_score,
      tags: m.metadata.tags
    }));
  }
}
```

**Database Schema:**

```sql
-- EQ Profiles (Narrative Plane)
CREATE TABLE eq_profiles (
  eq_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(coach_id),
  version VARCHAR(20) NOT NULL,
  tone_vectors JSONB NOT NULL,
  lexical_cadence JSONB NOT NULL,
  style_weights JSONB NOT NULL,
  exemplar_chunks TEXT[],
  forbidden_phrases TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eq_profiles_coach ON eq_profiles(coach_id, active);
```

---

### Phase 2: Perception and Input Adaptation

**Goal:** Agent perceives emotional context before executing actions

#### Components

**1. EQ-Sense Perceptor**

```typescript
interface EmotionalContext {
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'overwhelmed';
  urgency: number;  // 0.0-1.0
  audience_register: 'student' | 'parent' | 'unknown';
  detected_barriers: string[];  // e.g., ["time_scarcity", "imposter_syndrome"]
  perception_version_id: string;
}

class EQSensePerceptor extends Perceptor<string, EmotionalContext> {
  async perceive(userMessage: string): Promise<EmotionalContext> {
    // Use LLM for emotional analysis (fast, small model)
    const analysis = await this.llm.analyze({
      model: 'gpt-4o-mini',  // Fast emotional detection
      temperature: 0.0,
      messages: [{
        role: 'system',
        content: `You are an emotional intelligence analyzer. Analyze the student's message for:
- Sentiment (positive/neutral/negative/frustrated/overwhelmed)
- Urgency level (0.0-1.0)
- Audience register (student/parent/unknown)
- Detected barriers (time_scarcity, imposter_syndrome, family_pressure, etc.)

Output JSON only.`
      }, {
        role: 'user',
        content: userMessage
      }],
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(analysis.content);

    return {
      ...parsed,
      perception_version_id: `eqsense_v1_${Date.now()}`
    };
  }
}
```

**2. Enhanced Intent Router with EQ Awareness**

```typescript
class IntentRouter extends Router<string, IntentType> {
  async route(
    userMessage: string,
    emotionalContext: EmotionalContext  // ✅ NEW: EQ-aware routing
  ): Promise<IntentType> {
    // EXISTING: Intent classification
    const intent = await this.classifyIntent(userMessage);

    // NEW: Trigger guardrails based on audience register
    if (emotionalContext.audience_register === 'parent') {
      // Activate parent-specific guardrails
      this.activateGuardrail('ff.eq_parent_register');
    }

    // NEW: Urgent messages get priority
    if (emotionalContext.urgency > 0.8) {
      this.setSessionPriority('high');
    }

    // NEW: Overwhelmed students trigger proactive frameworks
    if (emotionalContext.sentiment === 'overwhelmed') {
      this.triggerProactiveFramework('168_hour');
    }

    return intent;
  }
}
```

---

### Phase 3: EQ Middleware and Tool Formalization

**Goal:** Formalize ToneAdapter as a governable Tool with audit trail

#### Components

**1. ToneAdapter Tool (First-Class Tool)**

```typescript
interface ToneAdapterInput {
  raw_text: string;
  audience_register: 'student' | 'parent';
  eq_profile_id: string;
  emotional_context?: EmotionalContext;
  style_overrides?: Partial<EQProfile['tone_vectors']>;
}

interface ToneAdapterOutput {
  styled_text: string;
  eq_chip: EQChip;
  style_vector_applied: EQProfile['tone_vectors'];
  exemplar_chunks_used: string[];
}

interface EQChip {
  chip_id: string;
  chip_type: 'eq';
  eq_profile_version: string;
  style_vector: EQProfile['tone_vectors'];
  exemplar_refs: string[];
  audience_register: 'student' | 'parent';
  timestamp: Date;
}

class ToneAdapterTool extends Tool<ToneAdapterInput, ToneAdapterOutput> {
  name = 'tone_adapter';
  description = "Apply Jenny's coaching style to raw LLM output";
  side_effects = 'none';  // Read-only transformation

  async execute(input: ToneAdapterInput): Promise<ToneAdapterOutput> {
    // 1. Load EQ Profile
    const eqProfile = await this.loadEQProfile(input.eq_profile_id);

    // 2. Retrieve exemplar chunks for style transfer
    const exemplars = await this.narrativeMemory.retrieveExemplarChunks(
      input.raw_text,
      input.audience_register,
      3
    );

    // 3. Build style transfer prompt
    const stylePrompt = this.buildStylePrompt(
      input.raw_text,
      eqProfile,
      exemplars,
      input.emotional_context
    );

    // 4. Apply style via LLM
    const styledText = await this.llm.complete({
      model: 'gpt-4o',
      temperature: 0.7,  // Creative for style
      messages: [{
        role: 'system',
        content: stylePrompt
      }, {
        role: 'user',
        content: input.raw_text
      }]
    });

    // 5. Create EQ chip for audit trail
    const eqChip: EQChip = {
      chip_id: uuid(),
      chip_type: 'eq',
      eq_profile_version: eqProfile.version,
      style_vector: input.style_overrides || eqProfile.tone_vectors,
      exemplar_refs: exemplars.map(e => e.content.slice(0, 50)),
      audience_register: input.audience_register,
      timestamp: new Date()
    };

    return {
      styled_text: styledText.content,
      eq_chip: eqChip,
      style_vector_applied: eqChip.style_vector,
      exemplar_chunks_used: eqChip.exemplar_refs
    };
  }

  private buildStylePrompt(
    rawText: string,
    eqProfile: EQProfile,
    exemplars: NarrativeChip[],
    emotionalContext?: EmotionalContext
  ): string {
    return `You are adapting coaching output to match Jenny Duan's style.

**Jenny's Tone Vectors:**
- Warmth: ${eqProfile.tone_vectors.warmth}
- Directness: ${eqProfile.tone_vectors.directness}
- Expertise: ${eqProfile.tone_vectors.expertise}
- Urgency: ${eqProfile.tone_vectors.urgency}

**Lexical Cadence:**
- Avg sentence length: ${eqProfile.lexical_cadence.sentence_length_avg} words
- Em-dash frequency: ${eqProfile.lexical_cadence.em_dash_frequency}
- Question ratio: ${eqProfile.lexical_cadence.question_ratio}

**Style Exemplars (Jenny's Real Language):**
${exemplars.map((e, i) => `${i + 1}. "${e.content}"`).join('\n')}

**Forbidden Phrases (Generic AI-speak to avoid):**
${eqProfile.forbidden_phrases.join(', ')}

${emotionalContext ? `**Student's Emotional State:** ${emotionalContext.sentiment} (urgency: ${emotionalContext.urgency})` : ''}

**CRITICAL:** Preserve ALL factual content and SQL chip references. Only adjust style, tone, and phrasing.

Adapt the following text to Jenny's style:`;
  }
}
```

**2. Agent Kernel Hook (Universal Agent Integration)**

```typescript
class UniversalAgent {
  // ... existing lifecycle phases

  async execute(input: TInput): Promise<TOutput> {
    // Phase 1: Perception
    const structuredInput = await this.perceptor.perceive(input);
    const emotionalContext = await this.eqSensePerceptor.perceive(input);  // ✅ EQ-Sense

    // Phase 2: Context
    const context = await this.contextLoader.loadContext(structuredInput);
    // context.eq_profile is now available ✅

    // Phase 3: Reasoning
    const plan = await this.planner.plan(structuredInput, context);

    // Phase 4: Action
    const rawOutput = await this.toolExecutor.executePlan(plan);

    // Phase 5: Synthesis
    const synthesizedOutput = await this.synthesizer.synthesize(rawOutput);

    // ✅ NEW: Apply EQ style BEFORE final output
    const styledOutput = await this.applyEQStyle(
      synthesizedOutput,
      context.eq_profile,
      emotionalContext
    );

    // ✅ NEW: Verify style didn't remove facts
    const verificationResult = await this.verifier.verify(styledOutput, {
      originalOutput: synthesizedOutput,
      mustPreserveSQLChips: true
    });

    if (!verificationResult.passed) {
      // Rollback to raw output if style broke provenance
      return synthesizedOutput;
    }

    // Phase 6: Memory
    await this.stateStore.save(sessionState);
    await this.logEQChip(styledOutput.eq_chip);  // ✅ Audit trail

    return styledOutput.styled_text;
  }

  private async applyEQStyle(
    rawOutput: string,
    eqProfile: EQProfile,
    emotionalContext: EmotionalContext
  ): Promise<ToneAdapterOutput> {
    const toneAdapter = this.toolExecutor.getTool<ToneAdapterTool>('tone_adapter');

    return await toneAdapter.execute({
      raw_text: rawOutput,
      audience_register: emotionalContext.audience_register,
      eq_profile_id: eqProfile.eq_profile_id,
      emotional_context: emotionalContext
    });
  }
}
```

**3. State Store Enhancement**

```typescript
class StateStore {
  async saveSessionState(sessionId: string, state: SessionState): Promise<void> {
    // EXISTING: Save session state
    await this.db.query(`
      UPDATE agent_sessions
      SET session_state = $1, updated_at = NOW()
      WHERE session_id = $2
    `, [JSON.stringify(state), sessionId]);

    // NEW: Record EQ style metadata
    if (state.eq_chip) {
      await this.db.query(`
        INSERT INTO eq_style_audit (
          session_id,
          eq_profile_version,
          style_vector_applied,
          audience_register,
          exemplar_refs
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        sessionId,
        state.eq_chip.eq_profile_version,
        JSON.stringify(state.eq_chip.style_vector),
        state.eq_chip.audience_register,
        state.eq_chip.exemplar_refs
      ]);
    }
  }
}
```

---

### Phase 4: Validation and Quality Assurance (Self-Correction)

**Goal:** Ensure style never trumps substance ("Proof Over Promise")

#### Components

**1. Enhanced Verifier with Provenance Check**

```typescript
interface ProvenanceCheck {
  sql_chips_preserved: boolean;
  fact_count_before: number;
  fact_count_after: number;
  missing_facts: string[];
}

class ResponseVerifier extends Verifier<StyledOutput, ProvenanceCheck> {
  async verify(
    styledOutput: ToneAdapterOutput,
    originalOutput: string
  ): Promise<VerificationResult<ProvenanceCheck>> {
    // 1. Extract SQL chips from original
    const originalChips = this.extractSQLChips(originalOutput);

    // 2. Extract SQL chips from styled
    const styledChips = this.extractSQLChips(styledOutput.styled_text);

    // 3. Check if any facts were removed
    const missingChips = originalChips.filter(
      original => !styledChips.some(styled => styled.data === original.data)
    );

    const passed = missingChips.length === 0;

    return {
      passed,
      score: passed ? 1.0 : 0.0,
      metrics: {
        sql_chips_preserved: passed,
        fact_count_before: originalChips.length,
        fact_count_after: styledChips.length,
        missing_facts: missingChips.map(c => c.data)
      },
      feedback: passed
        ? "Style preserved all factual evidence"
        : `⚠️ Style removed ${missingChips.length} SQL chips. Rolling back to raw output.`
    };
  }

  private extractSQLChips(text: string): Array<{ data: string }> {
    // Extract [chip:sql:*] references
    const chipRegex = /\[chip:sql:([^\]]+)\]/g;
    const matches = [...text.matchAll(chipRegex)];
    return matches.map(m => ({ data: m[1] }));
  }
}
```

**2. EQ Chip Logger**

```typescript
interface EQChipLog {
  chip_id: string;
  session_id: string;
  message_index: number;
  eq_profile_version: string;
  style_vector: EQProfile['tone_vectors'];
  exemplar_refs: string[];
  audience_register: 'student' | 'parent';
  provenance_check_passed: boolean;
  created_at: Date;
}

class EQChipLogger {
  async logEQChip(
    sessionId: string,
    messageIndex: number,
    eqChip: EQChip,
    provenanceCheckPassed: boolean
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO eq_chip_logs (
        chip_id,
        session_id,
        message_index,
        eq_profile_version,
        style_vector,
        exemplar_refs,
        audience_register,
        provenance_check_passed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      eqChip.chip_id,
      sessionId,
      messageIndex,
      eqChip.eq_profile_version,
      JSON.stringify(eqChip.style_vector),
      eqChip.exemplar_refs,
      eqChip.audience_register,
      provenanceCheckPassed
    ]);
  }
}
```

**Database Schema:**

```sql
-- EQ Style Audit Trail
CREATE TABLE eq_style_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(session_id),
  eq_profile_version VARCHAR(20) NOT NULL,
  style_vector_applied JSONB NOT NULL,
  audience_register VARCHAR(20) NOT NULL,
  exemplar_refs TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EQ Chip Logs
CREATE TABLE eq_chip_logs (
  chip_id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES agent_sessions(session_id),
  message_index INTEGER NOT NULL,
  eq_profile_version VARCHAR(20) NOT NULL,
  style_vector JSONB NOT NULL,
  exemplar_refs TEXT[],
  audience_register VARCHAR(20) NOT NULL,
  provenance_check_passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eq_chip_logs_session ON eq_chip_logs(session_id);
```

---

## Part 3: EQ Governance and Traceability

### Audit Trail Flow

```
User Input
  ↓
[EQ-Sense Perceptor] → EmotionalContext stored in StateStore
  ↓
[Intent Router] → Guardrails activated based on audience_register
  ↓
[Agent Execution] → Raw LLM output generated
  ↓
[ToneAdapter Tool] → Style applied, EQChip created
  ↓
[Verifier] → Provenance check (SQL chips preserved?)
  ↓
[StateStore] → EQChip logged to eq_chip_logs table
  ↓
Styled Output Returned
```

### Traceability Guarantees

1. **Every styled response** has an `eq_chip` in `eq_chip_logs`
2. **Every EQ chip** references:
   - `eq_profile_version` (which Jenny DNA was used)
   - `style_vector` (tone settings applied)
   - `exemplar_refs` (which real Jenny quotes influenced the style)
   - `provenance_check_passed` (whether facts were preserved)
3. **Every EQ failure** triggers rollback to raw output (style never breaks substance)

---

## Part 4: Implementation Phases

### Phase 1: Data and Context Integration (Week 2)

**Tasks:**
1. ✅ Create `eq_profiles` table in Narrative Plane
2. ✅ Enhance `CoachingIntelligenceLoader` to load EQ profiles
3. ✅ Create `NarrativeMemoryStore` for exemplar chunks
4. ✅ Extract Jenny's tone vectors from 11 coaching sessions

**Deliverables:**
- Jenny's EQ profile stored in database
- All agents load `eq_profile` in context
- Narrative memory accessible via Pinecone

---

### Phase 2: Perception and Input Adaptation (Week 3)

**Tasks:**
1. ✅ Implement `EQSensePerceptor` for emotional detection
2. ✅ Enhance `IntentRouter` with audience register awareness
3. ✅ Add guardrail triggering based on emotional context
4. ✅ Test emotional detection accuracy

**Deliverables:**
- Every user message analyzed for sentiment/urgency/audience
- Parent messages activate parent-specific guardrails
- Overwhelmed students trigger proactive frameworks

---

### Phase 3: EQ Middleware and Tool Formalization (Week 4)

**Tasks:**
1. 🔴 **Implement `ToneAdapterTool`** (critical path)
2. ✅ Register `tone_adapter` with ToolBus
3. ✅ Add Agent Kernel hook in Universal Agent
4. ✅ Implement `StateStore` EQ audit logging
5. ✅ Test style application on 11 coaching sessions

**Deliverables:**
- ToneAdapter works as governable Tool
- All agent responses pass through EQ layer
- EQ chips logged to database

---

### Phase 4: Validation and Quality Assurance (Week 4)

**Tasks:**
1. ✅ Enhance `Verifier` with provenance check
2. ✅ Implement automatic rollback if facts removed
3. ✅ Create `EQChipLogger`
4. ✅ Test provenance preservation on 100 responses

**Deliverables:**
- 100% of styled responses preserve SQL chips
- Automatic rollback on provenance failure
- Complete audit trail for EQ style

---

## Part 5: Benefits of EQ as First-Class Primitive

### 1. **Governance**
- ✅ EQ style is a **Tool**, subject to ToolBus governance
- ✅ Budget tracking: Count tokens used for style transfer
- ✅ Audit trail: Every styled response logged

### 2. **Traceability**
- ✅ Every response has an `eq_chip` showing which style was applied
- ✅ Exemplar chunks used are recorded
- ✅ Provenance check results stored

### 3. **Quality Assurance**
- ✅ Style never removes facts (Verifier enforces)
- ✅ Automatic rollback if provenance broken
- ✅ "Proof Over Promise" guaranteed

### 4. **Reusability**
- ✅ EQ profile is coach-specific (multi-coach ready)
- ✅ ToneAdapter is agent-agnostic (all agents benefit)
- ✅ Exemplar chunks grow over time (learning)

### 5. **Separation of Concerns**
- ✅ LLM generates **substance** (facts, recommendations)
- ✅ ToneAdapter applies **style** (Jenny's DNA)
- ✅ Verifier ensures **substance preserved**

---

## Part 6: Open Questions

1. **EQ Profile Creation:** How do we extract tone vectors from Jenny's 11 sessions?
   - Option A: Manual annotation by linguists
   - Option B: LLM-based analysis of Jenny's language patterns
   - Option C: Hybrid (LLM draft → human refinement)

2. **Style Transfer Model:** Should we use:
   - Option A: GPT-4o with few-shot prompts (current approach)
   - Option B: Fine-tuned model on Jenny's transcripts
   - Option C: LoRA adapter for style transfer

3. **Exemplar Chunk Selection:** How many exemplars per response?
   - Current: 3 chunks
   - Should this be dynamic based on response length?

4. **Audience Register Detection Accuracy:** What threshold for parent vs. student?
   - Current: LLM-based classification
   - Should we add keyword-based heuristics as backup?

---

## Summary

This EQ architecture integration:
- ✅ Makes emotional intelligence a **first-class primitive**
- ✅ Preserves Jenny's coaching DNA via **tone vectors + exemplar chunks**
- ✅ Ensures "Proof Over Promise" via **Verifier provenance checks**
- ✅ Provides complete **audit trail** for governance
- ✅ Reuses existing primitives (Tool, Verifier, ContextLoader, MemoryStore)
- ✅ Integrates seamlessly into Universal Agent lifecycle

**Status:** 🎯 ARCHITECTURE EXTENDED - READY FOR IMPLEMENTATION
**Next Step:** Begin Phase 1 (EQ profile extraction from 11 coaching sessions)
