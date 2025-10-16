import { OpenAI } from 'openai';
import { wrapOpenAI } from '../observability/wrappers.js';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const wrapped = wrapOpenAI(openai);

export async function embed(text:string){
  const resp = await wrapped.embed(text);
  return resp.data[0].embedding; // 3072-dim
}

export async function moderate(text:string){
  const m = await openai.moderations.create({
    model: 'omni-moderation-latest', input: text
  });
  return m.results?.[0];
}