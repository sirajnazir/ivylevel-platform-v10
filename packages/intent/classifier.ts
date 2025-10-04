// packages/intent/classifier.ts
import OpenAI from "openai";
import { z } from "zod";
import { CohereClient } from "cohere-ai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cohere = process.env.COHERE_API_KEY ? new CohereClient({ token: process.env.COHERE_API_KEY }) : null;

export type Intent =
  | "ecs.list"            // list EC targets (initial/final/progression)
  | "awards.list"         // list award targets (initial/final/progression)
  | "programs.list"       // list summer program targets (initial/final/progression)
  | "awards.wins"         // actual awards won (final outcomes)
  | "programs.admits"     // actual summer program admits
  | "academics.sat"       // first/latest/as_of/progression SAT
  | "academics.gpa"       // GPA summary/term/year
  | "academics.transcript" // transcript courses/grades
  | "narrative.initial"   // initial narrative from gameplan
  | "kb.search"           // fallback generic search / RAG (explicit)
  | "unknown";

export type Phase = "initial" | "final" | "progression" | "as_of" | "latest" | "first" | "none";

export const IntentSchema = z.object({
  intent: z.custom<Intent>(),
  entity: z.enum(["ecs","awards","programs","academics","narrative","kb"]),
  phase: z.custom<Phase>(),
  slots: z.object({
    date: z.string().optional(),               // e.g., "2024-03-15" or "March 2024"
    kind: z.string().optional(),               // e.g., "sat_total_score", "gpa_weighted"
    nth: z.number().optional(),                // e.g., second SAT
  }).partial(),
  confidence: z.number().min(0).max(1),
});

const FEW_SHOT = [
  {u:"what was my initial EC list?", a:{intent:"ecs.list", entity:"ecs", phase:"initial"}},
  {u:"my initial activities?",       a:{intent:"ecs.list", entity:"ecs", phase:"initial"}},
  {u:"final ECs list",               a:{intent:"ecs.list", entity:"ecs", phase:"final"}},
  {u:"which awards did I win?",      a:{intent:"awards.wins", entity:"awards", phase:"final"}},
  {u:"final awards list",            a:{intent:"awards.list", entity:"awards", phase:"final"}},
  {u:"what summer programs did I get in?", a:{intent:"programs.admits", entity:"programs", phase:"final"}},
  {u:"initial summer programs",      a:{intent:"programs.list", entity:"programs", phase:"initial"}},
  {u:"what was my first SAT score?", a:{intent:"academics.sat", entity:"academics", phase:"first", slots:{kind:"sat_total_score"}}},
  {u:"what was my latest SAT?",      a:{intent:"academics.sat", entity:"academics", phase:"latest", slots:{kind:"sat_total_score"}}},
  {u:"SAT progression",              a:{intent:"academics.sat", entity:"academics", phase:"progression", slots:{kind:"sat_total_score"}}},
  {u:"what's my GPA?",               a:{intent:"academics.gpa", entity:"academics", phase:"latest"}},
  {u:"initial narrative",            a:{intent:"narrative.initial", entity:"narrative", phase:"initial"}},
  {u:"what is my transcript?",       a:{intent:"academics.transcript", entity:"academics", phase:"final"}},
  {u:"show me my final transcript",  a:{intent:"academics.transcript", entity:"academics", phase:"final"}},
];

const SYS = `You are an intent classifier for a college admissions coaching agent.
Output ONLY valid JSON to match this schema:
{
  "intent": "...",           // see allowed values
  "entity": "ecs|awards|programs|academics|narrative|kb",
  "phase": "initial|final|progression|as_of|latest|first|none",
  "slots": { "date"?: string, "kind"?: string, "nth"?: number },
  "confidence": number[0..1]
}

Rules:
- Map "ECs", "activities", "extracurriculars" -> entity:"ecs".
- "summer programs", "camps", "YYGS/SAMS/RSI/LaunchX" -> entity:"programs".
- "wins", "got in", "admitted", "accepted" -> if awards -> awards.wins; if programs -> programs.admits; phase:"final".
- "final list" -> phase:"final", "initial" -> phase:"initial", "progression" -> phase:"progression".
- "first", "latest" apply to academics.* (SAT/GPA).
- "transcript", "grades", "courses", "report card" -> academics.transcript.
- If unsure but clearly about awards/ecs/programs, set the best entity + phase:"none", confidence<=0.7.
- NEVER hallucinate; keep confidence low if unclear.`;

export async function classifyIntent(user: string) {
  const provider = process.env.INTENT_CLASSIFIER_PROVIDER ?? "openai";
  if (provider === "cohere" && cohere) {
    // Placeholder: simple Cohere Classify call – return minimal mapping.
    // In production, train a Cohere Classify model & map to IntentSchema.
    const out = {
      intent: "kb.search",
      entity: "kb",
      phase: "none",
      slots: {},
      confidence: 0.5,
    };
    return IntentSchema.parse(out);
  }

  const examples = FEW_SHOT.map(e => `USER: ${e.u}\nLABEL: ${JSON.stringify({...e.a, slots:e.a.slots ?? {}, confidence:0.95})}`).join("\n\n");
  const prompt = `${examples}\n\nUSER: ${user}\nLABEL:`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini", // or your GPT-5 classification-capable model
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
  } catch {
    parsed = { intent:"unknown", entity:"kb", phase:"none", slots:{}, confidence:0.0 };
  }
  return IntentSchema.parse(parsed);
}
