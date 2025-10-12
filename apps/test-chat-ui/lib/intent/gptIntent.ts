/**
 * GPT-5 JSON Intent Classifier (Primary)
 *
 * Leverages existing jenny-api 48-example training
 * Uses same intentRouter.ts logic for consistency
 */

import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const IntentSchema = z.object({
  intent: z.string(),
  phase: z.string().nullable(),
  object: z.string().nullable(),
  filters: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1),
});

export type GPTIntentResult = z.infer<typeof IntentSchema>;

/**
 * Classify intent using GPT-5 JSON
 * Uses same prompt as jenny-api for consistency
 */
export async function classifyWithGPT(query: string): Promise<GPTIntentResult> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an intent classifier for a college admissions coaching agent.
Output ONLY valid JSON matching this schema:
{
  "intent": "ecs.list|awards.list|programs.list|academics.summary|narrative.summary|progression.timeline|sat.ordinal|gameplan.initial|gameplan.vs_progress|application.final|ivyready.score|readiness.now|readiness.progress|readiness.whatif.*|college.list|scholarship.*|kb.search|unknown",
  "phase": "initial|final|null",
  "object": "ec|award|program|academics|narrative|sat|gameplan|rubric|readiness|college|scholarship|kb",
  "filters": {},
  "confidence": number[0..1]
}

ROUTING:
- Facts (SQL): ecs.list, awards.list, programs.list, academics.summary, narrative.summary, progression.timeline, sat.ordinal, gameplan.*, application.final, ivyready.*, readiness.*, college.*, scholarship.*
- Coaching (KB): kb.search, time_math, message_template, rejection_response, coaching, strategy, tactics

Phase detection:
- "initial", "game plan", "planned" → phase:"initial"
- "final", "submitted", "Common App" → phase:"final"
- Progression/timeline/wins → phase:null`,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    // Validate with Zod
    const validated = IntentSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[gpt-intent] Schema validation failed:", validated.error);
      return {
        intent: "kb.search",
        phase: null,
        object: "kb",
        filters: {},
        confidence: 0.5,
      };
    }

    return validated.data;
  } catch (error: any) {
    console.error("[gpt-intent] Error:", error.message);
    return {
      intent: "kb.search",
      phase: null,
      object: "kb",
      filters: {},
      confidence: 0.3,
    };
  }
}
