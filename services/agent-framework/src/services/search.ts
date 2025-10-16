import { pool } from '../db.js';
import { SearchFilters, SearchHit } from '../utils/types.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { cfg } from '../config.js';

const pc = new Pinecone({ apiKey: cfg.pinecone.apiKey });

function filterSql(filters?: SearchFilters){
  if (!filters) return { sql: '', params: [] as any[] };
  const parts:string[] = []; const params:any[] = []; let i=1;
  if (filters.student_id){ parts.push(`metadata->>'student_id' = $${i++}`); params.push(filters.student_id); }
  if (filters.jtbd_id){ parts.push(`metadata->>'jtbd_id' = $${i++}`); params.push(filters.jtbd_id); }
  if (filters.tactic_name){ parts.push(`metadata->>'tactic_name' = $${i++}`); params.push(filters.tactic_name); }
  if (filters.framework){ parts.push(`metadata->>'framework' = $${i++}`); params.push(filters.framework); }
  return { sql: parts.length? ('WHERE ' + parts.join(' AND ')) : '', params };
}

// Lexical sidecar via Postgres FTS (ts_rank) on two materialized views (jtbd_fts, interactions_fts)
export async function lexicalSearch(q: string, filters?: SearchFilters): Promise<SearchHit[]> {
  const like = q.replace(/[:&|!]/g, ' '); // basic sanitize for plainto_tsquery
  const f = filterSql(filters);
  const jtbd = await pool.query(
    `SELECT id, text, metadata, ts_rank(tsv, plainto_tsquery($1)) AS score
     FROM jtbd_fts ${f.sql} ORDER BY score DESC LIMIT 20`, [like, ...f.params]
  );
  const inter = await pool.query(
    `SELECT id, text, metadata, ts_rank(tsv, plainto_tsquery($1)) AS score
     FROM interactions_fts ${f.sql} ORDER BY score DESC LIMIT 50`, [like, ...f.params]
  );
  const hits: SearchHit[] = [
    ...jtbd.rows.map((r:any)=>({namespace:'jtbd' as const, id:r.id, text:r.text, metadata:r.metadata, score:Number(r.score), bm25:Number(r.score)})),
    ...inter.rows.map((r:any)=>({namespace:'interactions' as const, id:r.id, text:r.text, metadata:r.metadata, score:Number(r.score), bm25:Number(r.score)})),
  ];
  return hits;
}

export async function denseSearch(q: string, filters?: SearchFilters): Promise<SearchHit[]> {
  const index = pc.index(cfg.pinecone.indexName);
  // Embed via external service in your pipeline; here assume caller provides vector or use server-side embed
  throw new Error('denseSearch: Provide embedding vector in orchestrator; see hybridSearch.ts');
}