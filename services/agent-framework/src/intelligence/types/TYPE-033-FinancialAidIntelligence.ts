/**
 * TYPE-033: Financial Aid Intelligence
 * Category: DOMAIN_SPECIFIC (ScholarshipsAgent only)
 *
 * Purpose: Strategic financial aid planning combining need-based aid, merit scholarships,
 * and aid stacking to maximize total financial support.
 *
 * Formula:
 * Total Aid Package = Need-Based Aid + Merit Scholarships + Stacked External Awards
 * Net Cost = Total College Cost - Total Aid Package
 *
 * Strategy:
 * 1. Need-Based Aid Eligibility: Estimate EFC (Expected Family Contribution) from FAFSA
 * 2. Merit Scholarship Profile: Assess competitiveness for institutional merit aid
 * 3. External Scholarship Stacking: Identify schools that allow stacking
 * 4. ROI Analysis: Compare net cost vs graduation outcomes
 * 5. Aid Negotiation Leverage: Build competitive offer leverage
 *
 * Source: TYPE-030 (Cost-Benefit Intelligence) pattern + financial aid specific logic
 * Pattern: Multi-source aid optimization + college financial policies
 *
 * Created: 2025-10-29 (v21.0 ScholarshipsAgent Foundation)
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

type AidType = 'need_based' | 'merit' | 'athletic' | 'talent' | 'external';
type StackingPolicy = 'full_stacking' | 'partial_stacking' | 'no_stacking' | 'unknown';

interface FinancialProfile {
  estimated_efc: number; // Expected Family Contribution (from FAFSA)
  household_income_range: string; // '<$50K', '$50K-$100K', '$100K-$200K', '>$200K'
  financial_need_level: 'high' | 'moderate' | 'low' | 'none';
  pell_grant_eligible: boolean;
  merit_competitiveness: number; // 0-10 scale
  gpa: number;
  test_scores: {
    sat_total?: number;
    act_composite?: number;
  };
}

interface ScholarshipAidAnalysis {
  scholarship_name: string;
  award_amount: number;
  aid_type: AidType;
  renewable: boolean;
  renewable_years: number;
  total_value_4_years: number; // Award amount × renewable years
}

interface CollegeAidPackage {
  college_name: string;
  total_cost_of_attendance: number; // Tuition + Room & Board + Fees

  // Aid components
  need_based_grant: number;
  merit_scholarship: number;
  external_scholarships_allowed: number;
  work_study: number;
  loans_offered: number;

  // Policies
  stacking_policy: StackingPolicy;
  meets_full_need: boolean;
  no_loan_policy: boolean;

  // Calculated
  total_aid_package: number;
  net_cost_per_year: number;
  net_cost_4_years: number;
  aid_percentage: number; // Total aid / Total cost
}

interface FinancialAidResult {
  financial_profile: FinancialProfile;
  estimated_college_packages: CollegeAidPackage[];
  scholarship_analysis: ScholarshipAidAnalysis[];
  total_external_scholarships: number;
  recommended_aid_strategy: string;
  stacking_opportunities: string[];
  negotiation_leverage: string[];
  warnings: string[];
}

export class FinancialAidIntelligence implements IntelligenceType {
  type_id = 'TYPE-033';
  name = 'Financial Aid Intelligence';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query to generate financial aid intelligence
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const profileFacts = facts.get(FactCategory.STUDENT_PROFILE) || [];
    const activityFacts = facts.get(FactCategory.ACTIVITY_DATA) || [];
    const assessmentFacts = facts.get(FactCategory.ASSESSMENT_DATA) || [];

    // Build financial profile
    const financialProfile = this.buildFinancialProfile(profileFacts, activityFacts, assessmentFacts);

    // Get scholarship analysis (from TYPE-031 or database)
    const scholarshipAnalysis = this.analyzeScholarships(activityFacts);

    // Estimate college aid packages
    const estimatedPackages = this.estimateCollegeAidPackages(financialProfile, activityFacts);

    // Calculate total external scholarships
    const totalExternalScholarships = scholarshipAnalysis.reduce(
      (sum, s) => sum + s.total_value_4_years,
      0
    );

    // Generate aid strategy
    const recommendedStrategy = this.generateAidStrategy(financialProfile, estimatedPackages, scholarshipAnalysis);

    // Identify stacking opportunities
    const stackingOpportunities = this.identifyStackingOpportunities(estimatedPackages, scholarshipAnalysis);

    // Build negotiation leverage
    const negotiationLeverage = this.buildNegotiationLeverage(estimatedPackages, scholarshipAnalysis);

    // Generate warnings
    const warnings = this.generateWarnings(financialProfile, estimatedPackages);

    const result: FinancialAidResult = {
      financial_profile: financialProfile,
      estimated_college_packages: estimatedPackages,
      scholarship_analysis: scholarshipAnalysis,
      total_external_scholarships: totalExternalScholarships,
      recommended_aid_strategy: recommendedStrategy,
      stacking_opportunities: stackingOpportunities,
      negotiation_leverage: negotiationLeverage,
      warnings,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: 0.80,
      data: result,
    };
  }

  /**
   * Build financial profile from facts
   */
  private buildFinancialProfile(
    profileFacts: any[],
    activityFacts: any[],
    assessmentFacts: any[]
  ): FinancialProfile {
    // TODO: Extract household income, GPA, test scores from facts
    // For now, using placeholder values

    const householdIncome = 75000; // Extract from profileFacts in production
    const gpa = 3.7; // Extract from profileFacts
    const satTotal = 1450; // Extract from profileFacts

    // Estimate EFC (simplified FAFSA formula)
    const estimatedEFC = this.estimateEFC(householdIncome);

    // Determine financial need level
    let financialNeedLevel: 'high' | 'moderate' | 'low' | 'none';
    if (estimatedEFC < 10000) financialNeedLevel = 'high';
    else if (estimatedEFC < 30000) financialNeedLevel = 'moderate';
    else if (estimatedEFC < 60000) financialNeedLevel = 'low';
    else financialNeedLevel = 'none';

    // Pell Grant eligibility (EFC < $6,656 in 2024-25)
    const pellGrantEligible = estimatedEFC < 6656;

    // Merit competitiveness (based on GPA + test scores + awards)
    const meritCompetitiveness = this.calculateMeritCompetitiveness(gpa, satTotal, activityFacts);

    return {
      estimated_efc: estimatedEFC,
      household_income_range: this.getIncomeRange(householdIncome),
      financial_need_level: financialNeedLevel,
      pell_grant_eligible: pellGrantEligible,
      merit_competitiveness: meritCompetitiveness,
      gpa,
      test_scores: {
        sat_total: satTotal,
      },
    };
  }

  /**
   * Estimate EFC using simplified FAFSA formula
   */
  private estimateEFC(householdIncome: number): number {
    // Simplified formula: ~25-30% of income above certain threshold
    // Real FAFSA is much more complex (assets, family size, etc.)

    if (householdIncome < 30000) return 0;
    if (householdIncome < 50000) return Math.round((householdIncome - 30000) * 0.22);
    if (householdIncome < 100000) return Math.round(4400 + (householdIncome - 50000) * 0.25);
    return Math.round(16900 + (householdIncome - 100000) * 0.30);
  }

  /**
   * Get income range bucket
   */
  private getIncomeRange(income: number): string {
    if (income < 50000) return '<$50K';
    if (income < 100000) return '$50K-$100K';
    if (income < 200000) return '$100K-$200K';
    return '>$200K';
  }

  /**
   * Calculate merit competitiveness (0-10)
   */
  private calculateMeritCompetitiveness(gpa: number, satTotal: number, activityFacts: any[]): number {
    let score = 0;

    // GPA component (max 4 points)
    if (gpa >= 4.0) score += 4;
    else if (gpa >= 3.8) score += 3.5;
    else if (gpa >= 3.5) score += 2.5;
    else if (gpa >= 3.0) score += 1.5;

    // SAT component (max 3 points)
    if (satTotal >= 1550) score += 3;
    else if (satTotal >= 1500) score += 2.5;
    else if (satTotal >= 1450) score += 2;
    else if (satTotal >= 1350) score += 1.5;
    else if (satTotal >= 1250) score += 1;

    // Awards component (max 3 points)
    const nationalAwards = activityFacts.filter(
      (f) => f.value.item_type === 'Award' && f.value.tier1_state === 'Won' && f.value.subtype === 'National'
    );
    if (nationalAwards.length >= 3) score += 3;
    else if (nationalAwards.length === 2) score += 2;
    else if (nationalAwards.length === 1) score += 1;

    return Math.min(score, 10);
  }

  /**
   * Analyze scholarships from activity facts
   */
  private analyzeScholarships(activityFacts: any[]): ScholarshipAidAnalysis[] {
    // TODO: Query database for scholarship opportunities
    // For now, using mock data

    return [
      {
        scholarship_name: 'NCWIT Aspirations in Computing',
        award_amount: 10000,
        aid_type: 'merit',
        renewable: false,
        renewable_years: 1,
        total_value_4_years: 10000,
      },
      {
        scholarship_name: 'Gates Scholarship',
        award_amount: 25000,
        aid_type: 'need_based',
        renewable: true,
        renewable_years: 4,
        total_value_4_years: 100000,
      },
      {
        scholarship_name: 'Jack Kent Cooke College Scholarship',
        award_amount: 10000,
        aid_type: 'merit',
        renewable: true,
        renewable_years: 4,
        total_value_4_years: 40000,
      },
    ];
  }

  /**
   * Estimate college aid packages
   */
  private estimateCollegeAidPackages(
    financialProfile: FinancialProfile,
    activityFacts: any[]
  ): CollegeAidPackage[] {
    // TODO: Query database for target colleges
    // For now, using representative examples

    const colleges = [
      {
        name: 'Stanford University',
        total_cost: 85000,
        meets_full_need: true,
        no_loan_policy: true,
        avg_merit: 0, // Stanford doesn't give merit aid
        stacking_policy: 'partial_stacking' as StackingPolicy,
      },
      {
        name: 'Duke University',
        total_cost: 82000,
        meets_full_need: true,
        no_loan_policy: false,
        avg_merit: 5000,
        stacking_policy: 'full_stacking' as StackingPolicy,
      },
      {
        name: 'University of Illinois Urbana-Champaign',
        total_cost: 50000,
        meets_full_need: false,
        no_loan_policy: false,
        avg_merit: 8000,
        stacking_policy: 'full_stacking' as StackingPolicy,
      },
    ];

    return colleges.map((college) => {
      // Calculate need-based grant
      const financialNeed = Math.max(college.total_cost - financialProfile.estimated_efc, 0);
      const needBasedGrant = college.meets_full_need ? financialNeed : financialNeed * 0.6; // 60% coverage if doesn't meet full need

      // Calculate merit scholarship
      const meritScholarship =
        college.avg_merit * (financialProfile.merit_competitiveness / 10);

      // Calculate external scholarships allowed (based on stacking policy)
      let externalAllowed = 0;
      if (college.stacking_policy === 'full_stacking') externalAllowed = 40000; // Allow full external stacking
      else if (college.stacking_policy === 'partial_stacking') externalAllowed = 10000; // Reduce need-based aid
      // no_stacking = 0

      // Work study
      const workStudy = financialProfile.financial_need_level !== 'none' ? 3000 : 0;

      // Loans
      const loansOffered = college.no_loan_policy ? 0 : 5500; // Federal student loan max

      // Total aid
      const totalAid = needBasedGrant + meritScholarship + externalAllowed + workStudy;

      // Net cost
      const netCostPerYear = Math.max(college.total_cost - totalAid, 0);
      const netCost4Years = netCostPerYear * 4;

      // Aid percentage
      const aidPercentage = Math.round((totalAid / college.total_cost) * 100);

      return {
        college_name: college.name,
        total_cost_of_attendance: college.total_cost,
        need_based_grant: Math.round(needBasedGrant),
        merit_scholarship: Math.round(meritScholarship),
        external_scholarships_allowed: externalAllowed,
        work_study: workStudy,
        loans_offered: loansOffered,
        stacking_policy: college.stacking_policy,
        meets_full_need: college.meets_full_need,
        no_loan_policy: college.no_loan_policy,
        total_aid_package: Math.round(totalAid),
        net_cost_per_year: Math.round(netCostPerYear),
        net_cost_4_years: Math.round(netCost4Years),
        aid_percentage: aidPercentage,
      };
    });
  }

  /**
   * Generate aid strategy recommendation
   */
  private generateAidStrategy(
    profile: FinancialProfile,
    packages: CollegeAidPackage[],
    scholarships: ScholarshipAidAnalysis[]
  ): string {
    const strategies: string[] = [];

    // Need-based strategy
    if (profile.financial_need_level === 'high' || profile.financial_need_level === 'moderate') {
      strategies.push('**Need-Based Priority:** Focus on colleges that meet full need (e.g., Stanford, Ivies)');
      strategies.push('Complete FAFSA and CSS Profile by priority deadlines');
    }

    // Merit strategy
    if (profile.merit_competitiveness >= 7) {
      strategies.push('**Merit Scholarship Strong Profile:** Apply to merit-friendly schools (Duke, UIUC, USC)');
      strategies.push('Target full-tuition scholarships at state flagship universities');
    }

    // External scholarship strategy
    const totalExternal = scholarships.reduce((sum, s) => sum + s.total_value_4_years, 0);
    if (totalExternal >= 50000) {
      strategies.push(`**External Scholarships (${Math.round(totalExternal / 1000)}K total):** Choose colleges with full stacking policies`);
    }

    // Stacking optimization
    const fullStackingSchools = packages.filter((p) => p.stacking_policy === 'full_stacking');
    if (fullStackingSchools.length > 0) {
      strategies.push(
        `Prioritize applications to: ${fullStackingSchools.map((s) => s.college_name).join(', ')} (allow external scholarship stacking)`
      );
    }

    return strategies.join('\n\n');
  }

  /**
   * Identify stacking opportunities
   */
  private identifyStackingOpportunities(
    packages: CollegeAidPackage[],
    scholarships: ScholarshipAidAnalysis[]
  ): string[] {
    const opportunities: string[] = [];

    const totalExternalValue = scholarships.reduce((sum, s) => sum + s.total_value_4_years, 0);

    packages.forEach((pkg) => {
      if (pkg.stacking_policy === 'full_stacking') {
        const potentialSavings = Math.min(totalExternalValue, pkg.net_cost_4_years);
        opportunities.push(
          `${pkg.college_name}: Can stack ${Math.round(potentialSavings / 1000)}K in external scholarships → Net cost from $${Math.round(pkg.net_cost_4_years / 1000)}K to $${Math.round((pkg.net_cost_4_years - potentialSavings) / 1000)}K (4 years)`
        );
      } else if (pkg.stacking_policy === 'partial_stacking') {
        opportunities.push(
          `${pkg.college_name}: Partial stacking only (external scholarships reduce need-based aid first)`
        );
      } else if (pkg.stacking_policy === 'no_stacking') {
        opportunities.push(
          `${pkg.college_name}: ⚠️ No external scholarship stacking allowed (may not be worth applying)`
        );
      }
    });

    return opportunities;
  }

  /**
   * Build negotiation leverage
   */
  private buildNegotiationLeverage(
    packages: CollegeAidPackage[],
    scholarships: ScholarshipAidAnalysis[]
  ): string[] {
    const leverage: string[] = [];

    // Sort packages by net cost (ascending)
    const sortedPackages = [...packages].sort((a, b) => a.net_cost_per_year - b.net_cost_per_year);

    if (sortedPackages.length >= 2) {
      const bestOffer = sortedPackages[0];
      const competingOffer = sortedPackages[1];

      const costDifference = competingOffer.net_cost_per_year - bestOffer.net_cost_per_year;

      if (costDifference > 5000) {
        leverage.push(
          `Use ${bestOffer.college_name} offer ($${Math.round(bestOffer.net_cost_per_year / 1000)}K/year) to negotiate with ${competingOffer.college_name} ($${Math.round(competingOffer.net_cost_per_year / 1000)}K/year) - $${Math.round(costDifference / 1000)}K/year difference`
        );
      }
    }

    // External scholarship leverage
    const highValueScholarships = scholarships.filter((s) => s.total_value_4_years >= 20000);
    if (highValueScholarships.length > 0) {
      leverage.push(
        `Mention ${highValueScholarships.length} external scholarship(s) totaling ${Math.round(highValueScholarships.reduce((sum, s) => sum + s.total_value_4_years, 0) / 1000)}K when negotiating aid packages`
      );
    }

    return leverage;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    profile: FinancialProfile,
    packages: CollegeAidPackage[]
  ): string[] {
    const warnings: string[] = [];

    // High EFC warning
    if (profile.estimated_efc > 60000 && profile.financial_need_level === 'none') {
      warnings.push(
        '⚠️ High EFC - unlikely to qualify for need-based aid. Focus on merit scholarships and schools with strong merit programs.'
      );
    }

    // Low merit competitiveness warning
    if (profile.merit_competitiveness < 5) {
      warnings.push(
        '⚠️ Merit competitiveness below average. Focus on need-based aid schools or strengthen profile (GPA, test scores, awards).'
      );
    }

    // High net cost warning
    const highCostPackages = packages.filter((p) => p.net_cost_per_year > 40000);
    if (highCostPackages.length === packages.length) {
      warnings.push(
        '⚠️ All colleges have high net costs (>$40K/year). Consider adding more affordable options or schools with better aid.'
      );
    }

    // No stacking schools warning
    const noStackingSchools = packages.filter((p) => p.stacking_policy === 'no_stacking');
    if (noStackingSchools.length > 0) {
      warnings.push(
        `⚠️ ${noStackingSchools.length} school(s) don't allow external scholarship stacking: ${noStackingSchools.map((s) => s.college_name).join(', ')}`
      );
    }

    return warnings;
  }
}
