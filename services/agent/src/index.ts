import express from "express";
import { respond } from "./orchestrator";
import { runNode } from "./graph";
import { child } from "../../../packages/logger/src/index";

const app = express();
app.use(express.json());
const log = child({ svc: "agent" });

app.post("/respond", async (req, res) => {
  try {
    const out = await respond(req.body || {});
    log.debug({ route:"respond", in:req.body, out });
    res.json(out);
  } catch (e:any) {
    log.error(e, "agent error");
    res.status(500).json({ error: e?.message || "Agent error" });
  }
});

app.post("/graph", async (req, res) => {
  try {
    const out = await runNode(req.body?.state, req.body?.message);
    log.debug({ route:"graph", in:req.body, out });
    res.json(out);
  } catch (e:any) {
    log.error(e, "graph error");
    res.status(500).json({ error: e?.message || "Graph error" });
  }
});

const port = process.env.AGENT_PORT || 4101;
app.listen(port, () => log.info(`agent listening :${port}`));
