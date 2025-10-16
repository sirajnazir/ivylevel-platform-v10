import { buildPinecone } from '../src/indexers/pineconeBuild.js';
import { pool } from '../src/db.js';
import { cfg } from '../src/config.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from '../src/orchestrator/embeddings.js';

/*
 * End-to-end clean reindex:
 * 1) Create fresh index name with timestamp
 * 2) Refresh FTS materialized views
 * 3) Build namespaces (jtbd + interactions)
 * 4) Print switch-over instructions
 */
function ts(){
  const d = new Date();
  const pad = (n:number)=>String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

async function ensureIndex(name: string, dim = 3072){
  const pc = new Pinecone({ apiKey: cfg.pinecone.apiKey });
  const existing = await pc.listIndexes();
  if (!existing.indexes?.some((i:any)=>i.name===name)){
    console.log(`[create] Pinecone index ${name}`);
    await pc.createIndex({ name, dimension: dim, spec: { serverless: { cloud: 'aws', region: 'us-west-2' } } });
    // Wait for index to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
  } else {
    console.log('[skip] index exists');
  }
  // point env to new index for this run
  process.env.PINECONE_INDEX = name;
  cfg.pinecone.indexName = name;
}

async function run(){
  const name = `jenny-v3-${ts()}`;
  console.log('== CLEAN REINDEX ==');
  await ensureIndex(name, 3072);
  console.log('Refresh Postgres FTS views...');
  await pool.query('SELECT refresh_fts()');
  console.log('Build Pinecone namespaces...');
  await buildPinecone(embed);
  console.log(`\n[done] Fresh index populated: ${name}`);
  console.log('\nNext steps:');
  console.log(`  1) Set PINECONE_INDEX=${name} in your env for API/orchestrator.`);
  console.log('  2) Smoke-test golden queries.');
  console.log('  3) Archive old indices using scripts/archive_old_indexes.ts delete <OLD1> <OLD2>.');
  await pool.end();
}

run().catch(e=>{ console.error(e); process.exit(1); });