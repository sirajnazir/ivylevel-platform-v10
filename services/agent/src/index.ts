import express from "express";
import { respond } from "./orchestrator";
import { runNode } from "./graph";
import { child } from "@packages/logger";
import { PORT } from "./config";
import { startVitalsCron } from "./cron/recompute";

const app = express();
app.use(express.json());
const log = child({ svc: "agent" });

// Chat endpoint for testing
app.post("/chat", async (req, res) => {
  try {
    const { studentId, message, nowWeek } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }
    
    const week = nowWeek || 1;
    const state = {
      studentId: studentId || "test-user",
      coachId: "jenny",
      nowWeek: week,
      phase: week <= 1 ? 1 : week <= 52 ? 2 : week <= 65 ? 3 : week <= 75 ? 4 : 5,
      memory: {}
    };
    
    const out = await respond({ message, state });
    log.debug({ route: "chat", studentId, message, nowWeek: week, out });
    res.json(out);
  } catch (e: any) {
    log.error(e, "chat error");
    res.status(500).json({ error: e?.message || "Chat error" });
  }
});

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

app.listen(PORT, () => {
  log.info(`agent listening :${PORT}`);
  startVitalsCron();
});
