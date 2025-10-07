/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";
import { getPinecone, loadPineEnv } from "../lib/pineconeClient.js";
import type { Pool } from 'pg';
import { spawn } from 'child_process';
import path from 'path';

// ===== Config & types =====
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-large";
const TOP_K = parseInt(process.env.KB_TOP_K || "12", 10);
const SCORE_FLOOR = parseFloat(process.env.KB_SCORE_FLOOR || "0.55");
const RETURN_K = parseInt(process.env.KB_RETURN_K || "6", 10);

const DIVERSIFY_BY_DOC = (process.env.KB_DIVERSITY_BY_DOC || "true") === "true";
const DIVERSIFY_BY_WEEK = (process.env.KB_DIVERSITY_BY_WEEK || "true") === "true";

export type Facets = Partial<{
  award: string;
  framework: string;
  activity: string;
  coach_move: string;
  phase: string;
  week: string | number;
  tags: string[];
}>;

export type Hit = {
  id: string;
  score?: number;
  metadata?: Record<string, any>;
};

export type KBResult = {
  answer: string;
  chips: Array<{ kind: string; text: string; chip_id?: string }>;
  hits: Hit[];
};

// ===== Utilities =====
const ensureArray = <T>(v: T | T[] | undefined | null): T[] =>
  Array.isArray(v) ? v : v ? [v] : [];

const buildPineconeFilter = (f: Facets) => {
  const filter: Record<string, any> = {};
  if (f.award) filter.award = f.award;
  if (f.framework) filter.framework = f.framework;
  if (f.activity) filter.activity = f.activity;
  if (f.coach_move) filter.coach_move = f.coach_move;
  if (f.phase) filter.phase = f.phase;
  if (f.week) filter.week = typeof f.week === 'number' ? f.week : parseFloat(f.week);
  if (f.tags && f.tags.length) filter.tags = { $in: f.tags };
  return Object.keys(filter).length ? filter : undefined;
};

// Simple diversifier: drop near-duplicates across doc_id & week; prefer chip type variety
const diversify = (hits: Hit[], max: number): Hit[] => {
  const seenDoc = new Set<string>();
  const seenWeek = new Set<string>();
  const kept: Hit[] = [];
  const typeCounts: Record<string, number> = {};

  for (const h of hits) {
    if (!h.metadata) continue;
    const doc = (h.metadata.doc_id || h.metadata.source_id || h.metadata.item_id || "").toString();
    const wk = (h.metadata.week || "").toString();
    const chip = (h.metadata.chip_type || "unknown").toString();

    if (DIVERSIFY_BY_DOC && doc && seenDoc.has(doc)) continue;
    if (DIVERSIFY_BY_WEEK && wk && seenWeek.has(wk)) continue;

    // limit each chip_type to avoid spam
    if (!typeCounts[chip]) typeCounts[chip] = 0;
    if (typeCounts[chip] >= 3) continue;

    kept.push(h);
    if (doc) seenDoc.add(doc);
    if (wk) seenWeek.add(wk);
    typeCounts[chip]++;

    if (kept.length >= max) break;
  }
  return kept;
};

const formatAnswerPlan = (q: string, filters: Facets, hits: Hit[]) => {
  if (!hits.length) {
    const ftxt = Object.entries(filters || {})
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(",") : v}`)
      .join(", ");
    return [
      `I couldn't find verified intel for this query${ftxt ? ` (filters: ${ftxt})` : ""}.`,
      `**Closest next steps**`,
      `• I can widen filters or switch to general guidance (no KB evidence).`,
      `• Or specify an award/framework/activity to sharpen results.`,
    ].join("\n");
  }

  const actions: string[] = [];
  const whys: string[] = [];
  const artifacts: string[] = [];

  for (const h of hits) {
    const m = h.metadata || {};
    const title =
      m.title ||
      m.tactic_name ||
      m.framework ||
      m.activity ||
      m.award ||
      m.coach_move ||
      m.chip_type ||
      "Coaching insight";

    const snippet = m.snippet || m.preview || m.text || m.summary || "";
    const phase = m.phase ? ` · ${m.phase}` : "";
    const week = m.week ? ` · Week ${m.week}` : "";
    const source = m.doc_id || m.source || m.file_name || m.filename || "";

    // Build one action line
    if (m.coach_move && m.coach_move !== 'None') {
      actions.push(`• Apply **${m.coach_move}** on your current work (${title}).`);
    } else if (m.tactic_name) {
      actions.push(`• Run **${m.tactic_name}** (${title}).`);
    } else if (m.framework && m.framework !== 'None') {
      actions.push(`• Re-run **${m.framework}** framework on this week's plan.`);
    } else {
      actions.push(`• Use: **${title}**.`);
    }

    // Why this works (evidence)
    if (snippet && snippet.length > 20) {
      const shortSnippet = snippet.length > 200 ? snippet.substring(0, 200) + '...' : snippet;
      whys.push(`• _${shortSnippet}_  — **${title}**${phase}${week}`);
    } else {
      whys.push(`• Evidence: **${title}**${phase}${week}${source ? ` — ${source}` : ""}`);
    }

    // Artifacts
    const art = ensureArray(m.artifacts).slice(0, 2);
    if (art.length) {
      for (const a of art) artifacts.push(`• ${a}`);
    } else {
      // sensible generic artifact
      if (m.coach_move === "essay_surgery") {
        artifacts.push("• Submit a redline diff (before/after) showing voice/stakes/arc improvements.");
      } else if (m.framework === "168") {
        artifacts.push("• Upload your reallocated 168-hour grid + guardrails for distractions.");
      } else if (m.activity && m.activity !== 'None') {
        artifacts.push(`• Add a proof artifact for "${m.activity}" (growth chart or outreach log).`);
      }
    }
  }

  // Dedup & trim sections
  const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 4);
  const topActions = uniq(actions);
  const topWhys = uniq(whys);
  const topArtifacts = uniq(artifacts);

  const header =
    `**What you should do next (7 days)**\n` +
    (topActions.length ? topActions.join("\n") : "• Prioritize: execute 1–2 high-impact tactics this week.");

  const why =
    `\n\n**Why this works (from your KB)**\n` +
    (topWhys.length ? topWhys.join("\n") : "• Returning results lacked clean snippets, but are high-confidence.");

  const arts =
    `\n\n**Artifacts to produce**\n` +
    (topArtifacts.length ? topArtifacts.join("\n") : "• Post proof-of-work (doc link, screenshot, outreach log).");

  return `${header}${why}${arts}`;
};

// ===== FAISS Fallback (legacy path) =====
async function searchFAISS(
  query: string,
  k: number = 5,
  chipTypeFilter?: string
): Promise<Hit[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../../../../tools/ingest/query_kb.py');
    const args = [scriptPath, query, '--top', k.toString(), '--json'];

    if (chipTypeFilter) {
      args.push('--type', chipTypeFilter);
    }

    const pythonProc = spawn('python3', args);

    let stdout = '';
    let stderr = '';

    pythonProc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProc.on('close', (code) => {
      if (code !== 0) {
        console.error('FAISS search failed:', stderr);
        reject(new Error(`FAISS search failed: ${stderr}`));
        return;
      }

      try {
        const results = JSON.parse(stdout);
        const hits: Hit[] = results.map((r: any) => ({
          id: r.chip_id,
          score: r.score,
          metadata: {
            chip_id: r.chip_id,
            chip_type: r.chip_type,
            title: r.title,
            summary: r.summary,
            tags: r.tags,
            domain: r.domain,
            filename: r.filename,
          }
        }));
        resolve(hits);
      } catch (err) {
        console.error('FAISS parse failed:', stdout, err);
        reject(new Error(`Failed to parse FAISS results: ${err}`));
      }
    });
  });
}

// ===== Core: Pinecone path or FAISS fallback =====
export async function resolveKBQuery(
  pg: Pool,
  studentId: string,
  userMessage: string,
  filters: Facets = {}
): Promise<KBResult> {
  // Try Pinecone first
  const pineEnv = loadPineEnv();
  const pine = getPinecone();

  // If Pinecone not configured, defer to FAISS
  if (!pine || !pineEnv.namespace) {
    console.log('KB: Falling back to FAISS (Pinecone not configured)');
    const faissHits = await searchFAISS(userMessage, TOP_K);
    const gated = faissHits.filter((h) => (h.score ?? 0) >= SCORE_FLOOR);
    const finalHits = diversify(gated, RETURN_K);

    return {
      answer: formatAnswerPlan(userMessage, filters, finalHits),
      chips: finalHits.map(h => ({
        kind: 'kb_chip',
        text: h.metadata?.chip_type || 'unknown',
        chip_id: h.id
      })),
      hits: finalHits,
    };
  }

  // ---- Pinecone path ----
  const index = process.env.PINECONE_INDEX_NAME || 'unknown';
  const ns = pineEnv.namespace || 'unknown';
  const filter = buildPineconeFilter(filters);

  console.log(`[KB] ✅ Pinecone resolver active | index: ${index} | namespace: ${ns} | filters: ${JSON.stringify(filter)} | scoreFloor: ${SCORE_FLOOR}`);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embedding = await openai.embeddings.create({
    input: userMessage,
    model: EMBED_MODEL,
  });
  const vector = embedding.data[0]?.embedding;
  if (!vector) {
    return {
      answer: formatAnswerPlan(userMessage, filters, []),
      chips: [{ kind: 'error', text: 'Failed to generate embedding' }],
      hits: [],
    };
  }

  // Pinecone query
  const queryNs = pine.index.namespace(pineEnv.namespace!);
  const res = await queryNs.query({
    vector,
    topK: TOP_K,
    includeMetadata: true,
    filter, // undefined if none
  } as any);

  // Normalize hits, apply score floor
  const rawHits: Hit[] =
    res.matches?.map((m: any) => ({
      id: m.id,
      score: typeof m.score === "number" ? m.score : undefined,
      metadata: m.metadata || {},
    })) ?? [];

  const scores = rawHits.map(h => h.score).filter(s => s !== undefined).sort((a, b) => b! - a!);
  console.log(`KB: Raw hits: ${rawHits.length}, scores: [${scores.slice(0, 5).map(s => s?.toFixed(3)).join(', ')}], after floor (${SCORE_FLOOR}): ${rawHits.filter(h => (h.score ?? 0) >= SCORE_FLOOR).length}`);

  const gated = rawHits.filter((h) => (h.score ?? 0) >= SCORE_FLOOR);

  // Lightweight diversity & cap
  const finalHits = diversify(gated, RETURN_K);

  console.log(`KB: Final hits after diversity: ${finalHits.length}`);

  // Format answer
  const answer = formatAnswerPlan(userMessage, filters, finalHits);

  return {
    answer,
    chips: finalHits.map(h => ({
      kind: 'kb_chip',
      text: h.metadata?.chip_type || 'unknown',
      chip_id: h.id
    })),
    hits: finalHits,
  };
}

// ===== Optional: text → facet heuristic (post-processor) =====
export function applyFacetHeuristics(text: string, filters: Facets = {}): Facets {
  const t = text.toLowerCase();

  const map: Array<[RegExp, keyof Facets, string]> = [
    [/ncwit/, "award", "NCWIT"],
    [/168(\s|-)?hour|168 framework/, "framework", "168"],
    [/empowering ai/, "activity", "Empowering AI"],
    [/essay surgery|redline/, "coach_move", "essay_surgery"],
    [/foundation/, "phase", "FOUNDATION"],
    [/building/, "phase", "BUILDING"],
    [/execution/, "phase", "EXECUTION"],
    [/folklift/, "activity", "Folklift"],
    [/synthoria/, "activity", "Synthoria"],
    [/calibrate scope/, "coach_move", "calibrate_scope"],
    [/deadline backplan/, "coach_move", "deadline_backplan"],
    [/motivation reframe/, "coach_move", "motivation_reframe"],
    [/stakeholder nav/, "coach_move", "stakeholder_nav"],
  ];

  const next = { ...filters };
  for (const [re, key, val] of map) {
    if (!next[key] && re.test(t)) next[key] = val as any;
  }
  return next;
}
