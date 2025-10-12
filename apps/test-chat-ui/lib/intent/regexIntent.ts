/**
 * Regex Intent Guards (Demoted to Safety Tags Only)
 *
 * No longer primary classifier - only adds safety tags
 */

/**
 * Extract safety tags from query using regex patterns
 */
export function regexTags(query: string): string[] {
  const tags = new Set<string>();
  const q = query.toLowerCase();

  // Assessment gate (hard requirement)
  if (/\b(assessment|initial assessment|run assessment|assess|diagnosis)\b/.test(q)) {
    tags.add("assessment");
  }

  // Escalation/trust (sensitive topics)
  if (
    /\b(rejected|rejection|didn't get in|turned down|waitlisted|deferred)\b/.test(q) ||
    /\b(struggling|worried|stressed|anxious|depressed|give up)\b/.test(q)
  ) {
    tags.add("escalation");
    tags.add("trust");
    tags.add("emotional");
  }

  // Time management
  if (/\b(168|time|hours|schedule|calendar|deadline)\b/.test(q)) {
    tags.add("time_math");
  }

  // Message templates
  if (
    /\b(email|letter|note|message|template|draft|write|reach out)\b/.test(q) &&
    /\b(teacher|counselor|recommender|mentor|coach)\b/.test(q)
  ) {
    tags.add("message_template");
    tags.add("micro_interaction");
  }

  // Coaching/strategy
  if (/\b(how did|tactics|strategy|approach|coaching|guidance)\b/.test(q)) {
    tags.add("coaching");
    tags.add("strategy");
  }

  // Parent dynamics
  if (/\b(parent|mom|dad|family|pushback)\b/.test(q)) {
    tags.add("parent_pushback");
  }

  // Execution framework
  if (/\b(framework|system|process|methodology)\b/.test(q)) {
    tags.add("execution_framework");
  }

  return Array.from(tags);
}
