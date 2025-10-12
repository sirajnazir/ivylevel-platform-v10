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
import { transcript, gpa, overview, vitals } from '../resolvers/academics.js';
import { ivyscore, readiness } from '../resolvers/readiness.js';
import { collegeList } from '../resolvers/college.js';
import { gameplan } from '../resolvers/gameplan.js';
// v10.2-v10.5.1: BROKEN compat resolvers (queried bad vital_facts)
// import { awards, ecs, programs, academics, progression } from '../resolvers/compat.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { composeAnswer } from '../compose/compose.js';
import { ensureSession, getRecentMessages, storeMessage } from '../services/sessions.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { pool } from '../db/pool.js';
// v10.4: Humanizer v2.1 - Jenny's Real Voice across all categories
import { humanize, type HumanizeOutput } from '../lib/humanizer.js';
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

function factsBlockForEnumeration(route: string, result: any): string {
  // Build terse, source-friendly lines from enumeration payloads
  let items = result.items ?? (result.item ? [result.item] : []);
  if (!items?.length) return "";

  // v10.5.4: Apply universal deduplication before building facts block
  items = deduplicateEnumItems(items, route);

  if (route.startsWith("awards.final")) {
    return items.map((r: any) =>
      `award: ${r.award_name}${r.won_date ? ` | date: ${r.won_date}` : ""}${r.source_id ? ` | src: ${r.source_id}` : ""}`
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
  const normalize = (str: string) => {
    if (typeof str !== 'string') return '';
    return str.toLowerCase()
      .replace(/&/g, 'and')           // Convert & to and
      .replace(/[—\-\s]+/g, ' ')      // Normalize dashes/spaces
      .replace(/\s+/g, ' ')           // Collapse multiple spaces
      .trim();
  };

  // Group items by normalized name + date (where applicable)
  const seen = new Map<string, any>();

  for (const item of items) {
    const name = item[nameField] || '';
    const date = item.won_date || item.event_date || item.submit_date || item.decision_date || item.as_of || '';

    // Create composite key: normalized_name + date
    const normalizedName = normalize(name);
    const key = `${normalizedName}|${date}`;

    if (!seen.has(key)) {
      // First occurrence - add to map
      seen.set(key, item);
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

      if (getPriority(newSource) < getPriority(existingSource)) {
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
  let list  = result.items ?? (result.item ? [result.item] : []);

  // v10.5.4: Apply universal deduplication to remove duplicate entries
  list = deduplicateEnumItems(list, route);
  const lines = list.map((r: any, i: number) => {
    if (route.startsWith('ecs.')) {
      return `${i+1}. ${r.activity_name}${r.category ? ` (${r.category})` : ''}${
        r.submit_date ? ` — submitted ${r.submit_date}` : r.event_date ? ` — started ${r.event_date}` : ''}`;
    }
    if (route.startsWith('awards.final')) {
      return `${i+1}. ${r.award_name}${r.won_date ? ` (${r.won_date})` : ''}${r.tier ? ` — ${r.tier}` : ''}`;
    }
    if (route.startsWith('awards.initial')) {
      return `${i+1}. ${r.award_name}${r.tier ? ` — ${r.tier}` : ''}${r.as_of ? ` (as of ${r.as_of})` : ''}`;
    }
    if (route.startsWith('program.')) {
      if (route.endsWith('decisions')) {
        return `${i+1}. ${r.program_name}${r.decision ? ` — ${r.decision}` : ''}${
          r.decision_date ? ` (${r.decision_date})` : ''}`;
      }
      return `${i+1}. ${r.program_name}${r.submit_date ? ` — submitted ${r.submit_date}` : ''}`;
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
    case 'academics.gpa.initial':     return { kind: 'enum', route, item:  await gpa.initial(pg, studentId) };
    case 'academics.gpa.final':       return { kind: 'enum', route, item:  await gpa.final(pg, studentId) };
    case 'academics.gpa.latest':      return { kind: 'enum', route, item:  await gpa.latest(pg, studentId) };
    case 'academics.gpa.progression': return { kind: 'enum', route, items: await gpa.progression(pg, studentId) };

    // vitals from academics.ts resolver
    case 'academics.vitals.latest':   return { kind: 'enum', route, item:  await vitals.latest(pg, studentId) };
    case 'academics.vitals.trend':    return { kind: 'enum', route, item:  null };
    case 'academics.vitals.events':   return { kind: 'enum', route, items: [] };

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

    // Game Plan from gameplan.ts resolver (v10.5.2)
    case 'gameplan.summary_initial':  return { kind: 'enum', route, item:  await gameplan.summaryInitial(pg, studentId) };
    case 'gameplan.vs_execution':     return { kind: 'enum', route, items: await gameplan.vsExecution(pg, studentId) };
    case 'gameplan.plan_events':      return { kind: 'enum', route, items: await gameplan.planEvents(pg, studentId) };
  }
  return null;
}

export async function agentChat(req: any, res?: any) {
  const orchestrationStart = Date.now();

  // FIRST: Check universal enumerations (Awards, ECs, Narrative, Programs)
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

    // Compose deterministic list answer with chips
    const chips = (enumResult.items ?? [enumResult.item]).filter(Boolean).map((r: any) => ({
      chip_table: r.chip_table ?? inferChipTableFromRoute(enumResult.route),
      chip_id:    r.chip_id,
      source_id:  r.source_id
    }));

    const rawAnswer = composeEnumText(enumResult);
    const dedupedAnswer = deduplicateAnswer(rawAnswer);

    // v10.5.1: Build compact facts block for humanizer (avoids duplication)
    const enumFacts = factsBlockForEnumeration(enumResult.route, enumResult);

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
  
  const composed = await composeAnswer({
    message: req.message,
    vitals,
    hits,
    memory: { recent },
    model: req.model,
    use_ft: req.use_ft,
    stream: req.stream,
    res,
    systemContext
  });

  // Apply deduplication to LLM-generated answers too
  const dedupedAnswer = deduplicateAnswer(composed.answer);

  // v10.4: Determine route for humanizer (Cat-2 KB/RAG vs Cat-3 FT/EQ)
  // Cat-2: KB/RAG if hits > 0 (evidence-driven)
  // Cat-3: FT/EQ if using fine-tuned model OR no hits (coaching/warmth)
  const isFinetuned = composed.model?.includes('ft:') || req.use_ft;
  const hasEvidence = hits?.length > 0;
  const route = hasEvidence ? 'kb' : (isFinetuned ? 'llm' : 'kb');

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

  const payload = {
    answer: humanized.text,
    session_id: sessionId,
    hits,
    vitals,
    debug: {
      route,
      humanizer: {
        applied: humanized.applied,
        plan: humanized.plan
      }
    },
    trace_id: `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    model: composed.model
  };

  log.event('orchestration_complete', {
    duration_ms: Date.now() - orchestrationStart,
    type: 'rag_llm_response',
    route,
    humanizer: humanized.applied
  });

  if (!req.stream) return payload;
}