import { Pinecone } from '@pinecone-database/pinecone';
import { cfg } from '../config.js';
import { pool } from '../db.js';

export type VectorizeFn = (text: string)=> Promise<number[]>;

export async function buildPinecone(vectorize: VectorizeFn){
  const pc = new Pinecone({ apiKey: cfg.pinecone.apiKey });
  const index = pc.index(cfg.pinecone.indexName);

  // Fetch JTBD text
  const jtbd = await pool.query(`
    SELECT jtbd_id as id, (coalesce(jtbd_title,'') || ' ' || coalesce(synopsis,'')) AS text,
           json_build_object('student_id', student_id, 'jtbd_id', jtbd_id, 'phase', phase, 'domain', domain) AS metadata
    FROM jtbd`);

  // Fetch Interactions text
  const inter = await pool.query(`
    SELECT snippet_id as id, (coalesce(user_ask,'') || ' ' || coalesce(jenny_reply,'')) AS text,
           json_build_object('student_id', student_id, 'jtbd_id', jtbd_id, 'tactic_name', tactic_name, 'framework', framework, 'occurred_at', occurred_at) AS metadata
    FROM interactions WHERE excluded_from_tactic_scoring = false`);

  // Upsert in batches
  const batch = async (items: any[], ns: string) => {
    const vectors = [] as any[];
    for (const r of items){
      const v = await vectorize(r.text);
      vectors.push({ id: r.id, values: v, metadata: { ...r.metadata, text: r.text } });
    }
    if (vectors.length)
      await index.namespace(ns).upsert(vectors);
  };

  // chunking
  const CHUNK = 100;
  for (let i=0; i<jtbd.rows.length; i+=CHUNK) {
    await batch(jtbd.rows.slice(i,i+CHUNK), 'jtbd');
  }
  for (let i=0; i<inter.rows.length; i+=CHUNK) {
    await batch(inter.rows.slice(i,i+CHUNK), 'interactions');
  }
}