const BASE = process.env.NEXT_PUBLIC_TEST_SERVER_URL || 'http://localhost:4000';

export async function agentChat(message: string, studentId: string, opts?: { week?: number; llm_model?: string }) {
  const r = await fetch(`${BASE}/agent/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message,
      student_id: studentId,
      week: opts?.week,
      llm_model: opts?.llm_model // optional fine-tune override
    })
  });
  if (!r.ok) throw new Error(`agentChat failed: ${r.status}`);
  // returns: { answer?, hits[], chips[], vitals:{facts[]}, meta? }
  return r.json();
}

export async function getVitals(studentId: string) {
  const r = await fetch(`${BASE}/students/${studentId}/vitals`);
  if (!r.ok) throw new Error(`getVitals failed: ${r.status}`);
  return r.json(); // { facts:[...] }
}

export async function resolveEvidence(ids: string[]) {
  const r = await fetch(`${BASE}/evidence?${new URLSearchParams({ ids: ids.join(',') })}`);
  if (!r.ok) throw new Error(`resolveEvidence failed: ${r.status}`);
  return r.json();
}

// Legacy support
export async function getState(studentId: string) {
  return getVitals(studentId);
}