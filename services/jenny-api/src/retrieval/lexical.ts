import { pool } from '../db/pool';
export async function lexicalSearch(studentId:string, q:string, topK=10){
  const { rows } = await pool.query(
    `SELECT id, snippet AS text, 'interactions' AS namespace,
            ts_rank_cd(vector, websearch_to_tsquery('english', $2)) AS score
     FROM interactions_fts
     WHERE student_id=$1 AND vector @@ websearch_to_tsquery('english', $2)
     ORDER BY score DESC
     LIMIT $3`,
    [studentId, q, topK]
  );
  return rows;
}