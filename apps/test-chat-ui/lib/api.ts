const BASE = process.env.NEXT_PUBLIC_TEST_SERVER_URL || 'http://localhost:8787';

export async function agentChat(
  message: string,
  studentId: string,
  opts?: { week?: number; llm_model?: string; session_id?: string }
) {
  // Always use GPT-5 intent router (v3.3+)
  const endpoint = '/agent/chat/gpt5';

  const r = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message,
      student_id: studentId,
      week: opts?.week,
      llm_model: opts?.llm_model,
      session_id: opts?.session_id,
    }),
  });
  if (!r.ok) throw new Error(`agentChat failed: ${r.status}`);
  // Expecting: { answer, hits, chips, vitals, model, trace_id, intent }
  return r.json();
}

export async function getVitals(studentId: string) {
  const r = await fetch(`${BASE}/students/${studentId}/vitals`);
  if (!r.ok) throw new Error(`getVitals failed: ${r.status}`);
  return r.json();
}

// NEW: fetch a single trace by id
export async function getTrace(traceId: string) {
  const r = await fetch(`${BASE}/traces/${traceId}`);
  if (!r.ok) throw new Error(`getTrace failed: ${r.status}`);
  return r.json(); // { header, events: [...] }
}

// NEW: fetch trace events for a specific trace
export async function getTraceEvents(traceId: string) {
  const r = await fetch(`${BASE}/traces/${traceId}/events`);
  if (!r.ok) throw new Error(`getTraceEvents failed: ${r.status}`);
  return r.json();
}

export async function resolveEvidence(ids: string[]) {
  const r = await fetch(`${BASE}/evidence?${new URLSearchParams({ ids: ids.join(',') })}`);
  if (!r.ok) throw new Error(`resolveEvidence failed: ${r.status}`);
  return r.json();
}