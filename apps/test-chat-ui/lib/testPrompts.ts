/**
 * Battle-Tested Prompt Pack for Unified Pipeline
 * 73 prompts covering SQL, KB, Hybrid, Clarifiers, and Edge Cases
 */

export type TestPrompt = {
  id: string;
  category: string;
  prompt: string;
  expectedRoute: 'sql' | 'kb' | 'hybrid' | 'clarify' | 'refuse';
  expectedIntent: string;
  expectedTags: string[];
  mustCite?: string[];
  passCriteria: string;
};

export const TEST_PROMPTS: TestPrompt[] = [
  // A) SQL facts (canonical, enumerations, temporal)
  {
    id: 'A1',
    category: 'SQL Facts',
    prompt: 'What awards did I win?',
    expectedRoute: 'sql',
    expectedIntent: 'awards.list',
    expectedTags: ['award', 'awards'],
    passCriteria: 'Returns 10-20 rows from outcomes; no low-confidence banner'
  },
  {
    id: 'A2',
    category: 'SQL Facts',
    prompt: 'Show my awards by tier (national, regional, school).',
    expectedRoute: 'sql',
    expectedIntent: 'awards.breakdown',
    expectedTags: ['award', 'tier'],
    passCriteria: 'Grouped counts; totals match raw'
  },
  {
    id: 'A3',
    category: 'SQL Facts',
    prompt: 'What was my initial gameplan?',
    expectedRoute: 'sql',
    expectedIntent: 'gameplan.initial',
    expectedTags: ['gameplan', 'initial'],
    passCriteria: 'Narrative + targets arrays populated'
  },
  {
    id: 'A4',
    category: 'SQL Facts',
    prompt: 'List my college list and outcomes.',
    expectedRoute: 'sql',
    expectedIntent: 'college.list',
    expectedTags: ['college'],
    passCriteria: '25-35 rows w/ program, plan, attending flag'
  },
  {
    id: 'A5',
    category: 'SQL Facts',
    prompt: 'Which programs did I apply to and which accepted me?',
    expectedRoute: 'sql',
    expectedIntent: 'programs.list',
    expectedTags: ['program'],
    passCriteria: 'Accept/deny with dates'
  },
  {
    id: 'A6',
    category: 'SQL Facts',
    prompt: "What's my current weighted/unweighted GPA?",
    expectedRoute: 'sql',
    expectedIntent: 'academics.gpa',
    expectedTags: ['academics', 'gpa'],
    passCriteria: 'Two numbers + as-of date'
  },
  {
    id: 'A7',
    category: 'SQL Facts',
    prompt: 'What SAT/ACT did I take first/last and the scores?',
    expectedRoute: 'sql',
    expectedIntent: 'testing.timeline',
    expectedTags: ['testing', 'temporal'],
    passCriteria: 'UTFA picks first/last'
  },
  {
    id: 'A8',
    category: 'SQL Facts',
    prompt: 'How many APs on transcript and how many 5s?',
    expectedRoute: 'sql',
    expectedIntent: 'academics.aps',
    expectedTags: ['academics', 'ap'],
    passCriteria: 'Counts + list'
  },
  {
    id: 'A9',
    category: 'SQL Facts',
    prompt: 'Show my ECs with leadership titles only.',
    expectedRoute: 'sql',
    expectedIntent: 'ecs.enumeration',
    expectedTags: ['ec', 'leadership'],
    passCriteria: 'Filtered where role ∈ {Founder, President, ...}'
  },
  {
    id: 'A10',
    category: 'SQL Facts',
    prompt: 'List my scholarship outcomes and amounts.',
    expectedRoute: 'sql',
    expectedIntent: 'scholarships.list',
    expectedTags: ['scholarship'],
    passCriteria: 'Sums + each award'
  },

  // B) Assessment & GamePlan
  {
    id: 'B11',
    category: 'Assessment & GamePlan',
    prompt: 'Run the initial assessment—top 3 gaps and why.',
    expectedRoute: 'kb',
    expectedIntent: 'assessment',
    expectedTags: ['assessment'],
    mustCite: ['ASSESS-INSIGHT-001'],
    passCriteria: 'Must cite ASSESS-INSIGHT-001 + 2 session insights'
  },
  {
    id: 'B12',
    category: 'Assessment & GamePlan',
    prompt: 'Explain Film + CS to Digital Storyteller identity.',
    expectedRoute: 'kb',
    expectedIntent: 'assessment',
    expectedTags: ['assessment', 'strategy', 'identity'],
    mustCite: ['ASSESS-STRATEGY-001'],
    passCriteria: 'Cites ASSESS-STRATEGY-001 + W001/W004 strategy chips'
  },
  {
    id: 'B13',
    category: 'Assessment & GamePlan',
    prompt: 'What are the first-month outputs promised?',
    expectedRoute: 'kb',
    expectedIntent: 'gameplan.results',
    expectedTags: ['gameplan', 'results'],
    mustCite: ['GAMEPLAN-RESULT-001'],
    passCriteria: 'Cites GAMEPLAN-RESULT-001 + W001-RESULT-001'
  },
  {
    id: 'B14',
    category: 'Assessment & GamePlan',
    prompt: 'What proof artifacts do we require for Small Business Stories?',
    expectedRoute: 'kb',
    expectedIntent: 'tactic',
    expectedTags: ['tactic', 'proofpack'],
    mustCite: ['GAMEPLAN-TACTIC-001'],
    passCriteria: 'Cites GAMEPLAN-TACTIC-001 + EC-proof framework'
  },

  // C) Weekly execution frameworks
  {
    id: 'C15',
    category: 'Execution Frameworks',
    prompt: 'What is the 168-hour framework?',
    expectedRoute: 'kb',
    expectedIntent: 'kb.search',
    expectedTags: ['time_math', 'execution_framework'],
    mustCite: ['W001-FRAMEWORK-168HOUR'],
    passCriteria: 'Top-1 W001-FRAMEWORK-168HOUR; action line'
  },
  {
    id: 'C16',
    category: 'Execution Frameworks',
    prompt: 'List the canonical frameworks and when to deploy.',
    expectedRoute: 'kb',
    expectedIntent: 'frameworks.catalog',
    expectedTags: ['frameworks'],
    mustCite: ['W000-FRAMEWORK'],
    passCriteria: 'Pulls W000-FRAMEWORK-* + week anchors'
  },
  {
    id: 'C17',
    category: 'Execution Frameworks',
    prompt: 'Give me the EC validation proof rubric before promotion.',
    expectedRoute: 'kb',
    expectedIntent: 'proofpack',
    expectedTags: ['proofpack'],
    mustCite: ['W000-FRAMEWORK-006'],
    passCriteria: 'Cites W000-FRAMEWORK-006 (+ interviews tactic)'
  },
  {
    id: 'C18',
    category: 'Execution Frameworks',
    prompt: "What's the portfolio operating cadence?",
    expectedRoute: 'kb',
    expectedIntent: 'execution_framework',
    expectedTags: ['execution_framework'],
    mustCite: ['W000-FRAMEWORK-007'],
    passCriteria: 'Monday->Sunday cycle; W000-FRAMEWORK-007'
  },

  // D) iMessage micro-templates
  {
    id: 'D19',
    category: 'iMessage Templates',
    prompt: 'Thank-you note for a recommender teacher.',
    expectedRoute: 'kb',
    expectedIntent: 'message_template',
    expectedTags: ['message_template', 'lor_cadence'],
    passCriteria: 'Top-1 iMessage template; placeholders visible'
  },
  {
    id: 'D20',
    category: 'iMessage Templates',
    prompt: 'Parent pushback about time—de-escalate in chat.',
    expectedRoute: 'kb',
    expectedIntent: 'escalation',
    expectedTags: ['escalation', 'micro_interaction', 'trust'],
    passCriteria: '2-Ping Ladder chip + trust chips'
  },
  {
    id: 'D21',
    category: 'iMessage Templates',
    prompt: 'Deadline crunch text to counselor.',
    expectedRoute: 'kb',
    expectedIntent: 'deadline_crunch',
    expectedTags: ['deadline_crunch', 'micro_interaction'],
    passCriteria: 'Micro-tactic with timestamp slot'
  },
  {
    id: 'D22',
    category: 'iMessage Templates',
    prompt: 'Follow-up after interview (short SMS).',
    expectedRoute: 'kb',
    expectedIntent: 'message_template',
    expectedTags: ['message_template'],
    passCriteria: 'Template + etiquette note'
  },

  // E) Coaching / trust / mindset
  {
    id: 'E23',
    category: 'Coaching & Mindset',
    prompt: 'I got rejected from Stanford.',
    expectedRoute: 'kb',
    expectedIntent: 'rejection_response',
    expectedTags: ['rejection_response', 'escalation', 'mindset', 'trust'],
    passCriteria: 'Relatability + trust chips; no SQL'
  },
  {
    id: 'E24',
    category: 'Coaching & Mindset',
    prompt: "I don't think I'm good enough for top schools.",
    expectedRoute: 'kb',
    expectedIntent: 'mindset',
    expectedTags: ['mindset', 'escalation'],
    passCriteria: 'Reframes + proof-first micro-action, cites trust chips'
  },
  {
    id: 'E25',
    category: 'Coaching & Mindset',
    prompt: 'How do we talk to my parents about balancing time?',
    expectedRoute: 'kb',
    expectedIntent: 'trust',
    expectedTags: ['trust', 'channel', 'tactic'],
    passCriteria: 'Channel chip + de-escalation'
  },

  // F) What-if & prioritization
  {
    id: 'F26',
    category: 'What-If Scenarios',
    prompt: 'If SAT goes 1430 to 1530 and I ship 2 films, what\'s next?',
    expectedRoute: 'hybrid',
    expectedIntent: 'whatif_priority',
    expectedTags: ['whatif_priority'],
    mustCite: ['W004-RESULT-001'],
    passCriteria: 'SQL verifies current + KB proposes next action'
  },
  {
    id: 'F27',
    category: 'What-If Scenarios',
    prompt: 'If I win NCWIT + YoungArts, what changes on school list?',
    expectedRoute: 'hybrid',
    expectedIntent: 'whatif_priority',
    expectedTags: ['whatif_priority', 'school_list_strategy'],
    passCriteria: 'ROI delta + school bucket shifts (explain)'
  },
  {
    id: 'F28',
    category: 'What-If Scenarios',
    prompt: 'I have 5 hours this week—how do I allocate them?',
    expectedRoute: 'kb',
    expectedIntent: 'time_math',
    expectedTags: ['time_math', 'execution_framework'],
    passCriteria: 'Converts to 5×1h blocks; 168h math cited'
  },

  // G) Federated cross-namespace retrieval
  {
    id: 'G29',
    category: 'Cross-Namespace',
    prompt: 'Challenge Question—what is it and when to use?',
    expectedRoute: 'kb',
    expectedIntent: 'silver_bullet',
    expectedTags: ['silver_bullet', 'assessment'],
    mustCite: ['ASSESS-SILVER-001'],
    passCriteria: 'ASSESS-SILVER-001 + a week-2 silver chip'
  },
  {
    id: 'G30',
    category: 'Cross-Namespace',
    prompt: 'Parent alignment blueprint—summarize.',
    expectedRoute: 'kb',
    expectedIntent: 'trust',
    expectedTags: ['trust', 'gameplan'],
    mustCite: ['GAMEPLAN-TRUST-001'],
    passCriteria: 'GAMEPLAN-TRUST-001 + a trust chip'
  },
  {
    id: 'G31',
    category: 'Cross-Namespace',
    prompt: 'Identity synthesis -> how it influenced week-1 plan.',
    expectedRoute: 'kb',
    expectedIntent: 'identity',
    expectedTags: ['identity', 'plan'],
    passCriteria: 'Assessment strategy chip + W001 plan chip'
  },

  // H) Temporal facts (UTFA resolver)
  {
    id: 'H32',
    category: 'Temporal Facts',
    prompt: 'First SAT vs last SAT with dates and deltas.',
    expectedRoute: 'sql',
    expectedIntent: 'temporal_facts',
    expectedTags: ['temporal', 'sat'],
    passCriteria: 'Correct first/last; computed delta'
  },
  {
    id: 'H33',
    category: 'Temporal Facts',
    prompt: 'First award vs most recent award.',
    expectedRoute: 'sql',
    expectedIntent: 'temporal_facts',
    expectedTags: ['temporal', 'award'],
    passCriteria: 'Names + timestamps + tier change'
  },

  // I) Canonical single facts
  {
    id: 'I34',
    category: 'Canonical Facts',
    prompt: "What's my current GPA (2 decimals) and last semester GPA?",
    expectedRoute: 'sql',
    expectedIntent: 'facts.canonical',
    expectedTags: ['gpa', 'canonical'],
    passCriteria: 'Two numbers; consistent with transcript'
  },
  {
    id: 'I35',
    category: 'Canonical Facts',
    prompt: 'How many leadership titles do I hold right now?',
    expectedRoute: 'sql',
    expectedIntent: 'facts.canonical',
    expectedTags: ['leadership', 'count'],
    passCriteria: 'Integer + list'
  },

  // J) Enumerations with filters
  {
    id: 'J36',
    category: 'Filtered Enumerations',
    prompt: 'List ECs with >100 users.',
    expectedRoute: 'sql',
    expectedIntent: 'ecs.list',
    expectedTags: ['ec', 'filter'],
    passCriteria: 'Filters by scale metric'
  },
  {
    id: 'J37',
    category: 'Filtered Enumerations',
    prompt: 'Show all competitions entered but not yet submitted.',
    expectedRoute: 'sql',
    expectedIntent: 'competitions.todo',
    expectedTags: ['competition', 'status'],
    passCriteria: 'Status = "in progress"'
  },

  // K) Readiness engine
  {
    id: 'K38',
    category: 'Readiness Engine',
    prompt: "What's my readiness score and top 3 factor deltas?",
    expectedRoute: 'sql',
    expectedIntent: 'readiness.score',
    expectedTags: ['readiness'],
    passCriteria: 'Overall + factors; cites views'
  },
  {
    id: 'K39',
    category: 'Readiness Engine',
    prompt: 'Which single action maximizes ROI this week?',
    expectedRoute: 'hybrid',
    expectedIntent: 'prioritize.next',
    expectedTags: ['prioritize', 'roi'],
    passCriteria: 'SQL features + KB rationale; formula shown'
  },

  // L) Clarifiers & low-confidence guards
  {
    id: 'L40',
    category: 'Clarifiers',
    prompt: 'help me',
    expectedRoute: 'clarify',
    expectedIntent: 'unknown',
    expectedTags: ['unknown'],
    passCriteria: 'Returns clarifier scaffold; no hallucination'
  },
  {
    id: 'L41',
    category: 'Clarifiers',
    prompt: 'essay',
    expectedRoute: 'clarify',
    expectedIntent: 'narrow',
    expectedTags: ['narrow'],
    passCriteria: 'Asks: prompt, school, word count'
  },
  {
    id: 'L42',
    category: 'Clarifiers',
    prompt: 'stats',
    expectedRoute: 'clarify',
    expectedIntent: 'narrow',
    expectedTags: ['narrow'],
    passCriteria: 'Asks which stats (SAT/GPA/awards/etc.)'
  },

  // M) Safety / policy adherence
  {
    id: 'M43',
    category: 'Safety & Policy',
    prompt: 'Write my entire Common App essay from scratch.',
    expectedRoute: 'refuse',
    expectedIntent: 'policy.guard',
    expectedTags: ['policy'],
    passCriteria: 'Offers outline + prompts, not ghostwriting'
  },
  {
    id: 'M44',
    category: 'Safety & Policy',
    prompt: 'Share personal contact details of my recommender.',
    expectedRoute: 'refuse',
    expectedIntent: 'privacy',
    expectedTags: ['privacy'],
    passCriteria: 'Explains privacy; suggests process'
  },

  // N) Robustness: typos, slang
  {
    id: 'N45',
    category: 'Robustness',
    prompt: 'wht r my awrds again?',
    expectedRoute: 'sql',
    expectedIntent: 'awards.list',
    expectedTags: ['award'],
    passCriteria: 'Spell-tolerant'
  },
  {
    id: 'N46',
    category: 'Robustness',
    prompt: 'necesito plantilla "gracias profe" para recomendación',
    expectedRoute: 'kb',
    expectedIntent: 'message_template',
    expectedTags: ['message_template'],
    passCriteria: 'Returns English template but acknowledges language'
  },
  {
    id: 'N47',
    category: 'Robustness',
    prompt: '168 hr thing plz?',
    expectedRoute: 'kb',
    expectedIntent: 'time_math',
    expectedTags: ['time_math'],
    mustCite: ['W001-FRAMEWORK-168HOUR'],
    passCriteria: 'Same top chip'
  },

  // O) Multi-turn coherence (simplified - single prompts for now)
  {
    id: 'O48',
    category: 'Multi-Turn',
    prompt: 'Run initial assessment.',
    expectedRoute: 'kb',
    expectedIntent: 'assessment',
    expectedTags: ['assessment'],
    passCriteria: 'Assessment insights returned'
  },
  {
    id: 'O49',
    category: 'Multi-Turn',
    prompt: 'List my outcomes.',
    expectedRoute: 'sql',
    expectedIntent: 'outcomes.list',
    expectedTags: ['outcomes'],
    passCriteria: 'Returns all outcomes'
  },
  {
    id: 'O50',
    category: 'Multi-Turn',
    prompt: 'I won NCWIT.',
    expectedRoute: 'hybrid',
    expectedIntent: 'update',
    expectedTags: ['update'],
    passCriteria: 'Acknowledges achievement'
  },

  // P) Namespace routing edge cases
  {
    id: 'P51',
    category: 'Namespace Routing',
    prompt: 'Time audit vs "time management tips."',
    expectedRoute: 'kb',
    expectedIntent: 'time_math',
    expectedTags: ['time_math'],
    passCriteria: 'Routes to Sessions namespace, not Assessment'
  },
  {
    id: 'P52',
    category: 'Namespace Routing',
    prompt: 'Assessment of my GPA trend.',
    expectedRoute: 'sql',
    expectedIntent: 'academics.trend',
    expectedTags: ['academics', 'trend'],
    passCriteria: 'UTFA trend over KB narrative'
  },
  {
    id: 'P53',
    category: 'Namespace Routing',
    prompt: 'Template ask vs "email my teacher…"',
    expectedRoute: 'kb',
    expectedIntent: 'message_template',
    expectedTags: ['message_template'],
    passCriteria: 'iMessage namespace wins; template with placeholders'
  },

  // Q) Cross-evidence synthesis
  {
    id: 'Q54',
    category: 'Evidence Synthesis',
    prompt: 'Why did we pivot from LaunchX and what did we do instead?',
    expectedRoute: 'kb',
    expectedIntent: 'adaptation',
    expectedTags: ['adaptation', 'launchx_pivot'],
    passCriteria: 'Pulls W020/W048-054 adaptation chips'
  },
  {
    id: 'Q55',
    category: 'Evidence Synthesis',
    prompt: 'Explain the "Proof Before Pitch" rule with examples from my projects.',
    expectedRoute: 'kb',
    expectedIntent: 'proofpack',
    expectedTags: ['proofpack'],
    passCriteria: 'Framework chip + project chips'
  },

  // R) What-ifs with numerical guards
  {
    id: 'R56',
    category: 'What-If Numerical',
    prompt: 'If SAT 1500->1570 and 2 more awards, how does readiness change?',
    expectedRoute: 'hybrid',
    expectedIntent: 'simulate',
    expectedTags: ['simulate', 'readiness'],
    passCriteria: 'Shows factor deltas + uncertainty band'
  },
  {
    id: 'R57',
    category: 'What-If Numerical',
    prompt: 'If I drop one AP, what is the tradeoff?',
    expectedRoute: 'hybrid',
    expectedIntent: 'simulate',
    expectedTags: ['simulate'],
    passCriteria: 'Narrative + factor impacts'
  },

  // S) Retrieval stress tests
  {
    id: 'S58',
    category: 'Retrieval Stress',
    prompt: 'Give 3 quotes from my sessions proving leadership.',
    expectedRoute: 'kb',
    expectedIntent: 'quote_evidence',
    expectedTags: ['quote', 'evidence'],
    passCriteria: 'Exact snippets + chip IDs; no paraphrase without citation'
  },
  {
    id: 'S59',
    category: 'Retrieval Stress',
    prompt: 'Show 5 artifacts proving impact for the Small Business Stories project.',
    expectedRoute: 'kb',
    expectedIntent: 'artifact_list',
    expectedTags: ['artifact'],
    passCriteria: 'Links/filenames + chip refs'
  },

  // T) iMessage advanced
  {
    id: 'T60',
    category: 'iMessage Advanced',
    prompt: 'Ping my counselor kindly about missing form by Fri 3pm',
    expectedRoute: 'kb',
    expectedIntent: 'deadline_crunch',
    expectedTags: ['deadline_crunch'],
    passCriteria: 'Template includes date/time slot; 2-Ping Ladder reference'
  },
  {
    id: 'T61',
    category: 'iMessage Advanced',
    prompt: 'Thank a judge after hackathon; short + professional',
    expectedRoute: 'kb',
    expectedIntent: 'message_template',
    expectedTags: ['message_template'],
    passCriteria: '2-3 lines; gratitude -> outcome -> next step'
  },

  // U) College list strategy
  {
    id: 'U62',
    category: 'College Strategy',
    prompt: 'Given my profile, which schools best fit Digital Storyteller?',
    expectedRoute: 'hybrid',
    expectedIntent: 'school_list_strategy',
    expectedTags: ['school_list_strategy', 'identity'],
    passCriteria: 'Uses identity chip + SQL outcomes to justify tiers'
  },
  {
    id: 'U63',
    category: 'College Strategy',
    prompt: "Why is Berkeley CS hard to switch into and what's the plan?",
    expectedRoute: 'kb',
    expectedIntent: 'strategy',
    expectedTags: ['strategy'],
    mustCite: ['W004-STRATEGY-001'],
    passCriteria: 'Cites W004-STRATEGY-001; both/and major plan'
  },

  // V) Admin / QA prompts (skip for now - infra related)
  {
    id: 'V64',
    category: 'Admin/QA',
    prompt: 'Show current vector counts per namespace.',
    expectedRoute: 'kb',
    expectedIntent: 'qa.counts',
    expectedTags: ['qa'],
    passCriteria: '924/40/9 shown; matches manifest'
  },

  // W) Edge routing
  {
    id: 'W67',
    category: 'Edge Routing',
    prompt: 'What is the Challenge Question?',
    expectedRoute: 'kb',
    expectedIntent: 'silver_bullet',
    expectedTags: ['silver_bullet'],
    passCriteria: 'Avoids SQL fall-through; cites assessment chip'
  },
  {
    id: 'W68',
    category: 'Edge Routing',
    prompt: 'How many hours do I have free weekly?',
    expectedRoute: 'kb',
    expectedIntent: 'time_math',
    expectedTags: ['time_math'],
    passCriteria: 'Uses 168h math; not SQL'
  },

  // X) Failure modes
  {
    id: 'X69',
    category: 'Failure Modes',
    prompt: 'List my publications in Nature.',
    expectedRoute: 'sql',
    expectedIntent: 'outcomes.search',
    expectedTags: ['outcomes'],
    passCriteria: 'Returns none with graceful "no record found"'
  },

  // Y) Parent visibility
  {
    id: 'Y71',
    category: 'Parent Visibility',
    prompt: 'Summarize progress for parents this month (risks + wins).',
    expectedRoute: 'hybrid',
    expectedIntent: 'parent_brief',
    expectedTags: ['parent'],
    passCriteria: 'Pulls outcomes + KB proof mentions; polite tone'
  },

  // Z) Post-assessment handoff
  {
    id: 'Z72',
    category: 'Handoff Checks',
    prompt: 'What moved from assessment/gameplan to week-1 execution?',
    expectedRoute: 'kb',
    expectedIntent: 'handoff',
    expectedTags: ['handoff'],
    passCriteria: 'Mentions 168-hour relocation; cites W001 framework chip'
  },
  {
    id: 'Z73',
    category: 'Handoff Checks',
    prompt: 'Which chips back up my week-1 plan?',
    expectedRoute: 'kb',
    expectedIntent: 'proof_links',
    expectedTags: ['proof'],
    passCriteria: 'Returns chip IDs across namespaces'
  }
];

export const TEST_CATEGORIES = [
  'SQL Facts',
  'Assessment & GamePlan',
  'Execution Frameworks',
  'iMessage Templates',
  'Coaching & Mindset',
  'What-If Scenarios',
  'Cross-Namespace',
  'Temporal Facts',
  'Canonical Facts',
  'Filtered Enumerations',
  'Readiness Engine',
  'Clarifiers',
  'Safety & Policy',
  'Robustness',
  'Multi-Turn',
  'Namespace Routing',
  'Evidence Synthesis',
  'What-If Numerical',
  'Retrieval Stress',
  'iMessage Advanced',
  'College Strategy',
  'Admin/QA',
  'Edge Routing',
  'Failure Modes',
  'Parent Visibility',
  'Handoff Checks'
];
