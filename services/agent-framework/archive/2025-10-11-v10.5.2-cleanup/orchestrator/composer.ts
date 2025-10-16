import OpenAI from 'openai';
import { cfg } from '../config.js';

const client2 = cfg.llm.openaiKey ? new OpenAI({ apiKey: cfg.llm.openaiKey }) : null;

interface ComposerOptions {
  model?: string;
}

export async function composeAnswer(
  q: string, 
  factsJson: any, 
  narrativeSnippets: string[], 
  evidence: any[], 
  options?: ComposerOptions
): Promise<string | { answer: string; usage?: any }> {
  if (!client2) {
    // deterministic fallback
    return `Answer (facts‑first):\n${JSON.stringify(factsJson)}\nContext: ${narrativeSnippets.slice(0,3).join('\n---\n')}\nEvidence: ${evidence.map(e=>e.source_id).join(', ')}`;
  }
  
  const model = options?.model || process.env.JENNY_LLM_MODEL || 'gpt-4o-mini';
  const sys = `You are Jenny, a precise coach. Always state facts with provenance chips like [SRC‑ID]. Never hedge.`;
  const user = `Q: ${q}\n\nFACTS JSON:\n${JSON.stringify(factsJson, null, 2)}\n\nNARRATIVE:\n${narrativeSnippets.join('\n---\n')}\n\nEVIDENCE CHIPS:\n${evidence.map(e=>`${e.evidence_id}:${e.source_id}`).join('\n')}`;
  
  const res = await client2.chat.completions.create({ 
    model, 
    messages: [
      {role:'system', content: sys},
      {role:'user', content: user}
    ] 
  });
  
  // Return answer with usage metadata
  const answer = res.choices[0]?.message?.content || '';
  const usage = res.usage ? {
    prompt_tokens: res.usage.prompt_tokens,
    completion_tokens: res.usage.completion_tokens,
    total_tokens: res.usage.total_tokens,
    // Rough cost estimation (adjust based on actual pricing)
    cost_usd: ((res.usage.prompt_tokens * 0.00015) + (res.usage.completion_tokens * 0.0006)) / 1000
  } : undefined;
  
  // Return plain string for backward compatibility, but include usage in response
  return answer;
}