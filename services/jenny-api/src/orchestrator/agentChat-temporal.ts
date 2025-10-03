import { fetchVitals, detectFactKinds } from '../services/facts-canonical.js';
import { extractTemporalAndModality } from './intent.js';
import { resolveFact } from '../services/facts.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { composeAnswer } from '../compose/compose.js';
import { ensureSession, getRecentMessages, storeMessage } from '../services/sessions.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { pool } from '../db/pool.js';

const log = createLogger('orchestrator-temporal');

export async function agentChat(req: any, res?: any) {
  const orchestrationStart = Date.now();
  
  console.log('[TEMPORAL] agentChat called with:', req.message);

  // Detect if this is a factual query
  const detectedKinds = detectFactKinds(req.message);
  const isFactQuery = detectedKinds.length > 0;

  // Extract temporal and modality qualifiers
  const { temporal, modality } = extractTemporalAndModality(req.message);
  
  console.log('[TEMPORAL] Detected temporal:', temporal, 'modality:', modality);

  log.event('intent_detection', {
    message_preview: req.message?.slice(0, 120),
    is_fact_query: isFactQuery,
    detected_kinds: detectedKinds,
    temporal,
    modality
  });

  const sessionId = await ensureSession(req.session_id, req.student_id);

  // If it's a fact query, use temporal-aware resolution
  if (isFactQuery) {
    const factResults = [];
    const chips = [];
    const trace = {
      temporal_facts: {
        temporal,
        modality,
        resolved: {}
      }
    };

    // Resolve each fact with temporal awareness
    for (const kind of detectedKinds) {
      console.log('[TEMPORAL] Resolving fact:', kind, 'with temporal:', temporal ?? 'latest');
      
      const { row, why } = await resolveFact(pool, {
        student_id: req.student_id,
        kind,
        temporal: temporal ?? 'latest',
        modality: modality ?? 'any'
      });
      
      console.log('[TEMPORAL] Resolved fact:', row?.value, 'date:', row?.fact_date);

      if (row) {
        // Format the answer based on the kind
        let answer = '';
        if (kind === 'sat_total_score') {
          answer = `Your SAT total score is **${row.numeric_value ?? row.value}** (recorded ${new Date(row.fact_date).toLocaleDateString()}, confidence: ${row.confidence}${row.modality && row.modality !== 'any' ? `, ${row.modality}` : ''})`;
        } else if (kind === 'act_composite') {
          answer = `Your ACT composite score is **${row.numeric_value ?? row.value}** (recorded ${new Date(row.fact_date).toLocaleDateString()}, confidence: ${row.confidence}${row.modality && row.modality !== 'any' ? `, ${row.modality}` : ''})`;
        } else {
          // Generic format for other facts
          const readableKind = kind.replace(/_/g, ' ');
          answer = `Your ${readableKind} is **${row.value}** (recorded ${new Date(row.fact_date).toLocaleDateString()}, confidence: ${row.confidence})`;
        }
        
        factResults.push(answer);
        chips.push({ id: row.source_id, type: 'source' });
        trace.temporal_facts.resolved[kind] = {
          value: row.numeric_value ?? row.value,
          date: row.fact_date,
          source: row.source_id,
          why
        };
      } else {
        factResults.push(`I don't have a ${kind.replace(/_/g, ' ')} on record yet.`);
        trace.temporal_facts.resolved[kind] = { why };
      }
    }

    const finalAnswer = factResults.join('\n\n');

    log.event('temporal_facts_resolved', {
      kinds_requested: detectedKinds,
      temporal,
      modality,
      facts_found: Object.keys(trace.temporal_facts.resolved).filter(k => trace.temporal_facts.resolved[k].value).length
    });

    // For fact queries, return immediately without calling LLM
    const response = {
      answer: finalAnswer,
      session_id: sessionId,
      hits: [], // No RAG hits needed for pure fact queries
      vitals: await fetchVitals(req.student_id), // Include all vitals for context
      chips,
      trace,
      trace_id: `temporal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model: 'temporal_facts' // Indicate this came from temporal resolver
    };

    await storeMessage(sessionId, { role: 'user', content: req.message });
    await storeMessage(sessionId, { role: 'assistant', content: finalAnswer });

    log.event('orchestration_complete', {
      duration_ms: Date.now() - orchestrationStart,
      type: 'temporal_fact_response'
    });

    if (!req.stream) return response;
    return;
  }

  // Non-factual query: Use standard RAG + LLM flow
  const [recent, vitals] = await Promise.all([
    getRecentMessages(sessionId, 12),
    fetchVitals(req.student_id)
  ]);

  const hits = await hybridSearch(req.message, req.student_id);

  // Important: Pass canonical fact policy to LLM
  const systemContext = {
    canonical_fact_policy: `IMPORTANT: You must NEVER state specific numbers, scores, dates, or factual claims. 
    If the user asks for specific facts (SAT scores, GPA, dates, etc.), tell them to ask directly for that fact.
    You can discuss strategies, provide guidance, and reference the evidence provided, but no numeric assertions.`
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

  await storeMessage(sessionId, { role: 'user', content: req.message });
  await storeMessage(sessionId, { role: 'assistant', content: composed.answer });

  const payload = {
    answer: composed.answer,
    session_id: sessionId,
    hits,
    vitals,
    trace_id: `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    model: composed.model
  };

  log.event('orchestration_complete', {
    duration_ms: Date.now() - orchestrationStart,
    type: 'rag_llm_response'
  });

  if (!req.stream) return payload;
}