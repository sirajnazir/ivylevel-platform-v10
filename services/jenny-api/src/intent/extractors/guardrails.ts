// UAPX Guardrails v4.6.2c
// Deterministic, entity-agnostic filter extractor + normalizer
// Enhanced attending/decided synonym coverage

export type AnyFilters = Record<string, any>;

type Norm = { value: any; confidence: number };

// canonical mappings / synonyms
const RESULT_SYNS = {
  accepted: ['accepted', 'admitted', 'got in', 'got into', 'admission offer', 'acceptances'],
  rejected: ['rejected', 'denied', 'declined'],
  waitlisted: ['waitlisted', 'on waitlist'],
  deferred: ['deferred', 'postponed'],
  pending: ['pending', 'not decided yet', 'in review']
};

const CATEGORY_SYNS = {
  'Wild Card': ['wild card', 'wildcard'],
  'Reach': ['reach', 'long shot'],
  'Match': ['match', 'target'],
  'Safety': ['safety']
};

const PLAN_SYNS = {
  EA: ['ea', 'early action'],
  ED: ['ed', 'early decision'],
  REA: ['rea', 'restrictive early action', 'single-choice early action'],
  RD: ['rd', 'regular decision'],
  Rolling: ['rolling']
};

const BOOL_SYNS = {
  attending: [
    'attending', 'going to', 'go to', 'am going to', 'i am going to', "i'm going to",
    'decided to go', 'decide to go', 'decided on', 'i decided on', 'decided to attend',
    'i chose', 'i have chosen', 'chose to go', 'chosen to go', 'choose to attend', 'chose to attend',
    'matriculating', 'matriculate', 'enrolling', 'enroll at', 'enroll in',
    'where am i going', 'final college choice', 'final choice', 'final decision'
  ],
  waitlistFlag: ['waitlisted', 'on waitlist']
};

// normalize helpers
const normResult = (q: string): Norm | null => {
  const lq = q.toLowerCase();
  for (const [canon, syns] of Object.entries(RESULT_SYNS)) {
    if (syns.some(s => lq.includes(s))) return { value: capFirst(canon), confidence: 0.95 };
  }
  // special: "which colleges did I get into?" implies Accepted
  if (/\b(get into|get in|got into|got in)\b/.test(lq)) {
    return { value: 'Accepted', confidence: 0.92 };
  }
  return null;
};

const normCategory = (q: string): Norm | null => {
  const lq = q.toLowerCase();
  for (const [canon, syns] of Object.entries(CATEGORY_SYNS)) {
    if (syns.some(s => lq.includes(s))) return { value: canon, confidence: 0.9 };
  }
  return null;
};

const normPlan = (q: string): Norm | null => {
  const lq = q.toLowerCase();
  for (const [canon, syns] of Object.entries(PLAN_SYNS)) {
    if (syns.some(s => lq.includes(s))) return { value: canon, confidence: 0.9 };
  }
  return null;
};

const normAttending = (q: string): Norm | null => {
  const lq = q.toLowerCase();
  if (BOOL_SYNS.attending.some(s => lq.includes(s))) {
    return { value: true, confidence: 0.97 };
  }
  // explicit patterns that span words
  const decidedRegex = /\b(decid(?:e|ed)\s+(to\s+)?(go|attend|enroll|matriculate)|final\s+(choice|decision))\b/;
  if (decidedRegex.test(lq)) return { value: true, confidence: 0.97 };
  return null;
};

const normWaitlistFlag = (q: string): Norm | null => {
  const lq = q.toLowerCase();
  if (BOOL_SYNS.waitlistFlag.some(s => lq.includes(s))) {
    return { value: true, confidence: 0.9 };
  }
  return null;
};

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Validation helpers
const isResultValid = (v: any) =>
  ['Accepted','Rejected','Waitlisted','Deferred','Withdrawn','Pending'].includes(String(v||''));
const isCategoryValid = (v: any) =>
  ['Wild Card','Reach','Match','Safety'].includes(String(v||''));
const isPlanValid = (v: any) =>
  ['EA','ED','RD','REA','Rolling'].includes(String(v||''));

// main API
export function extractCollegeFiltersGuardrail(userQuery: string, llmFilters: AnyFilters = {}): AnyFilters {
  const out: AnyFilters = { ...(llmFilters || {}) };

  // Only fill if missing or invalid
  if (!isResultValid(out.decision_result)) {
    const n = normResult(userQuery);
    if (n) out.decision_result = n.value;
  }

  if (!isCategoryValid(out.category)) {
    const n = normCategory(userQuery);
    if (n) out.category = n.value;
  }

  if (!isPlanValid(out.decision_plan)) {
    const n = normPlan(userQuery);
    if (n) out.decision_plan = n.value;
  }

  if (typeof out.attending !== 'boolean') {
    const n = normAttending(userQuery);
    if (n) out.attending = n.value;
  }

  // Waitlisted phrasing without explicit decision_result:
  if (!isResultValid(out.decision_result)) {
    const w = normWaitlistFlag(userQuery);
    if (w?.value === true) out.decision_result = 'Waitlisted';
  }

  return out;
}

// Scholarship filter guardrails
const SCHOLARSHIP_STATUS_SYNS = {
  Accepted: ['accepted', 'received', 'won', 'got', 'awarded'],
  Applied: ['applied', 'pending', 'waiting', 'waiting on', 'waiting to hear'],
  Rejected: ['rejected', 'denied', 'not selected']
};

export function extractScholarshipFiltersGuardrail(userQuery: string, llmFilters: AnyFilters = {}): AnyFilters {
  const out: AnyFilters = { ...(llmFilters || {}) };
  const lq = userQuery.toLowerCase();

  if (!out.application_status) {
    for (const [canon, syns] of Object.entries(SCHOLARSHIP_STATUS_SYNS)) {
      if (syns.some(s => lq.includes(s))) {
        out.application_status = canon;
        break;
      }
    }
  }

  return out;
}
