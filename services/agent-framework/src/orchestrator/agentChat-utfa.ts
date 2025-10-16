import { fetchVitals, detectFactKinds } from '../services/facts-canonical.js';
import {
  shouldUseTemporalFacts,
  extractTemporalIntent,
  resolveTemporalFact,
  formatTemporalFactResult
} from '../services/temporalFacts.js';
import { routeEnumerationQuery, isEnumerationQuery } from './enumeration-router.js';
// v10.5.2: Legacy SAT-only enumeration router removed - now using unified intent classification
// import { routeEnumerationQueryV2, isEnumerationQueryV2 } from './enumeration-router-v2.js';
import { classifyEnumIntent, isEnumerationQuery as isUniversalEnum } from './intent-enum.js';
// v10.5.2: RESTORED - Use proper v3.0 resolvers (data exists in views!)
import { awards, ecs, narrative, programs } from '../resolvers/enums.js';
import { transcript, gpa, overview, vitals as academicVitals } from '../resolvers/academics.js';
import { ivyscore, readiness } from '../resolvers/readiness.js';
import { collegeList } from '../resolvers/college.js';
import { gameplan } from '../resolvers/gameplan.js';
import { sat } from '../resolvers/testing.js';
// v10.6: EC Vitals + JTBD resolvers (fact-based metric progression)
import { vitals as ecVitals } from '../resolvers/vitals.js';
import { jtbd } from '../resolvers/jtbd.js';
// v10.2-v10.5.1: BROKEN compat resolvers (queried bad vital_facts)
// import { awards, ecs, programs, academics, progression } from '../resolvers/compat.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { composeAnswer } from '../compose/compose.js';
import { ensureSession, getRecentMessages, storeMessage } from '../services/sessions.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { pool } from '../db/pool.js';
// v10.4: Humanizer v2.1 - Jenny's Real Voice across all categories
import { humanize, type HumanizeOutput } from '../lib/humanizer.js';
// v11.1: Proof verification service (CAT-2/CAT-3 only, not CAT-1)
import { registerProof } from '../services/proof/verifier.js';
import { HUMANIZER_ENABLED } from '../config/env.js';

const log = createLogger('orchestrator-utfa');

// v10.4: Safe fallback when humanizer disabled
const NO_HUMANIZE: HumanizeOutput = {
  text: '',
  applied: { warmth: false, action: false, personal_ref: false, proof_presenter: false, safety_scrub: false },
  plan: { phrase_source: 'fallback' as const, cadence: 'standard' as const }
};

// v10.1: Answer deduplication helper
// Removes duplicate lines caused by slight text variations (different dashes, spacing, etc.)
function deduplicateAnswer(answer: string): string {
  if (!answer || !answer.includes('\n')) return answer;

  const lines = answer.split('\n');
  const seen = new Set<string>();
  const dedupedLines = lines.filter(line => {
    // Normalize: lowercase, remove all dashes/spaces/punctuation for comparison
    const normalized = line.toLowerCase()
      .replace(/[—\-–\s.,;:()]/g, '')
      .trim();

    // Keep non-empty unique lines
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      return true;
    }

    // Keep empty lines (for formatting)
    if (!normalized) return true;

    return false;
  });

  if (dedupedLines.length < lines.length) {
    log.event('deduplication', {
      original_lines: lines.length,
      deduped_lines: dedupedLines.length,
      removed: lines.length - dedupedLines.length
    });
  }

  return dedupedLines.join('\n');
}

// --- v10.5.1: Compact facts blocks for Humanizer (Cat-1) -----------------------------
// Build terse, source-friendly facts blocks distinct from composed answers
// These are passed as sqlBlock to humanizer to avoid duplication

// Helper: Format date to YYYY-MM-DD
function formatDate(d: any): string {
  if (!d) return '';
  if (d instanceof Date) {
    return d.toISOString().split('T')[0];
  }
  if (typeof d === 'string') {
    // If it's already ISO format or similar, extract YYYY-MM-DD
    return d.split('T')[0];
  }
  return String(d);
}

function factsBlockForEnumeration(route: string, result: any): string {
  // Build terse, source-friendly lines from enumeration payloads
  // v10.5.8: Deduplication now happens at orchestration layer (line ~508), not here
  let items = result.items ?? (result.item ? [result.item] : []);
  if (!items?.length) return "";

  if (route.startsWith("awards.final")) {
    return items.map((r: any) =>
      `award: ${r.award_name}${r.won_date ? ` | date: ${formatDate(r.won_date)}` : ""}${r.source_id ? ` | src: ${r.source_id}` : ""}`
    ).join("\n");
  }

  if (route.startsWith("program.")) {
    return items.map((r: any) =>
      `program: ${r.program_name}${
        r.submit_date ? ` | submitted: ${r.submit_date}` : ""
      }${r.decision ? ` | decision: ${r.decision}` : ""}${
        r.decision_date ? ` (${r.decision_date})` : ""
      }${r.source_id ? ` | src: ${r.source_id}` : ""}`
    ).join("\n");
  }

  if (route.startsWith("ecs.")) {
    return items.map((r: any) =>
      `activity: ${r.activity_name}${r.category ? ` | cat: ${r.category}` : ""}${
        r.event_date ? ` | since: ${r.event_date}` : ""
      }${r.source_id ? ` | src: ${r.source_id}` : ""}`
    ).join("\n");
  }

  if (route.startsWith("academics.gpa.")) {
    const r = items[0] || result.item;
    if (!r) return "";
    const gpa = r.gpa_weighted
      ? `${r.gpa_unweighted ?? "NA"} UW / ${r.gpa_weighted} W`
      : `${r.gpa_unweighted ?? "NA"} UW`;
    return `gpa: ${gpa}${r.credits_earned ? ` | credits: ${r.credits_earned}` : ""}${
      r.source_id ? ` | src: ${r.source_id}` : ""}`;
  }

  if (route === "academics.vitals.latest") {
    const r = result.item;
    if (!r) return "";
    const gpa = r.gpa_weighted
      ? `${r.gpa_unweighted ?? "NA"} UW / ${r.gpa_weighted} W`
      : `${r.gpa_unweighted ?? "NA"} UW`;
    return `as_of: ${r.as_of_date} | week: W${String(r.week_no || r.week || 0).padStart(2, "0")} | gpa: ${gpa}` +
           `${r.ap_count ? ` | ap: ${r.ap_count}` : ""}`;
  }

  // v10.6: EC Vitals
  if (route.startsWith("vitals.")) {
    if (route === "vitals.summary") {
      const r = result.item;
      if (!r) return "";
      return `vitals_summary: ${r.activities_tracked} activities | ${r.unique_metrics} metrics | ${r.total_snapshots} snapshots | ${formatDate(r.tracking_start)} to ${formatDate(r.tracking_latest)}`;
    }
    return items.map((r: any) => {
      const val = r.numeric_value ? `${r.numeric_value}${r.unit || ""}` : r.text_value || "NA";
      return `${r.activity_name} | ${r.metric_name}: ${val}${r.as_of ? ` | date: ${formatDate(r.as_of)}` : ""}${r.nth ? ` | #${r.nth}` : ""}`;
    }).join("\n");
  }

  // v10.6: JTBD
  if (route.startsWith("jtbd.")) {
    if (route === "jtbd.week") {
      const r = result.item;
      if (!r) return "";
      return `week_${r.week_number}: ${r.completed_jobs}/${r.total_jobs} completed | ${formatDate(r.week_start_date)} to ${formatDate(r.week_end_date)}`;
    }
    return items.map((r: any) =>
      `${r.week_number ? `W${r.week_number} | ` : ""}${r.job_description}${r.completion_date ? ` | done: ${formatDate(r.completion_date)}` : ""}${r.outcome_value ? ` | result: ${r.outcome_value}${r.outcome_unit || ""}` : ""}`
    ).join("\n");
  }

  // Fallback: join minimal titles
  return items.map((r: any) =>
    r.title_name || r.award_name || r.program_name || r.activity_name || r.item_key || "—"
  ).join("\n");
}

function factsBlockForUTFA(result: any): string {
  // Build a minimal SAT/GPA temporal block from UTFA facts
  // Each line: date | value | flags
  if (!result?.facts?.length) return "";
  return result.facts.map((f: any) => {
    const v = f.value ?? f.value_numeric ?? f.value_text ?? "";
    const flags = [
      f.official ? "official" : null,
      f.confidence != null ? `conf:${f.confidence}` : null,
      f.source ? `src:${f.source}` : null
    ].filter(Boolean).join(" ");
    return `${f.date ?? ""} | ${v}${flags ? ` | ${flags}` : ""}`;
  }).join("\n");
}

// Helper functions for universal enumerations
function inferChipTableFromRoute(route: string) {
  if (route.startsWith('awards.final')) return 'outcomes';
  if (route.startsWith('awards.'))      return 'award_targets';
  if (route.startsWith('program.'))     return route.endsWith('decisions') ? 'outcomes' : 'kb_items';
  if (route.startsWith('ecs.'))         return 'kb_items';
  if (route.startsWith('narrative.'))   return 'kb_items';
  if (route.startsWith('academics.transcript.')) return 'academic_courses';
  if (route.startsWith('academics.gpa.')) return 'academic_gpa';
  if (route.startsWith('academics.vitals.')) return route.endsWith('events') ? 'academics_events' : 'academics_vitals';
  return 'kb_items';
}

// v10.5.4: Universal deduplication for enumerations
// Removes duplicate entries from multi-source queries (e.g., awards from SRC-IMSG + SRC-INT)
// Prioritizes SRC-INT-* (canonical intent sources) over SRC-IMSG-* (message scraping)
function deduplicateEnumItems(items: any[], route: string): any[] {
  if (!items?.length) return items;

  // Determine primary key field based on route
  let nameField = 'award_name';
  if (route.startsWith('ecs.') || route.startsWith('activities.')) nameField = 'activity_name';
  if (route.startsWith('program.')) nameField = 'program_name';
  if (route.startsWith('academics.')) nameField = 'course_name'; // or subject
  if (route.startsWith('college.')) nameField = 'college_name';

  // Normalize name function (remove hyphens, em-dashes, ampersands, trim spaces)
  // v10.5.4.1: Enhanced to handle "&" vs "and" variations
  // v10.5.7: Enhanced for activities - extract core name after role prefix
  const normalize = (str: string) => {
    if (typeof str !== 'string') return '';

    let normalized = str.toLowerCase()
      .replace(/&/g, 'and')           // Convert & to and
      .replace(/[—\-\s]+/g, ' ')      // Normalize dashes/spaces
      .replace(/\s+/g, ' ')           // Collapse multiple spaces
      .trim();

    // For activities: Remove role prefixes to get core activity name
    // "Founder, Empowering AI; description..." → "empowering ai"
    // "President, Filmmaker's Club" → "filmmaker's club"
    // "Founder/Solo Developer, Synthoria" → "synthoria"
    if (nameField === 'activity_name') {
      // Remove common role prefixes (including compound roles like "Founder/Solo Developer")
      // Match roles followed by comma, slash, or space
      // IMPORTANT: Longer patterns must come FIRST in alternation (e.g., "vice president" before "president")
      // Run in loop to handle compound roles like "Founder/Solo Developer"
      let prev;
      do {
        prev = normalized;
        normalized = normalized
          .replace(/^(vice president|student leader|solo developer|co-founder|co founder|president|founder|ambassador|coordinator|participant|volunteer|freelancer|developer|director|manager|teacher|scholar|captain|leader|member|editor|intern|solo)[\/,\s]+/i, '');
      } while (normalized !== prev && normalized);

      normalized = normalized
        .replace(/[;:].*/g, '')  // Remove everything after semicolon/colon (descriptions)
        .replace(/\([^)]*\)/g, '') // Remove parentheticals
        .replace(/\s+/g, ' ')
        .trim();
    }

    return normalized;
  };

  // Group items by normalized name + date (where applicable)
  const seen = new Map<string, any>();

  for (const item of items) {
    const name = item[nameField] || '';
    const date = item.won_date || item.event_date || item.submit_date || item.decision_date || item.as_of || '';

    // Create composite key: normalized_name + date
    // For activities, don't use date since different sources have inconsistent dates
    const normalizedName = normalize(name);
    const key = nameField === 'activity_name' ? normalizedName : `${normalizedName}|${date}`;

    // DEBUG for activities
    if (nameField === 'activity_name' && items.length > 15) {
      console.log(`[DEDUP-EC] "${name}" → normalized: "${normalizedName}" | key: "${key}" | src: ${item.source_id}`);
    }

    if (!seen.has(key)) {
      // First occurrence - add to map
      seen.set(key, item);
      if (nameField === 'activity_name' && items.length > 15) {
        console.log(`[DEDUP-EC]   → FIRST, added`);
      }
    } else {
      // Duplicate found - prioritize SRC-INT-* sources
      const existing = seen.get(key);
      const existingSource = existing?.source_id || '';
      const newSource = item?.source_id || '';

      // Priority: SRC-INT-* > SRC-COMMONAPP-* > SRC-IMSG-* > others
      const getPriority = (src: string) => {
        if (src.startsWith('SRC-INT-')) return 1;
        if (src.startsWith('SRC-COMMONAPP-')) return 2;
        if (src.startsWith('SRC-IMSG-')) return 3;
        return 4;
      };

      const existingPriority = getPriority(existingSource);
      const newPriority = getPriority(newSource);

      if (newPriority < existingPriority) {
        // New source has higher priority - replace
        seen.set(key, item);
      }
      // Otherwise keep existing (higher priority or same priority, first wins)
    }
  }

  return Array.from(seen.values());
}

function composeEnumText(result: any): string {
  const route = result.route as string;
  // v10.5.8: Deduplication now happens at orchestration layer (line ~508), not here
  let list  = result.items ?? (result.item ? [result.item] : []);
  const lines = list.map((r: any, i: number) => {
    if (route.startsWith('ecs.')) {
      return `${i+1}. ${r.activity_name}${r.category ? ` (${r.category})` : ''}${
        r.submit_date ? ` — submitted ${formatDate(r.submit_date)}` : r.event_date ? ` — started ${formatDate(r.event_date)}` : ''}`;
    }
    if (route.startsWith('awards.final')) {
      return `${i+1}. ${r.award_name}${r.won_date ? ` (${formatDate(r.won_date)})` : ''}${r.tier ? ` — ${r.tier}` : ''}`;
    }
    if (route.startsWith('awards.initial')) {
      return `${i+1}. ${r.award_name}${r.tier ? ` — ${r.tier}` : ''}${r.as_of ? ` (as of ${formatDate(r.as_of)})` : ''}`;
    }
    if (route.startsWith('program.')) {
      if (route.endsWith('decisions')) {
        return `${i+1}. ${r.program_name}${r.decision ? ` — ${r.decision}` : ''}${
          r.decision_date ? ` (${formatDate(r.decision_date)})` : ''}`;
      }
      return `${i+1}. ${r.program_name}${r.submit_date ? ` — submitted ${formatDate(r.submit_date)}` : ''}`;
    }
    if (route.startsWith('academics.transcript.')) {
      return `${i+1}. ${r.course_title} — ${r.grade_letter || 'N/A'}${r.grade_percent ? ` (${r.grade_percent}%)` : ''}${
        r.credits ? ` [${r.credits} cr]` : ''}${r.weighting ? ` ${r.weighting}` : ''}`;
    }
    if (route.startsWith('academics.gpa.')) {
      const gpaText = r.gpa_weighted
        ? `${r.gpa_unweighted || 'N/A'} UW / ${r.gpa_weighted} W`
        : `${r.gpa_unweighted || 'N/A'}`;
      const scopeText = r.scope_key ? `${r.scope} (${r.scope_key})` : r.scope;
      return `${i+1}. ${scopeText}: ${gpaText}${r.credits_earned ? ` — ${r.credits_earned} credits` : ''}`;
    }
    if (route.startsWith('academics.vitals.events')) {
      return `${i+1}. W${String(r.week_no).padStart(2, '0')} (${r.event_date}): ${r.label}`;
    }
    // v10.5.9: SAT score formatting
    if (route.startsWith('testing.sat.')) {
      const typeLabel = r.type === 'practice' ? ' (practice)' : '';
      const dateLabel = r.as_of ? ` — ${formatDate(r.as_of)}` : '';
      return `${i+1}. SAT: ${r.numeric_value}${typeLabel}${dateLabel}`;
    }
    // v10.5.2: College list formatting
    if (route.startsWith('college.')) {
      const bucketTag = r.bucket_category ? ` [${r.bucket_category}]` : '';
      const decision = r.decision_result ? ` — ${r.decision_result}` : '';
      const attendingTag = r.attending ? ' ✓ ATTENDING' : '';
      return `${i+1}. ${r.college_name}${bucketTag}${decision}${attendingTag}`;
    }
    return `${i+1}. ${r.title_name || r.award_name || r.program_name || r.college_name}`;
  });
  if (route === 'narrative.initial') {
    const r = result.item;
    return `Initial narrative (as of ${r?.as_of ?? '—'}): ${r?.narrative_text ?? '(missing)'}`;
  }
  if (route === 'academics.gpa.initial') {
    const r = result.item;
    if (!r) return 'No initial GPA data found.';
    const gpaText = r.gpa_weighted
      ? `${r.gpa_unweighted || 'N/A'} UW / ${r.gpa_weighted} W`
      : `${r.gpa_unweighted || 'N/A'}`;
    const scopeText = r.scope_key ? `${r.scope} (${r.scope_key})` : r.scope;
    return `Initial GPA — ${scopeText}: ${gpaText}${r.credits_earned ? ` — ${r.credits_earned} credits` : ''}`;
  }
  if (route === 'academics.vitals.latest') {
    const r = result.item;
    if (!r) return 'No vitals data found.';
    const gpaText = r.gpa_weighted
      ? `${r.gpa_unweighted || 'N/A'} UW / ${r.gpa_weighted} W`
      : `${r.gpa_unweighted || 'N/A'}`;
    return `Latest vitals (W${String(r.week_no).padStart(2, '0')}, ${r.as_of_date}): GPA ${gpaText}, AP Count: ${r.ap_count_cum || 0}${
      r.core_stem_load ? `, STEM Load: ${r.core_stem_load}` : ''}${
      r.workload_hours_week ? `, Weekly Hours: ${r.workload_hours_week}` : ''}`;
  }
  if (route === 'academics.vitals.trend') {
    const r = result.item;
    if (!r) return 'No trend data found.';
    return `Academic Trend (W${String(r.first_week).padStart(2, '0')}-W${String(r.last_week).padStart(2, '0')}): GPA U ${r.gpa_u_min}→${r.gpa_u_max}, W ${r.gpa_w_min}→${r.gpa_w_max}, AP: ${r.ap_max}, Weeks Recorded: ${r.weeks_recorded}`;
  }

  // v10.5.2: IvyScore / Readiness
  if (route.startsWith('ivyscore.')) {
    const r = result.item;
    if (!r) return 'No IvyScore data found.';
    const score = r.overall_score ? Number(r.overall_score).toFixed(1) : 'N/A';
    const phase = r.snapshot_phase || 'unknown';
    const date = r.as_of ? new Date(r.as_of).toLocaleDateString() : 'unknown date';
    return `IvyScore: ${score}/100 (${phase} phase, as of ${date})`;
  }

  // v10.5.2: College List
  if (route.startsWith('college.')) {
    if (route === 'college.attending') {
      // result.item is already filtered by resolver (returns single college or null)
      const c = result.item;
      if (!c) return 'No college marked as attending.';
      return `Attending: ${c.college_name}${c.program ? ` — ${c.program}` : ''}${c.location ? ` (${c.location})` : ''}`;
    }
    // college.list, college.reach, college.match, college.safety
    return lines.length ? lines.join('\n') : 'No colleges found.';
  }

  // v10.5.2: Game Plan
  if (route.startsWith('gameplan.')) {
    const r = result.item;
    if (!r) return 'No game plan data found.';

    const sections: string[] = [];

    // Narrative Items
    if (r.narrative_items?.length) {
      const items = r.narrative_items.map((n: any) => `  • ${n.category}: ${n.content}`).join('\n');
      sections.push(`**Narrative Elements (${r.narrative_items.length}):**\n${items}`);
    }

    // Award Targets
    if (r.award_targets?.length) {
      const items = r.award_targets.slice(0, 10).map((a: any) => `  • ${a.label}`).join('\n');
      const more = r.award_targets.length > 10 ? `\n  ... and ${r.award_targets.length - 10} more` : '';
      sections.push(`**Award Targets (${r.award_targets.length}):**\n${items}${more}`);
    }

    // EC Targets
    if (r.ec_targets?.length) {
      const items = r.ec_targets.slice(0, 10).map((e: any) => `  • ${e.label}`).join('\n');
      const more = r.ec_targets.length > 10 ? `\n  ... and ${r.ec_targets.length - 10} more` : '';
      sections.push(`**EC Targets (${r.ec_targets.length}):**\n${items}${more}`);
    }

    // Program Targets
    if (r.program_targets?.length) {
      const items = r.program_targets.map((p: any) => `  • ${p.program}`).join('\n');
      sections.push(`**Program Targets (${r.program_targets.length}):**\n${items}`);
    }

    return sections.length ? sections.join('\n\n') : 'No game plan data found.';
  }

  // v10.6: EC Vitals formatting
  if (route.startsWith('vitals.')) {
    if (route === 'vitals.summary') {
      const r = result.item;
      if (!r) return 'No vitals data found.';
      return `Vitals Tracking Summary:\n• Activities tracked: ${r.activities_tracked}\n• Unique metrics: ${r.unique_metrics}\n• Total snapshots: ${r.total_snapshots}\n• Tracking period: ${formatDate(r.tracking_start)} to ${formatDate(r.tracking_latest)}\n• Metric types: ${r.metric_types_tracked?.join(', ') || 'N/A'}`;
    }
    // vitals.latest, vitals.progression, vitals.funding.progression, vitals.scale.progression, vitals.impact.latest
    return list.map((r: any, i: number) => {
      const value = r.numeric_value ? `${r.numeric_value}${r.unit ? ` ${r.unit}` : ''}` : r.text_value || 'N/A';
      const activityLabel = r.activity_name ? `${r.activity_name} — ` : '';
      const dateLabel = r.as_of ? ` (${formatDate(r.as_of)})` : '';
      const nthLabel = r.nth ? ` [#${r.nth}]` : '';
      return `${i+1}. ${activityLabel}${r.metric_name}: ${value}${dateLabel}${nthLabel}`;
    }).join('\n') || 'No vitals data found.';
  }

  // v10.6: JTBD (Jobs To Be Done) formatting
  if (route.startsWith('jtbd.')) {
    if (route === 'jtbd.week') {
      const r = result.item;
      if (!r) return 'No jobs found for this week.';
      return `Week ${r.week_number} (${formatDate(r.week_start_date)} to ${formatDate(r.week_end_date)}):\n• Total jobs: ${r.total_jobs}\n• Completed: ${r.completed_jobs}\n• In progress: ${r.in_progress_jobs}\n• Planned: ${r.planned_jobs}\n\nCompleted this week:\n${r.completed_descriptions?.map((d: string, i: number) => `  ${i+1}. ${d}`).join('\n') || '  (none)'}`;
    }
    if (route === 'jtbd.progression') {
      return list.map((r: any, i: number) => {
        return `${i+1}. Week ${r.week_number} (${formatDate(r.week_start_date)}): ${r.completed_this_week}/${r.jobs_this_week} completed (${r.completion_rate}%) — Cumulative: ${r.cumulative_completed}/${r.cumulative_jobs}`;
      }).join('\n') || 'No progression data found.';
    }
    // jtbd.completed, jtbd.pending, jtbd.milestones
    return list.map((r: any, i: number) => {
      const weekLabel = r.week_number ? `W${r.week_number} — ` : '';
      const dateLabel = r.completion_date ? ` (${formatDate(r.completion_date)})` : '';
      const statusLabel = r.status ? ` [${r.status}]` : '';
      const outcomeLabel = r.outcome_value ? ` → ${r.outcome_value}${r.outcome_unit ? ` ${r.outcome_unit}` : ''}` : '';
      return `${i+1}. ${weekLabel}${r.job_description}${dateLabel}${statusLabel}${outcomeLabel}`;
    }).join('\n') || 'No jobs found.';
  }

  return lines.length ? lines.join('\n') : 'No items found.';
}

async function maybeEnumAnswer(pg: any, studentId: string, userText: string) {
  console.log('[ORCH:maybeEnumAnswer] 🔍 Checking enum intent for:', userText.substring(0, 80));
  const route = classifyEnumIntent(userText);
  console.log('[ORCH:maybeEnumAnswer] → Classified route:', route || 'NULL (not an enum query)');
  if (!route) return null;

  // v10.2: Use compat resolvers (bridge legacy vital_facts → v3.0)
  switch (route) {
    case 'awards.initial':     return { kind: 'enum', route, items: await awards.initial(pg, studentId) };
    case 'awards.final':       return { kind: 'enum', route, items: await awards.final(pg, studentId) };
    case 'awards.progression': return { kind: 'enum', route, items: await awards.progression(pg, studentId) };

    case 'ecs.initial':        return { kind: 'enum', route, items: await ecs.initial(pg, studentId) };
    case 'ecs.final':          return { kind: 'enum', route, items: await ecs.final(pg, studentId) };
    case 'ecs.progression':    return { kind: 'enum', route, items: await ecs.progression(pg, studentId) };

    // narrative.initial not available in compat layer yet
    case 'narrative.initial':  return { kind: 'enum', route, item: null };

    case 'program.initial':    return { kind: 'enum', route, items: await programs.initial(pg, studentId) };
    case 'program.submitted':  return { kind: 'enum', route, items: await programs.submitted(pg, studentId) };
    case 'program.final':      return { kind: 'enum', route, items: await programs.final(pg, studentId) };
    case 'program.decisions':  return { kind: 'enum', route, items: await programs.decisions(pg, studentId) };
    case 'program.progression':return { kind: 'enum', route, items: await programs.progression(pg, studentId) };

    // transcript not available in compat layer (no transcript data in vital_facts)
    case 'academics.transcript.initial':     return { kind: 'enum', route, items: [] };
    case 'academics.transcript.final':       return { kind: 'enum', route, items: [] };
    case 'academics.transcript.progression': return { kind: 'enum', route, items: [] };

    // GPA from academics.ts resolver
    case 'academics.gpa.initial':     return { kind: 'enum', route, items: await gpa.initial(pg, studentId) };
    case 'academics.gpa.final':       return { kind: 'enum', route, items: await gpa.final(pg, studentId) };
    case 'academics.gpa.latest':      return { kind: 'enum', route, items: await gpa.latest(pg, studentId) };
    case 'academics.gpa.progression': return { kind: 'enum', route, items: await gpa.progression(pg, studentId) };

    // vitals from academics.ts resolver
    case 'academics.vitals.latest':   return { kind: 'enum', route, item:  await academicVitals.latest(pg, studentId) };
    case 'academics.vitals.trend':    return { kind: 'enum', route, item:  null };
    case 'academics.vitals.events':   return { kind: 'enum', route, items: [] };

    // SAT from testing.ts resolver (v10.5.9)
    case 'testing.sat.first':         return { kind: 'enum', route, items: await sat.first(pg, studentId) };
    case 'testing.sat.latest':        return { kind: 'enum', route, items: await sat.latest(pg, studentId) };
    case 'testing.sat.progression':   return { kind: 'enum', route, items: await sat.progression(pg, studentId) };

    // IvyScore / Readiness from readiness.ts resolver (v10.5.2)
    case 'ivyscore.latest':           console.log('[ORCH] → Calling ivyscore.latest'); return { kind: 'enum', route, item:  await ivyscore.latest(pg, studentId) };
    case 'ivyscore.current':          console.log('[ORCH] → Calling ivyscore.current'); return { kind: 'enum', route, item:  await ivyscore.current(pg, studentId) };
    case 'ivyscore.progression':      console.log('[ORCH] → Calling ivyscore.progression'); return { kind: 'enum', route, items: await ivyscore.progression(pg, studentId) };
    case 'readiness.top_priorities':  return { kind: 'enum', route, items: await readiness.topPriorities(pg, studentId) };
    case 'readiness.weakspots':       return { kind: 'enum', route, items: await readiness.weakspots(pg, studentId) };

    // College List from college.ts resolver (v10.5.2)
    case 'college.list':              return { kind: 'enum', route, items: await collegeList.all(pg, studentId) };
    case 'college.attending':         return { kind: 'enum', route, item:  await collegeList.attending(pg, studentId) };
    case 'college.accepted':          return { kind: 'enum', route, items: await collegeList.accepted(pg, studentId) };
    case 'college.reach':             return { kind: 'enum', route, items: await collegeList.byBucket(pg, studentId, 'Reach') };
    case 'college.match':             return { kind: 'enum', route, items: await collegeList.byBucket(pg, studentId, 'Match') };
    case 'college.safety':            return { kind: 'enum', route, items: await collegeList.byBucket(pg, studentId, 'Safety') };

    // College Decision Plan from college.ts resolver (v10.7.1)
    case 'college.early_decision':    return { kind: 'enum', route, items: await collegeList.byDecisionPlan(pg, studentId, 'Early Decision') };
    case 'college.early_action':      return { kind: 'enum', route, items: await collegeList.byDecisionPlan(pg, studentId, 'Early Action') };
    case 'college.restrictive_early': return { kind: 'enum', route, items: await collegeList.byDecisionPlan(pg, studentId, 'Restrictive Early Action') };
    case 'college.regular_decision':  return { kind: 'enum', route, items: await collegeList.byDecisionPlan(pg, studentId, 'Regular Decision') };

    // Game Plan from gameplan.ts resolver (v10.5.2)
    case 'gameplan.summary_initial':  return { kind: 'enum', route, item:  await gameplan.summaryInitial(pg, studentId) };
    case 'gameplan.vs_execution':     return { kind: 'enum', route, items: await gameplan.vsExecution(pg, studentId) };
    case 'gameplan.plan_events':      return { kind: 'enum', route, items: await gameplan.planEvents(pg, studentId) };

    // EC Vitals from vitals.ts resolver (v10.6)
    case 'vitals.latest':             return { kind: 'enum', route, items: await ecVitals.latest(pg, studentId) };
    case 'vitals.progression':        return { kind: 'enum', route, items: await ecVitals.progression(pg, studentId) };
    case 'vitals.funding.progression': return { kind: 'enum', route, items: await ecVitals.fundingProgression(pg, studentId) };
    case 'vitals.scale.progression':  return { kind: 'enum', route, items: await ecVitals.scaleProgression(pg, studentId) };
    case 'vitals.impact.latest':      return { kind: 'enum', route, items: await ecVitals.impactMetrics(pg, studentId) };
    case 'vitals.summary':            return { kind: 'enum', route, item:  await ecVitals.summary(pg, studentId) };

    // JTBD (Jobs To Be Done) from jtbd.ts resolver (v10.6)
    case 'jtbd.week':                 return { kind: 'enum', route, item:  await jtbd.byWeek(pg, studentId, extractWeekNumber(q)) };
    case 'jtbd.completed':            return { kind: 'enum', route, items: await jtbd.completed(pg, studentId) };
    case 'jtbd.pending':              return { kind: 'enum', route, items: await jtbd.pending(pg, studentId) };
    case 'jtbd.milestones':           return { kind: 'enum', route, items: await jtbd.milestones(pg, studentId) };
    case 'jtbd.progression':          return { kind: 'enum', route, items: await jtbd.progression(pg, studentId) };
  }
  return null;
}

// Helper: Extract week number from query (e.g., "week 8" → 8)
function extractWeekNumber(q: string): number {
  const match = q.match(/week\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
}

export async function agentChat(req: any, res?: any) {
  const orchestrationStart = Date.now();

  // PRIORITY 0 (v11.4): Check for emotional/coaching queries FIRST
  // These bypass fact routing entirely and go straight to EQ composer
  // This prevents "rejected from Stanford" from routing to SQL college list
  // v11.4: Added universal quality verification and self-healing
  const { isEQQuery } = await import('../intent/extractors/eq-classifier.js');
  const { composeEQResponse } = await import('../compose/compose-eq.js');
  const { healResponse } = await import('../quality/response-healer.js');

  if (isEQQuery(req.message)) {
    log.event('orchestration.eq_early_exit', {
      message_preview: req.message.slice(0, 80),
      student_id: req.student_id
    });

    const sessionId = await ensureSession(req.session_id, req.student_id);

    const eqResponse = await composeEQResponse({
      message: req.message,
      studentId: req.student_id,
      sessionId,
      stream: req.stream,
      res
    });

    // v11.4: Apply universal quality verification and healing
    const healed = await healResponse(
      req.message,
      eqResponse.answer,
      'eq',
      req.student_id,
      {
        category: 'emotional',
        expectedTone: 'empathetic'
      }
    );

    const finalResponse = {
      ...eqResponse,
      answer: healed.finalResponse,
      debug: {
        ...eqResponse.debug,
        quality: {
          healed: healed.healed,
          attempts: healed.attempts,
          before_score: healed.improvements.before.scores.overall,
          after_score: healed.improvements.after.scores.overall,
          warmth_before: healed.improvements.before.scores.warmth,
          warmth_after: healed.improvements.after.scores.warmth,
          action_before: healed.improvements.before.scores.action,
          action_after: healed.improvements.after.scores.action
        },
        // v11.4: Use verified tone from quality layer
        tone: {
          warmth: healed.improvements.after.standards.warmth,
          action: healed.improvements.after.standards.action
        }
      }
    };

    // Store conversation messages
    await storeMessage(sessionId, { role: 'user', content: req.message });
    await storeMessage(sessionId, { role: 'assistant', content: finalResponse.answer });

    log.event('orchestration_complete', {
      duration_ms: Date.now() - orchestrationStart,
      type: 'eq_response',
      adapter_used: eqResponse.debug?.adapter?.isAdapter || false,
      quality_healed: healed.healed,
      quality_score: healed.improvements.after.scores.overall
    });

    if (!req.stream) return finalResponse;
    return; // Streaming already handled by composeEQResponse
  }

  // PRIORITY 1: Check universal enumerations (Awards, ECs, Narrative, Programs)
  // Only reached if NOT an emotional query
  const enumResult = await maybeEnumAnswer(pool, req.student_id, req.message);
  if (enumResult) {
    log.event('intent.detected', { route: enumResult.route, class: 'enumeration' });

    const sessionId = await ensureSession(req.session_id, req.student_id);

    // Check if we have data
    if ((Array.isArray(enumResult.items) && enumResult.items.length === 0) || (!enumResult.items && !enumResult.item)) {
      log.event('compose.enumeration_answer', { status: 'no_evidence' });

      const response = {
        answer: `No ${enumResult.route.replace(/\./g, ' ')} data found. Please populate kb_items, award_targets, or outcomes tables for this phase.`,
        session_id: sessionId,
        hits: [],
        vitals: await fetchVitals(req.student_id),
        chips: [],
        trace: {
          enumeration: { route: enumResult.route, status: 'no_evidence' }
        },
        trace_id: `enum-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        model: 'enumeration_facts'
      };

      if (!req.stream) return response;
      if (res) {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
      }
      return;
    }

    // v10.5.8: Deduplicate items ONCE at orchestration layer (before passing to helpers)
    // This prevents double deduplication in factsBlockForEnumeration() and composeEnumText()
    const originalItems = enumResult.items ?? (enumResult.item ? [enumResult.item] : []);
    const dedupedItems = deduplicateEnumItems(originalItems, enumResult.route);

    // Create deduplicated result object
    const dedupedEnumResult = {
      ...enumResult,
      items: dedupedItems,
      item: dedupedItems.length === 1 ? dedupedItems[0] : undefined
    };

    // Compose deterministic list answer with chips
    const chips = dedupedItems.filter(Boolean).map((r: any) => ({
      chip_table: r.chip_table ?? inferChipTableFromRoute(enumResult.route),
      chip_id:    r.chip_id,
      source_id:  r.source_id
    }));

    const rawAnswer = composeEnumText(dedupedEnumResult);
    const dedupedAnswer = deduplicateAnswer(rawAnswer);

    // v10.5.1: Build compact facts block for humanizer (avoids duplication)
    const enumFacts = factsBlockForEnumeration(enumResult.route, dedupedEnumResult);

    // v10.4: Apply humanizer (Cat-1: SQL facts) with feature flag
    const humanized = HUMANIZER_ENABLED
      ? await humanize({
          route: 'sql',
          studentId: req.student_id,
          intent: enumResult.route,
          raw: dedupedAnswer,
          sqlBlock: enumFacts // compact, canonical facts block
        })
      : { ...NO_HUMANIZE, text: dedupedAnswer };

    log.event('compose.enumeration_answer', {
      route: enumResult.route,
      items_count: enumResult.items?.length ?? 1,
      chips_count: chips.length,
      humanizer: humanized.applied
    });

    await storeMessage(sessionId, { role: 'user', content: req.message });
    await storeMessage(sessionId, { role: 'assistant', content: humanized.text });

    const response = {
      answer: humanized.text,
      session_id: sessionId,
      hits: [],
      vitals: await fetchVitals(req.student_id),
      chips,
      // v11.2.2: Add top-level source field for provenance tracking
      source: 'sql', // Facts-first SQL response from enumeration resolver
      trace: {
        enumeration: {
          route: enumResult.route,
          items_count: enumResult.items?.length ?? 1,
          sql_view: `v_${enumResult.route.replace('.', '_')}`
        }
      },
      debug: {
        humanizer: {
          applied: humanized.applied,
          plan: humanized.plan
        }
      },
      trace_id: `enum-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model: 'deterministic-sql'
    };

    log.event('orchestration_complete', {
      duration_ms: Date.now() - orchestrationStart,
      type: 'enumeration_response'
    });

    if (!req.stream) return response;
    if (res) {
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
    }
    return;
  }

  // v10.5.2: Legacy SAT-only enumeration block disabled - now using unified intent classification
  // All fact queries (awards, testing, ECs, programs) now route through classifyIntent() → resolvers
  /*
  // SECOND: Check if this is an enumeration query V2 (facts-first from derived CSVs) - SAT only
  if (isEnumerationQueryV2(req.message)) {
    const sessionId = await ensureSession(req.session_id, req.student_id);

    const enumerationResult = await routeEnumerationQueryV2(pool, req.message, req.student_id);

    if (enumerationResult) {
      log.event('orchestration_complete', {
        duration_ms: Date.now() - orchestrationStart,
        type: 'enumeration_response',
        enumeration_type: enumerationResult.meta.enumeration_type
      });

      const dedupedAnswer = deduplicateAnswer(enumerationResult.answer);

      // v10.5.1: Build compact facts block for humanizer (avoids duplication)
      const enumFacts = factsBlockForEnumeration(enumerationResult.meta?.enumeration_type || "enumeration", enumerationResult);

      // v10.4: Apply humanizer (Cat-1: SQL facts) with feature flag
      const humanized = HUMANIZER_ENABLED
        ? await humanize({
            route: 'sql',
            studentId: req.student_id,
            intent: enumerationResult.meta.enumeration_type,
            raw: dedupedAnswer,
            sqlBlock: enumFacts // compact facts
          })
        : { ...NO_HUMANIZE, text: dedupedAnswer };

      const response = {
        answer: humanized.text,
        session_id: sessionId,
        hits: [], // No RAG needed for enumerations
        vitals: await fetchVitals(req.student_id),
        chips: enumerationResult.chips,
        trace: {
          enumeration: enumerationResult.meta,
          ...enumerationResult.trace
        },
        debug: {
          humanizer: {
            applied: humanized.applied,
            plan: humanized.plan
          }
        },
        trace_id: `enum-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        model: 'enumeration_facts'
      };

      await storeMessage(sessionId, { role: 'user', content: req.message });
      await storeMessage(sessionId, { role: 'assistant', content: humanized.text });

      if (!req.stream) return response;

      // For streaming
      if (res) {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
      }
      return;
    }
  }
  */
  
  // Check if this is a temporal fact query
  const isTemporalFactQuery = shouldUseTemporalFacts(req.message);
  
  if (isTemporalFactQuery) {
    // Extract temporal intent
    const intent = extractTemporalIntent(req.message);
    
    log.event('temporal_intent_detected', {
      message_preview: req.message?.slice(0, 120),
      kind: intent.kind,
      operator: intent.operator,
      nth: intent.nth,
      official_only: intent.official_only
    });
    
    const sessionId = await ensureSession(req.session_id, req.student_id);
    
    try {
      // Resolve using UTFA
      const result = await resolveTemporalFact(pool, {
        student_id: req.student_id,
        kind: intent.kind!,
        operator: intent.operator!,
        nth: intent.nth,
        asof_date: intent.asof_date,
        official_only: intent.official_only
      });
      
      // Format the answer
      const rawAnswer = formatTemporalFactResult(result, intent.kind!);
      const dedupedAnswer = deduplicateAnswer(rawAnswer);

      // v10.5.1: Build compact temporal facts block for humanizer (avoids duplication)
      const utfaFacts = factsBlockForUTFA(result);

      // v10.4: Apply humanizer (Cat-1: UTFA SQL facts) with feature flag
      const humanized = HUMANIZER_ENABLED
        ? await humanize({
            route: 'sql',
            studentId: req.student_id,
            intent: `${intent.operator}_${intent.kind}`,
            raw: dedupedAnswer,
            sqlBlock: utfaFacts // compact temporal facts
          })
        : { ...NO_HUMANIZE, text: dedupedAnswer };

      // Build evidence chips
      const chips = result.facts
        .filter(f => f.source_id && f.source_id !== 'superscore')
        .map(f => ({ id: f.source_id, type: 'source' }))
        .filter((chip, index, self) =>
          index === self.findIndex(c => c.id === chip.id)
        );

      // Build trace with UTFA details
      const trace = {
        utfa: {
          intent: intent,
          sql_function: result.trace.sql_function,
          rows_returned: result.trace.rows_returned,
          took_ms: result.trace.took_ms,
          facts: result.facts.map(f => ({
            value: f.value_numeric || f.value_text,
            date: f.event_date,
            official: f.is_official,
            confidence: f.confidence,
            source: f.source_id
          }))
        }
      };

      log.event('utfa_resolution_complete', {
        kind: intent.kind,
        operator: intent.operator,
        facts_found: result.facts.length,
        duration_ms: result.trace.took_ms,
        humanizer: humanized.applied
      });

      // Return structured response
      const response = {
        answer: humanized.text,
        session_id: sessionId,
        hits: [], // No RAG needed for pure temporal facts
        vitals: await fetchVitals(req.student_id),
        chips,
        // v11.2.2: Add top-level source field for provenance tracking
        source: 'sql', // UTFA temporal facts use SQL views
        trace,
        debug: {
          humanizer: {
            applied: humanized.applied,
            plan: humanized.plan
          }
        },
        trace_id: `utfa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        model: 'utfa' // Universal Temporal Facts Architecture
      };

      await storeMessage(sessionId, { role: 'user', content: req.message });
      await storeMessage(sessionId, { role: 'assistant', content: humanized.text });
      
      log.event('orchestration_complete', {
        duration_ms: Date.now() - orchestrationStart,
        type: 'utfa_temporal_response'
      });
      
      if (!req.stream) return response;
      
      // For streaming, send the response
      if (res) {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
      }
      return;
      
    } catch (error: any) {
      log.error('UTFA resolution failed', { error: error.message });
      // Fall through to standard flow if temporal resolution fails
    }
  }
  
  // Check if this is a standard factual query (non-temporal)
  const detectedKinds = detectFactKinds(req.message);
  const isFactQuery = detectedKinds.length > 0 && !isTemporalFactQuery;
  
  log.event('intent_detection', {
    message_preview: req.message?.slice(0, 120),
    is_fact_query: isFactQuery,
    is_temporal_fact: isTemporalFactQuery,
    detected_kinds: detectedKinds
  });
  
  const sessionId = await ensureSession(req.session_id, req.student_id);
  
  // Non-temporal fact query: Use canonical facts
  if (isFactQuery) {
    // [Keep existing canonical facts logic from agentChat-canonical.ts]
    // ... existing code ...
  }
  
  // Non-factual query: Use standard RAG + LLM flow
  const [recent, vitals] = await Promise.all([
    getRecentMessages(sessionId, 12),
    fetchVitals(req.student_id)
  ]);
  
  const hits = await hybridSearch(req.message, req.student_id);
  
  // Important: Pass policy to prevent LLM from hallucinating temporal facts
  const systemContext = {
    temporal_fact_policy: `CRITICAL: You must NEVER state specific temporal facts (first/second/last SAT scores, dates, sequences).
    If the user asks for temporal information (first, second, last, all scores), tell them I need to use the proper query for that.
    You can discuss strategies and reference evidence, but no temporal fact assertions.`,
    canonical_fact_policy: `You must NEVER state specific numbers, scores, dates, or factual claims. 
    If the user asks for specific facts, tell them to ask directly for that fact.`
  };
  
  // v11.1: Determine route BEFORE compose for adapter routing
  // Cat-2: KB/RAG if hits > 0 (evidence-driven)
  // Cat-3: FT/EQ if using fine-tuned model OR no hits (coaching/warmth)
  const hasEvidence = hits?.length > 0;
  const route = hasEvidence ? 'kb' : 'eq';

  const composed = await composeAnswer({
    message: req.message,
    vitals,
    hits,
    memory: { recent },
    model: req.model,
    use_ft: req.use_ft,
    stream: req.stream,
    res,
    systemContext,
    // v11.1: Pass adapter parameters for CAT-2/CAT-3 model selection
    intent: 'kb_query',
    studentId: req.student_id,
    route
  });

  // Apply deduplication to LLM-generated answers too
  const dedupedAnswer = deduplicateAnswer(composed.answer);

  // v10.4: Apply humanizer (Cat-2/Cat-3) with feature flag
  const humanized = HUMANIZER_ENABLED
    ? await humanize({
        route,
        studentId: req.student_id,
        intent: 'kb_query',
        raw: dedupedAnswer,
        evidence: { passages: hits?.map((h: any) => ({ text: h.text, source: h.source })) }
      })
    : { ...NO_HUMANIZE, text: dedupedAnswer };

  await storeMessage(sessionId, { role: 'user', content: req.message });
  await storeMessage(sessionId, { role: 'assistant', content: humanized.text });

  // v11.1: Register proof for CAT-2/CAT-3 answers (NOT CAT-1 SQL)
  // CAT-1 (SQL) responses are fact-verified by design, no proof needed
  // CAT-2 (KB/RAG): register with chip_id linkage if available
  // CAT-3 (EQ): register coaching/warmth artifacts
  let proofRecord = null;
  const traceId = `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    if (route === 'kb' || route === 'eq') {
      const chipIds = hits?.map((h: any) => h.chip_id).filter(Boolean) || [];

      proofRecord = await registerProof({
        artifact_id: traceId,
        chip_id: chipIds.length > 0 ? chipIds[0] : undefined, // Use first chip as primary proof
        content: humanized.text,
        artifact_type: route === 'kb' ? 'kb_answer' : 'eq_answer',
        metadata: {
          route,
          session_id: sessionId,
          student_id: req.student_id,
          intent: 'kb_query',
          chip_count: chipIds.length,
          chip_ids: chipIds,
          timestamp: new Date().toISOString(),
          source_id: hits?.[0]?.source,
          citation: hits?.[0]?.text?.substring(0, 100) // First 100 chars as citation
        }
      });

      log.event('proof_registered_for_answer', {
        artifact_id: traceId,
        route,
        score: proofRecord.score,
        verified: proofRecord.verified,
        chip_count: chipIds.length
      });
    }
  } catch (proofErr) {
    // Don't fail the request if proof registration fails
    log.error('proof_registration_failed_non_blocking', {
      error: String(proofErr),
      route
    });
  }

  const payload = {
    answer: humanized.text,
    session_id: sessionId,
    hits,
    vitals,
    // v11.2.2: Add top-level source field for provenance tracking
    source: route, // 'kb' or 'eq' based on evidence availability
    debug: {
      route,
      humanizer: {
        applied: humanized.applied,
        plan: humanized.plan
      },
      // v11.1: Include adapter metadata for observability
      adapter: composed.__adapter,
      // v11.1: Include proof metadata if registered
      proof: proofRecord ? {
        score: proofRecord.score,
        verified: proofRecord.verified,
        hash: proofRecord.hash,
        artifact_id: proofRecord.artifact_id
      } : undefined
    },
    trace_id: traceId,
    model: composed.model,
    // v11.1: Model badge for UI display
    model_badge: composed.__adapter?.badge
  };

  log.event('orchestration_complete', {
    duration_ms: Date.now() - orchestrationStart,
    type: 'rag_llm_response',
    route,
    humanizer: humanized.applied
  });

  if (!req.stream) return payload;
}