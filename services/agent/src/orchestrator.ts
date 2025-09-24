import type { AgentState } from "../../../packages/types/src/index";
import { runNode } from "./graph";
import { MODEL_CURRENT, RETRIEVER_URL, DEFAULT_TEMPERATURE, MAX_TOKENS } from "./config";
import { child } from "../../../packages/logger/src/index";

const log = child({ svc: "agent-orchestrator" });

export async function respond({ message, state, coachId='jenny', studentId, nowWeek=1 }: { 
  message: string; 
  state?: AgentState;
  coachId?: string; 
  studentId?: string; 
  nowWeek?: number; 
}) {
  // Use provided state or create new one
  const agentState: AgentState = state || { 
    coachId, 
    studentId: studentId || "unknown", 
    nowWeek, 
    phase: nowWeek <= 1 ? 1 : nowWeek <= 52 ? 2 : 5, 
    memory: {} 
  };
  
  try {
    // Get evidence from retriever
    const evidence = await ensureEvidence(message);
    
    // Call OpenAI with Jenny's system prompt
    const openai = await getOpenAIClient();
    const systemPrompt = getSystemPrompt(agentState);
    
    const completion = await openai.chat.completions.create({
      model: MODEL_CURRENT,
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    });
    
    const reply = completion.choices[0]?.message?.content || "I'm here to help with your college journey.";
    
    return {
      reply,
      evidence_chips: evidence,
      state: agentState
    };
  } catch (error) {
    log.error(error, "orchestrator error");
    // Fallback to graph node
    return runNode(agentState, message);
  }
}

async function ensureEvidence(query: string) {
  try {
    const response = await fetch(`${RETRIEVER_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, k: 3 })
    });
    
    if (!response.ok) {
      log.warn({ status: response.status }, "retriever search failed");
      return [];
    }
    
    const results = await response.json();
    return results.map((r: any) => ({
      title: r.metadata?.text?.substring(0, 50) + "..." || r.text?.substring(0, 50) + "...",
      kind: r.metadata?.kind || "UNKNOWN",
      week: r.metadata?.week || 0,
      phase: r.metadata?.phase || "P1",
      link: r.metadata?.link || "",
      span: r.id
    }));
  } catch (error) {
    log.error(error, "evidence retrieval failed");
    return [];
  }
}

async function getOpenAIClient() {
  const OpenAI = (await import('openai')).default;
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

function getSystemPrompt(state: AgentState) {
  return `You are Jenny, an expert college admissions coach with deep experience helping students navigate the complex college application process. You provide strategic guidance, emotional support, and practical advice to help students achieve their academic goals.

Your coaching style is:
- Strategic and outcome-focused  
- Empathetic and supportive
- Detail-oriented with actionable steps
- Evidence-based with clear reasoning
- Encouraging while maintaining high standards

Current context:
- Student: ${state.studentId}
- Week: ${state.nowWeek}
- Phase: ${state.phase === 1 ? "Assessment" : state.phase === 2 ? "Prep Execution" : "Applications"}

Always cite evidence from prior sessions when relevant. Use the 168-hour framework for time management. Maintain Jenny's authentic voice from the corpus.`;
}
