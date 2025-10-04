// services/jenny-api/src/router/intentRouter.ts
import OpenAI from "openai";
import { z } from "zod";
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import * as resolvers from '../services/resolvers.js';
import type { Pool } from 'pg';

const log = createLogger('intent-router');
const ROUTE_THRESHOLD = Number(process.env.INTENT_ROUTE_THRESHOLD ?? "0.62"); // Route if confidence >= 0.62
const CLARIFY_THRESHOLD = Number(process.env.INTENT_CLARIFY_THRESHOLD ?? "0.45"); // Ask clarifying question if 0.45-0.62

// ============================================================================
// GPT-5 Intent Classifier (inlined to avoid module issues)
// ============================================================================

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Intent =
  | "ecs.list"
  | "awards.list"
  | "programs.list"
  | "academics.summary"
  | "narrative.summary"
  | "progression.timeline"
  | "sat.ordinal"
  | "kb.search"
  | "unknown";

type Phase = "initial" | "final" | null;
type Object = "ec" | "award" | "program" | "academics" | "narrative" | "sat";
type NthOrdinal = "first" | "second" | "third" | "latest" | number;

const IntentSchema = z.object({
  intent: z.custom<Intent>(),
  phase: z.custom<Phase>(),
  object: z.custom<Object>(),
  filters: z.object({
    as_of: z.string().nullable().optional(),
    school: z.string().nullable().optional(),
    scope: z.string().nullable().optional(),
    nth: z.union([z.string(), z.number()]).nullable().optional(),
    components: z.array(z.string()).nullable().optional(),
  }).optional(),
  confidence: z.number().min(0).max(1),
  detector: z.enum(["llm","keyword-floor"]).optional(),
});

// 48-example comprehensive training pack with synonym coverage
const FEW_SHOT = [
  // ECs - Initial (4 examples)
  {input:"what was my initial EC list?", output:{intent:"ecs.list", phase:"initial", object:"ec", filters:{}, confidence:0.95}},
  {input:"show the extracurriculars from my game plan", output:{intent:"ecs.list", phase:"initial", object:"ec", filters:{}, confidence:0.93}},
  {input:"what activities did we target at the start?", output:{intent:"ecs.list", phase:"initial", object:"ec", filters:{}, confidence:0.9}},
  {input:"in the gameplan, which ECs were listed?", output:{intent:"ecs.list", phase:"initial", object:"ec", filters:{}, confidence:0.92}},

  // ECs - Final (4 examples)
  {input:"what was my final EC list?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.95}},
  {input:"which activities made it into my Common App?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.96}},
  {input:"ECs I submitted in the college application", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.94}},
  {input:"what ECs did I end up submitting?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.93}},

  // Awards - Initial (4 examples)
  {input:"what was my initial awards list?", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.95}},
  {input:"game plan award targets", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.92}},
  {input:"which honors did we aim for initially?", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.91}},
  {input:"initial list of prizes to pursue", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.9}},

  // Awards - Final (4 examples)
  {input:"what was my final awards list?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.95}},
  {input:"which awards did I submit on my application?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.96}},
  {input:"which honors ended up on the Common App?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.95}},
  {input:"awards that made the final cut", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.92}},

  // Awards - Wins/Progression (4 examples)
  {input:"which awards did I win?", output:{intent:"progression.timeline", phase:null, object:"award", filters:{scope:null}, confidence:0.95}},
  {input:"show my award wins", output:{intent:"progression.timeline", phase:null, object:"award", filters:{}, confidence:0.94}},
  {input:"what awards did I actually get?", output:{intent:"progression.timeline", phase:null, object:"award", filters:{}, confidence:0.95}},
  {input:"list the awards I ended up winning", output:{intent:"progression.timeline", phase:null, object:"award", filters:{}, confidence:0.94}},

  // Programs - Initial (4 examples)
  {input:"what were my initial summer programs?", output:{intent:"programs.list", phase:"initial", object:"program", filters:{}, confidence:0.95}},
  {input:"summer program targets from the game plan", output:{intent:"programs.list", phase:"initial", object:"program", filters:{}, confidence:0.93}},
  {input:"which summer camps were we aiming for?", output:{intent:"programs.list", phase:"initial", object:"program", filters:{}, confidence:0.91}},
  {input:"planned summer programs", output:{intent:"programs.list", phase:"initial", object:"program", filters:{}, confidence:0.9}},

  // Programs - Final (4 examples)
  {input:"which summer programs did I get into?", output:{intent:"programs.list", phase:"final", object:"program", filters:{}, confidence:0.96}},
  {input:"summer programs I was accepted to", output:{intent:"programs.list", phase:"final", object:"program", filters:{}, confidence:0.96}},
  {input:"final list of summer programs", output:{intent:"programs.list", phase:"final", object:"program", filters:{}, confidence:0.94}},
  {input:"what summer programs ended up on the app?", output:{intent:"programs.list", phase:"final", object:"program", filters:{}, confidence:0.93}},

  // Narrative - Initial (4 examples)
  {input:"what was my initial narrative?", output:{intent:"narrative.summary", phase:"initial", object:"narrative", filters:{}, confidence:0.95}},
  {input:"game plan narrative (identity+passion+aptitude+cause)", output:{intent:"narrative.summary", phase:"initial", object:"narrative", filters:{}, confidence:0.95}},
  {input:"the starting USP narrative we defined", output:{intent:"narrative.summary", phase:"initial", object:"narrative", filters:{}, confidence:0.92}},
  {input:"initial why-statement and framing", output:{intent:"narrative.summary", phase:"initial", object:"narrative", filters:{}, confidence:0.92}},

  // Narrative - Final (4 examples)
  {input:"what was my final narrative?", output:{intent:"narrative.summary", phase:"final", object:"narrative", filters:{}, confidence:0.95}},
  {input:"how did we frame the final story on the Common App?", output:{intent:"narrative.summary", phase:"final", object:"narrative", filters:{}, confidence:0.94}},
  {input:"final USP as submitted", output:{intent:"narrative.summary", phase:"final", object:"narrative", filters:{}, confidence:0.93}},
  {input:"what was my narrative in the submitted app?", output:{intent:"narrative.summary", phase:"final", object:"narrative", filters:{}, confidence:0.94}},

  // Academics - Initial (4 examples)
  {input:"what was my initial academics?", output:{intent:"academics.summary", phase:"initial", object:"academics", filters:{components:["grades","sat","gpa"]}, confidence:0.9}},
  {input:"initial grades and SAT from the assessment", output:{intent:"academics.summary", phase:"initial", object:"academics", filters:{components:["grades","sat"]}, confidence:0.92}},
  {input:"baseline GPA + test scores", output:{intent:"academics.summary", phase:"initial", object:"academics", filters:{components:["gpa","sat"]}, confidence:0.9}},
  {input:"what did my early transcript look like?", output:{intent:"academics.summary", phase:"initial", object:"academics", filters:{components:["grades","gpa"]}, confidence:0.88}},

  // Academics - Final (4 examples)
  {input:"what were my final academics?", output:{intent:"academics.summary", phase:"final", object:"academics", filters:{components:["grades","gpa","sat","ap"]}, confidence:0.94}},
  {input:"final grades/GPA and submitted test scores", output:{intent:"academics.summary", phase:"final", object:"academics", filters:{components:["grades","gpa","sat","ap"]}, confidence:0.95}},
  {input:"academics as submitted on the Common App", output:{intent:"academics.summary", phase:"final", object:"academics", filters:{components:["grades","gpa","sat","ap"]}, confidence:0.94}},
  {input:"what did I submit for GPA and SAT?", output:{intent:"academics.summary", phase:"final", object:"academics", filters:{components:["gpa","sat"]}, confidence:0.94}},

  // Progression (4 examples)
  {input:"show my progress from plan to outcome for ECs", output:{intent:"progression.timeline", phase:null, object:"ec", filters:{}, confidence:0.93}},
  {input:"timeline of awards from target to win", output:{intent:"progression.timeline", phase:null, object:"award", filters:{}, confidence:0.94}},
  {input:"how did my summer programs progress?", output:{intent:"progression.timeline", phase:null, object:"program", filters:{}, confidence:0.92}},
  {input:"from initial narrative to final—what changed?", output:{intent:"progression.timeline", phase:null, object:"narrative", filters:{}, confidence:0.9}},

  // SAT Ordinals (4 examples)
  {input:"what was my first SAT score?", output:{intent:"sat.ordinal", phase:null, object:"sat", filters:{nth:"first"}, confidence:0.96}},
  {input:"what was my second SAT score?", output:{intent:"sat.ordinal", phase:null, object:"sat", filters:{nth:"second"}, confidence:0.96}},
  {input:"what's my latest SAT?", output:{intent:"sat.ordinal", phase:null, object:"sat", filters:{nth:"latest"}, confidence:0.96}},
  {input:"SAT progression", output:{intent:"progression.timeline", phase:null, object:"sat", filters:{}, confidence:0.95}},
];

const SYS = `You are an intent classifier for a college admissions coaching agent.
Output ONLY valid JSON matching this schema:
{
  "intent": "ecs.list|awards.list|programs.list|academics.summary|narrative.summary|progression.timeline|sat.ordinal|kb.search|unknown",
  "phase": "initial|final|null",
  "object": "ec|award|program|academics|narrative|sat",
  "filters": {
    "as_of"?: string|null,
    "school"?: string|null,
    "scope"?: string|null,
    "nth"?: string|number|null,
    "components"?: string[]|null
  },
  "confidence": number[0..1]
}

PHASE MAPPING:
- "initial", "gameplan", "game plan", "planned", "at the start", "kickoff", "early", "baseline" -> phase:"initial"
- "final", "submitted", "application", "college app", "CommonApp", "as submitted", "made it", "ended up" -> phase:"final"
- For progression/timeline queries -> phase:null
- For ordinal queries (first/second/latest SAT) -> phase:null

OBJECT SYNONYMS:
- ECs: "ECs", "activities", "extracurriculars", "clubs", "involvements" -> object:"ec"
- Awards: "awards", "honors", "prizes", "distinctions" -> object:"award"
- Programs: "summer programs", "summer camps", "selective programs", "YYGS", "SAMS", "RSI" -> object:"program"
- Academics: "academics", "grades and tests", "transcript and scores", "GPA and SAT", "academic stats" -> object:"academics"
- Narrative: "narrative", "USP", "story", "identity/passion/aptitude/cause", "why-statement" -> object:"narrative"

INTENT ROUTING RULES:
- "which ECs/awards/programs did I win/get in/get into?" -> intent:"progression.timeline", phase:null
- "what was my first/second/latest SAT?" -> intent:"sat.ordinal", phase:null, filters:{nth:"first"|"second"|"latest"}
- "SAT progression" -> intent:"progression.timeline", phase:null, object:"sat"
- "show progress from plan to outcome" -> intent:"progression.timeline", phase:null
- "initial [object] list" -> intent:"[object].list", phase:"initial"
- "final [object] list" -> intent:"[object].list", phase:"final"

ACADEMICS HANDLING:
- Extract components from query: "grades", "gpa", "sat", "act", "ap", "transcript"
- "what was my initial academics?" -> intent:"academics.summary", phase:"initial", filters:{components:["grades","sat","gpa"]}
- "final GPA and SAT" -> intent:"academics.summary", phase:"final", filters:{components:["gpa","sat"]}
- Always populate filters.components for academics queries

CONFIDENCE GUARDRAILS:
- High confidence (>=0.85): Clear phase + object match
- Medium (0.6-0.84): Fuzzy phrasing but clear intent
- Low (<0.6): Ambiguous or missing critical slots
- NEVER hallucinate; return low confidence if unclear`;

// ============================================================================
// Fuzzing Recipe: Synonym expansion for robust natural language handling
// ============================================================================

const PHASE_SYNONYMS = {
  initial: ["initial", "at the start", "in the game plan", "planned", "kickoff", "early", "baseline", "gameplan", "game plan"],
  final: ["final", "as submitted", "in the Common App", "in my college application", "submitted", "what made it", "what ended up", "application"]
};

const OBJECT_SYNONYMS = {
  ec: ["ECs", "activities", "extracurriculars", "clubs", "involvements"],
  award: ["awards", "honors", "prizes", "distinctions"],
  program: ["summer programs", "summer camps", "summer plan programs", "selective programs"],
  academics: ["academics", "grades and tests", "transcript and scores", "GPA and SAT", "academic stats"],
  narrative: ["narrative", "USP", "story", "identity", "passion", "aptitude", "cause", "why-statement"]
};

const ACCEPTANCE_VERBS = ["got in", "get in", "got into", "accepted to", "admitted to", "made it into"];
const ORDINALS = ["first", "second", "third", "latest", "last", "earliest", "initial"];

// Keyword floor detection for academics queries
const ACADEMIC_KEYWORDS = ['academic', 'academics', 'academic stats', 'report card'];

function keywordFloor(query: string): any | null {
  const t = query.toLowerCase();

  // Don't catch specific SAT/GPA/grade queries - let LLM handle those with proper phase/nth detection
  if (t.includes('sat') || t.includes('gpa') || t.includes('grade') || t.includes('transcript')) {
    return null;
  }

  // Only catch generic "academics" queries
  const hasAcademics = ACADEMIC_KEYWORDS.some(k => t.includes(k));
  if (!hasAcademics) return null;

  log.event('intent.keyword_floor_hit', { query: query.slice(0, 50) });

  // Detect phase using fuzzy synonym matching
  let phase: Phase = null;
  if (PHASE_SYNONYMS.initial.some(s => t.includes(s))) {
    phase = "initial";
  } else if (PHASE_SYNONYMS.final.some(s => t.includes(s))) {
    phase = "final";
  }

  // Default to summary for vague "academics" queries
  return {
    intent: "academics.summary",
    phase,
    object: "academics",
    filters: { components: ["grades", "gpa", "sat"] },
    confidence: 0.70,
    detector: "keyword-floor"
  };
}

async function classifyIntent(user: string) {
  // 1. Try keyword floor first (deterministic)
  const kwFloor = keywordFloor(user);
  if (kwFloor) {
    return IntentSchema.parse(kwFloor);
  }

  // 2. LLM classification with 48 comprehensive examples
  const examples = FEW_SHOT.map(e =>
    `USER: ${e.input}\nLABEL: ${JSON.stringify(e.output)}`
  ).join("\n\n");
  const prompt = `${examples}\n\nUSER: ${user}\nLABEL:`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYS },
      { role: "user", content: prompt }
    ]
  });

  const raw = r.choices[0]?.message?.content ?? "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
    parsed.detector = "llm";
  } catch {
    parsed = {
      intent: "unknown",
      phase: null,
      object: "academics",
      filters: {},
      confidence: 0.0,
      detector: "llm"
    };
  }
  return IntentSchema.parse(parsed);
}

// ============================================================================
// Intent Router
// ============================================================================

export async function routePrompt({ studentId, message, pg }: {studentId:string, message:string, pg: Pool}) {
  const t0 = Date.now();
  const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

  log.event('router.route_start', { student_id: studentId, query_preview: message.slice(0, 80), trace_id: traceId });

  try {
    const intent = await classifyIntent(message);

    log.event('intent.classify', {
      trace_id: traceId,
      intent: intent.intent,
      object: intent.object,
      phase: intent.phase,
      confidence: intent.confidence,
      detector: intent.detector,
      took_ms: Date.now() - t0
    });

    // Confidence-based routing with tiered responses
    if (intent.confidence < CLARIFY_THRESHOLD) {
      // Very low confidence (< 0.45): Suggest trying specific queries
      log.event('intent.very_low_confidence', { trace_id: traceId, confidence: intent.confidence, query: message.slice(0, 50) });
      return {
        answer: `I'm not quite sure what you're asking for. Try asking for something specific like:\n• "final EC list"\n• "initial awards list"\n• "what awards did I win?"\n• "what was my first SAT score?"`,
        chips: [{kind:"notice", text:`confidence: ${(intent.confidence*100).toFixed(0)}%`}],
        traceId,
        intent,
      };
    }

    if (intent.confidence < ROUTE_THRESHOLD) {
      // Medium confidence (0.45-0.62): Ask clarifying question with best guess
      log.event('intent.mid_confidence', { trace_id: traceId, confidence: intent.confidence });

      const phaseLabel = intent.phase === "initial" ? "initial" : intent.phase === "final" ? "final" : "";
      const objectLabel = intent.object === "ec" ? "ECs"
        : intent.object === "award" ? "awards"
        : intent.object === "program" ? "summer programs"
        : intent.object === "academics" ? "academics"
        : intent.object === "narrative" ? "narrative" : intent.object;
      const suggestion = phaseLabel ? `${phaseLabel} ${objectLabel}` : objectLabel;

      return {
        answer: `I think you want **${suggestion}**—should I pull that? (${(intent.confidence*100).toFixed(0)}% confident)\n\nOr try rephrasing your question for better accuracy.`,
        chips: [
          {kind:"notice", text:`inferred: ${intent.intent}`},
          {kind:"notice", text:`confidence: ${(intent.confidence*100).toFixed(0)}%`}
        ],
        traceId,
        intent,
      };
    }

    // High confidence (>= 0.62): Route to resolver
    let data;
    switch (intent.intent) {
      case "ecs.list":
        data = await resolvers.ecsList(pg, studentId, intent.phase);
        break;
      case "awards.list":
        data = await resolvers.awardsList(pg, studentId, intent.phase);
        break;
      case "programs.list":
        data = await resolvers.programsList(pg, studentId, intent.phase);
        break;
      case "academics.summary":
        data = await resolvers.academicsSummary(pg, studentId, intent.phase, intent.filters);
        break;
      case "narrative.summary":
        // Route to initial or final based on phase
        if (intent.phase === "initial") {
          data = await resolvers.narrativeInitial(pg, studentId);
        } else if (intent.phase === "final") {
          data = await resolvers.narrativeFinal(pg, studentId);
        } else {
          // Default to final for null phase
          data = await resolvers.narrativeFinal(pg, studentId);
        }
        break;
      case "progression.timeline":
        // Handle progression queries - map to existing "wins" resolvers
        if (intent.object === "award") {
          data = await resolvers.awardsWins(pg, studentId);
        } else if (intent.object === "program") {
          data = await resolvers.programsAdmits(pg, studentId);
        } else if (intent.object === "sat") {
          data = await resolvers.academicsSAT(pg, studentId, "progression", {});
        } else {
          data = { answer: "Progression tracking not yet implemented for this entity.", chips:[], hits:[] };
        }
        break;
      case "sat.ordinal":
        // Handle SAT ordinal queries (first, second, latest)
        const nth = intent.filters?.nth;
        let satPhase = "latest";
        if (nth === "first" || nth === 1) satPhase = "first";
        else if (nth === "latest") satPhase = "latest";
        else if (typeof nth === "number" || nth === "second" || nth === "third") satPhase = "nth";

        data = await resolvers.academicsSAT(pg, studentId, satPhase, intent.filters);
        break;
      default:
        data = await resolvers.kbSearch(pg, studentId, message);
    }

    log.event('router.route_complete', { trace_id: traceId, took_ms: Date.now()-t0 });
    return { ...data, traceId, intent };
  } catch (error: any) {
    log.event('router.route_error', { trace_id: traceId, error: error.message, took_ms: Date.now()-t0 });
    return {
      answer: `Error processing your request: ${error.message}`,
      chips: [{kind: "error", text: "router_error"}],
      traceId,
      hits: []
    };
  }
}
