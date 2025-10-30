/**
 * TYPE-061: Multi-Agent Delegation Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent only) - May become UNIVERSAL in future
 *
 * Purpose: Routes queries to specialist agents and synthesizes responses into execution summary
 *
 * Framework: Specialist Agent Routing + Response Synthesis
 * 1. Detect specialist intent (awards, programs, scholarships, ECs, gameplan, assessment)
 * 2. Delegate to appropriate specialist agent
 * 3. Synthesize specialist response into weekly execution context
 * 4. Return integrated action plan
 *
 * Specialist Agents:
 * - GamePlanAgent: Long-term roadmap, quarterly milestones
 * - AssessmentAgent: Profile evaluation, strengths/weaknesses
 * - ExtracurricularsAgent: Portfolio optimization, tier classification
 * - AwardsAgent: Award recommendations, quick wins strategy
 * - SummerProgramsAgent: Program selection, application strategy
 * - ScholarshipsAgent: Scholarship opportunities, financial aid strategy
 *
 * Data Source: W000-STRATEGY-015, cross-agent handoff patterns
 * Pattern: Real Jenny coaching - seamlessly delegates to specialists, then integrates advice
 *
 * Created: 2025-10-29 (v20.1 ExecutionAgent Expansion)
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

/**
 * Specialist agent types
 */
type SpecialistAgentType =
  | 'GamePlanAgent'
  | 'AssessmentAgent'
  | 'ExtracurricularsAgent'
  | 'AwardsAgent'
  | 'SummerProgramsAgent'
  | 'ScholarshipsAgent';

/**
 * Intent detection result
 */
interface IntentDetection {
  detected_intent: SpecialistAgentType | 'none';
  confidence_score: number; // 0-1
  matching_keywords: string[];
  query_classification: 'specialist' | 'execution' | 'hybrid';
}

/**
 * Delegation request
 */
interface DelegationRequest {
  target_agent: SpecialistAgentType;
  original_query: string;
  execution_context: {
    current_week_focus: string;
    current_p0_outcome: string | null;
    current_velocity: number;
    available_capacity_hours: number;
  };
  delegation_reason: string;
}

/**
 * Delegation response
 */
interface DelegationResponse {
  agent_used: string;
  specialist_response: string;
  specialist_metadata: any;
  facts_used_count: number;
  validation_score: number;
  intelligence_triggered: string[];
}

/**
 * Synthesized execution plan
 */
interface SynthesizedExecutionPlan {
  weekly_focus: string; // Primary focus for this week
  p0_outcome: string; // Top priority outcome
  execution_items: {
    item_text: string;
    deadline: string;
    estimated_effort_hours: number;
    source_agent: SpecialistAgentType;
  }[];
  integration_rationale: string; // Why these specialist recommendations fit into weekly execution
  capacity_check: {
    total_hours_required: number;
    available_hours: number;
    feasible: boolean;
    adjustments_needed: string[];
  };
  next_steps: string[]; // Concrete action items for this week
}

/**
 * Full multi-agent delegation result
 */
interface MultiAgentDelegationResult {
  intent_detection: IntentDetection;
  delegation_request: DelegationRequest | null;
  delegation_response: DelegationResponse | null;
  synthesized_plan: SynthesizedExecutionPlan | null;
  direct_execution_response: string | null; // If no delegation needed
}

export class MultiAgentDelegation implements IntelligenceType {
  type_id = 'TYPE-061';
  name = 'Multi-Agent Delegation';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query to detect specialist intent and delegate if needed
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Step 1: Detect specialist intent
    const intentDetection = this.detectSpecialistIntent(query.query);

    // Step 2: If specialist intent detected, prepare delegation
    let delegationRequest: DelegationRequest | null = null;
    let delegationResponse: DelegationResponse | null = null;
    let synthesizedPlan: SynthesizedExecutionPlan | null = null;
    let directExecutionResponse: string | null = null;

    if (intentDetection.detected_intent !== 'none' && intentDetection.confidence_score >= 0.7) {
      // Prepare delegation request
      delegationRequest = this.prepareDelegationRequest(
        intentDetection.detected_intent,
        query.query,
        facts
      );

      // NOTE: Actual delegation happens in ExecutionAgent.handleQuery()
      // This intelligence type only provides the routing logic and synthesis framework
      // ExecutionAgent will:
      // 1. Call the specialist agent via AgentRegistry
      // 2. Get specialist response
      // 3. Pass response back to this intelligence type for synthesis

      // For now, return delegation instructions
      delegationResponse = {
        agent_used: intentDetection.detected_intent,
        specialist_response:
          'Specialist agent will be called by ExecutionAgent (delegation deferred)',
        specialist_metadata: {},
        facts_used_count: 0,
        validation_score: 0,
        intelligence_triggered: [],
      };

      // Synthesize plan (with placeholder specialist response)
      synthesizedPlan = this.synthesizeExecutionPlan(
        delegationRequest,
        delegationResponse,
        facts
      );
    } else {
      // No specialist delegation needed - direct execution response
      directExecutionResponse = this.generateDirectExecutionResponse(query.query, facts);
    }

    const result: MultiAgentDelegationResult = {
      intent_detection: intentDetection,
      delegation_request: delegationRequest,
      delegation_response: delegationResponse,
      synthesized_plan: synthesizedPlan,
      direct_execution_response: directExecutionResponse,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: intentDetection.confidence_score,
      data: result,
    };
  }

  /**
   * Detect specialist agent intent from query
   */
  private detectSpecialistIntent(query: string): IntentDetection {
    const lowerQuery = query.toLowerCase();
    const matchingKeywords: string[] = [];
    let detectedIntent: SpecialistAgentType | 'none' = 'none';
    let confidenceScore = 0;

    // GamePlanAgent keywords
    const gamePlanKeywords = [
      'game plan',
      'gameplan',
      'roadmap',
      'quarterly',
      'strategy',
      'timeline',
      'long-term',
      'milestones',
    ];
    const gamePlanMatches = gamePlanKeywords.filter((keyword) => lowerQuery.includes(keyword));
    if (gamePlanMatches.length > 0) {
      matchingKeywords.push(...gamePlanMatches);
      detectedIntent = 'GamePlanAgent';
      confidenceScore = Math.min(1.0, 0.5 + gamePlanMatches.length * 0.2);
    }

    // AssessmentAgent keywords
    const assessmentKeywords = [
      'assessment',
      'evaluate',
      'strengths',
      'weaknesses',
      'profile',
      'competitiveness',
      'chances',
    ];
    const assessmentMatches = assessmentKeywords.filter((keyword) => lowerQuery.includes(keyword));
    if (assessmentMatches.length > 0 && assessmentMatches.length > matchingKeywords.length) {
      matchingKeywords.length = 0;
      matchingKeywords.push(...assessmentMatches);
      detectedIntent = 'AssessmentAgent';
      confidenceScore = Math.min(1.0, 0.5 + assessmentMatches.length * 0.2);
    }

    // ExtracurricularsAgent keywords
    const ecKeywords = [
      'extracurricular',
      'activities list',
      'ec portfolio',
      'cookie cutter',
      'narrative alignment',
      'tier classification',
      'improve my activities',
    ];
    const ecMatches = ecKeywords.filter((keyword) => lowerQuery.includes(keyword));
    if (ecMatches.length > 0 && ecMatches.length > matchingKeywords.length) {
      matchingKeywords.length = 0;
      matchingKeywords.push(...ecMatches);
      detectedIntent = 'ExtracurricularsAgent';
      confidenceScore = Math.min(1.0, 0.5 + ecMatches.length * 0.2);
    }

    // AwardsAgent keywords
    const awardsKeywords = [
      'award',
      'competition',
      'honor',
      'recognition',
      'win',
      'ncwit',
      'congressional app',
      'scholastic',
      'quick win',
    ];
    const awardsMatches = awardsKeywords.filter((keyword) => lowerQuery.includes(keyword));
    if (awardsMatches.length > 0 && awardsMatches.length > matchingKeywords.length) {
      matchingKeywords.length = 0;
      matchingKeywords.push(...awardsMatches);
      detectedIntent = 'AwardsAgent';
      confidenceScore = Math.min(1.0, 0.5 + awardsMatches.length * 0.2);
    }

    // SummerProgramsAgent keywords
    const programsKeywords = [
      'summer program',
      'summer course',
      'summer opportunity',
      'summer research',
      'mit launch',
      'rsi',
      'columbia science',
      'garcia',
      'sstp',
      'yygs',
      'tasp',
    ];
    const programsMatches = programsKeywords.filter((keyword) => lowerQuery.includes(keyword));
    if (programsMatches.length > 0 && programsMatches.length > matchingKeywords.length) {
      matchingKeywords.length = 0;
      matchingKeywords.push(...programsMatches);
      detectedIntent = 'SummerProgramsAgent';
      confidenceScore = Math.min(1.0, 0.5 + programsMatches.length * 0.2);
    }

    // ScholarshipsAgent keywords
    const scholarshipsKeywords = [
      'scholarship',
      'financial aid',
      'efc',
      'pell grant',
      'merit aid',
      'need-based',
      'fafsa',
      'css profile',
      'college cost',
      'aid package',
      'pay for college',
    ];
    const scholarshipsMatches = scholarshipsKeywords.filter((keyword) => lowerQuery.includes(keyword));
    if (scholarshipsMatches.length > 0 && scholarshipsMatches.length > matchingKeywords.length) {
      matchingKeywords.length = 0;
      matchingKeywords.push(...scholarshipsMatches);
      detectedIntent = 'ScholarshipsAgent';
      confidenceScore = Math.min(1.0, 0.5 + scholarshipsMatches.length * 0.2);
    }

    // Classify query type
    let queryClassification: 'specialist' | 'execution' | 'hybrid';

    const executionKeywords = [
      'this week',
      'should i do',
      'action',
      'task',
      'execute',
      'progress',
      'velocity',
    ];
    const executionMatches = executionKeywords.filter((keyword) => lowerQuery.includes(keyword));

    if (matchingKeywords.length > 0 && executionMatches.length > 0) {
      queryClassification = 'hybrid'; // Both specialist and execution intent
    } else if (matchingKeywords.length > 0) {
      queryClassification = 'specialist'; // Pure specialist query
    } else {
      queryClassification = 'execution'; // Pure execution query
    }

    return {
      detected_intent: detectedIntent,
      confidence_score: parseFloat(confidenceScore.toFixed(2)),
      matching_keywords: matchingKeywords,
      query_classification: queryClassification,
    };
  }

  /**
   * Prepare delegation request with execution context
   */
  private prepareDelegationRequest(
    targetAgent: SpecialistAgentType,
    originalQuery: string,
    facts: FactSet
  ): DelegationRequest {
    // Extract execution context from facts
    // In production, query database for current week plan

    const executionContext = {
      current_week_focus: 'Congressional App Challenge submission',
      current_p0_outcome: 'Complete Congressional App Challenge submission with polished demo',
      current_velocity: 0.85, // From TYPE-063
      available_capacity_hours: 12, // From TYPE-053
    };

    const delegationReason = this.getDelegationReason(targetAgent, originalQuery);

    return {
      target_agent: targetAgent,
      original_query: originalQuery,
      execution_context: executionContext,
      delegation_reason: delegationReason,
    };
  }

  /**
   * Get delegation reason (why we're calling this specialist)
   */
  private getDelegationReason(agent: SpecialistAgentType, query: string): string {
    switch (agent) {
      case 'GamePlanAgent':
        return 'Student asking about long-term roadmap or quarterly strategy - need strategic guidance from GamePlanAgent';
      case 'AssessmentAgent':
        return 'Student asking about profile evaluation or competitiveness - need assessment from AssessmentAgent';
      case 'ExtracurricularsAgent':
        return 'Student asking about activities optimization - need portfolio analysis from ExtracurricularsAgent';
      case 'AwardsAgent':
        return 'Student asking about award opportunities - need recommendations from AwardsAgent';
      case 'SummerProgramsAgent':
        return 'Student asking about summer programs - need program selection guidance from SummerProgramsAgent';
      case 'ScholarshipsAgent':
        return 'Student asking about scholarships or financial aid - need financial strategy from ScholarshipsAgent';
    }
  }

  /**
   * Synthesize specialist response into execution plan
   * This is the key integration logic - takes specialist advice and converts to weekly action plan
   */
  private synthesizeExecutionPlan(
    delegationRequest: DelegationRequest,
    delegationResponse: DelegationResponse,
    facts: FactSet
  ): SynthesizedExecutionPlan {
    const executionContext = delegationRequest.execution_context;

    // Extract actionable items from specialist response
    // In production, parse specialist response for specific recommendations

    const executionItems: {
      item_text: string;
      deadline: string;
      estimated_effort_hours: number;
      source_agent: SpecialistAgentType;
    }[] = [];

    // Sample synthesis logic (in production, parse actual specialist response)
    switch (delegationRequest.target_agent) {
      case 'AwardsAgent':
        executionItems.push({
          item_text: 'Submit Congressional App Challenge application',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_effort_hours: 6,
          source_agent: 'AwardsAgent',
        });
        executionItems.push({
          item_text: 'Prepare NCWIT Aspirations application draft',
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_effort_hours: 4,
          source_agent: 'AwardsAgent',
        });
        break;

      case 'ScholarshipsAgent':
        executionItems.push({
          item_text: 'Complete FAFSA application',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_effort_hours: 3,
          source_agent: 'ScholarshipsAgent',
        });
        executionItems.push({
          item_text: 'Apply to 2 quick-win scholarships',
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_effort_hours: 5,
          source_agent: 'ScholarshipsAgent',
        });
        break;

      case 'SummerProgramsAgent':
        executionItems.push({
          item_text: 'Complete MIT Launch application',
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_effort_hours: 8,
          source_agent: 'SummerProgramsAgent',
        });
        break;
    }

    // Calculate total effort
    const totalHours = executionItems.reduce((sum, item) => sum + item.estimated_effort_hours, 0);

    // Check capacity
    const availableHours = executionContext.available_capacity_hours;
    const feasible = totalHours <= availableHours;

    const adjustmentsNeeded: string[] = [];
    if (!feasible) {
      adjustmentsNeeded.push(
        `Total hours (${totalHours}) exceeds capacity (${availableHours}). Recommend cutting lowest priority items or extending timeline.`
      );
    }

    // Determine weekly focus
    const weeklyFocus =
      executionItems.length > 0
        ? `${delegationRequest.target_agent} recommendations: ${executionItems[0].item_text}`
        : executionContext.current_week_focus;

    // Determine P0 outcome
    const p0Outcome =
      executionItems.length > 0 ? executionItems[0].item_text : executionContext.current_p0_outcome!;

    // Integration rationale
    const integrationRationale = `Specialist agent ${delegationRequest.target_agent} identified ${executionItems.length} actionable items. Integrated into weekly execution plan with ${feasible ? 'sufficient' : 'insufficient'} capacity. ${feasible ? 'Proceed with current plan.' : 'Recommend scope reduction.'}`;

    // Generate next steps
    const nextSteps = executionItems
      .slice(0, 3)
      .map((item, index) => `${index + 1}. ${item.item_text} (${item.estimated_effort_hours} hours)`);

    return {
      weekly_focus: weeklyFocus,
      p0_outcome: p0Outcome,
      execution_items: executionItems,
      integration_rationale: integrationRationale,
      capacity_check: {
        total_hours_required: totalHours,
        available_hours: availableHours,
        feasible: feasible,
        adjustments_needed: adjustmentsNeeded,
      },
      next_steps: nextSteps,
    };
  }

  /**
   * Generate direct execution response (no specialist delegation needed)
   */
  private generateDirectExecutionResponse(query: string, facts: FactSet): string {
    // Direct execution query - provide tactical guidance
    return `This is a direct execution query. ExecutionAgent will provide tactical weekly guidance using:
- TYPE-049: Execution Ladder Navigation (track position)
- TYPE-050: Outcome Engineering (prioritize P0/P1/P2/P3)
- TYPE-051: Task Decomposition (break down into execution items + tasks)
- TYPE-052: Portfolio Operating Cadence (Mon→Sun weekly rhythm)
- TYPE-063: Progress Velocity & Momentum (track velocity)

No specialist delegation required.`;
  }
}
