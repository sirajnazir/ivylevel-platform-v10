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
  gpa: ['gpa', 'grade point average', 'unweighted gpa', 'weighted gpa', 'cumulative gpa', 'cum gpa', 'term gpa'],
  vitals: ['vitals', 'timeline', 'trend', 'academic trend', 'gpa trend', 'rigor', 'ap count', 'ap rigor', 'course load', 'weekly'],
  events: ['academic events', 'grade jump', 'grade change', 'report cards', 'milestone', 'milestones']
};

// v10.5.9: Testing (SAT/ACT/AP) patterns
const TESTING_SYNS = {
  sat: ['sat', 'sat score', 'sat scores', 'sat test', 'scholastic aptitude test', 'scholastic assessment test'],
  act: ['act', 'act score', 'act scores', 'act test', 'american college testing'],
  ap: ['ap', 'ap score', 'ap scores', 'ap test', 'ap exam', 'advanced placement']
};

// v10.5.2: IvyScore / Readiness patterns
const IVYSCORE_SYNS = ['ivyscore', 'ivy score', 'ivyready', 'ivy ready', 'readiness score', 'readiness', 'chances', 'my score'];
const READINESS_SYNS = ['priorities', 'top priorities', 'weakspots', 'weak spots', 'areas to improve', 'what should i work on'];

// v10.5.2: College List patterns
const COLLEGE_SYNS = ['college list', 'college', 'colleges', 'school list', 'schools', 'university', 'universities'];
const COLLEGE_ATTENDING_SYNS = ['attending', 'going to', 'enrolled', 'matriculating', 'chose', 'decided', 'final choice'];

// v10.5.2: Game Plan patterns
const GAMEPLAN_SYNS = ['game plan', 'gameplan', 'plan', 'strategy', 'roadmap', 'targets', 'goals'];

// v10.6: EC Vitals patterns (metric progression tracking)
const VITALS_SYNS = ['vitals', 'metrics', 'progression', 'growth', 'tracking'];
const FUNDING_SYNS = ['funding', 'raised', 'money', 'grants', 'revenue', 'financial'];
const SCALE_SYNS = ['scale', 'reach', 'students reached', 'members', 'audience', 'participants'];
const IMPACT_SYNS = ['impact', 'media', 'features', 'views', 'recognition', 'social media'];
const LEADERSHIP_SYNS = ['team', 'partnerships', 'leadership', 'team size', 'growth rate'];
const PRODUCT_SYNS = ['product', 'shipped', 'downloads', 'users', 'content'];

// v10.6: JTBD patterns (weekly execution facts)
const JTBD_SYNS = ['week', 'weekly', 'done', 'accomplished', 'completed', 'progress'];
const MILESTONE_SYNS = ['milestone', 'milestones', 'achievement', 'achievements'];

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
  | 'academics.vitals.latest'
  | 'academics.vitals.trend'
  | 'academics.vitals.events'
  | 'testing.sat.first'  // v10.5.9
  | 'testing.sat.latest'  // v10.5.9
  | 'testing.sat.progression'  // v10.5.9
  | 'testing.act.first'  // v10.5.9
  | 'testing.act.latest'  // v10.5.9
  | 'testing.act.progression'  // v10.5.9
  | 'ivyscore.latest'  // v10.5.2
  | 'ivyscore.current'  // v10.5.2
  | 'ivyscore.progression'  // v10.5.2
  | 'readiness.top_priorities'  // v10.5.2
  | 'readiness.weakspots'  // v10.5.2
  | 'college.list'  // v10.5.2
  | 'college.attending'  // v10.5.2
  | 'college.reach'  // v10.5.2
  | 'college.match'  // v10.5.2
  | 'college.safety'  // v10.5.2
  | 'college.early_decision'  // v10.7.1
  | 'college.early_action'  // v10.7.1
  | 'college.restrictive_early'  // v10.7.1
  | 'college.regular_decision'  // v10.7.1
  | 'gameplan.summary_initial'  // v10.5.2
  | 'gameplan.vs_execution'  // v10.5.2
  | 'gameplan.plan_events'  // v10.5.2
  | 'vitals.latest'  // v10.6 - Latest values for all metrics
  | 'vitals.progression'  // v10.6 - Full timeline of all metrics
  | 'vitals.funding.progression'  // v10.6 - Funding raised progression
  | 'vitals.scale.progression'  // v10.6 - Scale metrics progression
  | 'vitals.impact.latest'  // v10.6 - Impact metrics
  | 'vitals.summary'  // v10.6 - Student vitals summary
  | 'jtbd.week'  // v10.6 - Jobs for specific week
  | 'jtbd.completed'  // v10.6 - All completed jobs
  | 'jtbd.pending'  // v10.6 - Pending jobs
  | 'jtbd.milestones'  // v10.6 - EC milestones only
  | 'jtbd.progression'  // v10.6 - Week-over-week progression
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

  // Academics - Vitals (Weekly timeline GPA, AP rigor, course load)
  if (any(s, ACADEMICS_SYNS.vitals)) {
    // "academic trend" or "GPA trend" → vitals.trend
    if (s.includes('trend') || s.includes('range') || s.includes('min') || s.includes('max')) {
      log.event('intent_classified', { route: 'academics.vitals.trend', query: q.slice(0, 80) });
      return 'academics.vitals.trend';
    }
    // Default to latest for "academic vitals"
    log.event('intent_classified', { route: 'academics.vitals.latest', query: q.slice(0, 80) });
    return 'academics.vitals.latest';
  }

  // Academics - Events (Grade jumps, AP additions, report cards)
  if (any(s, ACADEMICS_SYNS.events)) {
    log.event('intent_classified', { route: 'academics.vitals.events', query: q.slice(0, 80) });
    return 'academics.vitals.events';
  }

  // v10.5.9: Testing - SAT
  if (any(s, TESTING_SYNS.sat)) {
    // Check for progression patterns: "improve", "over time", "history", "all scores"
    if (any(s, PROG_SYNS) || s.includes('improve') || s.includes('all') || s.includes('scores')) {
      log.event('intent_classified', { route: 'testing.sat.progression', query: q.slice(0, 80) });
      return 'testing.sat.progression';
    }
    // "latest SAT" or "current SAT" or "most recent SAT"
    if (s.includes('latest') || s.includes('current') || s.includes('most recent') || s.includes('last')) {
      log.event('intent_classified', { route: 'testing.sat.latest', query: q.slice(0, 80) });
      return 'testing.sat.latest';
    }
    // "first SAT" or "initial SAT"
    if (s.includes('first') || any(s, INIT_SYNS)) {
      log.event('intent_classified', { route: 'testing.sat.first', query: q.slice(0, 80) });
      return 'testing.sat.first';
    }
    // Default to latest for "what's my SAT?"
    log.event('intent_classified', { route: 'testing.sat.latest', query: q.slice(0, 80) });
    return 'testing.sat.latest';
  }

  // v10.5.9: Testing - ACT
  if (any(s, TESTING_SYNS.act)) {
    if (any(s, PROG_SYNS) || s.includes('improve') || s.includes('all') || s.includes('scores')) {
      log.event('intent_classified', { route: 'testing.act.progression', query: q.slice(0, 80) });
      return 'testing.act.progression';
    }
    if (s.includes('latest') || s.includes('current') || s.includes('most recent') || s.includes('last')) {
      log.event('intent_classified', { route: 'testing.act.latest', query: q.slice(0, 80) });
      return 'testing.act.latest';
    }
    if (s.includes('first') || any(s, INIT_SYNS)) {
      log.event('intent_classified', { route: 'testing.act.first', query: q.slice(0, 80) });
      return 'testing.act.first';
    }
    log.event('intent_classified', { route: 'testing.act.latest', query: q.slice(0, 80) });
    return 'testing.act.latest';
  }

  // v10.5.3: Enhanced readiness detection (must come BEFORE college detection)
  // "am i ready for top colleges?" should route to readiness, NOT college.list
  if (s.includes('am i ready') || s.includes('ready for')) {
    log.event('intent_classified', { route: 'ivyscore.latest', query: q.slice(0, 80), reason: 'readiness_question' });
    return 'ivyscore.latest';
  }

  // v10.5.2: IvyScore / Readiness
  if (any(s, IVYSCORE_SYNS)) {
    // "latest ivyscore" → ivyscore.latest
    if (s.includes('latest') || s.includes('current') || s.includes('what is') || s.includes("what's")) {
      log.event('intent_classified', { route: 'ivyscore.latest', query: q.slice(0, 80) });
      return 'ivyscore.latest';
    }
    if (any(s, PROG_SYNS)) {
      log.event('intent_classified', { route: 'ivyscore.progression', query: q.slice(0, 80) });
      return 'ivyscore.progression';
    }
    // Default to latest for "my ivyscore"
    log.event('intent_classified', { route: 'ivyscore.latest', query: q.slice(0, 80) });
    return 'ivyscore.latest';
  }

  // v10.5.2: Readiness (priorities, weakspots)
  if (any(s, READINESS_SYNS)) {
    if (s.includes('weak') || s.includes('improve') || s.includes('area')) {
      log.event('intent_classified', { route: 'readiness.weakspots', query: q.slice(0, 80) });
      return 'readiness.weakspots';
    }
    // Default to top priorities
    log.event('intent_classified', { route: 'readiness.top_priorities', query: q.slice(0, 80) });
    return 'readiness.top_priorities';
  }

  // v10.5.2: College List
  if (any(s, COLLEGE_SYNS)) {
    // "which college am I attending?" → college.attending
    if (any(s, COLLEGE_ATTENDING_SYNS)) {
      log.event('intent_classified', { route: 'college.attending', query: q.slice(0, 80) });
      return 'college.attending';
    }
    // "reach colleges" → college.reach
    if (s.includes('reach')) {
      log.event('intent_classified', { route: 'college.reach', query: q.slice(0, 80) });
      return 'college.reach';
    }
    if (s.includes('match')) {
      log.event('intent_classified', { route: 'college.match', query: q.slice(0, 80) });
      return 'college.match';
    }
    if (s.includes('safety')) {
      log.event('intent_classified', { route: 'college.safety', query: q.slice(0, 80) });
      return 'college.safety';
    }
    // Default to full list for "my colleges" / "college list"
    log.event('intent_classified', { route: 'college.list', query: q.slice(0, 80) });
    return 'college.list';
  }

  // v10.5.2: Game Plan
  if (any(s, GAMEPLAN_SYNS)) {
    if (s.includes('execution') || s.includes('vs') || s.includes('compare')) {
      log.event('intent_classified', { route: 'gameplan.vs_execution', query: q.slice(0, 80) });
      return 'gameplan.vs_execution';
    }
    if (s.includes('event') || s.includes('milestone')) {
      log.event('intent_classified', { route: 'gameplan.plan_events', query: q.slice(0, 80) });
      return 'gameplan.plan_events';
    }
    // Default to initial summary for "my game plan"
    log.event('intent_classified', { route: 'gameplan.summary_initial', query: q.slice(0, 80) });
    return 'gameplan.summary_initial';
  }

  // v10.6: EC Vitals (metric progression tracking)
  if (any(s, VITALS_SYNS) || any(s, FUNDING_SYNS) || any(s, SCALE_SYNS) || any(s, IMPACT_SYNS)) {
    // "How much funding have I raised?" → vitals.funding.progression
    if (any(s, FUNDING_SYNS)) {
      if (any(s, PROG_SYNS) || s.includes('progression') || s.includes('over time') || s.includes('timeline')) {
        log.event('intent_classified', { route: 'vitals.funding.progression', query: q.slice(0, 80) });
        return 'vitals.funding.progression';
      }
    }
    // "Show me scale metrics" / "How many students reached?" → vitals.scale.progression
    if (any(s, SCALE_SYNS)) {
      if (any(s, PROG_SYNS) || s.includes('progression') || s.includes('over time') || s.includes('growth')) {
        log.event('intent_classified', { route: 'vitals.scale.progression', query: q.slice(0, 80) });
        return 'vitals.scale.progression';
      }
    }
    // "What's my impact?" / "Media features" → vitals.impact.latest
    if (any(s, IMPACT_SYNS)) {
      log.event('intent_classified', { route: 'vitals.impact.latest', query: q.slice(0, 80) });
      return 'vitals.impact.latest';
    }
    // "Show me all vitals progression" → vitals.progression
    if (any(s, PROG_SYNS) || s.includes('progression') || s.includes('timeline') || s.includes('history')) {
      log.event('intent_classified', { route: 'vitals.progression', query: q.slice(0, 80) });
      return 'vitals.progression';
    }
    // "Summary of vitals" → vitals.summary
    if (s.includes('summary')) {
      log.event('intent_classified', { route: 'vitals.summary', query: q.slice(0, 80) });
      return 'vitals.summary';
    }
    // Default to latest for "my vitals" / "current metrics"
    log.event('intent_classified', { route: 'vitals.latest', query: q.slice(0, 80) });
    return 'vitals.latest';
  }

  // v10.6: JTBD (weekly execution facts)
  if (any(s, JTBD_SYNS) || any(s, MILESTONE_SYNS)) {
    // "What did I accomplish in week 8?" → jtbd.week
    if (s.includes('week') && /week\s+\d+/.test(s)) {
      log.event('intent_classified', { route: 'jtbd.week', query: q.slice(0, 80) });
      return 'jtbd.week';
    }
    // "What's pending?" / "What do I need to do?" → jtbd.pending
    if (s.includes('pending') || s.includes('planned') || s.includes('need to do') || s.includes('todo')) {
      log.event('intent_classified', { route: 'jtbd.pending', query: q.slice(0, 80) });
      return 'jtbd.pending';
    }
    // "My milestones" / "EC achievements" → jtbd.milestones
    if (any(s, MILESTONE_SYNS) || s.includes('achievement')) {
      log.event('intent_classified', { route: 'jtbd.milestones', query: q.slice(0, 80) });
      return 'jtbd.milestones';
    }
    // "Week over week progress" → jtbd.progression
    if (any(s, PROG_SYNS) || s.includes('progression') || s.includes('completion rate')) {
      log.event('intent_classified', { route: 'jtbd.progression', query: q.slice(0, 80) });
      return 'jtbd.progression';
    }
    // Default to completed jobs for "what have I done?" / "my progress"
    log.event('intent_classified', { route: 'jtbd.completed', query: q.slice(0, 80) });
    return 'jtbd.completed';
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
  if (any(m, ACADEMICS_SYNS.vitals)) return true;
  if (any(m, ACADEMICS_SYNS.events)) return true;
  // v10.5.9: Testing (SAT/ACT/AP)
  if (any(m, TESTING_SYNS.sat)) return true;
  if (any(m, TESTING_SYNS.act)) return true;
  if (any(m, TESTING_SYNS.ap)) return true;
  // v10.5.2: IvyScore, College, GamePlan
  if (any(m, IVYSCORE_SYNS)) return true;
  if (any(m, READINESS_SYNS)) return true;
  if (any(m, COLLEGE_SYNS)) return true;
  if (any(m, GAMEPLAN_SYNS)) return true;
  // v10.6: EC Vitals, JTBD
  if (any(m, VITALS_SYNS)) return true;
  if (any(m, FUNDING_SYNS)) return true;
  if (any(m, SCALE_SYNS)) return true;
  if (any(m, IMPACT_SYNS)) return true;
  if (any(m, JTBD_SYNS)) return true;
  if (any(m, MILESTONE_SYNS)) return true;

  return false;
}
