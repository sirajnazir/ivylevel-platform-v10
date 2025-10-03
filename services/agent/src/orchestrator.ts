import type { AgentState } from "../../../packages/types/dist";
import { runNode } from "./graph";
import { MODEL_CURRENT, RETRIEVER_URL, DEFAULT_TEMPERATURE, MAX_TOKENS } from "./config";
import { child } from "@packages/logger";
import { SYSTEM_PROMPT } from "./prompts/system";
import { synthesizeFactsFromEvidence } from "./facts/fact_synthesizer";
import { pickInitialEvidence } from "./facts/initial_selector";
import { detectIntent, intentToCanonKey } from "./intent";
import { getCanon, CANON_REGISTRY } from "./canon/registry";
import { detectCanonKey } from "./canon/detect";
import { compareAwardSets } from "./facts/compare";
import { getVitals, satFromVitals } from "./vitals/fetch";
import { composeJennyReply as composeJennyReplyNew } from "./reply/jenny_composer";
import { composeJennyReply } from "./style/reply_composer";
import { enforceEvidence } from "./evidence_enforcer";
import { Pool } from 'pg';
import { llmWithTools, shouldUseTools, TOOL_SCHEMA } from './llmClient';

// New imports for structured-first flow
import { readVitals, pickSat } from "./vitals/read";
import { readCanon, canonToChip } from "./canon/read";
import { pineconeQueryKindLocked } from "./retriever/kindLocked";

const log = child({ svc: "agent-orchestrator" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
});

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + 1) / 7);
}

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

function isFactualQuestion(q: string): boolean {
  return /(score|gpa|list|status|deadline|how many|when|what is my|what's my|final|progression|submit|extracurricular|award)/i.test(q);
}

function buildSatReplyFromVitals(message: string, sat: any, opts: { persona: string }): string | null {
  if (!sat?.timeline?.length) return null;
  
  const timeline = sat.timeline.sort((a: any, b: any) => {
    if (!a.date || !b.date) return 0;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Build trajectory string
  const scores = timeline.map((t: any) => t.score);
  const trajectory = scores.join(' → ');
  
  // Get first and last scores
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const improvement = lastScore - firstScore;
  
  // Format reply based on query type
  if (/trajectory|improvement|progress/i.test(message)) {
    return `Based on your SAT timeline, here's your score progression:\n\n${trajectory}\n\nYou improved ${improvement} points from ${firstScore} to ${lastScore}. ${sat.submitted ? `You submitted ${sat.submitted} to colleges.` : ''}\n\n_Pretty solid climb. Want tips on pushing past ${lastScore}?_`;
  } else if (/submit|submitted/i.test(message)) {
    return sat.submitted 
      ? `You submitted SAT score: **${sat.submitted}**\n\n_This was from your ${timeline.find((t: any) => t.score === sat.submitted)?.date || 'test'} sitting._`
      : "I don't see a submitted SAT score in your records yet. Want me to check your application docs?";
  } else {
    // General SAT query
    return `Your SAT scores: ${trajectory}${sat.submitted ? `\n\nSubmitted to colleges: **${sat.submitted}**` : ''}\n\n_Want the full test date breakdown?_`;
  }
}

function enforceFactualResponse(reply: string, message: string, vitals: any): string {
  if (!isFactualQuestion(message)) return reply;
  
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

function detectScopeAndTime(message: string): { topic?: "awards" | "ecs" | "sat" | "submissions"; phaseHint?: string; weekHint?: number } {
  const lower = message.toLowerCase();
  const scope: { topic?: "awards" | "ecs" | "sat" | "submissions"; phaseHint?: string; weekHint?: number } = {};
  
  // Detect topic
  if (lower.includes('award')) scope.topic = 'awards';
  else if (lower.includes('extracurricular') || lower.includes('ec')) scope.topic = 'ecs';
  else if (lower.includes('sat') || lower.includes('test score')) scope.topic = 'sat';
  else if (lower.includes('submission')) scope.topic = 'submissions';
  
  // Detect phase
  if (lower.includes('initial') || lower.includes('game plan') || lower.includes('gameplan')) {
    scope.phaseHint = 'P1';
    scope.weekHint = 1;
  } else if (lower.includes('week 1')) {
    scope.weekHint = 1;
  } else if (lower.includes('p1')) {
    scope.phaseHint = 'P1';
  } else if (lower.includes('p2')) {
    scope.phaseHint = 'P2';
  }
  
  return scope;
}

async function canonPassSearch(studentId: string, canonKey: string, message: string, k = 8) {
  const canon = CANON_REGISTRY[canonKey as keyof typeof CANON_REGISTRY];
  if (!canon) return [];
  const filter = { kind: { $in: canon.kind } };

  const response = await fetch(`${RETRIEVER_URL}/search`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: message, k, filter, student: studentId })
  });
  let hits: any[] = await response.json().catch(() => []);

  // Pin by doc_name hints
  const hints = canon.nameHints.map(h => h.toLowerCase());
  hits = hits.map(h => {
    const name = (h.doc_name || h.metadata?.doc_name || "").toLowerCase();
    const bonus = hints.some(hh => name.includes(hh)) ? canon.boost : 0;
    return { ...h, _canonScore: (h.score||0) + bonus };
  }).sort((a,b) => (b._canonScore||0) - (a._canonScore||0));

  log.info({ canonKey, top: hits[0]?.doc_name }, "canon-pass.selected");
  return hits;
}

async function retrieverSearch(q: string, k = 8, filter?: any, studentId?: string) {
  const response = await fetch(`${RETRIEVER_URL}/search`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ q, k, filter, student_id: studentId })
  });
  const result = await response.json().catch(() => []);
  return Array.isArray(result) ? result : [];
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
    // Detect canon key from message
    const canonKey = detectCanonKey(message);
    const intent = detectIntent(message);
    log.info({ userMsg: message, intent, canonKey }, "agent.intent");
    
    // Determine query plan: structured-first vs rag-first
    const isSat = /\bsat\b/i.test(message);
    const plan = (isSat || isFactualQuestion(message)) ? "structured_first" : "rag_first";
    
    // Structured-First Awards Handler
    const isAwards = /award|prize|honor|win|won|plan.*vs/i.test(message);
    if (plan === "structured_first" && isAwards) {
      const vitals = await getStudentVitals(agentState.studentId || "unknown");
      const awards = vitals?.awards;
      
      if (!awards) {
        const reply = "I don't see your awards tracked yet. Want me to help log them?";
        return { reply, evidence_chips: [], state: agentState };
      }
      
      // Force canon-first only for awards
      const canonPlanned = await readCanon("APP_PLANNED_AWARDS", agentState.studentId || "unknown");
      const canonFinal = await readCanon("APP_FINAL_AWARDS", agentState.studentId || "unknown");
      const chips = [];
      
      if (canonPlanned) chips.push(canonToChip(canonPlanned));
      if (canonFinal) chips.push(canonToChip(canonFinal));
      
      // Optional: Add at most 1 color chip from APP-DOC namespace
      const colorChips = await pineconeQueryKindLocked({ 
        q: "awards honors achievements", 
        kind: "APP-DOC", 
        studentId: agentState.studentId || "unknown", 
        k: 1 
      });
      if (colorChips.length > 0 && colorChips[0].kind === "APP-DOC") {
        chips.push(colorChips[0]);
      }
      
      const planned = awards.planned || [];
      const won = awards.won || [];
      
      // Find differences
      const wonButNotPlanned = won.filter((w: string) => !planned.some((p: string) => p.toLowerCase().includes(w.toLowerCase().split(' ')[0])));
      const plannedButNotWon = planned.filter((p: string) => !won.some((w: string) => w.toLowerCase().includes(p.toLowerCase().split(' ')[0])));
      
      let reply = `**Awards Analysis:**\n\n`;
      reply += `✓ **Won (${won.length})**: ${won.join(", ")}\n\n`;
      reply += `📋 **Originally Planned (${planned.length})**: ${planned.join(", ")}\n\n`;
      
      if (wonButNotPlanned.length > 0) {
        reply += `🎉 **Exceeded expectations**: ${wonButNotPlanned.join(", ")}\n`;
      }
      if (plannedButNotWon.length > 0) {
        reply += `📌 **Still pursuing**: ${plannedButNotWon.join(", ")}`;
      }
      
      return { reply, evidence_chips: chips, state: agentState };
    }
    
    // Structured-First SAT Handler
    if (plan === "structured_first" && (isSat || intent.topic === "sat")) {
      const vitals = await readVitals(agentState.studentId || "unknown");
      const { current, timeline } = pickSat(vitals);

      if (!current) {
        // Never-blank doctrine: offer to log an observation, no guessing
        const reply = "I don't see your SAT in records yet. Want me to log it so I can use it going forward?";
        return { reply, evidence_chips: [], state: agentState };
      }

      // Canon-first chip (prefer APP-DOC, fall back to EXEC-INTEL if available)
      const canon = await readCanon("APP_FINAL_SCORES", agentState.studentId || "unknown");
      const chips = canon ? [canonToChip(canon)] : await pineconeQueryKindLocked({ 
        q: "SAT score", 
        kind: "APP-DOC", 
        studentId: agentState.studentId, 
        k: 1 
      });

      // Ensure evidence quality
      const evidenceCheck = enforceEvidence(
        chips.map((c: any) => ({ 
          id: c.span, 
          text: c.title, 
          kind: c.kind, 
          metadata: c 
        })),
        `Your current SAT is **${current}**.`,
        "sat",
        message
      );

      // Handle timeline queries
      const isTimelineQuery = /progress|timeline|improve|over time|history/i.test(message);
      
      let reply: string;
      if (isTimelineQuery && timeline && timeline.length > 0) {
        const scores = timeline.map((t: any) => t.score).join(" → ");
        const firstScore = timeline[0].score;
        const improvement = current - firstScore;
        reply = `Your SAT progression: **${scores}**\n\nYou improved ${improvement} points from your first attempt. Current score: **${current}**.`;
      } else {
        reply = `Your current SAT is **${current}**.${timeline && timeline.length > 1 ? " I'm tracking your progression and can break it down on request." : ""}`;
      }
      
      // Optional: Add color from transcripts
      const colorChips = await pineconeQueryKindLocked({ 
        q: "SAT improvement narrative", 
        kind: "TRANS-INTEL", 
        studentId: agentState.studentId, 
        k: 2 
      });
      chips.push(...colorChips.slice(0, 1)); // Add one narrative chip for context

      return { 
        reply, 
        evidence_chips: chips, 
        evidence_quality: evidenceCheck.quality,
        state: agentState 
      };
    }
    
    // 0) Original SAT from vitals (if query hints 'sat') - keep for backward compatibility
    const isSatIntent = /sat/i.test(message);
    let vitals = null;
    let vitalsSat: { timeline?: any[]; submitted?: number | null } | null = null;
    if (isSatIntent && studentId) {
      vitals = await getStudentVitals(studentId);
      const sat = satFromVitals(vitals);
      if (sat?.timeline?.length) {
        vitalsSat = sat;
        // Try to build SAT reply directly from vitals
        const satReply = buildSatReplyFromVitals(message, sat, { persona: "jenny" });
        if (satReply) {
          log.info({ satReply }, "Using SAT vitals-first reply");
          return {
            reply: satReply,
            evidence_chips: [],
            state: { coachId, studentId, nowWeek: getWeekNumber(new Date()), phase: 1, memory: {} }
          };
        }
      }
    }

    // 1) Canon-first retrieval
    let evidence: any[] = [];
    if (canonKey && studentId) {
      evidence = await canonPassSearch(studentId, canonKey, message, 10);
    }

    // 2) Guarded fallback if canon is empty or looks junky
    const looksJunky = (arr: any[]) => {
      const joined = (arr.map(x=>x.text||x.content||"").join(" ").toLowerCase());
      return /(awards and honors|only \d+ academic|activities:)/.test(joined);
    };
    if (!evidence?.length || looksJunky(evidence)) {
      const q2 = /award/i.test(message) && /(final|actually won|won so far)/i.test(message)
        ? "Final Award List - International - National"
        : message;
      const filter = /award/i.test(message) ? { kind: { $in: ["APP-DOC","GAMEPLAN"] } } : undefined;
      const fallback = await retrieverSearch(q2, 10, filter, studentId);
      if (fallback?.length) evidence = fallback;
      log.warn({ reason: "fallback", q2, count: evidence?.length }, "retrieval.fallback.used");
    }
    
    log.debug({ hitsTop3: evidence.slice(0,3).map(h=>({kind:h.kind||h.metadata?.kind, doc:h.title||h.metadata?.doc_name, score:h.score||h._canonScore})) }, "retrieval.top3");
    
    // Get student vitals if studentId is available (already fetched above for SAT)
    if (!vitals && studentId) {
      vitals = await getStudentVitals(studentId);
    }
    
    // Check for opportunity-related questions
    let opportunityData = null;
    if (isOpportunityQuestion(message) && studentId) {
      opportunityData = await fetchOpportunityData(message, studentId);
    }
    
    // Check for report-related questions
    let reportData = null;
    if (isReportQuestion(message) && studentId) {
      reportData = await fetchReportData(message, studentId);
    }
    
    // 3) Select and synthesize
    const selected = pickInitialEvidence(evidence, { message });
    let facts = synthesizeFactsFromEvidence(selected, { message });

    // 4) If SAT: merge vitals-first
    if (vitalsSat) {
      facts = facts || {};
      facts.satTimeline = vitalsSat.timeline?.length ? vitalsSat.timeline : facts.satTimeline;
      facts.satSubmitted = typeof vitalsSat.submitted === "number" ? vitalsSat.submitted : facts.satSubmitted ?? null;
    }

    // 5) If comparison intent: compute set ops (initial vs final)
    const wantsCompare = /compare|gap|vs/i.test(message) && /award/i.test(message);
    let comparison: any = null;
    if (wantsCompare && studentId) {
      // Pull both sets deterministically
      const initialHits = await canonPassSearch(studentId, "GAMEPLAN_INITIAL_AWARDS", "initial awards gameplan", 8);
      const finalHits = await canonPassSearch(studentId, "APP_FINAL_AWARDS_STRICT", "final award list", 8);
      const initialFacts = synthesizeFactsFromEvidence(initialHits, { message: "initial awards" });
      const finalFacts = synthesizeFactsFromEvidence(finalHits, { message: "final awards" });

      const initial = initialFacts.gameplanLists?.awards || [];
      const actual = finalFacts.gameplanLists?.awards || [];
      comparison = compareAwardSets(initial, actual);

      // Merge into main facts (so composer can render)
      facts = facts || {};
      (facts as any)._sources = { initialAwards: initial, finalAwards: actual };
      (facts as any).comparison = comparison;
    }

    // Detect scope from user message
    const scope = detectScopeAndTime(message);
    const isFact = isFactualQuestion(message);
    
    // Synthesize facts from evidence if this is a factual question
    let factsWithProvenance = facts;
    
    // 6) Compose deterministically in Jenny voice if we have any solid facts
    const haveAwards = facts?.gameplanLists?.awards?.length;
    const haveSat = facts?.satTimeline?.length;
    let determinedReply = null;
    
    if (haveAwards || haveSat || comparison) {
      determinedReply = composeJennyReplyNew(message, facts, { persona: "jenny" });
      log.info({ replyPreview: determinedReply.slice(0,140) }, "composer.reply");
    }
    
    // Check if we have a determined reply from facts
    if (determinedReply) {
      log.info({ determinedReply }, "Using fact-based determined reply");
      return {
        reply: determinedReply,
        evidence_chips: (selected || []).slice(0,3).map((h:any) => ({
          title: h.doc_name || h.metadata?.doc_name || h.title,
          kind: h.kind, link: h.link, week: h.week, phase: h.phase
        })),
        state: agentState
      };
    }
    
    // 7) If still thin → last resort fallback re-query with anchors
    if (/award/i.test(message)) {
      const anchors = [
        "Final Award List - International - National",
        "Common App Final Awards",
        "NCWIT AP Scholar College Board Award"
      ];
      for (const a of anchors) {
        const hits = await retrieverSearch(a, 8, { kind: { $in: ["APP-DOC","GAMEPLAN"] } }, studentId);
        const pick = pickInitialEvidence(hits, { message });
        const f2 = synthesizeFactsFromEvidence(pick, { message });
        if (f2?.gameplanLists?.awards?.length) {
          const reply = composeJennyReplyNew(message, f2, { persona: "jenny" });
          return { 
            reply, 
            evidence_chips: pick.slice(0,3).map((h:any) => ({
              title: h.doc_name || h.metadata?.doc_name || h.title,
              kind: h.kind, link: h.link, week: h.week, phase: h.phase
            })), 
            state: agentState 
          };
        }
      }
    }
    
    const extractedFacts = factsWithProvenance;
    
    // Build system prompt and context
    const systemPrompt = getSystemPrompt(agentState, vitals, opportunityData, reportData);
    
    // Build context with evidence AND extracted facts
    const contextMessages: any[] = [
      { role: "system", content: systemPrompt }
    ];
    
    if (isFact && evidence.length > 0) {
      // Include full evidence text for the LLM to process
      let evidenceContext = "Evidence from your records:\n" + 
        evidence.map((e: any, i: number) => {
          const text = e.text || e.content || '';
          return `${i+1}. [Week ${e.week}] ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`;
        }).join('\n\n');
      
      // Add extracted facts if available
      if (extractedFacts) {
        let factsContext = "\n\nExtracted facts from evidence:";
        if (extractedFacts.satTimeline?.length) {
          factsContext += "\nSAT Timeline: " + extractedFacts.satTimeline.map(s => `${s.date}: ${s.score}`).join(', ');
        }
        if (extractedFacts.submissions?.length) {
          factsContext += "\nSubmissions: " + extractedFacts.submissions.map(s => s.date).join(', ');
        }
        if (extractedFacts.gameplanLists?.extracurriculars?.length) {
          factsContext += "\nExtracurriculars: " + extractedFacts.gameplanLists.extracurriculars.join(', ');
        }
        if (extractedFacts.gameplanLists?.awards?.length) {
          factsContext += "\nAwards: " + extractedFacts.gameplanLists.awards.join(', ');
        }
        evidenceContext += factsContext;
      }
      
      contextMessages.push({ role: "system", content: evidenceContext });
      contextMessages.push({ role: "system", content: "IMPORTANT: Use the evidence above to provide specific, factual answers. Quote exact numbers, dates, and details from the evidence. Never say you don't have access to information if it's in the evidence above." });
    }
    
    contextMessages.push({ role: "user", content: message });
    
    // Determine if we should use tools
    const wantsTools = shouldUseTools(intent, message);
    const tools = wantsTools ? TOOL_SCHEMA : [];
    
    // Call LLM with tool support
    const result = await llmWithTools(contextMessages, tools, {
      studentId: studentId || agentState.studentId,
      model: MODEL_CURRENT,
      temperature: isFact ? 0.1 : DEFAULT_TEMPERATURE,
      maxTokens: MAX_TOKENS
    });
    
    let reply = determinedReply || result.text || "I'm here to help with your college journey.";
    
    // Enforce factual response - remove hedging and ensure we use the evidence
    if (isFact) {
      const FORBIDDEN_PHRASES = [
        /i don['']?t have access/gi,
        /i cannot access/gi,
        /as an ai/gi,
        /i don['']?t know/gi,
        /i'm here to provide guidance/gi,
        /i can't access your specific/gi,
        /unfortunately, i can't/gi,
        /i'm checking your records now/gi
      ];
      
      FORBIDDEN_PHRASES.forEach(rx => {
        reply = reply.replace(rx, '').trim();
      });
      
      // If reply is too short after removing forbidden phrases, use extracted facts
      if (reply.length < 50 && extractedFacts) {
        const facts = [];
        if (extractedFacts.satTimeline?.length) {
          facts.push(`Your SAT progression: ${extractedFacts.satTimeline.map(s => `${s.score} (${s.date})`).join(' → ')}`);
        }
        if (extractedFacts.gameplanLists?.extracurriculars?.length) {
          facts.push(`Your extracurriculars include: ${extractedFacts.gameplanLists.extracurriculars.join(', ')}`);
        }
        if (extractedFacts.gameplanLists?.awards?.length) {
          facts.push(`Your awards: ${extractedFacts.gameplanLists.awards.join(', ')}`);
        }
        
        if (facts.length > 0) {
          reply = facts.join('\n\n') + '\n\n' + reply;
        }
      }
      
      // Special handling for award/EC queries - if we have the facts but LLM didn't use them
      const lowerMessage = message.toLowerCase();
      if ((lowerMessage.includes('award') || lowerMessage.includes('extracurricular') || lowerMessage.includes('ec')) && 
          extractedFacts?.gameplanLists) {
        if (lowerMessage.includes('award') && extractedFacts.gameplanLists.awards && extractedFacts.gameplanLists.awards.length > 0) {
          if (!reply.includes(extractedFacts.gameplanLists.awards[0])) {
            reply = `Based on your records, here are your awards:\n\n${extractedFacts.gameplanLists.awards.map((a, i) => `${i+1}. ${a}`).join('\n')}\n\n[source: Final ECs and Awards List]`;
          }
        }
        if ((lowerMessage.includes('extracurricular') || lowerMessage.includes('ec')) && 
            extractedFacts.gameplanLists.extracurriculars && extractedFacts.gameplanLists.extracurriculars.length > 0) {
          if (!reply.includes(extractedFacts.gameplanLists.extracurriculars[0])) {
            reply = `Based on your records, here are your extracurricular activities:\n\n${extractedFacts.gameplanLists.extracurriculars.map((e, i) => `${i+1}. ${e}`).join('\n')}\n\n[source: Application documents]`;
          }
        }
      }
    }
    
    // Final enforcement with vitals if needed
    reply = enforceFactualResponse(reply, message, vitals);
    
    // Enforce evidence discipline
    const evidenceEnforcement = enforceEvidence(
      evidence.slice(0, 3).map(e => ({
        id: e.id,
        text: e.text || e.content,
        kind: e.kind || e.metadata?.kind,
        doc_name: e.doc_name || e.metadata?.doc_name,
        metadata: e.metadata || e,
        canonical: e.canonical || e.metadata?.canonical
      })),
      reply,
      intent.topic || 'other',  // Convert UserIntent to string
      message
    );
    
    if (evidenceEnforcement.warnings.length > 0) {
      log.warn({ warnings: evidenceEnforcement.warnings }, "Evidence warnings");
    }
    
    // Guardrail logging - track response metrics
    const chipKinds = evidenceEnforcement.chips.map(c => c.kind).filter(Boolean);
    const uniqueKinds = [...new Set(chipKinds)];
    const vitalsUsed = !!vitals && Object.keys(vitals).length > 0;
    const gatePassed = evidenceEnforcement.chips.length > 0 && !reply.toLowerCase().includes("don't have access");
    
    log.info({
      reqId: Date.now().toString(36), // Simple request ID
      studentId: studentId || agentState.studentId,
      intent: intent.topic || 'other',
      chips: evidenceEnforcement.chips.length,
      kinds: uniqueKinds,
      vitalsUsed,
      gatePassed,
      quality: evidenceEnforcement.quality
    }, "response-metrics");
    
    return {
      reply: evidenceEnforcement.reply,
      evidence_chips: evidenceEnforcement.chips,
      evidence_quality: evidenceEnforcement.quality,
      state: agentState
    };
  } catch (error) {
    log.error({ 
      error: error instanceof Error ? error.message : String(error), 
      stack: error instanceof Error ? error.stack : undefined,
      studentId: agentState.studentId,
      message
    }, "orchestrator error - falling back to runNode");
    console.error("Orchestrator error:", error);
    // Fallback to graph node
    return runNode(agentState, message);
  }
}

async function ensureEvidence(query: string, topK: number = 3, studentId?: string, intent?: any) {
  try {
    // Get canonical key from intent
    const canonKey = intentToCanonKey(intent);
    const canon = canonKey && studentId ? getCanon(canonKey, studentId) : undefined;
    
    // For award/EC queries, also search for the final lists document
    let searchQuery = query;
    if (query.toLowerCase().includes('award') || query.toLowerCase().includes('extracurricular') || query.toLowerCase().includes('ec')) {
      searchQuery = query + " Final ECs Awards List";
    }
    
    const response = await fetch(`${RETRIEVER_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        q: searchQuery, 
        k: topK,
        student: studentId,
        hint: {
          timeframe: intent?.timeframe,
          topic: intent?.topic,
          canonKey: canonKey,
          canonDoc: canon
        }
      })
    });
    
    if (!response.ok) {
      log.warn({ status: response.status }, "retriever search failed");
      return [];
    }
    
    const results = await response.json();
    
    // Debug log to see what we're getting from retriever
    if (results.length > 0) {
      log.info({ 
        firstResult: results[0], 
        hasMetadata: !!results[0]?.metadata,
        hasText: !!results[0]?.metadata?.text,
        metadataKeys: results[0]?.metadata ? Object.keys(results[0].metadata) : []
      }, "Retriever response structure");
    }
    
    return results.map((r: any) => ({
      title: r.metadata?.text?.substring(0, 50) + "..." || r.text?.substring(0, 50) + "...",
      text: r.metadata?.text || r.text || '', // Include full text for fact synthesis
      content: r.content || r.text || '', // Alternative field name
      kind: r.metadata?.kind || "UNKNOWN",
      week: r.metadata?.week || 0,
      phase: r.metadata?.phase || "P1",
      link: r.metadata?.link || "",
      span: r.id,
      score: r.score || 0,
      metadata: r.metadata || {}
    }));
  } catch (error) {
    log.error(error, "evidence retrieval failed");
    return [];
  }
}


function getSystemPrompt(state: AgentState, vitals?: any, opportunityData?: any, reportData?: any) {
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
  
  if (reportData) {
    if (reportData && reportData.formattedResponse) {
      prompt += '\n\nREPORT DATA (use this formatted response):\n' + reportData.formattedResponse;
    } else if (reportData) {
      prompt += '\n\nREPORT DATA:\n' + JSON.stringify(reportData, null, 2);
    }
    prompt += '\n\nIMPORTANT: When asked about reports or success rates, use the formatted response above directly. Include the markdown table and insights as provided.';
  }
  
  return prompt;
}

function isOpportunityQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return /opportunity|opportunities|bombardment|summer program|research|scholarship|award|competition|what should i apply|recommendations/i.test(lowerMessage);
}

function isReportQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return /success rate|win rate|acceptance rate|rejection rate|temporal pattern|weekly pattern|bombardment result|yield|category performance|how many.*accepted|how many.*rejected|show.*report/i.test(lowerMessage);
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

async function fetchReportData(message: string, studentId: string) {
  try {
    const lowerMessage = message.toLowerCase();
    const API_URL = process.env.API_URL || 'http://localhost:4000';
    
    // Determine report type
    let reportType = 'yield'; // default
    if (lowerMessage.includes('temporal') || lowerMessage.includes('weekly') || lowerMessage.includes('bombardment result') || lowerMessage.includes('rebound')) {
      reportType = 'temporal';
    }
    
    const response = await fetch(`${API_URL}/reports/${studentId}?type=${reportType}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Format for agent consumption with markdown
      if (reportType === 'yield') {
        // Create markdown table
        let markdownTable = `Overall win rate: ${data.summary.overallWinRate}% across ${data.summary.totalApplications} applications\n\n`;
        markdownTable += '| Category | Applications | Accepted | Win Rate |\n';
        markdownTable += '|----------|--------------|----------|----------|\n';
        
        data.categories.forEach((c: any) => {
          markdownTable += `| ${c.category} | ${c.total} | ${c.accepted} | ${c.win_rate_pct}% |\n`;
        });
        
        if (data.insights.highYield.length > 0) {
          markdownTable += `\n**High-yield categories (80%+)**: ${data.insights.highYield.map((c: any) => c.category).join(', ')}`;
        }
        if (data.insights.challenging.length > 0) {
          markdownTable += `\n**Challenging categories (<50%)**: ${data.insights.challenging.map((c: any) => c.category).join(', ')} (needs 3x buffer strategy)`;
        }
        
        return {
          type: 'yield_report',
          formattedResponse: markdownTable,
          raw: data
        };
      } else {
        // Format temporal report
        let temporalSummary = `**Temporal Analysis**\n\n`;
        temporalSummary += `- **Bombardment weeks**: ${data.summary.bombardmentWeeks} (5+ applications)\n`;
        temporalSummary += `- **Rejection rebounds**: ${data.summary.rejectionRebounds}\n`;
        if (data.summary.avgReboundDays) {
          temporalSummary += `- **Average rebound time**: ${data.summary.avgReboundDays} days\n`;
        }
        temporalSummary += `\n${data.patterns.bombardment.count} bombardment weeks with ${data.patterns.bombardment.avgWinRate}% average win rate.\n`;
        
        if (data.patterns.resilience.rebounds > 0) {
          temporalSummary += `\n**Resilience**: ${data.patterns.resilience.rebounds} successful rebounds from rejection to acceptance.`;
        }
        
        return {
          type: 'temporal_report',
          formattedResponse: temporalSummary,
          raw: data
        };
      }
    }
  } catch (error) {
    log.error(error, "Failed to fetch report data");
  }
  
  return null;
}
