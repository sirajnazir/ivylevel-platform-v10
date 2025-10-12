/**
 * SQL Fact Resolver Adapter
 *
 * Adapter layer to call jenny-api SQL resolvers directly (no HTTP overhead)
 * Maps unified intent system to jenny-api resolver functions
 *
 * Architecture:
 * Unified Intent → SQL Resolver Adapter → jenny-api resolvers.ts → PostgreSQL
 */

import type { Pool } from "pg";

// NOTE: Direct import of jenny-api resolvers doesn't work in Next.js runtime
// Temporarily using HTTP adapter until we set up proper module sharing
// import * as jennyResolvers from "../../../../services/jenny-api/src/services/resolvers.js";

/**
 * SQL Resolver Request
 */
export interface SQLResolverRequest {
  intent: string;
  student_id: string;
  filters?: Record<string, any>;
  pool: Pool;
}

/**
 * SQL Resolver Response (matches jenny-api format)
 */
export interface SQLResolverResponse {
  answer: string;
  chips: any[];
  hits?: any[];
  facts?: any[];
  trace?: any;
}

/**
 * Main SQL resolver adapter
 *
 * Routes intent to appropriate jenny-api resolver function
 */
export async function resolveSQLFact(req: SQLResolverRequest): Promise<SQLResolverResponse> {
  const { intent, student_id, filters = {}, pool } = req;

  console.log(`[sql-adapter] Resolving intent: ${intent} for student: ${student_id}`);

  try {
    // Route to appropriate jenny-api resolver
    switch (intent) {
      // ============================================================================
      // ENUMERATIONS (phase-based lists)
      // ============================================================================

      case "ecs.list":
        return await jennyResolvers.ecsList(pool, student_id, filters.phase);

      case "awards.list":
        return await jennyResolvers.awardsList(pool, student_id, filters.phase);

      case "programs.list":
        return await jennyResolvers.programsList(pool, student_id, filters.phase);

      case "academics.summary":
        return await jennyResolvers.academicsSummary(pool, student_id, filters.phase, filters);

      case "narrative.summary":
        // Route to initial or final based on phase
        if (filters.phase === "initial") {
          return await jennyResolvers.narrativeInitial(pool, student_id);
        } else if (filters.phase === "final") {
          return await jennyResolvers.narrativeFinal(pool, student_id);
        } else {
          // Default to final for null phase
          return await jennyResolvers.narrativeFinal(pool, student_id);
        }

      // ============================================================================
      // PROGRESSION (timeline queries)
      // ============================================================================

      case "progression.timeline":
        // Handle progression queries - map to existing "wins" resolvers
        if (filters.object === "award") {
          return await jennyResolvers.awardsWins(pool, student_id);
        } else if (filters.object === "program") {
          return await jennyResolvers.programsAdmits(pool, student_id);
        } else if (filters.object === "sat") {
          return await jennyResolvers.academicsSAT(pool, student_id, "progression", {});
        } else {
          return {
            answer: "Progression tracking not yet implemented for this entity.",
            chips: [],
            hits: [],
          };
        }

      // ============================================================================
      // SAT ORDINALS (first/second/latest)
      // ============================================================================

      case "sat.ordinal":
        {
          const nth = filters.nth;
          let satPhase = "latest";
          if (nth === "first" || nth === 1) satPhase = "first";
          else if (nth === "latest") satPhase = "latest";
          else if (typeof nth === "number" || nth === "second" || nth === "third")
            satPhase = "nth";

          return await jennyResolvers.academicsSAT(pool, student_id, satPhase, filters);
        }

      // ============================================================================
      // GAMEPLAN (initial targets vs execution)
      // ============================================================================

      case "gameplan.initial":
        return await jennyResolvers.gamePlanInitial(pool, student_id);

      case "gameplan.vs_progress":
        return await jennyResolvers.gamePlanVsExecution(pool, student_id);

      // ============================================================================
      // APPLICATION (Common App submission)
      // ============================================================================

      case "application.final":
        return await jennyResolvers.commonAppSubmitted(pool, student_id);

      // ============================================================================
      // IVYREADY RUBRIC (snapshot-based scoring)
      // ============================================================================

      case "ivyready.score":
        return await jennyResolvers.ivyReadyScore(pool, student_id, filters.phase);

      case "ivyready.initial":
        return await jennyResolvers.ivyReadyInitial(pool, student_id);

      case "ivyready.final":
        return await jennyResolvers.ivyReadyFinal(pool, student_id);

      case "ivyready.compare":
        return await jennyResolvers.ivyReadyCompare(pool, student_id);

      case "ivyready.factors":
        return await jennyResolvers.ivyReadyFactors(pool, student_id);

      // ============================================================================
      // READINESS (feature-based scoring v3.7+)
      // ============================================================================

      case "readiness.now":
        return await jennyResolvers.readinessNow(pool, student_id);

      case "readiness.progress":
        return await jennyResolvers.readinessProgress(pool, student_id);

      case "readiness.drivers":
        return await jennyResolvers.readinessDrivers(pool, student_id);

      case "readiness.whatif.sat":
        return await jennyResolvers.readinessWhatIfSAT(
          pool,
          student_id,
          filters.uapx || filters.action_param
        );

      case "readiness.whatif.award":
        return await jennyResolvers.readinessWhatIfAward(
          pool,
          student_id,
          filters.uapx || filters.action_param
        );

      case "readiness.whatif.ec":
        return await jennyResolvers.readinessWhatIfEC(pool, student_id, filters.uapx);

      case "readiness.whatif.gpa":
        return await jennyResolvers.readinessWhatIfGPA(pool, student_id, filters.uapx);

      case "readiness.whatif.program":
        return await jennyResolvers.readinessWhatIfProgram(pool, student_id, filters.uapx);

      case "readiness.next_moves":
        return await jennyResolvers.readinessNextMoves(pool, student_id);

      case "readiness.weakspots.now":
        return await jennyResolvers.readinessWeakspots(pool, student_id, 3);

      case "readiness.boost.max":
        return await jennyResolvers.readinessBoostMax(pool, student_id);

      case "readiness.boost.plan":
        return await jennyResolvers.readinessBoostPlan(pool, student_id, 5);

      case "readiness.progression":
        return await jennyResolvers.readinessProgression(pool, student_id, 5);

      // ============================================================================
      // COLLEGE (applications & outcomes v4.6+)
      // ============================================================================

      case "college.list":
        return await jennyResolvers.collegeList(pool, student_id, filters, "");

      case "college.compare.readiness":
        return await jennyResolvers.collegeCompareReadiness(pool, student_id);

      // ============================================================================
      // SCHOLARSHIP (v4.6+)
      // ============================================================================

      case "scholarship.list":
        return await jennyResolvers.scholarshipList(pool, student_id, filters);

      case "scholarship.total":
        return await jennyResolvers.scholarshipTotal(pool, student_id, filters);

      // ============================================================================
      // FALLBACK: Unknown intent
      // ============================================================================

      default:
        console.warn(`[sql-adapter] Unknown intent: ${intent}`);
        return {
          answer: `SQL resolver not implemented for intent: ${intent}`,
          chips: [{ kind: "notice", text: `intent:${intent}` }],
          hits: [],
        };
    }
  } catch (error: any) {
    console.error(`[sql-adapter] Error resolving intent ${intent}:`, error);

    // Return graceful error
    return {
      answer: `Error retrieving facts: ${error.message}`,
      chips: [
        { kind: "error", text: "sql_resolver_error" },
        { kind: "notice", text: error.message },
      ],
      hits: [],
      trace: {
        error: error.message,
        stack: error.stack,
        intent,
        student_id,
      },
    };
  }
}

/**
 * Check if intent requires SQL resolver
 */
export function isSQLIntent(intent: string): boolean {
  const SQL_INTENTS = new Set([
    "ecs.list",
    "awards.list",
    "programs.list",
    "academics.summary",
    "narrative.summary",
    "progression.timeline",
    "sat.ordinal",
    "gameplan.initial",
    "gameplan.vs_progress",
    "application.final",
    "ivyready.score",
    "ivyready.initial",
    "ivyready.final",
    "ivyready.compare",
    "ivyready.factors",
    "readiness.now",
    "readiness.progress",
    "readiness.drivers",
    "readiness.whatif.sat",
    "readiness.whatif.award",
    "readiness.whatif.ec",
    "readiness.whatif.gpa",
    "readiness.whatif.program",
    "readiness.next_moves",
    "readiness.weakspots.now",
    "readiness.boost.max",
    "readiness.boost.plan",
    "readiness.progression",
    "college.list",
    "college.compare.readiness",
    "scholarship.list",
    "scholarship.total",
  ]);

  return SQL_INTENTS.has(intent);
}

/**
 * Health check: test SQL connection
 */
export async function testSQLConnection(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query("SELECT 1 as health");
    return result.rows[0]?.health === 1;
  } catch (error: any) {
    console.error("[sql-adapter] Health check failed:", error.message);
    return false;
  }
}
