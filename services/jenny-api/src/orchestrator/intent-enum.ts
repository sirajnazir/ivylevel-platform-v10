/**
 * Enumeration Intent Classifier
 *
 * Maps natural language queries to deterministic SQL enum routes
 * Handles synonyms for Awards, ECs/Activities, Narrative, Summer Programs
 */

import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('intent-enum');

// Synonym arrays
const AWARD_SYNS = ['award', 'awards', 'honor', 'honors', 'honours', 'prize', 'prizes', 'trophy', 'trophies', 'win', 'wins', 'competition', 'competitions'];
const EC_SYNS = ['ec', 'ecs', 'activity', 'activities', 'extracurricular', 'extracurriculars', 'club', 'clubs'];
const FINAL_SYNS = [
  'final', 'actually won', 'actually got', 'in application', 'submitted list',
  'decisions', 'got into', 'acceptances', 'accepted', 'won', 'win', 'received', 'submitted', 'submit'
];
const INIT_SYNS = ['initial', 'kickoff', 'game plan', 'starting', 'first', 'baseline', 'target', 'targeted', 'targeting', 'planned', 'planning'];
const PROG_SYNS = [
  'progression', 'history', 'timeline', 'evolve', 'evolution', 'how did it change', 'over time', 'changes'
];
const LIST_SYNS = ['list', 'lists', 'show', 'tell me', 'what were', 'what are', 'what was'];

const PROGRAM_SYNS = [
  'summer program', 'summer programs', 'summer camp', 'summer camps',
  'pre-college', 'precollege', 'launchx', 'rsp', 'ssp', 'rsi', 'isef',
  'mites', 'garcia', 'simons', 'tasp', 'telluride', 'seap', 'cosmos',
  'clark scholars', 'program', 'programs', 'camp', 'camps'
];

const ACADEMICS_SYNS = {
  transcript: ['transcript', 'report card', 'grades', 'courses', 'course list', 'subjects', 'semester grades', 'coursework', 'classes'],
  gpa: ['gpa', 'grade point average', 'unweighted gpa', 'weighted gpa', 'cumulative gpa', 'cum gpa', 'term gpa']
};

export type EnumRoute =
  | 'awards.initial'
  | 'awards.final'
  | 'awards.progression'
  | 'ecs.initial'
  | 'ecs.final'
  | 'ecs.progression'
  | 'narrative.initial'
  | 'program.initial'
  | 'program.submitted'
  | 'program.decisions'
  | 'program.progression'
  | 'program.final'  // Final summer programs from submitted ECs
  | 'academics.transcript.initial'
  | 'academics.transcript.final'
  | 'academics.transcript.progression'
  | 'academics.gpa.initial'
  | 'academics.gpa.final'
  | 'academics.gpa.latest'
  | 'academics.gpa.progression'
  | null;

// Check for word boundaries to avoid false matches
function containsWord(s: string, word: string): boolean {
  const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return pattern.test(s);
}

function any(s: string, arr: string[]): boolean {
  // For multi-word phrases, use direct includes
  // For single words, use word boundary check
  return arr.some(w => {
    if (w.includes(' ')) return s.includes(w);
    return containsWord(s, w);
  });
}

/**
 * Classify enumeration intent from natural language query
 * Returns null if not an enumeration query
 */
export function classifyEnumIntent(q: string): EnumRoute {
  const s = q.toLowerCase();

  log.event('intent_classify_start', { query_preview: q.slice(0, 100) });

  // Programs first (to avoid EC catch on "camp")
  if (any(s, PROGRAM_SYNS)) {
    // "final summer programs" or "which programs did I get in?" → program.final (filter submitted ECs by subtype)
    if (any(s, FINAL_SYNS) || s.includes('submit') || s.includes('got in') ||
        s.includes('get in') || s.includes('get into')) {
      log.event('intent_classified', { route: 'program.final', query: q.slice(0, 80) });
      return 'program.final';
    }
    // "which programs accepted me?" or "program decisions" → program.decisions
    if (s.includes('decision') || s.includes('accepted') || s.includes('got into')) {
      log.event('intent_classified', { route: 'program.decisions', query: q.slice(0, 80) });
      return 'program.decisions';
    }
    if (s.includes('applied')) {
      log.event('intent_classified', { route: 'program.submitted', query: q.slice(0, 80) });
      return 'program.submitted';
    }
    if (any(s, INIT_SYNS)) {
      log.event('intent_classified', { route: 'program.initial', query: q.slice(0, 80) });
      return 'program.initial';
    }
    if (any(s, PROG_SYNS)) {
      log.event('intent_classified', { route: 'program.progression', query: q.slice(0, 80) });
      return 'program.progression';
    }
    // Default to initial for "summer programs list"
    log.event('intent_classified', { route: 'program.initial', query: q.slice(0, 80) });
    return 'program.initial';
  }

  // Awards
  if (any(s, AWARD_SYNS)) {
    // "which awards did I actually win?" → final
    if ((s.includes('actually') || s.includes('which')) && (s.includes('win') || s.includes('won'))) {
      log.event('intent_classified', { route: 'awards.final', query: q.slice(0, 80) });
      return 'awards.final';
    }
    if (any(s, FINAL_SYNS)) {
      log.event('intent_classified', { route: 'awards.final', query: q.slice(0, 80) });
      return 'awards.final';
    }
    if (any(s, INIT_SYNS)) {
      log.event('intent_classified', { route: 'awards.initial', query: q.slice(0, 80) });
      return 'awards.initial';
    }
    if (any(s, PROG_SYNS)) {
      log.event('intent_classified', { route: 'awards.progression', query: q.slice(0, 80) });
      return 'awards.progression';
    }
    // Default for "awards list" / "my awards" → initial (most common query)
    if (any(s, LIST_SYNS)) {
      log.event('intent_classified', { route: 'awards.initial', query: q.slice(0, 80) });
      return 'awards.initial';
    }
    log.event('intent_classified', { route: 'awards.initial', query: q.slice(0, 80) });
    return 'awards.initial';
  }

  // ECs / Activities
  if (any(s, EC_SYNS)) {
    // "which ECs did I actually win/submit/get?" → final
    if ((s.includes('actually') || s.includes('which')) && any(s, FINAL_SYNS)) {
      log.event('intent_classified', { route: 'ecs.final', query: q.slice(0, 80) });
      return 'ecs.final';
    }
    if (any(s, FINAL_SYNS)) {
      log.event('intent_classified', { route: 'ecs.final', query: q.slice(0, 80) });
      return 'ecs.final';
    }
    if (any(s, INIT_SYNS)) {
      log.event('intent_classified', { route: 'ecs.initial', query: q.slice(0, 80) });
      return 'ecs.initial';
    }
    if (any(s, PROG_SYNS)) {
      log.event('intent_classified', { route: 'ecs.progression', query: q.slice(0, 80) });
      return 'ecs.progression';
    }
    // Default for "activities list" / "my ECs" → initial (most common query)
    if (any(s, LIST_SYNS)) {
      log.event('intent_classified', { route: 'ecs.initial', query: q.slice(0, 80) });
      return 'ecs.initial';
    }
    log.event('intent_classified', { route: 'ecs.initial', query: q.slice(0, 80) });
    return 'ecs.initial';
  }

  // Narrative
  if (s.includes('narrative')) {
    if (any(s, INIT_SYNS)) {
      log.event('intent_classified', { route: 'narrative.initial', query: q.slice(0, 80) });
      return 'narrative.initial';
    }
  }

  // Academics - Transcript
  if (any(s, ACADEMICS_SYNS.transcript)) {
    if (any(s, FINAL_SYNS)) {
      log.event('intent_classified', { route: 'academics.transcript.final', query: q.slice(0, 80) });
      return 'academics.transcript.final';
    }
    if (any(s, INIT_SYNS)) {
      log.event('intent_classified', { route: 'academics.transcript.initial', query: q.slice(0, 80) });
      return 'academics.transcript.initial';
    }
    if (any(s, PROG_SYNS)) {
      log.event('intent_classified', { route: 'academics.transcript.progression', query: q.slice(0, 80) });
      return 'academics.transcript.progression';
    }
    // Default to final for "show me transcript"
    log.event('intent_classified', { route: 'academics.transcript.final', query: q.slice(0, 80) });
    return 'academics.transcript.final';
  }

  // Academics - GPA
  if (any(s, ACADEMICS_SYNS.gpa)) {
    // "latest GPA" → gpa.latest (most recent snapshot across all scopes)
    if (s.includes('latest') || s.includes('current') || s.includes('most recent')) {
      log.event('intent_classified', { route: 'academics.gpa.latest', query: q.slice(0, 80) });
      return 'academics.gpa.latest';
    }
    if (any(s, FINAL_SYNS)) {
      log.event('intent_classified', { route: 'academics.gpa.final', query: q.slice(0, 80) });
      return 'academics.gpa.final';
    }
    if (any(s, INIT_SYNS)) {
      log.event('intent_classified', { route: 'academics.gpa.initial', query: q.slice(0, 80) });
      return 'academics.gpa.initial';
    }
    if (any(s, PROG_SYNS)) {
      log.event('intent_classified', { route: 'academics.gpa.progression', query: q.slice(0, 80) });
      return 'academics.gpa.progression';
    }
    // Default to latest for "what's my GPA?"
    log.event('intent_classified', { route: 'academics.gpa.latest', query: q.slice(0, 80) });
    return 'academics.gpa.latest';
  }

  log.event('intent_not_enumeration', { query: q.slice(0, 80) });
  return null;
}

/**
 * Quick check if message might be an enumeration query
 * (used for early routing before full classification)
 */
export function isEnumerationQuery(message: string): boolean {
  const m = message.toLowerCase();

  if (any(m, PROGRAM_SYNS)) return true;
  if (any(m, AWARD_SYNS)) return true;
  if (any(m, EC_SYNS)) return true;
  if (m.includes('narrative')) return true;
  if (any(m, ACADEMICS_SYNS.transcript)) return true;
  if (any(m, ACADEMICS_SYNS.gpa)) return true;

  return false;
}
