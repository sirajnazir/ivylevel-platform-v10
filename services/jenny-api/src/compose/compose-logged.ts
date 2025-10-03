import { openai, moderate } from '../ai/openai-logged.js';
import { wrapOpenAI } from '../observability/wrappers.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const wrapped = wrapOpenAI(openai);
const log = createLogger('compose');

export async function composeAnswer({ message, vitals, hits, memory, model, use_ft, stream, res }: any){
  const mod = await moderate(message);
  if(mod?.flagged) {
    log.event('moderation_block', { flagged_categories: mod.categories });
    return { answer: "I can't help with that.", model: 'moderation_block' };
  }

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
  
  log.event('compose_start', { 
    model: chosenModel, 
    stream, 
    vitals_count: vitals?.facts?.length || 0,
    hits_count: hits?.length || 0,
    memory_turns: memory?.recent?.length || 0
  });

  if(!stream){
    const resp = await wrapped.chat(msgs, chosenModel!);
    const answer = resp.choices?.[0]?.message?.content || '';
    log.event('compose_complete', { 
      model: chosenModel, 
      answer_length: answer.length,
      usage: resp.usage 
    });
    return { answer, model: chosenModel, usage: resp.usage };
  }

  // SSE
  res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
  const streamResp = await openai.chat.completions.create({ model: chosenModel!, messages: msgs, stream:true });
  let acc = '';
  let tokenCount = 0;
  
  for await (const chunk of streamResp){
    const token = chunk.choices?.[0]?.delta?.content || '';
    acc += token;
    tokenCount++;
    res.write(`data:${JSON.stringify({ token })}\n\n`);
  }
  
  res.write(`data:${JSON.stringify({ done:true })}\n\n`);
  res.end();
  
  log.event('compose_stream_complete', { 
    model: chosenModel, 
    answer_length: acc.length,
    token_count: tokenCount 
  });
  
  return { answer: acc, model: chosenModel };
}