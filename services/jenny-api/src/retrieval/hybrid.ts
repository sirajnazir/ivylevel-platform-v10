import { queryVectors } from './pinecone';
import { lexicalSearch } from './lexical';
import { rerank } from './rerank';

export async function hybridSearch(q:string, studentId:string){
  const [jtbd, inter] = await Promise.all([
    queryVectors('jtbd', q, 6),
    queryVectors('interactions', q, 6)
  ]);
  const lexical = await lexicalSearch(studentId, q, 10);

  // Prefer entries with text
  const merged = [...jtbd, ...inter, ...lexical].filter(m => (m as any).text?.length>0);
  return rerank(q, merged, 8);
}