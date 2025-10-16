import { Pinecone } from '@pinecone-database/pinecone';
import { cfg } from '../src/config.js';

/*
 * Creates a brand-new Pinecone index with the given name and dimension.
 * Usage:  tsx scripts/create_clean_index.ts jenny-v3-20250930 3072
 */
async function main(){
  const name = process.argv[2];
  const dim = Number(process.argv[3] || 3072);
  if (!name) throw new Error('Provide index name');
  const pc = new Pinecone({ apiKey: cfg.pinecone.apiKey });

  const existing = await pc.listIndexes();
  if (existing.indexes?.some((i:any)=>i.name===name)) {
    console.log(`[skip] Index already exists: ${name}`);
    return;
  }
  console.log(`[create] ${name} (dim=${dim})`);
  await pc.createIndex({
    name,
    dimension: dim,
    spec: { serverless: { cloud: 'aws', region: 'us-west-2' } }
  });
  console.log('[ok] Created');
}
main().catch(e=>{ console.error(e); process.exit(1); });