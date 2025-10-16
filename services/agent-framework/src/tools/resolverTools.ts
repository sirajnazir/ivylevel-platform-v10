/**
 * resolverTools.ts
 * OpenAI Function Calling Tool Definitions for v14 Resolvers
 * Wraps zero-hallucination SQL resolvers as OpenAI function calling tools
 * Created: 2025-10-16 (Phase 1, Week 2)
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { pool } from '../db/pool.js';
import * as resolvers from '../services/resolvers.js';
import * as academicsResolvers from '../resolvers/academics.js';
import * as enumsResolvers from '../resolvers/enums.js';
import * as testingResolvers from '../resolvers/testing.js';
import * as collegeResolvers from '../resolvers/college.js';
import { vitals } from '../resolvers/vitals.js';
import { knowledgeMoat } from '../repositories/KnowledgeMoatRepository.js';

// ==============================================================================
// Tool Definitions (OpenAI Function Calling Format)
// ==============================================================================

/**
 * Tool: Get Extracurriculars List
 * Category: CAT-1 (SQL)
 */
export const getECsListTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_ecs_list',
    description: 'Get student extracurricular activities list. Use phase="initial" for planned/targeted ECs, phase="final" for actual/submitted ECs.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID (e.g., STU001, huda-2025)'
        },
        phase: {
          type: 'string',
          enum: ['initial', 'final'],
          description: 'Phase: "initial" for planned ECs, "final" for submitted/actual ECs'
        }
      },
      required: ['student_id', 'phase']
    }
  }
};

/**
 * Tool: Get Awards List
 * Category: CAT-1 (SQL)
 */
export const getAwardsListTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_awards_list',
    description: 'Get student awards and honors list. Use phase="initial" for targeted awards, phase="final" for awards won.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        },
        phase: {
          type: 'string',
          enum: ['initial', 'final'],
          description: 'Phase: "initial" for targeted, "final" for won'
        }
      },
      required: ['student_id', 'phase']
    }
  }
};

/**
 * Tool: Get Summer Programs List
 * Category: CAT-1 (SQL)
 */
export const getSummerProgramsListTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_programs_list',
    description: 'Get student summer programs list. Use phase="initial" for planned programs, phase="final" for submitted/attended programs.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        },
        phase: {
          type: 'string',
          enum: ['initial', 'final'],
          description: 'Phase: "initial" for planned, "final" for submitted'
        }
      },
      required: ['student_id', 'phase']
    }
  }
};

/**
 * Tool: Get SAT Scores
 * Category: CAT-1 (SQL)
 */
export const getSATScoresTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_sat_scores',
    description: 'Get student SAT scores. Use phase="first" for first attempt, phase="latest" for most recent, phase="all" for complete history.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        },
        phase: {
          type: 'string',
          enum: ['first', 'latest', 'all', 'superscore'],
          description: 'Phase: first/latest/all/superscore'
        }
      },
      required: ['student_id', 'phase']
    }
  }
};

/**
 * Tool: Get GPA
 * Category: CAT-1 (SQL)
 */
export const getGPATool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_gpa',
    description: 'Get student GPA. Use phase="latest" for most recent GPA, phase="initial" for baseline, phase="progression" for GPA history.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        },
        phase: {
          type: 'string',
          enum: ['initial', 'latest', 'progression'],
          description: 'Phase: initial/latest/progression'
        }
      },
      required: ['student_id', 'phase']
    }
  }
};

/**
 * Tool: Get Transcript
 * Category: CAT-1 (SQL)
 */
export const getTranscriptTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_transcript',
    description: 'Get student full transcript with all courses and grades.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        },
        phase: {
          type: 'string',
          enum: ['initial', 'final', 'progression'],
          description: 'Phase: initial/final/progression'
        }
      },
      required: ['student_id', 'phase']
    }
  }
};

/**
 * Tool: Get Game Plan
 * Category: CAT-1 (SQL)
 */
export const getGamePlanTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_game_plan',
    description: 'Get student college application game plan with timeline and milestones.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        }
      },
      required: ['student_id']
    }
  }
};

/**
 * Tool: Get Student Vitals
 * Category: CAT-1 (SQL)
 */
export const getVitalsTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_vitals',
    description: 'Get student core profile vitals (name, school, grade, basic stats).',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        }
      },
      required: ['student_id']
    }
  }
};

/**
 * Tool: Get College Benchmarks (Knowledge Moat DS1)
 * Category: CAT-1 (SQL) - Knowledge Moat
 */
export const getCollegeBenchmarkTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_college_benchmark',
    description: 'Get college benchmarks (acceptance rate, SAT/GPA ranges) from Common Data Set.',
    parameters: {
      type: 'object',
      properties: {
        college_id: {
          type: 'string',
          description: 'College ID (e.g., stanford, mit, harvard)'
        }
      },
      required: ['college_id']
    }
  }
};

/**
 * Tool: Get College Rubric (Knowledge Moat DS2)
 * Category: CAT-1 (SQL) - Knowledge Moat
 */
export const getCollegeRubricTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_college_rubric',
    description: 'Get college admissions rubric factors (what the college values in applicants).',
    parameters: {
      type: 'object',
      properties: {
        college_id: {
          type: 'string',
          description: 'College ID (e.g., stanford, mit, harvard)'
        }
      },
      required: ['college_id']
    }
  }
};

/**
 * Tool: Get Placement History (Knowledge Moat DS4)
 * Category: CAT-1 (SQL) - Knowledge Moat
 */
export const getPlacementHistoryTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_placement_history',
    description: 'Get school-to-college placement history (acceptance rates from student high school).',
    parameters: {
      type: 'object',
      properties: {
        school_id: {
          type: 'string',
          description: 'School ID (e.g., palo-alto-hs, stuyvesant-hs)'
        },
        college_id: {
          type: 'string',
          description: 'College ID (e.g., stanford, mit)'
        }
      },
      required: ['school_id', 'college_id']
    }
  }
};

/**
 * Tool: Find Similar Student Profiles (Knowledge Moat DS5)
 * Category: CAT-1 (SQL) - Knowledge Moat
 */
export const findSimilarProfilesTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'find_similar_profiles',
    description: 'Find student twins with similar profiles and their college outcomes.',
    parameters: {
      type: 'object',
      properties: {
        gpa_range: {
          type: 'string',
          description: 'GPA range (e.g., "4.0-4.2", "3.8-4.0")'
        },
        sat_range: {
          type: 'string',
          description: 'SAT range (e.g., "1450-1500", "1500-1550")'
        },
        ec_tier: {
          type: 'string',
          enum: ['tier1', 'tier2', 'tier3', 'tier4'],
          description: 'EC tier: tier1 (national), tier2 (state), tier3 (local), tier4 (school)'
        }
      },
      required: ['gpa_range', 'sat_range', 'ec_tier']
    }
  }
};

/**
 * Tool: Get Summer Programs (Knowledge Moat DS6)
 * Category: CAT-1 (SQL) - Knowledge Moat
 */
export const getSummerProgramsCatalogTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_summer_programs_catalog',
    description: 'Search summer programs catalog with prestige tiers and admissions impact.',
    parameters: {
      type: 'object',
      properties: {
        program_type: {
          type: 'string',
          enum: ['academic', 'research', 'leadership', 'service', 'arts'],
          description: 'Program type filter (optional)'
        },
        prestige_tier: {
          type: 'string',
          enum: ['tier1', 'tier2', 'tier3', 'tier4'],
          description: 'Prestige tier filter (optional)'
        },
        max_cost: {
          type: 'number',
          description: 'Maximum cost in USD (optional)'
        }
      },
      required: []
    }
  }
};

// ==============================================================================
// Tool Execution Functions
// ==============================================================================

export async function executeResolverTool(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    // CAT-1: Student data resolvers
    case 'get_ecs_list':
      return await resolvers.ecsList(pool, args.student_id, args.phase);

    case 'get_awards_list':
      return await resolvers.awardsList(pool, args.student_id, args.phase);

    case 'get_programs_list':
      return await resolvers.programsList(pool, args.student_id, args.phase);

    case 'get_sat_scores':
      return await resolvers.academicsSAT(pool, args.student_id, args.phase, {});

    case 'get_gpa':
      return await resolvers.academicsGPA(pool, args.student_id, args.phase, {});

    case 'get_transcript':
      return await resolvers.academicsTranscript(pool, args.student_id, args.phase);

    case 'get_game_plan':
      return await resolvers.gamePlanInitial(pool, args.student_id);

    case 'get_vitals':
      const vitalData = await vitals.latest(pool, args.student_id);
      return {
        answer: vitalData.length > 0 ? JSON.stringify(vitalData, null, 2) : 'No vitals found',
        chips: [{ kind: 'evidence', text: 'kb_items' }],
        hits: vitalData
      };

    // Knowledge Moat resolvers
    case 'get_college_benchmark':
      const benchmark = await knowledgeMoat.getCollegeBenchmark(args.college_id);
      return {
        answer: benchmark ? JSON.stringify(benchmark, null, 2) : 'College not found',
        chips: [{ kind: 'evidence', text: 'moat_cds_colleges' }],
        hits: benchmark ? [benchmark] : []
      };

    case 'get_college_rubric':
      const rubric = await knowledgeMoat.getCollegeRubric(args.college_id);
      return {
        answer: rubric.length > 0
          ? rubric.map((r, i) => `${i + 1}. ${r.factor_name} (${r.importance}): ${r.description}`).join('\n')
          : 'No rubric data found',
        chips: [{ kind: 'evidence', text: 'moat_rubric_factors' }],
        hits: rubric
      };

    case 'get_placement_history':
      const placement = await knowledgeMoat.getPlacementHistory(args.school_id, args.college_id);
      return {
        answer: placement
          ? `From ${args.school_id}: ${placement.accepted}/${placement.applied} accepted (${Math.round((placement.accepted / placement.applied) * 100)}%)`
          : 'No placement history found',
        chips: [{ kind: 'evidence', text: 'moat_placement_history' }],
        hits: placement ? [placement] : []
      };

    case 'find_similar_profiles':
      const twins = await knowledgeMoat.findSimilarProfiles({
        gpaRange: args.gpa_range,
        satRange: args.sat_range,
        ecTier: args.ec_tier
      });
      return {
        answer: twins.length > 0
          ? twins.map((t, i) => `Profile ${i + 1}: ${t.colleges_accepted}/${t.colleges_applied} accepted (${Math.round((t.acceptance_rate || 0) * 100)}%)`).join('\n')
          : 'No similar profiles found',
        chips: [{ kind: 'evidence', text: 'moat_student_twins' }],
        hits: twins
      };

    case 'get_summer_programs_catalog':
      const programs = await knowledgeMoat.getSummerPrograms({
        programType: args.program_type,
        prestigeTier: args.prestige_tier,
        maxCost: args.max_cost
      });
      return {
        answer: programs.length > 0
          ? programs.map((p, i) => `${i + 1}. ${p.program_name} (${p.prestige_tier}, ${p.selectivity})`).join('\n')
          : 'No programs found',
        chips: [{ kind: 'evidence', text: 'moat_summer_programs' }],
        hits: programs
      };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ==============================================================================
// Tool Registry (All Available Tools)
// ==============================================================================

export const ALL_RESOLVER_TOOLS: ChatCompletionTool[] = [
  // Student data tools
  getECsListTool,
  getAwardsListTool,
  getSummerProgramsListTool,
  getSATScoresTool,
  getGPATool,
  getTranscriptTool,
  getGamePlanTool,
  getVitalsTool,

  // Knowledge Moat tools
  getCollegeBenchmarkTool,
  getCollegeRubricTool,
  getPlacementHistoryTool,
  findSimilarProfilesTool,
  getSummerProgramsCatalogTool,
];

/**
 * Get tools for a specific agent based on its domain
 */
export function getToolsForAgent(agentType: 'gameplan' | 'ecs' | 'awards' | 'programs' | 'college' | 'all'): ChatCompletionTool[] {
  switch (agentType) {
    case 'gameplan':
      return [getGamePlanTool, getVitalsTool, getECsListTool, getAwardsListTool, getSummerProgramsListTool];

    case 'ecs':
      return [getECsListTool, getVitalsTool];

    case 'awards':
      return [getAwardsListTool, getVitalsTool];

    case 'programs':
      return [getSummerProgramsListTool, getSummerProgramsCatalogTool, getVitalsTool];

    case 'college':
      return [
        getCollegeBenchmarkTool,
        getCollegeRubricTool,
        getPlacementHistoryTool,
        findSimilarProfilesTool,
        getVitalsTool,
        getSATScoresTool,
        getGPATool
      ];

    case 'all':
    default:
      return ALL_RESOLVER_TOOLS;
  }
}
