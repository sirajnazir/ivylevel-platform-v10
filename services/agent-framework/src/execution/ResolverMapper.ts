/**
 * v13.0 Universal Resolver Mapper
 *
 * Purpose: Map sub-intents to existing proven resolvers (NO SQL DUPLICATION)
 *
 * Architecture Principle:
 * - MultiDimensionalIntentAnalyzer detects sub_intents (e.g., "gpa.latest")
 * - ResolverMapper routes to existing resolver functions
 * - Resolvers contain ALL SQL queries (single source of truth)
 *
 * This ensures:
 * - Zero SQL duplication
 * - Future-proof (add mapping, not SQL)
 * - Uses battle-tested resolver code from silo system
 */

import type { Pool } from 'pg';
import * as resolvers from '../services/resolvers.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolverResult {
  answer: string;
  chips: Array<{
    kind: string;
    text: string;
    id?: string;
  }>;
  hits: any[];
}

// ============================================================================
// UNIVERSAL RESOLVER MAPPER
// ============================================================================

/**
 * Call the appropriate resolver function based on sub-intent key
 *
 * @param intent_key - Sub-intent from MultiDimensionalIntentAnalyzer (e.g., "gpa.latest")
 * @param pg - PostgreSQL pool
 * @param studentId - Student ID
 * @param query - Original user query (needed for some resolvers like collegeList)
 * @returns Resolver result with answer, chips, and hits
 */
export async function callResolverForIntent(
  intent_key: string,
  pg: Pool,
  studentId: string,
  query: string
): Promise<ResolverResult> {

  console.log(`[ResolverMapper] Routing sub-intent: ${intent_key}`);

  try {
    // ============================================================================
    // ACADEMICS - GPA
    // ============================================================================

    if (intent_key === 'gpa.latest' || intent_key === 'gpa') {
      return await resolvers.academicsGPA(pg, studentId, "latest", {});
    }

    if (intent_key === 'gpa.trend' || intent_key === 'gpa.progression') {
      return await resolvers.academicsGPA(pg, studentId, "progression", {});
    }

    if (intent_key === 'gpa.initial') {
      return await resolvers.academicsGPA(pg, studentId, "initial", {});
    }

    if (intent_key === 'gpa.final') {
      return await resolvers.academicsGPA(pg, studentId, "final", {});
    }

    // ============================================================================
    // ACADEMICS - TRANSCRIPT
    // ============================================================================

    if (intent_key === 'transcript' || intent_key === 'transcript.final') {
      return await resolvers.academicsTranscript(pg, studentId, "final");
    }

    if (intent_key === 'transcript.initial') {
      return await resolvers.academicsTranscript(pg, studentId, "initial");
    }

    if (intent_key === 'transcript.progression') {
      return await resolvers.academicsTranscript(pg, studentId, "progression");
    }

    // ============================================================================
    // TESTING - SAT
    // ============================================================================

    if (intent_key === 'test.sat' || intent_key === 'sat.latest' || intent_key === 'sat') {
      return await resolvers.academicsSAT(pg, studentId, "latest", {});
    }

    if (intent_key === 'sat.first') {
      return await resolvers.academicsSAT(pg, studentId, "first", {});
    }

    if (intent_key === 'sat.progression') {
      return await resolvers.academicsSAT(pg, studentId, "progression", {});
    }

    // ============================================================================
    // AWARDS
    // ============================================================================

    if (intent_key === 'awards' || intent_key === 'awards.won' || intent_key === 'award.list') {
      return await resolvers.awardsList(pg, studentId, "final");
    }

    if (intent_key === 'awards.initial') {
      return await resolvers.awardsList(pg, studentId, "initial");
    }

    // ============================================================================
    // ECS / ACTIVITIES
    // ============================================================================

    if (intent_key === 'ecs' || intent_key === 'ecs.list' || intent_key === 'ec.list') {
      return await resolvers.ecsList(pg, studentId, "final");
    }

    if (intent_key === 'ecs.initial') {
      return await resolvers.ecsList(pg, studentId, "initial");
    }

    if (intent_key === 'ecs.leadership') {
      return await resolvers.ecsLeadership(pg, studentId);
    }

    // ============================================================================
    // SUMMER PROGRAMS
    // ============================================================================

    if (intent_key === 'programs' || intent_key === 'programs.list') {
      return await resolvers.programsList(pg, studentId, "final");
    }

    if (intent_key === 'programs.initial') {
      return await resolvers.programsList(pg, studentId, "initial");
    }

    if (intent_key === 'programs.admits') {
      return await resolvers.programsAdmits(pg, studentId);
    }

    // ============================================================================
    // COLLEGE LIST
    // ============================================================================

    if (intent_key === 'college.list' || intent_key === 'college') {
      return await resolvers.collegeList(pg, studentId, {}, query);
    }

    if (intent_key === 'college.attending') {
      return await resolvers.collegeAttending(pg, studentId);
    }

    if (intent_key === 'college.accepted') {
      return await resolvers.collegeAccepted(pg, studentId);
    }

    if (intent_key === 'college.reach') {
      return await resolvers.collegeReach(pg, studentId);
    }

    if (intent_key === 'college.match') {
      return await resolvers.collegeMatch(pg, studentId);
    }

    if (intent_key === 'college.safety') {
      return await resolvers.collegeSafety(pg, studentId);
    }

    if (intent_key === 'college.early_decision') {
      return await resolvers.collegeEarlyDecision(pg, studentId);
    }

    if (intent_key === 'college.early_action') {
      return await resolvers.collegeEarlyAction(pg, studentId);
    }

    if (intent_key === 'college.regular_decision') {
      return await resolvers.collegeRegularDecision(pg, studentId);
    }

    // ============================================================================
    // READINESS (IvyScore)
    // ============================================================================

    if (intent_key === 'readiness' || intent_key === 'readiness.score') {
      return await resolvers.readinessScore(pg, studentId);
    }

    if (intent_key === 'readiness.drivers') {
      return await resolvers.readinessDrivers(pg, studentId);
    }

    if (intent_key === 'readiness.top_priorities') {
      return await resolvers.readinessTopPriorities(pg, studentId);
    }

    // ============================================================================
    // VITALS (Student Profile Summary)
    // ============================================================================

    if (intent_key === 'vitals' || intent_key === 'profile.summary') {
      return await resolvers.profileSummary(pg, studentId);
    }

    // ============================================================================
    // DEADLINES
    // ============================================================================

    if (intent_key === 'deadline' || intent_key === 'deadlines' || intent_key === 'college.deadlines') {
      return await resolvers.collegeDeadlines(pg, studentId);
    }

    // ============================================================================
    // COLLEGE COMPARISON
    // ============================================================================

    if (intent_key === 'college.comparison') {
      return await resolvers.collegeComparison(pg, studentId, []);
    }

    // ============================================================================
    // NARRATIVE (Essays / Personal Statements)
    // ============================================================================

    if (intent_key === 'narrative.initial') {
      return await resolvers.narrativeInitial(pg, studentId);
    }

    if (intent_key === 'narrative.final') {
      return await resolvers.narrativeFinal(pg, studentId);
    }

    // ============================================================================
    // JTBD (Jobs To Be Done) / JOURNEY TIMELINE
    // ============================================================================

    if (intent_key === 'journey' || intent_key === 'timeline' || intent_key === 'journey.timeline') {
      return await resolvers.journeyTimeline(pg, studentId);
    }

    if (intent_key === 'jtbd.completed' || intent_key === 'jobs.completed') {
      return await resolvers.jtbdCompleted(pg, studentId);
    }

    if (intent_key === 'jtbd.milestones' || intent_key === 'milestones') {
      return await resolvers.jtbdMilestones(pg, studentId);
    }

    if (intent_key === 'jtbd.progression' || intent_key === 'progression') {
      return await resolvers.jtbdProgression(pg, studentId);
    }

    if (intent_key === 'jtbd.pending' || intent_key === 'jobs.pending') {
      return await resolvers.jtbdPending(pg, studentId);
    }

    // ============================================================================
    // APPLICATION STATUS
    // ============================================================================

    if (intent_key === 'application.status' || intent_key === 'application.count') {
      // Application status comes from college_list
      return await resolvers.collegeList(pg, studentId, {}, query);
    }

    // ============================================================================
    // DEFAULT - NO RESOLVER FOUND
    // ============================================================================

    console.warn(`[ResolverMapper] No resolver mapped for intent: ${intent_key}`);
    return {
      answer: `No data resolver found for: ${intent_key}`,
      chips: [],
      hits: []
    };

  } catch (error) {
    console.error(`[ResolverMapper] Error calling resolver for ${intent_key}:`, error);
    return {
      answer: `Error retrieving data for: ${intent_key}`,
      chips: [],
      hits: []
    };
  }
}

// ============================================================================
// RESOLVER METADATA (for documentation and discovery)
// ============================================================================

export const RESOLVER_METADATA = {
  // GPA
  'gpa.latest': {
    resolver: 'academicsGPA',
    params: ['latest'],
    views: ['v_gpa_timeline'],
    example: 'What is my GPA?'
  },

  // Awards
  'awards.won': {
    resolver: 'awardsList',
    params: ['final'],
    views: ['v_awards_won'],
    example: 'What awards have I won?'
  },

  // ECs
  'ecs.list': {
    resolver: 'ecsList',
    params: ['final'],
    views: ['v_ecs_final'],
    example: 'What are my extracurriculars?'
  },

  // Programs
  'programs.list': {
    resolver: 'programsList',
    params: ['final'],
    views: ['v_programs_final'],
    example: 'What summer programs did I attend?'
  },

  // SAT
  'sat.latest': {
    resolver: 'academicsSAT',
    params: ['latest'],
    views: ['v_sat_enum_latest'],
    example: 'What is my SAT score?'
  },

  // College
  'college.list': {
    resolver: 'collegeList',
    params: ['{}', 'query'],
    views: ['college_list'],
    example: 'What colleges am I applying to?'
  },

  'college.attending': {
    resolver: 'collegeAttending',
    params: [],
    views: ['college_list'],
    example: 'Where am I going to college?'
  }
};
