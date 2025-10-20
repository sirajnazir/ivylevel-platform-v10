// services/agent-framework/src/router/intentRouter.ts
import OpenAI from "openai";
import { z } from "zod";
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import * as resolvers from '../services/resolvers.js';
import * as nsmResolvers from '../resolvers/nsm.js';
import type { Pool } from 'pg';
import { extractUAPX } from '../intent/extractors/uapx.js';
import type { Domain } from '../intent/schema.js';
import { extractCollegeFiltersGuardrail, extractScholarshipFiltersGuardrail } from '../intent/extractors/guardrails.js';

const log = createLogger('intent-router');
const ROUTE_THRESHOLD = Number(process.env.INTENT_ROUTE_THRESHOLD ?? "0.62"); // High confidence: Route immediately
const MEDIUM_CONFIDENCE_THRESHOLD = Number(process.env.INTENT_MEDIUM_THRESHOLD ?? "0.50"); // Medium confidence: Execute with best-effort
const CLARIFY_THRESHOLD = Number(process.env.INTENT_CLARIFY_THRESHOLD ?? "0.45"); // Low confidence: Ask for clarification

// ============================================================================
// GPT-5 Intent Classifier (inlined to avoid module issues)
// ============================================================================

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Intent =
  | "ecs.list"
  | "ecs.leadership"
  | "ecs.by_role"
  | "awards.list"
  | "programs.list"
  | "academics.summary"
  | "academics.transcript.initial"
  | "academics.transcript.final"
  | "academics.transcript.progression"
  | "academics.gpa.initial"
  | "academics.gpa.final"
  | "academics.gpa.latest"
  | "academics.gpa.progression"
  | "narrative.summary"
  | "progression.timeline"
  | "sat.ordinal"
  | "testing.sat.first"
  | "testing.sat.latest"
  | "testing.sat.progression"
  | "gameplan.initial"
  | "gameplan.vs_progress"
  | "application.final"
  | "ivyready.score"
  | "ivyready.initial"
  | "ivyready.final"
  | "ivyready.compare"
  | "ivyready.factors"
  | "readiness.now"
  | "readiness.progress"
  | "readiness.drivers"
  | "readiness.whatif.sat"
  | "readiness.whatif.award"
  | "readiness.whatif.ec"
  | "readiness.whatif.gpa"
  | "readiness.whatif.program"
  | "readiness.next_moves"
  | "readiness.weakspots.now"
  | "readiness.boost.max"
  | "readiness.boost.plan"
  | "readiness.progression"
  | "readiness.top_priorities"
  | "college.list"
  | "college.attending"
  | "college.accepted"
  | "college.reach"
  | "college.match"
  | "college.safety"
  | "college.early_decision"
  | "college.early_action"
  | "college.restrictive_early"
  | "college.regular_decision"
  | "college.compare.readiness"
  | "scholarship.list"
  | "scholarship.total"
  | "vitals.latest"
  | "vitals.progression"
  | "vitals.funding.progression"
  | "vitals.scale.progression"
  | "vitals.impact.latest"
  | "vitals.summary"
  | "jtbd.week"
  | "jtbd.completed"
  | "jtbd.pending"
  | "jtbd.milestones"
  | "jtbd.progression"
  | "kb.search"
  | "nsm.dashboard"
  | "nsm.recognition"
  | "nsm.leadership"
  | "nsm.academic"
  | "nsm.program"
  | "assessment.start.interactive"
  | "assessment.start.simulated"
  | "assessment.respond"
  | "assessment.status"
  | "unknown";

type Phase = "initial" | "final" | null;
type Object = "ec" | "award" | "program" | "academics" | "narrative" | "sat" | "testing" | "vitals" | "jtbd" | "college" | "readiness" | "gameplan" | "application" | "rubric" | "scholarship" | "kb" | "nsm";
type NthOrdinal = "first" | "second" | "third" | "latest" | number;

const IntentSchema = z.object({
  intent: z.custom<Intent>(),
  phase: z.custom<Phase>(),
  object: z.custom<Object>(),
  filters: z.object({
    as_of: z.string().nullable().optional(),
    school: z.string().nullable().optional(),
    scope: z.string().nullable().optional(),
    nth: z.union([z.string(), z.number()]).nullable().optional(),
    components: z.array(z.string()).nullable().optional(),
    award: z.string().nullable().optional(),
    framework: z.string().nullable().optional(),
    activity: z.string().nullable().optional(),
  }).optional(),
  confidence: z.number().min(0).max(1),
  detector: z.enum(["llm","keyword-floor"]).optional(),
});

// 48-example comprehensive training pack with synonym coverage
const FEW_SHOT = [
  // ECs - Initial (4 examples)
  {input:"what was my initial EC list?", output:{intent:"ecs.list", phase:"initial", object:"ec", filters:{}, confidence:0.95}},
  {input:"show the extracurriculars from my game plan", output:{intent:"ecs.list", phase:"initial", object:"ec", filters:{}, confidence:0.93}},
  {input:"what activities did we target at the start?", output:{intent:"ecs.list", phase:"initial", object:"ec", filters:{}, confidence:0.9}},
  {input:"in the gameplan, which ECs were listed?", output:{intent:"ecs.list", phase:"initial", object:"ec", filters:{}, confidence:0.92}},

  // ECs - Final (4 examples - v10.7.1)
  {input:"what was my final EC list?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.95}},
  {input:"which activities made it into my Common App?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.96}},
  {input:"ECs I submitted in the college application", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.94}},
  {input:"what ECs did I end up submitting?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.93}},

  // ECs - By Role (6 examples - v10.7.1 NEW)
  {input:"show only my leadership roles", output:{intent:"ecs.leadership", phase:"final", object:"ec", filters:{role:"leadership"}, confidence:0.96}},
  {input:"filter my ECs to leadership positions", output:{intent:"ecs.leadership", phase:"final", object:"ec", filters:{role:"leadership"}, confidence:0.95}},
  {input:"which activities was I a leader?", output:{intent:"ecs.leadership", phase:"final", object:"ec", filters:{role:"leadership"}, confidence:0.94}},
  {input:"show ECs where I was captain", output:{intent:"ecs.by_role", phase:"final", object:"ec", filters:{role:"captain"}, confidence:0.95}},
  {input:"president roles in my activities", output:{intent:"ecs.by_role", phase:"final", object:"ec", filters:{role:"president"}, confidence:0.94}},
  {input:"founder positions", output:{intent:"ecs.by_role", phase:"final", object:"ec", filters:{role:"founder"}, confidence:0.93}},

  // Awards - Initial (4 examples)
  {input:"what was my initial awards list?", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.95}},
  {input:"game plan award targets", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.92}},
  {input:"which honors did we aim for initially?", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.91}},
  {input:"initial list of prizes to pursue", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.9}},

  // Awards - Final (6 examples - v10.7.1 EXPANDED)
  {input:"what was my final awards list?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.95}},
  {input:"which awards did I submit on my application?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.96}},
  {input:"which honors ended up on the Common App?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.95}},
  {input:"awards that made the final cut", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.92}},
  {input:"how many National vs Regional awards do I have?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.93}},
  {input:"breakdown of my awards by tier", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.92}},

  // Awards - Wins/Progression (4 examples)
  {input:"which awards did I win?", output:{intent:"progression.timeline", phase:null, object:"award", filters:{scope:null}, confidence:0.95}},
  {input:"show my award wins", output:{intent:"progression.timeline", phase:null, object:"award", filters:{}, confidence:0.94}},
  {input:"what awards did I actually get?", output:{intent:"progression.timeline", phase:null, object:"award", filters:{}, confidence:0.95}},
  {input:"list the awards I ended up winning", output:{intent:"progression.timeline", phase:null, object:"award", filters:{}, confidence:0.94}},

  // Programs - Initial (4 examples)
  {input:"what were my initial summer programs?", output:{intent:"programs.list", phase:"initial", object:"program", filters:{}, confidence:0.95}},
  {input:"summer program targets from the game plan", output:{intent:"programs.list", phase:"initial", object:"program", filters:{}, confidence:0.93}},
  {input:"which summer camps were we aiming for?", output:{intent:"programs.list", phase:"initial", object:"program", filters:{}, confidence:0.91}},
  {input:"planned summer programs", output:{intent:"programs.list", phase:"initial", object:"program", filters:{}, confidence:0.9}},

  // Programs - Final (4 examples)
  {input:"which summer programs did I get into?", output:{intent:"programs.list", phase:"final", object:"program", filters:{}, confidence:0.96}},
  {input:"summer programs I was accepted to", output:{intent:"programs.list", phase:"final", object:"program", filters:{}, confidence:0.96}},
  {input:"final list of summer programs", output:{intent:"programs.list", phase:"final", object:"program", filters:{}, confidence:0.94}},
  {input:"what summer programs ended up on the app?", output:{intent:"programs.list", phase:"final", object:"program", filters:{}, confidence:0.93}},

  // Narrative - Initial (4 examples)
  {input:"what was my initial narrative?", output:{intent:"narrative.summary", phase:"initial", object:"narrative", filters:{}, confidence:0.95}},
  {input:"game plan narrative (identity+passion+aptitude+cause)", output:{intent:"narrative.summary", phase:"initial", object:"narrative", filters:{}, confidence:0.95}},
  {input:"the starting USP narrative we defined", output:{intent:"narrative.summary", phase:"initial", object:"narrative", filters:{}, confidence:0.92}},
  {input:"initial why-statement and framing", output:{intent:"narrative.summary", phase:"initial", object:"narrative", filters:{}, confidence:0.92}},

  // Narrative - Final (4 examples)
  {input:"what was my final narrative?", output:{intent:"narrative.summary", phase:"final", object:"narrative", filters:{}, confidence:0.95}},
  {input:"how did we frame the final story on the Common App?", output:{intent:"narrative.summary", phase:"final", object:"narrative", filters:{}, confidence:0.94}},
  {input:"final USP as submitted", output:{intent:"narrative.summary", phase:"final", object:"narrative", filters:{}, confidence:0.93}},
  {input:"what was my narrative in the submitted app?", output:{intent:"narrative.summary", phase:"final", object:"narrative", filters:{}, confidence:0.94}},

  // Academics - Initial (4 examples)
  {input:"what was my initial academics?", output:{intent:"academics.summary", phase:"initial", object:"academics", filters:{components:["grades","sat","gpa"]}, confidence:0.9}},
  {input:"initial grades and SAT from the assessment", output:{intent:"academics.summary", phase:"initial", object:"academics", filters:{components:["grades","sat"]}, confidence:0.92}},
  {input:"baseline GPA + test scores", output:{intent:"academics.summary", phase:"initial", object:"academics", filters:{components:["gpa","sat"]}, confidence:0.9}},
  {input:"what did my early transcript look like?", output:{intent:"academics.summary", phase:"initial", object:"academics", filters:{components:["grades","gpa"]}, confidence:0.88}},

  // Academics - Final (4 examples)
  {input:"what were my final academics?", output:{intent:"academics.summary", phase:"final", object:"academics", filters:{components:["grades","gpa","sat","ap"]}, confidence:0.94}},
  {input:"final grades/GPA and submitted test scores", output:{intent:"academics.summary", phase:"final", object:"academics", filters:{components:["grades","gpa","sat","ap"]}, confidence:0.95}},
  {input:"academics as submitted on the Common App", output:{intent:"academics.summary", phase:"final", object:"academics", filters:{components:["grades","gpa","sat","ap"]}, confidence:0.94}},
  {input:"what did I submit for GPA and SAT?", output:{intent:"academics.summary", phase:"final", object:"academics", filters:{components:["gpa","sat"]}, confidence:0.94}},

  // Progression (4 examples)
  {input:"show my progress from plan to outcome for ECs", output:{intent:"progression.timeline", phase:null, object:"ec", filters:{}, confidence:0.93}},
  {input:"timeline of awards from target to win", output:{intent:"progression.timeline", phase:null, object:"award", filters:{}, confidence:0.94}},
  {input:"how did my summer programs progress?", output:{intent:"progression.timeline", phase:null, object:"program", filters:{}, confidence:0.92}},
  {input:"from initial narrative to final—what changed?", output:{intent:"progression.timeline", phase:null, object:"narrative", filters:{}, confidence:0.9}},

  // SAT Ordinals (4 examples)
  {input:"what was my first SAT score?", output:{intent:"sat.ordinal", phase:null, object:"sat", filters:{nth:"first"}, confidence:0.96}},
  {input:"what was my second SAT score?", output:{intent:"sat.ordinal", phase:null, object:"sat", filters:{nth:"second"}, confidence:0.96}},
  {input:"what's my latest SAT?", output:{intent:"sat.ordinal", phase:null, object:"sat", filters:{nth:"latest"}, confidence:0.96}},
  {input:"SAT progression", output:{intent:"progression.timeline", phase:null, object:"sat", filters:{}, confidence:0.95}},

  // GamePlan - Initial (4 examples)
  {input:"show my gameplan", output:{intent:"gameplan.initial", phase:"initial", object:"gameplan", filters:{}, confidence:0.95}},
  {input:"what was in my game plan?", output:{intent:"gameplan.initial", phase:"initial", object:"gameplan", filters:{}, confidence:0.94}},
  {input:"initial targets from the assessment", output:{intent:"gameplan.initial", phase:"initial", object:"gameplan", filters:{}, confidence:0.93}},
  {input:"targets after assessment", output:{intent:"gameplan.initial", phase:"initial", object:"gameplan", filters:{}, confidence:0.92}},

  // GamePlan - Progress (4 examples)
  {input:"gameplan vs execution", output:{intent:"gameplan.vs_progress", phase:null, object:"gameplan", filters:{}, confidence:0.96}},
  {input:"show progress from targets to outcomes", output:{intent:"gameplan.vs_progress", phase:null, object:"gameplan", filters:{}, confidence:0.95}},
  {input:"compare my plan vs what actually happened", output:{intent:"gameplan.vs_progress", phase:null, object:"gameplan", filters:{}, confidence:0.94}},
  {input:"how did my gameplan evolve?", output:{intent:"gameplan.vs_progress", phase:null, object:"gameplan", filters:{}, confidence:0.93}},

  // Application - Final (4 examples)
  {input:"show my Common App submission", output:{intent:"application.final", phase:"final", object:"application", filters:{}, confidence:0.96}},
  {input:"what did I submit on the application?", output:{intent:"application.final", phase:"final", object:"application", filters:{}, confidence:0.95}},
  {input:"final Common App template", output:{intent:"application.final", phase:"final", object:"application", filters:{}, confidence:0.94}},
  {input:"what was on my submitted app?", output:{intent:"application.final", phase:"final", object:"application", filters:{}, confidence:0.93}},

  // IvyReady Score (8 examples - added phase detection)
  {input:"what's my IvyReady score?", output:{intent:"ivyready.score", phase:null, object:"rubric", filters:{}, confidence:0.96}},
  {input:"show rubric score", output:{intent:"ivyready.score", phase:null, object:"rubric", filters:{}, confidence:0.95}},
  {input:"admissions rubric scores", output:{intent:"ivyready.score", phase:null, object:"rubric", filters:{}, confidence:0.94}},
  {input:"my current IvyReady rating", output:{intent:"ivyready.score", phase:null, object:"rubric", filters:{}, confidence:0.95}},
  {input:"what was my initial IvyReady score?", output:{intent:"ivyready.score", phase:"initial", object:"rubric", filters:{}, confidence:0.96}},
  {input:"initial ivy ready score", output:{intent:"ivyready.score", phase:"initial", object:"rubric", filters:{}, confidence:0.95}},
  {input:"what's my final IvyReady score?", output:{intent:"ivyready.score", phase:"final", object:"rubric", filters:{}, confidence:0.96}},
  {input:"rubric score at submission", output:{intent:"ivyready.score", phase:"final", object:"rubric", filters:{}, confidence:0.94}},

  // IvyReady Snapshots - Initial (3 examples)
  {input:"initial ivy score", output:{intent:"ivyready.initial", phase:"initial", object:"rubric", filters:{}, confidence:0.96}},
  {input:"my ivy score at assessment", output:{intent:"ivyready.initial", phase:"initial", object:"rubric", filters:{}, confidence:0.95}},
  {input:"first ivyready score", output:{intent:"ivyready.initial", phase:"initial", object:"rubric", filters:{}, confidence:0.94}},

  // IvyReady Snapshots - Final (3 examples)
  {input:"final ivy score", output:{intent:"ivyready.final", phase:"final", object:"rubric", filters:{}, confidence:0.96}},
  {input:"ivy score at submit", output:{intent:"ivyready.final", phase:"final", object:"rubric", filters:{}, confidence:0.95}},
  {input:"ivyready when I submitted", output:{intent:"ivyready.final", phase:"final", object:"rubric", filters:{}, confidence:0.94}},

  // IvyReady Snapshots - Compare (4 examples)
  {input:"compare initial and final ivy score", output:{intent:"ivyready.compare", phase:null, object:"rubric", filters:{}, confidence:0.97}},
  {input:"how did my ivy score change", output:{intent:"ivyready.compare", phase:null, object:"rubric", filters:{}, confidence:0.96}},
  {input:"progress ivy score", output:{intent:"ivyready.compare", phase:null, object:"rubric", filters:{}, confidence:0.94}},
  {input:"delta ivy", output:{intent:"ivyready.compare", phase:null, object:"rubric", filters:{}, confidence:0.93}},

  // IvyReady Snapshots - Factors (4 examples)
  {input:"factor breakdown", output:{intent:"ivyready.factors", phase:null, object:"rubric", filters:{}, confidence:0.95}},
  {input:"what drove my ivy score", output:{intent:"ivyready.factors", phase:null, object:"rubric", filters:{}, confidence:0.96}},
  {input:"which factors improved", output:{intent:"ivyready.factors", phase:null, object:"rubric", filters:{}, confidence:0.95}},
  {input:"why did ivy change", output:{intent:"ivyready.factors", phase:null, object:"rubric", filters:{}, confidence:0.94}},

  // Readiness - Current Score (4 examples)
  {input:"what's my readiness score?", output:{intent:"readiness.now", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"am I ivy ready?", output:{intent:"readiness.now", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"current readiness", output:{intent:"readiness.now", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"how ready am I for Ivies?", output:{intent:"readiness.now", phase:null, object:"readiness", filters:{}, confidence:0.95}},

  // Readiness - Progress (4 examples)
  {input:"how has my readiness changed?", output:{intent:"readiness.progress", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"readiness timeline", output:{intent:"readiness.progress", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"show readiness progression", output:{intent:"readiness.progress", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"track my readiness growth", output:{intent:"readiness.progress", phase:null, object:"readiness", filters:{}, confidence:0.93}},

  // Readiness - Drivers (4 examples)
  {input:"what's driving my readiness score?", output:{intent:"readiness.drivers", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"why is my readiness score what it is?", output:{intent:"readiness.drivers", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"readiness factor breakdown", output:{intent:"readiness.drivers", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"which factors are affecting my readiness?", output:{intent:"readiness.drivers", phase:null, object:"readiness", filters:{}, confidence:0.95}},

  // Readiness - What-If SAT (4 examples)
  {input:"what if I raise my SAT to 1500?", output:{intent:"readiness.whatif.sat", phase:null, object:"readiness", filters:{action_param:1500}, confidence:0.97}},
  {input:"how would a 1550 SAT affect my readiness?", output:{intent:"readiness.whatif.sat", phase:null, object:"readiness", filters:{action_param:1550}, confidence:0.96}},
  {input:"simulate SAT 1480", output:{intent:"readiness.whatif.sat", phase:null, object:"readiness", filters:{action_param:1480}, confidence:0.94}},
  {input:"if my SAT was 1600, what would happen?", output:{intent:"readiness.whatif.sat", phase:null, object:"readiness", filters:{action_param:1600}, confidence:0.96}},

  // Readiness - What-If Award (4 examples)
  {input:"what if I win a national award?", output:{intent:"readiness.whatif.award", phase:null, object:"readiness", filters:{action_param:"National"}, confidence:0.96}},
  {input:"how would winning an international award help?", output:{intent:"readiness.whatif.award", phase:null, object:"readiness", filters:{action_param:"International"}, confidence:0.96}},
  {input:"simulate regional award win", output:{intent:"readiness.whatif.award", phase:null, object:"readiness", filters:{action_param:"Regional"}, confidence:0.94}},
  {input:"what if I got a national level distinction?", output:{intent:"readiness.whatif.award", phase:null, object:"readiness", filters:{action_param:"National"}, confidence:0.95}},

  // Readiness - Weakspots (v3.9.1 - 6 examples)
  {input:"what's my top weak spot?", output:{intent:"readiness.weakspots.now", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"what's dragging my IvyReady score down?", output:{intent:"readiness.weakspots.now", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"where am I lagging?", output:{intent:"readiness.weakspots.now", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"which areas are hurting me most?", output:{intent:"readiness.weakspots.now", phase:null, object:"readiness", filters:{}, confidence:0.93}},
  {input:"what's my biggest weakness?", output:{intent:"readiness.weakspots.now", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"show me where I'm falling behind", output:{intent:"readiness.weakspots.now", phase:null, object:"readiness", filters:{}, confidence:0.92}},

  // Readiness - Boost Max (v3.9.1 - 8 examples with stronger patterns)
  {input:"which one thing can give me the biggest boost?", output:{intent:"readiness.boost.max", phase:null, object:"readiness", filters:{}, confidence:0.98}},
  {input:"which one thing would boost me most?", output:{intent:"readiness.boost.max", phase:null, object:"readiness", filters:{}, confidence:0.98}},
  {input:"what's the highest impact improvement?", output:{intent:"readiness.boost.max", phase:null, object:"readiness", filters:{}, confidence:0.97}},
  {input:"biggest boost I can get?", output:{intent:"readiness.boost.max", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"where should I focus to maximize my score?", output:{intent:"readiness.boost.max", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"best way to boost my readiness quickly?", output:{intent:"readiness.boost.max", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"which area gives the most ROI?", output:{intent:"readiness.boost.max", phase:null, object:"readiness", filters:{}, confidence:0.93}},
  {input:"what single thing can I do to improve most?", output:{intent:"readiness.boost.max", phase:null, object:"readiness", filters:{}, confidence:0.97}},

  // Readiness - Boost Plan (v3.9.1 - 6 examples)
  {input:"how do I fix my weak spots?", output:{intent:"readiness.boost.plan", phase:null, object:"readiness", filters:{}, confidence:0.97}},
  {input:"what should I prioritize this month?", output:{intent:"readiness.boost.plan", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"give me an action plan to improve", output:{intent:"readiness.boost.plan", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"how can I improve fastest?", output:{intent:"readiness.boost.plan", phase:null, object:"readiness", filters:{}, confidence:0.93}},
  {input:"what's my strategic improvement plan?", output:{intent:"readiness.boost.plan", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"how do I increase readiness by 10 points?", output:{intent:"readiness.boost.plan", phase:null, object:"readiness", filters:{}, confidence:0.95}},

  // Readiness - Progression (v3.9.1 - 6 examples with trend/trajectory)
  {input:"how has my readiness improved?", output:{intent:"readiness.progression", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"how has my readiness changed?", output:{intent:"readiness.progression", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"track my growth over time", output:{intent:"readiness.progression", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"show my readiness history", output:{intent:"readiness.progression", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"how much did I improve this semester?", output:{intent:"readiness.progression", phase:null, object:"readiness", filters:{}, confidence:0.93}},
  {input:"what's my readiness trajectory?", output:{intent:"readiness.progression", phase:null, object:"readiness", filters:{}, confidence:0.94}},

  // Readiness - What-If EC (10 examples with activity-aware patterns - v10.7.1 EXPANDED)
  {input:"what if I grow Empowering AI to 10,000 users?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"what if I only scaled the empowering AI to 100 users?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"what if I double users on Synthoria?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"how would raising $25k for Folklift help?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"what if I increase hours per week to 12 on Filmmaker's Club?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"scale Synthoria to 5000 users impact?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"reach 10k users on Empowering AI?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"2x users for my main EC?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.93}},
  {input:"what if I expand Empowering AI to 20 countries?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"expand my EC to more countries?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.93}},

  // Readiness - What-If GPA (4 examples)
  {input:"what if I raise my GPA to 3.95?", output:{intent:"readiness.whatif.gpa", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"how would a 4.0 GPA affect my readiness?", output:{intent:"readiness.whatif.gpa", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"simulate GPA of 3.8", output:{intent:"readiness.whatif.gpa", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"what if my GPA was 3.9?", output:{intent:"readiness.whatif.gpa", phase:null, object:"readiness", filters:{}, confidence:0.95}},

  // Readiness - What-If Program (4 examples)
  {input:"what if I get into RSI?", output:{intent:"readiness.whatif.program", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"how would getting into YYGS help my readiness?", output:{intent:"readiness.whatif.program", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"simulate admission to LaunchX", output:{intent:"readiness.whatif.program", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"what if I got into TASP?", output:{intent:"readiness.whatif.program", phase:null, object:"readiness", filters:{}, confidence:0.96}},

  // Readiness - Next Moves (3 examples - narrower focus on general recommendations)
  {input:"what should I do to improve my readiness?", output:{intent:"readiness.next_moves", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"recommended actions for my profile", output:{intent:"readiness.next_moves", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"general recommendations for improving", output:{intent:"readiness.next_moves", phase:null, object:"readiness", filters:{}, confidence:0.94}},

  // College List (12 examples - v4.6.2b balanced)
  {input:"which colleges did I get into?", output:{intent:"college.list", phase:null, object:"college", filters:{decision_result:"Accepted"}, confidence:0.98}},
  {input:"which colleges did I actually get into?", output:{intent:"college.list", phase:null, object:"college", filters:{decision_result:"Accepted"}, confidence:0.98}},
  {input:"which college am I attending?", output:{intent:"college.list", phase:null, object:"college", filters:{attending:true}, confidence:0.98}},
  {input:"where am I going to college?", output:{intent:"college.list", phase:null, object:"college", filters:{attending:true}, confidence:0.97}},
  {input:"show my college acceptances", output:{intent:"college.list", phase:null, object:"college", filters:{decision_result:"Accepted"}, confidence:0.96}},
  {input:"which of my match schools accepted me?", output:{intent:"college.list", phase:null, object:"college", filters:{category:"Match",decision_result:"Accepted"}, confidence:0.95}},
  {input:"which reach schools waitlisted me?", output:{intent:"college.list", phase:null, object:"college", filters:{category:"Reach",decision_result:"Waitlisted"}, confidence:0.96}},
  {input:"which schools rejected me?", output:{intent:"college.list", phase:null, object:"college", filters:{decision_result:"Rejected"}, confidence:0.95}},
  {input:"where was I deferred?", output:{intent:"college.list", phase:null, object:"college", filters:{decision_result:"Deferred"}, confidence:0.94}},
  {input:"show me all my reach school outcomes", output:{intent:"college.list", phase:null, object:"college", filters:{category:"Reach"}, confidence:0.94}},
  {input:"which safety schools did I get into?", output:{intent:"college.list", phase:null, object:"college", filters:{category:"Safety",decision_result:"Accepted"}, confidence:0.96}},
  {input:"list all colleges I applied to", output:{intent:"college.list", phase:null, object:"college", filters:{}, confidence:0.93}},

  // Scholarship (6 examples - v4.6.2b)
  {input:"which scholarships did I receive?", output:{intent:"scholarship.list", phase:null, object:"scholarship", filters:{application_status:"Accepted"}, confidence:0.97}},
  {input:"show me scholarships I won", output:{intent:"scholarship.list", phase:null, object:"scholarship", filters:{application_status:"Accepted"}, confidence:0.97}},
  {input:"which scholarships are pending?", output:{intent:"scholarship.list", phase:null, object:"scholarship", filters:{application_status:"Applied"}, confidence:0.96}},
  {input:"what scholarships am I waiting to hear back from?", output:{intent:"scholarship.list", phase:null, object:"scholarship", filters:{application_status:"Applied"}, confidence:0.96}},
  {input:"how much scholarship money did I receive?", output:{intent:"scholarship.total", phase:null, object:"scholarship", filters:{application_status:"Accepted"}, confidence:0.97}},
  {input:"total scholarship amount", output:{intent:"scholarship.total", phase:null, object:"scholarship", filters:{application_status:"Accepted"}, confidence:0.94}},

  // College Readiness Comparison (2 examples - v4.6.1)
  {input:"compare my readiness with schools that accepted me", output:{intent:"college.compare.readiness", phase:null, object:"college", filters:{}, confidence:0.96}},
  {input:"how does my readiness compare to my acceptances?", output:{intent:"college.compare.readiness", phase:null, object:"college", filters:{}, confidence:0.95}},

  // KB Search - Coaching Intelligence (16 examples - v5.6 with facets)
  {input:"how did Jenny coach me on NCWIT?", output:{intent:"kb.search", phase:null, object:"kb", filters:{award:"NCWIT"}, confidence:0.97}},
  {input:"how did the coaching for NCWIT happen from start to win?", output:{intent:"kb.search", phase:null, object:"kb", filters:{award:"NCWIT"}, confidence:0.98}},
  {input:"what were our ncwit essay surgery moves?", output:{intent:"kb.search", phase:null, object:"kb", filters:{award:"NCWIT"}, confidence:0.97}},
  {input:"ncwit coaching steps", output:{intent:"kb.search", phase:null, object:"kb", filters:{award:"NCWIT"}, confidence:0.98}},
  {input:"show me the 168 framework", output:{intent:"kb.search", phase:null, object:"kb", filters:{framework:"168"}, confidence:0.98}},
  {input:"how did the 168-hour plan get implemented?", output:{intent:"kb.search", phase:null, object:"kb", filters:{framework:"168"}, confidence:0.97}},
  {input:"show me the 168 framework we used to cut tiktok time", output:{intent:"kb.search", phase:null, object:"kb", filters:{framework:"168"}, confidence:0.98}},
  {input:"how did we scale empowering ai to 100 users?", output:{intent:"kb.search", phase:null, object:"kb", filters:{activity:"Empowering AI"}, confidence:0.97}},
  {input:"empowering ai growth tactics", output:{intent:"kb.search", phase:null, object:"kb", filters:{activity:"Empowering AI"}, confidence:0.97}},
  {input:"what tactics did we use for essay writing?", output:{intent:"kb.search", phase:null, object:"kb", filters:{}, confidence:0.96}},
  {input:"what was our strategy for UNC application?", output:{intent:"kb.search", phase:null, object:"kb", filters:{}, confidence:0.95}},
  {input:"when did I struggle with time management?", output:{intent:"kb.search", phase:null, object:"kb", filters:{}, confidence:0.94}},
  {input:"what were the key coaching moments?", output:{intent:"kb.search", phase:null, object:"kb", filters:{}, confidence:0.96}},
  {input:"how did we approach the Common App essays?", output:{intent:"kb.search", phase:null, object:"kb", filters:{}, confidence:0.95}},
  {input:"what frameworks did Jenny teach me?", output:{intent:"kb.search", phase:null, object:"kb", filters:{}, confidence:0.97}},
  {input:"bank of america coaching approach", output:{intent:"kb.search", phase:null, object:"kb", filters:{award:"Bank of America"}, confidence:0.97}},

  // EC Vitals - Funding Progression (4 examples - v10.7)
  {input:"how much funding have I raised over time?", output:{intent:"vitals.funding.progression", phase:null, object:"vitals", filters:{metric_type:"financial"}, confidence:0.97}},
  {input:"show money raised progression", output:{intent:"vitals.funding.progression", phase:null, object:"vitals", filters:{metric_type:"financial"}, confidence:0.95}},
  {input:"track funding growth", output:{intent:"vitals.funding.progression", phase:null, object:"vitals", filters:{metric_type:"financial"}, confidence:0.94}},
  {input:"funding timeline", output:{intent:"vitals.funding.progression", phase:null, object:"vitals", filters:{metric_type:"financial"}, confidence:0.93}},

  // EC Vitals - Scale Progression (4 examples - v10.7)
  {input:"show me scale metrics over time", output:{intent:"vitals.scale.progression", phase:null, object:"vitals", filters:{metric_type:"scale"}, confidence:0.96}},
  {input:"how many students have I reached?", output:{intent:"vitals.scale.progression", phase:null, object:"vitals", filters:{metric_type:"scale"}, confidence:0.95}},
  {input:"members growth", output:{intent:"vitals.scale.progression", phase:null, object:"vitals", filters:{metric_type:"scale"}, confidence:0.93}},
  {input:"track my reach over time", output:{intent:"vitals.scale.progression", phase:null, object:"vitals", filters:{metric_type:"scale"}, confidence:0.94}},

  // EC Vitals - Impact Latest (3 examples - v10.7)
  {input:"what's my impact?", output:{intent:"vitals.impact.latest", phase:null, object:"vitals", filters:{metric_type:"impact"}, confidence:0.96}},
  {input:"show impact metrics", output:{intent:"vitals.impact.latest", phase:null, object:"vitals", filters:{metric_type:"impact"}, confidence:0.95}},
  {input:"media features and views", output:{intent:"vitals.impact.latest", phase:null, object:"vitals", filters:{metric_type:"impact"}, confidence:0.93}},

  // EC Vitals - Progression (3 examples - v10.7)
  {input:"show me all vitals progression", output:{intent:"vitals.progression", phase:null, object:"vitals", filters:{}, confidence:0.96}},
  {input:"track all my metrics over time", output:{intent:"vitals.progression", phase:null, object:"vitals", filters:{}, confidence:0.94}},
  {input:"full vitals timeline", output:{intent:"vitals.progression", phase:null, object:"vitals", filters:{}, confidence:0.93}},

  // EC Vitals - Latest (8 examples - v10.7 EXPANDED)
  {input:"show my latest vitals", output:{intent:"vitals.latest", phase:null, object:"vitals", filters:{}, confidence:0.95}},
  {input:"current metrics", output:{intent:"vitals.latest", phase:null, object:"vitals", filters:{}, confidence:0.93}},
  {input:"what are my current EC metrics?", output:{intent:"vitals.latest", phase:null, object:"vitals", filters:{}, confidence:0.94}},
  {input:"show my EC vitals", output:{intent:"vitals.latest", phase:null, object:"vitals", filters:{}, confidence:0.96}},
  {input:"EC metrics", output:{intent:"vitals.latest", phase:null, object:"vitals", filters:{}, confidence:0.94}},
  {input:"my quantitative impact", output:{intent:"vitals.latest", phase:null, object:"vitals", filters:{}, confidence:0.93}},
  {input:"show vitals", output:{intent:"vitals.latest", phase:null, object:"vitals", filters:{}, confidence:0.95}},
  {input:"activity metrics", output:{intent:"vitals.latest", phase:null, object:"vitals", filters:{}, confidence:0.93}},

  // EC Vitals - Summary (2 examples - v10.7)
  {input:"vitals summary", output:{intent:"vitals.summary", phase:null, object:"vitals", filters:{}, confidence:0.94}},
  {input:"summarize my EC metrics", output:{intent:"vitals.summary", phase:null, object:"vitals", filters:{}, confidence:0.93}},

  // NSM Dashboard (5 examples - v1.0)
  {input:"show my NSM dashboard", output:{intent:"nsm.dashboard", phase:null, object:"nsm", filters:{}, confidence:0.96}},
  {input:"show my north star metrics", output:{intent:"nsm.dashboard", phase:null, object:"nsm", filters:{}, confidence:0.95}},
  {input:"NSM overview", output:{intent:"nsm.dashboard", phase:null, object:"nsm", filters:{}, confidence:0.94}},
  {input:"what's my overall profile status?", output:{intent:"nsm.dashboard", phase:null, object:"nsm", filters:{}, confidence:0.92}},
  {input:"show comprehensive metrics", output:{intent:"nsm.dashboard", phase:null, object:"nsm", filters:{}, confidence:0.91}},

  // NSM Recognition (6 examples - v1.0)
  {input:"how many awards have I won?", output:{intent:"nsm.recognition", phase:null, object:"nsm", filters:{}, confidence:0.97}},
  {input:"show my awards status", output:{intent:"nsm.recognition", phase:null, object:"nsm", filters:{}, confidence:0.96}},
  {input:"what's my award win rate?", output:{intent:"nsm.recognition", phase:null, object:"nsm", filters:{}, confidence:0.95}},
  {input:"recognition metrics", output:{intent:"nsm.recognition", phase:null, object:"nsm", filters:{}, confidence:0.94}},
  {input:"how many national awards?", output:{intent:"nsm.recognition", phase:null, object:"nsm", filters:{}, confidence:0.96}},
  {input:"awards summary", output:{intent:"nsm.recognition", phase:null, object:"nsm", filters:{}, confidence:0.93}},

  // NSM Leadership (6 examples - v1.0)
  {input:"show my leadership activities", output:{intent:"nsm.leadership", phase:null, object:"nsm", filters:{}, confidence:0.96}},
  {input:"how many leadership roles do I have?", output:{intent:"nsm.leadership", phase:null, object:"nsm", filters:{}, confidence:0.95}},
  {input:"what leadership positions have I held?", output:{intent:"nsm.leadership", phase:null, object:"nsm", filters:{}, confidence:0.94}},
  {input:"president and founder roles", output:{intent:"nsm.leadership", phase:null, object:"nsm", filters:{}, confidence:0.93}},
  {input:"leadership metrics", output:{intent:"nsm.leadership", phase:null, object:"nsm", filters:{}, confidence:0.95}},
  {input:"show leadership ECs", output:{intent:"nsm.leadership", phase:null, object:"nsm", filters:{}, confidence:0.94}},

  // NSM Academic (5 examples - v1.0)
  {input:"what are my test scores?", output:{intent:"nsm.academic", phase:null, object:"nsm", filters:{}, confidence:0.96}},
  {input:"show my SAT and ACT scores", output:{intent:"nsm.academic", phase:null, object:"nsm", filters:{}, confidence:0.95}},
  {input:"academic test vitals", output:{intent:"nsm.academic", phase:null, object:"nsm", filters:{}, confidence:0.94}},
  {input:"how many AP exams passed?", output:{intent:"nsm.academic", phase:null, object:"nsm", filters:{}, confidence:0.95}},
  {input:"testing metrics", output:{intent:"nsm.academic", phase:null, object:"nsm", filters:{}, confidence:0.93}},

  // NSM Program (5 examples - v1.0)
  {input:"summer program acceptances", output:{intent:"nsm.program", phase:null, object:"nsm", filters:{}, confidence:0.96}},
  {input:"how many programs was I accepted to?", output:{intent:"nsm.program", phase:null, object:"nsm", filters:{}, confidence:0.95}},
  {input:"show program status", output:{intent:"nsm.program", phase:null, object:"nsm", filters:{}, confidence:0.94}},
  {input:"prestigious programs", output:{intent:"nsm.program", phase:null, object:"nsm", filters:{}, confidence:0.93}},
  {input:"program application results", output:{intent:"nsm.program", phase:null, object:"nsm", filters:{}, confidence:0.94}},

  // JTBD - Week (4 examples - v10.7)
  {input:"what did I accomplish in week 8?", output:{intent:"jtbd.week", phase:null, object:"jtbd", filters:{week:8}, confidence:0.98}},
  {input:"show me week 12 progress", output:{intent:"jtbd.week", phase:null, object:"jtbd", filters:{week:12}, confidence:0.97}},
  {input:"what happened in week 20?", output:{intent:"jtbd.week", phase:null, object:"jtbd", filters:{week:20}, confidence:0.96}},
  {input:"week 30 milestones", output:{intent:"jtbd.week", phase:null, object:"jtbd", filters:{week:30}, confidence:0.95}},

  // JTBD - Completed (4 examples - v10.7)
  {input:"what have I completed?", output:{intent:"jtbd.completed", phase:null, object:"jtbd", filters:{}, confidence:0.96}},
  {input:"show my completed jobs", output:{intent:"jtbd.completed", phase:null, object:"jtbd", filters:{}, confidence:0.95}},
  {input:"what did I finish?", output:{intent:"jtbd.completed", phase:null, object:"jtbd", filters:{}, confidence:0.94}},
  {input:"all done tasks", output:{intent:"jtbd.completed", phase:null, object:"jtbd", filters:{}, confidence:0.93}},

  // JTBD - Pending (10 examples - v10.7.1 EXPANDED)
  {input:"what tasks do I have pending?", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{}, confidence:0.97}},
  {input:"what do I still need to do?", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{}, confidence:0.96}},
  {input:"what's left to complete?", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{}, confidence:0.95}},
  {input:"upcoming tasks", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{}, confidence:0.94}},
  {input:"what's on my todo list?", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{}, confidence:0.96}},
  {input:"show pending work", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{}, confidence:0.95}},
  {input:"what do I need to do?", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{}, confidence:0.94}},
  {input:"show me pending week 3 tasks", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{week:3}, confidence:0.96}},
  {input:"pending tasks for week 5", output:{intent:"jtbd.pending", phase:null, object:"jtbd", filters:{week:5}, confidence:0.95}},

  // JTBD - Milestones (3 examples - v10.7)
  {input:"show my milestones", output:{intent:"jtbd.milestones", phase:null, object:"jtbd", filters:{}, confidence:0.96}},
  {input:"what milestones have I achieved?", output:{intent:"jtbd.milestones", phase:null, object:"jtbd", filters:{}, confidence:0.95}},
  {input:"EC achievements", output:{intent:"jtbd.milestones", phase:null, object:"jtbd", filters:{}, confidence:0.93}},

  // JTBD - Progression (3 examples - v10.7)
  {input:"show week over week progress", output:{intent:"jtbd.progression", phase:null, object:"jtbd", filters:{}, confidence:0.96}},
  {input:"completion rate over time", output:{intent:"jtbd.progression", phase:null, object:"jtbd", filters:{}, confidence:0.94}},
  {input:"how has my progress changed?", output:{intent:"jtbd.progression", phase:null, object:"jtbd", filters:{}, confidence:0.93}},

  // Testing - SAT (6 examples - v10.7)
  {input:"what was my first SAT score?", output:{intent:"testing.sat.first", phase:null, object:"testing", filters:{nth:"first"}, confidence:0.98}},
  {input:"initial SAT", output:{intent:"testing.sat.first", phase:null, object:"testing", filters:{nth:"first"}, confidence:0.95}},
  {input:"what's my latest SAT?", output:{intent:"testing.sat.latest", phase:null, object:"testing", filters:{nth:"latest"}, confidence:0.98}},
  {input:"most recent SAT score", output:{intent:"testing.sat.latest", phase:null, object:"testing", filters:{nth:"latest"}, confidence:0.96}},
  {input:"show SAT progression", output:{intent:"testing.sat.progression", phase:null, object:"testing", filters:{}, confidence:0.97}},
  {input:"all my SAT scores", output:{intent:"testing.sat.progression", phase:null, object:"testing", filters:{}, confidence:0.95}},

  // Academics - Transcript (6 examples - v10.7)
  {input:"show my initial transcript", output:{intent:"academics.transcript.initial", phase:"initial", object:"academics", filters:{components:["transcript"]}, confidence:0.96}},
  {input:"gameplan transcript", output:{intent:"academics.transcript.initial", phase:"initial", object:"academics", filters:{components:["transcript"]}, confidence:0.94}},
  {input:"show my final transcript", output:{intent:"academics.transcript.final", phase:"final", object:"academics", filters:{components:["transcript"]}, confidence:0.97}},
  {input:"submitted transcript", output:{intent:"academics.transcript.final", phase:"final", object:"academics", filters:{components:["transcript"]}, confidence:0.95}},
  {input:"transcript progression", output:{intent:"academics.transcript.progression", phase:null, object:"academics", filters:{components:["transcript"]}, confidence:0.96}},
  {input:"how did my courses change?", output:{intent:"academics.transcript.progression", phase:null, object:"academics", filters:{components:["transcript"]}, confidence:0.93}},

  // Academics - GPA Explicit (6 examples - v10.7)
  {input:"what was my initial GPA?", output:{intent:"academics.gpa.initial", phase:"initial", object:"academics", filters:{components:["gpa"]}, confidence:0.97}},
  {input:"baseline GPA", output:{intent:"academics.gpa.initial", phase:"initial", object:"academics", filters:{components:["gpa"]}, confidence:0.94}},
  {input:"what was my final GPA?", output:{intent:"academics.gpa.final", phase:"final", object:"academics", filters:{components:["gpa"]}, confidence:0.97}},
  {input:"submitted GPA", output:{intent:"academics.gpa.final", phase:"final", object:"academics", filters:{components:["gpa"]}, confidence:0.95}},
  {input:"what's my latest GPA?", output:{intent:"academics.gpa.latest", phase:null, object:"academics", filters:{components:["gpa"]}, confidence:0.98}},
  {input:"current GPA", output:{intent:"academics.gpa.latest", phase:null, object:"academics", filters:{components:["gpa"]}, confidence:0.96}},

  // College - Enhanced (9 examples - v10.7.1 EXPANDED)
  {input:"which college am I attending?", output:{intent:"college.attending", phase:null, object:"college", filters:{attending:true}, confidence:0.98}},
  {input:"where am I going?", output:{intent:"college.attending", phase:null, object:"college", filters:{attending:true}, confidence:0.96}},
  {input:"show my reach colleges", output:{intent:"college.reach", phase:null, object:"college", filters:{category:"Reach"}, confidence:0.96}},
  {input:"match schools", output:{intent:"college.match", phase:null, object:"college", filters:{category:"Match"}, confidence:0.95}},
  {input:"safety colleges", output:{intent:"college.safety", phase:null, object:"college", filters:{category:"Safety"}, confidence:0.95}},
  {input:"which colleges accepted me?", output:{intent:"college.accepted", phase:null, object:"college", filters:{decision_result:"Accepted"}, confidence:0.97}},
  {input:"what's my safety school acceptance rate?", output:{intent:"college.safety", phase:null, object:"college", filters:{category:"Safety"}, confidence:0.94}},
  {input:"acceptance rates for my reach schools", output:{intent:"college.reach", phase:null, object:"college", filters:{category:"Reach"}, confidence:0.93}},
  {input:"stats for match colleges", output:{intent:"college.match", phase:null, object:"college", filters:{category:"Match"}, confidence:0.92}},

  // College - Decision Plan (12 examples - v10.7.1 NEW)
  {input:"did I apply early decision anywhere?", output:{intent:"college.early_decision", phase:null, object:"college", filters:{decision_plan:"Early Decision"}, confidence:0.98}},
  {input:"which schools did I apply ED to?", output:{intent:"college.early_decision", phase:null, object:"college", filters:{decision_plan:"Early Decision"}, confidence:0.97}},
  {input:"show my early decision applications", output:{intent:"college.early_decision", phase:null, object:"college", filters:{decision_plan:"Early Decision"}, confidence:0.96}},
  {input:"where did I apply early action?", output:{intent:"college.early_action", phase:null, object:"college", filters:{decision_plan:"Early Action"}, confidence:0.97}},
  {input:"which colleges did I apply EA?", output:{intent:"college.early_action", phase:null, object:"college", filters:{decision_plan:"Early Action"}, confidence:0.96}},
  {input:"show early action schools", output:{intent:"college.early_action", phase:null, object:"college", filters:{decision_plan:"Early Action"}, confidence:0.95}},
  {input:"restrictive early action applications", output:{intent:"college.restrictive_early", phase:null, object:"college", filters:{decision_plan:"Restrictive Early Action"}, confidence:0.97}},
  {input:"did I apply REA anywhere?", output:{intent:"college.restrictive_early", phase:null, object:"college", filters:{decision_plan:"Restrictive Early Action"}, confidence:0.96}},
  {input:"which schools were regular decision?", output:{intent:"college.regular_decision", phase:null, object:"college", filters:{decision_plan:"Regular Decision"}, confidence:0.96}},
  {input:"show my RD applications", output:{intent:"college.regular_decision", phase:null, object:"college", filters:{decision_plan:"Regular Decision"}, confidence:0.95}},
  {input:"regular decision schools", output:{intent:"college.regular_decision", phase:null, object:"college", filters:{decision_plan:"Regular Decision"}, confidence:0.94}},
  {input:"what did I apply regular to?", output:{intent:"college.regular_decision", phase:null, object:"college", filters:{decision_plan:"Regular Decision"}, confidence:0.93}},

  // Readiness - Top Priorities (10 examples - v10.7 EXPANDED)
  {input:"what should I prioritize?", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"top priorities", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"what should I focus on?", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"what are my key priorities?", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"what should I work on next?", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"what are the most important things to focus on?", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"what are my key deadlines?", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.93}},
  {input:"what needs my attention most?", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"what's most urgent?", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.93}},
  {input:"give me my action items", output:{intent:"readiness.top_priorities", phase:null, object:"readiness", filters:{}, confidence:0.92}},
];

const SYS = `You are an intent classifier for a college admissions coaching agent.
Output ONLY valid JSON matching this schema:
{
  "intent": "ecs.list|awards.list|programs.list|academics.summary|academics.transcript.initial|academics.transcript.final|academics.transcript.progression|academics.gpa.initial|academics.gpa.final|academics.gpa.latest|academics.gpa.progression|narrative.summary|progression.timeline|sat.ordinal|testing.sat.first|testing.sat.latest|testing.sat.progression|gameplan.initial|gameplan.vs_progress|application.final|ivyready.score|ivyready.initial|ivyready.final|ivyready.compare|ivyready.factors|readiness.now|readiness.progress|readiness.drivers|readiness.whatif.sat|readiness.whatif.award|readiness.whatif.ec|readiness.whatif.gpa|readiness.whatif.program|readiness.next_moves|readiness.top_priorities|vitals.latest|vitals.progression|vitals.funding.progression|vitals.scale.progression|vitals.impact.latest|vitals.summary|jtbd.week|jtbd.completed|jtbd.pending|jtbd.milestones|jtbd.progression|college.attending|college.accepted|college.reach|college.match|college.safety|nsm.dashboard|nsm.recognition|nsm.leadership|nsm.academic|nsm.program|kb.search|unknown",
  "phase": "initial|final|null",
  "object": "ec|award|program|academics|narrative|sat|testing|vitals|jtbd|college|readiness|gameplan|application|rubric|scholarship|kb|nsm",
  "filters": {
    "as_of"?: string|null,
    "school"?: string|null,
    "scope"?: string|null,
    "nth"?: string|number|null,
    "components"?: string[]|null,
    "action_param"?: any
  },
  "confidence": number[0..1]
}

PHASE MAPPING:
- "initial", "gameplan", "game plan", "planned", "at the start", "kickoff", "early", "baseline", "assessment" -> phase:"initial"
- "final", "submitted", "application", "college app", "CommonApp", "as submitted", "made it", "ended up" -> phase:"final"
- For progression/timeline queries -> phase:null
- For ordinal queries (first/second/latest SAT) -> phase:null
- For IvyReady rubric: "initial" maps to snapshot_phase='assessment', "final" maps to snapshot_phase='final_submit'

OBJECT SYNONYMS:
- ECs: "ECs", "activities", "extracurriculars", "clubs", "involvements" -> object:"ec"
- Awards: "awards", "honors", "prizes", "distinctions" -> object:"award"
- Programs: "summer programs", "summer camps", "selective programs", "YYGS", "SAMS", "RSI" -> object:"program"
- Academics: "academics", "grades and tests", "transcript and scores", "GPA and SAT", "academic stats" -> object:"academics"
- Narrative: "narrative", "USP", "story", "identity/passion/aptitude/cause", "why-statement" -> object:"narrative"
- Testing: "SAT", "ACT", "test scores", "standardized tests" -> object:"testing"
- Vitals: "EC vitals", "metrics", "quantitative metrics", "funding", "scale", "impact", "reach" -> object:"vitals"
- JTBD: "jobs to be done", "tasks", "weekly execution", "milestones", "action items" -> object:"jtbd"
- College: "colleges", "schools", "universities", "college list" -> object:"college"
- Readiness: "readiness", "preparation", "priorities", "next steps" -> object:"readiness"

INTENT ROUTING RULES:
- "which ECs/awards/programs did I win/get in/get into?" -> intent:"progression.timeline", phase:null
- "what was my first/second/latest SAT?" -> intent:"sat.ordinal", phase:null, filters:{nth:"first"|"second"|"latest"}
- "SAT progression" -> intent:"progression.timeline", phase:null, object:"sat"
- "show progress from plan to outcome" -> intent:"progression.timeline", phase:null
- "initial [object] list" -> intent:"[object].list", phase:"initial"
- "final [object] list" -> intent:"[object].list", phase:"final"
- "show my gameplan/game plan/initial targets" -> intent:"gameplan.initial", phase:"initial", object:"gameplan"
- "gameplan vs execution/progress from targets to outcomes" -> intent:"gameplan.vs_progress", phase:null, object:"gameplan"
- "Common App submission/what did I submit" -> intent:"application.final", phase:"final", object:"application"
- "IvyReady score/rubric score/admissions rating" -> intent:"ivyready.score", phase:null, object:"rubric"
- "initial IvyReady score/baseline rubric" -> intent:"ivyready.score", phase:"initial", object:"rubric"
- "final IvyReady score/rubric at submission" -> intent:"ivyready.score", phase:"final", object:"rubric"
- "initial transcript/9th grade transcript" -> intent:"academics.transcript.initial", phase:null, object:"academics"
- "final transcript/as submitted" -> intent:"academics.transcript.final", phase:null, object:"academics"
- "transcript progression/show grades over time" -> intent:"academics.transcript.progression", phase:null, object:"academics"
- "initial GPA/9th grade GPA" -> intent:"academics.gpa.initial", phase:null, object:"academics"
- "final GPA/latest GPA/current GPA" -> intent:"academics.gpa.final" or "academics.gpa.latest", phase:null, object:"academics"
- "GPA progression/GPA trend" -> intent:"academics.gpa.progression", phase:null, object:"academics"
- "first SAT/second SAT/latest SAT" -> intent:"testing.sat.first|latest", phase:null, object:"testing"
- "SAT progression/test score progression" -> intent:"testing.sat.progression", phase:null, object:"testing"
- "EC vitals/EC metrics/latest vitals" -> intent:"vitals.latest", phase:null, object:"vitals"
- "vitals progression/metrics over time" -> intent:"vitals.progression", phase:null, object:"vitals"
- "funding raised/money progression" -> intent:"vitals.funding.progression", phase:null, object:"vitals", filters:{metric_type:"financial"}
- "scale progression/reach over time" -> intent:"vitals.scale.progression", phase:null, object:"vitals", filters:{metric_type:"scale"}
- "impact metrics/quantitative impact" -> intent:"vitals.impact.latest", phase:null, object:"vitals", filters:{metric_type:"impact"}
- "vitals summary/EC metrics summary" -> intent:"vitals.summary", phase:null, object:"vitals"
- "this week's tasks/week 3 jobs" -> intent:"jtbd.week", phase:null, object:"jtbd", filters:{week_number:N}
- "completed tasks/done items" -> intent:"jtbd.completed", phase:null, object:"jtbd"
- "pending tasks/what's left" -> intent:"jtbd.pending", phase:null, object:"jtbd"
- "EC milestones/major achievements" -> intent:"jtbd.milestones", phase:null, object:"jtbd"
- "JTBD progression/execution rate" -> intent:"jtbd.progression", phase:null, object:"jtbd"
- "which college am I attending/where did I choose" -> intent:"college.attending", phase:null, object:"college"
- "which schools accepted me" -> intent:"college.accepted", phase:null, object:"college"
- "my reach schools" -> intent:"college.reach", phase:null, object:"college"
- "my match schools" -> intent:"college.match", phase:null, object:"college"
- "my safety schools" -> intent:"college.safety", phase:null, object:"college"
- "top priorities/what should I focus on" -> intent:"readiness.top_priorities", phase:null, object:"readiness"
- "NSM dashboard/north star metrics" -> intent:"nsm.dashboard", phase:null, object:"nsm"
- "how many awards won/award win rate" -> intent:"nsm.recognition", phase:null, object:"nsm"
- "leadership roles/president positions" -> intent:"nsm.leadership", phase:null, object:"nsm"
- "test scores/SAT and ACT scores" -> intent:"nsm.academic", phase:null, object:"nsm"
- "summer program acceptances/programs accepted" -> intent:"nsm.program", phase:null, object:"nsm"

ACADEMICS HANDLING:
- Extract components from query: "grades", "gpa", "sat", "act", "ap", "transcript"
- "what was my initial academics?" -> intent:"academics.summary", phase:"initial", filters:{components:["grades","sat","gpa"]}
- "final GPA and SAT" -> intent:"academics.summary", phase:"final", filters:{components:["gpa","sat"]}
- Always populate filters.components for academics queries

CONFIDENCE GUARDRAILS:
- High confidence (>=0.85): Clear phase + object match
- Medium (0.6-0.84): Fuzzy phrasing but clear intent
- Low (<0.6): Ambiguous or missing critical slots
- NEVER hallucinate; return low confidence if unclear`;

// ============================================================================
// Fuzzing Recipe: Synonym expansion for robust natural language handling
// ============================================================================

const PHASE_SYNONYMS = {
  initial: ["initial", "at the start", "in the game plan", "planned", "kickoff", "early", "baseline", "gameplan", "game plan"],
  final: ["final", "as submitted", "in the Common App", "in my college application", "submitted", "what made it", "what ended up", "application"]
};

const OBJECT_SYNONYMS = {
  ec: ["ECs", "activities", "extracurriculars", "clubs", "involvements"],
  award: ["awards", "honors", "prizes", "distinctions"],
  program: ["summer programs", "summer camps", "summer plan programs", "selective programs"],
  academics: ["academics", "grades and tests", "transcript and scores", "GPA and SAT", "academic stats"],
  narrative: ["narrative", "USP", "story", "identity", "passion", "aptitude", "cause", "why-statement"],
  gameplan: ["gameplan", "game plan", "targets", "initial targets", "targets after assessment", "planned list"],
  application: ["Common App", "common app", "application", "submitted app", "what I submitted", "final submission"],
  rubric: ["IvyReady score", "rubric score", "rubric", "admissions rating", "ivyready", "admissions score", "ivy ready", "ivy-ready", "ivy-level", "ivy level", "ivylevel score", "ivy+ score", "overall readiness score"]
};

const ACCEPTANCE_VERBS = ["got in", "get in", "got into", "accepted to", "admitted to", "made it into"];
const ORDINALS = ["first", "second", "third", "latest", "last", "earliest", "initial"];

// Keyword floor detection for academics queries
const ACADEMIC_KEYWORDS = ['academic', 'academics', 'academic stats', 'report card'];

// ============================================================================
// v10.7: Helper function to extract week number from JTBD queries
// ============================================================================
function extractWeekNumber(message: string): number | null {
  const t = message.toLowerCase();

  // Pattern 1: "week 3", "week3", "wk 3"
  const weekMatch = t.match(/(?:week|wk)\s*(\d+)/);
  if (weekMatch) return parseInt(weekMatch[1], 10);

  // Pattern 2: "this week" (default to current week, or null to get latest)
  if (t.includes('this week')) return null;

  return null;
}

function keywordFloor(query: string): any | null {
  const t = query.toLowerCase();

  // Don't catch specific SAT/GPA/grade queries - let LLM handle those with proper phase/nth detection
  if (t.includes('sat') || t.includes('gpa') || t.includes('grade') || t.includes('transcript')) {
    return null;
  }

  // Only catch generic "academics" queries
  const hasAcademics = ACADEMIC_KEYWORDS.some(k => t.includes(k));
  if (!hasAcademics) return null;

  log.event('intent.keyword_floor_hit', { query: query.slice(0, 50) });

  // Detect phase using fuzzy synonym matching
  let phase: Phase = null;
  if (PHASE_SYNONYMS.initial.some(s => t.includes(s))) {
    phase = "initial";
  } else if (PHASE_SYNONYMS.final.some(s => t.includes(s))) {
    phase = "final";
  }

  // Default to summary for vague "academics" queries
  return {
    intent: "academics.summary",
    phase,
    object: "academics",
    filters: { components: ["grades", "gpa", "sat"] },
    confidence: 0.70,
    detector: "keyword-floor"
  };
}

async function classifyIntent(user: string) {
  // 1. Try keyword floor first (deterministic)
  const kwFloor = keywordFloor(user);
  if (kwFloor) {
    return IntentSchema.parse(kwFloor);
  }

  // 2. LLM classification with 48 comprehensive examples
  const examples = FEW_SHOT.map(e =>
    `USER: ${e.input}\nLABEL: ${JSON.stringify(e.output)}`
  ).join("\n\n");
  const prompt = `${examples}\n\nUSER: ${user}\nLABEL:`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYS },
      { role: "user", content: prompt }
    ]
  });

  const raw = r.choices[0]?.message?.content ?? "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
    parsed.detector = "llm";
  } catch {
    parsed = {
      intent: "unknown",
      phase: null,
      object: "academics",
      filters: {},
      confidence: 0.0,
      detector: "llm"
    };
  }
  return IntentSchema.parse(parsed);
}

// ============================================================================
// Intent Router
// ============================================================================

export async function routePrompt({ studentId, message, pg }: {studentId:string, message:string, pg: Pool}) {
  const t0 = Date.now();
  const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

  log.event('router.route_start', { student_id: studentId, query_preview: message.slice(0, 80), trace_id: traceId });

  try {
    // ========================================
    // v10.1 Fact-Based Guardrails (Pre-Classification)
    // ========================================
    // Force deterministic SQL routing for known fact patterns BEFORE GPT classification
    // This ensures 100% accuracy for enumeration queries (awards, GPA, testing, etc.)

    const q = message.toLowerCase();
    let factIntent: typeof intent | null = null;

    // ========================================
    // v10.2 Assessment Start Patterns (HIGH PRIORITY)
    // ========================================
    // Interactive/Simulated assessment triggers
    if (/\b(start|begin|run).*(interactive|simulated).*(assessment|evaluation)/i.test(message)) {
      const isInteractive = /interactive/i.test(message);
      factIntent = {
        intent: isInteractive ? "assessment.start.interactive" : "assessment.start.simulated",
        phase: null,
        object: "kb" as Object,
        filters: {},
        confidence: 0.99,
        detector: "assessment-trigger"
      };
    }
    // Check for active assessment response (ongoing session)
    else if (q.startsWith('assessment:') || /^layer\s+\d+\s+response:/i.test(message)) {
      factIntent = {
        intent: "assessment.respond",
        phase: null,
        object: "kb" as Object,
        filters: {},
        confidence: 0.99,
        detector: "assessment-response"
      };
    }

    // Awards fact queries
    else if (/\b(what|which|list|show|tell me).*(award|honor|recognition|prize|won|ncwit)/i.test(message)) {
      const hasPhase = /\b(initial|final|submit|common\s*app)\b/i.test(message);
      const hasWin = /\b(win|won|actual|get|got|receive)/i.test(message);

      if (hasWin || /progression|timeline|over time/.test(q)) {
        factIntent = { intent: "progression.timeline", phase: null, object: "award", filters: {}, confidence: 0.98, detector: "keyword-floor" };
      } else if (hasPhase) {
        const phase = /initial|game\s*plan|target/.test(q) ? "initial" : "final";
        factIntent = { intent: "awards.list", phase, object: "award", filters: {}, confidence: 0.98, detector: "keyword-floor" };
      } else {
        factIntent = { intent: "awards.list", phase: "final", object: "award", filters: {}, confidence: 0.98, detector: "keyword-floor" };
      }
    }
    // GPA/grades fact queries
    else if (/\b(gpa|grade\s*point|grades|weighted|unweighted|transcript)/i.test(message)) {
      const hasPhase = /\b(initial|final|latest|current)\b/i.test(message);
      const hasTrend = /\b(trend|change|delta|timeline|progress|improve)/i.test(message);

      if (hasTrend) {
        factIntent = { intent: "progression.timeline", phase: null, object: "academics", filters: {}, confidence: 0.98, detector: "keyword-floor" };
      } else {
        const phase = /initial/.test(q) ? "initial" : "final";
        factIntent = { intent: "academics.summary", phase, object: "academics", filters: { components: ["gpa", "grades"] }, confidence: 0.98, detector: "keyword-floor" };
      }
    }
    // Testing (SAT/ACT) fact queries
    else if (/\b(SAT|ACT|test\s*score)/i.test(message)) {
      const hasOrdinal = /\b(first|second|third|last|latest|nth)/i.test(message);
      const hasProgression = /\b(improve|improved|progress|progression|over\s*time|history|timeline|change|trend|all|scores?)/i.test(message);

      if (hasProgression) {
        // SAT progression/history queries
        factIntent = { intent: "progression.timeline", phase: null, object: "sat", filters: {}, confidence: 0.98, detector: "keyword-floor" };
      } else if (hasOrdinal) {
        const nth = /first|1st/.test(q) ? "first" : /second|2nd/.test(q) ? "second" : /third|3rd/.test(q) ? "third" : "latest";
        factIntent = { intent: "sat.ordinal", phase: null, object: "sat", filters: { nth }, confidence: 0.98, detector: "keyword-floor" };
      } else if (/\b(was\s*my|show|initial|final)/i.test(message)) {
        factIntent = { intent: "academics.summary", phase: "final", object: "academics", filters: { components: ["sat", "act"] }, confidence: 0.98, detector: "keyword-floor" };
      }
    }
    // AP courses fact queries
    else if (/\b(how\s*many|count|list|show).*(ap|aps|advanced\s*placement|honors|courses?)/i.test(message)) {
      factIntent = { intent: "academics.summary", phase: "final", object: "academics", filters: { components: ["ap", "courses"] }, confidence: 0.98, detector: "keyword-floor" };
    }
    // Summer programs fact queries
    else if (/\b(which|what|list|show).*(summer\s*program|programs).*(submit|submitted|applied|decisions?|accepted|got\s*in)/i.test(message)) {
      const hasDecision = /\b(accept|admitted|got\s*in|decision)/i.test(message);
      const phase = hasDecision ? "final" : /submit|applied/.test(q) ? "final" : null;
      factIntent = { intent: "programs.list", phase, object: "program", filters: {}, confidence: 0.98, detector: "keyword-floor" };
    }
    // ECs/Activities fact queries
    else if (/\b(which|what|list|show).*(ec|ecs|activities|extracurricular).*(submit|submitted|final|actually|common\s*app)/i.test(message)) {
      const phase = /initial|game\s*plan|target/.test(q) ? "initial" : "final";
      factIntent = { intent: "ecs.list", phase, object: "ec", filters: {}, confidence: 0.98, detector: "keyword-floor" };
    }
    // College list/decisions fact queries
    else if (/\b(what|which|show|list).*(college|school|university).*(list|results?|final|applied|outcomes?|choose|chose|chosen|attend|attending|accept|admitted)/i.test(message)) {
      const hasDecision = /\b(accept|admitted|got\s*in|waitlist|reject)/i.test(message);
      const hasAttend = /\b(choose|chose|chosen|attend|attending|enroll)/i.test(message);

      if (hasAttend) {
        factIntent = { intent: "application.final", phase: "final", object: "application", filters: { scope: "attending" }, confidence: 0.98, detector: "keyword-floor" };
      } else {
        factIntent = { intent: "college.list", phase: null, object: "college", filters: {}, confidence: 0.98, detector: "keyword-floor" };
      }
    }
    // College early decision/action fact queries (v10.7.1)
    else if (/\b(did|which|what|show|list).*(apply|applied).*(early\s*decision|ed\b)/i.test(message)) {
      factIntent = { intent: "college.early_decision", phase: null, object: "college", filters: { decision_plan: "Early Decision" }, confidence: 0.98, detector: "keyword-floor" };
    }
    else if (/\b(did|which|what|show|list).*(apply|applied).*(early\s*action|ea\b)/i.test(message)) {
      // Check for restrictive early action
      if (/restrictive|rea\b/i.test(message)) {
        factIntent = { intent: "college.restrictive_early", phase: null, object: "college", filters: { decision_plan: "Restrictive Early Action" }, confidence: 0.98, detector: "keyword-floor" };
      } else {
        factIntent = { intent: "college.early_action", phase: null, object: "college", filters: { decision_plan: "Early Action" }, confidence: 0.98, detector: "keyword-floor" };
      }
    }
    else if (/\b(did|which|what|show|list).*(apply|applied).*(regular\s*decision|rd\b)/i.test(message)) {
      factIntent = { intent: "college.regular_decision", phase: null, object: "college", filters: { decision_plan: "Regular Decision" }, confidence: 0.98, detector: "keyword-floor" };
    }
    // What-if EC scale queries (v10.7.1)
    else if (/\b(what\s*if|if\s*i|simulate).*(expand|scale|grow|increase|raise|double|2x).*(ec|activity|empowering|synthoria|users|countries|members|reach)/i.test(message)) {
      factIntent = { intent: "readiness.whatif.ec", phase: null, object: "readiness", filters: {}, confidence: 0.98, detector: "keyword-floor" };
    }
    // Award tier breakdown/comparison queries (v10.7.1)
    else if (/\b(how\s*many|count|compare).*(national|regional|international|state|school).*\b(vs|versus|and|,).*(national|regional|international|state|school).*awards?/i.test(message)) {
      factIntent = { intent: "awards.list", phase: "final", object: "award", filters: {}, confidence: 0.98, detector: "keyword-floor" };
    }
    // JTBD pending by week queries (v10.7.1)
    else if (/\b(show|what|list).*(pending|todo|tasks?).*(week\s*\d+|week\s*[a-z]+)/i.test(message)) {
      const weekMatch = message.match(/week\s*(\d+)/i);
      const weekNumber = weekMatch ? parseInt(weekMatch[1]) : null;
      factIntent = { intent: "jtbd.pending", phase: null, object: "jtbd", filters: { week_number: weekNumber }, confidence: 0.98, detector: "keyword-floor" };
    }
    // EC role filtering queries (v10.7.1 - Universal attribute filtering)
    else if (/\b(show|filter|list).*(ec|activity|activities).*(leadership|leader|captain|president|founder|role|position)/i.test(message)) {
      const roleMatch = message.match(/(leadership|leader|captain|president|founder)/i);
      const role = roleMatch ? roleMatch[1] : 'leader';
      factIntent = { intent: "ecs.leadership", phase: "final", object: "ec", filters: { role }, confidence: 0.98, detector: "keyword-floor" };
    }
    // Grade jumps/academic vitals queries
    else if (/\b(show|what|list).*(grade\s*jump|jumps|vitals|academic\s*trend)/i.test(message)) {
      factIntent = { intent: "progression.timeline", phase: null, object: "academics", filters: { scope: "vitals" }, confidence: 0.98, detector: "keyword-floor" };
    }

    // If fact guardrail matched, use it and skip GPT classification
    let intent = factIntent;

    if (factIntent) {
      log.event('guardrail.fact_pattern_matched', {
        trace_id: traceId,
        pattern_intent: factIntent.intent,
        pattern_confidence: factIntent.confidence,
        reason: 'deterministic_fact_query'
      });
    } else {
      // No fact pattern matched, use GPT classification
      intent = await classifyIntent(message);
    }

    // ========================================
    // v5.6 KB Facet Post-Processor (Safety Net)
    // ========================================
    // Keyword-based extraction if LLM misses award/framework/activity filters
    if (intent.intent === "kb.search") {
      const f = intent.filters ?? {};
      if (/ncwit|national center for women.*computing/.test(q)) f.award = "NCWIT";
      if (/168( |-)?hour/.test(q)) f.framework = "168";
      if (/empowering ai/.test(q)) f.activity = "Empowering AI";
      if (/bank of america/.test(q)) f.award = "Bank of America";
      if (/jcamp|j-camp/.test(q)) f.activity = "JCamp";
      if (/kwk|kode with klossy/.test(q)) f.activity = "Kode With Klossy";
      intent.filters = f;
    }

    // ========================================
    // v5.6 KB Guardrail Override (Force Pinecone for Facet Queries)
    // ========================================
    // If Pinecone is ready and query mentions facets, FORCE kb.search regardless of LLM classification
    const pineconeReady = !!(process.env.PINECONE_INDEX_NAME && process.env.PINECONE_NAMESPACE);
    const mentionsFacet = (
      /ncwit|national\s+center\s+for\s+women.*computing/.test(q) ||
      /\b168([- ]?hour)?\b/.test(q) ||
      /empowering\s+ai/.test(q) ||
      /bank\s+of\s+america/.test(q) ||
      /jcamp|j-camp/.test(q) ||
      /kode\s+with\s+klossy|kwk/.test(q)
    );

    if (pineconeReady && mentionsFacet && intent.intent !== "kb.search") {
      log.event('guardrail.force_kb_search', {
        trace_id: traceId,
        original_intent: intent.intent,
        original_confidence: intent.confidence,
        reason: 'facet_keyword_detected'
      });

      // Extract facets
      const filters = intent.filters ?? {};
      if (/ncwit|national\s+center\s+for\s+women.*computing/.test(q)) filters.award = "NCWIT";
      if (/\b168([- ]?hour)?\b/.test(q)) filters.framework = "168";
      if (/empowering\s+ai/.test(q)) filters.activity = "Empowering AI";
      if (/bank\s+of\s+america/.test(q)) filters.award = "Bank of America";
      if (/jcamp|j-camp/.test(q)) filters.activity = "JCamp";
      if (/kode\s+with\s+klossy|kwk/.test(q)) filters.activity = "Kode With Klossy";

      // Override intent
      intent = {
        intent: "kb.search",
        object: "kb",
        phase: null,
        filters,
        confidence: Math.max(intent.confidence ?? 0.0, 0.98)
      };
    }

    log.event('intent.classify', {
      trace_id: traceId,
      intent: intent.intent,
      object: intent.object,
      phase: intent.phase,
      confidence: intent.confidence,
      detector: intent.detector,
      filters: intent.filters,
      took_ms: Date.now() - t0
    });

    // ========================================
    // v4.6.2b Filter Guardrails (Entity-Specific)
    // ========================================
    if (intent.intent === 'college.list') {
      const originalFilters = intent.filters || {};
      intent.filters = extractCollegeFiltersGuardrail(message, originalFilters);
      log.event('guardrails.college_filters', {
        trace_id: traceId,
        original: originalFilters,
        enhanced: intent.filters
      });
    } else if (intent.intent === 'scholarship.list' || intent.intent === 'scholarship.total') {
      const originalFilters = intent.filters || {};
      intent.filters = extractScholarshipFiltersGuardrail(message, originalFilters);
      log.event('guardrails.scholarship_filters', {
        trace_id: traceId,
        original: originalFilters,
        enhanced: intent.filters
      });
    }

    // ========================================
    // v3.7.2 UAPX Parameter Extraction (What-If)
    // ========================================
    const WHATIF_ROUTES = new Set([
      "readiness.whatif.sat",
      "readiness.whatif.award",
      "readiness.whatif.ec",
      "readiness.whatif.gpa",
      "readiness.whatif.program",
    ]);

    const DOMAIN_HINT: Record<string, Domain> = {
      "readiness.whatif.sat": "testing",
      "readiness.whatif.award": "awards",
      "readiness.whatif.ec": "ecs",
      "readiness.whatif.gpa": "academics",
      "readiness.whatif.program": "programs",
    };

    if (WHATIF_ROUTES.has(intent.intent)) {
      log.event('uapx.extract_start', { trace_id: traceId, intent: intent.intent });

      const domain = DOMAIN_HINT[intent.intent];
      const uapx = await extractUAPX(message, domain);

      if (!uapx) {
        log.event('uapx.extract_failed', { trace_id: traceId });
        return {
          answer: `I understand you want to run a what-if scenario, but I couldn't extract the parameter.\n\nTry being more specific, like:\n• "what if I raise my SAT to 1500?"\n• "what if I win a national award?"\n• "what if I grow my EC to 10,000 users?"\n• "what if I raise my GPA to 3.95?"\n• "what if I get into RSI?"`,
          chips: [{ kind: "notice", text: "uapx_extraction_failed" }],
          traceId,
          intent,
        };
      }

      // Attach UAPX to intent filters
      intent = {
        ...intent,
        filters: {
          ...intent.filters,
          uapx
        }
      };

      log.event('uapx.extract_success', {
        trace_id: traceId,
        intent: intent.intent,
        uapx
      });
    }

    // Confidence-based routing with three-tier system (v11.2 fix)
    if (intent.confidence < CLARIFY_THRESHOLD) {
      // Very low confidence (< 0.45): Ask for clarification with Jenny's warm style
      log.event('intent.very_low_confidence', { trace_id: traceId, confidence: intent.confidence, query: message.slice(0, 50) });
      return {
        answer: `Hmm, I'm not totally sure what you're asking—could you rephrase that? A few things I *can* help with:\n\n• Your final EC list or awards\n• Game plan vs what actually happened\n• Readiness score or what-if scenarios\n• SAT progression or GPA breakdown\n\nTry asking in your own words—I'll figure it out!`,
        chips: [{kind:"notice", text:`confidence: ${(intent.confidence*100).toFixed(0)}%`}],
        traceId,
        intent,
      };
    }

    if (intent.confidence < MEDIUM_CONFIDENCE_THRESHOLD) {
      // Low-medium confidence (0.45-0.50): Ask clarifying question with Jenny's style
      log.event('intent.low_mid_confidence', { trace_id: traceId, confidence: intent.confidence });

      const phaseLabel = intent.phase === "initial" ? "initial" : intent.phase === "final" ? "final" : "";
      const objectLabel = intent.object === "ec" ? "ECs"
        : intent.object === "award" ? "awards"
        : intent.object === "program" ? "summer programs"
        : intent.object === "academics" ? "academics"
        : intent.object === "narrative" ? "narrative" : intent.object;
      const suggestion = phaseLabel ? `${phaseLabel} ${objectLabel}` : objectLabel;

      return {
        answer: `I *think* you're asking about your **${suggestion}**—is that right?\n\nIf so, just say "yes" and I'll pull it up. Or rephrase your question and I'll try again!`,
        chips: [
          {kind:"notice", text:`inferred: ${intent.intent}`},
          {kind:"notice", text:`confidence: ${(intent.confidence*100).toFixed(0)}%`}
        ],
        traceId,
        intent,
      };
    }

    if (intent.confidence < ROUTE_THRESHOLD) {
      // Medium confidence (0.50-0.62): Execute with best-effort flag (v11.2 NEW)
      log.event('intent.medium_confidence_execute', { trace_id: traceId, confidence: intent.confidence, intent: intent.intent });
      // FALL THROUGH to resolver execution below (no early return)
    }

    // High confidence (>= 0.62) OR medium confidence (0.50-0.62): Route to resolver
    // v10.5.2 DEBUG: Log intent routing
    console.log('[INTENT-ROUTER] 🎯 Routing intent:', {
      intent: intent.intent,
      phase: intent.phase,
      object: intent.object,
      filters: intent.filters,
      confidence: intent.confidence,
      student_id: studentId
    });

    let data;
    switch (intent.intent) {
      // ========================================
      // v10.2 Assessment Handlers (PHASE 2)
      // ========================================
      case "assessment.start.interactive": {
        console.log('[INTENT-ROUTER] → Starting INTERACTIVE assessment for', studentId);
        const { InteractiveSessionManager } = await import('../interactive/InteractiveSessionManager.js');
        const sessionManager = new InteractiveSessionManager();
        const response = await sessionManager.startAssessment(studentId, 'interactive');
        data = {
          answer: response.message,
          chips: [],
          hits: [{
            session_id: response.session_id,
            mode: 'interactive',
            progress: response.progress_percentage,
            current_layer: response.current_layer,
            total_layers: response.total_layers,
            next_action: response.next_action,
          }],
        };
        console.log('[INTENT-ROUTER] ✓ Interactive assessment started:', response.session_id);
        break;
      }
      case "assessment.start.simulated": {
        console.log('[INTENT-ROUTER] → Starting SIMULATED assessment for', studentId);
        const { InteractiveSessionManager } = await import('../interactive/InteractiveSessionManager.js');
        const sessionManager = new InteractiveSessionManager();
        const response = await sessionManager.startAssessment(studentId, 'simulated');
        data = {
          answer: response.message,
          chips: [],
          hits: [{
            session_id: response.session_id,
            mode: 'simulated',
            progress: response.progress_percentage,
            current_layer: response.current_layer,
            total_layers: response.total_layers,
            completed: response.completed,
          }],
        };
        console.log('[INTENT-ROUTER] ✓ Simulated assessment complete:', response.session_id);
        break;
      }
      case "assessment.respond": {
        console.log('[INTENT-ROUTER] → Handling assessment response for', studentId);
        const { InteractiveSessionManager } = await import('../interactive/InteractiveSessionManager.js');
        const sessionManager = new InteractiveSessionManager();

        // Get active session
        const activeSession = await sessionManager.getActiveSession(studentId);
        if (!activeSession) {
          data = { answer: "No active assessment session found. Please start an assessment first.", chips: [], hits: [] };
          break;
        }

        // Handle response
        const response = await sessionManager.handleInteractiveResponse(activeSession.session_id, message);
        data = {
          answer: response.message,
          chips: [],
          hits: [{
            session_id: response.session_id,
            progress: response.progress_percentage,
            current_layer: response.current_layer,
            total_layers: response.total_layers,
            completed: response.completed,
            next_action: response.next_action,
          }],
        };
        console.log('[INTENT-ROUTER] ✓ Assessment response handled, layer:', response.current_layer);
        break;
      }
      case "ecs.list":
        console.log('[INTENT-ROUTER] → Calling resolvers.ecsList');
        data = await resolvers.ecsList(pg, studentId, intent.phase);
        console.log('[INTENT-ROUTER] ✓ ecsList returned:', data?.hits?.length, 'rows');
        break;
      case "awards.list":
        data = await resolvers.awardsList(pg, studentId, intent.phase);
        break;
      case "programs.list":
        data = await resolvers.programsList(pg, studentId, intent.phase);
        break;
      case "academics.summary":
        data = await resolvers.academicsSummary(pg, studentId, intent.phase, intent.filters);
        break;
      case "narrative.summary":
        // Route to initial or final based on phase
        if (intent.phase === "initial") {
          data = await resolvers.narrativeInitial(pg, studentId);
        } else if (intent.phase === "final") {
          data = await resolvers.narrativeFinal(pg, studentId);
        } else {
          // Default to final for null phase
          data = await resolvers.narrativeFinal(pg, studentId);
        }
        break;
      case "progression.timeline":
        // Handle progression queries - map to existing "wins" resolvers
        if (intent.object === "award") {
          data = await resolvers.awardsWins(pg, studentId);
        } else if (intent.object === "program") {
          data = await resolvers.programsAdmits(pg, studentId);
        } else if (intent.object === "sat") {
          data = await resolvers.academicsSAT(pg, studentId, "progression", {});
        } else if (intent.object === "academics") {
          // GPA progression queries - call academicsGPA with "progression" phase
          data = await resolvers.academicsGPA(pg, studentId, "progression", {});
        } else {
          data = { answer: "Progression tracking not yet implemented for this entity.", chips:[], hits:[] };
        }
        break;
      case "sat.ordinal":
        // Handle SAT ordinal queries (first, second, latest)
        const nth = intent.filters?.nth;
        let satPhase = "latest";
        if (nth === "first" || nth === 1) satPhase = "first";
        else if (nth === "latest") satPhase = "latest";
        else if (typeof nth === "number" || nth === "second" || nth === "third") satPhase = "nth";

        data = await resolvers.academicsSAT(pg, studentId, satPhase, intent.filters);
        break;
      case "gameplan.initial":
        console.log('[INTENT-ROUTER] → Calling resolvers.gamePlanInitial');
        data = await resolvers.gamePlanInitial(pg, studentId);
        console.log('[INTENT-ROUTER] ✓ gamePlanInitial returned:', JSON.stringify(data).substring(0, 300));
        break;
      case "gameplan.vs_progress":
        console.log('[INTENT-ROUTER] → Calling resolvers.gamePlanVsExecution');
        data = await resolvers.gamePlanVsExecution(pg, studentId);
        console.log('[INTENT-ROUTER] ✓ gamePlanVsExecution returned:', JSON.stringify(data).substring(0, 200));
        break;
      case "application.final":
        data = await resolvers.commonAppSubmitted(pg, studentId);
        break;
      case "ivyready.score":
        console.log('[INTENT-ROUTER] → Calling resolvers.ivyReadyScore, phase:', intent.phase);
        data = await resolvers.ivyReadyScore(pg, studentId, intent.phase);
        console.log('[INTENT-ROUTER] ✓ ivyReadyScore returned:', JSON.stringify(data).substring(0, 200));
        break;
      case "ivyready.initial":
        console.log('[INTENT-ROUTER] → Calling resolvers.ivyReadyInitial');
        data = await resolvers.ivyReadyInitial(pg, studentId);
        console.log('[INTENT-ROUTER] ✓ ivyReadyInitial returned:', JSON.stringify(data).substring(0, 200));
        break;
      case "ivyready.final":
        data = await resolvers.ivyReadyFinal(pg, studentId);
        break;
      case "ivyready.compare":
        data = await resolvers.ivyReadyCompare(pg, studentId);
        break;
      case "ivyready.factors":
        data = await resolvers.ivyReadyFactors(pg, studentId);
        break;
      case "readiness.now":
        data = await resolvers.readinessNow(pg, studentId);
        break;
      case "readiness.progress":
        data = await resolvers.readinessProgress(pg, studentId);
        break;
      case "readiness.drivers":
        data = await resolvers.readinessDrivers(pg, studentId);
        break;
      case "readiness.whatif.sat":
        data = await resolvers.readinessWhatIfSAT(pg, studentId, intent.filters?.uapx || intent.filters?.action_param);
        break;
      case "readiness.whatif.award":
        data = await resolvers.readinessWhatIfAward(pg, studentId, intent.filters?.uapx || intent.filters?.action_param);
        break;
      case "readiness.whatif.ec":
        data = await resolvers.readinessWhatIfEC(pg, studentId, intent.filters?.uapx);
        break;
      case "readiness.whatif.gpa":
        data = await resolvers.readinessWhatIfGPA(pg, studentId, intent.filters?.uapx);
        break;
      case "readiness.whatif.program":
        data = await resolvers.readinessWhatIfProgram(pg, studentId, intent.filters?.uapx);
        break;
      case "readiness.next_moves":
        data = await resolvers.readinessNextMoves(pg, studentId);
        break;
      case "readiness.weakspots.now":
        data = await resolvers.readinessWeakspots(pg, studentId, 3);
        break;
      case "readiness.boost.max":
        data = await resolvers.readinessBoostMax(pg, studentId);
        break;
      case "readiness.boost.plan":
        data = await resolvers.readinessBoostPlan(pg, studentId, 5);
        break;
      case "readiness.progression":
        data = await resolvers.readinessProgression(pg, studentId, 5);
        break;
      case "college.list":
        console.log('[INTENT-ROUTER] → Calling resolvers.collegeList, filters:', intent.filters, 'message:', message.substring(0, 50));
        data = await resolvers.collegeList(pg, studentId, intent.filters || {}, message);
        console.log('[INTENT-ROUTER] ✓ collegeList returned:', JSON.stringify(data).substring(0, 300));
        break;
      case "college.compare.readiness":
        console.log('[INTENT-ROUTER] → Calling resolvers.collegeCompareReadiness');
        data = await resolvers.collegeCompareReadiness(pg, studentId);
        console.log('[INTENT-ROUTER] ✓ collegeCompareReadiness returned:', JSON.stringify(data).substring(0, 200));
        break;
      case "scholarship.list":
        data = await resolvers.scholarshipList(pg, studentId, intent.filters || {});
        break;
      case "scholarship.total":
        data = await resolvers.scholarshipTotal(pg, studentId, intent.filters || {});
        break;
      case "kb.search":
        data = await resolvers.kbSearch(pg, studentId, message, intent.filters || {});
        break;

      // ============================================================================
      // v10.7: NEW ROUTES - Academics Transcript & GPA
      // ============================================================================
      case "academics.transcript.initial":
        data = await resolvers.academicsTranscript(pg, studentId, "initial", {});
        break;
      case "academics.transcript.final":
        data = await resolvers.academicsTranscript(pg, studentId, "final", {});
        break;
      case "academics.transcript.progression":
        data = await resolvers.academicsTranscript(pg, studentId, "progression", {});
        break;
      case "academics.gpa.initial":
        data = await resolvers.academicsGPA(pg, studentId, "initial", {});
        break;
      case "academics.gpa.final":
        data = await resolvers.academicsGPA(pg, studentId, "final", {});
        break;
      case "academics.gpa.latest":
        data = await resolvers.academicsGPA(pg, studentId, "latest", {});
        break;
      case "academics.gpa.progression":
        data = await resolvers.academicsGPA(pg, studentId, "progression", {});
        break;

      // ============================================================================
      // v10.7: NEW ROUTES - Testing (SAT)
      // ============================================================================
      case "testing.sat.first":
        data = await resolvers.academicsSAT(pg, studentId, "first", {});
        break;
      case "testing.sat.latest":
        data = await resolvers.academicsSAT(pg, studentId, "latest", {});
        break;
      case "testing.sat.progression":
        data = await resolvers.academicsSAT(pg, studentId, "progression", {});
        break;

      // ============================================================================
      // v10.7: NEW ROUTES - EC Vitals (v10.6 data - 27 records huda-2025)
      // ============================================================================
      case "vitals.latest":
        data = await resolvers.vitalsLatest(pg, studentId);
        break;
      case "vitals.progression":
        data = await resolvers.vitalsProgression(pg, studentId);
        break;
      case "vitals.funding.progression":
        data = await resolvers.vitalsFundingProgression(pg, studentId);
        break;
      case "vitals.scale.progression":
        data = await resolvers.vitalsScaleProgression(pg, studentId);
        break;
      case "vitals.impact.latest":
        data = await resolvers.vitalsImpactLatest(pg, studentId);
        break;
      case "vitals.summary":
        data = await resolvers.vitalsSummary(pg, studentId);
        break;

      // ============================================================================
      // v1.0: NSM (North Star Metrics) Routes
      // ============================================================================
      case "nsm.dashboard":
        data = await nsmResolvers.nsmDashboard(pg, studentId);
        break;
      case "nsm.recognition":
        data = await nsmResolvers.recognitionVitals(pg, studentId);
        break;
      case "nsm.leadership":
        data = await nsmResolvers.leadershipVitals(pg, studentId);
        break;
      case "nsm.academic":
        data = await nsmResolvers.academicVitals(pg, studentId);
        break;
      case "nsm.program":
        data = await nsmResolvers.programVitals(pg, studentId);
        break;

      // ============================================================================
      // v10.7: NEW ROUTES - JTBD (v10.6 data - 38 records huda-2025)
      // ============================================================================
      case "jtbd.week":
        // Extract week number from filters or message
        const weekNum = intent.filters?.week_number || extractWeekNumber(message);
        data = await resolvers.jtbdWeek(pg, studentId, weekNum);
        break;
      case "jtbd.completed":
        data = await resolvers.jtbdCompleted(pg, studentId);
        break;
      case "jtbd.pending":
        data = await resolvers.jtbdPending(pg, studentId);
        break;
      case "jtbd.milestones":
        data = await resolvers.jtbdMilestones(pg, studentId);
        break;
      case "jtbd.progression":
        data = await resolvers.jtbdProgression(pg, studentId);
        break;

      // ============================================================================
      // v10.7: NEW ROUTES - College Enhanced
      // ============================================================================
      case "college.attending":
        data = await resolvers.collegeAttending(pg, studentId);
        break;
      case "college.accepted":
        data = await resolvers.collegeAccepted(pg, studentId);
        break;
      case "college.reach":
        data = await resolvers.collegeReach(pg, studentId);
        break;
      case "college.match":
        data = await resolvers.collegeMatch(pg, studentId);
        break;
      case "college.safety":
        data = await resolvers.collegeSafety(pg, studentId);
        break;
      case "college.early_decision":
        data = await resolvers.collegeEarlyDecision(pg, studentId);
        break;
      case "college.early_action":
        data = await resolvers.collegeEarlyAction(pg, studentId);
        break;
      case "college.restrictive_early":
        data = await resolvers.collegeRestrictiveEarlyAction(pg, studentId);
        break;
      case "college.regular_decision":
        data = await resolvers.collegeRegularDecision(pg, studentId);
        break;

      // ============================================================================
      // v10.7.1: NEW ROUTES - EC Role Filtering (Universal Attribute Filtering)
      // ============================================================================
      case "ecs.leadership":
        data = await resolvers.ecsLeadership(pg, studentId);
        break;
      case "ecs.by_role":
        // Extract role from filters or message text
        let roleFilter = intent.filters?.role;
        if (!roleFilter) {
          const roleMatch = message.match(/(leadership|leader|captain|president|founder|ambassador|editor|director|member|officer|coordinator)/i);
          roleFilter = roleMatch ? roleMatch[1] : 'leader';
        }
        data = await resolvers.ecsByRole(pg, studentId, roleFilter);
        break;

      // ============================================================================
      // v10.7: NEW ROUTES - Readiness Enhanced
      // ============================================================================
      case "readiness.top_priorities":
        data = await resolvers.readinessTopPriorities(pg, studentId);
        break;

      default:
        data = await resolvers.kbSearch(pg, studentId, message, {});
    }

    log.event('router.route_complete', { trace_id: traceId, took_ms: Date.now()-t0 });
    return { ...data, traceId, intent };
  } catch (error: any) {
    log.event('router.route_error', { trace_id: traceId, error: error.message, took_ms: Date.now()-t0 });
    return {
      answer: `Error processing your request: ${error.message}`,
      chips: [{kind: "error", text: "router_error"}],
      traceId,
      hits: []
    };
  }
}
