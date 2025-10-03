import { fetchVitals, resolveFacts, detectFactKinds, formatFactAnswer } from '../services/facts-canonical.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { composeAnswer } from '../compose/compose.js';
import { ensureSession, getRecentMessages, storeMessage } from '../services/sessions.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('orchestrator-canonical');

export async function agentChat(req: any, res?: any) {
  const orchestrationStart = Date.now();

  // Detect if this is a factual query
  const detectedKinds = detectFactKinds(req.message);
  const isFactQuery = detectedKinds.length > 0;

  log.event('intent_detection', {
    message_preview: req.message?.slice(0, 120),
    is_fact_query: isFactQuery,
    detected_kinds: detectedKinds
  });

  const sessionId = await ensureSession(req.session_id, req.student_id);

  // If it's a fact query, resolve canonical facts first
  if (isFactQuery) {
    const canonicalFacts = await resolveFacts(req.student_id, detectedKinds);
    
    // Build fact-based answer
    const factAnswers = detectedKinds
      .map(kind => {
        const fact = canonicalFacts[kind];
        if (!fact) {
          return `I don't have a validated ${kind.replace(/_/g, ' ')} on record yet.`;
        }
        return formatFactAnswer(fact);
      })
      .join('\n\n');

    // Add evidence chips
    const chips = Object.values(canonicalFacts)
      .filter(f => f?.source_id)
      .map(f => ({ id: f.source_id, type: 'source' }));

    // Add selection reasons for transparency
    const trace = {
      canonical_facts: Object.entries(canonicalFacts).reduce((acc, [kind, fact]) => {
        if (fact) {
          acc[kind] = {
            value: fact.normalized_value,
            reason: fact.selection_reason
          };
        }
        return acc;
      }, {} as any)
    };

    log.event('canonical_facts_resolved', {
      kinds_requested: detectedKinds,
      kinds_found: Object.keys(canonicalFacts).filter(k => canonicalFacts[k])
    });

    // For fact queries, return immediately without calling LLM
    const response = {
      answer: factAnswers,
      session_id: sessionId,
      hits: [], // No RAG hits needed for pure fact queries
      vitals: await fetchVitals(req.student_id), // Include all vitals for context
      chips,
      trace,
      trace_id: `cff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Add trace ID
      model: 'canonical_facts' // Indicate this came from CFF
    };

    await storeMessage(sessionId, { role: 'user', content: req.message });
    await storeMessage(sessionId, { role: 'assistant', content: factAnswers });

    log.event('orchestration_complete', {
      duration_ms: Date.now() - orchestrationStart,
      type: 'canonical_fact_response'
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
    trace_id: `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Add trace ID
    model: composed.model
  };

  log.event('orchestration_complete', {
    duration_ms: Date.now() - orchestrationStart,
    type: 'rag_llm_response'
  });

  if (!req.stream) return payload;
}