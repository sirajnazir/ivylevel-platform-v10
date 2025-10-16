/**
 * Real prompts from Huda for testing v13.0 pipeline
 * Organized by category and complexity
 */

export interface TestPrompt {
  id: string;
  category: 'factual' | 'strategic' | 'emotional' | 'hybrid' | 'complex';
  prompt: string;
  description: string;
  expected_cats: string[];
  tags: string[];
}

export const HUDA_PROMPTS: TestPrompt[] = [
  // ============================================================================
  // FACTUAL QUERIES (CAT-1 only)
  // ============================================================================
  {
    id: 'fact-001',
    category: 'factual',
    prompt: "What's my GPA?",
    description: "Simple GPA lookup",
    expected_cats: ['CAT-1'],
    tags: ['academics', 'gpa', 'quick']
  },
  {
    id: 'fact-002',
    category: 'factual',
    prompt: "What awards have I won?",
    description: "Awards list",
    expected_cats: ['CAT-1'],
    tags: ['awards', 'achievements', 'quick']
  },
  {
    id: 'fact-003',
    category: 'factual',
    prompt: "Show me my extracurricular activities",
    description: "EC list",
    expected_cats: ['CAT-1'],
    tags: ['extracurriculars', 'activities', 'quick']
  },
  {
    id: 'fact-004',
    category: 'factual',
    prompt: "What summer programs did I attend?",
    description: "Programs list",
    expected_cats: ['CAT-1'],
    tags: ['programs', 'summer', 'quick']
  },
  {
    id: 'fact-005',
    category: 'factual',
    prompt: "When is Stanford's application deadline?",
    description: "Deadline lookup",
    expected_cats: ['CAT-1'],
    tags: ['deadlines', 'stanford', 'quick']
  },
  {
    id: 'fact-006',
    category: 'factual',
    prompt: "What's my SAT score?",
    description: "Test score lookup",
    expected_cats: ['CAT-1'],
    tags: ['testing', 'sat', 'quick']
  },
  {
    id: 'fact-007',
    category: 'factual',
    prompt: "Show me my transcript",
    description: "Full transcript request",
    expected_cats: ['CAT-1'],
    tags: ['academics', 'transcript', 'detailed']
  },
  {
    id: 'fact-008',
    category: 'factual',
    prompt: "Which colleges have I applied to?",
    description: "Application status",
    expected_cats: ['CAT-1'],
    tags: ['colleges', 'applications', 'quick']
  },

  // ============================================================================
  // STRATEGIC QUERIES (CAT-2 only)
  // ============================================================================
  {
    id: 'strat-001',
    category: 'strategic',
    prompt: "Should I apply to Stanford?",
    description: "College fit decision",
    expected_cats: ['CAT-2'],
    tags: ['college-fit', 'stanford', 'decision']
  },
  {
    id: 'strat-002',
    category: 'strategic',
    prompt: "How can I strengthen my spike in computer science?",
    description: "Spike development strategy",
    expected_cats: ['CAT-2'],
    tags: ['spike', 'computer-science', 'strategy']
  },
  {
    id: 'strat-003',
    category: 'strategic',
    prompt: "What should I write my Common App essay about?",
    description: "Essay topic ideation",
    expected_cats: ['CAT-2'],
    tags: ['essay', 'common-app', 'writing']
  },
  {
    id: 'strat-004',
    category: 'strategic',
    prompt: "How do I balance my college list between reach, target, and safety schools?",
    description: "School list strategy",
    expected_cats: ['CAT-2'],
    tags: ['school-list', 'reach-target-safety', 'strategy']
  },
  {
    id: 'strat-005',
    category: 'strategic',
    prompt: "Should I apply Early Decision to MIT or Regular Decision?",
    description: "Application timing strategy",
    expected_cats: ['CAT-2'],
    tags: ['mit', 'early-decision', 'timing']
  },
  {
    id: 'strat-006',
    category: 'strategic',
    prompt: "What's the difference between Stanford and MIT for computer science?",
    description: "College comparison",
    expected_cats: ['CAT-2'],
    tags: ['stanford', 'mit', 'comparison', 'computer-science']
  },
  {
    id: 'strat-007',
    category: 'strategic',
    prompt: "How can I make my extracurriculars stand out more?",
    description: "EC differentiation strategy",
    expected_cats: ['CAT-2'],
    tags: ['extracurriculars', 'differentiation', 'strategy']
  },
  {
    id: 'strat-008',
    category: 'strategic',
    prompt: "What should I prioritize in the next 3 months?",
    description: "Timeline and priority planning",
    expected_cats: ['CAT-2'],
    tags: ['timeline', 'priorities', 'planning']
  },

  // ============================================================================
  // EMOTIONAL QUERIES (CAT-3 only)
  // ============================================================================
  {
    id: 'emot-001',
    category: 'emotional',
    prompt: "I'm feeling really stressed about college applications",
    description: "General stress expression",
    expected_cats: ['CAT-3'],
    tags: ['stress', 'anxiety', 'support']
  },
  {
    id: 'emot-002',
    category: 'emotional',
    prompt: "I'm worried I won't get into any good schools",
    description: "Fear of rejection",
    expected_cats: ['CAT-3'],
    tags: ['fear', 'rejection', 'worry']
  },
  {
    id: 'emot-003',
    category: 'emotional',
    prompt: "I don't think I'm good enough for MIT",
    description: "Imposter syndrome",
    expected_cats: ['CAT-3'],
    tags: ['imposter-syndrome', 'mit', 'self-doubt']
  },
  {
    id: 'emot-004',
    category: 'emotional',
    prompt: "I'm so overwhelmed with everything I need to do",
    description: "Overwhelm expression",
    expected_cats: ['CAT-3'],
    tags: ['overwhelm', 'stress', 'support']
  },
  {
    id: 'emot-005',
    category: 'emotional',
    prompt: "I just got rejected from Stanford and I'm devastated",
    description: "Post-rejection grief",
    expected_cats: ['CAT-3'],
    tags: ['rejection', 'grief', 'stanford', 'support']
  },
  {
    id: 'emot-006',
    category: 'emotional',
    prompt: "I'm excited but also terrified about college decisions coming out",
    description: "Mixed emotions about decisions",
    expected_cats: ['CAT-3'],
    tags: ['excitement', 'fear', 'decisions', 'support']
  },
  {
    id: 'emot-007',
    category: 'emotional',
    prompt: "Everyone else seems to have everything figured out and I feel behind",
    description: "Comparison anxiety",
    expected_cats: ['CAT-3'],
    tags: ['comparison', 'anxiety', 'support']
  },
  {
    id: 'emot-008',
    category: 'emotional',
    prompt: "I can't stop thinking about whether I'll get in",
    description: "Obsessive worry",
    expected_cats: ['CAT-3'],
    tags: ['anxiety', 'worry', 'support']
  },

  // ============================================================================
  // HYBRID QUERIES (2 dimensions)
  // ============================================================================
  {
    id: 'hybrid-001',
    category: 'hybrid',
    prompt: "What's my GPA? I'm worried it's not good enough for MIT",
    description: "Factual + Emotional: GPA with anxiety",
    expected_cats: ['CAT-1', 'CAT-3'],
    tags: ['gpa', 'mit', 'anxiety', 'factual-emotional']
  },
  {
    id: 'hybrid-002',
    category: 'hybrid',
    prompt: "When is the Stanford deadline? I'm so stressed about finishing on time",
    description: "Factual + Emotional: Deadline with stress",
    expected_cats: ['CAT-1', 'CAT-3'],
    tags: ['deadline', 'stanford', 'stress', 'factual-emotional']
  },
  {
    id: 'hybrid-003',
    category: 'hybrid',
    prompt: "What extracurriculars do I have and how can I make them stronger?",
    description: "Factual + Strategic: ECs with improvement strategy",
    expected_cats: ['CAT-1', 'CAT-2'],
    tags: ['extracurriculars', 'strategy', 'factual-strategic']
  },
  {
    id: 'hybrid-004',
    category: 'hybrid',
    prompt: "Show me my awards and tell me if they're competitive enough for Stanford",
    description: "Factual + Strategic: Awards with competitiveness assessment",
    expected_cats: ['CAT-1', 'CAT-2'],
    tags: ['awards', 'stanford', 'competitiveness', 'factual-strategic']
  },
  {
    id: 'hybrid-005',
    category: 'hybrid',
    prompt: "Should I apply to MIT? I'm not sure if I'm ready",
    description: "Strategic + Emotional: College fit with self-doubt",
    expected_cats: ['CAT-2', 'CAT-3'],
    tags: ['mit', 'college-fit', 'self-doubt', 'strategic-emotional']
  },
  {
    id: 'hybrid-006',
    category: 'hybrid',
    prompt: "How can I strengthen my spike? I feel like I'm not doing enough",
    description: "Strategic + Emotional: Spike strategy with inadequacy",
    expected_cats: ['CAT-2', 'CAT-3'],
    tags: ['spike', 'strategy', 'inadequacy', 'strategic-emotional']
  },
  {
    id: 'hybrid-007',
    category: 'hybrid',
    prompt: "What's my transcript like and should I take more AP classes?",
    description: "Factual + Strategic: Transcript with course selection",
    expected_cats: ['CAT-1', 'CAT-2'],
    tags: ['transcript', 'ap-classes', 'strategy', 'factual-strategic']
  },
  {
    id: 'hybrid-008',
    category: 'hybrid',
    prompt: "I need to know my SAT score but I'm afraid to look",
    description: "Factual + Emotional: Test score with fear",
    expected_cats: ['CAT-1', 'CAT-3'],
    tags: ['sat', 'fear', 'testing', 'factual-emotional']
  },

  // ============================================================================
  // COMPLEX QUERIES (3 dimensions)
  // ============================================================================
  {
    id: 'complex-001',
    category: 'complex',
    prompt: "What's my GPA and transcript? Should I apply to MIT? I'm so overwhelmed!",
    description: "All three: Academics + College fit + Overwhelm",
    expected_cats: ['CAT-1', 'CAT-2', 'CAT-3'],
    tags: ['gpa', 'transcript', 'mit', 'overwhelm', 'all-dimensions']
  },
  {
    id: 'complex-002',
    category: 'complex',
    prompt: "Show me my awards, tell me if they're good enough for Stanford, and help me feel less anxious about it",
    description: "All three: Awards + Strategy + Anxiety",
    expected_cats: ['CAT-1', 'CAT-2', 'CAT-3'],
    tags: ['awards', 'stanford', 'anxiety', 'all-dimensions']
  },
  {
    id: 'complex-003',
    category: 'complex',
    prompt: "When are my deadlines? What should I prioritize? I'm feeling really stressed",
    description: "All three: Deadlines + Planning + Stress",
    expected_cats: ['CAT-1', 'CAT-2', 'CAT-3'],
    tags: ['deadlines', 'planning', 'stress', 'all-dimensions']
  },
  {
    id: 'complex-004',
    category: 'complex',
    prompt: "What extracurriculars do I have? How can I strengthen my spike? I feel like everyone else is ahead of me",
    description: "All three: ECs + Spike strategy + Comparison anxiety",
    expected_cats: ['CAT-1', 'CAT-2', 'CAT-3'],
    tags: ['extracurriculars', 'spike', 'comparison', 'all-dimensions']
  },
  {
    id: 'complex-005',
    category: 'complex',
    prompt: "Help me understand my entire profile - academics, activities, fit for MIT - and reassure me I'm on the right track",
    description: "All three: Full profile review + Strategy + Reassurance",
    expected_cats: ['CAT-1', 'CAT-2', 'CAT-3'],
    tags: ['profile', 'mit', 'reassurance', 'all-dimensions']
  },
  {
    id: 'complex-006',
    category: 'complex',
    prompt: "What schools have I applied to? Which ones should I focus on? I'm worried I made bad choices",
    description: "All three: Applications + Strategy + Regret",
    expected_cats: ['CAT-1', 'CAT-2', 'CAT-3'],
    tags: ['applications', 'strategy', 'regret', 'all-dimensions']
  },

  // ============================================================================
  // EDGE CASES & SPECIAL SCENARIOS
  // ============================================================================
  {
    id: 'edge-001',
    category: 'factual',
    prompt: "Compare my GPA across all semesters",
    description: "GPA progression analysis",
    expected_cats: ['CAT-1'],
    tags: ['gpa', 'progression', 'analysis']
  },
  {
    id: 'edge-002',
    category: 'strategic',
    prompt: "What's the best way to explain my B in AP Calculus in my application?",
    description: "Challenge explanation strategy",
    expected_cats: ['CAT-2'],
    tags: ['grades', 'explanation', 'strategy']
  },
  {
    id: 'edge-003',
    category: 'emotional',
    prompt: "I just got into my dream school and I can't believe it!",
    description: "Celebration and excitement",
    expected_cats: ['CAT-3'],
    tags: ['celebration', 'excitement', 'acceptance']
  },
  {
    id: 'edge-004',
    category: 'hybrid',
    prompt: "I didn't do well on my SAT retake. What are my options now and how do I move forward?",
    description: "Setback processing + Strategy",
    expected_cats: ['CAT-1', 'CAT-2', 'CAT-3'],
    tags: ['sat', 'setback', 'strategy', 'recovery']
  },
  {
    id: 'edge-005',
    category: 'complex',
    prompt: "Walk me through my entire college application journey - where I started, where I am now, what's next, and help me feel confident about it",
    description: "Comprehensive journey review",
    expected_cats: ['CAT-1', 'CAT-2', 'CAT-3'],
    tags: ['journey', 'comprehensive', 'confidence', 'all-dimensions']
  },

  // ============================================================================
  // CONVERSATIONAL & FOLLOW-UP
  // ============================================================================
  {
    id: 'conv-001',
    category: 'strategic',
    prompt: "Actually, can you help me think through whether Stanford or MIT is a better fit for me?",
    description: "Follow-up college comparison",
    expected_cats: ['CAT-2'],
    tags: ['stanford', 'mit', 'comparison', 'follow-up']
  },
  {
    id: 'conv-002',
    category: 'emotional',
    prompt: "Thanks for that. I'm feeling a bit better now",
    description: "Acknowledgment and emotional progress",
    expected_cats: ['CAT-3'],
    tags: ['acknowledgment', 'gratitude', 'progress']
  },
  {
    id: 'conv-003',
    category: 'hybrid',
    prompt: "Okay, so based on my profile, what are my realistic chances at MIT?",
    description: "Chances assessment with implicit profile reference",
    expected_cats: ['CAT-1', 'CAT-2'],
    tags: ['chances', 'mit', 'assessment', 'follow-up']
  },
  {
    id: 'conv-004',
    category: 'factual',
    prompt: "Remind me what my SAT score was again?",
    description: "Memory recall request",
    expected_cats: ['CAT-1'],
    tags: ['sat', 'recall', 'quick']
  }
];

// Organize prompts by category for easy filtering
export const PROMPTS_BY_CATEGORY = {
  factual: HUDA_PROMPTS.filter(p => p.category === 'factual'),
  strategic: HUDA_PROMPTS.filter(p => p.category === 'strategic'),
  emotional: HUDA_PROMPTS.filter(p => p.category === 'emotional'),
  hybrid: HUDA_PROMPTS.filter(p => p.category === 'hybrid'),
  complex: HUDA_PROMPTS.filter(p => p.category === 'complex')
};

// Preset test suites
export const TEST_SUITES = {
  'quick-smoke': {
    name: 'Quick Smoke Test',
    description: '5 quick tests across all dimensions',
    prompts: ['fact-001', 'strat-001', 'emot-001', 'hybrid-001', 'complex-001']
  },
  'factual-deep': {
    name: 'Factual Deep Dive',
    description: 'All factual queries',
    prompts: PROMPTS_BY_CATEGORY.factual.map(p => p.id)
  },
  'strategic-deep': {
    name: 'Strategic Deep Dive',
    description: 'All strategic queries',
    prompts: PROMPTS_BY_CATEGORY.strategic.map(p => p.id)
  },
  'emotional-deep': {
    name: 'Emotional Deep Dive',
    description: 'All emotional queries',
    prompts: PROMPTS_BY_CATEGORY.emotional.map(p => p.id)
  },
  'hybrid-suite': {
    name: 'Hybrid Suite',
    description: 'All 2-dimension queries',
    prompts: PROMPTS_BY_CATEGORY.hybrid.map(p => p.id)
  },
  'complex-suite': {
    name: 'Complex Suite',
    description: 'All 3-dimension queries',
    prompts: PROMPTS_BY_CATEGORY.complex.map(p => p.id)
  },
  'full-regression': {
    name: 'Full Regression Test',
    description: 'All prompts (60+ tests)',
    prompts: HUDA_PROMPTS.map(p => p.id)
  },
  'mit-focus': {
    name: 'MIT-Focused',
    description: 'All MIT-related queries',
    prompts: HUDA_PROMPTS.filter(p => p.tags.includes('mit')).map(p => p.id)
  },
  'stanford-focus': {
    name: 'Stanford-Focused',
    description: 'All Stanford-related queries',
    prompts: HUDA_PROMPTS.filter(p => p.tags.includes('stanford')).map(p => p.id)
  },
  'anxiety-support': {
    name: 'Anxiety & Support',
    description: 'All anxiety/stress queries',
    prompts: HUDA_PROMPTS.filter(p =>
      p.tags.includes('anxiety') ||
      p.tags.includes('stress') ||
      p.tags.includes('worry')
    ).map(p => p.id)
  }
};

export function getPromptById(id: string): TestPrompt | undefined {
  return HUDA_PROMPTS.find(p => p.id === id);
}

export function getPromptsByIds(ids: string[]): TestPrompt[] {
  return ids.map(id => getPromptById(id)).filter(Boolean) as TestPrompt[];
}

export function searchPrompts(searchTerm: string): TestPrompt[] {
  const term = searchTerm.toLowerCase();
  return HUDA_PROMPTS.filter(p =>
    p.prompt.toLowerCase().includes(term) ||
    p.description.toLowerCase().includes(term) ||
    p.tags.some(tag => tag.includes(term))
  );
}
