import express from "express";
import { pineconeQuery } from "./pineconeClient";
import { upsertHandler } from "./upsert";
import { child } from "@packages/logger";

const app = express();
app.use(express.json());
const log = child({ svc: "retriever" });

let MOCK = [
  { id: "m1", text: "Quick 168h audit: remove 7h/week social media, add 2 award apps.", type:"quote", week:1, phase:1, layers:["Time Reality & 168h Architecture"], kind:"EXEC-INTEL", doc_name:"W001 Execution Intel", link:"" }
];

app.post("/search", async (req, res) => {
  const { q="", k=5, filters={} } = req.body || {};
  try {
    if (process.env.PINECONE_API_KEY) {
      const out = await pineconeQuery({ q, k, namespace: process.env.PINECONE_NAMESPACE || "jenny_v1", filter: filters });
      log.debug({ q, k, hits: out.length });
      return res.json(out);
    }
  } catch (e:any) {
    log.error(e, "pinecone failed");
  }
  res.json(MOCK.slice(0,k).map(r => ({ ...r, score: 0.8 })));
});

app.post("/upsert", upsertHandler);

const port = process.env.RETRIEVER_PORT || 4102;
app.listen(port, () => log.info(`retriever listening :${port}`));
