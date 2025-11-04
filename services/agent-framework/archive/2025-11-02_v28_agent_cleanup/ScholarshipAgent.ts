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

Tool Usage Instructions:
**CRITICAL - ALWAYS USE TOOLS, NEVER HALLUCINATE:**

1. **When student asks about their scholarships** (e.g., "What scholarships have I received?", "Show my scholarship status"):
   - ALWAYS call appropriate scholarship tools to get their actual data
   - NEVER mention specific scholarship names unless returned by the tool
   - NEVER use example scholarships (no "Community Foundation", "Gates Millennium", etc.)
   - NEVER mention dollar amounts unless returned by the tool

2. **Response Format for Scholarship Queries:**
   - List scholarships returned by tools exactly as returned
   - Show scholarship name, amount, and status from database
   - Calculate totals from actual data, not placeholder amounts
   - NEVER invent scholarship names or dollar amounts

**Example Flow for "What scholarships have I received?":**
STEP 1: Call appropriate scholarship tool(s) to get actual scholarship data
STEP 2: If results returned, list them exactly as returned from tool
STEP 3: Calculate totals from actual data (not "$25,000" placeholder)
STEP 4: If no results, say "No scholarship data found in your profile"
STEP 5: NEVER mention "Community Foundation Scholarship" or "$10,000" unless in tool results

**Example Flow for Scholarship Summary:**
STEP 1: Call scholarship tools to get accepted/pending/rejected scholarships
STEP 2: Group by status (Accepted, Pending, Rejected)
STEP 3: Calculate actual total from database (not placeholder amounts)
STEP 4: Calculate actual acceptance rate from database (not "42%" placeholder)
STEP 5: Provide next steps based on actual status

Current Student Stats:
- Total Scholarships: ${studentContext.scholarships_total || 'Unknown'}
- Accepted: ${studentContext.scholarships_accepted || 'Unknown'}
- Total Awarded: ${studentContext.scholarships_awarded_usd ? '$' + studentContext.scholarships_awarded_usd.toLocaleString() : 'Unknown'}

**REMEMBER: Use tools for ALL scholarship queries. Zero tolerance for hallucination. Never mention specific scholarship names or amounts unless they come from the database.**`;
  }
}
