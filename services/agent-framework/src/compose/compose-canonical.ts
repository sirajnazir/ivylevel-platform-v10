import { openai, moderate } from '../ai/openai.js';

export async function composeAnswer({ 
  message, 
  vitals, 
  hits, 
  memory, 
  model, 
  use_ft, 
  stream, 
  res,
  systemContext 
}: any) {
  const mod = await moderate(message);
  if (mod?.flagged) return { answer: "I can't help with that.", model: 'moderation_block' };

  // Build system messages with canonical fact policy
  const system = [
    { 
      role: 'system', 
      content: `You are Jenny, an evidence-first college admissions coach. 
${systemContext?.canonical_fact_policy || ''}

Your role is to provide strategic guidance, interpret evidence, and support students.
Use the vitals for context but NEVER state specific numbers from them.
Reference evidence chips when making claims.
Focus on actionable advice and next steps.`
    },
    memory?.summary ? { role: 'system', content: `Conversation summary:\n${memory.summary}` } : null,
    { role: 'system', content: `Student context (for your reference only - do not state these numbers):\n${JSON.stringify(vitals).slice(0, 10000)}` },
    { role: 'system', content: `Relevant evidence:\n${JSON.stringify(hits.slice(0, 6)).slice(0, 10000)}` }
  ].filter(Boolean);

  const msgs = [
    ...system as any[],
    ...(memory?.recent || []).map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  const chosenModel = model || (use_ft ? process.env.JENNY_MODEL_ID : 'gpt-4o-mini');

  if (!stream) {
    const resp = await openai.chat.completions.create({ 
      model: chosenModel!, 
      messages: msgs,
      temperature: 0.7,
      max_tokens: 500
    });
    return { answer: resp.choices?.[0]?.message?.content || '', model: chosenModel, usage: resp.usage };
  }

  // SSE streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  
  const streamResp = await openai.chat.completions.create({ 
    model: chosenModel!, 
    messages: msgs, 
    stream: true,
    temperature: 0.7,
    max_tokens: 500
  });
  
  let acc = '';
  for await (const chunk of streamResp) {
    const token = chunk.choices?.[0]?.delta?.content || '';
    acc += token;
    res.write(`data:${JSON.stringify({ token })}\n\n`);
  }
  res.write(`data:${JSON.stringify({ done: true })}\n\n`);
  res.end();
  return { answer: acc, model: chosenModel };
}