import OpenAI from 'openai';
import { cfg } from '../config.js';

/* Plug-in embedding provider. Defaults to OpenAI text-embedding-3-large (3072 dims).
   Swap model as needed; ensure Pinecone index dimension matches. */
const client = cfg.llm.openaiKey ? new OpenAI({ apiKey: cfg.llm.openaiKey }) : null;
const MODEL = 'text-embedding-3-large';

export async function embed(text: string): Promise<number[]> {
  if (!client) throw new Error('No OPENAI_API_KEY set for embeddings');
  const out = await client.embeddings.create({ model: MODEL, input: text });
  return out.data[0].embedding as unknown as number[];
}