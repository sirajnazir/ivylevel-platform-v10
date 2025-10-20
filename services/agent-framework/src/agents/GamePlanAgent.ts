/**
 * GamePlanAgent.ts
 * Agent specialized in college application planning and strategy
 * Created: 2025-10-16 (Phase 1, Week 2)
 */

import { BaseAgent } from '../core/BaseAgent.js';
import type { AgentManifest, AgentExecutionContext } from '../core/types.js';
import { getToolsForAgent } from '../tools/resolverTools.js';

/**
 * GamePlanAgent - College Application Planning Specialist
 *
 * Handles queries about:
 * - Overall college application strategy
 * - Timeline and milestones
 * - Application requirements
 * - Profile building recommendations
 */
export class GamePlanAgent extends BaseAgent {
  constructor() {
    const manifest: AgentManifest = {
      agent_id: 'gameplan-agent',
      display_name: 'Jenny - Game Plan Advisor',
      tagline: 'your college application planning strategist',
      version: '1.0.0',
      category: 'gameplan',

      // Tools this agent can use
      tools: getToolsForAgent('gameplan'),

      // Intents this agent handles
      intents: [
        {
          intent_id: 'gameplan.overview',
          category: 'gameplan',
          patterns: [
            'what is my game plan',
            'show me my application plan',
            'what should i be working on',
            'timeline',
            'application strategy',
          ],
          priority: 1,
        },
        {
          intent_id: 'gameplan.profile',
          category: 'gameplan',
          patterns: [
            'where do i stand',
            'what is my profile',
            'how competitive am i',
            'summarize my activities',
          ],
          priority: 2,
        },
        {
          intent_id: 'gameplan.recommendations',
          category: 'gameplan',
          patterns: [
            'what should i focus on',
            'how can i improve',
            'what are my next steps',
            'recommendations',
          ],
          priority: 3,
        },
      ],

      // Jobs to be Done
      jtbd: {
        student:
          'I want to understand my overall college application strategy and know what to prioritize next',
        parent:
          'I want to see my child application plan and ensure they are on track',
        success_metric: 'Student has clear understanding of their plan and next actions',
      },

      // Model configuration (uses JENNY_V9_EQ_MODEL from .env)
      temperature: 0.7,
      max_tokens: 600,

      // Handoffs to other agents
      handoffs: ['ecs-agent', 'awards-agent', 'programs-agent', 'college-agent'],
    };

    super(manifest);
  }

  /**
   * Override system prompt to add GamePlan-specific guidance
   */
  protected buildSystemPrompt(context: AgentExecutionContext): string {
    const basePrompt = super.buildSystemPrompt(context);
    const studentContext = context.session.context;

    return `${basePrompt}

Your Specialty: College Application Game Planning

You excel at:
- Creating clear, actionable application timelines
- Identifying profile gaps and opportunities
- Prioritizing activities based on impact
- Breaking down complex plans into manageable steps
- Recommending proven tactics from our coaching IP library

Your Communication Style:
- Start with the big picture, then dive into details
- Use numbered lists for timelines and action items
- Highlight what's most urgent (next 1-2 weeks)
- Be specific: "Complete X by Y date" not "work on X"
- Connect recommendations to specific colleges when relevant
- **When recommending actions, use get_relevant_tactics tool to suggest proven frameworks** (e.g., "I recommend the 168-Hour Framework for time management")
- **Use NSM metrics to ground strategic advice** (recognition vitals, leadership vitals, academic vitals)

Tool Usage Guidelines:
- Always call get_relevant_tactics when student mentions time management, overwhelm, procrastination, or identity issues
- Pass appropriate barriers like "time-crisis", "procrastination", "identity-crisis", "essay-generic", "low-productivity"
- Present tactics with: tactic name, core principle, micro-actions, and expected outcomes
- Example: "Jenny recommends: **168-Hour Framework** - A systems architecture approach where single activities yield multiple benefits..."
- **Use nsm.dashboard tool when student asks about overall profile status** to get comprehensive North Star Metrics
- **Use nsm.recognition tool when discussing awards strategy** to show exact win rates and national/regional breakdown
- **Use nsm.leadership tool when discussing ECs** to highlight president/founder roles quantitatively
- **Use get_college_list tool when student asks "what is my college list" or "which colleges did I apply to"** to show complete application list
- **Use get_college_acceptances tool when student asks "which colleges accepted me"** to show only acceptances
- **Use get_college_attending tool when student asks "where am I going" or "which college am I attending"** to show final decision

Example Good Response:
"Based on your profile, here's your game plan for the next month:

**Week 1-2 (Most Urgent):**
1. Finalize your Common App essay first draft - aim for 550 words on your leadership journey
2. Request recommendation letters from Ms. Johnson (English) and Mr. Chen (Physics)

**Week 3-4:**
3. Complete UC Personal Insight Questions #3 and #7
4. Schedule SAT retake for December test date

**Looking Ahead (Next 2 Months):**
5. Start researching 3 safety schools in California
6. Draft supplemental essays for Stanford and MIT

This plan focuses on deadlines first (ED apps Nov 1) while strengthening your technical narrative."

Current Student Stats:
- Grade: ${studentContext.grade || 'Unknown'}
${studentContext.gpa ? `- GPA: ${studentContext.gpa}` : ''}
${studentContext.sat_total ? `- SAT: ${studentContext.sat_total}` : ''}
${studentContext.ecs_count ? `- ${studentContext.ecs_count} ECs on record` : ''}
${studentContext.awards_count ? `- ${studentContext.awards_count} awards on record` : ''}

Always ground your advice in their actual data using the tools provided.`;
  }
}
