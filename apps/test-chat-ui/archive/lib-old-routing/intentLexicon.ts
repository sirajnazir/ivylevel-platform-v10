/**
 * Intent Lexicon - query tagging and type preferences
 * Loads YAML rules for intent classification
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { QueryTags } from "./types";

type LexRule = {
  name: string;
  match: string[];
  addTags?: string[];
  preferTypes?: string[];
};

let rules: LexRule[] = [];

export function loadIntentLexicon(configPath = "config/intent_lexicon.yaml") {
  const fullPath = path.resolve(process.cwd(), configPath);
  console.log(`[IntentLexicon] Loading from: ${fullPath}`);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Intent lexicon file not found: ${fullPath}`);
  }

  rules = yaml.load(fs.readFileSync(fullPath, "utf8")) as LexRule[];
  console.log(`[IntentLexicon] Loaded ${rules.length} rules`);
  return rules;
}

export function tagQuery(query: string): QueryTags {
  if (!rules.length) {
    loadIntentLexicon();
  }

  const tags = new Set<string>();
  const preferTypes = new Set<string>();

  // Universal overrides (unambiguous patterns that bypass lexicon)
  const normalizedQuery = query.toLowerCase();

  // Override 0: Time-boxing / immediate planning (future pacing)
  const timeBoxPattern = /\b(what should i do|plan|do first|next|prioritize)\b.*?\b(\d{1,3})\s*(minutes|min|hrs?|hours?)\b/i;
  if (timeBoxPattern.test(query)) {
    console.log(`[IntentLexicon] Universal override: time_boxing → plan_now`);
    tags.add("time_math");
    tags.add("plan_now");
    tags.add("future_pacing");
    // Keep KB for templates + EQ cues, don't force SQL
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 1: Metric-trend queries → force SQL route
  const metricTrend = /(gpa|sat|act|score|grade|transcript|testing)\b.*\b(trend|delta|change|timeline)/i;
  if (metricTrend.test(query)) {
    console.log(`[IntentLexicon] Universal override: metric_trend → academics.trend`);
    tags.add("academics");
    tags.add("trend");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 2: "I won X" achievement statements → force hybrid:update
  const wonNow = /\b(i\s+just|i\s+now|i)\s+(won|received|earned|got\s+accepted|got\s+into)\b/i;
  if (wonNow.test(query)) {
    console.log(`[IntentLexicon] Universal override: achievement_statement → update`);
    tags.add("update");
    tags.add("achievement");
    preferTypes.add("hybrid");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 3: Rejection statements → tag as rejection_response (tone-sensitive)
  const rejection = /\b(rejected|denied|waitlisted|deferred)\s+(from|by|at)\b|didn't\s+get\s+(in|into|accepted)/i;
  if (rejection.test(query)) {
    console.log(`[IntentLexicon] Universal override: rejection → rejection_response`);
    tags.add("rejection_response");
    return { tags: [...tags], preferTypes: [] };
  }

  // Override 4: De-escalation/parent pushback → tag as escalation (tone-sensitive)
  const escalation = /\b(de-escalate|pushback|parent\s+(concern|worry|upset|angry)|calm\s+down|defuse)\b/i;
  if (escalation.test(query)) {
    console.log(`[IntentLexicon] Universal override: escalation pattern → escalation`);
    tags.add("escalation");
    return { tags: [...tags], preferTypes: [] };
  }

  // Override 5: Message/email drafting → tag as message_template (tone-sensitive)
  const messageTemplate = /\b(draft|write|send|email|thank\s+you|follow.up)\s+(email|message|note|letter)|thank\s+a\s+\w+/i;
  if (messageTemplate.test(query)) {
    console.log(`[IntentLexicon] Universal override: message template → message_template`);
    tags.add("message_template");
    return { tags: [...tags], preferTypes: [] };
  }

  // Override 6: Parent conflict → escalation (tone-sensitive)
  const parentConflict = /\b(parent|mom|dad|family).*(say|think|upset|angry|pushback|waste|wasting|conflict)/i;
  if (parentConflict.test(query)) {
    console.log(`[IntentLexicon] Universal override: parent_conflict → escalation`);
    tags.add("escalation");
    tags.add("parent_brief");
    return { tags: [...tags], preferTypes: [] };
  }

  // Override 7: Awards fact queries → SQL route
  if (/\b(what|which|list|show).*(award|honor|recognition|ncwit|prize|won)/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: awards_query → awards.list`);
    tags.add("awards");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 7b: College list/results fact queries → SQL route (must come before school_list YAML rule)
  if (/\b(what|which|show|list).*(college|school|university).*(list|results?|final|applied|outcomes?|choose|chose|chosen|attend|attending)/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: college_list_query → programs.final`);
    tags.add("college_list");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 8: GPA fact queries → SQL route
  if (/\b(gpa|grade point|grades|weighted|unweighted)\b/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: gpa_query → academics.gpa`);
    tags.add("academics");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 9: Testing fact queries → SQL route
  if (/\b(SAT|ACT|test score|sat score|act score|testing).*(first|second|third|last|latest|initial|final|delta|change|timeline|progression|vs|was my|scores?)/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: testing_query → testing.timeline`);
    tags.add("testing");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 10: AP/Course fact queries → SQL route
  if (/\b(how many|count|list|show).*(ap|aps|advanced placement|honors|courses?)\b/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: ap_query → academics.courses`);
    tags.add("academics");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 11: Summer programs fact queries → SQL route
  if (/\b(which|what|list|show).*(summer program|programs).*(submit|submitted|applied|decisions?|accepted|got in)/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: programs_query → programs.submitted`);
    tags.add("programs");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 12: ECs/Activities fact queries → SQL route
  if (/\b(which|what|list|show).*(ec|ecs|activities|extracurricular).*(submit|submitted|final|actually)/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: ec_query → activities.final`);
    tags.add("activities");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 13: College programs/decisions fact queries → SQL route
  if (/\b(which|what|show|list).*(college|school|program).*(list|results?|accept|accepted|decisions?|outcomes?|final|applied|got in|admitted)/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: decisions_query → programs.decisions`);
    tags.add("decisions");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Override 14: Grade jumps/vitals fact queries → SQL route
  if (/\b(show|what|list).*(grade jump|jumps|vitals|academic trend)/i.test(query)) {
    console.log(`[IntentLexicon] Universal override: vitals_query → academics.vitals`);
    tags.add("academics");
    tags.add("vitals");
    tags.add("facts.canonical");
    preferTypes.add("sql");
    return { tags: [...tags], preferTypes: [...preferTypes] };
  }

  // Normal lexicon processing
  for (const rule of rules) {
    if (rule.match?.some(rx => {
      try {
        return new RegExp(rx, "i").test(query);
      } catch (e) {
        console.warn(`[IntentLexicon] Invalid regex in rule "${rule.name}": ${rx}`);
        return false;
      }
    })) {
      console.log(`[IntentLexicon] Matched rule: ${rule.name}`);
      rule.addTags?.forEach(t => tags.add(t));
      rule.preferTypes?.forEach(t => preferTypes.add(t));
    }
  }

  return {
    tags: [...tags],
    preferTypes: [...preferTypes]
  };
}
