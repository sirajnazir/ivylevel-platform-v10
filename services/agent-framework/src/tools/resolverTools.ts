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
import * as nsmResolvers from '../resolvers/nsm.js';
import { jtbd } from '../resolvers/jtbd.js';
import { scholarships } from '../resolvers/scholarships.js';
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
 * Tool: Get College List
 * Category: CAT-1 (SQL)
 */
export const getCollegeListTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_college_list',
    description: 'Get student\'s complete college application list. Use this when student asks "what is my college list", "which colleges did I apply to", "show me my college list", or "what universities am I applying to". Returns ALL colleges student applied to with bucket (Reach/Match/Safety), decision plan (EA/ED/RD), decision result (Accepted/Rejected/Waitlisted/Pending), and program details.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        },
        bucket: {
          type: 'string',
          enum: ['Reach', 'Match', 'Safety', 'Wild Card'],
          description: 'Optional: Filter by bucket category'
        }
      },
      required: ['student_id']
    }
  }
};

/**
 * Tool: Get College Acceptances
 * Category: CAT-1 (SQL)
 */
export const getCollegeAcceptancesTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_college_acceptances',
    description: 'Get all colleges where student was accepted.',
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
 * Tool: Get College Attending
 * Category: CAT-1 (SQL)
 */
export const getCollegeAttendingTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_college_attending',
    description: 'Get the college student is attending (final decision).',
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

/**
 * Tool: Search Essay Examples (DS6)
 * Category: Knowledge Moat
 */
export const searchEssayExamplesTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_essay_examples',
    description: 'Search for successful college essay examples from admitted students. Filter by college, prompt type, or themes. Use this to show students what strong essays look like.',
    parameters: {
      type: 'object',
      properties: {
        college_name: {
          type: 'string',
          description: 'College name to filter by (e.g., "Stanford University", "MIT")'
        },
        prompt_type: {
          type: 'string',
          enum: ['common_app', 'supplemental', 'uc_piq', 'coalition'],
          description: 'Type of essay prompt'
        },
        themes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Themes to search for (e.g., ["resilience", "leadership", "community"])'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of essays to return (default: 3)'
        }
      },
      required: []
    }
  }
};

/**
 * Tool: Get AO Perspectives (DS7)
 * Category: Knowledge Moat
 */
export const getAOPerspectivesTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_ao_perspectives',
    description: 'Get admissions officer perspectives and insights about what colleges really look for. Filter by college, topic (essays, extracurriculars, holistic_review), or selectivity.',
    parameters: {
      type: 'object',
      properties: {
        college_name: {
          type: 'string',
          description: 'College name to filter by (e.g., "Stanford University", "Harvard")'
        },
        topic: {
          type: 'string',
          enum: ['essays', 'extracurriculars', 'academics', 'interviews', 'holistic_review'],
          description: 'Topic of AO perspective'
        },
        selectivity: {
          type: 'string',
          enum: ['highly_selective', 'selective', 'moderately_selective'],
          description: 'College selectivity level'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of perspectives to return (default: 3)'
        }
      },
      required: []
    }
  }
};

/**
 * Tool: Get Relevant Tactics (DS-T1)
 * Category: Knowledge Moat - Tactic Chips
 * Added: 2025-10-16 (Week 12)
 */
export const getRelevantTacticsTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_relevant_tactics',
    description: 'Get proven coaching tactics relevant to student barriers and situation. Returns actionable tactics from Jenny-Huda baseline with specific micro-actions and expected outcomes.',
    parameters: {
      type: 'object',
      properties: {
        barriers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Student barriers to address (e.g., "time-crisis", "essay-generic", "procrastination", "identity-crisis", "low-productivity")'
        },
        archetypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Student archetypes (e.g., "first-gen-immigrant", "STEM-female", "public-school", "underconfident")'
        },
        category: {
          type: 'string',
          enum: ['Time Management', 'Essay Strategy', 'Trust Building', 'Positioning', 'Mindset', 'Leadership', 'Academic Performance', 'Strategic Planning'],
          description: 'Tactic category to focus on'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tactics to return (default: 3)'
        }
      },
      required: []
    }
  }
};

/**
 * Tool: Get Success Patterns (DS-T2)
 * Category: Knowledge Moat - Success Pattern Journeys
 * Added: 2025-10-16 (Week 13)
 */
export const getSuccessPatternsTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_success_patterns',
    description: 'Find success journeys from students with similar profiles/barriers who achieved breakthrough outcomes. Returns comprehensive longitudinal patterns showing tactics used, breakthrough moments, and measurable results across 16 success dimensions (awards, EC scale, time management, essay quality, GPA boost, etc.).',
    parameters: {
      type: 'object',
      properties: {
        archetype_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Student archetype tags for matching "students like me" (e.g., "first-gen-immigrant", "muslim-female", "STEM", "public-school", "time-crisis")'
        },
        barriers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Barriers student is facing (e.g., "time-crisis", "procrastination", "generic-narrative", "identity-hiding", "low-differentiation")'
        },
        outcome_category: {
          type: 'string',
          enum: ['National Award Win', 'Regional/State Award', 'EC User/Impact Scale Growth', 'EC Funding & Resources', 'EC Leadership Acquisition', 'GPA/Grade Improvement', 'Test Score Breakthrough', 'Time Management System', 'Activity Output Acceleration', 'Essay Quality Transformation', 'Identity & Positioning Clarity', 'Technical Skill Mastery', 'Portfolio & Showcase Creation', 'Community Impact Growth', 'Barrier Breaking Moment', 'Coach-Student Trust Building'],
          description: 'Desired success outcome to achieve'
        },
        tactics_used: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific tactics of interest to see in action (e.g., "168-hour-framework", "parent-story-reframe")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of patterns to return (default: 3)'
        }
      },
      required: []
    }
  }
};

// ==============================================================================
// NSM (North Star Metrics) Tools - v1.0
// ==============================================================================

export const getNSMDashboardTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_nsm_dashboard',
    description: 'Get comprehensive North Star Metrics dashboard showing recognition (awards), leadership (ECs), academic (test scores), and program vitals. Use when student asks for overall profile status or comprehensive metrics.',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID (e.g., STU001, huda-2025)'
        }
      },
      required: ['student_id']
    }
  }
};

export const getNSMRecognitionTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_nsm_recognition',
    description: 'Get recognition vitals: national/regional/local awards won, total awards attempted, award win rate. Use when discussing awards strategy or student asks "how many awards have I won?"',
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

export const getNSMLeadershipTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_nsm_leadership',
    description: 'Get leadership vitals: leadership ECs count, president roles, founder positions, total ECs. Use when discussing extracurriculars or student asks about leadership activities.',
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

export const getNSMAcademicTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_nsm_academic',
    description: 'Get academic test vitals: latest SAT/ACT scores, AP exams passed/perfect. Use when student asks about test scores.',
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

export const getNSMProgramTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_nsm_program',
    description: 'Get summer program vitals: programs applied, programs accepted, prestigious programs (RSI, TASP, SSP). Use when discussing summer programs or student asks about acceptances.',
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

// ==============================================================================
// JTBD (Weekly Execution) Tools - Week 17
// ==============================================================================

export const getJTBDWeekTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_jtbd_week',
    description: 'Get all jobs (completed/pending/in-progress) for a specific week number. Shows total jobs, completion rate, and detailed job descriptions. Use when student asks "what did I do in week 8?" or "week 12 progress".',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID (e.g., STU001, huda-2025)'
        },
        week_number: {
          type: 'number',
          description: 'Week number (e.g., 8, 12, 20)'
        }
      },
      required: ['student_id', 'week_number']
    }
  }
};

export const getJTBDCompletedTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_jtbd_completed',
    description: 'Get all completed jobs chronologically (most recent first). Shows wins, outcomes, completion dates. Use when student asks "what have I completed?" or "show my accomplishments".',
    parameters: {
      type: 'object',
      properties: {
        student_id: {
          type: 'string',
          description: 'Student UUID'
        },
        limit: {
          type: 'number',
          description: 'Max number of jobs to return (default: 10, max: 50)'
        }
      },
      required: ['student_id']
    }
  }
};

export const getJTBDPendingTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_jtbd_pending',
    description: 'Get all pending/in-progress jobs. Shows what needs to be done, deadlines, status. Use when student asks "what do I need to do?" or "pending tasks".',
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

export const getJTBDProgressionTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_jtbd_progression',
    description: 'Get week-over-week progression showing completion rates, trends, cumulative progress. Use when student asks "am I on track?" or "execution trends".',
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

export const getJTBDMilestonesTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_jtbd_milestones',
    description: 'Get EC milestones only (major achievements like "reached 1000 users", "won award", "launched feature"). Use when celebrating wins or showing impact.',
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

// ==============================================================================
// Scholarship Tools (Week 18)
// ==============================================================================

export const getScholarshipsListTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_scholarships_list',
    description: 'Get all scholarships for a student (applied, pending, accepted, rejected). Sorted by status priority (accepted first). Use when student asks "show my scholarships" or "scholarship list".',
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

export const getScholarshipsAcceptedTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_scholarships_accepted',
    description: 'Get accepted scholarships only. Sorted by award amount (highest first). Use when student asks "which scholarships did I win?" or "scholarship acceptances".',
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

export const getScholarshipsPendingTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_scholarships_pending',
    description: 'Get pending/applied scholarships (awaiting decision). Sorted by decision date. Use when student asks "what scholarships am I waiting on?".',
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

export const getScholarshipsSummaryTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_scholarships_summary',
    description: 'Get scholarship summary statistics (total scholarships, accepted/pending/rejected counts, total money awarded, acceptance rate). Use when student asks "scholarship summary" or "how much money did I win?".',
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

    case 'get_college_list':
      return await resolvers.collegeList(pool, args.student_id, args.bucket ? { bucket: args.bucket } : {});

    case 'get_college_acceptances':
      return await resolvers.collegeAcceptances(pool, args.student_id);

    case 'get_college_attending':
      return await resolvers.collegeAttending(pool, args.student_id);

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

    case 'search_essay_examples':
      const essays = await knowledgeMoat.searchEssayExamples({
        collegeName: args.college_name,
        promptType: args.prompt_type,
        themes: args.themes,
        limit: args.limit || 3
      });
      return {
        answer: essays.length > 0
          ? essays.map((e, i) => {
              const themesStr = e.themes ? e.themes.join(', ') : '';
              return `${i + 1}. ${e.college_name} - ${e.prompt_type} (${e.writing_quality})\nThemes: ${themesStr}\nExcerpt: ${e.essay_text.substring(0, 150)}...`;
            }).join('\n\n')
          : 'No essay examples found',
        chips: [{ kind: 'evidence', text: 'moat_essay_examples' }],
        hits: essays
      };

    case 'get_ao_perspectives':
      const perspectives = await knowledgeMoat.getAOPerspectives({
        collegeName: args.college_name,
        topic: args.topic,
        selectivity: args.selectivity,
        limit: args.limit || 3
      });
      return {
        answer: perspectives.length > 0
          ? perspectives.map((p, i) => {
              const keyPoints = p.key_points ? p.key_points.join('; ') : '';
              return `${i + 1}. ${p.college_name} ${p.ao_role} on ${p.topic}:\n"${p.question}"\n\nKey Points: ${keyPoints}\n\n${p.perspective_text.substring(0, 200)}...`;
            }).join('\n\n---\n\n')
          : 'No AO perspectives found',
        chips: [{ kind: 'evidence', text: 'moat_ao_perspectives' }],
        hits: perspectives
      };

    case 'get_relevant_tactics':
      const tactics = await knowledgeMoat.searchTacticChips({
        barriers: args.barriers,
        archetypes: args.archetypes,
        category: args.category,
        minQualityScore: 0.90,
        limit: args.limit || 3
      });
      return {
        answer: tactics.length > 0
          ? tactics.map((t, i) => {
              const microActions = t.micro_actions ? Object.entries(t.micro_actions).map(([step, data]: [string, any]) =>
                `  ${step}: ${data.action} (e.g., "${data.example}")`
              ).join('\n') : '';
              const outcomes = t.typical_outcomes ? Object.entries(t.typical_outcomes).map(([key, val]) =>
                `${key}: ${val}`
              ).join(', ') : '';
              return `${i + 1}. ${t.tactic_name} (Quality: ${t.quality_score})\nCategory: ${t.tactic_category}\nPrinciple: ${t.core_principle}\n\nMicro-Actions:\n${microActions}\n\nTypical Outcomes: ${outcomes}\n\nDuration: ${t.estimated_duration || 'varies'}`;
            }).join('\n\n---\n\n')
          : 'No relevant tactics found',
        chips: [{ kind: 'evidence', text: 'moat_tactic_chips' }],
        hits: tactics
      };

    case 'get_success_patterns':
      const patterns = await knowledgeMoat.searchSuccessPatterns({
        archetypeTags: args.archetype_tags,
        barriers: args.barriers,
        outcomeCategory: args.outcome_category,
        tacticsUsed: args.tactics_used,
        minQualityScore: 0.90,
        limit: args.limit || 3
      });
      return {
        answer: patterns.length > 0
          ? patterns.map((p, i) => {
              const archetypes = p.archetype_tags ? p.archetype_tags.join(', ') : '';
              const barriers = p.barriers_faced ? p.barriers_faced.join(', ') : '';
              const tactics = p.most_impactful ? p.most_impactful.join(', ') : '';
              const startingStats = p.starting_stats ?
                `GPA: ${p.starting_stats.gpa || 'N/A'}, SAT: ${p.starting_stats.sat || 'N/A'}` : '';
              const outcomes = p.final_outcomes ?
                JSON.stringify(p.final_outcomes, null, 2) : '';
              const whatWorked = p.what_worked || '';
              const advice = p.advice_to_similar || '';
              const whatClicked = p.what_clicked ? `\n\n💡 What Clicked: ${p.what_clicked}` : '';

              return `${i + 1}. ${p.title} (Quality: ${p.quality_score})
Outcome Category: ${p.outcome_category}
Duration: ${p.total_duration_days || 0} days
Archetype: ${archetypes}
Starting Barriers: ${barriers}

📊 Starting Stats: ${startingStats}

🎯 Most Impactful Tactics: ${tactics}

🏆 Final Outcomes: ${outcomes}

✅ What Worked:
${whatWorked}${whatClicked}

💬 Advice to Similar Students:
${advice}`;
            }).join('\n\n' + '='.repeat(80) + '\n\n')
          : 'No success patterns found matching your criteria',
        chips: [{ kind: 'evidence', text: 'moat_student_success_patterns' }],
        hits: patterns
      };

    // NSM Tools (v1.0)
    case 'get_nsm_dashboard':
      return await nsmResolvers.nsmDashboard(pool, args.student_id);

    case 'get_nsm_recognition':
      return await nsmResolvers.recognitionVitals(pool, args.student_id);

    case 'get_nsm_leadership':
      return await nsmResolvers.leadershipVitals(pool, args.student_id);

    case 'get_nsm_academic':
      return await nsmResolvers.academicVitals(pool, args.student_id);

    case 'get_nsm_program':
      return await nsmResolvers.programVitals(pool, args.student_id);

    // JTBD Tools (Week 17: WeeklyExecutionAgent)
    case 'get_jtbd_week':
      const weekData = await jtbd.byWeek(pool, args.student_id, args.week_number);
      if (weekData) {
        const completionRate = weekData.total_jobs > 0
          ? Math.round((weekData.completed_jobs / weekData.total_jobs) * 100)
          : 0;
        return {
          answer: `Week ${args.week_number}: ${weekData.completed_jobs}/${weekData.total_jobs} jobs completed (${completionRate}%)`,
          chips: [{ kind: 'evidence', text: 'v_jtbd_weekly_by_week' }],
          hits: [{ ...weekData, completion_rate: completionRate }]
        };
      } else {
        return {
          answer: `No data for week ${args.week_number}`,
          chips: [{ kind: 'evidence', text: 'v_jtbd_weekly_by_week' }],
          hits: []
        };
      }

    case 'get_jtbd_completed':
      const completed = await jtbd.recentCompleted(pool, args.student_id, args.limit || 10);
      return {
        answer: completed.length > 0 ? `Completed ${completed.length} jobs` : 'No completed jobs yet',
        chips: [{ kind: 'evidence', text: 'v_jtbd_weekly_completed' }],
        hits: completed
      };

    case 'get_jtbd_pending':
      const pending = await jtbd.pending(pool, args.student_id);
      return {
        answer: pending.length > 0 ? `${pending.length} pending jobs` : 'No pending jobs',
        chips: [{ kind: 'evidence', text: 'v_jtbd_weekly_pending' }],
        hits: pending
      };

    case 'get_jtbd_progression':
      const progression = await jtbd.progression(pool, args.student_id);
      return {
        answer: progression.length > 0 ? `${progression.length} weeks tracked` : 'No progression data',
        chips: [{ kind: 'evidence', text: 'v_jtbd_weekly_progression' }],
        hits: progression
      };

    case 'get_jtbd_milestones':
      const milestones = await jtbd.milestones(pool, args.student_id);
      return {
        answer: milestones.length > 0 ? `${milestones.length} milestones achieved` : 'No milestones yet',
        chips: [{ kind: 'evidence', text: 'v_jtbd_weekly_completed (ec_milestone)' }],
        hits: milestones
      };

    // Scholarship Tools (Week 18)
    case 'get_scholarships_list':
      const allScholarships = await scholarships.list(pool, args.student_id);
      return {
        answer: allScholarships.length > 0
          ? `Found ${allScholarships.length} scholarships (${allScholarships.filter(s => s.application_status === 'Accepted').length} accepted)`
          : 'No scholarships found',
        chips: [{ kind: 'evidence', text: 'scholarships' }],
        hits: allScholarships
      };

    case 'get_scholarships_accepted':
      const acceptedScholarships = await scholarships.accepted(pool, args.student_id);
      const totalAwarded = acceptedScholarships.reduce((sum, s) => sum + (parseFloat(s.amount_usd) || 0), 0);
      return {
        answer: acceptedScholarships.length > 0
          ? `${acceptedScholarships.length} scholarships accepted, total awarded: $${totalAwarded.toLocaleString()}`
          : 'No accepted scholarships yet',
        chips: [{ kind: 'evidence', text: 'scholarships (accepted)' }],
        hits: acceptedScholarships
      };

    case 'get_scholarships_pending':
      const pendingScholarships = await scholarships.pending(pool, args.student_id);
      const totalPending = pendingScholarships.reduce((sum, s) => sum + (parseFloat(s.amount_usd) || 0), 0);
      return {
        answer: pendingScholarships.length > 0
          ? `${pendingScholarships.length} scholarships pending, potential value: $${totalPending.toLocaleString()}`
          : 'No pending scholarships',
        chips: [{ kind: 'evidence', text: 'scholarships (pending)' }],
        hits: pendingScholarships
      };

    case 'get_scholarships_summary':
      const summary = await scholarships.summary(pool, args.student_id);
      return {
        answer: `Total scholarships: ${summary.total_scholarships} (${summary.accepted_count} accepted, ${summary.pending_count} pending). Total awarded: $${parseFloat(summary.total_awarded_usd).toLocaleString()}. Acceptance rate: ${summary.acceptance_rate || 0}%`,
        chips: [{ kind: 'evidence', text: 'scholarships (summary)' }],
        hits: [summary]
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
  getCollegeListTool,
  getCollegeAcceptancesTool,
  getCollegeAttendingTool,
  getGamePlanTool,
  getVitalsTool,

  // Knowledge Moat tools
  getCollegeBenchmarkTool,
  getCollegeRubricTool,
  getPlacementHistoryTool,
  findSimilarProfilesTool,
  getSummerProgramsCatalogTool,
  searchEssayExamplesTool,
  getAOPerspectivesTool,
  getRelevantTacticsTool,  // DS-T1: Tactic Chips (Week 12)
  getSuccessPatternsTool,   // DS-T2: Success Patterns (Week 13)

  // NSM tools (Week 17)
  getNSMDashboardTool,
  getNSMRecognitionTool,
  getNSMLeadershipTool,
  getNSMAcademicTool,
  getNSMProgramTool,

  // JTBD tools (Week 17: WeeklyExecutionAgent)
  getJTBDWeekTool,
  getJTBDCompletedTool,
  getJTBDPendingTool,
  getJTBDProgressionTool,
  getJTBDMilestonesTool,

  // Scholarship tools (Week 18: ScholarshipAgent)
  getScholarshipsListTool,
  getScholarshipsAcceptedTool,
  getScholarshipsPendingTool,
  getScholarshipsSummaryTool,
];

/**
 * Get tools for a specific agent based on its domain
 */
export function getToolsForAgent(agentType: 'gameplan' | 'ecs' | 'awards' | 'programs' | 'college' | 'essay' | 'admissions' | 'weekly-execution' | 'scholarship' | 'all'): ChatCompletionTool[] {
  switch (agentType) {
    case 'gameplan':
      return [getGamePlanTool, getVitalsTool, getECsListTool, getAwardsListTool, getSummerProgramsListTool, getCollegeListTool, getCollegeAcceptancesTool, getCollegeAttendingTool, getNSMDashboardTool, getNSMRecognitionTool, getNSMLeadershipTool, getNSMAcademicTool, getNSMProgramTool, getRelevantTacticsTool, getSuccessPatternsTool];

    case 'ecs':
      return [getECsListTool, getVitalsTool, getRelevantTacticsTool, getSuccessPatternsTool];

    case 'awards':
      return [getAwardsListTool, getVitalsTool, getSuccessPatternsTool];

    case 'programs':
      return [getSummerProgramsListTool, getSummerProgramsCatalogTool, getVitalsTool, getSuccessPatternsTool];

    case 'college':
      return [
        getCollegeListTool,          // CAT-1: Student's actual college list
        getCollegeAcceptancesTool,   // CAT-1: Acceptances only
        getCollegeAttendingTool,     // CAT-1: Final decision
        getCollegeBenchmarkTool,     // Knowledge Moat DS1
        getCollegeRubricTool,        // Knowledge Moat DS2
        getPlacementHistoryTool,     // Knowledge Moat DS3
        findSimilarProfilesTool,     // Knowledge Moat DS5
        getVitalsTool,
        getSATScoresTool,
        getGPATool,
        getRelevantTacticsTool,      // Positioning tactics (Identity as Differentiator, etc.)
        getSuccessPatternsTool
      ];

    case 'essay':
      return [
        searchEssayExamplesTool,
        getAOPerspectivesTool,
        getVitalsTool,
        getRelevantTacticsTool,  // Essay tactics (Parent Story Reframe, etc.)
        getSuccessPatternsTool    // Essay success journeys
      ];

    case 'admissions':
      return [
        getAOPerspectivesTool,
        getCollegeRubricTool,
        getVitalsTool,
        getSuccessPatternsTool
      ];

    case 'weekly-execution':
      return [
        getJTBDWeekTool,
        getJTBDCompletedTool,
        getJTBDPendingTool,
        getJTBDProgressionTool,
        getJTBDMilestonesTool,
        getRelevantTacticsTool,  // Execution tactics (time-crisis, procrastination, etc.)
        getSuccessPatternsTool,
        getVitalsTool
      ];

    case 'scholarship':
      return [
        getScholarshipsListTool,
        getScholarshipsAcceptedTool,
        getScholarshipsPendingTool,
        getScholarshipsSummaryTool,
        getRelevantTacticsTool,  // Scholarship application strategies
        getSuccessPatternsTool,
        getVitalsTool
      ];

    case 'all':
    default:
      return ALL_RESOLVER_TOOLS;
  }
}
