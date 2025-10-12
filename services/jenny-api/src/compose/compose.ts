import { openai, moderate } from '../ai/openai';

// v10.1: Meta-leakage stripping helper
// Removes internal metadata from user-facing answers
function stripMetadata(text: string): string {
  if (!text) return text;

  return text
    // Remove chip ID patterns: (W016-RESULT-001), W015-STRATEGY-001
    .replace(/\([A-Z]\d+-[A-Z]+-\d+\)/g, '')
    .replace(/\b[A-Z]\d{3}-[A-Z]+-\d{3}\b/g, '')
    // Remove source citations: *Source*: KBv6_2025-10-06_v1.0
    .replace(/\*Source\*:\s*[^\n]+/gi, '')
    // Remove namespace refs: @ KBv6_2025-10-06_v1.0, KBv6_iMessage_2025-10-07_v1.0
    .replace(/@\s?KBv\d+[^\s]*/g, '')
    .replace(/\bKBv\d+[_\-][^\s]*/gi, '')
    // Remove internal identifiers: chip_id:, scaffold., SRC-, src-, file-, proof_, debug_
    .replace(/chip_id:\s?[A-Z0-9\-]+/gi, '')
    .replace(/scaffold\.[a-z_.]+/gi, '')
    .replace(/\b(?:#|SRC-|src-|file-|proof_|debug_)\S+/gi, '')
    // Remove system prompts leakage
    .replace(/System:|User:|Assistant:/gi, '')
    // Remove internal table/namespace/family refs
    .replace(/\b(?:chip|table|namespace|family)[_:\-a-z0-9]+/gi, '')
    // Remove breakdown metadata
    .replace(/\*\*Breakdown\s?\([A-Z0-9\-]+\)\*\*/gi, '')
    // Clean up multiple spaces and empty lines
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function composeAnswer({ message, vitals, hits, memory, model, use_ft, stream, res }: any){
  const mod = await moderate(message);
  if(mod?.flagged) return { answer: "I can't help with that.", model: 'moderation_block' };

  const system = [
    { role:'system', content: 'You are Jenny, an evidence-first coach. Use vitals for facts; cite evidence chips; narrative hits for examples only.' },
    memory?.summary ? { role:'system', content:`Conversation summary:\n${memory.summary}` } : null,
    { role:'system', content:`Vitals:\n${JSON.stringify(vitals).slice(0,10000)}` },
    { role:'system', content:`Narrative hits (top):\n${JSON.stringify(hits.slice(0,6)).slice(0,10000)}` }
  ].filter(Boolean);

  const msgs = [
    ...system as any[],
    ...(memory?.recent||[]).map((m:any)=>({ role:m.role, content:m.content })),
    { role:'user', content: message }
  ];

  const chosenModel = model || (use_ft ? process.env.JENNY_MODEL_ID : 'gpt-4o-mini');

  if(!stream){
    const resp = await openai.chat.completions.create({ model: chosenModel!, messages: msgs });
    const rawAnswer = resp.choices?.[0]?.message?.content || '';
    const cleanAnswer = stripMetadata(rawAnswer);
    return { answer: cleanAnswer, model: chosenModel, usage: resp.usage };
  }

  // SSE
  res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
  const streamResp = await openai.chat.completions.create({ model: chosenModel!, messages: msgs, stream:true });
  let acc = '';
  for await (const chunk of streamResp){
    const token = chunk.choices?.[0]?.delta?.content || '';
    acc += token;
    res.write(`data:${JSON.stringify({ token })}\n\n`);
  }
  res.write(`data:${JSON.stringify({ done:true })}\n\n`);
  res.end();

  // Apply metadata stripping to streaming response too
  const cleanAnswer = stripMetadata(acc);
  return { answer: cleanAnswer, model: chosenModel };
}