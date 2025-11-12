/**
 * Assessment Question Generator
 *
 * Generates contextual, proactive questions based on:
 * 1. Missing facts from AssessmentFactTracker
 * 2. Student responses (dig deeper with follow-ups)
 * 3. Jenny's authentic questioning patterns
 *
 * Goal: Conduct complete 1-hour assessment (45+ questions)
 * matching Jenny's depth and conversational style
 */

import { AssessmentProgress, AssessmentFactTracker, FactTier } from './AssessmentFactTracker.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class AssessmentQuestionGenerator {

  /**
   * Fact-to-Question Mapping
   * Maps each of the 105 facts to Jenny-style questions
   */
  private static FACT_QUESTIONS: Record<string, string> = {
    // ========================================================================
    // Tier 1: Profile Foundation
    // ========================================================================

    // Demographics
    'grade': "What grade are you currently in?",
    'high_school': "What high school do you attend?",
    'location': "Where is your school located?",
    'school_type': "Is your school public, private, charter, or magnet?",
    'school_size': "About how many students are in your graduating class?",

    // Academic
    'gpa': "What's your current GPA?",
    'gpa_type': "Is that weighted or unweighted?",
    'class_rank': "Does your school rank students? If so, what's your approximate rank?",
    'current_courses': "What classes are you taking this year?",
    'course_rigor': "How would you describe the rigor of your course load?",

    // Testing
    'test_scores': "Have you taken the SAT, ACT, or PSAT?",
    'sat_score': "What was your SAT score? (If taken)",
    'act_score': "What was your ACT score? (If taken)",
    'psat_score': "What was your PSAT score? (If taken)",
    'test_plan': "What's your testing plan for the rest of high school?",

    // Rigor
    'ap_count': "How many AP classes have you taken or are currently taking?",
    'ap_scores': "What scores did you get on your AP exams?",
    'ap_planned': "Are you planning to take more AP classes? Which ones?",
    'honors_count': "How many honors courses have you taken?",
    'ib_diploma': "Are you in the IB program?",

    // Intent
    'target_major': "What do you want to study in college?",
    'career_goal': "What career are you interested in pursuing?",
    'major_rationale': "What draws you to this field?",
    'major_discovery': "How did you discover your interest in this field?",
    'academic_interests': "What subjects are you most passionate about in school?",

    // ========================================================================
    // Tier 2: Activity Profile
    // ========================================================================

    // Activities list
    'activity_list': "What extracurricular activities are you involved in?",
    'activity_count': "How many activities are you actively involved in?",
    'primary_activities': "Which 2-3 activities are you most passionate about?",

    // Activity details (for each activity)
    'activity_roles': "What's your specific role in each activity?",
    'activity_hours': "About how many hours per week do you spend on each activity?",
    'activity_duration': "How long have you been involved in each activity?",
    'activity_leadership': "Do you hold any leadership positions? What are they?",
    'activity_impact': "What impact have you made through these activities?",
    'activity_metrics': "Can you quantify your impact with any numbers or metrics?",
    'activity_alignment': "How do these activities connect to your academic interests?",
    'activity_passion_level': "On a scale of 1-10, how passionate are you about each activity?",
    'activity_progression': "How has your involvement deepened or evolved over time?",
    'activity_team_sizes': "How many people are you working with in each activity?",
    'activity_reach': "How many people have you reached or impacted?",
    'activity_obstacles': "What challenges or obstacles have you faced in these activities?",
    'activity_future_plans': "Do you plan to continue these activities? How will you grow them?",

    // Awards
    'awards_list': "What awards, honors, or recognition have you received?",
    'awards_level': "Were these at the school, regional, state, or national level?",
    'competition_results': "Have you competed in any competitions? What were the results?",
    'recognition_received': "Have you received any special recognition from teachers or mentors?",
    'honors_received': "Have you been selected for any honor societies or special programs?",

    // Depth indicators
    'leadership_positions': "Tell me about your leadership positions in detail.",
    'team_sizes_led': "How large are the teams you've led?",
    'years_committed': "How many years have you committed to your top activities?",
    'progression_trajectory': "How have you progressed in your activities over time?",
    'impact_reach': "How many people have benefited from your work?",
    'measurable_outcomes': "What measurable outcomes can you share?",
    'external_validation': "Have you received any external validation (awards, media coverage, etc.)?",

    // ========================================================================
    // Tier 3: Context & Differentiation
    // ========================================================================

    // School context
    'school_competitiveness': "How competitive is your high school?",
    'school_ranking': "What's your school's reputation or ranking?",
    'peer_comparison': "How do you compare to your peers academically?",
    'resource_access': "What resources does your school provide (tutoring, programs, opportunities)?",
    'geographic_context': "What's the area like where you go to school?",

    // Personal context
    'demographic_background': "Is there anything about your background that provides unique context?",
    'socioeconomic_status': "Are there any financial constraints that affect your opportunities?",
    'first_generation': "Are you a first-generation college student?",
    'unique_circumstances': "Are there any unique circumstances I should know about?",
    'cultural_background': "Does your cultural background influence your academic journey?",

    // Constraints
    'time_constraints': "What does your typical weekly schedule look like?",
    'work_obligations': "Do you have a part-time job or work obligations?",
    'family_responsibilities': "Do you have family responsibilities that take up time?",
    'available_bandwidth': "Realistically, how much time do you have for new activities or programs?",
    'financial_constraints': "Are there financial constraints on opportunities you can pursue?",

    // Access
    'transportation_access': "Do you have reliable transportation to activities and programs?",
    'mentor_access': "Do you have access to mentors or advisors in your field of interest?",
    'program_access': "What programs or opportunities are available in your area?",
    'opportunity_gaps': "Are there opportunities you wish you had access to?",
    'systemic_barriers': "Have you faced any systemic barriers to opportunities?",

    // ========================================================================
    // Tier 4: Gaps & Challenges
    // ========================================================================

    // Academic gaps
    'weak_grades': "Have you had any challenging courses or lower grades?",
    'grade_trends': "How have your grades trended over high school?",
    'subject_struggles': "Are there any subjects you've struggled with?",
    'testing_gaps': "Are your test scores where you want them to be?",
    'rigor_gaps': "Are there more rigorous courses you wish you'd taken?",

    // EC gaps
    'leadership_gaps': "Are there areas where you'd like more leadership experience?",
    'award_gaps': "Do you feel you're missing awards or recognition in your field?",
    'depth_gaps': "Is there an area where you wish you'd gone deeper?",
    'alignment_gaps': "Do your activities fully align with your academic interests?",
    'impact_gaps': "Are there areas where you wish you'd made more impact?",

    // Narrative gaps
    'profile_scattered': "Do you feel your activities and interests are cohesive?",
    'no_spike': "Do you have a clear 'spike' or area of excellence?",
    'generic_profile': "What makes your profile unique compared to other students?",
    'narrative_clarity': "Can you clearly articulate your story and 'why'?",
    'differentiator_missing': "What differentiates you from other high-achieving students?",

    // ========================================================================
    // Tier 5: Psychology & Capacity
    // ========================================================================

    // Personality & work style
    'personality_type': "How would you describe your personality and work style?",
    'work_style': "Are you more self-directed or do you prefer guidance and structure?",
    'execution_speed': "How quickly do you typically execute on new ideas or projects?",
    'self_direction': "Do you initiate projects on your own or need prompting?",
    'needs_structure': "Do you work better with clear structure and deadlines?",

    // Authenticity
    'passion_authenticity': "Is your interest in this field something you discovered yourself?",
    'parent_influence': "Is this field something you're personally drawn to, or influenced by family?",
    'exploration_stage': "Are you still exploring different interests or are you committed to this path?",
    'genuine_interest': "What specifically excites you about this field?",
    'intellectual_curiosity': "Do you explore this field outside of school requirements?",

    // Capacity
    'stress_tolerance': "How do you handle high-pressure situations and deadlines?",
    'capacity_assessment': "Realistically, how much can you take on without burning out?",
    'commitment_ability': "How good are you at following through on long-term commitments?",
    'follow_through': "Can you share examples of projects you've seen through to completion?",
    'bandwidth_realistic': "Given your schedule, what's realistically achievable?"
  };

  /**
   * Jenny's Follow-Up Patterns
   * Recognizes opportunities to dig deeper based on student responses
   */
  private static FOLLOW_UP_PATTERNS = [
    {
      trigger: /(?:founded|started|created|built|launched)/i,
      questions: [
        "That's impressive! Can you tell me more about the impact you've made? How many people have you reached?",
        "How did you come up with the idea to start this?",
        "What challenges did you face getting it off the ground?"
      ]
    },
    {
      trigger: /(?:won|awarded|recognized|finalist|winner)/i,
      questions: [
        "Congratulations! Was that at the school, regional, state, or national level?",
        "How competitive was that award? How many people applied?",
        "What did you have to do to win that award?"
      ]
    },
    {
      trigger: /(?:interested in|want to study|passionate about|love)/i,
      questions: [
        "How did you discover this interest? Was this something you explored on your own?",
        "What specifically about this field excites you the most?",
        "Have you had the chance to go deep in this area outside of school?"
      ]
    },
    {
      trigger: /(?:research|project|published|paper)/i,
      questions: [
        "What was your research question or hypothesis?",
        "What did you discover or create?",
        "Did you work with any mentors or professors on this?"
      ]
    },
    {
      trigger: /(?:difficult|hard|struggle|challenge|tough)/i,
      questions: [
        "I understand that can be challenging. How have you been working to address this?",
        "What support have you gotten to help with this challenge?",
        "How has overcoming this challenge changed your perspective?"
      ]
    },
    {
      trigger: /(?:volunteer|community service|help|serve)/i,
      questions: [
        "What motivated you to get involved in this?",
        "How many hours have you volunteered?",
        "What impact have you seen from your service?"
      ]
    },
    {
      trigger: /(?:leadership|led|president|captain|founder)/i,
      questions: [
        "How many people are on your team?",
        "What changes have you made as a leader?",
        "What's been the most rewarding part of leading this group?"
      ]
    },
    {
      trigger: /(?:competition|compete|tournament|contest)/i,
      questions: [
        "What level did you compete at?",
        "How did you prepare for the competition?",
        "What did you learn from competing?"
      ]
    }
  ];

  /**
   * Jenny's Conversational Affirmations
   * Used to make questions feel natural and encouraging
   */
  private static AFFIRMATIONS = [
    "That makes sense!",
    "Got it.",
    "Okay, great!",
    "Perfect.",
    "That's really impressive!",
    "I love that!",
    "That's awesome!",
    "Makes sense!",
    "No worries,",
    "Totally understand.",
    "That's interesting!"
  ];

  /**
   * Generate next question based on full conversation context
   */
  static generateNextQuestion(
    progress: AssessmentProgress,
    lastStudentResponse: string,
    conversationHistory: Message[]
  ): string {

    // Strategy 1: Follow-up on last response (dig deeper)
    const followUp = this.generateFollowUpQuestion(lastStudentResponse);
    if (followUp) {
      return this.addJennyTone(followUp);
    }

    // Strategy 2: Ask about missing critical facts in priority order
    const nextQuestion = this.getNextQuestionForMissingFacts(progress);
    if (nextQuestion) {
      return this.addJennyTone(nextQuestion);
    }

    // Strategy 3: Synthesis and validation (when 90%+ complete)
    if (progress.overall_completion >= 0.9) {
      return this.generateSynthesisQuestion(progress);
    }

    // Fallback: Open-ended exploration
    return this.addJennyTone("Is there anything else important I should know about your profile?");
  }

  /**
   * Generate follow-up questions based on student response patterns
   */
  private static generateFollowUpQuestion(response: string): string | null {
    for (const pattern of this.FOLLOW_UP_PATTERNS) {
      if (pattern.trigger.test(response)) {
        // Return random question from this pattern's options
        const randomIndex = Math.floor(Math.random() * pattern.questions.length);
        return pattern.questions[randomIndex];
      }
    }

    return null;
  }

  /**
   * Get next question for missing facts based on priority tiers
   */
  private static getNextQuestionForMissingFacts(progress: AssessmentProgress): string | null {
    // Get the next priority tier
    const nextTier = progress.next_priority_tier;
    if (!nextTier) {
      return null;  // All tiers complete
    }

    // Get missing facts for this tier
    const tierProgress = progress.tier_progress[nextTier];
    const missingFacts = [
      ...tierProgress.missing_critical,
      ...tierProgress.missing_optional
    ];

    if (missingFacts.length === 0) {
      return null;
    }

    // Return question for first missing fact
    const factName = missingFacts[0];
    return this.FACT_QUESTIONS[factName] ||
           `Tell me more about your ${factName.replace(/_/g, ' ')}.`;
  }

  /**
   * Generate synthesis/validation question when assessment nearing completion
   */
  private static generateSynthesisQuestion(progress: AssessmentProgress): string {
    const synthesisQuestions = [
      "Let me make sure I have this right - you're most passionate about [INTERESTS] and want to study [MAJOR]. Is that accurate?",
      "Looking at everything we've discussed, what would you say is your biggest strength as an applicant?",
      "Is there anything about your story or background that we haven't covered yet?",
      "What do you think makes your profile unique compared to other students interested in [MAJOR]?",
      "If you had to describe yourself in one sentence to an admissions officer, what would you say?"
    ];

    const randomIndex = Math.floor(Math.random() * synthesisQuestions.length);
    return synthesisQuestions[randomIndex];
  }

  /**
   * Add Jenny's conversational tone and affirmations
   */
  private static addJennyTone(question: string): string {
    // 70% chance of adding an affirmation before the question
    if (Math.random() < 0.7) {
      const randomAffirmation = this.AFFIRMATIONS[
        Math.floor(Math.random() * this.AFFIRMATIONS.length)
      ];
      return `${randomAffirmation} ${question}`;
    }

    return question;
  }

  /**
   * Get estimated questions remaining
   */
  static getEstimatedQuestionsRemaining(progress: AssessmentProgress): number {
    const factsRemaining = progress.total_facts_required - progress.total_facts_collected;

    // Average 2 facts per question (some questions yield multiple facts)
    return Math.ceil(factsRemaining / 2);
  }

  /**
   * Check if enough questions have been asked
   * (Jenny standard: 45+ questions)
   */
  static hasAskedEnoughQuestions(conversationTurns: number): boolean {
    return conversationTurns >= 45;
  }
}
