# First Principles Architecture: Extensible Multi-Coach Intelligence System
## Foundation for Autonomous, Proactive, Hyper-Personalized Coaching at Scale

**Version:** v10.3
**Created:** 2025-10-17
**Purpose:** Design the foundational abstraction layers that enable growth from 1 coach × 1 student → N coaches × M students × K specialties
**Design Philosophy:** Start specific (Jenny + Huda), scale intelligently (horizontal + vertical), evolve organically (augmentation + extension)

---

## DESIGN PRINCIPLES

### Principle 1: **Standardized Core, Customizable Extensions**
```
┌─────────────────────────────────────┐
│   STANDARDIZED FRAMEWORKS (80%)    │ ← All coaches must implement
│   - Assessment                      │
│   - GamePlan                        │
│   - Weekly Execution                │
│   - Parent Navigation               │
│   - Time Architecture (168-hour)    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   CUSTOM TOOLS (20%)                │ ← Coach-specific differentiation
│   - Jenny: NCWIT insider, builder   │
│   - Research Coach: PI outreach     │
│   - PreMed Coach: Shadowing         │
└─────────────────────────────────────┘
```

### Principle 2: **Context-Aware Intelligence**
```
Student Context (WHO) × Coach Intelligence (HOW) × Timing (WHEN) → Action (WHAT)

Student Context:
  - Psycho-behavioral: Type A/B, capacity, personality
  - Academic: Class year, school competitiveness
  - Family: Parent anxiety, cultural factors
  - Goals: Target schools, major interests

Coach Intelligence:
  - Standardized: Assessment, GamePlan, Execution
  - Custom: Specialty tools, insider knowledge
  - Experience: Pattern library from past students

Timing:
  - Class year: Freshman (divergent) vs Junior (prescriptive)
  - Week number: Foundation vs Build vs Launch
  - Crisis: Real-time response requirements
```

### Principle 3: **Growth Through Augmentation**
```
Growth Vector 1: DEPTH (Same coach, more students)
  Jenny + Student 1 → Gameplan pattern v1.0
  Jenny + Student 2 → Gameplan pattern v1.1 (refined)
  Jenny + Student 20 → Gameplan pattern v2.0 (battle-tested)

Growth Vector 2: BREADTH (New coaches, new specialties)
  Coach: Research Specialist
    → Add: PI outreach tool, publication strategy tool
    → Augment: Assessment (add research potential layer)

Growth Vector 3: EVOLUTION (Framework improvements)
  Coach: New Jenny
    → Augment: 168-hour framework (add calendar integration)
    → Extend: Exclamation gradient (add emoji calibration)
```

### Principle 4: **Outcome-Driven Tool Selection**
```
Every tool must answer:
  - What outcome does this drive?
  - For which student archetype?
  - At what stage of the journey?
  - What's the success metric?

Example:
  Tool: NCWIT Insider Knowledge
  Outcome: National recognition for female STEM students
  Archetype: Type B, builder, underrepresented
  Stage: Week 10-20 (Build phase)
  Metric: Award win rate (33% for Jenny)
```

---

## ARCHITECTURE LAYERS

### LAYER 1: STUDENT CONTEXT ENGINE

```typescript
/**
 * StudentContext - Complete student profile for context-aware coaching
 *
 * Purpose: Store all context needed for hyper-personalized coaching
 * Extensibility: New coaches can add new context dimensions
 */
interface StudentContext {
  // CORE IDENTITY (Required for all students)
  student_id: string;
  name: string;
  class_year: 'freshman' | 'sophomore' | 'junior' | 'senior';
  current_week: number;

  // PSYCHO-BEHAVIORAL PROFILE (From assessment)
  psycho_behavioral: {
    personality_type: 'Type_A_competitive' | 'Type_B_collaborative' | 'Mixed';
    capacity_level: 'high' | 'medium' | 'low';  // Can juggle multiple vs needs focus
    social_style: 'outgoing' | 'quiet' | 'balanced';
    motivation_drivers: Array<'competition' | 'community' | 'curiosity' | 'achievement'>;
    risk_tolerance: 'high' | 'medium' | 'low';
    execution_style: 'self_starter' | 'needs_structure' | 'needs_accountability';

    // Example - Huda:
    // personality_type: 'Type_B_collaborative'
    // capacity_level: 'medium'  // Needs structure, not lazy
    // social_style: 'quiet'
    // motivation_drivers: ['community', 'curiosity']
    // execution_style: 'needs_structure'
  };

  // ACADEMIC CONTEXT
  academic: {
    gpa_weighted: number;
    gpa_unweighted: number;
    test_scores: {
      sat?: number;
      act?: number;
      ap_count: number;
    };
    school_competitiveness: 'highly_competitive' | 'competitive' | 'non_competitive';
    school_name: string;
    class_rank?: number;

    // Example - Huda:
    // gpa_weighted: 4.3
    // ap_count: 11
    // school_competitiveness: 'non_competitive'
  };

  // FAMILY DYNAMICS (Critical for parent navigation)
  family: {
    parent_involvement: 'high' | 'medium' | 'low';
    parent_anxiety_level: number; // 0-10
    parent_concerns: string[];
    cultural_factors: string[];
    family_constraints: string[];

    // Example - Huda:
    // parent_involvement: 'high' (Dad present in sessions)
    // parent_anxiety_level: 7
    // parent_concerns: ['identity emphasis', 'college prestige']
    // cultural_factors: ['Muslim', 'Indian']
  };

  // INTERESTS & NARRATIVE (Identity fusion)
  interests: {
    primary_passions: string[];
    skills: string[];
    unique_angles: string[];
    identity_fusion?: string;  // e.g., "Film × CS → Digital Storyteller"

    // Example - Huda:
    // primary_passions: ['film', 'game_dev', 'algorithmic_justice']
    // skills: ['coding', 'storytelling', 'design']
    // identity_fusion: 'Film × CS → Digital Storyteller'
  };

  // GOALS & TARGETS
  goals: {
    target_schools: Array<{
      name: string;
      probability: number;  // Hidden calculation
      strategic_priority: number;  // 1 = top priority
    }>;
    target_major: string;
    career_interests: string[];

    // Example - Huda:
    // target_schools: [
    //   {name: 'USC Games', probability: 0.15, strategic_priority: 1},  // Hidden optimization
    //   {name: 'Stanford CS', probability: 0.01, strategic_priority: 3}
    // ]
  };

  // CURRENT STATE (Tracking progress)
  state: {
    identity_score: number;  // 0-10 (Huda: 2 → 10 over 93 weeks)
    confidence_level: number; // 0-1 (Huda: 0.2 → 1.0)
    rubric_scores: {
      academics: number;  // 0-10
      leadership: number;
      service: number;
      artifacts: number;
      recognition: number;
      total: number;  // 0-50
    };

    // Example - Huda baseline:
    // rubric_scores: {academics: 7, leadership: 2, service: 1, artifacts: 3, recognition: 1, total: 14}
  };

  // EXTENSIBILITY: Custom context added by specialty coaches
  custom_context?: Record<string, any>;

  // Example - Research coach might add:
  // custom_context: {
  //   research_experience: 'none',
  //   lab_access: false,
  //   publication_interest: ['biology', 'neuroscience']
  // }
}
```

### LAYER 2: COACH INTELLIGENCE BASE

```typescript
/**
 * CoachIntelligence - Abstract base class for all coach digital twins
 *
 * Purpose: Define standardized coaching interface + custom extensions
 * Extensibility: Each coach implements base + adds custom tools
 */
abstract class CoachIntelligence {
  coach_id: string;
  coach_name: string;
  coach_specialty: string[];  // ['builder', 'STEM', 'underrepresented']
  credibility_markers: string[];  // ['Stanford', 'NCWIT winner']

  // STANDARDIZED FRAMEWORKS (All coaches must implement)
  abstract assessment: AssessmentFramework;
  abstract gameplan: GamePlanFramework;
  abstract execution: ExecutionFramework;
  abstract parent_navigation: ParentNavigationFramework;
  abstract time_architecture: TimeArchitectureFramework;

  // CUSTOM TOOLS REGISTRY (Coach-specific differentiation)
  custom_tools: Map<string, CoachingTool> = new Map();

  // PATTERN LIBRARY (Grows with experience)
  pattern_library: {
    assessments_completed: number;
    gameplans_generated: number;
    students_coached: number;
    success_patterns: Array<{
      pattern_name: string;
      student_archetype: string;
      outcome_achieved: string;
      reusable: boolean;
    }>;
  };

  // INTELLIGENCE LAYERS (31 for Jenny, may differ for others)
  intelligence_layers: IntelligenceLayer[];

  // MULTI-PERSONA PROCESSING (7 for Jenny)
  personas: Persona[];

  constructor(config: CoachConfig) {
    this.coach_id = config.coach_id;
    this.coach_name = config.coach_name;
    this.coach_specialty = config.specialty;
    this.credibility_markers = config.credibility;
    this.loadPatternLibrary();
  }

  /**
   * Execute coaching action with context-aware tool selection
   */
  async executeCoachingAction(
    action_type: CoachingActionType,
    student_context: StudentContext,
    situation_context: SituationContext
  ): Promise<CoachingResponse> {
    // 1. Load student context
    const context = await this.loadContext(student_context);

    // 2. Select appropriate tools based on context
    const tools = this.selectTools(action_type, context, situation_context);

    // 3. Execute multi-persona processing
    const persona_outputs = await this.processWithPersonas(tools, context);

    // 4. Synthesize response
    const response = this.synthesizeResponse(persona_outputs, context);

    // 5. Apply quality gates
    const validated_response = this.validateQuality(response);

    return validated_response;
  }

  /**
   * Dynamic tool selection based on student context + situation
   */
  private selectTools(
    action: CoachingActionType,
    student: StudentContext,
    situation: SituationContext
  ): CoachingTool[] {
    const tools: CoachingTool[] = [];

    // Always include standardized frameworks
    if (action === 'assessment') {
      tools.push(this.assessment);
    } else if (action === 'gameplan') {
      tools.push(this.gameplan);
    } else if (action === 'weekly_execution') {
      tools.push(this.execution);
    }

    // Add custom tools based on context
    if (student.interests.primary_passions.includes('research')) {
      const research_tool = this.custom_tools.get('research_strategy');
      if (research_tool) tools.push(research_tool);
    }

    if (student.psycho_behavioral.personality_type === 'Type_B_collaborative') {
      // Use community-focused language, not competition
      const community_tool = this.custom_tools.get('community_impact');
      if (community_tool) tools.push(community_tool);
    }

    // Class year adaptation
    if (student.class_year === 'junior' && student.current_week < 20) {
      // Prescriptive mode - low effort, quick ROI
      const quick_wins_tool = this.custom_tools.get('quick_wins_strategy');
      if (quick_wins_tool) tools.push(quick_wins_tool);
    }

    return tools;
  }

  /**
   * Register custom tool (extensibility point)
   */
  registerCustomTool(tool: CoachingTool): void {
    this.custom_tools.set(tool.tool_id, tool);
  }

  /**
   * Augment existing framework (pattern evolution)
   */
  augmentFramework(
    framework_type: 'assessment' | 'gameplan' | 'execution',
    enhancement: FrameworkEnhancement
  ): void {
    // Allow coaches to improve existing frameworks
    // Example: Jenny adds calendar integration to 168-hour framework
  }
}
```

### LAYER 3: JENNY DUAN IMPLEMENTATION

```typescript
/**
 * JennyDuanCoach - Concrete implementation with Jenny's 31 intelligence layers
 */
class JennyDuanCoach extends CoachIntelligence {
  constructor() {
    super({
      coach_id: 'jenny-duan',
      coach_name: 'Jenny Duan',
      specialty: ['builder', 'STEM', 'underrepresented', 'games', 'CS'],
      credibility: ['Stanford', 'NCWIT winner', 'KWK instructor']
    });

    // Initialize 31 intelligence layers
    this.intelligence_layers = this.initialize31Layers();

    // Initialize 7 personas
    this.personas = [
      new TherapistPersona(),
      new AdmissionsOfficerPersona(),
      new ParentWhispererPersona(),
      new StrategicArchitectPersona(),
      new ConfidenceAlchemistPersona(),
      new TimeMathematicianPersona(),
      new NetworkConnectorPersona()
    ];

    // Register Jenny's custom tools
    this.registerJennyCustomTools();
  }

  private registerJennyCustomTools(): void {
    // Tool 1: NCWIT Insider Knowledge
    this.registerCustomTool({
      tool_id: 'ncwit_insider',
      name: 'NCWIT Insider Strategy',
      description: 'Jenny won NCWIT twice, knows what wins',
      applicable_to: (student) => {
        return student.interests.primary_passions.some(p =>
          ['CS', 'tech', 'AI', 'game_dev'].includes(p)
        ) && student.academic.gpa_weighted >= 3.8;
      },
      execute: async (student) => {
        return {
          recommendation: 'NCWIT Aspirations Award',
          strategy: 'Submit Synthoria game as proof artifact',
          insider_tip: 'Emphasize community impact + technical depth',
          success_probability: 0.33
        };
      }
    });

    // Tool 2: Builder/Passion Project Strategy
    this.registerCustomTool({
      tool_id: 'builder_strategy',
      name: 'Passion Project Builder',
      description: 'Jenny specializes in scaling student projects',
      applicable_to: (student) => {
        return student.psycho_behavioral.personality_type === 'Type_B_collaborative' &&
               student.interests.skills.includes('coding');
      },
      execute: async (student) => {
        return {
          project_idea: 'Build game that teaches X to Y audience',
          scaling_strategy: '150 plays → 200 classrooms via school partnerships',
          portfolio_multiplication: '5+ application touchpoints from 1 project'
        };
      }
    });

    // Tool 3: USC Games Hidden Optimization
    this.registerCustomTool({
      tool_id: 'usc_games_optimization',
      name: 'USC Games Strategic Alignment',
      description: 'Hidden optimization for USC Games admissions',
      applicable_to: (student) => {
        // Internal use only - never shown to student
        return student.goals.target_schools.some(s => s.name === 'USC Games');
      },
      execute: async (student) => {
        return {
          optimization_target: 'USC Games',
          mentioned_to_student: false,
          every_recommendation_optimized: true,
          project_choices: 'Game dev > web dev',
          essay_angles: 'Narrative + technology fusion',
          summer_programs: 'KWK at Stanford (proximity to USC Games culture)'
        };
      }
    });

    // More tools...
  }

  // Implement standardized frameworks
  assessment = new JennyAssessmentFramework();
  gameplan = new JennyGamePlanFramework();
  execution = new JennyExecutionFramework();
  parent_navigation = new JennyParentNavigationFramework();
  time_architecture = new Jenny168HourFramework();
}
```

### LAYER 4: RESEARCH COACH IMPLEMENTATION (Extensibility Example)

```typescript
/**
 * ResearchCoach - Different specialty, different custom tools
 */
class ResearchCoach extends CoachIntelligence {
  constructor() {
    super({
      coach_id: 'research-specialist',
      coach_name: 'Research Coach',
      specialty: ['research', 'STEM', 'publications'],
      credibility: ['Harvard Med', 'Nature publication', 'Lab PI']
    });

    // Same standardized frameworks (assessment, gameplan, execution)
    // But DIFFERENT custom tools
    this.registerResearchCustomTools();
  }

  private registerResearchCustomTools(): void {
    // Tool 1: PI Outreach Strategy
    this.registerCustomTool({
      tool_id: 'pi_outreach',
      name: 'Professor/PI Cold Email Strategy',
      description: 'Get research positions via strategic outreach',
      applicable_to: (student) => {
        return student.interests.primary_passions.includes('research');
      },
      execute: async (student) => {
        return {
          email_template: 'Research-focused cold email',
          target_professors: 'Local university + field match',
          success_rate: 0.15,  // 15% positive response
          follow_up_cadence: '3 days, 1 week, 2 weeks'
        };
      }
    });

    // Tool 2: Publication Strategy
    this.registerCustomTool({
      tool_id: 'publication_strategy',
      name: 'High School Publication Path',
      description: 'Get published in peer-reviewed journals',
      applicable_to: (student) => {
        return student.custom_context?.research_experience === 'some';
      },
      execute: async (student) => {
        return {
          targets: ['Journal of Emerging Investigators', 'High school conferences'],
          timeline: '6-12 months',
          mentorship: 'Find graduate student co-author'
        };
      }
    });

    // Tool 3: Lab Access Strategy
    this.registerCustomTool({
      tool_id: 'lab_access',
      name: 'Lab Equipment Access',
      description: 'Access university labs as high school student',
      execute: async (student) => {
        return {
          approach: 'Partner with local university',
          leverage: 'Community college partnerships',
          backup: 'Citizen science projects'
        };
      }
    });
  }

  // Implement standardized frameworks (same structure, different content)
  assessment = new ResearchAssessmentFramework();  // Adds research potential layer
  gameplan = new ResearchGamePlanFramework();      // Focuses on publication timeline
  execution = new ResearchExecutionFramework();    // Weekly lab hours, paper drafts
  parent_navigation = new StandardParentNavigationFramework();
  time_architecture = new Standard168HourFramework();
}
```

---

## STANDARDIZED FRAMEWORKS (All Coaches Must Implement)

### FRAMEWORK 1: ASSESSMENT

```typescript
/**
 * AssessmentFramework - Base assessment structure
 *
 * All coaches implement this, but can add custom layers
 */
abstract class AssessmentFramework {
  // Core assessment dimensions (required)
  abstract executeDiagnostic(student: StudentContext): Promise<DiagnosticResult>;
  abstract executeEQProfile(student: StudentContext): Promise<EQProfile>;
  abstract executeRealityCheck(student: StudentContext): Promise<RubricScore>;
  abstract executeTimeAudit(student: StudentContext): Promise<TimeArchitecture>;
  abstract executeGapAnalysis(student: StudentContext): Promise<GapIdentification>;

  // Extensibility: Custom assessment layers
  custom_layers: Map<string, AssessmentLayer> = new Map();

  registerCustomLayer(layer: AssessmentLayer): void {
    this.custom_layers.set(layer.layer_id, layer);
  }
}

/**
 * JennyAssessmentFramework - Jenny's 27-layer implementation
 */
class JennyAssessmentFramework extends AssessmentFramework {
  async executeDiagnostic(student: StudentContext): Promise<DiagnosticResult> {
    // Layer 1: 27-second credibility establishment
    const opening = this.execute27SecondOpening();

    // Layer 2: Rapid diagnostic cascade
    const cascade = await this.executeQuestionCascade(student);

    // Layer 3: Personality profiling (35 seconds)
    const personality = await this.execute35SecondPersonalityProfile(student);

    // ... all 27 layers

    return {
      diagnostic_complete: true,
      duration_minutes: 90,
      layers_executed: 27
    };
  }

  private execute27SecondOpening(): OpeningResult {
    return {
      exact_script: "Hi, it's really nice to meet you. I'm Jenny, and I go to Stanford, and I'd love to learn a little bit more about you.",
      timestamp: "00:00:27",
      stanford_mention_word: 14,
      psychological_impact: {
        parent_hears: "Stanford credibility",
        student_hears: "peer curiosity"
      }
    };
  }

  private async executeQuestionCascade(student: StudentContext): Promise<CascadeResult> {
    // Progressive depth questions
    const questions = [
      {level: 1, q: "How many hours do you sleep?"},
      {level: 2, q: "What clubs are you in?"},
      {level: 3, q: "Tell me about school dynamics"},  // Toxicity probe
      {level: 4, q: "How do your parents feel about college?"}  // Family dynamics
    ];

    return {cascade_depth: 4, insights: []};
  }
}

/**
 * ResearchAssessmentFramework - Research coach adds research potential layer
 */
class ResearchAssessmentFramework extends AssessmentFramework {
  constructor() {
    super();

    // Add custom layer: Research potential assessment
    this.registerCustomLayer({
      layer_id: 'research_potential',
      name: 'Research Aptitude & Interest',
      execute: async (student) => {
        return {
          curiosity_level: 'high' | 'medium' | 'low',
          analytical_skills: 0-10,
          field_interests: string[],
          prior_experience: 'none' | 'some' | 'significant'
        };
      }
    });
  }

  async executeDiagnostic(student: StudentContext): Promise<DiagnosticResult> {
    // Use base diagnostic + research layer
    const base = await super.executeDiagnostic(student);
    const research = await this.custom_layers.get('research_potential')!.execute(student);

    return {...base, research_potential: research};
  }
}
```

### FRAMEWORK 2: GAMEPLAN

```typescript
/**
 * GamePlanFramework - Base gameplan structure
 */
abstract class GamePlanFramework {
  // Core gameplan components (required)
  abstract generateFourPillarPlan(
    assessment: AssessmentResult,
    student: StudentContext
  ): Promise<FourPillarPlan>;

  abstract generatePriorityLadder(
    student: StudentContext
  ): Promise<PriorityLadder>;

  abstract generateTimeline(
    student: StudentContext
  ): Promise<Timeline>;

  abstract generateParentBrief(
    gameplan: GamePlan,
    student: StudentContext
  ): Promise<ParentBrief>;

  // Dual-layer messaging (all coaches must implement)
  abstract encodeDualLayerMessage(
    message: string,
    student_context: StudentContext
  ): DualLayerMessage;
}

/**
 * JennyGamePlanFramework - 4-pillar + dual-layer messaging
 */
class JennyGamePlanFramework extends GamePlanFramework {
  async generateFourPillarPlan(
    assessment: AssessmentResult,
    student: StudentContext
  ): Promise<FourPillarPlan> {
    return {
      pillar_1: {
        name: "Identity & Narrative",
        strategy: student.interests.identity_fusion || "To be developed",
        weekly_actions: []
      },
      pillar_2: {
        name: "Proof Artifacts",
        strategy: "2 artifacts/week minimum",
        weekly_actions: this.generate2ArtifactPlan(student)
      },
      pillar_3: {
        name: "Recognition Pathways",
        strategy: this.generateAwardsLadder(student),
        weekly_actions: []
      },
      pillar_4: {
        name: "Service & Ecosystem",
        strategy: this.generateServiceStrategy(student),
        weekly_actions: []
      }
    };
  }

  encodeDualLayerMessage(message: string, student: StudentContext): DualLayerMessage {
    // Every paragraph coded for both audiences
    const example = "strong academic record with 11 APs";

    return {
      visible_text: example,
      parent_interpretation: "Rigorous and competitive",
      student_interpretation: "Foundation secure, focus elsewhere",
      hidden_message: "Don't need more APs"
    };
  }
}
```

### FRAMEWORK 3: EXECUTION

```typescript
/**
 * ExecutionFramework - Weekly execution support
 */
abstract class ExecutionFramework {
  abstract generate168HourPlan(student: StudentContext): Promise<TimeAllocation>;
  abstract generateWeeklyTasks(student: StudentContext, week: number): Promise<WeeklyTasks>;
  abstract handleObstacle(obstacle: Obstacle, student: StudentContext): Promise<PivotStrategy>;
  abstract calibrateOverwhelm(student: StudentContext): Promise<TaskAssignment>;
}
```

---

## EXTENSIBILITY PATTERNS

### PATTERN 1: HORIZONTAL SCALING (Same Coach, More Students)

```typescript
/**
 * Pattern Library Evolution
 *
 * As Jenny coaches more students, her pattern library strengthens
 */
class PatternLibraryEvolution {
  async augmentGamePlanPattern(
    coach: CoachIntelligence,
    new_student: StudentContext,
    gameplan_result: GamePlanResult
  ): Promise<void> {
    // After Jenny does 20 gameplans, extract common patterns

    if (coach.pattern_library.gameplans_generated === 20) {
      const patterns = this.extractCommonPatterns(
        coach.pattern_library.success_patterns
      );

      // Strengthen the gameplan framework
      patterns.forEach(pattern => {
        coach.gameplan.augmentWithPattern(pattern);
      });
    }
  }

  private extractCommonPatterns(success_patterns: SuccessPattern[]): Pattern[] {
    // Example: After 20 students, Jenny discovers:
    // - Type B students always need community angle
    // - Builder students always need scaling strategy
    // - Non-competitive schools need "stand out easily" framing

    return [];
  }
}
```

### PATTERN 2: VERTICAL SCALING (New Coaches, New Specialties)

```typescript
/**
 * Adding a new specialty coach
 */
class PreMedCoach extends CoachIntelligence {
  constructor() {
    super({
      coach_id: 'premed-specialist',
      specialty: ['premed', 'medicine', 'biology'],
      credibility: ['Harvard Med', 'Clinical research']
    });

    // Register PreMed-specific tools
    this.registerPreMedTools();
  }

  private registerPreMedTools(): void {
    this.registerCustomTool({
      tool_id: 'doctor_shadowing',
      name: 'Doctor Shadowing Strategy',
      execute: async (student) => {
        return {
          targets: 'Local hospitals + family medicine',
          hours_needed: 100,
          documentation: 'Weekly reflection logs'
        };
      }
    });

    this.registerCustomTool({
      tool_id: 'clinical_volunteering',
      name: 'Clinical Volunteering',
      execute: async (student) => {
        return {
          opportunities: ['Hospital volunteering', 'EMT certification'],
          timeline: '6 months minimum'
        };
      }
    });
  }

  // Implement standard frameworks with PreMed context
  assessment = new PreMedAssessmentFramework();  // Adds clinical exposure layer
  gameplan = new PreMedGamePlanFramework();      // Focuses on clinical hours
  execution = new PreMedExecutionFramework();    // Weekly shadowing, MCAT prep
}
```

---

## TOOL SELECTION ALGORITHM

```typescript
/**
 * Dynamic tool selection based on multi-dimensional context
 */
class ToolSelectionEngine {
  selectTools(
    action_type: CoachingActionType,
    student: StudentContext,
    coach: CoachIntelligence,
    situation: SituationContext
  ): CoachingTool[] {
    const selected_tools: CoachingTool[] = [];

    // 1. ALWAYS include standardized framework
    selected_tools.push(this.getStandardizedFramework(action_type, coach));

    // 2. Add context-based custom tools

    // Student archetype
    if (student.psycho_behavioral.personality_type === 'Type_B_collaborative') {
      const community_tool = coach.custom_tools.get('community_impact');
      if (community_tool) selected_tools.push(community_tool);
    }

    // Class year + timing
    if (student.class_year === 'junior' && student.current_week < 20) {
      const quick_wins = coach.custom_tools.get('quick_wins_strategy');
      if (quick_wins) selected_tools.push(quick_wins);
    }

    // Specialty match
    if (student.interests.primary_passions.includes('research')) {
      const research_tools = coach.custom_tools.values().filter(
        tool => tool.applicable_to(student)
      );
      selected_tools.push(...research_tools);
    }

    // Situation-specific
    if (situation.type === 'crisis') {
      const crisis_tool = coach.custom_tools.get('3r_rejection_protocol');
      if (crisis_tool) selected_tools.push(crisis_tool);
    }

    return selected_tools;
  }
}
```

---

## INTEGRATION WITH PROACTIVITY INFRASTRUCTURE

```typescript
/**
 * Wire intelligence layers into autonomous behavior
 */
class IntelligenceProactivityIntegration {
  constructor(
    private coach: CoachIntelligence,
    private scheduler: SchedulerService,
    private notifications: NotificationService,
    private eventBus: EventBus
  ) {}

  async initializeAutonomousBehavior(student: StudentContext): Promise<void> {
    // 1. Schedule weekly execution plans (every Monday 8am)
    this.scheduler.scheduleJob({
      job_type: 'weekly_plan',
      student_id: student.student_id,
      coach_id: this.coach.coach_id,
      scheduled_for: this.getNextMonday8AM(),
      payload: {},
      handler: async () => {
        const weekly_tasks = await this.coach.execution.generateWeeklyTasks(
          student,
          student.current_week
        );

        // Send to student via notification
        await this.notifications.send({
          student_id: student.student_id,
          coach_id: this.coach.coach_id,
          channel: 'email',
          recipient: student.email,
          subject: `Week ${student.current_week} Action Plan`,
          message: this.formatWeeklyPlan(weekly_tasks)
        });
      }
    });

    // 2. Listen for events and respond with intelligence
    this.eventBus.on('student_onboarded', async (data) => {
      // Schedule assessment
      const assessment_time = this.scheduler.scheduleJob({
        job_type: 'assessment',
        student_id: data.student_id,
        coach_id: this.coach.coach_id,
        scheduled_for: new Date(),
        handler: async () => {
          await this.coach.assessment.executeDiagnostic(data.student_context);
        }
      });
    });

    // 3. Proactive nudges based on intelligence
    this.eventBus.on('task_overdue', async (data) => {
      const nudge = await this.generateContextualNudge(
        student,
        'task_overdue',
        data.task
      );

      await this.notifications.send(nudge);
    });
  }

  private async generateContextualNudge(
    student: StudentContext,
    trigger: string,
    context: any
  ): Promise<NotificationRequest> {
    // Use coach intelligence to craft personalized nudge
    const persona = this.coach.personas.find(p => p.name === 'confidence_alchemist');
    const message = await persona.generateMessage(trigger, student, context);

    return {
      student_id: student.student_id,
      coach_id: this.coach.coach_id,
      channel: 'sms',
      recipient: student.phone,
      message
    };
  }
}
```

---

## SUMMARY: GROWTH VECTORS

```
CURRENT STATE:
  1 Coach (Jenny) × 1 Student (Huda) × 31 Intelligence Layers

GROWTH VECTOR 1: DEPTH
  Jenny × 20 Students → Strengthen gameplan/assessment patterns
  - Extract common patterns across student archetypes
  - Refine tool selection algorithms
  - Build success prediction models

GROWTH VECTOR 2: BREADTH
  5 Coaches × 100 Students → Add new specialties
  - Research Coach (PI outreach, publications)
  - PreMed Coach (shadowing, clinical volunteering)
  - Arts Coach (portfolio, auditions)
  - Each adds custom tools to registry

GROWTH VECTOR 3: EVOLUTION
  Coaches augment existing frameworks
  - Jenny adds calendar integration to 168-hour
  - Research coach enhances assessment with curiosity metrics
  - PreMed coach adds clinical exposure tracking

ARCHITECTURE ENABLES:
  ✅ Standardized core (assessment, gameplan, execution)
  ✅ Customizable extensions (coach-specific tools)
  ✅ Context-aware intelligence (student archetype + timing)
  ✅ Pattern evolution (augmentation from experience)
  ✅ Autonomous behavior (proactivity integration)
```

---

**Status:** First-principles architecture designed
**Next Step:** Implement core standardized frameworks (AssessmentFramework, GamePlanFramework, ExecutionFramework)
