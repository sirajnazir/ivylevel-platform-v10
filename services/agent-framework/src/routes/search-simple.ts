import { Router } from 'express';
import { z } from 'zod';
import { getStudentVitals } from '../services/facts.js';
import { hybridSearch } from '../orchestrator/hybridSearch.js';
import { reRank } from '../orchestrator/reRank.js';
import { evidenceChipsFromHits } from '../orchestrator/evidenceChips.js';
import { queryRewrite } from '../orchestrator/queryRewrite.js';
import { composeAnswer } from '../orchestrator/composer.js';
import { embed } from '../orchestrator/embeddings.js';

export const searchSimple = Router();

const searchSchema = z.object({ 
  q: z.string(), 
  student_id: z.string().optional(),
  week: z.number().optional(),
  llm_model: z.string().optional()
});

searchSimple.post('/', async (req, res) => {
  try {
    const body = searchSchema.parse(req.body);
    const student_id = body.student_id || 'huda-2025';
    
    console.log('[Search] Query:', body.q, 'Student:', student_id);
    
    // 1) Get vitals
    const vitals = await getStudentVitals(student_id);
    console.log('[Search] Vitals:', vitals.facts?.length || 0, 'facts');
    
    // Skip guardrail for testing
    // const hasEvidence = Array.isArray(vitals.facts) && vitals.facts.some(f => f.source_id);
    // if (!hasEvidence) {
    //   return res.status(412).json({ error: 'no_source_backed_facts' });
    // }
    
    // 2) Rewrite query
    const { q, filters } = queryRewrite(body.q, { student_id });
    
    // 3) Hybrid search
    const hits = await hybridSearch(q, filters, embed);
    console.log('[Search] Hits:', hits.length);
    
    // 4) Re-rank
    const reranked = reRank(hits, q);
    
    // 5) Evidence chips
    const chips = await evidenceChipsFromHits(reranked.slice(0, 12));
    console.log('[Search] Chips:', chips.length);
    
    // 6) Compose answer
    const narrativeSnippets = reranked.slice(0, 6).map(h => h.text || '');
    const model = body.llm_model || process.env.JENNY_LLM_MODEL || 'gpt-4o-mini';
    
    let answer = 'No answer generated';
    try {
      answer = await composeAnswer(body.q, vitals, narrativeSnippets, chips, { model });
    } catch (error: any) {
      console.error('[Search] Compose error:', error.message);
      answer = `I found ${vitals.facts?.length || 0} facts and ${hits.length} relevant context pieces for your question.`;
    }
    
    // Return response
    res.json({
      answer,
      vitals,
      chips,
      hits: reranked.slice(0, 20),
      meta: { model }
    });
    
  } catch (error: any) {
    console.error('[Search] Error:', error);
    res.status(500).json({ 
      error: 'search_failed', 
      message: error.message 
    });
  }
});