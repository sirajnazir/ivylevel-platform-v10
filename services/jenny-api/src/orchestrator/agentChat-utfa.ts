import { fetchVitals, detectFactKinds } from '../services/facts-canonical.js';
import {
  shouldUseTemporalFacts,
  extractTemporalIntent,
  resolveTemporalFact,
  formatTemporalFactResult
} from '../services/temporalFacts.js';
import { routeEnumerationQuery, isEnumerationQuery } from './enumeration-router.js';
import { routeEnumerationQueryV2, isEnumerationQueryV2 } from './enumeration-router-v2.js';
import { classifyEnumIntent, isEnumerationQuery as isUniversalEnum } from './intent-enum.js';
import { awards, ecs, narrative, programs } from '../resolvers/enums.js';
import { transcript, gpa, overview } from '../resolvers/academics.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { composeAnswer } from '../compose/compose.js';
import { ensureSession, getRecentMessages, storeMessage } from '../services/sessions.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { pool } from '../db/pool.js';

const log = createLogger('orchestrator-utfa');

// Helper functions for universal enumerations
function inferChipTableFromRoute(route: string) {
  if (route.startsWith('awards.final')) return 'outcomes';
  if (route.startsWith('awards.'))      return 'award_targets';
  if (route.startsWith('program.'))     return route.endsWith('decisions') ? 'outcomes' : 'kb_items';
  if (route.startsWith('ecs.'))         return 'kb_items';
  if (route.startsWith('narrative.'))   return 'kb_items';
  if (route.startsWith('academics.transcript.')) return 'academic_courses';
  if (route.startsWith('academics.gpa.')) return 'academic_gpa';
  return 'kb_items';
}

function composeEnumText(result: any): string {
  const route = result.route as string;
  const list  = result.items ?? (result.item ? [result.item] : []);
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
    return `${i+1}. ${r.title_name || r.award_name || r.program_name}`;
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
  return lines.length ? lines.join('\n') : 'No items found.';
}

async function maybeEnumAnswer(pg: any, studentId: string, userText: string) {
  const route = classifyEnumIntent(userText);
  if (!route) return null;

  switch (route) {
    case 'awards.initial':     return { kind: 'enum', route, items: await awards.initial(pg, studentId) };
    case 'awards.final':       return { kind: 'enum', route, items: await awards.final(pg, studentId) };
    case 'awards.progression': return { kind: 'enum', route, items: await awards.progression(pg, studentId) };

    case 'ecs.initial':        return { kind: 'enum', route, items: await ecs.initial(pg, studentId) };
    case 'ecs.final':          return { kind: 'enum', route, items: await ecs.final(pg, studentId) };
    case 'ecs.progression':    return { kind: 'enum', route, items: await ecs.progression(pg, studentId) };

    case 'narrative.initial':  return { kind: 'enum', route, item:  await narrative.initial(pg, studentId) };

    case 'program.initial':    return { kind: 'enum', route, items: await programs.initial(pg, studentId) };
    case 'program.submitted':  return { kind: 'enum', route, items: await programs.submitted(pg, studentId) };
    case 'program.final':      return { kind: 'enum', route, items: await programs.final(pg, studentId) };
    case 'program.decisions':  return { kind: 'enum', route, items: await programs.decisions(pg, studentId) };
    case 'program.progression':return { kind: 'enum', route, items: await programs.progression(pg, studentId) };

    case 'academics.transcript.initial':     return { kind: 'enum', route, items: await transcript.initial(pg, studentId) };
    case 'academics.transcript.final':       return { kind: 'enum', route, items: await transcript.final(pg, studentId) };
    case 'academics.transcript.progression': return { kind: 'enum', route, items: await transcript.progression(pg, studentId) };

    case 'academics.gpa.initial':     return { kind: 'enum', route, item:  await gpa.initial(pg, studentId) };
    case 'academics.gpa.final':       return { kind: 'enum', route, items: await gpa.final(pg, studentId) };
    case 'academics.gpa.latest':      return { kind: 'enum', route, items: await gpa.latest(pg, studentId) };
    case 'academics.gpa.progression': return { kind: 'enum', route, items: await gpa.progression(pg, studentId) };
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

    const answer = composeEnumText(enumResult);

    log.event('compose.enumeration_answer', {
      route: enumResult.route,
      items_count: enumResult.items?.length ?? 1,
      chips_count: chips.length
    });

    await storeMessage(sessionId, { role: 'user', content: req.message });
    await storeMessage(sessionId, { role: 'assistant', content: answer });

    const response = {
      answer,
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

      const response = {
        answer: enumerationResult.answer,
        session_id: sessionId,
        hits: [], // No RAG needed for enumerations
        vitals: await fetchVitals(req.student_id),
        chips: enumerationResult.chips,
        trace: {
          enumeration: enumerationResult.meta,
          ...enumerationResult.trace
        },
        trace_id: `enum-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        model: 'enumeration_facts'
      };

      await storeMessage(sessionId, { role: 'user', content: req.message });
      await storeMessage(sessionId, { role: 'assistant', content: enumerationResult.answer });

      if (!req.stream) return response;

      // For streaming
      if (res) {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
      }
      return;
    }
  }
  
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
      const answer = formatTemporalFactResult(result, intent.kind!);
      
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
        duration_ms: result.trace.took_ms
      });
      
      // Return structured response
      const response = {
        answer,
        session_id: sessionId,
        hits: [], // No RAG needed for pure temporal facts
        vitals: await fetchVitals(req.student_id),
        chips,
        trace,
        trace_id: `utfa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        model: 'utfa' // Universal Temporal Facts Architecture
      };
      
      await storeMessage(sessionId, { role: 'user', content: req.message });
      await storeMessage(sessionId, { role: 'assistant', content: answer });
      
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