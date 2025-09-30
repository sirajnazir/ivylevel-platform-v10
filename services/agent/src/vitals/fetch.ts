export async function getVitals(studentId: string) {
  const API_URL = process.env.API_URL || "http://localhost:4000";
  try {
    const r = await fetch(`${API_URL}/students/${studentId}/state`);
    if (!r.ok) return null;
    const json = await r.json();
    return json || null;
  } catch {
    return null;
  }
}

export function satFromVitals(vitals: any) {
  const sat = vitals?.academics?.sat;
  if (!sat) return null;
  const timeline = Array.isArray(sat.timeline) ? sat.timeline
    .filter((t: any) => t?.score)
    .map((t: any) => ({ date: t.date, score: t.score })) : [];
  const submitted = sat.submitted ?? null; // add if you store it
  return { timeline, submitted };
}