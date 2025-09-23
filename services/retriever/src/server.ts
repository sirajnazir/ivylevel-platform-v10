import express from "express";
import { queryPinecone } from "./query";
import { upsertHandler } from "./upsert";
import { child } from "../../../packages/logger/src/index";

const app = express();
app.use(express.json({ limit: '50mb' }));
const log = child({ svc: "retriever" });

let MOCK = [
  { id: "m1", text: "Quick 168h audit: remove 7h/week social media, add 2 award apps.", type:"quote", week:1, phase:1, layers:["Time Reality & 168h Architecture"], kind:"EXEC-INTEL", doc_name:"W001 Execution Intel", link:"" }
];

app.post("/search", async (req, res) => {
  const body = req.body as {
    q: string; k?: number; filters?: Record<string, any>;
  };
  
  const defaultAllow = ["TRANS-INTEL","EXEC-INTEL","IMSG-INTEL","GAMEPLAN","APP-DOC"];
  const userFilter = body.filters ?? {};
  const effectiveFilter =
    userFilter.kind ? userFilter : { ...userFilter, kind: { "$in": defaultAllow } };
  
  // pass `effectiveFilter` to your pinecone query
  const topK = body.k ?? 6;
  
  try {
    if (process.env.PINECONE_API_KEY) {
      const results = await queryPinecone({ q: body.q, topK, filter: effectiveFilter });
      log.debug({ q: body.q, k: topK, hits: results.length });
      return res.json(results);
    }
  } catch (e:any) {
    log.error(e, "pinecone failed");
  }
  res.json(MOCK.slice(0, topK).map(r => ({ ...r, score: 0.8 })));
});

app.post("/upsert", upsertHandler);

const port = process.env.RETRIEVER_PORT || 4102;
app.listen(port, () => log.info(`retriever listening :${port}`));