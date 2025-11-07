import { UniversalFact, FactCategory } from './UniversalFact.js';

/**
 * Schema Coverage Tracker
 *
 * Determines if enough data collected to proceed to next agent.
 * Based on production schema requirements, NOT arbitrary fact counts.
 */
export class SchemaCoverage {
  // Required fields (minimum for GamePlan handover)
  has_grade: boolean = false;
  has_high_school: boolean = false;
  has_interests: boolean = false;

  // Optional fields (improve profile quality)
  has_target_major: boolean = false;
  has_gpa: boolean = false;
  has_test_scores: boolean = false;
  has_activities: boolean = false;
  has_awards: boolean = false;

  // Metrics
  required_fields_complete: number = 0;
  required_fields_total: number = 3;
  optional_fields_complete: number = 0;
  optional_fields_total: number = 5;
  completion_percentage: number = 0;

  // Field map (for debugging)
  private fieldMap: Map<string, UniversalFact> = new Map();

  /**
   * Calculate coverage from facts
   */
  static fromFacts(facts: UniversalFact[]): SchemaCoverage {
    const coverage = new SchemaCoverage();

    // Group facts by canonical field name
    for (const fact of facts) {
      const fieldName = fact.data.metadata?.field_name;
      if (fieldName) {
        coverage.fieldMap.set(fieldName, fact);
      }

      // v34.3 FIX: Also check inside combined_fields for individual fields
      // v28 extraction creates combined_fields facts that bundle multiple fields together
      // These legacy Fact objects have fact_type and value at top level (not under data)
      const factAny = fact as any;
      if (factAny.fact_type === 'combined_fields' && factAny.value) {
        const combinedValue = factAny.value as Record<string, any>;

        // Extract individual fields from combined_fields
        if (combinedValue.grade !== undefined) {
          coverage.fieldMap.set('grade', fact);
        }
        if (combinedValue.high_school !== undefined) {
          coverage.fieldMap.set('high_school', fact);
        }
        if (combinedValue.interests !== undefined) {
          coverage.fieldMap.set('interests', fact);
        }
        if (combinedValue.target_major !== undefined) {
          coverage.fieldMap.set('target_major', fact);
        }
        if (combinedValue.gpa !== undefined) {
          coverage.fieldMap.set('gpa', fact);
        }
        if (combinedValue.current_activities !== undefined) {
          coverage.fieldMap.set('current_activities', fact);
        }
        if (combinedValue.awards !== undefined) {
          coverage.fieldMap.set('awards', fact);
        }
      }
    }

    // Check required fields
    coverage.has_grade = coverage.fieldMap.has('grade');
    coverage.has_high_school = coverage.fieldMap.has('high_school');
    coverage.has_interests = coverage.fieldMap.has('interests');

    // Check optional fields
    coverage.has_target_major = coverage.fieldMap.has('target_major');
    coverage.has_gpa = coverage.fieldMap.has('gpa');
    coverage.has_test_scores =
      coverage.fieldMap.has('sat_score') ||
      coverage.fieldMap.has('act_score');
    coverage.has_activities = coverage.fieldMap.has('current_activities');
    coverage.has_awards = coverage.fieldMap.has('awards');

    // Calculate metrics
    coverage.required_fields_complete = [
      coverage.has_grade,
      coverage.has_high_school,
      coverage.has_interests
    ].filter(Boolean).length;

    coverage.optional_fields_complete = [
      coverage.has_target_major,
      coverage.has_gpa,
      coverage.has_test_scores,
      coverage.has_activities,
      coverage.has_awards
    ].filter(Boolean).length;

    const totalComplete = coverage.required_fields_complete + coverage.optional_fields_complete;
    const totalPossible = coverage.required_fields_total + coverage.optional_fields_total;
    coverage.completion_percentage = Math.round((totalComplete / totalPossible) * 100);

    return coverage;
  }

  /**
   * Check if minimum coverage achieved for GamePlan handover
   */
  isMinimumCoverageAchieved(): boolean {
    return this.has_grade &&
           this.has_high_school &&
           this.has_interests;
  }

  /**
   * Check if optimal coverage achieved
   */
  isOptimalCoverageAchieved(): boolean {
    return this.isMinimumCoverageAchieved() &&
           this.optional_fields_complete >= 2;
  }

  /**
   * Get missing required fields (for user feedback)
   */
  getMissingRequiredFields(): string[] {
    const missing: string[] = [];
    if (!this.has_grade) missing.push('grade');
    if (!this.has_high_school) missing.push('high_school');
    if (!this.has_interests) missing.push('interests');
    return missing;
  }

  /**
   * Get missing optional fields
   */
  getMissingOptionalFields(): string[] {
    const missing: string[] = [];
    if (!this.has_target_major) missing.push('target_major');
    if (!this.has_gpa) missing.push('gpa');
    if (!this.has_test_scores) missing.push('test_scores');
    if (!this.has_activities) missing.push('current_activities');
    if (!this.has_awards) missing.push('awards');
    return missing;
  }

  /**
   * Get user-friendly description of what's missing
   */
  getMissingFieldsDescription(): string {
    const missing = this.getMissingRequiredFields();

    if (missing.length === 0) {
      return 'All required information collected!';
    }

    const fieldNames = missing.map(f => {
      switch (f) {
        case 'grade': return 'current grade';
        case 'high_school': return 'high school';
        case 'interests': return 'interests and passions';
        default: return f.replace('_', ' ');
      }
    });

    if (fieldNames.length === 1) {
      return `I still need to know about your ${fieldNames[0]}.`;
    }

    const last = fieldNames.pop();
    return `I still need to know about your ${fieldNames.join(', ')} and ${last}.`;
  }

  /**
   * Convert to JSON for logging/metadata
   */
  toJSON() {
    return {
      required: {
        grade: this.has_grade,
        high_school: this.has_high_school,
        interests: this.has_interests
      },
      optional: {
        target_major: this.has_target_major,
        gpa: this.has_gpa,
        test_scores: this.has_test_scores,
        activities: this.has_activities,
        awards: this.has_awards
      },
      metrics: {
        required_complete: this.required_fields_complete,
        required_total: this.required_fields_total,
        optional_complete: this.optional_fields_complete,
        optional_total: this.optional_fields_total,
        completion_percentage: this.completion_percentage
      },
      status: {
        is_minimum_achieved: this.isMinimumCoverageAchieved(),
        is_optimal_achieved: this.isOptimalCoverageAchieved()
      },
      missing: {
        required: this.getMissingRequiredFields(),
        optional: this.getMissingOptionalFields()
      }
    };
  }
}
