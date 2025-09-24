import type { AgentState } from "../../../packages/types/src/index";
import { runNode } from "./graph";
import { MODEL_CURRENT, RETRIEVER_URL, DEFAULT_TEMPERATURE, MAX_TOKENS } from "./config";
import { child } from "../../../packages/logger/src/index";
import { SYSTEM_PROMPT } from "./prompts/system";
import { finalizeFactReply, isFactualQuestion } from "./fact_synthesizer";

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
    // Get evidence from retriever (increase topK for factual questions)
    const isFact = isFactualQuestion(message);
    const topK = isFact ? (process.env.FACT_TOPK ? parseInt(process.env.FACT_TOPK) : 8) : 3;
    const evidence = await ensureEvidence(message, topK);
    
    // Call OpenAI with Jenny's system prompt
    const openai = await getOpenAIClient();
    const systemPrompt = getSystemPrompt(agentState);
    
    // Build context with evidence if factual
    const contextMessages = [
      { role: "system", content: systemPrompt }
    ];
    
    if (isFact && evidence.length > 0) {
      const evidenceContext = "Evidence from your records:\n" + 
        evidence.map((e, i) => `${i+1}. Week ${e.week}: ${e.title}`).join('\n');
      contextMessages.push({ role: "system", content: evidenceContext });
    }
    
    contextMessages.push({ role: "user", content: message });
    
    const completion = await openai.chat.completions.create({
      model: MODEL_CURRENT,
      temperature: isFact ? 0.3 : DEFAULT_TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: contextMessages
    });
    
    let reply = completion.choices[0]?.message?.content || "I'm here to help with your college journey.";
    
    // Apply fact synthesizer for factual questions
    if (isFact || process.env.NEVER_BLANK_MODE === "1") {
      reply = finalizeFactReply(reply, evidence.length > 0);
    }
    
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

async function ensureEvidence(query: string, topK: number = 3) {
  try {
    const response = await fetch(`${RETRIEVER_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, k: topK })
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
  return SYSTEM_PROMPT
    .replace('{studentId}', state.studentId || 'student')
    .replace('{nowWeek}', state.nowWeek.toString())
    .replace('{phase}', state.phase === 1 ? "Assessment" : state.phase === 2 ? "Prep Execution" : "Applications");
}
