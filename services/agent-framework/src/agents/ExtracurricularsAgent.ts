/**
 * ExtracurricularsAgent.ts
 * Agent specialized in extracurricular activities strategy and optimization
 * Created: 2025-10-16 (Phase 1, Week 3)
 */

import { BaseAgent } from '../core/BaseAgent.js';
import type { AgentManifest, AgentExecutionContext } from '../core/types.js';
import { getToolsForAgent } from '../tools/resolverTools.js';

/**
 * ExtracurricularsAgent - Extracurricular Activities Specialist
 *
 * Handles queries about:
 * - Current extracurricular activities
 * - EC portfolio optimization
 * - Leadership roles and impact
 * - Tier classification and competitiveness
 * - EC narrative development
 */
export class ExtracurricularsAgent extends BaseAgent {
  constructor() {
    const manifest: AgentManifest = {
      agent_id: 'ecs-agent',
      display_name: 'Jenny - Extracurriculars Advisor',
      tagline: 'your extracurricular activities strategist',
      version: '1.0.0',
      category: 'ecs',

      // Tools this agent can use
      tools: getToolsForAgent('ecs'),

      // Intents this agent handles
      intents: [
        {
          intent_id: 'ecs.list',
          category: 'ecs',
          patterns: [
            'what are my extracurriculars',
            'show me my ecs',
            'list my activities',
            'what activities do i have',
            'my extracurriculars',
          ],
          priority: 1,
        },
        {
          intent_id: 'ecs.analysis',
          category: 'ecs',
          patterns: [
            'analyze my ecs',
            'how are my extracurriculars',
            'evaluate my activities',
            'ec portfolio strength',
            'activity tier',
          ],
          priority: 2,
        },
        {
          intent_id: 'ecs.recommendations',
          category: 'ecs',
          patterns: [
            'how can i improve my ecs',
            'what activities should i add',
            'ec recommendations',
            'strengthen my extracurriculars',
            'what leadership should i pursue',
          ],
          priority: 3,
        },
        {
          intent_id: 'ecs.impact',
          category: 'ecs',
          patterns: [
            'demonstrate impact',
            'show leadership',
            'quantify my contributions',
            'ec achievements',
            'measure my impact',
          ],
          priority: 3,
        },
      ],

      // Jobs to be Done
      jtbd: {
        student:
          'I want to understand how my extracurricular activities position me for college admissions and what I can do to strengthen them',
        parent:
          'I want to see my child's extracurricular involvement and ensure they're developing meaningful impact',
        success_metric: 'Student has clear understanding of EC strengths, gaps, and next steps',
      },

      // Model configuration
      temperature: 0.7,
      max_tokens: 600,

      // Handoffs
      handoffs: ['gameplan-agent', 'awards-agent', 'programs-agent'],
    };

    super(manifest);
  }

  /**
   * Override system prompt with EC-specific guidance
   */
  protected buildSystemPrompt(context: AgentExecutionContext): string {
    const basePrompt = super.buildSystemPrompt(context);
    const studentContext = context.session.context;

    return `${basePrompt}

Your Specialty: Extracurricular Activities Strategy

You excel at:
- Analyzing EC portfolios for depth vs. breadth
- Identifying tier levels (National/State/Regional/School)
- Spotting leadership gaps and opportunities
- Crafting compelling activity narratives
- Connecting ECs to college application themes

EC Tier Classification:
- **Tier 1 (Spike):** National/international recognition, exceptional achievement
  Examples: USAMO qualifier, national debate champion, published research
- **Tier 2 (Strong):** State-level recognition, significant regional impact
  Examples: State science fair finalist, regional orchestra principal, county-wide service impact
- **Tier 3 (Good):** School/local leadership, meaningful involvement
  Examples: Club president, varsity captain, community volunteer coordinator
- **Tier 4 (Participating):** Membership without leadership, basic involvement
  Examples: Club member, team participant

Your Analysis Framework:
1. **Depth** - Years of commitment, progression, leadership growth
2. **Impact** - Measurable outcomes, people affected, problems solved
3. **Initiative** - Founded/created vs. joined existing
4. **Alignment** - How activities connect to intended major/theme
5. **Authenticity** - Genuine passion vs. resume padding

Your Communication Style:
- Start with strengths, then gaps (positive → constructive)
- Use specific examples from their data
- Quantify impact when possible ("You've led X members" not "you have leadership")
- Connect ECs to specific college values (e.g., "Stanford values intellectual vitality - your research shows this")
- Give actionable next steps with timelines

Example Good Response:
"Your EC portfolio shows strong STEM commitment:

**Strengths:**
1. **Robotics Team (3 years, Captain)** - Tier 2
   - Led 15-member team to regional finals
   - Clear technical leadership and team management

2. **Science Research (2 years)** - Tier 2
   - Published in youth science journal
   - Shows intellectual initiative

**Opportunities:**
1. **Depth Over Breadth** - Your 7 activities are solid, but consider dropping 2-3 weaker ones to show deeper commitment to robotics + research
2. **Community Impact** - Add STEM outreach (teach coding to middle schoolers?) to demonstrate broader impact beyond personal achievement

**Next Steps (Next 2 Months):**
- Apply to 2-3 summer robotics programs to elevate to potential Tier 1
- Start documenting research impact metrics (citations, presentations)
- Consider founding STEM tutoring initiative at local library"

Current Student Stats:
${studentContext.ecs_count ? `- ${studentContext.ecs_count} ECs on record` : '- No EC count available'}
- Grade: ${studentContext.grade || 'Unknown'}

Always ground your analysis in their actual activities from the database.`;
  }
}
