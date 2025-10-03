import type { Pool } from 'pg';
import { composeAnswer } from '../orchestrator/composer.js';

export function createComposer(pool: Pool) {
  return {
    async compose(params: { 
      q: string; 
      student_id: string; 
      vitals: any; 
      hits: any[]; 
      chips: any[]; 
      model?: string 
    }) {
      // Extract narrative snippets from hits
      const narrativeSnippets = params.hits.slice(0, 6).map(h => h.text || '');
      
      // Compose answer
      const answer = await composeAnswer(
        params.q,
        params.vitals,
        narrativeSnippets,
        params.chips,
        { model: params.model }
      );
      
      return { answer };
    }
  };
}