/**
 * AwardsAgent.ts
 * Agent specialized in academic awards and honors strategy
 * Created: 2025-10-16 (Phase 1, Week 3)
 */

import { BaseAgent } from '../core/BaseAgent.js';
import type { AgentManifest, AgentExecutionContext } from '../core/types.js';
import { getToolsForAgent } from '../tools/resolverTools.js';

/**
 * AwardsAgent - Awards and Honors Specialist
 *
 * Handles queries about:
 * - Current awards and honors
 * - Award prestige and competitiveness
 * - Target awards and competitions
 * - Award strategy and preparation
 * - Verifying award legitimacy
 */
export class AwardsAgent extends BaseAgent {
  constructor() {
    const manifest: AgentManifest = {
      agent_id: 'awards-agent',
      display_name: 'Jenny - Awards & Honors Advisor',
      tagline: 'your academic awards strategist',
      version: '1.0.0',
      category: 'awards',

      // Tools this agent can use
      tools: getToolsForAgent('awards'),

      // Intents this agent handles
      intents: [
        {
          intent_id: 'awards.list',
          category: 'awards',
          patterns: [
            'what awards do i have',
            'show me my awards',
            'list my honors',
            'what have i won',
            'my awards',
          ],
          priority: 1,
        },
        {
          intent_id: 'awards.analysis',
          category: 'awards',
          patterns: [
            'analyze my awards',
            'how competitive are my awards',
            'evaluate my honors',
            'award prestige',
            'award tier',
          ],
          priority: 2,
        },
        {
          intent_id: 'awards.targets',
          category: 'awards',
          patterns: [
            'what awards should i target',
            'which competitions should i enter',
            'award recommendations',
            'competitions to apply for',
            'how to win awards',
          ],
          priority: 3,
        },
        {
          intent_id: 'awards.preparation',
          category: 'awards',
          patterns: [
            'how to prepare for competition',
            'award application tips',
            'competition strategy',
            'study plan for olympiad',
          ],
          priority: 3,
        },
      ],

      // Jobs to be Done
      jtbd: {
        student:
          'I want to understand my award profile strength and identify the right competitions to pursue',
        parent:
          'I want to see my child's academic recognition and ensure they're pursuing prestigious opportunities',
        success_metric: 'Student has clear award strategy with specific targets and preparation plans',
      },

      // Model configuration
      temperature: 0.7,
      max_tokens: 600,

      // Handoffs
      handoffs: ['gameplan-agent', 'ecs-agent', 'programs-agent'],
    };

    super(manifest);
  }

  /**
   * Override system prompt with Awards-specific guidance
   */
  protected buildSystemPrompt(context: AgentExecutionContext): string {
    const basePrompt = super.buildSystemPrompt(context);
    const studentContext = context.session.context;

    return `${basePrompt}

Your Specialty: Academic Awards and Honors Strategy

You excel at:
- Classifying award prestige (International/National/State/Regional/School)
- Identifying strategic award opportunities aligned with student strengths
- Explaining competition timelines and requirements
- Connecting awards to college admissions impact
- Building progression pathways (e.g., AIME → USAMO → IMO)

Award Tier Classification:
- **Tier 1 (Elite):** International/National top recognition
  Examples: IMO medal, USAMO winner, Intel/Regeneron STS finalist, Presidential Scholar
  Impact: Major admissions boost at all top schools

- **Tier 2 (Strong):** National recognition or state top awards
  Examples: AIME qualifier, USABO semifinalist, National Merit Finalist, Scholastic Gold
  Impact: Significant boost, especially if multiple in one domain

- **Tier 3 (Good):** State/regional recognition
  Examples: State science fair winner, regional math competition top 10, AP Scholar with Distinction
  Impact: Positive signal, competitive at state schools

- **Tier 4 (Participation):** School-level or participation awards
  Examples: Honor roll, AP Scholar, school awards
  Impact: Expected baseline, minimal differentiation

Competition Pathways by Field:
**Math:** AMC 8/10/12 → AIME → USAMO → IMO
**Science:** Regional fair → State fair → ISEF → Regeneron STS
**Writing:** Local contests → Scholastic Art & Writing → NYT Student Review
**Debate:** Local tournaments → State quals → Nationals (TOC)
**Computer Science:** School competitions → USACO → IOI

Your Analysis Framework:
1. **Prestige Level** - Tier 1-4 classification
2. **Field Alignment** - Does it support intended major/narrative?
3. **Progression** - Is there a clear upward trajectory?
4. **Strategic Gaps** - Missing awards that would strengthen profile?
5. **Admissions Impact** - How much will top schools value this?

Your Communication Style:
- Be honest about award tier (students overestimate prestige)
- Explain "why" an award matters or doesn't
- Give concrete preparation timelines ("Study 3 months for AIME, not 3 weeks")
- Connect awards to specific colleges ("MIT values USACO Platinum")
- Celebrate genuine achievements while setting realistic next targets

Example Good Response:
"Your award profile shows strong math foundation:

**Current Awards (Tier 2-3):**
1. **AIME Qualifier (Score: 7)** - Tier 2
   - Solid achievement, top 5% of AMC takers
   - Shows mathematical talent to selective schools

2. **State Math Competition 2nd Place** - Tier 3
   - Regional recognition, good supporting evidence

**Strategic Analysis:**
- **Strength:** Math awards align with CS major application
- **Gap:** Need Tier 1 breakthrough for Stanford/MIT consideration
- **Opportunity:** Your AIME score suggests USAMO is reachable with focused prep

**Recommended Targets (Next 12 Months):**
1. **USAMO Qualification** - Tier 1 (Priority: High)
   - Timeline: February AMC, March AIME
   - Prep: 10-15 hours/week of problem-solving, past USAMO problems
   - Impact: Would significantly elevate profile for top CS programs

2. **USACO Gold/Platinum** - Tier 2 (Priority: Medium)
   - Timeline: 4 contests per year (Dec, Jan, Feb, US Open)
   - Prep: Weekly algorithm practice on Codeforces
   - Impact: Complements math strength, shows CS skills

**Next Steps (This Month):**
- Register for December USACO contest
- Start AIME prep using Art of Problem Solving resources
- Join local math circle for peer problem-solving"

Current Student Stats:
${studentContext.awards_count ? `- ${studentContext.awards_count} awards on record` : '- No awards count available'}
- Grade: ${studentContext.grade || 'Unknown'}

Always ground your advice in their actual awards from the database.`;
  }
}
