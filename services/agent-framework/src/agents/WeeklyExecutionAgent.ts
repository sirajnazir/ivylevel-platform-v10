/**
 * WeeklyExecutionAgent.ts
 * Agent specialized in weekly tactical execution tracking and guidance
 * Created: 2025-10-17 (Week 17)
 *
 * Focus: JTBD (Jobs-to-be-Done) tracking, week-over-week progress, tactical execution
 */

import { BaseAgent } from '../core/BaseAgent.js';
import type { AgentManifest, AgentExecutionContext } from '../core/types.js';
import { getToolsForAgent } from '../tools/resolverTools.js';

/**
 * WeeklyExecutionAgent - Weekly Tactical Execution Specialist
 *
 * Handles queries about:
 * - Weekly jobs completed/pending
 * - Week-over-week progression
 * - Execution rate tracking
 * - Tactical milestones
 * - Next week planning
 */
export class WeeklyExecutionAgent extends BaseAgent {
  constructor() {
    const manifest: AgentManifest = {
      agent_id: 'weekly-execution-agent',
      display_name: 'Jenny - Weekly Execution Coach',
      tagline: 'your weekly tactical execution guide',
      version: '1.0.0',
      category: 'execution',

      // Tools this agent can use
      tools: getToolsForAgent('weekly-execution'),

      // Intents this agent handles
      intents: [
        {
          intent_id: 'execution.weekly',
          category: 'execution',
          patterns: [
            'what did I accomplish this week',
            'week 8 progress',
            'what have I completed',
            'show my weekly progress',
            'this week jobs',
            'what did I finish',
          ],
          priority: 1,
        },
        {
          intent_id: 'execution.pending',
          category: 'execution',
          patterns: [
            'what do I need to do',
            'pending tasks',
            'what is left',
            'upcoming deadlines',
            'next week tasks',
            'what should I work on',
          ],
          priority: 2,
        },
        {
          intent_id: 'execution.progression',
          category: 'execution',
          patterns: [
            'my execution rate',
            'completion rate over time',
            'week over week progress',
            'am I on track',
            'execution trends',
          ],
          priority: 3,
        },
        {
          intent_id: 'execution.planning',
          category: 'execution',
          patterns: [
            'plan next week',
            'what should I prioritize',
            'next steps',
            'weekly priorities',
          ],
          priority: 4,
        },
      ],

      // Jobs to be Done
      jtbd: {
        student:
          'I want to track my weekly progress and know what to focus on next',
        parent:
          'I want to see my child week-over-week execution and completion rates',
        success_metric: 'Student stays on track with consistent weekly execution',
      },

      // Model configuration (uses JENNY_V9_EQ_MODEL from .env)
      temperature: 0.7,
      max_tokens: 600,

      // Handoffs to other agents
      handoffs: ['gameplan-agent', 'ecs-agent', 'awards-agent', 'essay-agent'],
    };

    super(manifest);
  }

  /**
   * Override system prompt to add Weekly Execution-specific guidance
   */
  protected buildSystemPrompt(context: AgentExecutionContext): string {
    const basePrompt = super.buildSystemPrompt(context);
    const studentContext = context.session.context;

    return `${basePrompt}

Your Specialty: Weekly Tactical Execution & Progress Tracking

You excel at:
- Tracking week-by-week job completion
- Identifying execution trends and patterns
- Celebrating wins (completed jobs)
- Highlighting what's pending/at-risk
- Recommending tactical next steps for the upcoming week
- Connecting execution to strategic goals (via GamePlanAgent handoff)

Your Communication Style:
- Start with celebration: "Here's what you crushed this week..."
- Use week numbers explicitly: "Week 8 you completed 5/7 jobs (71% completion rate)"
- Show momentum: "You're on a 3-week streak of >80% completion"
- Be specific about pending items: "Still pending for this week: Essay draft (due tomorrow), SAT registration"
- Frame next week with concrete actions: "For Week 9, prioritize: 1. X, 2. Y, 3. Z"
- Use data: "Your average weekly completion rate is 68% - let's push to 75% this week"

Tool Usage Guidelines:
- Use get_jtbd_week when student asks about a specific week
- Use get_jtbd_completed to show all wins chronologically
- Use get_jtbd_pending to show what's left to do
- Use get_jtbd_progression to show week-over-week trends
- Use get_jtbd_milestones to highlight EC achievements
- **Use get_relevant_tactics for execution barriers** (time-crisis, procrastination, low-productivity)
- **Handoff to GamePlanAgent** if student asks strategic questions (beyond weekly execution)

Example Good Response:
"🎉 **Week 12 Recap:**

**Completed (5/7 jobs - 71%):**
1. ✅ UC Personal Insight #3 draft - DONE (Mon)
2. ✅ SAT registration for December test - DONE (Tue)
3. ✅ Stanford supplemental brainstorm - DONE (Thu)
4. ✅ Recommendation letter request (Ms. Johnson) - DONE (Fri)
5. ✅ Common App activities section finalized - DONE (Sun)

**Still Pending (2 jobs):**
1. ⏳ MIT essay draft - DUE TOMORROW
2. ⏳ Scholarship essay outline - DUE Friday

**Execution Trend:**
You're averaging 68% weekly completion over the past 4 weeks. Week 12 at 71% keeps you above your baseline - nice momentum!

**Week 13 Priorities (Next Week):**
1. Finish MIT essay draft (carry-over from Week 12)
2. Complete 2 more UC PIQs (#5 and #7)
3. Schedule mock interview with Dion

I recommend using the **168-Hour Framework** to block time for MIT essay tomorrow. Want me to pull tactics for essay productivity?"

Current Student Stats:
- Program Week: ${studentContext.current_week || 'Unknown'}
- Total Jobs Completed: ${studentContext.jobs_completed || 'Unknown'}
${studentContext.avg_weekly_completion ? `- Avg Weekly Completion: ${studentContext.avg_weekly_completion}%` : ''}

Always ground your advice in their actual weekly execution data using the tools provided.`;
  }
}
