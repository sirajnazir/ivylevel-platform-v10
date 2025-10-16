import { fetchVitals } from '../services/facts';
import { hybridSearch } from '../retrieval/hybrid';
import { composeAnswer } from '../compose/compose';
import { ensureSession, getRecentMessages, storeMessage } from '../services/sessions';

export async function agentChat(req:any, res?:any){
  const sessionId = await ensureSession(req.session_id, req.student_id);
  const [recent, vitals] = await Promise.all([
    getRecentMessages(sessionId, 12),
    fetchVitals(req.student_id)
  ]);
  // facts-first guardrail (non-blocking here; keep 412 in your main /search route if desired)
  const hits = await hybridSearch(req.message, req.student_id);

  const composed = await composeAnswer({
    message: req.message,
    vitals, hits,
    memory: { recent }, model: req.model, use_ft: req.use_ft, stream: req.stream, res
  });

  await storeMessage(sessionId, { role:'user', content:req.message });
  await storeMessage(sessionId, { role:'assistant', content: composed.answer });

  const payload = { answer: composed.answer, session_id: sessionId, hits, vitals, model: composed.model };
  if (!req.stream) return payload;
}