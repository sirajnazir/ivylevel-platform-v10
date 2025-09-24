import express from "express";
import { z } from "zod";
import { queryPinecone } from "./query";
import { upsertHandler } from "./upsert";
import { child } from "../../../packages/logger/src/index";

const app = express();
app.use(express.json({ limit: '50mb' }));
const log = child({ svc: "retriever" });

// Zod schema for search validation
const SearchSchema = z.object({
  q: z.string().min(1, "q is required"),
  k: z.number().int().positive().max(50).optional(),
  filters: z.record(z.any()).optional()
});

app.post("/search", async (req: express.Request, res: express.Response) => {
  const parsed = SearchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { q, k = 8, filters } = parsed.data;

  // INTEL-first allow list
  const defaultAllow = ["TRANS-INTEL","EXEC-INTEL","IMSG-INTEL","GAMEPLAN","APP-DOC"];
  const effectiveFilter = filters?.kind ? filters : { ...(filters ?? {}), kind: { "$in": defaultAllow } };

  try {
    if (!process.env.PINECONE_API_KEY) {
      return res.status(503).json({ error: "Pinecone not configured" });
    }
    
    const results = await queryPinecone({ q, topK: k, filter: effectiveFilter });
    log.debug({ q, k, hits: results.length });
    return res.json(results);
  } catch (e: any) {
    log.error(e, "pinecone query failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/upsert", upsertHandler);

const port = process.env.RETRIEVER_PORT || 4102;
app.listen(port, () => log.info(`retriever listening :${port}`));