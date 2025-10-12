// services/jenny-api/src/router/intentRouter.ts
import OpenAI from "openai";
import { z } from "zod";
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import * as resolvers from '../services/resolvers.js';
import type { Pool } from 'pg';
import { extractUAPX } from '../intent/extractors/uapx.js';
import type { Domain } from '../intent/schema.js';
import { extractCollegeFiltersGuardrail, extractScholarshipFiltersGuardrail } from '../intent/extractors/guardrails.js';

const log = createLogger('intent-router');
const ROUTE_THRESHOLD = Number(process.env.INTENT_ROUTE_THRESHOLD ?? "0.62"); // Route if confidence >= 0.62
const CLARIFY_THRESHOLD = Number(process.env.INTENT_CLARIFY_THRESHOLD ?? "0.45"); // Ask clarifying question if 0.45-0.62

// ============================================================================
// GPT-5 Intent Classifier (inlined to avoid module issues)
// ============================================================================

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Intent =
  | "ecs.list"
  | "awards.list"
  | "programs.list"
  | "academics.summary"
  | "narrative.summary"
  | "progression.timeline"
  | "sat.ordinal"
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
  | "college.list"
  | "college.compare.readiness"
  | "scholarship.list"
  | "scholarship.total"
  | "kb.search"
  | "unknown";

type Phase = "initial" | "final" | null;
type Object = "ec" | "award" | "program" | "academics" | "narrative" | "sat";
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

  // ECs - Final (4 examples)
  {input:"what was my final EC list?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.95}},
  {input:"which activities made it into my Common App?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.96}},
  {input:"ECs I submitted in the college application", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.94}},
  {input:"what ECs did I end up submitting?", output:{intent:"ecs.list", phase:"final", object:"ec", filters:{}, confidence:0.93}},

  // Awards - Initial (4 examples)
  {input:"what was my initial awards list?", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.95}},
  {input:"game plan award targets", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.92}},
  {input:"which honors did we aim for initially?", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.91}},
  {input:"initial list of prizes to pursue", output:{intent:"awards.list", phase:"initial", object:"award", filters:{}, confidence:0.9}},

  // Awards - Final (4 examples)
  {input:"what was my final awards list?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.95}},
  {input:"which awards did I submit on my application?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.96}},
  {input:"which honors ended up on the Common App?", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.95}},
  {input:"awards that made the final cut", output:{intent:"awards.list", phase:"final", object:"award", filters:{}, confidence:0.92}},

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

  // Readiness - What-If EC (8 examples with activity-aware patterns)
  {input:"what if I grow Empowering AI to 10,000 users?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.96}},
  {input:"what if I only scaled the empowering AI to 100 users?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"what if I double users on Synthoria?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"how would raising $25k for Folklift help?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"what if I increase hours per week to 12 on Filmmaker's Club?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.95}},
  {input:"scale Synthoria to 5000 users impact?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"reach 10k users on Empowering AI?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.94}},
  {input:"2x users for my main EC?", output:{intent:"readiness.whatif.ec", phase:null, object:"readiness", filters:{}, confidence:0.93}},

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
];

const SYS = `You are an intent classifier for a college admissions coaching agent.
Output ONLY valid JSON matching this schema:
{
  "intent": "ecs.list|awards.list|programs.list|academics.summary|narrative.summary|progression.timeline|sat.ordinal|gameplan.initial|gameplan.vs_progress|application.final|ivyready.score|ivyready.initial|ivyready.final|ivyready.compare|ivyready.factors|readiness.now|readiness.progress|readiness.drivers|readiness.whatif.sat|readiness.whatif.award|readiness.whatif.ec|readiness.whatif.gpa|readiness.whatif.program|readiness.next_moves|kb.search|unknown",
  "phase": "initial|final|null",
  "object": "ec|award|program|academics|narrative|sat|gameplan|application|rubric|readiness",
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

    // Awards fact queries
    if (/\b(what|which|list|show|tell me).*(award|honor|recognition|prize|won|ncwit)/i.test(message)) {
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
    else if (/\b(SAT|ACT|test\s*score)/i.test(message) && /\b(first|second|third|last|latest|initial|final|was\s*my|show|scores?)/i.test(message)) {
      const hasOrdinal = /\b(first|second|third|last|latest|nth)/i.test(message);

      if (hasOrdinal) {
        const nth = /first|1st/.test(q) ? "first" : /second|2nd/.test(q) ? "second" : /third|3rd/.test(q) ? "third" : "latest";
        factIntent = { intent: "sat.ordinal", phase: null, object: "sat", filters: { nth }, confidence: 0.98, detector: "keyword-floor" };
      } else {
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

    // Confidence-based routing with tiered responses
    if (intent.confidence < CLARIFY_THRESHOLD) {
      // Very low confidence (< 0.45): Suggest trying specific queries
      log.event('intent.very_low_confidence', { trace_id: traceId, confidence: intent.confidence, query: message.slice(0, 50) });
      return {
        answer: `I'm not quite sure what you're asking for. Try asking for something specific like:\n• "final EC list"\n• "initial awards list"\n• "what awards did I win?"\n• "what was my first SAT score?"`,
        chips: [{kind:"notice", text:`confidence: ${(intent.confidence*100).toFixed(0)}%`}],
        traceId,
        intent,
      };
    }

    if (intent.confidence < ROUTE_THRESHOLD) {
      // Medium confidence (0.45-0.62): Ask clarifying question with best guess
      log.event('intent.mid_confidence', { trace_id: traceId, confidence: intent.confidence });

      const phaseLabel = intent.phase === "initial" ? "initial" : intent.phase === "final" ? "final" : "";
      const objectLabel = intent.object === "ec" ? "ECs"
        : intent.object === "award" ? "awards"
        : intent.object === "program" ? "summer programs"
        : intent.object === "academics" ? "academics"
        : intent.object === "narrative" ? "narrative" : intent.object;
      const suggestion = phaseLabel ? `${phaseLabel} ${objectLabel}` : objectLabel;

      return {
        answer: `I think you want **${suggestion}**—should I pull that? (${(intent.confidence*100).toFixed(0)}% confident)\n\nOr try rephrasing your question for better accuracy.`,
        chips: [
          {kind:"notice", text:`inferred: ${intent.intent}`},
          {kind:"notice", text:`confidence: ${(intent.confidence*100).toFixed(0)}%`}
        ],
        traceId,
        intent,
      };
    }

    // High confidence (>= 0.62): Route to resolver
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
