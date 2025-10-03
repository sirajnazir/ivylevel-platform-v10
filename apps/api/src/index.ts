import express from "express";
import fetch from "node-fetch";
import { child } from "@packages/logger";
import crypto from "crypto";
import db from "./db";

// Strong typing for decisions and precedence
type Decision = 'accepted' | 'waitlisted' | 'rejected';
const PRECEDENCE: Record<Decision, number> = {
  accepted: 3,
  waitlisted: 2,
  rejected: 1,
};

const app = express();
app.use(express.json());

// Enable CORS for the frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
    case "OPPORTUNITY": {
      out.opportunities ??= {};
      out.opportunities.pipeline ??= { active: [], applied: [], decisions: {}, yield: {} };
      
      // Handle mined opportunity observations
      if (o.opportunity) {
        const oppName = o.opportunity.name;
        
        if (o.subtype === "proposal") {
          // Track proposed/mentioned opportunities
          out.opportunities.pipeline.active ??= [];
          const existing = out.opportunities.pipeline.active.find((a: any) => a.name === oppName);
          if (!existing) {
            out.opportunities.pipeline.active.push({
              name: oppName,
              category: o.opportunity.category,
              tags: o.opportunity.tags || [],
              deadline: o.opportunity.deadline,
              first_seen: o.ts || o.at,
              source: o.source
            });
          }
        }
        // Existing logic for APPLIED, RESULT, INTERESTED continues...
      }
      
      if (o.subtype === "APPLIED") {
        // Track applied opportunities
        out.opportunities.applied ??= [];
        const app = {
          id: o.value?.opportunity_id || o.opportunity?.name,
          applied_date: o.at || new Date().toISOString(),
          status: "pending"
        };
        // Check if already exists
        const idx = out.opportunities.applied.findIndex((a: any) => a.id === app.id);
        if (idx >= 0) {
          out.opportunities.applied[idx] = app;
        } else {
          out.opportunities.applied.push(app);
        }
      } else if (o.subtype === "RESULT") {
        // Update result for an applied opportunity
        out.opportunities.applied ??= [];
        const idx = out.opportunities.applied.findIndex((a: any) => a.id === o.value.opportunity_id);
        if (idx >= 0) {
          out.opportunities.applied[idx].status = o.value.result; // won|rejected|waitlisted
          out.opportunities.applied[idx].result_date = o.at || new Date().toISOString();
          if (o.value.notes) {
            out.opportunities.applied[idx].notes = o.value.notes;
          }
        }
      } else if (o.subtype === "INTERESTED") {
        // Track opportunities marked as interested
        out.opportunities.interested ??= [];
        if (!out.opportunities.interested.includes(o.value.opportunity_id)) {
          out.opportunities.interested.push(o.value.opportunity_id);
        }
      }
      break;
    }
    case "APPLICATION": {
      out.opportunities ??= {};
      out.opportunities.pipeline ??= { active: [], applied: [], decisions: {}, yield: {} };
      
      // Handle both formats: o.opportunity (from miner) and o.value (from manual)
      const opportunity = o.opportunity || o.value;
      if (opportunity) {
        const oppName = opportunity.name;
        
        if (o.subtype === "applied") {
          // Track applied
          out.opportunities.pipeline.applied ??= [];
          if (!out.opportunities.pipeline.applied.includes(oppName)) {
            out.opportunities.pipeline.applied.push(oppName);
          }
        } else if (o.subtype === "accepted" || o.subtype === "rejected" || o.subtype === "waitlisted") {
          // Track decisions with precedence
          out.opportunities.pipeline.decisions ??= {};
          const currentDecision = out.opportunities.pipeline.decisions[oppName];
          const subtype = String(o.subtype || '').toLowerCase() as Decision;
          const current = String(currentDecision || '').toLowerCase() as Decision;
          
          if (!currentDecision || PRECEDENCE[subtype] > PRECEDENCE[current]) {
            out.opportunities.pipeline.decisions[oppName] = subtype;
          }
          
          // Update yield stats
          out.opportunities.pipeline.yield ??= { total_applied: 0, accepted: 0, rejected: 0, waitlisted: 0 };
          const applied = Object.keys(out.opportunities.pipeline.decisions).length;
          const accepted = Object.values(out.opportunities.pipeline.decisions).filter((d: any) => d === 'accepted').length;
          const rejected = Object.values(out.opportunities.pipeline.decisions).filter((d: any) => d === 'rejected').length;
          const waitlisted = Object.values(out.opportunities.pipeline.decisions).filter((d: any) => d === 'waitlisted').length;
          
          out.opportunities.pipeline.yield = {
            total_applied: applied,
            accepted,
            rejected,
            waitlisted,
            win_rate: applied > 0 ? accepted / applied : 0
          };
        }
      }
      break;
    }
    case "BOMBARDMENT": {
      out.opportunities ??= {};
      if (o.subtype === "OUTCOME") {
        // Track bombardment episode outcomes
        out.opportunities.bombardment_history ??= [];
        out.opportunities.bombardment_history.push({
          episode_id: o.value.episode_id,
          date: o.at || new Date().toISOString(),
          size: o.value.size,
          wins: o.value.wins || 0,
          total: o.value.total || o.value.size
        });
        
        // Update win rate
        const totalWins = out.opportunities.bombardment_history.reduce((sum: number, b: any) => sum + (b.wins || 0), 0);
        const totalAttempts = out.opportunities.bombardment_history.reduce((sum: number, b: any) => sum + (b.total || 0), 0);
        out.opportunities.bombardment_win_rate = totalAttempts > 0 ? totalWins / totalAttempts : 0;
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

const AGENT_URL = process.env.AGENT_URL || "http://localhost:4101/chat";
const RETRIEVER_URL = process.env.RETRIEVER_URL || "http://localhost:4102/search";

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/agent/chat", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  try {
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
    
    // Check if response is ok
    if (!r.ok) {
      log.error({ status: r.status, statusText: r.statusText }, "Agent request failed");
      return res.status(r.status).json({ error: `Agent request failed: ${r.statusText}` });
    }
    
    // Check content type
    const contentType = r.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await r.text();
      log.error({ contentType, text: text.substring(0, 200) }, "Invalid response type from agent");
      return res.status(500).json({ error: "Invalid response from agent service" });
    }
    
    const out = await r.json();
    log.debug({ route: "/agent/chat", in: payload, out });
    res.json(out);
  } catch (error: any) {
    log.error({ error: error.message, stack: error.stack }, "Error in /agent/chat");
    res.status(500).json({ error: error.message || "Internal server error" });
  }
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
    // Handle both formats: standard and miner
    let { studentId, student_id, kind, type, subtype, value, source, at, ts, opportunity, idempotency_key } = req.body;
    
    // Normalize field names
    studentId = studentId || student_id;
    kind = kind || type;
    at = at || ts;
    
    // Handle miner format
    if (opportunity && !value) {
      value = opportunity;
    }
    
    if (!studentId || !kind || !value || !source) {
      return res.status(400).json({ error: "Missing required fields: studentId, kind, value, source" });
    }
    
    // Check idempotency
    if (idempotency_key) {
      const existing = await db.checkObservationExists(idempotency_key);
      if (existing) {
        log.info({ route: "/observe", idempotency_key, status: "duplicate" });
        return res.json({ ok: true, id: existing.id, duplicate: true });
      }
    }
    
    const id = await db.createObservation({
      studentId,
      kind,
      subtype,
      value,
      source: typeof source === 'object' ? JSON.stringify(source) : source,
      at: at ? new Date(at) : undefined,
      idempotency_key
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

// v1.2 Opportunity endpoints (proxy to microservices)
const CATALOG_URL = process.env.CATALOG_URL || "http://localhost:4202";
const SCORER_URL = process.env.SCORER_URL || "http://localhost:4203";
const RECOMMENDER_URL = process.env.RECOMMENDER_URL || "http://localhost:4204";

// Proxy to catalog service
app.get("/opportunities", async (req: any, res) => {
  const log = req.log;
  try {
    const query = new URLSearchParams(req.query).toString();
    const r = await fetch(`${CATALOG_URL}/opportunities?${query}`);
    const data = await r.json();
    log.debug({ route: "/opportunities", query });
    res.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch opportunities");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/opportunities/:id", async (req: any, res) => {
  const log = req.log;
  try {
    const { id } = req.params;
    const r = await fetch(`${CATALOG_URL}/opportunities/${id}`);
    if (!r.ok) {
      return res.status(r.status).json({ error: "Opportunity not found" });
    }
    const data = await r.json();
    log.debug({ route: "/opportunities/:id", id });
    res.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch opportunity");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get recommendations for a student
app.get("/students/:id/opportunities/recommendations", async (req: any, res) => {
  const log = req.log;
  try {
    const { id } = req.params;
    const query = new URLSearchParams(req.query).toString();
    const r = await fetch(`${RECOMMENDER_URL}/recommendations/${id}?${query}`);
    const data = await r.json();
    log.debug({ route: "/students/:id/opportunities/recommendations", studentId: id });
    res.json(data);
  } catch (error) {
    log.error({ error }, "Failed to fetch recommendations");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get bombardment opportunities
app.post("/students/:id/opportunities/bombardment", async (req: any, res) => {
  const log = req.log;
  try {
    const { id } = req.params;
    const r = await fetch(`${RECOMMENDER_URL}/bombardment/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const data = (await r.json()) as any;
    log.info({ route: "/students/:id/opportunities/bombardment", studentId: id, size: data?.opportunities?.length });
    res.json(data);
  } catch (error) {
    log.error({ error }, "Failed to create bombardment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Discover new opportunities
app.get("/students/:id/opportunities/discover", async (req: any, res) => {
  const log = req.log;
  try {
    const { id } = req.params;
    const query = new URLSearchParams(req.query).toString();
    const r = await fetch(`${RECOMMENDER_URL}/discover/${id}?${query}`);
    const data = (await r.json()) as any;
    log.debug({ route: "/students/:id/opportunities/discover", studentId: id, newCount: data?.new_opportunities?.length });
    res.json(data);
  } catch (error) {
    log.error({ error }, "Failed to discover opportunities");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Score an opportunity
app.post("/students/:id/opportunities/score", async (req: any, res) => {
  const log = req.log;
  try {
    const { id } = req.params;
    const { opportunity_id } = req.body;
    const r = await fetch(`${SCORER_URL}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: id, opportunity_id })
    });
    const data = await r.json();
    log.debug({ route: "/students/:id/opportunities/score", studentId: id, opportunityId: opportunity_id });
    res.json(data);
  } catch (error) {
    log.error({ error }, "Failed to score opportunity");
    res.status(500).json({ error: "Internal server error" });
  }
});

// v1.2.4 Report endpoints
app.get("/reports/:studentId", async (req: any, res) => {
  const log = req.log;
  log.info({ path: req.path, method: req.method }, "request.start");
  
  try {
    const { studentId } = req.params;
    const { type = "yield" } = req.query; // yield | temporal
    
    // Check cache first
    const cacheDir = `./data/reports/${studentId}/v1.2.4`;
    const cacheFile = `${cacheDir}/${type}.json`;
    
    let reportData;
    
    // Try to load from cache
    try {
      const fs = await import("fs");
      
      // Ensure cache directory exists
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        log.info({ route: "/reports/:studentId", action: "created_cache_dir", path: cacheDir });
      }
      
      if (fs.existsSync(cacheFile)) {
        const cached = fs.readFileSync(cacheFile, "utf-8");
        reportData = JSON.parse(cached);
        log.debug({ route: "/reports/:studentId", studentId, type, source: "cache" });
      }
    } catch (err) {
      // Cache miss, generate on demand
    }
    
    if (!reportData) {
      // Generate on demand
      if (type === "yield") {
        reportData = await generateYieldReport(studentId, log);
      } else if (type === "temporal") {
        reportData = await generateTemporalReport(studentId, log);
      } else {
        return res.status(400).json({ error: "Invalid report type. Use 'yield' or 'temporal'" });
      }
      log.debug({ route: "/reports/:studentId", studentId, type, source: "generated" });
      
      // Save to cache for future requests
      try {
        const fs = await import("fs");
        fs.writeFileSync(cacheFile, JSON.stringify(reportData, null, 2));
        log.info({ route: "/reports/:studentId", action: "cached_report", path: cacheFile });
      } catch (cacheErr) {
        log.warn({ error: cacheErr }, "Failed to cache report");
      }
    }
    
    res.json(reportData);
  } catch (error) {
    log.error({ error }, "Failed to get report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper functions for report generation
async function generateYieldReport(studentId: string, log: any) {
  const result = await db.query(`
    WITH base AS (
      SELECT
        COALESCE(
          o.value->>'category',
          CASE 
            WHEN o.value->>'name' ILIKE '%summer%' THEN 'Summer Programs'
            WHEN o.value->>'name' ILIKE '%research%' THEN 'Research'
            WHEN o.value->>'name' ILIKE '%scholarship%' THEN 'Scholarships'
            WHEN o.value->>'name' ILIKE '%honor%' THEN 'Honor Societies'
            WHEN o.value->>'name' ILIKE '%award%' OR o.value->>'name' ILIKE '%competition%' THEN 'Awards & Competitions'
            WHEN o.value->>'name' ILIKE '%intern%' THEN 'Internships'
            ELSE 'Other'
          END
        ) AS category,
        o.subtype AS status
      FROM observations o
      WHERE o.student_id = $1
        AND o.kind = 'APPLICATION'
        AND o.subtype IN ('accepted','rejected','waitlisted')
        AND o.value->>'name' IS NOT NULL
    ),
    stats AS (
      SELECT 
        category,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) AS waitlisted
      FROM base
      WHERE category IS NOT NULL
      GROUP BY category
    )
    SELECT 
      category,
      total::int,
      accepted::int,
      rejected::int,
      waitlisted::int,
      ROUND(100.0 * accepted / NULLIF(total, 0), 1)::float AS win_rate_pct
    FROM stats
    WHERE total > 0
    ORDER BY win_rate_pct DESC NULLS LAST
  `, [studentId]);
  
  const categories = result.rows;
  const totalApps = categories.reduce((sum: number, cat: any) => sum + cat.total, 0);
  const totalAccepted = categories.reduce((sum: number, cat: any) => sum + cat.accepted, 0);
  const overallWinRate = totalApps > 0 ? ((totalAccepted / totalApps) * 100).toFixed(1) : "0";
  
  return {
    type: "yield",
    studentId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalApplications: totalApps,
      totalAccepted,
      overallWinRate: parseFloat(overallWinRate),
      categoriesAnalyzed: categories.length
    },
    categories,
    insights: {
      highYield: categories.filter((c: any) => c.win_rate_pct >= 80),
      challenging: categories.filter((c: any) => c.win_rate_pct < 50),
      recommended: categories.filter((c: any) => c.win_rate_pct >= 80).map((c: any) => c.category)
    }
  };
}

async function generateTemporalReport(studentId: string, log: any) {
  // Get weekly activity - with proper date handling
  const weeklyResult = await db.query(`
    WITH weekly_activity AS (
      SELECT 
        DATE_TRUNC('week', COALESCE(o.at, o.created_at))::DATE AS week,
        COUNT(*) AS applications,
        SUM(CASE WHEN o.subtype = 'accepted' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN o.subtype = 'rejected' THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN o.subtype = 'waitlisted' THEN 1 ELSE 0 END) AS waitlisted
      FROM observations o
      WHERE o.student_id = $1
        AND o.kind = 'APPLICATION'
        AND o.subtype IN ('accepted', 'rejected', 'waitlisted')
        AND (o.at IS NOT NULL OR o.created_at IS NOT NULL)
      GROUP BY DATE_TRUNC('week', COALESCE(o.at, o.created_at))::DATE
    )
    SELECT 
      TO_CHAR(week, 'YYYY-MM-DD') AS week_start,
      applications::int,
      wins::int,
      losses::int,
      waitlisted::int,
      COALESCE(ROUND(100.0 * wins / NULLIF(applications, 0), 1), 0)::float AS win_rate_pct
    FROM weekly_activity
    WHERE applications > 0
    ORDER BY week
  `, [studentId]);
  
  // Get rebound metrics - with proper date handling
  const reboundResult = await db.query(`
    WITH timeline AS (
      SELECT 
        o.value->>'name' AS opportunity_name,
        o.subtype AS status,
        COALESCE(o.at, o.created_at)::date AS decision_date,
        LAG(o.subtype) OVER (PARTITION BY o.value->>'name' ORDER BY COALESCE(o.at, o.created_at)) AS prev_status,
        LAG(COALESCE(o.at, o.created_at)::date) OVER (PARTITION BY o.value->>'name' ORDER BY COALESCE(o.at, o.created_at)) AS prev_date
      FROM observations o
      WHERE o.student_id = $1
        AND o.kind = 'APPLICATION'
        AND o.subtype IN ('accepted', 'rejected', 'waitlisted')
        AND o.value->>'name' IS NOT NULL
    ),
    rebounds_calc AS (
      SELECT 
        opportunity_name,
        status,
        prev_status,
        decision_date,
        prev_date,
        CASE 
          WHEN prev_status = 'rejected' AND status = 'accepted' AND prev_date IS NOT NULL
          THEN decision_date - prev_date
          ELSE NULL
        END AS rebound_days
      FROM timeline
    )
    SELECT 
      COUNT(*) FILTER (WHERE prev_status = 'rejected' AND status = 'accepted') AS rebounds,
      AVG(rebound_days)::float AS avg_rebound_days
    FROM rebounds_calc
  `, [studentId]);
  
  const weeks = weeklyResult.rows;
  const bombardmentWeeks = weeks.filter((w: any) => w.applications >= 5);
  const rebounds = reboundResult.rows[0]?.rebounds || 0;
  const avgReboundDays = reboundResult.rows[0]?.avg_rebound_days || null;
  
  return {
    type: "temporal",
    studentId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalWeeks: weeks.length,
      bombardmentWeeks: bombardmentWeeks.length,
      rejectionRebounds: rebounds,
      avgReboundDays: avgReboundDays ? Math.round(avgReboundDays) : null
    },
    weeklyActivity: weeks,
    patterns: {
      bombardment: {
        count: bombardmentWeeks.length,
        avgApplications: bombardmentWeeks.length > 0 
          ? (bombardmentWeeks.reduce((sum: number, w: any) => sum + w.applications, 0) / bombardmentWeeks.length).toFixed(1)
          : "0",
        avgWinRate: bombardmentWeeks.length > 0
          ? (bombardmentWeeks.reduce((sum: number, w: any) => sum + (w.win_rate_pct || 0), 0) / bombardmentWeeks.length).toFixed(1)
          : "0"
      },
      resilience: {
        rebounds,
        avgReboundDays: avgReboundDays ? Math.round(avgReboundDays) : null,
        reboundSuccess: rebounds > 0
      }
    }
  };
}

const port = process.env.API_PORT || 4000;
app.listen(port, () => {
  const log = child({ svc: "api" });
  log.info(`api listening :${port}`);
});
