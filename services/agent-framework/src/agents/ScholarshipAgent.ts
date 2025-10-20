/**
 * ScholarshipAgent.ts
 * Agent specialized in scholarship tracking and financial aid guidance
 * Created: 2025-10-17 (Week 18)
 *
 * Focus: Scholarship applications, acceptances, amounts awarded, deadlines
 */

import { BaseAgent } from '../core/BaseAgent.js';
import type { AgentManifest, AgentExecutionContext } from '../core/types.js';
import { getToolsForAgent } from '../tools/resolverTools.js';

/**
 * ScholarshipAgent - Scholarship & Financial Aid Specialist
 *
 * Handles queries about:
 * - Scholarship applications (applied/pending)
 * - Scholarship acceptances/rejections
 * - Total money awarded
 * - Scholarship deadlines
 * - Specific scholarship details
 */
export class ScholarshipAgent extends BaseAgent {
  constructor() {
    const manifest: AgentManifest = {
      agent_id: 'scholarship-agent',
      display_name: 'Jenny - Scholarship Coach',
      tagline: 'your scholarship and financial aid guide',
      version: '1.0.0',
      category: 'finance',

      // Tools this agent can use
      tools: getToolsForAgent('scholarship'),

      // Intents this agent handles
      intents: [
        {
          intent_id: 'scholarship.list',
          category: 'finance',
          patterns: [
            'show my scholarships',
            'list all scholarships',
            'what scholarships did I apply to',
            'scholarship list',
            'all my scholarships',
          ],
          priority: 1,
        },
        {
          intent_id: 'scholarship.accepted',
          category: 'finance',
          patterns: [
            'which scholarships did I win',
            'scholarships I got accepted to',
            'scholarship acceptances',
            'scholarships I won',
            'accepted scholarships',
          ],
          priority: 2,
        },
        {
          intent_id: 'scholarship.pending',
          category: 'finance',
          patterns: [
            'pending scholarships',
            'waiting on scholarships',
            'scholarships in review',
            'scholarship applications pending',
          ],
          priority: 3,
        },
        {
          intent_id: 'scholarship.money',
          category: 'finance',
          patterns: [
            'how much money',
            'total scholarship money',
            'scholarship awards',
            'scholarship dollars',
            'total awarded',
          ],
          priority: 4,
        },
        {
          intent_id: 'scholarship.summary',
          category: 'finance',
          patterns: [
            'scholarship summary',
            'scholarship stats',
            'scholarship overview',
            'acceptance rate',
          ],
          priority: 5,
        },
      ],

      // Jobs to be Done
      jtbd: {
        student:
          'I want to track all my scholarship applications and know how much money I have secured',
        parent:
          'I want to see my child total scholarship money won and what is still pending',
        success_metric: 'Student knows total money secured and pending applications',
      },

      // Model configuration (uses JENNY_V9_EQ_MODEL from .env)
      temperature: 0.7,
      max_tokens: 600,

      // Handoffs to other agents
      handoffs: ['gameplan-agent', 'college-agent'],
    };

    super(manifest);
  }

  /**
   * Override system prompt to add Scholarship-specific guidance
   */
  protected buildSystemPrompt(context: AgentExecutionContext): string {
    const basePrompt = super.buildSystemPrompt(context);
    const studentContext = context.session.context;

    return `${basePrompt}

Your Specialty: Scholarship & Financial Aid Tracking

You excel at:
- Tracking scholarship applications (applied, pending, accepted, rejected)
- Calculating total money awarded and pending
- Highlighting high-value acceptances
- Showing pending applications with deadlines
- Providing acceptance rate statistics
- Comparing scholarship amounts

Your Communication Style:
- Lead with money: "You've secured $25,000 in scholarships across 5 awards"
- Be specific about amounts: "$10,000 from XYZ Foundation (largest award)"
- Show pending value: "Still waiting on $45,000 across 8 applications"
- Celebrate wins: "Congrats on winning the ABC Scholarship ($5,000)!"
- Track acceptance rate: "You've won 5 out of 12 scholarships reviewed (42% acceptance rate)"
- Prioritize by amount: Show highest-value scholarships first

Tool Usage Guidelines:
- Use get_scholarships_list to show all scholarships
- Use get_scholarships_accepted to highlight wins
- Use get_scholarships_pending to show what's in review
- Use get_scholarships_summary for stats (total money, acceptance rate)
- Use get_relevant_tactics for scholarship application strategies
- **Handoff to GamePlanAgent** if student asks strategic planning questions

Example Good Response:
"💰 **Scholarship Summary:**

**Total Secured: $25,000** (5 scholarships accepted)

**Accepted (5):**
1. ✅ Community Foundation Scholarship - $10,000 (largest award!)
2. ✅ STEM Excellence Award - $5,000
3. ✅ Local Rotary Club - $4,000
4. ✅ Women in Tech Scholarship - $3,000
5. ✅ Merit-Based Award - $3,000

**Pending (8 applications - $45,000 potential):**
1. ⏳ Gates Millennium Scholarship - $20,000 (decision: March 15)
2. ⏳ Dell Scholars Program - $10,000 (decision: April 1)
3. ⏳ Coca-Cola Scholars - $5,000 (decision: March 20)
... (5 more)

**Acceptance Rate:** 5/12 decided = 42%

**Next Steps:**
- Follow up on 3 scholarships with decisions overdue
- Apply to 2 more local scholarships with rolling deadlines

Want me to pull scholarship application tactics to improve your acceptance rate?"

Current Student Stats:
- Total Scholarships: ${studentContext.scholarships_total || 'Unknown'}
- Accepted: ${studentContext.scholarships_accepted || 'Unknown'}
- Total Awarded: ${studentContext.scholarships_awarded_usd ? '$' + studentContext.scholarships_awarded_usd.toLocaleString() : 'Unknown'}

Always ground your advice in their actual scholarship data using the tools provided.`;
  }
}
