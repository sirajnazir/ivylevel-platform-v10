import { fetchVitals, resolveFacts, detectFactKinds, formatFactAnswer } from '../services/facts-canonical.js';
import { hybridSearchTraced } from '../retrieval/hybrid-traced.js';
import { composeAnswerTraced } from '../compose/compose-traced.js';
import { ensureSession, getRecentMessages, storeMessage } from '../services/sessions.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { Trace } from '../tracing/trace.js';
import { tracedPgQuery } from '../tracing/wrapped-clients.js';

const log = createLogger('orchestrator-traced');

export async function agentChatTraced(req: any, res?: any) {
  // Create trace for this query
  const trace = new Trace(
    req.session_id || 'anonymous',
    req.student_id || 'unknown',
    req.message
  );

  try {
    log.event('orchestration_start', {
      trace_id: trace.getId(),
      message_preview: req.message?.slice(0, 120)
    });

    // Step 1: Intent Detection
    const detectedKinds = await trace.wrap(
      'orchestrator',
      'intent_detection',
      async () => detectFactKinds(req.message),
      {
        extractMetadata: (kinds) => ({
          detected_count: kinds.length,
          fact_kinds: kinds
        })
      }
    );

    const isFactQuery = detectedKinds.length > 0;
    trace.setIntent(isFactQuery ? 'fact_query' : 'general_query', detectedKinds);

    log.event('intent_detected', {
      trace_id: trace.getId(),
      is_fact_query: isFactQuery,
      detected_kinds: detectedKinds
    });

    // Step 2: Session Management
    const sessionId = await trace.wrap(
      'orchestrator',
      'ensure_session',
      () => ensureSession(req.session_id, req.student_id),
      {
        api_provider: 'postgres',
        api_method: 'query'
      }
    );

    // Step 3: Route based on intent
    if (isFactQuery) {
      // Fact Query Path
      const canonicalFacts = await trace.wrap(
        'orchestrator',
        'resolve_canonical_facts',
        () => resolveFacts(req.student_id, detectedKinds),
        {
          api_provider: 'postgres',
          api_method: 'select_current_facts',
          extractMetadata: (facts) => ({
            resolved_count: Object.values(facts).filter(f => f).length,
            invalid_filtered: Object.values(facts).filter((f: any) => 
              f?.selection_reason?.includes('filtered')
            ).length
          })
        }
      );
      
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
      const traceMetadata = {
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

      // Fetch vitals for context
      const vitals = await trace.wrap(
        'orchestrator',
        'fetch_vitals',
        () => fetchVitals(req.student_id),
        {
          api_provider: 'postgres',
          api_method: 'query',
          extractMetadata: (result) => ({
            fact_count: result.facts?.length || 0
          })
        }
      );

      // Store messages
      await trace.wrap(
        'orchestrator', 
        'store_user_message',
        () => storeMessage(sessionId, { role: 'user', content: req.message }),
        { api_provider: 'postgres', api_method: 'insert' }
      );

      await trace.wrap(
        'orchestrator',
        'store_assistant_message', 
        () => storeMessage(sessionId, { role: 'assistant', content: factAnswers }),
        { api_provider: 'postgres', api_method: 'insert' }
      );

      // Set trace results
      trace.setFinalAnswer(factAnswers, 'canonical_facts');

      const response = {
        answer: factAnswers,
        session_id: sessionId,
        hits: [],
        vitals,
        chips,
        trace: traceMetadata,
        trace_id: trace.getId(),
        model: 'canonical_facts'
      };

      log.event('orchestration_complete', {
        trace_id: trace.getId(),
        duration_ms: Date.now() - trace['startTime'].getTime(),
        type: 'canonical_fact_response'
      });

      // Save trace
      await trace.save();

      if (!req.stream) return response;
      return;
    }

    // General Query Path - Use RAG + LLM
    const [recent, vitals] = await Promise.all([
      trace.wrap(
        'orchestrator',
        'get_recent_messages',
        () => getRecentMessages(sessionId, 12),
        {
          api_provider: 'postgres',
          api_method: 'query',
          extractMetadata: (messages) => ({ message_count: messages.length })
        }
      ),
      trace.wrap(
        'orchestrator',
        'fetch_vitals',
        () => fetchVitals(req.student_id),
        {
          api_provider: 'postgres',
          api_method: 'query',
          extractMetadata: (result) => ({ fact_count: result.facts?.length || 0 })
        }
      )
    ]);

    // Hybrid search with tracing
    const hits = await hybridSearchTraced(req.message, req.student_id, trace);

    // Compose with canonical fact policy
    const systemContext = {
      canonical_fact_policy: `IMPORTANT: You must NEVER state specific numbers, scores, dates, or factual claims. 
      If the user asks for specific facts (SAT scores, GPA, dates, etc.), tell them to ask directly for that fact.
      You can discuss strategies, provide guidance, and reference the evidence provided, but no numeric assertions.`
    };

    const composed = await composeAnswerTraced({
      message: req.message,
      vitals, 
      hits,
      memory: { recent }, 
      model: req.model, 
      use_ft: req.use_ft, 
      stream: req.stream, 
      res,
      systemContext,
      trace
    });

    // Store messages
    await trace.wrap(
      'orchestrator',
      'store_user_message',
      () => storeMessage(sessionId, { role: 'user', content: req.message }),
      { api_provider: 'postgres', api_method: 'insert' }
    );

    await trace.wrap(
      'orchestrator',
      'store_assistant_message',
      () => storeMessage(sessionId, { role: 'assistant', content: composed.answer }),
      { api_provider: 'postgres', api_method: 'insert' }
    );

    const payload = {
      answer: composed.answer,
      session_id: sessionId,
      hits,
      vitals,
      model: composed.model,
      trace_id: trace.getId()
    };

    log.event('orchestration_complete', {
      trace_id: trace.getId(),
      duration_ms: Date.now() - trace['startTime'].getTime(),
      type: 'rag_llm_response'
    });

    // Save trace
    await trace.save();

    if (!req.stream) return payload;

  } catch (error: any) {
    log.error('orchestration_error', {
      trace_id: trace.getId(),
      error: error.message
    });
    
    trace.setError(error.message || String(error));
    await trace.save();
    
    throw error;
  }
}