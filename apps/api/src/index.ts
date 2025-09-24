import express from "express";
import fetch from "node-fetch";
import { child } from "@packages/logger";
import crypto from "crypto";
import db from "./db";

const app = express();
app.use(express.json());

// Inline reducer logic
function applyObservationToVitals(v: any, o: any): any {
  const out = JSON.parse(JSON.stringify(v || {}));

  switch (o.kind) {
    case "SAT": {
      const score = o.value?.score;
      const note = o.value?.note || "";
      const date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
      out.academics ??= {};
      out.academics.sat ??= { current: null, superscore: null, timeline: [] };
      out.academics.sat.timeline.push({ date, score, note });
      out.academics.sat.timeline.sort((a: any, b: any) => a.date.localeCompare(b.date));
      const latest = out.academics.sat.timeline[out.academics.sat.timeline.length - 1];
      out.academics.sat.current = latest?.score ?? out.academics.sat.current;
      out.academics.sat.superscore = Math.max(...out.academics.sat.timeline.map((t: any) => t.score || 0));
      break;
    }
    case "GPA": {
      out.academics ??= {};
      out.academics.gpa ??= { weighted: null, unweighted: null, trend: null };
      if (o.value?.weighted != null) out.academics.gpa.weighted = o.value.weighted;
      if (o.value?.unweighted != null) out.academics.gpa.unweighted = o.value.unweighted;
      if (o.value?.trend != null) out.academics.gpa.trend = o.value.trend;
      break;
    }
    case "APPS": {
      out.apps ??= {};
      
      if (o.subtype === "collegeList") {
        out.apps.collegeList = o.value?.colleges || [];
      } else if (o.subtype === "college-decision") {
        // Handle individual college decisions with precedence
        out.apps.collegeList ??= [];
        const college = o.value?.college;
        const decision = o.value?.decision;
        
        if (college && decision) {
          // Decision precedence: ACCEPTED > WAITLISTED/DEFERRED > REJECTED > UNKNOWN
          const RANK: Record<string, number> = { 
            ACCEPTED: 4, 
            WAITLISTED: 3, 
            DEFERRED: 3, 
            REJECTED: 2, 
            UNKNOWN: 1 
          };
          
          const existingIndex = out.apps.collegeList.findIndex((c: any) => 
            c.name?.toLowerCase() === college.toLowerCase() || 
            c.college?.toLowerCase() === college.toLowerCase()
          );
          
          if (existingIndex >= 0) {
            const existing = out.apps.collegeList[existingIndex];
            const existingRank = RANK[existing.status || existing.decision || "UNKNOWN"] || 0;
            const newRank = RANK[decision] || 0;
            
            // Only update if new decision has higher precedence
            if (newRank >= existingRank) {
              out.apps.collegeList[existingIndex] = {
                name: college,
                status: decision,
                round: o.value?.round || existing.round,
                date: o.value?.date || existing.date,
                notes: o.value?.notes || existing.notes
              };
            }
          } else {
            // Add new college
            out.apps.collegeList.push({
              name: college,
              status: decision,
              round: o.value?.round,
              date: o.value?.date,
              notes: o.value?.notes
            });
          }
        }
      } else if (o.subtype === "submitted_subset") {
        out.apps.submitted_subset = o.value;
      }
      break;
    }
    case "GAMEPLAN": {
      if (o.subtype === "TARGETS_SET") {
        out.gameplan ??= {};
        out.gameplan.targets = o.value;
      }
      break;
    }
    case "EC": {
      if (o.subtype === "UPSERT") {
        out.ecs ??= [];
        const ecId = o.value?.id;
        if (ecId) {
          const existingIndex = out.ecs.findIndex((e: any) => e.id === ecId);
          if (existingIndex >= 0) {
            // Merge with existing
            const existing = out.ecs[existingIndex];
            out.ecs[existingIndex] = {
              ...existing,
              ...o.value,
              impact: {
                ...(existing.impact || {}),
                ...(o.value.impact_delta || {})
              }
            };
          } else {
            // Add new
            out.ecs.push({
              ...o.value,
              impact: o.value.impact_delta || {}
            });
          }
        }
      }
      break;
    }
    case "AWARD": {
      if (o.subtype === "UPSERT") {
        out.awards ??= [];
        const awardId = o.value?.id;
        if (awardId) {
          const existingIndex = out.awards.findIndex((a: any) => a.id === awardId);
          if (existingIndex >= 0) {
            // Update existing
            out.awards[existingIndex] = {
              ...out.awards[existingIndex],
              ...o.value
            };
          } else {
            // Add new
            out.awards.push(o.value);
          }
        }
      }
      break;
    }
    case "TRAIT": {
      if (o.subtype === "SET") {
        out.traits ??= {};
        Object.assign(out.traits, o.value);
      }
      break;
    }
    default:
      break;
  }
  return out;
}

async function recomputeStudent(studentId: string, log: any) {
  const observations = await db.getObservations(studentId);
  let vitals: any = {};
  
  // Apply all observations to compute current vitals
  for (const obs of observations) {
    vitals = applyObservationToVitals(vitals, obs);
  }
  
  await db.upsertStudentState(studentId, vitals);
  log.info({ studentId, observationCount: observations.length }, "Recomputed vitals");
  return vitals;
}

// Trace ID middleware
app.use((req, res, next) => {
  const traceId = req.headers["x-trace-id"] as string || crypto.randomUUID();
  (req as any).traceId = traceId;
  (req as any).log = child({ svc: "api", traceId });
  res.setHeader("x-trace-id", traceId);
  next();
});

const AGENT_URL = process.env.AGENT_URL || "http://localhost:4101/respond";
const RETRIEVER_URL = process.env.RETRIEVER_URL || "http://localhost:4102/search";

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/agent/chat", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  const payload = { 
    message: req.body?.message || "", 
    coachId: req.body?.coachId || "jenny", 
    nowWeek: req.body?.nowWeek || 1,
    studentId: req.body?.studentId || "huda"
  };
  const r = await fetch(AGENT_URL, { 
    method: "POST", 
    headers: { 
      "content-type": "application/json",
      "x-trace-id": req.traceId 
    }, 
    body: JSON.stringify(payload) 
  });
  const out = await r.json();
  log.debug({ route: "/agent/chat", in: payload, out });
  res.json(out);
});

app.post("/search", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  const r = await fetch(RETRIEVER_URL, { 
    method: "POST", 
    headers: { 
      "content-type": "application/json",
      "x-trace-id": req.traceId 
    }, 
    body: JSON.stringify(req.body || {}) 
  });
  const out = await r.json();
  log.debug({ route: "/search", in: req.body, outCount: Array.isArray(out) ? out.length : undefined });
  res.json(out);
});

app.get("/students/:id/state", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  try {
    const { id } = req.params;
    const { view = "default" } = req.query; // default | application
    
    const state = await db.getStudentState(id);
    const latestObsAt = await db.getLatestObservationAt(id);
    
    // Check if stale
    const stale = !state || (latestObsAt && (!state.updated_at || new Date(state.updated_at) < latestObsAt));
    if (stale) {
      log.info({ studentId: id, stale: true }, "Vitals stale, recomputing");
      await recomputeStudent(id, log);
    }
    
    const fresh = await db.getStudentState(id);
    
    // Apply view lens if requested
    if (view === "application" && fresh) {
      // Return narrative + submitted subset (10 EC + 5 Awards)
      const appView = {
        ...fresh,
        apps: {
          ...fresh.apps,
          submitted: fresh.apps?.submitted_subset || {
            ecs: fresh.ecs?.slice(0, 10) || [],
            awards: fresh.awards?.slice(0, 5) || []
          }
        }
      };
      log.debug({ route: "/students/:id/state", studentId: id, view: "application", stale });
      res.json(appView);
    } else {
      // Default: full pipeline view
      log.debug({ route: "/students/:id/state", studentId: id, view: "default", hasVitals: !!fresh, stale });
      res.json(fresh);
    }
  } catch (error) {
    log.error({ error }, "Failed to get student state");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/observe", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  try {
    const { studentId, kind, subtype, value, source, at } = req.body;
    
    if (!studentId || !kind || !value || !source) {
      return res.status(400).json({ error: "Missing required fields: studentId, kind, value, source" });
    }
    
    const id = await db.createObservation({
      studentId,
      kind,
      subtype,
      value,
      source,
      at: at ? new Date(at) : undefined
    });
    
    // Recompute vitals after adding observation
    await recomputeStudent(studentId, log);
    
    log.info({ route: "/observe", observationId: id, studentId, kind });
    res.json({ ok: true, id });
  } catch (error) {
    log.error({ error }, "Failed to create observation");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/plans/:id/outcomes", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  try {
    const { studentId, category, name, metrics, period, evidence } = req.body;
    
    if (!studentId || !category || !name || !metrics) {
      return res.status(400).json({ error: "Missing required fields: studentId, category, name, metrics" });
    }
    
    const id = await db.createOutcome({
      studentId,
      category,
      name,
      metrics,
      period,
      evidence
    });
    
    log.info({ route: "/plans/:id/outcomes", outcomeId: id, studentId, category });
    res.json({ ok: true, id });
  } catch (error) {
    log.error({ error }, "Failed to create outcome");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/admin/recompute", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ error: "Missing required field: studentId" });
    }
    
    const vitals = await recomputeStudent(studentId, log);
    
    log.info({ route: "/admin/recompute", studentId, vitalsKeys: Object.keys(vitals || {}) });
    res.json({ ok: true, vitals });
  } catch (error) {
    log.error({ error }, "Failed to recompute");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/admin/recompute-all", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  try {
    // For now, just recompute known students
    const students = ["huda"]; // Can be expanded to query all student_ids
    const results: any[] = [];
    
    for (const studentId of students) {
      const vitals = await recomputeStudent(studentId, log);
      results.push({ studentId, success: true, vitalsKeys: Object.keys(vitals || {}) });
    }
    
    log.info({ route: "/admin/recompute-all", count: results.length });
    res.json({ ok: true, results });
  } catch (error) {
    log.error({ error }, "Failed to recompute all");
    res.status(500).json({ error: "Internal server error" });
  }
});

const port = process.env.API_PORT || 4000;
app.listen(port, () => {
  const log = child({ svc: "api" });
  log.info(`api listening :${port}`);
});
