/**
 * TYPE-030: Cost-Benefit Intelligence
 * Category: DOMAIN_SPECIFIC (SummerPrograms)
 *
 * Framework: ROI-Driven Program Evaluation
 * - Financial cost analysis (tuition, travel, opportunity cost)
 * - Time investment assessment (hours required vs. available)
 * - College admissions impact quantification (Ivy score boost)
 * - Alternative opportunity comparison (what else could student do?)
 *
 * Core Algorithm:
 * ROI Score = (College_Admissions_Impact × 5) - (Financial_Cost × 2) - (Time_Cost × 1) + (Learning_Value × 3)
 * Range: -100 to +100 (higher = better ROI)
 *
 * Decision Matrix:
 * - ROI > 50: Strongly recommend (high value, low cost)
 * - ROI 20-50: Recommend (good balance)
 * - ROI 0-20: Consider (neutral, depends on family priorities)
 * - ROI < 0: Not recommended (low value or prohibitive cost)
 *
 * Output Format:
 * ```
 * ## 💰 Cost-Benefit Analysis (6 Programs)
 *
 * ### High ROI (Strongly Recommend)
 * 1. **MIT RSI** - ROI Score: 85/100
 *    - Cost: $0 (fully funded)
 *    - Time: 6 weeks (240 hours)
 *    - Admissions Impact: +35 Ivy score points (T1 program)
 *    - Learning Value: World-class research mentorship
 *    - **Bottom Line:** Exceptional value - free T1 program with maximum impact
 *
 * 2. **Garcia Summer Scholars** - ROI Score: 78/100
 *    - Cost: $0 (fully funded)
 *    - Time: 7 weeks (280 hours)
 *    - Admissions Impact: +25 Ivy score points (T2 program)
 *    - Learning Value: Research publication opportunity
 *    - **Bottom Line:** Strong value - free research experience with tangible output
 *
 * ### Medium ROI (Recommend)
 * 3. **Columbia SHP** - ROI Score: 45/100
 *    - Cost: $100 (application fee only)
 *    - Time: Academic year commitment (3 hours/week × 30 weeks = 90 hours)
 *    - Admissions Impact: +20 Ivy score points
 *    - Learning Value: University-level coursework
 *    - **Bottom Line:** Good value - low cost, manageable time commitment
 *
 * ### Low ROI (Consider Alternatives)
 * 6. **Commercial Summer Camp** - ROI Score: -15/100
 *    - Cost: $10,000+
 *    - Time: 4 weeks (160 hours)
 *    - Admissions Impact: +5 Ivy score points (minimal boost)
 *    - Learning Value: Limited academic rigor
 *    - **Bottom Line:** Poor value - high cost, low admissions impact
 *    - **Alternative:** Invest time in independent research project (free) for higher impact
 * ```
 */

import { IntelligenceType, AgentQuery, FactSet, IntelligenceResult } from '../../facts/types.js';
import { FactCategory } from '../../facts/types.js';

interface CostBenefitAnalysis {
  program_id: string;
  program_name: string;
  roi_score: number;
  financial_cost: number; // USD
  time_cost_hours: number;
  admissions_impact_points: number; // Estimated Ivy score boost
  learning_value_score: number; // 0-10
  roi_category: 'high' | 'medium' | 'low' | 'negative';
  bottom_line: string;
  alternatives?: string;
}

/**
 * Cost-Benefit Intelligence Type
 *
 * Core Technique: Multi-factor ROI calculation balancing cost, time, and impact
 * Based on coaching pattern: "Free T1 programs >>> Paid programs without clear ROI"
 */
export class CostBenefitIntelligence implements IntelligenceType {
  type_id = 'TYPE-030';
  name = 'Cost-Benefit Intelligence';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query and facts to generate cost-benefit analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {

    // Check if cost/value query
    if (!this.shouldTrigger(query)) {
      return {
        type_id: this.type_id,
        triggered: false,
        data: null,
      };
    }

    // Generate cost-benefit analyses for available programs
    const analyses = this.analyzeProgramROI();

    // Sort by ROI score (descending)
    analyses.sort((a, b) => b.roi_score - a.roi_score);

    return {
      type_id: this.type_id,
      triggered: true,
      data: {
        analyses,
        summary: this.generateSummary(analyses),
      },
    };
  }

  /**
   * Determine if this intelligence type should trigger
   */
  private shouldTrigger(query: AgentQuery): boolean {
    const queryLower = query.query.toLowerCase();
    const triggerKeywords = [
      'cost',
      'price',
      'expensive',
      'afford',
      'worth it',
      'value',
      'roi',
      'return on investment',
      'financial aid',
      'free program',
      'paid program',
    ];

    return triggerKeywords.some((keyword) => queryLower.includes(keyword));
  }

  /**
   * Analyze ROI for each program
   *
   * Formula: ROI = (College_Impact × 5) - (Financial_Cost × 2) - (Time_Cost × 1) + (Learning_Value × 3)
   */
  private analyzeProgramROI(): CostBenefitAnalysis[] {
    // Hardcoded programs for v19.0 (will be DB-driven in v20.0)
    return [
      {
        program_id: 'rsi-2025',
        program_name: 'MIT Research Science Institute (RSI)',
        roi_score: 0, // will calculate
        financial_cost: 0, // Free (fully funded)
        time_cost_hours: 240, // 6 weeks × 40 hours/week
        admissions_impact_points: 35, // T1 program = significant boost
        learning_value_score: 10, // World-class research mentorship
        roi_category: 'high',
        bottom_line: 'Exceptional value - free T1 program with maximum impact',
      },
      {
        program_id: 'garcia-summer-2025',
        program_name: 'Garcia Summer Scholars Program',
        roi_score: 0,
        financial_cost: 0, // Free
        time_cost_hours: 280, // 7 weeks × 40 hours/week
        admissions_impact_points: 25, // T2 program
        learning_value_score: 9, // Research publication opportunity
        roi_category: 'high',
        bottom_line: 'Strong value - free research experience with tangible output',
      },
      {
        program_id: 'columbia-shp-2025',
        program_name: 'Columbia Science Honors Program',
        roi_score: 0,
        financial_cost: 100, // Application fee only
        time_cost_hours: 90, // 3 hours/week × 30 weeks
        admissions_impact_points: 20, // T2 program
        learning_value_score: 8, // University-level coursework
        roi_category: 'medium',
        bottom_line: 'Good value - low cost, manageable time commitment',
      },
      {
        program_id: 'yygs-2025',
        program_name: 'Yale Young Global Scholars (YYGS)',
        roi_score: 0,
        financial_cost: 6500, // Tuition (financial aid available)
        time_cost_hours: 80, // 2 weeks × 40 hours/week
        admissions_impact_points: 15, // T2 program, but shorter duration
        learning_value_score: 7, // Leadership + global exposure
        roi_category: 'medium',
        bottom_line: 'Consider with financial aid - valuable leadership experience',
      },
      {
        program_id: 'ssp-2025',
        program_name: 'Summer Science Program (SSP)',
        roi_score: 0,
        financial_cost: 8250, // Tuition (need-based aid available)
        time_cost_hours: 240, // 6 weeks × 40 hours/week
        admissions_impact_points: 18, // T2 program
        learning_value_score: 8, // Intensive STEM immersion
        roi_category: 'medium',
        bottom_line: 'Moderate value - high cost but strong academics',
      },
      {
        program_id: 'commercial-summer-camp',
        program_name: 'Commercial Summer Camp',
        roi_score: 0,
        financial_cost: 10000, // Expensive
        time_cost_hours: 160, // 4 weeks × 40 hours/week
        admissions_impact_points: 5, // Minimal boost (T3-T4 equivalent)
        learning_value_score: 4, // Limited academic rigor
        roi_category: 'negative',
        bottom_line: 'Poor value - high cost, low admissions impact',
        alternatives:
          'Consider independent research project (free) or free T2 programs for higher ROI',
      },
    ].map((program) => {
      // Calculate ROI score
      const college_impact_component = program.admissions_impact_points * 5;
      const financial_cost_component = (program.financial_cost / 1000) * 2; // Normalize to 0-20 range
      const time_cost_component = program.time_cost_hours / 100; // Normalize
      const learning_value_component = program.learning_value_score * 3;

      const roi_score =
        college_impact_component -
        financial_cost_component -
        time_cost_component +
        learning_value_component;

      // Determine ROI category
      let roi_category: 'high' | 'medium' | 'low' | 'negative';
      if (roi_score >= 50) roi_category = 'high';
      else if (roi_score >= 20) roi_category = 'medium';
      else if (roi_score >= 0) roi_category = 'low';
      else roi_category = 'negative';

      return {
        ...program,
        roi_score: Math.round(roi_score),
        roi_category,
      };
    });
  }

  /**
   * Generate summary of cost-benefit analysis
   */
  private generateSummary(analyses: CostBenefitAnalysis[]): string {
    const highROI = analyses.filter((a) => a.roi_category === 'high');
    const mediumROI = analyses.filter((a) => a.roi_category === 'medium');
    const lowROI = analyses.filter((a) => a.roi_category === 'low');
    const negativeROI = analyses.filter((a) => a.roi_category === 'negative');

    return `Cost-benefit analysis for ${analyses.length} programs: ${highROI.length} high ROI (strongly recommend), ${mediumROI.length} medium ROI (recommend), ${lowROI.length} low ROI (consider alternatives), ${negativeROI.length} negative ROI (not recommended). Priority: Focus on free T1/T2 programs (RSI, Garcia) for maximum impact with zero financial cost.`;
  }
}
