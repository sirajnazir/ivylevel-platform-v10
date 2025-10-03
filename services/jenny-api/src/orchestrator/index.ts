import { getStudentVitals } from '../services/facts.js';
import { hybridSearch } from './hybridSearch.js';
import { reRank } from './reRank.js';
import { evidenceChipsFromHits } from './evidenceChips.js';
import { queryRewrite } from './queryRewrite.js';
import { composeAnswer } from './composer.js';
import { embed } from './embeddings.js';
import { HttpError } from '../utils/errors.js';
import type { Request, Response } from 'express';

export async function orchestrateUserQuery(inputQ: string, opts: { student_id: string }, ctx?: { req?: Request; res?: Response }){
  // Get trace from response locals if available
  const t = ctx?.res?.locals?.trace;
  
  // 1) Vitals‑first
  const vStart = Date.now();
  const vitals = await getStudentVitals(opts.student_id);
  await t?.event('vitals', { 
    facts: vitals.facts?.length || 0,
    hasSourceBackedFacts: vitals.facts?.some(f => f.source_id) || false
  }, Date.now() - vStart);

  // hard guardrail: if we have zero source-backed facts, refuse factual composition
  const hasEvidence = Array.isArray(vitals.facts) && vitals.facts.some(f => f.source_id);
  if (!hasEvidence) {
    await t?.fail('no_source_backed_facts');
    throw new HttpError(412, 'no_source_backed_facts');
  }

  // 2) Rewrite
  const rwStart = Date.now();
  const { q, filters } = queryRewrite(inputQ, { student_id: opts.student_id });
  await t?.event('rewrite', { 
    original: inputQ, 
    rewritten: q, 
    filters 
  }, Date.now() - rwStart);
  await t?.artifact('rewritten_query', { q, filters });

  // 3) Hybrid search
  const hStart = Date.now();
  const hits = await hybridSearch(q, filters, embed);
  const jtbdHits = hits.filter(h => h.namespace === 'jtbd');
  const interHits = hits.filter(h => h.namespace === 'interactions');
  
  await t?.event('hybrid.search', { 
    total_hits: hits.length,
    jtbd_hits: jtbdHits.length, 
    inter_hits: interHits.length 
  }, Date.now() - hStart);
  
  // Log Pinecone specifics
  await t?.event('pinecone', {
    namespaces: ['jtbd', 'interactions'],
    topK: 5,
    jtbd_sample: jtbdHits.slice(0, 3).map(h => ({ id: h.id, score: h.score })),
    inter_sample: interHits.slice(0, 3).map(h => ({ id: h.id, score: h.score }))
  });

  // 4) Re‑rank
  const rrStart = Date.now();
  const reranked = reRank(hits, q);
  await t?.event('rerank', { 
    input_hits: hits.length,
    output_hits: reranked.length,
    top_hits: reranked.slice(0, 5).map(h => ({ 
      id: h.id, 
      ns: h.namespace, 
      score: h.score 
    })) 
  }, Date.now() - rrStart);

  // 5) Evidence chips
  const evStart = Date.now();
  const chips = await evidenceChipsFromHits(reranked.slice(0, 12));
  await t?.event('evidence', { 
    chips_count: chips.length,
    chip_ids: chips.map(c => c.id || c.source_id).filter(Boolean)
  }, Date.now() - evStart);

  // 6) Compose (reject if facts are missing sources? — caller enforces)
  const narrativeSnippets = reranked.slice(0, 6).map(h => h.text);
  
  const model = ctx?.req?.body?.llm_model || process.env.JENNY_LLM_MODEL || 'gpt-4o-mini';
  const cStart = Date.now();
  await t?.event('compose.start', { 
    model,
    facts_count: vitals.facts?.length || 0,
    narrative_snippets: narrativeSnippets.length,
    chips_count: chips.length
  });
  
  const answer = await composeAnswer(inputQ, vitals, narrativeSnippets, chips, { model });
  const cDur = Date.now() - cStart;
  
  // Extract usage if available from composer response
  const usage = (answer as any)?.usage || (answer as any)?.meta?.usage;
  await t?.event('compose.end', { 
    latency_ms: cDur, 
    usage,
    answer_length: answer?.length || 0
  }, cDur);
  
  await t?.artifact('answer_preview', { 
    text: String(answer || '').slice(0, 512) 
  });

  // Return with optional metadata
  const result = { 
    answer, 
    vitals, 
    chips, 
    hits: reranked.slice(0, 20),
    meta: {
      trace_id: t?.trace_id,
      model,
      usage
    }
  };
  
  // Update trace with token usage
  await t?.finish(true, usage);
  
  return result;
}