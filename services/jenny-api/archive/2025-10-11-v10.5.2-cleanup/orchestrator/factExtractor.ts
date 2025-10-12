import OpenAI from 'openai';
import { cfg } from '../config.js';

const client = cfg.llm.openaiKey ? new OpenAI({ apiKey: cfg.llm.openaiKey }) : null;

export type ExtractedFact = { kind: string; value: string|number; date?: string; source_hint?: string };

export async function jsonFactExtractor(contextText: string): Promise<ExtractedFact[]> {
  if (!client) return [];
  const sys = 'Extract atomic, dated student facts as JSON array of {kind, value, date?}. Use controlled kinds if present.';
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [ { role: 'system', content: sys }, { role: 'user', content: contextText } ],
    response_format: { type: 'json_object' }
  });
  try {
    const content = res.choices[0]?.message?.content || '{}';
    const obj = JSON.parse(content);
    return obj.facts ?? [];
  } catch { return []; }
}