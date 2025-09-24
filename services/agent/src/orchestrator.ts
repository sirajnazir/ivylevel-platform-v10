import type { AgentState } from "../../../packages/types/src/index";
import { runNode } from "./graph";
import { MODEL_CURRENT, RETRIEVER_URL, DEFAULT_TEMPERATURE, MAX_TOKENS } from "./config";
import { child } from "../../../packages/logger/src/index";
import { SYSTEM_PROMPT } from "./prompts/system";
import { finalizeFactReply, isFactualQuestion } from "./fact_synthesizer";
import { Pool } from 'pg';

const log = child({ svc: "agent-orchestrator" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
});

async function getStudentVitals(studentId: string) {
  try {
    const result = await pool.query(
      'SELECT vitals FROM student_state WHERE student_id = $1',
      [studentId]
    );
    return result.rows[0]?.vitals || {};
  } catch (error) {
    log.error(error, "Failed to get student vitals");
    return {};
  }
}

function isFactual(q: string): boolean {
  return /(score|gpa|list|status|deadline|how many|when|what is my|what's my|final)/i.test(q);
}

function enforceFactualResponse(reply: string, message: string, vitals: any): string {
  if (!isFactual(message)) return reply;
  
  const hasNumber = /\b\d{2,4}\b/.test(reply);
  const hasEvidence = /\[source:|from your vitals|from your records/i.test(reply);
  const hasHedging = /don't have access|cannot access|as an ai/i.test(reply);
  
  if (hasHedging || (!hasNumber && !hasEvidence)) {
    const vitalsSummary = extractRelevantVitals(message, vitals);
    if (vitalsSummary) {
      return `From your records: ${vitalsSummary} [source: vitals]\n\nWant me to check your application PDFs for additional details?`;
    }
    return `I'm checking your records now. If the information isn't in your vitals, I can help you add it or check your application documents. What specific metric are you looking for?`;
  }
  
  return reply;
}

function extractRelevantVitals(message: string, vitals: any): string | null {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('sat')) {
    const sat = vitals?.academics?.sat;
    if (sat?.current) {
      return `Your final SAT superscore is ${sat.superscore || sat.current}`;
    }
  }
  
  if (lowerMessage.includes('gpa')) {
    const gpa = vitals?.academics?.gpa;
    if (gpa) {
      return `Your GPA is ${gpa.weighted ? gpa.weighted + ' weighted' : ''}${gpa.weighted && gpa.unweighted ? ', ' : ''}${gpa.unweighted ? gpa.unweighted + ' unweighted' : ''}`;
    }
  }
  
  if (lowerMessage.includes('ncwit')) {
    const ncwit = vitals?.awards?.ncwit;
    if (ncwit?.status) {
      return `NCWIT status: ${ncwit.status}${ncwit.date ? ' (awarded ' + ncwit.date + ')' : ''}`;
    }
  }
  
  if (lowerMessage.includes('synthoria')) {
    const synthoria = vitals?.activities?.Synthoria;
    if (synthoria?.timeline?.length) {
      const latest = synthoria.timeline[synthoria.timeline.length - 1];
      if (latest.studentsReached) {
        return `Synthoria has reached ${latest.studentsReached} students`;
      }
    }
  }
  
  if (lowerMessage.includes('college') && (lowerMessage.includes('list') || lowerMessage.includes('decisions') || lowerMessage.includes('status'))) {
    const colleges = vitals?.apps?.collegeList;
    if (colleges?.length) {
      const summary = colleges.map((c: any) => `${c.name}: ${c.status || 'Status unknown'}`).join('\n');
      return `Your college list and decisions:\n${summary}`;
    }
  }
  
  if (lowerMessage.includes('award') && (lowerMessage.includes('list') || lowerMessage.includes('target') || lowerMessage.includes('week 1'))) {
    const targets = vitals?.awards?.targets?.targets;
    const ncwit = vitals?.awards?.ncwit;
    if (targets || ncwit) {
      let response = '';
      if (targets) {
        response += `Award targets from week 1: ${targets.join(', ')}\n`;
      }
      if (ncwit) {
        response += `\nResults: NCWIT - ${ncwit.status}`;
      }
      return response;
    }
  }
  
  return null;
}

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
    
    // Get student vitals if studentId is available
    const vitals = studentId ? await getStudentVitals(studentId) : {};
    
    // Check for opportunity-related questions
    let opportunityData = null;
    if (isOpportunityQuestion(message) && studentId) {
      opportunityData = await fetchOpportunityData(message, studentId);
    }
    
    // Call OpenAI with Jenny's system prompt
    const openai = await getOpenAIClient();
    const systemPrompt = getSystemPrompt(agentState, vitals, opportunityData);
    
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
    
    // Enforce factual response with vitals
    reply = enforceFactualResponse(reply, message, vitals);
    
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

function getSystemPrompt(state: AgentState, vitals?: any, opportunityData?: any) {
  let prompt = SYSTEM_PROMPT
    .replace('{studentId}', state.studentId || 'student')
    .replace('{nowWeek}', state.nowWeek.toString())
    .replace('{phase}', state.phase === 1 ? "Assessment" : state.phase === 2 ? "Prep Execution" : "Applications");
  
  if (vitals && Object.keys(vitals).length > 0) {
    prompt += '\n\nSTUDENT VITALS (from your records):\n' + JSON.stringify(vitals, null, 2);
    prompt += '\n\nIMPORTANT: When asked about factual information (SAT scores, GPA, activities, etc.), always check the STUDENT VITALS first. If the information is there, use it directly and cite it as "from your vitals/records."';
  }
  
  if (opportunityData) {
    prompt += '\n\nOPPORTUNITY RECOMMENDATIONS:\n' + JSON.stringify(opportunityData, null, 2);
    prompt += '\n\nWhen discussing opportunities, mention deadlines, time commitment, and why each is a good fit for this student.';
  }
  
  return prompt;
}

function isOpportunityQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return /opportunity|opportunities|bombardment|summer program|research|scholarship|award|competition|what should i apply|recommendations/i.test(lowerMessage);
}

async function fetchOpportunityData(message: string, studentId: string) {
  try {
    const lowerMessage = message.toLowerCase();
    const API_URL = process.env.API_URL || 'http://localhost:4000';
    
    // Bombardment request
    if (lowerMessage.includes('bombardment') || lowerMessage.includes('burst')) {
      const response = await fetch(`${API_URL}/students/${studentId}/opportunities/bombardment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: { type: 'coach_directive' }, size: 5 })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          type: 'bombardment',
          opportunities: data.opportunities,
          strategy: data.strategy
        };
      }
    }
    
    // General recommendations
    const params = new URLSearchParams({ limit: '10', refresh: 'false' });
    
    // Filter by type if specified
    if (lowerMessage.includes('summer')) params.append('kinds', 'summer');
    if (lowerMessage.includes('research')) params.append('kinds', 'research');
    if (lowerMessage.includes('scholarship')) params.append('kinds', 'scholarship');
    if (lowerMessage.includes('award') || lowerMessage.includes('competition')) params.append('kinds', 'award');
    
    const response = await fetch(`${API_URL}/students/${studentId}/opportunities/recommendations?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      return {
        type: 'recommendations',
        total: data.total_recommendations,
        by_bucket: data.recommendations_by_bucket,
        summary: data.summary
      };
    }
  } catch (error) {
    log.error(error, "Failed to fetch opportunity data");
  }
  
  return null;
}
