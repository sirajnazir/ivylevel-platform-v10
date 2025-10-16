import { OpenAI } from 'openai';
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function embed(text:string){
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-large', input: text
  });
  return data[0].embedding; // 3072-dim
}

export async function moderate(text:string){
  const m = await openai.moderations.create({
    model: 'omni-moderation-latest', input: text
  });
  return m.results?.[0];
}