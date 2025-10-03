import express from "express";
import { z } from "zod";
import { queryPinecone } from "./query";
import { upsertHandler } from "./upsert";
import { child } from "@packages/logger";
import { globalReRank } from "./rerank";
import { isInitialIntent, isAwardsTopic, isECsTopic } from "./intent";

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
const log = child({ svc: "retriever" });

// Zod schema for search validation
const SearchSchema = z.object({
  q: z.string().min(1, "q is required"),
  k: z.number().int().positive().max(50).optional(),
  filters: z.record(z.any()).optional(),
  filter: z.record(z.any()).optional(),
  student: z.string().optional(),
  studentId: z.string().optional(),
  student_id: z.string().optional(),
  hint: z.object({
    timeframe: z.string().optional(),
    topic: z.string().optional(),
    canonKey: z.string().optional(),
    canonDoc: z.object({
      studentId: z.string(),
      kind: z.string(),
      doc_name: z.string(),
      section_hint: z.string().optional()
    }).optional()
  }).optional()
});

type Hit = { id: string; score: number; text: string; metadata?: any };

function rewriteQuery(q: string): string {
  const lower = q.toLowerCase();
  const bits: string[] = [];

  // Gentle anchors only (avoid drowning signal)
  if (isInitialIntent(lower)) bits.push("gameplan assessment \"week 0\"");
  if (isAwardsTopic(lower)) bits.push("awards honors");
  if (isECsTopic(lower)) bits.push("activities extracurriculars EC");

  // Encourage list-like text
  bits.push("\"1.\" \"2.\" list");

  return bits.length ? `${bits.join(" ")} ${q}` : q;
}

app.post("/search", async (req: express.Request, res: express.Response) => {
  try {
    const parsed = SearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    const { q, k = 6, filters, filter, student, studentId, student_id, hint } = parsed.data;
    const userFilter = filter || filters || {};
    
    // Enforce kind restrictions for awards queries
    const isAwardsQuery = /\b(award|awards|honors?|prizes?|recognitions?)\b/i.test(q);
    if (isAwardsQuery) {
      const allowedKinds = ['APP-DOC', 'GAMEPLAN'];
      
      // Check if filter.kind is set and is allowed
      if (userFilter.kind && !allowedKinds.includes(userFilter.kind)) {
        return res.status(400).json({ 
          error: `Awards queries must use kind filter in ${JSON.stringify(allowedKinds)}. Got: ${userFilter.kind}` 
        });
      }
      
      // Check for multiple kinds (not allowed for awards)
      if (userFilter.kinds && Array.isArray(userFilter.kinds)) {
        const invalidKinds = userFilter.kinds.filter(k => !allowedKinds.includes(k));
        if (invalidKinds.length > 0 || userFilter.kinds.length > 1) {
          return res.status(400).json({ 
            error: `Awards queries require single kind from ${JSON.stringify(allowedKinds)}. Got: ${JSON.stringify(userFilter.kinds)}` 
          });
        }
      }
      
      // If no kind filter provided, default to searching both allowed kinds
      if (!userFilter.kind && !userFilter.kinds) {
        userFilter.kind = { $in: allowedKinds };
      }
    }
    const studentName = student || studentId || student_id;

    const rewritten = rewriteQuery(q);
    log.info({ originalQuery: q, rewritten, k, canonKey: hint?.canonKey }, "retriever.search");

    // Pass 0: Canonical pinning if we have a canon document
    let results: Hit[] = [];
    if (hint?.canonDoc && studentName) {
      log.info({ canonDoc: hint.canonDoc.doc_name, kind: hint.canonDoc.kind }, "retriever.canonical_pin");
      
      const canonFilter = {
        student: studentName,
        kind: hint.canonDoc.kind,
        doc_name: hint.canonDoc.doc_name
      };
      
      // Query by metadata to get all chunks from canonical doc
      const canonHits = await queryPinecone({ q: rewritten, topK: 10, filter: canonFilter });
      
      if (canonHits && canonHits.length > 0) {
        // Boost canonical hits significantly
        const boostedCanon = (canonHits as Hit[]).map(h => ({
          ...h,
          score: (h.score ?? 0) + 10,
          metadata: { ...h.metadata, canonical: true }
        }));
        results.push(...boostedCanon);
        log.info({ canonHits: boostedCanon.length }, "retriever.canonical_hits");
      }
    }

    // Pass 1: if initial intent, try a **filtered** query that prefers the Assessment GamePlan
    const initial = isInitialIntent(q);
    if (!results.length && initial) {
      const initFilter = {
        ...userFilter,
        // Pinecone filter is exact-match booleans on metadata fields you upserted:
        // e.g. kind:"GAMEPLAN", student:"huda"
        ...(studentName ? { student: studentName } : {}),
        kind: "GAMEPLAN",
      };
      const pass1 = await queryPinecone({ q: rewritten, topK: k, filter: initFilter });
      results = (pass1 as Hit[]) || [];
    }

    // Pass 2: unfiltered if pass 1 yielded nothing
    if (!results.length) {
      // Check if mixed kinds requested (should be rejected for structured intents)
      const requestedKinds = userFilter?.kind?.$in || userFilter?.kinds || [];
      const structuredIntent = hint?.canonKey || isAwardsTopic(q) || isECsTopic(q);
      
      if (structuredIntent && Array.isArray(requestedKinds) && requestedKinds.length > 1) {
        log.warn({ requestedKinds, query: q }, "retriever.mixed_kinds_blocked");
        return res.status(400).json({ 
          error: "Mixed kind retrieval not allowed for structured intents",
          allowedKinds: ["TRANS-INTEL", "EXEC-INTEL", "IMSG-INTEL", "GAMEPLAN", "APP-DOC"],
          hint: "Use single kind filter for structured queries"
        });
      }
      
      // INTEL-first allow list
      const defaultAllow = ["TRANS-INTEL","EXEC-INTEL","IMSG-INTEL","GAMEPLAN","APP-DOC"];
      const effectiveFilter = userFilter?.kind ? userFilter : { ...(userFilter ?? {}), kind: { "$in": defaultAllow } };
      
      const pass2 = await queryPinecone({ q: rewritten, topK: k, filter: effectiveFilter });
      results = (pass2 as Hit[]) || [];
    }

    // Global re-rank with intent hint
    const reranked = globalReRank(results, q, hint);
    log.debug({ q, rewritten, k, hits: reranked.length, top: reranked[0]?.metadata?.doc_name });
    
    // Fallback: If we have a canon key but might be missing the actual list content
    if (hint?.canonKey && hint?.canonDoc && reranked.length < 3) {
      log.info({ 
        canonKey: hint.canonKey, 
        currentHits: reranked.length 
      }, "retriever.fallback_check");
      
      // Issue a targeted query specifically for list content
      let fallbackQuery = "";
      if (hint.canonKey === "awards.final" || hint.canonKey === "awards.initial") {
        fallbackQuery = "Final Award List awards won";
      } else if (hint.canonKey === "ecs.final" || hint.canonKey === "ecs.initial") {
        fallbackQuery = "Final ECs Activities List extracurricular";
      }
      
      if (fallbackQuery && studentName) {
        const fallbackFilter = {
          student: studentName,
          kind: hint.canonDoc.kind,
          doc_name: hint.canonDoc.doc_name
        };
        
        log.info({ 
          fallbackQuery, 
          filter: fallbackFilter 
        }, "retriever.fallback_query");
        
        const fallbackHits = await queryPinecone({ 
          q: fallbackQuery, 
          topK: 5, 
          filter: fallbackFilter 
        });
        
        if (fallbackHits && fallbackHits.length > 0) {
          // Add fallback hits with high scores
          const boostedFallback = (fallbackHits as Hit[]).map(h => ({
            ...h,
            score: (h.score ?? 0) + 8,
            metadata: { ...h.metadata, fallback: true }
          }));
          
          // Merge with existing results, deduping by ID
          const existingIds = new Set(reranked.map(r => r.id));
          const newHits = boostedFallback.filter(h => !existingIds.has(h.id));
          
          const mergedResults = [...reranked, ...newHits].sort((a, b) => b.score - a.score);
          log.info({ 
            fallbackHits: boostedFallback.length, 
            newHits: newHits.length,
            merged: mergedResults.length 
          }, "retriever.fallback_merged");
          
          return res.json(mergedResults);
        }
      }
    }
    
    return res.json(reranked);
  } catch (e: any) {
    log.error(e, "retriever.search.error");
    return res.status(500).json({ error: "internal" });
  }
});

app.post("/upsert", upsertHandler);

const port = process.env.RETRIEVER_PORT || 4102;
app.listen(port, () => log.info(`retriever listening :${port}`));