import { fetchVitals } from '../services/facts-logged.js';
import { hybridSearch } from '../retrieval/hybrid-logged.js';
import { composeAnswer } from '../compose/compose-logged.js';
import { ensureSession, getRecentMessages, storeMessage } from '../services/sessions.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { getContext } from '../../../../packages/observability/dist/context.js';

const log = createLogger('orchestrator');

export async function agentChat(req:any, res?:any){
  const orchestrationStart = Date.now();
  const ctx = getContext();
  
  log.event('orchestration_start', {
    student_id: req.student_id,
    session_id: req.session_id,
    message_preview: req.message?.slice(0, 120),
    stream: req.stream
  });

  const sessionId = await ensureSession(req.session_id, req.student_id);
  
  const [recent, vitals] = await Promise.all([
    getRecentMessages(sessionId, 12),
    fetchVitals(req.student_id)
  ]);
  
  log.event('context_loaded', {
    session_id: sessionId,
    memory_turns: recent.length,
    vitals_count: vitals.facts?.length || 0
  });
  
  // facts-first guardrail (non-blocking here; keep 412 in your main /search route if desired)
  const hits = await hybridSearch(req.message, req.student_id);
  
  log.event('search_complete', {
    hits_count: hits.length,
    top_score: hits[0]?.score || 0
  });

  const composed = await composeAnswer({
    message: req.message,
    vitals, hits,
    memory: { recent }, model: req.model, use_ft: req.use_ft, stream: req.stream, res
  });

  await storeMessage(sessionId, { role:'user', content:req.message });
  await storeMessage(sessionId, { role:'assistant', content: composed.answer });

  const payload = { 
    answer: composed.answer, 
    session_id: sessionId, 
    hits, 
    vitals, 
    model: composed.model,
    trace_id: ctx.trace_id 
  };
  
  log.event('orchestration_complete', {
    duration_ms: Date.now() - orchestrationStart,
    answer_length: composed.answer?.length || 0,
    model_used: composed.model
  });
  
  if (!req.stream) return payload;
}