import express from "express";
import fetch from "node-fetch";
import { child } from "@packages/logger";

const app = express();
app.use(express.json());
const log = child({ svc: "api" });

const AGENT_URL = process.env.AGENT_URL || "http://localhost:4101/respond";
const RETRIEVER_URL = process.env.RETRIEVER_URL || "http://localhost:4102/search";

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/agent/chat", async (req, res) => {
  const payload = { message: req.body?.message || "", coachId: req.body?.coachId || "jenny", nowWeek: req.body?.nowWeek || 1 };
  const r = await fetch(AGENT_URL, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
  const out = await r.json();
  log.debug({ route:"/agent/chat", in:payload, out });
  res.json(out);
});

app.post("/search", async (req, res) => {
  const r = await fetch(RETRIEVER_URL, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(req.body || {}) });
  const out = await r.json();
  log.debug({ route:"/search", in:req.body, outCount: Array.isArray(out)? out.length: undefined });
  res.json(out);
});

const port = process.env.API_PORT || 4000;
app.listen(port, () => log.info(`api listening :${port}`));
