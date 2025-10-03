import type { AgentState } from "../../../packages/types/dist";
import { MODEL_CURRENT, RETRIEVER_URL, DEFAULT_TEMPERATURE, MAX_TOKENS } from "./config";
import { child } from "@packages/logger";
import { SYSTEM_PROMPT } from "./prompts/system";
import { detectIntent, intentToCanonKey, UserIntent } from "./intent";
import { getCanon, CANON_REGISTRY } from "./canon/registry";
import { detectCanonKey } from "./canon/detect";
import { Pool } from 'pg';
import OpenAI from "openai";

const log = child({ svc: "agent-orchestrator-structured" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
});

interface StructuredPlan {
  vitalsNeeded: boolean;
  canonKey?: string;
  ragNeeded: boolean;
  ragKind?: string;
  ragFilter?: any;
}

interface StructuredEvidence {
  vitals?: any;
  canonChip?: any;
  ragChips?: any[];
}

// Classify intent to determine structured plan
function classifyToStructuredPlan(message: string, intent: UserIntent): StructuredPlan {
  const lower = message.toLowerCase();
  
  // SAT queries
  if (/\bsat\b/.test(lower) && (/score|timeline|trajectory|submit/i.test(lower))) {
    return {
      vitalsNeeded: true,
      canonKey: 'APP_COMMON',
      ragNeeded: true,
      ragKind: 'TRANS-INTEL',
      ragFilter: { layers: { $in: ['Testing'] } }
    };
  }
  
  // Awards queries
  if (/award/.test(lower)) {
    if (/compare|vs|gap/.test(lower)) {
      return {
        vitalsNeeded: true,
        canonKey: 'APP_FINAL_AWARDS',
        ragNeeded: false // Comparison doesn't need RAG
      };
    }
    return {
      vitalsNeeded: true,
      canonKey: 'APP_FINAL_AWARDS',
      ragNeeded: true,
      ragKind: 'APP-DOC',
      ragFilter: { layers: { $in: ['Awards'] } }
    };
  }
  
  // ECs queries
  if (/extracurricular|ecs?\b/.test(lower)) {
    return {
      vitalsNeeded: true,
      canonKey: 'APP_FINAL_ECS',
      ragNeeded: true,
      ragKind: 'APP-DOC',
      ragFilter: { layers: { $in: ['Activities'] } }
    };
  }
  
  // College status
  if (/college.*(?:status|decision|list)/.test(lower)) {
    return {
      vitalsNeeded: true,
      canonKey: 'COLLEGE_DECISIONS',
      ragNeeded: false
    };
  }
  
  // Weekly plans
  if (/week \d+|weekly plan/.test(lower)) {
    const weekMatch = lower.match(/week (\d+)/);
    const week = weekMatch ? parseInt(weekMatch[1]) : null;
    return {
      vitalsNeeded: false,
      canonKey: week ? `EXEC_W${week.toString().padStart(3, '0')}` : undefined,
      ragNeeded: true,
      ragKind: 'EXEC-INTEL',
      ragFilter: week ? { week } : undefined
    };
  }
  
  // Essay/narrative queries
  if (/essay|narrative|story/.test(lower)) {
    return {
      vitalsNeeded: false,
      ragNeeded: true,
      ragKind: 'TRANS-INTEL',
      ragFilter: { layers: { $in: ['Essays', 'Narrative'] } }
    };
  }
  
  // Default: RAG-first for general queries
  return {
    vitalsNeeded: false,
    ragNeeded: true,
    ragKind: 'TRANS-INTEL'
  };
}

// Fetch vitals from database
async function fetchVitals(studentId: string): Promise<any> {
  try {
    const result = await pool.query(
      'SELECT vitals FROM student_state WHERE student_id = $1',
      [studentId]
    );
    return result.rows[0]?.vitals || {};
  } catch (error) {
    log.error({ error }, "Failed to fetch vitals");
    return {};
  }
}

// Fetch canon document
async function fetchCanonDoc(canonKey: string, studentId: string): Promise<any> {
  try {
    const result = await pool.query(
      'SELECT * FROM canon WHERE key = $1 AND student_id = $2',
      [canonKey, studentId]
    );
    return result.rows[0];
  } catch (error) {
    log.error({ error, canonKey }, "Failed to fetch canon doc");
    return null;
  }
}

// Kind-locked RAG retrieval
async function fetchRAGChips(
  query: string, 
  kind: string, 
  filter: any = {}, 
  studentId: string,
  k: number = 6
): Promise<any[]> {
  try {
    const response = await fetch(`${RETRIEVER_URL}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        q: query,
        k,
        filter: { ...filter, kind, student: studentId },
        student: studentId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Retriever error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    log.error({ error, query, kind }, "Failed to fetch RAG chips");
    return [];
  }
}

// Execute structured plan
async function executeStructuredPlan(
  plan: StructuredPlan,
  message: string,
  studentId: string
): Promise<StructuredEvidence> {
  const evidence: StructuredEvidence = {};
  
  // Step 1: Fetch vitals if needed
  if (plan.vitalsNeeded) {
    evidence.vitals = await fetchVitals(studentId);
    log.info({ hasVitals: !!evidence.vitals }, "Fetched vitals");
  }
  
  // Step 2: Fetch canon document if specified
  if (plan.canonKey && studentId) {
    const canonDoc = await fetchCanonDoc(plan.canonKey, studentId);
    if (canonDoc) {
      // Fetch a representative chip from the canon document
      const canonChips = await fetchRAGChips(
        message,
        canonDoc.source_type,
        { doc_name: canonDoc.doc_name },
        studentId,
        1
      );
      evidence.canonChip = canonChips[0];
      log.info({ canonKey: plan.canonKey, found: !!evidence.canonChip }, "Fetched canon chip");
    }
  }
  
  // Step 3: Fetch RAG chips if needed
  if (plan.ragNeeded && plan.ragKind) {
    evidence.ragChips = await fetchRAGChips(
      message,
      plan.ragKind,
      plan.ragFilter || {},
      studentId
    );
    log.info({ 
      kind: plan.ragKind, 
      count: evidence.ragChips?.length || 0 
    }, "Fetched RAG chips");
  }
  
  return evidence;
}

// Extract answer from vitals
function extractFromVitals(message: string, vitals: any): string | null {
  const lower = message.toLowerCase();
  
  // SAT queries
  if (/\bsat\b/.test(lower)) {
    const sat = vitals?.academics?.sat;
    if (sat?.current) {
      if (/trajectory|timeline|progress/.test(lower)) {
        const scores = sat.timeline?.map((t: any) => t.score) || [];
        return `Your SAT progression: ${scores.join(' → ')}. Current: ${sat.current}, Superscore: ${sat.superscore || sat.current}.`;
      }
      return `Your SAT score is ${sat.current}${sat.superscore > sat.current ? ` (superscore: ${sat.superscore})` : ''}.`;
    }
  }
  
  // Awards queries
  if (/award/.test(lower)) {
    const awards = vitals?.awards;
    if (awards?.final) {
      const list = Object.entries(awards.final)
        .map(([key, value]: [string, any]) => value.name || key)
        .filter(name => name);
      if (list.length > 0) {
        return `Your awards: ${list.join(', ')}`;
      }
    }
  }
  
  // EC queries
  if (/extracurricular|ecs?\b/.test(lower)) {
    const activities = vitals?.activities;
    if (activities?.final) {
      const list = Object.entries(activities.final)
        .map(([key, value]: [string, any]) => value.title || key)
        .filter(title => title);
      if (list.length > 0) {
        return `Your extracurricular activities: ${list.join(', ')}`;
      }
    }
  }
  
  // College decisions
  if (/college.*(?:status|decision|list)/.test(lower)) {
    const colleges = vitals?.apps?.collegeList;
    if (colleges?.length > 0) {
      const summary = colleges.map((c: any) => `${c.name}: ${c.status}`).join('\n');
      return `Your college decisions:\n${summary}`;
    }
  }
  
  return null;
}

// Compose final reply using evidence
function composeReply(
  message: string,
  evidence: StructuredEvidence,
  temperature: number = 0.3
): string {
  // First try to answer from vitals
  if (evidence.vitals) {
    const vitalsAnswer = extractFromVitals(message, evidence.vitals);
    if (vitalsAnswer) {
      // Add evidence citation
      const citation = evidence.canonChip 
        ? ` [source: ${evidence.canonChip.metadata?.doc_name || 'student records'}]`
        : ' [source: vitals]';
      return vitalsAnswer + citation;
    }
  }
  
  // Build context from evidence
  const contextParts: string[] = [];
  
  if (evidence.canonChip) {
    contextParts.push(`From ${evidence.canonChip.metadata?.doc_name || 'official records'}:\n${evidence.canonChip.text}`);
  }
  
  if (evidence.ragChips && evidence.ragChips.length > 0) {
    const relevantChips = evidence.ragChips.slice(0, 3);
    contextParts.push('Additional context:');
    relevantChips.forEach((chip, i) => {
      contextParts.push(`${i+1}. ${chip.text}`);
    });
  }
  
  // If we have no evidence, return a helpful message
  if (contextParts.length === 0) {
    return "I need more information to answer that. Could you be more specific about what you're looking for?";
  }
  
  // Simple template-based response
  return contextParts.join('\n\n');
}

// Main StructuredFirst orchestrator
export async function respondStructured({
  message,
  studentId,
  coachId = 'jenny',
  nowWeek = 1
}: {
  message: string;
  studentId: string;
  coachId?: string;
  nowWeek?: number;
}) {
  log.info({ message, studentId }, "StructuredFirst orchestrator");
  
  try {
    // 1. Classify intent and create plan
    const intent = detectIntent(message);
    const plan = classifyToStructuredPlan(message, intent);
    log.info({ intent, plan }, "Classified to structured plan");
    
    // 2. Execute plan to gather evidence
    const evidence = await executeStructuredPlan(plan, message, studentId);
    log.info({ 
      hasVitals: !!evidence.vitals,
      hasCanon: !!evidence.canonChip,
      ragCount: evidence.ragChips?.length || 0
    }, "Executed structured plan");
    
    // 3. Compose reply
    const reply = composeReply(message, evidence);
    
    // 4. Format evidence chips for response
    const evidenceChips: any[] = [];
    
    if (evidence.canonChip) {
      evidenceChips.push({
        title: evidence.canonChip.metadata?.doc_name || 'Canon document',
        kind: evidence.canonChip.metadata?.kind,
        link: evidence.canonChip.metadata?.link,
        canonical: true
      });
    }
    
    if (evidence.ragChips) {
      evidence.ragChips.slice(0, 2).forEach(chip => {
        evidenceChips.push({
          title: chip.metadata?.doc_name || chip.text.substring(0, 50) + '...',
          kind: chip.metadata?.kind,
          week: chip.metadata?.week,
          phase: chip.metadata?.phase,
          link: chip.metadata?.link
        });
      });
    }
    
    // 5. Return structured response
    return {
      reply,
      evidence_chips: evidenceChips,
      state: {
        coachId,
        studentId,
        nowWeek,
        phase: nowWeek <= 13 ? 1 : nowWeek <= 52 ? 2 : 5,
        memory: {}
      }
    };
  } catch (error) {
    log.error({ error }, "StructuredFirst orchestrator error");
    throw error;
  }
}