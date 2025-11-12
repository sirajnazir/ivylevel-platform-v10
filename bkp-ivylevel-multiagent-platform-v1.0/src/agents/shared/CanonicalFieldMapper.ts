/**
 * CanonicalFieldMapper.ts
 * Universal field name normalization for all agents
 *
 * Purpose:
 * - Define ONE canonical name for each data field
 * - Map ALL possible aliases to canonical name
 * - Ensure all agents use same field names
 * - Enable semantic field matching
 *
 * Version: v36.0
 * Created: 2025-11-07
 */

export interface FieldMapping {
  canonical: string;           // Official field name
  aliases: string[];           // All possible variations
  category: string;            // Field category
  agents: string[];            // Which agents use this field
  extraction_hints: string[];  // Help LLM extract correctly
}

export class CanonicalFieldMapper {
  /**
   * Master registry of ALL fields across ALL agents
   */
  private static FIELD_REGISTRY: Record<string, FieldMapping> = {
    // ========================================
    // STUDENT PROFILE FIELDS
    // ========================================
    'student_grade': {
      canonical: 'student_grade',
      aliases: [
        'grade', 'current_grade', 'class_year', 'year',
        'grade_level', 'school_year', 'what_grade'
      ],
      category: 'profile',
      agents: ['assessment', 'gameplan', 'execution'],
      extraction_hints: ['9th', '10th', '11th', '12th', 'freshman', 'sophomore', 'junior', 'senior'],
    },

    'high_school': {
      canonical: 'high_school',
      aliases: [
        'high_school', 'school', 'school_name', 'attending',
        'enrolled_at', 'goes_to', 'student_at'
      ],
      category: 'profile',
      agents: ['assessment', 'gameplan'],
      extraction_hints: ['High School', 'High', 'Academy', 'Prep'],
    },

    // ========================================
    // ACADEMIC FIELDS
    // ========================================
    'current_classes': {
      canonical: 'current_classes',
      aliases: [
        'current_classes', 'classes', 'courses', 'subjects',
        'taking_classes', 'enrolled_classes', 'this_year_classes',
        'coursework', 'schedule', 'class_schedule',
        'classes_taking', 'taking_courses', 'current_courses',
        // v36.0: Add these to catch MORE variations
        'what_classes', 'which_classes', 'classes_you_take',
        'academic_classes', 'school_classes', 'enrolled_courses'
      ],
      category: 'academic',
      agents: ['assessment', 'gameplan', 'execution'],
      extraction_hints: [
        'AP', 'Honors', 'Math', 'Science', 'English', 'History',
        'Computer Science', 'CS', 'Biology', 'Chemistry', 'Physics',
        'Calculus', 'Algebra', 'Geometry'
      ],
    },

    'gpa': {
      canonical: 'gpa',
      aliases: [
        'gpa', 'grade_point_average', 'grades', 'academic_performance',
        'cumulative_gpa', 'weighted_gpa', 'unweighted_gpa'
      ],
      category: 'academic',
      agents: ['assessment', 'gameplan'],
      extraction_hints: ['4.0', '3.5', 'GPA', 'grade point'],
    },

    // ========================================
    // INTERESTS & GOALS
    // ========================================
    'interests': {
      canonical: 'interests',
      aliases: [
        'interests', 'passions', 'loves', 'enjoys', 'likes',
        'fascinated_by', 'excited_about', 'passionate_about',
        'interested_in', 'drawn_to', 'curious_about'
      ],
      category: 'goals',
      agents: ['assessment', 'gameplan', 'extracurriculars'],
      extraction_hints: [
        'love', 'passion', 'enjoy', 'fascinated', 'interested',
        'excited', 'curious'
      ],
    },

    'target_major': {
      canonical: 'target_major',
      aliases: [
        'target_major', 'major', 'intended_major', 'want_to_study',
        'field_of_interest', 'career_interest', 'academic_interest',
        'studying', 'plan_to_study', 'considering_major'
      ],
      category: 'goals',
      agents: ['assessment', 'gameplan'],
      extraction_hints: [
        'Computer Science', 'Engineering', 'Biology', 'Business',
        'Pre-Med', 'Medicine', 'Psychology', 'Economics'
      ],
    },

    'target_colleges': {
      canonical: 'target_colleges',
      aliases: [
        'target_colleges', 'dream_schools', 'college_list',
        'interested_colleges', 'want_to_attend', 'applying_to',
        'target_schools', 'reach_schools', 'dream_colleges'
      ],
      category: 'goals',
      agents: ['assessment', 'gameplan'],
      extraction_hints: [
        'Stanford', 'MIT', 'Harvard', 'Yale', 'Princeton',
        'UC Berkeley', 'UCLA', 'Ivy League'
      ],
    },

    // ========================================
    // EXTRACURRICULAR FIELDS
    // ========================================
    'activities': {
      canonical: 'activities',
      aliases: [
        'activities', 'extracurriculars', 'ECs', 'outside_school',
        'clubs', 'sports', 'hobbies', 'projects',
        'extracurricular_activities', 'after_school',
        'involvement', 'participate_in'
      ],
      category: 'extracurricular',
      agents: ['assessment', 'gameplan', 'extracurriculars', 'execution'],
      extraction_hints: [
        'club', 'sport', 'team', 'volunteer', 'research',
        'internship', 'project', 'competition'
      ],
    },

    'leadership_roles': {
      canonical: 'leadership_roles',
      aliases: [
        'leadership', 'leadership_roles', 'lead', 'president',
        'captain', 'founder', 'officer', 'head',
        'leadership_position', 'leading', 'in_charge'
      ],
      category: 'extracurricular',
      agents: ['assessment', 'gameplan', 'extracurriculars', 'awards'],
      extraction_hints: [
        'president', 'vice president', 'captain', 'founder',
        'officer', 'head', 'chair', 'director'
      ],
    },

    // ========================================
    // AWARDS & RECOGNITION
    // ========================================
    'awards': {
      canonical: 'awards',
      aliases: [
        'awards', 'recognition', 'honors', 'achievements',
        'competitions', 'wins', 'accolades', 'distinctions',
        'prizes', 'medals', 'certificates'
      ],
      category: 'awards',
      agents: ['assessment', 'awards', 'execution'],
      extraction_hints: [
        'award', 'winner', 'finalist', 'recognition',
        'honor', 'prize', 'medal', 'champion'
      ],
    },

    // ========================================
    // TIME & CAPACITY
    // ========================================
    'weekly_hours_available': {
      canonical: 'weekly_hours_available',
      aliases: [
        'weekly_hours', 'hours_available', 'free_time',
        'time_available', 'capacity', 'bandwidth',
        'how_much_time', 'available_time'
      ],
      category: 'capacity',
      agents: ['assessment', 'gameplan', 'execution'],
      extraction_hints: ['hours', 'time', 'per week', 'weekly'],
    },

    // ========================================
    // FAMILY & CONTEXT
    // ========================================
    'family_context': {
      canonical: 'family_context',
      aliases: [
        'family', 'family_background', 'parents', 'siblings',
        'family_situation', 'household', 'home_life'
      ],
      category: 'context',
      agents: ['assessment', 'gameplan'],
      extraction_hints: ['family', 'parents', 'mom', 'dad', 'siblings'],
    },
  };

  /**
   * Get canonical field name from any alias
   */
  static getCanonicalName(fieldName: string): string {
    const lowerField = fieldName.toLowerCase().trim();

    // Check if it's already canonical
    if (this.FIELD_REGISTRY[lowerField]) {
      return lowerField;
    }

    // Search through aliases
    for (const [canonical, mapping] of Object.entries(this.FIELD_REGISTRY)) {
      if (mapping.aliases.map(a => a.toLowerCase()).includes(lowerField)) {
        return canonical;
      }
    }

    // Not found - return original (will be handled as custom field)
    console.warn(`[CanonicalFieldMapper] Unknown field: "${fieldName}"`);
    return lowerField;
  }

  /**
   * Get all aliases for a canonical field
   */
  static getAliases(canonicalName: string): string[] {
    const mapping = this.FIELD_REGISTRY[canonicalName];
    return mapping ? mapping.aliases : [canonicalName];
  }

  /**
   * Normalize extracted data to canonical field names
   */
  static normalizeFields(extractedData: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [fieldName, value] of Object.entries(extractedData)) {
      const canonicalName = this.getCanonicalName(fieldName);

      // Merge if canonical name already exists
      if (normalized[canonicalName]) {
        if (Array.isArray(normalized[canonicalName]) && Array.isArray(value)) {
          // Merge arrays
          normalized[canonicalName] = [
            ...normalized[canonicalName],
            ...value
          ];
        } else if (value && !normalized[canonicalName]) {
          // Replace if new value is not empty
          normalized[canonicalName] = value;
        }
      } else {
        normalized[canonicalName] = value;
      }
    }

    console.log('[CanonicalFieldMapper] Normalized:', {
      original_fields: Object.keys(extractedData),
      canonical_fields: Object.keys(normalized),
    });

    return normalized;
  }

  /**
   * Check if two field names are semantically equivalent
   */
  static areEquivalent(field1: string, field2: string): boolean {
    const canonical1 = this.getCanonicalName(field1);
    const canonical2 = this.getCanonicalName(field2);
    return canonical1 === canonical2;
  }

  /**
   * Get extraction hints for LLM
   */
  static getExtractionHints(canonicalName: string): string[] {
    const mapping = this.FIELD_REGISTRY[canonicalName];
    return mapping ? mapping.extraction_hints : [];
  }

  /**
   * Get all fields for a specific agent
   */
  static getFieldsForAgent(agentId: string): string[] {
    const agentType = agentId.split('-')[0]; // e.g., "assessment" from "assessment-agent-v18"

    return Object.entries(this.FIELD_REGISTRY)
      .filter(([_, mapping]) => mapping.agents.includes(agentType))
      .map(([canonical, _]) => canonical);
  }

  /**
   * Generate extraction prompt fragment for LLM
   */
  static generateExtractionPrompt(agentId: string): string {
    const relevantFields = this.getFieldsForAgent(agentId);

    let prompt = `CRITICAL: Extract data using these EXACT canonical field names:\n\n`;

    relevantFields.forEach(canonical => {
      const mapping = this.FIELD_REGISTRY[canonical];
      prompt += `- "${canonical}": ${mapping.aliases.slice(0, 3).join(', ')}\n`;
      if (mapping.extraction_hints.length > 0) {
        prompt += `  Examples: ${mapping.extraction_hints.slice(0, 3).join(', ')}\n`;
      }
    });

    prompt += `\nIMPORTANT: Use canonical names EXACTLY as shown above.\n`;

    return prompt;
  }
}
